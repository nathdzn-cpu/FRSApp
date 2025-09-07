import React from 'react';
import { JobProgressLog, Profile } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, Package, CheckCircle, XCircle, Clock, MessageSquare, FileText, User, UserCog, Copy, PlusCircle, Edit, Trash2, CalendarCheck, Mail, Eraser, UserPlus, EyeOff, Eye } from 'lucide-react'; // Added EyeOff, Eye
import { getDisplayStatus } from '@/lib/utils/statusUtils';

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
        const isRemovedFromTimeline = log.visible_in_timeline === false; // Check for visibility status
        const isCancelledJob = log.action_type === 'cancelled'; // Check if the action itself is 'cancelled'

        // Construct the descriptive message
        let message = '';
        const actorName = getActorName(log.actor_id);
        const formattedTimestamp = format(logDate, 'dd/MM/yyyy \'at\' HH:mm');
        const displayActionType = getDisplayStatus(log.action_type);

        switch (log.action_type) {
          case 'planned':
          case 'assigned':
          case 'accepted':
          case 'on_route_collection':
          case 'at_collection':
          case 'loaded':
          case 'on_route_delivery':
          case 'at_delivery':
          case 'delivered':
          case 'pod_received':
            message = `${actorName} marked as '${displayActionType}' on ${formattedTimestamp}.`;
            break;
          case 'cancelled':
            message = `${actorName} cancelled the job on ${formattedTimestamp}.`;
            break;
          case 'job_created':
            message = `${actorName} created the job on ${formattedTimestamp}.`;
            break;
          case 'job_cloned':
            message = `${actorName} cloned the job on ${formattedTimestamp}.`;
            break;
          case 'job_confirmed':
            message = `${actorName} confirmed the job on ${formattedTimestamp}.`;
            break;
          case 'eta_set':
            message = `${actorName} set ETA to first collection on ${formattedTimestamp}.`;
            break;
          case 'pod_requested':
            message = `${actorName} requested POD on ${formattedTimestamp}.`;
            break;
          case 'pod_uploaded':
            message = `${actorName} uploaded POD on ${formattedTimestamp}.`;
            break;
          case 'document_uploaded':
            message = `${actorName} uploaded a document on ${formattedTimestamp}.`;
            break;
          case 'location_ping':
            message = `${actorName} sent a location ping on ${formattedTimestamp}.`;
            break;
          case 'note_added':
            message = `${actorName} added a note on ${formattedTimestamp}.`;
            break;
          case 'status_changed':
            message = `${actorName} changed job status via edit on ${formattedTimestamp}.`;
            break;
          case 'driver_reassigned':
            message = `${actorName} reassigned the driver on ${formattedTimestamp}.`;
            break;
          case 'stop_added':
            message = `${actorName} added a stop on ${formattedTimestamp}.`;
            break;
          case 'stop_updated':
            message = `${actorName} updated a stop on ${formattedTimestamp}.`;
            break;
          case 'stop_deleted':
            message = `${actorName} deleted a stop on ${formattedTimestamp}.`;
            break;
          case 'stop_details_updated':
            message = `${actorName} updated stop details on ${formattedTimestamp}.`;
            break;
          case 'daily_check_submitted':
            message = `${actorName} submitted a daily check on ${formattedTimestamp}.`;
            break;
          case 'daily_check_item_created':
            message = `${actorName} created a daily check item on ${formattedTimestamp}.`;
            break;
          case 'daily_check_item_updated':
            message = `${actorName} updated a daily check item on ${formattedTimestamp}.`;
            break;
          case 'daily_check_item_deleted':
            message = `${actorName} deleted a daily check item on ${formattedTimestamp}.`;
            break;
          case 'user_created':
            message = `${actorName} created a user on ${formattedTimestamp}.`;
            break;
          case 'user_updated':
            message = `${actorName} updated a user profile on ${formattedTimestamp}.`;
            break;
          case 'user_deleted':
            message = `${actorName} deleted a user on ${formattedTimestamp}.`;
            break;
          case 'password_reset_sent':
            message = `${actorName} sent a password reset email on ${formattedTimestamp}.`;
            break;
          case 'purge_demo_users':
            message = `${actorName} purged demo users on ${formattedTimestamp}.`;
            break;
          case 'purge_all_non_admin_users':
            message = `${actorName} purged all non-admin users on ${formattedTimestamp}.`;
            break;
          case 'timeline_event_removed_from_timeline':
            // This action type's notes field already contains the full descriptive message
            message = log.notes || `${actorName} removed an event from the timeline on ${formattedTimestamp}.`;
            break;
          case 'timeline_event_restored_to_timeline':
            message = log.notes || `${actorName} restored an event to the timeline on ${formattedTimestamp}.`;
            break;
          default:
            message = `${actorName} performed a '${displayActionType}' event on ${formattedTimestamp}.`;
            break;
        }

        return (
          <div key={log.id} className="mb-6 relative">
            <div className={`absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full ${isRemovedFromTimeline || isCancelledJob ? 'bg-red-600' : 'bg-gray-600'} text-white`}>
              <Icon size={16} />
            </div>
            <div className="ml-4 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <Badge variant={isRemovedFromTimeline || isCancelledJob ? 'destructive' : 'secondary'} className="capitalize">
                  {displayActionType}
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{format(logDate, 'MMM dd, yyyy')}</p>
                  <p className="text-sm font-bold text-gray-700">{format(logDate, 'HH:mm')}</p>
                </div>
              </div>
              <p className="text-gray-800 mb-1">
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  <User className="h-3 w-3" /> {actorName} ({log.actor_role || 'N/A'})
                </span>{' '}
                {message}
              </p>
              {(log.lat && log.lon) && (
                <p className="text-xs text-gray-600 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" /> Lat: {log.lat.toFixed(4)}, Lon: {log.lon.toFixed(4)}
                </p>
              )}
              {isRemovedFromTimeline && (
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