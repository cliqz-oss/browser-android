System.register("antitracking/telemetry", ["core/cliqz"], function (_export) {
  "use strict";

  var utils;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _export("default", {
        telemetry: function telemetry(payl) {
          utils.log("No telemetry provider loaded", "attrack");
        },

        msgType: 'humanweb',

        loadFromProvider: function loadFromProvider(provider) {
          var _this = this;

          utils.log("Load telemetry provider: " + provider, "attrack");
          System["import"](provider).then(function (mod) {
            _this.telemetry = mod["default"].telemetry.bind(mod);
            _this.msgType = mod["default"].msgType;
          });
        }
      });
    }
  };
});