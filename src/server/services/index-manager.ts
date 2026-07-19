import type { AdminIndexStatus } from '../../shared/api';
import { NotesDatabase } from '../database/notes-database';
import { ingestNotes, type IngestionResult } from './ingestion-service';

export class IndexingInProgressError extends Error {}

export class IndexManager {
  private running: Promise<IngestionResult> | null = null;
  private startedAt: string | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly notesDirectory: string,
    private readonly database: NotesDatabase,
  ) {}

  isIndexing(): boolean {
    return this.running !== null;
  }

  getStatus(): AdminIndexStatus {
    const stats = this.database.getStats();
    return {
      state: this.running ? 'indexing' : this.lastError ? 'error' : 'idle',
      notesIndexed: stats.notes,
      chunksIndexed: stats.chunks,
      lastIndexedAt: stats.indexedAt,
      startedAt: this.running ? this.startedAt : null,
      error: this.lastError,
    };
  }

  startRebuild(): boolean {
    if (this.running) return false;
    void this.rebuild().catch(() => undefined);
    return true;
  }

  async rebuild(): Promise<IngestionResult> {
    if (this.running) throw new IndexingInProgressError('The index is already rebuilding.');
    this.startedAt = new Date().toISOString();
    this.lastError = null;
    const operation = ingestNotes(this.notesDirectory, this.database);
    this.running = operation;

    try {
      return await operation;
    } catch (error) {
      this.lastError = 'Could not index the notes directory.';
      console.error('Note ingestion failed:', error);
      throw error;
    } finally {
      this.running = null;
    }
  }
}
