import React from 'react';
import { JobStop } from '@/utils/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface JobStopsTableProps {
  stops: JobStop[];
}

const JobStopsTable: React.FC<JobStopsTableProps> = ({ stops }) => {
  if (stops.length === 0) {
    return <p className="text-gray-600 dark:text-gray-400">No stops defined for this job.</p>;
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Seq</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Window</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stops.sort((a, b) => a.seq - b.seq).map((stop) => (
            <TableRow key={stop.id}>
              <TableCell>{stop.seq}</TableCell>
              <TableCell>
                <Badge variant={stop.type === 'collection' ? 'default' : 'outline'}>
                  {stop.type}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{stop.name}</TableCell>
              <TableCell>
                {stop.address_line1}
                {stop.address_line2 && `, ${stop.address_line2}`}
                , {stop.city}, {stop.postcode}
              </TableCell>
              <TableCell>
                {stop.window_from && stop.window_to
                  ? `${stop.window_from} - ${stop.window_to}`
                  : 'Anytime'}
              </TableCell>
              <TableCell className="text-sm text-gray-600 dark:text-gray-400">{stop.notes || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default JobStopsTable;