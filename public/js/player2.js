// Player 2 lock: the consoles and IDs stay hidden until the Konami code is entered,
// typed or tapped inside a popup that gives no hint. Unlocking is remembered for the session.
(function () {
  var CODE = ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'];
  var KEYMAP = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', b: 'B', B: 'B', a: 'A', A: 'A' };
  var STORE = 'p2-unlocked';

  function init() {
    var root = document.getElementById('player-2');
    if (!root) return;
    var q = function (s) { return root.querySelector(s); };
    var lock = q('[data-p2-lock]'), pad = q('[data-p2-pad]'), prize = q('[data-p2-prize]');
    var marks = q('[data-p2-code]').children, won = q('[data-p2-won]');
    var pos = 0;

    function unlock() {
      lock.hidden = true; prize.hidden = false; won.hidden = false; pad.close();
      root.scrollIntoView({ block: 'start' });
      try { sessionStorage.setItem(STORE, '1'); } catch (e) { /* storage blocked: unlock lasts this view */ }
    }
    function paint() {
      for (var i = 0; i < marks.length; i++) marks[i].classList.toggle('on', i < pos);
    }
    function press(k) {
      if (!pad.open) return;
      pos = k === CODE[pos] ? pos + 1 : (k === CODE[0] ? 1 : 0);
      paint();
      if (pos === CODE.length) unlock();
    }

    try { if (sessionStorage.getItem(STORE)) return; } catch (e) { /* fall through to locked */ }
    lock.hidden = false; prize.hidden = true;
    q('[data-p2-start]').addEventListener('click', function () { pos = 0; paint(); pad.showModal(); pad.querySelector('[data-p2-key]').focus(); });
    pad.addEventListener('click', function (e) { if (e.target === pad) pad.close(); });
    q('[data-p2-reset]').addEventListener('click', function () { pos = 0; paint(); });
    pad.addEventListener('click', function (e) {
      var b = e.target.closest('[data-p2-key]');
      if (b) press(b.getAttribute('data-p2-key'));
    });
    document.addEventListener('keydown', function (e) {
      if (KEYMAP[e.key] && pad.open) { e.preventDefault(); press(KEYMAP[e.key]); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
