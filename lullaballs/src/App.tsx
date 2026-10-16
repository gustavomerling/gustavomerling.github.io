import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { Song } from './audio/notes';
import { Preview } from './components/Preview';
import { VISIBLE_BACKGROUNDS, getBackground } from './engine/backgrounds';
import { VISIBLE_PALETTES, getPalette } from './engine/palettes';
import { addDays, formatDay, isoDate } from './dates';
import { findSeed, simulateHeadless } from './engine/run';
import { TEMPLATES, getTemplate } from './engine/templates';
import { exportVideo } from './export';
import { makeCaption, makeTitle, newPost, randomize, withHashtags } from './newPost';
import type { Post } from './types';

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
      <header>
        <h1>Lullaballs <span>🎵</span></h1>
        {error && <p className="error">{error}</p>}
      </header>

      <section className="days">
        {days.map((d) => {
          const p = byDate.get(d);
          const song = songs.find((s) => s.id === p?.song);
          return (
            <button
              key={d}
              className={`card ${d === selected ? 'selected' : ''} ${d === today ? 'today' : ''} ${p ? '' : 'empty'}`}
              onClick={() => setSelected(d)}
            >
              <div className="card-date">{d === today ? 'Hoje · ' : ''}{formatDay(d)}</div>
              {p ? (
                <>
                  <div className="card-title">{p.title}</div>
                  <div className="card-song">🎵 {song?.title ?? p.song}</div>
                  <div className="card-caption">{p.caption}</div>
                </>
              ) : (
                <div className="card-empty">{d >= today ? 'Sem vídeo ainda' : '—'}</div>
              )}
            </button>
          );
        })}
      </section>

      {post ? (
        <Editor key={post.date} post={post} songs={songs} onSaved={reload} />
      ) : (
        <section className="empty-day">
          <p>Nenhum vídeo para {formatDay(selected)}.</p>
          <button className="primary" onClick={() => create(selected)} disabled={!songs.length}>
            ✨ Criar vídeo deste dia
          </button>
        </section>
      )}
    </div>
  );
}

function Editor({ post: initial, songs, onSaved }: { post: Post; songs: Song[]; onSaved: () => void }) {
  const [post, setPost] = useState(initial);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const song = songs.find((s) => s.id === post.song);
  const info = useMemo(
    () => simulateHeadless(post.template, post.params, post.seed),
    [post.template, post.seed, JSON.stringify(post.params)],
  );
  const dirty = JSON.stringify(post) !== JSON.stringify(initial);
  const set = (patch: Partial<Post>) => setPost((p) => ({ ...p, ...patch }));
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
    setStatus('Salvo ✓');
    onSaved();
  }

  function regenerate() {
    setStatus('Sorteando uma nova combinação que termine entre 1:02 e 1:06…');
    // Let the status paint before the (short) blocking search.
    setTimeout(() => {
      const next = randomize(post, songs);
      if (!next) setStatus('Nenhuma versão encaixou. Tente de novo.');
      else {
        setPost(next);
        setStatus(`Nova combinação: ${getBackground(next.background).name} + ${getPalette(next.palette).name}. Assista e, se gostar, salve ou exporte.`);
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
        setStatus(label);
      });
      setStatus('Salvando arquivo…');
      const { path } = await api.uploadExport(post.date, blob);
      setStatus(`Vídeo salvo em ${path}`);
      onSaved();
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProgress(null);
    }
  }

  const fmt = (s: number | null) => (s === null ? 'não termina' : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`);

  return (
    <section className="editor">
      <div className="form">
        <label>Título
          <input value={post.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <div className="row">
          <label>Simulação
            <select value={post.template} onChange={(e) => changeTemplate(e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label>Música
            <select
              value={post.song}
              onChange={(e) => {
                const s = songs.find((x) => x.id === e.target.value)!;
                set({ song: s.id, title: makeTitle(post.template, s), caption: makeCaption(post.overlay, s, post) });
              }}
            >
              {songs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
        </div>
        <div className="row">
          <label>Fundo
            <select value={getBackground(post.background).id} onChange={(e) => setLook({ background: e.target.value })}>
              {VISIBLE_BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>Cores das linhas
            <select value={getPalette(post.palette).id} onChange={(e) => setLook({ palette: e.target.value })}>
              {VISIBLE_PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <label>Texto no vídeo
          <input value={post.overlay} onChange={(e) => set({ overlay: e.target.value })} />
        </label>
        <label>Legenda + hashtags
          <textarea rows={6} value={post.caption} onChange={(e) => set({ caption: e.target.value })} />
        </label>
        <div className="row align-end">
          <label>Seed
            <input type="number" value={post.seed} onChange={(e) => set({ seed: Number(e.target.value) })} />
          </label>
          <button onClick={regenerate}>🔄 Regerar</button>
        </div>
        <p className="muted">
          Clímax em <b>{fmt(info.finishTime)}</b> · vídeo com <b>{fmt(info.duration)}</b>
          {info.finishTime === null || info.finishTime < 62 ? ' · ⚠️ fora da janela ideal, clique em Regerar' : ''}
        </p>

        <div className="actions">
          <button onClick={save} disabled={!dirty}>💾 Salvar</button>
          <button onClick={() => navigator.clipboard.writeText(post.caption).then(() => setStatus('Legenda copiada ✓'))}>
            📋 Copiar legenda
          </button>
          <button className="primary" onClick={doExport} disabled={progress !== null}>🎬 Exportar MP4</button>
          <button className="danger" onClick={remove} disabled={progress !== null}>🗑 Excluir dia</button>
        </div>
        {progress !== null && <progress value={progress} max={1} />}
        {status && <p className="status">{status}</p>}
        {initial.exported && (
          <p className="muted">
            Exportado: <a href={`/api/exports/${initial.exported}`} target="_blank">{initial.exported}</a>
          </p>
        )}
      </div>
      <Preview post={post} song={song} duration={info.duration} />
    </section>
  );
}
