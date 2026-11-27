// ============================================================
// Letra que Falta — a figura aparece com a palavra "com um buraco"
// (B _ L A) e a criança escolhe a letra que completa a palavra.
//  • Fácil: falta a primeira letra, 3 opções.
//  • Médio: falta uma letra qualquer, 4 opções.
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const qCard = document.querySelector('.q-card');
const qArt = document.getElementById('qArt');
const lfWord = document.getElementById('lfWord');
const qOptions = document.getElementById('qOptions');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 10;
const VOWELS = 'AEIOU'.split('');
const CONSONANTS = 'BCDFGJLMNPRSTVXZ'.split('');
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

let level = 'facil';
let words = [], idx = 0, score = 0, tries = 0, locked = false;
let current = null; // {w, pos, answer}
let nextTimer = null;

function pool(){
  if(level === 'dificil') return ALL_WORDS.filter(w => w.word.length >= 6);
  return level === 'facil' ? ALL_WORDS.filter(w => w.word.length <= 6) : ALL_WORDS;
}

function start(){
  clearTimeout(nextTimer);
  words = shuffle([...pool()]).slice(0, ROUNDS);
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  loadWord();
}

function loadWord(){
  locked = false; tries = 0;
  const w = words[idx];
  const letters = [...w.word];
  // posição que vai ficar vazia: só letras sem acento (fica mais justo para a criança)
  let pos = 0;
  if(level !== 'facil'){
    const options = letters.map((ch, i) => i).filter(i => i > 0 && plain(letters[i]) === letters[i] && /[A-Z]/.test(letters[i]));
    pos = options.length ? options[Math.floor(Math.random() * options.length)] : 0;
  }
  const answer = plain(letters[pos]);
  current = {w, pos, answer};

  // a palavra com o buraco
  lfWord.innerHTML = '';
  lfWord.style.setProperty('--n', letters.length);
  letters.forEach((ch, i)=>{
    const t = document.createElement('span');
    t.className = 'lf-tile' + (i === pos ? ' gap' : '');
    t.textContent = ch;
    lfWord.appendChild(t);
  });

  // opções: a certa + letras do mesmo tipo (vogal com vogal, consoante com consoante)
  const n = level === 'facil' ? 3 : level === 'medio' ? 4 : 5;
  // (nunca oferece uma letra que formaria outra palavra do jogo: GATO sem o G não pode ter P de PATO)
  const known = new Set(ALL_WORDS.map(x => plain(x.word)));
  const makesWord = l => { const t = [...plain(w.word)]; t[pos] = l; return known.has(t.join('')); };
  const same = (VOWELS.includes(answer) ? VOWELS : CONSONANTS).filter(l => l !== answer && !makesWord(l));
  const opts = shuffle([answer, ...shuffle([...same]).slice(0, n - 1)]);
  qOptions.innerHTML = '';
  opts.forEach(l=>{
    const b = document.createElement('button');
    b.className = 'q-opt';
    b.textContent = l;
    b._v = l;
    b.addEventListener('click', ()=> choose(b, l));
    qOptions.appendChild(b);
  });

  qProgress.textContent = `Palavra ${idx + 1} de ${words.length}`;
  qScore.textContent = `${score} pontos`;
  qCard.classList.remove('pop'); void qCard.offsetWidth; qCard.classList.add('pop');
  setArt(qArt, w.art, `Ilustração de ${w.word.toLowerCase()}`).then(()=> speak(w.word));
}

function choose(btn, letter){
  if(locked) return;
  if(letter === current.answer){
    locked = true;
    btn.classList.add('right');
    const tile = lfWord.children[current.pos];
    tile.classList.remove('gap');
    tile.classList.add('filled');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    addPoints(earned);
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(tile);
    collectSticker(current.w.word, earned);
    speak(current.w.word);
    nextTimer = setTimeout(next, 1600);
  } else {
    // uma tentativa só: errou, mostra a letra certa e segue
    locked = true;
    missAnswer(btn, b => b._v === current.answer, `Ops! A letra que faltava era <b>${current.answer}</b>`);
    const tile = lfWord.children[current.pos];
    tile.classList.remove('gap');
    tile.classList.add('filled', 'missed');
    speak(current.w.word);
    nextTimer = setTimeout(next, MISS_DELAY);
  }
}

function next(){
  idx++;
  if(idx >= words.length) finish();
  else loadWord();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  levelDone(level, score / 10, words.length);
  qFinalText.textContent = `Você fez ${score} pontos em ${words.length} palavras!`;
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

document.getElementById('qListen').addEventListener('click', ()=> current && speak(current.w.word));
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
initCommon('letra-que-falta');
start();
