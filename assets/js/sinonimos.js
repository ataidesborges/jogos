// ============================================================
// Sinônimos e Antônimos (3º ao 5º ano) — a palavra aparece e a criança
// escolhe, entre 4, a de MESMO sentido (sinônimo) ou de sentido
// CONTRÁRIO (antônimo). 10 palavras por jogo.
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const txRule = document.getElementById('txRule');
const txWord = document.getElementById('txWord');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const PAIRS = {
  sinonimo: [
    ['FELIZ', 'ALEGRE'], ['BONITO', 'BELO'], ['RÁPIDO', 'VELOZ'], ['CASA', 'LAR'], ['COMEÇAR', 'INICIAR'],
    ['GRANDE', 'ENORME'], ['LONGE', 'DISTANTE'], ['PERTO', 'PRÓXIMO'], ['ACABAR', 'TERMINAR'], ['CARRO', 'AUTOMÓVEL'],
    ['BRAVO', 'ZANGADO'], ['MEDO', 'PAVOR'], ['CALMO', 'TRANQUILO'], ['DEVAGAR', 'LENTAMENTE'], ['GOSTOSO', 'SABOROSO'],
    ['AJUDAR', 'AUXILIAR'], ['ACHAR', 'ENCONTRAR'], ['ALUNO', 'ESTUDANTE'], ['BARULHO', 'RUÍDO'], ['ESPERTO', 'INTELIGENTE'],
    ['FALAR', 'DIZER'], ['CHEIROSO', 'PERFUMADO'], ['MORAR', 'RESIDIR'], ['OLHAR', 'OBSERVAR'], ['CORAJOSO', 'VALENTE'],
  ],
  antonimo: [
    ['ALTO', 'BAIXO'], ['QUENTE', 'FRIO'], ['FELIZ', 'TRISTE'], ['GRANDE', 'PEQUENO'], ['CLARO', 'ESCURO'],
    ['CHEIO', 'VAZIO'], ['RÁPIDO', 'LENTO'], ['ABRIR', 'FECHAR'], ['ENTRAR', 'SAIR'], ['DIA', 'NOITE'],
    ['RICO', 'POBRE'], ['FORTE', 'FRACO'], ['NOVO', 'VELHO'], ['LIMPO', 'SUJO'], ['CEDO', 'TARDE'],
    ['PERTO', 'LONGE'], ['SUBIR', 'DESCER'], ['COMPRAR', 'VENDER'], ['GANHAR', 'PERDER'], ['MOLE', 'DURO'],
    ['DOCE', 'AMARGO'], ['SEMPRE', 'NUNCA'], ['MOLHADO', 'SECO'], ['LEVE', 'PESADO'], ['LARGO', 'ESTREITO'],
    ['ACORDAR', 'DORMIR'], ['COMEÇO', 'FIM'], ['GORDO', 'MAGRO'],
  ],
};
const ROUNDS = 10;

let mode = 'sinonimo';
let rounds = [], idx = 0, score = 0, tries = 0, locked = false;
let current = null;
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  // a palavra pode aparecer dos dois lados do par (FELIZ → ALEGRE ou ALEGRE → FELIZ)
  rounds = shuffle([...PAIRS[mode]]).slice(0, ROUNDS).map(([a, b]) => Math.random() < .5 ? {word:a, answer:b} : {word:b, answer:a});
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  load();
}

function load(){
  locked = false; tries = 0;
  const r = current = rounds[idx];
  // opções erradas: palavras de outros pares (nunca do mesmo par)
  const others = PAIRS[mode].filter(p => !p.includes(r.word) && !p.includes(r.answer)).flat();
  const opts = shuffle([r.answer, ...shuffle([...new Set(others)]).slice(0, 3)]);
  txRule.textContent = mode === 'sinonimo' ? 'Sinônimo = mesmo sentido' : 'Antônimo = sentido contrário';
  txWord.textContent = r.word;
  qQuestion.textContent = mode === 'sinonimo' ? `Qual palavra tem o MESMO sentido de "${r.word}"?` : `Qual é o CONTRÁRIO de "${r.word}"?`;
  qOptions.innerHTML = '';
  opts.forEach(o=>{
    const b = document.createElement('button');
    b.className = 'tx-choice';
    b.textContent = o;
    b.addEventListener('click', ()=> choose(b, o));
    qOptions.appendChild(b);
  });
  qProgress.textContent = `Palavra ${idx + 1} de ${rounds.length}`;
  qScore.textContent = `${score} pontos`;
  speak(r.word);
}

function choose(btn, o){
  if(locked) return;
  if(o === current.answer){
    locked = true;
    btn.classList.add('right');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    addPoints(earned);
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(btn);
    if(tries === 0) rewardSticker(null, earned);
    say(`${current.word.toLocaleLowerCase('pt-BR')}... ${o.toLocaleLowerCase('pt-BR')}`, 0.85);
    qQuestion.textContent = mode === 'sinonimo' ? `✔ ${current.word} = ${o}` : `✔ ${current.word} × ${o}`;
    nextTimer = setTimeout(next, 2000);
  } else {
    tries++;
    btn.classList.add('wrong');
    ping(false);
  }
}

function next(){
  idx++;
  if(idx >= rounds.length) finish();
  else load();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${rounds.length} palavras!`;
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
initCommon('sinonimos');
start();
