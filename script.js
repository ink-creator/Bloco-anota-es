const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const canvas = document.getElementById('canvas');
const svg = document.getElementById('links');
const SVG_NS = 'http://www.w3.org/2000/svg';

const LEGACY_KEY = 'notas-flutuantes';
const BOARDS_KEY = 'notas-flutuantes:boards';
const CURRENT_BOARD_KEY = 'notas-flutuantes:current-board';

const NOTE_COLORS = [
  { // amarelo
    light: { bg: '#fff8c4', border: '#e0ce6a', handle: '#ffe874' },
    dark:  { bg: '#4a4420', border: '#6b6030', handle: '#5c5428' }
  },
  { // rosa
    light: { bg: '#ffe1ef', border: '#e6a8c4', handle: '#ffc4dd' },
    dark:  { bg: '#4a2e3a', border: '#6b4256', handle: '#5c3548' }
  },
  { // azul
    light: { bg: '#dbeeff', border: '#a8c9e6', handle: '#c0e0ff' },
    dark:  { bg: '#22384a', border: '#345870', handle: '#2a4a63' }
  },
  { // verde
    light: { bg: '#e0f5d8', border: '#a8cf8e', handle: '#c8ebb0' },
    dark:  { bg: '#2c3f24', border: '#456b34', handle: '#375430' }
  },
  { // roxo
    light: { bg: '#ecdcff', border: '#c3a3e6', handle: '#ddc0ff' },
    dark:  { bg: '#3a2c4a', border: '#5a4270', handle: '#4a3563' }
  },
  { // laranja
    light: { bg: '#ffe6cc', border: '#e6b380', handle: '#ffd4a3' },
    dark:  { bg: '#4a3420', border: '#6b5030', handle: '#5c4228' }
  }
];

let linkMode = false;
let linkPick = null;
let activeNoteId = null;

let topZ = 10;

let panX = 0;
let panY = 0;
let zoom = 1;

let searchCycleIndex = -1;

let calView = new Date();
calView.setDate(1);

/* ===== QUADROS (BOARDS) ===== */

function boardDataKey(id) {
  return `notas-flutuantes:board:${id}`;
}

function loadBoardsList() {
  try {
    const raw = localStorage.getItem(BOARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return null;
}

function saveBoardsList() {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

function readLegacyData() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.notes)) return null;

    return {
      notes: parsed.notes,
      links: Array.isArray(parsed.links) ? parsed.links : [],
      nextId: typeof parsed.nextId === 'number' ? parsed.nextId : parsed.notes.length + 1
    };
  } catch {
    return null;
  }
}

function loadBoardData(id) {
  try {
    const raw = localStorage.getItem(boardDataKey(id));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        links: Array.isArray(parsed.links) ? parsed.links : [],
        nextId: typeof parsed.nextId === 'number' ? parsed.nextId : 1
      };
    }
  } catch {}

  return { notes: [], links: [], nextId: 1 };
}

let boards = loadBoardsList();

if (!boards) {
  // Primeira vez com o sistema de quadros: migra dados antigos (quadro único) se existirem
  boards = [{ id: 'default', name: 'Quadro 1' }];

  const legacy = readLegacyData();
  localStorage.setItem(
    boardDataKey('default'),
    JSON.stringify(legacy || { notes: [], links: [], nextId: 1 })
  );

  saveBoardsList();
}

let currentBoardId = localStorage.getItem(CURRENT_BOARD_KEY) || boards[0].id;

if (!boards.find(b => b.id === currentBoardId)) {
  currentBoardId = boards[0].id;
}

let state = loadBoardData(currentBoardId);

function switchBoard(id) {
  currentBoardId = id;
  localStorage.setItem(CURRENT_BOARD_KEY, id);

  state = loadBoardData(id);
  activeNoteId = null;
  linkPick = null;
  linkMode = false;
  linkBtn.classList.remove('active');

  undoStack = [];
  redoStack = [];

  resetView();
  renderBoardSelect();
  render();
}

function renderBoardSelect() {
  const sel = document.getElementById('boardSelect');
  sel.innerHTML = '';

  boards.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    if (b.id === currentBoardId) opt.selected = true;
    sel.appendChild(opt);
  });
}

