// Standalone contrast checker for AetherLink dark theme
function relativeLuminance(hex) {
  const [r, g, b] = [parseInt(hex.slice(0,2),16)/255, parseInt(hex.slice(2,4),16)/255, parseInt(hex.slice(4,6),16)/255];
  const toLinear = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1), l2 = relativeLuminance(hex2);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
}
function check(label, fg, bg, threshold) {
  const ratio = contrastRatio(fg, bg);
  const pass = ratio >= threshold;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: ${ratio.toFixed(2)}:1 (need ${threshold}:1) ${pass ? '✓' : '�'}`);
  return pass;
}

console.log("=== AETHERLINK DARK THEME CONTRAST AUDIT ===\n");

// CSS variable values from globals.css
const bgBase = '0a0a0b';
const bgSurface = '111113';
const textPrimary = 'f4f4f5';
const textSecondary = 'a1a1aa';
const textMuted = '84848a';
const textFaint = '7a7a82';
const accent = '6366f1';
const accentBtn = '4f46e5';
const accentDim = '4338ca';
const accentHover = '818cf8';
const accentActive = 'a5b4fc';
const success = '22c55e';
const warning = 'f59e0b';
const danger = 'ef4444';

let allPass = true;

console.log("--- Text on background ---");
allPass &= check(`text-primary on bg-base`, textPrimary, bgBase, 4.5);
allPass &= check(`text-secondary on bg-base`, textSecondary, bgBase, 4.5);
allPass &= check(`text-muted on bg-base`, textMuted, bgBase, 4.5);
allPass &= check(`text-faint on bg-base`, textFaint, bgBase, 4.5);
allPass &= check(`accent on bg-base`, accent, bgBase, 3.0);  // decorative/large only
allPass &= check(`accent-hover on bg-base`, accentHover, bgBase, 4.5);
allPass &= check(`accent-active on bg-base`, accentActive, bgBase, 4.5);

console.log("\n--- Button contrast ---");
allPass &= check(`white on accent-btn`, 'ffffff', accentBtn, 4.5);
allPass &= check(`white on accent`, 'ffffff', accent, 4.5);
allPass &= check(`white on accent-hover`, 'ffffff', accentHover, 4.5);
allPass &= check(`white on accent-dim`, 'ffffff', accentDim, 4.5);
allPass &= check(`white on accent-active`, 'ffffff', accentActive, 4.5);

console.log("\n--- Semantic colors on bg-surface ---");
allPass &= check(`success on bg-surface`, success, bgSurface, 4.5);
allPass &= check(`warning on bg-surface`, warning, bgSurface, 4.5);
allPass &= check(`danger on bg-surface`, danger, bgSurface, 4.5);

console.log("\n--- Tinted pill pitfall (bg-accent/15 with text-accent) ---");
// Effective bg of accent at 15% over bg-base
// accent=#6366f1 at 15% opacity over #0a0a0b
function effectiveColor(fgHex, bgHex, opacity) {
  const fg = [parseInt(fgHex.slice(0,2),16), parseInt(fgHex.slice(2,4),16), parseInt(fgHex.slice(4,6),16)];
  const bg = [parseInt(bgHex.slice(0,2),16), parseInt(bgHex.slice(2,4),16), parseInt(bgHex.slice(4,6),16)];
  const r = Math.round(fg[0] * opacity + bg[0] * (1-opacity));
  const g = Math.round(fg[1] * opacity + bg[1] * (1-opacity));
  const b = Math.round(fg[2] * opacity + bg[2] * (1-opacity));
  return r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
}
const effBgAccent15 = effectiveColor(accent, bgBase, 0.15);
console.log(`Effective bg of accent/15 over bg-base: #${effBgAccent15}`);
allPass &= check(`accent on accent/15 (tinted pill)`, accent, effBgAccent15, 4.5);
allPass &= check(`accent-active on accent/15 (tinted pill fix)`, accentActive, effBgAccent15, 4.5);

console.log("\n--- Accent badge on tracker page ---");
// bg-accent/15 text-accent-active (tracker status badge)
allPass &= check(`accent-active on accent/15 (interview badge)`, accentActive, effBgAccent15, 4.5);

console.log("\n=== SUMMARY ===");
console.log(allPass ? "ALL CRITICAL CONTRAST CHECKS PASS" : "SOME CHECKS FAILED - see above");
