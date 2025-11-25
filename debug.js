// Debug helper for PrivacyGrade extension
// Add this to popup.js for debugging

function debugExtension() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tabId = tabs[0].id;
    
    // Get data from background script
    chrome.runtime.sendMessage({type: 'getScore', tabId}, (response) => {
      console.log('=== PRIVACY GRADE DEBUG ===');
      console.log('Tab ID:', tabId);
      console.log('URL:', tabs[0].url);
      console.log('Response:', response);
      
      if (response && response.data) {
        console.log('Trackers found:', Array.from(response.data.trackers));
        console.log('Cookies:', response.data.cookies.length);
        console.log('Fingerprinting:', response.data.fingerprinting);
        console.log('Requests:', response.data.requests);
        console.log('Score breakdown:', response.individual);
        console.log('Final grade:', response.final, 'Score:', response.score);
      }
    });
  });
}

// Run debug when popup opens
if (typeof window !== 'undefined') {
  window.debugExtension = debugExtension;
  setTimeout(debugExtension, 1000);
}