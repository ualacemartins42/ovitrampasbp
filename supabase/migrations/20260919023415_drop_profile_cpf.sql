alter table public.profiles
  drop constraint if exists profiles_cpf_format;

alter table public.profiles
  drop column if exists cpf;

create unique index if not exists profiles_registration_number_key
  on public.profiles (registration_number)
  where registration_number is not null and length(trim(registration_number)) > 0;

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

  insert into public.profiles (id, full_name, role, registration_number, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Agente de campo'),
    new_role,
    new.raw_user_meta_data ->> 'registration_number',
    new.raw_user_meta_data ->> 'username'
  );

  return new;
end;
$$;
