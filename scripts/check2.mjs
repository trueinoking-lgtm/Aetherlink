// Check accent on bg-surface
function relativeLuminance(hex) {
  const [r, g, b] = [parseInt(hex.slice(0,2),16)/255, parseInt(hex.slice(2,4),16)/255, parseInt(hex.slice(4,6),16)/255];
  const toLinear = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrast(hex1, hex2) {
  const l1 = relativeLuminance(hex1), l2 = relativeLuminance(hex2);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
}
console.log('accent on bg-surface (#111113):', contrast('6366f1','111113').toFixed(2), ':1');
console.log('accent-active on bg-surface:', contrast('a5b4fc','111113').toFixed(2), ':1');
console.log('accent-hover on bg-surface:', contrast('818cf8','111113').toFixed(2), ':1');
