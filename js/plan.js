/* ============================================================
   Prairie Bloom Planner - PLAN
   My Plan tab: the plant list and the live garden analysis (bloom coverage, pollinators, footprint, etc.).
   Load order: credits.js → data.js → core.js → explore.js → plan.js → app.js
   Plain browser globals (no ES modules / no fetch) so this runs
   equally from file:// and from a static web host.
   ============================================================ */

/* ---------------- my plan + analysis ---------------- */
function renderPlan(){
  $("#planBadge").textContent = plan.size;
  const list = SPECIES.filter(s=>plan.has(s.id)).sort((a,b)=>firstBloom(a)-firstBloom(b));
  if(!list.length){
    $("#planListWrap").innerHTML = `<div class="empty"><h3>No species yet</h3><p>Add wildflowers from <strong>Explore</strong>, or load a balanced starter plan above to see it analysed.</p></div>`;
    $("#analysis").innerHTML = `<div class="acard"><p>Your live garden checks - bloom coverage, pollinators, nitrogen, colonizers, establishment time and sightlines - appear here once you add species.</p></div>`;
    buildPrintDoc();
    return;
  }
  $("#planListWrap").innerHTML = `<div class="plan-list">`+list.map(s=>`
    <div class="plan-item">
      <span class="sw" style="background:${colHex(s.color)};${s.color==='white'?'border-color:var(--c-white-line)':''}"></span>
      <div class="pi-main">
        <div class="pi-name"><b>${s.common}</b><span>${s.sci}</span></div>
        <div class="pi-tags">${traitTags(s)}</div>
      </div>
      <div class="qty">
        <button data-dec="${s.id}" aria-label="One fewer">−</button>
        <input type="number" min="1" inputmode="numeric" class="qty-in" data-qty="${s.id}" value="${plan.get(s.id)||1}" aria-label="${s.common} quantity">
        <button data-inc="${s.id}" aria-label="One more">+</button>
      </div>
      <button class="rm" data-remove="${s.id}" title="Remove" aria-label="Remove ${s.common}">×</button>
    </div>`).join("")+`</div>`;
  renderAnalysis(list);
  buildPrintDoc();
}

