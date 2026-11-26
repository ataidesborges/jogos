// ============================================================
// Lógica específica do jogo — Formar Palavras
// Quadro fixo de sílabas + caderno.
//  • Sílabas simples: vogais e BA…ZU de todas as consoantes do quadro.
//  • Sílabas complexas: CH, LH, NH, QU, GU, encontros (BR, CL…) e as
//    outras sílabas das palavras do jogo; dá para misturar com as simples.
// A criança toca nas sílabas, elas são "escritas" no caderno e, quando
// formam uma palavra do banco, a figura aparece. Acentos não importam
// (SO + FA = SOFÁ).
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const sbBoard = document.getElementById('sbBoard');
const sbTabs = document.getElementById('sbTabs');
const sbNotebook = document.getElementById('sbNotebook');
const sbArt = document.getElementById('sbArt');
const sbWord = document.getElementById('sbWord');
const sbMsg = document.getElementById('sbMsg');
const sbEraser = document.getElementById('sbEraser');
const progressText = document.getElementById('progressText');
const scoreText = document.getElementById('scoreText');
const hintBtn = document.getElementById('hintBtn');
const roundCompleteEl = document.getElementById('roundComplete');

// ---------- Sílabas ----------
const VOWELS = ['A','E','I','O','U'];
const SIMPLE_CONSONANTS = 'B C D F G H J L M N P R S T V X Z'.split(' ');
const COMPLEX_FAMILIES = [
  // dígrafos
  {label:'CH', syl:['CHA','CHE','CHI','CHO','CHU']},
  {label:'LH', syl:['LHA','LHE','LHI','LHO','LHU']},
  {label:'NH', syl:['NHA','NHE','NHI','NHO','NHU']},
  {label:'QU', syl:['QUA','QUE','QUI','QUO']},
  {label:'GU', syl:['GUA','GUE','GUI']},
  // encontros com R
  ...['BR','CR','DR','FR','GR','PR','TR','VR'].map(p => ({label:p, syl:VOWELS.map(v => p + v)})),
  // encontros com L
  ...['BL','CL','FL','GL','PL'].map(p => ({label:p, syl:VOWELS.map(v => p + v)})),
];

// tira acentos para comparar (SOFÁ = SOFA)
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

const SIMPLE_SET = new Set([...VOWELS, ...SIMPLE_CONSONANTS.flatMap(c => VOWELS.map(v => c + v))]);
const STANDARD_COMPLEX = new Set(COMPLEX_FAMILIES.flatMap(f => f.syl));

// "Outras sílabas": as sílabas das palavras do jogo que não estão nos quadros acima
// (BAR, POR, PEI, ÃO, PIN…), para que todas as palavras possam ser escritas.
const EXTRA_COMPLEX = (()=>{
  const seen = new Map();
  ALL_WORDS.forEach(w => w.syl.forEach(s=>{
    const n = norm(s);
    if(!SIMPLE_SET.has(n) && !STANDARD_COMPLEX.has(n) && !seen.has(n)) seen.set(n, s);
  }));
  return [...seen.values()].sort((a, b) => norm(a).localeCompare(norm(b)));
})();
const COMPLEX_SET = new Set([...STANDARD_COMPLEX, ...EXTRA_COMPLEX.map(norm)]);

// A palavra pode ser escrita com estas sílabas? (divide as letras em pedaços do quadro)
function canWrite(word, sylSet){
  const w = norm(word);
  const ok = Array(w.length + 1).fill(false);
  ok[0] = true;
  for(let i = 0; i < w.length; i++){
    if(!ok[i]) continue;
    for(let len = 1; len <= 4 && i + len <= w.length; len++){
      if(sylSet.has(w.slice(i, i + len))) ok[i + len] = true;
    }
  }
  return ok[w.length];
}
const ALL_SET = new Set([...SIMPLE_SET, ...COMPLEX_SET]);
// palavras de cada nível
const SIMPLE_WORDS = ALL_WORDS.filter(w => canWrite(w.word, SIMPLE_SET));
const COMPLEX_WORDS = ALL_WORDS.filter(w => !canWrite(w.word, SIMPLE_SET) && canWrite(w.word, ALL_SET));

