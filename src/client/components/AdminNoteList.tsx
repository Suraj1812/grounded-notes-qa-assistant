import type { AdminNote } from '../../shared/api';
import { formatBytes, formatDateTime } from '../format';

type AdminNoteListProps = {
  notes: AdminNote[];
  disabled: boolean;
  deletingFilename: string | null;
  onDelete: (filename: string) => void;
};

export function AdminNoteList({ notes, disabled, deletingFilename, onDelete }: AdminNoteListProps) {
  function confirmDelete(filename: string): void {
    if (window.confirm(`Delete ${filename}? Rebuild the index afterward to remove it from answers.`)) {
      onDelete(filename);
    }
  }

  return (
    <section className="admin-section notes-section">
      <div className="admin-section-heading notes-heading">
        <h2>Notes</h2>
        <span className="note-count">{notes.length} {notes.length === 1 ? 'file' : 'files'}</span>
      </div>
      {notes.length === 0 ? (
        <p className="admin-empty">No top-level Markdown files have been added.</p>
      ) : (
        <ul className="admin-note-list">
          {notes.map((note) => (
            <li key={note.filename}>
              <span className="note-file-copy">
                <strong>{note.filename}</strong>
                <span>{formatBytes(note.size)} · Updated {formatDateTime(note.updatedAt)}</span>
              </span>
              <button
                className="delete-button"
                type="button"
                disabled={disabled}
                onClick={() => confirmDelete(note.filename)}
                aria-label={`Delete ${note.filename}`}
              >
                {deletingFilename === note.filename ? 'Deleting…' : 'Delete'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
