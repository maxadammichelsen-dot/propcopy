/* Estatio Tracking Pixel v1 – embed with:
   <script src="https://your-app.com/track.js" data-agency="AGENCY_ID" async></script>
   Optional: data-object="OBJECT_ID" for listing-level tracking */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var agencyId = script.getAttribute('data-agency');
  var objectId = script.getAttribute('data-object') || null;
  if (!agencyId) return;

  var origin = (function () {
    try { return new URL(script.src).origin; } catch (e) { return ''; }
  })();

  /* ── ID helpers ─────────────────────────────────── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  var sessionId = (function () {
    try {
      var k = '_pc_s', v = sessionStorage.getItem(k);
      if (!v) { v = uid(); sessionStorage.setItem(k, v); }
      return v;
    } catch (e) { return uid(); }
  })();

  var fingerprintId = (function () {
    try {
      var k = '_pc_f', v = localStorage.getItem(k);
      if (!v) { v = uid(); localStorage.setItem(k, v); }
      return v;
    } catch (e) { return uid(); }
  })();

  /* ── Send event ─────────────────────────────────── */
  function send(event, metadata, email) {
    var payload = JSON.stringify({
      agency_id: agencyId,
      object_id: objectId,
      session_id: sessionId,
      fingerprint_id: fingerprintId,
      event: event,
      email: email || null,
      metadata: metadata || {},
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          origin + '/api/track',
          new Blob([payload], { type: 'application/json' })
        );
      } else {
        fetch(origin + '/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {}
  }

  /* ── Pageview ────────────────────────────────────── */
  send('pageview', { url: location.pathname, ref: document.referrer.slice(0, 200) });

  /* ── Scroll depth ────────────────────────────────── */
  var maxScroll = 0;
  var scrollTimer;
  window.addEventListener('scroll', function () {
    var total = document.body.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    var pct = Math.round((window.scrollY / total) * 100);
    if (pct > maxScroll) {
      maxScroll = pct;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        if (maxScroll >= 50) send('scroll_depth', { percent: maxScroll });
      }, 1500);
    }
  }, { passive: true });

  /* ── Time on page ────────────────────────────────── */
  var start = Date.now();
  var reached = {};
  var timer = setInterval(function () {
    var s = Math.round((Date.now() - start) / 1000);
    [30, 60, 120].forEach(function (t) {
      if (s >= t && !reached[t]) {
        reached[t] = true;
        send('time_on_page', { seconds: s });
      }
    });
  }, 10000);

  window.addEventListener('pagehide', function () {
    clearInterval(timer);
    var s = Math.round((Date.now() - start) / 1000);
    if (s >= 5 && !reached[30]) send('time_on_page', { seconds: s });
  });

  /* ── Email capture ───────────────────────────────── */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || typeof form.querySelector !== 'function') return;
    var emailEl = form.querySelector('input[type="email"]');
    if (emailEl && emailEl.value) {
      send('email_captured', {}, emailEl.value);
    } else {
      send('form_submit', {});
    }
  });
})();
