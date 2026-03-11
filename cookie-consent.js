/* ═══════════════════════════════════════════════════════════
   COOKIE CONSENT + ADSENSE CONDICIONAL — MolvicStudios
   Script universal para todas las webs.
   
   USO: <script src="cookie-consent.js"></script> antes de </body>
   
   Cada sitio usa su propia clave localStorage para no interferir
   entre dominios. Se genera automáticamente desde el hostname.
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var PUB_ID = 'ca-pub-1513893788851225';
  var CONSENT_KEY = 'molvic_cookie_consent_' + location.hostname.replace(/\./g, '_');

  // IMPORTANTE: reemplaza G-XXXXXXXXXX con tu Measurement ID de Google Analytics 4
  var GA4_ID = 'G-XXXXXXXXXX';

  // ── AdSense loader ──
  function loadAdSense() {
    if (document.querySelector('script[src*="adsbygoogle"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + PUB_ID;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  // ── GA4 loader (solo con consentimiento explícito — RGPD/GDPR) ──
  function loadGA4() {
    if (!GA4_ID || GA4_ID === 'G-XXXXXXXXXX') return; // ID de placeholder, no cargar
    if (document.querySelector('script[src*="googletagmanager.com/gtag"]')) return;
    // Actualizar consent a "granted" antes de cargar el script
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage':         'granted',
        'analytics_storage':  'granted',
        'ad_user_data':       'granted',
        'ad_personalization': 'granted'
      });
    }
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    // Inicializar dataLayer si no lo ha hecho ya el inline script del head
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function(){ window.dataLayer.push(arguments); };
    }
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
  }

  // ── If consent already given, just load and stop ──
  var saved = localStorage.getItem(CONSENT_KEY);
  if (saved === 'accepted') { loadAdSense(); loadGA4(); return; }
  if (saved === 'rejected') {
    (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1;
    loadAdSense();
    return;
  }

  // ── No consent yet: build the banner ──
  function createBanner() {
    // Remove any previous instance
    var old = document.getElementById('molvic-cookie-banner');
    if (old) old.remove();

    var wrap = document.createElement('div');
    wrap.id = 'molvic-cookie-banner';

    // Force it on top of EVERYTHING with shadow DOM isolation
    // This prevents any parent stacking context from pushing it behind
    wrap.style.cssText = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'z-index:2147483647',       // Maximum possible z-index
      'pointer-events:auto',
      'isolation:isolate',         // Creates new stacking context at top level
      'transform:translateZ(0)',   // Forces GPU compositing layer
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
      'font-size:14px',
      'line-height:1.5'
    ].join(';');

    // Inner HTML with fully self-contained styles (no reliance on page CSS)
    wrap.innerHTML =
      '<div style="' +
        'background:#111118;' +
        'border-top:1px solid #333;' +
        'padding:16px 20px;' +
        'box-shadow:0 -6px 30px rgba(0,0,0,0.7);' +
        'color:#e0e0e0;' +
      '">' +
        '<div style="max-width:960px;margin:0 auto;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">' +
          '<div style="flex:1;min-width:220px;font-size:13px;line-height:1.6;">' +
            '\uD83C\uDF6A Este sitio utiliza cookies de Google AdSense para mostrar anuncios. ' +
            'Consulta nuestra <a href="privacidad.html" id="mcc-priv" style="color:#7eb8ff;text-decoration:underline;">Pol\u00edtica de Privacidad</a> ' +
            'y <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener" style="color:#7eb8ff;text-decoration:underline;">c\u00f3mo usa Google los datos</a>.' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-shrink:0;">' +
            '<button id="mcc-accept" style="' +
              'background:#4a8eff;color:#fff;border:none;padding:10px 22px;' +
              'border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;' +
              'transition:background 0.2s;' +
            '">Aceptar</button>' +
            '<button id="mcc-reject" style="' +
              'background:transparent;color:#999;border:1px solid #444;padding:10px 22px;' +
              'border-radius:8px;cursor:pointer;font-size:14px;' +
              'transition:background 0.2s;' +
            '">Solo esenciales</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap);

    // Fix privacy link for sites with different paths
    var privLink = document.getElementById('mcc-priv');
    if (privLink) {
      // Check if /pages/legal/privacidad.html exists (multi-page sites like iafacil)
      if (document.querySelector('a[href*="/pages/legal/privacidad"]')) {
        privLink.href = '/pages/legal/privacidad.html';
      }
      // For Kadath (Vite SPA), use /privacidad.html
      // Default: privacidad.html (relative) works for flat sites
    }

    document.getElementById('mcc-accept').addEventListener('click', function() {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      wrap.remove();
      loadAdSense();
      loadGA4();
    });

    document.getElementById('mcc-reject').addEventListener('click', function() {
      localStorage.setItem(CONSENT_KEY, 'rejected');
      wrap.remove();
      (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1;
      loadAdSense();
    });
  }

  // ── Notificar a Auto Ads que hay un banner de cookies ocupando la parte inferior
  //    para que no coloque un anchor ad encima y se solapem
  function notifyAutoAdsAnchorOffset(visible) {
    // Auto Ads respeta window._googCsa_anchor_offset (px desde abajo)
    // Cuando el banner está visible, desplazamos el anchor ad hacia arriba
    try {
      var bannerH = visible ? 80 : 0;
      window._googCsa_anchor_offset = bannerH;
      // Para publisher tags modernos, también se usa el atributo data-anchor-status
      var anchorAds = document.querySelectorAll('ins.adsbygoogle[data-ad-format="autorelaxed"], ins.adsbygoogle');
      anchorAds.forEach(function(ad) {
        if (ad.dataset && ad.dataset.adFormat === 'autorelaxed') return;
        // noop — Auto Ads gestiona sus propios elementos
      });
    } catch(e) {}
  }

  // ── Ensure banner appears AFTER everything else has rendered ──
  // Use multiple strategies to guarantee visibility:

  // Strategy 1: On DOMContentLoaded (if not yet fired)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() { createBanner(); notifyAutoAdsAnchorOffset(true); }, 300);
    });
  } else {
    // Strategy 2: DOM already ready, wait a tick for game init
    setTimeout(function() { createBanner(); notifyAutoAdsAnchorOffset(true); }, 300);
  }

  // ── Re-inject if something covers it (check 3 times at 3s intervals) ──
  var checks = 0;
  var watchdog = setInterval(function() {
    checks++;
    if (checks > 3) { clearInterval(watchdog); return; }

    var banner = document.getElementById('molvic-cookie-banner');
    if (!banner) {
      // Banner was removed (consent given) — stop checking
      clearInterval(watchdog);
      return;
    }

    // Verify it's actually visible and on top
    var rect = banner.getBoundingClientRect();
    if (rect.height === 0 || rect.width === 0) {
      // Banner collapsed or hidden — recreate
      createBanner();
      return;
    }

    // Check if something is blocking it at center point
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var topEl = document.elementFromPoint(cx, cy);
    if (topEl && !banner.contains(topEl) && topEl !== banner) {
      // Something is on top — re-append to ensure we're last in DOM
      document.body.appendChild(banner);
    }
  }, 3000);

})();
