import { v4 as uuidv4 } from 'uuid';
import { mockDailyChecklists, mockAuditLogs, DailyChecklist } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

export const getDailyChecklists = async (tenantId: string): Promise<DailyChecklist[]> => {
  await delay(200);
  return mockDailyChecklists.filter(cl => cl.tenant_id === tenantId);
};

export const updateDailyChecklist = async (tenantId: string, checklistId: string, items: DailyChecklist['items'], actorId: string): Promise<DailyChecklist | undefined> => {
  await delay(500);
  const checklistIndex = mockDailyChecklists.findIndex(cl => cl.id === checklistId && cl.tenant_id === tenantId);
  if (checklistIndex > -1) {
    const oldChecklist = { ...mockDailyChecklists[checklistIndex] };
    mockDailyChecklists[checklistIndex] = { ...oldChecklist, items, created_at: new Date().toISOString() }; // Update created_at for simplicity
    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
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