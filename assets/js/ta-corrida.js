// ============================================================
// Tabuada Aventura: a CORRIDA (minigame de plataforma)
//  A criança anda com as setas ◀ ▶ (botões transparentes na tela ou
//  setas do teclado) e pula com o botão de pular / espaço
//  (segurar = pulo mais alto; apertar de novo no ar = pulo duplo).
//  Cada fase tem: buracos, degraus, plataformas, pedras que sobem e
//  descem, espinhos, bichinhos (pule em cima!), molas, blocos "?" e
//  3 estrelas escondidas. Comidas mudam o tamanho do personagem:
//  🍇 uva = pequeno (passa nos túneis baixos), 🍎 maçã = normal,
//  🍉 melancia = gigante (quebra paredões e amassa os bichinhos).
//  A cada corrida a fase fica um pouco maior
//  e mais difícil (até a Fase 5) e o cenário muda.
//  Não dá para perder: quem cai volta um pouquinho; quem encosta num
//  bichinho ou espinho perde algumas moedas e fica piscando.
// (usa as variáveis e funções de tabuada-aventura.js)
// ============================================================

const W = 800, H = 400, GY = 318;      // tamanho lógico e altura do chão
const GRAV = 2000, JUMP_V = 770, DJUMP_V = 690, SPRING_V = 1130;
const PW0 = 15, PH0 = 44;               // meia largura e altura do personagem (tamanho normal)
const SIZES = {small:.62, normal:1, big:1.6};
const FOOD = {small:{name:'uva', emoji:'🍇', msg:'Ficou pequenininho! 🍇'}, normal:{name:'maçã', emoji:'🍎', msg:'Tamanho normal 🍎'}, big:{name:'melancia', emoji:'🍉', msg:'Ficou GIGANTE! 🍉'}};
const CAM_X = 210;                      // onde o personagem fica na tela

const THEMES = [
  {name:'Floresta', sky:['#5EC8F2', '#DFF4FF'], far:'#9FDDB4', mid:'#5FBF7A', grass:'#4CC35A', grass2:'#2E9A44', dirt:'#A0582A', dirt2:'#7C3F1A', rock:'#C9824C',
   deco:'tree', enemy:'besouro', flyer:'abelha', spike:'#2F7D32', spring:'cogumelo', weather:'folhas', plat:'madeira'},
  {name:'Praia', sky:['#35B6F0', '#FFF1C9'], far:'#8ED8F8', mid:'#2AA7E0', grass:'#FCD879', grass2:'#E9B44C', dirt:'#E4A64B', dirt2:'#C98530', rock:'#F6CF85',
   deco:'palm', enemy:'caranguejo', flyer:'abelha', spike:'#7C3AED', spring:'mola', weather:'', plat:'madeira'},
  {name:'Neve', sky:['#9ED8F5', '#F4FAFF'], far:'#DCE8F4', mid:'#B9CCE0', grass:'#FFFFFF', grass2:'#D6E6F5', dirt:'#7DA7D9', dirt2:'#5B86BC', rock:'#A9C7EA',
   deco:'pine', enemy:'bolota', flyer:'abelha', spike:'#7DD3FC', spring:'mola', weather:'neve', plat:'gelo'},
  {name:'Noite', sky:['#141238', '#3C3399'], far:'#2B2A6B', mid:'#22215A', grass:'#5BAF3A', grass2:'#3F8A28', dirt:'#4A2A16', dirt2:'#341C0D', rock:'#5E3B22',
   deco:'night', enemy:'besouro', flyer:'morcego', spike:'#9333EA', spring:'cogumelo', weather:'vagalumes', plat:'pedra', dark:true},
  {name:'Vulcão', sky:['#2A0A0A', '#9A3412'], far:'#5B1A12', mid:'#3B1008', grass:'#78716C', grass2:'#57534E', dirt:'#3A2F2A', dirt2:'#1C1917', rock:'#7C2D12',
   deco:'vulcao', enemy:'besouro', flyer:'morcego', spike:'#EA580C', spring:'mola', weather:'cinzas', plat:'pedra', lava:true},
];
// o desafio especial de cada fase
const PHASE_TIPS = {
  1:'Plataformas secretas! Pegue a estrela-chave ✨ para o caminho aparecer.',
  2:'Pontes que caem! Não fique parado em cima da madeira.',
  3:'Chão de gelo escorrega! E pule as bolas de neve que vêm rolando.',
  4:'Está escuro! Encoste nas lanternas 🏮 para acender a luz.',
  5:'Vulcão! Pule nas pedras quando aparecerem e fuja dos jatos de lava.',
};

let run = null, rafId = 0, ctx = null;
let jumpHeld = false;
const input = {left:false, right:false}; // setas apertadas

