'use strict';

/* ------------------------------------------------------------------ *
 *  script.js — storefront bootloader.
 *  Loads the shared data layer, injects header/footer chrome and
 *  dispatches page-specific behaviours (see assets/js/pages.js).
 * ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', function () {
  /* apply brand colours from the data bundle the moment it loads,
     so admin theme changes show up without waiting for a rebuild */
  if (window.AnonModels && window.AnonModels.applyTheme) {
    const biz = (window.CatalogueData || {}).business;
    if (biz) window.AnonModels.applyTheme(biz, window.document);
  }
  if (window.AnonPages) {
    window.AnonPages.init();
  }
});
