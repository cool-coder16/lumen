import { DEFAULTS } from './engine.js';
const P = (name, o) => ({ id: 'f-' + name.toLowerCase().replace(/\W+/g, '-'), name, author: 'Lumen', featured: true, params: { ...DEFAULTS, ...o } });
export const FEATURED = [
  P('Northern Drift',  { seed: 2024, mode: 'curl',   palette: 'Aurora',  count: 4200, trail: 0.94, glow: 0.5,  size: 1.1 }),
  P('Mandala Bloom',   { seed: 77,   mode: 'orbit',  palette: 'Vapor',   count: 3000, symmetry: 8, mirror: true, trail: 0.95, glow: 0.45, size: 1.0 }),
  P('Ember Storm',     { seed: 909,  mode: 'flow',   palette: 'Ember',   count: 5200, speed: 1.6, trail: 0.9, glow: 0.6, size: 1.3, scale: 1.4 }),
  P('Spiral Garden',   { seed: 31,   mode: 'nebula', palette: 'Orchid',  count: 4800, symmetry: 3, trail: 0.95, glow: 0.5, spread: 1.4 }),
  P('Glass Rain',      { seed: 5150, mode: 'curl',   palette: 'Glacier', count: 3800, speed: 0.7, trail: 0.96, glow: 0.4, size: 0.9, scale: 0.6 }),
  P('Solar Kaleidoscope', { seed: 4242, mode: 'curl', palette: 'Solar', count: 3400, symmetry: 6, mirror: true, trail: 0.94, glow: 0.5 }),
  P('Deep Jungle',     { seed: 808,  mode: 'flow',   palette: 'Jungle',  count: 4400, speed: 0.9, trail: 0.95, glow: 0.5, scale: 0.8 }),
  P('Monochrome Pulse',{ seed: 12,   mode: 'orbit',  palette: 'Mono',    count: 3600, symmetry: 5, trail: 0.96, glow: 0.35, size: 0.8, spread: 0.3 }),
];
