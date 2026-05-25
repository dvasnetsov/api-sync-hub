
CREATE TABLE public.pending_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  project_ids uuid[] NOT NULL DEFAULT '{}',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE UNIQUE INDEX pending_invitations_email_pending
  ON public.pending_invitations (lower(email))
  WHERE accepted_at IS NULL;

ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to pending_invitations"
  ON public.pending_invitations
  AS PERMISSIVE FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Update handle_new_user to apply any matching pending invitation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_first boolean;
  inv public.pending_invitations%ROWTYPE;
  pid uuid;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;

  SELECT * INTO inv FROM public.pending_invitations
   WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL
   ORDER BY created_at DESC LIMIT 1;

  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
    UPDATE public.projects SET owner_id = NEW.id WHERE owner_id IS NULL;
  ELSIF inv.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, inv.role)
    ON CONFLICT DO NOTHING;
    IF inv.role = 'user' THEN
      FOREACH pid IN ARRAY inv.project_ids LOOP
        INSERT INTO public.project_members (project_id, user_id)
        VALUES (pid, NEW.id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
    UPDATE public.pending_invitations SET accepted_at = now() WHERE id = inv.id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
