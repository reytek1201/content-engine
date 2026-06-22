function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export interface FetchWithRetryOptions extends RequestInit {
  /** Total attempts including the first try. Default 3. */
  attempts?: number;
  /** Base delay between retries in ms. Multiplied by attempt index. Default 400. */
  retryDelayMs?: number;
  /** HTTP statuses that should trigger a retry. Default 502–504. */
  retryStatuses?: number[];
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    attempts = 3,
    retryDelayMs = 400,
    retryStatuses = [502, 503, 504],
    ...init
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);

      if (
        retryStatuses.includes(response.status) &&
        attempt < attempts - 1
      ) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt < attempts - 1) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Network request failed");
}
