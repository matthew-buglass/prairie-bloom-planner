/* ============================================================
   Prairie Bloom Planner - EXPLORE
   Explore tab: filters, trait tags, header arc, species cards and the bloom calendar.
   Load order: credits.js → data.js → core.js → explore.js → plan.js → app.js
   Plain browser globals (no ES modules / no fetch) so this runs
   equally from file:// and from a static web host.
   ============================================================ */

function pollChips(attr){
  if(!attr.length) return `<span class="poll" style="color:var(--ink-soft)">Structural / wind-pollinated</span>`;
  return attr.map(a=>`<span class="poll" title="${POLL_LABEL[a]}">${ICON[a]}${POLL_LABEL[a]}</span>`).join("");
}
function traitTagList(s){
  const o=[];
  if(typeof EDTOX!=="undefined" && EDTOX[s.id]){const x=EDTOX[s.id];o.push({label:x.t==="toxic"?"Toxic":"Edible",cls:x.t==="toxic"?"tox":"edib"});}
  if(s.nfix) o.push({label:"N-fixer",cls:"nfix"});
  if(s.colonizer==="aggressive") o.push({label:"Aggressive",cls:"aggr"});
  if(s.colonizer==="spreading") o.push({label:"Spreads",cls:"spread"});
  if(s.zone==="climax") o.push({label:"Slow climax",cls:"climax"});
  if(s.hMax>60) o.push({label:"Tall >60cm",cls:"tall"});
  if(s.feed==="lean") o.push({label:"Lean soil",cls:"lean"});
  else if(s.feed==="humus") o.push({label:"Humus-rich",cls:"humus"});
  else if(s.feed==="adaptable") o.push({label:"Rich Soil Tolerant",cls:"adapt"});
  if(s.moist==="dry") o.push({label:"Dry / xeric",cls:"dry"});
  else if(s.moist==="mesic") o.push({label:"Mesic",cls:"mesic"});
  else if(s.moist==="moist") o.push({label:"Moist",cls:"moist"});
  return o;
}
function traitTags(s){
  return traitTagList(s).map(t=>`<span class="tag ${t.cls}">${t.label.replace(/>/g,"&gt;")}</span>`).join("");
}

/* ---------------- season arc (header) ---------------- */
function buildArc(){
  const counts = MONTHS.map(m=>SPECIES.filter(s=>s.bloom.includes(m.n)).length);
  const max=Math.max(...counts);
  $("#seasonArc").innerHTML = MONTHS.map((m,i)=>{
    const h = 6 + (counts[i]/max)*48;
    const gap = counts[i]<=1;
    return `<div class="arc-col"><span class="arc-n">${counts[i]}</span>
      <div class="arc-bar" style="height:${h}px;${gap?'background:var(--warn);opacity:.8':''}"></div>
      <span class="arc-m">${m.l}</span></div>`;
  }).join("");
}

/* ---------------- filters ---------------- */
const state={search:"",colors:new Set(),attracts:new Set(),month:"",edib:"",behav:"",height:"",moisture:"",fert:"",sort:"bloom"};

function buildFilterChips(){
  $("#colorChips").innerHTML = Object.keys(COLORS).map(k=>
    `<button class="chip" data-color="${k}" aria-pressed="false"><span class="dot" style="background:${colHex(k)};${k==='white'?'border-color:var(--c-white-line)':''}"></span>${COLORS[k].label}</button>`).join("");
  $("#attractChips").innerHTML = Object.keys(POLL_LABEL).map(k=>
    `<button class="chip" data-attract="${k}" aria-pressed="false">${POLL_LABEL[k]}</button>`).join("");
  $("#monthSel").innerHTML = `<option value="">Any month</option>`+MONTHS.map(m=>`<option value="${m.n}">${m.l}</option>`).join("");
}

