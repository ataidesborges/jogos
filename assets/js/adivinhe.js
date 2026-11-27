// ============================================================
// Adivinhe a Palavra — a criança descobre a palavra tocando nas letras.
// Cada letra errada estoura um balão (no lugar da "forca", que não é
// legal para crianças pequenas).
//  • Fácil: palavras curtas, figura colorida, 6 balões.
//  • Médio: qualquer palavra, só a SOMBRA da figura, 5 balões.
// Acentos não atrapalham: tocar no A revela também Á, Â e Ã.
// 5 palavras por jogo.
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const qCard = document.querySelector('.q-card');
const qArt = document.getElementById('qArt');
const adWord = document.getElementById('adWord');
const adKeys = document.getElementById('adKeys');
const adBalloons = document.getElementById('adBalloons');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 5;
const KEYS = 'ABCDEFGHIJLMNOPQRSTUVXZ'.split('');
const BALLOON_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#A855F7', '#EC4899'];
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

let level = 'facil';
let words = [], idx = 0, score = 0, wins = 0;
let current = null, letters = [], found = [], balloons = 0, locked = false;
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  const pool = level === 'facil' ? ALL_WORDS.filter(w => w.word.length <= 5) : level === 'medio' ? ALL_WORDS.filter(w => w.word.length >= 4) : ALL_WORDS.filter(w => w.word.length >= 6);
  wins = 0;
  words = shuffle([...pool]).slice(0, ROUNDS);
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  loadWord();
}

function loadWord(){
  locked = false;
  current = words[idx];
  letters = [...current.word];
  found = letters.map(() => false);
  balloons = level === 'facil' ? 6 : level === 'medio' ? 5 : 4;

  adWord.innerHTML = '';
  adWord.style.setProperty('--n', letters.length);
  letters.forEach(()=>{
    const t = document.createElement('span');
    t.className = 'lf-tile gap';
    adWord.appendChild(t);
  });

  adBalloons.innerHTML = '';
  for(let i = 0; i < balloons; i++){
    const b = document.createElement('span');
    b.className = 'ad-balloon';
    b.style.setProperty('--b', BALLOON_COLORS[i % BALLOON_COLORS.length]);
    b.style.animationDelay = (i * -0.4) + 's';
    adBalloons.appendChild(b);
  }

  adKeys.innerHTML = '';
  KEYS.forEach(k=>{
    const b = document.createElement('button');
    b.className = 'ad-key';
    b.textContent = k;
    b.addEventListener('click', ()=> guess(b, k));
    adKeys.appendChild(b);
  });

  qCard.classList.toggle('shadow', level !== 'facil');
  qQuestion.textContent = 'Toque nas letras para descobrir a palavra.';
  qProgress.textContent = `Palavra ${idx + 1} de ${words.length}`;
  qScore.textContent = `${score} pontos`;
  if(level !== 'facil'){ // só a sombra
    const w = current;
    silhouette(w.art).then(u => { if(current === w && qCard.classList.contains('shadow')) setArt(qArt, u, 'Sombra da palavra escondida'); });
  }
  else setArt(qArt, current.art, 'Figura da palavra escondida');
}

function guess(btn, k){
  if(locked || btn.disabled) return;
  btn.disabled = true;
  const hits = letters.map((ch, i) => plain(ch) === k ? i : -1).filter(i => i >= 0);
  if(hits.length){
    btn.classList.add('hit');
    speakLetter(k);
    hits.forEach(i=>{
      found[i] = true;
      const t = adWord.children[i];
      t.textContent = letters[i];
      t.classList.remove('gap');
      t.classList.add('filled');
    });
    if(found.every(Boolean)) win();
  } else {
    btn.classList.add('miss');
    ping(false);
    popBalloon();
    if(balloons === 0) lose();
  }
}

function popBalloon(){
  const alive = [...adBalloons.querySelectorAll('.ad-balloon:not(.popped)')];
  const b = alive[alive.length - 1];
  if(b){ b.classList.add('popped'); balloons--; }
}

function reveal(){
  // no Médio a figura estava como sombra: mostra a figura colorida
  if(qCard.classList.contains('shadow')) setArt(qArt, current.art, `Ilustração de ${current.word.toLowerCase()}`);
  qCard.classList.remove('shadow');
  letters.forEach((ch, i)=>{
    const t = adWord.children[i];
    if(!found[i]){ t.textContent = ch; t.classList.remove('gap'); t.classList.add('missed'); }
  });
}

function win(){
  locked = true;
  reveal();
  wins++;
  const earned = 10 + balloons * 2;
  score += earned;
  addPoints(earned);
  qScore.textContent = `${score} pontos`;
  ping(true);
  confetti(adWord);
  collectSticker(current.word, Math.min(earned, 20));
  speak(current.word);
  qQuestion.textContent = `🎉 Você descobriu: ${current.word}! +${earned} pontos`;
  nextTimer = setTimeout(next, 2400);
}

function lose(){
  locked = true;
  reveal();
  speak(current.word);
  qQuestion.textContent = `Os balões acabaram! A palavra era ${current.word}. Vamos para a próxima?`;
  nextTimer = setTimeout(next, 3000);
}

function next(){
  idx++;
  if(idx >= words.length) finish();
  else loadWord();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${words.length} palavras!`;
  levelDone(level, wins, words.length);
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
initCommon('adivinhe');
start();
