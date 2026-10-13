// ============================================
// GravityFit — Body Map (anatomical fatigue visual)
// Pure module: takes a fatigue object {muscleKey: pct} and returns SVG
// markup for a front + back human figure with per-muscle coloring.
//
// The figure is drawn as ONE connected silhouette (head→neck→shoulders→
// torso→arms→legs) so it reads as a person, and each muscle region is a
// shape that sits inside that silhouette. Keeping this separate from home.js
// makes it unit-testable and easy to iterate on the anatomy.
// ============================================

// Fatigue → fill color. 0 = faint outline, then green→yellow→red with rising
// opacity so a fresh muscle reads as "quiet" and a fried one glows.
export function fatigueColor(pct) {
  if (!pct || pct === 0) return 'rgba(255,255,255,0.05)';
  let r, g, b;
  if (pct <= 33) {
    r = Math.round(34 + (pct / 33) * 187);
    g = Math.round(197 - (pct / 33) * 17);
    b = Math.round(94 - (pct / 33) * 60);
  } else if (pct <= 66) {
    const t = (pct - 33) / 33;
    r = Math.round(221 + t * 34);
    g = Math.round(180 - t * 92);
    b = Math.round(34 - t * 34);
  } else {
    const t = (pct - 66) / 34;
    r = 255;
    g = Math.round(88 - t * 68);
    b = Math.round(t * 10);
  }
  return `rgba(${r},${g},${b},${0.3 + (pct / 100) * 0.6})`;
}

// ---- One connected human silhouette (front-facing, viewBox 140×260) ----
// Symmetric about x=70. Traced head → neck → right shoulder → right arm →
// right torso → right leg → crotch → left leg → left arm → left shoulder.
const SILHOUETTE = [
  'M70,6',
  'C77,6 82,11 82,19',        // head right
  'C82,27 78,33 74,35',       // jaw right
  'C74,38 74,40 74,42',       // neck right
  'C84,44 93,49 99,57',       // right trap → shoulder point
  'C105,63 107,72 106,82',    // deltoid cap
  'C105,92 103,100 101,108',  // upper arm
  'C100,116 99,126 99,134',   // forearm
  'C99,140 97,145 94,145',    // hand outer
  'C91,145 90,140 90,134',    // hand inner
  'C90,126 92,116 94,108',    // inner forearm
  'C96,100 96,92 94,84',      // inner upper arm
  'C93,80 92,76 92,72',       // armpit
  'C91,82 89,92 88,102',      // ribcage
  'C87,112 87,122 89,132',    // waist→hip
  'C91,142 91,150 90,158',    // hip
  'C89,172 88,188 86,204',    // thigh
  'C85,216 84,228 83,240',    // calf
  'C83,248 84,253 86,256',    // ankle→foot
  'C84,259 78,259 76,256',    // foot bottom
  'C75,250 75,244 74,238',    // inner ankle
  'C73,224 72,208 71,192',    // inner calf
  'C71,180 71,168 70,158',    // inner thigh → crotch
  'C69,168 69,180 69,192',    // left inner thigh
  'C68,208 67,224 66,238',    // left inner calf
  'C65,244 65,250 64,256',    // left inner ankle
  'C62,259 56,259 54,256',    // left foot
  'C56,253 57,248 57,240',    // left ankle
  'C56,228 55,216 54,204',    // left calf
  'C52,188 51,172 50,158',    // left thigh
  'C49,150 49,142 51,132',    // left hip
  'C53,122 53,112 52,102',    // left waist
  'C51,92 49,82 48,72',       // left ribcage
  'C48,76 47,80 46,84',       // left armpit
  'C44,92 44,100 46,108',     // left inner upper arm
  'C48,116 50,126 50,134',    // left inner forearm
  'C50,140 49,145 46,145',    // left hand
  'C43,145 41,140 41,134',    // left hand outer
  'C41,126 40,116 39,108',    // left forearm
  'C37,100 35,92 34,82',      // left upper arm
  'C33,72 35,63 41,57',       // left deltoid
  'C47,49 56,44 66,42',       // left trap → shoulder
  'C66,40 66,38 66,35',       // neck left
  'C62,33 58,27 58,19',       // head left
  'C58,11 63,6 70,6',         // head top
  'Z',
].join(' ');

const HEAD = 'M70,7 C77,7 82,12 82,20 C82,28 78,34 74,36 L66,36 C62,34 58,28 58,20 C58,12 63,7 70,7 Z';
const NECK = 'M64,32 L76,32 L77,44 L63,44 Z';

