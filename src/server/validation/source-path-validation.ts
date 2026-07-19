export function validateSourcePath(value: string | string[] | undefined): string | null {
  const candidate = (Array.isArray(value) ? value.join('/') : value ?? '').replace(/\\/g, '/');
  const segments = candidate.split('/');
  const invalid = !candidate
    || candidate.startsWith('/')
    || segments.some((segment) => !segment || segment === '.' || segment === '..');
  return invalid ? null : candidate;
}
