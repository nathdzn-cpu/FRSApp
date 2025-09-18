import { v4 as uuidv4 } from 'uuid';
import { mockJobs, mockAuditLogs, mockJobStops, mockProfileDevices, Job, mockProfiles, ProfileDevice } from '@/utils/mockData'; // Added mockProfiles
import { delay } from '../utils/apiUtils';
import { supabase } from '../supabaseClient'; // Import supabase client

// Keeping only functions that are unique or truly simulate Edge Function interactions
// Functions like requestPod, generateJobPdf, cloneJob, cancelJob, assignDriverToJob
// are now handled by src/lib/api/jobs.ts with direct Supabase calls.

export const recordLocationPing = async (jobId: string, orgId: string, driverId: string, lat: number, lon: number): Promise<any> => { // Changed return type to any for simplicity
  await delay(100); // Very quick for frequent pings
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job || job.status !== 'accepted') throw new Error("Job not in progress or not assigned to this driver."); // Changed 'in_progress' to 'accepted'

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      status: 'location_ping', // Use 'location_ping' as the status for the log
      lat: lat,
      lon: lon,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting location ping log:", insertError);
    throw new Error(insertError.message);
  }

  // Update driver's last location
  const driverProfile = mockProfiles.find(p => p.id === driverId); // Corrected to use mockProfiles
  if (driverProfile) {
    driverProfile.last_location = { lat, lon, timestamp: new Date().toISOString() };
  }

  return newLog; // Return the inserted log entry
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