import { Job } from '@/utils/mockData';

export const getDisplayStatus = (status: string): string => { // Changed type to string
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
    default:
      return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};