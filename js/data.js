/* ============================================================
   Prairie Bloom Planner - DATA
   Flower-tile data + display config (COLORS, SPECIES, BUY, ABOUT, SRC). No DOM, no logic.
   Load order: credits.js → data.js → core.js → explore.js → plan.js → app.js
   Plain browser globals (no ES modules / no fetch) so this runs
   equally from file:// and from a static web host.
   ============================================================ */

/* ---------------- bloom-colour system ---------------- */
const COLORS = {
  purple:  {label:"Purple",   v:"--c-purple"},
  blue:    {label:"Blue",     v:"--c-blue"},
  pinkred: {label:"Pink-red", v:"--c-pinkred"},
  yellow:  {label:"Yellow",   v:"--c-yellow"},
  white:   {label:"White",    v:"--c-white"}
};
const MONTHS = [{n:4,l:"Apr"},{n:5,l:"May"},{n:6,l:"Jun"},{n:7,l:"Jul"},{n:8,l:"Aug"},{n:9,l:"Sep"},{n:10,l:"Oct"}];

/* pollinator icons (inline SVG, currentColor) */
const ICON = {
  bee:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="14" rx="4.5" ry="6"/><path d="M9 10.5h6M9 14h6M9 17.5h6"/><path d="M9 8C6.5 5.5 4 5 4 5M15 8c2.5-2.5 5-3 5-3"/><circle cx="12" cy="6" r="1.6"/></svg>`,
  butterfly:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v12"/><path d="M12 9C12 5 8 3 5 4c-3 1-2 6 1 7-3 1-4 5-1 7 3 1.5 7-1 7-5"/><path d="M12 9c0-4 4-6 7-5 3 1 2 6-1 7 3 1 4 5 1 7-3 1.5-7-1-7-5"/><path d="M12 6.5l-1-2M12 6.5l1-2"/></svg>`,
  hummingbird:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c4 0 7-3 8-7"/><path d="M13 12c2.5-.5 5-2.5 6.5-5.5"/><path d="M3 4c5 0 9 3 10 8"/><circle cx="18.5" cy="9.5" r="1"/><path d="M19 11l3 3-3 0z"/></svg>`,
  moth:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v10"/><path d="M12 9C11 5 6 5 4 8c-1.5 2.3-1 6 2 8 3 1.5 6-1 6-4"/><path d="M12 9c1-4 6-4 8-1 1.5 2.3 1 6-2 8-3 1.5-6-1-6-4"/><path d="M12 7l-1.5-2M12 7l1.5-2"/></svg>`
};
const POLL_LABEL = {bee:"Bees", butterfly:"Butterflies", hummingbird:"Hummingbirds", moth:"Moths"};

/* ---------------- species data ---------------- */
/* bloom: months 4-10; peak months in `peak`. ttf = min years to flower.
   colonizer: 'aggressive' | 'spreading' | null. zone: climax|buffer|colonizer|general */
