/* =====================================================================
   Bazar Ohkubo — js/app.js
   Toda a lógica da vitrine: catálogo + filtros, carrinho, checkout em
   etapas (CEP via ViaCEP), registro de pedidos no painel e efeitos
   visuais (luz do cursor, partículas, reveal).
   Este arquivo é referenciado no fim do <body> do index.html.
===================================================================== */

/* Detecta aparelhos sem mouse / com pouca capacidade → desliga efeitos caros */
const TEM_MOUSE=matchMedia('(hover:hover) and (pointer:fine)').matches;
const POUCA_MEMORIA=(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
const MOVIMENTO_OK=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const EFEITOS_PESADOS=TEM_MOUSE && MOVIMENTO_OK && !POUCA_MEMORIA;

/* ===== luz dourada que segue o cursor (só desktop) ===== */
const luz=document.getElementById('cursorLight');
if(luz && TEM_MOUSE && MOVIMENTO_OK){
  let lx=innerWidth/2, ly=innerHeight/2, tx=lx, ty=ly, ativo=false;
  addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;ativo=true},{passive:true});
  (function animaLuz(){
    if(ativo){
      lx+=(tx-lx)*.08; ly+=(ty-ly)*.08;
      luz.style.transform=`translate(${lx}px,${ly}px)`;
    }
    requestAnimationFrame(animaLuz);
  })();
}else if(luz){luz.style.display='none'}

/* ===== luz interativa dentro dos cards (só desktop) ===== */
if(TEM_MOUSE){
  document.querySelectorAll('.card-luz').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty('--mx',(e.clientX-r.left)+'px');
      card.style.setProperty('--my',(e.clientY-r.top)+'px');
    },{passive:true});
  });
}

