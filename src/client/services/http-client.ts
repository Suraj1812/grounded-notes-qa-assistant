export function requestSignal(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let body: T & { error?: string };
  try {
    body = await response.json() as T & { error?: string };
  } catch {
    throw new Error(response.ok ? 'The server returned an invalid response.' : 'Request failed.');
  }
  if (!response.ok) throw new Error(body.error ?? 'Request failed.');
  return body;
}
