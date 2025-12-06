// Simple debug utility
export const DEBUG_ENABLED = ((): boolean => {
  // Allow enabling via localStorage or query param
  try {
    if (typeof window !== 'undefined') {
      const ls = window.localStorage.getItem('dgmap_debug');
      if (ls === '1' || ls === 'true') return true;
      if (window.location.search.includes('debug=1')) return true;
    }
  } catch (error) {
    console.error('Failed to check debug status:', error);
  }
  return true; // default ON for now; set to false when stable
})();

export const debugLog = (...args: unknown[]) => {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
};