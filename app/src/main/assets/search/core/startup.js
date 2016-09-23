System.register("core/startup", ["core/platform", "platform/startup"], function (_export) {
  "use strict";

  var notImplemented, startup;
  return {
    setters: [function (_corePlatform) {
      notImplemented = _corePlatform.notImplemented;
    }, function (_platformStartup) {
      startup = _platformStartup["default"];
    }],
    execute: function () {
      _export("default", startup || notImplemented);
    }
  };
});