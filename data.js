// ─── Utilities ────────────────────────────────────────────────────────────────
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Part Slots ───────────────────────────────────────────────────────────────
const SLOTS = ['engine', 'tires', 'suspension', 'brakes', 'boost', 'aero', 'transmission'];

const SLOT_LABELS = {
  engine: 'Engine', tires: 'Tires', suspension: 'Suspension',
  brakes: 'Brakes', boost: 'Boost', aero: 'Aero', transmission: 'Transmission'
};

const SLOT_ICONS = {
  engine: '&#9881;', tires: '&#9711;', suspension: '&#126;',
  brakes: '&#9632;', boost: '&#187;', aero: '&#94;', transmission: '&#9889;'
};

// ─── Parts Catalogue ──────────────────────────────────────────────────────────
// quality: 1-99  price: buy cost  sell: resale value (0 = starter, can't sell)
const PARTS_CATALOGUE = {
  engine: [
    { id:'eng-1', name:'Stock 1.2L Engine',    quality:18, price:0,     sell:0,     desc:'Factory commuter engine.' },
    { id:'eng-2', name:'1.6L Sport Engine',    quality:36, price:1500,  sell:900,   desc:'Street performance tune.' },
    { id:'eng-3', name:'2.0L Turbo Engine',    quality:54, price:5000,  sell:3000,  desc:'Turbocharged track power.' },
    { id:'eng-4', name:'V6 Sport Engine',      quality:70, price:12000, sell:7200,  desc:'Six-cylinder performance.' },
    { id:'eng-5', name:'V8 Race Engine',       quality:84, price:26000, sell:15600, desc:'Championship-grade V8.' },
    { id:'eng-6', name:'Formula Race Engine',  quality:97, price:50000, sell:30000, desc:'Full race specification.' },
  ],
  tires: [
    { id:'tir-1', name:'All-Season Tires',     quality:18, price:0,    sell:0,    desc:'Everyday road rubber.' },
    { id:'tir-2', name:'Performance Tires',    quality:38, price:800,  sell:480,  desc:'Improved grip compound.' },
    { id:'tir-3', name:'Semi-Slick Tires',     quality:57, price:2000, sell:1200, desc:'Track-focused rubber.' },
    { id:'tir-4', name:'Slick Tires',          quality:74, price:4500, sell:2700, desc:'No tread, maximum grip.' },
    { id:'tir-5', name:'Championship Slicks',  quality:91, price:9000, sell:5400, desc:'Race-spec compound.' },
  ],
  suspension: [
    { id:'sus-1', name:'Stock Suspension',     quality:18, price:0,     sell:0,    desc:'Factory comfort setting.' },
    { id:'sus-2', name:'Lowering Springs',     quality:34, price:600,   sell:360,  desc:'Lower CoG, firmer ride.' },
    { id:'sus-3', name:'Coilover Kit',         quality:52, price:2500,  sell:1500, desc:'Adjustable ride height.' },
    { id:'sus-4', name:'Sport Coilovers',      quality:70, price:6000,  sell:3600, desc:'Track-tuned geometry.' },
    { id:'sus-5', name:'Race Suspension',      quality:88, price:14000, sell:8400, desc:'Full race setup.' },
  ],
  brakes: [
    { id:'brk-1', name:'Stock Brakes',         quality:18, price:0,     sell:0,    desc:'Factory disc brakes.' },
    { id:'brk-2', name:'Sport Brake Kit',      quality:36, price:700,   sell:420,  desc:'Vented discs and pads.' },
    { id:'brk-3', name:'Big Brake Kit',        quality:54, price:2200,  sell:1320, desc:'Larger rotors.' },
    { id:'brk-4', name:'Brembo Brakes',        quality:72, price:5500,  sell:3300, desc:'Italian premium braking.' },
    { id:'brk-5', name:'Carbon Ceramic Brakes',quality:92, price:14000, sell:8400, desc:'Race-weight ceramics.' },
  ],
  boost: [
    { id:'bst-0', name:'Naturally Aspirated',  quality:15, price:0,     sell:0,     desc:'No forced induction.' },
    { id:'bst-1', name:'Cold Air Intake',      quality:28, price:400,   sell:240,   desc:'Minor power gains.' },
    { id:'bst-2', name:'Turbo Kit',            quality:50, price:5500,  sell:3300,  desc:'Turbocharger kit.' },
    { id:'bst-3', name:'Twin Turbo Kit',       quality:70, price:14000, sell:8400,  desc:'Dual turbo setup.' },
    { id:'bst-4', name:'Supercharger',         quality:82, price:20000, sell:12000, desc:'Crank-driven boost.' },
    { id:'bst-5', name:'Race Supercharger',    quality:95, price:38000, sell:22800, desc:'Full race blower.' },
  ],
  aero: [
    { id:'aer-0', name:'Stock Body',           quality:12, price:0,     sell:0,     desc:'Factory aerodynamics.' },
    { id:'aer-1', name:'Front Lip Spoiler',    quality:26, price:400,   sell:240,   desc:'Minor aero tweak.' },
    { id:'aer-2', name:'Rear Wing + Splitter', quality:44, price:1500,  sell:900,   desc:'Basic downforce package.' },
    { id:'aer-3', name:'Full Body Kit',        quality:60, price:5000,  sell:3000,  desc:'Complete aero body.' },
    { id:'aer-4', name:'Race Aero Package',    quality:78, price:12000, sell:7200,  desc:'High-downforce setup.' },
    { id:'aer-5', name:'GT3-Spec Aero',        quality:94, price:28000, sell:16800, desc:'Maximum downforce.' },
  ],
  transmission: [
    { id:'trn-1', name:'Stock Gearbox',        quality:18, price:0,     sell:0,     desc:'Factory 5-speed.' },
    { id:'trn-2', name:'Short Shift Kit',      quality:32, price:500,   sell:300,   desc:'Faster gear changes.' },
    { id:'trn-3', name:'Sport Gearbox',        quality:50, price:2800,  sell:1680,  desc:'Close-ratio 6-speed.' },
    { id:'trn-4', name:'Limited Slip Diff',    quality:66, price:6000,  sell:3600,  desc:'Power distribution.' },
    { id:'trn-5', name:'Sequential Gearbox',   quality:83, price:16000, sell:9600,  desc:'Paddle-shift sequential.' },
    { id:'trn-6', name:'Race Sequential',      quality:97, price:32000, sell:19200, desc:'Millisecond shifts.' },
  ]
};

