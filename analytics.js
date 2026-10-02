// Analytics bootstrap for bunkwise.in, loaded in <head> on every tracked page:
//   <script src="/analytics.js" data-clarity></script>   (business pages: GA + Microsoft Clarity)
//   <script src="/analytics.js"></script>                (calculator pages: GA only)
// Visitors in Europe/UK are asked first (cookie banner); everyone else is tracked unless they opt out
// via a "Cookie settings" link (any element with data-cookie-settings).
// GA and Clarity are off on localhost; there, website-design.html logs its events to the console instead.
(function () {
    var me = document.currentScript;
    var withClarity = !!(me && me.hasAttribute('data-clarity'));
    var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var KEY = 'bw-consent';

    var choice = null;
    try { choice = localStorage.getItem(KEY); } catch (e) {}
    // ponytail: the browser time zone stands in for location (EU/EEA, UK, Switzerland);
    // a VPN or travelling visitor can be misjudged. Swap for geo-IP or a consent platform if that matters.
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var mustAsk = /^(Europe\/|Atlantic\/(Canary|Madeira|Azores|Reykjavik|Faroe)|Arctic\/Longyearbyen)/.test(tz);
    var granted = choice ? choice === 'granted' : !mustAsk;

    // ── Google Analytics (Consent Mode v2: without consent GA sends cookieless pings only) ──
    if (!local) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { dataLayer.push(arguments); };
        gtag('consent', 'default', {
            analytics_storage: granted ? 'granted' : 'denied',
            ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
        });
        var ga = document.createElement('script');
        ga.async = true;
        ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-WSBK8SX5LT';
        document.head.appendChild(ga);
        gtag('js', new Date());
        gtag('config', 'G-WSBK8SX5LT', { transport_type: 'beacon' });
    }

    // ── Microsoft Clarity: session recordings and heatmaps, loaded only after consent ──
    function clarity() {
        if (local || !withClarity) return;
        if (!window.clarity) {
            (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "yrab4bqyte");
        }
        window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: granted ? 'granted' : 'denied' });
    }
    if (granted) clarity();

    function decide(value) {
        try { localStorage.setItem(KEY, value); } catch (e) {}
        granted = value === 'granted';
        if (window.gtag) gtag('consent', 'update', { analytics_storage: value });
        if (granted || window.clarity) clarity();
        hide();
    }

    // ── Banner ──
    var banner;
    function hide() { if (banner) banner.hidden = true; }
    function show() {
        if (!banner) {
            var css = document.createElement('style');
            css.textContent =
                '.bw-cookie{position:fixed;left:16px;bottom:16px;z-index:1000;max-width:440px;margin-right:16px;padding:16px 18px;' +
                'background:#16181d;color:#f4f3ef;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.3);' +
                'font:14px/1.55 "IBM Plex Sans",system-ui,sans-serif}' +
                '.bw-cookie[hidden]{display:none}' +
                '.bw-cookie p{margin:0 0 12px;color:#d6d8dc}.bw-cookie a{color:#fff;text-underline-offset:2px}' +
                '.bw-cookie div{display:flex;gap:10px}' +
                '.bw-cookie button{flex:1;min-height:42px;border:1px solid #fff;border-radius:4px;background:#fff;color:#16181d;' +
                'font:500 14px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer}' +
                '.bw-cookie button:focus-visible{outline:3px solid #d9a520;outline-offset:2px}';
            document.head.appendChild(css);
            banner = document.createElement('div');
            banner.className = 'bw-cookie';
            banner.setAttribute('role', 'region');
            banner.setAttribute('aria-label', 'Cookie choice');
            banner.innerHTML =
                '<p>We use cookies from Google Analytics' + (withClarity ? ' and Microsoft Clarity' : '') +
                ' to see how people use this site, so we can make it better. They are never used for ads. ' +
                '<a href="' + (withClarity ? '/web-design-privacy.html' : '/privacy.html') + '">Privacy policy</a></p>' +
                '<div><button type="button" data-v="denied">Reject</button><button type="button" data-v="granted">Accept</button></div>';
            banner.addEventListener('click', function (e) {
                var v = e.target.getAttribute && e.target.getAttribute('data-v');
                if (v) decide(v);
            });
            document.body.appendChild(banner);
        }
        banner.hidden = false;
    }

    function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
    ready(function () {
        if (!choice && mustAsk) show();
        document.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('[data-cookie-settings]')) { e.preventDefault(); show(); }
        });
    });
}());
