import React from 'react';
import { JobEvent, Profile } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, Package, CheckCircle, XCircle, Clock, MessageSquare, FileText } from 'lucide-react';

interface JobTimelineProps {
  events: JobEvent[];
  profiles: Profile[];
}

const eventIconMap: Record<JobEvent['event_type'], React.ElementType> = {
  job_confirmed: CheckCircle,
  eta_set: Clock,
  at_collection: MapPin,
  departed_collection: Truck,
  at_delivery: MapPin,
  delivered: Package,
  pod_requested: FileText,
  pod_uploaded: FileText,
  location_ping: MapPin,
  status_changed: Clock,
  job_cancelled: XCircle,
  note_added: MessageSquare,
};

const JobTimeline: React.FC<JobTimelineProps> = ({ events, profiles }) => {
  const getActorName = (actorId: string) => {
    const actor = profiles.find(p => p.id === actorId);
    return actor ? actor.full_name : 'Unknown';
  };

  if (events.length === 0) {
    return <p className="text-gray-600 dark:text-gray-400">No events recorded for this job yet.</p>;
  }

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      {events.map((event, index) => {
        const Icon = eventIconMap[event.event_type] || MessageSquare;
        return (
          <div key={event.id} className="mb-6 relative">
            <div className="absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white dark:bg-blue-600">
              <Icon size={16} />
            </div>
            <div className="ml-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="secondary" className="capitalize">
                  {event.event_type.replace(/_/g, ' ')}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {format(parseISO(event.created_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 mb-1">
                <span className="font-medium">{getActorName(event.actor_id)}</span>{' '}
                {event.notes || `performed a ${event.event_type.replace(/_/g, ' ')} event.`}
              </p>
              {(event.lat && event.lon) && (
                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" /> Lat: {event.lat.toFixed(4)}, Lon: {event.lon.toFixed(4)}
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