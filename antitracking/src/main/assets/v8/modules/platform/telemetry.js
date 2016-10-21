System.register("platform/telemetry", ["core/cliqz"], function (_export) {
  "use strict";

  var utils;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _export("default", {
        telemetry: function telemetry(payload) {
          utils.log("Sending telemetry", "xxx");
          sendTelemetry(JSON.stringify(payload));
        },
        msgType: 'humanweb'
      });
    }
  };
});