// ============================================================
// Frações com Pizza (3º ao 5º ano)
//  • Qual fração? A pizza aparece dividida em pedaços, alguns com
//    recheio; a criança escolhe a fração certa (ex.: 3/8).
//  • Qual pizza? Aparece a fração e a criança escolhe a pizza certa.
// A voz fala a fração ("três oitavos"). 10 rodadas por jogo.
// (depende de word-bank.js, shared-utils.js e math-utils.js)
// ============================================================

const qStage = document.getElementById('qStage');
const frMain = document.getElementById('frMain');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 10;
const NUMS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito'];
const PARTS = {2:'meio', 3:'terço', 4:'quarto', 5:'quinto', 6:'sexto', 7:'sétimo', 8:'oitavo'};
const fracName = (k, n) => `${NUMS[k]} ${PARTS[n]}${k > 1 ? 's' : ''}`;
const fracHTML = (k, n) => `<span class="frac"><span>${k}</span><span>${n}</span></span>`;

// desenha uma pizza dividida em n pedaços, com k pedaços de recheio
function pizzaSVG(k, n){
  const r = 46, cx = 50, cy = 50;
  let slices = '';
  for(let i = 0; i < n; i++){
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const filled = i < k;
    slices += `<path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" class="${filled ? 'fr-on' : 'fr-off'}"/>`;
    if(filled){
      // pontinhos de "calabresa" no pedaço
      const am = (a0 + a1) / 2;
      [0.45, 0.72].forEach((d, j)=>{
        const px = cx + r * d * Math.cos(am + (j ? .12 : -.1)), py = cy + r * d * Math.sin(am + (j ? .12 : -.1));
        slices += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${n > 6 ? 3 : 4}" class="fr-pep"/>`;
      });
    }
  }
  return `<svg viewBox="0 0 100 100" class="fr-pizza" aria-hidden="true"><circle cx="50" cy="50" r="49" class="fr-crust"/>${slices}</svg>`;
}

let mode = 'facil';
let idx = 0, score = 0, tries = 0, locked = false;
let current = null, lastKey = '';
let nextTimer = null;

function makeFrac(){
  let n, k;
  for(let t = 0; t < 20; t++){
    n = randInt(2, 8); k = randInt(1, n - 1);
    if(`${k}/${n}` !== lastKey) break;
  }
  lastKey = `${k}/${n}`;
  return {k, n};
}

// frações parecidas para as opções erradas (o que não está pintado, um pedaço a mais/menos, outro número de pedaços)
function wrongFracs(k, n, howMany){
  const cands = [[n - k, n], [k + 1, n], [k - 1, n], [k, n + 1], [k, n - 1], [k + 2, n], [n - k + 1, n]]
    .filter(([a, b]) => b >= 2 && b <= 8 && a >= 1 && a < b && !(a === k && b === n));
  const uniq = [];
  const ok = c => !uniq.some(u => u[0] === c[0] && u[1] === c[1]) && c[0] * n !== k * c[1]; // sem frações equivalentes (2/4 = 1/2)
  cands.forEach(c => { if(ok(c)) uniq.push(c); });
  let picked = shuffle(uniq).slice(0, howMany);
  // se faltar opção (ex.: 1/2), completa com outras frações quaisquer
  for(let t = 0; picked.length < howMany && t < 200; t++){
    const b = randInt(2, 8), a = randInt(1, b - 1);
    if(!picked.some(u => u[0] === a && u[1] === b) && a * n !== k * b) picked.push([a, b]);
  }
  return picked;
}

function start(){
  clearTimeout(nextTimer);
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  load();
}

function load(){
  locked = false; tries = 0;
  const {k, n} = current = makeFrac();
  const options = shuffle([[k, n], ...wrongFracs(k, n, 3)]);
  qOptions.innerHTML = '';
  if(mode === 'facil'){
    frMain.innerHTML = pizzaSVG(k, n);
    qQuestion.textContent = 'Que fração da pizza tem recheio?';
    options.forEach(([a, b])=>{
      const btn = document.createElement('button');
      btn.className = 'q-opt fr-opt';
      btn.innerHTML = fracHTML(a, b);
      btn.addEventListener('click', ()=> choose(btn, a, b));
      qOptions.appendChild(btn);
    });
  } else {
    frMain.innerHTML = `<div class="fr-big">${fracHTML(k, n)}</div>`;
    qQuestion.textContent = `Qual pizza mostra ${k}/${n} com recheio?`;
    options.forEach(([a, b])=>{
      const btn = document.createElement('button');
      btn.className = 'fr-pick';
      btn.innerHTML = pizzaSVG(a, b);
      btn.addEventListener('click', ()=> choose(btn, a, b));
      qOptions.appendChild(btn);
    });
    say(fracName(k, n), 0.85);
  }
  qOptions.classList.toggle('pizzas', mode === 'medio');
  qProgress.textContent = `Rodada ${idx + 1} de ${ROUNDS}`;
  qScore.textContent = `${score} pontos`;
}

function choose(btn, a, b){
  if(locked) return;
  if(a === current.k && b === current.n){
    locked = true;
    btn.classList.add('right');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    addPoints(earned);
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(btn);
    if(tries === 0) rewardSticker(null, earned);
    say(fracName(current.k, current.n), 0.85);
    qQuestion.innerHTML = `✔ ${current.k} de ${current.n} pedaços = ${fracHTML(current.k, current.n)} (${fracName(current.k, current.n)})`;
    nextTimer = setTimeout(next, 2400);
  } else {
    tries++;
    btn.classList.add('wrong');
    ping(false);
    qQuestion.textContent = 'Dica: o número de baixo é o total de pedaços; o de cima, os pedaços com recheio.';
  }
}

function next(){
  idx++;
  if(idx >= ROUNDS) finish();
  else load();
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
    mode = btn.dataset.level;
    start();
  });
});
document.getElementById('qNewBtn').addEventListener('click', start);
document.getElementById('qAgainBtn').addEventListener('click', start);

// ---------- Init ----------
initCommon('fracoes');
start();
