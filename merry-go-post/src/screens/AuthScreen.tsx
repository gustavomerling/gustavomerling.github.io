import { ArrowLeft, ArrowRight, Upload, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import { ThemeToggle } from '../components/AppHeader';
import { Button, Card, Input } from '../components/ui';
import { MerryMark, MerryWordmark } from '../components/MerryLogo';
import { importBackup } from '../lib/backup';
import { navigate } from '../lib/router';
import { useDb } from '../store/db';
import { toast } from '../store/ui';

/** Conta local: só um perfil por nome, preso a este navegador. */
export function AuthScreen() {
  const users = useDb((s) => s.users);
  const createUser = useDb((s) => s.createUser);
  const login = useDb((s) => s.login);
  const [name, setName] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const enter = (id: string) => {
    login(id);
    navigate('/clients');
  };

  return (
    <main className="relative grid min-h-full place-items-center bg-gradient-to-br from-brand-50 via-white to-amber-50 px-4 py-12">
      <a href="#/" className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-600 hover:bg-white/70 hover:text-zinc-900">
        <ArrowLeft size={15} /> Conhecer o Merry Go Post
      </a>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mgp-hover mb-8 text-center">
          <MerryMark size={76} motion="intro" className="mx-auto mb-1 drop-shadow-lg" />
          <h1>
            <MerryWordmark motion="intro" className="text-[2.8rem]" />
          </h1>
          <p className="mt-3 text-balance text-zinc-500 sm:-mx-16">Carrosséis prontos a partir do seu texto e das suas imagens.</p>
        </div>

        <Card className="space-y-5">
          {users.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-medium text-zinc-700">Entrar como</div>
              <div className="space-y-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => enter(u.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 text-left hover:border-brand-500 hover:bg-brand-50"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-500">
                      <UserRound size={18} />
                    </span>
                    <span className="flex-1 font-medium">{u.name}</span>
                    <ArrowRight size={16} className="text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createUser(name);
              navigate('/clients');
            }}
            className="space-y-3"
          >
            <div className="text-sm font-medium text-zinc-700">{users.length ? 'Ou crie uma nova conta' : 'Crie sua conta'}</div>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            <Button type="submit" variant="primary" className="w-full" disabled={!name.trim()}>
              Criar conta e entrar
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-zinc-500">Tudo fica salvo só neste navegador (localStorage + IndexedDB).</p>
        <div className="mt-2 text-center">
          <Button variant="ghost" size="sm" icon={<Upload size={14} />} onClick={() => file.current?.click()}>
            Restaurar um backup
          </Button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                await importBackup(f);
                toast('Backup restaurado. Escolha sua conta.');
              } catch (err) {
                toast(err instanceof Error ? err.message : 'Não foi possível restaurar', 'error');
              }
            }}
          />
        </div>
      </div>
    </main>
  );
}
