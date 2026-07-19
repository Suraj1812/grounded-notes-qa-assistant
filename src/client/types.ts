import type { Citation, NoteResponse, QueryResponse } from '../shared/api';

export type Exchange = {
  id: string;
  question: string;
  response: QueryResponse;
};

export type SelectedSource = {
  citation: Citation;
  note: NoteResponse | null;
  loading: boolean;
  error: string;
};