document.getElementById('boardSelect').addEventListener('change', e => {
  switchBoard(e.target.value);
});

document.getElementById('addBoard').addEventListener('click', () => {
  const name = prompt('Nome do novo quadro:', `Quadro ${boards.length + 1}`);
  if (!name) return;

  const id = 'b' + Date.now();
  boards.push({ id, name: name.trim() || `Quadro ${boards.length + 1}` });

  saveBoardsList();
  localStorage.setItem(boardDataKey(id), JSON.stringify({ notes: [], links: [], nextId: 1 }));

  switchBoard(id);
});

document.getElementById('renameBoard').addEventListener('click', () => {
  const board = boards.find(b => b.id === currentBoardId);
  if (!board) return;

  const name = prompt('Renomear quadro:', board.name);
  if (!name || !name.trim()) return;

  board.name = name.trim();
  saveBoardsList();
  renderBoardSelect();
});

document.getElementById('deleteBoard').addEventListener('click', () => {
  if (boards.length <= 1) {
    alert('Não é possível apagar o último quadro.');
    return;
  }

  const board = boards.find(b => b.id === currentBoardId);
  if (!board) return;

  if (!confirm(`Apagar o quadro "${board.name}" e todas as suas notas?`)) return;

  localStorage.removeItem(boardDataKey(currentBoardId));
  boards = boards.filter(b => b.id !== currentBoardId);
  saveBoardsList();

  switchBoard(boards[0].id);
});

/* ===== SALVAR ===== */

let saveIndicatorTimeout = null;

function save() {
  try {
    localStorage.setItem(boardDataKey(currentBoardId), JSON.stringify(state));
    flashSaveIndicator(true);
  } catch (err) {
    console.error('Falha ao salvar notas:', err);
    flashSaveIndicator(false);
  }
}

function flashSaveIndicator(ok) {
  const el = document.getElementById('saveIndicator');
  if (!el) return;

  el.textContent = ok ? '💾 Salvo' : '⚠ Erro ao salvar';
  el.classList.add('show');

  clearTimeout(saveIndicatorTimeout);
  saveIndicatorTimeout = setTimeout(() => el.classList.remove('show'), 1200);
}

/* ===== ZOOM & PAN ===== */

function applyTransform() {
  world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  document.getElementById('zoomLevel').textContent = Math.round(zoom * 100) + '%';
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function zoomAt(screenX, screenY, factor) {
  const worldXBefore = (screenX - panX) / zoom;
  const worldYBefore = (screenY - panY) / zoom;

  zoom = clamp(zoom * factor, 0.4, 2.5);

  panX = screenX - worldXBefore * zoom;
  panY = screenY - worldYBefore * zoom;

  applyTransform();
}

function zoomAtCenter(factor) {
  const rect = viewport.getBoundingClientRect();
  zoomAt(rect.width / 2, rect.height / 2, factor);
}

function resetView() {
  panX = 0;
  panY = 0;
  zoom = 1;
  applyTransform();
}

function screenToWorld(clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: (clientX - rect.left - panX) / zoom,
    y: (clientY - rect.top - panY) / zoom
  };
}

function centerOfView() {
  const rect = viewport.getBoundingClientRect();
  return {
    x: (rect.width / 2 - panX) / zoom,
    y: (rect.height / 2 - panY) / zoom
  };
}

viewport.addEventListener('wheel', e => {
  e.preventDefault();

  const rect = viewport.getBoundingClientRect();
  const factor = Math.exp(-e.deltaY * 0.001);

  zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
}, { passive: false });

document.getElementById('zoomIn').addEventListener('click', () => zoomAtCenter(1.2));
document.getElementById('zoomOut').addEventListener('click', () => zoomAtCenter(1 / 1.2));
document.getElementById('zoomReset').addEventListener('click', resetView);

/* Arrastar o fundo para navegar (pan) */

