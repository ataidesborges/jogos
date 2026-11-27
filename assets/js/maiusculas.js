// ============================================================
// Maiúscula e Minúscula — letras maiúsculas de um lado, minúsculas do
// outro. A criança toca numa e depois na sua par (A com a); uma linha
// colorida liga as duas.
//  • Fácil: 4 letras quaisquer.
//  • Médio: 5 letras, com um grupo de minúsculas parecidas (b d p q…).
// 5 rodadas por jogo. Tocar numa letra faz a voz dizer o nome dela.
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const lgBoard = document.getElementById('lgBoard');
const colUpper = document.getElementById('lgPics');
const colLower = document.getElementById('lgNames');
const lgLines = document.getElementById('lgLines');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 5;
const ALPHABET = 'ABCDEFGHIJLMNOPQRSTUVXZ'.split('');
const LOOK_ALIKE_GROUPS = [['B','D','P','Q'], ['N','U','H','M'], ['I','L','J','T'], ['A','O','E','C'], ['F','T','L','I'], ['G','Q','P','J']];
const LINE_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#A855F7'];

let level = 'facil';
let round = 0, score = 0;
let letters = [];
let selected = null;   // {side, letter, el}
let links = [];        // {letter, color}
let mistakes = {};
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  round = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  loadRound();
}

function pickLetters(){
  if(level === 'facil') return shuffle([...ALPHABET]).slice(0, 4);
  const group = LOOK_ALIKE_GROUPS[Math.floor(Math.random() * LOOK_ALIKE_GROUPS.length)];
  const extra = shuffle(ALPHABET.filter(l => !group.includes(l))).slice(0, 5 - group.length);
  return [...group, ...extra];
}

function makeItem(letter, side){
  const b = document.createElement('button');
  b.className = 'lg-item mm-item' + (side === 'lower' ? ' lower' : '');
  b.dataset.letter = letter;
  b.innerHTML = `<span class="lg-name">${side === 'upper' ? letter : letter.toLowerCase()}</span>`;
  b.setAttribute('aria-label', `Letra ${side === 'upper' ? 'maiúscula' : 'minúscula'} ${letter}`);
  b.addEventListener('click', ()=> pick(side, letter, b));
  return b;
}

function loadRound(){
  letters = pickLetters();
  selected = null; links = []; mistakes = {};
  colUpper.innerHTML = ''; colLower.innerHTML = '';
  shuffle([...letters]).forEach(l => colUpper.appendChild(makeItem(l, 'upper')));
  shuffle([...letters]).forEach(l => colLower.appendChild(makeItem(l, 'lower')));
  qQuestion.textContent = 'Toque numa letra maiúscula e depois na minúscula dela.';
  qProgress.textContent = `Rodada ${round + 1} de ${ROUNDS}`;
  qScore.textContent = `${score} pontos`;
  drawLines();
}

function pick(side, letter, el){
  if(el.classList.contains('done')) return;
  speakLetter(letter);

  if(!selected || selected.side === side){
    if(selected) selected.el.classList.remove('sel');
    if(selected && selected.el === el){ selected = null; return; }
    selected = {side, letter, el};
    el.classList.add('sel');
    return;
  }

  const other = selected;
  other.el.classList.remove('sel');
  selected = null;
  if(other.letter === letter){
    const color = LINE_COLORS[links.length % LINE_COLORS.length];
    links.push({letter, color});
    [other.el, el].forEach(x => { x.classList.add('done'); x.style.setProperty('--c', color); x.style.borderColor = color; });
    const earned = Math.max(5, 10 - (mistakes[letter] || 0) * 3);
    score += earned;
    qScore.textContent = `${score} pontos`;
    ping(true);
    drawLines();
    if(links.length === letters.length){
      confetti(lgBoard);
      qQuestion.textContent = '🎉 Muito bem! Todas ligadas!';
      nextTimer = setTimeout(nextRound, 1500);
    }
  } else {
    mistakes[other.letter] = (mistakes[other.letter] || 0) + 1;
    [other.el, el].forEach(x => { x.classList.remove('wrong'); void x.offsetWidth; x.classList.add('wrong'); });
    ping(false);
  }
}

function drawLines(){
  const box = lgBoard.getBoundingClientRect();
  lgLines.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const anchor = (el, right)=>{
    const r = el.getBoundingClientRect();
    return {x: (right ? r.right : r.left) - box.left, y: r.top + r.height / 2 - box.top};
  };
  lgLines.innerHTML = links.map(l=>{
    const a = anchor(colUpper.querySelector(`[data-letter="${l.letter}"]`), true);
    const b = anchor(colLower.querySelector(`[data-letter="${l.letter}"]`), false);
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
initCommon('maiusculas');
start();