function setupCanvas(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  taCanvas.width = W * dpr; taCanvas.height = H * dpr;
  ctx = taCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ============================================================
// Montagem da fase (pedaços sorteados)
// ============================================================
function buildLevel(d, ph){
  ph = ph || 1;
  const L = {solids:[], plats:[], coins:[], stars:[], enemies:[], spikes:[], springs:[], decos:[], starSpots:[], foods:[], signs:[], keys:[], rollSpawns:[], rollers:[], lamps:[], jets:[], checks:[], hearts:[], cubs:[], pages:[], bushes:[], textSigns:[], doors:[], waters:[], masks:[], crushers:[], spinners:[], icicles:[], winds:[], sleds:[], chasers:[], planes:[], storms:[]};
  const R = randInt;
  const ground = (x0, x1, top)=>{
    top = top || GY;
    const last = [...L.solids].reverse().find(q => q.type === 'ground');
    if(last && last.top === top && Math.abs(last.x1 - x0) < 1){ last.x1 = x1; return last; }
    const s = {x0, x1, top, bottom:9999, type:'ground'};
    L.solids.push(s); return s;
  };
  const coin = (x, y) => L.coins.push({x, y});
  const row = (x, y, n, dx) => { for(let k = 0; k < n; k++) coin(x + k * (dx || 36), y); };
  const arc = (x0, x1, y, h, n) => { for(let k = 0; k < n; k++){ const f = k / (n - 1); coin(x0 + (x1 - x0) * f, y - Math.sin(f * Math.PI) * h); } };
  const enemy = (x, minX, maxX, flying) => L.enemies.push({x, y:GY, minX, maxX, dir:-1, speed:flying ? 0 : 45 + d * 10, alive:true, flying:!!flying, baseY:GY - 85, ph:Math.random() * 6, dead:0});

  const speed = 225 + d * 11;
  const LEN = 11000 + d * 1100;
  ground(-400, 760);
  row(380, GY - 36, 5);
  let x = 760, last = '';

  // pedaços da fase: cada um começa no fim do chão (altura GY) e devolve onde termina
  const CH = {
    buraco(){
      const g = R(85, 100 + d * 14);
      arc(x + 4, x + g - 4, GY - 46, 70, 5);
      x += g;
      const len = R(300, 440);
      ground(x, x + len);
      if(d >= 2 && Math.random() < .4) enemy(x + len - 90, x + 120, x + len - 30);
      else row(x + 80, GY - 36, 4);
      x += len;
    },
    bichinho(){
      const len = R(460, 600);
      ground(x, x + len);
      enemy(x + len - 120, x + 170, x + len - 40);
      if(d >= 3) enemy(x + len * .45, x + 120, x + len * .6);
      arc(x + 140, x + len - 120, GY - 60, 90, 6);
      x += len;
    },
    degrau(){
      ground(x, x + 140);
      const up = d >= 3 && Math.random() < .6 ? 2 : 1;
      let cx = x + 140;
      for(let k = 1; k <= up; k++){
        const len = R(180, 260);
        ground(cx, cx + len, GY - 52 * k);
        row(cx + 40, GY - 52 * k - 36, 3);
        cx += len;
      }
      const len = R(220, 320);
      ground(cx, cx + len);
      if(d >= 2 && Math.random() < .5) enemy(cx + len - 60, cx + 60, cx + len - 20);
      x = cx + len;
    },
    escada(){ // plataformas por cima de um buraco grande
      const y1 = GY - R(55, 70), y2 = GY - R(115, 135);
      L.plats.push({x0:x + 70, x1:x + 200, y:y1});
      row(x + 95, y1 - 34, 3);
      L.plats.push({x0:x + 280, x1:x + 410, y:y2});
      row(x + 305, y2 - 34, 3);
      L.starSpots.push({x:x + 345, y:y2 - 165}); // só com pulo duplo
      x += 490;
      const len = R(300, 400);
      ground(x, x + len);
      row(x + 60, GY - 36, 4);
      x += len;
    },
    pedras(){ // pedras que sobem e descem
      const n = d >= 4 ? 4 : 3;
      let cx = x + 85;
      for(let k = 0; k < n; k++){
        L.plats.push({x0:cx, x1:cx + 105, y:GY - 30, baseY:GY - 30 - k * 8, amp:30 + d * 4, sp:1.6 + d * .15, ph:k * 1.4, moving:true});
        coin(cx + 52, GY - 100);
        cx += 105 + R(70, 85);
      }
      x = cx;
      const len = R(300, 400);
      ground(x, x + len);
      row(x + 70, GY - 36, 3);
      x += len;
    },
    espinhos(){
      const len = R(460, 560);
      ground(x, x + len);
      const n = Math.min(3, 1 + Math.floor(d / 2) + (Math.random() < .4 ? 1 : 0));
      const sx = x + R(170, len - 120 - n * 34);
      L.spikes.push({x0:sx, x1:sx + n * 34, y:GY});
      arc(sx - 70, sx + n * 34 + 70, GY - 50, 80, 6);
      x += len;
    },
    mola(){
      const len = R(620, 720);
      ground(x, x + len);
      const sp = x + 150;
      L.springs.push({x:sp, y:GY, comp:0});
      // moedas no caminho do pulo da mola (mesma física do personagem)
      const pathAt = t => ({x:sp - 18 + speed * t, y:GY - (SPRING_V * t - GRAV / 2 * t * t) - 22});
      [.22, .34, .46, .7, .82, .94].forEach(t => { const q = pathAt(t); coin(q.x, q.y); });
      const top = pathAt(SPRING_V / GRAV);
      L.starSpots.push({x:top.x, y:top.y});
      if(d >= 3) enemy(x + len - 70, x + len - 150, x + len - 30);
      x += len;
    },
    blocos(){
      const len = R(520, 620);
      ground(x, x + len);
      const n = R(2, 3);
      for(let k = 0; k < n; k++){
        const bx = x + 140 + k * 120;
        L.solids.push({x0:bx, x1:bx + 36, top:GY - 128, bottom:GY - 92, type:'box', used:false, bump:0});
      }
      row(x + 150, GY - 168, n * 3, 40);
      if(d >= 3) enemy(x + len - 80, x + 100, x + len - 30);
      x += len;
    },
    voador(){
      const len = R(500, 600);
      ground(x, x + len);
      const ex = x + len * .55;
      L.enemies.push({x:ex, y:GY - 85, minX:ex, maxX:ex, dir:-1, speed:0, alive:true, flying:true, baseY:GY - 85, ph:Math.random() * 6, amp:55, dead:0});
      if(d >= 4) L.enemies.push({x:ex + 190, y:GY - 85, minX:ex, maxX:ex, dir:-1, speed:0, alive:true, flying:true, baseY:GY - 85, ph:Math.random() * 6 + 3, amp:55, dead:0});
      row(x + 80, GY - 36, 3);
      L.starSpots.push({x:ex, y:GY - 270});
      x += len;
    },
    tunel(){ // túnel baixo: só passa pequeno (come a uva antes)
      L.signs.push({x:x + 50, size:'small'});
      L.foods.push({x:x + 140, y:GY - 22, size:'small'});
      const t0 = x + 280, t1 = t0 + R(240, 300) + d * 25;
      L.solids.push({x0:t0, x1:t1, top:-9999, bottom:GY - 34, type:'ceil'});
      row(t0 + 26, GY - 15, Math.floor((t1 - t0 - 30) / 34), 34); // moedas escondidas lá dentro
      // depois do túnel: degrau alto — pequeno não sobe, tem que comer a maçã
      L.signs.push({x:t1 + 45, size:'normal'});
      L.foods.push({x:t1 + 120, y:GY - 22, size:'normal'});
      const s0 = t1 + 210, s1 = s0 + R(170, 220);
      ground(x, s0);
      const step = ground(s0, s1, GY - 112); step.hint = 'alto';
      row(s0 + 30, GY - 112 - 36, 3);
      const end = s1 + R(260, 340);
      ground(s1, end);
      if(d >= 3) enemy(end - 60, s1 + 120, end - 20);
      x = end;
    },
    paredao(){ // paredão de pedra: só quebra gigante (come a melancia antes)
      const len = R(760, 860);
      ground(x, x + len);
      L.signs.push({x:x + 50, size:'big'});
      L.foods.push({x:x + 140, y:GY - 22, size:'big'});
      const w0 = x + 330;
      L.solids.push({x0:w0, x1:w0 + 58, top:-9999, bottom:9999, type:'wall'});
      arc(w0 + 100, w0 + 260, GY - 60, 70, 5);
      if(d >= 2){ // bichinhos que o gigante amassa só de encostar
        enemy(w0 + 300, w0 + 200, w0 + 360);
        if(d >= 4) enemy(w0 + 420, w0 + 380, w0 + 470);
      }
      // passagem baixa: gigante não cabe — tem que comer a maçã
      const a0 = x + len + 160;
      L.signs.push({x:x + len - 20, size:'normal'});
      L.foods.push({x:x + len + 60, y:GY - 22, size:'normal'});
      ground(x + len, a0 + 260);
      L.solids.push({x0:a0, x1:a0 + 110, top:-9999, bottom:GY - 58, type:'ceil', kind:'arco'});
      row(a0 + 20, GY - 30, 3);
      x = a0 + 260;
    },
    // ===== desafios especiais de cada fase =====
    segredo(){ // Fase 1: plataformas invisíveis que aparecem ao pegar a estrela-chave
      const g = L.keys.length;
      ground(x, x + 240);
      L.keys.push({x:x + 160, y:GY - 70, group:g, taken:false});
      const p0 = x + 290, n = d >= 3 ? 5 : 4;
      for(let k = 0; k < n; k++){
        const px = p0 + k * 150, py = GY - 40 - (k % 2) * 55;
        L.plats.push({x0:px, x1:px + 112, y:py, hidden:true, group:g});
        coin(px + 56, py - 34);
      }
      const gx = p0 + (n - 1) * 150 + 112 + 45;
      ground(gx, gx + 300);
      row(gx + 60, GY - 36, 3);
      x = gx + 300;
    },
    ponte(){ // Fase 2: pontes de madeira que caem pouco depois de pisar
      ground(x, x + 180);
      const n = d >= 3 ? 5 : 4;
      let cx = x + 250;
      for(let k = 0; k < n; k++){
        const py = GY - 14 - (k % 2) * 34;
        L.plats.push({x0:cx, x1:cx + 96, y:py, baseY:py, falls:true, st:'idle', tm:0, vy:0});
        coin(cx + 48, py - 34);
        cx += 96 + R(45, 60);
      }
      ground(cx - 5, cx + 330);
      row(cx + 70, GY - 36, 3);
      x = cx + 330;
    },
    avalanche(){ // Fase 3: bolas de neve rolando em direção ao personagem
      const len = R(760, 880);
      ground(x, x + len);
      L.rollSpawns.push({x0:x + 40, x1:x + len, every:Math.max(1.4, 2.4 - d * .2), t:1});
      arc(x + 200, x + len - 160, GY - 60, 70, 6);
      x += len;
    },
    lava(){ // Fase 5: pedras que piscam sobre a lava
      ground(x, x + 180);
      const n = d >= 3 ? 5 : 4;
      let cx = x + 250;
      for(let k = 0; k < n; k++){
        const py = GY - 20 - (k % 2) * 40;
        L.plats.push({x0:cx, x1:cx + 104, y:py, blink:true, per:2.6, on:1.7, off:k * .7});
        coin(cx + 52, py - 34);
        cx += 104 + R(60, 75);
      }
      ground(cx + 10, cx + 320);
      x = cx + 320;
    },
    geiser(){ // Fase 5: jatos de lava que sobem do chão
      const len = R(700, 820);
      ground(x, x + len);
      const n = d >= 3 ? 3 : 2;
      for(let k = 0; k < n; k++){
        const jx = x + 200 + k * ((len - 320) / Math.max(1, n - 1));
        L.jets.push({x:jx, per:2.8, act:1.0, off:k * .9});
        coin(jx, GY - 190);
      }
      x += len;
    },
  };
  // quais pedaços aparecem em cada fase (mais difíceis nas fases altas)
  const pool = ['buraco', 'buraco', 'bichinho', 'degrau', 'escada', 'espinhos', 'mola', 'blocos', 'tunel', 'paredao'];
  if(d >= 2) pool.push('pedras', 'voador', 'bichinho', 'tunel', 'paredao');
  if(d >= 3) pool.push('pedras', 'espinhos', 'voador');
  if(d >= 4) pool.push('escada', 'pedras');

  let half = false;
  const used = {};
  const SIG = {1:['segredo'], 2:['ponte'], 3:['avalanche'], 4:[], 5:['lava', 'geiser']}[ph] || [];
  let count = 0;
  while(x < LEN){
    let k;
    count++;
    // o desafio especial da fase aparece a cada 3 pedaços
    if(SIG.length && count % 3 === 2) k = SIG[Math.floor(count / 3) % SIG.length];
    // toda fase tem pelo menos 1 túnel e 1 paredão (e no máximo 3 de cada)
    else if(x > LEN * .25 && !used.tunel) k = 'tunel';
    else if(x > LEN * .55 && !used.paredao) k = 'paredao';
    else do { k = pool[Math.floor(Math.random() * pool.length)]; } while(k === last || ((k === 'tunel' || k === 'paredao') && used[k] >= 3));
    used[k] = (used[k] || 0) + 1;
    last = k;
    CH[k]();
    if(!half && x > LEN / 2){ half = true; L.halfX = x; }
  }
  // reta final até a bandeira
  x += 90;
  ground(x, x + 1300);
  const flagX = x + 520;
  row(x + 60, GY - 36, 10, 40);
  L.flagX = flagX;
  L.endX = flagX + 170;

  // 3 estrelas: uma no começo, uma no meio e uma no fim da fase
  const spots = L.starSpots;
  if(spots.length < 3) spots.push({x:L.halfX || flagX / 2, y:GY - 250}, {x:flagX - 300, y:GY - 230}, {x:900, y:GY - 230});
  [0, .5, 1].forEach(f=>{
    const s = spots[Math.min(spots.length - 1, Math.round(f * (spots.length - 1)))];
    if(!L.stars.includes(s)) L.stars.push(s);
  });
  while(L.stars.length < 3) L.stars.push(spots.find(s => !L.stars.includes(s)) || {x:flagX - 200 * L.stars.length, y:GY - 220});
  L.stars = L.stars.map(s => ({x:s.x, y:s.y, taken:false}));

  // Fase 4 (noite escura): lanternas pelo caminho, sempre em chão firme
  if(ph === 4){
    for(let lx = 500; lx < flagX; lx += 620){
      const s = L.solids.find(q => q.type === 'ground' && q.top === GY && lx > q.x0 + 30 && lx < q.x1 - 30);
      if(s) L.lamps.push({x:lx, lit:false});
    }
  }
  // enfeites do cenário
  for(let dx = -100; dx < (flagX + 900) * .55; dx += R(120, 260)) L.decos.push({x:dx, s:.75 + Math.random() * .5, v:Math.random()});
  L.speed = speed;
  return L;
}

// ============================================================
// Começo, controles e fim
// ============================================================
function openRun(levelId){
  clearTimeout(nextTimer);
  const def = levelId && window.LEVEL_DEFS ? LEVEL_DEFS[levelId] : null;
  taQuiz.hidden = true; taPick.hidden = true; $('taShop').hidden = true; $('taMap').hidden = true; taRun.hidden = false;
  gameWin().classList.add('ta-racing');
  setupCanvas();
  const d = Math.min(5, runs + 1);         // dificuldade (sobe a cada corrida)
  const ph = def ? def.ph : runs % 5 + 1;  // fase: cada uma tem um desafio diferente
  const theme = THEMES[def ? def.theme : ph - 1];
  run = {
    d, ph, theme, level:def ? buildFromDef(def, d) : buildLevel(d, ph), levelId:levelId || null, def,
    hearts:3, cubs:0, page:false, check:{x:0, y:GY},
    x:0, y:GY, vx:0, vy:0, face:1, ground:null, plat:null, jumps:0, coyote:0, buffer:0,
    camX:-W * .32, camY:0, coins:0, starsGot:0, t:0, anim:0, state:'ready', inv:0, hurtT:0,
    spin:0, jet:0, happy:0, squash:[1, 1], dustT:0, shake:0, size:'normal', scale:1,
    safe:[], parts:[], fly:[], weather:[], banner:null,
  };
  for(let k = 0; k < 40; k++) run.weather.push({x:Math.random() * W, y:Math.random() * H, s:Math.random(), ph:Math.random() * 6});
  showOverlay(`<div class="ta-ov-card">
      <div class="ta-ov-emoji">🏃</div>
      <b>${def ? `Fase ${levelId}: ${def.name}` : `Corrida livre: ${theme.name}`}</b>
      <small class="ta-ov-tip">${def ? def.goal : PHASE_TIPS[ph]}</small>
      <small>❤️ 3 corações · 🚩 bandeirinhas guardam o caminho · ⭐ 3 estrelas${def ? ' · 📜 1 página do livro' : ''}</small>
      <div class="ta-ov-help"><span>◀ ▶ Setas: andar</span><span>⤒ Pular (de novo no ar: pulo duplo)</span><span>🐞 Pule em cima dos bichinhos</span><span>🍇 encolhe · 🍎 normal · 🍉 gigante</span></div>
      <button type="button" class="m-new-btn ta-go" id="taGo">Jogar! ▶</button>
    </div>`);
  $('taGo').addEventListener('click', e=>{ e.stopPropagation(); startRunning(); });
  say(def ? def.goal.replace(/[🐣📜✨🐝]/gu, '') : `Corrida livre! ${PHASE_TIPS[ph]}`, 0.95);
  cancelAnimationFrame(rafId);
  let lastT = performance.now();
  const loop = now=>{
    const dt = Math.min(.033, (now - lastT) / 1000);
    lastT = now;
    update(dt);
    draw();
    if(run) rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

// a corrida abre em tela cheia (ocupa a tela toda do tablet/celular)
let autoFs = false;
const gameWin = () => document.getElementById('gameWindow');
function enterRaceFs(){
  const gw = gameWin(), b = document.getElementById('fsBtn');
  if(!gw || !b || gw.classList.contains('is-fs')) return;
  autoFs = true;
  b.click();
}
function leaveRaceFs(){
  const gw = gameWin(), b = document.getElementById('fsBtn');
  if(autoFs && gw && b && gw.classList.contains('is-fs')) b.click();
  autoFs = false;
}

function startRunning(){
  if(!run || run.state !== 'ready') return;
  enterRaceFs();
  hideOverlay();
  run.state = 'run';
  run.hintT = 3.5;
}

function stopRun(){
  cancelAnimationFrame(rafId); run = null; input.left = input.right = false; jumpHeld = false;
  const gw = gameWin(); if(gw) gw.classList.remove('ta-racing');
}
function showOverlay(html){ taOverlay.innerHTML = html; taOverlay.classList.add('show'); }
function hideOverlay(){ taOverlay.classList.remove('show'); }

function pressJump(){
  if(!run) return;
  if(run.state === 'ready'){ startRunning(); return; }
  if(run.state !== 'run') return;
  jumpHeld = true;
  run.buffer = .14; // se tocar um pouquinho antes de cair no chão, pula assim que encostar
  tryJump();
}
function releaseJump(){ jumpHeld = false; } // soltar cedo = pulo um pouco mais baixo (gravidade maior)
function tryJump(){
  const r = run;
  if(r.plane) return; // no avião, segurar PULAR faz subir
  const wzone = waterAt(r.x);
  // perto da superfície (nadando ou boiando): pula para fora da água
  if(wzone && !r.ground && !r.plat && r.y > wzone.surface - 18 && r.y < wzone.surface + 30){
    r.vy = -650; r.jumps = 1; r.buffer = 0; jumpSound(1);
    for(let k = 0; k < 8; k++) part(r.x, wzone.surface, (Math.random() - .5) * 160, -Math.random() * 200, .5, 'rgba(255,255,255,.9)', 3, 'spark');
    return;
  }
  if(r.swim){
    const wz = wzone;
    if(r.mask){ r.vy = -290; for(let k = 0; k < 5; k++) part(r.x, r.y - 20, (Math.random() - .5) * 60, 40, .5, 'rgba(255,255,255,.85)', 3, 'bubble'); tone([520, 620], .12, 'sine', .04); }
    else { r.banner = {text:'Pegue a máscara de mergulho 🤿 para mergulhar!', t:2}; }
    r.buffer = 0;
    return;
  }
  if(r.ground || r.coyote > 0){
    r.vy = -JUMP_V * (r.size === 'small' ? .6 : 1) * (r.power && r.power.kind === 'pulo' ? 1.3 : 1); r.jumps = 1; r.ground = null; r.plat = null; r.coyote = 0; r.buffer = 0; r.springing = false;
    r.squash = [.8, 1.25];
    puff(r.x, r.y, 4);
    jumpSound(1);
  } else if(r.jumps < 2 && r.buffer > .13){
    r.vy = -DJUMP_V * (r.size === 'small' ? .6 : 1) * (r.power && r.power.kind === 'pulo' ? 1.25 : 1); r.jumps = 2; r.buffer = 0; r.spin = .001; r.springing = false;
    if(charId === 'robo') r.jet = .35;
    ring(r.x, r.y - 6);
    jumpSound(2);
  }
}

// ============================================================
// Atualização (física, colisões, bichinhos)
// ============================================================
function update(dt){
  const r = run;
  if(!r) return;
  r.t += dt;
  updateParticles(dt);
  if(r.state === 'ready'){ r.anim += dt; return; }
  if(r.hintT) r.hintT = Math.max(0, r.hintT - dt);
  if(r.banner) { r.banner.t -= dt; if(r.banner.t <= 0) r.banner = null; }
  const L = r.level;

  // plataformas que se mexem
  L.plats.forEach(p=>{
    p.prevY = p.y;
    if(p.moving) p.y = p.baseY + Math.sin(r.t * p.sp + p.ph) * p.amp;
    if(p.axisX){ p.prevX0 = p.x0; const w = p.x1 - p.x0; p.x0 = p.baseX + Math.sin(r.t * p.sp + p.ph) * p.amp; p.x1 = p.x0 + w; }
    if(p.pop) p.pop = Math.max(0, p.pop - dt * 2);
    if(p.falls){ // ponte que cai
      if(p.st === 'idle' && r.plat === p){ p.st = 'shake'; p.tm = .75; tone([180, 140], .2, 'square', .03); }
      else if(p.st === 'shake'){ p.tm -= dt; if(p.tm <= 0){ p.st = 'fall'; p.vy = 0; } }
      else if(p.st === 'fall'){ p.vy += 1700 * dt; p.y += p.vy * dt; if(p.y > H + 250){ p.st = 'gone'; p.tm = 2.2; } }
      else if(p.st === 'gone'){ p.tm -= dt; if(p.tm <= 0){ p.st = 'idle'; p.y = p.baseY; p.prevY = p.y; p.pop = 1; } }
    }
  });
  // bolas de neve rolando (Fase 3)
  L.rollSpawns.forEach(sp=>{
    if(sp.x1 < r.camX - 100 || sp.x0 > r.camX + W + 300) return;
    sp.t -= dt;
    if(sp.t <= 0){ sp.t = sp.every; L.rollers.push({x:Math.min(sp.x1 - 20, r.camX + W + 60), y:GY, x0:sp.x0, r:17 + Math.random() * 5, rot:0, alive:true}); }
  });
  L.rollers.forEach(b=>{
    if(!b.alive) return;
    const sp = 175 + r.d * 14;
    b.x -= sp * dt; b.rot -= sp * dt / b.r;
    if(b.x < b.x0) b.alive = false;
  });
  L.rollers = L.rollers.filter(b => b.alive);
  // bichinhos
  L.enemies.forEach(e=>{
    if(!e.alive){ e.dead += dt; return; }
    e.ph += dt;
    if(e.flying){
      if(e.speed){ e.x += e.dir * e.speed * dt; if(e.x < e.minX){ e.x = e.minX; e.dir = 1; } if(e.x > e.maxX){ e.x = e.maxX; e.dir = -1; } }
      e.y = e.baseY + Math.sin(e.ph * (e.kind === 'agua' ? 1.3 : 2.2)) * (e.amp != null ? e.amp : 55);
    }
    else {
      e.x += e.dir * e.speed * dt;
      if(e.x < e.minX){ e.x = e.minX; e.dir = 1; }
      if(e.x > e.maxX){ e.x = e.maxX; e.dir = -1; }
    }
  });
  L.springs.forEach(s => s.comp = Math.max(0, s.comp - dt * 4));
  L.solids.forEach(s => { if(s.bump) s.bump = Math.max(0, s.bump - dt * 5); });

  r.inv = Math.max(0, r.inv - dt);
  if(r.power){
    r.power.t -= dt;
    if(r.power.t <= 0){ r.banner = {text:`${POWERS[r.power.kind].icon} O superpoder acabou`, t:1.3}; r.power = null; }
    else if(Math.random() < .5) part(r.x - r.face * 12 + (Math.random() - .5) * 16, r.y - 10 - Math.random() * 30, -r.face * 40, -30, .5, POWERS[r.power.kind].color, 3.5, 'spark');
  }
  r.happy = Math.max(0, r.happy - dt);
  r.jet = Math.max(0, r.jet - dt);
  r.buffer = Math.max(0, r.buffer - dt);
  r.coyote = Math.max(0, r.coyote - dt);
  r.hurtT = Math.max(0, r.hurtT - dt);
  if(r.spin > 0){ r.spin += dt * 2.6; if(r.spin >= 1) r.spin = 0; }
  r.squash = [r.squash[0] + (1 - r.squash[0]) * Math.min(1, dt * 12), r.squash[1] + (1 - r.squash[1]) * Math.min(1, dt * 12)];

  // ---- tamanho (comidas): cresce e encolhe suavinho ----
  const tScale = SIZES[r.size];
  r.scale += (tScale - r.scale) * Math.min(1, dt * 9);
  if(Math.abs(tScale - r.scale) < .01) r.scale = tScale;
  const PW = PW0 * r.scale, PH = PH0 * r.scale;

  // ---- andar com as setas (com aceleração suave) ----
  const dirIn = r.state === 'done' ? 1 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  // fundo do mar: está nadando?
  const wz = waterAt(r.x);
  const wasSwim = r.swim;
  r.swim = !!wz && r.y > wz.surface + 6;
  if(r.swim && !wasSwim){ for(let k = 0; k < 12; k++) part(r.x, wz.surface, (Math.random() - .5) * 220, -Math.random() * 260, .6, 'rgba(255,255,255,.9)', 4, 'spark'); tone([300, 200], .25, 'sine', .06); }
  const sizeSpeed = (r.size === 'big' ? .9 : r.size === 'small' ? 1.08 : 1) * (r.power && r.power.kind === 'rapido' ? 1.6 : 1) * (r.swim ? .72 : 1);
  let target = r.hurtT > .25 ? r.vx : dirIn * (r.state === 'done' ? L.speed * .45 : L.speed * sizeSpeed);
  if(r.sled && r.state === 'run') target = 380;                                            // trenó: desce sem frear
  if(r.plane && r.state === 'run') target = 250 + (input.right ? 90 : 0) - (input.left ? 90 : 0); // avião: sempre voando
  const icy = r.theme.name === 'Neve' && (r.ground || r.plat) && r.hurtT <= 0 && !r.sled;
  const acc = icy ? (dirIn ? 900 : 420) : (r.ground || r.plat) ? 2400 : 1500;
  r.vx += Math.max(-acc * dt, Math.min(acc * dt, target - r.vx));
  if(dirIn && r.hurtT <= .25) r.face = dirIn;
  if(r.sled || r.plane) r.face = 1;
  let nx = r.x + r.vx * dt;
  if(nx < -360) { nx = -360; r.vx = 0; }                  // começo da fase
  if(r.state === 'done' && nx > L.endX){ nx = L.endX; r.vx = 0; }
  r.blocked = false;
  let blockedBy = null;
  for(const s of L.solids){
    if(s.broken) continue;
    if(r.y > s.top + 4 && r.y - PH < s.bottom){
      const front = r.x + PW <= s.x0 + 1 && nx + PW > s.x0, back = r.x - PW >= s.x1 - 1 && nx - PW < s.x1;
      if(s.open) continue; // porta/portão aberto
      if((front || back) && s.type === 'wall' && !s.kind && r.size === 'big'){ breakWall(s); continue; } // gigante quebra!
      if(front){ nx = s.x0 - PW; r.vx = 0; r.blocked = true; blockedBy = s; }      // parede na frente
      else if(back){ nx = s.x1 + PW; r.vx = 0; r.blocked = true; blockedBy = s; } // parede atrás
    }
  }
  // empacou no túnel ou no paredão: dica da comida certa
  if(blockedBy && !r.banner && dirIn){
    const b = blockedBy;
    if(b.kind === 'gate') r.banner = {text:`Faltam ${b.need - r.cubs} ${b.need - r.cubs === 1 ? 'filhote' : 'filhotes'} 🐣 para abrir o portão!`, t:2.4};
    else if(b.kind === 'door') r.banner = {text:`Porta da tabuada: ${b.door.q.text} = ? Pule no bloco certo!`, t:2.6};
    else if(b.kind === 'arco') r.banner = {text:'Grande demais! Coma a maçã 🍎 para voltar ao normal', t:2.2};
    else if(b.type === 'ceil') r.banner = {text:'Muito grande! Coma a uva 🍇 para ficar pequeno', t:2.2};
    else if(b.type === 'wall') r.banner = {text:'Paredão! Coma a melancia 🍉 para ficar gigante', t:2.2};
    else if(b.hint === 'alto' && r.size === 'small' && (r.ground || r.plat)) r.banner = {text:'Pequeno não sobe! Coma a maçã 🍎 para voltar ao normal', t:2.2};
  }
  // em cima de pedra que se mexe: acompanha
  if(r.plat && r.plat.moving) r.y += r.plat.y - r.plat.prevY;
  if(r.plat && r.plat.axisX) nx += r.plat.x0 - r.plat.prevX0; // plataforma que anda leva junto
  for(const wd of L.winds) if(r.x > wd.x0 && r.x < wd.x1 && !r.plane) nx += wd.force * dt; // vento empurra
  r.x = nx;

  // ---- vertical ----
  const wasGround = r.ground || r.plat;
  const prevY = r.y;
  if(r.plane){
    const tv = jumpHeld ? -250 : 175;
    r.vy += (tv - r.vy) * Math.min(1, dt * 4);
  } else if(r.swim){
    r.vy += 430 * dt;                      // afunda devagarinho
    if(r.vy > 150) r.vy = 150;
    if(!r.mask && r.y > wz.surface + 26){ r.vy = Math.min(r.vy, -110); } // sem máscara: boia
    if(Math.random() < .08) part(r.x + r.face * 14, r.y - 40, (Math.random() - .5) * 20, -70, 1.2, 'rgba(255,255,255,.8)', 3, 'bubble');
  } else r.vy += GRAV * (r.vy < 0 && !jumpHeld && !r.springing ? 1.35 : 1) * dt;
  let ny = r.y + r.vy * dt;
  r.ground = null; r.plat = null;
  if(r.vy >= 0){
    for(const s of L.solids){
      if(!s.broken && r.x + PW - 3 > s.x0 && r.x - PW + 3 < s.x1 && prevY <= s.top + .5 && ny >= s.top){ ny = s.top; r.vy = 0; r.ground = s; break; }
    }
    if(!r.ground) for(const p of L.plats){
      if(!platSolid(p, r.t)) continue;
      const py0 = p.prevY != null ? p.prevY : p.y;
      if(r.x + PW - 3 > p.x0 && r.x - PW + 3 < p.x1 && prevY <= Math.max(py0, p.y) + 1 && ny >= p.y - 1 && prevY <= p.y + 8){
        ny = p.y; r.vy = 0; r.plat = p; break;
      }
    }
  } else {
    // bate a cabeça embaixo dos blocos
    for(const s of L.solids){
      if(s.broken || (s.type !== 'box' && s.type !== 'ceil' && s.type !== 'numbox')) continue;
      if(r.x + PW - 4 > s.x0 && r.x - PW + 4 < s.x1 && prevY - PH >= s.bottom - .5 && ny - PH < s.bottom){
        ny = s.bottom + PH; r.vy = 60;
        if(s.type === 'box') hitBox(s);
        if(s.type === 'numbox') answerBox(s);
      }
    }
  }
  r.y = ny;
  const onFloor = r.ground || r.plat;
  if(onFloor){
    r.springing = false;
    if(!wasGround){
      r.squash = [1.25, .78];
      puff(r.x, r.y, 5);
      r.jumps = 0; r.spin = 0;
    }
    r.jumps = 0;
    r.coyote = .1;
    if(r.buffer > 0 && r.state === 'run'){ r.buffer = .001; tryJump(); }
    // guarda lugares seguros (para voltar se cair)
    if(r.ground && r.ground.type === 'ground' && r.x - PW > r.ground.x0 + 12 && r.x + PW < r.ground.x1 - 12){
      r.safe.push({x:r.x, y:r.y});
      if(r.safe.length > 70) r.safe.shift();
    }
    // poeirinha da corrida
    r.dustT -= dt;
    if(r.dustT <= 0 && Math.abs(r.vx) > 80 && !r.blocked){ r.dustT = .13; dust(r.x - 10 * r.face, r.y, r.face); }
  }

  // ---- molas ----
  for(const s of L.springs){
    if(r.vy >= 0 && Math.abs(r.x - s.x) < 22 && r.y >= s.y - 16 && prevY <= s.y - 6 + 12){
      r.vy = -SPRING_V; r.jumps = 1; r.ground = null; r.plat = null; r.springing = true;
      s.comp = 1; r.squash = [.75, 1.3]; r.spin = .001;
      springSound();
    }
  }

  // ---- moedas e estrelas ----
  const cy = r.y - PH / 2;
  for(const c of L.coins){
    if(c.taken) continue;
    const dx = c.x - r.x, dy = c.y - cy;
    if(dx * dx + dy * dy < 31 * 31){ c.taken = true; gotCoin(c.x, c.y, 1); }
  }
  // comidas (ficam no lugar: dá para voltar e comer de novo)
  for(const f of L.foods){
    f.pop = Math.max(0, (f.pop || 0) - dt * 3);
    if(r.size === f.size) continue;
    const dx = f.x - r.x, dy = f.y - cy, rad = 22 + PW;
    if(dx * dx + dy * dy < rad * rad) eatFood(f);
  }
  for(const s of L.stars){
    if(s.taken) continue;
    const dx = s.x - r.x, dy = s.y - cy;
    if(dx * dx + dy * dy < 36 * 36){
      s.taken = true; r.starsGot++; r.happy = 1.2;
      starSound();
      for(let k = 0; k < 16; k++) part(s.x, s.y, Math.cos(k / 16 * 6.28) * 260, Math.sin(k / 16 * 6.28) * 260, .7, '#FDE047', 4, 'star');
      r.banner = {text:`⭐ Estrela ${r.starsGot} de 3!`, t:1.6};
      say(r.starsGot === 3 ? 'Todas as estrelas!' : 'Estrela!', 1);
    }
  }

  // ---- pingentes de gelo ----
  for(const ic of L.icicles){
    if(ic.st === 'hang' && Math.abs(r.x - ic.x) < 70 && r.y > ic.y0){ ic.st = 'shake'; ic.tm = .45; tone([900, 700], .15, 'triangle', .03); }
    else if(ic.st === 'shake'){ ic.tm -= dt; if(ic.tm <= 0){ ic.st = 'fall'; ic.vy = 0; } }
    else if(ic.st === 'fall'){
      ic.vy += 1600 * dt; ic.y += ic.vy * dt;
      if(Math.abs(r.x - ic.x) < PW + 8 && ic.y + 46 > r.y - PH && ic.y < r.y) hurt();
      if(ic.y + 46 >= GY){ ic.st = 'gone'; for(let k = 0; k < 10; k++) part(ic.x, GY - 6, (Math.random() - .5) * 260, -Math.random() * 220, .5, '#E0F2FE', 4, 'spark'); }
    }
  }
  // ---- trenó ----
  for(const sd of L.sleds){
    if(!sd.taken && Math.abs(sd.x - r.x) < 36 && r.y > GY - 60){
      sd.taken = true; r.sled = true;
      r.banner = {text:'🛷 Trenó! Ele não freia: só PULE os buracos e as pedras!', t:2.6};
      tone([392, 523, 659], .4, 'triangle', .06); say('Trenó! Só pule!', 1);
    }
    if(r.sled && sd.taken && sd.end && r.x > sd.end){ r.sled = false; sd.end = null; r.banner = {text:'🛷 Fim da descida!', t:1.4}; }
  }
  // ---- bola de neve gigante perseguindo ----
  for(const ch of L.chasers){
    if(ch.done) continue;
    if(!ch.active && r.x > ch.startX){ ch.active = true; ch.bx = r.x - 520; r.banner = {text:'😱 CORRA! A bola de neve gigante vem aí!', t:2.4}; say('Corra!', 1.1); }
    if(!ch.active) continue;
    ch.bx += ch.speed * dt; ch.rot = (ch.rot || 0) + ch.speed * dt / ch.r;
    if(ch.bx + ch.r * .85 > r.x - PW && r.state === 'run'){
      if(r.inv <= 0){ hurt(); r.x += 130; }
      ch.bx = Math.min(ch.bx, r.x - ch.r - 80);
    }
    if(r.x > ch.endX){
      ch.done = true;
      for(let k = 0; k < 30; k++) part(ch.bx, GY - ch.r, (Math.random() - .3) * 500, -Math.random() * 400, 1, '#F8FAFC', 6, 'spark');
      r.banner = {text:'💥 A bola se espatifou! Ufa!', t:1.8}; r.shake = .4;
      tone([200, 120, 80], .5, 'sawtooth', .08);
    }
  }
  // ---- avião ----
  for(const pl of L.planes){
    if(!pl.taken && Math.abs(pl.x - r.x) < 40 && r.y > GY - 70){
      pl.taken = true; r.plane = true; r.vy = -200; r.ground = null; r.plat = null;
      r.banner = {text:'✈️ Aviãozinho! SEGURE o PULAR para subir e solte para descer.', t:3};
      tone([523, 659, 784, 1047], .5, 'triangle', .07); say('Aviãozinho! Segure para subir!', 1);
    }
    if(r.plane && pl.taken && pl.end && r.x > pl.end){ r.plane = false; pl.end = null; r.banner = {text:'🛬 Pouso!', t:1.4}; }
  }
  if(r.plane){
    if(r.y < 70){ r.y = 70; r.vy = Math.max(0, r.vy); }
    if(r.blocked && r.inv <= 0){ hurt(); r.y -= 30; }   // bateu num pico
    if(Math.random() < .3) part(r.x - 40, r.y - 18, -140, (Math.random() - .5) * 30, .5, 'rgba(255,255,255,.8)', 4, 'dust');
  }
  // ---- nuvens de tempestade (raio) ----
  for(const st of L.storms){
    const k = (r.t + st.off) % 3;
    st.zap = k > 2.2;
    if(st.zap && Math.abs(r.x - st.x) < st.r + PW && r.y - PH < st.y + st.r * .6 && r.y > st.y - st.r * .6) hurt();
  }
  // ---- máscara de mergulho ----
  for(const m of L.masks){
    if(m.taken) continue;
    const dx = m.x - r.x, dy = m.y - cy;
    if(dx * dx + dy * dy < 40 * 40){
      m.taken = true; r.mask = true;
      r.banner = {text:'🤿 Máscara de mergulho! Pule na água e toque PULAR para nadar.', t:2.6};
      tone([523, 659, 784], .35, 'triangle', .06);
      say('Máscara de mergulho!', 1);
    }
  }
  // ---- pedras esmagadoras ----
  for(const cr of L.crushers){
    const y = crusherY(cr, r.t);
    if(r.x + PW > cr.x && r.x - PW < cr.x + cr.w && r.y - PH < y && r.y > y - 60) hurt();
  }
  // ---- bolas de espinho girando ----
  for(const sp of L.spinners){
    const a = r.t * sp.sp + sp.ph, bx = sp.cx + Math.cos(a) * sp.len, by = sp.cy + Math.sin(a) * sp.len;
    const dx = bx - r.x, dy = by - cy;
    if(dx * dx + dy * dy < (16 + PW) * (16 + PW)) hurt();
  }
  // ---- bandeirinhas (checkpoint) ----
  for(const c of L.checks){
    if(!c.on && r.x > c.x - 10 && r.x < c.x + 60){
      L.checks.forEach(o => { if(o.x < c.x) o.on = true; });
      c.on = true; r.check = {x:c.x + 20, y:c.y || GY};
      r.banner = {text:'🚩 Bandeirinha! Se cair, você volta aqui.', t:1.6};
      tone([523, 659, 784], .3, 'triangle', .06);
    }
  }
  // ---- coraçãozinho ----
  for(const h of L.hearts){
    if(h.taken) continue;
    const dx = h.x - r.x, dy = h.y - cy;
    if(dx * dx + dy * dy < 34 * 34){
      if(r.hearts >= 3){ continue; }
      h.taken = true; r.hearts++;
      r.banner = {text:'❤️ Ganhou um coração!', t:1.2};
      tone([660, 990], .25, 'triangle', .06);
    }
  }
  // ---- filhotes ----
  for(const f of L.cubs){
    if(f.taken) continue;
    const dx = f.x - r.x, dy = (f.y - 16) - cy;
    if(dx * dx + dy * dy < 40 * 40){
      f.taken = true; r.cubs++; r.happy = 1.2;
      for(let i = 0; i < 12; i++){ const a = i / 12 * 6.28; part(f.x, f.y - 16, Math.cos(a) * 200, Math.sin(a) * 200, .6, '#FDE68A', 4, 'star'); }
      const need = L.cubs.length;
      r.banner = {text: r.cubs >= need ? `🐣 Todos os ${need} filhotes! O portão vai abrir.` : `🐣 Filhote ${r.cubs} de ${need}!`, t:1.8};
      tone([784, 988, 1175], .4, 'triangle', .07);
      say(r.cubs >= need ? 'Todos os filhotes!' : `Filhote ${r.cubs}!`, 1);
    }
  }
  // ---- página do livro ----
  for(const pg of L.pages){
    if(pg.taken) continue;
    const dx = pg.x - r.x, dy = pg.y - cy;
    if(dx * dx + dy * dy < 40 * 40){
      pg.taken = true; r.page = true; r.happy = 1.5;
      for(let i = 0; i < 20; i++){ const a = i / 20 * 6.28; part(pg.x, pg.y, Math.cos(a) * 260, Math.sin(a) * 260, .8, '#FEF3C7', 5, 'star'); }
      r.banner = {text:'📜 Você achou uma página do Livro das Tabuadas!', t:2.4};
      starSound();
      say('Uma página do livro!', 1);
    }
  }
  // ---- portão dos filhotes abre sozinho quando tem todos ----
  for(const s of L.solids){
    if(s.kind === 'gate' && !s.open && r.cubs >= s.need && Math.abs(s.x0 - r.x) < 320){
      s.open = true; s.openT = 1;
      r.banner = {text:'🎉 O portão abriu!', t:1.6};
      tone([392, 523, 659, 784], .5, 'triangle', .07);
    }
    if(s.openT) s.openT = Math.max(0, s.openT - dt);
  }

  // ---- estrela-chave: revela as plataformas secretas ----
  for(const k of L.keys){
    if(k.taken) continue;
    const dx = k.x - r.x, dy = k.y - cy;
    if(dx * dx + dy * dy < 46 * 46){
      k.taken = true;
      L.plats.forEach(p => { if(p.hidden && p.group === k.group){ p.hidden = false; p.pop = 1; } });
      for(let i = 0; i < 18; i++){ const a = i / 18 * 6.28; part(k.x, k.y, Math.cos(a) * 240, Math.sin(a) * 240, .7, '#A5F3FC', 4, 'star'); }
      r.banner = {text:'✨ O caminho apareceu!', t:1.8};
      tone([523, 784, 1047, 1319], .5, 'triangle', .07);
    }
  }
  // ---- bolas de neve ----
  for(const b of L.rollers){
    if(!b.alive) continue;
    const bx = Math.max(r.x - PW, Math.min(b.x, r.x + PW)), by = Math.max(r.y - PH, Math.min(b.y - b.r, r.y));
    const dx = b.x - bx, dy = (b.y - b.r) - by;
    if(dx * dx + dy * dy < b.r * b.r){
      if(r.size === 'big' || (r.vy > 0 && prevY <= b.y - b.r * 1.6)){ // gigante ou pulou em cima: desmancha
        b.alive = false;
        for(let i = 0; i < 10; i++) part(b.x, b.y - b.r, (Math.random() - .5) * 260, -Math.random() * 240, .5, '#fff', 4, 'spark');
        if(r.size !== 'big'){ r.vy = -460; r.jumps = 1; }
        stompSound();
      } else hurt();
    }
  }
  // ---- jatos de lava ----
  for(const j of L.jets){
    const h = jetHeight(j, r.t);
    if(h > 20 && Math.abs(j.x - r.x) < PW + 14 && r.y > GY - h && r.y - PH < GY) hurt();
  }
  // ---- lanternas (Fase 4) ----
  for(const l of L.lamps){
    if(!l.lit && Math.abs(l.x - r.x) < 34 && r.y > GY - 120){
      l.lit = true;
      r.banner = {text:'🏮 Lanterna acesa!', t:1.2};
      tone([660, 880, 1100], .35, 'triangle', .06);
    }
  }

  // ---- bichinhos ----
  for(const e of L.enemies){
    if(!e.alive) continue;
    const top = e.y - (e.flying ? 34 : 28);
    const overlapX = Math.abs(e.x - r.x) < PW + 15;
    const overlapY = r.y > top + 2 && r.y - PH < e.y - 2;
    if(!overlapX || !overlapY) continue;
    if(r.size === 'big' || (r.power && r.power.kind === 'escudo')){ // gigante ou escudo: derruba só de encostar
      e.alive = false; e.dead = 0; r.shake = .15;
      for(let k = 0; k < 10; k++) part(e.x, top + 10, (Math.random() - .5) * 300, -Math.random() * 260, .6, '#fff', 4, 'star');
      gotCoin(e.x, top - 10, 2, true);
      stompSound();
      continue;
    }
    if(r.vy > 0 && prevY <= top + 12){
      // pulou em cima!
      e.alive = false; e.dead = 0;
      r.vy = jumpHeld ? -640 : -470; r.jumps = 1; r.spin = 0;
      for(let k = 0; k < 10; k++) part(e.x, top + 10, (Math.random() - .5) * 300, -Math.random() * 260, .6, '#fff', 4, 'star');
      gotCoin(e.x, top - 10, 2, true);
      stompSound();
    } else hurt();
  }
  // ---- espinhos ----
  for(const s of L.spikes){
    if(r.x + PW - 4 > s.x0 + 4 && r.x - PW + 4 < s.x1 - 4 && r.y > s.y - 20) hurt();
  }

  // ---- caiu no buraco ----
  if(r.plane && r.y > GY + 30){ loseHeart(); if(r.plane){ r.y = 150; r.vy = -120; r.inv = 1.5; } }
  const deepZ = waterAt(r.x);
  if(r.y > (deepZ ? deepZ.floor + 300 : H + 160)){
    let back = r.safe[0] || {x:0, y:GY};
    // caiu num buraco de plataformas secretas sem pegar a chave: volta para antes da estrela-chave
    const lostKey = L.keys.find(k => !k.taken && k.x < r.x && k.x > r.x - 900);
    if(lostKey){ back = {x:lostKey.x - 120, y:GY}; }
    r.x = back.x; r.y = back.y; r.vy = 0; r.jumps = 0; r.spin = 0;
    L.chasers.forEach(ch => { if(ch.active && !ch.done) ch.bx = Math.min(ch.bx, r.x - 520); });
    r.safe = [back];
    r.inv = 1.5;
    r.banner = lostKey ? {text:'Pegue a estrela-chave ✨ primeiro!', t:2.2} : {text:'Ops! Caiu no buraco 💔', t:1.3};
    tone([400, 300, 220], .35, 'triangle', .07);
    loseHeart();
  }

  // ---- metade do caminho ----
  if(L.halfX && !r.halfShown && r.x > L.halfX){ r.halfShown = true; r.banner = {text:'Metade do caminho! 🚩', t:1.8}; }

  // ---- câmera firme ----
  // Fica parada enquanto o personagem anda dentro de uma "janela" no meio
  // da tela; só acompanha quando ele chega na borda (sem balançar ao virar).
  const sx = r.x - r.camX, winL = W * .3, winR = W * .52;
  if(sx > winR) r.camX = r.x - winR;
  else if(sx < winL) r.camX = r.x - winL;
  r.camX = Math.max(-420, r.camX);
  // para cima só quando sobe bem alto (mola, pulo duplo); pulos normais não mexem
  const ty = r.swim && wz ? Math.max(0, Math.min(r.y - 210, wz.floor + 70 - H)) : Math.min(0, r.y - 120);
  r.camY += (ty - r.camY) * Math.min(1, dt * 4);
  r.shake = Math.max(0, r.shake - dt);

  r.anim += dt * Math.max(.25, Math.min(1.2, Math.abs(r.vx) / L.speed));
  // rastro comprado na loja
  const fx = shopEquipOf(charId || 'capivara').effect;
  if(fx && (Math.abs(r.vx) > 60 || !(r.ground || r.plat))){
    r.trailT = (r.trailT || 0) - dt;
    if(r.trailT <= 0){
      r.trailT = .045;
      r.parts.push({x:r.x - r.face * 14 + (Math.random() - .5) * 8, y:r.y - 22 + (Math.random() - .5) * 18, vx:-r.face * 20, vy:-10, life:.7, max:.7, kind:'trail', fx, hue:(r.t * 300) % 360});
    }
  }
  if(r.state === 'run' && r.x >= L.flagX) finishRun();
  if(r.state === 'done'){
    r.winT = (r.winT || 0) + dt;
    if((r.ground || r.plat) && r.x >= L.endX - 2 && r.winT > .6 && (r.winT % 1.1) < dt * 1.5){ r.vy = -520; r.ground = null; }
    if(Math.random() < .5) part(r.camX + Math.random() * W, r.camY - 10, (Math.random() - .5) * 60, 80 + Math.random() * 80, 3, ['#F43F5E', '#FACC15', '#22C55E', '#3B82F6', '#A855F7'][Math.floor(Math.random() * 5)], 4, 'confetti');
  }
}

function hitBox(s){
  if(s.used){ s.bump = 1; tone([200], .08, 'square', .04); return; }
  s.used = true; s.bump = 1;
  for(let k = 0; k < 3; k++) setTimeout(()=> run && gotCoin(s.x0 + 18, s.top - 14 - k * 10, 1, true), k * 90);
  tone([660, 880], .15, 'square', .04);
}

function eatFood(f){
  const r = run;
  const grow = SIZES[f.size] > SIZES[r.size];
  r.size = f.size;
  f.pop = 1;
  r.happy = .8;
  r.banner = {text:FOOD[f.size].msg, t:1.6};
  const col = f.size === 'small' ? '#A855F7' : f.size === 'big' ? '#22C55E' : '#EF4444';
  for(let k = 0; k < 14; k++){ const a = k / 14 * 6.28; part(r.x, r.y - 24, Math.cos(a) * 180, Math.sin(a) * 180, .5, col, 4, 'spark'); }
  tone(grow ? [262, 330, 392, 523, 659] : f.size === 'small' ? [880, 660, 523, 392] : [392, 523], grow ? .55 : .4, 'triangle', .07);
  say(f.size === 'small' ? 'Pequenininho!' : f.size === 'big' ? 'Gigante!' : 'Normal!', 1.05);
}

function breakWall(s){
  const r = run;
  s.broken = true;
  r.shake = .4;
  for(let k = 0; k < 26; k++){
    part(s.x0 + Math.random() * (s.x1 - s.x0), GY - Math.random() * 220, (Math.random() - .3) * 420 * r.face, -150 - Math.random() * 380, 1.1, ['#9CA3AF', '#6B7280', '#78716C'][k % 3], 5 + Math.random() * 6, 'rock');
  }
  tone([120, 90, 60], .45, 'sawtooth', .09);
  r.banner = {text:'CRASH! Paredão quebrado! 💥', t:1.4};
}

// perde um coração; sem corações, volta para a última bandeirinha com 3 de novo
function loseHeart(){
  const r = run;
  r.hearts--;
  for(let k = 0; k < 6; k++) part(r.x, r.y - 40, (Math.random() - .5) * 200, -150 - Math.random() * 150, .7, '#F43F5E', 5, 'spark');
  if(r.hearts <= 0){
    r.hearts = 3;
    r.x = r.check.x; r.y = r.check.y; r.vx = 0; r.vy = 0; r.jumps = 0; r.spin = 0; r.size = 'normal'; r.scale = 1;
    r.level.chasers.forEach(ch => { if(ch.active && !ch.done) ch.bx = r.x - 560; });
    // voltou para antes do trenó/avião: precisa pegar de novo
    r.level.planes.forEach(pl => { if(pl.x > r.x){ pl.taken = false; r.plane = false; } });
    r.level.sleds.forEach(sd => { if(sd.x > r.x){ sd.taken = false; r.sled = false; } });
    r.safe = [{x:r.check.x, y:r.check.y}];
    r.inv = 1.8; r.hurtT = 0;
    r.banner = {text:'💔 Acabaram os corações! Voltando à bandeirinha 🚩', t:2.2};
    tone([392, 330, 262, 196], .7, 'triangle', .07);
    return true;
  }
  return false;
}

// bloco com número da porta da tabuada
// os superpoderes da conta bônus
const POWERS = {
  rapido:{name:'Supervelocidade', icon:'⚡', color:'#FACC15'},
  pulo:{name:'Superpulo', icon:'🦘', color:'#22C55E'},
  escudo:{name:'Escudo', icon:'🛡️', color:'#38BDF8'},
};
// bloco com número da conta bônus: uma chance só
function answerBox(s){
  const r = run, bn = s.door;
  s.bump = 1;
  if(bn.state !== 'open') return;
  const boxes = L_solidsOf().filter(q => q.door === bn);
  if(s.value === bn.q.ans){
    bn.state = 'won';
    boxes.forEach(q => q.done = true);
    const pw = POWERS[bn.power];
    r.power = {kind:bn.power, t:10, max:10};
    for(let k = 0; k < 3; k++) setTimeout(()=> run && gotCoin(s.x0 + 22, s.top - 14 - k * 10, 1, true), k * 90);
    for(let i = 0; i < 18; i++){ const a = i / 18 * 6.28; part(r.x, r.y - 24, Math.cos(a) * 260, Math.sin(a) * 260, .7, pw.color, 4, 'star'); }
    r.banner = {text:`✔ ${bn.q.text} = ${bn.q.ans}! ${pw.icon} ${pw.name} por 10 segundos!`, t:2.4};
    tone([523, 659, 784, 1047, 1319], .6, 'triangle', .07);
    say(`${bn.q.spoken} é igual a ${bn.q.ans}! ${pw.name}!`, 0.95);
    setTimeout(()=> boxes.forEach(q => { q.broken = true; }), 1100);
  } else {
    bn.state = 'lost';
    s.bad = 1;
    r.banner = {text:`✖ Era ${bn.q.ans}. Perdeu a chance do superpoder!`, t:2.2};
    say(`Ops! ${bn.q.spoken} é ${bn.q.ans}. Perdeu a chance!`, 0.95);
    tone([330, 262, 196], .4, 'triangle', .06);
    setTimeout(()=>{
      boxes.forEach(q=>{
        q.broken = true;
        for(let i = 0; i < 8; i++) part(q.x0 + 23, q.top + 23, (Math.random() - .5) * 220, (Math.random() - .5) * 220, .5, 'rgba(255,255,255,.9)', 6, 'dust');
      });
    }, 550);
  }
}
const L_solidsOf = () => run.level.solids;

function hurt(){
  const r = run;
  if(r.inv > 0 || r.state !== 'run') return;
  if(r.power && r.power.kind === 'escudo') return; // escudo protege
  if(r.size === 'big'){ // gigante não perde moedas: só volta ao tamanho normal
    r.size = 'normal'; r.inv = 1.6; r.hurtT = .4; r.shake = .3;
    r.vy = Math.min(r.vy, -380); r.ground = null; r.plat = null; r.jumps = 1;
    r.vx = -r.face * 230;
    r.banner = {text:'Ai! Voltou ao tamanho normal', t:1.4};
    tone([500, 300, 200], .35, 'sawtooth', .05);
    return;
  }
  r.inv = 1.6; r.hurtT = .5; r.shake = .3;
  r.vy = Math.min(r.vy, -420); r.ground = null; r.plat = null; r.jumps = 1;
  r.vx = -r.face * 230;
  tone([300, 200], .3, 'sawtooth', .05);
  loseHeart();
}

function gotCoin(x, y, n, pop){
  const r = run;
  r.coins += n;
  coinSound(n > 1);
  // a moedinha voa até o placar
  r.fly.push({x:x - r.camX, y:y - r.camY, t:0, pop});
  for(let k = 0; k < 5; k++) part(x, y, (Math.random() - .5) * 200, -Math.random() * 180, .4, '#FDE68A', 3, 'spark');
}

function finishRun(){
  const r = run;
  r.state = 'done';
  r.happy = 99;
  runs++;
  hits = 0;
  const pts = r.coins + r.starsGot * 10 + (r.page ? 30 : 0);
  const toWallet = r.coins + r.starsGot * 5 + (r.page ? 20 : 0);
  const firstTime = levelFinished(r.levelId, r.starsGot, r.page);
  walletAdd(toWallet);
  score += pts;
  if(pts) addPoints(pts);
  const pick = ALL_WORDS.find(x => !collectedScores.has(x.word)) || ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
  collectSticker(pick.word, Math.max(10, pts));
  updateTrack();
  ping(true);
  tone([523, 659, 784, 1047], .7, 'triangle', .07);
  setTimeout(()=>{
    if(run !== r) return;
    const stars = [0, 1, 2].map(i => `<span class="${i < r.starsGot ? 'on' : ''}">★</span>`).join('');
    showOverlay(`<div class="ta-ov-card">
        <div class="ta-ov-stars">${stars}</div>
        <b>${r.levelId ? `Fase ${r.levelId} completa!` : 'Corrida completa!'}</b>
        ${r.def ? (r.page ? '<div class="ta-ov-page">📜 Você achou a página do livro!</div>' : '<div class="ta-ov-page miss">📜 A página ficou escondida... jogue de novo para achar!</div>') : ''}
        <small><strong>${r.coins}</strong> ${r.coins === 1 ? 'moeda' : 'moedas'} · <strong>${r.starsGot}</strong> de 3 estrelas · +${pts} pontos</small>
        <div class="ta-ov-wallet"><i class="coin"></i> +${toWallet} na carteira · agora você tem <strong>${wallet}</strong> 🛒</div>
        <div class="ta-ov-sticker"><img src="${pick.art}" alt=""><span>Nova figurinha: <strong>${pick.word}</strong></span></div>
        <div class="ta-ov-btns"><button type="button" class="ta-go ta-go-map" id="taToMap">🗺️ Mapa</button><button type="button" class="m-new-btn ta-go" id="taBack">Voltar às contas ▶</button></div>
      </div>`);
    confetti(taOverlay.firstElementChild);
    $('taToMap').addEventListener('click', e=>{ e.stopPropagation(); hideOverlay(); leaveRaceFs(); showMap(); });
    say(`Fase completa! Você pegou ${r.coins} moedas e ${r.starsGot} ${r.starsGot === 1 ? 'estrela' : 'estrelas'}! Ganhou a figurinha ${pick.word.toLowerCase()}!`, 0.95);
    $('taBack').addEventListener('click', e=>{ e.stopPropagation(); hideOverlay(); leaveRaceFs(); showQuiz(); });
    // história depois da fase (só na primeira vez)
    if(r.levelId && firstTime && STORY['depois-' + r.levelId]) setTimeout(()=> run === r && showStory('depois-' + r.levelId), 2600);
  }, 1600);
}

// ---------- partículas ----------
function part(x, y, vx, vy, life, color, r, kind){ run.parts.push({x, y, vx, vy, life, max:life, color, r, kind}); }
function dust(x, y, f){ part(x, y - 2, -(f || 1) * (40 + Math.random() * 40), -30 - Math.random() * 30, .35, 'rgba(255,255,255,.75)', 3 + Math.random() * 3, 'dust'); }
function puff(x, y, n){ for(let k = 0; k < n; k++) part(x + (Math.random() - .5) * 20, y - 2, (Math.random() - .5) * 160, -Math.random() * 60, .4, 'rgba(255,255,255,.85)', 4 + Math.random() * 3, 'dust'); }
function ring(x, y){ for(let k = 0; k < 10; k++){ const a = k / 10 * 6.28; part(x, y, Math.cos(a) * 150, Math.sin(a) * 50 + 30, .35, 'rgba(255,255,255,.9)', 3, 'dust'); } }
function updateParticles(dt){
  const r = run;
  r.parts = r.parts.filter(p => (p.life -= dt) > 0);
  r.parts.forEach(p=>{
    p.x += p.vx * dt; p.y += p.vy * dt;
    if(p.kind === 'bubble'){ p.vy = -60; p.vx = Math.sin(p.life * 8) * 20; }
    if(p.kind === 'coin' || p.kind === 'star' || p.kind === 'spark' || p.kind === 'rock') p.vy += (p.kind === 'rock' ? 1300 : 700) * dt;
    if(p.kind === 'confetti'){ p.vx += Math.sin(r.t * 5 + p.y) * 20 * dt; }
    if(p.kind === 'dust'){ p.vx *= .92; p.vy *= .92; p.r += dt * 10; }
  });
  r.fly = r.fly.filter(f => (f.t += dt * 2.4) < 1);
  r.weather.forEach(w=>{
    w.ph += dt;
    if(r.theme.weather === 'neve'){ w.y += (30 + w.s * 40) * dt; w.x += Math.sin(w.ph) * 15 * dt - (r.state === 'run' ? 40 * dt * w.s : 0); }
    if(r.theme.weather === 'folhas'){ w.y += (25 + w.s * 25) * dt; w.x += Math.sin(w.ph * 1.5) * 30 * dt - (r.state === 'run' ? 60 * dt * w.s : 0); }
    if(r.theme.weather === 'cinzas'){ w.y -= (25 + w.s * 35) * dt; w.x += Math.sin(w.ph) * 12 * dt; if(w.y < -10){ w.y = H + 10; w.x = Math.random() * W; } }
    if(r.theme.weather === 'vagalumes'){ w.x += Math.sin(w.ph * .7) * 12 * dt - (r.state === 'run' ? 30 * dt * w.s : 0); w.y += Math.cos(w.ph) * 10 * dt; }
    if(w.y > H + 10) w.y = -10;
    if(w.x < -10) w.x = W + 10;
  });
}

// ---------- sons curtinhos ----------
function tone(freqs, dur, type, vol){
  if(!audioEnabled) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || 'square';
    o.connect(g); g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    freqs.forEach((f, i) => o.frequency.setValueAtTime(f, t + i * dur / freqs.length));
    g.gain.setValueAtTime(vol || .05, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.start(t); o.stop(t + dur);
  }catch(e){}
}
const coinSound = big => tone(big ? [988, 1319, 1760] : [988, 1319], big ? .26 : .16, 'square', .035);
const jumpSound = n => tone(n > 1 ? [520, 700, 900] : [330, 520], n > 1 ? .2 : .15, 'triangle', .06);
const springSound = () => tone([300, 500, 800, 1100], .35, 'triangle', .07);
const stompSound = () => tone([600, 300], .15, 'square', .05);
const starSound = () => tone([784, 988, 1175, 1568], .5, 'triangle', .07);

// ============================================================
// Desenho
// ============================================================
function draw(){
  const r = run;
  if(!r || !ctx) return;
  const th = r.theme, L = r.level;
  const c = ctx;

  // céu
  c.fillStyle = vgrad(c, 0, H, th.sky[0], th.sky[1]);
  c.fillRect(0, 0, W, H);
  drawSkyThings(c, r, th);

  // morros ao fundo (dois planos que andam mais devagar)
  [[th.far, .12, 215, 38, 230], [th.mid, .28, 252, 26, 150]].forEach(([col, par, base, amp, wl])=>{
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, H);
    for(let sx = 0; sx <= W; sx += 8){
      const wx = sx + r.camX * par;
      c.lineTo(sx, base - r.camY * par * .5 - amp * Math.sin(wx / wl) - amp * .5 * Math.sin(wx / (wl * .43) + 1));
    }
    c.lineTo(W, H); c.closePath(); c.fill();
  });
  if(th.name === 'Praia'){
    c.fillStyle = '#0B8FD1';
    c.fillRect(0, 262 - r.camY * .2, W, 200);
    c.fillStyle = 'rgba(255,255,255,.55)';
    for(let sx = 0; sx < W + 60; sx += 70){
      const ox = ((sx - r.camX * .35) % 70 + 70) % 70;
      c.fillRect(sx - ox, 272 + ((sx / 70) % 2) * 16 - r.camY * .2, 28, 3);
    }
  }
  // enfeites
  L.decos.forEach(d=>{
    const sx = d.x - r.camX * .55;
    if(sx < -100 || sx > W + 100) return;
    drawDeco(c, th.deco, sx, 300 - r.camY * .55, d.s, r.t, d.v);
  });

  // ----- mundo -----
  c.save();
  const sh = r.shake > 0 ? (Math.random() - .5) * 8 * r.shake / .3 : 0;
  c.translate(-r.camX + sh, -r.camY);
  const vx0 = r.camX - 80, vx1 = r.camX + W + 80;

  // lava (vulcão) ou água (praia) no fundo dos buracos
  if(th.lava || th.name === 'Praia'){
    const top = GY + 70;
    const lg = c.createLinearGradient(0, top, 0, top + 120);
    if(th.lava){ lg.addColorStop(0, '#FDBA74'); lg.addColorStop(.25, '#F97316'); lg.addColorStop(1, '#9A3412'); }
    else { lg.addColorStop(0, '#7DD3FC'); lg.addColorStop(1, '#0369A1'); }
    c.fillStyle = lg;
    c.beginPath(); c.moveTo(vx0, top + 600);
    for(let wx = vx0; wx <= vx1; wx += 20) c.lineTo(wx, top + Math.sin(wx * .03 + r.t * 3) * 5);
    c.lineTo(vx1, top + 600); c.closePath(); c.fill();
    if(th.lava){ for(let k = 0; k < 6; k++){ const bx = vx0 + ((k * 173 + r.t * 40) % (vx1 - vx0)); dot(c, bx, top + 14 + (k % 3) * 8, 3 + Math.abs(Math.sin(r.t * 3 + k)) * 3, '#FDE047'); } }
  }
  L.waters.forEach(z=>{ if(z.x1 > vx0 && z.x0 < vx1) drawWaterBack(c, z, r, vx0, vx1); });
  L.solids.forEach(s=>{
    if(s.x1 < vx0 || s.x0 > vx1) return;
    if(s.broken) return;
    if(s.type === 'box') drawBox(c, s, r.t);
    else if(s.type === 'numbox') drawNumBox(c, s, r.t);
    else if(s.kind === 'door') drawDoor(c, s, r.camY);
    else if(s.kind === 'gate') drawGate(c, s, r);
    else if(s.type === 'ceil') drawCeil(c, s, th, r.camY);
    else if(s.type === 'wall') drawWall(c, s, r.camY);
    else drawGround(c, s, th, r.camY);
  });
  L.plats.forEach(p=>{ if(p.x1 > vx0 && p.x0 < vx1) drawSpecialPlat(c, p, th, r.t); });
  L.keys.forEach(k=>{ if(!k.taken && k.x > vx0 && k.x < vx1) drawKey(c, k, r.t); });
  L.checks.forEach(k=>{ if(k.x > vx0 && k.x < vx1) drawCheck(c, k, r.t); });
  L.textSigns.forEach(g=>{ if(g.x > vx0 - 100 && g.x < vx1) drawTextSign(c, g); });
  L.doors.forEach(bn=>{ if(bn.x > vx0 && bn.x < vx1) drawBonusSign(c, bn, r.t); });
  L.hearts.forEach(h=>{ if(!h.taken && h.x > vx0 && h.x < vx1) drawHeartItem(c, h, r.t); });
  L.cubs.forEach(f=>{ if(!f.taken && f.x > vx0 && f.x < vx1) drawCub(c, f, r.t); });
  L.pages.forEach(pg=>{ if(!pg.taken && pg.x > vx0 && pg.x < vx1) drawPage(c, pg, r.t); });
  L.rollers.forEach(b=>{ if(b.x > vx0 && b.x < vx1) drawRoller(c, b); });
  L.jets.forEach(j=>{ if(j.x > vx0 && j.x < vx1) drawJet(c, j, r.t); });
  L.lamps.forEach(l=>{ if(l.x > vx0 && l.x < vx1) drawLamp(c, l, r.t); });
  L.spikes.forEach(s=>{ if(s.x1 > vx0 && s.x0 < vx1) drawSpikes(c, s, th); });
  L.springs.forEach(s=>{ if(s.x > vx0 && s.x < vx1) drawSpring(c, s, th); });
  L.crushers.forEach(cr=>{ if(cr.x + cr.w > vx0 && cr.x < vx1) drawCrusher(c, cr, r.t, r.camY); });
  L.spinners.forEach(sp=>{ if(Math.abs(sp.cx - (vx0 + vx1) / 2) < W) drawSpinner(c, sp, r.t); });
  L.masks.forEach(m=>{ if(!m.taken && m.x > vx0 && m.x < vx1) drawMask(c, m, r.t); });
  L.winds.forEach(wd=>{ if(wd.x1 > vx0 && wd.x0 < vx1) drawWind(c, wd, r.t, r.camY); });
  L.icicles.forEach(ic=>{ if(ic.st !== 'gone' && ic.x > vx0 && ic.x < vx1) drawIcicle(c, ic); });
  L.sleds.forEach(sd=>{ if(!sd.taken && sd.x > vx0 && sd.x < vx1) drawSled(c, sd.x, GY, 1); });
  L.planes.forEach(pl=>{ if(!pl.taken && pl.x > vx0 && pl.x < vx1) drawPlane(c, pl.x, GY - 6, r.t, 1); });
  L.storms.forEach(st=>{ if(st.x + st.r > vx0 && st.x - st.r < vx1) drawStorm(c, st, r.t); });
  L.chasers.forEach(ch=>{ if(ch.active && !ch.done) drawBigBall(c, ch); });
  L.signs.forEach(g=>{ if(g.x > vx0 && g.x < vx1) drawSign(c, g); });
  L.foods.forEach(f=>{ if(f.x > vx0 && f.x < vx1) drawFood(c, f, r.t, r.size === f.size); });
  if(L.halfX > vx0 && L.halfX < vx1) drawHalfFlag(c, L.halfX, r.t, r.halfShown);
  drawFlag(c, L.flagX, r.t);
  L.coins.forEach(co=>{ if(!co.taken && co.x > vx0 && co.x < vx1) drawCoin(c, co.x, co.y, r.t, 11, th.name === 'Noite'); });
  L.stars.forEach(s=>{ if(!s.taken && s.x > vx0 && s.x < vx1) drawStar(c, s.x, s.y, r.t); });
  L.enemies.forEach(e=>{ if(e.x > vx0 && e.x < vx1) drawEnemy(c, e, th, r.t); });

  // personagem
  const onFloor = r.ground || r.plat;
  if(onFloor){
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.beginPath(); c.ellipse(r.x, r.y + 2, 21 * r.scale, 5 * r.scale, 0, 0, Math.PI * 2); c.fill();
  }
  const state = r.state === 'ready' ? 'idle' : r.hurtT > 0 ? 'hurt' : r.state === 'done' && onFloor && r.x >= L.endX - 2 ? 'win' : !onFloor ? (r.vy < 0 ? 'jump' : 'fall') : Math.abs(r.vx) > 30 ? 'run' : 'idle';
  if(r.sled) drawSled(c, r.x, r.y, 1.1);
  if(r.plane) drawPlane(c, r.x, r.y - 4, r.t, 1.15);
  if(!(r.inv > 0 && Math.floor(r.inv * 14) % 2)){
    if(r.power){
      const pw = POWERS[r.power.kind], pulse = .5 + .5 * Math.sin(r.t * 10);
      c.save(); c.globalAlpha = r.power.t < 2 ? (Math.floor(r.t * 8) % 2 ? .25 : .7) : .55 + pulse * .2;
      const g = c.createRadialGradient(r.x, r.y - 26 * r.scale, 5, r.x, r.y - 26 * r.scale, 44 * r.scale);
      g.addColorStop(0, pw.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(r.x, r.y - 26 * r.scale, 44 * r.scale, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    drawChar(c, charId || 'capivara', r.x, r.y, {t:r.anim, state, spin:r.spin, happy:r.happy > 0 || !!r.power, jet:r.jet > 0}, 1.12 * r.scale, [r.squash[0] * r.face, r.squash[1]]);
  }

  L.waters.forEach(z=>{ if(z.x1 > vx0 && z.x0 < vx1) drawWaterFront(c, z, r, vx0, vx1); });
  // arbustos na frente (ficam meio transparentes quando o personagem entra)
  L.bushes.forEach(b=>{ if(b.x1 > vx0 && b.x0 < vx1) drawBush(c, b, r.x > b.x0 - 10 && r.x < b.x1 + 10); });
  // partículas
  r.parts.forEach(p=>{
    const a = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    c.globalAlpha = a;
    if(p.kind === 'trail'){ c.globalAlpha = 1; drawTrailBit(c, p.x, p.y, p.fx, p.life / p.max, p.hue); }
    else if(p.kind === 'coin') drawCoin(c, p.x, p.y, r.t * 3, 8);
    else if(p.kind === 'star'){ c.fillStyle = p.color; starPath(c, p.x, p.y, p.r * 1.4, p.r * .6); c.fill(); }
    else if(p.kind === 'bubble'){ c.strokeStyle = p.color; c.lineWidth = 1.4; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke(); }
    else if(p.kind === 'rock'){ c.fillStyle = p.color; c.save(); c.translate(p.x, p.y); c.rotate(p.life * 6); c.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .8); c.restore(); }
    else if(p.kind === 'confetti'){ c.fillStyle = p.color; c.save(); c.translate(p.x, p.y); c.rotate(p.y * .05); c.fillRect(-3, -2, 6, 4); c.restore(); }
    else { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
  });
  c.globalAlpha = 1;
  c.restore();

  drawWeather(c, r, th);
  if(th.dark) drawDarkness(c, r, L);
  drawHud(c, r, L);
}

function drawSkyThings(c, r, th){
  if(th.name === 'Vulcão'){
    // brilho vermelho no horizonte e fumaça escura
    const g = c.createRadialGradient(560, 300, 20, 560, 300, 420);
    g.addColorStop(0, 'rgba(251,146,60,.45)'); g.addColorStop(1, 'rgba(251,146,60,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for(let k = 0; k < 4; k++){
      const cx = ((k * 260 - r.camX * (.05 + k * .02)) % (W + 240) + W + 240) % (W + 240) - 120, cy = 50 + (k % 2) * 30 - r.camY * .08;
      c.fillStyle = 'rgba(41,37,36,.55)';
      c.beginPath(); c.arc(cx, cy, 22, 0, Math.PI * 2); c.arc(cx + 26, cy - 10, 28, 0, Math.PI * 2); c.arc(cx + 54, cy, 22, 0, Math.PI * 2); c.fill();
    }
    return;
  }
  if(th.name === 'Noite'){
    for(let k = 0; k < 60; k++){
      const x = (k * 137.5) % W, y = (k * 53.3) % 220;
      c.globalAlpha = .45 + .55 * Math.abs(Math.sin(r.t * 1.5 + k));
      dot(c, x, y - r.camY * .05, (k % 3) * .5 + .7, '#fff');
    }
    c.globalAlpha = 1;
    c.save(); c.shadowColor = '#FEF9C3'; c.shadowBlur = 30;
    dot(c, 650, 78 - r.camY * .05, 32, '#FEF9C3'); c.restore();
    dot(c, 640, 70 - r.camY * .05, 6, 'rgba(0,0,0,.08)');
    dot(c, 662, 90 - r.camY * .05, 4, 'rgba(0,0,0,.08)');
    return;
  }
  // sol
  c.save(); c.shadowColor = '#FDE68A'; c.shadowBlur = 40;
  dot(c, 670, 74 - r.camY * .05, 30, th.name === 'Neve' ? '#FFF7D6' : '#FDE047'); c.restore();
  // nuvens fofinhas
  for(let k = 0; k < 5; k++){
    const cx = ((k * 230 - r.camX * (.06 + k * .02)) % (W + 240) + W + 240) % (W + 240) - 120;
    const cy = 46 + (k % 3) * 34 - r.camY * .08;
    c.fillStyle = 'rgba(255,255,255,.92)';
    c.beginPath();
    c.arc(cx, cy, 17, 0, Math.PI * 2); c.arc(cx + 20, cy - 10, 22, 0, Math.PI * 2);
    c.arc(cx + 44, cy - 2, 18, 0, Math.PI * 2); c.arc(cx + 24, cy + 6, 16, 0, Math.PI * 2);
    c.fill();
  }
}

function drawWeather(c, r, th){
  if(!th.weather) return;
  r.weather.forEach(w=>{
    if(th.weather === 'neve'){ dot(c, w.x, w.y, 1.5 + w.s * 2, 'rgba(255,255,255,.9)'); }
    else if(th.weather === 'folhas'){
      if(w.s < .55) return;
      c.save(); c.translate(w.x, w.y); c.rotate(w.ph * 2);
      c.fillStyle = w.s > .8 ? '#F59E0B' : '#65A30D';
      c.beginPath(); c.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2); c.fill(); c.restore();
    } else if(th.weather === 'cinzas'){
      if(w.s < .4) return;
      c.save(); c.globalAlpha = .5 + .5 * Math.abs(Math.sin(w.ph * 3)); c.shadowColor = '#FB923C'; c.shadowBlur = 6;
      dot(c, w.x, w.y, 1.6 + w.s, '#FDBA74'); c.restore();
    } else if(th.weather === 'vagalumes'){
      if(w.s < .5) return;
      c.save(); c.globalAlpha = .4 + .6 * Math.abs(Math.sin(w.ph * 2)); c.shadowColor = '#FDE047'; c.shadowBlur = 8;
      dot(c, w.x, w.y, 2.2, '#FEF08A'); c.restore();
    }
  });
}

function drawGround(c, s, th, camY){
  const x0 = s.x0, x1 = s.x1, top = s.top, w = x1 - x0;
  const bottom = Math.max(top + 260, H + 40, H - camY + 40, camY + H + 40);
  c.save();
  // terra
  rr(c, x0, top + 4, w, bottom - top, 10);
  c.fillStyle = vgrad(c, top, top + 120, th.dirt, th.dirt2); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.stroke();
  // pedrinhas
  c.save(); rr(c, x0, top + 4, w, bottom - top, 10); c.clip();
  for(let px = Math.floor(x0 / 52) * 52 + 26; px < x1; px += 52){
    const k = Math.abs(Math.sin(px * 12.9898)) * 1000 % 1;
    const py = top + 34 + k * 60;
    c.fillStyle = th.rock; c.globalAlpha = .55;
    c.beginPath(); c.ellipse(px + k * 14, py, 7 + k * 5, 4 + k * 3, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = .25; c.fillStyle = '#000';
    c.beginPath(); c.ellipse(px + k * 14 + 2, py + 2, 7 + k * 5, 3, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
  // grama (borda ondulada)
  c.beginPath();
  c.moveTo(x0 - 3, top + 3);
  c.arcTo(x0 - 3, top - 5, x0 + 6, top - 5, 7);
  c.lineTo(x1 - 6, top - 5);
  c.arcTo(x1 + 3, top - 5, x1 + 3, top + 3, 7);
  c.lineTo(x1 + 3, top + 10);
  for(let px = x1; px > x0; px -= 16) c.quadraticCurveTo(px - 8, top + 20, px - 16, top + 10);
  c.closePath();
  c.fillStyle = vgrad(c, top - 5, top + 18, th.grass, th.grass2); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)';
  rr(c, x0 + 6, top - 3, w - 12, 3, 2); c.fill();
  // tufinhos de grama / florzinhas
  if(th.name !== 'Neve' && th.name !== 'Praia'){
    for(let px = Math.floor(x0 / 70) * 70 + 35; px < x1 - 10; px += 70){
      if(px < x0 + 10) continue;
      c.strokeStyle = th.grass2; c.lineWidth = 2;
      c.beginPath(); c.moveTo(px, top - 4); c.lineTo(px - 3, top - 11); c.moveTo(px + 4, top - 4); c.lineTo(px + 5, top - 12); c.stroke();
      if((px / 70) % 3 === 0) dot(c, px + 12, top - 8, 3, th.name === 'Noite' ? '#C4B5FD' : '#F472B6');
    }
  }
  c.restore();
}

// túnel baixo: uma rocha que desce do alto até pertinho do chão
function drawCeil(c, s, th, camY){
  const top = camY - 20, w = s.x1 - s.x0, bot = s.bottom;
  c.save();
  // sombra dentro do túnel
  c.fillStyle = 'rgba(15,10,40,.28)';
  c.fillRect(s.x0, bot, w, GY - bot);
  rr(c, s.x0 - 6, top, w + 12, bot - top, 14);
  c.fillStyle = vgrad(c, bot - 90, bot, th.dirt, th.dirt2); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2.5; c.stroke();
  c.save(); rr(c, s.x0 - 6, top, w + 12, bot - top, 14); c.clip();
  for(let px = s.x0 + 18; px < s.x1; px += 44){
    for(let py = bot - 22; py > top; py -= 38){
      const k = Math.abs(Math.sin(px * 3.1 + py)) % 1;
      c.fillStyle = th.rock; c.globalAlpha = .5;
      c.beginPath(); c.ellipse(px + k * 12, py, 9 + k * 4, 6, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }
  c.restore();
  // beirada de baixo com musgo/neve
  c.fillStyle = th.grass2;
  for(let px = s.x0; px < s.x1; px += 14){ c.beginPath(); c.ellipse(px + 7, bot - 2, 8, 4, 0, 0, Math.PI); c.fill(); }
  c.restore();
}

// paredão de pedras rachadas (só o gigante quebra)
function drawWall(c, s, camY){
  const top = camY - 20, w = s.x1 - s.x0;
  c.save();
  c.strokeStyle = '#374151'; c.lineWidth = 2;
  let row = 0;
  for(let y = GY; y > top; y -= 30, row++){
    const off = row % 2 ? -w / 4 : 0;
    for(let bx = s.x0 + off; bx < s.x1; bx += w / 2){
      const x0 = Math.max(s.x0, bx), x1 = Math.min(s.x1, bx + w / 2);
      if(x1 - x0 < 4) continue;
      rr(c, x0 + 1, y - 29, x1 - x0 - 2, 28, 5);
      c.fillStyle = vgrad(c, y - 30, y, row % 3 ? '#9CA3AF' : '#A8A29E', '#6B7280'); c.fill(); c.stroke();
    }
  }
  // rachaduras
  c.strokeStyle = 'rgba(31,41,55,.75)'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(s.x0 + w * .3, GY - 10); c.lineTo(s.x0 + w * .55, GY - 50); c.lineTo(s.x0 + w * .35, GY - 80); c.lineTo(s.x0 + w * .65, GY - 130); c.stroke();
  c.beginPath(); c.moveTo(s.x0 + w * .55, GY - 50); c.lineTo(s.x0 + w * .8, GY - 60); c.stroke();
  c.restore();
}

// placa com a dica: qual comida usar
function drawSign(c, g){
  const big = g.size === 'big', norm = g.size === 'normal';
  c.save();
  c.translate(g.x, GY);
  c.fillStyle = '#8B5A2B'; c.fillRect(-3, -54, 6, 54);
  rr(c, -48, -88, 96, 40, 8);
  c.fillStyle = vgrad(c, -88, -48, '#F5D0A0', '#D9A066'); c.fill();
  c.strokeStyle = '#7C4A1E'; c.lineWidth = 2.5; c.stroke();
  c.font = '20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(big ? '🍉' : norm ? '🍎' : '🍇', -28, -68);
  c.fillStyle = '#7C4A1E'; c.font = '700 11px Nunito, sans-serif';
  c.fillText(big ? 'GIGANTE' : norm ? 'NORMAL' : 'PEQUENO', 14, -61);
  c.font = '700 16px sans-serif';
  c.fillText(big ? '⬆' : norm ? '↔' : '⬇', 14, -77);
  c.restore();
}

// comidas que mudam o tamanho
function drawFood(c, f, t, same){
  const bob = Math.sin(t * 3 + f.x * .01) * 3;
  const pop = 1 + (f.pop || 0) * .5;
  c.save();
  c.translate(f.x, f.y + bob);
  c.scale(pop, pop);
  c.globalAlpha = same ? .45 : 1; // já está desse tamanho: fica clarinha
  // brilho em volta
  const col = f.size === 'small' ? 'rgba(168,85,247,.35)' : f.size === 'big' ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.3)';
  c.fillStyle = col; c.beginPath(); c.arc(0, 0, 19 + Math.sin(t * 5) * 2, 0, Math.PI * 2); c.fill();
  c.lineJoin = 'round';
  if(f.size === 'small'){ // cacho de uva
    c.strokeStyle = '#4C1D95'; c.lineWidth = 1.4;
    [[-6, -5], [0, -6], [6, -5], [-3, 1], [3, 1], [0, 7]].forEach(([x, y])=>{
      c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2);
      const g = c.createRadialGradient(x - 2, y - 2, 1, x, y, 5); g.addColorStop(0, '#D8B4FE'); g.addColorStop(1, '#7E22CE');
      c.fillStyle = g; c.fill(); c.stroke();
    });
    c.strokeStyle = '#65A30D'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -11); c.lineTo(1, -16); c.stroke();
    c.fillStyle = '#22C55E'; c.beginPath(); c.ellipse(6, -14, 5, 2.5, -.4, 0, Math.PI * 2); c.fill();
  } else if(f.size === 'big'){ // fatia de melancia
    c.rotate(-.15);
    c.beginPath(); c.moveTo(-14, -3); c.arc(0, -3, 14, 0, Math.PI); c.closePath();
    c.fillStyle = '#15803D'; c.fill();
    c.beginPath(); c.moveTo(-12, -3); c.arc(0, -3, 12, 0, Math.PI); c.closePath(); c.fillStyle = '#F0FDF4'; c.fill();
    c.beginPath(); c.moveTo(-10.5, -3); c.arc(0, -3, 10.5, 0, Math.PI); c.closePath(); c.fillStyle = '#F43F5E'; c.fill();
    c.strokeStyle = '#14532D'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-14, -3); c.arc(0, -3, 14, 0, Math.PI); c.closePath(); c.stroke();
    c.fillStyle = '#1F2937';
    [[-5, 0], [0, 3], [5, 0], [-2, 6], [3, 6]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y - 1, 1.2, 1.9, 0, 0, Math.PI * 2); c.fill(); });
  } else { // maçã
    c.beginPath(); c.moveTo(0, -6);
    c.bezierCurveTo(-6, -12, -14, -6, -12, 2); c.bezierCurveTo(-10, 10, -4, 12, 0, 9);
    c.bezierCurveTo(4, 12, 10, 10, 12, 2); c.bezierCurveTo(14, -6, 6, -12, 0, -6); c.closePath();
    const g = c.createRadialGradient(-4, -4, 2, 0, 0, 14); g.addColorStop(0, '#FCA5A5'); g.addColorStop(1, '#DC2626');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#7F1D1D'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = '#78350F'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -6); c.lineTo(1, -12); c.stroke();
    c.fillStyle = '#22C55E'; c.beginPath(); c.ellipse(6, -11, 5, 2.5, -.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-5, -3, 2, 3.5, .4, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ---------- desafios especiais: regras e desenhos ----------
const blinkOn = (p, t) => ((t + p.off) % p.per) < p.on;
function platSolid(p, t){
  if(p.hidden) return false;
  if(p.falls && (p.st === 'fall' || p.st === 'gone')) return false;
  if(p.blink && !blinkOn(p, t)) return false;
  return true;
}
// altura do jato de lava agora (0 = desligado)
function jetHeight(j, t){
  const k = ((t + j.off) % j.per);
  if(k < j.act) return Math.sin(Math.min(1, k / j.act) * Math.PI) * 190;
  return 0;
}

function drawSpecialPlat(c, p, th, t){
  if(p.hidden){ // contorno pontilhado: tem algo escondido aqui
    c.save();
    c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
    rr(c, p.x0, p.y, p.x1 - p.x0, 18, 8); c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '700 14px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('?', (p.x0 + p.x1) / 2, p.y + 9);
    c.restore();
    return;
  }
  if(p.falls && p.st === 'gone') return;
  c.save();
  if(p.blink){
    const k = (t + p.off) % p.per;
    if(k >= p.on){ // sumiu: só uma sombra
      c.globalAlpha = .18; drawPlat(c, p, th); c.restore(); return;
    }
    if(p.on - k < .5) c.globalAlpha = Math.floor(k * 14) % 2 ? .35 : 1; // pisca antes de sumir
  }
  if(p.falls && p.st === 'shake') c.translate((Math.random() - .5) * 4, 0);
  if(p.pop){ const sc = 1 + p.pop * .25, cx = (p.x0 + p.x1) / 2; c.translate(cx, p.y); c.scale(sc, sc); c.translate(-cx, -p.y); }
  drawPlat(c, p, th);
  c.restore();
}

function drawKey(c, k, t){
  const y = k.y + Math.sin(t * 3) * 4;
  c.save();
  c.translate(k.x, y); c.rotate(t * 1.5);
  c.shadowColor = '#67E8F9'; c.shadowBlur = 22;
  starPath(c, 0, 0, 17, 8);
  c.fillStyle = vgrad(c, -17, 17, '#ECFEFF', '#22D3EE'); c.fill();
  c.shadowBlur = 0; c.strokeStyle = '#0E7490'; c.lineWidth = 2; c.stroke();
  c.restore();
  // anel girando em volta
  c.save(); c.strokeStyle = 'rgba(103,232,249,.6)'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(k.x, y, 26, 9, t * 2, 0, Math.PI * 2); c.stroke(); c.restore();
}

function drawRoller(c, b){
  c.save();
  c.translate(b.x, b.y - b.r); c.rotate(b.rot);
  c.beginPath(); c.arc(0, 0, b.r, 0, Math.PI * 2);
  c.fillStyle = vgrad(c, -b.r, b.r, '#FFFFFF', '#BFDBFE'); c.fill();
  c.strokeStyle = '#93C5FD'; c.lineWidth = 2; c.stroke();
  c.fillStyle = 'rgba(147,197,253,.6)';
  c.beginPath(); c.arc(b.r * .3, -b.r * .2, b.r * .25, 0, Math.PI * 2); c.arc(-b.r * .35, b.r * .3, b.r * .18, 0, Math.PI * 2); c.fill();
  c.restore();
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(b.x, b.y + 2, b.r, 4, 0, 0, Math.PI * 2); c.fill();
}

function drawJet(c, j, t){
  // buraco de onde sai a lava
  c.save();
  c.fillStyle = '#1C1917'; c.beginPath(); c.ellipse(j.x, GY - 1, 18, 6, 0, 0, Math.PI * 2); c.fill();
  const h = jetHeight(j, t);
  const k = ((t + j.off) % j.per);
  if(h <= 0 && k > j.per - .6){ // avisa: borbulha antes de jorrar
    for(let i = 0; i < 3; i++) dot(c, j.x - 8 + i * 8, GY - 6 - Math.abs(Math.sin(t * 12 + i)) * 10, 3, '#FB923C');
  }
  if(h > 0){
    const g = c.createLinearGradient(0, GY - h, 0, GY);
    g.addColorStop(0, '#FDE047'); g.addColorStop(.4, '#F97316'); g.addColorStop(1, '#B91C1C');
    c.shadowColor = '#F97316'; c.shadowBlur = 18;
    c.fillStyle = g;
    c.beginPath(); c.moveTo(j.x - 11, GY); c.quadraticCurveTo(j.x - 16, GY - h * .6, j.x, GY - h); c.quadraticCurveTo(j.x + 16, GY - h * .6, j.x + 11, GY); c.closePath(); c.fill();
  }
  c.restore();
}

function drawLamp(c, l, t){
  c.save();
  c.fillStyle = '#44403C'; c.fillRect(l.x - 3, GY - 90, 6, 90);
  c.fillRect(l.x - 3, GY - 90, 22, 5);
  const lx = l.x + 16, ly = GY - 74;
  if(l.lit){ c.shadowColor = '#FDE047'; c.shadowBlur = 30; }
  rr(c, lx - 10, ly - 4, 20, 24, 6);
  c.fillStyle = l.lit ? '#FDE68A' : '#57534E'; c.fill();
  c.shadowBlur = 0; c.strokeStyle = '#1C1917'; c.lineWidth = 2; c.stroke();
  if(!l.lit){ c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '700 13px sans-serif'; c.textAlign = 'center'; c.fillText('?', lx, ly + 13); }
  c.restore();
}

// Fase 4: tudo escuro, com luz em volta do personagem, das lanternas acesas e das moedas
let darkCv = null;
function drawDarkness(c, r, L){
  if(!darkCv){ darkCv = document.createElement('canvas'); darkCv.width = W; darkCv.height = H; }
  const d = darkCv.getContext('2d');
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, W, H);
  d.fillStyle = 'rgba(6,6,24,.9)'; d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-out';
  const hole = (x, y, rad, a)=>{
    const g = d.createRadialGradient(x, y, rad * .25, x, y, rad);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g; d.beginPath(); d.arc(x, y, rad, 0, Math.PI * 2); d.fill();
  };
  hole(r.x - r.camX, r.y - 30 - r.camY, 165, 1);
  L.lamps.forEach(l => { if(l.lit) hole(l.x + 16 - r.camX, GY - 74 - r.camY, 260, 1); else hole(l.x + 16 - r.camX, GY - 74 - r.camY, 40, .7); });
  L.coins.forEach(co => { if(!co.taken) hole(co.x - r.camX, co.y - r.camY, 22, .8); });
  L.stars.forEach(st => { if(!st.taken) hole(st.x - r.camX, st.y - r.camY, 46, .9); });
  hole(L.flagX - r.camX, GY - 100 - r.camY, 160, .8);
  c.drawImage(darkCv, 0, 0, W, H);
}

// ---------- peças da história ----------
function drawCheck(c, k, t){
  const gy = k.y || GY;
  c.save();
  c.fillStyle = '#78716C'; c.fillRect(k.x - 2, gy - 66, 4, 66);
  const wave = Math.sin(t * 6) * 2;
  c.fillStyle = k.on ? '#22C55E' : '#CBD5E1';
  c.beginPath(); c.moveTo(k.x + 2, gy - 66); c.lineTo(k.x + 32, gy - 58 + wave); c.lineTo(k.x + 2, gy - 48); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.5; c.stroke();
  if(k.on){ c.shadowColor = '#86EFAC'; c.shadowBlur = 10; dot(c, k.x, gy - 68, 4, '#FDE047'); }
  else dot(c, k.x, gy - 68, 4, '#94A3B8');
  c.restore();
}
function drawTextSign(c, g){
  c.save();
  c.font = '700 13px Nunito, sans-serif';
  const w = Math.min(260, c.measureText(g.text).width + 24);
  c.fillStyle = '#8B5A2B'; c.fillRect(g.x - 3, GY - 50, 6, 50);
  rr(c, g.x - w / 2, GY - 92, w, 42, 8);
  c.fillStyle = vgrad(c, GY - 92, GY - 50, '#FDE7C3', '#E8B97A'); c.fill();
  c.strokeStyle = '#7C4A1E'; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = '#5B3412'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(g.text, g.x, GY - 71, w - 14);
  c.restore();
}
function drawHeartItem(c, h, t){
  const y = h.y + Math.sin(t * 3 + h.x) * 3, s = 1 + Math.sin(t * 6) * .08;
  c.save(); c.translate(h.x, y); c.scale(s * 1.3, s * 1.3);
  c.shadowColor = '#FB7185'; c.shadowBlur = 12;
  c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-13, -1, -8, -12, 0, -5); c.bezierCurveTo(8, -12, 13, -1, 0, 8); c.closePath();
  c.fillStyle = '#F43F5E'; c.fill(); c.shadowBlur = 0; c.strokeStyle = '#9F1239'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(-4, -3, 2, 0, Math.PI * 2); c.fill();
  c.restore();
}
// filhotinhos: pintinho, raposinha e coelhinho
function drawCub(c, f, t){
  const hop = Math.abs(Math.sin(t * 4 + f.x)) * 4;
  c.save(); c.translate(f.x, f.y - hop);
  c.strokeStyle = '#3F2A16'; c.lineWidth = 1.8; c.lineJoin = 'round';
  const col = ['#FDE047', '#FB923C', '#F8FAFC'][f.kind % 3];
  // ninho
  c.fillStyle = '#A16207'; c.beginPath(); c.ellipse(0, hop - 2, 18, 6, 0, 0, Math.PI * 2); c.fill();
  // orelhas
  if(f.kind % 3 === 1){ c.fillStyle = col; [-6, 6].forEach(ex => { c.beginPath(); c.moveTo(ex - 4, -24); c.lineTo(ex, -34); c.lineTo(ex + 4, -24); c.closePath(); c.fill(); c.stroke(); }); }
  if(f.kind % 3 === 2){ c.fillStyle = col; [-5, 5].forEach(ex => { c.beginPath(); c.ellipse(ex, -32, 3.5, 9, ex * .04, 0, Math.PI * 2); c.fill(); c.stroke(); }); }
  c.beginPath(); c.arc(0, -14, 13, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.stroke();
  dot(c, -4.5, -16, 2.2, '#1F130A'); dot(c, 4.5, -16, 2.2, '#1F130A');
  dot(c, -3.8, -16.8, .8, '#fff'); dot(c, 5.2, -16.8, .8, '#fff');
  if(f.kind % 3 === 0){ c.fillStyle = '#F97316'; c.beginPath(); c.moveTo(-3, -12); c.lineTo(3, -12); c.lineTo(0, -8); c.closePath(); c.fill(); }
  else { dot(c, 0, -11, 2, '#1F130A'); }
  c.fillStyle = 'rgba(244,114,182,.5)'; c.beginPath(); c.arc(-8, -11, 2.4, 0, Math.PI * 2); c.arc(8, -11, 2.4, 0, Math.PI * 2); c.fill();
  // balãozinho pedindo ajuda
  c.font = '700 13px Fredoka, sans-serif'; c.textAlign = 'center';
  rr(c, -14, -56 - Math.sin(t * 3) * 2, 28, 18, 9); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.2; c.stroke();
  c.fillStyle = '#E11D48'; c.fillText('!', 0, -43 - Math.sin(t * 3) * 2);
  c.restore();
}
function drawPage(c, pg, t){
  const y = pg.y + Math.sin(t * 2.5) * 5;
  c.save(); c.translate(pg.x, y); c.rotate(Math.sin(t * 1.8) * .15);
  c.shadowColor = '#FDE047'; c.shadowBlur = 24;
  rr(c, -15, -19, 30, 38, 4); c.fillStyle = '#FFFBEB'; c.fill();
  c.shadowBlur = 0; c.strokeStyle = '#B45309'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#B45309'; c.font = '700 13px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('×÷', 0, -6);
  c.strokeStyle = 'rgba(180,83,9,.5)'; c.lineWidth = 1.5;
  [4, 9, 14].forEach(ly => { c.beginPath(); c.moveTo(-9, ly); c.lineTo(9, ly); c.stroke(); });
  c.restore();
}
// placa da conta bônus (some quando a chance acaba)
function drawBonusSign(c, bn, t){
  if(bn.state === 'lost') return;
  const pw = POWERS[bn.power];
  const txt = bn.state === 'won' ? `${bn.q.text} = ${bn.q.ans} ✔` : `${bn.q.text} = ?`;
  c.save();
  c.font = '700 20px Fredoka, sans-serif';
  const tw = c.measureText(txt).width + 64, y = GY - 210 + Math.sin(t * 2) * 3;
  rr(c, bn.x - tw / 2, y, tw, 38, 12);
  c.fillStyle = bn.state === 'won' ? '#DCFCE7' : '#FFFFFF'; c.fill();
  c.strokeStyle = pw.color; c.lineWidth = 3; c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#1A1238'; c.fillText(txt, bn.x + 12, y + 20);
  c.font = '18px sans-serif'; c.fillText(pw.icon, bn.x - tw / 2 + 20, y + 20);
  c.restore();
}

function drawNumBox(c, s, t){
  const y = s.top - Math.sin(s.bump * Math.PI) * 8;
  if(s.bump) s.bump = Math.max(0, s.bump - .04);
  if(s.bad) s.bad = Math.max(0, s.bad - .02);
  const w = s.x1 - s.x0;
  c.save();
  rr(c, s.x0, y, w, 46, 9);
  c.fillStyle = s.done ? (s.value === s.door.q.ans ? vgrad(c, y, y + 46, '#86EFAC', '#16A34A') : vgrad(c, y, y + 46, '#CBD5E1', '#94A3B8'))
    : s.bad > 0 ? vgrad(c, y, y + 46, '#FECACA', '#EF4444') : vgrad(c, y, y + 46, '#A5F3FC', '#0EA5E9');
  c.fill(); c.strokeStyle = '#075985'; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.45)'; rr(c, s.x0 + 5, y + 4, w - 10, 5, 3); c.fill();
  c.fillStyle = '#fff'; c.font = '700 22px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.strokeStyle = '#0C4A6E'; c.lineWidth = 4; c.strokeText(s.value, s.x0 + w / 2, y + 24); c.fillText(s.value, s.x0 + w / 2, y + 24);
  c.restore();
}
function drawDoor(c, s, camY){
  const dr = s.door, w = s.x1 - s.x0, top = camY - 30;
  const lift = dr.open ? Math.min(1, 1 - (dr.openT || 0)) : 0;
  if(dr.openT) dr.openT = Math.max(0, dr.openT - .02);
  c.save();
  // coluna de pedra até o céu (não dá para pular por cima)
  c.fillStyle = vgrad(c, top, GY, '#A8A29E', '#57534E');
  c.fillRect(s.x0 - 8, top, w + 16, GY - 170 - top);
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2;
  for(let y = GY - 200; y > top; y -= 32){ c.beginPath(); c.moveTo(s.x0 - 8, y); c.lineTo(s.x1 + 8, y); c.stroke(); }
  // a porta (sobe quando abre)
  const dy = -lift * 170;
  c.save(); c.beginPath(); c.rect(s.x0 - 8, GY - 170, w + 16, 170); c.clip();
  rr(c, s.x0, GY - 170 + dy, w, 170, 6);
  c.fillStyle = vgrad(c, GY - 170, GY, '#B45309', '#78350F'); c.fill();
  c.strokeStyle = '#451A03'; c.lineWidth = 2.5; c.stroke();
  c.strokeStyle = 'rgba(69,26,3,.55)'; c.lineWidth = 2;
  [w * .33, w * .66].forEach(px => { c.beginPath(); c.moveTo(s.x0 + px, GY - 166 + dy); c.lineTo(s.x0 + px, GY - 4 + dy); c.stroke(); });
  if(!dr.open){ dot(c, s.x0 + w / 2, GY - 80, 8, '#FACC15'); c.fillStyle = '#78350F'; c.fillRect(s.x0 + w / 2 - 2, GY - 80, 4, 8); }
  c.restore();
  // placa com a conta
  c.font = '700 20px Fredoka, sans-serif';
  const txt = dr.open ? `${dr.q.text} = ${dr.q.ans} ✔` : `${dr.q.text} = ?`;
  const tw = c.measureText(txt).width + 26;
  rr(c, s.x0 + w / 2 - tw / 2, GY - 214, tw, 36, 10);
  c.fillStyle = dr.open ? '#DCFCE7' : '#FFFFFF'; c.fill();
  c.strokeStyle = dr.open ? '#16A34A' : '#0EA5E9'; c.lineWidth = 3; c.stroke();
  c.fillStyle = '#1A1238'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(txt, s.x0 + w / 2, GY - 195);
  c.restore();
}
function drawGate(c, s, r){
  const w = s.x1 - s.x0, top = r.camY - 30;
  const lift = s.open ? 1 - (s.openT || 0) : 0;
  c.save();
  c.fillStyle = vgrad(c, top, GY, '#4D7C0F', '#365314');
  c.fillRect(s.x0 - 10, top, w + 20, GY - 190 - top);
  c.save(); c.beginPath(); c.rect(s.x0 - 10, GY - 190, w + 20, 190); c.clip();
  const dy = -lift * 190;
  c.fillStyle = '#92400E';
  for(let k = 0; k < 4; k++){ rr(c, s.x0 + k * (w / 4) + 2, GY - 186 + dy, w / 4 - 4, 186, 6); c.fill(); }
  c.fillStyle = '#78350F'; c.fillRect(s.x0, GY - 140 + dy, w, 10); c.fillRect(s.x0, GY - 60 + dy, w, 10);
  c.restore();
  // os filhotes que faltam
  for(let k = 0; k < s.need; k++){
    const got = k < r.cubs;
    c.globalAlpha = got ? 1 : .35;
    c.font = '20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🐣', s.x0 + w / 2 + (k - (s.need - 1) / 2) * 26, GY - 212);
  }
  c.globalAlpha = 1;
  c.restore();
}
function drawBush(c, b, inside){
  c.save();
  c.globalAlpha = inside ? .45 : .97;
  const w = b.x1 - b.x0;
  c.fillStyle = '#15803D';
  for(let k = 0; k <= 5; k++){ const bx = b.x0 + k * w / 5; c.beginPath(); c.arc(bx, GY - 34 - (k % 2) * 14, 34 + (k % 3) * 6, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#22C55E';
  for(let k = 0; k < 5; k++){ const bx = b.x0 + 18 + k * w / 5; c.beginPath(); c.arc(bx, GY - 52 - (k % 2) * 10, 22, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#F472B6';
  for(let k = 0; k < 4; k++) dot(c, b.x0 + 20 + k * w / 4, GY - 60 + (k % 2) * 22, 3.5, '#F472B6');
  c.restore();
}

// ---------- fundo do mar, esmagadoras e bolas de espinho ----------
function waterAt(x){
  const L = run && run.level;
  if(!L || !L.waters) return null;
  return L.waters.find(z => x > z.x0 && x < z.x1) || null;
}
function crusherY(cr, t){
  const k = (t + cr.off) % 3.75;
  if(k < 1.6) return cr.topY;
  if(k < 1.85) return cr.topY + (GY - cr.topY) * ((k - 1.6) / .25);
  if(k < 2.75) return GY;
  return GY - (GY - cr.topY) * ((k - 2.75) / 1);
}
function drawCrusher(c, cr, t, camY){
  const y = crusherY(cr, t), k = (t + cr.off) % 3.75;
  const shake = k > 1.25 && k < 1.6 ? (Math.random() - .5) * 4 : 0;
  c.save();
  // corrente
  c.strokeStyle = '#57534E'; c.lineWidth = 3; c.setLineDash([6, 4]);
  c.beginPath(); c.moveTo(cr.x + cr.w / 2, camY - 20); c.lineTo(cr.x + cr.w / 2, y - 64); c.stroke(); c.setLineDash([]);
  c.translate(shake, 0);
  rr(c, cr.x, y - 64, cr.w, 64, 10);
  c.fillStyle = vgrad(c, y - 64, y, '#A8A29E', '#57534E'); c.fill();
  c.strokeStyle = '#292524'; c.lineWidth = 2.5; c.stroke();
  // carinha brava
  const mx = cr.x + cr.w / 2;
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(mx - 12, y - 38, 7, 8, 0, 0, Math.PI * 2); c.ellipse(mx + 12, y - 38, 7, 8, 0, 0, Math.PI * 2); c.fill();
  dot(c, mx - 11, y - 36, 3.4, '#111'); dot(c, mx + 11, y - 36, 3.4, '#111');
  c.strokeStyle = '#111'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 22, y - 50); c.lineTo(mx - 6, y - 44); c.moveTo(mx + 22, y - 50); c.lineTo(mx + 6, y - 44); c.stroke();
  c.beginPath(); c.moveTo(mx - 10, y - 18); c.lineTo(mx + 10, y - 18); c.stroke();
  // espinhos embaixo
  c.fillStyle = '#E7E5E4';
  for(let sx = cr.x + 4; sx < cr.x + cr.w - 6; sx += 12){ c.beginPath(); c.moveTo(sx, y); c.lineTo(sx + 6, y + 8); c.lineTo(sx + 12, y); c.closePath(); c.fill(); }
  // aviso no chão
  if(k > 1.0 && k < 1.6){ c.globalAlpha = .35 + .3 * Math.sin(t * 30); c.fillStyle = '#EF4444'; rr(c, cr.x, GY - 4, cr.w, 6, 3); c.fill(); }
  c.restore();
}
function drawSpinner(c, sp, t){
  const a = t * sp.sp + sp.ph;
  c.save();
  rr(c, sp.cx - 14, sp.cy - 14, 28, 28, 6); c.fillStyle = vgrad(c, sp.cy - 14, sp.cy + 14, '#A8A29E', '#57534E'); c.fill();
  c.strokeStyle = '#292524'; c.lineWidth = 2; c.stroke();
  for(let k = 1; k <= 5; k++){ const d = sp.len * k / 5.5; dot(c, sp.cx + Math.cos(a) * d, sp.cy + Math.sin(a) * d, 4, '#78716C'); }
  const bx = sp.cx + Math.cos(a) * sp.len, by = sp.cy + Math.sin(a) * sp.len;
  c.translate(bx, by); c.rotate(t * 6);
  c.fillStyle = '#44403C';
  for(let k = 0; k < 10; k++){ const aa = k / 10 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(aa - .2) * 12, Math.sin(aa - .2) * 12); c.lineTo(Math.cos(aa) * 21, Math.sin(aa) * 21); c.lineTo(Math.cos(aa + .2) * 12, Math.sin(aa + .2) * 12); c.closePath(); c.fill(); }
  c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fillStyle = vgrad(c, -13, 13, '#78716C', '#292524'); c.fill();
  c.restore();
}
function drawMask(c, m, t){
  const y = m.y + Math.sin(t * 3) * 4;
  c.save(); c.translate(m.x, y);
  c.shadowColor = '#38BDF8'; c.shadowBlur = 16;
  c.strokeStyle = '#0F172A'; c.lineWidth = 2;
  rr(c, -20, -11, 40, 22, 10); c.fillStyle = '#F97316'; c.fill(); c.stroke();
  c.shadowBlur = 0;
  rr(c, -16, -7, 14, 14, 5); c.fillStyle = 'rgba(186,230,253,.9)'; c.fill();
  rr(c, 2, -7, 14, 14, 5); c.fill();
  c.strokeStyle = '#FDBA74'; c.lineWidth = 4; c.beginPath(); c.moveTo(16, -4); c.quadraticCurveTo(26, -22, 10, -26); c.stroke();
  c.restore();
}
function drawWaterBack(c, z, r, vx0, vx1){
  const x0 = Math.max(z.x0, vx0), x1 = Math.min(z.x1, vx1);
  c.save();
  const g = c.createLinearGradient(0, z.surface, 0, z.floor);
  g.addColorStop(0, '#38BDF8'); g.addColorStop(.5, '#0284C7'); g.addColorStop(1, '#0C4A6E');
  c.fillStyle = g; c.fillRect(x0, z.surface, x1 - x0, z.floor - z.surface + 400);
  // raios de luz
  c.globalAlpha = .12; c.fillStyle = '#E0F2FE';
  for(let lx = Math.floor(x0 / 220) * 220; lx < x1; lx += 220){
    const sw = Math.sin(r.t * .6 + lx) * 20;
    c.beginPath(); c.moveTo(lx + sw, z.surface); c.lineTo(lx + 50 + sw, z.surface); c.lineTo(lx + 120, z.floor); c.lineTo(lx + 40, z.floor); c.closePath(); c.fill();
  }
  c.globalAlpha = 1;
  // algas e conchas no fundo
  for(let sx = Math.floor(x0 / 90) * 90 + 30; sx < x1; sx += 90){
    if(sx < z.x0 + 20 || sx > z.x1 - 20) continue;
    const h = 40 + (sx * 7 % 50);
    c.strokeStyle = (sx / 90) % 2 ? '#16A34A' : '#22C55E'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, z.floor);
    for(let k = 1; k <= 4; k++) c.lineTo(sx + Math.sin(r.t * 1.6 + k + sx) * 7, z.floor - h * k / 4);
    c.stroke();
    if((sx / 90) % 3 === 0){ c.fillStyle = '#FDA4AF'; c.beginPath(); c.arc(sx + 22, z.floor - 4, 6, Math.PI, 0); c.fill(); }
  }
  // bolhas subindo
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4;
  for(let k = 0; k < 14; k++){
    const bx = x0 + ((k * 137 + 40) % Math.max(1, x1 - x0));
    const by = z.floor - ((r.t * 40 + k * 61) % (z.floor - z.surface));
    c.beginPath(); c.arc(bx + Math.sin(r.t * 2 + k) * 6, by, 2 + k % 4, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}
function drawWaterFront(c, z, r, vx0, vx1){
  const x0 = Math.max(z.x0, vx0), x1 = Math.min(z.x1, vx1);
  c.save();
  c.fillStyle = 'rgba(14,116,144,.16)';
  c.fillRect(x0, z.surface, x1 - x0, z.floor - z.surface + 400);
  // ondinhas na superfície
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3;
  c.beginPath();
  for(let wx = x0; wx <= x1; wx += 12) c.lineTo(wx, z.surface + Math.sin(wx * .05 + r.t * 3) * 3);
  c.stroke();
  c.restore();
}
function drawSeaCreature(c, e, t){
  c.lineJoin = 'round';
  if(e.kind === 'peixe'){
    c.translate(0, -14); c.scale(e.dir > 0 ? -1 : 1, 1);
    const wag = Math.sin(t * 10 + e.ph) * .25;
    c.fillStyle = e.col || '#FB923C'; c.strokeStyle = '#7C2D12'; c.lineWidth = 2;
    c.save(); c.translate(16, 0); c.rotate(wag); c.beginPath(); c.moveTo(0, 0); c.lineTo(14, -10); c.lineTo(14, 10); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.beginPath(); c.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(2, -10); c.lineTo(2, 10); c.stroke();
    dot(c, -10, -3, 3.6, '#fff'); dot(c, -11, -3, 2, '#111');
    c.strokeStyle = '#7C2D12'; c.lineWidth = 2; c.beginPath(); c.moveTo(-17, 4); c.lineTo(-12, 5); c.stroke();
  } else if(e.kind === 'passaro'){
    c.translate(0, -16); c.scale(e.dir > 0 ? -1 : 1, 1);
    const flap = Math.sin(t * 16 + e.ph);
    c.fillStyle = '#475569'; c.strokeStyle = '#1E293B'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-2, -2); c.quadraticCurveTo(8, -20 * flap, 22, -8 * flap); c.quadraticCurveTo(10, 0, -2, 2); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#F59E0B'; c.beginPath(); c.moveTo(-15, -2); c.lineTo(-24, 1); c.lineTo(-15, 4); c.closePath(); c.fill();
    dot(c, -9, -3, 2.6, '#fff'); dot(c, -10, -3, 1.4, '#111');
    c.strokeStyle = '#1E293B'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-13, -8); c.lineTo(-5, -5); c.stroke();
  } else { // água-viva
    c.translate(0, -24);
    const pul = 1 + Math.sin(t * 4 + e.ph) * .08;
    c.scale(pul, 1 / pul);
    c.fillStyle = 'rgba(244,114,182,.85)'; c.strokeStyle = '#9D174D'; c.lineWidth = 1.8;
    c.beginPath(); c.arc(0, 0, 16, Math.PI, 0); c.lineTo(16, 4); c.quadraticCurveTo(0, 8, -16, 4); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(236,72,153,.85)'; c.lineWidth = 2.5;
    for(let k = -2; k <= 2; k++){ c.beginPath(); c.moveTo(k * 6, 5); c.quadraticCurveTo(k * 6 + Math.sin(t * 5 + k) * 5, 16, k * 6, 28); c.stroke(); }
    dot(c, -5, -5, 2, '#831843'); dot(c, 5, -5, 2, '#831843');
  }
}

// ---------- neve e céu ----------
function drawIcicle(c, ic){
  c.save();
  const sh = ic.st === 'shake' ? (Math.random() - .5) * 4 : 0;
  // gelo preso em cima
  if(ic.st !== 'fall'){ rr(c, ic.x - 26, ic.y0 - 14, 52, 16, 8); c.fillStyle = '#F8FAFC'; c.fill(); c.strokeStyle = '#93C5FD'; c.lineWidth = 2; c.stroke(); }
  c.translate(ic.x + sh, ic.y);
  c.beginPath(); c.moveTo(-12, 0); c.lineTo(0, 46); c.lineTo(12, 0); c.closePath();
  c.fillStyle = vgrad(c, 0, 46, '#F0F9FF', '#7DD3FC'); c.fill();
  c.strokeStyle = '#3B82F6'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(-5, 4, 3, 18);
  c.restore();
}
function drawWind(c, wd, t, camY){
  c.save();
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2.5; c.lineCap = 'round';
  const len = wd.x1 - wd.x0;
  for(let k = 0; k < 9; k++){
    const y = 90 + k * 26 + camY * 0;
    const x = wd.x1 - ((t * Math.abs(wd.force) * 1.6 + k * 97) % len);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 46, y); c.stroke();
    c.beginPath(); c.arc(x + 4, y - 6, 6, Math.PI * .5, Math.PI * 1.6); c.stroke();
  }
  c.restore();
}
function drawSled(c, x, y, s){
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = '#7C2D12'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-30, 0); c.lineTo(26, 0); c.quadraticCurveTo(38, 0, 36, -12); c.stroke();
  [-18, 14].forEach(px => { c.beginPath(); c.moveTo(px, 0); c.lineTo(px, -8); c.stroke(); });
  rr(c, -30, -14, 58, 8, 4); c.fillStyle = '#DC2626'; c.fill(); c.strokeStyle = '#7F1D1D'; c.lineWidth = 2; c.stroke();
  c.restore();
}
function drawPlane(c, x, y, t, s){
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = '#1E293B'; c.lineWidth = 2; c.lineJoin = 'round';
  // asa de trás
  rr(c, -12, -8, 26, 8, 4); c.fillStyle = '#B91C1C'; c.fill(); c.stroke();
  // corpo
  c.beginPath(); c.moveTo(-46, -20); c.lineTo(-38, -4); c.lineTo(30, -2); c.quadraticCurveTo(44, -10, 30, -22); c.lineTo(-30, -22); c.closePath();
  c.fillStyle = vgrad(c, -22, 0, '#F87171', '#DC2626'); c.fill(); c.stroke();
  // cauda
  c.beginPath(); c.moveTo(-44, -20); c.lineTo(-50, -38); c.lineTo(-36, -22); c.closePath(); c.fillStyle = '#FACC15'; c.fill(); c.stroke();
  // asa da frente
  rr(c, -16, -14, 36, 9, 4); c.fillStyle = '#FACC15'; c.fill(); c.stroke();
  // hélice girando
  c.fillStyle = '#334155'; c.beginPath(); c.arc(40, -12, 4, 0, Math.PI * 2); c.fill();
  const sp = Math.abs(Math.sin(t * 40)) * 16;
  c.fillStyle = 'rgba(51,65,85,.7)'; rr(c, 42, -12 - sp, 4, sp * 2, 2); c.fill();
  c.restore();
}
function drawStorm(c, st, t){
  c.save();
  c.fillStyle = st.zap ? '#475569' : '#64748B';
  c.beginPath();
  c.arc(st.x - st.r * .5, st.y, st.r * .55, 0, Math.PI * 2); c.arc(st.x, st.y - st.r * .3, st.r * .7, 0, Math.PI * 2); c.arc(st.x + st.r * .5, st.y, st.r * .55, 0, Math.PI * 2);
  c.fill();
  const k = (t + st.off) % 3;
  if(k > 1.7 && k < 2.2){ c.fillStyle = '#FDE047'; c.globalAlpha = .6 + .4 * Math.sin(t * 40); c.font = '22px sans-serif'; c.textAlign = 'center'; c.fillText('⚡', st.x, st.y + st.r * .2); c.globalAlpha = 1; }
  if(st.zap){
    c.strokeStyle = '#FDE047'; c.lineWidth = 4; c.shadowColor = '#FDE047'; c.shadowBlur = 16;
    c.beginPath(); c.moveTo(st.x - 10, st.y + 10);
    for(let i = 1; i <= 5; i++) c.lineTo(st.x + (i % 2 ? 14 : -14), st.y + 10 + i * 22);
    c.stroke();
    c.globalAlpha = .25; c.fillStyle = '#FEF9C3'; c.beginPath(); c.arc(st.x, st.y, st.r * 1.1, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function drawBigBall(c, ch){
  c.save();
  c.translate(ch.bx, GY - ch.r);
  c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(0, ch.r, ch.r * .9, 10, 0, 0, Math.PI * 2); c.fill();
  c.rotate(ch.rot || 0);
  c.beginPath(); c.arc(0, 0, ch.r, 0, Math.PI * 2);
  c.fillStyle = vgrad(c, -ch.r, ch.r, '#FFFFFF', '#BFDBFE'); c.fill();
  c.strokeStyle = '#93C5FD'; c.lineWidth = 3; c.stroke();
  c.fillStyle = 'rgba(147,197,253,.55)';
  [[.3, -.2, .22], [-.4, .3, .18], [.1, .55, .14], [-.2, -.55, .16]].forEach(([a, b, rr2]) => { c.beginPath(); c.arc(a * ch.r, b * ch.r, rr2 * ch.r, 0, Math.PI * 2); c.fill(); });
  c.restore();
}

function drawPlat(c, p, th){
  const w = p.x1 - p.x0;
  c.save();
  if(th.plat === 'madeira'){
    rr(c, p.x0, p.y, w, 18, 6);
    c.fillStyle = vgrad(c, p.y, p.y + 18, '#C98B4A', '#8B5A2B'); c.fill();
    c.strokeStyle = '#5B3716'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(91,55,22,.5)'; c.lineWidth = 1.5;
    for(let k = 1; k < w / 30; k++){ c.beginPath(); c.moveTo(p.x0 + k * 30, p.y + 3); c.lineTo(p.x0 + k * 30, p.y + 15); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, p.x0 + 4, p.y + 2, w - 8, 3, 2); c.fill();
  } else if(th.plat === 'gelo'){
    rr(c, p.x0, p.y, w, 18, 8);
    c.fillStyle = vgrad(c, p.y, p.y + 18, '#E0F2FE', '#7DD3FC'); c.fill();
    c.strokeStyle = '#3B82F6'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.8)'; rr(c, p.x0 + 6, p.y + 3, w * .4, 3, 2); c.fill();
  } else {
    rr(c, p.x0, p.y, w, 20, 8);
    c.fillStyle = vgrad(c, p.y, p.y + 20, '#78716C', '#44403C'); c.fill();
    c.strokeStyle = '#1C1917'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#65A30D'; rr(c, p.x0 - 2, p.y - 3, w + 4, 7, 4); c.fill();
  }
  if(p.moving){ // setinhas mostrando que se mexe
    c.fillStyle = 'rgba(255,255,255,.75)';
    const mx = (p.x0 + p.x1) / 2;
    c.beginPath(); c.moveTo(mx - 5, p.y + 13); c.lineTo(mx, p.y + 7); c.lineTo(mx + 5, p.y + 13); c.fill();
  }
  c.restore();
}

function drawBox(c, s, t){
  const y = s.top - Math.sin(s.bump * Math.PI) * 8;
  c.save();
  rr(c, s.x0, y, 36, 36, 7);
  c.fillStyle = s.used ? vgrad(c, y, y + 36, '#B08968', '#7F5539') : vgrad(c, y, y + 36, '#FDE047', '#F59E0B');
  c.fill();
  c.strokeStyle = s.used ? '#4A2F1A' : '#92400E'; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.4)'; rr(c, s.x0 + 4, y + 3, 28, 4, 2); c.fill();
  [[5, 5], [31, 5], [5, 31], [31, 31]].forEach(([dx, dy]) => dot(c, s.x0 + dx, y + dy, 1.8, s.used ? '#4A2F1A' : '#B45309'));
  if(!s.used){
    c.font = '700 24px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#92400E'; c.fillText('?', s.x0 + 19, y + 20 + Math.sin(t * 4) * 1);
    c.fillStyle = '#fff'; c.fillText('?', s.x0 + 18, y + 19 + Math.sin(t * 4) * 1);
  }
  c.restore();
}

function drawSpikes(c, s, th){
  c.save();
  const n = Math.round((s.x1 - s.x0) / 34);
  for(let k = 0; k < n; k++){
    const x = s.x0 + k * 34;
    if(th.name === 'Praia'){ // ouriço-do-mar
      c.strokeStyle = th.spike; c.lineWidth = 2.4;
      for(let a = 0; a < 12; a++){ const an = Math.PI + a / 11 * Math.PI; c.beginPath(); c.moveTo(x + 17, s.y - 6); c.lineTo(x + 17 + Math.cos(an) * 18, s.y - 6 + Math.sin(an) * 18); c.stroke(); }
      dot(c, x + 17, s.y - 6, 10, '#5B21B6');
      dot(c, x + 13, s.y - 10, 3, 'rgba(255,255,255,.5)');
    } else {
      c.beginPath();
      c.moveTo(x + 1, s.y); c.lineTo(x + 9, s.y - 24); c.lineTo(x + 17, s.y - 4); c.lineTo(x + 25, s.y - 24); c.lineTo(x + 33, s.y);
      c.closePath();
      c.fillStyle = vgrad(c, s.y - 24, s.y, th.name === 'Neve' ? '#F0F9FF' : '#E5E7EB', th.spike); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.6; c.stroke();
    }
  }
  c.restore();
}

function drawSpring(c, s, th){
  const k = s.comp;
  c.save(); c.translate(s.x, s.y);
  if(th.spring === 'cogumelo'){
    c.strokeStyle = '#7C2D12'; c.lineWidth = 2;
    rr(c, -7, -18 + k * 6, 14, 18 - k * 6, 5); c.fillStyle = '#FEF3C7'; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, -18 + k * 6, 24 + k * 4, 14 - k * 4, 0, Math.PI, 0); c.closePath();
    c.fillStyle = vgrad(c, -34, -18, '#F87171', '#DC2626'); c.fill(); c.stroke();
    [[-12, -24], [3, -29], [13, -22]].forEach(([dx, dy]) => dot(c, dx, dy + k * 6, 3.5, '#fff'));
  } else {
    c.strokeStyle = '#475569'; c.lineWidth = 3;
    c.beginPath();
    const h = 20 - k * 10;
    for(let i = 0; i <= 4; i++){ const yy = -i * h / 4; c.lineTo(i % 2 ? 9 : -9, yy); }
    c.stroke();
    rr(c, -20, -h - 8, 40, 8, 4); c.fillStyle = vgrad(c, -h - 8, -h, '#F87171', '#DC2626'); c.fill();
    c.strokeStyle = '#7F1D1D'; c.lineWidth = 2; c.stroke();
    rr(c, -16, -4, 32, 5, 2); c.fillStyle = '#334155'; c.fill();
  }
  c.restore();
}

function starPath(c, x, y, R, r){
  c.beginPath();
  for(let i = 0; i < 10; i++){
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
    c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  c.closePath();
}

function drawStar(c, x, y, t){
  const yy = y + Math.sin(t * 3) * 4;
  c.save();
  c.shadowColor = '#FDE047'; c.shadowBlur = 18;
  c.translate(x, yy); c.rotate(Math.sin(t * 2) * .15);
  starPath(c, 0, 0, 20, 9);
  c.fillStyle = vgrad(c, -20, 20, '#FEF08A', '#F59E0B'); c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = '#B45309'; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke();
  dot(c, -4, -2, 1.8, '#78350F'); dot(c, 4, -2, 1.8, '#78350F');
  c.strokeStyle = '#78350F'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, 1, 3.5, .3, Math.PI - .3); c.stroke();
  c.restore();
}

function drawCoin(c, x, y, t, R, glow){
  const sq = Math.max(.18, Math.abs(Math.cos(t * 3.2 + x * .013)));
  c.save();
  if(glow){ c.shadowColor = '#FDE047'; c.shadowBlur = 12; }
  c.fillStyle = '#B45309';
  c.beginPath(); c.ellipse(x, y, R * sq, R, 0, 0, Math.PI * 2); c.fill();
  c.shadowBlur = 0;
  c.fillStyle = '#FBBF24';
  c.beginPath(); c.ellipse(x - .5 * sq, y - .5, (R - 2) * sq, R - 2, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#FDE68A';
  c.beginPath(); c.ellipse(x - .5 * sq, y - .5, (R - 5) * sq, R - 5, 0, 0, Math.PI * 2); c.fill();
  if(sq > .5){ c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(x - R * .35 * sq, y - R * .4, 1.8 * sq, 3, .4, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

function drawEnemy(c, e, th, t){
  c.save();
  c.translate(e.x, e.y);
  if(!e.alive){ // amassadinho e some
    const a = Math.max(0, 1 - e.dead * 2.5);
    if(a <= 0){ c.restore(); return; }
    c.globalAlpha = a; c.scale(1.3, .35);
  }
  c.strokeStyle = '#1F2937'; c.lineWidth = 2; c.lineJoin = 'round';
  const step = Math.sin(t * 12 + e.x);
  const face = (ex, ey, s)=>{ // olhinhos bravinhos
    [[-5, 0], [5, 0]].forEach(([dx])=>{
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex + dx * s, ey, 3.6 * s, 4.2 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      dot(c, ex + dx * s + e.dir * -1.2 * s, ey + .5 * s, 1.9 * s, '#111');
    });
    c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(ex - 9 * s, ey - 6 * s); c.lineTo(ex - 2 * s, ey - 4 * s); c.moveTo(ex + 9 * s, ey - 6 * s); c.lineTo(ex + 2 * s, ey - 4 * s); c.stroke();
    c.lineWidth = 2;
  };
  if(e.kind === 'peixe' || e.kind === 'agua' || e.kind === 'passaro'){ drawSeaCreature(c, e, t); c.restore(); return; }
  if(e.flying){
    const flap = Math.sin(t * 22 + e.ph) * .6;
    if(th.flyer === 'morcego'){
      c.translate(0, -18);
      c.fillStyle = '#4C1D95';
      [-1, 1].forEach(sd=>{
        c.save(); c.scale(sd, 1); c.rotate(flap * .6);
        c.beginPath(); c.moveTo(6, -2); c.quadraticCurveTo(22, -16, 30, -4); c.quadraticCurveTo(24, -2, 22, 4); c.quadraticCurveTo(16, 0, 14, 6); c.quadraticCurveTo(10, 2, 6, 4); c.closePath(); c.fill(); c.stroke();
        c.restore();
      });
      c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fillStyle = '#6D28D9'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-8, -7); c.lineTo(-6, -16); c.lineTo(-2, -9); c.moveTo(8, -7); c.lineTo(6, -16); c.lineTo(2, -9); c.fill(); c.stroke();
      face(0, -1, .8);
    } else { // abelha
      c.translate(0, -18);
      c.fillStyle = 'rgba(219,234,254,.85)';
      [-1, 1].forEach(sd=>{ c.save(); c.translate(sd * 3, -10); c.rotate(sd * (.5 + flap)); c.beginPath(); c.ellipse(0, -7, 6, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore(); });
      c.beginPath(); c.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2);
      c.fillStyle = '#FACC15'; c.fill();
      c.save(); c.clip(); c.fillStyle = '#1F2937'; c.fillRect(-4, -12, 5, 24); c.fillRect(6, -12, 4, 24); c.restore();
      c.stroke();
      c.beginPath(); c.moveTo(15, 0); c.lineTo(21, 2); c.lineTo(15, 4); c.fillStyle = '#1F2937'; c.fill();
      face(-8, -2, .7);
    }
  } else if(th.enemy === 'caranguejo'){
    c.translate(0, -2);
    for(let k = -1; k <= 1; k += 2) for(let j = 0; j < 3; j++){
      c.beginPath(); c.moveTo(k * 8, -8); c.lineTo(k * (16 + j * 3), -2 + (j === 1 ? step * 2 : -step * 2)); c.stroke();
    }
    [-1, 1].forEach(sd=>{
      c.save(); c.translate(sd * 17, -20); c.rotate(sd * (.3 + Math.sin(t * 6) * .15));
      c.beginPath(); c.ellipse(0, 0, 7, 6, 0, 0, Math.PI * 2); c.fillStyle = '#EF4444'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, -1); c.lineTo(6, -6); c.stroke();
      c.restore();
    });
    c.beginPath(); c.ellipse(0, -12, 16, 11, 0, 0, Math.PI * 2);
    c.fillStyle = vgrad(c, -23, -1, '#F87171', '#DC2626'); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-5, -20); c.lineTo(-6, -29); c.moveTo(5, -20); c.lineTo(6, -29); c.stroke();
    face(0, -31, .8);
  } else if(th.enemy === 'bolota'){
    const hop = Math.abs(Math.sin(t * 6 + e.x)) * 4;
    c.translate(0, -hop);
    c.beginPath(); c.ellipse(0, -13, 16, 14 + hop * .3, 0, 0, Math.PI * 2);
    c.fillStyle = vgrad(c, -28, 0, '#FFFFFF', '#BFDBFE'); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-10, -24); c.lineTo(-4, -36); c.lineTo(0, -25); c.lineTo(5, -35); c.lineTo(9, -24); c.closePath();
    c.fillStyle = '#7DD3FC'; c.fill(); c.stroke();
    face(-2, -15, .85);
  } else { // besouro
    c.translate(0, -2);
    for(let k = 0; k < 3; k++){
      c.beginPath(); c.moveTo(-8 + k * 8, -6); c.lineTo(-11 + k * 8 + (k % 2 ? step : -step) * 3, 1); c.stroke();
    }
    c.beginPath(); c.ellipse(0, -13, 17, 13, 0, Math.PI, 0); c.lineTo(17, -7); c.lineTo(-17, -7); c.closePath();
    const night = th.name === 'Noite';
    c.fillStyle = vgrad(c, -26, -7, night ? '#C084FC' : '#F87171', night ? '#7E22CE' : '#B91C1C'); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -26); c.lineTo(0, -8); c.stroke();
    [[-8, -17], [8, -17], [-5, -11], [6, -11]].forEach(([dx, dy]) => dot(c, dx, dy, 2.4, '#1F2937'));
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-7, -21, 5, 2.5, -.4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(e.dir * 16, -12, 8, 0, Math.PI * 2); c.fillStyle = '#374151'; c.fill(); c.stroke();
    c.save(); c.translate(e.dir * 18, -13);
    dot(c, -2.5, -1, 2.2, '#fff'); dot(c, 2.5, -1, 2.2, '#fff'); dot(c, -2.5 + e.dir, -.6, 1.1, '#111'); dot(c, 2.5 + e.dir, -.6, 1.1, '#111');
    c.restore();
  }
  c.restore();
}