/* ===== partículas douradas no hero (só desktop capaz) ===== */
const cv=document.getElementById('particles');
if(cv && EFEITOS_PESADOS){
  const ctx=cv.getContext('2d');
  let W,H,ps=[];
  function resize(){
    W=cv.width=cv.offsetWidth; H=cv.height=cv.offsetHeight;
    ps=Array.from({length:Math.min(48,Math.round(W/26))},()=>({
      x:Math.random()*W, y:Math.random()*H,
      r:Math.random()*1.6+.4,
      vx:(Math.random()-.5)*.18, vy:-(Math.random()*.3+.08),
      a:Math.random()*.6+.15, fase:Math.random()*Math.PI*2
    }));
  }
  resize(); addEventListener('resize',resize,{passive:true});
  /* só anima enquanto o hero estiver visível */
  let visivel=true;
  const hero=document.querySelector('.hero');
  if(hero&&'IntersectionObserver'in window){
    new IntersectionObserver(es=>{visivel=es[0].isIntersecting},{threshold:0}).observe(hero);
  }
  (function tick(t){
    if(visivel){
      ctx.clearRect(0,0,W,H);
      for(const p of ps){
        p.x+=p.vx; p.y+=p.vy;
        if(p.y<-10){p.y=H+10;p.x=Math.random()*W}
        if(p.x<-10)p.x=W+10; if(p.x>W+10)p.x=-10;
        const tw=p.a*(0.55+0.45*Math.sin(t/700+p.fase));
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(240,206,107,${tw})`;
        ctx.fill();
      }
    }
    requestAnimationFrame(tick);
  })(0);
}else if(cv){cv.style.display='none'}

/* ===== nav / menu / marquee / reveal ===== */
const nav=document.getElementById('nav');
let navTick=false;
addEventListener('scroll',()=>{
  if(navTick)return; navTick=true;
  requestAnimationFrame(()=>{nav.classList.toggle('scrolled',scrollY>40);navTick=false});
},{passive:true});

const menuBtn=document.getElementById('menuBtn');
const navMobile=document.getElementById('navMobile');
menuBtn.addEventListener('click',()=>navMobile.classList.toggle('open'));
navMobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>navMobile.classList.remove('open')));

const track=document.getElementById('marqueeTrack');
track.innerHTML+=track.innerHTML;

const io=new IntersectionObserver(es=>{
  es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ==================================================
   CATÁLOGO
   PRODUTOS abaixo é o catálogo de RESERVA (fallback).
   Com o painel/banco ativos, a lista oficial vem de /api/produtos.
================================================== */
const API={produtos:'/api/produtos',pedidos:'/api/pedidos'};
let PRODUTOS=[
  {id:'serum',nome:'Sérum Facial Iluminador',cat:'Skincare',preco:49.90,estoque:14,tag:'Novo',
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="36" y="8" width="28" height="18" rx="3" fill="#8C6B1E"/><rect x="30" y="26" width="40" height="100" rx="8" fill="url(#gradOuro)"/><rect x="38" y="48" width="24" height="42" rx="3" fill="#070503" opacity=".35"/></svg>'},
  {id:'argola',nome:'Brinco Argola Dourada',cat:'Bijouterias',preco:24.90,estoque:20,sufixo:'o par',
   svg:'<svg viewBox="0 0 100 140" fill="none"><circle cx="50" cy="55" r="30" stroke="url(#gradOuro)" stroke-width="5"/><circle cx="50" cy="98" r="9" fill="#F0CE6B"/><path d="M50 25 v-12" stroke="#D4A437" stroke-width="4" stroke-linecap="round"/></svg>'},
  {id:'perfume',nome:'Eau de Parfum Âmbar 50ml',cat:'Perfumaria',preco:89.90,estoque:9,tag:'Mais vendido',
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="40" y="10" width="20" height="14" rx="2" fill="#8C6B1E"/><path d="M32 32 h36 l6 24 v60 a8 8 0 0 1 -8 8 h-32 a8 8 0 0 1 -8 -8 v-60 z" fill="url(#gradOuro)"/><circle cx="50" cy="78" r="14" fill="#070503" opacity=".3"/></svg>'},
  {id:'paleta',nome:'Paleta de Sombras Sunset',cat:'Maquiagem',preco:54.90,estoque:7,tag:'Novo',
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="14" y="36" width="72" height="68" rx="8" stroke="url(#gradOuro)" stroke-width="4"/><circle cx="34" cy="58" r="8" fill="#F0CE6B"/><circle cx="58" cy="58" r="8" fill="#D4A437"/><circle cx="34" cy="82" r="8" fill="#8C6B1E"/><circle cx="58" cy="82" r="8" fill="#F0CE6B" opacity=".6"/></svg>'},
  {id:'batom',nome:'Batom Matte Ruby',cat:'Maquiagem',preco:19.90,estoque:25,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="38" y="64" width="24" height="58" rx="4" fill="url(#gradOuro)"/><rect x="42" y="50" width="16" height="16" fill="#8C6B1E"/><path d="M42 50 v-22 a8 8 0 0 1 16 0 l0 22 z" fill="#F0CE6B"/></svg>'},
  {id:'colar',nome:'Colar Pingente Coração',cat:'Bijouterias',preco:34.90,estoque:11,
   svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M50 18 c-26 14 -30 44 0 58 c30 -14 26 -44 0 -58z" stroke="url(#gradOuro)" stroke-width="5" fill="none"/><path d="M50 76 v34" stroke="#D4A437" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="118" r="6" fill="#F0CE6B"/></svg>'},
  {id:'base',nome:'Base Líquida HD',cat:'Maquiagem',preco:39.90,estoque:10,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="44" y="10" width="24" height="8" rx="3" fill="#8C6B1E"/><rect x="44" y="18" width="12" height="18" fill="#8C6B1E"/><rect x="36" y="36" width="28" height="88" rx="7" fill="url(#gradOuro)"/></svg>'},
  {id:'protetor',nome:'Protetor Solar Facial FPS50',cat:'Skincare',preco:44.90,estoque:16,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="40" y="12" width="20" height="14" rx="3" fill="#8C6B1E"/><rect x="32" y="26" width="36" height="98" rx="7" fill="url(#gradOuro)"/><circle cx="50" cy="58" r="9" fill="#070503" opacity=".3"/><path d="M50 44v-5M50 72v5M63 58h5M37 58h-5" stroke="#070503" opacity=".3" stroke-width="3" stroke-linecap="round"/></svg>'},
  {id:'conjunto',nome:'Conjunto Colar e Brincos',cat:'Bijouterias',preco:49.90,estoque:6,tag:'Kit',
   svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M22 34q28 34 56 0" stroke="url(#gradOuro)" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="50" cy="56" r="7" fill="#F0CE6B"/><path d="M34 84v5M66 84v5" stroke="#D4A437" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="99" r="9" stroke="#D4A437" stroke-width="4"/><circle cx="66" cy="99" r="9" stroke="#D4A437" stroke-width="4"/></svg>'},
  {id:'gloss',nome:'Gloss Labial Mel',cat:'Maquiagem',preco:16.90,estoque:18,
   svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M50 10v10" stroke="#D4A437" stroke-width="4" stroke-linecap="round"/><rect x="45" y="20" width="10" height="20" rx="4" fill="#8C6B1E"/><rect x="41" y="40" width="18" height="84" rx="7" fill="url(#gradOuro)"/></svg>'},
  {id:'rimel',nome:'Máscara de Cílios Volume',cat:'Maquiagem',preco:27.90,estoque:3,tag:'Mais vendido',
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="44" y="10" width="12" height="36" rx="4" fill="#8C6B1E"/><path d="M46 18h8M46 26h8M46 34h8" stroke="#F0CE6B" stroke-width="2"/><path d="M50 46v10" stroke="#D4A437" stroke-width="3"/><rect x="40" y="56" width="20" height="68" rx="6" fill="url(#gradOuro)"/></svg>'},
  {id:'blush',nome:'Blush Compacto Rosé',cat:'Maquiagem',preco:24.90,estoque:12,
   svg:'<svg viewBox="0 0 100 140" fill="none"><circle cx="50" cy="64" r="34" stroke="url(#gradOuro)" stroke-width="5"/><circle cx="50" cy="64" r="19" fill="#F0CE6B" opacity=".9"/><rect x="36" y="100" width="28" height="7" rx="3.5" fill="#8C6B1E"/></svg>'},
  {id:'pulseira',nome:'Pulseira Elos Dourados',cat:'Bijouterias',preco:29.90,estoque:15,
   svg:'<svg viewBox="0 0 100 140" fill="none"><circle cx="50" cy="70" r="34" stroke="url(#gradOuro)" stroke-width="5" stroke-dasharray="14 9" stroke-linecap="round"/><circle cx="50" cy="36" r="6" fill="#F0CE6B"/></svg>'},
  {id:'micelar',nome:'Água Micelar 400ml',cat:'Skincare',preco:29.90,estoque:8,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="42" y="10" width="16" height="16" rx="3" fill="#8C6B1E"/><rect x="32" y="26" width="36" height="100" rx="8" fill="url(#gradOuro)"/><rect x="38" y="56" width="24" height="36" rx="3" fill="#070503" opacity=".3"/></svg>'},
  {id:'anel',nome:'Anel Ajustável Cristal',cat:'Bijouterias',preco:17.90,estoque:22,
   svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M50 28l13 15-13 15-13-15z" fill="#F0CE6B"/><circle cx="50" cy="86" r="26" stroke="url(#gradOuro)" stroke-width="6"/></svg>'},
  {id:'bodysplash',nome:'Body Splash Vanilla',cat:'Perfumaria',preco:36.90,estoque:13,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="40" y="26" width="20" height="16" rx="3" fill="#8C6B1E"/><path d="M64 26l9-6M66 34l11-2M60 20l5-9" stroke="#D4A437" stroke-width="3" stroke-linecap="round"/><rect x="34" y="42" width="32" height="82" rx="9" fill="url(#gradOuro)"/></svg>'},
  {id:'vitc',nome:'Hidratante Facial Vitamina C',cat:'Skincare',preco:38.90,estoque:2,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="44" y="6" width="12" height="22" rx="3" fill="#8C6B1E"/><path d="M44 28h12l8 16v66a8 8 0 0 1-8 8H44a8 8 0 0 1-8-8V44z" fill="url(#gradOuro)"/><circle cx="50" cy="82" r="9" fill="#070503" opacity=".3"/></svg>'},
  {id:'perola',nome:'Brinco Pérola Clássico',cat:'Bijouterias',preco:21.90,estoque:17,sufixo:'o par',
   svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M50 16c11 3 11 16 0 18" stroke="#D4A437" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="50" cy="82" r="27" fill="url(#gradOuro)"/><circle cx="41" cy="73" r="6" fill="#F5EDDB" opacity=".75"/></svg>'},
  {id:'mascara',nome:'Máscara Capilar Nutrição',cat:'Cabelos',preco:32.90,estoque:9,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="26" y="44" width="48" height="50" rx="10" fill="url(#gradOuro)"/><rect x="24" y="30" width="52" height="14" rx="4" fill="#8C6B1E"/><ellipse cx="50" cy="70" rx="14" ry="10" fill="#070503" opacity=".25"/></svg>'},
  {id:'oleo',nome:'Óleo Reparador de Pontas',cat:'Cabelos',preco:26.90,estoque:14,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="40" y="6" width="20" height="8" rx="3" fill="#8C6B1E"/><rect x="46" y="14" width="8" height="18" fill="#8C6B1E"/><path d="M50 32c-15 9-21 20-21 36a21 21 0 0 0 42 0c0-16-6-27-21-36z" fill="url(#gradOuro)"/></svg>'},
  {id:'leavein',nome:'Leave-in Protetor Térmico',cat:'Cabelos',preco:28.90,estoque:5,
   svg:'<svg viewBox="0 0 100 140" fill="none"><path d="M42 40V28h11l9 7v5z" fill="#8C6B1E"/><path d="M65 30l9-4M64 21l7-8" stroke="#D4A437" stroke-width="3" stroke-linecap="round"/><rect x="38" y="40" width="24" height="84" rx="7" fill="url(#gradOuro)"/></svg>'},
  {id:'pinceis',nome:'Kit 5 Pincéis de Maquiagem',cat:'Acessórios',preco:39.90,estoque:4,
   svg:'<svg viewBox="0 0 100 140" fill="none" stroke-linecap="round"><path d="M36 124V74" stroke="url(#gradOuro)" stroke-width="10"/><rect x="30" y="58" width="12" height="16" fill="#8C6B1E"/><path d="M30 58l6-24 6 24z" fill="#F0CE6B"/><path d="M64 124V82" stroke="url(#gradOuro)" stroke-width="10"/><rect x="58" y="66" width="12" height="16" fill="#8C6B1E"/><path d="M58 66l6-20 6 20z" fill="#F0CE6B"/></svg>'},
  {id:'necessaire',nome:'Nécessaire Glam',cat:'Acessórios',preco:34.90,estoque:10,
   svg:'<svg viewBox="0 0 100 140" fill="none"><rect x="18" y="46" width="64" height="58" rx="13" stroke="url(#gradOuro)" stroke-width="5"/><path d="M18 64h64" stroke="#D4A437" stroke-width="4"/><circle cx="68" cy="64" r="4" fill="#F0CE6B"/><path d="M68 68v7" stroke="#F0CE6B" stroke-width="3" stroke-linecap="round"/></svg>'}
];
const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

const grid=document.getElementById('prodGrid');
const filtrosEl=document.getElementById('filtros');
let filtroAtual='Todos';

function montaChips(){
  const cats=['Todos',...new Set(PRODUTOS.map(p=>p.cat))];
  if(!cats.includes(filtroAtual))filtroAtual='Todos';
  filtrosEl.innerHTML=cats.map(c=>`<button class="chip${c===filtroAtual?' on':''}" data-cat="${c}">${c}</button>`).join('');
}
function bindLuz(escopo){
  escopo.querySelectorAll('.card-luz').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty('--mx',(e.clientX-r.left)+'px');
      card.style.setProperty('--my',(e.clientY-r.top)+'px');
    },{passive:true});
  });
}
let primeiraLeva=true;
function renderProdutos(){
  const lista=filtroAtual==='Todos'?PRODUTOS:PRODUTOS.filter(p=>p.cat===filtroAtual);
  grid.innerHTML=lista.map(p=>{
    const esgotado=p.estoque===0;
    const baixo=!esgotado&&typeof p.estoque==='number'&&p.estoque<=3;
    return `
  <article class="card-luz reveal${primeiraLeva?'':' in'}" data-id="${p.id}">
    <div class="prod-img">
      ${esgotado?'<span class="prod-tag esgotado">Esgotado</span>':(p.tag?`<span class="prod-tag">${p.tag}</span>`:'')}
      ${p.svg}
    </div>
    <div class="prod-info">
      <span class="prod-cat">${p.cat}</span>
      <h4>${p.nome}</h4>
      <span class="prod-preco">${fmt(p.preco)}${p.sufixo?`<small>${p.sufixo}</small>`:''}</span>
      ${baixo?`<span class="estoque-low">Últimas ${p.estoque} unid.</span>`:''}
      <button class="prod-add" data-add="${p.id}"${esgotado?' disabled':''}>${esgotado?'Esgotado':'Adicionar ao carrinho'}</button>
    </div>
  </article>`}).join('');
  if(primeiraLeva){grid.querySelectorAll('.reveal').forEach(el=>io.observe(el));primeiraLeva=false}
  bindLuz(grid);
}
montaChips();
renderProdutos();
filtrosEl.addEventListener('click',e=>{
  const chip=e.target.closest('.chip'); if(!chip)return;
  filtroAtual=chip.dataset.cat;
  filtrosEl.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===chip));
  renderProdutos();
});

/* catálogo oficial do banco (painel administrativo) */
(async()=>{
  try{
    const r=await fetch(API.produtos);
    if(!r.ok)throw 0;
    const lista=await r.json();
    if(Array.isArray(lista)&&lista.length){
      PRODUTOS=lista;
      montaChips();
      renderProdutos();
    }
  }catch(e){/* sem backend: usa o catálogo de reserva acima */}
})();

/* ==================================================
   CARRINHO (estado em memória)
================================================== */
let carrinho=[];
const badge=document.getElementById('cartBadge');
const drawer=document.getElementById('drawer');
const overlay=document.getElementById('overlay');
const drawerBody=document.getElementById('drawerBody');
const drawerSubtotal=document.getElementById('drawerSubtotal');
const drawerQtd=document.getElementById('drawerQtd');
const btnCheckout=document.getElementById('btnCheckout');

const totalItens=()=>carrinho.reduce((s,i)=>s+i.qty,0);
const subtotal=()=>carrinho.reduce((s,i)=>s+i.preco*i.qty,0);

function add(id){
  const p=PRODUTOS.find(x=>x.id===id); if(!p)return;
  const max=(typeof p.estoque==='number')?p.estoque:99;
  if(max<=0){toast('Produto esgotado no momento');return}
  const item=carrinho.find(x=>x.id===id);
  if((item?item.qty:0)>=max){toast('Quantidade máxima em estoque atingida');return}
  item?item.qty++:carrinho.push({...p,qty:1});
  sync(); toast(`${p.nome} adicionado ao carrinho`);
  badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop');
}
function mudaQty(id,d){
  const item=carrinho.find(x=>x.id===id); if(!item)return;
  if(d>0){
    const p=PRODUTOS.find(x=>x.id===id);
    const max=(p&&typeof p.estoque==='number')?p.estoque:99;
    if(item.qty>=max){toast('Quantidade máxima em estoque');return}
  }
  item.qty+=d;
  if(item.qty<=0)carrinho=carrinho.filter(x=>x.id!==id);
  sync();
}
function remove(id){carrinho=carrinho.filter(x=>x.id!==id);sync()}

function sync(){
  const n=totalItens();
  badge.textContent=n; badge.classList.toggle('on',n>0);
  drawerQtd.textContent=n?`(${n})`:'';
  drawerSubtotal.textContent=fmt(subtotal());
  btnCheckout.disabled=n===0;
  if(!n){
    drawerBody.innerHTML=`<div class="cart-vazio">
      <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#D4A437" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      <p>Seu carrinho está vazio</p>
      <span style="font-size:.78rem;color:var(--creme2)">Os achados dourados esperam por você ✦</span>
    </div>`;
    return;
  }
  drawerBody.innerHTML=carrinho.map(i=>`
    <div class="cart-item">
      <div class="cart-thumb">${i.svg}</div>
      <div>
        <h5>${i.nome}</h5>
        <span class="ci-preco">${fmt(i.preco*i.qty)}</span>
        <div class="qty">
          <button data-q="-1" data-id="${i.id}" aria-label="Diminuir">−</button>
          <span>${i.qty}</span>
          <button data-q="1" data-id="${i.id}" aria-label="Aumentar">+</button>
        </div>
      </div>
      <button class="ci-remove" data-rm="${i.id}" aria-label="Remover ${i.nome}">✕</button>
    </div>`).join('');
}
sync();

document.addEventListener('click',e=>{
  const a=e.target.closest('[data-add]'); if(a){
    add(a.dataset.add);
    a.classList.add('ok'); a.textContent='Adicionado ✓';
    setTimeout(()=>{a.classList.remove('ok');a.textContent='Adicionar ao carrinho'},1100);
  }
  const q=e.target.closest('[data-q]'); if(q)mudaQty(q.dataset.id,+q.dataset.q);
  const r=e.target.closest('[data-rm]'); if(r)remove(r.dataset.rm);
});

/* drawer abre/fecha */
const lock=v=>document.body.classList.toggle('lock',v);
function abreDrawer(){drawer.classList.add('open');overlay.classList.add('on');lock(true)}
function fechaDrawer(){drawer.classList.remove('open');if(!checkout.classList.contains('open')){overlay.classList.remove('on');lock(false)}}
document.getElementById('cartBtn').addEventListener('click',abreDrawer);
document.getElementById('drawerClose').addEventListener('click',fechaDrawer);
overlay.addEventListener('click',()=>{fechaDrawer();fechaCheckout()});
addEventListener('keydown',e=>{if(e.key==='Escape'){fechaDrawer();fechaCheckout()}});

/* toast */
function toast(msg){
  const z=document.getElementById('toastZone');
  const t=document.createElement('div');
  t.className='toast'; t.innerHTML=`<span class="dot"></span>${msg}`;
  z.appendChild(t);
  setTimeout(()=>{t.classList.add('sai');setTimeout(()=>t.remove(),350)},2600);
}

/* ==================================================
   CHECKOUT — WIZARD
================================================== */
const checkout=document.getElementById('checkout');
const steps=[...checkout.querySelectorAll('.ck-step')];
const prog=[...checkout.querySelectorAll('.ck-progress .p')];
const btnAvancar=document.getElementById('btnAvancar');
const btnVoltar=document.getElementById('btnVoltar');
const ckFoot=document.getElementById('ckFoot');
let passo=1;
const dados={nome:'',fone:'',entrega:'retirada',endereco:'',pag:'Pix'};

function mostraPasso(n){
  passo=n;
  steps.forEach(s=>s.classList.toggle('on',+s.dataset.step===n));
  prog.forEach(p=>p.classList.toggle('on',+p.dataset.p<=n));
  btnVoltar.style.visibility=n===1?'hidden':'visible';
  btnAvancar.textContent=n===4?'Enviar pelo WhatsApp':'Continuar';
  ckFoot.style.display=n===5?'none':'flex';
  if(n===4)montaRevisao();
}
function abreCheckout(){
  fechaDrawer();
  checkout.classList.add('open');overlay.classList.add('on');lock(true);
  mostraPasso(1);
  setTimeout(()=>document.getElementById('inNome').focus(),420);
}
function fechaCheckout(){
  checkout.classList.remove('open');
  if(!drawer.classList.contains('open')){overlay.classList.remove('on');lock(false)}
}
btnCheckout.addEventListener('click',abreCheckout);
document.getElementById('ckClose').addEventListener('click',fechaCheckout);

/* opções (entrega / pagamento) */
function ligaOpcoes(idGrupo,cb){
  const g=document.getElementById(idGrupo);
  g.querySelectorAll('.opcao').forEach(op=>{
    op.addEventListener('click',()=>{
      g.querySelectorAll('.opcao').forEach(o=>o.classList.remove('sel'));
      op.classList.add('sel');
      op.querySelector('input').checked=true;
      cb(op.dataset.val);
    });
  });
}
ligaOpcoes('opEntrega',v=>{
  dados.entrega=v;
  document.getElementById('painelEndereco').classList.toggle('on',v==='entrega');
  if(v==='entrega')setTimeout(()=>inCep.focus(),120);
});

/* ===== endereço por CEP (ViaCEP) ===== */
const inCep=document.getElementById('inCep');
const inRua=document.getElementById('inRua');
const inNum=document.getElementById('inNum');
const inCompl=document.getElementById('inCompl');
const inBairro=document.getElementById('inBairro');
const inCidade=document.getElementById('inCidade');
const inRef=document.getElementById('inRef');
const cepHint=document.getElementById('cepHint');
const cepSpin=document.getElementById('cepSpin');
let cepCtl=null;

async function buscaCep(cep){
  if(cepCtl)cepCtl.abort();
  cepCtl=new AbortController();
  const tempo=setTimeout(()=>cepCtl.abort(),6000);
  cepSpin.classList.add('on');
  cepHint.textContent=''; cepHint.classList.remove('alerta');
  try{
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:cepCtl.signal});
    const d=await r.json();
    if(d.erro)throw 'nao-encontrado';
    if(d.logradouro)inRua.value=d.logradouro;
    if(d.bairro)inBairro.value=d.bairro;
    inCidade.value=`${d.localidade} - ${d.uf}`;
    document.getElementById('cCep').classList.remove('invalido');
    if(d.localidade==='Palmas'&&d.uf==='TO'){
      cepHint.textContent='✓ Endereço localizado em Palmas-TO';
    }else{
      cepHint.textContent=`CEP de ${d.localidade}-${d.uf} — confirme com a loja se a sua região é atendida.`;
      cepHint.classList.add('alerta');
    }
    (d.logradouro?inNum:inRua).focus();
  }catch(e){
    cepHint.textContent=e==='nao-encontrado'
      ?'CEP não encontrado — confira o número ou preencha o endereço manualmente.'
      :'Não foi possível consultar o CEP agora — preencha o endereço manualmente.';
    cepHint.classList.add('alerta');
  }finally{
    clearTimeout(tempo);
    cepSpin.classList.remove('on');
  }
}
inCep.addEventListener('input',()=>{
  const d=inCep.value.replace(/\D/g,'').slice(0,8);
  inCep.value=d.length>5?d.slice(0,5)+'-'+d.slice(5):d;
  if(d.length===8)buscaCep(d);
});
ligaOpcoes('opPagamento',v=>dados.pag=v);

function pagLabel(){
  if(dados.pag==='Dinheiro')return'Dinheiro';
  if(dados.pag==='CartaoLoja')return'Cartão na maquininha (retirada ou entrega)';
  return'Pix';
}
const pagWhats=pagLabel;

/* validação */
const valida={
  1(){
    let ok=true;
    const nome=document.getElementById('inNome').value.trim();
    const fone=document.getElementById('inFone').value.replace(/\D/g,'');
    document.getElementById('cNome').classList.toggle('invalido',!nome); if(!nome)ok=false;
    document.getElementById('cFone').classList.toggle('invalido',fone.length<10); if(fone.length<10)ok=false;
    if(ok){dados.nome=nome;dados.fone=document.getElementById('inFone').value.trim()}
    return ok;
  },
  2(){
    if(dados.entrega==='retirada')return true;
    let ok=true;
    const marca=(id,bad)=>{document.getElementById(id).classList.toggle('invalido',bad);if(bad)ok=false};
    const cep=inCep.value.replace(/\D/g,'');
    const rua=inRua.value.trim(), num=inNum.value.trim();
    const bai=inBairro.value.trim(), cid=inCidade.value.trim();
    marca('cCep',cep.length!==8);
    marca('cRua',!rua);
    marca('cNum',!num);
    marca('cBairro',!bai);
    marca('cCidade',!cid);
    if(ok){
      const compl=inCompl.value.trim(), ref=inRef.value.trim();
      dados.endereco=`${rua}, nº ${num}${compl?` (${compl})`:''} — ${bai}, ${cid} · CEP ${inCep.value}${ref?` · Ref.: ${ref}`:''}`;
    }
    return ok;
  },
  3(){return true},
};

function montaRevisao(){
  document.getElementById('revItens').innerHTML=carrinho.map(i=>
    `<div class="rev-item"><span>${i.qty}× ${i.nome}</span><span>${fmt(i.preco*i.qty)}</span></div>`).join('');
  document.getElementById('revInfo').innerHTML=
    `<strong style="color:var(--creme)">${dados.nome}</strong> · ${dados.fone}<br>`+
    (dados.entrega==='retirada'
      ?'Retirada na loja — Q. 104 Sul, Av. NS 4, nº 41, Sala 05'
      :`Entrega em Palmas — ${dados.endereco}<br><em style="color:var(--ouro-escuro)">Taxa de entrega combinada pelo WhatsApp.</em>`)+
    `<br>Pagamento: ${pagLabel()}`;
  document.getElementById('revTotalLbl').textContent=dados.entrega==='entrega'?'Total dos itens (sem taxa)':'Total dos itens';
  document.getElementById('revTotal').textContent=fmt(subtotal());
}

function mensagemWhats(){
  const linhas=carrinho.map(i=>`▸ ${i.qty}x ${i.nome} — ${fmt(i.preco*i.qty)}`).join('\n');
  return [
    '*NOVO PEDIDO — BAZAR OHKUBO* ✦',
    '',
    '*Itens:*', linhas,
    '',
    `*Total dos itens:* ${fmt(subtotal())}`,
    `*Recebimento:* ${dados.entrega==='retirada'?'Retirada na loja':'Entrega em Palmas'}`,
    ...(dados.entrega==='entrega'?[`*Endereço:* ${dados.endereco}`,'_Taxa de entrega a combinar._']:[]),
    `*Pagamento:* ${pagWhats()}`,
    '',
    `*Cliente:* ${dados.nome}`,
    `*Contato:* ${dados.fone}`,
    '',
    '_Pedido feito pelo site._'
  ].join('\n');
}

/* registra o pedido na Área de Pedidos do painel e devolve o número (BZ-…)
   — silencioso e com timeout: o checkout nunca trava se não houver backend */
async function registraPedido(pagamentoTxt){
  try{
    const ctl=new AbortController();
    const t=setTimeout(()=>ctl.abort(),2500);
    const r=await fetch(API.pedidos,{method:'POST',signal:ctl.signal,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        itens:carrinho.map(i=>({id:i.id,nome:i.nome,qty:i.qty,preco:i.preco})),
        cliente:{nome:dados.nome,fone:dados.fone},
        entrega:dados.entrega,
        endereco:dados.endereco||'',
        pagamento:pagamentoTxt,
        total:subtotal()
      })});
    clearTimeout(t);
    if(r.ok){const d=await r.json();return d.numero||''}
  }catch(e){}
  return '';
}
const insereNumero=(texto,numero)=>numero
  ?texto.replace('*NOVO PEDIDO — BAZAR OHKUBO* ✦',`*NOVO PEDIDO — BAZAR OHKUBO* ✦\n*Nº do pedido:* ${numero}`)
  :texto;

btnAvancar.addEventListener('click',()=>{
  if(passo<4){
    if(valida[passo]())mostraPasso(passo+1);
    return;
  }
  /* passo 4 → registra no painel e envia pelo WhatsApp */
  const msg=mensagemWhats();
  btnAvancar.disabled=true;
  (async()=>{
    const numero=await registraPedido(pagLabel());
    window.open(`https://wa.me/556332151718?text=${encodeURIComponent(insereNumero(msg,numero))}`,'_blank');
    document.getElementById('sucExtra').textContent=numero?`Pedido ${numero} registrado ✓`:'';
    mostraPasso(5);
    carrinho=[]; sync();
    btnAvancar.disabled=false;
  })();
});
btnVoltar.addEventListener('click',()=>{if(passo>1)mostraPasso(passo-1)});
