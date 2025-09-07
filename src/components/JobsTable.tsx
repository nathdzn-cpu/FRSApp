import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Job, Profile } from '@/utils/mockData';
import { format } from 'date-fns';
import { formatGBP } from '@/lib/money'; // Import formatGBP

interface JobsTableProps {
  jobs: Job[];
  profiles: Profile[]; // Profiles are still needed for displaying driver names if a driver is associated with a job stop
}

const JobsTable: React.FC<JobsTableProps> = ({ jobs, profiles }) => {
  const { userRole } = useAuth();

  // Sort jobs: active (in_progress, assigned) first, then by created_at descending
  const sortedJobs = [...jobs].sort((a, b) => {
    const statusOrder = { 'in_progress': 1, 'assigned': 2, 'planned': 3, 'delivered': 4, 'cancelled': 5 };
    const statusA = statusOrder[a.status] || 99;
    const statusB = statusOrder[b.status] || 99;

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    // Then by created_at (newest first)
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  const getAssignedDriverName = (driverId?: string | null) => {
    if (!driverId) return '-';
    const driver = profiles.find(p => p.id === driverId);
    return driver ? driver.full_name : 'Unknown';
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ref</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Created</TableHead> {/* New column */}
            <TableHead>Price</TableHead> {/* New column */}
            <TableHead>Assigned Driver</TableHead> {/* New column */}
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map((job, index) => (
            <TableRow key={job.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}>
              <TableCell className="font-medium">{job.ref}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    job.status === 'planned'
                      ? 'secondary' // Gray
                      : job.status === 'in_progress' || job.status === 'assigned'
                      ? 'default' // Blue
                      : job.status === 'delivered'
                      ? 'outline' // Green for delivered
                      : 'destructive' // Red for cancelled
                  }
                  className={job.status === 'delivered' ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                >
                  {job.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(job.date_created), 'PPP')}</TableCell> {/* Display new date_created */}
              <TableCell>{formatGBP(job.price)}</TableCell> {/* Display new price */}
              <TableCell>{getAssignedDriverName(job.assigned_driver_id)}</TableCell> {/* Display assigned driver */}
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