function drawHalfFlag(c, x, t, passed){
  c.save();
  c.fillStyle = '#64748B'; c.fillRect(x - 2, GY - 70, 4, 70);
  c.fillStyle = passed ? '#22C55E' : '#F97316';
  c.beginPath(); c.moveTo(x + 2, GY - 70); c.lineTo(x + 30, GY - 62 + Math.sin(t * 6) * 2); c.lineTo(x + 2, GY - 52); c.closePath(); c.fill();
  c.restore();
}

function drawFlag(c, x, t){
  c.save();
  // arco de chegada
  c.lineWidth = 8; c.strokeStyle = '#475569';
  c.beginPath(); c.moveTo(x - 50, GY); c.lineTo(x - 50, GY - 170); c.moveTo(x + 60, GY); c.lineTo(x + 60, GY - 170); c.stroke();
  rr(c, x - 64, GY - 196, 138, 34, 10);
  c.fillStyle = vgrad(c, GY - 196, GY - 162, '#22C55E', '#15803D'); c.fill();
  c.lineWidth = 2.5; c.strokeStyle = '#14532D'; c.stroke();
  c.font = '700 20px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.fillText('CHEGADA', x + 5, GY - 178);
  // bandeirinhas
  for(let k = 0; k < 6; k++){
    const fx = x - 44 + k * 19, fy = GY - 158 + Math.sin(t * 5 + k) * 1.5;
    c.fillStyle = ['#F43F5E', '#FACC15', '#3B82F6', '#22C55E', '#A855F7', '#FB923C'][k];
    c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + 16, fy); c.lineTo(fx + 8, fy + 14); c.closePath(); c.fill();
  }
  // bandeira quadriculada
  c.fillStyle = '#334155'; c.fillRect(x + 110, GY - 140, 5, 140);
  const wave = Math.sin(t * 6) * 3;
  for(let i = 0; i < 4; i++) for(let j = 0; j < 3; j++){
    c.fillStyle = (i + j) % 2 ? '#111827' : '#fff';
    c.fillRect(x + 115 + i * 12, GY - 140 + j * 12 + Math.sin(t * 6 + i) * (i * .8) + wave * .2, 12, 12);
  }
  dot(c, x + 112.5, GY - 143, 5, '#F59E0B');
  c.restore();
}

