System.register("platform/startup", ["core/config", "core/cliqz"], function (_export) {
  /* global System */
  "use strict";

  var config, utils;
  return {
    setters: [function (_coreConfig) {
      config = _coreConfig["default"];
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _export("default", function () {
        var modules = arguments.length <= 0 || arguments[0] === undefined ? config.modules : arguments[0];

        // intersent config file with
        var modulesToLoad = modules.filter(function (n) {
          return config.modules.indexOf(n) != -1;
        });

        return Promise.all(modulesToLoad.map(function (moduleName) {
          return new Promise(function (resolve, reject) {
            System["import"](moduleName + "/background").then(function (module) {
              utils.log("Loaded module " + moduleName, "startup");
              module["default"].init(config.settings);
              utils.log("Initialised module " + moduleName, "startup");
              resolve();
            })["catch"](function (e) {
              utils.log("Error on loading module: " + moduleName + " - " + e.toString() + " -- " + e.stack, "Extension");resolve();
            });
          });
        }));
      });

      ;
    }
  };
});