viewport.addEventListener('mousedown', e => {
  if (e.target !== canvas && e.target !== viewport) return;

  const startX = e.clientX;
  const startY = e.clientY;
  const origPanX = panX;
  const origPanY = panY;

  viewport.classList.add('panning');

  function move(ev) {
    panX = origPanX + (ev.clientX - startX);
    panY = origPanY + (ev.clientY - startY);
    applyTransform();
  }

  function up() {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    viewport.classList.remove('panning');
  }

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});

/* Duplo clique no fundo cria uma nota ali */

viewport.addEventListener('dblclick', e => {
  if (e.target !== canvas && e.target !== viewport) return;

  const p = screenToWorld(e.clientX, e.clientY);
  createNote(p.x - 110, p.y - 20);
});

function focusOnNote(note) {
  const rect = viewport.getBoundingClientRect();
  const el = canvas.querySelector(`.note[data-id="${note.id}"]`);

  const w = el ? el.offsetWidth : (note.width || 220);
  const h = el ? el.offsetHeight : (note.height || 160);

  const cx = note.x + w / 2;
  const cy = note.y + h / 2;

  panX = rect.width / 2 - cx * zoom;
  panY = rect.height / 2 - cy * zoom;

  applyTransform();
}

/* ===== RENDER ===== */

function render() {
  canvas.innerHTML = '';

  state.notes.forEach(renderNote);

  drawLinks();
  updateActiveHighlight();
  updateStats();
}

function updateStats() {
  const el = document.getElementById('stats');
  if (!el) return;

  el.textContent = `${state.notes.length} nota${state.notes.length === 1 ? '' : 's'} · ${state.links.length} ligaç${state.links.length === 1 ? 'ão' : 'ões'}`;
}

function setActiveNote(id) {
  activeNoteId = id;
  updateActiveHighlight();
}

function updateActiveHighlight() {
  document.querySelectorAll('.note').forEach(n => {
    n.classList.toggle('active', Number(n.dataset.id) === activeNoteId);
  });
}

function bringToFront(el) {
  topZ += 1;
  el.style.zIndex = topZ;
}

/* ===== NOTAS ===== */

function applyNoteColor(el, handle, colorIndex) {
  const isDark = document.body.classList.contains('dark');
  const entry = NOTE_COLORS[colorIndex] || NOTE_COLORS[0];
  const c = isDark ? entry.dark : entry.light;

  el.style.background = c.bg;
  el.style.borderColor = c.border;
  handle.style.background = c.handle;
  handle.style.borderBottomColor = c.border;

  const ta = el.querySelector('textarea');
  if (ta) ta.style.color = isDark ? '#eee' : '#3a2f00';

  el.querySelectorAll('.handle button:not(.del)').forEach(b => {
    b.style.color = isDark ? '#ddd' : '#5a4a00';
  });

  const delBtn = el.querySelector('.del');
  if (delBtn) delBtn.style.color = isDark ? '#ff9a9a' : '#844';
}

