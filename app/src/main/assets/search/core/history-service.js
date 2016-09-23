System.register("core/history-service", [], function (_export) {
  "use strict";

  var hs;
  return {
    setters: [],
    execute: function () {
      hs = undefined;

      try {
        hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
      } catch (e) {
        hs = {
          addObserver: function addObserver() {},
          removeObserver: function removeObserver() {}
        };
      }

      _export("default", hs);
    }
  };
});