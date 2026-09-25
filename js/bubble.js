/* ============================================================
   Prairie Bloom Planner - BUBBLE
   Bubble Diagram tab: a traced yard polygon plus one circle per planned plant,
   drawn at a chosen month and year. Coordinates are centimetres.
   The top half is pure (no DOM) so test/bubble-unit.spec.js can load it in a vm context.
   Load order: credits.js → data.js → core.js → explore.js → plan.js → bubble.js → app.js
   Plain browser globals (no ES modules / no fetch) so this runs
   equally from file:// and from a static web host.
   ============================================================ */

/* ---------------- growth + bloom ---------------- */
// Circles start at 1/3 of mature spread in year 1 and reach full spread by their year of maturity.
function radiusAt(species, year){
  if(species.yearsToFlower<=1) return species.maxSpreadCm/2;
  return species.maxSpreadCm/2*Math.min(1, 1/3+(2/3)*(year-1)/(species.yearsToFlower-1));
}
function isBlooming(species, month, year){ return year>=species.yearsToFlower && species.bloom.includes(month); }

/* ---------------- geometry ---------------- */
function polygonArea(polygon){
  let twiceArea=0;
  for(let index=0;index<polygon.length;index++){
    const [x1,y1]=polygon[index], [x2,y2]=polygon[(index+1)%polygon.length];
    twiceArea+=x1*y2-x2*y1;
  }
  return Math.abs(twiceArea)/2;
}
function pointInPolygon(point, polygon){
  const [x,y]=point; let inside=false;
  for(let index=0,previous=polygon.length-1;index<polygon.length;previous=index++){
    const [currentX,currentY]=polygon[index], [previousX,previousY]=polygon[previous];
    const crossesRay=(currentY>y)!==(previousY>y)
      && x<(previousX-currentX)*(y-currentY)/(previousY-currentY)+currentX;
    if(crossesRay) inside=!inside;
  }
  return inside;
}
// "Heavy" overlap: some overlap between mature plants is normal, so only
// flag when centres are closer than half the summed radii.
function overlaps(circle, otherCircle){
  const distance=Math.hypot(circle.x-otherCircle.x, circle.y-otherCircle.y);
  return distance<(circle.radius+otherCircle.radius)/2;
}

// Centre point, then hexagonal rings outward, each point `spacing` from its neighbours.
const HEX_DIRECTIONS=[[1,0],[0.5,Math.sqrt(3)/2],[-0.5,Math.sqrt(3)/2],[-1,0],[-0.5,-Math.sqrt(3)/2],[0.5,-Math.sqrt(3)/2]];
function hexCluster(center_x, center_y, count, spacing){
  const points=[[center_x,center_y]];
  for(let ring=1; points.length<count; ring++){
    const [startDirectionX,startDirectionY]=HEX_DIRECTIONS[4];
    let x=center_x+startDirectionX*spacing*ring, y=center_y+startDirectionY*spacing*ring;
    for(const [directionX,directionY] of HEX_DIRECTIONS){
      for(let step=0; step<ring; step++){
        points.push([x,y]);
        x+=directionX*spacing; y+=directionY*spacing;
      }
    }
  }
  return points.slice(0,count);
}

/* ---------------- layout state (persisted, gracefully) ---------------- */
const LAYOUT_KEY="prairie-layout-v1";
const DEFAULT_SCALE_CM=1000;   // cm across the canvas (10 m)
const CANVAS_HEIGHT_RATIO=0.625;   // canvas height / width
const MIN_SCALE_CM=100, MAX_SCALE_CM=100000;   // zoom limits: 1 m to 1 km across
const MAX_ORIGIN_CM=1e7;                       // 100 km; rejects corrupt or hand-edited origins
// originX/originY: top-left corner of the view, in cm
const emptyLayout=()=>({yard:[], scale:DEFAULT_SCALE_CM, originX:0, originY:0, plants:[]});
const isFiniteNumber=value=>typeof value==="number" && Number.isFinite(value);

