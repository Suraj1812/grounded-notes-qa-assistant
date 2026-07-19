import { MAX_NOTE_BYTES, MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES } from '../../shared/admin';
import { isSafeUploadFilename, type MarkdownNote } from '../services/note-file-service';

export type UploadValidation =
  | { valid: true; notes: MarkdownNote[] }
  | { valid: false; message: string; status: 400 | 413 };

export function validateUploads(body: unknown): UploadValidation {
  const files = body && typeof body === 'object' && 'files' in body
    ? (body as { files?: unknown }).files
    : undefined;
  if (!Array.isArray(files) || files.length === 0) {
    return { valid: false, message: 'Choose at least one Markdown file.', status: 400 };
  }
  if (files.length > MAX_UPLOAD_FILES) {
    return { valid: false, message: `Upload no more than ${MAX_UPLOAD_FILES} files at once.`, status: 413 };
  }

  const notes: MarkdownNote[] = [];
  const filenames = new Set<string>();
  let totalBytes = 0;
  for (const file of files) {
    if (!file || typeof file !== 'object') {
      return { valid: false, message: 'Every upload must include a filename and content.', status: 400 };
    }
    const { filename, content } = file as { filename?: unknown; content?: unknown };
    if (!isSafeUploadFilename(filename)) {
      return { valid: false, message: 'Filenames must be safe, top-level .md filenames.', status: 400 };
    }
    if (typeof content !== 'string') {
      return { valid: false, message: `${filename} does not contain valid text.`, status: 400 };
    }
    const normalizedFilename = filename.toLowerCase();
    if (filenames.has(normalizedFilename)) {
      return { valid: false, message: `${filename} appears more than once in this upload.`, status: 400 };
    }
    filenames.add(normalizedFilename);

    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > MAX_NOTE_BYTES) {
      return { valid: false, message: `${filename} exceeds the 512 KB file limit.`, status: 413 };
    }
    totalBytes += bytes;
    notes.push({ filename, content });
  }

  if (totalBytes > MAX_UPLOAD_BYTES) {
    return { valid: false, message: 'The upload exceeds the 2 MB combined limit.', status: 413 };
  }
  return { valid: true, notes };
}