function drawDeco(c, kind, x, y, s, t, v){
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.lineJoin = 'round';
  if(kind === 'tree'){
    c.fillStyle = '#8B5A2B'; rr(c, -6, -46, 12, 48, 4); c.fill();
    const g = vgrad(c, -95, -25, '#4ADE80', '#15803D');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -66, 30, 0, Math.PI * 2); c.arc(-22, -48, 21, 0, Math.PI * 2); c.arc(22, -48, 21, 0, Math.PI * 2); c.arc(0, -40, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(-9, -76, 12, 0, Math.PI * 2); c.fill();
    if(v > .5){ dot(c, -10, -58, 4, '#EF4444'); dot(c, 12, -46, 4, '#EF4444'); dot(c, 4, -72, 4, '#EF4444'); }
  } else if(kind === 'palm'){
    c.strokeStyle = '#A16207'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(12, -45, 2, -92); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2;
    for(let k = 1; k < 6; k++){ c.beginPath(); c.moveTo(-4 + k * 1.2, -k * 16); c.lineTo(5 + k * 1.2, -k * 16 - 3); c.stroke(); }
    for(let k = 0; k < 6; k++){
      c.save(); c.translate(2, -92); c.rotate(-2.9 + k * .75 + Math.sin(t * 1.5 + x * .01) * .06);
      c.fillStyle = k % 2 ? '#16A34A' : '#22C55E';
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(20, -10, 40, 4); c.quadraticCurveTo(20, 2, 0, 4); c.fill(); c.restore();
    }
    dot(c, -3, -88, 4.5, '#78350F'); dot(c, 6, -87, 4.5, '#78350F');
  } else if(kind === 'pine'){
    c.fillStyle = '#78350F'; c.fillRect(-5, -18, 10, 20);
    [[0, -18, 30], [0, -44, 24], [0, -66, 17]].forEach(([cx, cy, w])=>{
      c.fillStyle = '#166534';
      c.beginPath(); c.moveTo(cx - w, cy); c.lineTo(cx, cy - 34); c.lineTo(cx + w, cy); c.closePath(); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.moveTo(cx - w * .5, cy - 17); c.lineTo(cx, cy - 34); c.lineTo(cx + w * .5, cy - 17);
      c.quadraticCurveTo(cx + w * .2, cy - 12, cx, cy - 16); c.quadraticCurveTo(cx - w * .2, cy - 12, cx - w * .5, cy - 17); c.fill();
    });
  } else if(kind === 'vulcao'){ // vulcãozinho soltando fumaça
    c.fillStyle = '#44403C';
    c.beginPath(); c.moveTo(-46, 2); c.lineTo(-12, -70); c.lineTo(12, -70); c.lineTo(46, 2); c.closePath(); c.fill();
    c.fillStyle = '#F97316';
    c.beginPath(); c.moveTo(-12, -70); c.lineTo(12, -70); c.lineTo(6, -56); c.lineTo(-2, -62); c.lineTo(-8, -54); c.closePath(); c.fill();
    c.fillStyle = 'rgba(68,64,60,.6)';
    for(let k = 0; k < 3; k++){ const yy = -84 - k * 16 - ((t * 20) % 16); c.beginPath(); c.arc(Math.sin(t + k) * 6, yy, 9 + k * 3, 0, Math.PI * 2); c.fill(); }
  } else { // noite: árvore escura com lanterninhas
    c.fillStyle = '#1E1B4B'; rr(c, -6, -46, 12, 48, 4); c.fill();
    c.fillStyle = '#1F3B34';
    c.beginPath(); c.arc(0, -66, 30, 0, Math.PI * 2); c.arc(-22, -48, 21, 0, Math.PI * 2); c.arc(22, -48, 21, 0, Math.PI * 2); c.fill();
    if(v > .6){ c.save(); c.shadowColor = '#FDE047'; c.shadowBlur = 14; dot(c, 16, -36, 4, '#FDE68A'); c.restore(); }
  }
  c.restore();
}

function drawHud(c, r, L){
  // moedas
  c.save();
  c.fillStyle = 'rgba(255,255,255,.94)';
  rr(c, 12, 12, 118, 40, 20); c.fill();
  drawCoin(c, 34, 32, 0, 12);
  c.fillStyle = '#1A1238'; c.font = '600 22px Fredoka, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText(`× ${r.coins}`, 54, 33);
  // estrelas
  rr(c, 138, 12, 104, 40, 20); c.fillStyle = 'rgba(255,255,255,.94)'; c.fill();
  for(let k = 0; k < 3; k++){
    starPath(c, 162 + k * 29, 32, 11, 5);
    c.fillStyle = k < r.starsGot ? '#FACC15' : '#E2E8F0'; c.fill();
    c.strokeStyle = k < r.starsGot ? '#B45309' : '#94A3B8'; c.lineWidth = 1.6; c.stroke();
  }
  // corações
  for(let k = 0; k < 3; k++){
    c.save(); c.translate(26 + k * 26, 70);
    c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-13, -1, -8, -12, 0, -5); c.bezierCurveTo(8, -12, 13, -1, 0, 8); c.closePath();
    c.fillStyle = k < r.hearts ? '#F43F5E' : 'rgba(255,255,255,.55)'; c.fill();
    c.strokeStyle = k < r.hearts ? '#9F1239' : 'rgba(26,18,56,.35)'; c.lineWidth = 2; c.stroke();
    c.restore();
  }
  // superpoder ativo
  if(r.power){
    const pw = POWERS[r.power.kind];
    const py = H - 46; // embaixo, no meio (longe dos botões e dos avisos)
    rr(c, W / 2 - 105, py, 210, 32, 16); c.fillStyle = 'rgba(26,18,56,.82)'; c.fill();
    c.fillStyle = '#fff'; c.font = '600 15px Fredoka, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(`${pw.icon} ${pw.name}`, W / 2 - 94, py + 16);
    rr(c, W / 2 + 40, py + 11, 54, 10, 5); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill();
    rr(c, W / 2 + 40, py + 11, Math.max(6, 54 * r.power.t / r.power.max), 10, 5); c.fillStyle = pw.color; c.fill();
  }
  // filhotes e página
  if(L.cubs.length){
    rr(c, 108, 58, 84, 26, 13); c.fillStyle = 'rgba(255,255,255,.94)'; c.fill();
    c.fillStyle = '#1A1238'; c.font = '600 16px Fredoka, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(`🐣 ${r.cubs}/${L.cubs.length}`, 118, 72);
  }
  if(L.pages.length){
    const px = L.cubs.length ? 200 : 108;
    rr(c, px, 58, 40, 26, 13); c.fillStyle = r.page ? '#FEF3C7' : 'rgba(255,255,255,.6)'; c.fill();
    c.globalAlpha = r.page ? 1 : .35; c.font = '16px sans-serif'; c.textAlign = 'center'; c.fillText('📜', px + 20, 72); c.globalAlpha = 1;
  }
  // caminho até a bandeira
  const prog = Math.max(0, Math.min(1, r.x / L.flagX));
  c.fillStyle = 'rgba(255,255,255,.94)';
  rr(c, W - 290, 12, 278, 40, 20); c.fill();
  c.fillStyle = '#334155'; c.font = '700 14px Nunito, sans-serif'; c.textAlign = 'left';
  c.fillText(r.levelId ? `Fase ${r.levelId}` : `Fase ${r.ph}`, W - 276, 33);
  rr(c, W - 214, 27, 166, 10, 5); c.fillStyle = '#E2E8F0'; c.fill();
  rr(c, W - 214, 27, Math.max(10, 166 * prog), 10, 5); c.fillStyle = '#22C55E'; c.fill();
  if(L.halfX){ const hx = W - 214 + 166 * (L.halfX / L.flagX); c.fillStyle = r.halfShown ? '#22C55E' : '#F97316'; c.fillRect(hx - 1, 24, 2, 16); }
  dot(c, W - 214 + 166 * prog, 32, 8, '#0369A1');
  dot(c, W - 214 + 166 * prog, 32, 4, '#fff');
  c.font = '18px sans-serif'; c.textAlign = 'center';
  c.fillText('🏁', W - 30, 33);
  // moedinhas voando até o placar
  r.fly.forEach(f=>{
    const e = 1 - Math.pow(1 - f.t, 3);
    const x = f.x + (34 - f.x) * e, y = f.y + (32 - f.y) * e - Math.sin(f.t * Math.PI) * 40;
    drawCoin(c, x, y, f.t * 6, 10 - f.t * 3);
  });
  // avisos no meio da tela
  const msg = r.state === 'run' && r.hintT > 0 ? {text:'◀ ▶ para andar · ⤒ para pular', a:Math.min(1, r.hintT)} : r.banner ? {text:r.banner.text, a:Math.min(1, r.banner.t * 2)} : null;
  if(msg){
    c.globalAlpha = msg.a;
    c.font = '600 22px Fredoka, sans-serif';
    const w = c.measureText(msg.text).width + 44;
    c.fillStyle = 'rgba(26,18,56,.75)';
    rr(c, W / 2 - w / 2, 70, w, 44, 22); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center';
    c.fillText(msg.text, W / 2, 93);
    c.globalAlpha = 1;
  }
  c.restore();
}

