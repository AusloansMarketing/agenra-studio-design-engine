/*
  STUDIO SHARED DESIGN ENGINE
  animate.js — v1.2.0

  v1.2.0 adds nav dropdown and mobile menu toggle behavior — see the
  bottom of this file. Everything above (scroll/reveal presets, modal
  system) is unchanged from v1.1.0.

  Loaded identically on every client site, after gsap.min.js and
  ScrollTrigger.min.js, via Site Settings -> Head Tracking Code.

  Elements opt in with a data-animate attribute:

    <div data-animate="fade-up">...</div>
    <div data-animate="stagger-up">
      <div class="card">...</div>
      <div class="card">...</div>
    </div>
    <h2 data-animate="hero-in">...</h2>
    <span data-animate="count-up" data-count-to="1940" data-count-prefix="$">0</span>
    <img data-animate="parallax" data-parallax-speed="0.3" src="...">

  This file defines HOW each preset behaves. It never decides WHICH
  elements use WHICH preset, and it never decides whether a preset is
  used at all on a given site — that's authored per client, in that
  client's own HTML, following that client's Design System Document.
  A client whose motion rules say "no count-up, no parallax" simply
  never has data-animate="count-up" written into its pages; the
  preset stays available here for the clients who do want it.

  Timing reads from CSS custom properties so a client can retune pace
  without touching this file:
    --reveal-dur        (fallback 600ms)
    --reveal-dur-slow   (fallback 900ms, hero-level moments only)
    --reveal-ease       (fallback cubic-bezier(.16,.84,.24,1))
    --reveal-distance   (fallback 24px, fade-up travel distance)
    --reveal-stagger    (fallback 80ms, delay between staggered items)
*/

