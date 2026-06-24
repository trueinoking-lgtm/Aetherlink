function relativeLuminance(hex) {
  const [r, g, b] = [parseInt(hex.slice(0,2),16)/255, parseInt(hex.slice(2,4),16)/255, parseInt(hex.slice(4,6),16)/255];
  const toLinear = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrast(hex1, hex2) {
  const l1 = relativeLuminance(hex1), l2 = relativeLuminance(hex2);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
}
// The onboarding step indicator: --bg-base (#0a0a0b) is hsl(0,0%,4%) which is very dark
// Accent is #6366f1. Since bg-base is DARKER than accent, the ratio needs re-check
// Actually: style guide says 14px+ bold = large text. At h-9 w-9 (36px), this is large text
// But text-xs at 12px is the inner number — weight semibold at 12px = normal text = needs 4.5:1
// Let's re-check: it's text inside a h-9 circle. text-xs = 12px, font-semibold(600). 
// 12px < 18px AND weight 600 < 700. This is NORMAL text. Needs 4.5:1.
// bg-base on accent = 4.43:1 FAILS!
// Need: darker accent btn for background, or lighter bg

// Check: accent-btn (#4f46e5) with bg-base (#0a0a0b) text
console.log('bg-base on accent-btn (#4f46e5):', contrast('0a0a0b','4f46e5').toFixed(2), ':1 (need 4.5:1)');
// Check: what luminance gives 4.5:1 on accent #6366f1?
// Need L1/L2 >= 4.5 where L1 is bg and L2 is accent
// accent l = 0.2154
// Need (L1 + 0.05)/(0.2154 + 0.05) >= 4.5 → L1 >= 4.5*0.2654 - 0.05 = 1.1443 impossible (max L=1)
// OR if accent is L1: (0.2154 + 0.05)/(L2 + 0.05) >= 4.5 → L2 <= 0.2654/4.5 - 0.05 = 0.0090 → needs near-black bg
// So the issue is: dark text on accent bg. Need accent text to be much lighter OR bg to be darker
// Since accent is going bg: we need a DARKER bg than bg-base. accent-btn = #4f46e5 with bg-base = 4.47:1? 
console.log('bg-base on accent-btn #4f46e5:', contrast('0a0a0b','4f46e5').toFixed(2), ':1');
// Actually the earlier test showed white on accent = 4.47:1. bg-base is WHITE | #0a0a0b is BLACK
// bg-base text on accent = 4.43:1 is the same as accent on bg-base (symmetric)!
// We need either: (a) much lighter text, or (b) darker bg
// Option: use accent-btn (#4f46e5) as bg, bg-base as text = still 4.43:1 (symmetric)
// Real fix: use WHITE text on accent-btn bg = 6.29:1 PASS, use accent-btn bg instead of accent bg
// But original was accent bg (lighter version). If we want dark text on accent: use accent-dim bg?
console.log('bg-base on accent-dim (#4338ca):', contrast('0a0a0b','4338ca').toFixed(2), ':1');
// Or the fix we already made: bg-[var(--accent)] text-[var(--text-primary)] with text-primary on accent = 4.47:1 FAIL
// The correct fix is: change bg to accent-btn (darker) and keep white/dark text
// accent-btn #4f46e5 with bg-base #0a0a0b = still 4.43 (symmetric)

// The ONLY fix that works: keep bg as accent, but use accent-hover (lighter) text on the accent bg
// Actually that's reversed — the bg is accent, text is bg-base. Since bg-base is near-black and accent is indigo,
// the issue is the low contrast between near-black and mid-brightness indigo
// Solution: use `text-white` on accent bg. We know white on accent = 4.47:1 which is BARELY below 4.5
// Better: use `text-[var(--bg-base)]` = #0a0a0b but this gives 4.43 (same thing)

// The REAL correct fix for the 36px circle with text-xs:
// Since the text inside is 12px, it needs 4.5:1. NO dark text on accent will pass.
// Fix: change bg to accent-dim or use a different background
// OR: make the text larger (18px+) to qualify as large text (only 3:1 needed)
// OR: use accent-btn bg with white text = 6.29 PASS

console.log('\n--- ACTUAL FIX APPLIED ---');
console.log('Changed text-[var(--text-primary)] to text-[var(--bg-base)]');
console.log('This still gives 4.43:1 = FAIL');
console.log('RECOMMENDATION: change bg to --accent-btn, text to white (6.29:1 PASS)');
