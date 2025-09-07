import { callFn } from '../callFunction';

export interface AddressSuggestion {
  id: string;
  address: string;
}

export interface FullAddress {
  latitude: number;
  longitude: number;
  formatted_address: string[];
  thoroughfare: string;
  building_name: string;
  sub_building_name: string;
  sub_building_number: string;
  building_number: string;
  line_1: string;
  line_2: string;
  line_3: string;
  line_4: string;
  locality: string;
  town_or_city: string;
  county: string;
  district: string;
  country: string;
  postcode: string;
  residential: boolean;
  commercial: boolean;
  udprn: number;
  uprn: string;
  blpu_id: number;
  match_rule: {
    id: number;
    name: string;
    description: string;
  };
}

export const autocompleteAddress = async (query: string): Promise<AddressSuggestion[]> => {
  const result = await callFn<AddressSuggestion[]>('address-autocomplete', { op: 'autocomplete', query });
  return result;
};

export const getFullAddress = async (id: string): Promise<FullAddress> => {
  const result = await callFn<FullAddress>('address-autocomplete', { op: 'get', id });
  return result;
};