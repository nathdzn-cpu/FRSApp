import { Job } from '@/utils/mockData';

export const coreProgressActionTypes = [
  'job_created',
  'driver_assigned',
  'job_accepted',
  'en_route_to_collection',
  'arrived_at_collection',
  'collection_completed',
  'en_route_to_delivery',
  'arrived_at_delivery',
  'delivery_completed',
  'pod_uploaded',
  'job_cancelled',
];

export function getDisplayStatus(status: string): string {
  if (!status) return 'Unknown';
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const getStatusBadgeVariant = (status: Job['status']): 'default' | 'destructive' | 'outline' | 'secondary' => {
  switch (status) {
    case 'cancelled':
      return 'destructive'; // Red
    case 'planned':
    case 'unassigned':
      return 'secondary'; // Orange/Yellow - will style with CSS
    case 'in_progress':
    case 'assigned':
    case 'accepted':
    case 'en_route_to_collection':
    case 'arrived_at_collection':
    case 'collection_completed':
    case 'en_route_to_delivery':
    case 'arrived_at_delivery':
      return 'default'; // Blue
    case 'completed':
    case 'pod_received':
    case 'delivered':
      return 'outline'; // Green
    default:
      return 'secondary';
  }
};