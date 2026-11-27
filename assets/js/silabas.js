// ============================================================
// Lógica específica do jogo — Formar Palavras
// Quadro fixo com 6 famílias de sílabas simples (ex.: BA BE BI BO BU)
// + caderno. A criança escreve livremente tocando nas sílabas; quando
// as sílabas formam uma palavra que tem figura, a figura aparece. Se não
// aparecer figura, a palavra não existe — aí é só passar a borracha.
// As palavras descobertas ficam salvas no aparelho.
// "Novo quadro" troca as consoantes, dando preferência às palavras que
// ainda faltam. Acentos não importam (SO + FA = SOFÁ).
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const sbBoard = document.getElementById('sbBoard');
const sbNotebook = document.getElementById('sbNotebook');
const sbArt = document.getElementById('sbArt');
const sbWord = document.getElementById('sbWord');
const sbMsg = document.getElementById('sbMsg');
const sbEraser = document.getElementById('sbEraser');
const progressText = document.getElementById('progressText');
const scoreText = document.getElementById('scoreText');
const newRoundBtn = document.getElementById('newRoundBtn');
const hintBtn = document.getElementById('hintBtn');
const roundCompleteEl = document.getElementById('roundComplete');
const sbTargets = document.getElementById('sbTargets');
const roundMsgEl = roundCompleteEl.querySelector('.msg');
const roundSubEl = document.getElementById('roundScoreText');

const VOWELS = ['A','E','I','O','U'];
const CONSONANTS = 'BCDFGJLMNPRSTVXZ'.split('');
const FAMILIES_PER_BOARD = 6;   // 6 linhas de 5 sílabas, como no quadro da sala
const MAX_SYLLABLES = 6;        // o caderno aceita até 6 sílabas

// tira acentos para comparar (SOFÁ = SOFA, BEBÊ = BEBE, LEÃO = LEAO)
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const SIMPLE_SYL = /^[BCDFGJLMNPRSTVXZ]?[AEIOU]$/; // vogal sozinha ou consoante + vogal

// Divide a palavra (sem acentos) em sílabas simples do quadro, se der.
// Ex.: LEITE -> LE + I + TE, LEÃO -> LE + A + O. Devolve null se não der.
function splitSimple(word){
  const w = norm(word);
  const memo = {};
  const go = i => {
    if(i === w.length) return [];
    if(i in memo) return memo[i];
    memo[i] = null;
    for(const len of [2, 1]){ // prefere consoante + vogal
      const s = w.slice(i, i + len);
      if(s.length === len && SIMPLE_SYL.test(s)){
        const rest = go(i + len);
        if(rest){ memo[i] = [s, ...rest]; break; }
      }
    }
    return memo[i];
  };
  return go(0);
}

// Palavras com figura que dá para escrever só com sílabas simples
const SIMPLE_WORDS = ALL_WORDS
  .map(w => ({...w, nsyl: splitSimple(w.word), nword: norm(w.word)}))
  .filter(w => w.nsyl);
const consonantsOf = w => [...new Set(w.nsyl.filter(s => s.length === 2).map(s => s[0]))];

// Palavras "difíceis": precisam de sílabas complexas (CHU, GRE, NHA, BAR, PEI…)
const COMPLEX_WORDS = ALL_WORDS
  .filter(w => !splitSimple(w.word))
  .map(w => ({...w, nword: norm(w.word)}));
// todas as palavras com figura, para reconhecer o que a criança escreveu
const ALL_MATCH = ALL_WORDS.map(w => ({...w, nword: norm(w.word)}));
const levelPool = () => currentLevel === 'desafio' ? COMPLEX_WORDS : SIMPLE_WORDS;
const CHALLENGE_WORDS = 6;   // figuras por quadro no Desafio
const CHALLENGE_SLOTS = 30;  // botões no quadro do Desafio (6 linhas de 5)

// ---------- Palavras descobertas (salvas no aparelho) ----------
const DISCOVERED_KEY = 'fp-silabas-descobertas';
const discovered = new Set((()=>{
  try{ return JSON.parse(localStorage.getItem(DISCOVERED_KEY) || '[]'); }catch(e){ return []; }
})());
function saveDiscovered(){
  try{ localStorage.setItem(DISCOVERED_KEY, JSON.stringify([...discovered])); }catch(e){}
}

let currentLevel = 'facil';
let boardWords = [];     // palavras que podem ser formadas neste quadro
let typed = [];          // sílabas tocadas até agora
let score = 0;
let state = 'idle';      // 'idle' | 'writing' | 'success' | 'hint' | 'erasing' | 'done'
let roundTimer = null;
let successToken = 0;
let lastFams = '';
let sameTurn = 0;      // alterna entre palavras escritas igual (AVÓ / AVÔ)

