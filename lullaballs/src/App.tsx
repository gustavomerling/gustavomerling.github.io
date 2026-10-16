import {
  AlertTriangle, CalendarDays, Check, CheckCircle2, Clapperboard, Copy, Dices, ExternalLink, Film, Hash, Image,
  Moon, Music, Palette, Plus, Save, Shuffle, Sparkles, Trash2, Type,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Song } from './audio/notes';
import { Preview } from './components/Preview';
import { BACKGROUNDS, getBackground } from './engine/backgrounds';
import { PALETTES, getPalette } from './engine/palettes';
import { addDays, formatDay, isoDate, parseDate } from './dates';
import { findSeed, simulateHeadless } from './engine/run';
import { FINISH_MAX, FINISH_MIN } from './engine/types';
import { TEMPLATES, getTemplate } from './engine/templates';
import { exportVideo } from './export';
import { makeCaption, makeTitle, newPost, randomize, withHashtags } from './newPost';
import type { Post } from './types';

type Tone = 'info' | 'ok' | 'error';
interface Status { tone: Tone; text: string }

export function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const today = isoDate(new Date());
  const [selected, setSelected] = useState(today);
  const [error, setError] = useState('');

  const reload = () => api.posts().then(setPosts).catch((e) => setError(String(e)));
  useEffect(() => {
    api.songs().then(setSongs).catch((e) => setError(String(e)));
    void reload();
  }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => isoDate(addDays(new Date(), i - 3))), [today]);
  const byDate = new Map(posts.map((p) => [p.date, p]));
  const post = byDate.get(selected);

  async function create(date: string) {
    const p = newPost(date, songs, posts);
    await api.savePost(p);
    await reload();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Moon size={20} /></div>
          <div>
            <h1>Lullaballs</h1>
            <p>Um vídeo de bolinhas e música por dia</p>
          </div>
        </div>
        <div className="topbar-meta">
          <CalendarDays size={16} />
          {parseDate(today).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>
      {error && <p className="banner error"><AlertTriangle size={16} />{error}</p>}

      <section className="days">
        {days.map((d) => {
          const p = byDate.get(d);
          const song = songs.find((s) => s.id === p?.song);
          const date = parseDate(d);
          return (
            <button
              key={d}
              className={`card ${d === selected ? 'selected' : ''} ${d === today ? 'today' : ''} ${p ? '' : 'empty'} ${d < today ? 'past' : ''}`}
              onClick={() => setSelected(d)}
            >
              <div className="card-head">
                <div className="card-day">
                  <span className="card-weekday">{d === today ? 'Hoje' : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                  <span className="card-num">{date.getDate()}</span>
                </div>
                {p && (
                  <span className={`pill ${p.exported ? 'ok' : ''}`} title={p.exported ? 'MP4 exportado' : 'Rascunho'}>
                    {p.exported ? <Film size={12} /> : <Save size={12} />}
                    {p.exported ? 'MP4' : 'Rascunho'}
                  </span>
                )}
              </div>
              {p ? (
                <>
                  <div className="card-title">{getTemplate(p.template).name}</div>
                  <div className="card-song"><Music size={12} />{song?.title ?? p.song}</div>
                </>
              ) : (
                <div className="card-empty">
                  {d >= today ? <><Plus size={14} />Sem vídeo</> : '—'}
                </div>
              )}
            </button>
          );
        })}
      </section>

      {post ? (
        <Editor key={post.date} post={post} songs={songs} onSaved={reload} />
      ) : (
        <section className="empty-day">
          <div className="empty-icon"><Sparkles size={28} /></div>
          <h2>Nenhum vídeo para {formatDay(selected)}</h2>
          <p className="muted">Uma simulação, música e visual são sorteados para você ajustar depois.</p>
          <button className="primary" onClick={() => create(selected)} disabled={!songs.length}>
            <Plus size={16} /> Criar vídeo deste dia
          </button>
        </section>
      )}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{icon}{label}</span>
      {children}
    </label>
  );
}

function Editor({ post: initial, songs, onSaved }: { post: Post; songs: Song[]; onSaved: () => void }) {
  const [post, setPost] = useState(initial);
  const [status, setStatus] = useState<Status | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const song = songs.find((s) => s.id === post.song);
  const info = useMemo(
    () => simulateHeadless(post.template, post.params, post.seed),
    [post.template, post.seed, JSON.stringify(post.params)],
  );
  const dirty = JSON.stringify(post) !== JSON.stringify(initial);
  const set = (patch: Partial<Post>) => setPost((p) => ({ ...p, ...patch }));
  const say = (tone: Tone, text: string) => setStatus({ tone, text });

  /** A new simulation brings its own text, title and a version that fits the 1:02-1:06 window. */
  function changeTemplate(id: string) {
    const tpl = getTemplate(id);
    const seed = findSeed(id, {}, 1 + Math.floor(Math.random() * 1_000_000)) ?? post.seed;
    set({
      template: id,
      params: {},
      seed,
      overlay: tpl.defaultOverlay,
      ...(song ? { title: makeTitle(id, song), caption: makeCaption(tpl.defaultOverlay, song, post) } : {}),
    });
  }

  /** Background/palette changes also refresh the caption's hashtag line. */
  const setLook = (patch: Pick<Post, 'background'> | Pick<Post, 'palette'>) =>
    setPost((p) => {
      const next = { ...p, ...patch };
      return { ...next, caption: withHashtags(next.caption, song, next) };
    });

  /** Saves; if anything that changes the video was edited, the old MP4 no longer matches and is removed. */
  async function persist() {
    const videoKey = (p: Post) =>
      JSON.stringify([p.template, p.params, p.seed, p.song, p.overlay, p.background, p.palette]);
    let toSave = post;
    if (initial.exported && videoKey(post) !== videoKey(initial)) {
      await api.deleteExport(post.date);
      const { exported: _old, ...rest } = post;
      toSave = rest;
    }
    await api.savePost(toSave);
  }

  async function save() {
    await persist();
    say('ok', 'Salvo');
    onSaved();
  }

  function regenerate() {
    say('info', 'Sorteando uma nova combinação que termine entre 1:02 e 1:06…');
    // Let the status paint before the (short) blocking search.
    setTimeout(() => {
      const next = randomize(post, songs);
      if (!next) say('error', 'Nenhuma versão encaixou. Tente de novo.');
      else {
        setPost(next);
        say('ok', `Nova combinação: ${getBackground(next.background).name} + ${getPalette(next.palette).name}. Assista e, se gostar, salve ou exporte.`);
      }
    }, 30);
  }

  /** Rolls only the seed: same simulation, settings, song and look, a new version that fits the finish window. */
  function rollSeed() {
    say('info', 'Procurando uma seed que termine entre 1:02 e 1:06…');
    // Let the status paint before the (short) blocking search.
    setTimeout(() => {
      const seed = findSeed(post.template, post.params, 1 + Math.floor(Math.random() * 1_000_000));
      if (seed === null) say('error', 'Nenhuma seed encaixou na janela. Tente de novo.');
      else {
        set({ seed });
        say('ok', `Nova seed: ${seed}`);
      }
    }, 30);
  }

  async function remove() {
    if (!confirm(`Excluir o vídeo de ${formatDay(post.date)}? O MP4 exportado também será apagado.`)) return;
    await api.deletePost(post.date);
    onSaved();
  }

  async function doExport() {
    if (!song) return;
    try {
      await persist();
      setProgress(0);
      const blob = await exportVideo(post, song, (p, label) => {
        setProgress(p);
        say('info', label);
      });
      say('info', 'Salvando arquivo…');
      const { path } = await api.uploadExport(post.date, blob);
      say('ok', `Vídeo salvo em ${path}`);
      onSaved();
    } catch (e) {
      say('error', `Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProgress(null);
    }
  }

  const fmt = (s: number | null) => (s === null ? 'não termina' : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`);
  const inWindow = info.finishTime !== null && info.finishTime >= FINISH_MIN && info.finishTime <= FINISH_MAX;

  return (
    <section className="editor">
      <div className="form">
        <div className="editor-head">
          <div>
            <span className="eyebrow">{formatDay(post.date)}</span>
            <input className="title-input" value={post.title} onChange={(e) => set({ title: e.target.value })} aria-label="Título" />
          </div>
          <button onClick={regenerate} title="Sortear simulação, música e visual">
            <Shuffle size={16} /> Regerar
          </button>
        </div>

        <div className="group">
          <h3>Simulação</h3>
          <div className="row">
            <Field label="Simulação" icon={<Sparkles size={14} />}>
              <select value={post.template} onChange={(e) => changeTemplate(e.target.value)}>
                {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Música" icon={<Music size={14} />}>
              <select
                value={post.song}
                onChange={(e) => {
                  const s = songs.find((x) => x.id === e.target.value)!;
                  set({ song: s.id, title: makeTitle(post.template, s), caption: makeCaption(post.overlay, s, post) });
                }}
              >
                {songs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </Field>
          </div>
          <div className="row align-end">
            <Field label="Seed" icon={<Hash size={14} />}>
              <div className="seed-input">
                <input type="number" value={post.seed} onChange={(e) => set({ seed: Number(e.target.value) })} />
                <button
                  type="button"
                  className="icon-square"
                  onClick={(e) => { e.preventDefault(); rollSeed(); }}
                  title="Sortear outra seed (mantém o resto)"
                  aria-label="Sortear outra seed"
                >
                  <Dices size={16} />
                </button>
              </div>
            </Field>
            <div className={`timing ${inWindow ? 'ok' : 'warn'}`}>
              {inWindow ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>Clímax em <b>{fmt(info.finishTime)}</b> · vídeo com <b>{fmt(info.duration)}</b></span>
            </div>
          </div>
          {!inWindow && <small className="timing-hint">Fora da janela ideal (1:02–1:06), clique em Regerar</small>}
        </div>

        <div className="group">
          <h3>Visual</h3>
          <div className="row">
            <Field label="Fundo" icon={<Image size={14} />}>
              <select value={getBackground(post.background).id} onChange={(e) => setLook({ background: e.target.value })}>
                {BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Cores das linhas" icon={<Palette size={14} />}>
              <select value={getPalette(post.palette).id} onChange={(e) => setLook({ palette: e.target.value })}>
                {PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Texto no vídeo" icon={<Type size={14} />}>
            <input value={post.overlay} onChange={(e) => set({ overlay: e.target.value })} />
          </Field>
        </div>

        <div className="group">
          <div className="group-head">
            <h3>Legenda + hashtags</h3>
            <button
              className="ghost small"
              onClick={() => navigator.clipboard.writeText(post.caption).then(() => say('ok', 'Legenda copiada'))}
            >
              <Copy size={14} /> Copiar
            </button>
          </div>
          <textarea rows={6} value={post.caption} onChange={(e) => set({ caption: e.target.value })} aria-label="Legenda" />
        </div>

        <div className="actions">
          <button onClick={save} disabled={!dirty}>
            {dirty ? <Save size={16} /> : <Check size={16} />} {dirty ? 'Salvar' : 'Salvo'}
          </button>
          <button className="primary" onClick={doExport} disabled={progress !== null || !song}>
            <Clapperboard size={16} /> Exportar MP4
          </button>
          <button className="danger" onClick={remove} disabled={progress !== null} title="Excluir dia">
            <Trash2 size={16} /> Excluir
          </button>
        </div>
        {progress !== null && (
          <div className="progress"><div style={{ width: `${progress * 100}%` }} /></div>
        )}
        {status && (
          <p className={`status ${status.tone}`}>
            {status.tone === 'error' ? <AlertTriangle size={16} /> : status.tone === 'ok' ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
            <span>{status.text}</span>
          </p>
        )}
        {initial.exported && (
          <a className="export-link" href={`/api/exports/${initial.exported}`} target="_blank">
            <Film size={16} /> {initial.exported} <ExternalLink size={14} />
          </a>
        )}
      </div>
      <Preview post={post} song={song} duration={info.duration} />
    </section>
  );
}
