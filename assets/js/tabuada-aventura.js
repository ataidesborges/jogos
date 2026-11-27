// ============================================================
// Tabuada Aventura
//  • Fase das contas: tabuada de somar, subtrair, multiplicar ou dividir
//    (uma tabuada do 1 ao 10, ou "Todas" misturadas). Toque no resultado.
//  • A cada 10 acertos abre a CORRIDA: o personagem escolhido corre sozinho
//    por um caminho com buracos e plataformas; a criança toca para pular
//    e pega moedinhas até a bandeira. Não dá para perder: quem cai num
//    buraco volta um pouquinho. As moedas viram pontos e uma figurinha.
//  • Personagens: Capivara, Tatu-bola e Robozinho (a criança escolhe).
// (depende de word-bank.js, shared-utils.js, math-utils.js,
//  ta-personagens.js e ta-corrida.js)
// ============================================================

const $ = id => document.getElementById(id);
const qOptions = $('qOptions'), qQuestion = $('qQuestion'), qProgress = $('qProgress'), qScore = $('qScore');
const taQuiz = $('taQuiz'), taRun = $('taRun'), taPick = $('taPick'), taExpr = $('taExpr');
const taFill = $('taFill'), taGoal = $('taGoal'), taTrackChar = $('taTrackChar');
const taCanvas = $('taCanvas'), taOverlay = $('taOverlay');

const GOAL = 10; // acertos para liberar a corrida
const SIGN = {somar:'+', subtrair:'−', multiplicar:'×', dividir:'÷'};
const SPOKEN = {somar:'mais', subtrair:'menos', multiplicar:'vezes', dividir:'dividido por'};
const CHAR_KEY = 'fp-tabuada-personagem';

const CHARS = [
  {id:'capivara', name:'Capivara'},
  {id:'tatu', name:'Tatu-bola'},
  {id:'robo', name:'Robozinho'},
];

let mode = 'somar';
let table = 1;          // tabuada escolhida (1 a 10)
let charId = null;
try{ charId = localStorage.getItem(CHAR_KEY); }catch(e){}
if(!CHARS.some(c => c.id === charId)) charId = null;

let score = 0, hits = 0, runs = 0, locked = false;
let streak = 0;            // acertos seguidos (errar zera)
let retry = [];            // contas erradas que voltam daqui a pouco: {p:[t, n], wait}
let current = null, bag = [], lastKey = '';

// ---------- estrelas das tabuadas ----------
// Para cada operação, guarda quais contas de cada tabuada a criança já
// acertou (ex.: multiplicar → tabuada do 7 → 7×1, 7×3...). Acertou as 10
// contas de uma tabuada = ganha a estrela daquele número.
const TABLE_KEY = 'fp-tabuada-progresso';
let tableProg = (()=>{ try{ return JSON.parse(localStorage.getItem(TABLE_KEY)) || {}; }catch(e){ return {}; } })();
const tableDone = (m, t) => ((tableProg[m] || {})[t] || []).length;
const isComplete = (m, t) => tableDone(m, t) >= 10;
function markProgress(m, t, n){
  tableProg[m] = tableProg[m] || {};
  const list = tableProg[m][t] = tableProg[m][t] || [];
  if(list.includes(n)) return false;
  list.push(n);
  try{ localStorage.setItem(TABLE_KEY, JSON.stringify(tableProg)); }catch(e){}
  const done = list.length === 10; // acabou de completar
  if(done && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every(t => isComplete(m, t))) setTimeout(()=> levelDone(m, 1, 1), 2500);
  return done;
}
let nextTimer = null;

// ============================================================
// Escolher personagem
// ============================================================
function renderPicker(){
  const list = $('taPickList');
  list.innerHTML = '';
  CHARS.forEach(c=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ta-pick-btn' + (c.id === charId ? ' chosen' : '');
    b.innerHTML = `<canvas width="120" height="110" aria-hidden="true"></canvas><span>${c.name}</span>`;
    b.addEventListener('click', ()=> chooseChar(c.id));
    list.appendChild(b);
    portrait(b.querySelector('canvas'), c.id, 0);
  });
}

