
// Environment Warning Banner - Content Script
'use strict';

// Create the banner element
const banner = document.createElement('div');
banner.id = 'environment-warning-banner';
banner.style.cssText = `
  width: 100%;
  padding: 10px 20px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease-in-out;
  transform: translateY(-100%);
`;

// Create close button
const closeButton = document.createElement('button');
closeButton.innerHTML = '&times;';
closeButton.style.cssText = `
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0 10px;
  color: inherit;
  opacity: 0.7;
`;
closeButton.title = 'Dismiss warning';
closeButton.addEventListener('click', hideBanner);

// Create banner content
const bannerContent = document.createElement('div');
bannerContent.style.flex = '1';

// Add elements to banner
banner.appendChild(bannerContent);
banner.appendChild(closeButton);

// Add banner to the page
document.documentElement.insertBefore(banner, document.documentElement.firstChild);

// Function to detect environment based on URL patterns
function detectEnvironment() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('envPatterns', (data) => {
      const envPatterns = data.envPatterns || {};
      const currentUrl = window.location.href;
      let detectedEnv = null; // Start with null instead of defaulting to production

      // Check each environment's patterns
      for (const [env, patterns] of Object.entries(envPatterns)) {
        if (!Array.isArray(patterns)) continue;

        for (const pattern of patterns) {
          if (!pattern) continue;

          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(currentUrl)) {
              detectedEnv = env;
              break;
            }
          } catch (e) {
            console.warn(`Invalid regex pattern: ${pattern}`, e);
          }
        }

        if (detectedEnv) break; // Exit early if we found a match
      }

      resolve(detectedEnv || 'production'); // Fall back to 'production' only if no match found
    });
  });
}

// Function to show banner with environment info
async function showBanner(environment) {
  // Set banner style based on environment
  switch (environment) {
    case 'production':
      banner.style.backgroundColor = '#f8d7da';
      banner.style.color = '#721c24';
      banner.style.borderBottom = '2px solid #dc3545';
      bannerContent.innerHTML = `
        <strong>⚠️ PRODUCTION ENVIRONMENT</strong>
        <span style="margin: 0 10px;">|</span>
        You are in a production environment. Proceed with extreme caution.
      `;
      break;
      
    case 'staging':
      banner.style.backgroundColor = '#fff3cd';
      banner.style.color = '#856404';
      banner.style.borderBottom = '2px solid #ffc107';
      bannerContent.innerHTML = `
        <strong>⚠️ STAGING ENVIRONMENT</strong>
        <span style="margin: 0 10px;">|</span>
        This is a staging environment. Changes here won't affect production.
      `;
      break;
      
    case 'test':
      banner.style.backgroundColor = '#cce5ff';
      banner.style.color = '#004085';
      banner.style.borderBottom = '2px solid #007bff';
      bannerContent.innerHTML = `
        <strong>ℹ️ TEST ENVIRONMENT</strong>
        <span style="margin: 0 10px;">|</span>
        This is a test/QA environment. Use this for testing changes.
      `;
      break;
      
    case 'development':
      banner.style.backgroundColor = '#d4edda';
      banner.style.color = '#155724';
      banner.style.borderBottom = '2px solid #28a745';
      bannerContent.innerHTML = `
        <strong>🛠️ DEVELOPMENT ENVIRONMENT</strong>
        <span style="margin: 0 10px;">|</span>
        You are in a development environment. Safe to make changes.
      `;
      break;
      
    default:
      banner.style.backgroundColor = '#e2e3e5';
      banner.style.color = '#383d41';
      banner.style.borderBottom = '2px solid #6c757d';
      bannerContent.innerHTML = `
        <strong>🌐 UNKNOWN ENVIRONMENT</strong>
        <span style="margin: 0 10px;">|</span>
        Environment could not be determined.
      `;
  }

  // Show the banner
  banner.style.transform = 'translateY(0)';
  
  // Notify background script about the detected environment
  try {
    await chrome.runtime.sendMessage({
      action: 'environmentDetected',
      environment: environment,
      url: window.location.href
    });
  } catch (error) {
    console.warn('Error sending environment detection:', error);
  }
}

// Function to hide the banner
function hideBanner() {
  banner.style.transform = 'translateY(-100%)';
  // Store dismissal in session storage
  sessionStorage.setItem('bannerDismissed', 'true');
  sessionStorage.setItem('dismissedEnv', document.documentElement.getAttribute('data-env') || '');
}

// Check if banner was previously shown for this environment
function checkPreviousBannerState() {
  const dismissed = sessionStorage.getItem('bannerDismissed') === 'true';
  const dismissedEnv = sessionStorage.getItem('dismissedEnv');
  const currentEnv = document.documentElement.getAttribute('data-env');
  
  if (dismissed && dismissedEnv === currentEnv) {
    return false;
  }
  
  // Reset session storage if environment changed
  if (dismissedEnv && dismissedEnv !== currentEnv) {
    sessionStorage.removeItem('bannerDismissed');
    sessionStorage.removeItem('dismissedEnv');
  }
  
  return true;
}

// Helper function to check if URL matches any pattern
async function isUrlMatchingAnyPattern(url) {
  const data = await new Promise(resolve => {
    chrome.storage.sync.get('envPatterns', resolve);
  });
  
  const envPatterns = data.envPatterns || {};
  
  for (const patterns of Object.values(envPatterns)) {
    if (!Array.isArray(patterns)) continue;
    
    for (const pattern of patterns) {
      if (!pattern) continue;
      
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(url)) {
          return true;
        }
      } catch (e) {
        console.warn(`Invalid regex pattern: ${pattern}`, e);
      }
    }
  }
  
  return false;
}

// Main initialization
async function init() {
  // Wait for the document to be fully loaded
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }

  // Detect environment
  const environment = await detectEnvironment();
  document.documentElement.setAttribute('data-env', environment);
  
  // Only show banner if URL matches a pattern and banner wasn't dismissed
  const shouldShowBanner = await isUrlMatchingAnyPattern(window.location.href) && 
                          checkPreviousBannerState();
  
  if (shouldShowBanner) {
    await showBanner(environment);
  }

  // Set up observer for single-page applications
  let lastUrl = location.href;
  const observer = new MutationObserver(async () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Re-run detection when URL changes
      const newEnv = await detectEnvironment();
      document.documentElement.setAttribute('data-env', newEnv);
      
      const shouldShowBanner = await isUrlMatchingAnyPattern(location.href) && 
                              checkPreviousBannerState();
      
      if (shouldShowBanner) {
        await showBanner(newEnv);
      } else {
        // Hide banner if URL doesn't match any patterns
        banner.style.transform = 'translateY(-100%)';
      }
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document, {
    childList: true,
    subtree: true
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateEnvironment') {
    // Re-detect environment when requested
    detectEnvironment().then(env => {
      document.documentElement.setAttribute('data-env', env);
      if (env !== 'production' && checkPreviousBannerState()) {
        showBanner(env);
      }
      sendResponse({ status: 'success', environment: env });
    }).catch(error => {
      console.error('Error updating environment:', error);
      sendResponse({ status: 'error', error: error.message });
    });
    return true; // Keep the message channel open for async response
  }
});

// Initialize the content script
init();