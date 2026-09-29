const $=(s,scope=document)=>scope.querySelector(s);
const $$=(s,scope=document)=>Array.from(scope.querySelectorAll(s));
function bindImageFallbacks(scope=document){$$('img[data-fallback]',scope).forEach(img=>{if(img.dataset.bound)return;img.dataset.bound='1';img.addEventListener('error',()=>{if(img.dataset.tried)return;img.dataset.tried='1';const fb=img.dataset.fallback;if(fb){img.src=fb;}});});}

const IMG={
  hero:'assets/hero-satellite.png',
  cta:'assets/cta-river.png',
  impact:'assets/impact-mountains.png',
  cotton:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/151000/151152/texascotton_oli_2022133_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=2955&w=3039',fallback:'assets/workflow/optical-cotton.jpg'},
  porto:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/152000/152795/portoalegre_oli_20240508.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1600&w=2400',fallback:'assets/workflow/flood-porto.jpg'},
  jakarta:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/5000/5693/jakarta_ast_2004_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1640&w=4940',fallback:'assets/urban-card_up.jpg'},
  shasta:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/152000/152819/shasta_oli_20240507_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1400&w=2100',fallback:'assets/workflow/bitemporal-after.jpg'},
  shastaBefore:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/152000/152819/shasta_oli2_20220424_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1400&w=2100',fallback:'assets/workflow/bitemporal-before.jpg'},
  shastaSeries:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/152000/152819/shastazm_oli_20240507_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=714&w=1077',
  selva:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/152000/152940/guatemala_vir_20240211.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1200&w=1800',fallback:'assets/forest-card_up.jpg'},
  tejo:{src:'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2026/02/flooding_around_the_tejo_river_portugal_by_sentinel-1/27102111-1-eng-GB/Flooding_around_the_Tejo_River_Portugal_by_Sentinel-1_pillars.jpg',fallback:'assets/workflow/sar.jpg'},
  multi:{src:'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2015/07/sentinel-2_for_agriculture/15535208-1-eng-GB/Sentinel-2_for_agriculture_pillars.jpg',fallback:'assets/workflow/multispectral.jpg'},
  andes:{src:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/iotd/2026/snow-in-the-shadow-of-the-andes/lagoargentino_oli2_20260403_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1400&w=1800',fallback:'assets/water-card_up.jpg'}
};
function imgSrc(x){return typeof x==='string'?x:x?.src}
function imgFallback(x){return typeof x==='string'?null:x?.fallback}
function makeImg(srcLike,alt='',eager=false){const el=document.createElement('img');const primary=imgSrc(srcLike);const fallback=imgFallback(srcLike);el.src=primary;el.alt=alt;el.loading=eager?'eager':'lazy';el.referrerPolicy='no-referrer';el.decoding='async';if(fallback){el.dataset.fallback=fallback;el.addEventListener('error',()=>{if(el.dataset.fallback && el.src!==el.dataset.fallback){el.src=el.dataset.fallback;el.dataset.fallback='';}})}else{el.addEventListener('error',()=>el.classList.add('img-failed'),{once:true})}return el}

const CARD_DATA=[
 {cat:'Disaster response',place:'Porto Alegre, Brazil · 8 May 2024',q:'“What areas are flooded?”',answer:'Landsat 8 shows widespread flooding across low-lying parts of Porto Alegre.',img:IMG.porto},
 {cat:'Agriculture',place:'Rio Grande Valley, Texas · 13 May 2022',q:'“Which fields show different crop conditions?”',answer:'Lighter green fields are cotton; darker green fields are mostly sorghum or corn.',img:IMG.cotton},
 {cat:'Urban planning',place:'Jakarta, Indonesia · 1976–2004',q:'“How did the city expand?”',answer:'A long satellite record shows the built-up footprint spreading through surrounding landscape.',img:IMG.jakarta},
 {cat:'Water resources',place:'Shasta Lake, California · 2022–2024',q:'“Did the reservoir recover?”',answer:'NASA reports Shasta Lake rising from 39% full in April 2022 to 96% in May 2024.',img:IMG.shasta},
 {cat:'Forestry',place:'Selva Maya · Landsat / vegetation',q:'“Where is forest cover changing?”',answer:'Cleared areas contrast with remaining forest across the Maya Forest region.',img:IMG.selva},
 {cat:'Flood change',place:'Tejo River, Portugal · 2025–2026',q:'“Where did flood water rise?”',answer:'Sentinel-1 change detection highlights where water levels rose across the floodplain.',img:IMG.tejo},
 {cat:'Multispectral',place:'Toulouse, France · Sentinel-2',q:'“What can spectral imagery separate?”',answer:'Sentinel-2 can discriminate crop patterns such as sunflower and maize.',img:IMG.multi},
 {cat:'Earth systems',place:'Southern Andes · Landsat 9',q:'“What does snow and water reveal?”',answer:'Optical observations make snowfields, lakes and river channels easier to inspect together.',img:IMG.andes},
 {cat:'Coastal change',place:'Coastal delta · optical observation',q:'“Where is the shoreline changing?”',answer:'Water, sandbars and vegetation boundaries can be compared across observations.',img:IMG.hero}
];

const VOICES=[
 {k:'DISASTER RESPONSE',q:'“I need the flood extent and the evidence that supports it in one view.”',role:'Emergency mapping workflow',initials:'ER',img:IMG.porto},
 {k:'AGRICULTURE',q:'“The useful part is asking in normal language instead of translating the task first.”',role:'Agricultural monitoring workflow',initials:'AM',img:IMG.cotton},
 {k:'URBAN PLANNING',q:'“Seeing the question, imagery and interpretation together would make review much faster.”',role:'Urban planning workflow',initials:'UP',img:IMG.jakarta},
 {k:'ENVIRONMENT',q:'“For vegetation and water, the value is having more than one evidence layer available.”',role:'Environmental monitoring workflow',initials:'EM',img:IMG.selva},
 {k:'GEOINT',q:'“I want the system to show why an answer was reached, not just state it.”',role:'Geospatial analysis workflow',initials:'GA',img:IMG.tejo}
];

/* Hero query */
$$('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>{
  setText('#hero-prompt',btn.dataset.prompt);
  $('#hero-result').innerHTML='<span class="live-dot"></span><div><b>Question selected.</b> Run it to see the grounded answer state.</div>';
}));
$('#hero-run')?.addEventListener('click',()=>{
 const q=($('#hero-prompt')?.textContent||'').toLowerCase();
 let answer='The current question is ready to be routed across the available observation layers.';
 if(q.includes('water'))answer='Water bodies can be outlined from visible channels and their surrounding boundaries.';
 else if(q.includes('built'))answer='Built-up patterns can be traced and compared across observations.';
 else if(q.includes('flood'))answer='A flood-extent route can inspect the visible water boundary around the urban edge.';
 else if(q.includes('land-use'))answer='A time-aware route can compare observations rather than relying on one image.';
 $('#hero-result').innerHTML=`<span class="live-dot"></span><div><b>Analysis ready.</b> ${answer}</div>`;
 $('#hero-run').animate([{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:240,easing:'ease-out'});
});
$('[data-scroll="perspectives"]')?.addEventListener('click',()=>$('#perspectives')?.scrollIntoView({behavior:'smooth'}));

/* Infinite carousel */
function setupLoop({track,viewport,items,buildCard,prev,next,interval=4800}){
 if(!track||!viewport)return;
 const n=items.length;[...items,...items,...items].forEach(d=>track.appendChild(buildCard(d)));
 let index=n,timer=null,dragging=false,downX=0,startX=0;
 const gap=()=>parseFloat(getComputedStyle(track).gap)||0;
 const stride=()=>{const c=track.querySelector(':scope > *');return c?c.getBoundingClientRect().width+gap():280};
 const set=(animate=true)=>{track.style.transition=animate?'transform .52s cubic-bezier(.2,.8,.2,1)':'none';track.style.transform=`translate3d(${-index*stride()}px,0,0)`};
 const normalize=()=>{if(index>=2*n){index-=n;set(false)}else if(index<n){index+=n;set(false)}};
 const move=dir=>{index+=dir;set(true);window.clearTimeout(track.__normalize);track.__normalize=window.setTimeout(normalize,560)};
 const pause=ms=>{window.clearTimeout(track.__resume);window.clearInterval(timer);if(ms)track.__resume=window.setTimeout(start,ms)};
 const start=()=>{window.clearInterval(timer);timer=window.setInterval(()=>move(1),interval)};
 prev?.addEventListener('click',()=>{pause(2200);move(-1)});next?.addEventListener('click',()=>{pause(2200);move(1)});
 viewport.addEventListener('pointerdown',e=>{dragging=true;pause();downX=e.clientX;startX=index*stride();track.style.transition='none';viewport.setPointerCapture?.(e.pointerId)},{passive:true});
 viewport.addEventListener('pointermove',e=>{if(!dragging)return;const d=e.clientX-downX;track.style.transform=`translate3d(${-startX-d}px,0,0)`});
 viewport.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;const d=e.clientX-downX;index+=d<-45?1:d>45?-1:0;set(true);window.setTimeout(normalize,560);window.setTimeout(start,1200)});
 viewport.addEventListener('pointercancel',()=>{if(!dragging)return;dragging=false;set(true);window.setTimeout(start,1200)});
 viewport.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){pause(2000);move(1)}if(e.key==='ArrowLeft'){pause(2000);move(-1)}});
 window.addEventListener('resize',()=>set(false));requestAnimationFrame(()=>set(false));start();
 const obs=new IntersectionObserver(es=>es[0]?.isIntersecting?start():pause());obs.observe(viewport);
}
function cardMarkup(d){
 const a=document.createElement('article');a.className='p-card';
 const pic=document.createElement('div');pic.className='p-card-image';pic.appendChild(makeImg(d.img,`${d.cat} satellite observation`));
 const tag=document.createElement('span');tag.className='p-tag';tag.textContent=d.cat;pic.appendChild(tag);a.appendChild(pic);
 const body=document.createElement('div');body.className='p-card-body';body.innerHTML=`<div class="p-place">${d.place}</div><p class="p-question">${d.q}</p><div class="p-divider"></div><div class="p-answer-label">Answer</div><p class="p-answer">${d.answer}</p><div class="p-card-meta"><span>Grounded observation</span><span>Explore</span></div>`;a.appendChild(body);return a;
}
setupLoop({track:$('#carousel-track'),viewport:$('#carousel-viewport'),items:CARD_DATA,buildCard:cardMarkup,prev:$('#prev-card'),next:$('#next-card'),interval:4300});

