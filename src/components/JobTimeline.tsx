import React, { useState } from 'react';
import { JobProgressLog, Profile } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, Package, CheckCircle, XCircle, Clock, MessageSquare, FileText, User, UserCog, Copy, PlusCircle, Edit, Trash2, CalendarCheck, Mail, Eraser, UserPlus, X, EyeOff } from 'lucide-react'; // Added EyeOff
import { getDisplayStatus, coreProgressActionTypes } from '@/lib/utils/statusUtils'; // Import coreProgressActionTypes
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { updateJobProgressLogVisibility } from '@/lib/api/jobs'; // Import the new API function
import { toast } from 'sonner';
import { Button } from '@/components/ui/button'; // Import Button for the X button

interface JobTimelineProps {
  progressLogs: JobProgressLog[];
  profiles: Profile[];
  currentOrgId: string; // Added currentOrgId
  onLogVisibilityChange: () => void; // Callback to refetch logs after change
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
  image_uploaded: FileText, // Added for generic image uploads
  driver_reassigned: UserCog, // Icon for driver reassignment
  status_changed: Clock, // For generic status changes via edit
  stop_added: MapPin, // For stop additions
  stop_updated: MapPin, // For stop updates
  stop_deleted: MapPin, // For stop deletions
  stop_details_updated: MapPin, // For driver updating stop details
};

const JobTimeline: React.FC<JobTimelineProps> = ({ progressLogs, profiles, currentOrgId, onLogVisibilityChange }) => {
  const { userRole, profile: currentProfile } = useAuth(); // Get userRole and currentProfile
  const isOfficeOrAdmin = userRole === 'office' || userRole === 'admin';
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState<string | null>(null); // State to track which log is being updated
  const [localProgressLogs, setLocalProgressLogs] = useState<JobProgressLog[]>(progressLogs); // Local state for optimistic updates

  // Update local state when parent's progressLogs change (e.g., after a full refetch)
  React.useEffect(() => {
    setLocalProgressLogs(progressLogs);
  }, [progressLogs]);

  const getActorName = (actorId: string) => {
    const actor = profiles.find(p => p.id === actorId);
    return actor ? actor.full_name : 'Unknown User'; // Only full name
  };

  // Filter logs to only include core progress action types AND visible_in_timeline = true
  const filteredAndVisibleLogs = localProgressLogs.filter(log =>
    coreProgressActionTypes.includes(log.action_type) && log.visible_in_timeline !== false
  );

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = [...filteredAndVisibleLogs].sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  const handleRemoveFromTimeline = async (logId: string) => {
    if (!currentProfile || !userRole || !currentOrgId) {
      toast.error("User profile or organization ID not found. Cannot update log visibility.");
      return;
    }
    if (!isOfficeOrAdmin) {
      toast.error("You do not have permission to remove events from the timeline.");
      return;
    }

    setIsUpdatingVisibility(logId);

    // Optimistic update: immediately hide the item from the local state
    setLocalProgressLogs(prevLogs =>
      prevLogs.map(log =>
        log.id === logId ? { ...log, visible_in_timeline: false } : log
      )
    );
    toast.loading('Removing event from timeline...', { id: logId });

    try {
      const payload = {
        log_id: logId,
        org_id: currentOrgId,
        actor_id: currentProfile.id,
        actor_role: userRole,
        visible_in_timeline: false,
      };
      await updateJobProgressLogVisibility(payload);
      toast.success('Event removed from timeline!', { id: logId });
      onLogVisibilityChange(); // Trigger refetch of logs in parent to ensure consistency
    } catch (err: any) {
      console.error("Error removing event from timeline:", err);
      // Rollback optimistic update on error
      setLocalProgressLogs(prevLogs =>
        prevLogs.map(log =>
          log.id === logId ? { ...log, visible_in_timeline: true } : log
        )
      );
      toast.error(`Failed to remove event: ${err.message}`, { id: logId });
    } finally {
      setIsUpdatingVisibility(null);
    }
  };

  if (sortedLogs.length === 0) {
    return <p className="text-gray-600">No core progress events recorded for this job yet.</p>;
  }

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--saas-border)]" />
      {sortedLogs.map((log, index) => {
        const Icon = actionTypeIconMap[log.action_type] || MessageSquare;
        const logDate = parseISO(log.timestamp);
        return (
          <div key={log.id} className="mb-6 relative">
            <div className="absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white">
              <Icon size={16} />
            </div>
            <div className="ml-4 p-3 bg-gray-50 rounded-lg shadow-sm"> {/* Removed border */}
              <div className="flex items-center justify-between mb-1">
                <Badge variant="secondary" className="capitalize">
                  {getDisplayStatus(log.action_type)}
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
                {log.notes || `Marked as '${getDisplayStatus(log.action_type)}'.`}
              </p>
              {(log.lat && log.lon) && (
                <p className="text-xs text-gray-600 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" /> Lat: {log.lat.toFixed(4)}, Lon: {log.lon.toFixed(4)}
                </p>
              )}
              {isOfficeOrAdmin && (
                <div className="mt-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveFromTimeline(log.id)}
                    disabled={isUpdatingVisibility === log.id}
                  >
                    {isUpdatingVisibility === log.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    <span className="sr-only">Remove from timeline</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobTimeline;