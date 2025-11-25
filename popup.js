// Popup script for PrivacyGrade extension
class PopupController {
  constructor() {
    this.trackerLists = {
      analytics: ['google-analytics.com', 'googletagmanager.com', 'adobe.com', 'omniture.com'],
      advertising: ['doubleclick.net', 'googlesyndication.com', 'facebook.com', 'amazon-adsystem.com'],
      social: ['facebook.net', 'facebook.com', 'twitter.com', 'linkedin.com', 'pinterest.com'],
      fingerprinting: ['fingerprintjs.com', 'maxmind.com', 'device-api.com', 'trustpilot.com']
    };
    this.init();
  }

  async init() {
    try {
      const tab = await this.getCurrentTab();
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        this.showError();
        return;
      }

      // Get background data and collect fresh data
      const [backgroundScore, freshData] = await Promise.all([
        this.getLiveScore(tab.id),
        this.collectFreshData(tab)
      ]);

      // Merge data
      const finalData = this.mergeData(backgroundScore?.data, freshData);
      const score = this.calculateScore(finalData);
      
      this.displayResults(score, tab.url);
      this.updateBadge(tab.id, score.final);
    } catch (error) {
      console.error('Popup error:', error);
      this.showError();
    }
  }

  async getCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs?.[0] || null);
      });
    });
  }

  async getLiveScore(tabId) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 1000);
      
      chrome.runtime.sendMessage({ type: 'getScore', tabId }, (response) => {
        clearTimeout(timeout);
        resolve(response || null);
      });
    });
  }

  async collectFreshData(tab) {
    const data = {
      trackers: new Set(),
      cookies: [],
      fingerprinting: { canvas: 0, audio: 0, webgl: 0, fonts: 0 },
      permissions: new Set(),
      forms: { fields: 0, sensitive: 0 },
      requests: { total: 0, thirdParty: 0 }
    };

    // Collect cookies
    try {
      const cookies = await new Promise((resolve) => {
        chrome.cookies.getAll({ url: tab.url }, resolve);
      });
      data.cookies = cookies || [];
    } catch (e) {}

    // Collect page scripts and analyze for trackers
    try {
      const result = await new Promise((resolve) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const scripts = Array.from(document.querySelectorAll('script[src]'))
              .map(s => s.src)
              .filter(src => src && src.startsWith('http'));
            
            const forms = document.querySelectorAll('form');
            let totalFields = 0;
            let sensitiveFields = 0;

            forms.forEach(form => {
              const inputs = form.querySelectorAll('input, select, textarea');
              totalFields += inputs.length;
              
              inputs.forEach(input => {
                const fieldText = `${input.type} ${input.name} ${input.id}`.toLowerCase();
                if (/ssn|phone|address|birth|credit|card/.test(fieldText)) {
                  sensitiveFields++;
                }
              });
            });

            return {
              scripts,
              domain: window.location.hostname,
              forms: { fields: totalFields, sensitive: sensitiveFields }
            };
          }
        }, (results) => {
          resolve(results?.[0]?.result || { scripts: [], domain: '', forms: { fields: 0, sensitive: 0 } });
        });
      });

      data.forms = result.forms;
      
      // Analyze scripts for trackers
      result.scripts.forEach(src => {
        try {
          const url = new URL(src);
          data.requests.total++;
          
          if (url.hostname !== result.domain) {
            data.requests.thirdParty++;
            this.checkTracker(url.hostname, data);
          }
        } catch (e) {}
      });
    } catch (e) {}

    // Detect fingerprinting
    try {
      const fingerprinting = await new Promise((resolve) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            let detections = { canvas: 0, audio: 0, webgl: 0, fonts: 0 };
            
            if (document.querySelectorAll('canvas').length > 0) detections.canvas = 1;
            if (window.AudioContext || window.webkitAudioContext) detections.audio = 1;
            if (document.querySelectorAll('style, link[rel="stylesheet"]').length > 5) detections.fonts = 1;
            
            try {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl');
              if (gl) detections.webgl = 1;
            } catch (e) {}
            
            return detections;
          }
        }, (results) => {
          resolve(results?.[0]?.result || { canvas: 0, audio: 0, webgl: 0, fonts: 0 });
        });
      });
      
      data.fingerprinting = fingerprinting;
    } catch (e) {}

    return data;
  }

  mergeData(backgroundData, freshData) {
    if (!backgroundData) return freshData;
    
    // Use background trackers if more detected
    if (backgroundData.trackers && backgroundData.trackers.size > freshData.trackers.size) {
      freshData.trackers = backgroundData.trackers;
    }
    
    // Use background cookies if more detected
    if (backgroundData.cookies && backgroundData.cookies.length > freshData.cookies.length) {
      freshData.cookies = backgroundData.cookies;
    }
    
    return freshData;
  }

  checkTracker(hostname, data) {
    for (const [category, domains] of Object.entries(this.trackerLists)) {
      if (domains.some(domain => hostname.includes(domain))) {
        data.trackers.add(`${category}:${hostname}`);
        return;
      }
    }
    
    // Heuristic detection
    if (/analytics?|tracking?|ads?|gtag|gtm/.test(hostname)) {
      data.trackers.add(`heuristic:${hostname}`);
    }
  }

  calculateScore(data) {
    let trackers = [];
    if (data.trackers instanceof Set) {
      trackers = Array.from(data.trackers);
    } else if (Array.isArray(data.trackers)) {
      trackers = data.trackers;
    }
    
    const trackerCount = trackers.length;
    let trackerPoints = trackerCount >= 10 ? 0 : trackerCount >= 6 ? 8 : trackerCount >= 3 ? 12 : 40;
    
    const cookieCount = data.cookies?.length || 0;
    const cookiePoints = cookieCount >= 20 ? 0 : cookieCount >= 10 ? 5 : cookieCount >= 6 ? 10 : cookieCount >= 1 ? 15 : 20;
    
    const fpMethods = Object.values(data.fingerprinting || {}).reduce((a, b) => a + b, 0);
    const fingerprintPoints = fpMethods > 2 ? 0 : fpMethods > 0 ? 10 : 20;
    
    const permissionPoints = 10;
    const formPoints = (data.forms?.sensitive || 0) > 3 ? 0 : 10;
    
    let finalScore = trackerPoints + cookiePoints + fingerprintPoints + permissionPoints + formPoints;
    finalScore = Math.max(0, Math.min(100, finalScore));
    
    const grade = finalScore >= 90 ? 'A+' : finalScore >= 80 ? 'A' : finalScore >= 70 ? 'B' : finalScore >= 60 ? 'C' : finalScore >= 50 ? 'D' : 'F';
    
    return {
      individual: { trackers: trackerPoints, cookies: cookiePoints, fingerprinting: fingerprintPoints, permissions: permissionPoints, forms: formPoints },
      final: grade,
      score: finalScore,
      data: data
    };
  }

  displayResults(score, url) {
    const domain = new URL(url).hostname;
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';

    document.getElementById('domain').textContent = domain;
    const gradeElement = document.getElementById('grade');
    gradeElement.textContent = score.final;
    gradeElement.className = `grade ${score.final.charAt(0)}`;

    document.getElementById('summary').textContent = `Score: ${score.score}/100`;

    let trackerCount = 0;
    if (score.data.trackers instanceof Set) {
      trackerCount = score.data.trackers.size;
    } else if (Array.isArray(score.data.trackers)) {
      trackerCount = score.data.trackers.length;
    }

    document.getElementById('trackers').textContent = `${trackerCount} detected`;
    document.getElementById('cookies').textContent = `${score.data.cookies?.length || 0} stored`;
    document.getElementById('fingerprinting').textContent = 
      `${Object.values(score.data.fingerprinting || {}).reduce((a, b) => a + b, 0)} methods`;
    document.getElementById('permissions').textContent = `${score.data.permissions?.size || 0} requested`;
    document.getElementById('forms').textContent = 
      `${score.data.forms?.fields || 0} fields, ${score.data.forms?.sensitive || 0} sensitive`;

    this.generateBadges(score.data, score);
  }

  generateBadges(data, score) {
    const badgesContainer = document.getElementById('badges');
    badgesContainer.innerHTML = '';

    const badges = [];
    
    let trackerCount = 0;
    if (data.trackers instanceof Set) {
      trackerCount = data.trackers.size;
    } else if (Array.isArray(data.trackers)) {
      trackerCount = data.trackers.length;
    }

    if (trackerCount > 10) {
      badges.push({ text: `Heavy Tracking (${trackerCount})`, type: 'danger' });
    } else if (trackerCount > 5) {
      badges.push({ text: `Moderate Tracking (${trackerCount})`, type: 'warning' });
    } else if (trackerCount > 0) {
      badges.push({ text: `Light Tracking (${trackerCount})`, type: 'info' });
    }

    const cookieCount = data.cookies?.length || 0;
    if (cookieCount > 20) {
      badges.push({ text: `Excessive Cookies (${cookieCount})`, type: 'danger' });
    } else if (cookieCount > 10) {
      badges.push({ text: `Many Cookies (${cookieCount})`, type: 'warning' });
    } else if (cookieCount > 0) {
      badges.push({ text: `${cookieCount} Cookies`, type: 'info' });
    }

    const fpCount = Object.values(data.fingerprinting || {}).reduce((a, b) => a + b, 0);
    if (fpCount > 0) {
      badges.push({ text: `Fingerprinting Detected`, type: 'warning' });
    }

    badges.forEach(badge => {
      const element = document.createElement('span');
      element.className = `badge ${badge.type}`;
      element.textContent = badge.text;
      badgesContainer.appendChild(element);
    });

    if (badges.length === 0) {
      const element = document.createElement('span');
      element.className = 'badge info';
      element.textContent = 'Privacy Friendly';
      badgesContainer.appendChild(element);
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

  showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});