function sanitizeLayout(raw){
  const cleaned=emptyLayout();
  if(!raw || typeof raw!=="object") return cleaned;
  if(Array.isArray(raw.yard)){
    const corners=raw.yard
      .filter(corner=>Array.isArray(corner) && isFiniteNumber(corner[0]) && isFiniteNumber(corner[1]))
      .map(corner=>[corner[0],corner[1]]);
    if(corners.length>=3) cleaned.yard=corners;
  }
  if(isFiniteNumber(raw.scale) && raw.scale>=MIN_SCALE_CM && raw.scale<=MAX_SCALE_CM) cleaned.scale=raw.scale;
  if(isFiniteNumber(raw.originX) && Math.abs(raw.originX)<=MAX_ORIGIN_CM) cleaned.originX=raw.originX;
  if(isFiniteNumber(raw.originY) && Math.abs(raw.originY)<=MAX_ORIGIN_CM) cleaned.originY=raw.originY;
  if(Array.isArray(raw.plants)){
    const seen=new Set();
    raw.plants.forEach(plant=>{
      const valid=plant && typeof plant==="object" && byId(plant.id)
        && Number.isInteger(plant.plantNumber) && plant.plantNumber>=0 && isFiniteNumber(plant.x) && isFiniteNumber(plant.y);
      if(!valid) return;
      const plantKey=plant.id+":"+plant.plantNumber; if(seen.has(plantKey)) return; seen.add(plantKey);
      cleaned.plants.push({id:plant.id, plantNumber:plant.plantNumber, x:plant.x, y:plant.y});
    });
  }
  return cleaned;
}

// The plan is the source of truth: drop circles for species it no longer has,
// and the highest-numbered circles when a quantity goes down.
function syncLayout(layoutState, plan){
  return {...layoutState, plants:layoutState.plants.filter(plant=>plan.has(plant.id) && plant.plantNumber<plan.get(plant.id))};
}
function unplacedIndices(layoutState, id, qty){
  const placed=new Set(layoutState.plants.filter(plant=>plant.id===id).map(plant=>plant.plantNumber));
  const unplaced=[]; for(let plantNumber=0;plantNumber<qty;plantNumber++) if(!placed.has(plantNumber)) unplaced.push(plantNumber);
  return unplaced;
}

// Flags, counts and coverage at a given year. Coverage is approximate: overlaps are
// double-counted and a circle whose centre is in the bed counts whole.
function analyzeLayout(layoutState, year){
  const circles=layoutState.plants.map(plant=>({key:plant.id+":"+plant.plantNumber, x:plant.x, y:plant.y, radius:radiusAt(byId(plant.id),year)}));
  const hasYard=layoutState.yard.length>=3;
  const crowded=new Set(), outside=new Set();
  for(let first=0;first<circles.length;first++)
    for(let second=first+1;second<circles.length;second++)
      if(overlaps(circles[first],circles[second])){ crowded.add(circles[first].key); crowded.add(circles[second].key); }
  let coveredArea=0;
  if(hasYard) circles.forEach(circle=>{
    if(pointInPolygon([circle.x,circle.y],layoutState.yard)) coveredArea+=Math.PI*circle.radius*circle.radius; else outside.add(circle.key);
  });
  const yardArea=hasYard?polygonArea(layoutState.yard):0;
  return {
    flags:new Set([...crowded,...outside]),
    crowded:crowded.size, outside:outside.size,
    areaM2:yardArea>0 ? yardArea/10000 : null,
    coverage:yardArea>0 ? Math.min(1,coveredArea/yardArea) : null
  };
}

