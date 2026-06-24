// Verify onboarding fix: bg-base (#0a0a0b) text on accent (#6366f1) bg
function relativeLuminance(hex) {
  const [r, g, b] = [parseInt(hex.slice(0,2),16)/255, parseInt(hex.slice(2,4),16)/255, parseInt(hex.slice(4,6),16)/255];
  const toLinear = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrast(hex1, hex2) {
  const l1 = relativeLuminance(hex1), l2 = relativeLuminance(hex2);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
}
// bg-base text on accent background
console.log('bg-base (#0a0a0b) on accent (#6366f1):', contrast('0a0a0b','6366f1').toFixed(2), ':1 - large text needs 3:1, normal needs 4.5:1');