// ─── Tracks ───────────────────────────────────────────────────────────────────
// bias values weight each slot's contribution to lap time at this circuit
const TRACKS = [
  { name:'Silverstone',      flag:'GB', type:'Speed',     desc:'Fast sweeping corners. Engine and boost dominate.',
    bias:{ engine:1.4, tires:0.9, suspension:0.8, brakes:0.9, boost:1.3, aero:1.1, transmission:1.0 } },
  { name:'Monaco',           flag:'MC', type:'Technical', desc:'Narrow streets. Precision over raw power.',
    bias:{ engine:0.7, tires:1.2, suspension:1.5, brakes:1.5, boost:0.6, aero:1.0, transmission:1.3 } },
  { name:'Monza',            flag:'IT', type:'Speed',     desc:'Temple of speed. Top speed is everything.',
    bias:{ engine:1.6, tires:0.8, suspension:0.7, brakes:1.0, boost:1.5, aero:1.3, transmission:0.8 } },
  { name:'Nurburgring GP',   flag:'DE', type:'Balanced',  desc:'Even demands on every component.',
    bias:{ engine:1.1, tires:1.1, suspension:1.1, brakes:1.1, boost:1.0, aero:1.0, transmission:1.0 } },
  { name:'Spa-Francorchamps',flag:'BE', type:'Mixed',     desc:'High-speed sections plus tight chicanes.',
    bias:{ engine:1.2, tires:1.1, suspension:1.0, brakes:1.1, boost:1.2, aero:1.2, transmission:0.9 } },
  { name:'Suzuka',           flag:'JP', type:'Technical', desc:'Figure-eight layout rewards handling.',
    bias:{ engine:0.9, tires:1.3, suspension:1.4, brakes:1.2, boost:0.8, aero:1.0, transmission:1.2 } },
  { name:'Daytona',          flag:'US', type:'Oval',      desc:'Banking and slipstreaming at full throttle.',
    bias:{ engine:1.5, tires:0.9, suspension:0.7, brakes:0.6, boost:1.5, aero:1.4, transmission:0.8 } },
  { name:'Laguna Seca',      flag:'US', type:'Technical', desc:'Corkscrew demands perfect setup.',
    bias:{ engine:0.9, tires:1.3, suspension:1.4, brakes:1.3, boost:0.7, aero:0.9, transmission:1.3 } },
  { name:'Bathurst',         flag:'AU', type:'Mixed',     desc:'Mountain circuit punishes the brakes.',
    bias:{ engine:1.1, tires:1.1, suspension:1.2, brakes:1.2, boost:1.0, aero:1.0, transmission:1.1 } },
  { name:'Dubai Autodrome',  flag:'AE', type:'Balanced',  desc:'Modern layout with even demands.',
    bias:{ engine:1.1, tires:1.0, suspension:1.0, brakes:1.0, boost:1.1, aero:1.0, transmission:1.0 } },
];

