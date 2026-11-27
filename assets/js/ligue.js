// ============================================================
// Ligue a Figura ao Nome — figuras de um lado, nomes do outro.
// A criança toca numa figura e depois no nome certo (ou ao contrário);
// quando acerta, uma linha colorida liga os dois.
//  • Fácil: 3 figuras por rodada · Médio: 4 figuras · 5 rodadas por jogo.
// Tocar num nome faz a voz ler a palavra (ajuda na leitura).
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const lgBoard = document.getElementById('lgBoard');
const lgPics = document.getElementById('lgPics');
const lgNames = document.getElementById('lgNames');
const lgLines = document.getElementById('lgLines');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 5;
const LINE_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#A855F7'];

let level = 'facil';
let round = 0, score = 0;
let roundWords = [];
let selected = null;        // {side:'pic'|'name', word, el}
let links = [];             // {word, color}
let mistakes = {};          // palavra -> erros
let used = new Set();       // palavras já usadas neste jogo
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  round = 0; score = 0; used = new Set();
  qFinal.hidden = true;
  qStage.hidden = false;
  loadRound();
}

function loadRound(){
  const n = level === 'facil' ? 3 : 4;
  const maxLen = level === 'facil' ? 6 : 99;
  let candidates = ALL_WORDS.filter(w => w.word.length <= maxLen && !used.has(w.word));
  if(candidates.length < n) candidates = ALL_WORDS.filter(w => w.word.length <= maxLen);
  roundWords = shuffle([...candidates]).slice(0, n);
  roundWords.forEach(w => used.add(w.word));
  selected = null; links = []; mistakes = {};

  lgPics.innerHTML = ''; lgNames.innerHTML = '';
  shuffle([...roundWords]).forEach(w=>{
    const b = document.createElement('button');
    b.className = 'lg-item';
    b.dataset.word = w.word;
    b.setAttribute('aria-label', 'Figura');
    b.innerHTML = `<img src="${w.art}" alt="">`;
    b.addEventListener('click', ()=> pick('pic', w.word, b));
    lgPics.appendChild(b);
  });
  shuffle([...roundWords]).forEach(w=>{
    const b = document.createElement('button');
    b.className = 'lg-item';
    b.dataset.word = w.word;
    b.innerHTML = `<span class="lg-name">${w.word}</span>`;
    b.addEventListener('click', ()=> pick('name', w.word, b));
    lgNames.appendChild(b);
  });

  qQuestion.textContent = 'Toque numa figura e depois no nome dela.';
  qProgress.textContent = `Rodada ${round + 1} de ${ROUNDS}`;
  qScore.textContent = `${score} pontos`;
  drawLines();
}

function pick(side, word, el){
  if(el.classList.contains('done')) return;
  if(side === 'name') speak(word); // a voz lê o nome tocado

  // nada selecionado, ou tocou de novo no mesmo lado: (re)seleciona
  if(!selected || selected.side === side){
    if(selected) selected.el.classList.remove('sel');
    if(selected && selected.el === el){ selected = null; drawLines(); return; }
    selected = {side, word, el};
    el.classList.add('sel');
    drawLines();
    return;
  }

  // tocou no outro lado: confere o par
  const other = selected;
  other.el.classList.remove('sel');
  selected = null;
  if(other.word === word){
    const color = LINE_COLORS[links.length % LINE_COLORS.length];
    links.push({word, color});
    [other.el, el].forEach(x => { x.classList.add('done'); x.style.setProperty('--c', color); x.style.borderColor = color; });
    const earned = Math.max(5, 10 - (mistakes[word] || 0) * 3);
    score += earned;
    qScore.textContent = `${score} pontos`;
    ping(true);
    collectSticker(word, earned);
    if(side === 'pic') speak(word);
    drawLines();
    if(links.length === roundWords.length){
      confetti(lgBoard);
      qQuestion.textContent = '🎉 Muito bem! Todas ligadas!';
      nextTimer = setTimeout(nextRound, 1500);
    }
  } else {
    mistakes[other.word] = (mistakes[other.word] || 0) + 1;
    [other.el, el].forEach(x => { x.classList.remove('wrong'); void x.offsetWidth; x.classList.add('wrong'); });
    ping(false);
    drawLines();
  }
}

// desenha as linhas entre os pares já ligados
function drawLines(){
  const box = lgBoard.getBoundingClientRect();
  lgLines.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const anchor = (el, sideRight)=>{
    const r = el.getBoundingClientRect();
    return {x: (sideRight ? r.right : r.left) - box.left, y: r.top + r.height / 2 - box.top};
  };
  lgLines.innerHTML = links.map(l=>{
    const a = anchor(lgPics.querySelector(`[data-word="${l.word}"]`), true);
    const b = anchor(lgNames.querySelector(`[data-word="${l.word}"]`), false);
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${l.color}"/>`;
  }).join('');
}
window.addEventListener('resize', ()=> requestAnimationFrame(drawLines));

function nextRound(){
  round++;
  if(round >= ROUNDS) finish();
  else loadRound();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${ROUNDS} rodadas!`;
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    level = btn.dataset.level;
    start();
  });
});
document.getElementById('qNewBtn').addEventListener('click', start);
document.getElementById('qAgainBtn').addEventListener('click', start);

// ---------- Init ----------
initCommon('ligue');
start();
