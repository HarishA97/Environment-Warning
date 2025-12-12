// Background script for Environment Warning extension (Manifest V3)

'use strict';

// Set default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  // Set default color in storage
  await chrome.storage.sync.set({ color: '#3aa757' });
  console.log('Default background color set to green');

  // Enable the extension's action button by default
  chrome.action.enable();

  // Set up declarative content rules
  await setDeclarativeRules();
});

// Set up declarative content rules
async function setDeclarativeRules() {
  // First check if the API is available
  if (!chrome.declarativeContent) {
    console.warn('declarativeContent API is not available');
    return;
  }

  // Remove any existing rules
  try {
    await chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      // Add new rule that matches all URLs
      const rule = {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { schemes: ['http', 'https'] },
          })
        ],
        actions: [new chrome.declarativeContent.ShowAction()]
      };

      // Add the rule
      chrome.declarativeContent.onPageChanged.addRules([rule], function() {
        if (chrome.runtime.lastError) {
          console.error('Error adding rules:', chrome.runtime.lastError);
        } else {
          console.log('Declarative content rules set up');
        }
      });
    });
  } catch (error) {
    console.error('Error setting up declarative content:', error);
  }
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages here if needed
  console.log('Message received in background script:', message);
  
  // Handle environment pattern updates
  if (message.action === 'updateEnvironment') {
    // Force update of the declarative content rules
    setDeclarativeRules().then(() => {
      sendResponse({ status: 'success' });
    }).catch(error => {
      console.error('Error updating environment rules:', error);
      sendResponse({ status: 'error', error: error.message });
    });
    return true; // Keep the message channel open for async response
  }
  
  // Handle environment detection from content script
  if (message.action === 'environmentDetected') {
    console.log('Environment detected:', message.environment);
    // Update the extension icon or UI based on the environment
    updateExtensionIcon(message.environment);
  }
  
  return true; // Keep the message channel open for async response if needed
});

// Update extension icon based on environment
function updateExtensionIcon(environment) {
  let iconPath = 'images/';
  
  switch(environment) {
    case 'production':
      iconPath += 'icon_red16.png';
      break;
    case 'staging':
      iconPath += 'icon_yellow16.png';
      break;
    case 'development':
      iconPath += 'icon_green16.png';
      break;
    default:
      iconPath += 'get_started16.png';
  }
  
  chrome.action.setIcon({
    path: {
      '16': iconPath,
      '32': iconPath.replace('16', '32'),
      '48': iconPath.replace('16', '48'),
      '128': iconPath.replace('16', '128')
    }
  }).catch(error => {
    console.error('Error updating extension icon:', error);
  });
}