// Move and rescale the view so the yard + plants sit centred in it. Data is not moved.
function fitLayout(layoutState){
  const points=[...layoutState.yard, ...layoutState.plants.map(plant=>[plant.x,plant.y])];
  if(!points.length) return layoutState;
  const xs=points.map(point=>point[0]), ys=points.map(point=>point[1]);
  const minX=Math.min(...xs), minY=Math.min(...ys);
  const contentWidth=Math.max(...xs)-minX, contentHeight=Math.max(...ys)-minY;
  const scale=Math.min(MAX_SCALE_CM, Math.max(MIN_SCALE_CM, Math.max(contentWidth, contentHeight/CANVAS_HEIGHT_RATIO)*1.2));
  return {...layoutState, scale,
    originX:minX-(scale-contentWidth)/2,
    originY:minY-(scale*CANVAS_HEIGHT_RATIO-contentHeight)/2};
}

// Zoom by `factor` (>1 zooms out) keeping the canvas point `anchor` at the same spot in the view.
function zoomAt(layoutState, anchor, factor){
  const scale=Math.min(MAX_SCALE_CM, Math.max(MIN_SCALE_CM, layoutState.scale*factor));
  const zoomRatio=scale/layoutState.scale;
  return {...layoutState, scale,
    originX:anchor[0]-(anchor[0]-layoutState.originX)*zoomRatio,
    originY:anchor[1]-(anchor[1]-layoutState.originY)*zoomRatio};
}

// Grid lines and the scale bar step up as the view zooms out so they stay readable.
const SCALE_STEPS_CM=[100,500,1000,5000,10000];
const largestStep=SCALE_STEPS_CM[SCALE_STEPS_CM.length-1];
const gridStep=scale=>SCALE_STEPS_CM.find(stepCm=>stepCm>=scale/25)||largestStep;
const scaleBarLen=scale=>SCALE_STEPS_CM.find(stepCm=>stepCm>=scale/15)||largestStep;

let layout=loadLayout();
function loadLayout(){
  try{ const stored=localStorage.getItem(LAYOUT_KEY); return stored ? sanitizeLayout(JSON.parse(stored)) : emptyLayout(); }
  catch(error){ return emptyLayout(); }
}
function saveLayout(){ try{ localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); }catch(error){} }

/* ================= DOM: rendering ================= */
let view={month:6, year:3, mode:"arrange", draft:[], armed:null, space:false};

function circleStyle(species, month, year){
  if(!isBlooming(species,month,year)) return "fill:var(--green);fill-opacity:.3;stroke:var(--green)";
  const edge=species.color==="white" ? "var(--c-white-line)" : `var(--c-${species.color})`;
  return `fill:var(--c-${species.color});fill-opacity:.8;stroke:${edge}`;
}
const pointsAttr=points=>points.map(point=>point[0].toFixed(1)+","+point[1].toFixed(1)).join(" ");
const bubbleViewBox=layoutState=>`${layoutState.originX} ${layoutState.originY} ${layoutState.scale} ${layoutState.scale*CANVAS_HEIGHT_RATIO}`;