let pickAnim = null;
function showPicker(){
  stopRun();
  clearTimeout(nextTimer);
  taQuiz.hidden = true; taRun.hidden = true; $('taShop').hidden = true; $('taMap').hidden = true; taPick.hidden = false;
  renderPicker();
  say('Quem vai correr na aventura?', 0.95);
  const t0 = performance.now();
  cancelAnimationFrame(pickAnim);
  const anim = now=>{
    if(taPick.hidden) return;
    const t = (now - t0) / 1000;
    taPick.querySelectorAll('.ta-pick-btn').forEach((b, i)=> portrait(b.querySelector('canvas'), CHARS[i].id, t, 'run'));
    pickAnim = requestAnimationFrame(anim);
  };
  pickAnim = requestAnimationFrame(anim);
}

function chooseChar(id){
  charId = id;
  try{ localStorage.setItem(CHAR_KEY, id); }catch(e){}
  const c = CHARS.find(x => x.id === id);
  ping(true);
  say(`${c.name}! Vamos lá!`, 0.95);
  cancelAnimationFrame(pickAnim);
  taPick.hidden = true;
  portrait($('taCharIcon'), id, 0);
  portrait(taTrackChar, id, 0);
  showQuiz();
}

// ============================================================
// Fase das contas
// ============================================================
function renderTables(){
  const box = $('taTables');
  box.innerHTML = '<span class="ta-tables-label">Tabuada do:</span>';
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(n=>{
    const b = document.createElement('button');
    b.type = 'button';
    const OPN = {somar:'somar', subtrair:'subtrair', multiplicar:'multiplicar', dividir:'dividir'}[mode];
    if(n === 0){
      const stars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(t => isComplete(mode, t)).length;
      b.className = 'ta-table ta-table-all' + (n === table ? ' active' : '') + (stars === 10 ? ' done' : '');
      b.innerHTML = `Todas${stars ? ` <small>★ ${stars}/10</small>` : ''}`;
      b.title = `${stars} de 10 tabuadas de ${OPN} completas`;
    } else {
      const done = tableDone(mode, n), complete = done >= 10;
      b.className = 'ta-table' + (n === table ? ' active' : '') + (complete ? ' done' : '');
      b.style.setProperty('--p', Math.min(10, done) * 10 + '%');
      b.innerHTML = `${n}${complete ? '<span class="ta-table-star" aria-hidden="true">★</span>' : ''}<i class="ta-table-bar" aria-hidden="true"></i>`;
      b.title = complete ? `Tabuada do ${n} de ${OPN}: completa! ⭐` : `Tabuada do ${n} de ${OPN}: ${done} de 10 contas acertadas`;
      b.setAttribute('aria-label', b.title);
    }
    b.setAttribute('aria-pressed', n === table);
    b.addEventListener('click', ()=>{
      table = n;
      hits = 0; streak = 0; // a trilha da corrida conta só os acertos desta tabuada
      renderTables();
      updateTrack();
      bag = []; retry = [];
      if(!taRun.hidden) return; // durante a corrida só guarda a escolha
      if(charId) showQuiz();
    });
    box.appendChild(b);
  });
}

// sorteia sem repetir: passa por todos os números de 1 a 10 antes de repetir
function nextPair(){
  // conta que a criança errou volta depois de 3 perguntas
  retry.forEach(r => r.wait--);
  const due = retry.findIndex(r => r.wait <= 0);
  if(due >= 0){
    const p = retry.splice(due, 1)[0].p;
    lastKey = `${p[0]},${p[1]}`;
    return p;
  }
  if(!bag.length){
    bag = [];
    for(let n = 1; n <= 10; n++) bag.push([table, n]);
    bag = shuffle(bag);
  }
  let p = bag.pop();
  if(`${p[0]},${p[1]}` === lastKey && bag.length){ bag.unshift(p); p = bag.pop(); }
  lastKey = `${p[0]},${p[1]}`;
  return p;
}

