System.register('platform/language', [], function (_export) {
  'use strict';

  var CliqzLanguage;
  return {
    setters: [],
    execute: function () {
      CliqzLanguage = {
        stateToQueryString: function stateToQueryString() {
          return '&lang=de,en';
        }
      };

      _export('default', CliqzLanguage);
    }
  };
});