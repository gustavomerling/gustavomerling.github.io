import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EXERCISES, GRUPO_NOME, tagsOf, type Exercise, type Grupo } from '@/data/exercises';
import { ANIMS } from '@/anim/library';
import { ExerciseFigure } from '@/anim/figure';
import type { View } from '@/anim/rig';

/** Página de trabalho: todos os exercícios com os quadros frente/lado. */
export function AnimationsPage() {
  // Depuração: #/animacoes?t=1.5 congela o tempo da animação
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const tParam = params.get('t');
  const freeze = tParam != null ? Number(tParam) : undefined;
  // Filtros: ?g=costas (grupo) ou ?id=remada-baixa (exercício)
  const onlyGroup = params.get('g');
  const onlyId = params.get('id');
  const groups = new Map<Grupo, Exercise[]>();
  for (const e of EXERCISES) {
    if ((onlyGroup && e.grupo !== onlyGroup) || (onlyId && e.id !== onlyId)) continue;
    groups.set(e.grupo, [...(groups.get(e.grupo) ?? []), e]);
  }
  const done = EXERCISES.filter((e) => ANIMS[e.id]).length;

  return (
    <main className="pt-safe pb-safe mx-auto max-w-3xl space-y-6 px-4 pb-10">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => (location.hash = '')} aria-label="Voltar">
          <ArrowLeft />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Animações</h1>
          <p className="text-sm text-muted-foreground">
            {done} de {EXERCISES.length} exercícios animados
          </p>
        </div>
      </header>

      {[...groups.entries()].map(([g, list]) => (
        <section key={g} className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{GRUPO_NOME[g]}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((e) => (
              <div key={e.id} className="space-y-2 rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium leading-snug">{e.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.id}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {tagsOf(e).slice(-1).map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['front', 'side'] as View[]).map((v) => (
                    <figure key={v} className="space-y-1">
                      {ANIMS[e.id] ? (
                        <ExerciseFigure def={ANIMS[e.id]} view={v} time={freeze} className="aspect-square w-full rounded-lg" />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                          Em breve
                        </div>
                      )}
                      <figcaption className="text-center text-xs text-muted-foreground">{v === 'front' ? 'Frente' : 'Lado'}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
