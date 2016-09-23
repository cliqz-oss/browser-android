System.register('mobile-ui/background', ['core/base/background'], function (_export) {
  /* global jsAPI */

  'use strict';

  var background;
  return {
    setters: [function (_coreBaseBackground) {
      background = _coreBaseBackground['default'];
    }],
    execute: function () {
      _export('default', background({
        enabled: function enabled() {
          return true;
        },
        init: function init() {},

        unload: function unload() {},

        events: {
          'mobile-browser:show': jsAPI.onShow,
          'mobile-browser:search': jsAPI.search,
          'mobile-browser:notify-preferences': jsAPI.setClientPreferences,
          'mobile-browser:restore-blocked-topsites': jsAPI.restoreBlockedTopSites,
          'mobile-browser:reset-state': jsAPI.resetState,
          'mobile-browser:set-search-engine': jsAPI.setDefaultSearchEngine,
          'mobile-browser:publish-card-url': jsAPI.getCardUrl,
          'mobile-browser:showcase-swipe-card': jsAPI.onboardingSwipe
        }
      }));
    }
  };
});