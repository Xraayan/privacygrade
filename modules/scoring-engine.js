// Strict Privacy Scoring Engine
class ScoringEngine {
  constructor() {
    this.weights = {
      trackers: 0.40,      // 40% - Most critical
      cookies: 0.20,       // 20% - Storage tracking
      fingerprinting: 0.20, // 20% - Advanced tracking
      permissions: 0.10,   // 10% - Device access
      forms: 0.10         // 10% - Data collection
    };

    // Maximum points per category (higher = better privacy)
    this.maxPoints = {
      trackers: 40,
      cookies: 20,
      fingerprinting: 20,
      permissions: 10,
      forms: 10
    };

    this.gradeThresholds = {
      'A+': 90,
      'A': 80,
      'B': 70,
      'C': 60,
      'D': 50,
      'F': 0
    };
  }

  calculateTrackerScore(trackerData) {
    const { trackers, requests } = trackerData;
    const trackerCount = trackers.size;
    
    // Strict tracker penalties (points out of 40)
    let points;
    if (trackerCount >= 10) points = 0;      // F grade territory
    else if (trackerCount >= 6) points = 8;  // 20% of max (D grade)
    else if (trackerCount >= 3) points = 12; // 30% of max (C grade)
    else points = 40;                        // Full points (A grade)
    
    // Additional penalties for high-risk trackers
    let highRiskCount = 0;
    trackers.forEach(tracker => {
      const [category] = tracker.split(':');
      if (['fingerprinting', 'advertising'].includes(category)) {
        highRiskCount++;
      }
    });
    
    // Severe penalty for any high-risk trackers
    if (highRiskCount > 0) {
      points = Math.min(points, 5); // Cap at 5 points if high-risk trackers present
    }
    
    return points;
  }

  calculateCookieScore(cookieData) {
    const cookies = cookieData.cookies || [];
    const cookieCount = cookies.length;
    
    // Strict cookie penalties (points out of 20)
    let points;
    if (cookieCount >= 20) points = 0;       // F grade
    else if (cookieCount >= 10) points = 1;  // 5% of max (F grade)
    else if (cookieCount >= 6) points = 2;   // 10% of max (D grade)
    else if (cookieCount >= 1) points = 4;   // 20% of max (C grade)
    else points = 20;                        // Full points (A grade)
    
    // Analyze cookie properties for additional penalties
    let trackingCookies = 0;
    let longTermCookies = 0;
    
    cookies.forEach(cookie => {
      if (this.isTrackingCookie(cookie)) {
        trackingCookies++;
      }
      if (this.isLongTerm(cookie.attributes?.expires)) {
        longTermCookies++;
      }
    });
    
    // Severe penalties for tracking/long-term cookies
    if (trackingCookies > 0) {
      points = Math.min(points, 1); // Cap at 1 point
    }
    if (longTermCookies > 5) {
      points = Math.min(points, 2); // Cap at 2 points
    }
    
    return points;
  }

  calculateFingerprintingScore(fingerprintData) {
    const methods = fingerprintData.fingerprinting || {};
    
    // Strong fingerprinting methods (automatic F grade)
    const strongMethods = ['canvas', 'webgl', 'audio'];
    const hasStrongFingerprinting = strongMethods.some(method => methods[method] > 0);
    
    if (hasStrongFingerprinting) {
      return 0; // Zero points for any strong fingerprinting
    }
    
    // Check for moderate fingerprinting signals
    const moderateMethods = ['fonts', 'navigator', 'screen', 'timezone'];
    const moderateSignals = moderateMethods.filter(method => methods[method] > 0).length;
    
    if (moderateSignals >= 3) {
      return 3; // 15% of max points
    } else if (moderateSignals >= 1) {
      return 6; // 30% of max points
    }
    
    return 20; // Full points - no fingerprinting detected
  }

  calculatePermissionScore(permissionData) {
    const permissions = permissionData.permissions || new Set();
    
    // Sensitive permissions that are rarely justified
    const sensitivePerms = ['geolocation', 'camera', 'microphone', 'clipboard'];
    const hasSensitive = Array.from(permissions).some(p => sensitivePerms.includes(p));
    
    if (hasSensitive) {
      return 0; // Zero points for sensitive permissions
    }
    
    // Moderate permissions
    const moderatePerms = ['notifications', 'persistent-storage'];
    const hasModerate = Array.from(permissions).some(p => moderatePerms.includes(p));
    
    if (hasModerate) {
      return 2; // 20% of max points
    }
    
    return 10; // Full points - no concerning permissions
  }

  calculateFormScore(formData) {
    const { fields = 0, sensitive = 0 } = formData.forms || {};
    
    if (sensitive > 5) {
      return 0; // Zero points for excessive sensitive data collection
    } else if (sensitive > 2) {
      return 1; // 10% of max points
    } else if (sensitive > 0) {
      return 3; // 30% of max points (might be justified)
    } else if (fields > 10) {
      return 5; // Many fields but not sensitive
    }
    
    return 10; // Full points - minimal data collection
  }

