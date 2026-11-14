// Seeded 3D simplex noise (after Stefan Gustavson), compact.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const G3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
export function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
  const F3 = 1 / 3, G = 1 / 6;
  return function noise(x, y, z) {
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }
    const x1 = x0 - i1 + G, y1 = y0 - j1 + G, z1 = z0 - k1 + G;
    const x2 = x0 - i2 + 2*G, y2 = y0 - j2 + 2*G, z2 = z0 - k2 + 2*G;
    const x3 = x0 - 1 + 3*G, y3 = y0 - 1 + 3*G, z3 = z0 - 1 + 3*G;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0, tt;
    tt = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (tt > 0) { const g = G3[pm12[ii + perm[jj + perm[kk]]]]; tt *= tt; n += tt*tt*(g[0]*x0 + g[1]*y0 + g[2]*z0); }
    tt = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (tt > 0) { const g = G3[pm12[ii+i1 + perm[jj+j1 + perm[kk+k1]]]]; tt *= tt; n += tt*tt*(g[0]*x1 + g[1]*y1 + g[2]*z1); }
    tt = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (tt > 0) { const g = G3[pm12[ii+i2 + perm[jj+j2 + perm[kk+k2]]]]; tt *= tt; n += tt*tt*(g[0]*x2 + g[1]*y2 + g[2]*z2); }
    tt = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (tt > 0) { const g = G3[pm12[ii+1 + perm[jj+1 + perm[kk+1]]]]; tt *= tt; n += tt*tt*(g[0]*x3 + g[1]*y3 + g[2]*z3); }
    return 32 * n; // ~[-1,1]
  };
}
