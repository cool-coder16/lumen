export const PALETTES = {
  Aurora:   ['#00f5d4', '#00bbf9', '#9b5de5', '#f15bb5', '#7CFFCB'],
  Ember:    ['#ff4d00', '#ff9500', '#ffd000', '#ff0054', '#9e0059'],
  Vapor:    ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'],
  Glacier:  ['#e0fbfc', '#98c1d9', '#3d5a80', '#7bdff2', '#b2f7ef'],
  Orchid:   ['#f72585', '#b5179e', '#7209b7', '#4361ee', '#4cc9f0'],
  Solar:    ['#fff1a8', '#ffc857', '#ff8c42', '#e9724c', '#c5283d'],
  Jungle:   ['#d9ed92', '#76c893', '#34a0a4', '#168aad', '#1a759f'],
  Mono:     ['#ffffff', '#cfd8ff', '#8f9bd6', '#5a6396', '#e8ecff'],
};
export const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Sample N colours around a cyclic gradient built from palette stops
export function sampleCyclic(stops, n) {
  const rgb = stops.map(hexToRgb), out = [];
  for (let i = 0; i < n; i++) {
    const f = (i / n) * rgb.length, a = Math.floor(f), t = f - a;
    const c0 = rgb[a % rgb.length], c1 = rgb[(a + 1) % rgb.length];
    const s = t * t * (3 - 2 * t);
    out.push([c0[0] + (c1[0] - c0[0]) * s, c0[1] + (c1[1] - c0[1]) * s, c0[2] + (c1[2] - c0[2]) * s]);
  }
  return out;
}
