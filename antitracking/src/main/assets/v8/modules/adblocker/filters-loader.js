System.register('adblocker/filters-loader', ['core/resource-loader', 'platform/language', 'core/platform'], function (_export) {

  // Disk persisting
  'use strict';

  var ResourceLoader, Resource, UpdateCallbackHandler, CliqzLanguage, platformName, RESOURCES_PATH, ONE_SECOND, ONE_MINUTE, ONE_HOUR, ONE_DAY, BASE_URL, LANGS, Checksums, FiltersList, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  return {
    setters: [function (_coreResourceLoader) {
      ResourceLoader = _coreResourceLoader['default'];
      Resource = _coreResourceLoader.Resource;
      UpdateCallbackHandler = _coreResourceLoader.UpdateCallbackHandler;
    }, function (_platformLanguage) {
      CliqzLanguage = _platformLanguage['default'];
    }, function (_corePlatform) {
      platformName = _corePlatform.platformName;
    }],
    execute: function () {
      RESOURCES_PATH = ['adblocker'];

      // Common durations
      ONE_SECOND = 1000;
      ONE_MINUTE = 60 * ONE_SECOND;
      ONE_HOUR = 60 * ONE_MINUTE;
      ONE_DAY = 24 * ONE_HOUR;

      // URLs to fetch block lists

      BASE_URL = 'https://cdn.cliqz.com/adblocking/latest-filters/';
      LANGS = CliqzLanguage.state();

      Checksums = (function (_UpdateCallbackHandler) {
        _inherits(Checksums, _UpdateCallbackHandler);

        function Checksums() {
          _classCallCheck(this, Checksums);

          _get(Object.getPrototypeOf(Checksums.prototype), 'constructor', this).call(this);

          this.loader = new ResourceLoader(RESOURCES_PATH.concat('checksums'), {
            cron: ONE_HOUR,
            dataType: 'json',
            remoteURL: this.remoteURL
          });
          this.loader.onUpdate(this.updateChecksums.bind(this));
        }

        // TODO: Download the file everytime, but we should find a way to use the checksum
        // Or, since some lists use an expiration date, we could store a timestamp instead of checksum

        _createClass(Checksums, [{
          key: 'load',
          value: function load() {
            this.loader.load().then(this.updateChecksums.bind(this));
          }

          // Private API

        }, {
          key: 'updateChecksums',
          value: function updateChecksums(data) {
            var _this = this;

            // Update the URL as it must include the timestamp to avoid caching
            // NOTE: This mustn't be removed as it would break the update.
            this.loader.resource.remoteURL = this.remoteURL;

            // Parse checksums
            Object.keys(data).forEach(function (list) {
              Object.keys(data[list]).forEach(function (asset) {
                var checksum = data[list][asset].checksum;
                var lang = null;
                if (list === 'country_lists') {
                  lang = data[list][asset].language;
                }

                var assetName = asset;

                // Strip prefix
                ['http://', 'https://'].forEach(function (prefix) {
                  if (assetName.startsWith(prefix)) {
                    assetName = assetName.substring(prefix.length);
                  }
                });

                var remoteURL = BASE_URL + assetName;

                // Trigger callback even if checksum is the same since
                // it wouldn't work for filter-lists.json file which could
                // have the same checksum but lists could be expired.
                // FiltersList class has then to check the checksum before update.
                if (lang === null || LANGS.indexOf(lang) > -1) {
                  CliqzUtils.log('adblocker', asset + ' ' + remoteURL);
                  _this.triggerCallbacks({
                    checksum: checksum,
                    asset: asset,
                    remoteURL: remoteURL,
                    key: list
                  });
                }
              });
            });
          }
        }, {
          key: 'remoteURL',
          get: function get() {
            // The URL should contain a timestamp to avoid caching
            return 'https://cdn.cliqz.com/adblocking/' + platformName + '/allowed-lists.json';
          }
        }]);

        return Checksums;
      })(UpdateCallbackHandler);

      FiltersList = (function (_UpdateCallbackHandler2) {
        _inherits(FiltersList, _UpdateCallbackHandler2);

        function FiltersList(checksum, asset, remoteURL) {
          _classCallCheck(this, FiltersList);

          _get(Object.getPrototypeOf(FiltersList.prototype), 'constructor', this).call(this);
          this.checksum = checksum;

          var assetName = asset;

          // Strip prefix
          ['http://', 'https://'].forEach(function (prefix) {
            if (assetName.startsWith(prefix)) {
              assetName = assetName.substring(prefix.length);
            }
          });

          this.resource = new Resource(RESOURCES_PATH.concat(assetName.split('/')), { remoteURL: remoteURL, dataType: 'plainText' });
          this.resource.onUpdate(this.updateList.bind(this));
        }

        /* Class responsible for loading, persisting and updating filters lists.
         */

        _createClass(FiltersList, [{
          key: 'load',
          value: function load() {
            this.resource.load().then(this.updateList.bind(this));
          }
        }, {
          key: 'updateFromChecksum',
          value: function updateFromChecksum(checksum) {
            if (checksum === undefined || checksum !== this.checksum) {
              this.checksum = checksum;
              this.resource.updateFromRemote();
            }
          }
        }, {
          key: 'updateList',
          value: function updateList(data) {
            var filters = data.split(/\r\n|\r|\n/g);
            if (filters.length > 0) {
              this.triggerCallbacks(filters);
            }
          }
        }]);

        return FiltersList;
      })(UpdateCallbackHandler);

      _default = (function (_UpdateCallbackHandler3) {
        _inherits(_default, _UpdateCallbackHandler3);

        function _default() {
          _classCallCheck(this, _default);

          _get(Object.getPrototypeOf(_default.prototype), 'constructor', this).call(this);

          // Current checksums of official filters lists
          this.checksums = new Checksums();

          // Lists of filters currently loaded
          this.lists = new Map();

          // Register callbacks on list creation
          this.checksums.onUpdate(this.updateList.bind(this));
        }

        _createClass(_default, [{
          key: 'load',
          value: function load() {
            this.checksums.load();
          }
        }, {
          key: 'updateList',
          value: function updateList(_ref) {
            var _this2 = this;

            var checksum = _ref.checksum;
            var asset = _ref.asset;
            var remoteURL = _ref.remoteURL;
            var key = _ref.key;

            var list = this.lists.get(asset);

            if (list === undefined) {
              list = new FiltersList(checksum, asset, remoteURL);
              this.lists.set(asset, list);
              list.onUpdate(function (filters) {
                var isFiltersList = key !== 'js_resources';
                _this2.triggerCallbacks({ asset: asset, filters: filters, isFiltersList: isFiltersList });
              });
              list.load();
            } else {
              list.updateFromChecksum(checksum);
            }
          }
        }]);

        return _default;
      })(UpdateCallbackHandler);

      _export('default', _default);
    }
  };
});