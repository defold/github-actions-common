export type JobStatus = 'success' | 'failure' | 'cancelled';

export type MentionCondition = JobStatus | 'always';

const jobStatuses: JobStatus[] = ['success', 'failure', 'cancelled'];
const mentionConditions: MentionCondition[] = [...jobStatuses, 'always'];

/**
 * Check if status entered by user is allowed by GitHub Actions.
 * @param {string} jobStatus
 * @returns {JobStatus}
 */
export function validateStatus(jobStatus: string): JobStatus {
  if (!jobStatuses.includes(jobStatus as JobStatus)) {
    throw new Error('Invalid type parameter');
  }
  return jobStatus as JobStatus;
}

export function isValidCondition(condition: string): boolean {
  return mentionConditions.includes(condition as MentionCondition);
}

/**
 * Narrow an unknown caught value to a message string. Required under
 * `strict`, which types catch bindings as `unknown`.
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
