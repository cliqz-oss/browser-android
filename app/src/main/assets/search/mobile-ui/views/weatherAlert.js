System.register('mobile-ui/views/weatherAlert', ['mobile-ui/views/weatherEZ'], function (_export) {
  'use strict';

  var weatherEZ;
  return {
    setters: [function (_mobileUiViewsWeatherEZ) {
      weatherEZ = _mobileUiViewsWeatherEZ['default'];
    }],
    execute: function () {
      _export('default', weatherEZ);
    }
  };
});