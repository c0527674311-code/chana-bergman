-- ============================================================================
-- Bootstrap admins.
--
-- Chicken-and-egg: `admin_invites` may only be written by an existing admin,
-- but on a fresh database nobody is one yet. This migration seeds the first
-- invites directly, so the very first Google sign-in with either address is
-- promoted by /auth/callback automatically — no manual SQL after deploy.
--
-- Both are Google accounts, which is required now that Google is the only
-- sign-in method.
--
--   c0527674311@gmail.com  — חנה ברגמן, the owner of the system
--   rivkibraverman@gmail.com — רבקי ברוורמן, builder; same view as Chana
--
-- To revoke later: delete the row here AND clear the flag, e.g.
--   delete from admin_invites where email = 'rivkibraverman@gmail.com';
--   update app_users set is_admin = false where email = 'rivkibraverman@gmail.com';
-- ============================================================================

insert into admin_invites (email)
values
  ('c0527674311@gmail.com'),
  ('rivkibraverman@gmail.com')
on conflict (email) do nothing;

-- If either account already signed in before this migration ran, promote it
-- now rather than waiting for another sign-in.
update app_users
   set is_admin = true
 where lower(trim(email)) in ('c0527674311@gmail.com', 'rivkibraverman@gmail.com');
