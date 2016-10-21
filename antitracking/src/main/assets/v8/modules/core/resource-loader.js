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