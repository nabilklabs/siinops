// imports.js - File to import all scripts in the correct order

// Order matters - load utilities first, then services, then main
document.addEventListener('DOMContentLoaded', function() {
  // Helper to dynamically load scripts in sequence
  function loadScriptInOrder(scripts, index) {
    if (index >= scripts.length) return; // Done loading all scripts
    
    const script = document.createElement('script');
    script.src = scripts[index];
    
    script.onload = function() {
      // Load the next script when this one is done
      loadScriptInOrder(scripts, index + 1);
    };
    
    script.onerror = function() {
      console.error(`Failed to load script: ${scripts[index]}`);
      const errorDiv = document.createElement('div');
      errorDiv.style.color = 'red';
      errorDiv.innerHTML = `Failed to load: ${scripts[index]}`;
      document.body.appendChild(errorDiv);
      // Try to continue with next script even if one fails
      loadScriptInOrder(scripts, index + 1);
    };
    
    document.body.appendChild(script);
  }
  
  // Define scripts in the order they should be loaded
  const scripts = [
    // Utilities (no dependencies)
    './js/dateUtils.js',
    './js/geoUtils.js',
    './js/navigationUtils.js',
    './js/uiUtils.js',
    
    // Services (depend on utilities)
    './js/dataService.js',
    './js/orderProcessingService.js',
    './js/uiRendererService.js',
    './js/orderService.js',
    
    // Main script (depends on everything else)
    './js/main.js'
  ];
  
  // Start loading scripts in sequence
  loadScriptInOrder(scripts, 0);
});