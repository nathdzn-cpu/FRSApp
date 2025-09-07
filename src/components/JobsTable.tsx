import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Job, Profile } from '@/utils/mockData';
import { format } from 'date-fns';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAddressPart } from '@/lib/utils/formatUtils'; // Import new utility

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
      return { name: 'Unassigned', reg: '' };
    }
    const driver = profiles.find(p => p.id === assignedDriverId && p.role === 'driver');
    return {
      name: driver?.full_name || 'Unknown Driver',
      reg: driver?.truck_reg || 'N/A',
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
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('driver')}
            >
              <div className="flex items-center">
                Driver
                {renderSortIcon('driver')}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('order_number')}
            >
              <div className="flex items-center">
                Order Number
                {renderSortIcon('order_number')}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center">
                Status
                {renderSortIcon('status')}
              </div>
            </TableHead>
            <TableHead>Collection</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map((job, index) => {
            const driverInfo = getDriverInfo(job.assigned_driver_id);
            const isCancelled = job.status === 'cancelled';
            return (
              <TableRow key={job.id} className={cn(
                index % 2 === 0 ? 'bg-white hover:bg-gray-100' : 'bg-gray-50 hover:bg-gray-100',
                isCancelled && 'bg-red-50 hover:bg-red-100 opacity-70' // Light red background for cancelled jobs
              )}>
                <TableCell>
                  {driverInfo.name}
                  {driverInfo.reg && driverInfo.name !== 'Unassigned' && (
                    <span className="block text-xs text-gray-500">{driverInfo.reg}</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{job.order_number}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      isCancelled
                        ? 'destructive' // Red badge for cancelled
                        : job.status === 'planned'
                        ? 'secondary'
                        : job.status === 'accepted' || job.status === 'assigned'
                        ? 'default'
                        : job.status === 'delivered'
                        ? 'outline'
                        : 'default' // Fallback for other statuses
                    }
                    className={cn(
                      isCancelled && 'bg-red-500 text-white hover:bg-red-600',
                      job.status === 'delivered' && 'bg-green-500 text-white hover:bg-green-600'
                    )}
                  >
                    {getDisplayStatus(job.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {job.collection_name && job.collection_city
                    ? `${formatAddressPart(job.collection_name)}, ${formatAddressPart(job.collection_city)}`
                    : '-'}
                </TableCell>
                <TableCell>
                  {job.delivery_name && job.delivery_city
                    ? `${formatAddressPart(job.delivery_name)}, ${formatAddressPart(job.delivery_city)}`
                    : '-'}
                </TableCell>
                <TableCell className="text-center">
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