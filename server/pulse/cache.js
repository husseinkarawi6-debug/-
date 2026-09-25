// Small versioned cache for dashboard reads. Any write that changes business
// data (import, approve, replace, correction, cancel) calls bump() which
// invalidates every cached summary/chart/alert/product result at once.
export function createCache({ max = 500 } = {}) {
  let version = 0;
  const map = new Map();
  return {
    get version() { return version; },
    bump() { version++; map.clear(); },
    wrap(key, fn) {
      const k = `${version}|${key}`;
      if (map.has(k)) { const v = map.get(k); map.delete(k); map.set(k, v); return v; }
      const v = fn();
      map.set(k, v);
      if (map.size > max) map.delete(map.keys().next().value);
      return v;
    },
  };
}
