export function AdminHeader() {
  return (
    <header className="topbar admin-topbar">
      <a className="brand" href="/" aria-label="Grounded home">
        <img className="brand-mark" src="/grounded-logo.svg" alt="" />
        <span>Grounded</span>
      </a>
      <a className="topbar-link" href="/">Back to assistant</a>
    </header>
  );
}
