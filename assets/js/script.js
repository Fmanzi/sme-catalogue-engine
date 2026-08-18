'use strict';

/* ------------------------------------------------------------------ *
 *  script.js — storefront bootloader.
 *  Loads the shared data layer, injects header/footer chrome and
 *  dispatches page-specific behaviours (see assets/js/pages.js).
 * ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', function () {
  if (window.AnonPages) {
    window.AnonPages.init();
  }
});
