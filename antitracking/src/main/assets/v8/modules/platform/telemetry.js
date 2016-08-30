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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlbGVtZXRyeS5lcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7eUJBQVMsS0FBSzs7O3lCQUVDO0FBQ2IsaUJBQVMsRUFBQSxtQkFBQyxPQUFPLEVBQUU7QUFDakIsZUFBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN0Qyx1QkFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtTQUN2QztBQUNELGVBQU8sRUFBRSxVQUFVO09BQ3BCIiwiZmlsZSI6InRlbGVtZXRyeS5lcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHV0aWxzIH0gZnJvbSAnY29yZS9jbGlxeic7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgdGVsZW1ldHJ5KHBheWxvYWQpIHtcbiAgICB1dGlscy5sb2coXCJTZW5kaW5nIHRlbGVtZXRyeVwiLCBcInh4eFwiKTtcbiAgICBzZW5kVGVsZW1ldHJ5KEpTT04uc3RyaW5naWZ5KHBheWxvYWQpKVxuICB9LFxuICBtc2dUeXBlOiAnaHVtYW53ZWInXG59XG4iXX0=