import { AdminPage } from './pages/AdminPage';
import { AssistantPage } from './pages/AssistantPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/') return <AssistantPage />;
  if (path === '/admin') return <AdminPage />;
  return <NotFoundPage />;
}
