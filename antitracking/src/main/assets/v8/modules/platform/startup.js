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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0YXJ0dXAuZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O3lCQUVTLEtBQUs7Ozt5QkFFQyxZQUFvQztZQUExQixPQUFPLHlEQUFHLE1BQU0sQ0FBQyxPQUFPOzs7QUFFL0MsWUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBRTtBQUM3QyxpQkFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUMxQyxDQUFDLENBQUM7O0FBRUgsZUFBTyxPQUFPLENBQUMsR0FBRyxDQUNoQixhQUFhLENBQUMsR0FBRyxDQUFFLFVBQUEsVUFBVSxFQUFJO0FBQy9CLGlCQUFPLElBQUksT0FBTyxDQUFFLFVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBSztBQUN2QyxrQkFBTSxVQUFPLENBQUMsVUFBVSxHQUFDLGFBQWEsQ0FBQyxDQUNwQyxJQUFJLENBQUUsVUFBQSxNQUFNLEVBQUk7QUFDZixtQkFBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDcEQsb0JBQU0sV0FBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDckMsbUJBQUssQ0FBQyxHQUFHLENBQUMscUJBQXFCLEdBQUcsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3pELHFCQUFPLEVBQUUsQ0FBQzthQUNYLENBQUMsU0FDSSxDQUFFLFVBQUEsQ0FBQyxFQUFJO0FBQUUsbUJBQUssQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEdBQUMsVUFBVSxHQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQUFBQyxPQUFPLEVBQUUsQ0FBQzthQUFFLENBQUMsQ0FBQTtXQUNqSSxDQUFDLENBQUM7U0FDSixDQUFDLENBQ0gsQ0FBQztPQUNIOztBQUFBLE9BQUMiLCJmaWxlIjoic3RhcnR1cC5lcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbCBTeXN0ZW0gKi9cbmltcG9ydCBjb25maWcgZnJvbSBcImNvcmUvY29uZmlnXCI7XG5pbXBvcnQgeyB1dGlscyB9IGZyb20gXCJjb3JlL2NsaXF6XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChtb2R1bGVzID0gY29uZmlnLm1vZHVsZXMpIHtcbiAgLy8gaW50ZXJzZW50IGNvbmZpZyBmaWxlIHdpdGhcbiAgY29uc3QgbW9kdWxlc1RvTG9hZCA9IG1vZHVsZXMuZmlsdGVyKGZ1bmN0aW9uKG4pIHtcbiAgICAgIHJldHVybiBjb25maWcubW9kdWxlcy5pbmRleE9mKG4pICE9IC0xO1xuICB9KTtcblxuICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgbW9kdWxlc1RvTG9hZC5tYXAoIG1vZHVsZU5hbWUgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIFN5c3RlbS5pbXBvcnQobW9kdWxlTmFtZStcIi9iYWNrZ3JvdW5kXCIpXG4gICAgICAgICAgLnRoZW4oIG1vZHVsZSA9PiB7XG4gICAgICAgICAgICB1dGlscy5sb2coXCJMb2FkZWQgbW9kdWxlIFwiICsgbW9kdWxlTmFtZSwgXCJzdGFydHVwXCIpO1xuICAgICAgICAgICAgbW9kdWxlLmRlZmF1bHQuaW5pdChjb25maWcuc2V0dGluZ3MpO1xuICAgICAgICAgICAgdXRpbHMubG9nKFwiSW5pdGlhbGlzZWQgbW9kdWxlIFwiICsgbW9kdWxlTmFtZSwgXCJzdGFydHVwXCIpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKCBlID0+IHsgdXRpbHMubG9nKFwiRXJyb3Igb24gbG9hZGluZyBtb2R1bGU6IFwiK21vZHVsZU5hbWUrXCIgLSBcIitlLnRvU3RyaW5nKCkrXCIgLS0gXCIrZS5zdGFjaywgXCJFeHRlbnNpb25cIik7IHJlc29sdmUoKTsgfSlcbiAgICAgIH0pO1xuICAgIH0pXG4gICk7XG59O1xuIl19