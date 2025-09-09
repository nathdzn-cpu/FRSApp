"use client";

import React, { useState } from 'react';
import { JobProgressLog, Profile, Job } from '@/utils/mockData'; // Import Job
import { format, parseISO } from 'date-fns';
import { MapPin, Truck, Package, CheckCircle, XCircle, Clock, MessageSquare, FileText, User, UserCog, Copy, PlusCircle, Edit, Trash2, CalendarCheck, Mail, Eraser, UserPlus, X, EyeOff, Eye } from 'lucide-react';
import { getDisplayStatus, coreProgressActionTypes } from '@/lib/utils/statusUtils';
import { useAuth } from '@/context/AuthContext';
import { updateJobProgressLogVisibility } from '@/lib/api/jobs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface JobTimelineProps {
  progressLogs: JobProgressLog[];
  profiles: Profile[];
  currentOrgId: string;
  onLogVisibilityChange: () => void;
  job: Job; // Added job prop
}

const actionTypeIconMap: Record<string, React.ElementType> = {
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
  job_created: CheckCircle,
  job_confirmed: CheckCircle,
  eta_set: Clock,
  pod_requested: FileText,
  pod_uploaded: FileText,
  image_uploaded: FileText,
  driver_reassigned: UserCog,
  status_changed: Clock,
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

const JobTimeline: React.FC<JobTimelineProps> = ({ progressLogs, profiles, currentOrgId, onLogVisibilityChange, job }) => {
  const { userRole, profile: currentProfile } = useAuth();
  const isOfficeOrAdmin = userRole === 'office' || userRole === 'admin';
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState<string | null>(null);
  const [localProgressLogs, setLocalProgressLogs] = useState<JobProgressLog[]>(progressLogs);

  React.useEffect(() => {
    setLocalProgressLogs(progressLogs);
  }, [progressLogs]);

  const getActorInfo = (actorId: string) => {
    const actor = profiles.find(p => p.id === actorId);
    const fullName = actor ? actor.full_name : 'Unknown User';
    const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return { fullName, initials, avatar_url: actor?.avatar_url || null };
  };

  const getIconColor = (actionType: string) => {
    if (['job_created', 'accepted', 'loaded', 'delivered', 'pod_received', 'job_confirmed'].includes(actionType)) {
      return 'bg-green-500';
    }
    if (['cancelled'].includes(actionType)) {
      return 'bg-red-500';
    }
    return 'bg-blue-600';
  };

  const filteredAndVisibleLogs = localProgressLogs.filter(log =>
    coreProgressActionTypes.includes(log.action_type) && log.visible_in_timeline !== false
  );

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
      onLogVisibilityChange();
    } catch (err: any) {
      console.error("Error removing event from timeline:", err);
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
        const actorInfo = getActorInfo(log.actor_id);
        return (
          <div key={log.id} className="mb-6 relative">
            <div className={cn("absolute -left-3.5 top-1 flex items-center justify-center w-7 h-7 rounded-full text-white", getIconColor(log.action_type))}>
              <Icon size={16} />
            </div>
            <Card className={cn("ml-8", "bg-white", "shadow-md", "transition-transform duration-200 ease-in-out hover:scale-105 hover:bg-blue-50")}>
              <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">{getDisplayStatus(log.action_type)}</CardTitle>
                  <CardDescription className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Avatar className="h-4 w-4">
                      {actorInfo.avatar_url ? (
                        <AvatarImage src={actorInfo.avatar_url} alt={actorInfo.fullName} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                          {actorInfo.initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    by {actorInfo.fullName}
                  </CardDescription>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-semibold text-gray-800">{format(logDate, 'HH:mm')}</p>
                  <p className="text-sm font-semibold text-gray-700">{format(logDate, 'MMM dd, yyyy')}</p>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-gray-700">
                  {log.notes || `Marked as '${getDisplayStatus(log.action_type)}'.`}
                </p>
                {(log.lat && log.lon) && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" /> Lat: {log.lat.toFixed(4)}, Lon: {log.lon.toFixed(4)}
                  </p>
                )}
                {isOfficeOrAdmin && (
                  <div className="mt-2 text-right -mr-2 -mb-2">
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
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default JobTimeline;