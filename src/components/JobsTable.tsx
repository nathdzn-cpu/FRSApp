import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Job, Profile } from '@/utils/mockData';
import { format } from 'date-fns';
import { getDisplayStatus } from '@/lib/utils/statusUtils'; // Import the new utility

interface JobsTableProps {
  jobs: Job[];
  profiles: Profile[]; // Profiles are still needed for displaying driver names if a driver is associated with a job stop
}

const JobsTable: React.FC<JobsTableProps> = ({ jobs, profiles }) => {
  const { userRole } = useAuth();

  // Sort jobs: active (accepted, assigned) first, then by created_at descending
  const sortedJobs = [...jobs].sort((a, b) => {
    const statusOrder = { 'accepted': 1, 'assigned': 2, 'planned': 3, 'delivered': 4, 'cancelled': 5 };
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

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Collection</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map((job, index) => (
            <TableRow key={job.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}>
              <TableCell className="font-medium">{job.order_number}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    job.status === 'planned'
                      ? 'secondary' // Gray
                      : job.status === 'accepted' || job.status === 'assigned'
                      ? 'default' // Blue
                      : job.status === 'delivered'
                      ? 'outline' // Green for delivered
                      : 'destructive' // Red for cancelled
                  }
                  className={job.status === 'delivered' ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                >
                  {getDisplayStatus(job.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {job.collection_name && job.collection_city
                  ? `${job.collection_name}, ${job.collection_city}`
                  : '-'}
              </TableCell>
              <TableCell>
                {job.delivery_name && job.delivery_city
                  ? `${job.delivery_name}, ${job.delivery_city}`
                  : '-'}
              </TableCell>
              <TableCell>{format(new Date(job.created_at), 'PPP')}</TableCell>
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