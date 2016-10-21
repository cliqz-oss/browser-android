System.register('platform/language', [], function (_export) {
  'use strict';

  return {
    setters: [],
    execute: function () {
      _export('default', {
        state: function state() {
          return ['de', 'en'];
        }
      });
    }
  };
});