function matches(s){
  if(state.search && !(s.common.toLowerCase().includes(state.search)||s.sci.toLowerCase().includes(state.search))) return false;
  if(state.colors.size && !state.colors.has(s.color)) return false;
  if(state.attracts.size && ![...state.attracts].every(a=>s.attr.includes(a))) return false;
  if(state.month && !s.bloom.includes(+state.month)) return false;
  if(state.edib){ const ed=(typeof EDTOX!=="undefined")?EDTOX[s.id]:null; if(!ed || ed.t!==state.edib) return false; }
  switch(state.behav){
    case"nfix": if(!s.nfix) return false; break;
    case"aggressive": if(s.colonizer!=="aggressive") return false; break;
    case"spreading": if(s.colonizer!=="spreading") return false; break;
    case"climax": if(s.zone!=="climax") return false; break;
    case"fast": if(s.ttf>1) return false; break;
  }
  if(state.height==="low" && s.hMax>60) return false;
  if(state.height==="tall" && s.hMax<=60) return false;
  if(state.moisture && s.moist!==state.moisture) return false;
  if(state.fert && s.feed!==state.fert) return false;
  return true;
}
function sortList(list){
  const c={
    bloom:(a,b)=>firstBloom(a)-firstBloom(b)||a.common.localeCompare(b.common),
    name:(a,b)=>a.common.localeCompare(b.common),
    ttf:(a,b)=>a.ttf-b.ttf||a.common.localeCompare(b.common),
    height:(a,b)=>a.hMax-b.hMax,
    duration:(a,b)=>b.dur-a.dur
  };
  return list.sort(c[state.sort]);
}

function srcHTML(id){
  const s=SRC[id]; if(!s||!s.length) return "";
  const links=s.map(x=>`<a href="${x[1]}" target="_blank" rel="noopener">${x[0]} ↗</a>`).join(" · ");
  return `<div class="card-src"><b>Sources</b> ${links}</div>`;
}
function edtoxHTML(id){
  const e = (typeof EDTOX!=="undefined") ? EDTOX[id] : null; if(!e) return "";
  const label = e.t==="toxic" ? "Toxic" : "Edible";
  return `<div class="card-edtox ${e.t}"><b>${label}</b> ${e.note} <a href="${e.src[1]}" target="_blank" rel="noopener">${e.src[0]} \u2197</a></div>`;
}
function moistPhrase(m){return m==="dry"?"dry, well-drained sites":m==="mesic"?"average moisture":"reliably moist sites";}
function soilPhrase(fd){return fd==="lean"?"lean, low-fertility":fd==="humus"?"humus-rich, organic":"average to fairly rich";}
function pollPhrase(a){
  const N={bee:"bees",butterfly:"butterflies",hummingbird:"hummingbirds",moth:"moths"};
  const l=a.map(x=>N[x]||x);
  if(!l.length) return "";
  if(l.length===1) return l[0];
  if(l.length===2) return l[0]+" and "+l[1];
  return l.slice(0,-1).join(", ")+" and "+l[l.length-1];
}
function describe(s){
  let t=`Bears ${COLORS[s.color]?COLORS[s.color].label.toLowerCase():s.color} blooms ${s.peakText}, lasting about ${s.dur} weeks. Grows ${s.hMin}\u2013${s.hMax} cm tall and ${s.wMin}\u2013${s.wMax} cm wide, and does best in ${moistPhrase(s.moist)} with ${soilPhrase(s.feed)} soil.`;
  const p=pollPhrase(s.attr);
  t += p ? ` The flowers draw ${p}.` : ` It is wind-pollinated and grown mainly for structure.`;
  const beh=[];
  if(s.nfix) beh.push("It fixes its own nitrogen, gradually enriching the soil around it");
  if(s.colonizer==="aggressive") beh.push("It spreads aggressively, so give it room or a contained spot");
  else if(s.colonizer==="spreading") beh.push("It spreads steadily once established");
  if(s.zone==="climax") beh.push(`It is slow to settle in, often taking ${s.ttfText} to flower from seed`);
  if(beh.length) t+=" "+beh.join(". ")+".";
  return t;
}
function renderCards(){
  const list = sortList(SPECIES.filter(matches));
  $("#countLine").textContent = `${list.length} of ${SPECIES.length} species shown`;
  if(!list.length){ $("#cardGrid").innerHTML=`<div class="empty" style="grid-column:1/-1"><h3>No matches</h3><p>Try removing a filter.</p></div>`; return; }
  $("#cardGrid").innerHTML = list.map(s=>{
    const inPlan = plan.has(s.id);
    const mini = MONTHS.map(m=>{
      const on=s.bloom.includes(m.n), pk=s.peak.includes(m.n);
      return `<span class="mini-cell" style="${on?`background:${pk?colHex(s.color):colSoft(s.color)};${s.color==='white'?'border:1px solid var(--c-white-line)':''}`:''}"></span>`;
    }).join("");
    return `<article class="card">
      <div class="card-banner" style="background:${colHex(s.color)}"><img alt="" loading="lazy" data-id="${s.id}" data-i="0" src="photos/${s.id}.jpg" onload="this.parentNode.classList.add('has-img')" onerror="imgFallback(this)"><i class="banner-edge" style="background:${colHex(s.color)};${s.color==='white'?'box-shadow:inset 0 1px 0 var(--c-white-line)':''}"></i>${creditHTML(s)}</div>
      <div class="card-body">
        <div class="card-name">
          <span class="swatch" style="background:${colHex(s.color)};${s.color==='white'?'border-color:var(--c-white-line)':''}"></span>
          <div><h3>${s.common}</h3><div class="sci">${s.sci}</div></div>
        </div>
        <div class="meta">${traitTags(s)}</div>
        <div class="mini-cal" title="${s.peakText}">${mini}</div>
        <div class="pollin">${pollChips(s.attr)}</div>
        <div class="specs">
          <div class="spec"><b>Bloom</b>${s.peakText}</div>
          <div class="spec"><b>Lasts</b>${s.dur} weeks</div>
          <div class="spec"><b>To flower</b>${s.ttfText}</div>
          <div class="spec"><b>Height</b>${s.hMin}–${s.hMax} cm</div>
          <div class="spec"><b>Spread</b>${s.wMin}–${s.wMax} cm${s.colonizer?' ↗':''}</div>
          <div class="spec"><b>Moisture</b>${s.moist[0].toUpperCase()+s.moist.slice(1)}</div>
          <div class="spec"><b>Role</b>${roleLabel(s)}</div>
        </div>
        <div class="benefit">${s.benefit}</div>
        <details class="card-desc"><summary>About this plant</summary><p>${ABOUT[s.id]||""}</p>${edtoxHTML(s.id)}${srcHTML(s.id)}</details>
        <div class="reflinks">
          <a href="https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=${encodeURIComponent(s.sci)}" target="_blank" rel="noopener">Photos ↗</a>
          <a href="https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(s.sci)}" target="_blank" rel="noopener">ID guide ↗</a>
          ${BUY[s.id]?`<a class="buy" href="${BUY[s.id]}" target="_blank" rel="noopener">Buy seeds ↗</a>`:""}
        </div>
      </div>
      <div class="card-foot">
        <button class="add-btn ${inPlan?'in':''}" data-toggle="${s.id}">
          ${inPlan?'✓ In your plan - remove':'+ Add to plan'}
        </button>
      </div>
    </article>`;
  }).join("");
}
function roleLabel(s){
  if(s.zone==="climax") return "Climax";
  if(s.zone==="buffer") return "Buffer";
  if(s.zone==="colonizer") return "Colonizer";
  if(s.nfix) return "N-fixer";
  if(s.ttf<=1) return "Pioneer";
  return "General";
}

