// Live Privacy Monitoring Background Script
class LivePrivacyMonitor {
  constructor() {
    this.tabData = new Map();
    this.trackerLists = {
      analytics: [
        'google-analytics.com', 'googletagmanager.com', 'adobe.com', 'omniture.com',
        'scorecardresearch.com', 'quantserve.com', 'chartbeat.com', 'newrelic.com',
        'hotjar.com', 'fullstory.com', 'mixpanel.com', 'segment.com', 'amplitude.com'
      ],
      advertising: [
        'doubleclick.net', 'googlesyndication.com', 'facebook.com', 'amazon-adsystem.com',
        'outbrain.com', 'taboola.com', 'criteo.com', 'pubmatic.com', 'rubiconproject.com',
        'openx.com', 'adsystem.amazon', 'googleadservices.com', 'bing.com'
      ],
      social: [
        'facebook.net', 'facebook.com', 'twitter.com', 'linkedin.com', 'pinterest.com',
        'instagram.com', 'youtube.com', 'tiktok.com', 'snapchat.com', 'reddit.com'
      ],
      fingerprinting: [
        'fingerprintjs.com', 'maxmind.com', 'device-api.com', 'trustpilot.com',
        'iovation.com', 'threatmetrix.com', 'white-ops.com', 'perimeterx.com'
      ]
    };
    this.init();
  }

  init() {
    this.setupListeners();
  }

  setupListeners() {
    // Monitor all requests continuously
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => this.analyzeRequest(details),
      { urls: ['<all_urls>'] }
    );

    chrome.webRequest.onResponseStarted.addListener(
      (details) => this.analyzeResponse(details),
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );

    // Tab lifecycle
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'loading' && tab.url && !tab.url.startsWith('chrome://')) {
        this.initTabData(tabId, tab.url);
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabData.delete(tabId);
    });

    // Handle popup requests
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'getScore' && message.tabId) {
        const tabData = this.tabData.get(message.tabId);
        if (tabData) {
          // Get all cookies for this tab
          chrome.cookies.getAll({ url: tabData.url }, (cookies) => {
            if (!chrome.runtime.lastError && cookies) {
              tabData.cookies = cookies;
            }
            const score = this.calculateScore(tabData);
            sendResponse(score);
          });
        } else {
          sendResponse(this.getDefaultScore());
        }
      }
      return true;
    });
  }

  initTabData(tabId, url) {
    try {
      const domain = new URL(url).hostname;
      const tabData = {
        url: url,
        domain: domain,
        trackers: new Set(),
        cookies: [],
        fingerprinting: { canvas: 0, audio: 0, webgl: 0, fonts: 0 },
        permissions: new Set(),
        forms: { fields: 0, sensitive: 0 },
        requests: { total: 0, thirdParty: 0 },
        lastScore: 'A+',
        lastUpdate: Date.now()
      };
      
      this.tabData.set(tabId, tabData);
      
      // Get initial cookies
      chrome.cookies.getAll({ url: url }, (cookies) => {
        if (!chrome.runtime.lastError && cookies) {
          tabData.cookies = cookies;
        }
      });
    } catch (e) {
      // Invalid URL
    }
  }

  analyzeRequest(details) {
    const tabId = details.tabId;
    if (tabId < 0) return;

    if (!this.tabData.has(tabId)) {
      // Try to get tab info
      chrome.tabs.get(tabId, (tab) => {
        if (!chrome.runtime.lastError && tab && tab.url && !tab.url.startsWith('chrome://')) {
          this.initTabData(tabId, tab.url);
        }
      });
      return;
    }

    const tabData = this.tabData.get(tabId);
    try {
      const requestUrl = new URL(details.url);
      const isThirdParty = requestUrl.hostname !== tabData.domain;

      tabData.requests.total++;
      if (isThirdParty) {
        tabData.requests.thirdParty++;
        const wasTracker = this.checkTracker(requestUrl.hostname, tabData);
        
        // Update score and notify if significant change
        if (wasTracker) {
          this.updateScore(tabId, tabData);
        }
      }
    } catch (e) {
      // Invalid URL
    }
  }

  analyzeResponse(details) {
    const tabId = details.tabId;
    if (!this.tabData.has(tabId)) return;

    const headers = details.responseHeaders || [];
    headers.forEach(header => {
      if (header.name.toLowerCase() === 'set-cookie') {
        this.analyzeCookie(header.value, tabId);
      }
    });
  }

  checkTracker(hostname, tabData) {
    const initialSize = tabData.trackers.size;
    
    for (const [category, domains] of Object.entries(this.trackerLists)) {
      for (const domain of domains) {
        if (hostname === domain || hostname.endsWith('.' + domain) || hostname.includes(domain)) {
          tabData.trackers.add(`${category}:${hostname}`);
          return tabData.trackers.size > initialSize; // Return true if new tracker found
        }
      }
    }
    
    // Heuristic detection
    const suspiciousPatterns = [
      /analytics?/i, /tracking?/i, /metrics?/i, /stats?/i, /pixel/i, /beacon/i,
      /collect/i, /event/i, /ads?/i, /advertisement/i, /gtag/i, /gtm/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(hostname))) {
      tabData.trackers.add(`heuristic:${hostname}`);
      return tabData.trackers.size > initialSize;
    }
    
    return false;
  }

  analyzeCookie(cookieHeader, tabId) {
    const tabData = this.tabData.get(tabId);
    if (!tabData) return;

    const cookie = this.parseCookie(cookieHeader);
    const exists = tabData.cookies.some(c => c.name === cookie.name);
    if (!exists) {
      tabData.cookies.push(cookie);
      this.updateScore(tabId, tabData);
    }
  }

  parseCookie(header) {
    const parts = header.split(';');
    const [name, value] = parts[0].split('=');
    return { name: name || '', value: value || '' };
  }

  updateScore(tabId, tabData) {
    const score = this.calculateScore(tabData);
    const newGrade = score.final;
    const now = Date.now();
    
    // Only update badge, no notifications
    const timeSinceUpdate = now - (tabData.lastUpdate || 0);
    
    if (timeSinceUpdate > 5000) { // Update badge every 5 seconds
      tabData.lastScore = newGrade;
      tabData.lastUpdate = now;
      this.updateBadge(tabId, newGrade);
    }
  }



  updateBadge(tabId, grade) {
    const color = {
      'A+': '#4CAF50', 'A': '#8BC34A', 'B': '#FFC107',
      'C': '#FF9800', 'D': '#FF5722', 'F': '#F44336'
    };
    
    chrome.action.setBadgeText({ tabId: tabId, text: grade });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color[grade] || '#666' });
  }

  calculateScore(data) {
    const trackerCount = data.trackers.size;
    let trackerPoints = trackerCount >= 10 ? 0 : trackerCount >= 6 ? 8 : trackerCount >= 3 ? 12 : 40;
    
    let highRiskCount = 0;
    data.trackers.forEach(tracker => {
      const [category] = tracker.split(':');
      if (['fingerprinting', 'advertising'].includes(category)) {
        highRiskCount++;
      }
    });
    if (highRiskCount > 0) trackerPoints = Math.min(trackerPoints, 5);
    
    const cookieCount = data.cookies.length;
    const cookiePoints = cookieCount >= 20 ? 0 : cookieCount >= 10 ? 5 : cookieCount >= 6 ? 10 : cookieCount >= 1 ? 15 : 20;
    
    const fingerprintPoints = 20; // Default since background can't detect fingerprinting
    const permissionPoints = 10; // Default
    const formPoints = 10; // Default
    
    let finalScore = trackerPoints + cookiePoints + fingerprintPoints + permissionPoints + formPoints;
    
    const thirdPartyCount = data.requests.thirdParty;
    if (thirdPartyCount > 20) finalScore -= 15;
    else if (thirdPartyCount > 12) finalScore -= 8;
    else if (thirdPartyCount > 6) finalScore -= 3;
    
    finalScore = Math.max(0, Math.min(100, finalScore));
    
    const grade = finalScore >= 90 ? 'A+' : finalScore >= 80 ? 'A' : finalScore >= 70 ? 'B' : finalScore >= 60 ? 'C' : finalScore >= 50 ? 'D' : 'F';
    
    return {
      individual: { trackers: trackerPoints, cookies: cookiePoints, fingerprinting: fingerprintPoints, permissions: permissionPoints, forms: formPoints },
      final: grade,
      score: finalScore,
      data: data
    };
  }

  getDefaultScore() {
    return {
      final: 'A+',
      score: 100,
      individual: { trackers: 40, cookies: 20, fingerprinting: 20, permissions: 10, forms: 10 },
      data: {
        trackers: new Set(),
        cookies: [],
        fingerprinting: {},
        permissions: new Set(),
        forms: { fields: 0, sensitive: 0 },
        requests: { total: 0, thirdParty: 0 }
      }
    };
  }
}

new LivePrivacyMonitor();