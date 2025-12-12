// Environment types - defined globally
const envTypes = ['production', 'staging', 'development', 'test'];

// Initialize the options page
document.addEventListener('DOMContentLoaded', function() {
  let patterns = {};
  let tabUrl = '';

  // Default patterns
  const defaultPatterns = {
    production: ['\\.prod\\.', '\\.production\\.', '^prod\\.', '\\.com$'],
    staging: ['\\.staging\\.', '\\.stg\\.', '^staging\\.'],
    development: ['localhost', '127\\.0\\.0\\.1', '\\.dev$', '\\.local$', '^dev\\.'],
    test: ['\\.test\\.', '\\.qa\\.', '^test\\.', '\\.test$']
  };

  // Add pattern input
  function addPattern(env) {
    const container = document.getElementById(`${env}-patterns`);
    if (!container) return; // Ensure container exists
    
    const id = `pattern-${env}-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'pattern-input-container';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.className = 'pattern-input';
    input.placeholder = '^example\\.com$';
    input.dataset.env = env;
    
    // Add input event listener for validation
    input.addEventListener('input', function() {
      validatePattern(this);
    });
    
    const removeButton = document.createElement('button');
    removeButton.className = 'danger';
    removeButton.title = 'Remove pattern';
    removeButton.textContent = '×';
    removeButton.addEventListener('click', function() {
      div.remove();
      updatePatternCounts();
    });
    
    div.appendChild(input);
    div.appendChild(removeButton);
    container.appendChild(div);
    input.focus();
    updatePatternCounts();
  }

  // Validate pattern input
  function validatePattern(input) {
    try {
      new RegExp(input.value);
      input.style.borderColor = '#4CAF50';
      input.title = 'Valid regular expression';
      return true;
    } catch (e) {
      input.style.borderColor = '#f44336';
      input.title = 'Invalid regular expression: ' + e.message;
      return false;
    }
  }

  // Show status message
  function showStatus(message, type = 'success') {
    const status = document.getElementById('status');
    if (!status) return;
    
    status.textContent = message;
    status.className = `status-message ${type}`;
    status.style.display = 'inline-block';
    
    if (type === 'success') {
      setTimeout(() => {
        status.textContent = '';
        status.style.display = 'none';
      }, 3000);
    }
  }

  // Get current tab URL for testing patterns
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        tabUrl = url.hostname;
        document.querySelectorAll('.current-url').forEach(el => {
          el.textContent = tabUrl || 'No URL available';
          el.title = tabs[0].url;
        });
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }
    loadPatterns();
  });

  // Load saved patterns
  function loadPatterns() {
    chrome.storage.sync.get('envPatterns', function(data) {
      patterns = data.envPatterns ? JSON.parse(JSON.stringify(data.envPatterns)) : 
                 JSON.parse(JSON.stringify(defaultPatterns));
      renderPatterns();
      updatePatternCounts();
    });
  }

  // Add event listeners for pattern buttons using event delegation
  document.addEventListener('click', (event) => {
    if (event.target.closest('#add-production-pattern')) {
      addPattern('production');
    } else if (event.target.closest('#add-staging-pattern')) {
      addPattern('staging');
    } else if (event.target.closest('#add-development-pattern')) {
      addPattern('development');
    } else if (event.target.closest('#add-test-pattern')) {
      addPattern('test');
    }
  });


  // Render all patterns
  function renderPatterns() {
    envTypes.forEach(env => {
      const container = document.getElementById(`${env}-patterns`);
      if (!container) return;
      
      container.innerHTML = '';
      (patterns[env] || []).forEach((pattern, index) => {
        const id = `pattern-${env}-${index}`;
        const div = document.createElement('div');
        div.className = 'pattern-input-container';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = id;
        input.className = 'pattern-input';
        input.value = pattern;
        input.dataset.env = env;
        
        input.addEventListener('input', function() {
          validatePattern(this);
        });
        
        const removeButton = document.createElement('button');
        removeButton.className = 'danger';
        removeButton.title = 'Remove pattern';
        removeButton.textContent = '×';
        removeButton.addEventListener('click', function() {
          div.remove();
          updatePatternCounts();
        });
        
        div.appendChild(input);
        div.appendChild(removeButton);
        container.appendChild(div);
        validatePattern(input);
      });
    });
  }

  // Update pattern match counts
  function updatePatternCounts() {
    if (!tabUrl) return;
    
    envTypes.forEach(env => {
      const container = document.getElementById(`${env}-patterns`);
      if (!container) return;
      
      const inputs = container.querySelectorAll('.pattern-input');
      let matchCount = 0;
      
      inputs.forEach(input => {
        try {
          if (input.value && new RegExp(input.value).test(tabUrl)) {
            matchCount++;
          }
        } catch (e) {
          // Invalid regex, skip
          console.warn(`Invalid regex: ${input.value}`, e);
        }
      });
      
      const statusElement = document.getElementById(`${env}-status`);
      if (statusElement) {
        statusElement.textContent = `Matches: ${matchCount}`;
        statusElement.className = `status-badge ${matchCount > 0 ? 'success' : ''}`;
      }
    });
  }

  // Save options function
  function save_options() {
    const newPatterns = {};
    let hasErrors = false;
    
    envTypes.forEach(env => {
      const inputs = document.querySelectorAll(`#${env}-patterns .pattern-input`);
      newPatterns[env] = [];
      
      inputs.forEach(input => {
        if (input.value.trim()) {
          if (validatePattern(input)) {
            newPatterns[env].push(input.value);
          } else {
            hasErrors = true;
          }
        }
      });
    });
    
    if (hasErrors) {
      showStatus('Please fix invalid patterns before saving', 'error');
      return;
    }
    
    chrome.storage.sync.set({ envPatterns: newPatterns }, function() {
      patterns = newPatterns;
      showStatus('Settings saved successfully!', 'success');
      
      // Update all tabs with the new patterns
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          if (tab.url && tab.url.startsWith('http')) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateEnvironment' })
              .catch(() => {}); // Ignore errors for tabs that can't receive messages
          }
        });
      });
    });
  }

  // Reset to defaults
  document.getElementById('reset').addEventListener('click', function() {
    if (confirm('Are you sure you want to reset all patterns to defaults? This cannot be undone.')) {
      patterns = JSON.parse(JSON.stringify(defaultPatterns));
      chrome.storage.sync.set({ envPatterns: patterns }, function() {
        renderPatterns();
        updatePatternCounts();
        showStatus('Reset to default patterns', 'success');
      });
    }
  });


  // Initialize the page
  loadPatterns();

  // Add event listener for the save button
  const saveButton = document.getElementById('save');
  if (saveButton) {
    saveButton.addEventListener('click', save_options);
  }

  // Add event listener for the reset button
  const resetButton = document.getElementById('reset');
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      if (confirm('Are you sure you want to reset all patterns to defaults? This cannot be undone.')) {
        patterns = JSON.parse(JSON.stringify(defaultPatterns));
        chrome.storage.sync.set({ envPatterns: patterns }, function() {
          renderPatterns();
          updatePatternCounts();
          showStatus('Reset to default patterns', 'success');
        });
      }
    });
  }

  // Add event listener for the clear button if it exists
  const clearButton = document.getElementById('clear');
  if (clearButton) {
    clearButton.addEventListener('click', function() {
      chrome.storage.sync.set({
        rules: [],
      }, function() {
        showStatus('Cleared all rules', 'success');
      });
    });
  }
});