import { useEffect, useRef, useState } from 'react';
import { deleteMarkdownFile, startIndexRebuild, uploadMarkdownFiles } from '../services/admin-api';
import { AdminHeader } from '../components/AdminHeader';
import { AdminNoteList } from '../components/AdminNoteList';
import { AdminStats } from '../components/AdminStats';
import { NoteUploadForm } from '../components/NoteUploadForm';
import { useAdminOverview } from '../hooks/useAdminOverview';

type Operation = 'upload' | 'rebuild' | string | null;

type Notice = {
  kind: 'success' | 'error';
  message: string;
};

export function AdminPage() {
  const { overview, loading, error: loadError, refresh } = useAdminOverview();
  const [operation, setOperation] = useState<Operation>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const previousIndexState = useRef(overview?.index.state);
  const indexing = overview?.index.state === 'indexing';
  const controlsDisabled = operation !== null || indexing;

  useEffect(() => {
    const currentState = overview?.index.state;
    if (previousIndexState.current === 'indexing' && currentState === 'idle') {
      setNotice({ kind: 'success', message: 'Index rebuild completed.' });
    }
    if (previousIndexState.current === 'indexing' && currentState === 'error') {
      setNotice({ kind: 'error', message: overview?.index.error ?? 'Index rebuild failed.' });
    }
    previousIndexState.current = currentState;
  }, [overview?.index.error, overview?.index.state]);

  async function upload(files: File[]): Promise<boolean> {
    setOperation('upload');
    setNotice(null);
    try {
      const result = await uploadMarkdownFiles(files);
      await refresh();
      setNotice({ kind: 'success', message: result.message });
      return true;
    } catch (requestError) {
      setNotice({
        kind: 'error',
        message: requestError instanceof Error ? requestError.message : 'Could not save the files.',
      });
      return false;
    } finally {
      setOperation(null);
    }
  }

  async function remove(filename: string): Promise<void> {
    setOperation(filename);
    setNotice(null);
    try {
      const result = await deleteMarkdownFile(filename);
      await refresh();
      setNotice({ kind: 'success', message: result.message });
    } catch (requestError) {
      setNotice({
        kind: 'error',
        message: requestError instanceof Error ? requestError.message : 'Could not delete the note.',
      });
    } finally {
      setOperation(null);
    }
  }

  async function rebuild(): Promise<void> {
    setOperation('rebuild');
    setNotice(null);
    try {
      const result = await startIndexRebuild();
      await refresh();
      setNotice({ kind: 'success', message: result.message });
    } catch (requestError) {
      setNotice({
        kind: 'error',
        message: requestError instanceof Error ? requestError.message : 'Could not start the index rebuild.',
      });
    } finally {
      setOperation(null);
    }
  }

  return (
    <div className="app-shell admin-shell">
      <AdminHeader />
      <main className="admin-layout">
        <header className="admin-page-heading">
          <h1>Manage notes</h1>
          <p>Upload or delete Markdown files. The index updates automatically.</p>
        </header>

        <AdminStats
          index={overview?.index ?? null}
          disabled={controlsDisabled}
          rebuilding={indexing || operation === 'rebuild'}
          onRebuild={() => void rebuild()}
        />

        {(notice || loadError || overview?.index.error) && (
          <div
            className={`admin-notice ${notice?.kind === 'success' && !loadError ? 'success' : 'error'}`}
            role={notice?.kind === 'success' && !loadError ? 'status' : 'alert'}
          >
            {loadError || notice?.message || overview?.index.error}
          </div>
        )}

        {loading && !overview ? (
          <div className="admin-loading" role="status">Loading note management…</div>
        ) : (
          <div className="admin-content">
            <NoteUploadForm
              disabled={controlsDisabled}
              uploading={operation === 'upload'}
              onUpload={upload}
            />
            <AdminNoteList
              notes={overview?.notes ?? []}
              disabled={controlsDisabled}
              deletingFilename={operation && !['upload', 'rebuild'].includes(operation) ? operation : null}
              onDelete={(filename) => void remove(filename)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
