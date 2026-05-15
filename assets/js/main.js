// ── DYNAMIC TITLE ──
const TARGET = new Date('2026-05-16T14:00:00-03:00');
let titleFlip = false;
function updateTitle(diff){
  if(diff<=0){document.title='🎉 Miguelimpíadas — Começou!';return;}
  const d=Math.floor(diff/86400000);
  const h=Math.floor(diff%86400000/3600000);
  const m=Math.floor(diff%3600000/60000);
  if(titleFlip){
    document.title=`⏰ ${d}d ${h}h ${m}m — Miguelimpíadas`;
  } else {
    document.title='🏅 Miguelimpíadas — Guia do Atleta';
  }
  titleFlip=!titleFlip;
}

// ── FLIP COUNTER — split-flap two-phase ──
const prevVals={d:null,h:null,m:null,s:null};
function flipDigit(el,val){
  if(el.textContent===val)return;
  el.classList.remove('flip-out','flip-in');
  void el.offsetWidth;
  el.classList.add('flip-out');
  el.addEventListener('animationend',function handler(){
    el.removeEventListener('animationend',handler);
    el.textContent=val;
    el.classList.remove('flip-out');
    void el.offsetWidth;
    el.classList.add('flip-in');
    el.addEventListener('animationend',function h2(){
      el.removeEventListener('animationend',h2);
      el.classList.remove('flip-in');
    },{once:true});
  },{once:true});
}

function tick(){
  const diff=TARGET-new Date();
  updateTitle(diff);
  if(diff<=0){
    document.querySelector('.countdown').innerHTML='<div class="cd-unit"><span class="cd-num">🎉</span><span class="cd-lbl">já!</span></div>';
    return;
  }
  const d=String(Math.floor(diff/86400000)).padStart(2,'0');
  const h=String(Math.floor(diff%86400000/3600000)).padStart(2,'0');
  const m=String(Math.floor(diff%3600000/60000)).padStart(2,'0');
  const s=String(Math.floor(diff%60000/1000)).padStart(2,'0');
  flipDigit(document.getElementById('cd-d'),d);
  flipDigit(document.getElementById('cd-h'),h);
  flipDigit(document.getElementById('cd-m'),m);
  flipDigit(document.getElementById('cd-s'),s);
}
tick();
setInterval(tick,1000);
setInterval(()=>{const diff=TARGET-new Date();updateTitle(diff);},4000);

// ── SCROLL REVEAL ──
const ro=new IntersectionObserver(entries=>entries.forEach(e=>{
  if(e.isIntersecting)e.target.classList.add('visible');
}),{threshold:.08});
document.querySelectorAll('.reveal').forEach(el=>ro.observe(el));

// ── ACTIVE NAV ──
const secs=document.querySelectorAll('section[id]');
const links=document.querySelectorAll('.nav-link');
function updateActiveNav(){
  let current='';
  secs.forEach(sec=>{
    const rect=sec.getBoundingClientRect();
    if(rect.top<=160) current=sec.id;
  });
  links.forEach(l=>{
    l.classList.remove('active');
    if(l.getAttribute('href')==='#'+current) l.classList.add('active');
  });
}
window.addEventListener('scroll',updateActiveNav,{passive:true});
updateActiveNav();

// ── ACCORDION ──
function toggleAccordion(header){
  const body=header.nextElementSibling;
  const isOpen=body.classList.contains('open');
  header.classList.toggle('open',!isOpen);
  body.classList.toggle('open',!isOpen);
}

function toggleLoot(header){
  const body=header.nextElementSibling;
  const chevron=header.querySelector('svg');
  const isOpen=body.classList.contains('open');
  body.classList.toggle('open',!isOpen);
  if(chevron)chevron.style.transform=isOpen?'':'rotate(180deg)';
}

