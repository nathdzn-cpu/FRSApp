-- Create daily_check_items table only if it does not already exist
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'daily_check_items'
  ) then
    create table public.daily_check_items (
      id uuid primary key default uuid_generate_v4(),
      org_id uuid not null,
      title text not null,
      description text,
      is_active boolean default true not null,
      created_at timestamptz default now() not null
    );
  end if;
end $$;

-- Create daily_check_responses table only if it does not already exist
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'daily_check_responses'
  ) then
    create table public.daily_check_responses (
      id uuid primary key default uuid_generate_v4(),
      org_id uuid not null,
      driver_id uuid not null references public.profiles(id) on delete cascade,
      truck_reg text not null,
      trailer_no text,
      started_at timestamptz default now() not null,
      finished_at timestamptz not null,
      duration_seconds integer not null,
      signature text,
      items jsonb not null,
      created_at timestamptz default now() not null
    );
  end if;
end $$;

-- Enable Row Level Security
alter table public.daily_check_items enable row level security;
alter table public.daily_check_responses enable row level security;

-- Drop old policies if they exist (prevents duplicates)
drop policy if exists "Admins can manage daily_check_items" on public.daily_check_items;
drop policy if exists "Drivers and Office can view active daily_check_items" on public.daily_check_items;
drop policy if exists "Admins can manage daily_check_responses" on public.daily_check_responses;
drop policy if exists "Drivers can insert their own daily_check_responses" on public.daily_check_responses;
drop policy if exists "Drivers can view their own daily_check_responses" on public.daily_check_responses;

-- RLS for daily_check_items
create policy "Admins can manage daily_check_items" on public.daily_check_items
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.org_id = daily_check_items.org_id
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.org_id = daily_check_items.org_id
        and profiles.role = 'admin'
    )
  );

create policy "Drivers and Office can view active daily_check_items" on public.daily_check_items
  for select using (
    is_active = true
    and exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.org_id = daily_check_items.org_id
        and profiles.role in ('driver','office','admin')
    )
  );

-- RLS for daily_check_responses
create policy "Admins can manage daily_check_responses" on public.daily_check_responses
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.org_id = daily_check_responses.org_id
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.org_id = daily_check_responses.org_id
        and profiles.role = 'admin'
    )
  );

create policy "Drivers can insert their own daily_check_responses" on public.daily_check_responses
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.org_id = daily_check_responses.org_id
        and profiles.role = 'driver'
        and profiles.id = daily_check_responses.driver_id
    )
  );

create policy "Drivers can view their own daily_check_responses" on public.daily_check_responses
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.org_id = daily_check_responses.org_id
        and profiles.role = 'driver'
        and profiles.id = daily_check_responses.driver_id
    )
  );

-- Create storage bucket for daily check photos
insert into storage.buckets (id, name, public)
values ('daily-checks', 'daily-checks', false)
on conflict (id) do nothing;

-- Drop old storage policies
drop policy if exists "Admins can manage daily-checks bucket" on storage.objects;
drop policy if exists "Drivers can upload and view their own daily-checks" on storage.objects;

-- Policy for admins
create policy "Admins can manage daily-checks bucket" on storage.objects
for all using (
  bucket_id = 'daily-checks'
  and exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
)
with check (
  bucket_id = 'daily-checks'
  and exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
);

-- Policy for drivers
create policy "Drivers can upload and view their own daily-checks" on storage.objects
for all using (
  bucket_id = 'daily-checks'
  and exists (select 1 from public.profiles where user_id = auth.uid() and role = 'driver')
  and (storage.foldername(name))[1] = (
    select id::text from public.profiles where user_id = auth.uid() and role = 'driver'
  )
)
with check (
  bucket_id = 'daily-checks'
  and exists (select 1 from public.profiles where user_id = auth.uid() and role = 'driver')
  and (storage.foldername(name))[1] = (
    select id::text from public.profiles where user_id = auth.uid() and role = 'driver'
  )
);
