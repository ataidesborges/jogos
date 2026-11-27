// ============================================================
// Tabuada Aventura: HISTÓRIA, MAPA e PROGRESSO
//  "Tio Tatá e o Livro das Tabuadas": o Besouro de Fogo roubou o Livro
//  Mágico das Tabuadas e espalhou as 10 páginas pelo mundo. A capivara,
//  o tatu-bola e o robozinho partem para recuperar as páginas.
//  • A cada 10 contas certas a criança ganha 1 FICHA para jogar uma fase.
//  • O MAPA mostra os mundos, as fases feitas, estrelas e páginas.
//  • Cenas curtas (balões de fala) contam a história entre as fases.
// (usa ta-corrida.js e ta-fases.js; variáveis do jogo em tabuada-aventura.js)
// ============================================================

const MAP_KEY = 'fp-tabuada-mapa';
const TOKEN_KEY = 'fp-tabuada-fichas';
let mapProg = (()=>{ try{ return JSON.parse(localStorage.getItem(MAP_KEY)) || {done:{}}; }catch(e){ return {done:{}}; } })();
let tokens = +(localStorage.getItem(TOKEN_KEY) || 0);
const saveMap = () => { try{ localStorage.setItem(MAP_KEY, JSON.stringify(mapProg)); }catch(e){} };
const saveTokens = () => { try{ localStorage.setItem(TOKEN_KEY, tokens); }catch(e){} renderTokens(); };
function renderTokens(){ document.querySelectorAll('[data-tokens]').forEach(el => el.textContent = tokens); }

// mundos e fases (os mundos 2 a 5 chegam nas próximas etapas)
const WORLDS = [
  {id:1, name:'Floresta', icon:'🌳', color:'#16A34A', levels:['1-1', '1-2']},
  {id:2, name:'Praia', icon:'🏖️', color:'#0EA5E9', levels:['2-1', '2-2']},
  {id:3, name:'Montanha de Neve', icon:'🏔️', color:'#64748B', levels:['3-1', '3-2', '3-3']},
  {id:4, name:'Caverna', icon:'🕯️', color:'#7C3AED', levels:['4-1', '4-2']},
  {id:5, name:'Vulcão', icon:'🌋', color:'#DC2626', levels:['5-1', '5-2', 'chefe']},
];
const ALL_LEVEL_IDS = WORLDS.flatMap(w => w.levels);
const levelReady = id => !!(window.LEVEL_DEFS && LEVEL_DEFS[id]);
function levelUnlocked(id){
  const i = ALL_LEVEL_IDS.indexOf(id);
  if(i <= 0) return levelReady(id);
  return levelReady(id) && !!mapProg.done[ALL_LEVEL_IDS[i - 1]];
}
const pagesFound = () => Object.values(mapProg.done).filter(d => d.page).length;
const nextLevel = () => ALL_LEVEL_IDS.find(id => levelUnlocked(id) && !mapProg.done[id]);

// ganhou uma ficha (10 contas certas)
function earnToken(){
  tokens++;
  saveTokens();
  showMap('ganhou');
}

// ---------- história (balões de fala) ----------
const TATA_IMG = 'assets/images/tio-tata-rosto.webp';
const STORY = {
  intro:[
    {who:'vilao', text:'Ha ha ha! Roubei o Livro das Tabuadas do Tio Tatá e espalhei as 10 páginas pelo mundo!'},
    {who:'tata', text:'Me ajude a recuperar as páginas! A cada 10 contas certas, você ganha uma ficha para jogar uma fase.'},
  ],
  'antes-1-1':[{who:'tata', text:'Ache os 3 filhotes perdidos para abrir o portão da floresta!'}],
  'depois-1-1':[{who:'tata', text:'Filhotes salvos! O Besouro fugiu para o Ninho das Abelhas.'}],
  'antes-1-2':[{who:'tata', text:'Cuidado com as abelhas, as pedras que caem e as bolas de espinho!'}],
  'depois-1-2':[{who:'vilao', text:'Grrr! Vocês nunca vão me pegar no fundo do mar!'}],
  'antes-2-1':[{who:'tata', text:'Pegue a máscara de mergulho 🤿 e nade até o fundo do mar!'}],
  'depois-2-1':[{who:'tata', text:'Muito bem! Agora o recife perigoso nos espera.'}],
  'antes-2-2':[{who:'tata', text:'O recife é cheio de peixes e águas-vivas. Nade com cuidado!'}],
  'depois-2-2':[{who:'vilao', text:'Ainda tenho muitas páginas... e a Montanha de Neve vai congelar vocês!'}],
  'antes-3-1':[{who:'tata', text:'Na montanha o chão de gelo escorrega. Cuidado com os pingentes e o vento!'}],
  'depois-3-1':[{who:'tata', text:'Muito bem! Agora, todos para o trenó!'}],
  'antes-3-2':[{who:'tata', text:'Desça de trenó só pulando. Depois... corra da bola de neve gigante!'}],
  'depois-3-2':[{who:'vilao', text:'Vou fugir voando! Ninguém me alcança nas nuvens!'}],
  'antes-3-3':[{who:'tata', text:'Pegue o aviãozinho e voe atrás do Besouro! Segure PULAR para subir.'}],
  'depois-3-3':[{who:'tata', text:'O Besouro se escondeu numa caverna escura... vamos atrás dele!'}],
};