// ---------- Estado ----------
let currentLevel = 'simples';
let currentTab = 'complexas';
let levelWords = [];
let validWords = [];     // tudo que dá para escrever neste nível (mostra a figura)
let found = new Set(JSON.parse(localStorage.getItem('fp-silabas-achadas') || '[]'));
let typed = [];
let score = 0;
let state = 'idle';      // 'idle' | 'writing' | 'success' | 'wrong' | 'hint'
let wrongTimer = null;
let successToken = 0;

// ---------- Quadro ----------
function addSection(title, rows, colorOffset){
  const sec = document.createElement('section');
  sec.className = 'sb-section';
  if(title){
    const h = document.createElement('h3');
    h.className = 'sb-sec-title';
    h.textContent = title;
    sec.appendChild(h);
  }
  const grid = document.createElement('div');
  grid.className = 'sb-grid';
  rows.forEach((row, r)=>{
    row.forEach(syl=>{
      const btn = document.createElement('button');
      btn.className = 'sb-syl f' + ((r + colorOffset) % 6); // cada família tem uma cor
      btn.textContent = syl;
      btn.dataset.syl = syl;
      if(syl.length >= 3) btn.classList.add('long');
      btn.addEventListener('click', ()=> tapSyllable(btn));
      grid.appendChild(btn);
    });
    // completa a linha para as famílias ficarem alinhadas (QU e GU têm menos de 5)
    for(let i = row.length; i < 5 && rows.length > 1 && row.length > 1; i++){
      const gap = document.createElement('span');
      gap.className = 'sb-gap';
      grid.appendChild(gap);
    }
  });
  sec.appendChild(grid);
  sbBoard.appendChild(sec);
}

function renderBoard(){
  sbBoard.innerHTML = '';
  const showComplex = currentLevel === 'complexas' && currentTab === 'complexas';
  sbTabs.hidden = currentLevel !== 'complexas';
  sbTabs.querySelectorAll('.sb-tab').forEach(t=>{
    const on = t.dataset.tab === currentTab;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
  });
  if(showComplex){
    addSection('Dígrafos e encontros', COMPLEX_FAMILIES.map(f => f.syl), 0);
    const extraRows = [];
    for(let i = 0; i < EXTRA_COMPLEX.length; i += 5) extraRows.push(EXTRA_COMPLEX.slice(i, i + 5));
    addSection('Outras sílabas', extraRows, 3);
  } else {
    addSection('Vogais', [VOWELS], 5);
    addSection('Sílabas simples', SIMPLE_CONSONANTS.map(c => VOWELS.map(v => c + v)), 0);
  }
}

function setLevel(level){
  currentLevel = level;
  currentTab = level === 'complexas' ? 'complexas' : 'simples';
  levelWords = level === 'simples' ? SIMPLE_WORDS : COMPLEX_WORDS;
  validWords = level === 'simples' ? SIMPLE_WORDS : ALL_WORDS.filter(w => canWrite(w.word, ALL_SET));
  roundCompleteEl.classList.remove('show');
  renderBoard();
  clearNotebook();
  updateProgress();
}

function updateProgress(){
  const done = levelWords.filter(w => found.has(w.word)).length;
  progressText.textContent = `${done} de ${levelWords.length} palavras`;
  scoreText.textContent = `${score} pontos`;
}

// ---------- Caderno ----------
function setNotebook(newState, word, msg){
  state = newState;
  sbNotebook.classList.remove('writing', 'success', 'wrong', 'hinting');
  if(newState !== 'idle') sbNotebook.classList.add(newState === 'hint' ? 'hinting' : newState);
  sbWord.textContent = word || '';
  sbMsg.textContent = msg || '';
}
function clearNotebook(){
  typed = [];
  successToken++;
  setNotebook('idle', '', 'Toque nas sílabas para escrever');
}

