-- תבניות מייל: כל דיוור שנשלח נשמר כתבנית, ואפשר לבחור אותו שוב בשליחה הבאה.

create table if not exists email_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subject text not null,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One template per name: sending the same campaign twice updates it in place
-- instead of filling the list with copies.
create unique index if not exists email_templates_name_uniq
  on email_templates (lower(btrim(name)));

alter table email_templates enable row level security;

create policy email_templates_admin on email_templates
  for all using (is_admin()) with check (is_admin());
