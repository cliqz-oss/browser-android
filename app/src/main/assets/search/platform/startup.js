System.register("platform/startup", ["core/config"], function (_export) {
  /* global System */
  "use strict";

  var config;

  function loadModule(moduleName) {
    return System["import"](moduleName + "/background").then(function (module) {
      return module["default"].init(config);
    }).then(function () {
      return System["import"](moduleName + "/window");
    }).then(function (module) {
      return new module["default"]({ window: window }).init();
    })["catch"](function (e) {
      CliqzUtils.log("Error on loading module: " + moduleName + " - " + e.toString() + " -- " + e.stack, "Extension");
    });
  }

  return {
    setters: [function (_coreConfig) {
      config = _coreConfig["default"];
    }],
    execute: function () {
      _export("default", function (window) {
        var modules = arguments.length <= 1 || arguments[1] === undefined ? config.modules : arguments[1];

        // intersent config file with
        var modulesToLoad = modules.filter(function (n) {
          return config.modules.indexOf(n) != -1;
        });

        return loadModule("core").then(function () {
          return Promise.all(modulesToLoad.map(loadModule));
        });
      });

      ;
    }
  };
});