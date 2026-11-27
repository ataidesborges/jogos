// ============================================================
// Mundo das Vogais
//  • Fácil — "Com que vogal começa?": a figura aparece, a voz fala o nome
//    e a criança toca na vogal inicial (A, E, I, O, U).
//  • Médio — "Caça às vogais": a palavra aparece inteira e a criança toca
//    em todas as vogais dela (as consoantes balançam).
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const qCard = document.querySelector('.q-card');
const qArt = document.getElementById('qArt');
const vgWord = document.getElementById('vgWord');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 10;
const VOWELS = ['A','E','I','O','U'];
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const isVowel = ch => VOWELS.includes(plain(ch));

let level = 'facil';
let words = [], idx = 0, score = 0, mistakes = 0, locked = false;
let current = null;
let nextTimer = null;

function pool(){
  if(level === 'dificil') return ALL_WORDS.filter(w => w.word.length >= 7); // caça em palavras grandes
  return level === 'facil'
    ? ALL_WORDS.filter(w => isVowel(w.word[0]))   // palavras que começam com vogal
    : ALL_WORDS;
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
  locked = false; mistakes = 0;
  const w = current = words[idx];
  const letters = [...w.word];
  vgWord.innerHTML = '';
  vgWord.style.setProperty('--n', letters.length);
  vgWord.classList.toggle('hunt', level !== 'facil');
  qOptions.innerHTML = '';

  if(level === 'facil'){
    qQuestion.textContent = 'Com que vogal começa?';
    // a palavra com a 1ª letra escondida
    letters.forEach((ch, i)=>{
      const t = document.createElement('span');
      t.className = 'lf-tile' + (i === 0 ? ' gap' : '');
      t.textContent = ch;
      vgWord.appendChild(t);
    });
    VOWELS.forEach(v=>{
      const b = document.createElement('button');
      b.className = 'q-opt';
      b.textContent = v;
      b._v = v;
      b.addEventListener('click', ()=> chooseStart(b, v));
      qOptions.appendChild(b);
    });
    qOptions.hidden = false;
  } else {
    qQuestion.textContent = 'Toque em todas as vogais da palavra!';
    letters.forEach(ch=>{
      const t = document.createElement('button');
      t.className = 'vg-tile';
      t.textContent = ch;
      t.addEventListener('click', ()=> tapLetter(t, ch));
      vgWord.appendChild(t);
    });
    qOptions.hidden = true;
  }

  qProgress.textContent = `Palavra ${idx + 1} de ${words.length}`;
  qScore.textContent = `${score} pontos`;
  qCard.classList.remove('pop'); void qCard.offsetWidth; qCard.classList.add('pop');
  setArt(qArt, w.art, `Ilustração de ${w.word.toLowerCase()}`).then(()=> speak(w.word));
}

// Fácil: vogal inicial
function chooseStart(btn, v){
  if(locked) return;
  if(v === plain(current.word[0])){
    locked = true;
    btn.classList.add('right');
    const tile = vgWord.children[0];
    tile.classList.remove('gap');
    tile.classList.add('filled');
    win(tile);
  } else {
    // uma tentativa só: errou, mostra a vogal certa e segue
    locked = true;
    const v0 = plain(current.word[0]);
    missAnswer(btn, b => b._v === v0, `Ops! ${current.word} começa com <b>${v0}</b>`);
    const tile = vgWord.children[0];
    tile.classList.remove('gap');
    tile.classList.add('filled', 'missed');
    setTimeout(()=> speak(current.word), 350);
    nextTimer = setTimeout(next, MISS_DELAY);
  }
}

// Médio: caça às vogais
function tapLetter(tile, ch){
  if(locked || tile.classList.contains('found')) return;
  if(isVowel(ch)){
    tile.classList.add('found');
    speakSyllable(plain(ch));
    const left = [...vgWord.children].filter(t => isVowel(t.textContent) && !t.classList.contains('found'));
    if(!left.length){ locked = true; win(vgWord); }
  } else {
    // uma tentativa só: tocou numa consoante, perde a palavra e vê as vogais
    locked = true;
    tile.classList.add('nope');
    [...vgWord.children].forEach(t => { if(isVowel(t.textContent) && !t.classList.contains('found')) t.classList.add('found', 'reveal-vowel'); });
    ping(false);
    missToast(`Ops! <b>${ch}</b> não é vogal. As vogais estão marcadas.`);
    setTimeout(()=> speak(current.word), 350);
    nextTimer = setTimeout(next, MISS_DELAY);
  }
}

function win(anchor){
  const earned = Math.max(5, 10 - mistakes * 2);
  score += earned;
  addPoints(earned);
  qScore.textContent = `${score} pontos`;
  ping(true);
  confetti(anchor);
  collectSticker(current.word, earned);
  setTimeout(()=> speak(current.word), 350);
  nextTimer = setTimeout(next, 1700);
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

document.getElementById('qListen').addEventListener('click', ()=> current && speak(current.word));
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
initCommon('vogais');
start();
