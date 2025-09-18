"use client";

import { Job, JobStop, JobProgressLog } from '@/utils/mockData';
import {
  collectionStopStatusSequence,
  deliveryStopStatusSequence,
  driverActionLabels,
  driverPromptLabels,
} from '@/lib/utils/statusUtils';
import { formatAddressPart } from '@/lib/utils/formatUtils';

interface NextDriverAction {
  label: string;
  nextStatus: Job['status'];
  stopId: string;
  promptLabel: string;
  stopContext: string;
}

/**
 * Computes the next required action for a driver based on the job's overall progress
 * and the status of individual stops.
 *
 * @param job The current job object.
 * @param stops All stops associated with the job, sorted by sequence.
 * @param progressLogs All progress logs for the job.
 * @param userId The ID of the currently authenticated driver.
 * @returns A NextDriverAction object or null if the job is complete.
 */
export const computeNextDriverAction = (
  job: Job,
  stops: JobStop[] | undefined, // Allow undefined
  progressLogs: JobProgressLog[] | undefined, // Allow undefined
  userId: string,
): NextDriverAction | null => {
  const safeStops = stops ?? [];
  const safeProgressLogs = progressLogs ?? [];

  // If job is cancelled or already delivered, no further actions
  if (job.status === 'cancelled' || job.status === 'delivered' || job.status === 'pod_received') {
    return null;
  }

  // If job is 'planned' and has no driver, no action is possible for a driver.
  if (job.status === 'planned' && !job.assigned_driver_id) {
    return null;
  }

  // If job is not yet accepted by the assigned driver, the first action is to accept it
  if ((job.status as string) === 'planned' || (job.status as string) === 'assigned') {
    return {
      label: driverActionLabels['accepted'], // "Accept Job"
      nextStatus: 'accepted',
      stopId: '', // No specific stop for initial job acceptance
      promptLabel: driverPromptLabels['accepted'], // "Accept Job Time"
      stopContext: 'Job Acceptance',
    };
  }

  // If no stops are defined, and job is not yet complete, we can't determine further actions.
  // This might indicate a data loading issue or an incomplete job setup.
  if (safeStops.length === 0) {
    console.error(`Job ${job.order_number} has no stops defined. Cannot compute next driver action.`);
    // Allow accepting the job even if stops are not loaded
    if ((job.status as string) === 'assigned' || (job.status as string) === 'planned') {
      return {
        label: driverActionLabels['accepted'],
        nextStatus: 'accepted',
        stopId: '',
        promptLabel: driverPromptLabels['accepted'],
        stopContext: 'Job Acceptance',
      };
    }
    return null;
  }

  // Sort stops by sequence number
  const sortedStops = [...safeStops].sort((a, b) => a.seq - b.seq);

  const collectionStops = sortedStops.filter(s => s.type === 'collection');
  const deliveryStops = sortedStops.filter(s => s.type === 'delivery');

  const isLoaded = job.status === 'loaded';
  const isOnRouteToDelivery = job.status === 'on_route_delivery';
  const isAtDelivery = job.status === 'at_delivery';

  for (const stop of sortedStops) {
    const stopLogs = safeProgressLogs.filter(log => log.stop_id === stop.id);
    let currentStopStatus: Job['status'] | 'pending' = 'pending';

    // Determine the latest status for this specific stop
    if (stop.type === 'collection') {
      for (const status of collectionStopStatusSequence) {
        if (stopLogs.some(log => log.action_type === status)) {
          currentStopStatus = status;
        }
      }
    } else { // delivery
      for (const status of deliveryStopStatusSequence) {
        if (stopLogs.some(log => log.action_type === status)) {
          currentStopStatus = status;
        }
      }
    }

    let nextStatus: Job['status'] | undefined;
    let sequence: Array<Job['status']>;

    if (stop.type === 'collection') {
      sequence = collectionStopStatusSequence;
    } else { // delivery
      sequence = deliveryStopStatusSequence;
    }

    const currentIndex = sequence.indexOf(currentStopStatus as Job['status']);
    if (currentIndex === -1) { // 'pending' or initial state
      nextStatus = sequence[0];
    } else if (currentIndex < sequence.length - 1) {
      nextStatus = sequence[currentIndex + 1];
    } else {
      // This stop is complete, continue to the next stop
      continue;
    }

    if (nextStatus) {
      let stopContext = formatAddressPart(stop.name);
      const stopIndex = sortedStops.filter(s => s.type === stop.type).findIndex(s => s.id === stop.id) + 1;
      const totalStopsOfType = stop.type === 'collection' ? collectionStops.length : deliveryStops.length;

      if (totalStopsOfType > 1) {
        stopContext += ` (${stop.type === 'collection' ? 'Collection' : 'Delivery'} ${stopIndex}/${totalStopsOfType})`;
      } else {
        stopContext += ` (${stop.type === 'collection' ? 'Collection' : 'Delivery'})`;
      }

      return {
        label: driverActionLabels[nextStatus],
        nextStatus: nextStatus,
        stopId: stop.id,
        promptLabel: driverPromptLabels[nextStatus],
        stopContext: stopContext,
      };
    }
  }

  // If all stops are complete, and we reached here, the job is fully delivered
  return null;
};