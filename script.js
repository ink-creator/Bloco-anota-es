const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const canvas = document.getElementById('canvas');
const svg = document.getElementById('links');
const SVG_NS = 'http://www.w3.org/2000/svg';

const LEGACY_KEY = 'notas-flutuantes';
const BOARDS_KEY = 'notas-flutuantes:boards';
const CURRENT_BOARD_KEY = 'notas-flutuantes:current-board';

const NOTE_COLORS = [
  { name: 'Amarelo',
    light: { bg: '#fff8c4', border: '#e0ce6a', handle: '#ffe874', swatch: '#f0c800' },
    dark:  { bg: '#3a3210', border: '#5e5428', handle: '#4a4018', swatch: '#c8a800' }
  },
  { name: 'Laranja',
    light: { bg: '#ffe6cc', border: '#e6a850', handle: '#ffd4a0', swatch: '#f08020' },
    dark:  { bg: '#3a2610', border: '#6a4820', handle: '#4a3018', swatch: '#c06018' }
  },
  { name: 'Vermelho',
    light: { bg: '#ffd8d8', border: '#e08888', handle: '#ffb8b8', swatch: '#d84040' },
    dark:  { bg: '#3a1010', border: '#6a2828', handle: '#4a1818', swatch: '#a02828' }
  },
  { name: 'Rosa claro',
    light: { bg: '#ffe1ef', border: '#e8a0c0', handle: '#ffc4de', swatch: '#f070a8' },
    dark:  { bg: '#3a1828', border: '#6a3050', handle: '#4a2038', swatch: '#b04878' }
  },
  { name: 'Rosa escuro',
    light: { bg: '#ffc8dc', border: '#e06090', handle: '#ffaac8', swatch: '#d83878' },
    dark:  { bg: '#3e1030', border: '#701848', handle: '#501838', swatch: '#a02860' }
  },
  { name: 'Roxo',
    light: { bg: '#ecdcff', border: '#b890e0', handle: '#ddc0ff', swatch: '#9050d0' },
    dark:  { bg: '#281840', border: '#502878', handle: '#382058', swatch: '#6830a8' }
  },
  { name: 'Azul',
    light: { bg: '#dbeeff', border: '#88bce8', handle: '#bcd8ff', swatch: '#3880d0' },
    dark:  { bg: '#101e38', border: '#203860', handle: '#182848', swatch: '#2060a8' }
  },
  { name: 'Ciano',
    light: { bg: '#d4f4f8', border: '#60c0cc', handle: '#a8e4ec', swatch: '#18a0b0' },
    dark:  { bg: '#082830', border: '#105060', handle: '#103840', swatch: '#108090' }
  },
  { name: 'Verde claro',
    light: { bg: '#dcf5d0', border: '#80c860', handle: '#c0ecac', swatch: '#48a828' },
    dark:  { bg: '#102010', border: '#205818', handle: '#183018', swatch: '#307818' }
  },
  { name: 'Verde escuro',
    light: { bg: '#c4e8b4', border: '#50a830', handle: '#a0d880', swatch: '#288818' },
    dark:  { bg: '#081808', border: '#184010', handle: '#102010', swatch: '#186010' }
  },
  { name: 'Marrom',
    light: { bg: '#f0e0c8', border: '#c09060', handle: '#e0c8a0', swatch: '#a06030' },
    dark:  { bg: '#281808', border: '#503020', handle: '#382010', swatch: '#784828' }
  },
  { name: 'Cinza',
    light: { bg: '#efefef', border: '#a8a8b8', handle: '#d8d8e4', swatch: '#7070a0' },
    dark:  { bg: '#1c1c28', border: '#404058', handle: '#282840', swatch: '#505080' }
  },
];

let linkMode = false;
let linkPick = null;
let moveMode = false;
let activeNoteId = null;

// Seleção múltipla
let selectedNoteIds = new Set();
let isMultiSelecting = false;

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
  setMoveMode(false);
  selectedNoteIds.clear();

  undoStack = [];
  redoStack = [];
  updateUndoRedoButtons();

  resetView();
  renderBoardSelect();
  render();
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
  // Allow natural scroll in textareas
  if (e.target.tagName === 'TEXTAREA') return;
  
  e.preventDefault();

  const rect = viewport.getBoundingClientRect();
  const factor = Math.exp(-e.deltaY * 0.001);

  zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
}, { passive: false });

document.getElementById('zoomIn').addEventListener('click', () => zoomAtCenter(1.2));
document.getElementById('zoomOut').addEventListener('click', () => zoomAtCenter(1 / 1.2));
document.getElementById('zoomReset').addEventListener('click', resetView);

/* Arrastar o fundo para navegar (pan) ou selecionar múltiplas notas (Shift) */

// Retângulo de seleção via arraste com Shift
const selectionRect = document.createElement('div');
selectionRect.id = 'selection-rect';
document.body.appendChild(selectionRect);

function updateMultiSelectHighlight() {
  document.querySelectorAll('.note').forEach(el => {
    const id = Number(el.dataset.id);
    el.classList.toggle('multi-selected', selectedNoteIds.has(id));
  });
}

