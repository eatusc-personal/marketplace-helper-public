// Main message router for content script
// Imports all platform-specific modules and routes messages appropriately

import {
  detectPlatform,
  initializeContentScript
} from './shared/utils';
import { debugLog } from './shared/debug';

// Initialize the content script
const currentPlatform = detectPlatform(window.location.href);
initializeContentScript(currentPlatform);

debugLog(`[DD] ${currentPlatform} content script initialization complete`);
