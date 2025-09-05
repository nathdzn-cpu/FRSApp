import { mockTenants, Tenant } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

export const getTenants = async (): Promise<Tenant[]> => {
  await delay(200);
  return mockTenants;
};