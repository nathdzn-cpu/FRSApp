import { v4 as uuidv4 } from 'uuid';

// Mock Data Structures (simplified for client-side use)
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  created_at: string;
  logo_url?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  contact_number?: string | null;
  website?: string | null;
}

export interface Profile {
  id: string;
  org_id: string;
  full_name: string;
  avatar_url?: string | null;
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
  org_id: string;
  name: string;
  items: { id: string; text: string; type: 'checkbox' | 'text' }[];
  active: boolean;
  created_at: string;
}

// New interfaces for Daily HGV Checks
export interface DailyCheckItem {
  id: string;
  org_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyCheckResponse {
  id: string;
  org_id: string;
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
  org_id: string;
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
  org_id: string;
  order_number: string; // Changed from 'ref'
  status: 'planned' | 'assigned' | 'accepted' | 'delivered' | 'cancelled' | 'on_route_collection' | 'at_collection' | 'loaded' | 'on_route_delivery' | 'at_delivery' | 'pod_received'; // Renamed 'in_progress' to 'accepted'
  collection_date: string; // New field
  delivery_date: string; // New field
  price: number | null; // New field
  assigned_driver_id?: string | null; // New field
  notes?: string | null; // New field
  created_at: string;
  deleted_at?: string | null; // Added for soft deletion
  last_status_update_at?: string | null; // New field for last status update timestamp
  pod_signature_path?: string | null; // New field for signature path
  pod_signature_name?: string | null; // New field for signature name
  // New fields from jobs_with_stop_details view
  collection_name?: string | null;
  collection_city?: string | null;
  delivery_name?: string | null;
  delivery_city?: string | null;
  delivery_postcode?: string | null; // Added
}

export interface JobStop {
  id: string;
  org_id: string;
  job_id: string;
  seq: number;
  type: 'collection' | 'delivery';
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  postcode: string;
  window_from?: string | null; // HH:MM
  window_to?: string | null; // HH:MM
  notes?: string | null;
}

export interface Document {
  id: string;
  org_id: string;
  job_id: string;
  stop_id?: string | null;
  type: 'pod' | 'cmr' | 'damage' | 'check_signature' | 'document_uploaded';
  storage_path: string;
  uploaded_by: string; // profile_id
  created_at: string;
}

export interface ProfileDevice {
  id: string;
  org_id: string;
  profile_id: string;
  platform: 'ios' | 'android';
  expo_push_token: string;
  created_at: string;
}

export interface JobProgressLog {
  id: string;
  org_id: string;
  job_id: string;
  actor_id: string;
  action_type: string; // Renamed from status
  actor_role?: 'driver' | 'office' | 'admin'; // New field
  timestamp: string;
  notes?: string | null;
  created_at: string;
  lat?: number; // Added lat/lon for location pings
  lon?: number; // Added lat/lon for location pings
  stop_id?: string | null; // Added stop_id for stop-specific events
  visible_in_timeline?: boolean; // New field for timeline visibility
  file_path?: string | null; // New field for file paths in logs
}

export interface AuditLog {
  id: string;
  org_id: string;
  actor_id: string; // profile_id
  entity: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'cancel' | 'allocate_ref' | 'reset_password' | 'update_progress' | 'pod_requested' | 'pod_uploaded' | 'job_confirmed' | 'eta_set' | 'at_collection' | 'departed_collection' | 'at_delivery' | 'delivered' | 'location_ping' | 'note_added' | 'timeline_event_removed_from_timeline' | 'timeline_event_restored_to_timeline' | 'saved_address_created' | 'saved_address_updated' | 'saved_address_deleted'; // Added common event types
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  notes?: string | null;
  created_at: string;
}

// New interface for Saved Addresses
export interface SavedAddress {
  id: string;
  org_id: string;
  name?: string | null;
  line_1: string;
  line_2?: string | null;
  town_or_city: string;
  county?: string | null;
  postcode: string;
  favourite: boolean;
  created_at: string;
}

// New interface for Quotes
export interface Quote {
  id: string;
  org_id: string;
  created_at: string;
  from_location: string;
  to_location: string;
  customer: string;
  price: number | null;
  mileage: number | null;
  drops: number;
  job_id?: string | null;
}

// New interface for Notifications
export interface Notification {
  id: string;
  user_id: string;
  org_id: string;
  title: string;
  message: string;
  link_to?: string | null;
  is_read: boolean;
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
    org_id: demoTenantId,
    full_name: 'Alice Admin',
    role: 'admin',
    user_id: 'auth_user_alice', // Placeholder for Supabase auth.users.id
    created_at: new Date().toISOString(),
    is_demo: true, // Marked as demo
  },
  {
    id: daveDriverId,
    org_id: demoTenantId,
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
    org_id: demoTenantId,
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
    org_id: demoTenantId,
    title: "Brakes",
    description: "Check brake fluid, pads, and general function.",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    org_id: demoTenantId,
    title: "Lights",
    description: "Check all exterior lights (headlights, tail lights, indicators, brake lights).",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    org_id: demoTenantId,
    title: "Tires",
    description: "Check tire pressure, tread depth, and for any damage.",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    org_id: demoTenantId,
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
// mockJobEvents is removed
export const mockDocuments: Document[] = [];
export const mockJobProgressLogs: JobProgressLog[] = []; // New mock array for progress logs


export const mockProfileDevices: ProfileDevice[] = []; // Initially empty

export const mockDailyChecks: DailyCheck[] = []; // Initially empty

export let mockAuditLogs: AuditLog[] = []; // Made mutable for purgeDemoUsers

export const mockSavedAddresses: SavedAddress[] = [
  {
    id: uuidv4(),
    org_id: demoTenantId,
    name: "Main Depot",
    line_1: "123 Main Street",
    line_2: null,
    town_or_city: "London",
    county: "Greater London",
    postcode: "SW1A 0AA",
    favourite: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    org_id: demoTenantId,
    name: "Warehouse North",
    line_1: "45 Warehouse Road",
    line_2: "Unit 10",
    town_or_city: "Manchester",
    county: "Greater Manchester",
    postcode: "M1 1AA",
    favourite: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    org_id: demoTenantId,
    name: "Customer A",
    line_1: "789 High Street",
    line_2: null,
    town_or_city: "Birmingham",
    county: "West Midlands",
    postcode: "B1 1BB",
    favourite: false,
    created_at: new Date().toISOString(),
  },
];