// ============================================================
// Lógica específica do jogo — caca-palavras
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

// ================= CAÇA-PALAVRAS =================
const DIRS_BASIC = [[0,1],[1,0]];
const DIRS_ALL = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
function normalizeLetters(str){
  // mantém os acentos (á, â, ã, é, ...) — só padroniza para maiúsculas
  return str.toUpperCase();
}

const cacaGrid = document.getElementById('cacaGrid');
const cacaGridWrap = document.querySelector('.caca-grid-wrap');
const cacaWordList = document.getElementById('cacaWordList');
const cacaProgressText = document.getElementById('cacaProgressText');
const cacaScoreText = document.getElementById('cacaScoreText');
const cacaNewBtn = document.getElementById('cacaNewBtn');
const cacaCongrats = document.getElementById('cacaCongrats');
const cacaReveal = document.getElementById('cacaReveal');
const cacaRevealImg = document.getElementById('cacaRevealImg');
const cacaRevealWord = document.getElementById('cacaRevealWord');
const cacaRevealPoints = document.getElementById('cacaRevealPoints');
const soundBtn = document.getElementById('soundBtn');
const albumTitle = document.getElementById('albumTitle');
const albumToggleBtn = document.getElementById('albumToggleBtn');
const galleryEl = document.getElementById('gallery');

let audioEnabled = true;
soundBtn.addEventListener('click', ()=>{
  audioEnabled = !audioEnabled;
  soundBtn.textContent = audioEnabled ? '🔊' : '🔇';
  soundBtn.classList.toggle('muted', !audioEnabled);
  twemojify(soundBtn);
  if(!audioEnabled && 'speechSynthesis' in window) speechSynthesis.cancel();
});
albumToggleBtn.addEventListener('click', ()=>{
  const open = galleryEl.classList.toggle('open');
  albumToggleBtn.textContent = open ? 'Esconder álbum' : 'Ver álbum completo';
});

function renderAlbum(){
  albumTitle.textContent = `🏆 Álbum de Figurinhas — ${collected.size}/${ALL_WORDS.length} coletadas`;
  galleryEl.innerHTML = '';
  ALL_WORDS.forEach(w=>{
    const unlocked = collected.has(w.word);
    const el = document.createElement('div');
    el.className = 'sticker ' + (unlocked ? 'unlocked' : 'locked');
    el.innerHTML = unlocked
      ? `<img class="word-art" src="${w.art}" alt="Ilustração de ${w.word.toLowerCase()}"><span>${w.word}</span><span class="sticker-score">+${collectedScores.get(w.word)} pts</span>`
      : `<img class="word-art" src="${WORD_ART.nature}" alt="Figurinha bloqueada"><span>?????</span>`;
    galleryEl.appendChild(el);
  });
  twemojify(galleryEl);
}

let cacaLevel = 'facil';
let cacaSize = 10;
let cacaCells = [];
let cacaPlaced = [];
let cacaScore = 0;
let cacaFoundCount = 0;
let cacaRevealTimer = null;

document.querySelectorAll('.caca-level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.caca-level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    cacaLevel = btn.dataset.level;
    startCaca();
  });
});
cacaNewBtn.addEventListener('click', startCaca);

function wordPoolFor(level){
  const maxLen = level === 'facil' ? 7 : 10;
  return ALL_WORDS.filter(w => normalizeLetters(w.word).length <= maxLen);
}

let lastPlacedCells = null;
function tryPlaceWord(word, dirs){
  const attempts = 80;
  for(let a=0; a<attempts; a++){
    const [dr,dc] = dirs[Math.floor(Math.random()*dirs.length)];
    const len = word.length;
    const maxR = cacaSize-1, maxC = cacaSize-1;
    let r0min=0, r0max=maxR, c0min=0, c0max=maxC;
    if(dr===1) r0max = maxR-(len-1);
    if(dr===-1) r0min = len-1;
    if(dc===1) c0max = maxC-(len-1);
    if(dc===-1) c0min = len-1;
    if(r0min>r0max || c0min>c0max) continue;
    const r0 = r0min + Math.floor(Math.random()*(r0max-r0min+1));
    const c0 = c0min + Math.floor(Math.random()*(c0max-c0min+1));
    const cells = [];
    let ok = true;
    for(let i=0;i<len;i++){
      const r = r0+dr*i, c = c0+dc*i;
      const existing = cacaCells[r][c];
      if(existing && existing !== word[i]){ ok=false; break; }
      cells.push([r,c]);
    }
    if(!ok) continue;
    cells.forEach(([r,c],i)=>{ cacaCells[r][c] = word[i]; });
    lastPlacedCells = cells;
    return true;
  }
  return false;
}

function startCaca(){
  clearTimeout(cacaRevealTimer);
  cacaScore = 0;
  cacaFoundCount = 0;
  cacaCongrats.classList.remove('show');
  cacaReveal.classList.remove('show');
  updateCacaScore();

  const wordCount = cacaLevel === 'facil' ? 8 : 10;
  cacaSize = cacaLevel === 'facil' ? 10 : 13;
  const dirs = cacaLevel === 'facil' ? DIRS_BASIC : DIRS_ALL;

  const pool = shuffle([...wordPoolFor(cacaLevel)]);
  cacaPlaced = [];
  cacaCells = Array.from({length:cacaSize}, ()=>Array(cacaSize).fill(null));
  const colorOrder = shuffle([0,1,2,3,4,5,6]); // cada palavra recebe uma cor diferente da paleta

  for(const w of pool){
    if(cacaPlaced.length >= wordCount) break;
    const norm = normalizeLetters(w.word);
    if(norm.length > cacaSize || norm.length < 3) continue;
    if(tryPlaceWord(norm, dirs)){
      const colorIdx = colorOrder[cacaPlaced.length % colorOrder.length];
      cacaPlaced.push({word:w.word, norm, art:w.art, cells:lastPlacedCells, found:false, colorIdx});
    }
  }

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let r=0;r<cacaSize;r++){
    for(let c=0;c<cacaSize;c++){
      if(!cacaCells[r][c]) cacaCells[r][c] = LETTERS[Math.floor(Math.random()*LETTERS.length)];
    }
  }

  renderCacaGrid();
  renderCacaWordList();
  updateCacaProgress();
}

