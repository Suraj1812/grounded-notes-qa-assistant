export type Citation = {
  filename: string;
  heading: string | null;
  snippet: string;
  score: number;
  startLine: number;
  endLine: number;
};

export type QueryResponse = {
  answer: string;
  citations: Citation[];
  refused: boolean;
};

export type NoteResponse = {
  filename: string;
  content: string;
};

export type HealthResponse = {
  status: 'ok' | 'empty';
  indexState: 'idle' | 'indexing' | 'error';
  notesIndexed: number;
  chunksIndexed: number;
  model: string;
  lastIndexedAt: string | null;
};

export type AdminNote = {
  filename: string;
  size: number;
  updatedAt: string;
};

export type AdminIndexStatus = {
  state: 'idle' | 'indexing' | 'error';
  notesIndexed: number;
  chunksIndexed: number;
  lastIndexedAt: string | null;
  startedAt: string | null;
  error: string | null;
};

export type AdminOverviewResponse = {
  notes: AdminNote[];
  index: AdminIndexStatus;
};

export type AdminMutationResponse = {
  message: string;
};