function makeProblem(){
  const pair = nextPair();
  const [t, n] = pair;
  // a tabuada do t: t+n, (t+n)−t, t×n, (t×n)÷t
  if(mode === 'somar') return {a:t, b:n, answer:t + n, pair};
  if(mode === 'subtrair') return {a:t + n, b:t, answer:n, pair};
  if(mode === 'multiplicar') return {a:t, b:n, answer:t * n, pair};
  return {a:t * n, b:t, answer:n, pair};
}

// opções: a certa + erros comuns (vizinhos e "uma vez a mais/a menos")
function optionsFor(p){
  const set = new Set([p.answer]);
  const cand = [];
  if(mode === 'multiplicar') cand.push(p.answer + p.a, p.answer - p.a, p.answer + p.b, p.answer - p.b);
  cand.push(p.answer + 1, p.answer - 1, p.answer + 2, p.answer - 2, p.answer + 10, p.answer + 3);
  for(const v of shuffle(cand)){
    if(set.size >= 4) break;
    if(v >= 0 && v !== p.answer) set.add(v);
  }
  let k = 1;
  while(set.size < 4) set.add(p.answer + 3 + k++);
  return shuffle([...set]);
}

function showQuiz(){
  stopRun();
  taPick.hidden = true; taRun.hidden = true; $('taShop').hidden = true; $('taMap').hidden = true; taQuiz.hidden = false;
  updateTrack();
  loadProblem();
}

function updateTrack(){
  const pct = 100 * hits / GOAL;
  taFill.style.width = pct + '%';
  taTrackChar.style.left = `calc(${pct}% * .9)`;
  const left = GOAL - hits;
  taGoal.innerHTML = (left === 1 ? 'Só mais 1 acerto para a corrida!' : `Faltam ${left} acertos para a corrida!`)
    + (streak >= 2 ? ` <span class="ta-streak">🔥 ${streak} seguidas</span>` : '');
  qProgress.textContent = `🏁 ${runs} ${runs === 1 ? 'corrida' : 'corridas'}`;
  qScore.textContent = `${score} pontos`;
}

function loadProblem(){
  clearTimeout(nextTimer);
  locked = false;
  const p = current = makeProblem();
  taExpr.innerHTML = `<span>${p.a}</span><span class="op">${SIGN[mode]}</span><span>${p.b}</span><span class="op">=</span><span class="ans">?</span>`;
  qQuestion.textContent = 'Qual é o resultado?';
  qOptions.classList.remove('answered');
  renderNumberOptions(qOptions, optionsFor(p), choose);
  setTimeout(readAloud, 250);
}

function readAloud(force){
  if(current && !taQuiz.hidden) say(`${current.a} ${SPOKEN[mode]} ${current.b}`, 0.85, force === true);
}

