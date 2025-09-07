-- Create daily_check_items table
CREATE TABLE public.daily_check_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    is_active boolean DEFAULT TRUE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create daily_check_responses table
CREATE TABLE public.daily_check_responses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    truck_reg text NOT NULL,
    trailer_no text,
    started_at timestamptz DEFAULT now() NOT NULL,
    finished_at timestamptz NOT NULL,
    duration_seconds integer NOT NULL,
    signature text, -- Base64 string or file reference
    items jsonb NOT NULL, -- Array of objects: [{ "item_id": "uuid", "ok": true|false, "notes": "string|null", "photo_url": "string|null" }]
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security for daily_check_items
ALTER TABLE public.daily_check_items ENABLE ROW LEVEL SECURITY;

-- RLS policy for daily_check_items: Admins can do anything, others can select active items
CREATE POLICY "Admins can manage daily_check_items" ON public.daily_check_items
  FOR ALL USING (
    (EXISTS ( SELECT 1 FROM public.profiles WHERE (profiles.user_id = auth.uid()) AND (profiles.org_id = daily_check_items.org_id) AND (profiles.role = 'admin')))
  ) WITH CHECK (
    (EXISTS ( SELECT 1 FROM public.profiles WHERE (profiles.user_id = auth.uid()) AND (profiles.org_id = daily_check_items.org_id) AND (profiles.role = 'admin')))
  );

CREATE POLICY "Drivers and Office can view active daily_check_items" ON public.daily_check_items
  FOR SELECT USING (
    (is_active = TRUE) AND
    (EXISTS ( SELECT 1 FROM public.profiles WHERE (profiles.user_id = auth.uid()) AND (profiles.org_id = daily_check_items.org_id) AND (profiles.role IN ('driver', 'office', 'admin'))))
  );

-- Enable Row Level Security for daily_check_responses
ALTER TABLE public.daily_check_responses ENABLE ROW LEVEL SECURITY;

-- RLS policy for daily_check_responses: Admins full access, Drivers insert/select their own
CREATE POLICY "Admins can manage daily_check_responses" ON public.daily_check_responses
  FOR ALL USING (
    (EXISTS ( SELECT 1 FROM public.profiles WHERE (profiles.user_id = auth.uid()) AND (profiles.org_id = daily_check_responses.org_id) AND (profiles.role = 'admin')))
  ) WITH CHECK (
    (EXISTS ( SELECT 1 FROM public.profiles WHERE (profiles.user_id = auth.uid()) AND (profiles.org_id = daily_check_responses.org_id) AND (profiles.role = 'admin')))
  );

CREATE POLICY "Drivers can insert their own daily_check_responses" ON public.daily_check_responses
  FOR INSERT WITH CHECK (
    (EXISTS ( SELECT 1 FROM public.profiles WHERE (profiles.user_id = auth.uid()) AND (profiles.org_id = daily_check_responses.org_id) AND (profiles.role = 'driver') AND (profiles.id = daily_check_responses.driver_id)))
  );

CREATE POLICY "Drivers can view their own daily_check_responses" ON public.daily_check_responses
  FOR SELECT USING (
    (EXISTS ( SELECT 1 FROM public.profiles WHERE (profiles.user_id = auth.uid()) AND (profiles.org_id = daily_check_responses.org_id) AND (profiles.role = 'driver') AND (profiles.id = daily_check_responses.driver_id)))
  );

-- Create a storage bucket for daily check photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('daily-checks', 'daily-checks', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for daily-checks bucket:
-- Admins can do anything
-- Drivers can upload to their own folder (simulated by driver_id in path) and view their own uploads
-- (Note: This RLS is simplified for mock. Real RLS for storage is more complex and often involves Edge Functions for signed URLs)

-- Policy for admins on daily-checks bucket
CREATE POLICY "Admins can manage daily-checks bucket" ON storage.objects
FOR ALL USING (
  bucket_id = 'daily-checks' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  bucket_id = 'daily-checks' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policy for drivers to upload and view their own files in daily-checks bucket
CREATE POLICY "Drivers can upload and view their own daily-checks" ON storage.objects
FOR ALL USING (
  bucket_id = 'daily-checks' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'driver') AND
  (storage.foldername(name))[1] = (SELECT id::text FROM public.profiles WHERE user_id = auth.uid() AND role = 'driver')
) WITH CHECK (
  bucket_id = 'daily-checks' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'driver') AND
  (storage.foldername(name))[1] = (SELECT id::text FROM public.profiles WHERE user_id = auth.uid() AND role = 'driver')
);