function renderAnalysis(list){
  const A=[];
  const qtyOf = s => plan.get(s.id)||1;
  const totalPlants = list.reduce((n,s)=>n+qtyOf(s),0);

  /* 1 - bloom coverage */
  const monthCounts = MONTHS.map(m=>list.filter(s=>s.bloom.includes(m.n)).length);
  const gaps = MONTHS.filter((m,i)=>monthCounts[i]===0);
  const maxC = Math.max(...monthCounts,1);
  let covMsg;
  if(gaps.length) covMsg = `Nothing blooms in ${gaps.map(g=>g.l).join(", ")} - pollinators go hungry then. Add species that cover those months.`;
  else if(monthCounts[0]<=1) covMsg = `April leans on a single early bloomer (the crocus). That's normal for Zone 3b, but keep it in the mix for the first emerging bees.`;
  else covMsg = `Continuous bloom from April through October - no hungry gaps.`;
  A.push(`<div class="acard" data-sec="bloom">
    <h3>Bloom coverage</h3>
    <p>${covMsg}</p>
    <div class="cov-strip">${MONTHS.map((m,i)=>{
      const c=monthCounts[i];
      return `<div class="cov-m"><div class="cov-bar ${c===0?'gap':''}"><span class="cov-num">${c}</span><div class="cov-fill" style="height:${c===0?0:18+(c/maxC)*16}px"></div></div><div class="cov-lbl">${m.l}</div></div>`;
    }).join("")}</div>
  </div>`);

  /* 2 - pollinators */
  const polls=["bee","butterfly","hummingbird","moth"];
  const present = polls.filter(p=>list.some(s=>s.attr.includes(p)));
  A.push(`<div class="acard" data-sec="poll">
    <h3>Pollinator support</h3>
    <div class="poll-head"><span class="pr-label-spacer"></span><div class="pr-monthlabels">${MONTHS.map(m=>`<span>${m.l}</span>`).join("")}</div></div>
    <div class="poll-rows">${polls.map(p=>{
      const months = MONTHS.map(m=>list.some(s=>s.attr.includes(p)&&s.bloom.includes(m.n)));
      const any = months.some(Boolean);
      return `<div class="poll-row">
        <span class="pr-label" style="color:${any?'var(--ink)':'var(--ink-soft)'}">${ICON[p]}${POLL_LABEL[p]}</span>
        <div class="pr-months">${months.map(on=>`<span class="pr-cell ${on?'on':''}"></span>`).join("")}</div>
      </div>`;
    }).join("")}</div>
    <p>${present.length>=3?`Strong guild - ${present.map(p=>POLL_LABEL[p].toLowerCase()).join(", ")} all have flowers to visit.`:`Currently feeding ${present.length?present.map(p=>POLL_LABEL[p].toLowerCase()).join(", "):'no pollinator groups'}. Add e.g. Alumroot or Bergamot for hummingbirds, milkweed or blazingstar for butterflies.`}</p>
  </div>`);

  /* 3 - nitrogen (share of N-fixing PLANTS vs a 10–20% target band) */
  const fixers = list.filter(s=>s.nfix);
  const needN = list.filter(s=>s.zone==="climax");
  const fixerPlants = fixers.reduce((n,s)=>n+qtyOf(s),0);
  const pct = totalPlants ? Math.round(fixerPlants/totalPlants*100) : 0;
  let nStatus = fixerPlants===0 ? "alert" : (pct<10 ? "warn" : "good");
  const fixerList = fixers.map(s=>`${s.common}${qtyOf(s)>1?` ×${qtyOf(s)}`:''}`).join(", ");
  let nMsg;
  if(fixerPlants===0) nMsg = needN.length
    ? `None of your ${totalPlants} plants fix nitrogen, yet heavy feeders (${needN.map(s=>s.common).join(", ")}) want richer soil. Add a clover or Hedysarum.`
    : `None of your ${totalPlants} plants fix nitrogen yet. Add Purple/White Prairie Clover or Hedysarum so the bed feeds itself.`;
  else if(pct<10) nMsg = `${fixerPlants} of ${totalPlants} plants (${pct}%) fix nitrogen - ${fixerList}. That's below the shaded 10–20% target band; another clover or Hedysarum would bring it into range.`;
  else nMsg = `${fixerPlants} of ${totalPlants} plants (${pct}%) fix nitrogen - ${fixerList}. Inside (or above) the shaded 10–20% target band - enough to keep the bed self-feeding without fertiliser.`;
  A.push(`<div class="acard">
    <h3>Nitrogen balance<span class="status st-${nStatus}">${nStatus==='good'?'Self-feeding':nStatus==='warn'?'Light':'Missing'}</span></h3>
    <div class="nfix-scale"><span class="s0">0%</span><span style="left:25%">10%</span><span style="left:50%">20%</span><span class="s40">40%</span></div>
    <div class="nfix-meter"><div class="nfix-fill" style="width:${Math.min(pct*2.5,100)}%"></div><span class="nfix-band" title="Target band: 10–20% of plants"></span></div>
    <p>${nMsg} <span class="muted">Basis: share of nitrogen-fixing plants among all ${totalPlants} planted - see Field Notes B &amp; G.</span></p>
  </div>`);

  /* 3b - soil fertility & fixer pairing */
  const aggr2 = list.filter(s=>s.colonizer==="aggressive");
  const goodNbr = list.filter(s=>s.feed==="adaptable" && !s.nfix && s.colonizer!=="aggressive");
  const humusList = list.filter(s=>s.feed==="humus" && !s.nfix);
  const leanSoil = list.filter(s=>s.feed==="lean" && !s.nfix && s.colonizer!=="aggressive");
  const nm = a => a.map(s=>s.common).join(", ");
  let sLines = "";
  if(fixers.length){
    sLines += goodNbr.length
      ? `<div class="alert-line ok"><b>Site beside the fixers.</b> ${nm(goodNbr)} are nutrient-responsive but not aggressive - plant them next to ${nm(fixers)} to catch the nitrogen released over time.</div>`
      : `<div class="alert-line info">Your fixers (${nm(fixers)}) will enrich their own patch, but there are no nutrient-responsive neighbours in the plan to catch it - Black-eyed Susan, Bergamot or Meadow Blazingstar would fit.</div>`;
  } else {
    sLines += `<div class="alert-line info"><b>No fixers yet.</b> Add Purple/White Prairie Clover or Hedysarum, then this will suggest which neighbours to pair with them.</div>`;
  }
  if(humusList.length) sLines += `<div class="alert-line info"><b>Moister, part-shade pocket.</b> ${nm(humusList)} like humus-rich soil and a little shade - site near, not in, the dry fixer patch, and skip the fertiliser.</div>`;
  if(leanSoil.length) sLines += `<div class="alert-line info"><b>Keep lean.</b> ${nm(leanSoil)} want poor soil - keep them away from enrichment; extra nitrogen makes them flop and bloom less.</div>`;
  if(aggr2.length) sLines += `<div class="alert-line bad"><b>Don't feed.</b> ${nm(aggr2)} are turbocharged by rich soil - keep them well clear of the fixer zone.</div>`;
  A.push(`<div class="acard">
    <h3>Soil fertility &amp; fixer pairing</h3>
    ${sLines}
    <p class="muted">Most prairie natives prefer lean soil - don't add fertiliser; let the legumes enrich their patch slowly. See Field Notes B &amp; G.</p>
  </div>`);

  /* 4 - colonizers vs climax */
  const aggr = list.filter(s=>s.colonizer==="aggressive");
  const spread = list.filter(s=>s.colonizer==="spreading");
  const vulnerable = list.filter(s=>s.zone==="climax"||s.ttf>=3);
  let cStatus = (aggr.length&&vulnerable.length)?"alert":(aggr.length||spread.length?"warn":"good");
  let lines="";
  if(aggr.length&&vulnerable.length){
    lines += `<div class="alert-line bad"><b>Conflict.</b> ${aggr.map(s=>s.common).join(", ")} will outrun slow-growers like ${vulnerable.map(s=>s.common).join(", ")}. Use root barriers (heavy plastic edging) or a separate bed &gt;5 m away, and ring the slow species with buffer plants.</div>`;
  } else if(aggr.length){
    lines += `<div class="alert-line info"><b>Contain these.</b> ${aggr.map(s=>s.common).join(", ")} spread fast by rhizome. Give them their own bed or a root barrier so they don't take over later.</div>`;
  }
  if(spread.length){
    lines += `<div class="alert-line info">${spread.map(s=>s.common).join(", ")} clump and creep moderately - fine among sturdy neighbours, just divide every few years.</div>`;
  }
  if(!aggr.length&&!spread.length){
    lines += `<div class="alert-line ok"><b>Well-behaved.</b> No aggressive colonizers in the plan - slow climax species can establish without being crowded.</div>`;
  }
  A.push(`<div class="acard">
    <h3>Colonizers &amp; climax<span class="status st-${cStatus}">${cStatus==='good'?'Balanced':cStatus==='warn'?'Contain':'Conflict'}</span></h3>
    ${lines}
  </div>`);

  /* 5 - establishment timeline */
  const slow=list.filter(s=>s.ttf>=3), mod=list.filter(s=>s.ttf===2), fast=list.filter(s=>s.ttf<=1);
  A.push(`<div class="acard" data-sec="estab">
    <h3>Establishment timeline</h3>
    <p>${fast.length?`<strong>${fast.length}</strong> fast pioneer${fast.length>1?'s':''} for cover in year one${slow.length?`, while ${slow.length} slow climax species fill in over several years.`:'.'}`:`Heads up - no quick pioneers. Add Giant Hyssop, Black-eyed Susan or Gaillardia for first-year colour while the rest mature.`}</p>
    <ul class="est-list">
      ${[...slow,...mod,...fast].map(s=>{
        const cls = s.ttf>=3?'yr-slow':s.ttf===2?'yr-mod':'yr-fast';
        return `<li><span class="est-yr ${cls}">${s.ttfText}</span>${s.common}</li>`;
      }).join("")}
    </ul>
  </div>`);

  /* 6 - sightlines */
  const tall = list.filter(s=>s.hMax>60);
  A.push(`<div class="acard">
    <h3>Boulevard sightlines</h3>
    <p>${tall.length
      ? `<strong>${tall.length}</strong> species top 60 cm: ${tall.map(s=>s.common).join(", ")}. Keep these ≥5 m back from any intersection or crosswalk - plant them mid-bed or on non-corner stretches.`
      : `Every species stays under 60 cm - the whole plan is safe near intersections and crosswalks.`}</p>
  </div>`);

  /* 6b - toxic plants (safety) */
  const toxic = list.filter(s=>typeof EDTOX!=="undefined" && EDTOX[s.id] && EDTOX[s.id].t==="toxic");
  const toxStatus = toxic.length ? "alert" : "good";
  let toxLines;
  if(toxic.length){
    toxLines = toxic.map(s=>`<div class="alert-line bad"><b>${s.common}.</b> ${EDTOX[s.id].note}</div>`).join("");
    toxLines += `<p class="muted">Keep these away from children and pets and wash hands after handling. Each Toxic/Edible note is cited in the plant's \u201cAbout\u201d panel under Explore.</p>`;
  } else {
    toxLines = `<div class="alert-line ok"><b>No toxic species.</b> Nothing in this plan is a notable poisoning risk to people or pets.</div>`;
  }
  A.push(`<div class="acard" data-sec="toxic">
    <h3>Toxic plants<span class="status st-${toxStatus}">${toxic.length?`${toxic.length} toxic`:'None'}</span></h3>
    ${toxLines}
  </div>`);

  /* 7 - height layers */
  const BANDS=[{name:"Edging",lo:0,hi:30},{name:"Low / front",lo:31,hi:60},{name:"Mid",lo:61,hi:100},{name:"Tall / back",lo:101,hi:99999}];
  A.push(`<div class="acard" data-sec="height">
    <h3>Height layers</h3>
    <p>Selected plants grouped by mature height (tallest bloom stalk) - stack low fronts to tall backs.</p>
    <div class="atable-wrap"><table class="atable">
      <thead><tr><th>Layer</th><th class="num">Plants</th><th>Species</th></tr></thead>
      <tbody>${BANDS.map(b=>{
        const inB=list.filter(s=>s.hMax>=b.lo&&s.hMax<=b.hi);
        const n=inB.reduce((x,s)=>x+qtyOf(s),0);
        const names=inB.length?inB.map(s=>`${s.common}${qtyOf(s)>1?` ×${qtyOf(s)}`:''}`).join(", "):'<span class="muted"> - </span>';
        return `<tr><td><b>${b.name}</b><div class="layer-band">${b.lo}–${b.hi>9000?'+':b.hi+' cm'}</div></td><td class="num">${n||''}</td><td>${names}</td></tr>`;
      }).join("")}</tbody>
    </table></div>
  </div>`);

  /* 8 - estimated footprint: median + upper-bound spread × quantity, metric */
  const rows=list.map(s=>{const q=qtyOf(s);const med=(s.wMin+s.wMax)/2;const rMed=med/200,rMax=s.wMax/200;const eachMed=Math.PI*rMed*rMed,eachMax=Math.PI*rMax*rMax;return {s,q,med,eachMed,eachMax,subMed:eachMed*q,subMax:eachMax*q};}).sort((a,b)=>b.subMed-a.subMed);
  const totMed=rows.reduce((n,r)=>n+r.subMed,0);
  const totMax=rows.reduce((n,r)=>n+r.subMax,0);
  A.push(`<div class="acard">
    <h3>Estimated footprint</h3>
    <p>Ground each plant covers at maturity - a circle of its spread, times how many you plant. The range runs from a <b>median</b> estimate (typical spread) to an <b>upper bound</b> (every plant at its widest), to give a sense of the variation.</p>
    <div class="atable-wrap"><table class="atable">
      <thead><tr><th>Plant</th><th class="num">Qty</th><th class="num">Ø cm</th><th class="num">m² med</th><th class="num">m² max</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r.s.common}</td><td class="num">${r.q}</td><td class="num">${Math.round(r.med)}–${r.s.wMax}</td><td class="num">${r.subMed.toFixed(2)}</td><td class="num">${r.subMax.toFixed(2)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${totalPlants}</td><td class="num"></td><td class="num">${totMed.toFixed(1)}</td><td class="num">${totMax.toFixed(1)}</td></tr></tfoot>
    </table></div>
    <p>Roughly <b>${totMed.toFixed(1)}–${totMax.toFixed(1)} m²</b> of bed at maturity - median estimate up to the upper bound if every plant hits its widest spread. Space plants about one spread apart; rhizomatous spreaders (Yarrow, Prairie Sage, Canada Goldenrod) will run past even this over time.</p>
  </div>`);

  $("#analysis").innerHTML = A.join("");
}

