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
    case 'timeline_event_removed_from_timeline':
      return 'Removed from Timeline';
    case 'timeline_event_restored_to_timeline':
      return 'Restored to Timeline';
    default:
      return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};

export const getJobStatusColor = (status: Job['status']): string => {
  switch (status) {
    case 'planned':
      return 'bg-yellow-500 text-white';
    case 'assigned':
    case 'accepted':
    case 'on_route_collection':
    case 'at_collection':
    case 'loaded':
    case 'on_route_delivery':
    case 'at_delivery':
      return 'bg-blue-500 text-white';
    case 'delivered':
    case 'pod_received':
      return 'bg-green-500 text-white';
    case 'cancelled':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export const getStatusColorClass = (status: Job['status']): string => {
  switch (status) {
    case 'planned':
      return 'bg-yellow-100 text-yellow-800';
    case 'assigned':
    case 'accepted':
    case 'on_route_collection':
    case 'at_collection':
    case 'loaded':
    case 'on_route_delivery':
    case 'at_delivery':
      return 'bg-blue-100 text-blue-800';
    case 'delivered':
    case 'pod_received':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getNextActionForDriver = (
  job: Job,
  stops: JobStop[],
  progressLogs: JobProgressLog[]
): { description: string; stop?: JobStop; action?: 'arrive' | 'depart' | 'complete' } | null => {
  // Simplified placeholder for now. This function would contain complex logic
  // to determine the exact next step for a driver based on job status,
  // stop sequence, and progress logs.
  // For example:
  // 1. If job is 'assigned' or 'planned', next action is 'Accept Job'.
  // 2. If job is 'accepted' and no collection started, next action is 'Arrive at first collection'.
  // 3. If at collection, next action is 'Depart from collection'.
  // 4. If loaded, next action is 'Arrive at first delivery'.
  // 5. If at delivery, next action is 'Capture POD'.

  if (job.status === 'cancelled' || job.status === 'delivered' || job.status === 'pod_received') {
    return null; // Job is complete or cancelled
  }

  const sortedStops = [...stops].sort((a, b) => a.seq - b.seq);

  for (const stop of sortedStops) {
    const stopLogs = progressLogs.filter(log => log.stop_id === stop.id);
    const hasArrived = stopLogs.some(log => log.action_type === 'arrived_at_stop');
    const hasDeparted = stopLogs.some(log => log.action_type === 'departed_from_stop');
    const hasCompleted = stopLogs.some(log => log.action_type === 'pod_received' || (stop.type === 'collection' && log.action_type === 'departed_from_stop'));

    if (!hasArrived) {
      return { description: `Arrive at ${stop.name} (${stop.type})`, stop, action: 'arrive' };
    }
    if (hasArrived && !hasDeparted) {
      return { description: `Depart from ${stop.name} (${stop.type})`, stop, action: 'depart' };
    }
    if (hasDeparted && !hasCompleted) {
      if (stop.type === 'delivery') {
        return { description: `Capture POD for ${stop.name}`, stop, action: 'complete' };
      } else if (stop.type === 'collection') {
        // For collection, 'departed' usually means 'completed collection'
        // If there's a specific 'complete collection' action, it would go here.
        // For now, we assume departing collection means it's done.
      }
    }
  }

  // If all stops are processed, and job is not yet 'delivered' or 'pod_received',
  // it means the job is effectively complete from a driver's perspective.
  if (job.status !== 'delivered' && job.status !== 'pod_received') {
    return { description: 'Job is complete, awaiting final status update.' };
  }

  return null;
};