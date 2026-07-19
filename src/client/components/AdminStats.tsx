import type { AdminIndexStatus } from '../../shared/api';
import { formatDateTime } from '../format';

type AdminStatsProps = {
  index: AdminIndexStatus | null;
  disabled: boolean;
  rebuilding: boolean;
  onRebuild: () => void;
};

function indexStatusText(index: AdminIndexStatus | null): string {
  if (!index) return 'Loading';
  if (index.state === 'indexing') return 'Rebuilding';
  if (index.state === 'error') return 'Needs attention';
  return index.chunksIndexed > 0 ? 'Ready' : 'Empty';
}

export function AdminStats({ index, disabled, rebuilding, onRebuild }: AdminStatsProps) {
  return (
    <section className={`index-summary ${index?.state ?? 'loading'}`} aria-label="Index summary" aria-live="polite">
      <div className="index-summary-copy">
        <span className="index-status-label">
          <i aria-hidden="true" />
          {indexStatusText(index)}
        </span>
        <span>{index?.notesIndexed ?? '—'} notes</span>
        <span>{index?.chunksIndexed ?? '—'} chunks</span>
        <span>Last indexed {formatDateTime(index?.lastIndexedAt ?? null)}</span>
      </div>
      <button className="rebuild-button" type="button" disabled={disabled} onClick={onRebuild}>
        {rebuilding ? 'Rebuilding…' : 'Rebuild index'}
      </button>
      {index?.state === 'indexing' && <progress aria-label="Index rebuild in progress" />}
    </section>
  );
}
