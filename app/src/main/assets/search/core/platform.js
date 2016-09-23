System.register('core/platform', ['platform/platform'], function (_export) {
  'use strict';

  var platform, isFirefox, isMobile;

  _export('notImplemented', notImplemented);

  function notImplemented() {
    throw new Error('Not implemented');
  }

  return {
    setters: [function (_platformPlatform) {
      platform = _platformPlatform['default'];
    }],
    execute: function () {
      isFirefox = platform.isFirefox;

      _export('isFirefox', isFirefox);

      isMobile = platform.isMobile;

      _export('isMobile', isMobile);
    }
  };
});