// Inner SVG markup, shared by the web view and the PDF. Circles are drawn
// shortest first so tall plants sit on top.
function bubbleSVG(layoutState, month, year, options){
  const settings=options||{};
  const viewWidth=layoutState.scale, viewHeight=viewWidth*CANVAS_HEIGHT_RATIO;
  const viewLeft=layoutState.originX, viewTop=layoutState.originY;
  const handleSize=viewWidth/100;   // handle and label size, in cm, so they stay the same on screen at any zoom
  const gridSpacing=gridStep(viewWidth), scaleBarLength=scaleBarLen(viewWidth);

  let grid="";
  // Count lines by index: at very large origins `x+=step` stops changing x and would never end.
  const firstGridX=Math.ceil(viewLeft/gridSpacing)*gridSpacing, firstGridY=Math.ceil(viewTop/gridSpacing)*gridSpacing;
  for(let line=0;line<=viewWidth/gridSpacing;line++){
    const x=firstGridX+line*gridSpacing;
    if(x<viewLeft+viewWidth) grid+=`<line x1="${x}" y1="${viewTop}" x2="${x}" y2="${viewTop+viewHeight}"/>`;
  }
  for(let line=0;line<=viewHeight/gridSpacing;line++){
    const y=firstGridY+line*gridSpacing;
    if(y<viewTop+viewHeight) grid+=`<line x1="${viewLeft}" y1="${y}" x2="${viewLeft+viewWidth}" y2="${y}"/>`;
  }
  let markup=`<g class="bub-grid">${grid}</g>`;

  if(layoutState.yard.length>=3) markup+=`<polygon class="bub-yard" points="${pointsAttr(layoutState.yard)}"/>`;

  markup+=layoutState.plants
    .map(plant=>({plant, species:byId(plant.id)}))
    .sort((first,second)=>first.species.maxHeightCm-second.species.maxHeightCm)
    .map(({plant,species})=>{
      const flagged=settings.flags && settings.flags.has(plant.id+":"+plant.plantNumber);
      const label=settings.numbers
        ? `<text class="bub-num" x="${plant.x}" y="${plant.y}" font-size="${(handleSize*2).toFixed(1)}">${settings.numbers.get(plant.id)}</text>`
        : "";
      return `<circle class="bub${flagged?" flag":""}" data-id="${plant.id}" data-n="${plant.plantNumber}" cx="${plant.x}" cy="${plant.y}" r="${radiusAt(species,year).toFixed(1)}" style="${circleStyle(species,month,year)}"><title>${esc(species.common)}</title></circle>${label}`;
    }).join("");

  if(settings.draft && settings.draft.length){
    markup+=`<polyline class="bub-draft" points="${pointsAttr(settings.draft)}"/>`;
    markup+=settings.draft.map((corner,cornerIndex)=>
      `<circle class="vtx${cornerIndex===0?" first":""}" data-draft="${cornerIndex}" cx="${corner[0]}" cy="${corner[1]}" r="${handleSize}"/>`).join("");
  }

  if(settings.handles && layoutState.yard.length>=3){
    const yard=layoutState.yard;
    markup+=yard.map((corner,cornerIndex)=>{
      const nextCorner=yard[(cornerIndex+1)%yard.length];
      return `<circle class="mid" data-i="${cornerIndex}" cx="${(corner[0]+nextCorner[0])/2}" cy="${(corner[1]+nextCorner[1])/2}" r="${(handleSize*0.7).toFixed(1)}"/>`;
    }).join("");
    markup+=yard.map((corner,cornerIndex)=>
      `<circle class="vtx" data-i="${cornerIndex}" cx="${corner[0]}" cy="${corner[1]}" r="${handleSize}"/>`).join("");
  }

  const scaleBarX=viewLeft+2*handleSize, scaleBarY=viewTop+viewHeight-3*handleSize;
  markup+=`<g class="bub-scale"><line x1="${scaleBarX}" y1="${scaleBarY}" x2="${scaleBarX+scaleBarLength}" y2="${scaleBarY}"/><text x="${scaleBarX}" y="${scaleBarY-1.5*handleSize}" font-size="${(handleSize*2.2).toFixed(1)}">${scaleBarLength/100} m</text></g>`;
  return markup;
}

function bubbleHint(){
  if(!plan.size) return "Add plants in My Plan first.";
  if(view.mode==="draw"){
    if(layout.yard.length) return "Drag corners to reshape. Click a small dot on an edge to add a corner; right-click or long-press a corner to remove it.";
    return view.draft.length
      ? "Click to add corners. Click the first corner or double-click to close the shape."
      : "Click on the canvas to place the first corner of your yard.";
  }
  if(view.armed) return `Click the canvas to place ${byId(view.armed).common}.`;
  if(!layout.yard.length) return "Draw your yard to start - switch to Draw yard.";
  return "Drag circles to arrange them. Drag a circle onto the Unplaced list to take it off the canvas.";
}

// Stored plans can hold ids that are no longer in SPECIES; skip them like renderPlan does.
const plannedEntries=()=>[...plan].filter(([id])=>byId(id));

