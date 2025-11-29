// FOUC Prevention: Apply theme before React loads
// This script runs synchronously to prevent flash of unstyled content
(function () {
  try {
    var stored = localStorage.getItem('local:themePreference');
    if (stored) {
      var pref = JSON.parse(stored);
      var mode = pref.mode;
      var colorTheme = pref.colorTheme;

      // Resolve system preference
      if (mode === 'system') {
        mode = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }

      // Apply dark mode
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      }

      // Apply color theme class
      var themeClasses = {
        lancelot: 'theme-lancelot',
        gawain: 'theme-gawain',
        yvain: 'theme-yvain',
      };
      if (themeClasses[colorTheme]) {
        document.documentElement.classList.add(themeClasses[colorTheme]);
      }
    }
  } catch (e) {
    // Ignore errors - React will handle theme
  }
})();
