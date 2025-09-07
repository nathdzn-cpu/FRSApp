-- Migration: Rename tenant_id to org_id across relevant tables
-- Date: 2025-09-07

-- 1. Profiles table
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'tenant_id'
  ) then
    alter table public.profiles
    rename column tenant_id to org_id;
  end if;
end $$;

-- 2. Audit logs table
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'tenant_id'
  ) then
    alter table public.audit_logs
    rename column tenant_id to org_id;
  end if;
end $$;

-- 3. Drop outdated job policies (if they exist)
drop policy if exists "jobs_select_by_org" on public.jobs;
drop policy if exists "jobs_insert_by_org" on public.jobs;

-- 4. Recreate policies with org_id
create policy "jobs_select_by_org"
on public.jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.org_id = jobs.org_id
      and profiles.user_id = auth.uid()
  )
);

create policy "jobs_insert_by_org"
on public.jobs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.org_id = jobs.org_id
      and profiles.user_id = auth.uid()
  )
);
