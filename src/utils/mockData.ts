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
const aliceAdminId = uuidv4();
const owenOfficeId = uuidv4();
const daveDriverId = uuidv4();
const job1Id = uuidv4();
const stop1Id = uuidv4();
const stop2Id = uuidv4();
const stop3Id = uuidv4();
const checklist1Id = uuidv4();

export const mockTenants: Tenant[] = [
  { id: demoTenantId, name: 'Demo Haulage', created_at: new Date().toISOString() },
];

export const mockProfiles: Profile[] = [
  {
    id: aliceAdminId,
    tenant_id: demoTenantId,
    full_name: 'Alice Admin',
    role: 'admin',
    user_id: 'auth_user_alice', // Placeholder for Supabase auth.users.id
    created_at: new Date().toISOString(),
    is_demo: true, // Marked as demo
  },
  {
    id: owenOfficeId,
    tenant_id: demoTenantId,
    full_name: 'Owen Office',
    role: 'office',
    user_id: 'auth_user_owen', // Placeholder
    created_at: new Date().toISOString(),
    is_demo: true, // Marked as demo
  },
  {
    id: daveDriverId,
    tenant_id: demoTenantId,
    full_name: 'Dave Driver',
    role: 'driver',
    user_id: 'auth_user_dave', // Placeholder
    truck_reg: 'DA66 VED',
    trailer_no: 'TRL-001',
    created_at: new Date().toISOString(),
    last_location: { lat: 51.5074, lon: -0.1278, timestamp: new Date().toISOString() }, // London
    last_job_status: 'in_progress',
    is_demo: true, // Marked as demo
  },
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    full_name: 'Eve Driver',
    role: 'driver',
    user_id: 'auth_user_eve',
    truck_reg: 'EV77 EVE',
    trailer_no: 'TRL-002',
    created_at: new Date().toISOString(),
    last_location: { lat: 52.4862, lon: -1.8904, timestamp: new Date().toISOString() }, // Birmingham
    last_job_status: 'planned',
    is_demo: false, // Not a demo user
  },
];

export const mockDailyChecklists: DailyChecklist[] = [
  {
    id: checklist1Id,
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
  {
    id: job1Id,
    tenant_id: demoTenantId,
    ref: 'JOB-001',
    price: 250.00,
    status: 'assigned',
    scheduled_date: today.toISOString().split('T')[0],
    notes: 'Urgent delivery, handle with care.',
    created_by: owenOfficeId,
    assigned_driver_id: daveDriverId,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    ref: 'JOB-002',
    price: 180.00,
    status: 'planned',
    scheduled_date: tomorrow.toISOString().split('T')[0],
    notes: 'Standard delivery.',
    created_by: owenOfficeId,
    assigned_driver_id: undefined, // Unallocated
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    ref: 'JOB-003',
    price: 320.00,
    status: 'delivered',
    scheduled_date: new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0],
    notes: 'Completed yesterday.',
    created_by: owenOfficeId,
    assigned_driver_id: daveDriverId,
    created_at: new Date().toISOString(),
  },
];

export const mockJobStops: JobStop[] = [
  {
    id: stop1Id,
    tenant_id: demoTenantId,
    job_id: job1Id,
    seq: 1,
    type: 'collection',
    name: 'Supplier A',
    address_line1: '123 Industrial Rd',
    city: 'Warehouse City',
    postcode: 'WC1 1AA',
    window_from: '09:00',
    window_to: '10:00',
    notes: 'Collect 2 pallets.',
  },
  {
    id: stop2Id,
    tenant_id: demoTenantId,
    job_id: job1Id,
    seq: 2,
    type: 'collection',
    name: 'Supplier B',
    address_line1: '456 Logistics Ave',
    city: 'Freight Town',
    postcode: 'FT2 2BB',
    window_from: '10:30',
    window_to: '11:30',
    notes: 'Collect 1 large crate.',
  },
  {
    id: stop3Id,
    tenant_id: demoTenantId,
    job_id: job1Id,
    seq: 3,
    type: 'delivery',
    name: 'Customer X',
    address_line1: '789 Retail St',
    city: 'Marketville',
    postcode: 'MV3 3CC',
    window_from: '14:00',
    window_to: '16:00',
    notes: 'Deliver to loading bay.',
  },
];

export const mockJobEvents: JobEvent[] = [
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    job_id: job1Id,
    actor_id: owenOfficeId,
    event_type: 'job_confirmed',
    notes: 'Job confirmed by office.',
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(), // 1 day ago
  },
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    job_id: job1Id,
    actor_id: daveDriverId,
    event_type: 'status_changed', // Changed from 'assigned' to 'status_changed' for consistency
    notes: 'Assigned to Dave Driver.',
    created_at: new Date(Date.now() - 3600 * 1000 * 23).toISOString(),
  },
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    job_id: job1Id,
    stop_id: stop1Id,
    actor_id: daveDriverId,
    event_type: 'at_collection',
    notes: 'Arrived at Supplier A.',
    lat: 51.5, lon: -0.1,
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    job_id: job1Id,
    stop_id: stop1Id,
    actor_id: daveDriverId,
    event_type: 'departed_collection',
    notes: 'Departed Supplier A with goods.',
    lat: 51.505, lon: -0.105,
    created_at: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(), // 1.5 hours ago
  },
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    job_id: job1Id,
    stop_id: stop2Id,
    actor_id: daveDriverId,
    event_type: 'at_collection',
    notes: 'Arrived at Supplier B.',
    lat: 51.51, lon: -0.11,
    created_at: new Date(Date.now() - 3600 * 1000 * 1).toISOString(), // 1 hour ago
  },
];

export const mockDocuments: Document[] = [
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    job_id: job1Id,
    stop_id: stop1Id,
    type: 'pod',
    storage_path: '/pods/job1_stop1_pod.jpg', // Placeholder path
    uploaded_by: daveDriverId,
    created_at: new Date(Date.now() - 3600 * 1000 * 1.4).toISOString(),
  },
  {
    id: uuidv4(),
    tenant_id: demoTenantId,
    job_id: job1Id,
    stop_id: stop2Id,
    type: 'pod',
    storage_path: '/pods/job1_stop2_pod.jpg', // Placeholder path
    uploaded_by: daveDriverId,
    created_at: new Date(Date.now() - 3600 * 1000 * 0.8).toISOString(),
  },
];

export const mockProfileDevices: ProfileDevice[] = []; // Initially empty

export const mockDailyChecks: DailyCheck[] = []; // Initially empty

export let mockAuditLogs: AuditLog[] = []; // Made mutable for purgeDemoUsers