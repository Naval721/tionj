// =============================================================
// CLOUDFLARE EDGE WORKER — IP ROTATION PROXY
// =============================================================
// Deploy via Cloudflare Pages (push to GitHub → connect repo)
// OR via wrangler: wrangler deploy
//
// What this does:
//  • Serves your static app (index.html, styles.css, script.js)
//    from Cloudflare's 300+ global edge nodes.
//    Every session may hit a DIFFERENT data-center IP.
//  • Proxies the Monetag SDK (/proxy/sdk) through the Worker
//    so Monetag's servers see Cloudflare IPs, not your real IP.
//  • Rotates the outgoing UA header on every SDK fetch.
//  • Adds cache-busting so each proxy call is a fresh connection
//    that Cloudflare routes independently (potentially different colo).
// =============================================================

// Realistic mobile UA pool for outgoing proxy requests
const _PROXY_UA = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; OnePlus 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
];

function pickUA() {
    return _PROXY_UA[Math.floor(Math.random() * _PROXY_UA.length)];
}

// Realistic referrers that look like organic traffic
const _REFERRERS = [
    'https://www.google.com/',
    'https://www.google.com/search?q=cloud+sync+tool',
    'https://t.me/',
    'https://web.telegram.org/',
];

function pickRef() {
    return _REFERRERS[Math.floor(Math.random() * _REFERRERS.length)];
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        try {
            // -------------------------------------------------------
            // ROUTE 1: SDK PROXY — /proxy/sdk
            // Browser calls this instead of libtl.com directly.
            // The fetch goes from Cloudflare's edge IP to Monetag.
            // -------------------------------------------------------
            if (url.pathname === '/proxy/sdk') {
                return await handleSdkProxy(request, url);
            }

            // -------------------------------------------------------
            // ROUTE 2: Generic ad-network proxy — /proxy/*
            // Future-proof: catches any other ad calls we want to proxy.
            // -------------------------------------------------------
            if (url.pathname.startsWith('/proxy/')) {
                return await handleGenericProxy(request, url);
            }

            // -------------------------------------------------------
            // ROUTE 3: Static file serving
            // Cloudflare Pages binds static assets to env.ASSETS.
            // For pure Workers deployment, falls back to a passthrough.
            // -------------------------------------------------------
            if (env && env.ASSETS) {
                return env.ASSETS.fetch(request);
            }

            return new Response('Not found', { status: 404 });

        } catch (err) {
            // Never let the Worker crash — return a safe fallback
            return new Response('// worker error', {
                status: 200,
                headers: { 'Content-Type': 'application/javascript' },
            });
        }
    },
};

// -----------------------------------------------------------
// SDK PROXY HANDLER
// Fetches Monetag SDK from the Cloudflare edge, not the browser.
// Monetag logs the Cloudflare data-center IP, not the user's.
// -----------------------------------------------------------
async function handleSdkProxy(request, url) {
    // Cache-buster from browser (already randomised in script.js)
    const cb = url.searchParams.get('cb') || Math.random().toString(36).slice(2);
    const zone = url.searchParams.get('zone') || '10692016';

    // Build upstream URL
    const upstream = `https://libtl.com/sdk.js?${cb}`;

    // Fetch with a fresh, un-cached connection routed through CF edge
    const sdkResp = await fetch(upstream, {
        headers: {
            'User-Agent': pickUA(),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': pickRef(),
            'Origin': `https://${url.hostname}`,
            'Cache-Control': 'no-cache',
        },
        cf: {
            // Force CF to not cache — each request is a fresh TCP connection
            // which Cloudflare may route from a different edge node (different IP)
            cacheEverything: false,
            cacheTtl: 0,
        },
    });

    // If SDK unavailable, send empty JS so page doesn't break
    if (!sdkResp.ok) {
        return new Response(`// SDK fetch failed (${sdkResp.status})`, {
            status: 200,
            headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    const body = await sdkResp.text();

    return new Response(body, {
        status: 200,
        headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            // Expose which CF colo served this — useful for debugging
            'X-Served-By': request.cf?.colo || 'CF',
        },
    });
}

// -----------------------------------------------------------
// GENERIC PROXY — /proxy/https://target.com/path
// Usage: fetch('/proxy/https://libtl.com/any/endpoint')
// -----------------------------------------------------------
async function handleGenericProxy(request, url) {
    // Extract target URL from path: /proxy/https://example.com/path
    const targetPath = url.pathname.replace('/proxy/', '');
    const targetUrl = decodeURIComponent(targetPath) + (url.search || '');

    if (!targetUrl.startsWith('http')) {
        return new Response('Bad proxy target', { status: 400 });
    }

    const proxied = await fetch(targetUrl, {
        method: request.method,
        headers: {
            'User-Agent': pickUA(),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': pickRef(),
            'Cache-Control': 'no-cache',
        },
        cf: { cacheEverything: false, cacheTtl: 0 },
    });

    const respHeaders = new Headers(proxied.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Cache-Control', 'no-store');

    return new Response(proxied.body, {
        status: proxied.status,
        headers: respHeaders,
    });
}
