// Minimal Manifest V3 service worker. Marketplace form interaction happens in
// the declared content script; this worker only configures the side panel and
// answers a lightweight health check.

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel && tab.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.type === 'PING_SW') {
    sendResponse({ ok: true, timestamp: Date.now() });
  }
});
