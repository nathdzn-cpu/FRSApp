import { v4 as uuidv4 } from 'uuid';

// Mock Data Structures (simplified for client-side use)
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
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
  tenant_id: string;
  name: string;
  items: { id: string; text: string; type: 'checkbox' | 'text' }[];
  active: boolean;
  created_at: string;
}

export interface DailyCheck {
  id: string;
  tenant_id: string;
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
  tenant_id: string;
  ref: string;
  price: number;
  status: 'planned' | 'assigned' | 'in_progress' | 'delivered' | 'cancelled';
  scheduled_date: string; // YYYY-MM-DD
  notes?: string;
  created_by: string; // profile_id
  assigned_driver_id?: string; // profile_id
  created_at: string;
}

export interface JobStop {
  id: string;
  tenant_id: string;
  job_id: string;
  seq: number;
  type: 'collection' | 'delivery';
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  window_from?: string; // HH:MM
  window_to?: string; // HH:MM
  notes?: string;
}

export interface JobEvent {
  id: string;
  tenant_id: string;
  job_id: string;
  stop_id?: string;
  actor_id: string; // profile_id
  event_type: 'job_confirmed' | 'eta_set' | 'at_collection' | 'departed_collection' | 'at_delivery' | 'delivered' | 'pod_requested' | 'pod_uploaded' | 'location_ping' | 'status_changed' | 'job_cancelled' | 'note_added';
  notes?: string;
  lat?: number;
  lon?: number;
  created_at: string;
}

export interface Document {
  id: string;
  tenant_id: string;
  job_id: string;
  stop_id?: string;
  type: 'pod' | 'cmr' | 'damage' | 'check_signature';
  storage_path: string;
  uploaded_by: string; // profile_id
  created_at: string;
}

export interface ProfileDevice {
  id: string;
  tenant_id: string;
  profile_id: string;
  platform: 'ios' | 'android';
  expo_push_token: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  actor_id: string; // profile_id
  entity: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'cancel' | 'allocate_ref' | 'reset_password';
  before?: Record<string, any>;
  after?: Record<string, any>;
  notes?: string;
  created_at: string;
}

// Seed Data
const demoTenantId = uuidv4();

export const mockTenants: Tenant[] = [
  { id: demoTenantId, name: 'Demo Haulage', created_at: new Date().toISOString() },
];

// mockProfiles, mockAuditLogs, mockDailyChecks, mockProfileDevices are now managed by Supabase
// We'll keep a minimal initial admin profile for the demo to function
export let mockProfiles: Profile[] = [
  {
    id: 'auth_user_alice', // This ID should match a real Supabase Auth user ID for the admin
    tenant_id: demoTenantId,
    full_name: 'Alice Admin',
    role: 'admin',
    user_id: 'auth_user_alice',
    created_at: new Date().toISOString(),
    is_demo: true,
  },
];

export const mockDailyChecklists: DailyChecklist[] = [
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
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

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

export const mockJobs: Job[] = [
  // Jobs will be created dynamically or assigned to existing users
];

export const mockJobStops: JobStop[] = [
  // Stops will be created dynamically
];

export const mockJobEvents: JobEvent[] = [
  // Events will be created dynamically
];

export const mockDocuments: Document[] = [
  // Documents will be created dynamically
];

export const mockProfileDevices: ProfileDevice[] = []; // Now empty, will be managed by Supabase

export const mockDailyChecks: DailyCheck[] = []; // Now empty, will be managed by Supabase

export let mockAuditLogs: AuditLog[] = []; // Now empty, will be managed by Supabase