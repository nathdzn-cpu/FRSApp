export { supabase } from './supabaseClient';
export { callFn } from './callFunction'; // Export the new callFn helper
export * from './api/tenants';
// Removed exports for profiles, dailyChecklists, driverApp, edgeFunctions, tenantCounters
// These will either be handled by Edge Functions or direct client-side Supabase calls
// For now, we'll keep the other mock APIs as they are not part of this request.
export * from './api/jobs';
export * from './api/dailyChecklists';
export * from './api/driverApp';
export * from './api/edgeFunctions';
export * from './api/tenantCounters';