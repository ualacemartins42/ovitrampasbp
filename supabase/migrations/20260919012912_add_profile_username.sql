alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_key
  on public.profiles (username)
  where username is not null;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role public.app_role;
begin
  new_role := coalesce(
    (new.raw_app_meta_data ->> 'role')::public.app_role,
    'ace'
  );

  insert into public.profiles (id, full_name, role, registration_number, cpf, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Agente de campo'),
    new_role,
    new.raw_user_meta_data ->> 'registration_number',
    new.raw_user_meta_data ->> 'cpf',
    new.raw_user_meta_data ->> 'username'
  );

  return new;
end;
$$;

update public.profiles as p
set role = 'admin'
from auth.users as u
where u.id = p.id
  and lower(u.email) = 'ovitrampasbp@gmail.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where lower(email) = 'ovitrampasbp@gmail.com';
