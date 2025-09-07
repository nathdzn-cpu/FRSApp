import { supabase } from '../supabaseClient';
import { callFn } from '../callFunction';
import { SavedAddress } from '@/utils/mockData'; // Assuming SavedAddress interface is in mockData

interface SavedAddressPayload {
  name?: string | null;
  line_1: string;
  line_2?: string | null;
  town_or_city: string;
  county?: string | null;
  postcode: string;
  favourite?: boolean;
}

export const getSavedAddresses = async (orgId: string, searchTerm?: string): Promise<SavedAddress[]> => {
  const payload = { op: "read_all", org_id: orgId, searchTerm };
  const result = await callFn<SavedAddress[]>('saved-addresses-crud', payload);
  return result;
};

export const searchSavedAddresses = async (orgId: string, searchTerm: string): Promise<SavedAddress[]> => {
  const payload = { op: "search_autocomplete", org_id: orgId, searchTerm };
  const result = await callFn<SavedAddress[]>('saved-addresses-crud', payload);
  return result;
};

export const createSavedAddress = async (orgId: string, addressData: SavedAddressPayload, actorRole: string): Promise<SavedAddress> => {
  const payload = { op: "create", org_id: orgId, actor_role: actorRole, ...addressData };
  const result = await callFn<SavedAddress>('saved-addresses-crud', payload);
  return result;
};

export const updateSavedAddress = async (orgId: string, addressId: string, updates: Partial<SavedAddressPayload>, actorRole: string): Promise<SavedAddress> => {
  const payload = { op: "update", id: addressId, org_id: orgId, actor_role: actorRole, updates };
  const result = await callFn<SavedAddress>('saved-addresses-crud', payload);
  return result;
};

export const deleteSavedAddress = async (orgId: string, addressId: string, actorRole: string): Promise<void> => {
  const payload = { op: "delete", id: addressId, org_id: orgId, actor_role: actorRole };
  await callFn<void>('saved-addresses-crud', payload);
};