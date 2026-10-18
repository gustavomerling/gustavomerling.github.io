import {
  AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat, Output,
  getFirstEncodableAudioCodec,
} from 'mediabunny';
import { eventsToHits, type Song } from './audio/notes';
import { renderAudio } from './audio/synth';
import { dressed } from './engine/extras';
import { resolveParams, simulateHeadless } from './engine/run';
import { getTemplate } from './engine/templates';
import { FPS, H, W } from './engine/types';
import type { Post } from './types';

/** Renders a post to an MP4 (1080x1920, 60fps, H.264 + AAC) faster than real time. */
export async function exportVideo(post: Post, song: Song, onProgress: (p: number, label: string) => void): Promise<Blob> {
  onProgress(0, 'Simulando…');
  const { events, duration, frames, finishTime } = simulateHeadless(post.template, post.params, post.seed);

  onProgress(0, 'Gerando áudio…');
  const audioBuffer = await renderAudio(eventsToHits(events, song, finishTime), duration, post.instrument);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  });
  const video = new CanvasSource(canvas, { codec: 'avc', bitrate: 10_000_000, keyFrameInterval: 2 });
  output.addVideoTrack(video, { frameRate: FPS });
  const audioCodec = await getFirstEncodableAudioCodec(['aac', 'opus']);
  if (!audioCodec) throw new Error('Este navegador não consegue codificar áudio. Use o Chrome ou o Edge.');
  const audio = new AudioBufferSource({ codec: audioCodec, bitrate: 192_000 });
  output.addAudioTrack(audio);
  await output.start();
  await audio.add(audioBuffer);
  audio.close();

  const sim = dressed(
    () => getTemplate(post.template).create(resolveParams(post.template, post.params), post.seed, post),
    { overlay: post.overlay, poll: post.poll, finishTime, duration },
  );
  for (let f = 0; f < frames; f++) {
    sim.step();
    sim.draw(ctx);
    await video.add(f / FPS, 1 / FPS);
    if (f % 30 === 0) onProgress(f / frames, `Renderizando quadros ${f}/${frames}`);
  }
  video.close();
  onProgress(1, 'Finalizando MP4…');
  await output.finalize();
  return new Blob([output.target.buffer!], { type: 'video/mp4' });
}
