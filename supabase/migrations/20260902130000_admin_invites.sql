-- ============================================================================
-- admin_invites — Chana grants back-office access by email.
--
-- An invite is written *before* the person has an account: she types an email,
-- and the next time someone signs in with it (password or Google) the auth
-- callback reads this table and flips `app_users.is_admin`. That is why the key
-- is the email and not a user id — there is nothing to reference yet.
--
-- Emails are stored lower-cased and trimmed so "Chana@X.com" and "chana@x.com"
-- cannot both sit here and disagree.
-- ============================================================================

create table admin_invites (
  email text primary key,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint admin_invites_email_normalised check (email = lower(trim(email)))
);

alter table admin_invites enable row level security;

-- Only existing admins may see or change the invite list.
create policy admin_invites_admin on admin_invites
  for all using (is_admin()) with check (is_admin());

comment on table admin_invites is
  'Emails pre-approved for back-office access; consumed by /auth/callback on first sign-in.';
