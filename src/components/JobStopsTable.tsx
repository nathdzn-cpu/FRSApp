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
    <div className="rounded-md overflow-hidden shadow-sm"> {/* Removed border */}
      <Table>
        <TableHeader className="bg-gray-50"> {/* Kept header background */}
          <TableRow>
            <TableHead className="w-[5%]">Seq</TableHead>
            <TableHead className="w-[10%]">Type</TableHead>
            <TableHead className="w-[20%]">Name</TableHead>
            <TableHead className="w-[35%]">Address</TableHead>
            <TableHead className="w-[15%]">Window</TableHead>
            <TableHead className="w-[15%]">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100"> {/* Added row dividers */}
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
                , {formatAddressPart(stop.city)}
                {stop.postcode && `, ${formatPostcode(stop.postcode)}`}
              </TableCell>
              <TableCell className="text-gray-700">
                {stop.window_from || 'Anytime'} - {stop.window_to || 'Anytime'}
              </TableCell>
              <TableCell className="text-gray-700">{stop.notes || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default JobStopsTable;