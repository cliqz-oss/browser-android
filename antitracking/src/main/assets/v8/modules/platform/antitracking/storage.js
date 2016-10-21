System.register('platform/antitracking/storage', ['platform/storage'], function (_export) {
  'use strict';

  var sto;
  return {
    setters: [function (_platformStorage) {
      sto = _platformStorage['default'];
    }],
    execute: function () {
      _export('default', sto);
    }
  };
});