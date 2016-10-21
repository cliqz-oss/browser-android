System.register('core/webrequest', ['platform/webrequest'], function (_export) {
  'use strict';

  var WebRequest;
  return {
    setters: [function (_platformWebrequest) {
      WebRequest = _platformWebrequest['default'];
    }],
    execute: function () {
      _export('default', WebRequest);
    }
  };
});