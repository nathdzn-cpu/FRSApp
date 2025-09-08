import React from 'react';
import { JobStop } from '@/utils/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils'; // Import new utilities

interface JobStopsTableProps {
  stops: JobStop[];
}

const JobStopsTable: React.FC<JobStopsTableProps> = ({ stops }) => {
  if (stops.length === 0) {
    return <p className="text-gray-600">No stops defined for this job.</p>;
  }

  return (
    <div className="rounded-md overflow-hidden"> {/* Removed border-[var(--saas-border)] */}
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
          {stops.sort((a, b) => a.seq - b.seq).map((stop, index) => (
            <TableRow key={stop.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}>
              <TableCell>{stop.seq}</TableCell>
              <TableCell>
                <Badge variant={stop.type === 'collection' ? 'default' : 'outline'}>
                  {stop.type}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-gray-900">{formatAddressPart(stop.name)}</TableCell>
              <TableCell className="text-gray-700">
                {formatAddressPart(stop.address_line1)}
                {stop.address_line2 && `, ${formatAddressPart(stop.address_line2)}`}
                , {formatAddressPart(stop.city)}, {formatPostcode(stop.postcode)}
              </TableCell>
              <TableCell className="text-gray-700">
                {stop.window_from && stop.window_to
                  ? `${stop.window_from} - ${stop.window_to}`
                  : 'Anytime'}
              </TableCell>
              <TableCell className="text-sm text-gray-600">{stop.notes || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default JobStopsTable;