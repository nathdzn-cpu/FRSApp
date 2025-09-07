import React from 'react';
import { JobProgressLog, Profile } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, Truck, Package, CheckCircle, FileText, MapPin, XCircle } from 'lucide-react';
import { getDisplayStatus } from '@/lib/utils/statusUtils'; // Import the new utility

interface JobProgressTimelineProps {
  progressLogs: JobProgressLog[];
  profiles: Profile[];
}

const statusIconMap: Record<JobProgressLog['status'], React.ElementType> = {
  planned: Clock,
  assigned: Truck,
  accepted: Truck, // Renamed from in_progress
  on_route_collection: Truck,
  at_collection: MapPin,
  loaded: Package,
  on_route_delivery: Truck,
  at_delivery: MapPin,
  delivered: CheckCircle,
  pod_received: FileText,
  cancelled: XCircle,
};

const JobProgressTimeline: React.FC<JobProgressTimelineProps> = ({ progressLogs, profiles }) => {
  const getActorName = (actorId: string) => {
    const actor = profiles.find(p => p.id === actorId);
    return actor ? actor.full_name : 'Unknown';
  };

  if (progressLogs.length === 0) {
    return <p className="text-gray-600">No progress updates recorded for this job yet.</p>;
  }

  // Sort logs by timestamp ascending (oldest first) for chronological order
  const sortedLogs = [...progressLogs].sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
      {sortedLogs.map((log, index) => {
        const Icon = statusIconMap[log.status] || Clock;
        const logDate = parseISO(log.timestamp);
        return (
          <div key={log.id} className="mb-6 relative">
            <div className="absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white">
              <Icon size={16} />
            </div>
            <div className="ml-4 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="secondary" className="capitalize">
                  {getDisplayStatus(log.status)}
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{format(logDate, 'MMM dd, yyyy')}</p>
                  <p className="text-sm font-bold text-gray-700">{format(logDate, 'HH:mm')}</p>
                </div>
              </div>
              <p className="text-gray-800 mb-1">
                <span className="font-medium text-gray-900">{getActorName(log.actor_id)}</span>{' '}
                updated the job status to <span className="font-semibold">{getDisplayStatus(log.status)}</span>.
              </p>
              {log.notes && (
                <p className="text-xs text-gray-600 mt-1">Notes: {log.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobProgressTimeline;