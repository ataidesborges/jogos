// ============================================================
// Tabuada Aventura: CARTEIRA e LOJA
//  As moedas pegas na corrida (e 5 por estrela) vão para a carteira.
//  Na loja a criança compra acessórios (chapéus, óculos, costas e
//  rastros) e escolhe o que cada personagem usa. Tudo fica salvo
//  no aparelho. Comprou uma vez, pode usar em qualquer personagem.
// (usa ta-personagens.js; as variáveis do jogo vêm de tabuada-aventura.js)
// ============================================================

const WALLET_KEY = 'fp-tabuada-moedas';
const OWNED_KEY = 'fp-tabuada-itens';
const EQUIP_KEY = 'fp-tabuada-visual';

const SHOP_SLOTS = [
  {id:'head', name:'Chapéus', icon:'🎩'},
  {id:'eyes', name:'Óculos', icon:'🕶️'},
  {id:'back', name:'Costas', icon:'🦸'},
  {id:'effect', name:'Rastros', icon:'✨'},
];

// preços pensados para durar: uma corrida boa rende umas 100 a 130 moedas
const SHOP_ITEMS = [
  // chapéus
  {id:'flor', slot:'head', name:'Florzinha', price:70},
  {id:'bone', slot:'head', name:'Boné', price:120},
  {id:'gorro', slot:'head', name:'Gorro de inverno', price:160},
  {id:'festa', slot:'head', name:'Chapéu de festa', price:200},
  {id:'chef', slot:'head', name:'Chapéu de chef', price:260},
  {id:'orelhas', slot:'head', name:'Orelhas de coelho', price:300},
  {id:'fones', slot:'head', name:'Fones de ouvido', price:340},
  {id:'cauboi', slot:'head', name:'Chapéu de caubói', price:380},
  {id:'pirata', slot:'head', name:'Chapéu de pirata', price:420},
  {id:'mago', slot:'head', name:'Chapéu de mago', price:500},
  {id:'aureola', slot:'head', name:'Auréola', price:600},
  {id:'unicornio', slot:'head', name:'Chifre de unicórnio', price:750},
  {id:'coroa', slot:'head', name:'Coroa', price:900},
  {id:'astronauta', slot:'head', name:'Capacete de astronauta', price:1200},
  // óculos
  {id:'redondos', slot:'eyes', name:'Óculos redondos', price:90},
  {id:'natacao', slot:'eyes', name:'Óculos de natação', price:150},
  {id:'escuros', slot:'eyes', name:'Óculos escuros', price:200},
  {id:'oculos3d', slot:'eyes', name:'Óculos 3D', price:260},
  {id:'coracao', slot:'eyes', name:'Óculos de coração', price:320},
  {id:'mascara', slot:'eyes', name:'Máscara de herói', price:400},
  {id:'monoculo', slot:'eyes', name:'Monóculo chique', price:480},
  // costas
  {id:'cachecol', slot:'back', name:'Cachecol', price:110},
  {id:'mochila', slot:'back', name:'Mochila', price:220},
  {id:'capa', slot:'back', name:'Capa de herói', price:450},
  {id:'asasBorboleta', slot:'back', name:'Asas de borboleta', price:650},
  {id:'asasAnjo', slot:'back', name:'Asas de anjo', price:850},
  {id:'jetpack', slot:'back', name:'Mochila-foguete', price:1100},
  // rastros (aparecem na corrida)
  {id:'bolhas', slot:'effect', name:'Bolhas de sabão', price:280},
  {id:'coracoes', slot:'effect', name:'Rastro de corações', price:350},
  {id:'notas', slot:'effect', name:'Notas musicais', price:420},
  {id:'estrelas', slot:'effect', name:'Rastro de estrelas', price:500},
  {id:'brilho', slot:'effect', name:'Purpurina', price:600},
  {id:'fogo', slot:'effect', name:'Rastro de fogo', price:800},
  {id:'arcoiris', slot:'effect', name:'Rastro arco-íris', price:1000},
];
// itens que chegaram nesta versão (ganham a etiqueta "Novo!")
const SHOP_NEW = new Set(['gorro', 'chef', 'orelhas', 'fones', 'cauboi', 'aureola', 'unicornio', 'astronauta', 'natacao', 'oculos3d', 'mascara', 'monoculo', 'asasBorboleta', 'asasAnjo', 'jetpack', 'bolhas', 'notas', 'brilho', 'fogo']);

const readJSON = (k, d) => { try{ return JSON.parse(localStorage.getItem(k)) || d; }catch(e){ return d; } };
const saveJSON = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };

let wallet = +(localStorage.getItem(WALLET_KEY) || 0);
let owned = new Set(readJSON(OWNED_KEY, []));
let equipped = readJSON(EQUIP_KEY, {});      // {capivara:{head:'bone', ...}, ...}

function walletAdd(n){
  wallet = Math.max(0, wallet + n);
  try{ localStorage.setItem(WALLET_KEY, wallet); }catch(e){}
  renderWallet();
}
function renderWallet(){
  document.querySelectorAll('[data-wallet]').forEach(el => el.textContent = wallet.toLocaleString('pt-BR'));
}
function shopEquipOf(id){ return equipped[id] || {}; }

// ---------- tela da loja ----------
let shopChar = null, shopSlot = 'head', shopAnim = 0;

function showShop(){
  if(!taRun.hidden) return; // não abre no meio da corrida
  stopRun();
  clearTimeout(nextTimer);
  cancelAnimationFrame(shopAnim);
  shopChar = charId || 'capivara';
  taQuiz.hidden = true; taPick.hidden = true; taRun.hidden = true; $('taShop').hidden = false;
  renderShop();
  say(wallet ? `Você tem ${wallet} moedas. Escolha um presente!` : 'Jogue as corridas para ganhar moedas!', 0.95);
  const t0 = performance.now();
  const anim = now=>{
    if($('taShop').hidden) return;
    drawShopPreview((now - t0) / 1000);
    shopAnim = requestAnimationFrame(anim);
  };
  shopAnim = requestAnimationFrame(anim);
}

function closeShop(){
  cancelAnimationFrame(shopAnim);
  $('taShop').hidden = true;
  portrait($('taCharIcon'), charId || 'capivara', 0);
  portrait(taTrackChar, charId || 'capivara', 0);
  if(charId) showQuiz(); else showPicker();
}

function renderShop(){
  renderWallet();
  // quem vai vestir
  const chars = $('taShopChars');
  chars.innerHTML = '';
  CHARS.forEach(ch=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ta-shop-char' + (ch.id === shopChar ? ' active' : '');
    b.setAttribute('aria-pressed', ch.id === shopChar);
    b.innerHTML = `<canvas width="46" height="42" aria-hidden="true"></canvas><span>${ch.name}</span>`;
    b.addEventListener('click', ()=>{
      shopChar = ch.id;
      charId = ch.id; // quem se veste é quem corre
      try{ localStorage.setItem(CHAR_KEY, ch.id); }catch(e){}
      renderShop();
    });
    chars.appendChild(b);
    portrait(b.querySelector('canvas'), ch.id, 0);
  });
  // abas
  const tabs = $('taShopTabs');
  tabs.innerHTML = '';
  SHOP_SLOTS.forEach(sl=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ta-shop-tab' + (sl.id === shopSlot ? ' active' : '');
    b.innerHTML = `<span aria-hidden="true">${sl.icon}</span>${sl.name}`;
    b.addEventListener('click', ()=>{ shopSlot = sl.id; renderShop(); });
    tabs.appendChild(b);
  });
  // itens
  const grid = $('taShopGrid');
  grid.innerHTML = '';
  const eq = shopEquipOf(shopChar);
  SHOP_ITEMS.filter(it => it.slot === shopSlot).forEach(it=>{
    const has = owned.has(it.id), using = eq[it.slot] === it.id;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ta-item' + (has ? ' owned' : '') + (using ? ' using' : '') + (!has && wallet < it.price ? ' poor' : '');
    b.innerHTML = (SHOP_NEW.has(it.id) && !has ? '<span class="ta-item-new">Novo!</span>' : '') + `<canvas width="72" height="62" aria-hidden="true"></canvas>
      <span class="ta-item-name">${it.name}</span>
      <span class="ta-item-act">${using ? '✓ Usando' : has ? 'Usar' : `<i class="coin"></i>${it.price}`}</span>`;
    b.addEventListener('click', ()=> clickItem(it, b));
    grid.appendChild(b);
    drawItemIcon(b.querySelector('canvas'), it);
  });
}

async function clickItem(it, btn){
  const eq = equipped[shopChar] = equipped[shopChar] || {};
  if(owned.has(it.id)){
    // já tem: veste ou tira
    if(eq[it.slot] === it.id){ delete eq[it.slot]; say('Tirou!', 1); }
    else { eq[it.slot] = it.id; say(`${it.name}!`, 1); ping(true); }
    saveJSON(EQUIP_KEY, equipped);
    renderShop();
    return;
  }
  if(wallet < it.price){
    btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
    ping(false);
    const falta = it.price - wallet;
    say(`Faltam ${falta} moedas. Jogue mais corridas!`, 0.95);
    showShopTip(`Faltam ${falta} moedas para ${it.name}. Jogue mais corridas! 🏃`);
    return;
  }
  const yes = await askBox({icon:'🛒', title:`Comprar ${it.name}?`,
    text:`Custa <b>${it.price} moedas</b>. Você tem ${wallet} e vai ficar com ${wallet - it.price}.`,
    ok:'Comprar', cancel:'Agora não'});
  if(!yes) return;
  walletAdd(-it.price);
  owned.add(it.id);
  saveJSON(OWNED_KEY, [...owned]);
  eq[it.slot] = it.id;
  saveJSON(EQUIP_KEY, equipped);
  renderShop();
  confetti($('taShopPreview'));
  tone([523, 659, 784, 1047], .5, 'triangle', .06);
  say(`Comprou ${it.name}! Ficou lindo!`, 0.95);
  showShopTip(`🎉 Você comprou ${it.name}!`);
}

let tipTimer = 0;
function showShopTip(text){
  const tip = $('taShopTip');
  tip.textContent = text;
  tip.classList.add('show');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(()=> tip.classList.remove('show'), 2600);
}

// ícone de cada item (desenhado sozinho, grandinho)
function drawItemIcon(canvas, it){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = 72, h = 62;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const P = {t:0, state:'idle'};
  c.save();
  if(it.id === 'astronauta'){ c.translate(33, 18); c.scale(1.05, 1.05); ACC_HEAD[it.id](c, P); }
  else if(it.slot === 'head'){ c.translate(36, 52); c.scale(it.id === 'orelhas' || it.id === 'unicornio' ? 1.3 : 1.6, it.id === 'orelhas' || it.id === 'unicornio' ? 1.3 : 1.6); ACC_HEAD[it.id](c, P); }
  else if(it.slot === 'eyes'){ c.translate(36, 32); c.scale(2.4, 2.4); ACC_EYES[it.id](c, true); }
  else if(it.slot === 'back'){
    if(it.id === 'capa'){ c.translate(56, 18); c.scale(1.25, 1.25); }
    else if(it.id === 'asasAnjo' || it.id === 'asasBorboleta'){ c.translate(50, 42); c.scale(1.7, 1.7); }
    else if(it.id === 'jetpack'){ c.translate(36, 28); c.scale(1.9, 1.9); P.state = 'jump'; }
    else if(it.id === 'mochila'){ c.translate(36, 28); c.scale(2, 2); }
    else { c.translate(40, 26); c.scale(2.2, 2.2); }
    ACC_BACK[it.id].draw(c, P);
  } else { c.translate(36, 30); c.scale(1.5, 1.5); ACC_EFFECT[it.id](c); }
  c.restore();
}

// palco com o personagem vestido (e o rastro, se tiver)
const shopTrail = [];
function drawShopPreview(t){
  const canvas = $('taShopPreview');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = 260, h = 200;
  if(canvas.width !== w * dpr){ canvas.width = w * dpr; canvas.height = h * dpr; }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  // chão do palco
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.ellipse(w / 2, h - 26, 80, 14, 0, 0, Math.PI * 2); c.fill();
  const eq = shopEquipOf(shopChar);
  const hop = Math.abs(Math.sin(t * 2.2)) * 10;
  const P = {t, state: hop > 2 ? 'run' : 'idle', eq, happy: (t % 4) > 3.2};
  // rastro de exemplo
  if(eq.effect){
    if(Math.random() < .35) shopTrail.push({x:w / 2 - 30 + (Math.random() - .5) * 16, y:h - 60 - hop + (Math.random() - .5) * 20, life:1, kind:eq.effect, hue:(t * 200) % 360});
  }
  for(let i = shopTrail.length - 1; i >= 0; i--){
    const p = shopTrail[i];
    p.life -= .016; p.x -= 1.1; p.y -= .3;
    if(p.life <= 0 || eq.effect !== p.kind){ shopTrail.splice(i, 1); continue; }
    drawTrailBit(c, p.x, p.y, p.kind, p.life, p.hue);
  }
  const cx = {capivara:w / 2 - 12, tatu:w / 2 - 2, robo:w / 2}[shopChar] || w / 2;
  drawChar(c, shopChar, cx, h - 26 - hop, P, 2.1);
}

// um pedacinho do rastro (usado na loja e na corrida)
function drawTrailBit(c, x, y, kind, life, hue){
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, life * 1.4));
  c.translate(x, y);
  const s = .5 + life * .6;
  c.scale(s, s);
  if(kind === 'coracoes'){
    c.beginPath(); c.moveTo(0, 5); c.bezierCurveTo(-9, -1, -5, -8, 0, -3); c.bezierCurveTo(5, -8, 9, -1, 0, 5); c.closePath();
    c.fillStyle = '#F43F5E'; c.fill();
  } else if(kind === 'estrelas'){
    starPathP(c, 0, 0, 7, 3); c.fillStyle = '#FACC15'; c.fill();
    c.strokeStyle = '#F59E0B'; c.lineWidth = 1; c.stroke();
  } else if(kind === 'bolhas'){
    c.strokeStyle = 'rgba(14,165,233,.8)'; c.lineWidth = 1.4; c.fillStyle = 'rgba(186,230,253,.35)';
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-2, -2, 1.5, 0, Math.PI * 2); c.fill();
  } else if(kind === 'notas'){
    c.font = '700 15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = `hsl(${(hue || 0) % 360}, 75%, 55%)`; c.fillText((hue || 0) % 2 < 1 ? '♪' : '♫', 0, 0);
  } else if(kind === 'brilho'){
    c.fillStyle = `hsl(${hue || 0}, 90%, 65%)`;
    c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(0, 0, 6, 0); c.quadraticCurveTo(0, 0, 0, 6); c.quadraticCurveTo(0, 0, -6, 0); c.quadraticCurveTo(0, 0, 0, -6); c.fill();
  } else if(kind === 'fogo'){
    const r = 4 + (1 - life) * 6;
    c.fillStyle = life > .6 ? '#FDE047' : life > .35 ? '#FB923C' : '#EF4444';
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  } else {
    c.fillStyle = `hsl(${hue || 0}, 90%, 62%)`;
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function setupShop(){
  $('taShopBtn').addEventListener('click', ()=>{ if(taRun.hidden) showShop(); });
  $('taShopClose').addEventListener('click', closeShop);
  renderWallet();
}
