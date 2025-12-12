// Environment Warning Extension - Popup Script
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const envNameElement = document.getElementById('envName');
  const envStatusElement = document.getElementById('envStatus');
  const warningMessage = document.getElementById('warningMessage');
  const currentUrlElement = document.getElementById('currentUrl');
  const settingsButton = document.getElementById('settingsButton');

  // Open settings page when settings button is clicked
  settingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Function to detect current environment based on URL and user-defined patterns
  async function detectEnvironment() {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.url) {
        throw new Error('Could not get current tab information');
      }

      const url = new URL(tab.url);
      const hostname = url.hostname;
      
      // Update current URL display
      currentUrlElement.textContent = hostname;
      currentUrlElement.title = tab.url;
      
      // Get user-defined patterns from storage, or use defaults
      const data = await chrome.storage.sync.get('envPatterns');
      const defaultPatterns = {
        production: ['\\.prod\\.', '\\.production\\.', '^prod\\.', '\\.com$'],
        staging: ['\\.staging\\.', '\\.stg\\.', '^staging\\.'],
        development: ['localhost', '127\\.0\\.0\\.1', '\\.dev$', '\\.local$', '^dev\\.'],
        test: ['\\.test\\.', '\\.qa\\.', '^test\\.']
      };
      
      const patterns = data.envPatterns || defaultPatterns;

      // Check each environment's patterns
      for (const [env, envPatterns] of Object.entries(patterns)) {
        if (envPatterns.some(pattern => {
          try {
            return new RegExp(pattern).test(hostname);
          } catch (e) {
            console.error('Invalid regex pattern:', pattern, e);
            return false;
          }
        })) {
          return {
            environment: env,
            url: hostname,
            isProduction: env === 'production',
            isStaging: env === 'staging',
            isDevelopment: env === 'development',
            isTest: env === 'test'
          };
        }
      }

      // If no patterns matched, default to production for safety
      return {
        environment: 'production',
        url: hostname,
        isProduction: true,
        isStaging: false,
        isDevelopment: false,
        isTest: false
      };
    } catch (error) {
      console.error('Error detecting environment:', error);
      return {
        environment: 'unknown',
        url: 'N/A',
        isProduction: false,
        isStaging: false,
        isDevelopment: false,
        isTest: false,
        error: error.message
      };
    }
  }

  // Update the UI with environment information
  async function updateUI() {
    try {
      const envInfo = await detectEnvironment();
      
      // Update environment name
      envNameElement.textContent = envInfo.environment.toUpperCase();
      
      // Update status and warning message based on environment
      if (envInfo.isProduction) {
        envStatusElement.textContent = 'Production';
        envStatusElement.style.backgroundColor = '#f8d7da';
        envStatusElement.style.color = '#721c24';
        warningMessage.style.display = 'block';
        warningMessage.className = 'warning alert';
        warningMessage.innerHTML = `
          <strong>⚠️ Production Environment</strong>
          <div style="margin-top: 5px;">
            You are in a production environment. Proceed with extreme caution.
            Any changes made here will affect real users and data.
          </div>
        `;
      } else if (envInfo.isStaging) {
        envStatusElement.textContent = 'Staging';
        envStatusElement.style.backgroundColor = '#fff3cd';
        envStatusElement.style.color = '#856404';
        warningMessage.style.display = 'block';
        warningMessage.className = 'warning';
        warningMessage.innerHTML = `
          <strong>⚠️ Staging Environment</strong>
          <div style="margin-top: 5px;">
            This is a staging environment. Changes here won't affect production,
            but be mindful of test data and configurations.
          </div>
        `;
      } else if (envInfo.isDevelopment) {
        envStatusElement.textContent = 'Development';
        envStatusElement.style.backgroundColor = '#d4edda';
        envStatusElement.style.color = '#155724';
        warningMessage.style.display = 'block';
        warningMessage.className = 'warning success';
        warningMessage.textContent = '✓ You are in a development environment. Safe to make changes.';
      } else if (envInfo.isTest) {
        envStatusElement.textContent = 'Test';
        envStatusElement.style.backgroundColor = '#cce5ff';
        envStatusElement.style.color = '#004085';
        warningMessage.style.display = 'block';
        warningMessage.className = 'warning';
        warningMessage.innerHTML = `
          <strong>ℹ️ Test Environment</strong>
          <div style="margin-top: 5px;">
            This is a test/QA environment. Use this for testing changes before production.
          </div>
        `;
      } else {
        envStatusElement.textContent = 'Unknown';
        envStatusElement.style.backgroundColor = '#f8f9fa';
        envStatusElement.style.color = '#383d41';
        warningMessage.style.display = 'block';
        warningMessage.className = 'warning';
        warningMessage.textContent = 'Environment not recognized. Check your pattern settings.';
      }
      
    } catch (error) {
      console.error('Error updating UI:', error);
      envNameElement.textContent = 'Error';
      envNameElement.style.backgroundColor = '#f8d7da';
      envNameElement.style.color = '#721c24';
      envStatusElement.textContent = 'Error';
      warningMessage.style.display = 'block';
      warningMessage.className = 'warning alert';
      warningMessage.innerHTML = `
        <strong>⚠️ Error Detecting Environment</strong>
        <div style="margin-top: 5px;">
          ${error.message || 'Unknown error occurred'}
        </div>
      `;
    }
  }


  // Initialize the popup
  updateUI();
  
  // Update when the popup is opened or when the tab changes
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateUI();
    }
  });
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TAB_UPDATED' || message.type === 'TAB_ACTIVATED') {
      updateUI();
    }
  });
});
