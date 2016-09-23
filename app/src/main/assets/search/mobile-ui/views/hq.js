System.register('mobile-ui/views/hq', ['mobile-ui/views/generic'], function (_export) {
  'use strict';

  var generic;
  return {
    setters: [function (_mobileUiViewsGeneric) {
      generic = _mobileUiViewsGeneric['default'];
    }],
    execute: function () {
      _export('default', generic);
    }
  };
});