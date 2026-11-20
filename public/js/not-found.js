// 404 page: one static file serves every broken URL, so the locale and the
// missing path are only known in the browser. The locale flips before paint;
// the path is filled in once the terminal exists.
(function () {
  var path = window.location.pathname;
  if (/^\/es(\/|$)/.test(path)) document.documentElement.lang = 'es';
  document.addEventListener('DOMContentLoaded', function () {
    var nodes = document.querySelectorAll('.nf-path');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = path;
  });
})();