// ── MODAL ──
function openModal(cat,name,cost,desc,type){
  const catColors={
    sabotagem:'var(--red)',
    estrategia:'var(--purple)',
    caos:'var(--blue)',
    defesa:'var(--green)'
  };
  const catBgs={
    sabotagem:'var(--red-bg)',
    estrategia:'var(--purple-bg)',
    caos:'var(--blue-bg)',
    defesa:'var(--green-bg)'
  };
  const col=catColors[type]||'var(--blue)';
  const bg=catBgs[type]||'var(--blue-bg)';
  document.getElementById('modal-cat').innerHTML=`<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:${bg};color:${col};font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase">${cat}</span>`;
  document.getElementById('modal-name').textContent=name;
  document.getElementById('modal-cost').textContent=cost;
  const [rule, flavor] = desc.split(' // ');
  const descEl = document.getElementById('modal-desc');
  descEl.innerHTML = '';
  const p1 = document.createElement('p');
  p1.textContent = rule;
  descEl.appendChild(p1);
  if (flavor) {
    const p2 = document.createElement('p');
    p2.textContent = flavor;
    p2.className = 'modal-flavor';
    descEl.appendChild(p2);
  }
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow='hidden';
  document.documentElement.style.overflow='hidden';
}

function closeModal(e){
  if(e.target===document.getElementById('modal')){
    document.getElementById('modal').classList.remove('open');
    document.body.style.overflow='';
    document.documentElement.style.overflow='';
  }
}

// ── CONFETTI ENGINE (no library) ──
const canvas=document.getElementById('confetti-canvas');
const ctx=canvas.getContext('2d');
let particles=[];
let confettiRunning=false;
let confettiFrame;

function resizeCanvas(){canvas.width=innerWidth;canvas.height=innerHeight;}
resizeCanvas();
window.addEventListener('resize',resizeCanvas);

const COLORS=['#1a6cff','#00d4ff','#ffd000','#fff','#6d2fa0','#c8201a','#18803a'];

function makeParticle(){
  const x=Math.random()*canvas.width;
  return{
    x, y:-10,
    vx:(Math.random()-0.5)*6,
    vy:Math.random()*4+3,
    size:Math.random()*8+4,
    color:COLORS[Math.floor(Math.random()*COLORS.length)],
    rotation:Math.random()*360,
    rotSpeed:(Math.random()-0.5)*8,
    shape:Math.random()<0.5?'rect':'circle',
    alpha:1,
    gravity:.12,
    drag:.99,
  };
}

function launchConfetti(burst=200){
  canvas.classList.add('active');
  confettiRunning=true;
  for(let i=0;i<burst;i++){
    const p=makeParticle();
    p.vy=Math.random()*-12-4;
    p.vx=(Math.random()-0.5)*14;
    p.y=canvas.height*0.35;
    particles.push(p);
  }
}

function animateConfetti(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles=particles.filter(p=>p.alpha>0.02&&p.y<canvas.height+40);
  for(const p of particles){
    p.vy+=p.gravity;
    p.vx*=p.drag;
    p.vy*=p.drag;
    p.x+=p.vx;
    p.y+=p.vy;
    p.rotation+=p.rotSpeed;
    p.alpha-=0.008;
    ctx.save();
    ctx.globalAlpha=Math.max(0,p.alpha);
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rotation*Math.PI/180);
    ctx.fillStyle=p.color;
    if(p.shape==='rect'){
      ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
    } else {
      ctx.beginPath();
      ctx.arc(0,0,p.size/2,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  if(particles.length>0){
    confettiFrame=requestAnimationFrame(animateConfetti);
  } else {
    canvas.classList.remove('active');
    confettiRunning=false;
  }
}

function startConfetti(){
  if(confettiFrame)cancelAnimationFrame(confettiFrame);
  particles=[];
  launchConfetti(220);
  // second burst slightly delayed
  setTimeout(()=>launchConfetti(120),400);
  animateConfetti();
}

// ── PREMIO COUNT-UP + ENTRANCE ──
let premioFired=false;
const premioObserver=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting&&!premioFired){
      premioFired=true;
      // trigger card entrances
      document.querySelectorAll('.premio-card').forEach(c=>c.classList.add('visible'));
      // count up each valor
      document.querySelectorAll('.counting').forEach(el=>{
        const target=parseInt(el.dataset.target);
        const duration=900;
        const steps=30;
        const increment=target/steps;
        let current=0;
        let step=0;
        const interval=setInterval(()=>{
          step++;
          current=Math.min(Math.round(increment*step),target);
          el.textContent=current;
          // bump scale on each increment
          el.classList.add('bump');
          setTimeout(()=>el.classList.remove('bump'),80);
          if(current>=target){
            clearInterval(interval);
            // fire confetti when first card finishes
            if(el===document.querySelectorAll('.counting')[0]){
              setTimeout(startConfetti,200);
            }
          }
        },duration/steps);
      });
    }
  });
},{threshold:.4});

