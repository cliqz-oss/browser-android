System.register("mobile-history/webview", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("window", window);

      _export("document", document);

      _export("Hammer", Hammer);
    }
  };
});