/* ---------------- printable plan report (Save as PDF) ----------------
   Builds a clean, print-only document into #printDoc. Rebuilt on every
   plan change so the browser's own Print → Save as PDF (button or Ctrl/Cmd-P)
   produces crisp, vector output. No libraries - works from file:// and hosting.
   All of the My Plan analysis cards are cloned straight from the live
   #analysis section, so the PDF matches the web view exactly. */
function buildPrintDoc(){
  const host=document.getElementById("printDoc"); if(!host) return;
  const list=SPECIES.filter(s=>plan.has(s.id)).sort((a,b)=>firstBloom(a)-firstBloom(b));
  const qty=s=>plan.get(s.id)||1;
  const now=new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  const MN={1:"January",2:"February",3:"March",4:"April",5:"May",6:"June",7:"July",8:"August",9:"September",10:"October",11:"November",12:"December"};
  const title=(typeof planName==="string"&&planName.trim())?esc(planName.trim()):"Native Pollinator Garden Plan";
  const head=`<header class="pd-head"><div class="pd-eyebrow">Prairie Bloom Planner · Saskatoon, SK · USDA Zone 3b</div><h1 class="pd-title">${title}</h1>`;

  if(!list.length){
    host.innerHTML=head+`<div class="pd-meta">Generated ${now}</div></header><p style="margin-top:14px">No species in this plan yet - add some in the planner, then export.</p>`;
    return;
  }

  const totalPlants=list.reduce((n,s)=>n+qty(s),0);
  const firstM=Math.min(...list.map(firstBloom));
  const lastM=Math.max(...list.map(s=>Math.max(...s.bloom)));

  const rows=list.map(s=>{
    const poll=(s.attr||[]).map(a=>POLL_LABEL[a]).join(", ")||" - ";
    return `<tr>
      <td><span class="pd-sw" style="background:var(--c-${s.color})"></span><b>${s.common}</b>${EDTOX[s.id]?` <span class="pd-tag ${EDTOX[s.id].t==="toxic"?"toxic":"edible"}">${EDTOX[s.id].t==="toxic"?"Toxic":"Edible"}</span>`:""}<br><span class="pd-sci">${s.sci}</span></td>
      <td class="n">${qty(s)}</td>
      <td>${s.peakText}</td>
      <td class="n">${s.hMin}–${s.hMax}</td>
      <td class="n">${s.wMin}–${s.wMax}</td>
      <td>${roleLabel(s)}</td>
      <td>${poll}</td>
      <td class="pd-tags">${esc(traitTagList(s).map(t=>t.label).join(", "))||"-"}</td>
    </tr>`;
  }).join("");

  /* clone every My Plan analysis card, in web reading order */
  const ana=document.getElementById("analysis");
  let viz="";
  if(ana){
    ana.querySelectorAll(".acard").forEach(el=>{
      viz+=`<section class="pd-section pd-viz">${el.outerHTML}</section>`;
    });
  }

  host.innerHTML=head+`
      <div class="pd-meta">${list.length} species · ${totalPlants} plants · blooms ${MN[firstM]}–${MN[lastM]} · generated ${now}</div>
    </header>

    <section class="pd-section">
      <h2>Plant list</h2>
      <table class="pd-table">
        <thead><tr><th>Species</th><th class="n">Qty</th><th>Bloom</th><th class="n">Height&nbsp;cm</th><th class="n">Spread&nbsp;cm</th><th>Role</th><th>Pollinators</th><th>Tags</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>

    ${viz}

    <footer class="pd-foot"><b>Edible / Toxic</b> tags are general guidance drawn from cited sources (each citation is in the interactive planner). Always confirm identification with an expert before eating any wild plant, and keep toxic species away from children and pets.<br>Generated by the Prairie Bloom Planner · native wildflowers for Saskatoon, Zone 3b.</footer>`;
}
