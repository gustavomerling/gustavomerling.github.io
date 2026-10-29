import { useEffect } from 'react';
import { Toaster } from './components/Toaster';
import { match, navigate, useHashPath } from './lib/router';
import { useSystemColor } from './lib/systemColor';
import { AuthScreen } from './screens/AuthScreen';
import { ClientFormScreen } from './screens/ClientFormScreen';
import { ClientPostsScreen } from './screens/ClientPostsScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { LandingScreen } from './screens/LandingScreen';
import { NotFound } from './screens/NotFound';
import { PostEditorScreen } from './screens/PostEditorScreen';
import { TemplateEditorScreen } from './screens/TemplateEditorScreen';
import { useDb } from './store/db';
import { useApplyTheme } from './store/ui';

/** Cliente da rota atual (direto ou via post), para pintar a interface com a cor dele. */
function useRouteClientColor(path: string) {
  return useDb((s) => {
    const cm = match('/clients/:id', path) ?? match('/clients/:id/edit', path);
    const pm = match('/posts/:id', path);
    const clientId = cm?.id ?? (pm ? s.posts.find((p) => p.id === pm.id)?.clientId : undefined);
    return clientId ? s.clients.find((c) => c.id === clientId)?.colors.primary ?? null : null;
  });
}

export function App() {
  const path = useHashPath();
  const loggedIn = useDb((s) => !!s.currentUserId && s.users.some((u) => u.id === s.currentUserId));
  useApplyTheme();
  useSystemColor(useRouteClientColor(path));

  // Logado: "/" e "/entrar" levam direto aos clientes (a landing continua em /sobre).
  useEffect(() => {
    if (loggedIn && (path === '/' || path === '/entrar')) navigate('/clients');
    window.scrollTo(0, 0);
  }, [loggedIn, path]);

  return (
    <>
      {loggedIn ? <Routes path={path} /> : <PublicRoutes path={path} />}
      <Toaster />
    </>
  );
}

/** Sem conta: landing na raiz e em /sobre; qualquer outra rota pede login. */
function PublicRoutes({ path }: { path: string }) {
  if (path === '/' || path === '/sobre') return <LandingScreen />;
  return <AuthScreen />;
}

function Routes({ path }: { path: string }) {
  let m: Record<string, string> | null;
  if (match('/sobre', path)) return <LandingScreen />;
  if (match('/clients', path)) return <DashboardScreen tab="clients" />;
  if (match('/templates', path)) return <DashboardScreen tab="templates" />;
  if (match('/clients/new', path)) return <ClientFormScreen />;
  if ((m = match('/clients/:id/edit', path))) return <ClientFormScreen key={m.id} clientId={m.id} />;
  if ((m = match('/clients/:id', path))) return <ClientPostsScreen key={m.id} clientId={m.id} />;
  if ((m = match('/posts/:id', path))) return <PostEditorScreen key={m.id} postId={m.id} />;
  if ((m = match('/templates/:id', path))) return <TemplateEditorScreen key={m.id} templateId={m.id} />;
  if (path === '/') return null;
  return <NotFound />;
}
