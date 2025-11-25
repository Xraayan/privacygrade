// Injected script for deep fingerprinting detection
(function() {
  'use strict';

  // Font enumeration detection
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  
  let fontChecks = 0;
  
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    get: function() {
      if (this.style && this.style.fontFamily) {
        fontChecks++;
        if (fontChecks > 10) {
          window.postMessage({ type: 'fingerprinting', method: 'fonts' }, '*');
        }
      }
      return originalOffsetWidth.get.call(this);
    }
  });

  // Screen and navigator property access monitoring
  const sensitiveProps = [
    'screen.width', 'screen.height', 'screen.colorDepth', 'screen.pixelDepth',
    'navigator.platform', 'navigator.userAgent', 'navigator.language',
    'navigator.languages', 'navigator.hardwareConcurrency'
  ];

  let propAccesses = 0;
  
  sensitiveProps.forEach(prop => {
    const [obj, key] = prop.split('.');
    const target = window[obj];
    if (target && target[key] !== undefined) {
      const original = target[key];
      Object.defineProperty(target, key, {
        get: function() {
          propAccesses++;
          if (propAccesses > 5) {
            window.postMessage({ type: 'fingerprinting', method: 'navigator' }, '*');
          }
          return original;
        }
      });
    }
  });

  // Timezone detection
  const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function() {
    window.postMessage({ type: 'fingerprinting', method: 'timezone' }, '*');
    return originalGetTimezoneOffset.call(this);
  };

})();