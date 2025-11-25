// Fingerprinting Detection Module
class FingerprintDetector {
  constructor() {
    this.detectionMethods = new Map();
    this.suspiciousActivity = new Map();
    this.thresholds = {
      canvas: 2,
      webgl: 3,
      audio: 1,
      fonts: 10,
      navigator: 5,
      screen: 3
    };
  }

  // Canvas fingerprinting detection
  detectCanvasFingerprinting(canvas, context) {
    const width = canvas.width;
    const height = canvas.height;
    
    // Suspicious if canvas is used for rendering text or complex shapes
    if (width > 16 && height > 16) {
      const imageData = context.getImageData(0, 0, Math.min(width, 100), Math.min(height, 100));
      const entropy = this.calculateEntropy(imageData.data);
      
      return {
        detected: entropy > 0.5,
        confidence: Math.min(entropy, 1.0),
        method: 'canvas',
        details: { width, height, entropy }
      };
    }
    
    return { detected: false, method: 'canvas' };
  }

  // WebGL fingerprinting detection
  detectWebGLFingerprinting(gl, parameter) {
    const suspiciousParameters = [
      gl.RENDERER, gl.VENDOR, gl.VERSION, gl.SHADING_LANGUAGE_VERSION,
      gl.MAX_TEXTURE_SIZE, gl.MAX_VIEWPORT_DIMS, gl.ALIASED_LINE_WIDTH_RANGE
    ];
    
    if (suspiciousParameters.includes(parameter)) {
      this.incrementActivity('webgl');
      
      return {
        detected: this.getActivityCount('webgl') >= this.thresholds.webgl,
        confidence: Math.min(this.getActivityCount('webgl') / this.thresholds.webgl, 1.0),
        method: 'webgl',
        parameter: this.getParameterName(gl, parameter)
      };
    }
    
    return { detected: false, method: 'webgl' };
  }

  // Audio fingerprinting detection
  detectAudioFingerprinting(audioContext) {
    // Audio fingerprinting typically involves creating oscillators and analysers
    const hasOscillator = audioContext.createOscillator !== undefined;
    const hasAnalyser = audioContext.createAnalyser !== undefined;
    
    if (hasOscillator && hasAnalyser) {
      this.incrementActivity('audio');
      
      return {
        detected: true,
        confidence: 0.8,
        method: 'audio',
        details: { sampleRate: audioContext.sampleRate }
      };
    }
    
    return { detected: false, method: 'audio' };
  }

  // Font enumeration detection
  detectFontEnumeration(element) {
    // Detect when elements are being used to measure font metrics
    if (element.style && element.style.fontFamily) {
      this.incrementActivity('fonts');
      
      const fontCount = this.getActivityCount('fonts');
      return {
        detected: fontCount >= this.thresholds.fonts,
        confidence: Math.min(fontCount / 50, 1.0), // 50+ font checks = high confidence
        method: 'fonts',
        fontFamily: element.style.fontFamily
      };
    }
    
    return { detected: false, method: 'fonts' };
  }

  // Navigator property enumeration
  detectNavigatorFingerprinting(property) {
    const sensitiveProperties = [
      'userAgent', 'platform', 'language', 'languages', 'hardwareConcurrency',
      'deviceMemory', 'maxTouchPoints', 'cookieEnabled', 'doNotTrack'
    ];
    
    if (sensitiveProperties.includes(property)) {
      this.incrementActivity('navigator');
      
      const accessCount = this.getActivityCount('navigator');
      return {
        detected: accessCount >= this.thresholds.navigator,
        confidence: Math.min(accessCount / 10, 1.0),
        method: 'navigator',
        property: property
      };
    }
    
    return { detected: false, method: 'navigator' };
  }

  // Screen property fingerprinting
  detectScreenFingerprinting(property) {
    const screenProperties = [
      'width', 'height', 'colorDepth', 'pixelDepth', 'availWidth', 'availHeight'
    ];
    
    if (screenProperties.includes(property)) {
      this.incrementActivity('screen');
      
      const accessCount = this.getActivityCount('screen');
      return {
        detected: accessCount >= this.thresholds.screen,
        confidence: Math.min(accessCount / 6, 1.0),
        method: 'screen',
        property: property
      };
    }
    
    return { detected: false, method: 'screen' };
  }

  // Battery API fingerprinting (deprecated but still detectable)
  detectBatteryFingerprinting() {
    if (navigator.getBattery || navigator.battery) {
      return {
        detected: true,
        confidence: 0.9,
        method: 'battery',
        details: 'Battery API access detected'
      };
    }
    
    return { detected: false, method: 'battery' };
  }

  // Timezone fingerprinting
  detectTimezoneFingerprinting() {
    // Detect multiple timezone-related calls
    this.incrementActivity('timezone');
    
    const accessCount = this.getActivityCount('timezone');
    return {
      detected: accessCount >= 2,
      confidence: Math.min(accessCount / 3, 1.0),
      method: 'timezone'
    };
  }

  // Helper methods
  incrementActivity(method) {
    const current = this.suspiciousActivity.get(method) || 0;
    this.suspiciousActivity.set(method, current + 1);
  }

  getActivityCount(method) {
    return this.suspiciousActivity.get(method) || 0;
  }

  calculateEntropy(data) {
    const frequency = new Map();
    
    // Count pixel value frequencies
    for (let i = 0; i < data.length; i += 4) {
      const pixel = `${data[i]},${data[i+1]},${data[i+2]}`;
      frequency.set(pixel, (frequency.get(pixel) || 0) + 1);
    }
    
    // Calculate Shannon entropy
    const total = data.length / 4;
    let entropy = 0;
    
    for (const count of frequency.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy / Math.log2(total); // Normalize
  }

  getParameterName(gl, parameter) {
    const parameterNames = {
      [gl.RENDERER]: 'RENDERER',
      [gl.VENDOR]: 'VENDOR',
      [gl.VERSION]: 'VERSION',
      [gl.SHADING_LANGUAGE_VERSION]: 'SHADING_LANGUAGE_VERSION'
    };
    
    return parameterNames[parameter] || 'UNKNOWN';
  }

  // Generate fingerprinting report
  generateReport() {
    const report = {
      totalMethods: this.suspiciousActivity.size,
      detectedMethods: [],
      riskScore: 0,
      confidence: 0
    };

    let totalConfidence = 0;
    let detectedCount = 0;

    for (const [method, count] of this.suspiciousActivity) {
      const threshold = this.thresholds[method] || 1;
      const detected = count >= threshold;
      const confidence = Math.min(count / threshold, 1.0);

      if (detected) {
        report.detectedMethods.push({
          method,
          count,
          confidence,
          riskLevel: this.getRiskLevel(method, confidence)
        });
        detectedCount++;
      }

      totalConfidence += confidence;
    }

    report.confidence = this.suspiciousActivity.size > 0 ? totalConfidence / this.suspiciousActivity.size : 0;
    report.riskScore = detectedCount * 20; // Each method adds 20 points

    return report;
  }

  getRiskLevel(method, confidence) {
    const highRiskMethods = ['canvas', 'webgl', 'audio'];
    const mediumRiskMethods = ['fonts', 'navigator'];
    
    if (highRiskMethods.includes(method) && confidence > 0.7) {
      return 'high';
    } else if (confidence > 0.5) {
      return 'medium';
    }
    
    return 'low';
  }

  reset() {
    this.suspiciousActivity.clear();
    this.detectionMethods.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FingerprintDetector;
}