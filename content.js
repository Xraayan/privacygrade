// Content script for PrivacyGrade extension
class PrivacyDetector {
  constructor() {
    this.fingerprintingDetected = new Set();
    this.init();
  }

  init() {
    this.injectDetectionScript();
    this.monitorStorage();
    this.monitorPermissions();
    this.analyzeForms();
    this.setupFingerprintingDetection();
  }

  injectDetectionScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  monitorStorage() {
    // Monitor storage multiple times to catch dynamic changes
    const checkStorage = () => {
      const storageData = {
        local: Object.keys(localStorage).length,
        session: Object.keys(sessionStorage).length,
        indexedDB: 0,
        localSize: JSON.stringify(localStorage).length,
        sessionSize: JSON.stringify(sessionStorage).length
      };

      // Check IndexedDB
      if (window.indexedDB) {
        indexedDB.databases?.().then(dbs => {
          storageData.indexedDB = dbs.length;
          this.sendMessage('storage', storageData);
        }).catch(() => {
          this.sendMessage('storage', storageData);
        });
      } else {
        this.sendMessage('storage', storageData);
      }
    };
    
    // Check storage at multiple intervals
    setTimeout(checkStorage, 1000);
    setTimeout(checkStorage, 3000);
    setTimeout(checkStorage, 5000);
  }

  monitorPermissions() {
    // Monitor permission requests
    const originalQuery = navigator.permissions?.query;
    if (originalQuery) {
      navigator.permissions.query = async (descriptor) => {
        this.sendMessage('permissions', descriptor.name);
        return originalQuery.call(navigator.permissions, descriptor);
      };
    }

    // Monitor geolocation
    const originalGetCurrentPosition = navigator.geolocation?.getCurrentPosition;
    if (originalGetCurrentPosition) {
      navigator.geolocation.getCurrentPosition = (...args) => {
        this.sendMessage('permissions', 'geolocation');
        return originalGetCurrentPosition.apply(navigator.geolocation, args);
      };
    }
  }

  analyzeForms() {
    setTimeout(() => {
      const forms = document.querySelectorAll('form');
      let totalFields = 0;
      let sensitiveFields = 0;

      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        totalFields += inputs.length;

        inputs.forEach(input => {
          const type = input.type?.toLowerCase() || '';
          const name = input.name?.toLowerCase() || '';
          const id = input.id?.toLowerCase() || '';
          
          // Check for sensitive data collection
          if (this.isSensitiveField(type, name, id)) {
            sensitiveFields++;
          }
        });
      });

      this.sendMessage('forms', { fields: totalFields, sensitive: sensitiveFields });
    }, 3000);
  }

  isSensitiveField(type, name, id) {
    const sensitivePatterns = [
      'ssn', 'social', 'phone', 'mobile', 'address', 'birthday', 'birth',
      'age', 'income', 'salary', 'credit', 'card', 'passport', 'license'
    ];
    
    const fieldText = `${type} ${name} ${id}`;
    return sensitivePatterns.some(pattern => fieldText.includes(pattern));
  }

  setupFingerprintingDetection() {
    const self = this;
    
    // Monitor canvas fingerprinting
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      if (this.width > 16 && this.height > 16) {
        self.sendFingerprintingAlert('canvas');
      }
      return originalToDataURL.apply(this, args);
    };

    // Monitor WebGL fingerprinting
    if (window.WebGLRenderingContext) {
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === this.RENDERER || parameter === this.VENDOR) {
          self.sendFingerprintingAlert('webgl');
        }
        return originalGetParameter.call(this, parameter);
      };
    }

    // Monitor AudioContext fingerprinting
    if (window.AudioContext) {
      const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
      AudioContext.prototype.createAnalyser = function() {
        self.sendFingerprintingAlert('audio');
        return originalCreateAnalyser.call(this);
      };
    }
    
    // Monitor font enumeration
    let fontCheckCount = 0;
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        get: function() {
          if (this.style && this.style.fontFamily) {
            fontCheckCount++;
            if (fontCheckCount > 10) {
              self.sendFingerprintingAlert('fonts');
            }
          }
          return originalOffsetWidth.get.call(this);
        }
      });
    }
  }

  sendFingerprintingAlert(method) {
    if (!this.fingerprintingDetected.has(method)) {
      this.fingerprintingDetected.add(method);
      this.sendMessage('fingerprinting', { method });
    }
  }

  sendMessage(type, data) {
    chrome.runtime.sendMessage({ type, data }).catch(() => {
      // Ignore errors if background script isn't ready
    });
  }
}

// Initialize detector when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PrivacyDetector());
} else {
  new PrivacyDetector();
}