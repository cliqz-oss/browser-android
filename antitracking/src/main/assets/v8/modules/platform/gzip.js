System.register("platform/gzip", [], function (_export) {
  "use strict";

  var compress, uncompress;
  return {
    setters: [],
    execute: function () {
      compress = false;

      _export("compress", compress);

      uncompress = false;

      _export("uncompress", uncompress);
    }
  };
});