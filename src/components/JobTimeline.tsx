import React from 'react';
import { JobProgressLog, Profile } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, Package, CheckCircle, XCircle, Clock, MessageSquare, FileText, User, UserCog } from 'lucide-react'; // Added UserCog icon
import { getDisplayStatus } from '@/lib/utils/statusUtils';

interface JobTimelineProps {
  progressLogs: JobProgressLog[];
  profiles: Profile[];
}

const actionTypeIconMap: Record<string, React.ElementType> = {
  // Core Job Statuses (Progress-related)
  planned: Clock,
  assigned: Truck,
  accepted: CheckCircle,
  on_route_collection: Truck,
  at_collection: MapPin,
  loaded: Package,
  on_route_delivery: Truck,
  at_delivery: MapPin,
  delivered: CheckCircle,
  pod_received: FileText,
  cancelled: XCircle,

  // Other significant events that are part of the core progress flow
  job_created: CheckCircle,
  job_confirmed: CheckCircle,
  eta_set: Clock,
  pod_requested: FileText,
  pod_uploaded: FileText,
  driver_reassigned: UserCog, // Icon for driver reassignment
  status_changed: Clock, // For generic status changes via edit
  stop_added: MapPin, // For stop additions
  stop_updated: MapPin, // For stop updates
  stop_deleted: MapPin, // For stop deletions
  stop_details_updated: MapPin, // For driver updating stop details
};

// Define core progress action types to display in the timeline
const coreProgressActionTypes: string[] = [
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
  'cancelled',
  'job_confirmed',
  'eta_set',
  'pod_requested',
  'pod_uploaded',
  'driver_reassigned',
  'status_changed',
  'stop_added',
  'stop_updated',
  'stop_deleted',
  'stop_details_updated',
];

const JobTimeline: React.FC<JobTimelineProps> = ({ progressLogs, profiles }) => {
  const getActorName = (actorId: string) => {
    const actor = profiles.find(p => p.id === actorId);
    return actor ? actor.full_name : 'Unknown';
  };

  // Filter logs to only include core progress action types
  const filteredLogs = progressLogs.filter(log => coreProgressActionTypes.includes(log.action_type));

  if (filteredLogs.length === 0) {
    return <p className="text-gray-600">No events recorded for this job yet.</p>;
  }

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = [...filteredLogs].sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
      {sortedLogs.map((log, index) => {
        const Icon = actionTypeIconMap[log.action_type] || MessageSquare;
        const logDate = parseISO(log.timestamp);
        return (
          <div key={log.id} className="mb-6 relative">
            <div className="absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white">
              <Icon size={16} />
            </div>
            <div className="ml-4 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="secondary" className="capitalize">
                  {getDisplayStatus(log.action_type)} {/* Use getDisplayStatus for action_type label */}
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{format(logDate, 'MMM dd, yyyy')}</p>
                  <p className="text-sm font-bold text-gray-700">{format(logDate, 'HH:mm')}</p>
                </div>
              </div>
              <p className="text-gray-800 mb-1">
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  <User className="h-3 w-3" /> {getActorName(log.actor_id)} ({log.actor_role || 'N/A'})
                </span>{' '}
                {log.notes || `performed a ${getDisplayStatus(log.action_type)} event.`}
              </p>
              {(log.lat && log.lon) && (
                <p className="text-xs text-gray-600 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" /> Lat: {log.lat.toFixed(4)}, Lon: {log.lon.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobTimeline;