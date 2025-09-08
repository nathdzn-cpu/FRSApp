import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Job, Profile } from '@/utils/mockData';
import { format } from 'date-fns';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { ArrowDown, ArrowUp, User, MoreHorizontal, Edit, FileText, Truck, CheckCircle } from 'lucide-react'; // Import MoreHorizontal and other icons
import { cn } from '@/lib/utils';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils'; // Import formatPostcode
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button'; // Import Button for dropdown trigger
import JobProgressUpdateDialog from './job-detail/JobProgressUpdateDialog'; // Import Status Update Dialog
import AssignDriverDialog from './AssignDriverDialog'; // Import Assign Driver Dialog
import JobAttachmentsDialog from './JobAttachmentsDialog'; // Import new Attachments Dialog
import { updateJob, updateJobProgress } from '@/lib/api/jobs'; // Import API functions for actions
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface JobsTableProps {
  jobs: Job[];
  profiles: Profile[];
}

type SortColumn = 'order_number' | 'status' | 'collection' | 'delivery' | 'driver';
type SortDirection = 'asc' | 'desc';

type DialogType = 'statusUpdate' | 'assignDriver' | 'viewAttachments';

interface DialogState {
  type: DialogType | null;
  job: Job | null;
}

const JobsTable: React.FC<JobsTableProps> = ({ jobs, profiles }) => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sortColumn, setSortColumn] = useState<SortColumn>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dialogState, setDialogState] = useState<DialogState>({ type: null, job: null });
  const [isActionBusy, setIsActionBusy] = useState(false); // To disable actions during API calls

  const currentOrgId = profile?.org_id || '';
  const currentProfile = profile;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getDriverInfo = (assignedDriverId: string | null | undefined) => {
    if (!assignedDriverId) {
      return { name: 'Unassigned', reg: '', initials: 'UA' };
    }
    const driver = profiles.find(p => p.id === assignedDriverId && p.role === 'driver');
    const fullName = driver?.full_name || 'Unknown Driver';
    const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return {
      name: fullName,
      reg: driver?.truck_reg || 'N/A',
      initials: initials,
    };
  };

  const sortedJobs = useMemo(() => {
    const sortableJobs = [...jobs];

    sortableJobs.sort((a, b) => {
      let compare = 0;

      if (sortColumn === 'status') {
        // Custom sort order for statuses, with 'cancelled' at the end
        const statusOrder = { 'accepted': 1, 'assigned': 2, 'planned': 3, 'on_route_collection': 4, 'at_collection': 5, 'loaded': 6, 'on_route_delivery': 7, 'at_delivery': 8, 'delivered': 9, 'pod_received': 10, 'cancelled': 99 };
        const statusA = statusOrder[a.status] || 98; // Default to a high number but before cancelled
        const statusB = statusOrder[b.status] || 98;
        compare = statusA - statusB;
      } else if (sortColumn === 'driver') {
        const driverA = getDriverInfo(a.assigned_driver_id).name.toLowerCase();
        const driverB = getDriverInfo(b.assigned_driver_id).name.toLowerCase();
        compare = driverA.localeCompare(driverB);
      } else if (sortColumn === 'order_number') {
        compare = (a.order_number || '').localeCompare(b.order_number || '');
      } else if (sortColumn === 'collection') {
        const collectionA = (a.collection_city || '').toLowerCase(); // Sort by city
        const collectionB = (b.collection_city || '').toLowerCase();
        compare = collectionA.localeCompare(collectionB);
      } else if (sortColumn === 'delivery') {
        const deliveryA = (a.delivery_city || '').toLowerCase(); // Sort by city
        const deliveryB = (b.delivery_city || '').toLowerCase();
        compare = deliveryA.localeCompare(deliveryB);
      }

      return sortDirection === 'asc' ? compare : -compare;
    });

    return sortableJobs;
  }, [jobs, profiles, sortColumn, sortDirection]);

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
    }
    return null;
  };

  const handleUpdateProgress = async (entries: any[]) => { // entries will be ProgressUpdateEntry[]
    if (!dialogState.job || !currentProfile || !userRole || entries.length === 0) {
      toast.error("No job or user profile/role found, or no status updates to log.");
      return;
    }

    setIsActionBusy(true);
    try {
      const sortedEntries = [...entries].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

      for (const entry of sortedEntries) {
        const payload = {
          job_id: dialogState.job.id,
          org_id: currentOrgId,
          actor_id: currentProfile.id,
          actor_role: userRole,
          new_status: entry.status,
          timestamp: entry.dateTime.toISOString(),
          notes: entry.notes.trim() || undefined,
        };
        await updateJobProgress(payload);
      }
      toast.success('Job progress updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job.order_number, userRole] }); // Invalidate job detail too
      setDialogState({ type: null, job: null });
    } catch (err: any) {
      console.error("Error updating job progress:", err);
      toast.error("An unexpected error occurred while updating job progress.");
      throw err;
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!dialogState.job || !currentProfile || !userRole) {
      toast.error("No job or user profile/role found. Cannot assign driver.");
      return;
    }
    setIsActionBusy(true);
    try {
      const jobUpdates: Partial<Job> = {
        assigned_driver_id: driverId,
      };

      const payload = {
        job_id: dialogState.job.id,
        org_id: currentOrgId,
        actor_id: currentProfile.id,
        actor_role: userRole,
        job_updates: jobUpdates,
      };

      const promise = updateJob(payload);
      toast.promise(promise, {
        loading: driverId ? 'Assigning driver...' : 'Unassigning driver...',
        success: driverId ? 'Driver assigned successfully!' : 'Driver unassigned successfully!',
        error: (err) => `Failed to assign driver: ${err.message}`,
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job.order_number, userRole] });
      setDialogState({ type: null, job: null });
    } catch (err: any) {
      console.error("Error assigning driver:", err);
      toast.error("An unexpected error occurred while assigning the driver.");
    } finally {
      setIsActionBusy(false);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <Table className="min-w-full divide-y divide-gray-200">
        <TableHeader className="bg-gray-50">
          <TableRow className="hover:bg-gray-50">
            <TableHead
              className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('driver')}
            >
              <div className="flex items-center">
                Driver
                {renderSortIcon('driver')}
              </div>
            </TableHead>
            <TableHead
              className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('order_number')}
            >
              <div className="flex items-center">
                Order Number
                {renderSortIcon('order_number')}
              </div>
            </TableHead>
            <TableHead
              className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center">
                Status
                {renderSortIcon('status')}
              </div>
            </TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Collection</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Delivery</TableHead>
            <TableHead className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-gray-100">
          {sortedJobs.map((job) => {
            const driverInfo = getDriverInfo(job.assigned_driver_id);
            const isCancelled = job.status === 'cancelled';
            const isDelivered = job.status === 'delivered' || job.status === 'pod_received';
            const isPlanned = job.status === 'planned';
            const isInProgress = ['accepted', 'assigned', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery'].includes(job.status);

            return (
              <TableRow key={job.id} className="hover:bg-blue-50 transition-colors duration-150">
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                        {driverInfo.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{driverInfo.name}</div>
                      {driverInfo.reg && driverInfo.name !== 'Unassigned' && (
                        <div className="text-xs text-gray-500">{driverInfo.reg}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/jobs/${job.order_number}`} className="text-blue-600 hover:underline">
                    {job.order_number}
                  </Link>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      isCancelled && 'bg-red-500 text-white hover:bg-red-600',
                      isDelivered && 'bg-green-500 text-white hover:bg-green-600',
                      isPlanned && 'bg-yellow-500 text-white hover:bg-yellow-600',
                      isInProgress && 'bg-blue-500 text-white hover:bg-blue-600',
                    )}
                  >
                    {getDisplayStatus(job.status)}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {job.collection_city && job.collection_postcode
                    ? `${formatAddressPart(job.collection_city)}, ${formatPostcode(job.collection_postcode)}`
                    : '-'}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {job.delivery_city && job.delivery_postcode
                    ? `${formatAddressPart(job.delivery_city)}, ${formatPostcode(job.delivery_postcode)}`
                    : '-'}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white shadow-lg rounded-md">
                      <DropdownMenuItem onClick={() => setDialogState({ type: 'statusUpdate', job: job })} disabled={isActionBusy}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Update Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/jobs/${job.order_number}`)} disabled={isActionBusy}>
                        <FileText className="mr-2 h-4 w-4" /> View Job
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDialogState({ type: 'assignDriver', job: job })} disabled={isActionBusy}>
                        <Truck className="mr-2 h-4 w-4" /> Change Driver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDialogState({ type: 'viewAttachments', job: job })} disabled={isActionBusy}>
                        <Edit className="mr-2 h-4 w-4" /> View Attachments
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Dialogs */}
      {dialogState.type === 'statusUpdate' && dialogState.job && currentProfile && userRole && (
        <JobProgressUpdateDialog
          open={true}
          onOpenChange={() => setDialogState({ type: null, job: null })}
          job={dialogState.job}
          currentProfile={currentProfile}
          userRole={userRole}
          onUpdateProgress={handleUpdateProgress}
          isUpdatingProgress={isActionBusy}
        />
      )}

      {dialogState.type === 'assignDriver' && dialogState.job && currentProfile && userRole && (
        <AssignDriverDialog
          open={true}
          onOpenChange={() => setDialogState({ type: null, job: null })}
          drivers={profiles.filter(p => p.role === 'driver')}
          currentAssignedDriverId={dialogState.job.assigned_driver_id}
          onAssign={handleAssignDriver}
          isAssigning={isActionBusy}
        />
      )}

      {dialogState.type === 'viewAttachments' && dialogState.job && currentOrgId && (
        <JobAttachmentsDialog
          open={true}
          onOpenChange={() => setDialogState({ type: null, job: null })}
          job={dialogState.job}
          currentOrgId={currentOrgId}
        />
      )}
    </div>
  );
};

export default JobsTable;