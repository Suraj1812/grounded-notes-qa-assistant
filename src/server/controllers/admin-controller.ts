import type { RequestHandler, Response } from 'express';
import type { AdminOverviewResponse } from '../../shared/api';
import { IndexManager } from '../services/index-manager';
import {
  deleteMarkdownNote,
  isSafeUploadFilename,
  listEditableNotes,
  saveMarkdownNotes,
} from '../services/note-file-service';
import { validateUploads } from '../validation/admin-upload-validation';

function rejectWhileIndexing(indexManager: IndexManager, response: Response): boolean {
  if (!indexManager.isIndexing()) return false;
  response.status(409).json({ error: 'Wait for the current index rebuild to finish.', code: 'INDEXING_IN_PROGRESS' });
  return true;
}

export function createAdminOverviewController(
  notesDirectory: string,
  indexManager: IndexManager,
): RequestHandler {
  return async (_request, response, next) => {
    try {
      const result: AdminOverviewResponse = {
        notes: await listEditableNotes(notesDirectory),
        index: indexManager.getStatus(),
      };
      response.json(result);
    } catch (error) {
      next(error);
    }
  };
}

export function createUploadNotesController(
  notesDirectory: string,
  indexManager: IndexManager,
): RequestHandler {
  return async (request, response, next) => {
    if (rejectWhileIndexing(indexManager, response)) return;
    const validation = validateUploads(request.body);
    if (!validation.valid) {
      response.status(validation.status).json({ error: validation.message, code: 'INVALID_NOTE_UPLOAD' });
      return;
    }

    try {
      await saveMarkdownNotes(notesDirectory, validation.notes);
      if (!indexManager.startRebuild()) {
        response.status(409).json({ error: 'The files were saved, but the index is already rebuilding.', code: 'INDEXING_IN_PROGRESS' });
        return;
      }
      const count = validation.notes.length;
      response.status(201).json({
        message: `${count} Markdown ${count === 1 ? 'file' : 'files'} saved. Index rebuild started.`,
      });
    } catch (error) {
      next(error);
    }
  };
}

export function createDeleteNoteController(
  notesDirectory: string,
  indexManager: IndexManager,
): RequestHandler {
  return async (request, response, next) => {
    if (rejectWhileIndexing(indexManager, response)) return;
    const filename = request.params.filename;
    if (!isSafeUploadFilename(filename)) {
      response.status(400).json({ error: 'Invalid Markdown filename.', code: 'INVALID_NOTE_FILENAME' });
      return;
    }

    try {
      if (!await deleteMarkdownNote(notesDirectory, filename)) {
        response.status(404).json({ error: 'Note not found.', code: 'NOTE_NOT_FOUND' });
        return;
      }
      if (!indexManager.startRebuild()) {
        response.status(409).json({ error: 'The note was deleted, but the index is already rebuilding.', code: 'INDEXING_IN_PROGRESS' });
        return;
      }
      response.json({ message: `${filename} deleted. Index rebuild started.` });
    } catch (error) {
      next(error);
    }
  };
}

export function createRebuildIndexController(indexManager: IndexManager): RequestHandler {
  return (_request, response) => {
    if (!indexManager.startRebuild()) {
      response.status(409).json({ error: 'The index is already rebuilding.', code: 'INDEXING_IN_PROGRESS' });
      return;
    }
    response.status(202).json({ message: 'Index rebuild started.' });
  };
}
