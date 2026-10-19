// Smoke test of the built game: `npm run smoke` (after `npm run build`).
// Opens dist/ in Electron, drives intro -> menu -> run with synthetic input,
// saves screenshots to smoke/ and fails on any renderer error.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'smoke');
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    // Visible on purpose: hidden windows get throttled animation frames.
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.webContents.on('console-message', (event) => {
    if (event.level === 'error') errors.push(event.message);
  });
  win.webContents.on('render-process-gone', (_e, d) => errors.push(`renderer gone: ${d.reason}`));
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  const wc = win.webContents;
  const shot = async (name) => fs.writeFileSync(path.join(OUT, `${name}.png`), (await wc.capturePage()).toPNG());
  const tap = async (keyCode, holdMs = 50) => {
    wc.sendInputEvent({ type: 'keyDown', keyCode });
    await wait(holdMs);
    wc.sendInputEvent({ type: 'keyUp', keyCode });
    await wait(50);
  };
  const mouse = (type, x, y, button = 'left') => wc.sendInputEvent({ type, x, y, button, clickCount: 1 });

  await wait(800);
  await shot('01-intro-credit');
  await tap('Enter');
  await wait(900);
  await shot('02-intro-title');
  await tap('Enter');
  await wait(400);
  await shot('03-menu');
  await tap('Enter'); // "Nova run"
  await wait(1200);
  mouse('mouseMove', 900, 300);
  await wait(100);
  await shot('04-run-start');

  await tap('D', 700);
  await tap('Space', 250);
  await wait(400);
  for (let i = 0; i < 4; i++) {
    mouse('mouseDown', 900, 300);
    await wait(40);
    mouse('mouseUp', 900, 300);
    await wait(120);
  }
  await shot('05-run-moved-shooting');

  // Combat via debug keys: spawn enemies in front, drop items, shoot them down.
  mouse('mouseMove', 760, 560);
  await wait(50);
  await tap('F6');
  await tap('F6');
  await tap('F7');
  await wait(300);
  for (let i = 0; i < 10; i++) {
    mouse('mouseDown', 760, 540 - (i % 3) * 14);
    await wait(30);
    mouse('mouseUp', 760, 540 - (i % 3) * 14);
    await wait(90);
  }
  await shot('05b-combat');
  await wait(700);
  await shot('05c-after-combat');

  await tap('E');
  await wait(600);
  await tap('F3');
  await wait(600);
  await shot('06-slowmo-debug');

  await tap('Escape');
  await wait(300);
  await shot('07-pause');

  const state = await wc.executeJavaScript('document.body.innerText');
  if (!/pausa/i.test(state)) errors.push(`pause menu did not open; screen text:\n${state}`);

  console.log(`screenshots: ${OUT}`);
  if (errors.length) {
    console.error('SMOKE FAILED:\n' + errors.join('\n'));
    app.exit(1);
  } else {
    console.log('SMOKE OK');
    app.exit(0);
  }
}

app.whenReady().then(() =>
  main().catch((err) => {
    console.error(err);
    app.exit(1);
  }),
);
