-- Create the handle_new_user function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, user_id, org_id, full_name, role, created_at)
  values (
    new.id,                -- match auth.users.id
    new.id,                -- store as user_id for joins
    null,                  -- org_id to be assigned later
    new.email,             -- default full_name = email until updated
    'driver',              -- default role (can be updated to 'office' or 'admin')
    now()
  )
  on conflict (id) do nothing; -- Prevents errors if a profile already exists for some reason
  return new;
end;
$$;

-- Drop the trigger if it already exists to prevent duplicates on re-run
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger to run after a new user is inserted into auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();