const SPECIES = [
 {id:"crocus",common:"Prairie Crocus",sci:"Anemone patens",color:"purple",bloom:[4,5,6],peak:[5],peakText:"Mid-April\u2013June",dur:6,hMin:15,hMax:30,wMin:15,wMax:20,ttf:3,ttfText:"3\u20137 years",attr:["bee"],nfix:false,colonizer:null,zone:"climax",feed:"lean",moist:"dry",benefit:"First nectar of the year; vital pollen for emerging queen bees."},
 {id:"blueeyed",common:"Blue-Eyed Grass",sci:"Sisyrinchium montanum",color:"blue",bloom:[5,6,7],peak:[6],peakText:"May\u2013July",dur:4,hMin:10,hMax:50,wMin:10,wMax:20,ttf:2,ttfText:"2 years",attr:["bee"],nfix:false,colonizer:null,zone:"general",feed:"adaptable",moist:"mesic",benefit:"Star-shaped blooms for small native bees and syrphid flies."},
 {id:"avens",common:"Three-Flowered Avens",sci:"Geum triflorum",color:"pinkred",bloom:[5,6,7],peak:[6],peakText:"May\u2013July",dur:8,hMin:15,hMax:45,wMin:30,wMax:45,ttf:2,ttfText:"2\u20133 years",attr:["bee"],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"High-value early nectar; smoke-like pink seed plumes."},
 {id:"bedstraw",common:"Northern Bedstraw",sci:"Galium boreale",color:"white",bloom:[6],peak:[6],peakText:"June",dur:4,hMin:30,hMax:90,wMin:30,wMax:60,ttf:1,ttfText:"1\u20132 years",attr:["bee"],nfix:false,colonizer:"spreading",zone:"general",feed:"adaptable",moist:"moist",benefit:"Dense white clusters draw predatory insects; spreads by rhizome + seed into patches."},
 {id:"anemone",common:"Long-Fruited Anemone",sci:"Anemone cylindrica",color:"white",bloom:[5,6],peak:[6],peakText:"Late May\u2013June",dur:4,hMin:30,hMax:75,wMin:25,wMax:45,ttf:2,ttfText:"2 years",attr:["bee"],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Woolly seed heads give native bees nesting material."},
 {id:"alumroot",common:"Alumroot",sci:"Heuchera richardsonii",color:"white",bloom:[6,7],peak:[6],peakText:"June\u2013July",dur:6,hMin:30,hMax:90,wMin:30,wMax:45,ttf:2,ttfText:"2 years",attr:["hummingbird","bee"],nfix:false,colonizer:null,zone:"climax",feed:"humus",moist:"mesic",benefit:"Airy beige-pink spikes attractive to hummingbirds; foliage stays low, bloom stalks reach ~90 cm."},
 {id:"hedysarum",common:"Hedysarum",sci:"Hedysarum boreale",color:"pinkred",bloom:[6,7],peak:[6],peakText:"June\u2013July",dur:6,hMin:30,hMax:60,wMin:25,wMax:30,ttf:2,ttfText:"2\u20133 years",attr:["butterfly","bee"],nfix:true,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Nitrogen-fixing legume and host plant for butterfly larvae."},
 {id:"yarrow",common:"Yarrow",sci:"Achillea millefolium",color:"white",bloom:[6,7,8,9],peak:[6,7,8,9],peakText:"June\u2013September",dur:12,hMin:30,hMax:90,wMin:45,wMax:90,ttf:1,ttfText:"1\u20132 years",attr:["bee"],nfix:false,colonizer:"aggressive",zone:"colonizer",feed:"adaptable",moist:"mesic",benefit:"Long bloom for parasitic wasps and native bees - but spreads hard by rhizome (colony-forming)."},
 {id:"harebell",common:"Harebell",sci:"Campanula rotundifolia",color:"purple",bloom:[6,7,8,9],peak:[6,7,8,9],peakText:"June\u2013September",dur:12,hMin:10,hMax:50,wMin:20,wMax:30,ttf:2,ttfText:"2 years",attr:["bee"],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Nodding bells specialised for bumblebees; blooms for months."},
 {id:"hyssop",common:"Giant Hyssop",sci:"Agastache foeniculum",color:"purple",bloom:[6,7,8,9],peak:[6,7,8,9],peakText:"June\u2013September",dur:12,hMin:60,hMax:120,wMin:30,wMax:90,ttf:1,ttfText:"1 year",attr:["bee","butterfly","hummingbird"],nfix:false,colonizer:null,zone:"buffer",feed:"lean",moist:"mesic",benefit:"Exceptionally high nectar sugar; heavily visited; flowers in year one."},
 {id:"flax",common:"Wild Blue Flax",sci:"Linum lewisii",color:"blue",bloom:[7,8],peak:[7,8],peakText:"July\u2013August",dur:8,hMin:30,hMax:80,wMin:45,wMax:60,ttf:1,ttfText:"1\u20132 years",attr:["bee"],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Fresh periwinkle blooms daily; key for short-tongued bees."},
 {id:"primrose",common:"Yellow Evening Primrose",sci:"Oenothera biennis",color:"yellow",bloom:[6,7,8,9],peak:[7,8],peakText:"June\u2013September",dur:12,hMin:60,hMax:180,wMin:30,wMax:60,ttf:2,ttfText:"Biennial (2 yr)",attr:["moth"],nfix:false,colonizer:null,zone:"general",feed:"adaptable",moist:"mesic",benefit:"Night-blooming; relies on sphinx moths for pollination."},
 {id:"milkweed",common:"Showy Milkweed",sci:"Asclepias speciosa",color:"pinkred",bloom:[6,7,8],peak:[7],peakText:"June\u2013August",dur:8,hMin:60,hMax:150,wMin:30,wMax:60,ttf:2,ttfText:"2 years",attr:["butterfly","bee"],nfix:false,colonizer:"spreading",zone:"general",feed:"adaptable",moist:"mesic",benefit:"Primary larval host for the Monarch butterfly; spreads moderately by rhizome into colonies."},
 {id:"redlily",common:"Western Red Lily",sci:"Lilium philadelphicum",color:"pinkred",bloom:[7,8],peak:[7],peakText:"July\u2013August",dur:4,hMin:30,hMax:90,wMin:15,wMax:30,ttf:3,ttfText:"3\u20135 years",attr:["butterfly"],nfix:false,colonizer:null,zone:"climax",feed:"humus",moist:"moist",benefit:"Saskatchewan's floral emblem; flame-coloured. Resents vigorous neighbours - keep in the climax zone."},
 {id:"bergamot",common:"Bergamot",sci:"Monarda fistulosa",color:"purple",bloom:[7,8],peak:[7],peakText:"July\u2013August",dur:8,hMin:60,hMax:120,wMin:60,wMax:90,ttf:2,ttfText:"2 years",attr:["hummingbird","butterfly","bee"],nfix:false,colonizer:"spreading",zone:"general",feed:"adaptable",moist:"mesic",benefit:"Premium nectar for hummingbirds and swallowtails; clumps spread by rhizome."},
 {id:"gaillardia",common:"Gaillardia",sci:"Gaillardia aristata",color:"yellow",bloom:[7,8,9],peak:[7,8],peakText:"July\u2013September",dur:10,hMin:30,hMax:75,wMin:30,wMax:60,ttf:1,ttfText:"1\u20132 years",attr:["bee","butterfly"],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Long-blooming, drought-tough daisies for native bees."},
 {id:"blackeyed",common:"Black-eyed Susan",sci:"Rudbeckia hirta",color:"yellow",bloom:[7,8],peak:[7,8],peakText:"July\u2013August",dur:6,hMin:30,hMax:90,wMin:30,wMax:60,ttf:1,ttfText:"1\u20132 years",attr:["bee","butterfly"],nfix:false,colonizer:null,zone:"buffer",feed:"adaptable",moist:"mesic",benefit:"Fast pioneer that establishes rapid floral cover."},
 {id:"purpleclover",common:"Purple Prairie Clover",sci:"Dalea purpurea",color:"purple",bloom:[7,8,9],peak:[7,8],peakText:"July\u2013September",dur:8,hMin:30,hMax:90,wMin:30,wMax:45,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:true,colonizer:null,zone:"buffer",feed:"lean",moist:"dry",benefit:"Nitrogen-fixer and premium pollen source; taproot cracks hardpan."},
 {id:"whiteclover",common:"White Prairie Clover",sci:"Dalea candida",color:"white",bloom:[7,8,9],peak:[7,8],peakText:"July\u2013September",dur:8,hMin:30,hMax:90,wMin:30,wMax:60,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:true,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Nitrogen-fixer; blooms just after its purple sister species."},
 {id:"coneflower",common:"Prairie Coneflower",sci:"Ratibida columnifera",color:"yellow",bloom:[7,8,9],peak:[7,8],peakText:"July\u2013September",dur:10,hMin:30,hMax:90,wMin:30,wMax:60,ttf:1,ttfText:"1\u20132 years",attr:["bee","butterfly"],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Drought-resistant; draws a diverse guild of insects."},
 {id:"meadowblazing",common:"Meadow Blazingstar",sci:"Liatris ligulistylis",color:"purple",bloom:[7,8],peak:[7],peakText:"July\u2013August",dur:6,hMin:60,hMax:150,wMin:30,wMax:50,ttf:3,ttfText:"3 years",attr:["butterfly","bee"],nfix:false,colonizer:null,zone:"general",feed:"adaptable",moist:"mesic",benefit:"The ultimate Monarch magnet; worth the slow establishment."},
 {id:"goldenaster",common:"Hairy Golden Aster",sci:"Heterotheca villosa",color:"yellow",bloom:[7,8,9],peak:[7,8],peakText:"July\u2013September",dur:8,hMin:15,hMax:60,wMin:25,wMax:60,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:false,colonizer:"spreading",zone:"general",feed:"lean",moist:"dry",benefit:"Forms low golden mats on dry, sandy ground; self-seeds freely."},
 {id:"prairiesage",common:"Prairie Sage",sci:"Artemisia ludoviciana",color:"white",bloom:[7,8,9],peak:[7,8],peakText:"July\u2013September",dur:8,hMin:30,hMax:90,wMin:60,wMax:120,ttf:2,ttfText:"2 years",attr:["butterfly"],nfix:false,colonizer:"aggressive",zone:"colonizer",feed:"lean",moist:"dry",benefit:"Silver foliar accent and Painted Lady host - but a strong rhizomatous spreader (effectively indefinite)."},
 {id:"pasturesage",common:"Pasture Sage",sci:"Artemisia frigida",color:"yellow",bloom:[6,7,8],peak:[7],peakText:"June\u2013August",dur:8,hMin:10,hMax:45,wMin:30,wMax:60,ttf:2,ttfText:"2 years",attr:[],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Fine silver foliage; extreme drought tolerance (wind-pollinated)."},
 {id:"dottedblazing",common:"Dotted Blazingstar",sci:"Liatris punctata",color:"purple",bloom:[8,9,10],peak:[9],peakText:"August\u2013October",dur:8,hMin:30,hMax:75,wMin:25,wMax:30,ttf:2,ttfText:"2\u20133 years",attr:["butterfly","bee"],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"Deep taproot; vital late-season nectar into October. One of the shortest blazingstars."},
 {id:"smoothaster",common:"Smooth Aster",sci:"Symphyotrichum laeve",color:"purple",bloom:[8,9],peak:[8],peakText:"August\u2013September",dur:6,hMin:60,hMax:120,wMin:30,wMax:60,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:false,colonizer:null,zone:"general",feed:"adaptable",moist:"mesic",benefit:"Resilient late source of pollen and nectar; stays upright."},
 {id:"lindleyaster",common:"Lindley's Aster",sci:"Symphyotrichum ciliolatum",color:"purple",bloom:[8,9],peak:[8],peakText:"August\u2013September",dur:6,hMin:30,hMax:120,wMin:30,wMax:60,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:false,colonizer:"spreading",zone:"general",feed:"adaptable",moist:"mesic",benefit:"Performs well in partial / dappled shade; spreads by long rhizomes into colonies."},
 {id:"manyflower",common:"Many-Flowered Aster",sci:"Symphyotrichum ericoides",color:"white",bloom:[8,9,10],peak:[9],peakText:"August\u2013October",dur:8,hMin:30,hMax:90,wMin:30,wMax:60,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:false,colonizer:"spreading",zone:"general",feed:"lean",moist:"dry",benefit:"Profuse late bloom critical for late solitary bees; rhizomatous, can spread ~30 cm/year."},
 {id:"stiffgold",common:"Stiff Goldenrod",sci:"Solidago rigida",color:"yellow",bloom:[8,9,10],peak:[9],peakText:"August\u2013October",dur:8,hMin:60,hMax:150,wMin:45,wMax:75,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:false,colonizer:null,zone:"general",feed:"adaptable",moist:"mesic",benefit:"Flat-topped clusters carry heavy late-season insect loads. A tall plant (to ~1.5 m) and a heavy self-seeder."},
 {id:"canadagold",common:"Canada Goldenrod",sci:"Solidago canadensis",color:"yellow",bloom:[8,9,10],peak:[9],peakText:"August\u2013October",dur:8,hMin:60,hMax:180,wMin:60,wMax:90,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:false,colonizer:"aggressive",zone:"colonizer",feed:"adaptable",moist:"mesic",benefit:"High-yield autumn resource, but one of the most aggressive native colonizers - contain it firmly."},
 {id:"mountaingold",common:"Mountain Goldenrod",sci:"Solidago simplex",color:"yellow",bloom:[8,9,10],peak:[9],peakText:"August\u2013October",dur:8,hMin:20,hMax:80,wMin:30,wMax:60,ttf:2,ttfText:"2 years",attr:["bee","butterfly"],nfix:false,colonizer:null,zone:"general",feed:"lean",moist:"dry",benefit:"The best-behaved goldenrod here; compact, clump-forming front-of-border plant."}
];
const byId = id => SPECIES.find(s=>s.id===id);
const BUY = {
  crocus:'https://www.growwildflowers.ca/products/prairie-crocus-anemone-patens-seeds',
  blueeyed:'https://www.growwildflowers.ca/products/blue-eyed-grass',
  avens:'https://www.growwildflowers.ca/products/three-flowered-avens-geum-triflorum',
  bedstraw:'https://www.growwildflowers.ca/products/northern-bedstraw',
  anemone:'https://www.growwildflowers.ca/products/cut-leaved-anemone-anemone-multifida',
  alumroot:'https://www.growwildflowers.ca/products/alumroot-heuchera-richardsonii',
  hedysarum:'https://www.growwildflowers.ca/products/northern-hedysarum-hedysarum-boreale',
  yarrow:'https://www.growwildflowers.ca/products/yarrow-achillea-millefolium',
  harebell:'https://www.growwildflowers.ca/products/harebell-campanula-rotundifolia',
  hyssop:'https://www.growwildflowers.ca/products/giant-hyssop-agastache-foeiculum-1',
  flax:'https://www.growwildflowers.ca/products/wild-blue-flax-linum-lewisii',
  primrose:'https://www.growwildflowers.ca/products/yellow-evening-primrose-oenthera-biennis',
  milkweed:'https://www.growwildflowers.ca/products/copy-of-dwarf-milkweed',
  redlily:'https://www.growwildflowers.ca/products/western-red-lily',
  bergamot:'https://www.growwildflowers.ca/products/bergamot-monarda-fistulosa',
  gaillardia:'https://www.growwildflowers.ca/products/gaillardia-gaillardia-aristata',
  blackeyed:'https://www.growwildflowers.ca/products/black-eyed-susan-rubdeckia-hirta',
  purpleclover:'https://www.growwildflowers.ca/products/purple-prairie-clover-dalea-purpureum',
  whiteclover:'https://www.growwildflowers.ca/products/white-prairie-clover',
  coneflower:'https://www.growwildflowers.ca/products/prairie-coneflower-ratibida-columnifera',
  meadowblazing:'https://www.growwildflowers.ca/products/meadow-blazingstar-liatrus-ligulistylis',
  goldenaster:'https://www.growwildflowers.ca/products/hairy-golden-aster-chrysopsis-villosa',
  prairiesage:'https://www.growwildflowers.ca/products/prairie-sage',
  pasturesage:'https://www.growwildflowers.ca/products/pasture-sage',
  dottedblazing:'https://www.growwildflowers.ca/products/dotted-blazingstar-liatrus-punctata',
  smoothaster:'https://www.growwildflowers.ca/products/smooth-aster',
  lindleyaster:'https://www.growwildflowers.ca/products/lindleys-aster-aster-ciliolatus',
  manyflower:'https://www.growwildflowers.ca/products/many-flowered-aster',
  stiffgold:'https://www.growwildflowers.ca/products/stiff-goldenrod-solidgo-rigida',
  canadagold:'https://www.growwildflowers.ca/products/copy-of-mountain-goldenrod',
  mountaingold:'https://www.growwildflowers.ca/products/mountain-goldenrod-solidgo-spathulata'
};
const ABOUT = {
  crocus:`Manitoba's floral emblem, chosen by schoolchildren in 1906, and one of the very first prairie flowers of spring - often opening through the last melting snow. Silvery hairs cloak its stems and buds like a fur coat to trap warmth, and as it sets seed it forms feathery silver plumes. Also called the pasque flower for blooming around Easter; every part is poisonous, and its woody taproot dislikes being moved.`,
  blueeyed:`Despite the name it isn't a grass at all, but a miniature member of the iris family - the six-pointed blue star and flattened fans of leaves give it away up close. The dainty flowers open in morning sun and close by afternoon, scattering points of blue through moist meadows.`,
  avens:`Loved less for its nodding, dusky-pink spring flowers than for what follows: feathery smoke-pink seed plumes that shimmer in drifts across the prairie, earning the name "prairie smoke." The closed, urn-shaped blooms are an early nectar source that bumblebees buzz to shake the pollen loose.`,
  bedstraw:`A froth of tiny, honey-scented white flowers in early summer. The name recalls its old use as a sweet-smelling mattress stuffing; like others in the genus Galium the dried foliage carries the hay scent of coumarin, and it was once used to curdle milk for cheese. Spreads happily by rhizome.`,
  anemone:`Also called thimbleweed for its tall, thimble-shaped seed heads, which burst into conspicuous tufts of cotton-like fluff that linger into winter. The modest greenish-white flowers are quietly upstaged by those woolly seed columns. Toxic, so deer and rabbits leave it alone.`,
  alumroot:`A true native coral-bells, grown as much for its handsome mound of scalloped, maple-like leaves as for its airy sprays of tiny green bells - which reward a close look, bright orange stamens poking past the petals. "Alumroot" refers to the astringent, alum-like root once used in folk remedies. Visited by specialist native bees.`,
  hedysarum:`A nitrogen-fixing legume strung with wands of magenta pea-flowers and curious seedpods that break into bead-like links, like a necklace. Its licorice-flavoured roots were a traditional Indigenous food and remain a prized spring and autumn dig for grizzly and black bears.`,
  yarrow:`One of the oldest healing herbs known - its genus Achillea honours Achilles, said to have carried it to staunch soldiers' wounds. Tough, aromatic and fern-leaved, with flat-topped flower heads that serve as a landing pad for swarms of small pollinators. Vigorous enough that it's best where it can roam.`,
  harebell:`The "bluebell of Scotland" - violet-blue bells dangling from threadlike stems that tremble in the faintest breeze yet shrug off drought, wind and thin rocky soil. It looks impossibly delicate but is one of the toughest plants on the prairie, flowering much of the summer.`,
  hyssop:`Crush a leaf and it gives off a sweet anise-licorice scent; the leaves and flower spikes brew into a fragrant tea. One of the finest nectar plants of the prairie - bees, butterflies and hummingbirds work its lavender spikes for weeks, and beekeepers prize it as a honey plant. Self-sows freely.`,
  flax:`Named for Meriwether Lewis, who documented it on the Lewis & Clark expedition. Each satiny sky-blue flower lasts only a single morning, opening at dawn and dropping its petals by midday - but it blooms in such profusion on wiry, nodding stems that it never seems to pause. A wild cousin of the flax that gives us linen.`,
  primrose:`A creature of dusk - its lemon-yellow flowers open in the evening and release a soft citrus scent to draw night-flying moths, then fade by the next afternoon. A biennial pioneer of disturbed ground whose seed-filled capsules feed goldfinches and other birds through winter.`,
  milkweed:`The quintessential monarch plant - the only food monarch caterpillars can eat - crowned with spheres of intricate, star-shaped pink flowers that perfume the air with a honey-vanilla sweetness. Its sculptural pods split in autumn to release silk-borne seeds on the wind.`,
  redlily:`Saskatchewan's floral emblem and the province's only native lily, so treasured that provincial law forbids picking or digging it. Its flaming orange-red, upward-facing blooms are a rare jewel of the grassland, pollinated by butterflies and day-flying sphinx moths. Never lift it from the wild - grow it from seed.`,
  bergamot:`Wild bee-balm - a mint-family plant whose ragged lavender pompoms hum with bees, butterflies and hummingbird moths. The foliage is intensely aromatic, a spicy oregano-thyme scent from its thymol oils, and was widely steeped into medicinal and beverage teas by Indigenous peoples and settlers alike.`,
  gaillardia:`The blanketflower, named for warm bands of red and gold said to recall woven Indigenous blankets. A cheerful, sun-loving, drought-proof bloomer that flowers tirelessly all summer and actively prefers poor soil - pampering only makes it flop. Short-lived, but it self-sows to stick around.`,
  blackeyed:`A bold, dark-eyed golden daisy and a classic pioneer - quick to colonize bare and disturbed ground, blooming hard in its first year or two before making way for longer-lived neighbours. Unfussy, endlessly cheerful, and a generous late-summer nectar source; birds strip the seed heads in fall.`,
  purpleclover:`A nitrogen-fixing legume that quietly feeds the soil while sending up vivid magenta thimbles ringed by a halo of bright orange stamens that open from the bottom up. Deep-rooted, drought-hardy, and among the highest-value forage and pollinator plants of the native prairie.`,
  whiteclover:`The white-flowered twin of purple prairie clover, with the same soil-enriching, nitrogen-fixing roots, deep taproot and high value to bees. Cylindrical cream-white heads bloom in a ring that climbs the spike through summer - a tough, lean-soil specialist and excellent forage.`,
  coneflower:`The "Mexican hat" - drooping yellow rays skirting a tall, sombrero-like central cone, which smells faintly of anise when crushed. Wonderfully drought-tolerant and long-blooming, it sways on slender stems and self-sows into easygoing colonies.`,
  meadowblazing:`The single best plant here for monarch butterflies: its purple wands bloom in late summer exactly as monarchs fuel up for migration, and a good stand can host dozens at once. Unusually, the spikes open from the top down - and goldfinches devour the seeds once they do.`,
  goldenaster:`A low, silvery-hairy mound smothered in small golden daisies through the heat of summer. A genuine tough-as-nails dryland plant, thriving in sand and gravel where little else will, and a dependable nectar stop for late-season bees and butterflies.`,
  prairiesage:`The silver-leaved sage central to Plains Indigenous ceremony - Dakota, Cree, Blackfoot and other nations use it for smudging, sweat lodges and the sun dance, and it serves as an ethical native alternative to over-harvested California white sage. Aromatic, drought-proof silver foliage that spreads assertively by rhizome.`,
  pasturesage:`A low, fragrant, fringed silver cushion - sometimes called fringed sage - whose finely cut foliage releases a strong sage scent when brushed. A pioneer of dry, disturbed and overgrazed ground (its abundance is a classic sign of range stress) and a soft silver texture for the front of a planting.`,
  dottedblazing:`A drought champion whose taproot can plunge several metres down to reach water, letting it flower through the dry tail of summer when little else does. Spikes of fluffy purple flowers open top-down and swarm with bees and butterflies on the late-season prairie.`,
  smoothaster:`Smooth, blue-green foliage topped in autumn by clouds of lavender-blue daisies - one of the prairie's vital last nectar bars, fuelling migrating monarchs and late bumblebee queens before frost. Pairs naturally with goldenrods for the classic fall gold-and-purple finale.`,
  lindleyaster:`A woodland-edge aster carrying sprays of soft violet daisies well into fall, at home in the dappled light where many prairie plants sulk. Like its kin, it's a crucial late-season nectar source as bees and butterflies head toward winter.`,
  manyflower:`Heath aster - a dense, shrubby spray that foams with hundreds of tiny white daisies each autumn, a late feast for small native bees and butterflies. Wiry and tough, it spreads into drifts on dry, open ground.`,
  stiffgold:`A statuesque goldenrod with broad, stiff leaves and big flat-topped heads of gold - a magnet for the season's last bees, butterflies, soldier beetles and passing monarchs. And contrary to its reputation, goldenrod doesn't cause hay fever: its heavy pollen is carried by insects, not wind (blame ragweed).`,
  canadagold:`A vigorous, running goldenrod that lights up late summer with arching plumes of gold and feeds an enormous range of pollinators and beneficial insects. Often wrongly blamed for hay fever, though its sticky pollen is insect-carried, not airborne. Give it room - it colonizes with gusto.`,
  mountaingold:`A tidier, far better-behaved goldenrod than its running cousins, forming neat clumps of golden plumes in late summer. All the late-season pollinator value of a goldenrod without the aggressive spread - an easy fit for a smaller bed.`
};
const SRC = {
  crocus:[["USask","https://gardening.usask.ca/articles-and-lists/articles-plant-descriptions/native-plants/prairie-crocus.php"],["Province of Manitoba","https://residents.gov.mb.ca/reference.html?d=details&program_id=5902"]],
  blueeyed:[["LBJ Wildflower Center","https://www.wildflower.org/plants/result.php?id_plant=SIMO2"],["Wisconsin Hort.","https://hort.extension.wisc.edu/articles/blue-eyed-grass-sisyrinchium/"]],
  avens:[["Wikipedia","https://en.wikipedia.org/wiki/Geum_triflorum"],["Wisconsin Hort.","https://hort.extension.wisc.edu/articles/prairie-smoke-geum-triflorum/"]],
  bedstraw:[["Wikipedia","https://en.wikipedia.org/wiki/Galium_boreale"],["Friends of Eloise Butler","https://friendsofeloisebutler.org/pages/plants/northernbedstraw.html"]],
  anemone:[["Prairie Moon","https://www.prairiemoon.com/anemone-cylindrica-thimbleweed"],["Minnesota Wildflowers","https://www.minnesotawildflowers.info/flower/thimbleweed"]],
  alumroot:[["Missouri Botanical Garden","https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=g530"],["Johnson's Nursery","https://kb.jniplants.com/prairie-alumroot-heuchera-richardsonii"]],
  hedysarum:[["Friends of Kananaskis","https://kananaskis.org/hedysarum/"],["Galt Museum","https://www.galtmuseum.com/ethnobotany-1/northern-hedysarum"]],
  yarrow:[["Wikipedia","https://en.wikipedia.org/wiki/Achillea_millefolium"]],
  harebell:[["Wikipedia","https://en.wikipedia.org/wiki/Campanula_rotundifolia"],["Prairie Nursery","https://www.prairienursery.com/harebell-campanula-rotundifolia.html"]],
  hyssop:[["Wisconsin Hort.","https://hort.extension.wisc.edu/articles/anise-hyssop-agastache-foeniculum/"],["Prairie Moon","https://www.prairiemoon.com/agastache-foeniculum-anise-hyssop"]],
  flax:[["Wikipedia","https://en.wikipedia.org/wiki/Linum_lewisii"],["NC State Extension","https://plants.ces.ncsu.edu/plants/linum-lewisii/"]],
  primrose:[["Missouri Botanical Garden","https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=283027"],["Prairie Moon","https://www.prairiemoon.com/oenothera-biennis-common-evening-primrose"]],
  milkweed:[["LBJ Wildflower Center","https://www.wildflower.org/plants/result.php?id_plant=assp"],["Hennepin Master Gardeners","https://hennepinmastergardeners.org/milkweed-and-monarchs/"]],
  redlily:[["Prairie Lily Society","https://www.prairielilysociety.ca/lily-culture-list/western-red-lily.html"],["Canadian Wildlife Federation","https://cwf-fcf.org/en/news/articles/150th/provincial-and-territorial.html"]],
  bergamot:[["Wikipedia","https://en.wikipedia.org/wiki/Monarda_fistulosa"],["Prairie Moon","https://www.prairiemoon.com/monarda-fistulosa-wild-bergamot"]],
  gaillardia:[["Wisconsin Hort.","https://hort.extension.wisc.edu/articles/blanket-flower-gaillardia-spp/"],["Wikipedia","https://en.wikipedia.org/wiki/Gaillardia_aristata"]],
  blackeyed:[["Illinois Wildflowers","https://illinoiswildflowers.info/prairie/plantx/be_susanx.htm"],["Prairie Moon","https://www.prairiemoon.com/rudbeckia-hirta-black-eyed-susan"]],
  purpleclover:[["Wikipedia","https://en.wikipedia.org/wiki/Dalea_purpurea"],["Prairie Nursery","https://www.prairienursery.com/purple-prairie-clover-dalea-purpurea.html"]],
  whiteclover:[["Prairie Nursery","https://www.prairienursery.com/white-prairie-clover-dalea-candida.html"],["NC State Extension","https://plants.ces.ncsu.edu/plants/dalea-candida/"]],
  coneflower:[["Wikipedia","https://en.wikipedia.org/wiki/Ratibida_columnifera"],["USDA Fact Sheet","https://plants.sc.egov.usda.gov/DocumentLibrary/factsheet/pdf/fs_raco3.pdf"]],
  meadowblazing:[["Prairie Moon","https://www.prairiemoon.com/liatris-ligulistylis-meadow-blazing-star"],["Monarch Butterfly Garden","https://monarchbutterflygarden.net/butterfly-plants/liatris-ligulistylis/"]],
  goldenaster:[["Prairie Moon","https://www.prairiemoon.com/heterotheca-villosa-hairy-golden-aster"],["Gardenia","https://www.gardenia.net/plant/heterotheca-villosa"]],
  prairiesage:[["Wikipedia","https://en.wikipedia.org/wiki/Artemisia_ludoviciana"],["Prairie Moon","https://www.prairiemoon.com/artemisia-ludoviciana-prairie-sage"]],
  pasturesage:[["Wikipedia","https://en.wikipedia.org/wiki/Artemisia_frigida"],["USDA FEIS","https://www.fs.usda.gov/database/feis/plants/shrub/artfri/all.html"]],
  dottedblazing:[["Wikipedia","https://en.wikipedia.org/wiki/Liatris_punctata"],["Prairie Moon","https://www.prairiemoon.com/liatris-punctata-dotted-blazing-star"]],
  smoothaster:[["NC State Extension","https://plants.ces.ncsu.edu/plants/symphyotrichum-laeve/"],["Lake Superior Conservancy","https://superiorconservancy.org/2023/10/30/autumn-nectar-for-bees-and-butterflies-ontarios-native-asters/"]],
  lindleyaster:[["Lake Superior Conservancy","https://superiorconservancy.org/2023/10/30/autumn-nectar-for-bees-and-butterflies-ontarios-native-asters/"],["In Our Nature","https://www.inournature.ca/best-native-asters-for-your-garden"]],
  manyflower:[["In Our Nature","https://www.inournature.ca/best-native-asters-for-your-garden"],["Lake Superior Conservancy","https://superiorconservancy.org/2023/10/30/autumn-nectar-for-bees-and-butterflies-ontarios-native-asters/"]],
  stiffgold:[["Illinois Extension","https://extension.illinois.edu/blogs/good-growing/2022-10-21-autumn-allergies-dont-blame-goldenrod"],["National Wildlife Federation","https://blog.nwf.org/2014/09/the-goldenrod-allergy-myth/"]],
  canadagold:[["Illinois Extension","https://extension.illinois.edu/blogs/good-growing/2022-10-21-autumn-allergies-dont-blame-goldenrod"],["Prairie Up","https://prairieup.com/goldenrod-doesnt-cause-hayfever-here-are-some-good-ones-to-grow/"]],
  mountaingold:[["Prairie Up","https://prairieup.com/goldenrod-doesnt-cause-hayfever-here-are-some-good-ones-to-grow/"],["Prairie Moon (Solidago)","https://www.prairiemoon.com/solidago-speciosa-showy-goldenrod"]]
};


/* ---------- edibility / toxicity (each Edible/Toxic tag is web-sourced) ----------
   Plants not listed here are "neither" (no notable edible or toxic use).
   These are general guidance, NOT a foraging authority: confirm ID with an
   expert before eating any wild plant, and keep toxic species from kids & pets. */
const EDTOX = {
  /* --- toxic --- */
  crocus:{t:"toxic",note:"Buttercup family - all parts contain protoanemonin; poisonous if eaten and can blister skin.",src:["USDA Forest Service","https://www.fs.usda.gov/wildflowers/plant-of-the-week/pulsatilla_patens_multifida.shtml"]},
  anemone:{t:"toxic",note:"All parts poisonous (protoanemonin); irritates the mouth and gut, and the sap can blister skin.",src:["NC State Extension","https://plants.ces.ncsu.edu/plants/anemone/"]},
  milkweed:{t:"toxic",note:"All parts contain cardiac glycosides - toxic to people, pets and livestock; milky sap irritates skin and eyes.",src:["Univ. of Wisconsin\u2013Madison Horticulture","https://hort.extension.wisc.edu/articles/milkweed-ornamental-plants-toxic-to-animals/"]},
  redlily:{t:"toxic",note:"A true lily - even tiny amounts cause fatal kidney failure in cats. Also a protected species, so never harvest it.",src:["Pet Poison Helpline","https://www.petpoisonhelpline.com/poison/wood-lily/"]},
  prairiesage:{t:"toxic",note:"Contains thujone; the FDA lists Artemisia as an unsafe herb, poisonous in large doses. Used ceremonially, not as food.",src:["USDA NRCS Plant Guide","https://plants.sc.egov.usda.gov/DocumentLibrary/plantguide/pdf/cs_arlu.pdf"]},
  pasturesage:{t:"toxic",note:"Contains thujone; the FDA lists Artemisia as an unsafe herb, poisonous in large doses. Used ceremonially, not as food.",src:["USDA NRCS Plant Guide","https://plants.usda.gov/DocumentLibrary/plantguide/pdf/cs_arfr4.pdf"]},
  flax:{t:"toxic",note:"Raw plant and seeds are cyanogenic (release cyanide) and toxic to livestock; seeds are edible only after cooking.",src:["NC State Extension","https://plants.ces.ncsu.edu/plants/linum-lewisii/"]},
  /* --- edible --- */
  yarrow:{t:"edible",note:"Young leaves and flowers go in salads or make an aromatic tea (in moderation; avoid in pregnancy).",src:["Wikipedia","https://en.wikipedia.org/wiki/Achillea_millefolium"]},
  bergamot:{t:"edible",note:"Leaves and flowers are edible - a minty, oregano-like flavour used fresh, as seasoning, or as tea.",src:["Lady Bird Johnson Wildflower Center","https://www.wildflower.org/plants/result.php?id_plant=mofi"]},
  hyssop:{t:"edible",note:"Anise-scented leaves, flowers and seeds are used in salads, baking and tea.",src:["NC State Extension","https://plants.ces.ncsu.edu/plants/agastache-foeniculum/"]},
  avens:{t:"edible",note:"A decoction of the roots makes a weak, sassafras-like tea.",src:["Plants For A Future","https://pfaf.org/user/Plant.aspx?LatinName=Geum+triflorum"]},
  harebell:{t:"edible",note:"Leaves and flowers are edible - mild flavour, used in salads and as a garnish.",src:["Plants For A Future","https://pfaf.org/user/Plant.aspx?LatinName=Campanula+rotundifolia"]},
  bedstraw:{t:"edible",note:"Roasted seeds make a caffeine-free coffee substitute; leaves and flowers make tea - use sparingly, it can irritate the mouth.",src:["Utah State University Extension","https://extension.usu.edu/rangeplants/forbs-herbaceous/northern-bedstraw"]},
  primrose:{t:"edible",note:"Roots and young shoots are edible and the seeds are oil-rich; best harvested in the first year.",src:["Lady Bird Johnson Wildflower Center","https://www.wildflower.org/plants/result.php?id_plant=OEBI"]},
  purpleclover:{t:"edible",note:"Leaves make a nutritious tea; the roots were chewed for their sweet flavour.",src:["NC State Extension","https://plants.ces.ncsu.edu/plants/dalea-purpurea/"]},
  whiteclover:{t:"edible",note:"Like purple prairie clover - leaves for tea, roots chewed; one of the few prairie clovers worth eating.",src:["Forager Chef","https://foragerchef.com/purple-prairie-clover/"]},
  coneflower:{t:"edible",note:"A pleasant tea is made from the leaves and flower heads.",src:["USDA NRCS Plant Guide","https://plants.usda.gov/DocumentLibrary/plantguide/pdf/pg_raco3.pdf"]},
  dottedblazing:{t:"edible",note:"The starchy roots/corms were baked and eaten by many prairie peoples.",src:["Eat The Weeds (Moerman)","https://www.eattheweeds.com/liatris-dotted-blazing-star/"]},
  stiffgold:{t:"edible",note:"Goldenrod - flowers and leaves (fresh or dried) make tea, and young leaves are edible.",src:["Edible Wild Food","https://www.ediblewildfood.com/goldenrod.aspx"]},
  canadagold:{t:"edible",note:"Goldenrod - flowers and leaves (fresh or dried) make tea, and young leaves are edible.",src:["iNaturalist Canada","https://inaturalist.ca/posts/84112-plant-of-the-month-goldenrod-solidago"]},
  mountaingold:{t:"edible",note:"Goldenrod - flowers and leaves make tea; this species (S. simplex) is among those noted as edible.",src:["iNaturalist Canada","https://inaturalist.ca/posts/84112-plant-of-the-month-goldenrod-solidago"]}
};
