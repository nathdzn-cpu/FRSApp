import React from 'react';
import { JobStop } from '@/utils/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';

interface JobStopsListProps {
  stops: JobStop[];
  type: 'collection' | 'delivery';
}

const JobStopsList: React.FC<JobStopsListProps> = ({ stops, type }) => {
  if (stops.length === 0) {
    return <p className="text-gray-600">No {type} stops defined for this job.</p>;
  }

  const sortedStops = [...stops].sort((a, b) => a.seq - b.seq);

  return (
    <div className="space-y-4">
      {sortedStops.map((stop, index) => (
        <Card key={stop.id} className={`p-4 shadow-sm rounded-md ${type === 'collection' ? 'border-l-4 border-blue-500' : 'border-l-4 border-green-500'} bg-[var(--saas-card-bg)]`}>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className={`h-4 w-4 ${type === 'collection' ? 'text-blue-600' : 'text-green-600'}`} />
              <h4 className="font-semibold text-lg text-gray-900">{formatAddressPart(stop.name)} ({stop.seq})</h4>
            </div>
            <p className="text-gray-700">{formatAddressPart(stop.address_line1)}</p>
            {stop.address_line2 && <p className="text-gray-700">{formatAddressPart(stop.address_line2)}</p>}
            <p className="text-gray-700">{formatAddressPart(stop.city)}, {formatPostcode(stop.postcode)}</p>
            {(stop.window_from || stop.window_to) && (
              <p className="text-sm text-gray-600 mt-1">Window: {stop.window_from || 'Anytime'} - {stop.window_to || 'Anytime'}</p>
            )}
            {stop.notes && (
              <p className="text-sm text-gray-600 mt-1">Notes: {stop.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default JobStopsList;