import { Job } from '@/utils/mockData';

export const jobStatusOrder: Array<Job['status']> = [
  'planned',
  'assigned',
  'accepted',
  'on_route_collection',
  'at_collection',
  'loaded',
  'on_route_delivery',
  'at_delivery',
  'delivered',
  'pod_received',
];

// Define core progress action types to display in the timeline
export const coreProgressActionTypes: string[] = [
  'job_created',
  'planned',
  'assigned',
  'accepted',
  'on_route_collection',
  'at_collection',
  'loaded',
  'on_route_delivery',
  'at_delivery',
  'delivered',
  'pod_received',
  'job_confirmed',
  'eta_set',
];

export const getSkippedStatuses = (currentStatus: Job['status'], newStatus: Job['status']): Job['status'][] => {
  const currentIndex = jobStatusOrder.indexOf(currentStatus);
  const newIndex = jobStatusOrder.indexOf(newStatus);

  if (currentIndex === -1 || newIndex === -1 || newIndex <= currentIndex) {
    return []; // No valid progression or no skipped statuses
  }

  // Return statuses strictly between current and new
  return jobStatusOrder.slice(currentIndex + 1, newIndex);
};

export const getDisplayStatus = (status: string): string => {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'assigned':
      return 'Assigned';
    case 'accepted':
      return 'Accepted';
    case 'on_route_collection':
      return 'On Route Collection';
    case 'at_collection':
      return 'At Collection';
    case 'loaded':
      return 'Loaded';
    case 'on_route_delivery':
      return 'On Route Delivery';
    case 'at_delivery':
      return 'At Delivery';
    case 'delivered':
      return 'Delivered';
    case 'pod_received':
      return 'POD Received';
    case 'cancelled':
      return 'Cancelled';
    // New event types for the unified timeline
    case 'job_created':
      return 'Job Created';
    case 'job_cloned':
      return 'Job Cloned';
    case 'job_confirmed':
      return 'Job Confirmed';
    case 'eta_set':
      return 'ETA Set';
    case 'pod_requested':
      return 'POD Requested';
    case 'pod_uploaded':
      return 'POD Uploaded';
    case 'document_uploaded':
      return 'Document Uploaded';
    case 'location_ping':
      return 'Location Ping';
    case 'note_added':
      return 'Note Added';
    case 'status_changed': // For generic status changes not covered by specific events
      return 'Status Changed';
    case 'driver_reassigned':
      return 'Driver Reassigned';
    case 'stop_added':
      return 'Stop Added';
    case 'stop_updated':
      return 'Stop Updated';
    case 'stop_deleted':
      return 'Stop Deleted';
    case 'stop_details_updated':
      return 'Stop Details Updated';
    case 'daily_check_submitted':
      return 'Daily Check Submitted';
    case 'daily_check_item_created':
      return 'Daily Check Item Created';
    case 'daily_check_item_updated':
      return 'Daily Check Item Updated';
    case 'daily_check_item_deleted':
      return 'Daily Check Item Deleted';
    case 'user_created':
      return 'User Created';
    case 'user_updated':
      return 'User Updated';
    case 'user_deleted':
      return 'User Deleted';
    case 'password_reset_sent':
      return 'Password Reset Sent';
    case 'purge_demo_users':
      return 'Purge Demo Users';
    case 'purge_all_non_admin_users':
      return 'Purge All Non-Admin Users';
    default:
      return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};