  calculateOverallScore(data) {
    const scores = {
      trackers: this.calculateTrackerScore(data),
      cookies: this.calculateCookieScore(data),
      fingerprinting: this.calculateFingerprintingScore(data),
      permissions: this.calculatePermissionScore(data),
      forms: this.calculateFormScore(data)
    };
    
    // Calculate base score (sum of all category points)
    let finalScore = scores.trackers + scores.cookies + scores.fingerprinting + 
                    scores.permissions + scores.forms;
    
    // Apply third-party script penalties
    const thirdPartyCount = data.requests?.thirdParty || 0;
    if (thirdPartyCount > 15) {
      finalScore -= 20; // Heavy penalty
    } else if (thirdPartyCount > 8) {
      finalScore -= 10; // Moderate penalty
    }
    
    // Ensure score stays within bounds
    finalScore = Math.max(0, Math.min(100, finalScore));
    
    return {
      individual: scores,
      final: Math.round(finalScore),
      grade: this.scoreToGrade(finalScore),
      thirdPartyPenalty: thirdPartyCount > 8 ? (thirdPartyCount > 15 ? 20 : 10) : 0,
      breakdown: this.generateBreakdown(scores, finalScore)
    };
  }

  scoreToGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  generateBreakdown(scores, finalScore) {
    const breakdown = {};
    
    for (const [category, points] of Object.entries(scores)) {
      const maxPoints = this.maxPoints[category];
      const percentage = Math.round((points / maxPoints) * 100);
      
      let level = 'poor';
      if (percentage >= 80) level = 'excellent';
      else if (percentage >= 60) level = 'good';
      else if (percentage >= 40) level = 'moderate';
      else if (percentage >= 20) level = 'concerning';
      
      breakdown[category] = {
        points: points,
        maxPoints: maxPoints,
        percentage: percentage,
        level: level
      };
    }
    
    return breakdown;
  }

  // Helper methods
  isLongTerm(expires) {
    if (!expires) return true; // Session cookies are considered short-term
    
    try {
      const expiryDate = new Date(expires);
      const now = new Date();
      const daysDiff = (expiryDate - now) / (1000 * 60 * 60 * 24);
      return daysDiff > 30; // More than 30 days is long-term
    } catch {
      return false;
    }
  }

  isTrackingCookie(cookie) {
    const trackingPatterns = [
      /_ga/, /_gid/, /_gat/, /utm_/, /fbp/, /fbc/, /_fbp/,
      /doubleclick/, /adsystem/, /analytics/, /tracking/
    ];
    
    const cookieString = `${cookie.name}=${cookie.value}`.toLowerCase();
    return trackingPatterns.some(pattern => pattern.test(cookieString));
  }

  // Generate detailed report
  generateDetailedReport(data) {
    const score = this.calculateOverallScore(data);
    
    return {
      grade: score.grade,
      finalScore: score.final,
      categories: score.individual,
      breakdown: score.breakdown,
      recommendations: this.generateRecommendations(score),
      summary: this.generateSummary(score, data),
      timestamp: new Date().toISOString()
    };
  }

  generateRecommendations(score) {
    const recommendations = [];
    
    if (score.individual.trackers > 40) {
      recommendations.push({
        category: 'trackers',
        severity: 'high',
        message: 'Consider using an ad blocker or privacy-focused browser'
      });
    }
    
    if (score.individual.fingerprinting > 30) {
      recommendations.push({
        category: 'fingerprinting',
        severity: 'high',
        message: 'This site may be fingerprinting your device'
      });
    }
    
    if (score.individual.cookies > 50) {
      recommendations.push({
        category: 'cookies',
        severity: 'medium',
        message: 'Review and clear cookies regularly'
      });
    }
    
    if (score.individual.permissions > 30) {
      recommendations.push({
        category: 'permissions',
        severity: 'medium',
        message: 'Be cautious about granting device permissions'
      });
    }
    
    return recommendations;
  }

  generateSummary(score, data) {
    const trackerCount = data.trackers?.size || 0;
    const cookieCount = data.cookies?.length || 0;
    const fpMethods = Object.values(data.fingerprinting || {}).reduce((a, b) => a + b, 0);
    
    return {
      grade: score.grade,
      trackers: trackerCount,
      cookies: cookieCount,
      fingerprinting: fpMethods,
      permissions: data.permissions?.size || 0,
      riskLevel: this.getRiskLevel(score.grade)
    };
  }

  getRiskLevel(grade) {
    const riskMap = {
      'A+': 'minimal',
      'A': 'low',
      'B': 'moderate',
      'C': 'concerning',
      'D': 'high',
      'F': 'severe'
    };
    
    return riskMap[grade] || 'unknown';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScoringEngine;
}