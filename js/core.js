/* ============================================================
   Prairie Bloom Planner - CORE
   Shared helpers + persisted plan state ($/$$, toast, esc, image + credit helpers, loadPlan/savePlan/setQty).
   Load order: credits.js → data.js → core.js → explore.js → plan.js → app.js
   Plain browser globals (no ES modules / no fetch) so this runs
   equally from file:// and from a static web host.
   ============================================================ */

const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const colHex  = k => cssVar(COLORS[k].v);
const colSoft = k => cssVar(COLORS[k].v + "-soft");

// --- Optional plant icons -------------------------------------------------
// Drop image files into a "photos" folder kept NEXT TO this html file, named by
// the species id (see photos/README.txt), e.g.  photos/crocus.jpg
// If a file is missing the card simply shows the bloom-colour dot instead.
function imgFallback(img){
  var exts=['jpg','jpeg','png','webp'];
  var i=parseInt(img.dataset.i||'0',10)+1;
  if(i<exts.length){ img.dataset.i=i; img.src='photos/'+img.dataset.id+'.'+exts[i]; }
  else if(img.parentNode){ img.parentNode.removeChild(img); }
}
window.imgFallback=imgFallback;

// --- Photo attributions ---------------------------------------------------
// Credits are managed in  photos/credits.js  (loaded just before this script).
// Edit that file to add a line per species id; if it is missing, cards simply
// show no credit. See photos/README.txt for the format.
const PHOTO_CREDITS = (window.PHOTO_CREDITS && typeof window.PHOTO_CREDITS==='object') ? window.PHOTO_CREDITS : {};

function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

function creditHTML(s){
  var c=PHOTO_CREDITS[s.id]; if(!c) return '';
  var by=c.by?esc(c.by):'';
  var lic=c.license?((by?' \u00b7 ':'')+esc(c.license)):'';
  var label=(by+lic)||'Photo credit';
  if(c.url) return '<a class="credit" href="'+esc(c.url)+'" target="_blank" rel="noopener" title="'+label+'">'+label+'</a>';
  return '<span class="credit" title="'+label+'">'+label+'</span>';
}
const firstBloom = s => Math.min(...s.bloom);

/* ---------------- plan state (persisted, gracefully) ---------------- */
const KEY="prairie-plan-v1";
let plan = loadPlan();
function loadPlan(){
  try{
    const r=localStorage.getItem(KEY); if(!r) return new Map();
    const d=JSON.parse(r);
    if(Array.isArray(d)) return new Map(d.map(id=>[id,1]));                                  // legacy: list of ids
    if(d && typeof d==="object") return new Map(Object.entries(d).map(([k,v])=>[k,Math.max(1,parseInt(v,10)||1)]));
    return new Map();
  }catch(e){ return new Map(); }
}
function savePlan(){ try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(plan)));}catch(e){} }
function setQty(id,n){ if(!plan.has(id)) return; n=Math.max(1,Math.min(999,parseInt(n,10)||1)); plan.set(id,n); savePlan(); renderPlan(); }

/* optional, user-given plan name (persisted separately from the plant list) */
const NAME_KEY="prairie-plan-name-v1";
let planName = loadName();
function loadName(){ try{ return localStorage.getItem(NAME_KEY)||""; }catch(e){ return ""; } }
function saveName(n){ planName = n||""; try{ localStorage.setItem(NAME_KEY, planName); }catch(e){} }

/* ---------------- helpers ---------------- */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let toastT;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),1900);}