function renderCacaGrid(){
  cacaGrid.style.gridTemplateColumns = `repeat(${cacaSize}, 1fr)`;
  cacaGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(let r=0;r<cacaSize;r++){
    for(let c=0;c<cacaSize;c++){
      const cell = document.createElement('div');
      cell.className = 'caca-cell';
      cell.textContent = cacaCells[r][c];
      cell.dataset.r = r;
      cell.dataset.c = c;
      frag.appendChild(cell);
    }
  }
  cacaGrid.appendChild(frag);
}

function renderCacaWordList(){
  cacaWordList.innerHTML = '';
  cacaPlaced.forEach(p=>{
    const chip = document.createElement('span');
    chip.className = 'caca-word-chip' + (p.found ? ` found c${p.colorIdx}` : '');
    chip.textContent = p.word;
    chip.dataset.word = p.word;
    cacaWordList.appendChild(chip);
  });
}

function updateCacaProgress(){
  cacaProgressText.textContent = `${cacaFoundCount} / ${cacaPlaced.length} palavras encontradas`;
}
function updateCacaScore(){
  cacaScoreText.textContent = `⭐ ${cacaScore} pontos`;
}

let selecting = false;
let selStart = null;
let selCells = [];

function cellAt(r,c){
  if(r<0||r>=cacaSize||c<0||c>=cacaSize) return null;
  return cacaGrid.children[r*cacaSize + c];
}
function clearSelectionVisual(){
  cacaGrid.querySelectorAll('.caca-cell.selected').forEach(el=>el.classList.remove('selected'));
}

cacaGrid.addEventListener('pointerdown', (e)=>{
  const cell = e.target.closest ? e.target.closest('.caca-cell') : null;
  if(!cell) return;
  e.preventDefault();
  selecting = true;
  selStart = {r:+cell.dataset.r, c:+cell.dataset.c};
  clearSelectionVisual();
  selCells = [cell];
  cell.classList.add('selected');
  try{ cacaGrid.setPointerCapture(e.pointerId); }catch(err){}
});

cacaGrid.addEventListener('pointermove', (e)=>{
  if(!selecting || !selStart) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el && el.closest ? el.closest('.caca-cell') : null;
  if(!cell) return;
  const r = +cell.dataset.r, c = +cell.dataset.c;
  const dr = r - selStart.r, dc = c - selStart.c;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if(steps === 0){
    clearSelectionVisual();
    selCells = [cellAt(selStart.r, selStart.c)];
    selCells[0].classList.add('selected');
    return;
  }
  if(dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return;
  const stepR = Math.sign(dr), stepC = Math.sign(dc);
  const path = [];
  for(let i=0;i<=steps;i++){
    const rr = selStart.r+stepR*i, cc = selStart.c+stepC*i;
    const pcell = cellAt(rr,cc);
    if(!pcell) return;
    path.push(pcell);
  }
  clearSelectionVisual();
  selCells = path;
  selCells.forEach(el2=>el2.classList.add('selected'));
});

function sameCellSet(a,b){
  if(a.length !== b.length) return false;
  const A = a.map(x=>x.join(',')).sort().join('|');
  const B = b.map(x=>x.join(',')).sort().join('|');
  return A === B;
}

function cacaCelebrate(match, earned){
  cacaRevealImg.src = match.art;
  cacaRevealImg.alt = `Ilustração de ${match.word.toLowerCase()}`;
  cacaRevealWord.textContent = match.word;
  cacaRevealPoints.textContent = `+${earned} pontos`;
  cacaReveal.classList.add('show');
  clearTimeout(cacaRevealTimer);
  cacaRevealTimer = setTimeout(()=> cacaReveal.classList.remove('show'), 1700);

  collected.add(match.word);
  const best = collectedScores.get(match.word) || 0;
  if(earned > best) collectedScores.set(match.word, earned);
  renderAlbum();
  speak(match.word);
  confetti(cacaGridWrap);
}

function finishSelection(){
  if(selCells.length < 2){ clearSelectionVisual(); selCells=[]; selStart=null; return; }
  const coords = selCells.map(el=>[+el.dataset.r, +el.dataset.c]);
  const match = cacaPlaced.find(p => !p.found && sameCellSet(p.cells, coords));

  if(match){
    match.found = true;
    cacaFoundCount++;
    const earned = 10;
    cacaScore += earned;
    updateCacaScore();
    updateCacaProgress();
    selCells.forEach(el=>{ el.classList.remove('selected'); el.classList.add('found', `c${match.colorIdx}`); });
    renderCacaWordList();
    ping(true);
    cacaCelebrate(match, earned);
    if(cacaFoundCount === cacaPlaced.length){
      setTimeout(()=>{ cacaCongrats.classList.add('show'); }, 500);
    }
  } else {
    ping(false);
    clearSelectionVisual();
  }
  selCells = [];
  selStart = null;
}

cacaGrid.addEventListener('pointerup', ()=>{
  if(!selecting) return;
  selecting = false;
  finishSelection();
});
cacaGrid.addEventListener('pointercancel', ()=>{
  selecting = false;
  clearSelectionVisual();
  selCells = []; selStart = null;
});

// ---------- Init ----------
renderAlbum();
startCaca();
twemojify(document.body);

