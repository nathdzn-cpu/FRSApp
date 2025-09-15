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
  'requested',
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

// Driver-specific status sequences for stops
export const collectionStopStatusSequence: Array<Job['status']> = [
  'on_route_collection',
  'at_collection',
  'loaded',
];

export const deliveryStopStatusSequence: Array<Job['status']> = [
  'on_route_delivery',
  'at_delivery',
  'pod_received', // This is the final status for a delivery stop
];

// Driver action button labels
export const driverActionLabels: Record<Job['status'], string> = {
  'on_route_collection': 'On Route to Collection',
  'at_collection': 'Arrived at Collection',
  'loaded': 'Loaded',
  'on_route_delivery': 'On Route to Delivery',
  'at_delivery': 'Arrived at Delivery',
  'pod_received': 'Upload POD', // Special case for POD
  // Fallbacks for other statuses, though they shouldn't appear as primary actions
  'planned': 'Start Job',
  'assigned': 'Accept Job',
  'accepted': 'Start Job',
  'delivered': 'Job Complete',
  'cancelled': 'Job Cancelled',
  'requested': 'Awaiting Approval',
};

// Driver action dialog prompt labels
export const driverPromptLabels: Record<Job['status'], string> = {
  'on_route_collection': 'ETA to collection',
  'at_collection': 'Arrival time at collection',
  'loaded': 'Departed collection time',
  'on_route_delivery': 'ETA to delivery',
  'at_delivery': 'Arrival time at delivery',
  'pod_received': 'Upload POD', // This will trigger the POD dialog directly
  // Fallbacks
  'planned': 'Start Job Time',
  'assigned': 'Accept Job Time',
  'accepted': 'Start Job Time',
  'delivered': 'Job Completion Time',
  'cancelled': 'Job Cancellation Time',
  'requested': 'Awaiting Approval',
};

export const getStatusVariant = (status: Job['status']): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
        case 'planned':
        case 'assigned':
        case 'accepted':
        case 'requested':
            return 'secondary';
        case 'on_route_collection':
        case 'on_route_delivery':
            return 'default';
        case 'at_collection':
        case 'at_delivery':
        case 'loaded':
            return 'outline';
        case 'delivered':
        case 'pod_received':
            return 'default'; // Should be a success variant, but using default for now
        case 'cancelled':
            return 'destructive';
        default:
            return 'secondary';
    }
};

export const getDisplayStatus = (status: string): string => {
  if (!status) return 'Unknown';
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
    case 'timeline_event_removed_from_timeline':
      return 'Removed from Timeline';
    case 'timeline_event_restored_to_timeline':
      return 'Restored to Timeline';
    default:
      return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};

export const getSkippedStatuses = (currentStatus: Job['status'], newStatus: Job['status']): Job['status'][] => {
  const currentIndex = jobStatusOrder.indexOf(currentStatus);
  const newIndex = jobStatusOrder.indexOf(newStatus);

  if (currentIndex === -1 || newIndex === -1 || newIndex <= currentIndex) {
    return []; // No valid progression or no skipped statuses
  }

  // Return statuses strictly between current and new
  return jobStatusOrder.slice(currentIndex + 1, newIndex);
};