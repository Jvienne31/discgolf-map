// Simple debug utility
export const DEBUG_ENABLED = ((): boolean => {
  // Allow enabling via localStorage or query param
  try {
    if (typeof window !== 'undefined') {
      const ls = window.localStorage.getItem('dgmap_debug');
      if (ls === '1' || ls === 'true') return true;
      if (window.location.search.includes('debug=1')) return true;
    }
  } catch {}
  return true; // default ON for now; set to false when stable
})();

export const debugLog = (...args: any[]) => {
  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};
