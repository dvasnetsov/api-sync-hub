
CREATE POLICY "No direct access to project_members"
  ON public.project_members FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No direct access to publish_history"
  ON public.publish_history FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