// ---------- controles da corrida (ligados por tabuada-aventura.js) ----------
// Botões transparentes por cima do jogo (◀ ▶ e pular) — funcionam com
// vários dedos ao mesmo tempo — e no teclado: setas/A/D para andar,
// espaço/↑/W para pular.
function setupRunControls(){
  const pad = $('taPad');
  pad.querySelectorAll('.ta-pad-btn').forEach(b=>{
    const k = b.dataset.k;
    const down = e=>{
      e.preventDefault(); e.stopPropagation();
      try{ b.setPointerCapture(e.pointerId); }catch(_){}
      b.classList.add('on');
      if(k === 'jump') pressJump(); else input[k] = true;
    };
    const up = ()=>{
      if(!b.classList.contains('on')) return;
      b.classList.remove('on');
      if(k === 'jump') releaseJump(); else input[k] = false;
    };
    b.addEventListener('pointerdown', down);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, up));
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  // tocar no jogo antes de começar = começar
  taOverlay.addEventListener('pointerdown', e=>{
    if(e.target.closest('button')) return;
    if(run && run.state === 'ready'){ e.preventDefault(); startRunning(); }
  });
  taCanvas.addEventListener('pointerdown', e=>{ if(run && run.state === 'ready'){ e.preventDefault(); startRunning(); } });
  const isJump = e => e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
  const dirOf = e => (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? 'left' : (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') ? 'right' : null;
  document.addEventListener('keydown', e=>{
    if(!run || taRun.hidden) return;
    const dir = dirOf(e);
    if(!dir && !isJump(e)) return;
    e.preventDefault();
    if(dir){ input[dir] = true; if(run.state === 'ready') startRunning(); return; }
    if(e.repeat) return;
    if(run.state === 'done'){ const b = $('taBack'); if(b) b.click(); return; }
    pressJump();
  });
  document.addEventListener('keyup', e=>{
    const dir = dirOf(e);
    if(dir) input[dir] = false;
    if(isJump(e)) releaseJump();
  });
  $('taExitFs').addEventListener('click', e=>{ e.stopPropagation(); autoFs = true; leaveRaceFs(); });
  // se a janela perder o foco, solta tudo (não fica andando sozinho)
  window.addEventListener('blur', ()=>{ input.left = input.right = false; jumpHeld = false; pad.querySelectorAll('.on').forEach(b => b.classList.remove('on')); });
}
