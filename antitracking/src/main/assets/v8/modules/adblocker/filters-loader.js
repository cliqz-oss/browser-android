System.register('adblocker/filters-loader', ['core/resource-loader'], function (_export) {

  // Disk persisting
  'use strict';

  var ResourceLoader, Resource, UpdateCallbackHandler, RESOURCES_PATH, ONE_SECOND, ONE_MINUTE, ONE_HOUR, ONE_DAY, FILTER_LIST_BASE_URL, BASE_URL, CHECKSUMS_URL, ALLOWED_LISTS, Checksums, ExtraLists, FiltersList, _default;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  function urlFromPath(path) {
    if (path.startsWith('assets/ublock/filter-lists.json')) {
      return FILTER_LIST_BASE_URL + path;
    } else if (path.startsWith('assets/thirdparties/')) {
      return path.replace(/^assets\/thirdparties\//, BASE_URL + 'thirdparties/');
    } else if (path.startsWith('assets/ublock/')) {
      return path.replace(/^assets\/ublock\//, BASE_URL + 'filters/');
    }

    return null;
  }

  // Privacy
  // "assets/thirdparties/easylist-downloads.adblockplus.org/easyprivacy.txt",
  // "assets/ublock/privacy.txt"

  function isListSupported(path) {
    return ALLOWED_LISTS.has(path);
  }

  return {
    setters: [function (_coreResourceLoader) {
      ResourceLoader = _coreResourceLoader['default'];
      Resource = _coreResourceLoader.Resource;
      UpdateCallbackHandler = _coreResourceLoader.UpdateCallbackHandler;
    }],
    execute: function () {
      RESOURCES_PATH = ['antitracking', 'adblocking'];

      // Common durations
      ONE_SECOND = 1000;
      ONE_MINUTE = 60 * ONE_SECOND;
      ONE_HOUR = 60 * ONE_MINUTE;
      ONE_DAY = 24 * ONE_HOUR;

      // URLs to fetch block lists
      FILTER_LIST_BASE_URL = 'https://raw.githubusercontent.com/gorhill/uBlock/master/';
      BASE_URL = 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/';
      CHECKSUMS_URL = BASE_URL + 'checksums/ublock0.txt?_=';
      ALLOWED_LISTS = new Set([
      // uBlock
      'assets/ublock/filters.txt', 'assets/ublock/unbreak.txt',
      // Adblock plus
      'assets/thirdparties/easylist-downloads.adblockplus.org/easylist.txt',
      // Extra lists
      'pgl.yoyo.org/as/serverlist',
      // Anti adblock killers
      'https://raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt', 'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt']);

      Checksums = (function (_UpdateCallbackHandler) {
        _inherits(Checksums, _UpdateCallbackHandler);

        function Checksums() {
          _classCallCheck(this, Checksums);

          _get(Object.getPrototypeOf(Checksums.prototype), 'constructor', this).call(this);

          this.loader = new ResourceLoader(RESOURCES_PATH.concat('checksums'), {
            cron: ONE_DAY,
            dataType: 'plainText',
            remoteURL: this.remoteURL
          });
          this.loader.onUpdate(this.updateChecksums.bind(this));
        }

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
            data.split(/\r\n|\r|\n/g).filter(function (line) {
              return line.length > 0;
            }).forEach(function (line) {
              var _line$split = line.split(' ');

              var _line$split2 = _slicedToArray(_line$split, 2);

              var checksum = _line$split2[0];
              var asset = _line$split2[1];

              // Trigger callback even if checksum is the same since
              // it wouldn't work for filter-lists.json file which could
              // have the same checksum but lists could be expired.
              // FiltersList class has then to check the checksum before update.
              _this.triggerCallbacks({
                checksum: checksum,
                asset: asset,
                remoteURL: urlFromPath(asset)
              });
            });
          }
        }, {
          key: 'remoteURL',
          get: function get() {
            // The URL should contain a timestamp to avoid caching
            return CHECKSUMS_URL + String(Date.now());
          }
        }]);

        return Checksums;
      })(UpdateCallbackHandler);

      ExtraLists = (function (_UpdateCallbackHandler2) {
        _inherits(ExtraLists, _UpdateCallbackHandler2);

        function ExtraLists() {
          _classCallCheck(this, ExtraLists);

          _get(Object.getPrototypeOf(ExtraLists.prototype), 'constructor', this).call(this);

          this.resource = new Resource(RESOURCES_PATH.concat(['assets', 'ublock', 'filter-lists.json']), { remoteURL: urlFromPath('assets/ublock/filter-lists.json') });
          this.resource.onUpdate(this.updateExtraListsFromMetadata.bind(this));
        }

        // TODO: Download the file everytime, but we should find a way to use the checksum
        // Or, since some lists use an expiration date, we could store a timestamp instead of checksum

        _createClass(ExtraLists, [{
          key: 'load',
          value: function load() {
            this.resource.load().then(this.updateExtraListsFromMetadata.bind(this));
          }
        }, {
          key: 'updateExtraLists',
          value: function updateExtraLists(_ref) {
            var asset = _ref.asset;

            if (asset.endsWith('filter-lists.json')) {
              this.resource.updateFromRemote();
            }
          }
        }, {
          key: 'updateExtraListsFromMetadata',
          value: function updateExtraListsFromMetadata(extraLists) {
            var _this2 = this;

            Object.keys(extraLists).forEach(function (entry) {
              var metadata = extraLists[entry];
              var url = metadata.homeURL !== undefined ? metadata.homeURL : entry;

              _this2.triggerCallbacks({
                asset: entry,
                remoteURL: url
              });
            });
          }
        }]);

        return ExtraLists;
      })(UpdateCallbackHandler);

      FiltersList = (function (_UpdateCallbackHandler3) {
        _inherits(FiltersList, _UpdateCallbackHandler3);

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

      _default = (function (_UpdateCallbackHandler4) {
        _inherits(_default, _UpdateCallbackHandler4);

        function _default() {
          _classCallCheck(this, _default);

          _get(Object.getPrototypeOf(_default.prototype), 'constructor', this).call(this);

          // Current checksums of official filters lists
          this.checksums = new Checksums();

          // Index of available extra filters lists
          this.extraLists = new ExtraLists();

          // Lists of filters currently loaded
          this.lists = new Map();

          // Update extra lists
          this.checksums.onUpdate(this.extraLists.updateExtraLists.bind(this.extraLists));

          // Register callbacks on list creation
          this.checksums.onUpdate(this.updateList.bind(this));
          this.extraLists.onUpdate(this.updateList.bind(this));
        }

        _createClass(_default, [{
          key: 'load',
          value: function load() {
            this.extraLists.load();
            this.checksums.load();
          }
        }, {
          key: 'updateList',
          value: function updateList(_ref2) {
            var _this3 = this;

            var checksum = _ref2.checksum;
            var asset = _ref2.asset;
            var remoteURL = _ref2.remoteURL;

            if (isListSupported(asset)) {
              var list = this.lists.get(asset);

              if (list === undefined) {
                list = new FiltersList(checksum, asset, remoteURL);
                this.lists.set(asset, list);
                list.onUpdate(function (filters) {
                  _this3.triggerCallbacks({ asset: asset, filters: filters });
                });
                list.load();
              } else {
                list.updateFromChecksum(checksum);
              }
            }
          }
        }]);

        return _default;
      })(UpdateCallbackHandler);

      _export('default', _default);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9maWx0ZXJzLWxvYWRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozt1REFJTSxjQUFjLEVBSWQsVUFBVSxFQUNWLFVBQVUsRUFDVixRQUFRLEVBQ1IsT0FBTyxFQUlQLG9CQUFvQixFQUNwQixRQUFRLEVBQ1IsYUFBYSxFQW9CYixhQUFhLEVBc0JiLFNBQVMsRUFtRFQsVUFBVSxFQXFDVixXQUFXOzs7Ozs7Ozs7Ozs7QUEvSGpCLFdBQVMsV0FBVyxDQUFDLElBQUksRUFBRTtBQUN6QixRQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsaUNBQWlDLENBQUMsRUFBRTtBQUN0RCxhQUFPLG9CQUFvQixHQUFHLElBQUksQ0FBQztLQUNwQyxNQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO0FBQ2xELGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FDakIseUJBQXlCLEVBQ3RCLFFBQVEsbUJBQWdCLENBQUM7S0FDL0IsTUFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtBQUM1QyxhQUFPLElBQUksQ0FBQyxPQUFPLENBQ2pCLG1CQUFtQixFQUNoQixRQUFRLGNBQVcsQ0FBQztLQUMxQjs7QUFFRCxXQUFPLElBQUksQ0FBQztHQUNiOzs7Ozs7QUFvQkQsV0FBUyxlQUFlLENBQUMsSUFBSSxFQUFFO0FBQzdCLFdBQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNoQzs7Ozs7cUNBeER3QixRQUFRO2tEQUFFLHFCQUFxQjs7O0FBSWxELG9CQUFjLEdBQUcsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDOzs7QUFJL0MsZ0JBQVUsR0FBRyxJQUFJO0FBQ2pCLGdCQUFVLEdBQUcsRUFBRSxHQUFHLFVBQVU7QUFDNUIsY0FBUSxHQUFHLEVBQUUsR0FBRyxVQUFVO0FBQzFCLGFBQU8sR0FBRyxFQUFFLEdBQUcsUUFBUTs7O0FBSXZCLDBCQUFvQixHQUFHLDBEQUEw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Q25DO2FBQ0Y7V0FDRjs7OztTQTFDMEIscUJBQXFCIiwiZmlsZSI6ImFkYmxvY2tlci9maWx0ZXJzLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZXNvdXJjZUxvYWRlciwgeyBSZXNvdXJjZSwgVXBkYXRlQ2FsbGJhY2tIYW5kbGVyIH0gZnJvbSAnY29yZS9yZXNvdXJjZS1sb2FkZXInO1xuXG5cbi8vIERpc2sgcGVyc2lzdGluZ1xuY29uc3QgUkVTT1VSQ0VTX1BBVEggPSBbJ2FudGl0cmFja2luZycsICdhZGJsb2NraW5nJ107XG5cblxuLy8gQ29tbW9uIGR1cmF0aW9uc1xuY29uc3QgT05FX1NFQ09ORCA9IDEwMDA7XG5jb25zdCBPTkVfTUlOVVRFID0gNjAgKiBPTkVfU0VDT05EO1xuY29uc3QgT05FX0hPVVIgPSA2MCAqIE9ORV9NSU5VVEU7XG5jb25zdCBPTkVfREFZID0gMjQgKiBPTkVfSE9VUjtcblxuXG4vLyBVUkxzIHRvIGZldGNoIGJsb2NrIGxpc3RzXG5jb25zdCBGSUxURVJfTElTVF9CQVNFX1VSTCA9ICdodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vZ29yaGlsbC91QmxvY2svbWFzdGVyLyc7XG5jb25zdCBCQVNFX1VSTCA9ICdodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vdUJsb2NrT3JpZ2luL3VBc3NldHMvbWFzdGVyLyc7XG5jb25zdCBDSEVDS1NVTVNfVVJMID0gYCR7QkFTRV9VUkx9Y2hlY2tzdW1zL3VibG9jazAudHh0P189YDtcblxuXG5mdW5jdGlvbiB1cmxGcm9tUGF0aChwYXRoKSB7XG4gIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ2Fzc2V0cy91YmxvY2svZmlsdGVyLWxpc3RzLmpzb24nKSkge1xuICAgIHJldHVybiBGSUxURVJfTElTVF9CQVNFX1VSTCArIHBhdGg7XG4gIH0gZWxzZSBpZiAocGF0aC5zdGFydHNXaXRoKCdhc3NldHMvdGhpcmRwYXJ0aWVzLycpKSB7XG4gICAgcmV0dXJuIHBhdGgucmVwbGFjZShcbiAgICAgIC9eYXNzZXRzXFwvdGhpcmRwYXJ0aWVzXFwvLyxcbiAgICAgIGAke0JBU0VfVVJMfXRoaXJkcGFydGllcy9gKTtcbiAgfSBlbHNlIGlmIChwYXRoLnN0YXJ0c1dpdGgoJ2Fzc2V0cy91YmxvY2svJykpIHtcbiAgICByZXR1cm4gcGF0aC5yZXBsYWNlKFxuICAgICAgL15hc3NldHNcXC91YmxvY2tcXC8vLFxuICAgICAgYCR7QkFTRV9VUkx9ZmlsdGVycy9gKTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5cbmNvbnN0IEFMTE9XRURfTElTVFMgPSBuZXcgU2V0KFtcbiAgLy8gdUJsb2NrXG4gICdhc3NldHMvdWJsb2NrL2ZpbHRlcnMudHh0JyxcbiAgJ2Fzc2V0cy91YmxvY2svdW5icmVhay50eHQnLFxuICAvLyBBZGJsb2NrIHBsdXNcbiAgJ2Fzc2V0cy90aGlyZHBhcnRpZXMvZWFzeWxpc3QtZG93bmxvYWRzLmFkYmxvY2twbHVzLm9yZy9lYXN5bGlzdC50eHQnLFxuICAvLyBFeHRyYSBsaXN0c1xuICAncGdsLnlveW8ub3JnL2FzL3NlcnZlcmxpc3QnLFxuICAvLyBBbnRpIGFkYmxvY2sga2lsbGVyc1xuICAnaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3JlZWsvYW50aS1hZGJsb2NrLWtpbGxlci9tYXN0ZXIvYW50aS1hZGJsb2NrLWtpbGxlci1maWx0ZXJzLnR4dCcsXG4gICdodHRwczovL2Vhc3lsaXN0LWRvd25sb2Fkcy5hZGJsb2NrcGx1cy5vcmcvYW50aWFkYmxvY2tmaWx0ZXJzLnR4dCcsXG4gIC8vIFByaXZhY3lcbiAgLy8gXCJhc3NldHMvdGhpcmRwYXJ0aWVzL2Vhc3lsaXN0LWRvd25sb2Fkcy5hZGJsb2NrcGx1cy5vcmcvZWFzeXByaXZhY3kudHh0XCIsXG4gIC8vIFwiYXNzZXRzL3VibG9jay9wcml2YWN5LnR4dFwiXG5dKTtcblxuXG5mdW5jdGlvbiBpc0xpc3RTdXBwb3J0ZWQocGF0aCkge1xuICByZXR1cm4gQUxMT1dFRF9MSVNUUy5oYXMocGF0aCk7XG59XG5cblxuY2xhc3MgQ2hlY2tzdW1zIGV4dGVuZHMgVXBkYXRlQ2FsbGJhY2tIYW5kbGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMubG9hZGVyID0gbmV3IFJlc291cmNlTG9hZGVyKFxuICAgICAgUkVTT1VSQ0VTX1BBVEguY29uY2F0KCdjaGVja3N1bXMnKSxcbiAgICAgIHtcbiAgICAgICAgY3JvbjogT05FX0RBWSxcbiAgICAgICAgZGF0YVR5cGU6ICdwbGFpblRleHQnLFxuICAgICAgICByZW1vdGVVUkw6IHRoaXMucmVtb3RlVVJMLFxuICAgICAgfVxuICAgICk7XG4gICAgdGhpcy5sb2FkZXIub25VcGRhdGUodGhpcy51cGRhdGVDaGVja3N1bXMuYmluZCh0aGlzKSk7XG4gIH1cblxuICBsb2FkKCkge1xuICAgIHRoaXMubG9hZGVyLmxvYWQoKS50aGVuKHRoaXMudXBkYXRlQ2hlY2tzdW1zLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLy8gUHJpdmF0ZSBBUElcblxuICBnZXQgcmVtb3RlVVJMKCkge1xuICAgIC8vIFRoZSBVUkwgc2hvdWxkIGNvbnRhaW4gYSB0aW1lc3RhbXAgdG8gYXZvaWQgY2FjaGluZ1xuICAgIHJldHVybiBDSEVDS1NVTVNfVVJMICsgU3RyaW5nKERhdGUubm93KCkpO1xuICB9XG5cbiAgdXBkYXRlQ2hlY2tzdW1zKGRhdGEpIHtcbiAgICAvLyBVcGRhdGUgdGhlIFVSTCBhcyBpdCBtdXN0IGluY2x1ZGUgdGhlIHRpbWVzdGFtcCB0byBhdm9pZCBjYWNoaW5nXG4gICAgLy8gTk9URTogVGhpcyBtdXN0bid0IGJlIHJlbW92ZWQgYXMgaXQgd291bGQgYnJlYWsgdGhlIHVwZGF0ZS5cbiAgICB0aGlzLmxvYWRlci5yZXNvdXJjZS5yZW1vdGVVUkwgPSB0aGlzLnJlbW90ZVVSTDtcblxuICAgIC8vIFBhcnNlIGNoZWNrc3Vtc1xuICAgIGRhdGEuc3BsaXQoL1xcclxcbnxcXHJ8XFxuL2cpXG4gICAgICAuZmlsdGVyKGxpbmUgPT4gbGluZS5sZW5ndGggPiAwKVxuICAgICAgLmZvckVhY2gobGluZSA9PiB7XG4gICAgICAgIGNvbnN0IFtjaGVja3N1bSwgYXNzZXRdID0gbGluZS5zcGxpdCgnICcpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgY2FsbGJhY2sgZXZlbiBpZiBjaGVja3N1bSBpcyB0aGUgc2FtZSBzaW5jZVxuICAgICAgICAvLyBpdCB3b3VsZG4ndCB3b3JrIGZvciBmaWx0ZXItbGlzdHMuanNvbiBmaWxlIHdoaWNoIGNvdWxkXG4gICAgICAgIC8vIGhhdmUgdGhlIHNhbWUgY2hlY2tzdW0gYnV0IGxpc3RzIGNvdWxkIGJlIGV4cGlyZWQuXG4gICAgICAgIC8vIEZpbHRlcnNMaXN0IGNsYXNzIGhhcyB0aGVuIHRvIGNoZWNrIHRoZSBjaGVja3N1bSBiZWZvcmUgdXBkYXRlLlxuICAgICAgICB0aGlzLnRyaWdnZXJDYWxsYmFja3Moe1xuICAgICAgICAgIGNoZWNrc3VtLFxuICAgICAgICAgIGFzc2V0LFxuICAgICAgICAgIHJlbW90ZVVSTDogdXJsRnJvbVBhdGgoYXNzZXQpLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG59XG5cblxuY2xhc3MgRXh0cmFMaXN0cyBleHRlbmRzIFVwZGF0ZUNhbGxiYWNrSGFuZGxlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLnJlc291cmNlID0gbmV3IFJlc291cmNlKFxuICAgICAgUkVTT1VSQ0VTX1BBVEguY29uY2F0KFsnYXNzZXRzJywgJ3VibG9jaycsICdmaWx0ZXItbGlzdHMuanNvbiddKSxcbiAgICAgIHsgcmVtb3RlVVJMOiB1cmxGcm9tUGF0aCgnYXNzZXRzL3VibG9jay9maWx0ZXItbGlzdHMuanNvbicpIH1cbiAgICApO1xuICAgIHRoaXMucmVzb3VyY2Uub25VcGRhdGUodGhpcy51cGRhdGVFeHRyYUxpc3RzRnJvbU1ldGFkYXRhLmJpbmQodGhpcykpO1xuICB9XG5cbiAgbG9hZCgpIHtcbiAgICB0aGlzLnJlc291cmNlLmxvYWQoKS50aGVuKHRoaXMudXBkYXRlRXh0cmFMaXN0c0Zyb21NZXRhZGF0YS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIHVwZGF0ZUV4dHJhTGlzdHMoeyBhc3NldCB9KSB7XG4gICAgaWYgKGFzc2V0LmVuZHNXaXRoKCdmaWx0ZXItbGlzdHMuanNvbicpKSB7XG4gICAgICB0aGlzLnJlc291cmNlLnVwZGF0ZUZyb21SZW1vdGUoKTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGVFeHRyYUxpc3RzRnJvbU1ldGFkYXRhKGV4dHJhTGlzdHMpIHtcbiAgICBPYmplY3Qua2V5cyhleHRyYUxpc3RzKS5mb3JFYWNoKGVudHJ5ID0+IHtcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gZXh0cmFMaXN0c1tlbnRyeV07XG4gICAgICBjb25zdCB1cmwgPSBtZXRhZGF0YS5ob21lVVJMICE9PSB1bmRlZmluZWQgPyBtZXRhZGF0YS5ob21lVVJMIDogZW50cnk7XG5cbiAgICAgIHRoaXMudHJpZ2dlckNhbGxiYWNrcyh7XG4gICAgICAgIGFzc2V0OiBlbnRyeSxcbiAgICAgICAgcmVtb3RlVVJMOiB1cmwsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5cbi8vIFRPRE86IERvd25sb2FkIHRoZSBmaWxlIGV2ZXJ5dGltZSwgYnV0IHdlIHNob3VsZCBmaW5kIGEgd2F5IHRvIHVzZSB0aGUgY2hlY2tzdW1cbi8vIE9yLCBzaW5jZSBzb21lIGxpc3RzIHVzZSBhbiBleHBpcmF0aW9uIGRhdGUsIHdlIGNvdWxkIHN0b3JlIGEgdGltZXN0YW1wIGluc3RlYWQgb2YgY2hlY2tzdW1cbmNsYXNzIEZpbHRlcnNMaXN0IGV4dGVuZHMgVXBkYXRlQ2FsbGJhY2tIYW5kbGVyIHtcbiAgY29uc3RydWN0b3IoY2hlY2tzdW0sIGFzc2V0LCByZW1vdGVVUkwpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuY2hlY2tzdW0gPSBjaGVja3N1bTtcblxuICAgIGxldCBhc3NldE5hbWUgPSBhc3NldDtcblxuICAgIC8vIFN0cmlwIHByZWZpeFxuICAgIFsnaHR0cDovLycsICdodHRwczovLyddLmZvckVhY2gocHJlZml4ID0+IHtcbiAgICAgIGlmIChhc3NldE5hbWUuc3RhcnRzV2l0aChwcmVmaXgpKSB7XG4gICAgICAgIGFzc2V0TmFtZSA9IGFzc2V0TmFtZS5zdWJzdHJpbmcocHJlZml4Lmxlbmd0aCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlc291cmNlID0gbmV3IFJlc291cmNlKFxuICAgICAgUkVTT1VSQ0VTX1BBVEguY29uY2F0KGFzc2V0TmFtZS5zcGxpdCgnLycpKSxcbiAgICAgIHsgcmVtb3RlVVJMLCBkYXRhVHlwZTogJ3BsYWluVGV4dCcgfVxuICAgICk7XG4gICAgdGhpcy5yZXNvdXJjZS5vblVwZGF0ZSh0aGlzLnVwZGF0ZUxpc3QuYmluZCh0aGlzKSk7XG4gIH1cblxuICBsb2FkKCkge1xuICAgIHRoaXMucmVzb3VyY2UubG9hZCgpLnRoZW4odGhpcy51cGRhdGVMaXN0LmJpbmQodGhpcykpO1xuICB9XG5cbiAgdXBkYXRlRnJvbUNoZWNrc3VtKGNoZWNrc3VtKSB7XG4gICAgaWYgKGNoZWNrc3VtID09PSB1bmRlZmluZWQgfHwgY2hlY2tzdW0gIT09IHRoaXMuY2hlY2tzdW0pIHtcbiAgICAgIHRoaXMuY2hlY2tzdW0gPSBjaGVja3N1bTtcbiAgICAgIHRoaXMucmVzb3VyY2UudXBkYXRlRnJvbVJlbW90ZSgpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZUxpc3QoZGF0YSkge1xuICAgIGNvbnN0IGZpbHRlcnMgPSBkYXRhLnNwbGl0KC9cXHJcXG58XFxyfFxcbi9nKTtcbiAgICBpZiAoZmlsdGVycy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnRyaWdnZXJDYWxsYmFja3MoZmlsdGVycyk7XG4gICAgfVxuICB9XG59XG5cblxuLyogQ2xhc3MgcmVzcG9uc2libGUgZm9yIGxvYWRpbmcsIHBlcnNpc3RpbmcgYW5kIHVwZGF0aW5nIGZpbHRlcnMgbGlzdHMuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIGV4dGVuZHMgVXBkYXRlQ2FsbGJhY2tIYW5kbGVyIHtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgLy8gQ3VycmVudCBjaGVja3N1bXMgb2Ygb2ZmaWNpYWwgZmlsdGVycyBsaXN0c1xuICAgIHRoaXMuY2hlY2tzdW1zID0gbmV3IENoZWNrc3VtcygpO1xuXG4gICAgLy8gSW5kZXggb2YgYXZhaWxhYmxlIGV4dHJhIGZpbHRlcnMgbGlzdHNcbiAgICB0aGlzLmV4dHJhTGlzdHMgPSBuZXcgRXh0cmFMaXN0cygpO1xuXG4gICAgLy8gTGlzdHMgb2YgZmlsdGVycyBjdXJyZW50bHkgbG9hZGVkXG4gICAgdGhpcy5saXN0cyA9IG5ldyBNYXAoKTtcblxuICAgIC8vIFVwZGF0ZSBleHRyYSBsaXN0c1xuICAgIHRoaXMuY2hlY2tzdW1zLm9uVXBkYXRlKHRoaXMuZXh0cmFMaXN0cy51cGRhdGVFeHRyYUxpc3RzLmJpbmQodGhpcy5leHRyYUxpc3RzKSk7XG5cbiAgICAvLyBSZWdpc3RlciBjYWxsYmFja3Mgb24gbGlzdCBjcmVhdGlvblxuICAgIHRoaXMuY2hlY2tzdW1zLm9uVXBkYXRlKHRoaXMudXBkYXRlTGlzdC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmV4dHJhTGlzdHMub25VcGRhdGUodGhpcy51cGRhdGVMaXN0LmJpbmQodGhpcykpO1xuICB9XG5cbiAgbG9hZCgpIHtcbiAgICB0aGlzLmV4dHJhTGlzdHMubG9hZCgpO1xuICAgIHRoaXMuY2hlY2tzdW1zLmxvYWQoKTtcbiAgfVxuXG4gIHVwZGF0ZUxpc3QoeyBjaGVja3N1bSwgYXNzZXQsIHJlbW90ZVVSTCB9KSB7XG4gICAgaWYgKGlzTGlzdFN1cHBvcnRlZChhc3NldCkpIHtcbiAgICAgIGxldCBsaXN0ID0gdGhpcy5saXN0cy5nZXQoYXNzZXQpO1xuXG4gICAgICBpZiAobGlzdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxpc3QgPSBuZXcgRmlsdGVyc0xpc3QoY2hlY2tzdW0sIGFzc2V0LCByZW1vdGVVUkwpO1xuICAgICAgICB0aGlzLmxpc3RzLnNldChhc3NldCwgbGlzdCk7XG4gICAgICAgIGxpc3Qub25VcGRhdGUoZmlsdGVycyA9PiB7XG4gICAgICAgICAgdGhpcy50cmlnZ2VyQ2FsbGJhY2tzKHsgYXNzZXQsIGZpbHRlcnMgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBsaXN0LmxvYWQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpc3QudXBkYXRlRnJvbUNoZWNrc3VtKGNoZWNrc3VtKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==