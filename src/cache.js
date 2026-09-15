export function createStatsCache(ttlMs) {
  let value;
  let expiresAt = 0;

  return {
    get() {
      return value && Date.now() < expiresAt ? value : null;
    },
    set(nextValue) {
      value = nextValue;
      expiresAt = Date.now() + ttlMs;
      return value;
    },
    hasValue() {
      return Boolean(value);
    },
  };
}

export function createRenderedCache() {
  let value;
  return {
    get: () => value,
    set(nextValue) {
      value = nextValue;
      return value;
    },
  };
}
