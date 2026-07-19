import { MAX_NOTE_BYTES, MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES } from '../../shared/admin';
import type { AdminMutationResponse, AdminOverviewResponse } from '../../shared/api';
import { requestJson, requestSignal } from './http-client';

const ADMIN_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 30_000;

export function getAdminOverview(signal?: AbortSignal): Promise<AdminOverviewResponse> {
  return requestJson('/api/admin', { signal: requestSignal(ADMIN_TIMEOUT_MS, signal) });
}

export async function uploadMarkdownFiles(files: File[]): Promise<AdminMutationResponse> {
  if (files.length > MAX_UPLOAD_FILES) throw new Error(`Choose no more than ${MAX_UPLOAD_FILES} files.`);
  if (files.some((file) => file.size > MAX_NOTE_BYTES)) throw new Error('Each Markdown file must be 512 KB or smaller.');
  if (files.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_BYTES) {
    throw new Error('The combined upload must be 2 MB or smaller.');
  }

  const notes = await Promise.all(files.map(async (file) => ({
    filename: file.name,
    content: await file.text(),
  })));
  return requestJson('/api/admin/notes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ files: notes }),
    signal: requestSignal(UPLOAD_TIMEOUT_MS),
  });
}

export function deleteMarkdownFile(filename: string): Promise<AdminMutationResponse> {
  return requestJson(`/api/admin/notes/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    signal: requestSignal(ADMIN_TIMEOUT_MS),
  });
}

export function startIndexRebuild(): Promise<AdminMutationResponse> {
  return requestJson('/api/admin/index', {
    method: 'POST',
    signal: requestSignal(ADMIN_TIMEOUT_MS),
  });
}