let storyEl = null;
function showStory(key, onDone){
  const lines = STORY[key];
  if(!lines){ onDone && onDone(); return; }
  closeStory();
  let i = 0;
  storyEl = document.createElement('div');
  storyEl.className = 'ta-story';
  storyEl.setAttribute('role', 'dialog');
  storyEl.setAttribute('aria-modal', 'true');
  overlayRoot().appendChild(storyEl);
  const paint = ()=>{
    const l = lines[i];
    const isVilao = l.who === 'vilao';
    storyEl.innerHTML = `<div class="ta-story-box ${isVilao ? 'vilao' : 'tata'}">
        <div class="ta-story-face">${isVilao ? '<span class="ta-vilao-face" aria-hidden="true">🐞</span>' : `<img src="${TATA_IMG}" alt="">`}</div>
        <div class="ta-story-talk">
          <b>${isVilao ? 'Besouro de Fogo' : 'Tio Tatá'}</b>
          <p>${l.text}</p>
          <div class="ta-story-btns">
            <button type="button" class="ta-story-skip">Pular história</button>
            <button type="button" class="m-new-btn ta-story-next">${i < lines.length - 1 ? 'Continuar ▶' : 'Vamos lá! ▶'}</button>
          </div>
        </div>
        <div class="ta-story-dots">${lines.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      </div>`;
    storyEl.querySelector('.ta-story-next').addEventListener('click', ()=>{ i++; if(i >= lines.length) finish(); else paint(); });
    storyEl.querySelector('.ta-story-skip').addEventListener('click', finish);
    say(l.text, isVilao ? 0.9 : 0.95);
  };
  const finish = ()=>{ closeStory(); if('speechSynthesis' in window) speechSynthesis.cancel(); onDone && onDone(); };
  paint();
}
function closeStory(){ if(storyEl){ storyEl.remove(); storyEl = null; } }

// ---------- mapa da aventura ----------
function showMap(reason){
  stopRun();
  clearTimeout(nextTimer);
  taQuiz.hidden = true; taPick.hidden = true; taRun.hidden = true; $('taShop').hidden = true;
  $('taMap').hidden = false;
  renderMap(reason);
  if(!mapProg.intro){
    mapProg.intro = true; saveMap();
    showStory('intro');
  } else if(reason === 'ganhou'){
    say('Você ganhou uma ficha! Escolha uma fase no mapa.', 0.95);
  }
}
function hideMap(){ $('taMap').hidden = true; }

function renderMap(reason){
  renderTokens();
  $('taMapPages').textContent = `${pagesFound()} de 10`;
  $('taMapMsg').innerHTML = tokens
    ? `🎟️ Você tem <b>${tokens}</b> ${tokens === 1 ? 'ficha' : 'fichas'}. Escolha uma fase para jogar!`
    : `Acerte <b>10 contas</b> para ganhar uma ficha e jogar uma fase.`;
  $('taMapMsg').classList.toggle('has', tokens > 0);
  const box = $('taMapWorlds');
  box.innerHTML = '';
  const nxt = nextLevel();
  WORLDS.forEach(w=>{
    const ready = w.levels.some(levelReady);
    const div = document.createElement('div');
    div.className = 'ta-world' + (ready ? '' : ' soon');
    div.style.setProperty('--wc', w.color);
    div.innerHTML = `<div class="ta-world-head"><span class="ta-world-icon">${w.icon}</span><b>Mundo ${w.id}: ${w.name}</b>${ready ? '' : '<em>Em breve</em>'}</div><div class="ta-world-levels"></div>`;
    const lv = div.querySelector('.ta-world-levels');
    w.levels.forEach(id=>{
      const def = window.LEVEL_DEFS && LEVEL_DEFS[id];
      const done = mapProg.done[id];
      const open = levelUnlocked(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ta-node' + (done ? ' done' : '') + (open ? '' : ' locked') + (id === nxt ? ' next' : '');
      b.disabled = !open;
      const stars = [0, 1, 2].map(k => `<i class="${done && done.stars > k ? 'on' : ''}">★</i>`).join('');
      b.innerHTML = `<span class="ta-node-num">${id === 'chefe' ? '👑' : id}</span>
        <span class="ta-node-name">${def ? def.name : '???'}</span>
        <span class="ta-node-stars">${stars}${done && done.page ? '<b class="ta-node-page" title="Página encontrada">📜</b>' : ''}</span>
        ${open ? '' : '<span class="ta-node-lock" aria-hidden="true">🔒</span>'}`;
      b.addEventListener('click', ()=> playLevel(id));
      lv.appendChild(b);
    });
    box.appendChild(div);
  });
  // corrida livre: as fases sorteadas de antes
  const free = document.createElement('button');
  free.type = 'button';
  free.className = 'ta-node free';
  free.innerHTML = '<span class="ta-node-num">🎲</span><span class="ta-node-name">Corrida livre</span><span class="ta-node-stars"><small>fases sorteadas</small></span>';
  free.addEventListener('click', ()=> playLevel(null));
  box.appendChild(free);
}

function playLevel(id){
  if(tokens <= 0){
    missToast('Acerte 10 contas para ganhar uma ficha 🎟️');
    say('Acerte 10 contas para ganhar uma ficha!', 0.95);
    return;
  }
  tokens--; saveTokens();
  hideMap();
  const go = ()=> openRun(id);
  if(id && !mapProg.done[id] && STORY['antes-' + id]) showStory('antes-' + id, go);
  else go();
}

// chamada pela corrida quando a fase termina
function levelFinished(id, starsGot, page){
  if(!id) return;
  const was = mapProg.done[id] || {stars:0, page:false};
  const first = !mapProg.done[id];
  mapProg.done[id] = {stars:Math.max(was.stars, starsGot), page:was.page || page};
  saveMap();
  return first;
}

function setupMap(){
  $('taMapBtn').addEventListener('click', ()=>{ if(taRun.hidden) showMap(); });
  $('taMapBack').addEventListener('click', ()=>{ hideMap(); if(charId) showQuiz(); else showPicker(); });
  renderTokens();
}
