System.register(["core/config"], function (_export) {
  /* global System */
  "use strict";

  var config;
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

        return Promise.all(modulesToLoad.map(function (moduleName) {
          return new Promise(function (resolve, reject) {
            System["import"](moduleName + "/background").then(function (module) {
              return module["default"].init(config);
            }).then(function () {
              return System["import"](moduleName + "/window");
            }).then(function (module) {
              var mod = new module["default"]({ window: window });
              mod.init();
              resolve();
            })["catch"](function (e) {
              console.log("Error on loading module: " + moduleName + " - " + e.toString() + " -- " + e.stack, "Extension");resolve();
            });
          });
        }));
      });

      ;
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0YXJ0dXAuZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozt5QkFHZSxVQUFVLE1BQU0sRUFBNEI7WUFBMUIsT0FBTyx5REFBRyxNQUFNLENBQUMsT0FBTzs7O0FBRXZELFlBQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUU7QUFDN0MsaUJBQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDMUMsQ0FBQyxDQUFDOztBQUVKLGVBQU8sT0FBTyxDQUFDLEdBQUcsQ0FDZixhQUFhLENBQUMsR0FBRyxDQUFFLFVBQUEsVUFBVSxFQUFJO0FBQy9CLGlCQUFPLElBQUksT0FBTyxDQUFFLFVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBSztBQUN2QyxrQkFBTSxVQUFPLENBQUMsVUFBVSxHQUFDLGFBQWEsQ0FBQyxDQUNwQyxJQUFJLENBQUUsVUFBQSxNQUFNO3FCQUFJLE1BQU0sV0FBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7YUFBQSxDQUFFLENBQzdDLElBQUksQ0FBRTtxQkFBTSxNQUFNLFVBQU8sQ0FBQyxVQUFVLEdBQUMsU0FBUyxDQUFDO2FBQUEsQ0FBRSxDQUNsRCxJQUFJLENBQUUsVUFBQSxNQUFNLEVBQUk7QUFDaEIsa0JBQUksR0FBRyxHQUFHLElBQUksTUFBTSxXQUFRLENBQUMsRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLENBQUMsQ0FBQztBQUN2QyxpQkFBRyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ1gscUJBQU8sRUFBRSxDQUFDO2FBQ1osQ0FBQyxTQUNLLENBQUUsVUFBQSxDQUFDLEVBQUk7QUFBRSxxQkFBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsR0FBQyxVQUFVLEdBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQyxBQUFDLE9BQU8sRUFBRSxDQUFDO2FBQUUsQ0FBQyxDQUFBO1dBQ25JLENBQUMsQ0FBQztTQUNKLENBQUMsQ0FDSCxDQUFDO09BQ0g7O0FBQUEsT0FBQyIsImZpbGUiOiJzdGFydHVwLmVzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFsIFN5c3RlbSAqL1xuaW1wb3J0IGNvbmZpZyBmcm9tIFwiY29yZS9jb25maWdcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKHdpbmRvdywgbW9kdWxlcyA9IGNvbmZpZy5tb2R1bGVzKSB7XG4gIC8vIGludGVyc2VudCBjb25maWcgZmlsZSB3aXRoXG4gIGNvbnN0IG1vZHVsZXNUb0xvYWQgPSBtb2R1bGVzLmZpbHRlcihmdW5jdGlvbihuKSB7XG4gICAgICByZXR1cm4gY29uZmlnLm1vZHVsZXMuaW5kZXhPZihuKSAhPSAtMTtcbiAgfSk7XG5cblx0cmV0dXJuIFByb21pc2UuYWxsKFxuICAgIG1vZHVsZXNUb0xvYWQubWFwKCBtb2R1bGVOYW1lID0+IHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBTeXN0ZW0uaW1wb3J0KG1vZHVsZU5hbWUrXCIvYmFja2dyb3VuZFwiKVxuICAgICAgICAgIC50aGVuKCBtb2R1bGUgPT4gbW9kdWxlLmRlZmF1bHQuaW5pdChjb25maWcpIClcbiAgICAgICAgICAudGhlbiggKCkgPT4gU3lzdGVtLmltcG9ydChtb2R1bGVOYW1lK1wiL3dpbmRvd1wiKSApXG5cdCAgICAgICAgLnRoZW4oIG1vZHVsZSA9PiB7XG5cdCAgICAgICAgXHR2YXIgbW9kID0gbmV3IG1vZHVsZS5kZWZhdWx0KHsgd2luZG93IH0pO1xuICAgICAgICAgICAgbW9kLmluaXQoKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcblx0ICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaCggZSA9PiB7IGNvbnNvbGUubG9nKFwiRXJyb3Igb24gbG9hZGluZyBtb2R1bGU6IFwiK21vZHVsZU5hbWUrXCIgLSBcIitlLnRvU3RyaW5nKCkrXCIgLS0gXCIrZS5zdGFjaywgXCJFeHRlbnNpb25cIik7IHJlc29sdmUoKTsgfSlcbiAgICAgIH0pO1xuICAgIH0pXG4gICk7XG59O1xuIl19