function renderNote(note) {
  const el = document.createElement('div');

  el.className = 'note';
  el.style.left = note.x + 'px';
  el.style.top = note.y + 'px';

  if (note.width) el.style.width = note.width + 'px';
  if (note.height) el.style.height = note.height + 'px';

  el.dataset.id = note.id;
  el.classList.toggle('pinned', !!note.pinned);

  el.innerHTML = `
    <div class="handle">
      <button class="pin-btn" title="Fixar nota">${note.pinned ? '📌' : '📍'}</button>
      <button class="color-btn" title="Cor da nota">🎨</button>
      <button class="cal-btn" title="Inserir data">📅</button>
      <button class="del" title="Apagar">✕</button>
    </div>

    <textarea placeholder="Escreva algo...">${escapeHtml(note.text)}</textarea>
  `;

  canvas.appendChild(el);

  const handle = el.querySelector('.handle');
  const ta = el.querySelector('textarea');
  const del = el.querySelector('.del');
  const calBtn = el.querySelector('.cal-btn');
  const pinBtn = el.querySelector('.pin-btn');
  const colorBtn = el.querySelector('.color-btn');

  applyNoteColor(el, handle, note.colorIndex || 0);

  /* ===== FOCO ===== */

  let editSnapshotTaken = false;

  ta.addEventListener('focus', () => {
    setActiveNote(note.id);
    bringToFront(el);
    editSnapshotTaken = false;
  });

  ta.addEventListener('input', () => {
    if (!editSnapshotTaken) {
      pushUndoSnapshot();
      editSnapshotTaken = true;
    }

    note.text = ta.value;
    save();
  });

  ta.addEventListener('blur', () => {
    editSnapshotTaken = false;
  });

  /* ===== APAGAR ===== */

  del.addEventListener('click', e => {
    e.stopPropagation();

    pushUndoSnapshot();

    state.notes = state.notes.filter(n => n.id !== note.id);
    state.links = state.links.filter(l => l.a !== note.id && l.b !== note.id);

    if (activeNoteId === note.id) activeNoteId = null;

    save();
    render();
  });

  /* ===== FIXAR ===== */

  pinBtn.addEventListener('click', e => {
    e.stopPropagation();

    pushUndoSnapshot();

    note.pinned = !note.pinned;

    el.classList.toggle('pinned', note.pinned);
    pinBtn.textContent = note.pinned ? '📌' : '📍';

    save();
  });

  /* ===== COR ===== */

  colorBtn.addEventListener('click', e => {
    e.stopPropagation();

    const existing = el.querySelector('.color-popup');
    if (existing) {
      existing.remove();
      return;
    }

    closeAllColorPopups();

    const popup = document.createElement('div');
    popup.className = 'color-popup';

    NOTE_COLORS.forEach((c, i) => {
      const sw = document.createElement('button');
      sw.className = 'color-swatch';
      sw.style.background = c.light.bg;
      sw.title = 'Cor ' + (i + 1);

      sw.addEventListener('click', ev => {
        ev.stopPropagation();

        pushUndoSnapshot();

        note.colorIndex = i;
        applyNoteColor(el, handle, i);
        popup.remove();
        save();
      });

      popup.appendChild(sw);
    });

    handle.appendChild(popup);
  });

  /* ===== CALENDÁRIO ===== */

  calBtn.addEventListener('click', e => {
    e.stopPropagation();

    setActiveNote(note.id);
    ta.focus();
    openCalendar();
  });

  /* ===== REDIMENSIONAR ===== */

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      note.width = Math.round(el.offsetWidth);
      note.height = Math.round(el.offsetHeight);
      drawLinks();
    });

    ro.observe(el);
  }

  // A alça nativa de redimensionar fica no canto inferior direito, numa
  // área que não pertence à textarea nem à handle (mousedown cai direto
  // no elemento da nota). O ResizeObserver acima é assíncrono e atrasa a
  // ligação em relação ao arraste — por isso ela "não tocava" na nota ao
  // crescer. Isto força o recálculo a cada movimento, igual ao arraste.
  el.addEventListener('mousedown', e => {
    if (e.target !== el) return;

    pushUndoSnapshot();
    bringToFront(el);
    setActiveNote(note.id);

    function move() {
      drawLinks();
    }

    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);

      note.width = Math.round(el.offsetWidth);
      note.height = Math.round(el.offsetHeight);
      save();
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  /* ===== ARRASTAR ===== */

  handle.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    if (note.pinned) return;

    pushUndoSnapshot();

    bringToFront(el);
    setActiveNote(note.id);

    const startX = e.clientX;
    const startY = e.clientY;

    const origX = note.x;
    const origY = note.y;

    function move(ev) {
      note.x = origX + (ev.clientX - startX) / zoom;
      note.y = origY + (ev.clientY - startY) / zoom;

      el.style.left = note.x + 'px';
      el.style.top = note.y + 'px';

      drawLinks();
    }

    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      save();
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  /* ===== LIGAR NOTAS ===== */

  el.addEventListener('click', e => {
    if (!linkMode) return;

    if (e.target.tagName === 'TEXTAREA') return;
    if (e.target.tagName === 'BUTTON') return;

    if (linkPick == null) {
      linkPick = note.id;
      el.classList.add('selected');
    } else if (linkPick === note.id) {
      linkPick = null;
      el.classList.remove('selected');
    } else {
      const exists = state.links.some(
        l => (l.a === linkPick && l.b === note.id) || (l.a === note.id && l.b === linkPick)
      );

      pushUndoSnapshot();

      if (!exists) {
        state.links.push({ a: linkPick, b: note.id, label: '' });
      } else {
        state.links = state.links.filter(
          l => !((l.a === linkPick && l.b === note.id) || (l.a === note.id && l.b === linkPick))
        );
      }

      document.querySelectorAll('.note.selected').forEach(n => n.classList.remove('selected'));
      linkPick = null;

      save();
      drawLinks();
      updateStats();
    }
  });
}

