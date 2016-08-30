System.register("core/resource-loader", ["core/fs", "core/cliqz"], function (_export) {

  // Common durations
  "use strict";

  var readFile, writeFile, mkdir, utils, ONE_SECOND, ONE_MINUTE, ONE_HOUR, ONE_DAY, UpdateCallbackHandler, Resource, _default;

  var _get = function get(_x4, _x5, _x6) { var _again = true; _function: while (_again) { var object = _x4, property = _x5, receiver = _x6; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x4 = parent; _x5 = property; _x6 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

  function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function get(url) {
    return new Promise(function (resolve, reject) {
      utils.httpGet(url, function (res) {
        resolve(res.response);
      }, reject);
    });
  }

  function makeDirRecursive(path) {
    var from = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    var _path = _toArray(path);

    var first = _path[0];

    var rest = _path.slice(1);

    if (!first) {
      return Promise.resolve();
    }

    return mkdir(from.concat(first)).then(function () {
      return makeDirRecursive(rest, from.concat(first));
    });
  }
  return {
    setters: [function (_coreFs) {
      readFile = _coreFs.readFile;
      writeFile = _coreFs.writeFile;
      mkdir = _coreFs.mkdir;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      ONE_SECOND = 1000;
      ONE_MINUTE = 60 * ONE_SECOND;
      ONE_HOUR = 60 * ONE_MINUTE;
      ONE_DAY = 24 * ONE_HOUR;

      /* Abstract away the pattern `onUpdate` trigger list of
       * callbacks. This pattern is used a lot, so it looks worth
       * it to create a base class to handle it.
       */

      UpdateCallbackHandler = (function () {
        function UpdateCallbackHandler() {
          _classCallCheck(this, UpdateCallbackHandler);

          this.callbacks = [];
        }

        /* A resource is responsible for handling a remote resource persisted on
         * disk. It will be persisted on disk upon each update from remote. It is
         * also able to parse JSON automatically if `dataType` is "json".
         */

        _createClass(UpdateCallbackHandler, [{
          key: "onUpdate",
          value: function onUpdate(callback) {
            this.callbacks.push(callback);
          }
        }, {
          key: "triggerCallbacks",
          value: function triggerCallbacks(args) {
            this.callbacks.map(function (cb) {
              return cb(args);
            });
          }
        }]);

        return UpdateCallbackHandler;
      })();

      _export("UpdateCallbackHandler", UpdateCallbackHandler);

      Resource = (function (_UpdateCallbackHandler) {
        _inherits(Resource, _UpdateCallbackHandler);

        function Resource(name) {
          var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

          _classCallCheck(this, Resource);

          _get(Object.getPrototypeOf(Resource.prototype), "constructor", this).call(this);

          if (typeof name === "string") {
            name = [name];
          }

          this.name = name;
          this.remoteURL = options.remoteURL;
          this.dataType = options.dataType || "json";
          this.filePath = ["cliqz"].concat(_toConsumableArray(this.name));
        }

        _createClass(Resource, [{
          key: "persist",
          value: function persist(data) {
            var _this = this;

            var dirPath = this.filePath.slice(0, -1);
            return makeDirRecursive(dirPath).then(function () {
              return writeFile(_this.filePath, new TextEncoder().encode(data));
            }).then(function () {
              return data;
            });
          }
        }, {
          key: "load",
          value: function load() {
            var _this2 = this;

            return readFile(this.filePath).then(function (data) {
              return new TextDecoder().decode(data);
            }).then(this._parseData.bind(this))["catch"](function (ex) {
              return _this2.updateFromRemote();
            });
          }
        }, {
          key: "updateFromRemote",
          value: function updateFromRemote() {
            var _this3 = this;

            if (this.remoteURL === undefined) {
              return Promise.resolve();
            } else {
              return get(this.remoteURL).then(this.persist.bind(this)).then(this._parseData.bind(this)).then(function (data) {
                _this3.triggerCallbacks(data);
                return data;
              });
            }
          }
        }, {
          key: "_parseData",
          value: function _parseData(data) {
            if (this.dataType === "json") {
              return JSON.parse(data);
            } else {
              return data;
            }
          }
        }]);

        return Resource;
      })(UpdateCallbackHandler);

      _export("Resource", Resource);

      _default = (function () {
        function _default(resourceName) {
          var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

          _classCallCheck(this, _default);

          this.resource = new Resource(resourceName, options);
          this.cron = options.cron || ONE_HOUR;
          this.updateInterval = utils.setInterval(this.updateFromRemote.bind(this), this.cron);
        }

        _createClass(_default, [{
          key: "load",
          value: function load() {
            return this.resource.load();
          }
        }, {
          key: "updateFromRemote",
          value: function updateFromRemote() {
            var pref = "resource-loader.lastUpdates." + this.resource.name.join("/");
            var lastUpdate = Number(utils.getPref(pref, 0));
            var currentTime = Date.now();

            if (currentTime > this.cron + lastUpdate) {
              return this.resource.updateFromRemote().then(function () {
                return utils.setPref(pref, String(Date.now()));
              });
            } else {
              return Promise.resolve();
            }
          }
        }, {
          key: "onUpdate",
          value: function onUpdate(callback) {
            this.resource.onUpdate(callback);
          }
        }, {
          key: "stop",
          value: function stop() {
            utils.clearInterval(this.updateInterval);
          }
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvcmVzb3VyY2UtbG9hZGVyLmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGNBQVksQ0FBQzs7eUNBT1AsVUFBVSxFQUNWLFVBQVUsRUFDVixRQUFRLEVBQ1IsT0FBTyxFQU9BLHFCQUFxQixFQW1CckIsUUFBUTs7Ozs7Ozs7Ozs7Ozs7QUE0RnJCLFdBQVMsR0FBRyxDQUFDLEdBQUcsRUFBRTtBQUNoQixXQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBSztBQUN0QyxXQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxVQUFBLEdBQUcsRUFBSTtBQUN4QixlQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO09BQ3ZCLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDWixDQUFDLENBQUM7R0FDSjs7QUFHRCxXQUFTLGdCQUFnQixDQUFDLElBQUksRUFBYTtRQUFYLElBQUkseURBQUcsRUFBRTs7eUJBQ2QsSUFBSTs7UUFBdEIsS0FBSzs7UUFBSyxJQUFJOztBQUVyQixRQUFJLENBQUMsS0FBSyxFQUFFO0FBQ1YsYUFBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7S0FDMUI7O0FBRUQsV0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFNO0FBQzFDLGFBQU8sZ0JBQWdCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUNuRCxDQUFDLENBQUM7R0FDSjs7O3lCQWpKUSxRQUFROzBCQUFFLFNBQVM7c0JBQUUsS0FBSzs7eUJBQzFCLEtBQUs7OztBQUlSLGdCQUFVLEdBQUksSUFBSTtBQUNsQixnQkFBVSxHQUFJLEVBQUUsR0FBRyxVQUFVO0FBQzdCLGNBQVEsR0FBTSxFQUFFLEdBQUcsVUFBVTtBQUM3QixhQUFPLEdBQU8sRUFBRSxHQUFHLFFBQVE7Ozs7Ozs7QUFPcEIsMkJB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LENBQUMsT0FBTyxFQUFFLENBQUM7YUFDMUI7V0FDRjs7O2lCQUVPLGtCQUFDLFFBQVEsRUFBRTtBQUNqQixnQkFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7V0FDbEM7OztpQkFFRyxnQkFBRztBQUNMLGlCQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztXQUMxQyIsImZpbGUiOiJjb3JlL3Jlc291cmNlLWxvYWRlci5lcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG5pbXBvcnQgeyByZWFkRmlsZSwgd3JpdGVGaWxlLCBta2RpciB9IGZyb20gXCJjb3JlL2ZzXCI7XG5pbXBvcnQgeyB1dGlscyB9IGZyb20gXCJjb3JlL2NsaXF6XCI7XG5cblxuLy8gQ29tbW9uIGR1cmF0aW9uc1xuY29uc3QgT05FX1NFQ09ORCAgPSAxMDAwO1xuY29uc3QgT05FX01JTlVURSAgPSA2MCAqIE9ORV9TRUNPTkQ7XG5jb25zdCBPTkVfSE9VUiAgICA9IDYwICogT05FX01JTlVURTtcbmNvbnN0IE9ORV9EQVkgICAgID0gMjQgKiBPTkVfSE9VUjtcblxuXG4vKiBBYnN0cmFjdCBhd2F5IHRoZSBwYXR0ZXJuIGBvblVwZGF0ZWAgdHJpZ2dlciBsaXN0IG9mXG4gKiBjYWxsYmFja3MuIFRoaXMgcGF0dGVybiBpcyB1c2VkIGEgbG90LCBzbyBpdCBsb29rcyB3b3J0aFxuICogaXQgdG8gY3JlYXRlIGEgYmFzZSBjbGFzcyB0byBoYW5kbGUgaXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBVcGRhdGVDYWxsYmFja0hhbmRsZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmNhbGxiYWNrcyA9IFtdO1xuICB9XG5cbiAgb25VcGRhdGUoY2FsbGJhY2spIHtcbiAgICB0aGlzLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIHRyaWdnZXJDYWxsYmFja3MoYXJncykge1xuICAgIHRoaXMuY2FsbGJhY2tzLm1hcChjYiA9PiBjYihhcmdzKSk7XG4gIH1cbn1cblxuXG4vKiBBIHJlc291cmNlIGlzIHJlc3BvbnNpYmxlIGZvciBoYW5kbGluZyBhIHJlbW90ZSByZXNvdXJjZSBwZXJzaXN0ZWQgb25cbiAqIGRpc2suIEl0IHdpbGwgYmUgcGVyc2lzdGVkIG9uIGRpc2sgdXBvbiBlYWNoIHVwZGF0ZSBmcm9tIHJlbW90ZS4gSXQgaXNcbiAqIGFsc28gYWJsZSB0byBwYXJzZSBKU09OIGF1dG9tYXRpY2FsbHkgaWYgYGRhdGFUeXBlYCBpcyBcImpzb25cIi5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc291cmNlIGV4dGVuZHMgVXBkYXRlQ2FsbGJhY2tIYW5kbGVyIHtcblxuICBjb25zdHJ1Y3RvcihuYW1lLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBuYW1lID0gW25hbWVdO1xuICAgIH1cblxuICAgIHRoaXMubmFtZSAgICAgID0gbmFtZTtcbiAgICB0aGlzLnJlbW90ZVVSTCA9IG9wdGlvbnMucmVtb3RlVVJMO1xuICAgIHRoaXMuZGF0YVR5cGUgID0gb3B0aW9ucy5kYXRhVHlwZSB8fCBcImpzb25cIjtcbiAgICB0aGlzLmZpbGVQYXRoICA9IFtcImNsaXF6XCIsIC4uLnRoaXMubmFtZV07XG4gIH1cblxuICBwZXJzaXN0KGRhdGEpIHtcbiAgICBjb25zdCBkaXJQYXRoID0gdGhpcy5maWxlUGF0aC5zbGljZSgwLCAtMSk7XG4gICAgcmV0dXJuIG1ha2VEaXJSZWN1cnNpdmUoZGlyUGF0aClcbiAgICAgIC50aGVuKCgpID0+IHdyaXRlRmlsZSh0aGlzLmZpbGVQYXRoLCAobmV3IFRleHRFbmNvZGVyKCkpLmVuY29kZShkYXRhKSkpXG4gICAgICAudGhlbigoKSA9PiBkYXRhKTtcbiAgfVxuXG4gIGxvYWQoKSB7XG4gICAgcmV0dXJuIHJlYWRGaWxlKHRoaXMuZmlsZVBhdGgpXG4gICAgICAudGhlbihkYXRhID0+IChuZXcgVGV4dERlY29kZXIoKSkuZGVjb2RlKGRhdGEpKVxuICAgICAgLnRoZW4odGhpcy5fcGFyc2VEYXRhLmJpbmQodGhpcykpXG4gICAgICAuY2F0Y2goZXggPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVGcm9tUmVtb3RlKCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZUZyb21SZW1vdGUoKSB7XG4gICAgaWYgKHRoaXMucmVtb3RlVVJMID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGdldCh0aGlzLnJlbW90ZVVSTClcbiAgICAgICAgLnRoZW4odGhpcy5wZXJzaXN0LmJpbmQodGhpcykpXG4gICAgICAgIC50aGVuKHRoaXMuX3BhcnNlRGF0YS5iaW5kKHRoaXMpKVxuICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICB0aGlzLnRyaWdnZXJDYWxsYmFja3MoZGF0YSk7XG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF9wYXJzZURhdGEoZGF0YSkge1xuICAgIGlmICh0aGlzLmRhdGFUeXBlID09PSBcImpzb25cIikge1xuICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgfVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcblxuICBjb25zdHJ1Y3RvcihyZXNvdXJjZU5hbWUsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMucmVzb3VyY2UgPSBuZXcgUmVzb3VyY2UocmVzb3VyY2VOYW1lLCBvcHRpb25zKTtcbiAgICB0aGlzLmNyb24gPSBvcHRpb25zLmNyb24gfHwgT05FX0hPVVI7XG4gICAgdGhpcy51cGRhdGVJbnRlcnZhbCA9IHV0aWxzLnNldEludGVydmFsKFxuICAgICAgICB0aGlzLnVwZGF0ZUZyb21SZW1vdGUuYmluZCh0aGlzKSxcbiAgICAgICAgdGhpcy5jcm9uKTtcbiAgfVxuXG4gIGxvYWQoKSB7XG4gICAgcmV0dXJuIHRoaXMucmVzb3VyY2UubG9hZCgpO1xuICB9XG5cbiAgdXBkYXRlRnJvbVJlbW90ZSgpIHtcbiAgICBjb25zdCBwcmVmID0gYHJlc291cmNlLWxvYWRlci5sYXN0VXBkYXRlcy4ke3RoaXMucmVzb3VyY2UubmFtZS5qb2luKFwiL1wiKX1gO1xuICAgIGNvbnN0IGxhc3RVcGRhdGUgPSBOdW1iZXIodXRpbHMuZ2V0UHJlZihwcmVmLCAwKSk7XG4gICAgY29uc3QgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgaWYgKGN1cnJlbnRUaW1lID4gdGhpcy5jcm9uICsgbGFzdFVwZGF0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb3VyY2UudXBkYXRlRnJvbVJlbW90ZSgpXG4gICAgICAgIC50aGVuKCgpID0+IHV0aWxzLnNldFByZWYocHJlZiwgU3RyaW5nKERhdGUubm93KCkpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gIH1cblxuICBvblVwZGF0ZShjYWxsYmFjaykge1xuICAgIHRoaXMucmVzb3VyY2Uub25VcGRhdGUoY2FsbGJhY2spO1xuICB9XG5cbiAgc3RvcCgpIHtcbiAgICB1dGlscy5jbGVhckludGVydmFsKHRoaXMudXBkYXRlSW50ZXJ2YWwpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0KHVybCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHV0aWxzLmh0dHBHZXQodXJsLCByZXMgPT4ge1xuICAgICAgcmVzb2x2ZShyZXMucmVzcG9uc2UpO1xuICAgIH0sIHJlamVjdCk7XG4gIH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VEaXJSZWN1cnNpdmUocGF0aCwgZnJvbSA9IFtdKSB7XG4gIGNvbnN0IFtmaXJzdCwgLi4ucmVzdF0gPSBwYXRoO1xuXG4gIGlmICghZmlyc3QpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICByZXR1cm4gbWtkaXIoZnJvbS5jb25jYXQoZmlyc3QpKS50aGVuKCgpID0+IHtcbiAgICByZXR1cm4gbWFrZURpclJlY3Vyc2l2ZShyZXN0LCBmcm9tLmNvbmNhdChmaXJzdCkpO1xuICB9KTtcbn1cbiJdfQ==