viewport.addEventListener('mousedown', e => {
  if (e.target !== canvas && e.target !== viewport) return;

  // Shift + arraste = seleção por retângulo
  if (e.shiftKey) {
    e.preventDefault();
    const vRect = viewport.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    selectionRect.style.display = 'none';

    function moveSelect(ev) {
      moved = true;
      const x1 = Math.min(startX, ev.clientX);
      const y1 = Math.min(startY, ev.clientY);
      const x2 = Math.max(startX, ev.clientX);
      const y2 = Math.max(startY, ev.clientY);

      selectionRect.style.display = 'block';
      selectionRect.style.left   = x1 + 'px';
      selectionRect.style.top    = y1 + 'px';
      selectionRect.style.width  = (x2 - x1) + 'px';
      selectionRect.style.height = (y2 - y1) + 'px';

      // Converte coordenadas de tela para espaço do mundo
      const wx1 = (x1 - vRect.left - panX) / zoom;
      const wy1 = (y1 - vRect.top  - panY) / zoom;
      const wx2 = (x2 - vRect.left - panX) / zoom;
      const wy2 = (y2 - vRect.top  - panY) / zoom;

      selectedNoteIds.clear();
      state.notes.forEach(note => {
        const el = canvas.querySelector(`.note[data-id="${note.id}"]`);
        if (!el) return;
        const nw = el.offsetWidth, nh = el.offsetHeight;
        const inside = note.x < wx2 && note.x + nw > wx1 &&
                       note.y < wy2 && note.y + nh > wy1;
        if (inside) selectedNoteIds.add(note.id);
      });
      updateMultiSelectHighlight();
    }

    function upSelect() {
      document.removeEventListener('mousemove', moveSelect);
      document.removeEventListener('mouseup', upSelect);
      selectionRect.style.display = 'none';
      if (!moved) {
        selectedNoteIds.clear();
        updateMultiSelectHighlight();
      }
    }

    document.addEventListener('mousemove', moveSelect);
    document.addEventListener('mouseup', upSelect);
    return;
  }

  // Clique no fundo sem shift: limpa seleção múltipla
  if (selectedNoteIds.size > 0) {
    selectedNoteIds.clear();
    updateMultiSelectHighlight();
  }

  const startX = e.clientX;
  const startY = e.clientY;
  const origPanX = panX;
  const origPanY = panY;
  let moved = false;

  viewport.classList.add('panning');

  function move(ev) {
    moved = true;
    panX = origPanX + (ev.clientX - startX);
    panY = origPanY + (ev.clientY - startY);
    applyTransform();
  }

  function preventSelect(ev) {
    ev.preventDefault();
  }

  function up() {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    document.removeEventListener('selectstart', preventSelect);
    viewport.classList.remove('panning');
  }

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
  document.addEventListener('selectstart', preventSelect);
});

/* Duplo clique no fundo cria uma nota ali */

viewport.addEventListener('dblclick', e => {
  if (e.target !== canvas && e.target !== viewport) return;

  const p = screenToWorld(e.clientX, e.clientY);
  createNote(p.x - 110, p.y - 20);
});

/* ===== ARRASTAR ARQUIVOS E LINKS PARA O QUADRO ===== */

const MAX_TEXT_FILE_SIZE = 300 * 1024;  // 300KB
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB (localStorage tem espaço limitado)

function isUrl(str) {
  return /^https?:\/\/\S+$/i.test((str || '').trim());
}

// Detecta todas as URLs http/https num texto e retorna array de {url, start, end}
function extractUrls(text) {
  const results = [];
  const re = /https?:\/\/[^\s<>"')\]]+/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push({ url: m[0], start: m.index, end: m.index + m[0].length });
  }
  return results;
}

// Detecta links no formato [texto](url) e (url) simples
// Retorna array de {text, url, start, end, isLocal}
function extractMarkdownLinks(text) {
  const results = [];

  // [label](url) — label pode ser vazio
  const reMd = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = reMd.exec(text)) !== null) {
    const url = m[2].trim();
    const isLocal = !url.match(/^https?:\/\//i);
    const displayText = m[1].trim() || formatLinkLabel(url);
    results.push({ text: displayText, rawLabel: m[1], url, start: m.index, end: m.index + m[0].length, isLocal });
  }

  // (url) — http(s) ou local: file:// ou caminho Windows
  const reParen = /\(((?:https?:\/\/|file:\/\/|[A-Za-z]:\\)[^)\s]+)\)/g;
  while ((m = reParen.exec(text)) !== null) {
    const url = m[1].trim();
    const isLocal = !url.match(/^https?:\/\//i);
    const already = results.some(r => r.start <= m.index && r.end >= m.index + m[0].length);
    if (!already) {
      results.push({ text: formatLinkLabel(url), rawLabel: '', url, start: m.index, end: m.index + m[0].length, isLocal });
    }
  }

  return results;
}

// Formata um URL/caminho para exibição amigável no badge
function formatLinkLabel(url) {
  if (url.startsWith('file://')) {
    // Remove prefixo file:// e decodifica URI
    let path = decodeURIComponent(url.replace(/^file:\/\//, ''));
    // Normaliza barras
    path = path.replace(/\//g, '\\');
    // Se o caminho for longo, trunca mostrando início e fim
    const parts = path.split('\\').filter(Boolean);
    if (parts.length > 3) {
      return parts[0] + '\\...' + '\\' + parts.slice(-2).join('\\');
    }
    return path;
  }
  if (url.startsWith('http')) {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 20) + (u.pathname.length > 20 ? '…' : '') : '');
    } catch { return url.slice(0, 30); }
  }
  return url.length > 30 ? url.slice(0, 28) + '…' : url;
}

// Combina URLs soltas e links Markdown; retorna lista unificada ordenada por posição
function extractAllLinks(text) {
  const mdLinks = extractMarkdownLinks(text);
  // Índices ocupados por links Markdown (para não detectar URLs internas como soltas)
  const occupied = new Set();
  mdLinks.forEach(l => { for (let i = l.start; i < l.end; i++) occupied.add(i); });

  const bareUrls = extractUrls(text).filter(u => !occupied.has(u.start));

  const all = [
    ...mdLinks,
    ...bareUrls.map(u => ({ text: u.url, url: u.url, start: u.start, end: u.end, isLocal: false }))
  ];
  all.sort((a, b) => a.start - b.start);
  return all;
}

/* ===== VISUALIZADOR DE ARQUIVO ===== */

const fileViewerOverlay = document.getElementById('file-viewer-overlay');
const fileViewerBody   = document.getElementById('file-viewer-body');
const fileViewerTitle  = document.getElementById('file-viewer-title');

document.getElementById('file-viewer-close').addEventListener('click', closeFileViewer);

fileViewerOverlay.addEventListener('mousedown', e => {
  if (e.target === fileViewerOverlay) closeFileViewer();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !fileViewerOverlay.classList.contains('hidden')) {
    closeFileViewer();
    e.stopPropagation();
  }
}, true);

function closeFileViewer() {
  fileViewerOverlay.classList.add('hidden');
  // Limpa o corpo para libertar memória (revogar blob URLs, parar vídeos, etc.)
  fileViewerBody.innerHTML = '';
}

function getFileIcon(mime, name) {
  if (!mime) mime = '';
  if (!name) name = '';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime.startsWith('text/') || /\.(txt|md|log|csv|json)$/i.test(name)) return '📝';
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return '📦';
  return '📎';
}