// ─── Rivals ───────────────────────────────────────────────────────────────────
const RIVAL_DRIVERS = [
  { name:'Marco Veloce',  initRating:35 },
  { name:'Elena Storm',   initRating:40 },
  { name:'Jack Thunder',  initRating:45 },
  { name:'Sasha Nitro',   initRating:50 },
  { name:'Priya Apex',    initRating:52 },
  { name:'Carlos Fuego',  initRating:56 },
  { name:'Yuki Drift',    initRating:59 },
  { name:'Lars Turbo',    initRating:63 },
  { name:'Amara Speed',   initRating:67 },
  { name:'Finn Revs',     initRating:71 },
  { name:'Viktor Blitz',  initRating:76 },
];

// ─── Economy ──────────────────────────────────────────────────────────────────
// 12-car grid: player + 11 rivals
const PRIZE_MONEY = [50000,30000,18000,12000,8000,5000,3000,1500,800,400,200,100];
const POINTS_TABLE = [25,18,15,12,10,8,6,4,2,1,0,0];

const DIFFICULTY_SETTINGS = {
  easy:   { label:'Easy',   startBalance:25000, rivalMult:0.8,  desc:'More starting cash, slower rivals.' },
  normal: { label:'Normal', startBalance:12000, rivalMult:1.0,  desc:'Balanced challenge.' },
  hard:   { label:'Hard',   startBalance:5000,  rivalMult:1.25, desc:'Low budget, tougher competition.' },
};

// ─── Random Events ────────────────────────────────────────────────────────────
const RANDOM_EVENTS = [
  { id:'ev-sponsor',  name:'SPONSOR BONUS',     msg:'A title sponsor has injected cash into your team!',              type:'money',       value:8000 },
  { id:'ev-weather',  name:'PERFECT CONDITIONS', msg:'Weather conditions perfectly suit your setup today!',           type:'race_bonus',  value:10   },
  { id:'ev-rival',    name:'RIVAL TROUBLE',      msg:'Your rival has a technical issue in testing — weakened!',       type:'rival_debuff',value:8    },
  { id:'ev-discount', name:'PARTS SALE',         msg:'Supplier clearing stock — 25% off all parts this week!',       type:'discount',    value:0.25 },
  { id:'ev-press',    name:'MEDIA SPOTLIGHT',    msg:'Your team is in the news — bonus prize money this race!',       type:'prize_mult',  value:1.3  },
  { id:'ev-upgrade',  name:'FREE UPGRADE',       msg:'A retiring team donated a part upgrade to your garage!',       type:'free_upgrade',value:0    },
  { id:'ev-fine',     name:'TECHNICAL BREACH',   msg:'Stewards found a minor irregularity — £2,000 fine issued.',type:'fine',        value:2000 },
  { id:'ev-windfall', name:'PRIZE FUND BOOST',   msg:'Series promoter added £5,000 to the race prize fund!',   type:'prize_bonus', value:5000 },
];

// ─── League Tiers ─────────────────────────────────────────────────────────────
const LEAGUE_TIERS = [
  { name:'ROOKIE',       minWins:0  },
  { name:'AMATEUR',      minWins:1  },
  { name:'PRO RACER',    minWins:3  },
  { name:'ELITE RACER',  minWins:6  },
  { name:'ICONIC RACER', minWins:10 },
  { name:'LEGEND',       minWins:20 },
];