function closeAllColorPopups() {
  document.querySelectorAll('.color-popup').forEach(p => p.remove());
}

/* ===== LINHAS ===== */

function center(note) {
  const el = canvas.querySelector(`.note[data-id="${note.id}"]`);

  if (el) {
    return { x: note.x + el.offsetWidth / 2, y: note.y + el.offsetHeight / 2 };
  }

  return { x: note.x + 110, y: note.y + 70 };
}

function promptLinkLabel(link) {
  const value = prompt('Rótulo da ligação:', link.label || '');
  if (value === null) return;

  const trimmed = value.trim();
  if (trimmed === (link.label || '')) return;

  pushUndoSnapshot();

  link.label = trimmed;
  save();
  drawLinks();
}

function drawLinks() {
  svg.innerHTML = '';

  state.links.forEach(link => {
    const a = state.notes.find(n => n.id === link.a);
    const b = state.notes.find(n => n.id === link.b);

    if (!a || !b) return;

    const ca = center(a);
    const cb = center(b);

    const line = document.createElementNS(SVG_NS, 'line');

    line.setAttribute('x1', ca.x);
    line.setAttribute('y1', ca.y);
    line.setAttribute('x2', cb.x);
    line.setAttribute('y2', cb.y);
    line.style.pointerEvents = 'stroke';
    line.style.cursor = 'pointer';

    line.addEventListener('click', e => {
      e.stopPropagation();
      promptLinkLabel(link);
    });

    svg.appendChild(line);

    if (link.label) {
      const mx = (ca.x + cb.x) / 2;
      const my = (ca.y + cb.y) / 2;

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', mx);
      text.setAttribute('y', my);
      text.setAttribute('class', 'link-label');
      text.style.pointerEvents = 'all';
      text.style.cursor = 'pointer';
      text.textContent = link.label;

      text.addEventListener('click', e => {
        e.stopPropagation();
        promptLinkLabel(link);
      });

      svg.appendChild(text);
    }
  });
}

/* ===== HTML SAFE ===== */

