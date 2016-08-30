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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvc3RhcnR1cC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7cUNBQVMsY0FBYzs7Ozs7eUJBR1IsT0FBTyxJQUFJLGNBQWMiLCJmaWxlIjoiY29yZS9zdGFydHVwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbm90SW1wbGVtZW50ZWQgfSBmcm9tIFwiY29yZS9wbGF0Zm9ybVwiO1xuaW1wb3J0IHN0YXJ0dXAgZnJvbSBcInBsYXRmb3JtL3N0YXJ0dXBcIjtcblxuZXhwb3J0IGRlZmF1bHQgc3RhcnR1cCB8fCBub3RJbXBsZW1lbnRlZDsiXX0=