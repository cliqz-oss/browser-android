System.register('core/resource-loader', ['core/fs', 'core/cliqz'], function (_export) {

  // Common durations
  'use strict';

  var readFile, writeFile, mkdir, utils, ONE_SECOND, ONE_MINUTE, ONE_HOUR, UpdateCallbackHandler, Resource, _default;

  var _get = function get(_x4, _x5, _x6) { var _again = true; _function: while (_again) { var object = _x4, property = _x5, receiver = _x6; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x4 = parent; _x5 = property; _x6 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

  function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

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

  /* Abstract away the pattern `onUpdate` trigger list of
   * callbacks. This pattern is used a lot, so it looks worth
   * it to create a base class to handle it.
   */
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

      UpdateCallbackHandler = (function () {
        function UpdateCallbackHandler() {
          _classCallCheck(this, UpdateCallbackHandler);

          this.callbacks = [];
        }

        /* A resource is responsible for handling a remote resource persisted on
         * disk. It will be persisted on disk upon each update from remote. It is
         * also able to parse JSON automatically if `dataType` is 'json'.
         */

        _createClass(UpdateCallbackHandler, [{
          key: 'onUpdate',
          value: function onUpdate(callback) {
            this.callbacks.push(callback);
          }
        }, {
          key: 'triggerCallbacks',
          value: function triggerCallbacks(args) {
            this.callbacks.map(function (cb) {
              return cb(args);
            });
          }
        }]);

        return UpdateCallbackHandler;
      })();

      _export('UpdateCallbackHandler', UpdateCallbackHandler);

      Resource = (function (_UpdateCallbackHandler) {
        _inherits(Resource, _UpdateCallbackHandler);

        function Resource(name) {
          var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

          _classCallCheck(this, Resource);

          _get(Object.getPrototypeOf(Resource.prototype), 'constructor', this).call(this);

          this.name = typeof name === 'string' ? [name] : name;
          this.remoteURL = options.remoteURL;
          this.dataType = options.dataType || 'json';
          this.filePath = ['cliqz'].concat(_toConsumableArray(this.name));
          this.chromeURL = 'chrome://cliqz/content/' + this.name.join('/');
        }

        _createClass(Resource, [{
          key: 'persist',
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
          key: 'load',
          value: function load() {
            var _this2 = this;

            return readFile(this.filePath).then(function (data) {
              return new TextDecoder().decode(data);
            }).then(this.parseData.bind(this))['catch'](function () {
              return _this2.updateFromURL(_this2.chromeURL);
            })['catch'](function () {
              return _this2.updateFromRemote();
            });
          }
        }, {
          key: 'updateFromURL',
          value: function updateFromURL(url) {
            return get(url).then(this.persist.bind(this)).then(this.parseData.bind(this));
          }
        }, {
          key: 'updateFromRemote',
          value: function updateFromRemote() {
            var _this3 = this;

            if (this.remoteURL === undefined) {
              return Promise.resolve();
            }
            return this.updateFromURL(this.remoteURL).then(function (data) {
              _this3.triggerCallbacks(data);
              return data;
            });
          }
        }, {
          key: 'parseData',
          value: function parseData(data) {
            if (this.dataType === 'json') {
              return JSON.parse(data);
            }
            return data;
          }
        }]);

        return Resource;
      })(UpdateCallbackHandler);

      _export('Resource', Resource);

      _default = (function () {
        function _default(resourceName) {
          var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

          _classCallCheck(this, _default);

          this.resource = new Resource(resourceName, options);
          this.cron = options.cron || ONE_HOUR;
          this.updateInterval = utils.setInterval(this.updateFromRemote.bind(this), this.cron);
        }

        _createClass(_default, [{
          key: 'load',
          value: function load() {
            return this.resource.load();
          }
        }, {
          key: 'updateFromRemote',
          value: function updateFromRemote() {
            var pref = 'resource-loader.lastUpdates.' + this.resource.name.join('/');
            var lastUpdate = Number(utils.getPref(pref, 0));
            var currentTime = Date.now();

            if (currentTime > this.cron + lastUpdate) {
              return this.resource.updateFromRemote().then(function () {
                return utils.setPref(pref, String(Date.now()));
              });
            }
            return Promise.resolve();
          }
        }, {
          key: 'onUpdate',
          value: function onUpdate(callback) {
            this.resource.onUpdate(callback);
          }
        }, {
          key: 'stop',
          value: function stop() {
            utils.clearInterval(this.updateInterval);
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,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QUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztlQUFBLENBQUMsQ0FBQzthQUN4RDtBQUNELG1CQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztXQUMxQjs7O2lCQUVPLGtCQUFDLFFBQVEsRUFBRTtBQUNqQixnQkFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7V0FDbEM7OztpQkFFRyxnQkFBRztBQUNMLGlCQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztXQUMxQyIsImZpbGUiOiJjb3JlL3Jlc291cmNlLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlYWRGaWxlLCB3cml0ZUZpbGUsIG1rZGlyIH0gZnJvbSAnY29yZS9mcyc7XG5pbXBvcnQgeyB1dGlscyB9IGZyb20gJ2NvcmUvY2xpcXonO1xuXG5cbi8vIENvbW1vbiBkdXJhdGlvbnNcbmNvbnN0IE9ORV9TRUNPTkQgPSAxMDAwO1xuY29uc3QgT05FX01JTlVURSA9IDYwICogT05FX1NFQ09ORDtcbmNvbnN0IE9ORV9IT1VSID0gNjAgKiBPTkVfTUlOVVRFO1xuXG5cbmZ1bmN0aW9uIGdldCh1cmwpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB1dGlscy5odHRwR2V0KHVybCwgcmVzID0+IHtcbiAgICAgIHJlc29sdmUocmVzLnJlc3BvbnNlKTtcbiAgICB9LCByZWplY3QpO1xuICB9KTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlRGlyUmVjdXJzaXZlKHBhdGgsIGZyb20gPSBbXSkge1xuICBjb25zdCBbZmlyc3QsIC4uLnJlc3RdID0gcGF0aDtcblxuICBpZiAoIWZpcnN0KSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgcmV0dXJuIG1rZGlyKGZyb20uY29uY2F0KGZpcnN0KSkudGhlbigoKSA9PlxuICAgIG1ha2VEaXJSZWN1cnNpdmUocmVzdCwgZnJvbS5jb25jYXQoZmlyc3QpKVxuICApO1xufVxuXG5cbi8qIEFic3RyYWN0IGF3YXkgdGhlIHBhdHRlcm4gYG9uVXBkYXRlYCB0cmlnZ2VyIGxpc3Qgb2ZcbiAqIGNhbGxiYWNrcy4gVGhpcyBwYXR0ZXJuIGlzIHVzZWQgYSBsb3QsIHNvIGl0IGxvb2tzIHdvcnRoXG4gKiBpdCB0byBjcmVhdGUgYSBiYXNlIGNsYXNzIHRvIGhhbmRsZSBpdC5cbiAqL1xuZXhwb3J0IGNsYXNzIFVwZGF0ZUNhbGxiYWNrSGFuZGxlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gIH1cblxuICBvblVwZGF0ZShjYWxsYmFjaykge1xuICAgIHRoaXMuY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgdHJpZ2dlckNhbGxiYWNrcyhhcmdzKSB7XG4gICAgdGhpcy5jYWxsYmFja3MubWFwKGNiID0+IGNiKGFyZ3MpKTtcbiAgfVxufVxuXG5cbi8qIEEgcmVzb3VyY2UgaXMgcmVzcG9uc2libGUgZm9yIGhhbmRsaW5nIGEgcmVtb3RlIHJlc291cmNlIHBlcnNpc3RlZCBvblxuICogZGlzay4gSXQgd2lsbCBiZSBwZXJzaXN0ZWQgb24gZGlzayB1cG9uIGVhY2ggdXBkYXRlIGZyb20gcmVtb3RlLiBJdCBpc1xuICogYWxzbyBhYmxlIHRvIHBhcnNlIEpTT04gYXV0b21hdGljYWxseSBpZiBgZGF0YVR5cGVgIGlzICdqc29uJy5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc291cmNlIGV4dGVuZHMgVXBkYXRlQ2FsbGJhY2tIYW5kbGVyIHtcblxuICBjb25zdHJ1Y3RvcihuYW1lLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5uYW1lID0gKHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJykgPyBbbmFtZV0gOiBuYW1lO1xuICAgIHRoaXMucmVtb3RlVVJMID0gb3B0aW9ucy5yZW1vdGVVUkw7XG4gICAgdGhpcy5kYXRhVHlwZSA9IG9wdGlvbnMuZGF0YVR5cGUgfHwgJ2pzb24nO1xuICAgIHRoaXMuZmlsZVBhdGggPSBbJ2NsaXF6JywgLi4udGhpcy5uYW1lXTtcbiAgICB0aGlzLmNocm9tZVVSTCA9IGBjaHJvbWU6Ly9jbGlxei9jb250ZW50LyR7dGhpcy5uYW1lLmpvaW4oJy8nKX1gO1xuICB9XG5cbiAgcGVyc2lzdChkYXRhKSB7XG4gICAgY29uc3QgZGlyUGF0aCA9IHRoaXMuZmlsZVBhdGguc2xpY2UoMCwgLTEpO1xuICAgIHJldHVybiBtYWtlRGlyUmVjdXJzaXZlKGRpclBhdGgpXG4gICAgICAudGhlbigoKSA9PiB3cml0ZUZpbGUodGhpcy5maWxlUGF0aCwgKG5ldyBUZXh0RW5jb2RlcigpKS5lbmNvZGUoZGF0YSkpKVxuICAgICAgLnRoZW4oKCkgPT4gZGF0YSk7XG4gIH1cblxuICBsb2FkKCkge1xuICAgIHJldHVybiByZWFkRmlsZSh0aGlzLmZpbGVQYXRoKVxuICAgICAgLnRoZW4oZGF0YSA9PiAobmV3IFRleHREZWNvZGVyKCkpLmRlY29kZShkYXRhKSlcbiAgICAgIC50aGVuKHRoaXMucGFyc2VEYXRhLmJpbmQodGhpcykpXG4gICAgICAuY2F0Y2goKCkgPT4gdGhpcy51cGRhdGVGcm9tVVJMKHRoaXMuY2hyb21lVVJMKSlcbiAgICAgIC5jYXRjaCgoKSA9PiB0aGlzLnVwZGF0ZUZyb21SZW1vdGUoKSk7XG4gIH1cblxuICB1cGRhdGVGcm9tVVJMKHVybCkge1xuICAgIHJldHVybiBnZXQodXJsKVxuICAgICAgLnRoZW4odGhpcy5wZXJzaXN0LmJpbmQodGhpcykpXG4gICAgICAudGhlbih0aGlzLnBhcnNlRGF0YS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIHVwZGF0ZUZyb21SZW1vdGUoKSB7XG4gICAgaWYgKHRoaXMucmVtb3RlVVJMID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlRnJvbVVSTCh0aGlzLnJlbW90ZVVSTClcbiAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICB0aGlzLnRyaWdnZXJDYWxsYmFja3MoZGF0YSk7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgfSk7XG4gIH1cblxuICBwYXJzZURhdGEoZGF0YSkge1xuICAgIGlmICh0aGlzLmRhdGFUeXBlID09PSAnanNvbicpIHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcblxuICBjb25zdHJ1Y3RvcihyZXNvdXJjZU5hbWUsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMucmVzb3VyY2UgPSBuZXcgUmVzb3VyY2UocmVzb3VyY2VOYW1lLCBvcHRpb25zKTtcbiAgICB0aGlzLmNyb24gPSBvcHRpb25zLmNyb24gfHwgT05FX0hPVVI7XG4gICAgdGhpcy51cGRhdGVJbnRlcnZhbCA9IHV0aWxzLnNldEludGVydmFsKFxuICAgICAgICB0aGlzLnVwZGF0ZUZyb21SZW1vdGUuYmluZCh0aGlzKSxcbiAgICAgICAgdGhpcy5jcm9uKTtcbiAgfVxuXG4gIGxvYWQoKSB7XG4gICAgcmV0dXJuIHRoaXMucmVzb3VyY2UubG9hZCgpO1xuICB9XG5cbiAgdXBkYXRlRnJvbVJlbW90ZSgpIHtcbiAgICBjb25zdCBwcmVmID0gYHJlc291cmNlLWxvYWRlci5sYXN0VXBkYXRlcy4ke3RoaXMucmVzb3VyY2UubmFtZS5qb2luKCcvJyl9YDtcbiAgICBjb25zdCBsYXN0VXBkYXRlID0gTnVtYmVyKHV0aWxzLmdldFByZWYocHJlZiwgMCkpO1xuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGlmIChjdXJyZW50VGltZSA+IHRoaXMuY3JvbiArIGxhc3RVcGRhdGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlc291cmNlLnVwZGF0ZUZyb21SZW1vdGUoKVxuICAgICAgICAudGhlbigoKSA9PiB1dGlscy5zZXRQcmVmKHByZWYsIFN0cmluZyhEYXRlLm5vdygpKSkpO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICBvblVwZGF0ZShjYWxsYmFjaykge1xuICAgIHRoaXMucmVzb3VyY2Uub25VcGRhdGUoY2FsbGJhY2spO1xuICB9XG5cbiAgc3RvcCgpIHtcbiAgICB1dGlscy5jbGVhckludGVydmFsKHRoaXMudXBkYXRlSW50ZXJ2YWwpO1xuICB9XG59XG4iXX0=