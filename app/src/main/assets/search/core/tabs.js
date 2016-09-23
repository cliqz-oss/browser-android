System.register("core/tabs", [], function (_export) {
  "use strict";

  _export("queryActiveTabs", queryActiveTabs);

  function queryActiveTabs(window) {
    var selectedBrowser = window.gBrowser.selectedBrowser;
    return Array.prototype.map.call(window.gBrowser.tabs, function (tab, index) {
      return {
        index: index,
        url: tab.linkedBrowser.currentURI.spec,
        isCurrent: selectedBrowser === tab.linkedBrowser
      };
    });
  }

  return {
    setters: [],
    execute: function () {}
  };
});