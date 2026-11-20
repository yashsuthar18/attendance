-- Run schema.sql (or the mobile-login migration for an existing installation) first.
-- Grant only the server role access to the app's tables and login functions.
begin;
grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.organizers, public.events, public.event_members, public.meetings,
  public.attendance, public.import_batches, public.member_login_attempts,
  public.organizer_login_attempts to service_role;
grant usage, select on sequence public.member_login_attempts_id_seq,
  public.organizer_login_attempts_id_seq to service_role;
revoke all on function public.reserve_member_login_attempt(uuid,text,text) from public, anon, authenticated;
revoke all on function public.reserve_organizer_login_attempt(text,text) from public, anon, authenticated;
grant execute on function public.reserve_member_login_attempt(uuid,text,text) to service_role;
grant execute on function public.reserve_organizer_login_attempt(text,text) to service_role;
commit;

select has_table_privilege('service_role', 'public.organizers', 'select') as access_ok;
