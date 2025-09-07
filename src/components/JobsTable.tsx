import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Job, Profile } from '@/utils/mockData';
import { format } from 'date-fns';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { ArrowDown, ArrowUp, User } from 'lucide-react'; // Import User icon
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
    <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm"> {/* Card-style container */}
      <Table className="min-w-full divide-y divide-gray-200"> {/* Remove harsh grid lines */}
        <TableHeader className="bg-gray-50">
          <TableRow className="hover:bg-gray-50"> {/* No hover effect on header */}
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
        <TableBody className="bg-white divide-y divide-gray-100"> {/* Subtle dividers */}
          {sortedJobs.map((job) => {
            const driverInfo = getDriverInfo(job.assigned_driver_id);
            const isCancelled = job.status === 'cancelled';
            const isDelivered = job.status === 'delivered' || job.status === 'pod_received';
            const isInProgress = ['accepted', 'assigned', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery'].includes(job.status);

            return (
              <TableRow key={job.id} className="hover:bg-blue-50 transition-colors duration-150"> {/* Hover highlight */}
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
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.order_number}</TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      isCancelled && 'bg-red-500 text-white hover:bg-red-600',
                      isDelivered && 'bg-green-500 text-white hover:bg-green-600',
                      isInProgress && 'bg-blue-500 text-white hover:bg-blue-600',
                      job.status === 'planned' && 'bg-gray-200 text-gray-800 hover:bg-gray-300', // Grey for unassigned/planned
                    )}
                  >
                    {getDisplayStatus(job.status)}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {job.collection_name && job.collection_city
                    ? `${formatAddressPart(job.collection_name)}, ${formatAddressPart(job.collection_city)}`
                    : '-'}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {job.delivery_name && job.delivery_city
                    ? `${formatAddressPart(job.delivery_name)}, ${formatAddressPart(job.delivery_city)}`
                    : '-'}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <Link to={`/jobs/${job.id}`} className="text-blue-600 hover:underline">
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