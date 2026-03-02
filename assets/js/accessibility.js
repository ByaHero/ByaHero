// Global accessibility settings handler
(function() {
  // Apply text size from localStorage
  function applyGlobalTextSize() {
    const textSize = localStorage.getItem('byahero_text_size') || 'medium';
    document.body.classList.remove('text-small', 'text-medium', 'text-large');
    document.body.classList.add('text-' + textSize);
    console.log('Applied text size:', textSize);
  }

  // Apply high contrast mode
  function applyHighContrast() {
    const highContrast = localStorage.getItem('byahero_high_contrast') === '1';
    if (highContrast) {
      document.body.classList.add('high-contrast-mode');
      console.log('High contrast mode enabled');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      applyGlobalTextSize();
      applyHighContrast();
    });
  } else {
    applyGlobalTextSize();
    applyHighContrast();
  }
})();