document.querySelectorAll('.premio-card').forEach(c=>premioObserver.observe(c));


// ── FLOATING MASCOTS REVEAL ──
const mascotObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    e.target.querySelectorAll('.float-mascot').forEach(m => {
      if(e.isIntersecting) m.classList.add('visible');
    });
  });
}, {threshold: 0.15});
document.querySelectorAll('section[id]').forEach(s => mascotObs.observe(s));

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    document.getElementById('modal').classList.remove('open');
    document.body.style.overflow='';
    document.documentElement.style.overflow='';
  }
});

/* ── block 2 ── */

// ── MANUAL COMPLETO ──
function toggleManual(){
  const btn=document.getElementById('manual-btn');
  const wrap=document.getElementById('manual-wrap');
  const open=wrap.classList.toggle('open');
  btn.classList.toggle('open',open);
  btn.setAttribute('aria-expanded',open);
  if(open){
    setTimeout(()=>wrap.scrollIntoView({behavior:'smooth',block:'start'}),60);
  }
}

function toggleSection(hdr){
  const sec=hdr.closest('.manual-section');
  sec.classList.toggle('open');
}

function manualSearch(q){
  const sections=document.querySelectorAll('#manual-sections .manual-section');
  const noRes=document.getElementById('manual-no-results');
  const counter=document.getElementById('manual-result-count');
  const term=q.trim().toLowerCase();

  // Remove previous highlights
  sections.forEach(sec=>{
    const content=sec.querySelector('.manual-section-content');
    if(content){
      content.innerHTML=content.innerHTML.replace(/<mark class="hl">([^<]*)<\/mark>/gi,'$1');
    }
  });

  if(!term){
    sections.forEach(sec=>{sec.classList.remove('hidden');});
    noRes.style.display='none';
    counter.innerHTML='';
    return;
  }

  let visCount=0;
  let matchSections=0;

  sections.forEach(sec=>{
    const title=sec.querySelector('.manual-section-title');
    const content=sec.querySelector('.manual-section-content');
    const titleText=(title?title.textContent:'').toLowerCase();
    const contentText=(content?content.textContent:'').toLowerCase();
    const found=titleText.includes(term)||contentText.includes(term);

    if(found){
      sec.classList.remove('hidden');
      sec.classList.add('open');
      matchSections++;
      // Highlight in content
      if(content){
        const re=new RegExp('('+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
        // Only highlight text nodes (avoid breaking tags)
        highlightText(content, re);
      }
      // Count occurrences
      const all=(titleText+contentText).split(term).length-1;
      visCount+=all;
    } else {
      sec.classList.add('hidden');
      sec.classList.remove('open');
    }
  });

  if(matchSections===0){
    noRes.style.display='block';
    counter.innerHTML='';
  } else {
    noRes.style.display='none';
    counter.innerHTML='<span>'+visCount+'</span> resultado'+(visCount!==1?'s':'')+' em <span>'+matchSections+'</span> seção'+(matchSections!==1?'ões':'');
  }
}

function highlightText(node, re){
  if(node.nodeType===3){
    const val=node.nodeValue;
    if(re.test(val)){
      const span=document.createElement('span');
      span.innerHTML=val.replace(re,'<mark class="hl">$1</mark>');
      node.parentNode.replaceChild(span, node);
    }
  } else if(node.nodeType===1 && node.nodeName!=='MARK' && node.nodeName!=='SCRIPT'){
    Array.from(node.childNodes).forEach(child=>highlightText(child,re));
  }
}

// ── Formata .item-desc com flavor text: "regra // piada" → regra + <span class="flavor">piada</span>
document.querySelectorAll('.item-desc').forEach(el => {
  const text = el.textContent;
  const idx = text.indexOf(' // ');
  if (idx === -1) return;
  const rule = text.slice(0, idx);
  const flavor = text.slice(idx + 4);
  el.innerHTML = '';
  el.appendChild(document.createTextNode(rule));
  const span = document.createElement('span');
  span.className = 'flavor';
  span.textContent = flavor;
  el.appendChild(span);
});