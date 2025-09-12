export interface Job {
  id: string;
  org_id: string;
  order_number: string;
  status: string;
  date_created: string;
  price: number;
  assigned_driver_id?: string;
  notes?: string;
  created_at: string;
  deleted_at?: string;
  last_status_update_at?: string;
  collection_name: string;
  collection_city: string;
  collection_postcode: string;
  delivery_name: string;
  delivery_city: string;
  delivery_postcode: string;
  pod_signature_path?: string | null;
  pod_signature_name?: string | null;
}

export interface Profile {
  id: string;
  org_id: string | null;
  full_name: string;
  phone: string | null;
  dob: string | null;
  role: 'admin' | 'office' | 'driver';
  user_id: string;
  truck_reg: string | null;
  trailer_no: string | null;
  created_at?: string;
  last_location?: string;
  last_job_status?: string;
  is_demo?: boolean;
  avatar_url?: string | null;
  active_session_token?: string | null;
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
  display_id: string;
}

export interface Document {
  id: string;
  org_id: string;
  job_id: string;
  stop_id?: string;
  type: 'pod' | 'check_signature' | 'document_uploaded' | 'signature'; // Added 'signature' type
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  signature_name?: string; // Added for captured signatures
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
  window_from?: string | null;
  window_to?: string | null;
  notes?: string | null;
  created_at: string;
  is_last_delivery?: boolean; // Added for driver app logic
}

export interface JobProgressLog {
  id: string;
  org_id: string;
  job_id: string;
  actor_id: string;
  action_type: string;
  timestamp: string;
  notes?: string;
  created_at?: string;
  actor_role?: string;
  stop_id?: string;
  lat?: number;
  lon?: number;
  visible_in_timeline?: boolean;
  file_path?: string;
}

export interface Tenant {
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
  display_id: string;
}

export const mockTenants: Tenant[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    name: 'Mock Tenant 1',
    created_at: '2023-01-01T12:00:00Z',
    display_id: 'MT-001',
    logo_url: null,
    address_line1: '123 Mock Street',
    address_line2: '',
    city: 'Mockville',
    postcode: 'M1 1CK',
    contact_number: '01234567890',
    website: 'https://mocktenant1.com'
  },
  {
    id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
    name: 'Mock Tenant 2',
    created_at: '2023-01-02T12:00:00Z',
    display_id: 'MT-002',
    logo_url: null,
    address_line1: '456 Mock Avenue',
    address_line2: '',
    city: 'Mocktown',
    postcode: 'M2 2CK',
    contact_number: '09876543210',
    website: 'https://mocktenant2.com'
  },
];