function openFileViewer(dataUrl, fileName, mimeType, noteRef) {
  fileViewerTitle.textContent = fileName || 'Arquivo';
  fileViewerBody.innerHTML = '';
  fileViewerOverlay.classList.remove('hidden');

  if (!dataUrl) {
    fileViewerBody.innerHTML = `<div class="viewer-placeholder"><span class="ph-icon">📎</span><p>Pré-visualização não disponível.</p></div>`;
    return;
  }

  if (mimeType && mimeType.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = fileName;
    fileViewerBody.appendChild(img);

  } else if (mimeType === 'application/pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = dataUrl;
    iframe.title = fileName;
    fileViewerBody.appendChild(iframe);

  } else if (mimeType && (mimeType.startsWith('text/') || mimeType === 'application/json')) {
    // Decodifica base64 → texto
    let text = '';
    try {
      const base64 = dataUrl.split(',')[1];
      text = base64 ? decodeURIComponent(escape(atob(base64))) : dataUrl;
    } catch {
      text = dataUrl;
    }

    // Barra de ações do editor
    const bar = document.createElement('div');
    bar.className = 'viewer-edit-bar';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'viewer-save-btn';
    saveBtn.textContent = '💾 Salvar alterações na nota';
    saveBtn.disabled = true;

    const discardBtn = document.createElement('button');
    discardBtn.className = 'viewer-discard-btn';
    discardBtn.textContent = 'Descartar';
    discardBtn.disabled = true;

    const hint = document.createElement('span');
    hint.className = 'viewer-edit-hint';
    hint.textContent = 'Edite o texto acima e salve para atualizar a nota';

    bar.append(saveBtn, discardBtn, hint);

    // Textarea editável
    const ta = document.createElement('textarea');
    ta.className = 'viewer-textarea';
    ta.value = text;
    ta.spellcheck = false;

    let originalText = text;

    ta.addEventListener('input', () => {
      const changed = ta.value !== originalText;
      saveBtn.disabled = !changed;
      discardBtn.disabled = !changed;
    });

    saveBtn.addEventListener('click', () => {
      const newText = ta.value;
      // Atualiza fileData (base64) e text da nota
      const newB64 = btoa(unescape(encodeURIComponent(newText)));
      const newDataUrl = `data:${mimeType};base64,` + newB64;

      if (noteRef) {
        noteRef.text = newText;
        noteRef.fileData = newDataUrl;

        // Atualiza o textarea da nota no canvas
        const noteTa = canvas.querySelector(`.note[data-id="${noteRef.id}"] textarea`);
        if (noteTa) {
          noteTa.value = newText;
          noteTa.dispatchEvent(new Event('input', { bubbles: true }));
        }

        save();
      }

      originalText = newText;
      saveBtn.disabled = true;
      discardBtn.disabled = true;
      hint.textContent = '✅ Salvo!';
      setTimeout(() => { hint.textContent = 'Edite o texto acima e salve para atualizar a nota'; }, 2000);
    });

    discardBtn.addEventListener('click', () => {
      ta.value = originalText;
      saveBtn.disabled = true;
      discardBtn.disabled = true;
    });

    fileViewerBody.appendChild(ta);
    fileViewerBody.appendChild(bar);

  } else {
    // Tipo desconhecido — oferece download
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName || 'arquivo';
    a.textContent = 'Baixar arquivo';

    fileViewerBody.innerHTML = `<div class="viewer-placeholder">
      <span class="ph-icon">${getFileIcon(mimeType, fileName)}</span>
      <p>Pré-visualização não disponível para este tipo de arquivo.</p>
    </div>`;
    fileViewerBody.querySelector('.viewer-placeholder').appendChild(a);
  }
}

// Abre uma URL externa num iframe dentro do visualizador
function openUrlViewer(url) {
  fileViewerTitle.textContent = url;
  fileViewerBody.innerHTML = '';
  fileViewerOverlay.classList.remove('hidden');

  // Tenta carregar num iframe; se o site bloquear, avisa e oferece abrir numa aba
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.title = url;
  iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';

  iframe.addEventListener('error', () => {
    showUrlFallback(url);
  });

  fileViewerBody.appendChild(iframe);

  // Fallback em 5s (sites bloqueados via X-Frame-Options não disparam "error")
  const fallbackTimer = setTimeout(() => {
    // Se o iframe ainda não tem conteúdo acessível, não fazemos nada —
    // o usuário já vê o iframe tentando carregar.
  }, 5000);

  iframe.addEventListener('load', () => clearTimeout(fallbackTimer));
}

function showUrlFallback(url) {
  fileViewerBody.innerHTML = `<div class="viewer-placeholder">
    <span class="ph-icon">🔗</span>
    <p>Este site não permite ser exibido aqui.</p>
    <a id="open-external-link">Abrir em nova aba ↗</a>
  </div>`;
  document.getElementById('open-external-link').addEventListener('click', () => {
    window.open(url, '_blank', 'noopener');
  });
}

let dragCounter = 0;
let internalDrag = false;

// Evita criar nota nova quando o usuário só está arrastando texto
// selecionado de dentro de uma nota (ex.: reordenando texto no textarea).
document.addEventListener('dragstart', () => { internalDrag = true; });
document.addEventListener('dragend', () => { internalDrag = false; });

viewport.addEventListener('dragenter', e => {
  if (internalDrag) return;
  e.preventDefault();
  dragCounter++;
  viewport.classList.add('drag-active');
});

viewport.addEventListener('dragleave', () => {
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) viewport.classList.remove('drag-active');
});

