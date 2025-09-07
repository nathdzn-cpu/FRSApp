import { Job } from '@/utils/mockData';

export const getDisplayStatus = (status: Job['status']): string => {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'assigned':
      return 'Assigned';
    case 'accepted': // Renamed from in_progress
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
    default:
      return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};