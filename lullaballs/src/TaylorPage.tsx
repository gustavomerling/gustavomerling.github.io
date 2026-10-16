import { useMemo, useState } from 'react';
import { parseNote, type Song } from './audio/notes';
import { Preview } from './components/Preview';
import { findSeed, simulateHeadless } from './engine/run';
import { exportVideo } from './export';
import type { Post } from './types';

/**
 * A private gift page (not part of the channel): 13 rings — Taylor's lucky number — one color per era,
 * over a sparkly "Eras" sky, with an original pop-ballad melody. Nothing here is saved or published.
 */

// Original melody in a pop-ballad style (C–G–Am–F), written for this page.
const TREZE: Song = {
  id: 'treze',
  title: 'Treze',
  composer: 'original, feita pra você',
  notes: [
    'C3+E4', 'G4', 'G4', 'A4', 'G2+G4', 'E4', 'D4', 'D4',
    'A2+C4', 'E4', 'E4', 'G4', 'F2+A4', 'G4', 'F4', 'E4',
    'C3+E4', 'G4', 'G4', 'C5', 'G2+B4', 'A4', 'G4', 'D4',
    'A2+E4', 'G4', 'A4', 'C5', 'F2+A4', 'G4', 'F4', 'G4',
    'C3+C5', 'C5', 'C5', 'D5', 'G2+E5', 'D5', 'C5', 'B4',
    'A2+C5', 'C5', 'C5', 'D5', 'F2+E5', 'G5', 'E5', 'D5',
    'C3+C5', 'C5', 'C5', 'D5', 'G2+E5', 'D5', 'C5', 'G4',
    'A2+A4', 'C5', 'E5', 'D5', 'F2+C5', 'D5', 'G2+B4', 'C3+C5+E5+G4',
  ],
};

const PARAMS = { rings: 13 };

function makePost(seed: number, overlay: string): Post {
  return {
    date: 'presente', title: 'Para você', caption: '', song: 'treze',
    template: 'escape-rings', params: PARAMS, seed, overlay, background: 'eras', palette: 'eras',
  };
}

export function TaylorPage() {
  const [overlay, setOverlay] = useState('Cada quique é pra você 💜');
  const [seed, setSeed] = useState(() => findSeed('escape-rings', PARAMS, 13) ?? 13);
  const [song, setSong] = useState<Song>(TREZE);
  const [notesText, setNotesText] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [download, setDownload] = useState<string | null>(null);

  const post = useMemo(() => makePost(seed, overlay), [seed, overlay]);
  const info = useMemo(() => simulateHeadless('escape-rings', PARAMS, seed), [seed]);

  function regenerate() {
    const next = findSeed('escape-rings', PARAMS, 1 + Math.floor(Math.random() * 1_000_000));
    if (next !== null) setSeed(next);
  }

  function applyNotes() {
    const notes = notesText.split(/[\s,]+/).map((n) => n.replace(/"/g, '').trim()).filter(Boolean);
    try {
      notes.forEach(parseNote);
      if (!notes.length) throw new Error('nenhuma nota');
      setSong({ ...TREZE, id: 'custom', title: 'Sua música', notes });
      setStatus(`Música trocada: ${notes.length} notas ✓`);
    } catch (e) {
      setStatus(`Não entendi as notas: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function doExport() {
    try {
      setProgress(0);
      const blob = await exportVideo(post, song, (p, label) => {
        setProgress(p);
        setStatus(label);
      });
      if (download) URL.revokeObjectURL(download);
      setDownload(URL.createObjectURL(blob));
      setStatus('Vídeo pronto 💜');
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="taylor">
      <header>
        <h1>Para você <span>💜</span></h1>
        <p>13 anéis, um para cada era. Aperte o play e aumente o som.</p>
      </header>
      <main>
        <Preview post={post} song={song} duration={info.duration} />
        <section className="taylor-panel">
          <label>Mensagem no vídeo
            <input value={overlay} onChange={(e) => setOverlay(e.target.value)} />
          </label>
          <div className="actions">
            <button onClick={regenerate}>✨ Outra versão</button>
            <button className="primary" onClick={doExport} disabled={progress !== null}>🎬 Gerar vídeo</button>
            {download && <a className="button" href={download} download="para-voce.mp4">⬇ Baixar MP4</a>}
          </div>
          {progress !== null && <progress value={progress} max={1} />}
          {status && <p className="status">{status}</p>}
          <details>
            <summary>Trocar a música (opcional)</summary>
            <p className="muted">
              Uma nota por quique, separadas por espaço. Ex.: <code>C4 E4 G4 C3+C5</code> (o <code>+</code> toca junto;
              <code>#</code> para sustenido). Tocando agora: <b>{song.title}</b>.
            </p>
            <textarea rows={4} value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="E4 E4 F4 G4 ..." />
            <div className="actions">
              <button onClick={applyNotes} disabled={!notesText.trim()}>Usar essas notas</button>
              <button onClick={() => { setSong(TREZE); setStatus('Voltou para "Treze" ✓'); }}>Voltar para "Treze"</button>
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
