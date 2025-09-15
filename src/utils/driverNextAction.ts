"use client";

import { Job, JobStop, JobProgressLog } from './mockData';
import {
  collectionStopStatusSequence,
  deliveryStopStatusSequence,
  driverActionLabels,
  driverPromptLabels,
} from '@/lib/utils/statusUtils';
import { formatAddressPart } from '@/lib/utils/formatUtils';

export type NextAction =
  | 'accept_job'
  | 'start_travel_to_collection'
  | 'arrive_at_collection'
  | 'load_goods'
  | 'start_travel_to_delivery'
  | 'arrive_at_delivery'
  | 'get_pod'
  | 'job_complete'
  | 'view_completed_job'
  | 'none';

export interface NextDriverAction {
  action: NextAction;
  label: string;
  nextStatus: Job['status'] | null;
  stop?: JobStop;
  disabled: boolean;
  disabledReason?: string;
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
  activeJobs: Job[],
): NextDriverAction | null => {
  const safeStops = stops ?? [];
  const safeProgressLogs = progressLogs ?? [];

  // If job is cancelled or already delivered, no further actions
  if (job.status === 'cancelled' || job.status === 'delivered' || job.status === 'pod_received') {
    return {
      action: 'none',
      label: 'No further actions',
      nextStatus: null,
      disabled: true,
      disabledReason: 'Job is complete.',
    };
  }

  // If job is 'planned' and has no driver, no action is possible for a driver.
  if (job.status === 'planned' && !job.assigned_driver_id) {
    return {
      action: 'none',
      label: 'No further actions',
      nextStatus: null,
      disabled: true,
      disabledReason: 'No driver assigned.',
    };
  }

  // If job is not yet accepted by the assigned driver, the first action is to accept it
  if (job.status === 'planned' || job.status === 'assigned') {
    return {
      action: 'accept_job',
      label: 'Accept Job',
      nextStatus: 'accepted',
      disabled: false,
      disabledReason: undefined,
    };
  }

  // If no stops are defined, and job is not yet complete, we can't determine further actions.
  // This might indicate a data loading issue or an incomplete job setup.
  if (safeStops.length === 0) {
    console.error(`Job ${job.order_number} has no stops defined. Cannot compute next driver action.`);
    // Allow accepting the job even if stops are not loaded
    if (job.status === 'assigned' || job.status === 'planned') {
      return {
        action: 'accept_job',
        label: 'Accept Job',
        nextStatus: 'accepted',
        disabled: false,
        disabledReason: undefined,
      };
    }
    return {
      action: 'none',
      label: 'No further actions',
      nextStatus: null,
      disabled: true,
      disabledReason: 'No stops defined.',
    };
  }

  // Sort stops by sequence number
  const sortedStops = [...safeStops].sort((a, b) => a.seq - b.seq);

  const collectionStops = sortedStops.filter(s => s.type === 'collection');
  const deliveryStops = sortedStops.filter(s => s.type === 'delivery');

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
        action: nextStatus as NextAction,
        label: driverActionLabels[nextStatus],
        nextStatus: nextStatus,
        stop: stop,
        disabled: false,
        disabledReason: undefined,
      };
    }
  }

  // If all stops are complete, and we reached here, the job is fully delivered
  return {
    action: 'job_complete',
    label: 'Job Complete',
    nextStatus: null,
    disabled: true,
    disabledReason: 'Job is complete.',
  };
};