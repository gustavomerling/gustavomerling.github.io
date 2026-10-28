import { ChevronRight, DatabaseBackup, HardDrive, LogOut, Monitor, Moon, Sun, Upload, UserRound } from 'lucide-react';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { exportBackup, formatBytes, importBackup, storageUsage } from '../lib/backup';
import { navigate } from '../lib/router';
import { useCurrentUser, useDb } from '../store/db';
import { toast, useUi, type Theme } from '../store/ui';
import { Button } from './ui';
import { MerryLogo } from './MerryLogo';

export interface Crumb {
  label: string;
  to?: string;
}

const THEME_NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<Theme, string> = { system: 'Tema automático', light: 'Tema claro', dark: 'Tema escuro' };

export function ThemeToggle() {
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return <Button variant="ghost" size="sm" title={`${THEME_LABEL[theme]} (clique para trocar)`} icon={<Icon size={16} />} onClick={() => setTheme(THEME_NEXT[theme])} />;
}

export function AppHeader({ crumbs = [], actions }: { crumbs?: Crumb[]; actions?: ReactNode }) {
  const user = useCurrentUser();
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <a href="#/clients" className="flex shrink-0 items-center" title="Merry Go Post">
          <MerryLogo size={26} motion="hover" className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
        </a>
        <nav className="flex min-w-0 items-center gap-1 text-sm text-zinc-500">
          {crumbs.map((c, i) => (
            <Fragment key={i}>
              <ChevronRight size={14} className="shrink-0 text-zinc-300" />
              {c.to ? (
                <a href={`#${c.to}`} className="truncate hover:text-zinc-900">
                  {c.label}
                </a>
              ) : (
                <span className="truncate font-medium text-zinc-900">{c.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
            <ThemeToggle />
            {user && <UserMenu name={user.name} />}
          </div>
        </div>
      </div>
    </header>
  );
}

function UserMenu({ name }: { name: string }) {
  const logout = useDb((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    storageUsage().then((u) => setUsage(u ? `${formatBytes(u.usage)} de ${formatBytes(u.quota)}` : null));
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const item = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100';

  return (
    <div ref={root} className="relative">
      <Button variant="ghost" size="sm" icon={<UserRound size={16} />} onClick={() => setOpen((o) => !o)}>
        <span className="hidden max-w-32 truncate md:inline">{name}</span>
      </Button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
          <button
            type="button"
            className={item}
            onClick={async () => {
              setOpen(false);
              toast('Preparando backup…', 'info');
              await exportBackup();
              toast('Backup baixado');
            }}
          >
            <DatabaseBackup size={16} /> Baixar backup completo
          </button>
          <button type="button" className={item} onClick={() => file.current?.click()}>
            <Upload size={16} /> Restaurar backup
          </button>
          {usage && (
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-zinc-500">
              <HardDrive size={14} /> {usage} usados
            </div>
          )}
          <div className="my-1 h-px bg-zinc-100" />
          <button
            type="button"
            className={item}
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={16} /> Trocar de conta
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f || !confirm('Restaurar o backup substitui TODOS os dados deste navegador. Continuar?')) return;
              try {
                await importBackup(f);
                toast('Backup restaurado');
                navigate('/clients');
              } catch (err) {
                toast(err instanceof Error ? err.message : 'Não foi possível restaurar', 'error');
              }
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
