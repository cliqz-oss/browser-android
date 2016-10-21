System.register('core/search-engines', [], function (_export) {
  'use strict';

  _export('setSearchEngine', setSearchEngine);

  function setSearchEngine(engine) {
    Services.search.currentEngine = engine;
  }

  return {
    setters: [],
    execute: function () {
      Components.utils['import']('resource://gre/modules/Services.jsm');
    }
  };
});