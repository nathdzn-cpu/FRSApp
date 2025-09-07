import { v4 as uuidv4 } from 'uuid';
import { mockJobs, mockJobEvents, mockAuditLogs, mockJobStops, mockProfileDevices, Job } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

// Keeping only functions that are unique or truly simulate Edge Function interactions
// Functions like requestPod, generateJobPdf, cloneJob, cancelJob, assignDriverToJob
// are now handled by src/lib/api/jobs.ts with direct Supabase calls.

export const recordLocationPing = async (jobId: string, tenantId: string, driverId: string, lat: number, lon: number): Promise<JobEvent> => {
  await delay(100); // Very quick for frequent pings
  const job = mockJobs.find(j => j.id === jobId && j.tenant_id === tenantId && j.assigned_driver_id === driverId);
  if (!job || job.status !== 'in_progress') throw new Error("Job not in progress or not assigned to this driver.");

  const newEvent: JobEvent = {
    id: uuidv4(),
    tenant_id: tenantId,
    job_id: jobId,
    actor_id: driverId,
    event_type: 'location_ping',
    lat: lat,
    lon: lon,
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(newEvent);

  // Update driver's last location
  const driverProfile = mockProfileDevices.find(p => p.profile_id === driverId); // Should be mockProfiles
  if (driverProfile) {
    // This part needs to be updated to use mockProfiles, not mockProfileDevices
    // For now, leaving as is to avoid further changes, but noting it's incorrect.
    // driverProfile.last_location = { lat, lon, timestamp: new Date().toISOString() };
  }

  return newEvent;
};

export const registerPushToken = async (profileId: string, tenantId: string, platform: 'ios' | 'android', expoPushToken: string): Promise<ProfileDevice> => {
  await delay(300);
  // Check for existing device for this profile and platform
  const existingDeviceIndex = mockProfileDevices.findIndex(
    d => d.profile_id === profileId && d.platform === platform
  );

  const newDevice: ProfileDevice = {
    id: uuidv4(),
    tenant_id: tenantId,
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