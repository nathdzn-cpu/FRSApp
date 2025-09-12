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
  last_location?: any; // Can be string or object
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
  type: 'pod' | 'check_signature' | 'document_uploaded' | 'signature' | 'image';
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  signature_name?: string;
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
  is_last_delivery?: boolean;
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

export interface AuditLog {
  id: string;
  org_id: string;
  actor_id: string;
  entity: string;
  entity_id: string;
  action: string;
  before: any;
  after: any;
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

export interface DailyCheck {
  id: string;
  org_id: string;
  driver_id: string;
  checklist_id: string;
  vehicle_reg: string;
  trailer_no?: string;
  started_at: string;
  ended_at: string;
  duration_seconds?: number;
  status: 'pass' | 'fail' | 'partial';
  answers: Record<string, string | boolean>;
  notes?: string;
  signature_path?: string;
  created_at: string;
}

export interface DailyChecklistItem {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
}

export interface DailyChecklist {
  id: string;
  org_id: string;
  name: string;
  items: DailyChecklistItem[];
}

export interface SavedAddress {
  id: string;
  org_id: string;
  name: string | null;
  line_1: string;
  line_2: string | null;
  town_or_city: string;
  county: string | null;
  postcode: string;
  favourite: boolean;
  created_at: string;
}

export interface Quote {
  id: string;
  org_id: string;
  created_at: string;
  from_location: string;
  to_location: string;
  customer: string | null;
  price: number | null;
  mileage: number | null;
  drops: number;
  job_id: string | null;
}