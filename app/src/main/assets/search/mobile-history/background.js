System.register('mobile-history/background', ['core/base/background'], function (_export) {
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
          'mobile-browser:clear-favorites': jsAPI.clearFavorites,
          'mobile-browser:clear-history': jsAPI.clearHistory
        }
      }));
    }
  };
});