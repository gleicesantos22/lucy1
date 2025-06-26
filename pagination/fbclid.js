(function() {
  // === CONFIGURATION ===
  // Your actual Facebook Pixel ID
  const FACEBOOK_PIXEL_ID = '1325429335188157';

  /**
   * Retrieves the value of a query parameter from the URL.
   * @param {string} param - The name of the query parameter.
   * @returns {string|null} - The value of the query parameter or null if not found.
   */
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  /**
   * Sets a cookie with the specified name, value, and expiration in days.
   * @param {string} name - The name of the cookie.
   * @param {string} value - The value to be stored in the cookie.
   * @param {number} days - Number of days until the cookie expires.
   */
  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
    console.log(`[setCookie] Set cookie: ${name}=${value}`);
  }

  /**
   * Retrieves the value of a specific cookie.
   * @param {string} name - The name of the cookie.
   * @returns {string|null} - The value of the cookie or null if not found.
   */
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) {
      return decodeURIComponent(match[2]);
    }
    return null;
  }

  /**
   * Stores Facebook data in localStorage.
   * @param {Object} data - An object containing fbclid, fbp, and fbc.
   */
  function storeFacebookData(data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value) {
        window.localStorage.setItem(key, value);
        console.log(`[storeFacebookData] Stored in localStorage: ${key}=${value}`);
      }
    });
  }

  /**
   * Generates a new _fbc value based on fbclid and current timestamp.
   * @param {string} fbclid - The fbclid value from the URL.
   * @returns {string} - The generated _fbc value.
   */
  function generateFbc(fbclid) {
    const timestamp = Math.floor(Date.now() / 1000);
    return `fb.1.${timestamp}.${fbclid}`;
  }

  // === 1) Capture fbclid from the URL, store in cookie and localStorage ===
  const fbclid = getQueryParam('fbclid');
  if (fbclid) {
    console.log(`[fbclid] Found fbclid in URL: ${fbclid}`);
    setCookie('fbclid', fbclid, 30);
    window.localStorage.setItem('fbclid', fbclid);
  } else {
    console.log('[fbclid] No fbclid found in URL.');
  }

  // === 2) Load Facebook Pixel (to generate _fbp if not blocked) ===
  (function(f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ?
        n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
    console.log('[Facebook Pixel] Pixel script loaded.');
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  // Initialize the Pixel
  fbq('init', FACEBOOK_PIXEL_ID);
  console.log(`[Facebook Pixel] Initialized with ID: ${FACEBOOK_PIXEL_ID}`);

  /**
   * Ensures that Pixel has set the _fbp cookie.
   * @param {function} callback - Function to call once _fbp is retrieved or timeout occurs.
   */
  function ensureFbp(callback) {
    const maxAttempts = 20; // Total wait time: 20 * 100ms = 2000ms
    let attempts = 0;
    const interval = setInterval(() => {
      const fbp = getCookie('_fbp');
      if (fbp || attempts >= maxAttempts) {
        clearInterval(interval);
        callback(fbp);
      }
      attempts++;
    }, 100); // Check every 100ms
  }

  /**
   * Ensures that _fbp and _fbc are present, generating _fbc if necessary.
   * Stores all values in localStorage.
   */
  function processFacebookData() {
    ensureFbp((fbp) => {
      if (fbp) {
        window.localStorage.setItem('fbp', fbp);
        console.log(`[fbp] Stored in localStorage: ${fbp}`);
} else {
        // Pixel blocked – synthesise _fbp so we never send “null” 
        const ts   = Math.floor(Date.now() / 1000); 
        const rand = Math.random().toString().slice(2); 
        const generated = `fb.1.${ts}.${rand}`; 
        setCookie('_fbp', generated, 30); 
        window.localStorage.setItem('fbp', generated); 
        console.warn('[fbp] _fbp not found – generated fallback:', generated);
      }

      let fbc = getCookie('_fbc');
      if (fbclid && !fbc) {
        fbc = generateFbc(fbclid);
        setCookie('_fbc', fbc, 30);
        console.log(`[_fbc] Generated and set _fbc: ${fbc}`);
      } else if (fbc) {
        console.log(`[_fbc] Existing _fbc found: ${fbc}`);
      } else {
        console.log('[_fbc] No fbclid present; _fbc not generated.');
      }

      if (fbc) {
        window.localStorage.setItem('fbc', fbc);
        console.log(`[fbc] Stored in localStorage: ${fbc}`);
      } else {
        console.warn('[fbc] _fbc not found or not generated.');
      }

      // Final log of all Facebook data stored
      const storedData = {
        fbclid: window.localStorage.getItem('fbclid') || null,
        fbp: window.localStorage.getItem('fbp') || null,
        fbc: window.localStorage.getItem('fbc') || null
      };
      console.log('[Facebook Data] Final stored data in localStorage:', storedData);
    });
  }

 // === 3) Process Facebook Data after Pixel initialization ===
processFacebookData();

/* === 4) Append fbclid + fbp + fbc to every outbound “Donate” link ========== */
function appendFbParamsToLinks() {
  const fbclid = localStorage.getItem('fbclid') || getCookie('fbclid');
  const fbp    = localStorage.getItem('fbp')    || getCookie('_fbp');
  const fbc    = localStorage.getItem('fbc')    || getCookie('_fbc');

  const extra = {};
  if (fbclid) extra.fbclid = fbclid;
  if (fbp)    extra.fbp    = fbp;
  if (fbc)    extra.fbc    = fbc;
  if (!Object.keys(extra).length) return;            // nothing to add

  /* Add to any link that
     1) already contains the checkout domain,  OR
     2) is marked <a data-keep-fb>
  */
  document.querySelectorAll('a[data-keep-fb], a[href*="YOUR‑CHECKOUT‑DOMAIN.com"]')
    .forEach(a => {
      const u = new URL(a.href);
      Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
      a.href = u.toString();
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    appendFbParamsToLinks();     // handles normal <a> links
    interceptDonateClicks();     // NEW – handles buttons / JS redirects
  });
} else {
  appendFbParamsToLinks();
  interceptDonateClicks();
}

/* === 5) Intercept buttons or forms that jump via JS ==================== */
function interceptDonateClicks() {
  /* put data-donate on the real CTA (<button … data-donate>)            */
  const ctas = document.querySelectorAll('[data-donate]');
  if (!ctas.length) return;

  ctas.forEach(el => {
    el.addEventListener('click', e => {
      /* ── Gather FB parameters wherever they were stored ────────────── */
      const fbclid = localStorage.getItem('fbclid') || getCookie('fbclid');
      const fbp    = localStorage.getItem('fbp')    || getCookie('_fbp');
      const fbc    = localStorage.getItem('fbc')    || getCookie('_fbc');

      /* ── Work out where the button was going to send the visitor ───── */
      let dest =
        (window.config && window.config.checkoutUrl) ||      // from config.js
        el.dataset.url ||                                   // optional override
        el.getAttribute('href');                            // fallback

      if (!dest) return;          // nothing to do

      const u = new URL(dest);
      if (fbclid) u.searchParams.set('fbclid', fbclid);
      if (fbp)    u.searchParams.set('fbp',    fbp);
      if (fbc)    u.searchParams.set('fbc',    fbc);

      /* ── Jump! (and stop the default click if needed) ──────────────── */
      e.preventDefault();
      window.location.href = u.toString();
    });
  });
}


})();            //  <‑‑  keep this closing line

