System.register('autocomplete/smart-cliqz-cache/trigger-url-cache', ['autocomplete/smart-cliqz-cache/rich-header', 'core/cliqz', 'autocomplete/smart-cliqz-cache/cache'], function (_export) {
  'use strict';

  var getSmartCliqz, utils, Cache, HOUR, DAY, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  return {
    setters: [function (_autocompleteSmartCliqzCacheRichHeader) {
      getSmartCliqz = _autocompleteSmartCliqzCacheRichHeader.getSmartCliqz;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_autocompleteSmartCliqzCacheCache) {
      Cache = _autocompleteSmartCliqzCacheCache['default'];
    }],
    execute: function () {
      HOUR = 1000 * 60 * 60;
      DAY = 24 * HOUR;

      /**
      * @namespace smart-cliqz-cache
      */

      _default = (function (_Cache) {
        _inherits(_default, _Cache);

        /**
        * @class TriggerUrlCache
        * @constructor
        */

        function _default() {
          var file = arguments.length <= 0 || arguments[0] === undefined ? 'cliqz/smartcliqz-trigger-urls-cache.json' : arguments[0];

          _classCallCheck(this, _default);

          _get(Object.getPrototypeOf(_default.prototype), 'constructor', this).call(this, false);
          this.file = file;
        }

        /**
        * @method init
        */

        _createClass(_default, [{
          key: 'init',
          value: function init() {
            this.load();
            this.scheduleRecurringClean();
          }

          /**
          * @method load
          */
        }, {
          key: 'load',
          value: function load() {
            return _get(Object.getPrototypeOf(_default.prototype), 'load', this).call(this, this.file);
          }

          /**
          * @method save
          */
        }, {
          key: 'save',
          value: function save() {
            return _get(Object.getPrototypeOf(_default.prototype), 'save', this).call(this, this.file);
          }

          /**
          * @method scheduleRecurringClean
          * @param delay
          */
        }, {
          key: 'scheduleRecurringClean',
          value: function scheduleRecurringClean(delay) {
            var _this = this;

            if (!delay) {
              var lastCleanTime = utils.getPref('smart-cliqz-last-clean-ts');
              if (!lastCleanTime) {
                delay = 0;
              } else {
                var timeSinceLastClean = Date.now() - new Date(Number(lastCleanTime));
                delay = timeSinceLastClean > DAY ? 0 : DAY - timeSinceLastClean;
              }
            }

            this.cleanTimeout = utils.setTimeout(function (_) {
              _this.clean().then(function (_) {
                utils.setPref('smart-cliqz-last-clean-ts', Date.now().toString());
                _this.scheduleRecurringClean(DAY);
              });
            }, delay);
            utils.log('scheduled SmartCliqz trigger URLs cleaning in ' + Math.round(delay / 1000 / 60) + ' minutes');
          }

          /**
          * clean trigger URLs that are no longer valid
          * @method clean
          * @param delay {Number}
          */
        }, {
          key: 'clean',
          value: function clean() {
            var _this2 = this;

            var delay = arguments.length <= 0 || arguments[0] === undefined ? 1000 : arguments[0];

            return new Promise(function (resolve, reject) {
              utils.log('start cleaning SmartCliqz trigger URLs');

              var cleaners = Object.keys(_this2._cache).map(function (url, idx) {
                return function () {
                  return new Promise(function (resolve, reject) {
                    utils.setTimeout(function () {
                      if (_this2.isUnloaded) {
                        reject('unloaded');
                        return;
                      }
                      getSmartCliqz(url).then(function (smartCliqz) {
                        if (!smartCliqz.data.trigger_urls.some(function (u) {
                          return u === url;
                        })) {
                          utils.log('unknown trigger URL: deleting SmartCliqz ' + url);
                          _this2['delete'](url);
                          _this2.save();
                        }
                        resolve();
                      })['catch'](function (e) {
                        if (e.type && e.type === 'URL_NOT_FOUND') {
                          utils.log('unkown URL: deleting SmartCliqz ' + url);
                          _this2['delete'](url);
                          _this2.save();
                        }
                        resolve();
                      });
                    }, idx * delay);
                  });
                };
              });
              // final action: resolve
              cleaners.push(function () {
                utils.log('done cleaning SmartCliqz trigger URLs');
                resolve();
                return Promise.resolve();
              });
              // execute sequentually
              cleaners.reduce(function (current, next) {
                return current.then(function (_) {
                  return next();
                }, function (e) {
                  reject(e);return Promise.reject();
                });
              }, Promise.resolve());
            });
          }

          /**
          * @method unload
          */
        }, {
          key: 'unload',
          value: function unload() {
            this.isUnloaded = true;
            utils.clearTimeout(this.cleanTimeout);
          }
        }]);

        return _default;
      })(Cache);

      _export('default', _default);
    }
  };
});