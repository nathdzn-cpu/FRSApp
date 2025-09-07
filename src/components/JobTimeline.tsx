import React from 'react';
import { JobProgressLog, Profile } from '@/utils/mockData'; // Changed from JobEvent
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, Package, CheckCircle, XCircle, Clock, MessageSquare, FileText, User } from 'lucide-react'; // Added User icon
import { getDisplayStatus } from '@/lib/utils/statusUtils';

interface JobTimelineProps {
  progressLogs: JobProgressLog[]; // Changed from events
  profiles: Profile[];
}

const statusIconMap: Record<string, React.ElementType> = { // Changed key type to string
  planned: Clock,
  assigned: Truck,
  accepted: Truck,
  on_route_collection: Truck,
  at_collection: MapPin,
  loaded: Package,
  on_route_delivery: Truck,
  at_delivery: MapPin,
  delivered: CheckCircle,
  pod_received: FileText,
  cancelled: XCircle,
  // New event types
  job_confirmed: CheckCircle,
  eta_set: Clock,
  pod_requested: FileText,
  pod_uploaded: FileText,
  document_uploaded: FileText,
  location_ping: MapPin,
  note_added: MessageSquare,
  status_changed: Clock, // For generic status changes
};

const JobTimeline: React.FC<JobTimelineProps> = ({ progressLogs, profiles }) => { // Changed prop name
  const getActorName = (actorId: string) => {
    const actor = profiles.find(p => p.id === actorId);
    return actor ? actor.full_name : 'Unknown';
  };

  if (progressLogs.length === 0) {
    return <p className="text-gray-600">No events recorded for this job yet.</p>;
  }

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = [...progressLogs].sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
      {sortedLogs.map((log, index) => {
        const Icon = statusIconMap[log.status] || MessageSquare; // Use log.status for icon mapping
        const logDate = parseISO(log.timestamp);
        return (
          <div key={log.id} className="mb-6 relative">
            <div className="absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white">
              <Icon size={16} />
            </div>
            <div className="ml-4 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="secondary" className="capitalize">
                  {getDisplayStatus(log.status)} {/* Use getDisplayStatus for status label */}
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{format(logDate, 'MMM dd, yyyy')}</p>
                  <p className="text-sm font-bold text-gray-700">{format(logDate, 'HH:mm')}</p>
                </div>
              </div>
              <p className="text-gray-800 mb-1">
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  <User className="h-3 w-3" /> {getActorName(log.actor_id)}
                </span>{' '}
                {log.notes || `performed a ${getDisplayStatus(log.status)} event.`}
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