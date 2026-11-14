// Blocking, runs before paint — storage key 'cam-theme'. A stored choice wins; with none, follow
// prefers-color-scheme; dark when neither is available. Never writes storage (only the toggle does).
(function () {
  var theme = 'dark';
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
  } catch (e) {
    // matchMedia unavailable — keep dark
  }
  try {
    var stored = localStorage.getItem('cam-theme');
    if (stored === 'dark' || stored === 'light') theme = stored;
  } catch (e) {
    // localStorage blocked — fall through to the system default
  }
  document.documentElement.dataset.theme = theme;
})();
