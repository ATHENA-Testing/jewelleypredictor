/**
 * Retries an async function with exponential backoff.
 * @param fn - The async function to retry
 * @param options - Configuration options
 * @returns The result of the async function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = delay * (0.5 + Math.random() * 0.5);

      onRetry?.(attempt + 1, error);
      console.warn(`Retry ${attempt + 1}/${maxRetries} after ${Math.round(jitter)}ms`, error);

      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }

  throw lastError;
}
