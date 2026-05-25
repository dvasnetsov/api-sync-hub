# Настройка Google OAuth

## 1. Google Cloud Console

1. Зайди на https://console.cloud.google.com
2. Создай проект или выбери существующий
3. APIs & Services → Credentials → Create Credentials → OAuth Client ID
4. Application type: **Web application**
5. Authorized redirect URIs — добавь:
   ```
   https://<твой-supabase-project>.supabase.co/auth/v1/callback
   ```
   Для локальной разработки также добавь:
   ```
   http://localhost:5173/projects
   ```
6. Скопируй **Client ID** и **Client Secret**

## 2. Supabase Dashboard

1. Зайди на https://supabase.com/dashboard
2. Твой проект → Authentication → Providers → Google
3. Включи Google, вставь Client ID и Client Secret
4. В разделе **URL Configuration** добавь свой домен в **Redirect URLs**:
   ```
   https://твой-домен.com/projects
   http://localhost:5173/projects
   ```

## 3. Переменные окружения

В `.env` уже есть:
```
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  ← нужен для server functions
```

`SUPABASE_SERVICE_ROLE_KEY` берётся из Supabase → Settings → API → service_role key.

## 4. Локальная разработка

```bash
bun install
bun dev
```

Открой http://localhost:5173 — кнопка "Continue with Google" будет работать.