// Muscle region: interactive, fills with fatigue color
const mkMuscle = (fatigue, defsId, onMuscleClick) => (d, name) => {
  const pct = fatigue[name] || 0;
  const glow = pct > 60 ? ` filter="url(#glow-${defsId})"` : '';
  const click = onMuscleClick ? `${onMuscleClick}('${name}')` : `HomeScreen.showMuscleDetail('${name}')`;
  return `<path d="${d}" fill="${fatigueColor(pct)}" stroke="rgba(255,255,255,${pct > 0 ? 0.25 : 0.12})" stroke-width="0.5" stroke-linejoin="round" style="cursor:pointer;transition:all 0.3s" onmouseover="this.style.opacity=0.8;this.style.strokeWidth=1" onmouseout="this.style.opacity=1;this.style.strokeWidth=0.5" onclick="${click}"${glow}/>`;
};

// Non-interactive anatomy line (muscle separation)
const line = (d) => `<path d="${d}" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="0.45" stroke-linecap="round" stroke-linejoin="round"/>`;

function buildView(fatigue, opts) {
  const { defsId, regions, detailLines } = opts;
  const defs = `<defs><filter id="glow-${defsId}"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const skin = `<path d="${SILHOUETTE}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" stroke-width="0.8" stroke-linejoin="round"/>`;
  const headNeck = `<path d="${HEAD}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" stroke-width="0.7" stroke-linejoin="round"/>`
    + `<path d="${NECK}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" stroke-width="0.5" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 140 260" width="112" height="204" style="display:block">`
    + defs + headNeck + skin
    + regions.join('')
    + (detailLines || []).map(line).join('')
    + '</svg>';
}

// ---- FRONT muscle regions (sit inside the silhouette) ----
function frontRegions(me) {
  return [
    // Trapezius (neck→shoulder yoke)
    me('M63,36 C66,42 74,42 77,36 L82,44 C78,50 62,50 58,44 Z', 'trapecios'),
    // Deltoids (shoulder caps)
    me('M41,57 C47,50 55,47 60,50 L58,64 C52,70 42,70 38,66 C35,63 37,60 41,57 Z', 'hombros'),
    me('M99,57 C93,50 85,47 80,50 L82,64 C88,70 98,70 102,66 C105,63 103,60 99,57 Z', 'hombros'),
    // Pectorals
    me('M48,56 C54,52 66,52 69,56 L69,60 C69,72 66,78 58,78 C51,78 47,72 46,64 Z', 'pectorals'),
    me('M92,56 C86,52 74,52 71,56 L71,60 C71,72 74,78 82,78 C89,78 93,72 94,64 Z', 'pectorals'),
    // Serratus anterior (side ribs)
    me('M46,74 C44,80 43,86 45,90 L50,86 L51,78 Z', 'serratus-anterior'),
    me('M94,74 C96,80 97,86 95,90 L90,86 L89,78 Z', 'serratus-anterior'),
    // Biceps
    me('M39,70 C35,78 34,88 36,98 L44,98 C46,88 46,78 44,70 Z', 'biceps'),
    me('M101,70 C105,78 106,88 104,98 L96,98 C94,88 94,78 96,70 Z', 'biceps'),
    // Core / abs (six-pack)
    me('M59,80 L81,80 L81,86 L59,86 Z M60,88 L70,88 L70,94 L60,94 Z M70,88 L80,88 L80,94 L70,94 Z M60,96 L70,96 L70,102 L60,102 Z M70,96 L80,96 L80,102 L70,102 Z M60,104 L70,104 L70,112 L60,112 Z M70,104 L80,104 L80,112 L70,112 Z M61,114 L70,114 L70,124 L63,124 Z M70,114 L79,114 L77,124 L70,124 Z', 'core'),
    // Obliques (side abs)
    me('M52,92 C51,102 52,112 55,122 L60,118 L57,102 L58,92 Z', 'oblicuos'),
    me('M88,92 C89,102 88,112 85,122 L80,118 L83,102 L82,92 Z', 'oblicuos'),
    // Forearms
    me('M41,102 C38,112 37,122 39,132 L47,132 C48,122 48,112 47,102 Z', 'antebrazos'),
    me('M99,102 C102,112 103,122 101,132 L93,132 C92,122 92,112 93,102 Z', 'antebrazos'),
    // Abductors (outer hip)
    me('M52,140 C50,148 50,156 52,162 L58,158 L57,144 Z', 'abductores'),
    me('M88,140 C90,148 90,156 88,162 L82,158 L83,144 Z', 'abductores'),
    // Adductors (inner thigh)
    me('M63,150 L69,152 L69,186 L64,182 Z', 'adductors'),
    me('M77,150 L71,152 L71,186 L76,182 Z', 'adductors'),
    // Quadriceps
    me('M55,148 C52,164 51,184 53,202 L64,204 C66,186 66,166 64,150 Z', 'cuadriceps'),
    me('M85,148 C88,164 89,184 87,202 L76,204 C74,186 74,166 76,150 Z', 'cuadriceps'),
    // Calves (front shin)
    me('M58,214 C56,226 56,238 58,248 L66,248 C67,238 67,226 66,214 Z', 'pantorrillas'),
    me('M82,214 C84,226 84,238 82,248 L74,248 C73,238 73,226 74,214 Z', 'pantorrillas'),
  ];
}