// ---------- Tocar numa sílaba ----------
function tapSyllable(btn){
  // depois de acertar (ou de uma dica / erro), a próxima sílaba começa uma palavra nova
  if(state === 'success' || state === 'hint' || state === 'wrong'){
    clearTimeout(wrongTimer);
    typed = [];
    successToken++;
  }
  const syl = btn.dataset.syl;
  typed.push(syl);
  speak(syl.toLowerCase());
  btn.classList.add('flash');
  setTimeout(()=> btn.classList.remove('flash'), 250);

  const written = typed.join('');
  const nWritten = norm(written);
  const match = validWords.find(w => norm(w.word) === nWritten);
  if(match){ onWordFormed(match); return; }

  // ainda pode virar alguma palavra?
  const canContinue = validWords.some(w => norm(w.word).startsWith(nWritten));
  if(canContinue) setNotebook('writing', written, '');
  else onWrong(written);
}

function onWordFormed(w){
  const isNew = !found.has(w.word);
  const token = ++successToken;
  setNotebook('writing', w.word, '');
  setArt(sbArt, w.art, `Ilustração de ${w.word.toLowerCase()}`).then(()=>{
    if(token !== successToken) return; // a criança já começou outra palavra
    if(isNew){
      found.add(w.word);
      localStorage.setItem('fp-silabas-achadas', JSON.stringify([...found]));
      score += 10;
      collectSticker(w.word, 10);
      ping(true);
      confetti(sbNotebook);
    }
    setNotebook('success', w.word, isNew ? '+10 pontos!' : 'Você já achou essa! 😊');
    speak(w.word.toLowerCase());
    updateProgress();
    if(isNew && levelWords.length && levelWords.every(x => found.has(x.word))){
      setTimeout(()=>{ roundCompleteEl.classList.add('show'); confetti(roundCompleteEl); }, 900);
    }
  });
}

function onWrong(written){
  ping(false);
  setNotebook('wrong', written, 'Essa não forma palavra… tente de novo!');
  clearTimeout(wrongTimer);
  wrongTimer = setTimeout(()=>{ if(state === 'wrong') clearNotebook(); }, 1600);
}

// ---------- Borracha ----------
sbEraser.addEventListener('click', ()=>{
  clearTimeout(wrongTimer);
  sbEraser.classList.remove('rub'); void sbEraser.offsetWidth; sbEraser.classList.add('rub');
  clearNotebook();
});

// ---------- Dica: mostra a figura de uma palavra que falta e pisca a 1ª sílaba ----------
hintBtn.addEventListener('click', ()=>{
  let pool = levelWords.filter(w => !found.has(w.word));
  if(!pool.length) pool = levelWords;
  if(!pool.length) return;
  const w = pool[Math.floor(Math.random() * pool.length)];
  clearTimeout(wrongTimer);
  typed = [];
  const token = ++successToken;
  setArt(sbArt, w.art, `Dica: ${w.word.toLowerCase()}`).then(()=>{
    if(token !== successToken) return;
    setNotebook('hint', '', 'Que palavra é essa? Comece por aqui 👇');
    speak(w.word.toLowerCase());
    // primeira sílaba: se estiver na outra aba, troca de aba
    const first = norm(w.syl[0]);
    if(currentLevel === 'complexas'){
      const wantTab = SIMPLE_SET.has(first) ? 'simples' : 'complexas';
      if(wantTab !== currentTab){ currentTab = wantTab; renderBoard(); }
    }
    const btn = [...sbBoard.querySelectorAll('.sb-syl')].find(b => norm(b.dataset.syl) === first);
    if(btn){
      btn.classList.remove('hint'); void btn.offsetWidth; btn.classList.add('hint');
      btn.scrollIntoView({block:'nearest', behavior:'smooth'});
    }
  });
});

// ---------- Níveis e abas ----------
document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    setLevel(btn.dataset.level);
  });
});
sbTabs.querySelectorAll('.sb-tab').forEach(t=>{
  t.addEventListener('click', ()=>{ currentTab = t.dataset.tab; renderBoard(); });
});

// ---------- Init ----------
initCommon('silabas');
setLevel('simples');
