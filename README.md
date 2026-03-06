# Telegram Mini App – Utility Hub (Monetag Ready)

Single-page Telegram Mini App that mirrors a utility dashboard and integrates Monetag rewarded interstitials. Replace the Monetag zone ID and deploy to your bot’s `web_app` URL.

## Quick start
1) Replace the Monetag zone id in both `index.html` and `script.js` (currently `10362431`) with your own main zone.  
2) Update the SDK script `src` to the official Monetag URL from your dashboard.  
3) Serve the folder (any static host). Example: `npx serve .`  
4) In BotFather, set your Mini App URL to the hosted `index.html`.  
5) Test **inside Telegram** to ensure safe-area offsets are correct.

## Files
- `index.html` – layout, CTA buttons, Monetag script tag, Telegram SDK.
- `styles.css` – glassy cards and theme toggle.
- `script.js` – preload/show logic with ymid + requestVar, fallback hook.

## Monetag integration notes
- The Monetag SDK exposes `show_<ZONE>()` as a global function. We build the name from your main zone (currently `10362431`).
- Preload is triggered on load and via the “Preload Ad” button. A “Watch & Earn” button shows the ad or falls back.
- `ymid` uses the Telegram user id when available, otherwise `guest`.
- `requestVar` is set to `main-preload` / `main-show` so you can segment CPM by placement.
- Always handle `.catch()`; the sample triggers `showFallbackAd()` for your backup monetization.
- Reward logic lives in `rewardUser()` (currently an alert); replace with your coin/benefit handler.

## Launch checklist for higher eCPM
- Use a single main zone and map additional placements via `requestVar`.
- Preload on app open; keep the CTA disabled until ready in a production build.
- Gate valuable actions behind the rewarded interstitial resolution (in `.then()`).
- Pass stable `ymid` for all calls so postbacks tie to real users/events.
- Avoid multiple SDK script tags or using sub-zone ids.

## Theming & UI
- `body.light` toggles a light palette via the “Toggle Theme” button.
- Cards and buttons can be retitled without touching the ad logic.

## Fallbacks
- Implement your backup ads inside `showFallbackAd()` (e.g., another network, cross-promo, or a “try again” toast).

