import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SONGS = path.join(ROOT, 'musicas');
const POSTS = path.join(ROOT, 'simulacoes');
const EXPORTS = path.join(ROOT, 'exports');
const DATE = /^\d{4}-\d{2}-\d{2}$/;

await fs.mkdir(POSTS, { recursive: true });
await fs.mkdir(EXPORTS, { recursive: true });

const app = express();
app.use(express.json());

async function readJsonDir(dir: string) {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(
    files.map(async (f) => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')) })),
  );
}

app.get('/api/songs', async (_req, res) => {
  res.json(await readJsonDir(SONGS));
});

app.get('/api/posts', async (_req, res) => {
  const posts = await readJsonDir(POSTS);
  res.json(posts.map(({ id: _id, ...p }) => p));
});

app.put('/api/posts/:date', async (req, res) => {
  const { date } = req.params;
  if (!DATE.test(date)) return void res.status(400).json({ error: 'data inválida' });
  await fs.writeFile(path.join(POSTS, `${date}.json`), JSON.stringify({ ...req.body, date }, null, 2));
  res.json({ ok: true });
});

app.delete('/api/posts/:date', async (req, res) => {
  const { date } = req.params;
  if (!DATE.test(date)) return void res.status(400).json({ error: 'data inválida' });
  await fs.rm(path.join(POSTS, `${date}.json`), { force: true });
  await fs.rm(path.join(EXPORTS, `${date}.mp4`), { force: true });
  res.json({ ok: true });
});

app.delete('/api/export/:date', async (req, res) => {
  const { date } = req.params;
  if (!DATE.test(date)) return void res.status(400).json({ error: 'data inválida' });
  await fs.rm(path.join(EXPORTS, `${date}.mp4`), { force: true });
  res.json({ ok: true });
});

// Receives the MP4 rendered in the browser and saves it next to the project.
app.post('/api/export/:date', express.raw({ type: 'video/mp4', limit: '2gb' }), async (req, res) => {
  const { date } = req.params;
  if (!DATE.test(date)) return void res.status(400).json({ error: 'data inválida' });
  const file = `${date}.mp4`;
  await fs.writeFile(path.join(EXPORTS, file), req.body as Buffer);
  const postFile = path.join(POSTS, `${date}.json`);
  const post = JSON.parse(await fs.readFile(postFile, 'utf8'));
  await fs.writeFile(postFile, JSON.stringify({ ...post, exported: file }, null, 2));
  res.json({ file, path: path.join(EXPORTS, file) });
});

app.use('/api/exports', express.static(EXPORTS));

app.listen(3001, () => console.log('API em http://localhost:3001'));
