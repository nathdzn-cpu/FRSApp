import React from 'react';
import { JobProgressLog, Profile } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, Package, CheckCircle, XCircle, Clock, MessageSquare, FileText, User, UserCog, Copy, PlusCircle, Edit, Trash2, CalendarCheck, Mail, Eraser, UserPlus, EyeOff, Eye } from 'lucide-react';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { cn } from '@/lib/utils'; // Import cn for conditional classnames

interface JobAuditLogProps {
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

  // Other significant events
  job_created: CheckCircle,
  job_cloned: Copy,
  job_confirmed: CheckCircle,
  eta_set: Clock,
  pod_requested: FileText,
  pod_uploaded: FileText,
  document_uploaded: FileText,
  location_ping: MapPin,
  note_added: MessageSquare,
  status_changed: Clock,
  driver_reassigned: UserCog,
  stop_added: PlusCircle,
  stop_updated: Edit,
  stop_deleted: Trash2,
  stop_details_updated: Edit,
  daily_check_submitted: CalendarCheck,
  daily_check_item_created: PlusCircle,
  daily_check_item_updated: Edit,
  daily_check_item_deleted: Trash2,
  user_created: UserPlus,
  user_updated: UserCog,
  user_deleted: Trash2,
  password_reset_sent: Mail,
  purge_demo_users: Eraser,
  purge_all_non_admin_users: Eraser,
  timeline_event_removed_from_timeline: EyeOff,
  timeline_event_restored_to_timeline: Eye,
};

const JobAuditLog: React.FC<JobAuditLogProps> = ({ progressLogs, profiles }) => {
  const getActorName = (actorId: string) => {
    const actor = profiles.find(p => p.id === actorId);
    return actor ? actor.full_name : 'Unknown User';
  };

  if (progressLogs.length === 0) {
    return <p className="text-gray-600">No audit log entries for this job yet.</p>;
  }

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = [...progressLogs].sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
      {sortedLogs.map((log, index) => {
        const Icon = actionTypeIconMap[log.action_type] || MessageSquare;
        const logDate = parseISO(log.timestamp);
        const isRemovedOrCancelled = log.action_type === 'cancelled' || log.action_type === 'timeline_event_removed_from_timeline';

        // The notes field now contains the full, human-readable message
        const message = log.notes || `An event of type '${getDisplayStatus(log.action_type)}' occurred.`;

        return (
          <div key={log.id} className="mb-6 relative">
            <div className={cn(
              "absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full text-white",
              isRemovedOrCancelled ? 'bg-red-600' : 'bg-blue-600' // Blue for normal, red for removed/cancelled
            )}>
              <Icon size={16} />
            </div>
            <div className="ml-4 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <Badge variant={isRemovedOrCancelled ? 'destructive' : 'secondary'} className="capitalize">
                  {getDisplayStatus(log.action_type)}
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{format(logDate, 'MMM dd, yyyy')}</p>
                  <p className="text-sm font-bold text-gray-700">{format(logDate, 'HH:mm')}</p>
                </div>
              </div>
              <p className="text-gray-800 mb-1">
                {message}
              </p>
              {(log.lat && log.lon) && (
                <p className="text-xs text-gray-600 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" /> Lat: {log.lat.toFixed(4)}, Lon: {log.lon.toFixed(4)}
                </p>
              )}
              {log.visible_in_timeline === false && log.action_type !== 'timeline_event_removed_from_timeline' && (
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <EyeOff className="h-3 w-3 mr-1" /> This event is hidden from the main timeline.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobAuditLog;