"use client";

import React from 'react';
import { Job, JobStop, Profile, Organisation } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { getDisplayStatus } from '@/lib/utils/statusUtils';

interface JobPdfDocumentProps {
  job: Job;
  stops: JobStop[];
  driver: Profile | undefined;
  organisation: Organisation | undefined;
}

const JobPdfDocument = React.forwardRef<HTMLDivElement, JobPdfDocumentProps>(
  ({ job, stops, driver, organisation }, ref) => {
    const collectionStops = stops.filter(s => s.type === 'collection');
    const deliveryStops = stops.filter(s => s.type === 'delivery');

    return (
      <div ref={ref} className="p-8 bg-white text-black" style={{ width: '210mm' }}>
        <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold">{organisation?.name || 'Job Sheet'}</h1>
            <p className="text-sm text-gray-600">Job Order: {job.order_number}</p>
          </div>
          {organisation?.logo_url && (
            <img src={organisation.logo_url} alt="Company Logo" className="max-h-20 object-contain" />
          )}
        </header>

        <main className="mt-8">
          <section className="grid grid-cols-3 gap-4 mb-8 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-2">Job Details</h3>
              <p><span className="font-semibold">Order #:</span> {job.order_number}</p>
              <p><span className="font-semibold">Status:</span> {getDisplayStatus(job.status)}</p>
              <p><span className="font-semibold">Price:</span> £{job.price?.toFixed(2) || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-2">Dates</h3>
              <p><span className="font-semibold">Collection:</span> {job.collection_date ? format(parseISO(job.collection_date), 'EEE, dd MMM yyyy') : 'N/A'}</p>
              <p><span className="font-semibold">Delivery:</span> {job.delivery_date ? format(parseISO(job.delivery_date), 'EEE, dd MMM yyyy') : 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-2">Driver & Vehicle</h3>
              <p><span className="font-semibold">Driver:</span> {driver?.full_name || 'Unassigned'}</p>
              <p><span className="font-semibold">Truck Reg:</span> {driver?.truck_reg || 'N/A'}</p>
              <p><span className="font-semibold">Trailer No:</span> {driver?.trailer_no || 'N/A'}</p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-xl font-bold mb-4 border-b pb-2">Collection Points</h2>
              {collectionStops.map(stop => (
                <div key={stop.id} className="mb-4 text-sm break-inside-avoid">
                  <p className="font-bold">{stop.name}</p>
                  <p>{stop.address_line1}</p>
                  {stop.address_line2 && <p>{stop.address_line2}</p>}
                  <p>{stop.city}, {stop.postcode}</p>
                  {stop.window_from && stop.window_to && <p className="text-xs text-gray-600 mt-1">Window: {stop.window_from} - {stop.window_to}</p>}
                </div>
              ))}
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4 border-b pb-2">Delivery Points</h2>
              {deliveryStops.map(stop => (
                <div key={stop.id} className="mb-4 text-sm break-inside-avoid">
                  <p className="font-bold">{stop.name}</p>
                  <p>{stop.address_line1}</p>
                  {stop.address_line2 && <p>{stop.address_line2}</p>}
                  <p>{stop.city}, {stop.postcode}</p>
                  {stop.window_from && stop.window_to && <p className="text-xs text-gray-600 mt-1">Window: {stop.window_from} - {stop.window_to}</p>}
                </div>
              ))}
            </div>
          </section>

          {job.notes && (
            <section>
              <h2 className="text-xl font-bold mb-4 border-b pb-2">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
            </section>
          )}
        </main>

        <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
          <p>Generated on {format(new Date(), 'dd MMM yyyy @ HH:mm')}</p>
        </footer>
      </div>
    );
  }
);

export default JobPdfDocument;