viewport.addEventListener('dragover', e => {
  if (internalDrag) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

viewport.addEventListener('drop', e => {
  if (internalDrag) return;

  e.preventDefault();
  dragCounter = 0;
  viewport.classList.remove('drag-active');

  const p = screenToWorld(e.clientX, e.clientY);
  const files = Array.from(e.dataTransfer.files || []);

  if (files.length) {
    files.forEach((file, i) => {
      const x = p.x - 110 + i * 24;
      const y = p.y - 70 + i * 24;

      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_SIZE) {
          createNote(x, y, { text: `📎 ${file.name} (imagem grande demais pra importar)` });
          return;
        }
        const reader = new FileReader();
        reader.onload = () => createNote(x, y, {
          image: reader.result,
          text: file.name,
          fileData: reader.result,
          fileName: file.name,
          fileMime: file.type
        });
        reader.readAsDataURL(file);

      } else if (file.type.startsWith('text/') || /\.(txt|md|csv|json|log)$/i.test(file.name)) {
        if (file.size > MAX_TEXT_FILE_SIZE) {
          createNote(x, y, { text: `📎 ${file.name} (arquivo grande demais pra importar o conteúdo)` });
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          // Guarda o texto completo como fileData (base64) para o visualizador/editor
          // e usa o texto completo diretamente na nota
          const fullText = reader.result;
          const asB64 = btoa(unescape(encodeURIComponent(fullText)));
          const dataUrl = `data:${file.type || 'text/plain'};base64,` + asB64;
          createNote(x, y, {
            text: fullText,           // texto completo, sem corte
            fileData: dataUrl,
            fileName: file.name,
            fileMime: file.type || 'text/plain'
          });
        };
        reader.readAsText(file, 'UTF-8');

      } else if (file.type === 'application/pdf') {
        if (file.size > 10 * 1024 * 1024) {
          createNote(x, y, { text: `📄 ${file.name} (PDF grande demais pra importar)` });
          return;
        }
        const reader = new FileReader();
        reader.onload = () => createNote(x, y, {
          text: `📄 ${file.name}`,
          fileData: reader.result,
          fileName: file.name,
          fileMime: 'application/pdf'
        });
        reader.readAsDataURL(file);

      } else {
        // Verifica se pode ser uma pasta (webkitGetAsEntry)
        const entry = e.dataTransfer.items && e.dataTransfer.items[i]
          ? e.dataTransfer.items[i].webkitGetAsEntry()
          : null;

        if (entry && entry.isDirectory) {
          // Pasta do PC: cria nota com link para o diretório
          const dirPath = file.path || file.name; // Electron expõe file.path; navegador só tem name
          const dirUrl = file.path
            ? (dirPath.startsWith('file://') ? dirPath : 'file://' + dirPath.replace(/\\/g, '/'))
            : null;
          createNote(x, y, {
            text: dirUrl
              ? `[📁 ${file.name}](${dirUrl})`
              : `📁 ${file.name}\n(Arraste do Explorer para abrir)`,
            fileName: file.name,
            fileMime: 'inode/directory'
          });
        } else {
          createNote(x, y, { text: `📎 ${file.name}` });
        }
      }
    });
    return;
  }

  const dropped = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').trim();
  if (dropped) {
    // Se for um caminho de diretório (file:// sem extensão, ou path local)
    const isDir = dropped.startsWith('file://') && !dropped.match(/\.[a-zA-Z0-9]{1,6}$/);
    if (isDir) {
      const dirName = dropped.split('/').filter(Boolean).pop() || 'Pasta';
      createNote(p.x - 110, p.y - 20, {
        text: `[📁 ${decodeURIComponent(dirName)}](${dropped})`,
        fileMime: 'inode/directory'
      });
    } else {
      createNote(p.x - 110, p.y - 20, { text: dropped });
    }
  }
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

// Cores de accent do botão 🔗 Link — 1 entrada por NOTE_COLORS
const LINK_BTN_COLORS = [
  { light: { bg: '#ffe034', border: '#c9a020', color: '#3a2f00' }, dark: { bg: '#504818', border: '#988030', color: '#ffe090' } }, // Amarelo
  { light: { bg: '#ffbb70', border: '#c07020', color: '#3a1800' }, dark: { bg: '#503018', border: '#a06020', color: '#ffd890' } }, // Laranja
  { light: { bg: '#ff9999', border: '#c03838', color: '#500000' }, dark: { bg: '#501010', border: '#903030', color: '#ffb8b8' } }, // Vermelho
  { light: { bg: '#ffb0d0', border: '#c07090', color: '#50002a' }, dark: { bg: '#501830', border: '#985070', color: '#ffc8e0' } }, // Rosa claro
  { light: { bg: '#ff90b8', border: '#c03868', color: '#500020' }, dark: { bg: '#581028', border: '#a02858', color: '#ffb0d0' } }, // Rosa escuro
  { light: { bg: '#cc99ff', border: '#8850c8', color: '#300058' }, dark: { bg: '#382058', border: '#7840a8', color: '#e8c8ff' } }, // Roxo
  { light: { bg: '#88c8ff', border: '#3880c8', color: '#002040' }, dark: { bg: '#182840', border: '#3060a0', color: '#b8d8ff' } }, // Azul
  { light: { bg: '#70d8e8', border: '#189ab0', color: '#002830' }, dark: { bg: '#103038', border: '#187898', color: '#a8e4ef' } }, // Ciano
  { light: { bg: '#98d870', border: '#40a020', color: '#0a2800' }, dark: { bg: '#183018', border: '#307818', color: '#b8e8a0' } }, // Verde claro
  { light: { bg: '#70c848', border: '#288018', color: '#081800' }, dark: { bg: '#102010', border: '#205818', color: '#98d878' } }, // Verde escuro
  { light: { bg: '#e0b880', border: '#a06020', color: '#381800' }, dark: { bg: '#382010', border: '#784020', color: '#e8c898' } }, // Marrom
  { light: { bg: '#c8c8d8', border: '#7070a0', color: '#202040' }, dark: { bg: '#282840', border: '#484870', color: '#d0d0e8' } }, // Cinza
];

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

  el.querySelectorAll('.handle button:not(.del):not(.make-link-btn)').forEach(b => {
    b.style.color = isDark ? '#ddd' : '#5a4a00';
    b.style.background = '';
    b.style.border = '';
  });

  const delBtn = el.querySelector('.del');
  if (delBtn) delBtn.style.color = isDark ? '#ff9a9a' : '#844';

  // Botão 🔗 Link: cor de accent baseada na cor da nota
  const mlb = el.querySelector('.make-link-btn');
  if (mlb) {
    const lc = (LINK_BTN_COLORS[colorIndex] || LINK_BTN_COLORS[0]);
    const lcc = isDark ? lc.dark : lc.light;
    mlb.style.background = lcc.bg;
    mlb.style.borderColor = lcc.border;
    mlb.style.border = `1px solid ${lcc.border}`;
    mlb.style.color = lcc.color;
    mlb.style.borderRadius = '4px';
    mlb.style.padding = '1px 5px';
    mlb.style.fontWeight = '600';
  }
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

  // Barra de preview de arquivo (se a nota tiver fileData)
  const filePreviewHtml = note.fileData
    ? `<div class="note-file-preview" data-action="open-file">
         <span class="file-icon">${getFileIcon(note.fileMime, note.fileName)}</span>
         <span class="file-name" title="${escapeHtml(note.fileName || 'arquivo')}">${escapeHtml(note.fileName || 'arquivo')}</span>
         <span class="file-open-btn">👁 Ver</span>
       </div>`
    : '';

  el.innerHTML = `
    <div class="handle">
      <button class="pin-btn" title="Fixar nota">${note.pinned ? '📌' : '📍'}</button>
      <button class="color-btn" title="Cor da nota">🎨</button>
      <button class="cal-btn" title="Inserir data">📅</button>
      <button class="make-link-btn" title="Transformar texto selecionado em link">🔗 Link</button>
      <button class="link-open-btn" title="Abrir link (Shift+clique abre no navegador)" style="display:${isUrl(note.text) ? 'inline-flex' : 'none'}">↗</button>
      <button class="del" title="Apagar">✕</button>
    </div>

    ${filePreviewHtml}
    ${note.image ? `<img class="note-image" src="${note.image}" alt="">` : ''}
    <textarea placeholder="Escreva algo...">${escapeHtml(note.text)}</textarea>
    <div class="note-link-overlay" aria-hidden="true"></div>
  `;

  canvas.appendChild(el);

  const handle = el.querySelector('.handle');
  const ta = el.querySelector('textarea');
  const del = el.querySelector('.del');
  const calBtn = el.querySelector('.cal-btn');
  const pinBtn = el.querySelector('.pin-btn');
  const colorBtn = el.querySelector('.color-btn');
  const linkOpenBtn = el.querySelector('.link-open-btn');
  const makeLinkBtn = el.querySelector('.make-link-btn');
  const linkOverlay = el.querySelector('.note-link-overlay');

  linkOpenBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (e.shiftKey) {
      window.open(ta.value.trim(), '_blank', 'noopener');
    } else {
      openUrlViewer(ta.value.trim());
    }
  });

  // Botão "🔗 Link" — abre popup para transformar texto selecionado em link Markdown
  makeLinkBtn.addEventListener('click', e => {
    e.stopPropagation();
    openLocalLinkPopup(ta, el);
  });

  // Botão "Ver arquivo" na barra de preview
  const filePreviewBar = el.querySelector('.note-file-preview');
  if (filePreviewBar) {
    filePreviewBar.addEventListener('click', e => {
      e.stopPropagation();
      openFileViewer(note.fileData, note.fileName, note.fileMime, note);
    });
  }

  // ---- OVERLAY DE LINKS ----
  // Abordagem: não espelha o texto (causava sobreposição e bloqueava seleção).
  // Em vez disso mostra badges de link flutuantes no canto inferior da nota,
  // de forma que o textarea fica totalmente livre para seleção e cópia.
  function rebuildLinkOverlay() {
    if (!linkOverlay) return;
    const text = ta.value;
    const links = extractAllLinks(text);

    linkOverlay.innerHTML = '';

    if (!links.length) {
      linkOverlay.style.display = 'none';
      return;
    }

    linkOverlay.style.display = '';

    links.forEach(link => {
      const badge = document.createElement('span');
      badge.className = 'link-badge' + (link.isLocal ? ' local-link' : '');
      badge.title = link.url;
      badge.dataset.url = link.url;
      badge.dataset.local = link.isLocal;

      // Ícone + label truncado
      const icon = link.isLocal ? '📁' : '🔗';
      const label = link.text.length > 28 ? link.text.slice(0, 26) + '…' : link.text;

      const mainSpan = document.createElement('span');
      mainSpan.className = 'link-badge-label';
      mainSpan.textContent = icon + ' ' + label;

      mainSpan.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const url = badge.dataset.url;
        const isLocal = badge.dataset.local === 'true';

        if (isLocal) {
          const href = url.startsWith('file://') || url.startsWith('http') ? url : 'file://' + url;
          window.open(href, '_blank', 'noopener,width=900,height=700');
        } else if (e.shiftKey) {
          window.open(url, '_blank', 'noopener,width=900,height=700');
        } else {
          openUrlViewer(url);
        }
      });

      // Botão × para remover o link da nota
      const removeBtn = document.createElement('button');
      removeBtn.className = 'link-badge-remove';
      removeBtn.title = 'Remover link';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        // Remove o trecho markdown [label](url) do texto da nota
        const currentText = ta.value;
        // Recalcula posição do link no texto atual
        const allLinks = extractAllLinks(currentText);
        const target = allLinks.find(l => l.url === link.url && l.text === link.text);

        if (target) {
          // Mesmo problema/solução de applyLocalLink: seleciona o trecho e
          // apaga via execCommand para manter o desfazer nativo do textarea
          // (atribuir ta.value direto apagaria esse histórico).
          ta.focus();
          ta.setSelectionRange(target.start, target.end);
          const ok = document.execCommand('delete', false, null);

          if (ok) {
            // Colapsa 3+ quebras de linha deixadas pela remoção, se houver
            const run = /\n{3,}/.exec(ta.value);
            if (run) {
              ta.setSelectionRange(run.index, run.index + run[0].length);
              document.execCommand('insertText', false, '\n\n');
            }
          } else {
            const before = currentText.slice(0, target.start);
            const after  = currentText.slice(target.end);
            ta.value = (before + after).replace(/\n{3,}/g, '\n\n');
            note.text = ta.value;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else {
          // Fallback: remove qualquer ocorrência do padrão com essa URL
          const escaped = link.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          ta.value = currentText.replace(new RegExp(`\\[[^\\]]*\\]\\(${escaped}\\)`, 'g'), '').replace(/\n{3,}/g, '\n\n');
          note.text = ta.value;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      badge.appendChild(mainSpan);
      badge.appendChild(removeBtn);
      linkOverlay.appendChild(badge);
    });
  }

  rebuildLinkOverlay();

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

    linkOpenBtn.style.display = isUrl(ta.value) ? 'inline-flex' : 'none';
    rebuildLinkOverlay();
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

    const isDarkNow = document.body.classList.contains('dark');

    NOTE_COLORS.forEach((c, i) => {
      const sw = document.createElement('button');
      sw.className = 'color-swatch' + (i === (note.colorIndex || 0) ? ' active-swatch' : '');
      sw.style.background = isDarkNow ? c.dark.swatch : c.light.swatch;
      sw.title = c.name || ('Cor ' + (i + 1));

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

    // Se a nota clicada faz parte da seleção múltipla, arrasta todas juntas
    const isMultiDrag = selectedNoteIds.size > 1 && selectedNoteIds.has(note.id);

    pushUndoSnapshot();
    bringToFront(el);
    setActiveNote(note.id);

    const startX = e.clientX;
    const startY = e.clientY;

    // Salva posições originais de todas as notas envolvidas
    const dragNotes = isMultiDrag
      ? state.notes.filter(n => selectedNoteIds.has(n.id) && !n.pinned)
      : [note];

    const origPositions = dragNotes.map(n => ({ note: n, x: n.x, y: n.y }));

    function move(ev) {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;

      origPositions.forEach(({ note: n, x, y }) => {
        n.x = x + dx;
        n.y = y + dy;
        const el2 = canvas.querySelector(`.note[data-id="${n.id}"]`);
        if (el2) {
          el2.style.left = n.x + 'px';
          el2.style.top  = n.y + 'px';
        }
      });

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

  /* ===== CLIQUE NA NOTA (seleção múltipla + ligar) ===== */

  el.addEventListener('click', e => {
    // Shift+clique na nota: adiciona/remove da seleção múltipla
    if (e.shiftKey && !linkMode) {
      e.stopPropagation();
      if (selectedNoteIds.has(note.id)) {
        selectedNoteIds.delete(note.id);
      } else {
        selectedNoteIds.add(note.id);
      }
      updateMultiSelectHighlight();
      return;
    }

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

function noteRect(note) {
  const el = canvas.querySelector(`.note[data-id="${note.id}"]`);

  if (el) {
    return { x: note.x, y: note.y, w: el.offsetWidth, h: el.offsetHeight };
  }

  return { x: note.x, y: note.y, w: note.width || 220, h: note.height || 160 };
}

// Ponto onde a linha (do centro do retângulo até "target") cruza a borda do retângulo.
// Antes a ligação ia de centro a centro e ficava escondida atrás da nota; em notas
// de tamanhos bem diferentes isso podia parecer uma linha cortada antes de chegar.
function rectEdgePoint(rect, target) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;

  const dx = target.x - cx;
  const dy = target.y - cy;

  if (!dx && !dy) return { x: cx, y: cy };

  const scaleX = dx ? (rect.w / 2) / Math.abs(dx) : Infinity;
  const scaleY = dy ? (rect.h / 2) / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return { x: cx + dx * scale, y: cy + dy * scale };
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

    const rectA = noteRect(a);
    const rectB = noteRect(b);
    const centerA = { x: rectA.x + rectA.w / 2, y: rectA.y + rectA.h / 2 };
    const centerB = { x: rectB.x + rectB.w / 2, y: rectB.y + rectB.h / 2 };

    const pA = rectEdgePoint(rectA, centerB);
    const pB = rectEdgePoint(rectB, centerA);

    const line = document.createElementNS(SVG_NS, 'line');

    line.setAttribute('x1', pA.x);
    line.setAttribute('y1', pA.y);
    line.setAttribute('x2', pB.x);
    line.setAttribute('y2', pB.y);
    line.style.pointerEvents = 'stroke';
    line.style.cursor = 'pointer';

    line.addEventListener('click', e => {
      e.stopPropagation();
      promptLinkLabel(link);
    });

    svg.appendChild(line);

    if (link.label) {
      const mx = (pA.x + pB.x) / 2;
      const my = (pA.y + pB.y) / 2;

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

function createNote(x, y, extra) {
  pushUndoSnapshot();

  let pos;

  if (x != null && y != null) {
    pos = { x, y };
  } else {
    const c = centerOfView();
    pos = { x: c.x - 110 + (Math.random() * 60 - 30), y: c.y - 70 + (Math.random() * 60 - 30) };
  }

  const note = Object.assign({
    id: state.nextId++,
    x: pos.x,
    y: pos.y,
    text: '',
    colorIndex: 0,
    pinned: false
  }, extra);

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
  // Se há seleção múltipla, copia todas as notas selecionadas
  const ids = selectedNoteIds.size > 0
    ? [...selectedNoteIds]
    : (activeNoteId != null ? [activeNoteId] : []);

  if (!ids.length) return;

  const notes = ids.map(id => state.notes.find(n => n.id === id)).filter(Boolean);
  if (!notes.length) return;

  // Ligações entre as notas copiadas (internas ao grupo)
  const internalLinks = state.links.filter(l =>
    ids.includes(l.a) && ids.includes(l.b)
  );

  clipboardNote = {
    notes: notes.map(n => ({ ...n })),
    links: internalLinks.map(l => ({ ...l })),
    x: notes[0].x,
    y: notes[0].y
  };
}

function pasteNote() {
  if (!clipboardNote) return;

  pushUndoSnapshot();

  const offset = 24;
  const idMap = {};

  clipboardNote.notes.forEach(src => {
    const newId = state.nextId++;
    idMap[src.id] = newId;

    const newNote = {
      ...src,
      id: newId,
      x: src.x + offset,
      y: src.y + offset,
      pinned: false
    };

    state.notes.push(newNote);
    setActiveNote(newId);
  });

  // Recria as ligações internas com os novos IDs
  clipboardNote.links.forEach(l => {
    const newA = idMap[l.a];
    const newB = idMap[l.b];
    if (newA && newB) {
      state.links.push({ a: newA, b: newB, label: l.label || '' });
    }
  });

  // Desloca a origem para o próximo Ctrl+V empilhar
  clipboardNote.notes = clipboardNote.notes.map(n => ({ ...n, x: n.x + offset, y: n.y + offset }));

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
  // Salva o estado atual antes de exportar (garante dados frescos)
  save();

  // Coleta dados de todos os quadros
  const allBoards = boards.map(b => {
    const data = (b.id === currentBoardId)
      ? state                      // quadro ativo: usa estado em memória
      : loadBoardData(b.id);       // demais: lê do localStorage
    return {
      id:    b.id,
      name:  b.name,
      notes: data.notes,
      links: data.links,
      nextId: data.nextId
    };
  });

  const payload = {
    version: 2,                    // marca como exportação multi-quadro
    exportedAt: new Date().toISOString(),
    currentBoard: currentBoardId,
    boards: allBoards
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);

  a.href     = url;
  a.download = `notas-flutuantes-${stamp}.json`;
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

      // ── Formato v2: exportação de todos os quadros ──
      if (parsed && parsed.version === 2 && Array.isArray(parsed.boards)) {
        const totalNotes = parsed.boards.reduce((n, b) => n + (b.notes ? b.notes.length : 0), 0);
        const totalBoards = parsed.boards.length;

        const proceed = confirm(
          `Importar ${totalBoards} quadro(s) com ${totalNotes} nota(s) no total.\n\n` +
          `⚠️ Isso vai substituir TODOS os seus quadros atuais. Continuar?`
        );
        if (!proceed) return;

        // Grava cada quadro no localStorage
        const newBoards = parsed.boards.map(b => {
          const id   = b.id || ('b' + Date.now() + Math.random().toString(36).slice(2));
          const name = b.name || 'Quadro';
          const data = {
            notes:  Array.isArray(b.notes)  ? b.notes  : [],
            links:  Array.isArray(b.links)  ? b.links  : [],
            nextId: typeof b.nextId === 'number' ? b.nextId
                      : (b.notes || []).reduce((m, n) => Math.max(m, n.id || 0), 0) + 1
          };
          localStorage.setItem(boardDataKey(id), JSON.stringify(data));
          return { id, name };
        });

        // Substitui a lista de quadros
        boards.length = 0;
        newBoards.forEach(b => boards.push(b));
        saveBoardsList();

        // Muda para o quadro que estava ativo na exportação (ou o primeiro)
        const target = parsed.currentBoard && boards.find(b => b.id === parsed.currentBoard)
          ? parsed.currentBoard
          : boards[0].id;

        switchBoard(target);
        alert(`✅ ${totalBoards} quadro(s) importado(s) com sucesso!`);

      // ── Formato v1 / legado: exportação de um único quadro ──
      } else if (parsed && Array.isArray(parsed.notes)) {
        const proceed = state.notes.length === 0 ||
          confirm('Importar vai substituir as notas do quadro atual. Continuar?');
        if (!proceed) return;

        pushUndoSnapshot();

        state = {
          notes:  parsed.notes,
          links:  Array.isArray(parsed.links) ? parsed.links : [],
          nextId: typeof parsed.nextId === 'number'
            ? parsed.nextId
            : parsed.notes.reduce((m, n) => Math.max(m, n.id), 0) + 1
        };

        // Se o JSON tinha nome de quadro, renomeia o quadro atual
        if (parsed.board) {
          const board = boards.find(b => b.id === currentBoardId);
          if (board) { board.name = parsed.board; saveBoardsList(); renderBoardSelect(); }
        }

        activeNoteId = null;
        save();
        render();

      } else {
        throw new Error('Formato de arquivo não reconhecido.');
      }

    } catch (err) {
      alert('Não foi possível importar esse arquivo: ' + err.message);
    } finally {
      importInput.value = '';
    }
  };

  reader.readAsText(file);
});

/* ===== BACKUP DE UM QUADRO SÓ ===== */

document.getElementById('exportBoardNotes').addEventListener('click', () => {
  save();

  const board = boards.find(b => b.id === currentBoardId);
  const boardName = board ? board.name : 'Quadro';

  // Mesmo formato (v1/legado) que o Importar já sabe ler para um quadro só
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    board: boardName,
    notes: state.notes,
    links: state.links,
    nextId: state.nextId
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);

  const slug = boardName
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'quadro';

  a.href     = url;
  a.download = `notas-flutuantes-${slug}-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ===== PAINEL DE CONFIGURAÇÕES ===== */

const settingsPanel  = document.getElementById('settingsPanel');
const settingsToggle = document.getElementById('settingsToggle');
const settingsClose  = document.getElementById('settingsClose');

function openSettings() {
  closeCalendar();
  settingsPanel.classList.remove('hidden');
  settingsToggle.classList.add('active');
}

function closeSettings() {
  settingsPanel.classList.add('hidden');
  settingsToggle.classList.remove('active');
}

function toggleSettingsPanel() {
  settingsPanel.classList.contains('hidden') ? openSettings() : closeSettings();
}

settingsToggle.addEventListener('click', toggleSettingsPanel);
settingsClose.addEventListener('click', closeSettings);

// Fecha ao clicar fora do painel
document.addEventListener('mousedown', e => {
  if (settingsPanel.classList.contains('hidden')) return;
  if (settingsPanel.contains(e.target)) return;
  if (settingsToggle.contains(e.target)) return;

  closeSettings();
});

/* ===== DESFAZER / REFAZER ===== */

let undoStack = [];
let redoStack = [];
const UNDO_LIMIT = 50;

const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function pushUndoSnapshot() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
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
  updateUndoRedoButtons();
}

function redo() {
  if (!redoStack.length) return;

  undoStack.push(JSON.stringify(state));
  state = JSON.parse(redoStack.pop());

  activeNoteId = null;
  linkPick = null;

  save();
  render();
  updateUndoRedoButtons();
}

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

/* ===== MOVER COM TECLADO (M) ===== */

const MOVE_STEP = 10;
const MOVE_STEP_FAST = 40;

function setMoveMode(on) {
  moveMode = on;
  document.body.classList.toggle('move-mode', moveMode);
}

// Nota(s)-alvo do modo mover: a seleção múltipla, senão a nota ativa
function moveTargets() {
  const ids = selectedNoteIds.size > 0
    ? [...selectedNoteIds]
    : (activeNoteId != null ? [activeNoteId] : []);

  return state.notes.filter(n => ids.includes(n.id) && !n.pinned);
}

function nudgeNotes(dx, dy) {
  const targets = moveTargets();
  if (!targets.length) return false;

  targets.forEach(n => {
    n.x += dx;
    n.y += dy;
    const el = canvas.querySelector(`.note[data-id="${n.id}"]`);
    if (el) {
      el.style.left = n.x + 'px';
      el.style.top  = n.y + 'px';
    }
  });

  drawLinks();
  save();
  return true;
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

    if (moveMode) setMoveMode(false);

    closeAllColorPopups();
    closeCalendar();
    closeSettings();
    return;
  }

  const tag = document.activeElement && document.activeElement.tagName;
  const inField = tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT';

  // Atalho L: ativar/desativar modo ligação (fora de campos de texto)
  if (!inField && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    linkBtn.click();
    return;
  }

  // Atalho M: ativar/desativar modo mover (fora de campos de texto).
  // Com o modo ativo, as setas do teclado deslocam a nota ativa (ou toda
  // a seleção múltipla); Shift+seta desloca mais rápido.
  if (!inField && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm') {
    e.preventDefault();
    if (!moveMode && !moveTargets().length) return; // nada selecionado/ativo pra mover
    if (!moveMode) pushUndoSnapshot();
    setMoveMode(!moveMode);
    return;
  }

  if (!inField && moveMode && e.key.startsWith('Arrow')) {
    e.preventDefault();
    const step = e.shiftKey ? MOVE_STEP_FAST : MOVE_STEP;
    const moved =
      e.key === 'ArrowUp'    ? nudgeNotes(0, -step) :
      e.key === 'ArrowDown'  ? nudgeNotes(0, step) :
      e.key === 'ArrowLeft'  ? nudgeNotes(-step, 0) :
      e.key === 'ArrowRight' ? nudgeNotes(step, 0) : false;
    if (!moved) setMoveMode(false); // nota-alvo sumiu (ex.: desfazer) — sai do modo
    return;
  }

  // Delete / Backspace: apagar notas da seleção múltipla (fora de campos de texto)
  if (!inField && (e.key === 'Delete' || e.key === 'Backspace')) {
    if (selectedNoteIds.size > 0) {
      e.preventDefault();
      if (!confirm(`Apagar ${selectedNoteIds.size} nota(s) selecionada(s)?`)) return;
      pushUndoSnapshot();
      const ids = [...selectedNoteIds];
      state.notes = state.notes.filter(n => !ids.includes(n.id));
      state.links = state.links.filter(l => !ids.includes(l.a) && !ids.includes(l.b));
      selectedNoteIds.clear();
      save();
      render();
      return;
    }
  }

  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;

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
  closeSettings();
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

    el.focus();
    el.setSelectionRange(start, end);

    // Mesmo problema/solução de applyLocalLink: execCommand preserva o
    // desfazer nativo do textarea; atribuir .value direto o apaga.
    const ok = document.execCommand('insertText', false, insert);

    if (!ok) {
      el.value = before + insert + after;
      note.text = el.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const pos = (before + insert).length;
      el.setSelectionRange(pos, pos);
    }

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
  const isDarkNow = document.body.classList.contains('dark');

  // Reaplica cores de fundo/borda das notas
  document.querySelectorAll('.note').forEach(el => {
    const id = Number(el.dataset.id);
    const note = state.notes.find(n => n.id === id);
    const handle = el.querySelector('.handle');
    if (note && handle) applyNoteColor(el, handle, note.colorIndex || 0);

    // Atualiza bolinhas de popup de cor que estiver aberto
    el.querySelectorAll('.color-swatch').forEach((sw, i) => {
      const c = NOTE_COLORS[i];
      if (c) sw.style.background = isDarkNow ? c.dark.swatch : c.light.swatch;
    });
  });
});

/* ===== POPUP DE LINK LOCAL ===== */

const localLinkPopup = document.getElementById('local-link-popup');
const llpUrlInput    = document.getElementById('llp-url-input');
const llpConfirm     = document.getElementById('llp-confirm');
const llpCancel      = document.getElementById('llp-cancel');

let llpTargetTextarea = null;
let llpSelStart = 0;
let llpSelEnd   = 0;
let llpSelectedText = '';

function openLocalLinkPopup(textarea, noteEl) {
  const selStart = textarea.selectionStart;
  const selEnd   = textarea.selectionEnd;
  const selected = textarea.value.slice(selStart, selEnd).trim();

  llpTargetTextarea = textarea;
  llpSelStart = selStart;
  llpSelEnd   = selEnd;
  llpSelectedText = selected;

  // Aplica dark mode no popup dinamicamente
  const isDark = document.body.classList.contains('dark');
  localLinkPopup.classList.toggle('dark', isDark);

  // Posiciona o popup abaixo do handle da nota
  const handleEl = noteEl.querySelector('.handle');
  const rect = handleEl.getBoundingClientRect();

  localLinkPopup.classList.remove('hidden');
  localLinkPopup.offsetHeight; // força reflow
  localLinkPopup.classList.add('visible');

  localLinkPopup.style.left = Math.min(rect.left, window.innerWidth - 400) + 'px';
  localLinkPopup.style.top  = (rect.bottom + 6) + 'px';

  llpUrlInput.value = '';
  if (selected && /^(https?|file):\/\//.test(selected)) {
    llpUrlInput.value = selected;
  }
  llpUrlInput.focus();
  llpUrlInput.select();
}

function closeLocalLinkPopup() {
  localLinkPopup.classList.remove('visible');
  setTimeout(() => {
    if (!localLinkPopup.classList.contains('visible')) {
      localLinkPopup.classList.add('hidden');
    }
  }, 200);
  llpTargetTextarea = null;
}

function applyLocalLink() {
  if (!llpTargetTextarea) return;
  const url = llpUrlInput.value.trim();
  if (!url) { closeLocalLinkPopup(); return; }

  const ta = llpTargetTextarea;

  // Com texto selecionado → [texto](url) (markdown com rótulo)
  // Sem texto           → (url)          (parêntese simples, sem colchetes)
  const insertion = llpSelectedText
    ? `[${llpSelectedText}](${url})`
    : `(${url})`;

  ta.focus();
  ta.setSelectionRange(llpSelStart, llpSelEnd);

  // execCommand insere pelo mesmo caminho de uma digitação normal, então
  // mantém o histórico nativo de desfazer do textarea. Atribuir ta.value
  // diretamente apaga esse histórico — por isso o Ctrl+Z não desfazia o
  // link (mas desfazia uma edição de texto normal).
  const ok = document.execCommand('insertText', false, insertion);

  if (!ok) {
    // Navegador sem suporte a execCommand: aplica sem preservar o undo nativo
    const before = ta.value.slice(0, llpSelStart);
    const after  = ta.value.slice(llpSelEnd);
    ta.value = before + insertion + after;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    const newPos = before.length + insertion.length;
    ta.setSelectionRange(newPos, newPos);
  }

  closeLocalLinkPopup();
}

llpConfirm.addEventListener('click', applyLocalLink);

llpCancel.addEventListener('click', closeLocalLinkPopup);

llpUrlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); applyLocalLink(); }
  if (e.key === 'Escape') { e.preventDefault(); closeLocalLinkPopup(); }
});

// Fecha ao clicar fora do popup
document.addEventListener('mousedown', e => {
  if (localLinkPopup.classList.contains('hidden')) return;
  if (!localLinkPopup.contains(e.target)) closeLocalLinkPopup();
});

/* ===== START ===== */

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

renderBoardSelect();
applyTransform();
render();
updateUndoRedoButtons();