(function () {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    // Fail safe: if GSAP didn't load (blocked, slow network, JS
    // optimisation delay), reveal everything immediately rather than
    // leaving content stuck at opacity: 0 forever.
    document.querySelectorAll("[data-animate]").forEach(function (el) {
      el.classList.remove("is-pending");
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var root = getComputedStyle(document.documentElement);
  function cssVar(name, fallback) {
    var v = root.getPropertyValue(name).trim();
    return v || fallback;
  }
  function cssMs(name, fallbackMs) {
    var v = cssVar(name, "");
    if (!v) return fallbackMs / 1000;
    var n = parseFloat(v);
    if (isNaN(n)) return fallbackMs / 1000;
    return v.indexOf("ms") > -1 ? n / 1000 : n;
  }

  var DUR = cssMs("--reveal-dur", 600);
  var DUR_SLOW = cssMs("--reveal-dur-slow", 900);
  var EASE = cssVar("--reveal-ease", "power2.out");
  var DIST = parseFloat(cssVar("--reveal-distance", "24")) || 24;
  var STAGGER = cssMs("--reveal-stagger", 80);

  function reveal(el) {
    el.classList.remove("is-pending");
  }

  var presets = {
    "fade-up": function (el) {
      reveal(el);
      if (reducedMotion) { gsap.set(el, { opacity: 1, y: 0 }); return; }
      gsap.from(el, { opacity: 0, y: DIST, duration: DUR, ease: EASE });
    },

    "fade-in": function (el) {
      reveal(el);
      gsap.from(el, { opacity: 0, duration: DUR, ease: EASE });
    },

    "scale-in": function (el) {
      reveal(el);
      if (reducedMotion) { gsap.set(el, { opacity: 1, scale: 1 }); return; }
      gsap.from(el, { opacity: 0, scale: 0.94, duration: DUR, ease: EASE });
    },

    "stagger-up": function (el) {
      var items = el.children.length ? Array.prototype.slice.call(el.children) : [el];
      items.forEach(reveal);
      if (reducedMotion) { gsap.set(items, { opacity: 1, y: 0 }); return; }
      gsap.from(items, {
        opacity: 0,
        y: DIST,
        duration: DUR,
        ease: EASE,
        stagger: Math.min(STAGGER, 0.6 / Math.max(items.length, 1)) // caps total stagger spread regardless of item count
      });
    },

    "hero-in": function (el) {
      // Fires on load, not on scroll — the hero is already in view.
      var items = el.children.length ? Array.prototype.slice.call(el.children) : [el];
      items.forEach(reveal);
      if (reducedMotion) { gsap.set(items, { opacity: 1, y: 0 }); return; }
      gsap.from(items, {
        opacity: 0,
        y: DIST,
        duration: DUR_SLOW,
        ease: EASE,
        stagger: STAGGER
      });
    },

    "count-up": function (el) {
      reveal(el);
      var target = parseFloat(el.dataset.countTo || el.textContent.replace(/[^0-9.]/g, ""));
      var prefix = el.dataset.countPrefix || "";
      var suffix = el.dataset.countSuffix || "";
      var decimals = el.dataset.countDecimals ? parseInt(el.dataset.countDecimals, 10) : 0;
      if (isNaN(target)) return;
      if (reducedMotion) {
        el.textContent = prefix + target.toLocaleString(undefined, { minimumFractionDigits: decimals }) + suffix;
        return;
      }
      var obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: DUR_SLOW,
        ease: "power1.out",
        onUpdate: function () {
          el.textContent = prefix + obj.val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        }
      });
    },

    "parallax": function (el) {
      reveal(el);
      if (reducedMotion) return; // parallax is pure atmosphere — skip entirely, nothing is lost
      var speed = parseFloat(el.dataset.parallaxSpeed || "0.3");
      gsap.to(el, {
        yPercent: speed * 20,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    }
  };

  function init() {
    document.querySelectorAll("[data-animate]").forEach(function (el) {
      var kind = el.dataset.animate;
      var run = presets[kind];
      if (!run) { reveal(el); return; }

      if (kind === "hero-in") {
        run(el);
        return;
      }

      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: function () { run(el); }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/*
  Modal system — data-attribute driven, same spirit as data-animate.

  Trigger any CTA with:
    <button class="btn btn--accent" data-open-modal="finance-app">Compare rates</button>

  Markup the modal once per page (placed anywhere, e.g. just before </body>):
    <div class="dialog__scrim" id="modal-finance-app" data-modal>
      <div class="dialog dialog--iframe">
        <button class="icon-btn dialog__close" data-close-modal aria-label="Close">
          <!-- close icon svg -->
        </button>
        <!-- PLACEHOLDER: swap in the real finance application iframe once supplied -->
        <iframe src="about:blank" title="Finance application"></iframe>
      </div>
    </div>

  Multiple different modals can exist on one page (different data-open-modal
  values matched to different element IDs) — not every CTA has to point at
  the same widget if that ever changes.
*/
(function () {
  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-open-modal]");
    if (opener) {
      var modal = document.getElementById("modal-" + opener.dataset.openModal);
      if (modal) modal.classList.add("is-open");
      return;
    }
    // Close on backdrop click (clicking the scrim itself, not its contents) or the close button
    var scrim = e.target.closest("[data-modal]");
    var isBackdropClick = scrim && e.target === scrim;
    var closer = e.target.closest("[data-close-modal]");
    if (isBackdropClick || closer) {
      var openModal = e.target.closest(".dialog__scrim");
      if (openModal) openModal.classList.remove("is-open");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".dialog__scrim.is-open").forEach(function (m) {
      m.classList.remove("is-open");
    });
  });
})();

/*
  Navigation — dropdown menus and mobile toggle.

  Markup contract:
    <div class="nav-dropdown">
      <button class="nav-dropdown__trigger" aria-expanded="false">Services</button>
      <div class="nav-dropdown__menu">...</div>
    </div>

    <button class="nav-mobile-toggle icon-btn" data-nav-toggle aria-expanded="false" aria-label="Open menu">...</button>
    <nav class="nav-primary" data-nav-primary>...</nav>
*/
(function () {
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest(".nav-dropdown__trigger");
    var clickedInsideDropdown = e.target.closest(".nav-dropdown");

    if (trigger) {
      var dropdown = trigger.closest(".nav-dropdown");
      var wasOpen = dropdown.classList.contains("is-open");
      document.querySelectorAll(".nav-dropdown.is-open").forEach(function (d) {
        d.classList.remove("is-open");
        d.querySelector(".nav-dropdown__trigger").setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        dropdown.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
      return;
    }

    // Click outside any dropdown closes all of them
    if (!clickedInsideDropdown) {
      document.querySelectorAll(".nav-dropdown.is-open").forEach(function (d) {
        d.classList.remove("is-open");
        d.querySelector(".nav-dropdown__trigger").setAttribute("aria-expanded", "false");
      });
    }

    var mobileToggle = e.target.closest("[data-nav-toggle]");
    if (mobileToggle) {
      var nav = document.querySelector("[data-nav-primary]");
      if (!nav) return;
      var isOpen = nav.classList.toggle("is-open");
      mobileToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".nav-dropdown.is-open").forEach(function (d) {
      d.classList.remove("is-open");
      d.querySelector(".nav-dropdown__trigger").setAttribute("aria-expanded", "false");
    });
  });
})();