// ---------- Monta um quadro ----------
// Escolhe 6 consoantes que formem várias palavras — principalmente as que
// a criança ainda não descobriu.
function buildBoard(level){
  const isLevelWord = w => level === 'facil' ? w.syl.length === 2 : w.syl.length >= 3;
  const missing = SIMPLE_WORDS.filter(w => !discovered.has(w.word));
  let best = null;
  for(let attempt = 0; attempt < 120; attempt++){
    const fams = new Set();
    const missingLevel = missing.filter(isLevelWord);
    const seeds = shuffle(missingLevel.length ? missingLevel : SIMPLE_WORDS.filter(isLevelWord));
    const others = shuffle(missing.length ? [...missing, ...SIMPLE_WORDS] : [...SIMPLE_WORDS]);
    for(const w of [...seeds.slice(0, 3), ...others]){
      const merged = new Set([...fams, ...consonantsOf(w)]);
      if(merged.size <= FAMILIES_PER_BOARD) merged.forEach(c => fams.add(c));
      if(fams.size === FAMILIES_PER_BOARD) break;
    }
    for(const c of shuffle([...CONSONANTS])){
      if(fams.size >= FAMILIES_PER_BOARD) break;
      fams.add(c);
    }
    const sorted = [...fams].sort();
    if(sorted.join('') === lastFams) continue; // não repete o quadro anterior
    const words = SIMPLE_WORDS.filter(w => consonantsOf(w).every(c => fams.has(c)));
    const fresh = words.filter(w => !discovered.has(w.word));
    const value = fresh.filter(isLevelWord).length * 6 + fresh.length * 3
                + words.filter(isLevelWord).length * 2 + words.length;
    if(!best || value > best.value) best = {fams:sorted, words, value};
  }
  lastFams = best.fams.join('');
  return best;
}

