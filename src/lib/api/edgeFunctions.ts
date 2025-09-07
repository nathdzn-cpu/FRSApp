import { v4 as uuidv4 } from 'uuid';
import { mockJobs, mockJobEvents, mockAuditLogs, mockJobStops, mockProfileDevices, Job } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

// Keeping only functions that are unique or truly simulate Edge Function interactions
// Functions like requestPod, generateJobPdf, cloneJob, cancelJob, assignDriverToJob
// are now handled by src/lib/api/jobs.ts with direct Supabase calls.

export const recordLocationPing = async (jobId: string, orgId: string, driverId: string, lat: number, lon: number): Promise<JobEvent> => { // Changed tenantId to orgId
  await delay(100); // Very quick for frequent pings
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job || job.status !== 'in_progress') throw new Error("Job not in progress or not assigned to this driver.");

  const newEvent: JobEvent = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
    job_id: jobId,
    actor_id: driverId,
    event_type: 'location_ping',
    lat: lat,
    lon: lon,
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(newEvent);

  // Update driver's last location
  const driverProfile = mockProfiles.find(p => p.id === driverId); // Corrected to use mockProfiles
  if (driverProfile) {
    driverProfile.last_location = { lat, lon, timestamp: new Date().toISOString() };
  }

  return newEvent;
};

export const registerPushToken = async (profileId: string, orgId: string, platform: 'ios' | 'android', expoPushToken: string): Promise<ProfileDevice> => { // Changed tenantId to orgId
  await delay(300);
  // Check for existing device for this profile and platform
  const existingDeviceIndex = mockProfileDevices.findIndex(
    d => d.profile_id === profileId && d.platform === platform
  );

  const newDevice: ProfileDevice = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
    profile_id: profileId,
    platform: platform,
    expo_push_token: expoPushToken,
    created_at: new Date().toISOString(),
  };

  if (existingDeviceIndex > -1) {
    // Update existing device
    mockProfileDevices[existingDeviceIndex] = { ...mockProfileDevices[existingDeviceIndex], ...newDevice };
    console.log(`Updated push token for profile ${profileId} on ${platform}`);
    return mockProfileDevices[existingDeviceIndex];
  } else {
    // Add new device
    mockProfileDevices.push(newDevice);
    console.log(`Registered new push token for profile ${profileId} on ${platform}`);
    return newDevice;
  }
};

// Note: submitDailyCheck is also a mock in driverApp.ts, but it's not directly exported via supabase.ts
// If it were, it would also need to be consolidated or removed.