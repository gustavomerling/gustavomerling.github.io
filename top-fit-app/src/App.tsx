import { useEffect, useState } from 'react';
import { BookOpen, Home as HomeIcon, LineChart, User } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useApp } from '@/store/useApp';
import { Onboarding } from '@/screens/onboarding';
import { Home } from '@/screens/home';
import { Workout } from '@/screens/workout';
import { Evolution } from '@/screens/evolution';
import { Profile } from '@/screens/profile';
import { AnimationsPage } from '@/screens/animations';
import { Diary } from '@/screens/diary';
import { applyTheme, isDark } from '@/lib/theme';

type Tab = 'inicio' | 'diario' | 'evolucao' | 'perfil';

const TABS: { id: Tab; label: string; icon: typeof HomeIcon }[] = [
  { id: 'inicio', label: 'Início', icon: HomeIcon },
  { id: 'diario', label: 'Diário', icon: BookOpen },
  { id: 'evolucao', label: 'Evolução', icon: LineChart },
  { id: 'perfil', label: 'Perfil', icon: User },
];

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

/** Mantém o <html> no tema escolhido (e acompanha o sistema no modo automático). */
function useTheme() {
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
    if (theme.mode !== 'sistema') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme(theme);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [theme]);
  return isDark(theme) ? 'dark' : 'light';
}

export function ThemedToaster() {
  const mode = useTheme();
  return <Toaster position="top-center" theme={mode} />;
}

export default function App() {
  const hash = useHash();
  if (hash.startsWith('#/animacoes')) {
    return (
      <>
        <AnimationsPage />
        <ThemedToaster />
      </>
    );
  }
  return <MainApp />;
}

function MainApp() {
  const profile = useApp((s) => s.profile);
  const active = useApp((s) => s.active);
  const [tab, setTab] = useState<Tab>('inicio');
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  let content;
  if (!profile) content = <Onboarding />;
  else if (workoutOpen && active) content = <Workout onClose={() => setWorkoutOpen(false)} />;
  else
    content = (
      <>
        {tab === 'inicio' && <Home onOpenWorkout={() => setWorkoutOpen(true)} />}
        {tab === 'diario' && <Diary />}
        {tab === 'evolucao' && <Evolution onOpenWorkout={() => setWorkoutOpen(true)} />}
        {tab === 'perfil' && <Profile />}
      </>
    );

  const showNav = !!profile && !(workoutOpen && active);

  return (
    <>
      {profile ? (
        <main className={cn('pt-safe mx-auto max-w-md px-4', showNav ? 'pb-28' : 'pb-10')}>{content}</main>
      ) : (
        content
      )}

      {showNav && (
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs transition',
                  tab === id ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
      <ThemedToaster />
    </>
  );
}
