// Tracker Detection Module
class TrackerDetector {
  constructor() {
    this.trackerLists = new Map();
    this.loadTrackerLists();
  }

  async loadTrackerLists() {
    // EasyPrivacy-style tracker domains
    const trackerData = {
      analytics: [
        'google-analytics.com', 'googletagmanager.com', 'googlesyndication.com',
        'adobe.com', 'omniture.com', 'scorecardresearch.com', 'quantserve.com',
        'chartbeat.com', 'newrelic.com', 'hotjar.com', 'fullstory.com',
        'mixpanel.com', 'segment.com', 'amplitude.com', 'heap.io'
      ],
      advertising: [
        'doubleclick.net', 'googlesyndication.com', 'amazon-adsystem.com',
        'facebook.com', 'adsystem.amazon.com', 'bing.com', 'yahoo.com',
        'outbrain.com', 'taboola.com', 'criteo.com', 'pubmatic.com',
        'rubiconproject.com', 'openx.com', 'adsystem.amazon.co.uk'
      ],
      social: [
        'facebook.net', 'facebook.com', 'twitter.com', 'linkedin.com',
        'pinterest.com', 'instagram.com', 'youtube.com', 'tiktok.com',
        'snapchat.com', 'reddit.com', 'tumblr.com'
      ],
      fingerprinting: [
        'fingerprintjs.com', 'maxmind.com', 'device-api.com',
        'trustpilot.com', 'iovation.com', 'threatmetrix.com',
        'white-ops.com', 'perimeterx.com'
      ],
      heatmaps: [
        'hotjar.com', 'crazyegg.com', 'mouseflow.com', 'luckyorange.com',
        'inspectlet.com', 'clicktale.com', 'sessioncam.com'
      ]
    };

    for (const [category, domains] of Object.entries(trackerData)) {
      this.trackerLists.set(category, new Set(domains));
    }
  }

  analyzeRequest(url, referrer = '') {
    const hostname = this.extractHostname(url);
    const referrerHostname = this.extractHostname(referrer);
    
    // Check if it's a third-party request
    const isThirdParty = hostname !== referrerHostname && referrerHostname !== '';
    
    if (!isThirdParty) {
      return { isTracker: false, category: null, risk: 'low' };
    }

    // Check against known tracker lists
    for (const [category, domains] of this.trackerLists) {
      if (this.matchesDomain(hostname, domains)) {
        return {
          isTracker: true,
          category: category,
          domain: hostname,
          risk: this.assessRisk(category, url)
        };
      }
    }

    // Heuristic detection for unknown trackers
    const heuristicResult = this.heuristicDetection(url, hostname);
    return heuristicResult;
  }

  matchesDomain(hostname, domains) {
    return Array.from(domains).some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  }

  heuristicDetection(url, hostname) {
    const suspiciousPatterns = [
      /analytics?/i, /tracking?/i, /metrics?/i, /stats?/i,
      /pixel/i, /beacon/i, /collect/i, /event/i,
      /ads?/i, /advertisement/i, /doubleclick/i,
      /facebook/i, /google.*analytics/i, /gtag/i
    ];

    const urlLower = url.toLowerCase();
    const hostnameLower = hostname.toLowerCase();

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(urlLower) || pattern.test(hostnameLower)) {
        return {
          isTracker: true,
          category: 'heuristic',
          domain: hostname,
          risk: 'medium',
          pattern: pattern.source
        };
      }
    }

    // Check for tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
      'fbclid', 'gclid', 'msclkid', '_ga', 'mc_eid'
    ];

    const hasTrackingParams = trackingParams.some(param => url.includes(param));
    if (hasTrackingParams) {
      return {
        isTracker: true,
        category: 'tracking_params',
        domain: hostname,
        risk: 'low'
      };
    }

    return { isTracker: false, category: null, risk: 'low' };
  }

  assessRisk(category, url) {
    const highRiskCategories = ['fingerprinting', 'advertising'];
    const mediumRiskCategories = ['analytics', 'heatmaps'];
    
    if (highRiskCategories.includes(category)) {
      return 'high';
    } else if (mediumRiskCategories.includes(category)) {
      return 'medium';
    }
    
    return 'low';
  }

  extractHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  getTrackerStats(trackers) {
    const stats = {
      total: trackers.length,
      byCategory: {},
      byRisk: { low: 0, medium: 0, high: 0 },
      uniqueDomains: new Set()
    };

    trackers.forEach(tracker => {
      // Count by category
      stats.byCategory[tracker.category] = (stats.byCategory[tracker.category] || 0) + 1;
      
      // Count by risk
      stats.byRisk[tracker.risk]++;
      
      // Track unique domains
      stats.uniqueDomains.add(tracker.domain);
    });

    stats.uniqueDomains = stats.uniqueDomains.size;
    return stats;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrackerDetector;
}