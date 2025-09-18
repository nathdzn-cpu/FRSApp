export { supabase } from './supabaseClient';
export * from './api/tenants';
export * from './api/profiles';
export * from './api/jobs'; // Now exports real Supabase functions
export * from './api/dailyChecklists';
export { confirmJob, addJobNote, recordLocationPing, registerPushToken, submitDailyCheck } from './api/driverApp';
export * from './api/edgeFunctions';
export * from './api/tenantCounters';
export * from './api/dailyCheckItems';
export * from './api/dailyCheckResponses';
export * from './api/savedAddresses'; // New: Export saved addresses API
export * from './api/quotes'; // New: Export quotes API
export * from './api/notifications'; // New: Export notifications API
export * from './api/organisation'; // New: Export organisation API