function renderBubbleTray(){
  const rows=plannedEntries()
    .map(([id,qty])=>({species:byId(id), qty, left:unplacedIndices(layout,id,qty).length}))
    .filter(row=>row.left>0);
  const body=!plan.size ? "" : rows.length
    ? rows.map(row=>`<button class="tray-row${view.armed===row.species.id?" armed":""}" data-drop="${row.species.id}"><span class="dot" style="background:var(--c-${row.species.color})"></span>${esc(row.species.common)} - ${row.left} of ${row.qty} unplaced</button>`).join("")
    : `<p class="muted">Every plant is on the canvas.</p>`;
  $("#bubbleTray").innerHTML=`<h4>Unplaced</h4>`+body;
}

function renderBubbleSummary(analysis){
  const unplaced=plannedEntries().reduce((total,[id,qty])=>total+unplacedIndices(layout,id,qty).length,0);
  const coveragePercent=analysis.coverage==null ? "-" : Math.round(analysis.coverage*100)+"%";
  const area=analysis.areaM2==null ? "-" : analysis.areaM2.toFixed(1)+" m²";
  $("#bubSummary").innerHTML=`<dl>
    <div><dt>Overlapping</dt><dd id="bubCrowded">${analysis.crowded}</dd></div>
    <div><dt>Outside the bed</dt><dd id="bubOutside">${analysis.outside}</dd></div>
    <div><dt>Unplaced</dt><dd id="bubUnplaced">${unplaced}</dd></div>
    <div><dt>Bed coverage, year ${view.year}</dt><dd id="bubCoverage">${coveragePercent}</dd></div>
    <div><dt>Bed area</dt><dd id="bubArea">${area}</dd></div>
  </dl>`;
}

function renderBubble(){
  layout=syncLayout(layout, plan); saveLayout();
  if(view.armed && !unplacedIndices(layout, view.armed, plan.get(view.armed)||0).length) view.armed=null;
  const svg=$("#bubbleSvg");
  const analysis=analyzeLayout(layout, view.year);
  svg.setAttribute("viewBox", bubbleViewBox(layout));
  svg.innerHTML=bubbleSVG(layout, view.month, view.year, {flags:analysis.flags, handles:view.mode==="draw", draft:view.draft});
  svg.classList.toggle("armed", !!view.armed);
  $("#bubMonthLbl").textContent=MONTHS.find(month=>month.n===view.month).l;
  $("#bubYearLbl").textContent=view.year;
  $("#bubHint").textContent=bubbleHint();
  renderBubbleTray();
  renderBubbleSummary(analysis);
}

/* ================= DOM: pointer interaction ================= */
// The drag in progress, if any: {kind:"vtx"|"plant"|"pan", element, startClientX, startClientY, ...}.
let drag=null;
let menuMutedUntil=0;   // a long-press removal can be followed by a native contextmenu; ignore it

function setBubMode(mode){
  view.mode=mode; view.draft=[]; view.armed=null;
  $("#bubModeDraw").setAttribute("aria-pressed", mode==="draw");
  $("#bubModeArrange").setAttribute("aria-pressed", mode==="arrange");
  renderBubble();
}

// Screen position of a pointer event -> canvas point in cm.
function svgPt(event){
  const screenMatrix=$("#bubbleSvg").getScreenCTM(); if(!screenMatrix) return null;
  const canvasPoint=new DOMPoint(event.clientX, event.clientY).matrixTransform(screenMatrix.inverse());
  return [canvasPoint.x, canvasPoint.y];
}

function startDrag(event, details){
  event.preventDefault();
  event.target.setPointerCapture(event.pointerId);
  drag={...details, element:event.target, startClientX:event.clientX, startClientY:event.clientY};
}

