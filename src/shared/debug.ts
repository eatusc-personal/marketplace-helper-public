// Runtime-gated debug logger shared by the content scripts and the popup.
//
// Debug output is disabled by default. To enable it in a given context
// (page console for the content script, popup console for the popup UI):
//   localStorage.setItem('mh_debug', '1')
// or set a global flag from the console:
//   globalThis.__MH_DEBUG__ = true
// Contexts without localStorage (for example the background service worker)
// can only use the global flag.

const isDebugEnabled = (): boolean => {
  try {
    if ((globalThis as { __MH_DEBUG__?: boolean }).__MH_DEBUG__ === true) {
      return true;
    }
    return typeof localStorage !== 'undefined' && localStorage.getItem('mh_debug') === '1';
  } catch {
    return false;
  }
};

export const debugLog = (...args: unknown[]): void => {
  if (isDebugEnabled()) {
    console.log(...args);
  }
};
