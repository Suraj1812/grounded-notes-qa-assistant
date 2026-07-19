import type { RequestHandler } from 'express';
import { NotesDatabase } from '../database/notes-database';
import { validateSourcePath } from '../validation/source-path-validation';

export function createNoteController(database: NotesDatabase): RequestHandler {
  return (request, response) => {
    const filename = validateSourcePath(request.params.filename);
    if (!filename) {
      response.status(400).json({ error: 'Invalid note path.', code: 'INVALID_NOTE_PATH' });
      return;
    }

    const note = database.getNote(filename);
    if (!note) {
      response.status(404).json({ error: 'Note not found.', code: 'NOTE_NOT_FOUND' });
      return;
    }
    response.json(note);
  };
}
