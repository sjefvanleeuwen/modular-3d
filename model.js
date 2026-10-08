export const REVISION = 2;
export const TYPES = ['wall', 'window', 'door', 'corner', 'solar', 'solarCorner', 'utility', 'antenna', 'hatch', 'sign', 'balcony', 'garden', 'reactor', 'pillar', 'vent', 'brace', 'floor'];
export const WALL_TYPES = ['wall', 'window', 'door', 'hatch'];
export const DEFAULT_CONFIG = {width: 4, depth: 3, levels: 1, roof: 'mixed', preset: 'outpost', finish: 'olive', accent: '#69e8c3', surface: 'artwork'};

export function normalizeConfig(raw = {}) {
  const v = {...DEFAULT_CONFIG, ...raw};
  for (const [key, min, max] of [['width', 2, 8], ['depth', 2, 8], ['levels', 1, 3]]) {
    v[key] = Math.max(min, Math.min(max, Math.round(Number(v[key]) || min)));
  }
  for (const [key, values] of Object.entries({roof: ['mixed', 'solar', 'utility', 'flat', 'open'], preset: ['outpost', 'station', 'blank'], finish: ['olive', 'slate', 'sand'], surface: ['artwork', 'clean']})) {
    if (!values.includes(v[key])) v[key] = DEFAULT_CONFIG[key];
  }
  if (!/^#[\da-f]{6}$/i.test(v.accent)) v.accent = DEFAULT_CONFIG.accent;
  return v;
}

export function generateLayout(input) {
  const {width, depth, levels, roof, preset} = normalizeConfig(input);
  const parts = [];
  const add = (type, x, z, floor = 0, rotation = 0, extra = {}) => {
    const p = {id: `p${parts.length}`, type, x, z, floor, rotation, variant: 'standard', ...extra};
    parts.push(p);
    return p;
  };
  if (preset === 'blank') return parts;
  const entrance = Math.floor((width - 1) / 2);
  const hatchRow = depth - 1;
  for (let y = 0; y < levels; y++) {
    // Full-height perimeter panels, including the side walls, all use the same edge anchor.
    for (let x = 0; x < width; x++) for (let z = 0; z < depth; z++) {
      add('floor', x, z, y, 0, {role: 'structure'});
    }
    for (let x = 0; x < width; x++) {
      add(y === 0 && x === entrance ? 'door' : (x + y) % 2 ? 'window' : 'wall', x, 0, y, 0, {role: 'shell', detail: (x + y) % 3});
      add((x + y) % 2 ? 'wall' : 'window', x, depth - 1, y, 2, {role: 'shell', detail: (x + 1) % 3});
    }
    for (let z = 0; z < depth; z++) {
      add(z % 2 ? 'window' : 'wall', 0, z, y, 1, {role: 'shell', detail: (z + y) % 3});
      add(y === 0 && z === hatchRow ? 'hatch' : z % 2 ? 'wall' : 'window', width - 1, z, y, 3, {role: 'shell', detail: z % 3});
    }
    // L-shaped corner covers meet the two sealed wall panels at an exact grid vertex.
    for (const [x, z, r] of [[-.5, -.5, 0], [width - .5, -.5, 3], [width - .5, depth - .5, 2], [-.5, depth - .5, 1]]) {
      add('corner', x, z, y, r, {role: 'corner'});
    }
  }
  if (roof !== 'open') {
    for (let x = 0; x < width; x++) for (let z = 0; z < depth; z++) {
      add('floor', x, z, levels, 0, {role: 'roof'});
      if (roof === 'flat') continue;
      // Dedicated corner/utility bays avoid stacking overlapping roof equipment.
      const type = x === 0 && z === depth - 1 ? 'antenna'
        : x === width - 1 && z === depth - 1 ? 'utility'
        : x === width - 1 && z === 0 ? 'solarCorner'
        : roof === 'utility' && (x + z) % 2 ? 'utility' : 'solar';
      add(type, x, z, levels, z === 0 ? 0 : 2, {role: 'equipment'});
    }
    if (roof === 'flat') add('antenna', 0, depth - 1, levels, 0, {role: 'equipment'});
  }
  // Entry gantry, support columns and cantilever brackets attach to the façade.
  add('balcony', entrance, -1, 0, 0, {role: 'entry'});
  for (const x of [entrance - .43, entrance + .43]) add('pillar', x, -.64, 0, 0, {role: 'support'});
  for (let y = 0; y < levels; y++) {
    add('brace', 0, depth - .52, y, 2, {role: 'support'});
    add('brace', width - 1, -.48, y, 0, {role: 'support'});
  }
  // Service apron: utilities sit on tiles rather than float beside the building.
  for (let z = 0; z < depth; z++) add('floor', width, z, 0, 0, {role: 'apron'});
  add('reactor', width, 0, 0, 0, {role: 'equipment', variant: preset === 'station' ? 'powered' : 'standard'});
  add('vent', width, Math.min(1, depth - 1), 0, 1, {role: 'equipment'});
  add('sign', entrance + .8, -1, 0, 2, {role: 'entry'});
  add('garden', entrance - .85, -1, 0, 0, {role: 'entry'});
  return parts;
}

export function validProject(v) {
  return !!(v && Array.isArray(v.parts) && v.parts.length <= 2000 && v.parts.every(p =>
    TYPES.includes(p.type) && ['x', 'z', 'floor', 'rotation'].every(k => Number.isFinite(p[k]) && Math.abs(p[k]) <= 100) &&
    Number.isInteger(p.rotation) && p.rotation >= 0 && p.rotation <= 3 &&
    ['standard', 'reinforced', 'powered'].includes(p.variant)));
}

export function auditShell(parts, input) {
  const c = normalizeConfig(input);
  if (c.preset === 'blank') return {closed: false, gaps: [], cutaway: false};
  const expected = generateLayout(c).filter(p => p.role === 'shell' || p.role === 'roof' || p.role === 'structure');
  const floorSlots = new Set(parts.filter(p => p.type === 'floor').map(p => `${p.x}:${p.z}:${p.floor}`));
  const wallSlots = new Set(parts.filter(p => WALL_TYPES.includes(p.type)).map(p => `${p.x}:${p.z}:${p.floor}:${p.rotation}`));
  const gaps = expected.filter(p => p.type === 'floor' ? !floorSlots.has(`${p.x}:${p.z}:${p.floor}`) : !wallSlots.has(`${p.x}:${p.z}:${p.floor}:${p.rotation}`));
  return {closed: !gaps.length && c.roof !== 'open', gaps, cutaway: c.roof === 'open'};
}