function escapeHtml(s) {
  return (s || '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/* ===== NOVA NOTA ===== */

function createNote(x, y) {
  pushUndoSnapshot();

  let pos;

  if (x != null && y != null) {
    pos = { x, y };
  } else {
    const c = centerOfView();
    pos = { x: c.x - 110 + (Math.random() * 60 - 30), y: c.y - 70 + (Math.random() * 60 - 30) };
  }

  const note = {
    id: state.nextId++,
    x: pos.x,
    y: pos.y,
    text: '',
    colorIndex: 0,
    pinned: false
  };

  state.notes.push(note);
  setActiveNote(note.id);

  save();
  render();

  return note;
}

document.getElementById('addNote').addEventListener('click', () => createNote());

/* ===== COPIAR / COLAR ===== */

let clipboardNote = null;

function copyActiveNote() {
  const note = state.notes.find(n => n.id === activeNoteId);
  if (!note) return;

  clipboardNote = {
    text: note.text,
    colorIndex: note.colorIndex,
    width: note.width,
    height: note.height,
    x: note.x,
    y: note.y
  };
}

function pasteNote() {
  if (!clipboardNote) return;

  pushUndoSnapshot();

  const x = clipboardNote.x + 24;
  const y = clipboardNote.y + 24;

  const note = {
    id: state.nextId++,
    x, y,
    text: clipboardNote.text,
    colorIndex: clipboardNote.colorIndex,
    pinned: false
  };

  if (clipboardNote.width) note.width = clipboardNote.width;
  if (clipboardNote.height) note.height = clipboardNote.height;

  state.notes.push(note);
  setActiveNote(note.id);

  // encadeia o deslocamento: colar de novo empilha a partir da última cópia
  clipboardNote.x = x;
  clipboardNote.y = y;

  save();
  render();
}

/* ===== MODO LIGAÇÃO ===== */

const linkBtn = document.getElementById('linkMode');

linkBtn.addEventListener('click', () => {
  linkMode = !linkMode;
  linkPick = null;

  linkBtn.classList.toggle('active', linkMode);

  document.querySelectorAll('.note.selected').forEach(n => n.classList.remove('selected'));
});

/* ===== LIMPAR ===== */

document.getElementById('clearAll').addEventListener('click', () => {
  if (!confirm('Apagar todas as notas deste quadro?')) return;

  pushUndoSnapshot();

  state = { notes: [], links: [], nextId: 1 };
  activeNoteId = null;

  save();
  render();
});

window.addEventListener('resize', drawLinks);

/* ===== BUSCA ===== */

const searchInput = document.getElementById('searchInput');

function getSearchMatches() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return [];

  return state.notes.filter(n => (n.text || '').toLowerCase().includes(q));
}

searchInput.addEventListener('input', () => {
  searchCycleIndex = -1;

  const q = searchInput.value.trim().toLowerCase();

  document.querySelectorAll('.note').forEach(el => {
    const id = Number(el.dataset.id);
    const note = state.notes.find(n => n.id === id);
    const match = q && note && (note.text || '').toLowerCase().includes(q);
    el.classList.toggle('search-match', !!match);
  });
});

searchInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;

  const matches = getSearchMatches();
  if (!matches.length) return;

  searchCycleIndex = (searchCycleIndex + 1) % matches.length;

  const note = matches[searchCycleIndex];
  setActiveNote(note.id);
  focusOnNote(note);
});

/* ===== EXPORTAR / IMPORTAR ===== */

document.getElementById('exportNotes').addEventListener('click', () => {
  const board = boards.find(b => b.id === currentBoardId);

  const payload = {
    board: board ? board.name : 'Quadro',
    ...state
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = (board ? board.name : 'quadro').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  a.href = url;
  a.download = `notas-${safeName}-${stamp}.json`;
  a.click();

  URL.revokeObjectURL(url);
});

const importInput = document.getElementById('importInput');

document.getElementById('importNotes').addEventListener('click', () => importInput.click());

importInput.addEventListener('change', () => {
  const file = importInput.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);

      if (!parsed || !Array.isArray(parsed.notes)) {
        throw new Error('Formato inválido');
      }

      const proceed = state.notes.length === 0 ||
        confirm('Importar vai substituir as notas do quadro atual. Continuar?');

      if (!proceed) return;

      pushUndoSnapshot();

      state = {
        notes: parsed.notes,
        links: Array.isArray(parsed.links) ? parsed.links : [],
        nextId: typeof parsed.nextId === 'number'
          ? parsed.nextId
          : parsed.notes.reduce((m, n) => Math.max(m, n.id), 0) + 1
      };

      activeNoteId = null;

      save();
      render();
    } catch (err) {
      alert('Não foi possível importar esse arquivo: ' + err.message);
    } finally {
      importInput.value = '';
    }
  };

  reader.readAsText(file);
});

/* ===== DESFAZER / REFAZER ===== */

let undoStack = [];
let redoStack = [];
const UNDO_LIMIT = 50;

function pushUndoSnapshot() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;

  redoStack.push(JSON.stringify(state));
  state = JSON.parse(undoStack.pop());

  // evita referência a nota que deixou de existir após o desfazer
  activeNoteId = null;
  linkPick = null;

  save();
  render();
}

function redo() {
  if (!redoStack.length) return;

  undoStack.push(JSON.stringify(state));
  state = JSON.parse(redoStack.pop());

  activeNoteId = null;
  linkPick = null;

  save();
  render();
}

