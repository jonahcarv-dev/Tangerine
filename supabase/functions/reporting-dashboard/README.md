Reporting Dashboard Edge Function

Purpose:
Provide secure, server-side access to the n8n_chat_histories table for the browser dashboard without exposing the service role key or requiring anon table read policies.

Required Supabase Edge Function environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- DASHBOARD_ACCESS_TOKEN
- CHAT_HISTORIES_TABLE=n8n_chat_histories

Example deploy command:
supabase functions deploy reporting-dashboard --no-verify-jwt

Why no-verify-jwt:
- This function uses x-dashboard-token for custom access control.
- If JWT verification is enabled, Supabase may return 401 before the function's token check runs.

Example local serve command:
supabase functions serve reporting-dashboard --env-file .env

Client request requirements:
- GET request
- Header: x-dashboard-token: <your secret token>

Recommended setup:
- Keep RLS enabled on public.n8n_chat_histories
- Do not add anon select policies for this table
- Give the dashboard team the DASHBOARD_ACCESS_TOKEN out of band
