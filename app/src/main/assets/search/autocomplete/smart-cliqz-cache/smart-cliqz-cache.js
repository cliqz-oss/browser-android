System.register('autocomplete/smart-cliqz-cache/smart-cliqz-cache', ['autocomplete/smart-cliqz-cache/rich-header', 'core/cliqz', 'core/fs', 'autocomplete/smart-cliqz-cache/cache'], function (_export) {
  'use strict';

  var getSmartCliqz, utils, mkdir, Cache, CUSTOM_DATA_CACHE_FOLDER, CUSTOM_DATA_CACHE_FILE, MAX_ITEMS, ONE_MINUTE, ONE_HOUR, ONE_DAY, _default;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_autocompleteSmartCliqzCacheRichHeader) {
      getSmartCliqz = _autocompleteSmartCliqzCacheRichHeader.getSmartCliqz;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_coreFs) {
      mkdir = _coreFs.mkdir;
    }, function (_autocompleteSmartCliqzCacheCache) {
      Cache = _autocompleteSmartCliqzCacheCache['default'];
    }],
    execute: function () {
      CUSTOM_DATA_CACHE_FOLDER = 'cliqz';
      CUSTOM_DATA_CACHE_FILE = CUSTOM_DATA_CACHE_FOLDER + '/smartcliqz-custom-data-cache.json';

      // maximum number of items (e.g., categories or links) to keep
      MAX_ITEMS = 5;
      ONE_MINUTE = 60;
      ONE_HOUR = ONE_MINUTE * 60;
      ONE_DAY = ONE_HOUR * 24;

      /*
       * @namespace smart-cliqz-cache
       */

      _default = (function () {
        /**
        * This module caches SmartCliqz results in the extension. It
        * also customizes news SmartCliqz by re-ordering categories and
        * links based on the user's browsing history.
        * @class SmartCliqzCache
        * @constructor
        */

        function _default() {
          var _this = this;

          _classCallCheck(this, _default);

          this._smartCliqzCache = new Cache(ONE_MINUTE);
          // re-customize after an hour
          this._customDataCache = new Cache(ONE_HOUR);
          this._isCustomizationEnabledByDefault = true;
          this._isInitialized = false;
          // to prevent fetching while fetching is still in progress
          this._fetchLock = {};

          mkdir(CUSTOM_DATA_CACHE_FOLDER).then(function () {
            // TODO: detect when loaded; allow save only afterwards
            _this._customDataCache.load(CUSTOM_DATA_CACHE_FILE);
          })['catch'](function (e) {
            _this._log('init: unable to create cache folder:' + e);
          });

          this._isInitialized = true;
          this._log('init: initialized');
        }

        /*
        * stores SmartCliqz if newer than chached version
        * @method store
        * @param smartCliqz
        */

        _createClass(_default, [{
          key: 'store',
          value: function store(smartCliqz) {
            var url = this.getUrl(smartCliqz);

            this._smartCliqzCache.store(url, smartCliqz);

            try {
              if (this.isCustomizationEnabled() && this.isNews(smartCliqz) && this._customDataCache.isStale(url)) {

                this._log('store: found stale data for url ' + url);
                this._prepareCustomData(url);
              }
            } catch (e) {
              this._log('store: error while customizing data: ' + e);
            }
          }

          /**
          * @method fetchAndStore
          * @param id
          */
        }, {
          key: 'fetchAndStore',
          value: function fetchAndStore(url) {
            var _this2 = this;

            if (this._fetchLock.hasOwnProperty(url)) {
              this._log('fetchAndStore: fetching already in progress for ' + url);
              return;
            }

            this._log('fetchAndStore: for ' + url);
            this._fetchLock[url] = true;
            getSmartCliqz(url).then(function (smartCliqz) {
              // limit number of categories/links
              if (smartCliqz.hasOwnProperty('data')) {
                if (smartCliqz.data.hasOwnProperty('links')) {
                  smartCliqz.data.links = smartCliqz.data.links.slice(0, MAX_ITEMS);
                }
                if (smartCliqz.data.hasOwnProperty('categories')) {
                  smartCliqz.data.categories = smartCliqz.data.categories.slice(0, MAX_ITEMS);
                }
              }
              _this2.store(smartCliqz);
              delete _this2._fetchLock[url];
            }, function (e) {
              _this2._log('fetchAndStore: error while fetching data: ' + e.type + ' ' + e.message);
              delete _this2._fetchLock[url];
            });
          }

          /**
          * customizes SmartCliqz if news or domain supported, and user preference is set
          * @method retrieve
          * @param url
          * @returns SmartCliqz from cache (false if not found)
          */
        }, {
          key: 'retrieve',
          value: function retrieve(url) {
            var smartCliqz = this._smartCliqzCache.retrieve(url);

            if (this.isCustomizationEnabled() && smartCliqz && this.isNews(smartCliqz)) {
              try {
                this._customizeSmartCliqz(smartCliqz);
              } catch (e) {
                this._log('retrieveCustomized: error while customizing data: ' + e);
              }
            }

            return smartCliqz;
          }

          /**
           * Same as `retrieve`, but triggers asynchronous cache update:
           * fetches SmartCliqz (again) if not yet cached or if stale. If SmartCliqz
           * was not yet cached `false` is returned and update is initiated.
           * @param {String} url - The SmartCliqz trigger URL
           * @return {SmartCliqz} The cached SmartCliqz or false if not yet cached.
           */
        }, {
          key: 'retrieveAndUpdate',
          value: function retrieveAndUpdate(url) {
            var smartCliqz = this.retrieve(url);

            if (this._smartCliqzCache.isStale(url)) {
              utils.setTimeout((function () {
                this.fetchAndStore(url);
              }).bind(this), 0);
            }

            return smartCliqz;
          }

          /**
          * extracts domain from SmartCliqz
          * @method getDomain
          * @param smartCliqz
          */
        }, {
          key: 'getDomain',
          value: function getDomain(smartCliqz) {
            // TODO: define one place to store domain
            if (smartCliqz.data.domain) {
              return smartCliqz.data.domain;
            } else if (smartCliqz.data.trigger_urls && smartCliqz.data.trigger_urls.length > 0) {
              return utils.generalizeUrl(smartCliqz.data.trigger_urls[0]);
            } else {
              return false;
            }
          }

          /**
          * extracts id from SmartCliqz
          * @method getId
          * @param smartCliqz
          */
        }, {
          key: 'getId',
          value: function getId(smartCliqz) {
            return smartCliqz.data.__subType__.id;
          }

          /**
          * extracts URL from SmartCliqz
          * @method getUrl
          * @param smartCliqz
          */
        }, {
          key: 'getUrl',
          value: function getUrl(smartCliqz) {
            return utils.generalizeUrl(smartCliqz.val, true);
          }

          /**
          * extracts timestamp from SmartCliqz
          * @method getTimestamp
          * @param smartCliqz
          */
        }, {
          key: 'getTimestamp',
          value: function getTimestamp(smartCliqz) {
            return smartCliqz.data.ts;
          }

          /**
          * @method isNews
          * @param smartCliqz
          * returns true this is a news SmartCliqz
          */
        }, {
          key: 'isNews',
          value: function isNews(smartCliqz) {
            return typeof smartCliqz.data.news !== 'undefined';
          }

          /**
          * @method isCustomizationEnabled
          * @returns true if the user enabled customization
          */
        }, {
          key: 'isCustomizationEnabled',
          value: function isCustomizationEnabled() {
            try {
              var isEnabled = utils.getPref('enableSmartCliqzCustomization', undefined);
              return isEnabled === undefined ? this._isCustomizationEnabledByDefault : isEnabled;
            } catch (e) {
              return this._isCustomizationEnabledByDefault;
            }
          }

          // re-orders categories based on visit frequency
        }, {
          key: '_customizeSmartCliqz',
          value: function _customizeSmartCliqz(smartCliqz) {
            var url = this.getUrl(smartCliqz);
            if (this._customDataCache.isCached(url)) {
              this._injectCustomData(smartCliqz, this._customDataCache.retrieve(url));

              if (this._customDataCache.isStale(url)) {
                this._log('_customizeSmartCliqz: found stale data for ' + url);
                this._prepareCustomData(url);
              }
            } else {
              this._log('_customizeSmartCliqz: custom data not yet ready for ' + url);
            }
          }

          // replaces all keys from custom data in SmartCliqz data
        }, {
          key: '_injectCustomData',
          value: function _injectCustomData(smartCliqz, customData) {
            var url = this.getUrl(smartCliqz);
            this._log('_injectCustomData: injecting for ' + url);
            for (var key in customData) {
              if (customData.hasOwnProperty(key)) {
                smartCliqz.data[key] = customData[key];
                this._log('_injectCustomData: injecting key ' + key);
              }
            }
            this._log('_injectCustomData: done injecting for ' + url);
          }

          // prepares and stores custom data for SmartCliqz with given URL (async.),
          // (if custom data has not been prepared before and has not expired)
        }, {
          key: '_prepareCustomData',
          value: function _prepareCustomData(url) {
            var _this3 = this;

            if (this._customDataCache.isStale(url)) {
              // update time so that this method is not executed multiple
              // times while not yet finished (runs asynchronously)
              this._customDataCache.refresh(url);
              this._log('_prepareCustomData: preparing for ' + url);
            } else {
              this._log('_prepareCustomData: already updated or in update progress ' + url);
              return;
            }

            // for stats
            var oldCustomData = this._customDataCache.retrieve(url);

            // (1) fetch template from rich header
            getSmartCliqz(url).then(function (smartCliqz) {
              var domain = _this3.getDomain(smartCliqz);
              return Promise.all([Promise.resolve(smartCliqz), _this3._fetchVisitedUrls(domain)]);
            })
            // (2) fetch history for SmartCliqz domain
            .then(function (_ref) {
              var _ref2 = _slicedToArray(_ref, 2);

              var smartCliqz = _ref2[0];
              var urls = _ref2[1];

              // now, (3) re-order template categories based on history
              var domain = _this3.getDomain(smartCliqz);

              // TODO: define per SmartCliqz what the data field to be customized is called
              if (!_this3.isNews(smartCliqz)) {
                smartCliqz.data.categories = smartCliqz.data.links;
              }

              var categories = smartCliqz.data.categories.slice();

              // add some information to facilitate re-ordering
              for (var j = 0; j < categories.length; j++) {
                categories[j].genUrl = utils.generalizeUrl(categories[j].url);
                categories[j].matchCount = 0;
                categories[j].originalOrder = j;
              }

              // count category-visit matches (visit url contains category url)
              for (var i = 0; i < urls.length; i++) {
                var _url = utils.generalizeUrl(urls[i]);
                for (var j = 0; j < categories.length; j++) {
                  if (_this3._isMatch(_url, categories[j].genUrl)) {
                    categories[j].matchCount++;
                  }
                }
              }

              // re-order by match count; on tie use original order
              categories.sort(function compare(a, b) {
                if (a.matchCount !== b.matchCount) {
                  return b.matchCount - a.matchCount; // descending
                } else {
                    return a.originalOrder - b.originalOrder; // ascending
                  }
              });

              categories = categories.slice(0, MAX_ITEMS);

              var oldCategories = oldCustomData ?
              // previous customization: use either categories (news) or links (other SmartCliqz)
              _this3.isNews(smartCliqz) ? oldCustomData.categories : oldCustomData.links :
              // no previous customization: use default order
              smartCliqz.data.categories;

              // send some stats
              _this3._sendStats(oldCategories, categories, oldCustomData ? true : false, urls);

              // TODO: define per SmartCliqz what the data field to be customized is called
              if (_this3.isNews(smartCliqz)) {
                _this3._customDataCache.store(url, { categories: categories });
              } else {
                _this3._customDataCache.store(url, { links: categories });
              }

              _this3._log('_prepareCustomData: done preparing for ' + url);
              _this3._customDataCache.save(CUSTOM_DATA_CACHE_FILE);
            })['catch'](function (e) {
              return _this3._log('_prepareCustomData: error while fetching data: ' + e.message);
            });
          }

          // checks if URL from history matches a category URL
        }, {
          key: '_isMatch',
          value: function _isMatch(historyUrl, categoryUrl) {
            // TODO: check for subcategories, for example,
            //       Spiegel 'Soziales' has URL 'wirtschaft/soziales',
            //     thus such entries are counted twice, for 'Sozialez',
            //     but also for 'Wirtschaft'
            return historyUrl.indexOf(categoryUrl) > -1;
          }

          // from history, fetches all visits to given domain within 30 days from now (async.)
        }, {
          key: '_fetchVisitedUrls',
          value: function _fetchVisitedUrls(domain) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
              _this4._log('_fetchVisitedUrls: start fetching for domain ' + domain);
              // TODO: make cross platform
              var historyService = Components.classes['@mozilla.org/browser/nav-history-service;1'].getService(Components.interfaces.nsINavHistoryService);

              if (!historyService) {
                reject('_fetchVisitedUrls: history service not available');
              } else {
                var options = historyService.getNewQueryOptions();
                var query = historyService.getNewQuery();
                query.domain = domain;
                // 30 days from now
                query.beginTimeReference = query.TIME_RELATIVE_NOW;
                query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
                query.endTimeReference = query.TIME_RELATIVE_NOW;
                query.endTime = 0;

                var result = historyService.executeQuery(query, options);
                var container = result.root;
                container.containerOpen = true;

                var urls = [];
                for (var i = 0; i < container.childCount; i++) {
                  urls[i] = container.getChild(i).uri;
                }

                _this4._log('_fetchVisitedUrls: done fetching ' + urls.length + ' URLs for domain ' + domain);
                resolve(urls);
              }
            });
          }
        }, {
          key: '_sendStats',
          value: function _sendStats(oldCategories, newCategories, isRepeatedCustomization, urls) {
            var stats = {
              type: 'activity',
              action: 'smart_cliqz_customization',
              // SmartCliqz id
              id: 'na',
              // total number of URLs retrieved from history
              urlCandidateCount: urls.length,
              // number of URLs that produced a match within shown categories (currently 5)
              urlMatchCount: 0,
              // average number of URL matches across shown categories
              urlMatchCountAvg: 0,
              // standard deviation of URL matches across shown categories
              urlMatchCountSd: 0,
              // number of categories that changed (per position; swap counts twice)
              categoriesPosChangeCount: 0,
              // number of categories kept after re-ordering (positions might change)
              categoriesKeptCount: 0,
              // average position change of a kept categories
              categoriesKeptPosChangeAvg: 0,
              // true, if this customization is a re-customization
              isRepeatedCustomization: isRepeatedCustomization
            };

            var oldPositions = {};
            var length = Math.min(oldCategories.length, newCategories.length);

            for (var i = 0; i < length; i++) {
              stats.urlMatchCount += newCategories[i].matchCount;
              oldPositions[oldCategories[i].title] = i;

              if (newCategories[i].title !== oldCategories[i].title) {
                stats.categoriesPosChangeCount++;
              }
            }
            stats.urlMatchCountAvg = stats.urlMatchCount / length;

            for (var i = 0; i < length; i++) {
              stats.urlMatchCountSd += Math.pow(stats.urlMatchCountAvg - newCategories[i].matchCount, 2);
            }
            stats.urlMatchCountSd /= length;
            stats.urlMatchCountSd = Math.sqrt(stats.urlMatchCountSd);

            for (var i = 0; i < length; i++) {
              if (oldPositions.hasOwnProperty(newCategories[i].title)) {
                stats.categoriesKeptCount++;
                stats.categoriesKeptPosChangeAvg += Math.abs(i - oldPositions[newCategories[i].title]);
              }
            }
            stats.categoriesKeptPosChangeAvg /= stats.categoriesKeptCount;

            utils.telemetry(stats);
          }

          // log helper
        }, {
          key: '_log',
          value: function _log(msg) {
            utils.log(msg, 'smart-cliqz-cache');
          }
        }, {
          key: 'unload',
          value: function unload() {}
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});