const FRONT_DETAILS = [
  'M70,56 L70,80',            // sternum
  'M70,86 L70,124',           // abs midline
  'M60,84 L80,84',            // upper abs line
  'M58,94 L82,94',
  'M58,104 L82,104',
  'M59,113 L81,113',
  'M70,150 L70,158',          // crotch
];

// ---- BACK muscle regions ----
function backRegions(me) {
  return [
    // Traps (big diamond upper back)
    me('M63,34 C66,40 74,40 77,34 L86,46 C82,54 58,54 54,46 Z', 'trapecios'),
    // Levator scapulae (neck sides)
    me('M60,30 C58,32 57,36 58,40 L63,38 L63,32 Z', 'levator-scapulae'),
    me('M80,30 C82,32 83,36 82,40 L77,38 L77,32 Z', 'levator-scapulae'),
    // Rear delts
    me('M41,57 C47,50 55,47 60,50 L58,64 C52,70 42,70 38,66 C35,63 37,60 41,57 Z', 'hombros'),
    me('M99,57 C93,50 85,47 80,50 L82,64 C88,70 98,70 102,66 C105,63 103,60 99,57 Z', 'hombros'),
    // Lats / upper back
    me('M52,56 C50,64 49,76 52,88 C58,96 82,96 88,88 C91,76 90,64 88,56 L70,58 Z', 'espalda'),
    // Triceps
    me('M39,70 C35,78 34,88 36,98 L44,98 C46,88 46,78 44,70 Z', 'triceps'),
    me('M101,70 C105,78 106,88 104,98 L96,98 C94,88 94,78 96,70 Z', 'triceps'),
    // Glutes
    me('M54,100 C51,108 51,118 55,126 L68,124 L70,102 Z', 'gluteos'),
    me('M86,100 C89,108 89,118 85,126 L72,124 L70,102 Z', 'gluteos'),
    // Forearms (back)
    me('M41,102 C38,112 37,122 39,132 L47,132 C48,122 48,112 47,102 Z', 'antebrazos'),
    me('M99,102 C102,112 103,122 101,132 L93,132 C92,122 92,112 93,102 Z', 'antebrazos'),
    // Hamstrings
    me('M54,132 C52,150 52,172 55,192 L66,192 C67,172 66,150 64,134 Z', 'femorales'),
    me('M86,132 C88,150 88,172 85,192 L74,192 C73,172 74,150 76,134 Z', 'femorales'),
    // Calves (back gastroc)
    me('M58,212 C55,224 55,238 58,248 L66,248 C67,238 67,224 66,212 Z', 'pantorrillas'),
    me('M82,212 C85,224 85,238 82,248 L74,248 C73,238 73,224 74,212 Z', 'pantorrillas'),
  ];
}

const BACK_DETAILS = [
  'M70,40 L70,130',           // spine
  'M60,60 C63,70 67,78 70,82',
  'M80,60 C77,70 73,78 70,82', // scapula lines
  'M70,100 L70,126',          // glute cleft
  'M60,140 L58,180',          // hamstring lines
  'M80,140 L82,180',
];

// Public entry: render front + back figures from a fatigue map.
export function renderBodyMap(fatigue, opts = {}) {
  return {
    front: buildView(fatigue, {
      defsId: 'f',
      regions: frontRegions(mkMuscle(fatigue, 'f', opts.onMuscleClick)),
      detailLines: FRONT_DETAILS,
    }),
    back: buildView(fatigue, {
      defsId: 'b',
      regions: backRegions(mkMuscle(fatigue, 'b', opts.onMuscleClick)),
      detailLines: BACK_DETAILS,
    }),
  };
}