function addDraftPoint(point){
  const lastCorner=view.draft[view.draft.length-1];
  const isSecondClickOfDoubleClick=lastCorner && Math.hypot(point[0]-lastCorner[0], point[1]-lastCorner[1])<layout.scale/200;
  if(isSecondClickOfDoubleClick) return;
  view.draft.push(point); renderBubble();
}
function closeDraft(){
  if(view.draft.length<3) return;
  layout.yard=view.draft; view.draft=[];
  saveLayout(); renderBubble(); toast("Yard shape saved");
}
function removeVertex(cornerIndex){
  if(drag) clearTimeout(drag.longPressTimer);
  drag=null;
  if(layout.yard.length<=3){ toast("A yard needs at least 3 corners"); renderBubble(); return; }
  layout.yard.splice(cornerIndex,1); saveLayout(); renderBubble();
}

function startPan(event){
  event.preventDefault();
  const svg=$("#bubbleSvg");
  svg.setPointerCapture(event.pointerId);
  drag={kind:"pan", element:svg, startClientX:event.clientX, startClientY:event.clientY,
        startOriginX:layout.originX, startOriginY:layout.originY,
        cmPerPixel:layout.scale/svg.getBoundingClientRect().width};
}

function bubblePointerDown(event){
  if(event.button===1 || (event.button===0 && view.space)){ startPan(event); return; }
  if(event.button!==0) return;   // right-click is handled by bubbleContextMenu
  const point=svgPt(event); if(!point) return;
  const target=event.target, classes=target.classList;
  if(view.mode==="draw"){
    if(classes.contains("first")){ closeDraft(); return; }
    if(classes.contains("vtx") && target.dataset.i!=null){
      const cornerIndex=parseInt(target.dataset.i,10);
      startDrag(event, {kind:"vtx", cornerIndex});
      // Long-press removal is for touch; mouse users right-click, and a slow mouse drag must not delete.
      if(event.pointerType!=="mouse") drag.longPressTimer=setTimeout(()=>{ menuMutedUntil=Date.now()+1000; removeVertex(cornerIndex); }, 550);
      return;
    }
    if(classes.contains("mid")){
      const cornerIndex=parseInt(target.dataset.i,10);
      const corner=layout.yard[cornerIndex], nextCorner=layout.yard[(cornerIndex+1)%layout.yard.length];
      layout.yard.splice(cornerIndex+1, 0, [(corner[0]+nextCorner[0])/2, (corner[1]+nextCorner[1])/2]);
      saveLayout(); renderBubble(); return;
    }
    if(!layout.yard.length) addDraftPoint(point);
    return;
  }
  if(classes.contains("bub")){
    const plant=layout.plants.find(candidate=>candidate.id===target.dataset.id && candidate.plantNumber===parseInt(target.dataset.n,10));
    if(plant) startDrag(event, {kind:"plant", plant});
    return;
  }
  if(view.armed) placeCluster(view.armed, point);
}

// Update only the dragged element's attributes. A full re-render mid-drag would
// replace the element and drop the pointer capture.
function bubblePointerMove(event){
  if(!drag) return;
  if(drag.kind==="pan"){
    layout.originX=drag.startOriginX-(event.clientX-drag.startClientX)*drag.cmPerPixel;
    layout.originY=drag.startOriginY-(event.clientY-drag.startClientY)*drag.cmPerPixel;
    drag.element.setAttribute("viewBox", bubbleViewBox(layout));
    return;
  }
  if(Math.hypot(event.clientX-drag.startClientX, event.clientY-drag.startClientY)>4) clearTimeout(drag.longPressTimer);
  const point=svgPt(event); if(!point) return;
  if(drag.kind==="vtx"){
    layout.yard[drag.cornerIndex]=point;
    const yardPolygon=$("#bubbleSvg .bub-yard"); if(yardPolygon) yardPolygon.setAttribute("points", pointsAttr(layout.yard));
  } else {
    drag.plant.x=point[0]; drag.plant.y=point[1];
  }
  drag.element.setAttribute("cx", point[0]); drag.element.setAttribute("cy", point[1]);
}

