export function NotFoundPage() {
  return (
    <main className="not-found">
      <img src="/grounded-logo.svg" alt="" />
      <span className="eyebrow">404 · Page not found</span>
      <h1>This note went missing.</h1>
      <p>The page you requested does not exist.</p>
      <a href="/">Return to Grounded</a>
    </main>
  );
}
