System.register("core/config", [], function (_export) {
  /* global __CONFIG__ */
  // __CONFIG__ is populated by build system
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", Object.freeze(__CONFIG__));
    }
  };
});