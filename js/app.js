/* ============================================================
   Prairie Bloom Planner - APP
   Event wiring + init. Loads last; references everything above. Kicks off the first render.
   Load order: credits.js → data.js → core.js → explore.js → plan.js → app.js
   Plain browser globals (no ES modules / no fetch) so this runs
   equally from file:// and from a static web host.
   ============================================================ */

/* ---------------- starter plan ---------------- */
const STARTER={crocus:3,avens:3,blueeyed:3,bedstraw:2,alumroot:2,hedysarum:2,hyssop:3,flax:5,purpleclover:3,whiteclover:3,gaillardia:3,blackeyed:3,meadowblazing:3,smoothaster:3,dottedblazing:3,manyflower:2,stiffgold:3};

/* ---------------- events ---------------- */
function refreshAll(){renderCards();renderCalendar();renderPlan();savePlan();}

document.addEventListener("click",e=>{
  const tab=e.target.closest(".tab");
  if(tab){
    $$(".tab").forEach(t=>t.setAttribute("aria-selected","false"));
    tab.setAttribute("aria-selected","true");
    $$(".panel").forEach(p=>p.classList.remove("active"));
    $("#panel-"+tab.dataset.tab).classList.add("active");
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  const tog=e.target.closest("[data-toggle]");
  if(tog){
    const id=tog.dataset.toggle, s=byId(id);
    if(plan.has(id)){plan.delete(id);toast(`Removed ${s.common}`);}
    else{plan.set(id,1);toast(`Added ${s.common}`);}
    refreshAll();return;
  }
  const rm=e.target.closest("[data-remove]");
  if(rm){const s=byId(rm.dataset.remove);plan.delete(rm.dataset.remove);toast(`Removed ${s.common}`);refreshAll();return;}
  const inc=e.target.closest("[data-inc]");
  if(inc){setQty(inc.dataset.inc,(plan.get(inc.dataset.inc)||1)+1);return;}
  const dec=e.target.closest("[data-dec]");
  if(dec){setQty(dec.dataset.dec,(plan.get(dec.dataset.dec)||1)-1);return;}

  const cc=e.target.closest("[data-color]");
  if(cc){const k=cc.dataset.color;state.colors.has(k)?state.colors.delete(k):state.colors.add(k);cc.setAttribute("aria-pressed",state.colors.has(k));renderCards();return;}
  const ac=e.target.closest("[data-attract]");
  if(ac){const k=ac.dataset.attract;state.attracts.has(k)?state.attracts.delete(k):state.attracts.add(k);ac.setAttribute("aria-pressed",state.attracts.has(k));renderCards();return;}
});

document.addEventListener("change",e=>{const q=e.target.closest(".qty-in"); if(q){ setQty(q.dataset.qty,q.value); }});
$("#search").addEventListener("input",e=>{state.search=e.target.value.trim().toLowerCase();renderCards();});
$("#monthSel").addEventListener("change",e=>{state.month=e.target.value;renderCards();});
$("#edibSel").addEventListener("change",e=>{state.edib=e.target.value;renderCards();});
$("#behavSel").addEventListener("change",e=>{state.behav=e.target.value;renderCards();});
$("#heightSel").addEventListener("change",e=>{state.height=e.target.value;renderCards();});
$("#moistSel").addEventListener("change",e=>{state.moisture=e.target.value;renderCards();});
$("#fertSel").addEventListener("change",e=>{state.fert=e.target.value;renderCards();});
$("#sortSel").addEventListener("change",e=>{state.sort=e.target.value;renderCards();});
$("#clearFilters").addEventListener("click",()=>{
  state.search="";state.colors.clear();state.attracts.clear();state.month="";state.edib="";state.behav="";state.height="";state.moisture="";state.fert="";state.sort="bloom";
  $("#search").value="";$("#monthSel").value="";$("#edibSel").value="";$("#behavSel").value="";$("#heightSel").value="";$("#moistSel").value="";$("#fertSel").value="";$("#sortSel").value="bloom";
  $$("#colorChips .chip,#attractChips .chip").forEach(c=>c.setAttribute("aria-pressed","false"));
  renderCards();
});

$("#calAll").addEventListener("click",()=>{calMode="all";$("#calAll").setAttribute("aria-pressed","true");$("#calPlan").setAttribute("aria-pressed","false");renderCalendar();});
$("#calPlan").addEventListener("click",()=>{calMode="plan";$("#calPlan").setAttribute("aria-pressed","true");$("#calAll").setAttribute("aria-pressed","false");renderCalendar();});

$("#starterBtn").addEventListener("click",()=>{Object.entries(STARTER).forEach(([id,q])=>{if(!plan.has(id))plan.set(id,q);});toast("Loaded a balanced starter plan");refreshAll();});
$("#clearPlan").addEventListener("click",()=>{if(plan.size&&confirm("Remove all species from your plan?")){plan.clear();toast("Plan cleared");refreshAll();}});
$("#exportBtn").addEventListener("click",()=>{
  const data={tool:"Prairie Bloom Planner",name:planName,location:"Saskatoon, SK · Zone 3b",saved:new Date().toISOString(),plants:Object.fromEntries(plan),species:[...plan.keys()]};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="my-prairie-plan.json";a.click();
  URL.revokeObjectURL(a.href);toast("Plan exported");
});
$("#importBtn").addEventListener("click",()=>$("#importFile").click());
$("#importFile").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(r.result);
    let ents = Array.isArray(d) ? d.map(id=>[id,1])
             : (d.plants&&typeof d.plants==="object") ? Object.entries(d.plants)
             : Array.isArray(d.species) ? d.species.map(id=>[id,1]) : [];
    const valid = ents.filter(([id])=>byId(id)).map(([id,q])=>[id,Math.max(1,parseInt(q,10)||1)]);
    if(!valid.length){toast("No matching species in that file");return;}
    plan=new Map(valid);
    if(typeof d.name==="string"){ saveName(d.name); $("#planName").value=d.name; }
    refreshAll();toast(`Imported ${valid.length} species`);
  }catch(err){toast("Couldn't read that file");}};
  r.readAsText(f);e.target.value="";
});

/* ---------------- plan name ---------------- */
$("#planName").addEventListener("input",e=>{ saveName(e.target.value); buildPrintDoc(); });

/* ---------------- export to PDF (browser print) ---------------- */
const ORIG_TITLE=document.title;
function pdfDocTitle(){ return (planName&&planName.trim()? planName.trim()+" - " : "")+"Prairie Bloom Planner"; }
$("#pdfBtn").addEventListener("click",()=>{
  if(!plan.size){toast("Add some species to your plan first");return;}
  buildPrintDoc();
  document.title=pdfDocTitle();   // default filename for "Save as PDF"
  window.print();
});
window.addEventListener("beforeprint",()=>{ buildPrintDoc(); document.title=pdfDocTitle(); });
window.addEventListener("afterprint",()=>{ document.title=ORIG_TITLE; });

/* ---------------- init ---------------- */
$("#planName").value=planName;buildArc();buildFilterChips();refreshAll();