function bubblePointerUp(event){
  if(!drag) return;
  clearTimeout(drag.longPressTimer);
  const finishedDrag=drag; drag=null;
  if(finishedDrag.kind==="plant" && event.type==="pointerup"){
    const dropTarget=document.elementFromPoint(event.clientX, event.clientY);
    if(dropTarget && dropTarget.closest("#bubbleTray")) layout.plants=layout.plants.filter(plant=>plant!==finishedDrag.plant);
  }
  saveLayout(); renderBubble();
}

// Wheel zooms about the cursor. Firefox reports mouse wheels in lines, so normalise to pixels.
function bubbleWheel(event){
  event.preventDefault();
  if(drag) return;
  const point=svgPt(event); if(!point) return;
  const deltaPixels=event.deltaMode===1 ? event.deltaY*33 : event.deltaMode===2 ? event.deltaY*800 : event.deltaY;
  layout=zoomAt(layout, point, Math.exp(Math.max(-300, Math.min(300, deltaPixels))*0.0015));
  saveLayout(); renderBubble();
}

// Space held with the pointer over the canvas turns left-drag into pan. Elsewhere Space keeps
// its normal job (pressing a focused button, scrolling the page).
function setSpacePan(on){ view.space=on; $("#bubbleSvg").classList.toggle("panning", on); }
function bubbleSpace(event){
  if(event.code!=="Space") return;
  if(event.type==="keyup"){ setSpacePan(false); return; }   // always, so pan mode can't stick on
  const svg=$("#bubbleSvg");
  const typing=event.target.closest && event.target.closest("input,textarea,select");
  if(!$("#panel-bubble.active") || !svg.matches(":hover") || typing) return;
  event.preventDefault();
  // Drop focus so releasing Space doesn't also press whatever button was last clicked.
  if(document.activeElement && document.activeElement!==document.body) document.activeElement.blur();
  setSpacePan(true);
}

function bubbleDblClick(){ if(view.mode==="draw" && !layout.yard.length) closeDraft(); }

function bubbleContextMenu(event){
  const target=event.target;
  if(view.mode!=="draw" || !target.classList.contains("vtx") || target.dataset.i==null) return;
  event.preventDefault();
  if(Date.now()<menuMutedUntil) return;
  removeVertex(parseInt(target.dataset.i,10));
}

// Drop every unplaced plant of a species in a hex cluster around `point`, spaced at mature spread.
function placeCluster(id, point){
  const species=byId(id), plantNumbers=unplacedIndices(layout, id, plan.get(id)||0);
  hexCluster(point[0], point[1], plantNumbers.length, species.maxSpreadCm)
    .forEach(([x,y],clusterIndex)=>layout.plants.push({id, plantNumber:plantNumbers[clusterIndex], x, y}));
  view.armed=null; saveLayout(); renderBubble();
  toast(`Placed ${plantNumbers.length} ${species.common}`);
}

/* ================= PDF ================= */
const BUB_MONTH_NAME={4:"April",5:"May",6:"June",7:"July",8:"August",9:"September",10:"October"};

// Diagram page for #printDoc at the current slider values. Circles carry a number
// that matches the legend.
function bubblePrintSection(){
  if(layout.yard.length<3) return "";
  const printLayout=fitLayout(syncLayout(layout, plan));   // print the whole yard, whatever the screen zoom
  const ids=[...new Set(printLayout.plants.map(plant=>plant.id))];
  const numbers=new Map(ids.map((id,legendIndex)=>[id,legendIndex+1]));
  const analysis=analyzeLayout(printLayout, view.year);
  return `<section class="pd-section pd-bubble">
      <h2>Bubble diagram</h2>
      <p class="pd-cap">${BUB_MONTH_NAME[view.month]}, Year ${view.year}</p>
      <svg class="pd-bubble-svg" viewBox="${bubbleViewBox(printLayout)}" xmlns="http://www.w3.org/2000/svg">${bubbleSVG(printLayout, view.month, view.year, {flags:analysis.flags, numbers})}</svg>
      <ol class="pd-legend">${ids.map(id=>`<li>${esc(byId(id).common)}</li>`).join("")}</ol>
    </section>`;
}
