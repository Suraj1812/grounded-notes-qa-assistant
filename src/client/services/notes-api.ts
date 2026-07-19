import type { HealthResponse, NoteResponse, QueryResponse } from '../../shared/api';
import { requestJson, requestSignal } from './http-client';

const HEALTH_TIMEOUT_MS = 15_000;
const INGESTION_TIMEOUT_MS = 60_000;
const QUERY_TIMEOUT_MS = 95_000;

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson('/api/health', { signal: requestSignal(HEALTH_TIMEOUT_MS, signal) });
}

export function ingestNotes(): Promise<void> {
  return requestJson('/api/ingest', {
    method: 'POST',
    signal: requestSignal(INGESTION_TIMEOUT_MS),
  });
}

export function queryNotes(question: string): Promise<QueryResponse> {
  return requestJson('/api/query', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question }),
    signal: requestSignal(QUERY_TIMEOUT_MS),
  });
}

export function getSourceNote(filename: string, signal: AbortSignal): Promise<NoteResponse> {
  const encodedPath = filename.split('/').map(encodeURIComponent).join('/');
  return requestJson(`/api/notes/${encodedPath}`, { signal });
}
