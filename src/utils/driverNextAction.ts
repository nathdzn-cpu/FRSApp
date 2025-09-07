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
  stops: JobStop[],
  progressLogs: JobProgressLog[],
  userId: string,
): NextDriverAction | null => {
  // If job is cancelled or already delivered, no further actions
  if (job.status === 'cancelled' || job.status === 'delivered' || job.status === 'pod_received') {
    return null;
  }

  // If job is not yet accepted, the first action is to accept it
  if (job.status === 'assigned' || job.status === 'planned') {
    return {
      label: driverActionLabels['accepted'], // "Accept Job"
      nextStatus: 'accepted',
      stopId: '', // No specific stop for initial job acceptance
      promptLabel: driverPromptLabels['accepted'], // "Accept Job Time"
      stopContext: 'Job Acceptance',
    };
  }

  // Sort stops by sequence number
  const sortedStops = [...stops].sort((a, b) => a.seq - b.seq);

  for (const stop of sortedStops) {
    const stopLogs = progressLogs.filter(log => log.stop_id === stop.id);
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
      const stopContext = `${formatAddressPart(stop.name)} (${stop.type === 'collection' ? 'Collection' : 'Delivery'} ${stop.seq})`;
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