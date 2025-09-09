import React from 'react';
import { JobProgressLog, Profile } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, Package, CheckCircle, XCircle, Clock, MessageSquare, FileText, User, UserCog, Copy, PlusCircle, Edit, Trash2, CalendarCheck, Mail, Eraser, UserPlus, EyeOff, Eye } from 'lucide-react'; // Added EyeOff, Eye
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { cn } from '@/lib/utils';

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
  image_uploaded: FileText, // Added for generic image uploads
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
  timeline_event_removed_from_timeline: EyeOff, // New icon for removed from timeline
  timeline_event_restored_to_timeline: Eye, // New icon for restored to timeline
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
        const isRemovedFromTimeline = log.visible_in_timeline === false;
        const isCancelledJob = log.action_type === 'cancelled';

        const message = log.notes || `An event of type '${getDisplayStatus(log.action_type)}' occurred.`;

        return (
          <div key={log.id} className="mb-4 relative">
            <div className={cn("absolute -left-3.5 top-1 flex items-center justify-center w-7 h-7 rounded-full text-white", isRemovedFromTimeline || isCancelledJob ? 'bg-red-500' : 'bg-gray-500')}>
              <Icon size={16} />
            </div>
            <div className={cn("ml-8 p-3 rounded-lg", "bg-white", "shadow-md", "transition-transform duration-200 ease-in-out hover:scale-105 hover:bg-blue-50")}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-800 mb-1">
                    {message}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="h-3 w-3" /> by {getActorName(log.actor_id)}
                  </p>
                  {isRemovedFromTimeline && (
                    <p className="text-xs text-red-600 flex items-center mt-1">
                      <EyeOff className="h-3 w-3 mr-1" /> Hidden from main timeline.
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-base font-semibold text-gray-700">{format(logDate, 'HH:mm:ss')}</p>
                  <p className="text-sm font-medium text-gray-600">{format(logDate, 'MMM dd, yyyy')}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobAuditLog;