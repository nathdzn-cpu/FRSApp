import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Job, Profile } from '@/utils/mockData';
import { useUserRole } from '@/context/UserRoleContext';
import { format } from 'date-fns';

interface JobsTableProps {
  jobs: Job[];
  profiles: Profile[];
}

const JobsTable: React.FC<JobsTableProps> = ({ jobs, profiles }) => {
  const { userRole } = useUserRole();

  const getDriverName = (driverId?: string) => {
    const driver = profiles.find(p => p.id === driverId);
    return driver ? driver.full_name : 'Unassigned';
  };

  // Sort jobs: active (assigned, in_progress) first, then by date, then unallocated highlighted
  const sortedJobs = [...jobs].sort((a, b) => {
    const statusOrder = { 'in_progress': 1, 'assigned': 2, 'planned': 3, 'delivered': 4, 'cancelled': 5 };
    const statusA = statusOrder[a.status] || 99;
    const statusB = statusOrder[b.status] || 99;

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    // Then by date (newest first)
    const dateA = new Date(a.scheduled_date).getTime();
    const dateB = new Date(b.scheduled_date).getTime();
    return dateB - dateA;
  });

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ref</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned Driver</TableHead>
            {userRole !== 'driver' && <TableHead className="text-right">Price</TableHead>}
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map((job) => (
            <TableRow key={job.id} className={job.assigned_driver_id === undefined ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}>
              <TableCell className="font-medium">{job.ref}</TableCell>
              <TableCell>{format(new Date(job.scheduled_date), 'PPP')}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    job.status === 'delivered'
                      ? 'secondary'
                      : job.status === 'cancelled'
                      ? 'destructive'
                      : job.status === 'in_progress'
                      ? 'default'
                      : 'outline'
                  }
                >
                  {job.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>{getDriverName(job.assigned_driver_id)}</TableCell>
              {userRole !== 'driver' && (
                <TableCell className="text-right">
                  {job.price ? `$${job.price.toFixed(2)}` : 'N/A'}
                </TableCell>
              )}
              <TableCell className="text-center">
                <Link to={`/jobs/${job.id}`} className="text-blue-600 hover:underline">
                  Open
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default JobsTable;