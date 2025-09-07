import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Job, Profile } from '@/utils/mockData';
import { format } from 'date-fns';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { ArrowDown, ArrowUp, User, Truck } from 'lucide-react'; // Added User and Truck icons
import { cn } from '@/lib/utils';
import { formatAddressPart } from '@/lib/utils/formatUtils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Import Avatar components

interface JobsTableProps {
  jobs: Job[];
  profiles: Profile[];
}

type SortColumn = 'order_number' | 'status' | 'collection' | 'delivery' | 'driver';
type SortDirection = 'asc' | 'desc';

const JobsTable: React.FC<JobsTableProps> = ({ jobs, profiles }) => {
  const { userRole } = useAuth();
  const [sortColumn, setSortColumn] = useState<SortColumn>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
      return { name: 'Unassigned', reg: '', initials: 'NA' };
    }
    const driver = profiles.find(p => p.id === assignedDriverId && p.role === 'driver');
    const fullName = driver?.full_name || 'Unknown Driver';
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
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
        const collectionA = (a.collection_name || '').toLowerCase();
        const collectionB = (b.collection_name || '').toLowerCase();
        compare = collectionA.localeCompare(collectionB);
      } else if (sortColumn === 'delivery') {
        const deliveryA = (a.delivery_name || '').toLowerCase();
        const deliveryB = (b.delivery_name || '').toLowerCase();
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

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden"> {/* Subtle border */}
      <Table>
        <TableHeader className="bg-gray-50"> {/* Light background for header */}
          <TableRow className="border-b border-gray-200"> {/* Subtle divider */}
            <TableHead
              className="cursor-pointer text-gray-700 font-semibold py-3 px-4"
              onClick={() => handleSort('driver')}
            >
              <div className="flex items-center">
                Driver
                {renderSortIcon('driver')}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer text-gray-700 font-semibold py-3 px-4"
              onClick={() => handleSort('order_number')}
            >
              <div className="flex items-center">
                Order Number
                {renderSortIcon('order_number')}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer text-gray-700 font-semibold py-3 px-4"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center">
                Status
                {renderSortIcon('status')}
              </div>
            </TableHead>
            <TableHead className="text-gray-700 font-semibold py-3 px-4">Collection</TableHead>
            <TableHead className="text-gray-700 font-semibold py-3 px-4">Delivery</TableHead>
            <TableHead className="text-center text-gray-700 font-semibold py-3 px-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map((job, index) => {
            const driverInfo = getDriverInfo(job.assigned_driver_id);
            const isCancelled = job.status === 'cancelled';
            const isDelivered = job.status === 'delivered' || job.status === 'pod_received';
            const isInProgress = ['accepted', 'assigned', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery'].includes(job.status);
            const isUnassigned = job.status === 'planned' && !job.assigned_driver_id;

            return (
              <TableRow key={job.id} className={cn(
                "border-b border-gray-100 last:border-b-0 transition-colors hover:bg-blue-50", // Subtle divider, hover highlight
                isCancelled && 'bg-red-50' // Light red background for cancelled jobs
              )}>
                <TableCell className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                        {driverInfo.initials !== 'NA' ? driverInfo.initials : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{driverInfo.name}</p>
                      {driverInfo.reg && driverInfo.name !== 'Unassigned' && (
                        <p className="text-xs text-gray-500 flex items-center">
                          <Truck className="h-3 w-3 mr-1" /> {driverInfo.reg}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-gray-900 py-3 px-4">{job.order_number}</TableCell>
                <TableCell className="py-3 px-4">
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      isCancelled && 'bg-red-500 text-white hover:bg-red-600',
                      isDelivered && 'bg-green-500 text-white hover:bg-green-600',
                      isInProgress && 'bg-blue-500 text-white hover:bg-blue-600',
                      isUnassigned && 'bg-gray-400 text-white hover:bg-gray-500',
                      !isCancelled && !isDelivered && !isInProgress && !isUnassigned && 'bg-gray-600 text-white hover:bg-gray-700' // Default for other statuses
                    )}
                  >
                    {getDisplayStatus(job.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-700 py-3 px-4">
                  {job.collection_name && job.collection_city
                    ? `${formatAddressPart(job.collection_name)}, ${formatAddressPart(job.collection_city)}`
                    : '-'}
                </TableCell>
                <TableCell className="text-gray-700 py-3 px-4">
                  {job.delivery_name && job.delivery_city
                    ? `${formatAddressPart(job.delivery_name)}, ${formatAddressPart(job.delivery_city)}`
                    : '-'}
                </TableCell>
                <TableCell className="text-center py-3 px-4">
                  <Link to={`/jobs/${job.id}`} className="text-blue-600 hover:underline font-medium">
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default JobsTable;