// ---------- Desafio: quadro montado com as sílabas de 6 palavras difíceis ----------
let lastChallenge = '';
function buildChallenge(){
  const missing = shuffle(COMPLEX_WORDS.filter(w => !discovered.has(w.word)));
  const done = shuffle(COMPLEX_WORDS.filter(w => discovered.has(w.word)));
  let words = [], syls = new Map(); // sílaba sem acento -> como aparece no botão
  for(let attempt = 0; attempt < 20; attempt++){
    words = []; syls = new Map();
    for(const w of [...shuffle([...missing]), ...done]){
      if(words.length >= CHALLENGE_WORDS) break;
      const merged = new Map(syls);
      w.syl.forEach(s => { if(!merged.has(norm(s))) merged.set(norm(s), s); });
      if(merged.size > CHALLENGE_SLOTS) continue;
      words.push(w); syls = merged;
    }
    if(words.map(w => w.word).sort().join() !== lastChallenge) break;
  }
  lastChallenge = words.map(w => w.word).sort().join();
  // completa o quadro com sílabas "pegadinha" de outras palavras difíceis
  const extras = shuffle(COMPLEX_WORDS.filter(w => !words.includes(w)).flatMap(w => w.syl));
  for(const s of extras){
    if(syls.size >= CHALLENGE_SLOTS) break;
    if(!syls.has(norm(s))) syls.set(norm(s), s);
  }
  // em ordem alfabética, para ficar fácil de achar a sílaba
  const list = [...syls.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(e => e[1]);
  return {words, syls:list};
}

function renderChallenge(syls){
  sbBoard.innerHTML = '';
  syls.forEach((syl, i)=>{
    const btn = document.createElement('button');
    btn.className = 'sb-syl f' + (Math.floor(i / 5) % 6) + (norm(syl).length >= 3 ? ' long' : '');
    btn.textContent = syl;
    btn.dataset.syl = syl;
    btn.addEventListener('click', ()=> tapSyllable(btn));
    sbBoard.appendChild(btn);
  });
}

// sombras das figuras do quadro: acendem quando a palavra é descoberta
function renderTargets(justFound){
  const isChallenge = currentLevel === 'desafio';
  sbTargets.hidden = !isChallenge;
  document.getElementById('sbStage').classList.toggle('is-challenge', isChallenge);
  if(!isChallenge){ sbTargets.innerHTML = ''; return; }
  sbTargets.innerHTML = '';
  boardWords.forEach(w=>{
    const lit = discovered.has(w.word);
    const el = document.createElement('div');
    el.className = 'sb-target' + (lit ? ' lit' : '') + (w.word === justFound ? ' pop' : '');
    el.title = lit ? w.word : 'Figura escondida';
    el.innerHTML = `<img alt="${lit ? w.word.toLowerCase() : 'figura escondida'}">`;
    const im = el.querySelector('img');
    if(lit) im.src = w.art;
    else silhouette(w.art, '#FFFFFF').then(u => { im.src = u; }); // silhueta branca, sem o fundo
    sbTargets.appendChild(el);
  });
}

function startRound(){
  clearTimeout(roundTimer);
  roundCompleteEl.classList.remove('show');
  if(currentLevel === 'desafio'){
    const ch = buildChallenge();
    boardWords = ch.words;
    renderChallenge(ch.syls);
  } else {
    const board = buildBoard(currentLevel);
    boardWords = board.words;
    renderBoard(board.fams);
  }
  renderTargets();
  clearNotebook();
  updateProgress();
}

function renderBoard(fams){
  sbBoard.innerHTML = '';
  const addBtn = (syl, cls)=>{
    const btn = document.createElement('button');
    btn.className = 'sb-syl ' + cls;
    btn.textContent = syl;
    btn.dataset.syl = syl;
    btn.addEventListener('click', ()=> tapSyllable(btn));
    sbBoard.appendChild(btn);
  };
  // 1ª fileira: as vogais (para OVO, UVA, LUA, AVÔ, ABACATE…)
  VOWELS.forEach(v => addBtn(v, 'vowel'));
  // depois, 6 famílias de consoantes — cada família (linha) tem uma cor
  fams.forEach((c, row) => VOWELS.forEach(v => addBtn(c + v, 'f' + (row % 6))));
}

const starredLevels = new Set();
const hasStarNow = l => !!((starsAll()[PAGE_ID] || {got:{}}).got[l]);
function updateProgress(){
  const pool = levelPool();
  const total = pool.filter(w => discovered.has(w.word)).length;
  const tipo = currentLevel === 'desafio' ? 'palavras difíceis' : 'palavras';
  progressText.textContent = `${total} de ${pool.length} ${tipo} descobertas`;
  // descobriu todas as palavras do nível: ganha a estrela
  if(pool.length && total === pool.length && !starredLevels.has(currentLevel)){ starredLevels.add(currentLevel); if(!hasStarNow(currentLevel)) levelDone(currentLevel, 1, 1); }
  scoreText.textContent = `${score} pontos`;
}

// ---------- Caderno ----------
function setNotebook(newState, word, msg){
  state = newState;
  sbNotebook.classList.remove('writing', 'success', 'hinting', 'erasing');
  if(newState === 'writing' || newState === 'success') sbNotebook.classList.add(newState);
  if(newState === 'hint') sbNotebook.classList.add('hinting');
  sbWord.textContent = word || '';
  sbMsg.textContent = msg || '';
}
function clearNotebook(){
  typed = [];
  successToken++;
  setNotebook('idle', '', 'Toque nas sílabas para escrever');
}

// ---------- Tocar numa sílaba: escreve livremente ----------
function tapSyllable(btn){
  if(state === 'done' || state === 'erasing') return;
  // depois de acertar (ou de uma dica), a próxima sílaba começa uma palavra nova
  if(state === 'success' || state === 'hint'){
    typed = [];
    successToken++;
  }
  if(typed.length >= MAX_SYLLABLES){
    sbMsg.textContent = 'O caderno está cheio — use a borracha 🧽';
    return;
  }
  const syl = btn.dataset.syl;
  typed.push(syl);
  speakSyllable(syl);
  btn.classList.add('flash');
  setTimeout(()=> btn.classList.remove('flash'), 250);

  const written = norm(typed.join(''));
  // compara as letras, sem acento. Se duas palavras se escrevem igual (AVÓ e AVÔ),
  // mostra primeiro a que ainda não foi descoberta; depois vai alternando.
  const same = ALL_MATCH.filter(w => w.nword === written);
  const match = same.find(w => !discovered.has(w.word))
    || (same.length ? same[(sameTurn++) % same.length] : null);
  if(match) onWordFormed(match);
  else setNotebook('writing', typed.join(''), '');
}

function onWordFormed(w){
  const isNew = !discovered.has(w.word);
  const token = ++successToken;
  setNotebook('writing', w.word, '');
  setArt(sbArt, w.art, `Ilustração de ${w.word.toLowerCase()}`).then(()=>{
    if(token !== successToken) return; // a criança já começou outra palavra
    if(isNew){
      discovered.add(w.word);
      saveDiscovered();
      score += 10;
      addPoints(10);
      collectSticker(w.word, 10);
      ping(true);
      confetti(sbNotebook);
    }
    setNotebook('success', w.word, isNew ? 'Palavra nova descoberta! +10 pontos' : 'Você já descobriu essa! 😊');
    speak(w.word.toLowerCase());
    updateProgress();
    if(isNew){ renderTargets(w.word); checkBoardDone(); }
  });
}

function checkBoardDone(){
  const allDone = levelPool().every(w => discovered.has(w.word));
  const boardDone = boardWords.every(w => discovered.has(w.word));
  if(!allDone && !boardDone) return;
  state = 'done';
  roundMsgEl.textContent = allDone
    ? (currentLevel === 'desafio' ? '🏆 Incrível! Você descobriu todas as palavras difíceis!' : '🏆 Incrível! Você descobriu todas as palavras!')
    : '🎉 Muito bem! Você descobriu todas as palavras deste quadro!';
  roundSubEl.textContent = allDone ? 'Elas estão todas no seu álbum de figurinhas.' : 'Um quadro novo está chegando…';
  setTimeout(()=>{ roundCompleteEl.classList.add('show'); confetti(roundCompleteEl); }, 900);
  roundTimer = setTimeout(startRound, allDone ? 6000 : 4200);
}

// ---------- Borracha: passa por cima da palavra e apaga ----------
sbEraser.addEventListener('click', ()=>{
  if(state === 'done' || state === 'erasing') return;
  if(!sbWord.textContent && state !== 'hint'){ // nada escrito: só "esfrega"
    sbEraser.classList.remove('rub'); void sbEraser.offsetWidth; sbEraser.classList.add('rub');
    return;
  }
  successToken++;
  state = 'erasing';
  sbEraser.classList.remove('rub');
  void sbNotebook.offsetWidth;
  sbNotebook.classList.add('erasing'); // a borracha "passa" pela palavra (CSS)
  eraserCrumbs();
  setTimeout(()=>{
    sbNotebook.classList.remove('erasing');
    clearNotebook();
  }, 750);
});

// farelinhos de borracha caindo do caderno
function eraserCrumbs(){
  const page = document.getElementById('sbPage');
  const r = sbWord.getBoundingClientRect();
  const pr = page.getBoundingClientRect();
  const y = (r.height ? r.top + r.height / 2 : pr.top + pr.height / 2) - pr.top;
  for(let i = 0; i < 14; i++){
    const c = document.createElement('span');
    c.className = 'sb-crumb';
    c.style.left = (pr.width * (0.2 + Math.random() * 0.6)) + 'px';
    c.style.top = (y + (Math.random() * 20 - 10)) + 'px';
    c.style.animationDelay = (i * 35) + 'ms';
    c.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
    page.appendChild(c);
    setTimeout(()=> c.remove(), 1200);
  }
}

// ---------- Dica: mostra a figura de uma palavra que falta e pisca a 1ª sílaba ----------
hintBtn.addEventListener('click', ()=>{
  if(state === 'done' || state === 'erasing') return;
  let pool = boardWords.filter(w => !discovered.has(w.word));
  if(!pool.length) pool = boardWords;
  if(!pool.length) return;
  const w = pool[Math.floor(Math.random() * pool.length)];
  typed = [];
  const token = ++successToken;
  setArt(sbArt, w.art, `Dica: ${w.word.toLowerCase()}`).then(()=>{
    if(token !== successToken) return;
    setNotebook('hint', '', 'Que palavra é essa? Comece pela sílaba que está piscando');
    speak(w.word.toLowerCase());
    const firstSyl = norm(w.nsyl ? w.nsyl[0] : w.syl[0]);
    const first = [...sbBoard.querySelectorAll('.sb-syl')].find(b => norm(b.dataset.syl) === firstSyl);
    if(first){ first.classList.remove('hint'); void first.offsetWidth; first.classList.add('hint'); }
  });
});

// ---------- Níveis e novo quadro ----------
document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentLevel = btn.dataset.level;
    startRound();
  });
});
newRoundBtn.addEventListener('click', startRound);

// ---------- Init ----------
initCommon('silabas');
// figurinhas já coletadas neste jogo (versões anteriores) contam como descobertas
ALL_WORDS.forEach(w => { if(collectedScores.has(w.word)) discovered.add(w.word); });
saveDiscovered();
// zerar figurinhas também apaga as palavras descobertas
onAlbumReset(()=>{ discovered.clear(); saveDiscovered(); renderTargets(); updateProgress(); });
startRound();
