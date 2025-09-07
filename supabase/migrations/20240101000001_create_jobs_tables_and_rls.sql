-- Create jobs table only if it does not already exist
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'jobs'
  ) then
    create table public.jobs (
      id uuid primary key default uuid_generate_v4(),
      org_id uuid not null,
      ref text not null,
      price numeric(10, 2),
      status text not null default 'planned', -- planned, assigned, in_progress, delivered, cancelled
      scheduled_date date not null,
      notes text,
      created_by uuid not null references public.profiles(id) on delete restrict,
      assigned_driver_id uuid references public.profiles(id) on delete set null,
      created_at timestamptz default now() not null,
      deleted_at timestamptz
    );
  end if;
end $$;

-- Add index for efficient querying on the dashboard
create index if not exists jobs_org_id_created_at_idx
  on public.jobs (org_id, created_at desc);

-- Enable RLS for jobs table
alter table public.jobs enable row level security;

-- RLS Policy: Allow authenticated users to view jobs in their org
drop policy if exists "Authenticated users can view jobs in their tenant" on public.jobs;
create policy "Authenticated users can view jobs in their org" on public.jobs
for select using (
  auth.uid() in (select user_id from public.profiles where org_id = jobs.org_id)
  and deleted_at is null
);

-- RLS Policy: Allow office/admin users to create jobs in their org
drop policy if exists "Office and admin can create jobs in their tenant" on public.jobs;
create policy "Office and admin can create jobs in their org" on public.jobs
for insert with check (
  auth.uid() in (select user_id from public.profiles where org_id = jobs.org_id and role in ('office', 'admin'))
);

-- RLS Policy: Allow office/admin users to update jobs in their org
drop policy if exists "Office and admin can update jobs in their tenant" on public.jobs;
create policy "Office and admin can update jobs in their org" on public.jobs
for update using (
  auth.uid() in (select user_id from public.profiles where org_id = jobs.org_id and role in ('office', 'admin'))
) with check (
  auth.uid() in (select user_id from public.profiles where org_id = jobs.org_id and role in ('office', 'admin'))
);

-- RLS Policy: Allow office/admin users to soft delete jobs in their org
drop policy if exists "Office and admin can soft delete jobs in their tenant" on public.jobs;
create policy "Office and admin can soft delete jobs in their org" on public.jobs
for delete using (
  auth.uid() in (select user_id from public.profiles where org_id = jobs.org_id and role in ('office', 'admin'))
);

-- Create job_stops table only if it does not already exist
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'job_stops'
  ) then
    create table public.job_stops (
      id uuid primary key default uuid_generate_v4(),
      org_id uuid not null,
      job_id uuid not null references public.jobs(id) on delete cascade,
      seq integer not null,
      type text not null, -- collection or delivery
      name text not null,
      address_line1 text not null,
      address_line2 text,
      city text not null,
      postcode text not null,
      window_from text, -- HH:MM
      window_to text,   -- HH:MM
      notes text,
      created_at timestamptz default now() not null
    );
  end if;
end $$;

alter table public.job_stops enable row level security;

-- RLS for job_stops
drop policy if exists "Authenticated users can view job stops in their tenant" on public.job_stops;
create policy "Authenticated users can view job stops in their org" on public.job_stops
for select using (
  auth.uid() in (select user_id from public.profiles where org_id = job_stops.org_id)
);

drop policy if exists "Office and admin can create job stops in their tenant" on public.job_stops;
create policy "Office and admin can create job stops in their org" on public.job_stops
for insert with check (
  auth.uid() in (select user_id from public.profiles where org_id = job_stops.org_id and role in ('office', 'admin'))
);

drop policy if exists "Office and admin can update job stops in their tenant" on public.job_stops;
create policy "Office and admin can update job stops in their org" on public.job_stops
for update using (
  auth.uid() in (select user_id from public.profiles where org_id = job_stops.org_id and role in ('office', 'admin'))
) with check (
  auth.uid() in (select user_id from public.profiles where org_id = job_stops.org_id and role in ('office', 'admin'))
);

drop policy if exists "Office and admin can delete job stops in their tenant" on public.job_stops;
create policy "Office and admin can delete job stops in their org" on public.job_stops
for delete using (
  auth.uid() in (select user_id from public.profiles where org_id = job_stops.org_id and role in ('office', 'admin'))
);

-- Create job_events table only if it does not already exist
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'job_events'
  ) then
    create table public.job_events (
      id uuid primary key default uuid_generate_v4(),
      org_id uuid not null,
      job_id uuid not null references public.jobs(id) on delete cascade,
      stop_id uuid references public.job_stops(id) on delete set null,
      actor_id uuid not null references public.profiles(id) on delete restrict,
      event_type text not null,
      notes text,
      lat numeric(10, 6),
      lon numeric(10, 6),
      created_at timestamptz default now() not null
    );
  end if;
end $$;

alter table public.job_events enable row level security;

-- RLS for job_events
drop policy if exists "Authenticated users can view job events in their tenant" on public.job_events;
create policy "Authenticated users can view job events in their org" on public.job_events
for select using (
  auth.uid() in (select user_id from public.profiles where org_id = job_events.org_id)
);

drop policy if exists "Authenticated users can create job events in their tenant" on public.job_events;
create policy "Authenticated users can create job events in their org" on public.job_events
for insert with check (
  auth.uid() in (select user_id from public.profiles where org_id = job_events.org_id)
);

-- Create documents table only if it does not already exist
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'documents'
  ) then
    create table public.documents (
      id uuid primary key default uuid_generate_v4(),
      org_id uuid not null,
      job_id uuid not null references public.jobs(id) on delete cascade,
      stop_id uuid references public.job_stops(id) on delete set null,
      type text not null, -- pod, cmr, damage, check_signature
      storage_path text not null,
      uploaded_by uuid not null references public.profiles(id) on delete restrict,
      created_at timestamptz default now() not null
    );
  end if;
end $$;

alter table public.documents enable row level security;

-- RLS for documents
drop policy if exists "Authenticated users can view documents in their tenant" on public.documents;
create policy "Authenticated users can view documents in their org" on public.documents
for select using (
  auth.uid() in (select user_id from public.profiles where org_id = documents.org_id)
);

drop policy if exists "Authenticated users can create documents in their tenant" on public.documents;
create policy "Authenticated users can create documents in their org" on public.documents
for insert with check (
  auth.uid() in (select user_id from public.profiles where org_id = documents.org_id)
);