/* ===== ATALHOS DE TECLADO ===== */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.activeElement === searchInput) searchInput.blur();

    if (linkPick != null) {
      linkPick = null;
      document.querySelectorAll('.note.selected').forEach(n => n.classList.remove('selected'));
    }

    if (linkMode) {
      linkMode = false;
      linkBtn.classList.remove('active');
    }

    closeAllColorPopups();
    closeCalendar();
    return;
  }

  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;

  const tag = document.activeElement && document.activeElement.tagName;
  const inField = tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT';
  if (inField) return; // deixa o navegador cuidar de copiar/colar/desfazer texto normalmente

  const key = e.key.toLowerCase();

  if (key === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  } else if (key === 'y') {
    e.preventDefault();
    redo();
  } else if (key === 'c') {
    e.preventDefault();
    copyActiveNote();
  } else if (key === 'v') {
    e.preventDefault();
    pasteNote();
  }
});

/* Fecha popups de cor ao clicar fora */

document.addEventListener('mousedown', e => {
  if (e.target.closest('.color-popup') || e.target.closest('.color-btn')) return;
  closeAllColorPopups();
});

/* ===== CALENDÁRIO ===== */

const calEl = document.getElementById('calendar');
const calTitle = document.getElementById('calTitle');
const calGrid = document.getElementById('calGrid');
const calToggle = document.getElementById('toggleCal');

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function openCalendar() {
  calEl.classList.remove('hidden');
  calToggle.classList.add('active');
  renderCalendar();
}

function closeCalendar() {
  calEl.classList.add('hidden');
  calToggle.classList.remove('active');
}

function toggleCalendar() {
  calEl.classList.contains('hidden') ? openCalendar() : closeCalendar();
}

calToggle.addEventListener('click', toggleCalendar);

document.addEventListener('mousedown', e => {
  if (calEl.classList.contains('hidden')) return;
  if (calEl.contains(e.target)) return;
  if (e.target === calToggle) return;

  closeCalendar();
});

document.getElementById('calPrev').addEventListener('click', () => {
  calView.setMonth(calView.getMonth() - 1);
  renderCalendar();
});

document.getElementById('calNext').addEventListener('click', () => {
  calView.setMonth(calView.getMonth() + 1);
  renderCalendar();
});

function renderCalendar() {
  const year = calView.getFullYear();
  const month = calView.getMonth();

  calTitle.textContent = `${MESES[month]} ${year}`;

  calGrid.innerHTML = '';

  DOW.forEach(d => {
    const c = document.createElement('div');
    c.className = 'dow';
    c.textContent = d;
    calGrid.appendChild(c);
  });

  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < first; i++) {
    const c = document.createElement('div');
    c.className = 'day empty';
    calGrid.appendChild(c);
  }

  const today = new Date();

  for (let d = 1; d <= daysInMonth; d++) {
    const c = document.createElement('div');
    c.className = 'day';

    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      c.classList.add('today');
    }

    c.textContent = d;

    c.addEventListener('click', () => insertDateIntoActiveNote(year, month, d));

    calGrid.appendChild(c);
  }
}

function insertDateIntoActiveNote(y, m, d) {
  let note = state.notes.find(n => n.id === activeNoteId);

  if (!note) {
    const c = centerOfView();
    note = createNote(c.x - 110, c.y - 70);
  }

  const dateStr = `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;

  const el = document.querySelector(`.note[data-id="${note.id}"] textarea`);

  if (el) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    const before = el.value.slice(0, start);
    const after = el.value.slice(end);

    const insert =
      (before && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : '') + `📅 ${dateStr} `;

    el.value = before + insert + after;
    note.text = el.value;

    el.focus();

    const pos = (before + insert).length;
    el.setSelectionRange(pos, pos);

    save();
  }
}

/* ===== MODO ESCURO ===== */

const darkBtn = document.getElementById('darkMode');

if (localStorage.getItem('dark-mode') === 'true') {
  document.body.classList.add('dark');
}

darkBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('dark-mode', document.body.classList.contains('dark'));

  // Reaplica as cores de cada nota na variante certa (clara/escura)
  document.querySelectorAll('.note').forEach(el => {
    const id = Number(el.dataset.id);
    const note = state.notes.find(n => n.id === id);
    const handle = el.querySelector('.handle');

    if (note && handle) applyNoteColor(el, handle, note.colorIndex || 0);
  });
});

/* ===== START ===== */

renderBoardSelect();
applyTransform();
render();