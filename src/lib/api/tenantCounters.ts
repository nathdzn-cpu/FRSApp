import { v4 as uuidv4 } from 'uuid';
import { mockJobs, mockAuditLogs } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

// Simulated tenant_counters table
interface TenantCounter {
  org_id: string; // Changed from org_id
  lock: number; // Used for simulating a lock mechanism
}

const mockTenantCounters: TenantCounter[] = [];

export const allocateJobRef = async (orgId: string, actorId: string): Promise<string> => { // Changed tenantId to orgId
  await delay(300); // Simulate database transaction delay

  // Simulate transaction with FOR UPDATE on a tenant scoped locking row
  let counter = mockTenantCounters.find(tc => tc.org_id === orgId); // Changed tc.org_id to tc.org_id
  if (!counter) {
    counter = { org_id: orgId, lock: 0 }; // Changed org_id to org_id
    mockTenantCounters.push(counter);
  }
  counter.lock++; // Simulate incrementing lock

  // Query existing jobs.ref for the tenant and extract all integers after the FRS- prefix.
  const existingRefs = mockJobs
    .filter(job => job.org_id === orgId && job.ref.startsWith('FRS-')) // Changed job.org_id to job.org_id
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
    org_id: orgId, // Changed org_id to org_id
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