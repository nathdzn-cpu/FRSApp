-- Create jobs table
CREATE TABLE public.jobs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ref text NOT NULL,
    price numeric(10, 2),
    status text NOT NULL DEFAULT 'planned', -- 'planned', 'assigned', 'in_progress', 'delivered', 'cancelled'
    scheduled_date date NOT NULL,
    notes text,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assigned_driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

-- Add index for efficient querying on the dashboard
CREATE INDEX jobs_tenant_id_created_at_idx ON public.jobs (tenant_id, created_at DESC);

-- Enable RLS for jobs table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view jobs in their tenant
CREATE POLICY "Authenticated users can view jobs in their tenant" ON public.jobs
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = jobs.tenant_id)
    AND deleted_at IS NULL
);

-- RLS Policy: Allow office/admin users to create jobs in their tenant
CREATE POLICY "Office and admin can create jobs in their tenant" ON public.jobs
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = jobs.tenant_id AND role IN ('office', 'admin'))
);

-- RLS Policy: Allow office/admin users to update jobs in their tenant
CREATE POLICY "Office and admin can update jobs in their tenant" ON public.jobs
FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = jobs.tenant_id AND role IN ('office', 'admin'))
) WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = jobs.tenant_id AND role IN ('office', 'admin'))
);

-- RLS Policy: Allow office/admin users to soft delete jobs in their tenant
CREATE POLICY "Office and admin can soft delete jobs in their tenant" ON public.jobs
FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = jobs.tenant_id AND role IN ('office', 'admin'))
);

-- Create job_stops table
CREATE TABLE public.job_stops (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    seq integer NOT NULL,
    type text NOT NULL, -- 'collection' or 'delivery'
    name text NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    postcode text NOT NULL,
    window_from text, -- HH:MM
    window_to text, -- HH:MM
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for job_stops table
ALTER TABLE public.job_stops ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view job_stops in their tenant
CREATE POLICY "Authenticated users can view job stops in their tenant" ON public.job_stops
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = job_stops.tenant_id)
);

-- RLS Policy: Allow office/admin users to create job_stops in their tenant
CREATE POLICY "Office and admin can create job stops in their tenant" ON public.job_stops
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = job_stops.tenant_id AND role IN ('office', 'admin'))
);

-- RLS Policy: Allow office/admin users to update job_stops in their tenant
CREATE POLICY "Office and admin can update job stops in their tenant" ON public.job_stops
FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = job_stops.tenant_id AND role IN ('office', 'admin'))
) WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = job_stops.tenant_id AND role IN ('office', 'admin'))
);

-- RLS Policy: Allow office/admin users to delete job_stops in their tenant
CREATE POLICY "Office and admin can delete job stops in their tenant" ON public.job_stops
FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = job_stops.tenant_id AND role IN ('office', 'admin'))
);

-- Create job_events table
CREATE TABLE public.job_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    stop_id uuid REFERENCES public.job_stops(id) ON DELETE SET NULL,
    actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    event_type text NOT NULL,
    notes text,
    lat numeric(10, 6),
    lon numeric(10, 6),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for job_events table
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view job_events in their tenant
CREATE POLICY "Authenticated users can view job events in their tenant" ON public.job_events
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = job_events.tenant_id)
);

-- RLS Policy: Allow any authenticated user to create job_events in their tenant
CREATE POLICY "Authenticated users can create job events in their tenant" ON public.job_events
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = job_events.tenant_id)
);

-- Create documents table
CREATE TABLE public.documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    stop_id uuid REFERENCES public.job_stops(id) ON DELETE SET NULL,
    type text NOT NULL, -- 'pod', 'cmr', 'damage', 'check_signature'
    storage_path text NOT NULL,
    uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view documents in their tenant
CREATE POLICY "Authenticated users can view documents in their tenant" ON public.documents
FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = documents.tenant_id)
);

-- RLS Policy: Allow any authenticated user to create documents in their tenant
CREATE POLICY "Authenticated users can create documents in their tenant" ON public.documents
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE tenant_id = documents.tenant_id)
);