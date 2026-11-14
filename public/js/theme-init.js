// Blocking, runs before paint — storage key 'cam-theme', default 'dark',
// try/catch for private-mode safety.
(function () {
  var theme = 'dark';
  try {
    var stored = localStorage.getItem('cam-theme');
    if (stored === 'dark' || stored === 'light') theme = stored;
  } catch (e) {
    // localStorage blocked — fall through to default
  }
  document.documentElement.dataset.theme = theme;
})();