/* How it works */
const WORKFLOW=[
 {key:'input',visual:'single',kicker:'OPTICAL · INPUT SCENE',badges:['LANDSAT','OPTICAL'],caption:'Rio Grande Valley · Texas · 13 May 2022',overline:'01 · INPUT',state:'READY',title:'Start with the imagery.',copy:'A real observation enters first. SatQuery keeps the scene and its observation context together from the start.',question:'“Which fields show different crop conditions?”',routes:['Optical scene','Surface context','Agriculture'],answerLabel:'SATQUERY READOUT',answerStatus:'READY',answer:'Lighter green fields are cotton, while darker green fields are mostly sorghum or corn.',visualLabel:'Optical observation',visualSub:'Agricultural surface context',image:IMG.cotton},
 {key:'ask',visual:'single',kicker:'OPTICAL · FLOOD EXTENT',badges:['LANDSAT 8','FLOOD EXTENT'],caption:'Porto Alegre · Brazil · 8 May 2024',overline:'02 · QUESTION',state:'GROUNDED',title:'Turn the question into an analysis plan.',copy:'The question stays visible while SatQuery maps intent to the observation task that can support the answer.',question:'“Where did the floodwater reach the city edge?”',routes:['Flood extent','Urban edge','Optical evidence'],answerLabel:'SATQUERY READOUT',answerStatus:'GROUNDED',answer:'The observed floodwater extends across low-lying parts of Porto Alegre beside the urban edge.',visualLabel:'Flood extent',visualSub:'Low-lying urban edge',image:IMG.porto},
 {key:'analyse',visual:'grid',kicker:'EVIDENCE · COMPLEMENTARY OBSERVATIONS',badges:['OPTICAL','MULTISPECTRAL','SAR'],caption:'Four evidence views · selected for the question',overline:'03 · ANALYSIS',state:'COMBINING',title:'Bring the right evidence together.',copy:'The agent selects complementary observations for the question. The tiles represent different evidence types; they are not presented as a falsely co-registered stack.',question:'“Which evidence helps separate surface change from flood extent?”',routes:['Optical · surface context','Sentinel-2 · spectral signal','Sentinel-1 · radar change'],answerLabel:'SATQUERY SYNTHESIS',answerStatus:'MULTI-MODAL',answer:'Optical shows surface context, multispectral adds spectral cues, a time pair reveals change, and SAR adds a radar view of water and structure.',images:[{src:IMG.jakarta,label:'Temporal optical'},{src:IMG.multi,label:'Multispectral'},{kind:'bitemporal',before:IMG.shastaBefore,after:IMG.shasta,label:'Bi-temporal'},{src:IMG.tejo,label:'Sentinel-1 SAR'}]},
 {key:'answer',visual:'compare',kicker:'BI-TEMPORAL · SAME SCENE',badges:['EARLIER','LATER'],caption:'Same area · two optical observations · direct comparison',overline:'04 · ANSWER',state:'EVIDENCE LINKED',title:'Return the answer with the evidence attached.',copy:'A same-location comparison keeps the earlier and later observations visible while the interpretation stays beside them.',question:'“What changed across these two observations?”',routes:['Same scene','Two dates','Optical comparison'],answerLabel:'SATQUERY INTERPRETATION',answerStatus:'EVIDENCE ATTACHED',answer:'The later observation shows a broader developed footprint in the same area, making the change visible without leaving the evidence view.',compare:{before:IMG.shastaBefore,after:IMG.shasta,leftLabel:'EARLIER · 24 APR 2022',rightLabel:'LATER · 07 MAY 2024'}}
];
let workflowIndex=0,workflowTimer=null,compareRAF=null;
function setText(sel,text){const el=$(sel);if(el)el.textContent=text}
function stopCompare(){if(compareRAF){cancelAnimationFrame(compareRAF);compareRAF=null}}
function renderSingle(d){const c=$('#visual-canvas');c.innerHTML='';const wrap=document.createElement('div');wrap.className='media-image';wrap.appendChild(makeImg(d.image,d.visualLabel,true));const lab=document.createElement('div');lab.className='scene-label';lab.innerHTML=`<b>${d.visualLabel}</b><small>${d.visualSub}</small>`;wrap.appendChild(lab);c.appendChild(wrap)}
function renderGrid(d){const c=$('#visual-canvas');c.innerHTML='';const grid=document.createElement('div');grid.className='analysis-grid';d.images.forEach((item,idx)=>{const tile=document.createElement('div');tile.className='analysis-tile';tile.style.setProperty('--tile-delay',`${idx*70}ms`);if(item.kind==='bitemporal'){tile.classList.add('analysis-bitemporal');const a=makeImg(item.before,'Earlier observation',true);const b=makeImg(item.after,'Later observation',true);a.className='tile-half tile-earlier';b.className='tile-half tile-later';tile.append(a,b);const divider=document.createElement('i');divider.className='tile-divider';tile.appendChild(divider)}else{const src=Array.isArray(item)?item[0]:item.src;const label=Array.isArray(item)?item[1]:item.label;tile.appendChild(makeImg(src,`${label} Earth observation`,true))}const cap=document.createElement('span');cap.textContent=Array.isArray(item)?item[1]:item.label;tile.appendChild(cap);grid.appendChild(tile)});c.appendChild(grid)}
function renderCompare(d){const c=$('#visual-canvas');c.innerHTML='';const comp=document.createElement('div');comp.className='comparison';const before=makeImg(d.compare.before,'Earlier optical observation',true);before.className='compare-base';const after=makeImg(d.compare.after,'Later optical observation',true);after.className='compare-top';comp.append(before,after);const divider=document.createElement('div');divider.className='compare-divider';const knob=document.createElement('div');knob.className='compare-knob';knob.textContent='↔';divider.appendChild(knob);comp.appendChild(divider);const left=document.createElement('span');left.className='compare-chip left';left.textContent=d.compare.leftLabel||'EARLIER OBSERVATION';const right=document.createElement('span');right.className='compare-chip right';right.textContent=d.compare.rightLabel||'LATER OBSERVATION';comp.append(left,right);c.appendChild(comp);
 const setX=x=>{divider.style.left=`${x}%`;after.style.clipPath=`inset(0 ${100-x}% 0 0)`};
 let drag=false;const update=e=>{const r=comp.getBoundingClientRect();setX(Math.max(8,Math.min(92,((e.clientX-r.left)/r.width)*100)))};
 knob.addEventListener('pointerdown',e=>{drag=true;knob.setPointerCapture(e.pointerId);update(e)});knob.addEventListener('pointermove',e=>{if(drag)update(e)});knob.addEventListener('pointerup',()=>drag=false);knob.addEventListener('pointercancel',()=>drag=false);
 const start=performance.now();const tick=ts=>{if(!drag){const x=50+Math.sin((ts-start)/4200)*3;setX(x)}compareRAF=requestAnimationFrame(tick)};compareRAF=requestAnimationFrame(tick);
}
function renderWorkflow(i,animate=true){
 stopCompare();workflowIndex=(i+WORKFLOW.length)%WORKFLOW.length;const d=WORKFLOW[workflowIndex];
 $$('.workflow-tab').forEach((b,n)=>{b.classList.toggle('is-active',n===workflowIndex);b.setAttribute('aria-selected',n===workflowIndex?'true':'false')});
 $$('.step-line').forEach((line,n)=>line.classList.toggle('is-filled',n<workflowIndex));
 setText('#visual-kicker',d.kicker);setText('#visual-caption',d.caption);setText('#visual-index',`0${workflowIndex+1} / 04`);setText('#detail-overline',d.overline);setText('#detail-state',d.state);setText('#detail-title',d.title);setText('#detail-copy',d.copy);setText('#detail-question',d.question);setText('#answer-label',d.answerLabel);setText('#answer-status',d.answerStatus);setText('#detail-answer',d.answer);
 $('#visual-badges').innerHTML=d.badges.map(x=>`<span>${x}</span>`).join('');$('#route-chips').innerHTML=d.routes.map(x=>`<span>${x}</span>`).join('');
 const detail=$('.workflow-detail');if(animate){[detail.querySelector('h3'),detail.querySelector('.detail-copy'),detail.querySelector('.detail-question'),detail.querySelector('.analysis-route'),detail.querySelector('.detail-answer')].forEach(el=>el?.animate([{opacity:.05,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'}))}
 if(d.visual==='single')renderSingle(d);else if(d.visual==='grid')renderGrid(d);else renderCompare(d);
}
$$('.workflow-tab').forEach((b,i)=>b.addEventListener('click',()=>{clearInterval(workflowTimer);renderWorkflow(i);restartWorkflow()}));
function restartWorkflow(){clearInterval(workflowTimer);workflowTimer=setInterval(()=>renderWorkflow(workflowIndex+1),7600)}
const how=$('#how-it-works');if(how){const obs=new IntersectionObserver(es=>es[0]?.isIntersecting?restartWorkflow():clearInterval(workflowTimer),{threshold:.22});obs.observe(how)}renderWorkflow(0,false);

/* Voices */
function voiceMarkup(d){const a=document.createElement('article');a.className='voice-card';a.innerHTML=`<div class="voice-media"><img src="${imgSrc(d.img)}" alt="" loading="lazy"><span class="voice-media-label">${d.k}</span></div><div class="voice-content"><p class="voice-quote">${d.q}</p><div class="voice-bottom"><span class="voice-avatar">${d.initials}</span><span class="voice-role"><b>${d.role}</b><span class="voices-note">Representative feedback used for this prototype.</span></span></div></div>`;const image=a.querySelector('img');const fallback=imgFallback(d.img);if(fallback)image.addEventListener('error',()=>{if(image.dataset.tried)return;image.dataset.tried='1';image.src=fallback});return a}
setupLoop({track:$('#voice-track'),viewport:$('#voice-viewport'),items:VOICES,buildCard:voiceMarkup,prev:$('#prev-voice'),next:$('#next-voice'),interval:5000});

/* Login route */
function openModal(id){const m=$(id);if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}
function closeModals(){const wasLogin=$('#login-modal')?.classList.contains('open');$$('.modal-backdrop').forEach(m=>{m.classList.remove('open');m.setAttribute('aria-hidden','true')});document.body.classList.remove('modal-open');clearInterval(window.__demoTimer);if(wasLogin&&location.hash==='#login')history.pushState('',document.title,location.pathname+location.search)}
function openLoginRoute(){if(location.hash!=='#login')history.pushState({login:true},'',location.pathname+location.search+'#login');openModal('#login-modal')}
$$('[data-open-login]').forEach(b=>b.addEventListener('click',openLoginRoute));
$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModals));
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModals()}));
window.addEventListener('popstate',()=>location.hash==='#login'?openModal('#login-modal'):closeModals());
window.addEventListener('hashchange',()=>location.hash==='#login'?openModal('#login-modal'):closeModals());
if(location.hash==='#login')openModal('#login-modal');
$('#google-login')?.addEventListener('click',()=>{localStorage.setItem('satquery_session',JSON.stringify({name:'Ayesha',provider:'Google',signedInAt:Date.now()}));window.location.href='analyze.html'});
$('#login-submit')?.addEventListener('click',()=>{const email=($('#login-email')?.value||'').trim(),pw=($('#login-password')?.value||'').trim();if(!email||!pw){setText('#login-status','Enter your email and password to continue.');return}localStorage.setItem('satquery_session',JSON.stringify({name:'Ayesha',email,provider:'Email',signedInAt:Date.now()}));window.location.href='analyze.html'});
$('#create-account')?.addEventListener('click',()=>{localStorage.setItem('satquery_session',JSON.stringify({name:'Ayesha',provider:'Demo account',signedInAt:Date.now()}));window.location.href='analyze.html'});

