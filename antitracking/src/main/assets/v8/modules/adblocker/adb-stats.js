System.register('adblocker/adb-stats', ['antitracking/domain', 'antitracking/attrack', 'adblocker/adblocker', 'antitracking/url'], function (_export) {
  'use strict';

  var getGeneralDomain, attrack, CliqzADB, URLInfo, PageStats, AdbStats;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_antitrackingDomain) {
      getGeneralDomain = _antitrackingDomain.getGeneralDomain;
    }, function (_antitrackingAttrack) {
      attrack = _antitrackingAttrack['default'];
    }, function (_adblockerAdblocker) {
      CliqzADB = _adblockerAdblocker['default'];
    }, function (_antitrackingUrl) {
      URLInfo = _antitrackingUrl.URLInfo;
    }],
    execute: function () {
      PageStats = (function () {
        function PageStats(url) {
          _classCallCheck(this, PageStats);

          this.pageUrl = url;
          this.count = 0;
          this.blocked = new Map();
        }

        _createClass(PageStats, [{
          key: 'addBlockedUrl',
          value: function addBlockedUrl(url) {
            // retrieve company
            this.count++;
            var domain = getGeneralDomain(URLInfo.get(url).hostname);
            var company = undefined;
            // Re-use anti tracking company list for the moment.
            // TODO: Replace it with a proper ads company list later
            if (domain in attrack.tracker_companies) {
              company = attrack.tracker_companies[domain];
            } else if (domain === getGeneralDomain(URLInfo.get(this.pageUrl).hostname)) {
              company = 'First party';
            } else {
              company = '_Unknown';
            }
            if (this.blocked.get(company)) {
              this.blocked.get(company).add(url);
            } else {
              this.blocked.set(company, new Set([url]));
            }
          }
        }, {
          key: 'report',
          value: function report() {
            var advertisersList = {};
            this.blocked.forEach(function (v, k) {
              return advertisersList[k] = [].concat(_toConsumableArray(v));
            });
            return {
              totalCount: this.count,
              advertisersList: advertisersList
            };
          }
        }]);

        return PageStats;
      })();

      AdbStats = (function () {
        function AdbStats() {
          _classCallCheck(this, AdbStats);

          this.pages = new Map();
        }

        _createClass(AdbStats, [{
          key: 'addBlockedUrl',
          value: function addBlockedUrl(sourceUrl, url) {
            if (!this.pages.get(sourceUrl)) {
              this.addNewPage(sourceUrl);
            }
            this.pages.get(sourceUrl).addBlockedUrl(url);
          }
        }, {
          key: 'addNewPage',
          value: function addNewPage(sourceUrl) {
            this.pages.set(sourceUrl, new PageStats(sourceUrl));
          }
        }, {
          key: 'report',
          value: function report(url) {
            if (this.pages.get(url)) {
              return this.pages.get(url).report();
            } else {
              return {
                totalCount: 0,
                advertisersList: {}
              };
            }
          }
        }, {
          key: 'clearStats',
          value: function clearStats() {
            var _this = this;

            this.pages.forEach(function (value, key) {
              if (!CliqzADB.isTabURL(key)) {
                _this.pages['delete'](key);
              }
            });
          }
        }]);

        return AdbStats;
      })();

      _export('default', AdbStats);
    }
  };
});