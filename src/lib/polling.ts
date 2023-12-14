import { Polling } from '@vertexvis/api-client-node';
import { PollIntervalMs } from '@vertexvis/api-client-node';

export const DefaultBackoffMs: Record<number, number> = {
  10: 1000,
  40: 2000,
  100: 5000,
  300: 10000,
  1000: 20000,
};

export function getPollingConfiguration({
  maxPollDurationSeconds,
  backoff,
}: {
  maxPollDurationSeconds: number;
  backoff: boolean;
}): Polling {
  return {
    intervalMs: PollIntervalMs,
    maxAttempts: getMaxAttempts({
      maxPollDurationSeconds,
      backoff,
    }),
    backoff: backoff ? DefaultBackoffMs : undefined,
  };
}

function getMaxAttempts({
  maxPollDurationSeconds,
  backoff,
}: {
  maxPollDurationSeconds: number;
  backoff: boolean;
}): number {
  if (backoff) {
    let remainingTimeMs = maxPollDurationSeconds * 1000;
    let attempt = 0;

    while (remainingTimeMs > 0) {
      const backoffMs = getBackoffForAttempt(attempt + 1);
      remainingTimeMs -= PollIntervalMs + backoffMs;
      attempt += 1;
    }

    return attempt;
  }
  return Math.max(1, Math.floor(maxPollDurationSeconds / PollIntervalMs));
}

function getBackoffForAttempt(attempt: number): number {
  const key =
    Object.keys(DefaultBackoffMs)
      .map((key) => parseInt(key, 10))
      .reverse()
      .find((key) => attempt > key) ?? 0;

  return DefaultBackoffMs[key] ?? 0;
}