/* Watch demo */
$('#watch-demo')?.addEventListener('click',()=>{openModal('#demo-modal');const labels=['Upload imagery','Ask your question','AI analyses the evidence','Get an answer'];let i=0;setText('#demo-copy',labels[0]);window.__demoTimer=setInterval(()=>{i=(i+1)%labels.length;const e=$('#demo-copy');e.animate([{opacity:.15,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,easing:'ease-out'});e.textContent=labels[i];$$('.demo-sequence span').forEach((s,n)=>s.classList.toggle('active',n===i))},1000)});

/* Search */
$('#open-search')?.addEventListener('click',()=>{openModal('#search-modal');$('#search-input')?.focus()});
function renderSearch(){const q=($('#search-input')?.value||'').trim().toLowerCase();const data=CARD_DATA.filter(d=>!q||(d.cat+' '+d.place+' '+d.q+' '+d.answer).toLowerCase().includes(q));$('#search-results').innerHTML=data.slice(0,9).map(d=>`<div class="search-item"><b>${d.q.replace(/[“”]/g,'')}</b><small>${d.cat} · ${d.place}</small></div>`).join('')||'<div class="search-item"><b>No matching use case.</b><small>Try flood, agriculture, water, forest or SAR.</small></div>'}
$('#search-input')?.addEventListener('input',renderSearch);renderSearch();bindImageFallbacks();

/* Mobile nav */
const mobileNav=$('#mobile-nav');$('#menu-toggle')?.addEventListener('click',()=>{mobileNav.classList.add('open');mobileNav.setAttribute('aria-hidden','false');$('#menu-toggle').setAttribute('aria-expanded','true')});$('#mobile-close')?.addEventListener('click',closeMenu);$$('a',mobileNav).forEach(a=>a.addEventListener('click',closeMenu));function closeMenu(){mobileNav.classList.remove('open');mobileNav.setAttribute('aria-hidden','true');$('#menu-toggle').setAttribute('aria-expanded','false')}
window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModals();closeMenu()}});

/* Newsletter */
$('#subscribe-form')?.addEventListener('submit',e=>{e.preventDefault();const email=$('#subscribe-email').value.trim();if(!email)return;setText('#subscribe-status','Thanks — you are on the list.');$('#subscribe-email').value=''});

/* restrained scroll motion */
let raf=false;window.addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{const y=window.scrollY;const explore=$('.explore-bg');const impact=$('.impact-media img');if(explore)explore.style.transform=`scale(1.035) translate3d(0,${Math.min(12,y*.006)}px,0)`;if(impact)impact.style.transform=`translate3d(0,${Math.min(12,Math.max(-4,(y-1300)*.01))}px,0)`;raf=false})},{passive:true});
