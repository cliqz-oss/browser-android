System.register("platform/browser", [], function (_export) {
  "use strict";

  _export("currentURI", currentURI);

  _export("contextFromEvent", contextFromEvent);

  _export("isWindowActive", isWindowActive);

  _export("forEachWindow", forEachWindow);

  function currentURI() {}

  function contextFromEvent() {
    return null;
  }

  function isWindowActive(windowID) {
    return _nativeIsWindowActive(windowID);
  }

  function forEachWindow(fn) {
    return;
  }

  return {
    setters: [],
    execute: function () {
      ;
    }
  };
});