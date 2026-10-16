(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---------- Settings ----------

  const RATIOS = [
    { id: '16:9', label: '16:9', value: 16 / 9 },
    { id: '2.39:1', label: 'Cinemascope', value: 2.39 },
    { id: '1.85:1', label: '1.85:1', value: 1.85 },
    { id: '4:3', label: '4:3', value: 4 / 3 },
    { id: '1:1', label: '1:1', value: 1 },
  ];
  const BGS = ['#000000', '#ffffff'];
  const COLORS = ['#ffffff', '#ffe14d'];
  const MAX = 4;
  const STORE = 'snippets:settings';
  const KEY_STORE = 'snippets:tmdb';

  const defaults = {
    rows: [1, 1], ratio: '16:9', gap: 8, bg: '#000000',
    font: 'Source Sans 3', weight: '500', size: 4.5, italic: false, color: '#ffffff', width: '1600',
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  const S = { ...defaults };
  try { Object.assign(S, JSON.parse(store.get(STORE) || '{}')); } catch { /* ignore */ }
  // `rows` holds the column count of each row; older saves stored a uniform cols × rows.
  if (!Array.isArray(S.rows)) S.rows = Array(clamp(Number(S.rows) || 2, 1, MAX)).fill(clamp(Number(S.cols) || 1, 1, MAX));
  S.rows = S.rows.slice(0, MAX).map((n) => clamp(Number(n) || 1, 1, MAX));
  if (!S.rows.length) S.rows = [1];
  delete S.cols;
  // Per-row column width weights and height multipliers, set by dragging the gutters.
  if (!Array.isArray(S.colW)) S.colW = [];
  if (!Array.isArray(S.rowS)) S.rowS = [];
  S.rows.forEach((n, r) => {
    const w = S.colW[r];
    if (!Array.isArray(w) || w.length !== n || w.some((v) => !(v > 0))) S.colW[r] = null;
    if (!(S.rowS[r] > 0)) S.rowS[r] = 1;
  });
  const save = () => store.set(STORE, JSON.stringify(S));

  const newCell = () => ({ img: null, ox: 0.5, oy: 0.5, zoom: 1, caption: '' });
  // Cells live at row * MAX + col, so a row keeps its images when another row changes.
  const cells = Array.from({ length: MAX * MAX }, newCell);
  let sel = 0;

  const visible = () => S.rows.flatMap((n, r) => Array.from({ length: n }, (_, c) => r * MAX + c));
  const ratio = () => (RATIOS.find((r) => r.id === S.ratio) || RATIOS[0]).value;

  // All geometry is in output pixels; the preview multiplies by `k`.
  // By default every cell keeps the frame ratio, so rows with fewer columns are taller;
  // the gutters then reweight the columns and scale each row's height.
  function dims() {
    const W = Number(S.width);
    const g = Math.round((S.gap * W) / 1600);
    const rects = {};
    const rowsInfo = [];
    let y = g;
    S.rows.forEach((n, r) => {
      const inner = W - g * (n + 1);
      const weights = S.colW[r] || Array(n).fill(1);
      const sum = weights.reduce((a, b) => a + b, 0);
      const baseH = inner / n / ratio();
      const h = baseH * (S.rowS[r] || 1);
      let x = g;
      for (let c = 0; c < n; c++) {
        const w = (inner * weights[c]) / sum;
        rects[r * MAX + c] = { x, y, w, h };
        x += w + g;
      }
      rowsInfo.push({ y, h, baseH, inner });
      y += h + g;
    });
    return { W, H: y, g, rects, rowsInfo };
  }

  // Caption size follows the cell's area, so it matches the plain width when the frame is untouched.
  const capBase = (rc) => Math.sqrt(rc.w * rc.h * ratio());

  function imgRect(cell, cw, ch) {
    const iw = cell.img.naturalWidth, ih = cell.img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih) * cell.zoom;
    const w = iw * s, h = ih * s;
    return { x: (cw - w) * cell.ox, y: (ch - h) * cell.oy, w, h };
  }

  const fontCss = (px) => `${S.italic ? 'italic ' : ''}${S.weight} ${px}px "${S.font}", sans-serif`;
  const CAP_BOTTOM = 0.055; // of cell height
  const CAP_WIDTH = 0.9; // of cell width
  const LINE = 1.18;

  // ---------- Stage ----------

  const stage = $('#stage');
  const wrap = $('#stage-wrap');
  let k = 1;
  let cellEls = new Map();

  function buildStage() {
    stage.textContent = '';
    cellEls = new Map();
    for (const i of visible()) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.innerHTML = `
        <div class="frame">
          <img class="pic" alt="" draggable="false" />
          <div class="empty">
            <span>Arraste uma imagem ou cole com Ctrl+V</span>
            <button class="btn pick" type="button">Escolher arquivo</button>
          </div>
        </div>
        <div class="cap" spellcheck="false" data-placeholder="Clique para escrever a legenda"></div>
        <button class="clear" type="button" title="Remover imagem" aria-label="Remover imagem">×</button>`;
      const cap = el.querySelector('.cap');
      cap.contentEditable = supportsPlaintext ? 'plaintext-only' : 'true';
      cap.textContent = cells[i].caption;
      bindCell(el, i);
      stage.appendChild(el);
      cellEls.set(i, el);
    }
    if (!cellEls.has(sel)) sel = visible()[0];
    buildGutters();
    cellEls.forEach((el, i) => paintImage(i));
    layout();
    markSelected();
  }

  // ---------- Gutters (resize) ----------

  let gutters = [];
  let resizing = false;

  function buildGutters() {
    gutters = [];
    S.rows.forEach((n, r) => {
      for (let c = 0; c < n - 1; c++) gutters.push(makeGutter('v', r, c));
      gutters.push(makeGutter('h', r));
    });
  }

  function makeGutter(dir, r, c = 0) {
    const el = document.createElement('div');
    el.className = `gutter gutter-${dir}`;
    el.title = dir === 'v'
      ? 'Arraste para ajustar a largura · duplo clique para voltar ao padrão'
      : 'Arraste para ajustar a altura da linha · duplo clique para voltar ao padrão';
    stage.appendChild(el);

    let start = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const d = dims();
      const n = S.rows[r];
      start = {
        x: e.clientX, y: e.clientY, d,
        weights: (S.colW[r] || Array(n).fill(1)).slice(),
        scale: S.rowS[r] || 1,
      };
      resizing = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('active');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      const { d } = start;
      if (dir === 'v') {
        const a = d.rects[r * MAX + c], b = d.rects[r * MAX + c + 1];
        const pair = a.w + b.w, min = Math.min(pair / 2, d.rowsInfo[r].inner * 0.12);
        const wa = clamp(a.w + (e.clientX - start.x) / k, min, pair - min);
        const sum = start.weights.reduce((x, y) => x + y, 0);
        const unit = sum / d.rowsInfo[r].inner;
        const w = start.weights.slice();
        w[c] = wa * unit;
        w[c + 1] = (pair - wa) * unit;
        S.colW[r] = w;
      } else {
        const info = d.rowsInfo[r];
        const h = clamp(info.h + (e.clientY - start.y) / k, info.baseH * 0.25, info.baseH * 3);
        S.rowS[r] = h / info.baseH;
      }
      layout(true);
    });
    const end = () => {
      if (!start) return;
      start = null;
      resizing = false;
      el.classList.remove('active');
      save();
      layout();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => {
      if (dir === 'v') S.colW[r] = null;
      else S.rowS[r] = 1;
      save();
      layout();
    });

    return { el, dir, r, c };
  }

  function placeGutters(d) {
    const hit = 12; // px of grab area in the preview
    for (const gt of gutters) {
      const info = d.rowsInfo[gt.r];
      if (gt.dir === 'v') {
        const a = d.rects[gt.r * MAX + gt.c];
        const cx = (a.x + a.w + d.g / 2) * k;
        Object.assign(gt.el.style, {
          left: `${cx - hit / 2}px`, top: `${info.y * k}px`, width: `${hit}px`, height: `${info.h * k}px`,
        });
      } else {
        const cy = (info.y + info.h + d.g / 2) * k;
        Object.assign(gt.el.style, {
          left: '0px', top: `${cy - hit / 2}px`, width: `${d.W * k}px`, height: `${hit}px`,
        });
      }
    }
  }

  const supportsPlaintext = (() => {
    const d = document.createElement('div');
    try { d.contentEditable = 'plaintext-only'; } catch { return false; }
    return d.contentEditable === 'plaintext-only';
  })();

  // `keepScale` holds the preview zoom while a gutter is dragged, so the handle stays under the cursor.
  function layout(keepScale = false) {
    const d = dims();
    if (!keepScale) {
      const pad = window.innerWidth <= 760 ? 32 : 48;
      const tips = wrap.querySelector('.tips').offsetHeight + 14;
      const availW = Math.max(100, wrap.clientWidth - pad);
      const availH = window.innerWidth <= 760 ? Infinity : Math.max(100, wrap.clientHeight - pad - tips);
      k = Math.min(availW / d.W, availH / d.H);
    }
    stage.style.width = `${d.W * k}px`;
    stage.style.height = `${d.H * k}px`;
    stage.style.background = S.bg;
    cellEls.forEach((el, i) => {
      const o = d.rects[i];
      Object.assign(el.style, {
        left: `${o.x * k}px`, top: `${o.y * k}px`, width: `${o.w * k}px`, height: `${o.h * k}px`,
      });
      const cap = el.querySelector('.cap');
      Object.assign(cap.style, {
        font: fontCss((S.size / 100) * capBase(o) * k),
        lineHeight: String(LINE),
        color: S.color,
        bottom: `${CAP_BOTTOM * o.h * k}px`,
        left: `${((1 - CAP_WIDTH) / 2) * 100}%`,
        right: `${((1 - CAP_WIDTH) / 2) * 100}%`,
      });
      placePic(i, d);
    });
    placeGutters(d);
  }

  function placePic(i, d = dims()) {
    const cell = cells[i], el = cellEls.get(i);
    if (!el || !cell.img) return;
    const r = imgRect(cell, d.rects[i].w, d.rects[i].h);
    Object.assign(el.querySelector('.pic').style, {
      left: `${r.x * k}px`, top: `${r.y * k}px`, width: `${r.w * k}px`, height: `${r.h * k}px`,
    });
  }

  function paintImage(i) {
    const el = cellEls.get(i);
    if (!el) return;
    const pic = el.querySelector('.pic');
    const cell = cells[i];
    el.classList.toggle('has-img', !!cell.img);
    if (cell.img) {
      pic.src = cell.img.src;
      pic.hidden = false;
      placePic(i);
    } else {
      pic.removeAttribute('src');
      pic.hidden = true;
    }
  }

  function markSelected() {
    cellEls.forEach((el, i) => el.classList.toggle('sel', i === sel));
  }

  function select(i) {
    sel = i;
    markSelected();
  }

  function bindCell(el, i) {
    const frame = el.querySelector('.frame');
    const cap = el.querySelector('.cap');

    el.addEventListener('pointerdown', () => select(i));

    el.querySelector('.pick').addEventListener('click', () => openPicker(i));
    el.querySelector('.clear').addEventListener('click', () => {
      cells[i].img = null;
      paintImage(i);
    });

    cap.addEventListener('input', () => {
      if (!cap.textContent.trim() && cap.innerHTML !== '') cap.innerHTML = '';
      cells[i].caption = cap.innerText.replace(/\n$/, '');
    });
    cap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cap.blur();
    });
    if (!supportsPlaintext) {
      cap.addEventListener('paste', (e) => {
        const text = e.clipboardData && e.clipboardData.getData('text/plain');
        if (!text) return;
        e.preventDefault();
        document.execCommand('insertText', false, text);
      });
    }

    // Pan by dragging, zoom with the wheel.
    let drag = null;
    frame.addEventListener('pointerdown', (e) => {
      if (!cells[i].img || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, ox: cells[i].ox, oy: cells[i].oy };
      frame.setPointerCapture(e.pointerId);
      frame.classList.add('dragging');
    });
    frame.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const d = dims(), { w: cw, h: ch } = d.rects[i], cell = cells[i], r = imgRect(cell, cw, ch);
      const dx = (e.clientX - drag.x) / k, dy = (e.clientY - drag.y) / k;
      if (r.w > cw + 0.5) cell.ox = clamp(drag.ox + dx / (cw - r.w), 0, 1);
      if (r.h > ch + 0.5) cell.oy = clamp(drag.oy + dy / (ch - r.h), 0, 1);
      placePic(i, d);
    });
    const end = () => { drag = null; frame.classList.remove('dragging'); };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);
    frame.addEventListener('wheel', (e) => {
      if (!cells[i].img) return;
      e.preventDefault();
      cells[i].zoom = clamp(cells[i].zoom * Math.exp(-e.deltaY * 0.0015), 1, 5);
      placePic(i);
    }, { passive: false });

    // Drop targets
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('drop');
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) el.classList.remove('drop');
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drop');
      select(i);
      handleDrop(e.dataTransfer, i);
    });
  }

  // ---------- Loading images ----------

  // First empty visible cell at `from` (or right after it), wrapping around.
  function nextEmpty(from, after = false) {
    const ids = visible();
    let start = ids.indexOf(from);
    start = start < 0 ? 0 : start + (after ? 1 : 0);
    for (let j = 0; j < ids.length; j++) {
      const i = ids[(start + j) % ids.length];
      if (!cells[i].img) return i;
    }
    return -1;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('load'));
      img.src = src;
    });
  }

  async function putBlob(i, blob) {
    const img = await loadImage(URL.createObjectURL(blob));
    const old = cells[i].img;
    if (old && old.src.startsWith('blob:')) URL.revokeObjectURL(old.src);
    Object.assign(cells[i], { img, ox: 0.5, oy: 0.5, zoom: 1 });
    paintImage(i);
  }

  // Remote images are fetched into a blob so the export canvas is never tainted.
  async function putUrl(i, url) {
    const el = cellEls.get(i);
    el && el.classList.add('loading');
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('type');
      await putBlob(i, blob);
    } catch {
      toast('Esse site não deixa usar a imagem direto. Salve no computador e arraste o arquivo.');
    } finally {
      el && el.classList.remove('loading');
    }
  }

  async function putFiles(files, start) {
    const imgs = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return false;
    let i = start;
    for (const f of imgs) {
      if (i < 0) break;
      await putBlob(i, f);
      const n = nextEmpty(i, true);
      i = n === i ? -1 : n;
    }
    return true;
  }

  async function handleDrop(dt, i) {
    if (!dt) return;
    if (dt.files && dt.files.length && (await putFiles(dt.files, i))) return;
    const url = dt.getData('application/x-snippets') ||
      (dt.getData('text/uri-list') || '').split('\n').find((l) => l && !l.startsWith('#')) ||
      extractSrc(dt.getData('text/html'));
    if (url) putUrl(i, url.trim());
  }

  function extractSrc(html) {
    if (!html) return '';
    const m = html.match(/<img[^>]+src="([^"]+)"/i);
    return m ? m[1].replace(/&amp;/g, '&') : '';
  }

  const fileInput = $('#file');
  let pickTarget = 0;
  function openPicker(i) {
    pickTarget = i;
    fileInput.value = '';
    fileInput.click();
  }
  fileInput.addEventListener('change', () => putFiles(fileInput.files, pickTarget));

  // Dropping outside the cells fills the empty ones.
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const i = nextEmpty(sel);
    handleDrop(e.dataTransfer, i < 0 ? sel : i);
  });

  document.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData ? e.clipboardData.files : [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    putFiles(files, sel);
  });

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(t.tagName)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && cells[sel].img) {
      cells[sel].img = null;
      paintImage(sel);
    }
  });

  // ---------- Controls ----------

  const picker = $('#grid-picker');
  const gridLabel = $('#grid-label');
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const labelGrid = (c, r) => `${plural(c, 'coluna', 'colunas')} × ${plural(r, 'linha', 'linhas')}`;

  for (let r = 1; r <= MAX; r++) {
    for (let c = 1; c <= MAX; c++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.c = c;
      b.dataset.r = r;
      b.setAttribute('aria-label', labelGrid(c, r));
      b.addEventListener('mouseenter', () => paintPicker(c, r, true));
      b.addEventListener('focus', () => paintPicker(c, r, true));
      b.addEventListener('click', () => setRows(Array(r).fill(c)));
      picker.appendChild(b);
    }
  }
  picker.addEventListener('mouseleave', () => paintPicker());

  function setRows(rows) {
    // A row whose column count changed starts again from the default sizes.
    S.colW = rows.map((n, r) => (S.rows[r] === n ? S.colW[r] : null));
    S.rowS = rows.map((n, r) => (S.rows[r] === n ? S.rowS[r] || 1 : 1));
    S.rows = rows;
    save();
    buildStage();
    paintPicker();
    paintRowEditor();
  }

  function currentLabel() {
    const uniform = S.rows.every((n) => n === S.rows[0]);
    return uniform ? labelGrid(S.rows[0], S.rows.length) : `${S.rows.join(' + ')} por linha`;
  }

  function paintPicker(hc, hr, hover = false) {
    for (const b of picker.children) {
      const c = Number(b.dataset.c), r = Number(b.dataset.r);
      b.classList.toggle('on', r <= S.rows.length && c <= S.rows[r - 1]);
      b.classList.toggle('hover', hover && c <= hc && r <= hr);
    }
    gridLabel.textContent = hover ? labelGrid(hc, hr) : currentLabel();
  }

  // Per-row column steppers, for layouts like 2 on top and 1 below.
  const rowEditor = $('#row-editor');
  function paintRowEditor() {
    rowEditor.textContent = '';
    S.rows.forEach((n, r) => {
      const line = document.createElement('div');
      line.className = 'row-line';
      const name = document.createElement('span');
      name.textContent = `Linha ${r + 1}`;
      const step = (delta, label, text) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = text;
        b.setAttribute('aria-label', `${label} na linha ${r + 1}`);
        b.disabled = n + delta < 1 || n + delta > MAX;
        b.addEventListener('click', () => setRows(S.rows.map((v, j) => (j === r ? v + delta : v))));
        return b;
      };
      const val = document.createElement('output');
      val.textContent = plural(n, 'coluna', 'colunas');
      line.append(name, step(-1, 'Menos uma coluna', '−'), val, step(1, 'Mais uma coluna', '+'));
      rowEditor.appendChild(line);
    });
  }

  function chips(container, items, key, onPick) {
    container.textContent = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.label;
      b.setAttribute('aria-pressed', String(S[key] === it.id));
      b.addEventListener('click', () => {
        S[key] = it.id;
        save();
        for (const x of container.children) x.setAttribute('aria-pressed', String(x === b));
        onPick();
      });
      container.appendChild(b);
    }
  }

  function swatches(container, colors, key, names) {
    colors.forEach((col, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.background = col;
      b.title = names[n];
      b.setAttribute('aria-label', names[n]);
      b.setAttribute('aria-pressed', String(S[key] === col));
      b.addEventListener('click', () => {
        S[key] = col;
        save();
        for (const x of container.children) x.setAttribute('aria-pressed', String(x === b));
        layout();
      });
      container.appendChild(b);
    });
  }

  chips($('#ratio'), RATIOS, 'ratio', layout);
  swatches($('#bg'), BGS, 'bg', ['Fundo preto', 'Fundo branco']);
  swatches($('#color'), COLORS, 'color', ['Legenda branca', 'Legenda amarela']);

  function bindInput(id, key, num = false) {
    const input = $(id);
    input.value = S[key];
    input.addEventListener('input', () => {
      S[key] = num ? Number(input.value) : input.value;
      save();
      layout();
    });
  }
  bindInput('#gap', 'gap', true);
  bindInput('#size', 'size', true);
  bindInput('#font', 'font');
  bindInput('#weight', 'weight');
  bindInput('#width', 'width');

  const italic = $('#italic');
  italic.setAttribute('aria-pressed', String(S.italic));
  italic.addEventListener('click', () => {
    S.italic = !S.italic;
    italic.setAttribute('aria-pressed', String(S.italic));
    save();
    layout();
  });

  $('#reset').addEventListener('click', () => {
    if (!confirm('Remover todas as imagens e legendas?')) return;
    cells.forEach((c, i) => { cells[i] = newCell(); });
    buildStage();
  });

  // Re-layout once the web fonts arrive so the preview metrics are right.
  if (document.fonts) document.fonts.ready.then(layout);
  new ResizeObserver(() => { if (!resizing) layout(); }).observe(wrap);

  // ---------- Export ----------

  function wrapLines(ctx, text, maxW) {
    const out = [];
    for (const para of text.split('\n')) {
      const words = para.split(/(\s+)/);
      let line = '';
      for (const w of words) {
        const test = line + w;
        if (line.trim() && ctx.measureText(test.trimEnd()).width > maxW) {
          out.push(line.trimEnd());
          line = w.trimStart();
        } else {
          line = test;
        }
      }
      out.push(line.trimEnd());
    }
    return out;
  }

  async function render() {
    const d = dims();
    if (document.fonts) {
      try { await document.fonts.load(fontCss(40), cells.map((c) => c.caption).join(' ') || 'a'); } catch { /* fall back */ }
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(d.W);
    canvas.height = Math.round(d.H);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const i of visible()) {
      const cell = cells[i];
      const { x, y, w: cw, h: ch } = d.rects[i];
      const fs = (S.size / 100) * capBase(d.rects[i]);
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.clip();
      ctx.fillStyle = '#161618';
      ctx.fillRect(0, 0, cw, ch);
      if (cell.img) {
        const r = imgRect(cell, cw, ch);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(cell.img, r.x, r.y, r.w, r.h);
      }
      const text = cell.caption.trim();
      if (text) {
        ctx.font = fontCss(fs);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = wrapLines(ctx, text, cw * CAP_WIDTH);
        const lh = fs * LINE;
        const bottom = ch - CAP_BOTTOM * ch;
        const shadows = [
          { blur: fs * 0.35, dy: 0, color: 'rgba(0,0,0,0.6)' },
          { blur: fs * 0.12, dy: fs * 0.04, color: 'rgba(0,0,0,0.95)' },
        ];
        lines.forEach((line, n) => {
          const ly = bottom - (lines.length - n - 0.5) * lh;
          for (const s of shadows) {
            ctx.shadowColor = s.color;
            ctx.shadowBlur = s.blur;
            ctx.shadowOffsetY = s.dy;
            ctx.fillStyle = S.color;
            ctx.fillText(line, cw / 2, ly);
          }
        });
      }
      ctx.restore();
    }
    return canvas;
  }

  const toBlob = (canvas) => new Promise((res) => canvas.toBlob(res, 'image/png'));

  $('#download').addEventListener('click', async () => {
    const blob = await toBlob(await render());
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `snippets-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  $('#copy').addEventListener('click', async () => {
    if (!navigator.clipboard || !window.ClipboardItem) {
      toast('Seu navegador não permite copiar imagens. Use "Baixar PNG".');
      return;
    }
    try {
      const blob = render().then(toBlob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Imagem copiada!');
    } catch {
      toast('Não consegui copiar. Use "Baixar PNG".');
    }
  });

  // ---------- Toast ----------

  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  // ---------- Search ----------

  const results = $('#results');
  const keyBox = $('#tmdb-key');
  const keyChange = $('#key-change');
  const q = $('#q');
  let source = 'tmdb';
  let lastList = null;

  const getKey = () => store.get(KEY_STORE) || '';

  function showMsg(text) {
    results.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'msg';
    p.textContent = text;
    results.appendChild(p);
  }

  function refreshSource() {
    const needsKey = source === 'tmdb' && !getKey();
    keyBox.hidden = !needsKey;
    keyChange.hidden = !(source === 'tmdb' && getKey());
    q.placeholder = source === 'tmdb' ? 'Ex.: Breaking Bad' : 'Ex.: Charlie Chaplin';
    showMsg(source === 'tmdb'
      ? 'Busque um filme ou série e escolha uma cena.'
      : 'Imagens livres do Wikimedia Commons.');
  }

  for (const tab of document.querySelectorAll('.tabs button')) {
    tab.addEventListener('click', () => {
      source = tab.dataset.src;
      for (const t of document.querySelectorAll('.tabs button')) t.setAttribute('aria-selected', String(t === tab));
      lastList = null;
      refreshSource();
    });
  }

  $('#key-save').addEventListener('click', () => {
    const v = $('#key-input').value.trim();
    if (!v) return;
    store.set(KEY_STORE, v);
    $('#key-input').value = '';
    refreshSource();
    if (q.value.trim()) runSearch();
  });
  keyChange.addEventListener('click', () => {
    store.del(KEY_STORE);
    refreshSource();
  });

  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch();
  });

  async function runSearch() {
    const term = q.value.trim();
    if (!term) return;
    if (source === 'tmdb' && !getKey()) { refreshSource(); return; }
    showMsg('Buscando…');
    try {
      if (source === 'tmdb') await tmdbSearch(term);
      else await wikiSearch(term);
    } catch (err) {
      showMsg(err.message || 'Algo deu errado na busca.');
    }
  }

  async function tmdb(path, params = {}) {
    const key = getKey();
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    for (const [k2, v] of Object.entries(params)) url.searchParams.set(k2, v);
    const headers = {};
    if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
    else url.searchParams.set('api_key', key);
    const res = await fetch(url, { headers });
    if (res.status === 401) throw new Error('Chave do TMDB inválida. Clique em "Trocar chave do TMDB".');
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar no TMDB.`);
    return res.json();
  }

  const TMDB_IMG = 'https://image.tmdb.org/t/p/';

  async function tmdbSearch(term) {
    const data = await tmdb('/search/multi', { query: term, language: 'pt-BR', include_adult: 'false' });
    const items = data.results.filter((r) => r.media_type === 'movie' || r.media_type === 'tv');
    lastList = items;
    renderTitles(items);
  }

  function renderTitles(items) {
    if (!items.length) { showMsg('Nada encontrado.'); return; }
    results.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'title-row';
      const title = it.title || it.name;
      const year = (it.release_date || it.first_air_date || '').slice(0, 4);
      const kind = it.media_type === 'tv' ? 'Série' : 'Filme';
      const poster = it.poster_path
        ? Object.assign(document.createElement('img'), { src: `${TMDB_IMG}w92${it.poster_path}`, alt: '', loading: 'lazy' })
        : Object.assign(document.createElement('span'), { className: 'noposter' });
      const info = document.createElement('span');
      const bt = document.createElement('b');
      bt.textContent = title;
      const sm = document.createElement('small');
      sm.textContent = [kind, year].filter(Boolean).join(' · ');
      info.append(bt, sm);
      b.append(poster, info);
      b.addEventListener('click', () => tmdbImages(it).catch((err) => showMsg(err.message)));
      results.appendChild(b);
    }
  }

  async function tmdbImages(it) {
    showMsg('Carregando cenas…');
    const data = await tmdb(`/${it.media_type}/${it.id}/images`, { include_image_language: 'null,pt,en' });
    // Backdrops without text (language null) make the best stills.
    const shots = [...data.backdrops].sort((a, b) =>
      (a.iso_639_1 === null ? 0 : 1) - (b.iso_639_1 === null ? 0 : 1) || b.vote_average - a.vote_average);
    results.innerHTML = '';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn ghost back';
    back.textContent = `← ${it.title || it.name}`;
    back.addEventListener('click', () => renderTitles(lastList || []));
    results.appendChild(back);
    if (!shots.length) {
      const p = document.createElement('p');
      p.className = 'msg';
      p.textContent = 'Esse título não tem cenas no TMDB.';
      results.appendChild(p);
      return;
    }
    renderThumbs(shots.map((s) => ({ thumb: `${TMDB_IMG}w300${s.file_path}`, full: `${TMDB_IMG}w1280${s.file_path}` })), true);
  }

  async function wikiSearch(term) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    Object.entries({
      action: 'query', format: 'json', origin: '*', generator: 'search',
      gsrsearch: `${term} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '40',
      prop: 'imageinfo', iiprop: 'url|size|mime', iiurlwidth: '330',
    }).forEach(([k2, v]) => url.searchParams.set(k2, v));
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao buscar no Wikimedia.');
    const data = await res.json();
    const pages = Object.values((data.query && data.query.pages) || {}).sort((a, b) => a.index - b.index);
    const items = pages
      .map((p) => p.imageinfo && p.imageinfo[0])
      .filter((ii) => ii && ii.thumburl && /jpeg|png|webp|gif/.test(ii.mime))
      .map((ii) => ({
        thumb: ii.thumburl,
        full: ii.width > 1600 ? ii.thumburl.replace('330px-', '1280px-') : ii.url,
      }));
    if (!items.length) { showMsg('Nada encontrado.'); return; }
    results.innerHTML = '';
    renderThumbs(items, false);
  }

  function renderThumbs(items, append) {
    const grid = document.createElement('div');
    grid.className = 'thumbs';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.draggable = true;
      b.title = 'Clique para usar no quadro selecionado ou arraste para um quadro';
      const img = document.createElement('img');
      img.src = it.thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      b.appendChild(img);
      b.addEventListener('click', async () => {
        const i = sel;
        await putUrl(i, it.full);
        const n = nextEmpty(i, true);
        if (n >= 0) select(n);
      });
      b.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/x-snippets', it.full);
        e.dataTransfer.setData('text/uri-list', it.full);
        e.dataTransfer.effectAllowed = 'copy';
      });
      grid.appendChild(b);
    }
    if (!append) results.innerHTML = '';
    results.appendChild(grid);
  }

  // ---------- Boot ----------

  paintPicker();
  paintRowEditor();
  buildStage();
  refreshSource();
})();
