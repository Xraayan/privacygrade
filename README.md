# PrivacyGrade Browser Extension

A browser extension that evaluates website privacy practices and assigns a clear letter grade (A+ to F). It looks at tracking, data collection, fingerprinting techniques, and other privacy-impacting behaviors to help users instantly understand how invasive a site is.

## Features

- **Tracker Detection**: Finds analytics, advertising, social media, and fingerprinting trackers
- **Cookie Analysis**: Reviews cookie types, lifetimes, and tracking usage
- **Fingerprinting Detection**: Identifies canvas, WebGL, audio, font enumeration, and device fingerprinting attempts
- **Permission Monitoring**: Detects when websites request access to sensitive permissions like location, camera, or microphone
- **Form Analysis**: Flags forms that request excessive or sensitive user data
- **Privacy Scoring**: Calculates a weighted score and assigns a grade from A+ to F
- **Real-time Badge**: Shows the current page's privacy grade directly on the extension badge
- **Clean Popup UI**: Displays a detailed breakdown in a simple rounded-interface design

## Architecture

### Core Components

1. **Background Service Worker** (`background.js`)
   - Monitors network requests
   - Maintains privacy data per tab
   - Connects content scripts with the popup interface

2. **Content Script** (`content.js`)
   - Observes page behavior and storage activity
   - Detects permission prompts and form structures
   - Injects deep-level fingerprinting detection scripts

3. **Injected Script** (`injected.js`)
   - Runs inside the page context
   - Detects canvas, WebGL, and navigator fingerprinting
   - Monitors font enumeration and system property queries

4. **Popup Interface** (`popup.html`, `popup.js`)
   - Shows the privacy grade and detailed analysis
   - Lists trackers, cookie behavior, and fingerprinting attempts
   - Provides recommendations for safer browsing

### Detection Modules

- **tracker-detector.js**: Identifies trackers using domain lists and heuristic analysis
- **fingerprint-detector.js**: Detects advanced fingerprinting techniques
- **scoring-engine.js**: Calculates the weighted score and assigns the final grade

## Scoring System

### Weights
- **Trackers**: 40%
- **Cookies**: 20%
- **Fingerprinting**: 20%
- **Permissions**: 10%
- **Forms**: 10%

### Grade Thresholds
- **A+**: 90–100
- **A**: 80–89
- **B**: 70–79
- **C**: 60–69
- **D**: 50–59
- **F**: 0–49

### Harsh Scoring Rules
- 6+ trackers results in an automatic F
- Strong fingerprinting triggers heavy penalties
- Sites using aggressive tracking techniques are intentionally graded lower

## Installation
1. Download privacygrade.zip
2. Extract the ZIP file
3. Open chrome://extensions/
4. Enable Developer mode
5. Click "Load unpacked"
6. Select the extracted folder

## File Structure

```
privacygrade/
├── manifest.json
├── background.js
├── content.js
├── injected.js
├── popup.html
├── popup.js
├── modules/
│   ├── tracker-detector.js
│   ├── fingerprint-detector.js
│   └── scoring-engine.js
├── data/
│   └── tracker-lists.json
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Usage

1. Install the extension
2. Browse normally; pages are analyzed automatically
3. Click the extension icon to see:
   - Overall privacy grade
   - Tracker counts
   - Cookie behavior
   - Fingerprinting activity
   - Permission requests
   - Form data analysis
4. Check the extension badge for real-time page grades
5. Look for warnings like "Heavy Tracking" or "Likely Fingerprinting"

## Testing

### Manual Testing Tips
- Try news and social media sites to test tracker detection
- Use fingerprinting-heavy services to verify WebGL/canvas checks
- Test maps or video call platforms for permission monitoring
- Visit forms-heavy websites to validate form analysis
- Compare grades across a variety of website types

### Recommended Test Categories
- **High tracking**: News portals, social platforms
- **Fingerprinting**: Banking and anti-fraud services
- **Clean sites**: Privacy-focused or static websites
- **Permission-heavy**: Maps, conferencing tools

## Limitations

- Cannot detect server-side tracking
- Only observes client-side JavaScript behavior
- Some sophisticated fingerprinting may evade detection
- Analysis relies on active page interactions
- Obfuscated or encrypted scripts may reduce visibility

## Contributing

Ways to improve the extension:
- Add more tracker domains to `tracker-lists.json`
- Enhance detection logic in the modules
- Adjust weights inside `scoring-engine.js`
- Improve UI elements in the popup
- Expand fingerprinting detection methods

## License

This project is provided for educational and privacy-protection use. You're free to modify or redistribute it while keeping its privacy-first design principles intact.