// Uma tentativa só: acertou = 10 pontos (e a cada 5 seguidas, +10 de bônus);
// errou = 0 ponto, não conta para a corrida, mostra a resposta certa e a
// conta volta daqui a pouco. Assim não adianta sair tocando em tudo.
function choose(btn, v){
  if(locked) return;
  locked = true;
  qOptions.classList.add('answered');
  const ans = taExpr.querySelector('.ans');
  ans.textContent = current.answer;
  if(v === current.answer){
    btn.classList.add('right');
    ans.classList.add('done');
    streak++;
    let earned = 10;
    const bonus = streak % 5 === 0;
    if(bonus) earned += 10;
    score += earned;
    addPoints(earned);
    hits++;
    updateTrack();
    ping(true);
    confetti(taExpr);
    // estrela da tabuada (a tabuada da conta é current.pair[0])
    const [tt, nn] = current.pair;
    const justDone = markProgress(mode, tt, nn);
    renderTables();
    if(justDone){
      const OPN = {somar:'somar', subtrair:'subtrair', multiplicar:'multiplicar', dividir:'dividir'}[mode];
      qQuestion.textContent = `⭐ Você completou a tabuada do ${tt} de ${OPN}!`;
      say(`Parabéns! Você completou a tabuada do ${tt} de ${OPN}! Ganhou uma estrela!`, 0.95);
      starBurst(tt);
    } else if(bonus){
      qQuestion.textContent = `🔥 ${streak} seguidas! +10 pontos de bônus!`;
      say(`${current.a} ${SPOKEN[mode]} ${current.b}, igual a ${v}! ${streak} seguidas, bônus!`, 0.95);
    } else {
      qQuestion.textContent = 'Muito bem! ✓';
      say(`${current.a} ${SPOKEN[mode]} ${current.b}, igual a ${v}!`, 0.9);
    }
    const wait = justDone ? 3400 : 0;
    if(hits >= GOAL) nextTimer = setTimeout(()=>{ hits = 0; updateTrack(); earnToken(); }, 1900 + wait);
    else nextTimer = setTimeout(loadProblem, 1700 + wait);
  } else {
    btn.classList.add('wrong');
    ans.classList.add('done', 'missed');
    [...qOptions.children].forEach(b => { if(+b.textContent === current.answer) b.classList.add('right', 'ta-certa'); });
    const lost = streak;
    streak = 0;
    updateTrack();
    ping(false);
    qQuestion.textContent = `Ops! A resposta é ${current.answer}. Essa conta vai voltar daqui a pouco.`;
    say(`Ops! ${current.a} ${SPOKEN[mode]} ${current.b} é igual a ${current.answer}.`, 0.9);
    if(lost >= 3) taGoal.innerHTML += ` <span class="ta-streak lost">sequência de ${lost} perdida</span>`;
    // a mesma conta volta depois de 3 perguntas (se ainda não estiver na fila)
    const key = current.pair.join(',');
    if(!retry.some(r => r.p.join(',') === key)) retry.push({p:current.pair, wait:3});
    nextTimer = setTimeout(loadProblem, 3200);
  }
}

// estrela voando até o botão da tabuada completada
function starBurst(t){
  const chip = [...document.querySelectorAll('.ta-table')].find(b => b.textContent.trim().startsWith(String(t)) && !b.classList.contains('ta-table-all'));
  const from = taExpr.getBoundingClientRect();
  const s = document.createElement('div');
  s.className = 'ta-star-fly';
  s.textContent = '⭐';
  s.style.left = (from.left + from.width / 2) + 'px';
  s.style.top = (from.top + from.height / 2) + 'px';
  overlayRoot().appendChild(s);
  confetti(taExpr);
  tone && tone([784, 988, 1175, 1568], .6, 'triangle', .07);
  requestAnimationFrame(()=>{
    if(chip){
      const to = chip.getBoundingClientRect();
      s.style.left = (to.left + to.width / 2) + 'px';
      s.style.top = (to.top + to.height / 2) + 'px';
    }
    s.classList.add('go');
  });
  setTimeout(()=>{ s.remove(); if(chip){ chip.classList.add('pop'); confetti(chip); } }, 1300);
}

// A corrida está em ta-corrida.js e os personagens em ta-personagens.js

// ---------- botões do topo ----------
document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.level;
    hits = 0; streak = 0; // trocou de operação: a trilha recomeça
    updateTrack();
    bag = []; retry = [];
    renderTables();
    if(!taRun.hidden) return; // não interrompe a corrida
    if(charId) showQuiz();
  });
});
$('taCharBtn').addEventListener('click', ()=>{ if(taRun.hidden) showPicker(); });
$('qListen').addEventListener('click', ()=> readAloud(true)); // pediu para ouvir: fala mesmo sem voz

// ---------- Init ----------
initCommon('tabuada-aventura');
setupRunControls();
setupShop();
setupMap();
renderTables();
if(charId){
  portrait($('taCharIcon'), charId, 0);
  portrait(taTrackChar, charId, 0);
  showQuiz();
} else {
  portrait($('taCharIcon'), 'capivara', 0);
  showPicker();
}
