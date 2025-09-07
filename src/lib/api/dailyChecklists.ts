import { v4 as uuidv4 } from 'uuid';
import { mockDailyChecklists, mockAuditLogs, DailyChecklist } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

export const getDailyChecklists = async (orgId: string): Promise<DailyChecklist[]> => { // Changed tenantId to orgId
  await delay(200);
  return mockDailyChecklists.filter(cl => cl.org_id === orgId); // Changed cl.tenant_id to cl.org_id
};

export const updateDailyChecklist = async (orgId: string, checklistId: string, items: DailyChecklist['items'], actorId: string): Promise<DailyChecklist | undefined> => { // Changed tenantId to orgId
  await delay(500);
  const checklistIndex = mockDailyChecklists.findIndex(cl => cl.id === checklistId && cl.org_id === orgId); // Changed cl.tenant_id to cl.org_id
  if (checklistIndex > -1) {
    const oldChecklist = { ...mockDailyChecklists[checklistIndex] };
    mockDailyChecklists[checklistIndex] = { ...oldChecklist, items, created_at: new Date().toISOString() }; // Update created_at for simplicity
    mockAuditLogs.push({
      id: uuidv4(),
      org_id: orgId, // Changed tenant_id to org_id
      actor_id: actorId,
      entity: 'daily_checklists',
      entity_id: checklistId,
      action: 'update',
      before: { items: oldChecklist.items },
      after: { items: items },
      created_at: new Date().toISOString(),
    });
    return mockDailyChecklists[checklistIndex];
  }
  return undefined;
};