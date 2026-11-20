-- TEMPLATE ONLY: for a NEW organizer; do not rerun for an existing account.
-- 1. Create an Auth user in Supabase Authentication > Users and copy its UUID.
-- 2. Replace BOTH placeholders below, then run in the same project's SQL Editor.
-- 3. Set its password using the protected setup-password endpoint documented in README.md.
-- No real account credentials belong in this file.
insert into public.organizers(id, mobile, display_name)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid, 'REPLACE_WITH_10_DIGIT_MOBILE', 'Organizer');
