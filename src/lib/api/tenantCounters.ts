import { v4 as uuidv4 } from 'uuid';
import { mockJobs, mockAuditLogs } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

// Simulated tenant_counters table
interface TenantCounter {
  tenant_id: string;
  lock: number; // Used for simulating a lock mechanism
}

const mockTenantCounters: TenantCounter[] = [];

export const allocateJobRef = async (tenantId: string, actorId: string): Promise<string> => {
  await delay(300); // Simulate database transaction delay

  // Simulate transaction with FOR UPDATE on a tenant scoped locking row
  let counter = mockTenantCounters.find(tc => tc.tenant_id === tenantId);
  if (!counter) {
    counter = { tenant_id: tenantId, lock: 0 };
    mockTenantCounters.push(counter);
  }
  counter.lock++; // Simulate incrementing lock

  // Query existing jobs.ref for the tenant and extract all integers after the FRS- prefix.
  const existingRefs = mockJobs
    .filter(job => job.tenant_id === tenantId && job.ref.startsWith('FRS-'))
    .map(job => parseInt(job.ref.substring(4), 10))
    .filter(num => !isNaN(num));

  const refNumbers = new Set(existingRefs);

  let nextNumber = 1;
  while (refNumbers.has(nextNumber)) {
    nextNumber++;
  }

  const newRef = `FRS-${nextNumber.toString().padStart(3, '0')}`;

  // Simulate audit log for allocation (optional, could be part of job creation)
  mockAuditLogs.push({
    id: uuidv4(),
    tenant_id: tenantId,
    actor_id: actorId,
    entity: 'jobs',
    entity_id: 'N/A', // No job ID yet
    action: 'allocate_ref',
    notes: `Allocated new job reference: ${newRef}`,
    created_at: new Date().toISOString(),
  });

  // Simulate decrementing lock (or transaction commit)
  counter.lock--;

  return newRef;
};