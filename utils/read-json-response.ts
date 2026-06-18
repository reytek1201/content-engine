export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const preview = (await response.text()).slice(0, 120);
    throw new Error(
      response.status === 504
        ? "Video export timed out on the server. Please try again."
        : `Server returned an unexpected response (${response.status}): ${preview}`,
    );
  }

  return (await response.json()) as T;
}