/* ---------------- bloom calendar ---------------- */
let calMode="all";
function renderCalendar(){
  $("#calHead").innerHTML = `<th class="cal-species-h">Species - ${calMode==='all'?'all 31':'my plan'}</th>`+MONTHS.map(m=>`<th class="cal-month">${m.l}</th>`).join("");
  let list = calMode==="all" ? [...SPECIES] : SPECIES.filter(s=>plan.has(s.id));
  list.sort((a,b)=>firstBloom(a)-firstBloom(b)||a.common.localeCompare(b.common));
  if(!list.length){
    $("#calBody").innerHTML=`<tr><td class="cal-name" colspan="8" style="padding:26px 14px;color:var(--ink-soft)">Your plan is empty - add species in Explore, or switch to “All 31 species”.</td></tr>`;
    $("#calFoot").innerHTML=""; return;
  }
  $("#calBody").innerHTML = list.map(s=>{
    const cells = MONTHS.map(m=>{
      const on=s.bloom.includes(m.n), pk=s.peak.includes(m.n);
      if(!on) return `<td class="cal-cell"></td>`;
      const bg = pk?colHex(s.color):colSoft(s.color);
      const bd = s.color==='white'?'border:1px solid var(--c-white-line);':'';
      return `<td class="cal-cell"><div class="bar ${pk?'peak':''}" style="background:${bg};${bd}"></div></td>`;
    }).join("");
    return `<tr class="cal-row"><td class="cal-name"><span class="sw" style="background:${colHex(s.color)};${s.color==='white'?'border-color:var(--c-white-line)':''}"></span>${s.common} <em>· ${s.sci}</em></td>${cells}</tr>`;
  }).join("");
  const counts = MONTHS.map(m=>list.filter(s=>s.bloom.includes(m.n)).length);
  $("#calFoot").innerHTML = `<tr class="cal-foot-row"><td class="cal-name">Species in bloom</td>`+
    counts.map(c=>`<td class="cal-cell" style="text-align:center;padding:9px 0"><span class="totcount ${c===0?'gap':''}">${c}</span></td>`).join("")+`</tr>`;
}
