import { v4 as uuidv4 } from 'uuid';

// Mock Data Structures (simplified for client-side use)
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string; // Changed from tenant_id
  full_name: string;
  dob?: string;
  phone?: string;
  role: 'driver' | 'office' | 'admin';
  user_id: string; // Corresponds to auth.users.id
  truck_reg?: string;
  trailer_no?: string;
  created_at: string;
  last_location?: { lat: number; lon: number; timestamp: string };
  last_job_status?: string;
  is_demo: boolean; // New field
}

export interface DailyChecklist {
  id: string;
  org_id: string; // Changed from tenant_id
  name: string;
  items: { id: string; text: string; type: 'checkbox' | 'text' }[];
  active: boolean;
  created_at: string;
}

// New interfaces for Daily HGV Checks
export interface DailyCheckItem {
  id: string;
  org_id: string; // Changed from tenant_id
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyCheckResponse {
  id: string;
  org_id: string; // Changed from tenant_id
  driver_id: string;
  truck_reg: string;
  trailer_no?: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  signature?: string; // Base64 string or file reference
  items: Array<{ item_id: string; ok: boolean; notes?: string; photo_url?: string }>;
  created_at: string;
}

export interface DailyCheck {
  id: string;
  org_id: string; // Changed from tenant_id
  driver_id: string;
  checklist_id: string;
  vehicle_reg: string;
  trailer_no?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: 'pass' | 'fail' | 'partial';
  answers: Record<string, string | boolean>;
  notes?: string;
  signature_path?: string;
  created_at: string;
}

export interface Job {
  id: string;
  org_id: string; // Changed from tenant_id
  ref: string;
  price: number | null; // Changed to allow null
  status: 'planned' | 'assigned' | 'in_progress' | 'delivered' | 'cancelled';
  scheduled_date: string; // YYYY-MM-DD
  notes?: string | null; // Changed to allow null
  created_by: string; // profile_id
  assigned_driver_id?: string | null; // profile_id // Changed to allow null
  created_at: string;
  deleted_at?: string | null; // Added for soft deletion
}

export interface JobStop {
  id: string;
  org_id: string; // Changed from tenant_id
  job_id: string;
  seq: number;
  type: 'collection' | 'delivery';
  name: string;
  address_line1: string;
  address_line2?: string | null; // Changed to allow null
  city: string;
  postcode: string;
  window_from?: string | null; // HH:MM // Changed to allow null
  window_to?: string | null; // HH:MM // Changed to allow null
  notes?: string | null; // Changed to allow null
}

export interface JobEvent {
  id: string;
  org_id: string; // Changed from tenant_id
  job_id: string;
  stop_id?: string | null; // Changed to allow null
  actor_id: string; // profile_id
  event_type: 'job_confirmed' | 'eta_set' | 'at_collection' | 'departed_collection' | 'at_delivery' | 'delivered' | 'pod_requested' | 'pod_uploaded' | 'location_ping' | 'status_changed' | 'job_cancelled' | 'note_added';
  notes?: string | null; // Changed to allow null
  lat?: number | null; // Changed to allow null
  lon?: number | null; // Changed to allow null
  created_at: string;
}

export interface Document {
  id: string;
  org_id: string; // Changed from tenant_id
  job_id: string;
  stop_id?: string | null; // Changed to allow null
  type: 'pod' | 'cmr' | 'damage' | 'check_signature';
  storage_path: string;
  uploaded_by: string; // profile_id
  created_at: string;
}

export interface ProfileDevice {
  id: string;
  org_id: string; // Changed from tenant_id
  profile_id: string;
  platform: 'ios' | 'android';
  expo_push_token: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string; // Changed from tenant_id
  actor_id: string; // profile_id
  entity: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'cancel' | 'allocate_ref' | 'reset_password';
  before?: Record<string, any> | null; // Changed to allow null
  after?: Record<string, any> | null; // Changed to allow null
  notes?: string | null; // Changed to allow null
  created_at: string;
}

// Seed Data
const demoTenantId = uuidv4();
const aliceAdminId = uuidv4();
const daveDriverId = uuidv4(); // New driver ID

const checklist1Id = uuidv4();

export const mockTenants: Tenant[] = [
  { id: demoTenantId, name: 'Demo Haulage', created_at: new Date().toISOString() },
];

export let mockProfiles: Profile[] = [ // Made mutable
  {
    id: aliceAdminId,
    org_id: demoTenantId, // Changed from tenant_id
    full_name: 'Alice Admin',
    role: 'admin',
    user_id: 'auth_user_alice', // Placeholder for Supabase auth.users.id
    created_at: new Date().toISOString(),
    is_demo: true, // Marked as demo
  },
  {
    id: daveDriverId,
    org_id: demoTenantId, // Changed from tenant_id
    full_name: 'Dave Driver',
    role: 'driver',
    user_id: 'auth_user_dave',
    truck_reg: 'DA66 VED',
    trailer_no: 'TRL-007',
    created_at: new Date().toISOString(),
    last_location: { lat: 51.5, lon: -0.1, timestamp: new Date().toISOString() },
    last_job_status: 'delivered',
    is_demo: true,
  },
];

export const mockDailyChecklists: DailyChecklist[] = [
  {
    id: checklist1Id,
    org_id: demoTenantId, // Changed from tenant_id
    name: 'Pre-shift Vehicle Check',
    items: [
      { id: 'lights', text: 'All lights working?', type: 'checkbox' },
      { id: 'tires', text: 'Tire pressure and condition OK?', type: 'checkbox' },
      { id: 'fuel', text: 'Fuel level sufficient?', type: 'checkbox' },
      { id: 'brakes', text: 'Brakes functioning correctly?', type: 'checkbox' },
      { id: 'oil', text: 'Engine oil level OK?', type: 'checkbox' },
      { id: 'notes', text: 'Any additional notes?', type: 'text' },
    ],
    active: true,
    created_at: new Date().toISOString(),
  },
];

// New mock data arrays for Daily HGV Checks
export const mockDailyCheckItems: DailyCheckItem[] = [
  {
    id: uuidv4(),
    org_id: demoTenantId, // Changed from tenant_id
    title: "Brakes",
    description: "Check brake fluid, pads, and general function.",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    org_id: demoTenantId, // Changed from tenant_id
    title: "Lights",
    description: "Check all exterior lights (headlights, tail lights, indicators, brake lights).",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    org_id: demoTenantId, // Changed from tenant_id
    title: "Tires",
    description: "Check tire pressure, tread depth, and for any damage.",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    org_id: demoTenantId, // Changed from tenant_id
    title: "Windscreen Wipers",
    description: "Check wiper blades for wear and washer fluid level.",
    is_active: false,
    created_at: new Date().toISOString(),
  },
];

export const mockDailyCheckResponses: DailyCheckResponse[] = [];


const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

// Removed mockJobs, mockJobStops, mockJobEvents, mockDocuments
export const mockJobs: Job[] = [];
export const mockJobStops: JobStop[] = [];
export const mockJobEvents: JobEvent[] = [];
export const mockDocuments: Document[] = [];


export const mockProfileDevices: ProfileDevice[] = []; // Initially empty

export const mockDailyChecks: DailyCheck[] = []; // Initially empty

export let mockAuditLogs: AuditLog[] = []; // Made mutable for purgeDemoUsers