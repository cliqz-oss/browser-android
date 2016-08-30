System.register('adblocker/adblocker', ['core/cliqz', 'core/webrequest', 'antitracking/url', 'antitracking/domain', 'platform/browser', 'antitracking/persistent-state', 'antitracking/fixed-size-cache', 'antitracking/webrequest-context', 'adblocker/utils', 'adblocker/filters-engine', 'adblocker/filters-loader', 'antitracking/tp_events'], function (_export) {

  // adb version

  //import ContentPolicy from 'adblocker/content-policy';
  //import { hideNodes } from 'adblocker/cosmetics';
  //import { MutationLogger } from 'adblocker/mutation-logger';

  //import CliqzHumanWeb from 'human-web/human-web';
  'use strict';

  var utils, events, WebRequest, URLInfo, getGeneralDomain, sameGeneralDomain, browser, LazyPersistentObject, LRUCache, HttpRequestContext, log, FilterEngine, FiltersLoader, requestActionLogger, ADB_VER, ADB_PREF, ADB_ABTEST_PREF, ADB_PREF_VALUES, ADB_DEFAULT_VALUE, AdBlocker, CliqzADB;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  _export('autoBlockAds', autoBlockAds);

  _export('adbABTestEnabled', adbABTestEnabled);

  /* Wraps filter-based adblocking in a class. It has to handle both
   * the management of lists (fetching, updating) using a FiltersLoader
   * and the matching using a FilterEngine.
   */

  _export('adbEnabled', adbEnabled);

  function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function autoBlockAds() {
    return true;
  }

  function adbABTestEnabled() {
    return CliqzUtils.getPref(ADB_ABTEST_PREF, false);
  }

  function adbEnabled() {
    // TODO: Deal with 'optimized' mode.
    // 0 = Disabled
    // 1 = Enabled
    // 2 = Optimized
    return adbABTestEnabled() && CliqzUtils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) !== 0;
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }, function (_coreWebrequest) {
      WebRequest = _coreWebrequest['default'];
    }, function (_antitrackingUrl) {
      URLInfo = _antitrackingUrl.URLInfo;
    }, function (_antitrackingDomain) {
      getGeneralDomain = _antitrackingDomain.getGeneralDomain;
      sameGeneralDomain = _antitrackingDomain.sameGeneralDomain;
    }, function (_platformBrowser) {
      browser = _platformBrowser;
    }, function (_antitrackingPersistentState) {
      LazyPersistentObject = _antitrackingPersistentState.LazyPersistentObject;
    }, function (_antitrackingFixedSizeCache) {
      LRUCache = _antitrackingFixedSizeCache['default'];
    }, function (_antitrackingWebrequestContext) {
      HttpRequestContext = _antitrackingWebrequestContext['default'];
    }, function (_adblockerUtils) {
      log = _adblockerUtils.log;
    }, function (_adblockerFiltersEngine) {
      FilterEngine = _adblockerFiltersEngine['default'];
    }, function (_adblockerFiltersLoader) {
      FiltersLoader = _adblockerFiltersLoader['default'];
    }, function (_antitrackingTp_events) {
      requestActionLogger = _antitrackingTp_events['default'];
    }],
    execute: function () {
      ADB_VER = 0.01;

      _export('ADB_VER', ADB_VER);

      // Preferences
      ADB_PREF = 'cliqz-adb';

      _export('ADB_PREF', ADB_PREF);

      ADB_ABTEST_PREF = 'cliqz-adb-abtest';

      _export('ADB_ABTEST_PREF', ADB_ABTEST_PREF);

      ADB_PREF_VALUES = {
        Optimized: 2,
        Enabled: 1,
        Disabled: 0
      };

      _export('ADB_PREF_VALUES', ADB_PREF_VALUES);

      ADB_DEFAULT_VALUE = ADB_PREF_VALUES.Disabled;

      _export('ADB_DEFAULT_VALUE', ADB_DEFAULT_VALUE);

      AdBlocker = (function () {
        function AdBlocker() {
          var _this = this;

          _classCallCheck(this, AdBlocker);

          this.engine = new FilterEngine();

          this.listsManager = new FiltersLoader();
          this.listsManager.onUpdate(function (update) {
            // Update list in engine
            var asset = update.asset;
            var filters = update.filters;

            _this.engine.onUpdateFilters(asset, filters);

            _this.initCache();
          });

          // Blacklists to disable adblocking on certain domains/urls
          this.blacklist = new Set();
          this.blacklistPersist = new LazyPersistentObject('adb-blacklist');

          // Is the adblocker initialized
          this.initialized = false;
        }

        _createClass(AdBlocker, [{
          key: 'initCache',
          value: function initCache() {
            // To make sure we don't break any filter behavior, each key in the LRU
            // cache is made up of { source general domain } + { url }.
            // This is because some filters will behave differently based on the
            // domain of the source.

            // Cache queries to FilterEngine
            this.cache = new LRUCache(this.engine.match.bind(this.engine), // Compute result
            1000, // Maximum number of entries
            function (request) {
              return request.sourceGD + request.url;
            } // Select key
            );
          }
        }, {
          key: 'init',
          value: function init() {
            var _this2 = this;

            this.initCache();
            this.listsManager.load();
            this.blacklistPersist.load().then(function (value) {
              // Set value
              if (value.urls !== undefined) {
                _this2.blacklist = new Set(value.urls);
              }
            });
            this.initialized = true;
          }
        }, {
          key: 'persistBlacklist',
          value: function persistBlacklist() {
            this.blacklistPersist.setValue({ urls: [].concat(_toConsumableArray(this.blacklist.values())) });
          }
        }, {
          key: 'addToBlacklist',
          value: function addToBlacklist(url) {
            this.blacklist.add(url);
            this.persistBlacklist();
          }
        }, {
          key: 'removeFromBlacklist',
          value: function removeFromBlacklist(url) {
            this.blacklist['delete'](url);
            this.persistBlacklist();
          }
        }, {
          key: 'isInBlacklist',
          value: function isInBlacklist(request) {
            return this.blacklist.has(request.sourceURL) || this.blacklist.has(request.sourceGD);
          }
        }, {
          key: 'isDomainInBlacklist',
          value: function isDomainInBlacklist(url) {
            // Should all this domain stuff be extracted into a function?
            // Why is CliqzUtils.detDetailsFromUrl not used?
            var urlParts = URLInfo.get(url);
            var hostname = urlParts.hostname;
            if (hostname.startsWith('www.')) {
              hostname = hostname.substring(4);
            }

            return this.blacklist.has(hostname);
          }
        }, {
          key: 'isUrlInBlacklist',
          value: function isUrlInBlacklist(url) {
            return this.blacklist.has(url);
          }
        }, {
          key: 'logActionHW',
          value: function logActionHW(url, action, domain) {
            var type = 'url';
            if (domain) {
              type = 'domain';
            }
            if (!CliqzHumanWeb.state.v[url].adblocker_blacklist) {
              CliqzHumanWeb.state.v[url].adblocker_blacklist = {};
            }
            CliqzHumanWeb.state.v[url].adblocker_blacklist[action] = type;
          }
        }, {
          key: 'toggleUrl',
          value: function toggleUrl(url, domain) {
            var processedURL = url;
            if (domain) {
              // Should all this domain stuff be extracted into a function?
              // Why is CliqzUtils.getDetailsFromUrl not used?
              processedURL = URLInfo.get(url).hostname;
              if (processedURL.startsWith('www.')) {
                processedURL = processedURL.substring(4);
              }
            }

            var existHW = CliqzHumanWeb && CliqzHumanWeb.state.v[url];
            if (this.blacklist.has(processedURL)) {
              this.blacklist['delete'](processedURL);
              // TODO: It's better to have an API from humanweb to indicate if a url is private
              if (existHW) {
                this.logActionHW(url, 'remove', domain);
              }
            } else {
              this.blacklist.add(processedURL);
              if (existHW) {
                this.logActionHW(url, 'add', domain);
              }
            }

            this.persistBlacklist();
          }

          /* @param {webrequest-context} httpContext - Context of the request
           */
        }, {
          key: 'match',
          value: function match(httpContext) {
            // Check if the adblocker is initialized
            if (!this.initialized) {
              return false;
            }

            // Process endpoint URL
            var url = httpContext.url.toLowerCase();
            var urlParts = URLInfo.get(url);
            var hostname = urlParts.hostname;
            if (hostname.startsWith('www.')) {
              hostname = hostname.substring(4);
            }
            var hostGD = getGeneralDomain(hostname);

            // Process source url
            var sourceURL = httpContext.getSourceURL().toLowerCase();
            var sourceParts = URLInfo.get(sourceURL);
            var sourceHostname = sourceParts.hostname;
            if (sourceHostname.startsWith('www.')) {
              sourceHostname = sourceHostname.substring(4);
            }
            var sourceGD = getGeneralDomain(sourceHostname);

            // Wrap informations needed to match the request
            var request = {
              // Request
              url: url,
              cpt: httpContext.getContentPolicyType(),
              // Source
              sourceURL: sourceURL,
              sourceHostname: sourceHostname,
              sourceGD: sourceGD,
              // Endpoint
              hostname: hostname,
              hostGD: hostGD
            };

            log('match ' + JSON.stringify(request));

            var t0 = Date.now();
            var isAd = this.isInBlacklist(request) ? false : this.cache.get(request);
            var totalTime = Date.now() - t0;

            log('BLOCK AD ' + JSON.stringify({
              timeAdFilter: totalTime,
              isAdFilter: isAd,
              context: {
                url: httpContext.url,
                source: httpContext.getSourceURL(),
                cpt: httpContext.getContentPolicyType(),
                method: httpContext.method
              }
            }));

            return isAd;
          }
        }]);

        return AdBlocker;
      })();

      CliqzADB = {
        adblockInitialized: false,
        adbMem: {},
        adbStats: { pages: {} },
        mutationLogger: null,
        adbDebug: false,
        MIN_BROWSER_VERSION: 35,
        timers: [],

        init: function init() {
          // Set `cliqz-adb` default to 'Disabled'
          if (CliqzUtils.getPref(ADB_PREF, undefined) === undefined) {
            CliqzUtils.setPref(ADB_PREF, ADB_PREF_VALUES.Disabled);
          }

          CliqzADB.adBlocker = new AdBlocker();

          var initAdBlocker = function initAdBlocker() {
            //ContentPolicy.init();
            //CliqzADB.cp = ContentPolicy;
            //CliqzADB.mutationLogger = new MutationLogger();
            CliqzADB.adBlocker.init();
            CliqzADB.adblockInitialized = true;
            CliqzADB.initPacemaker();
            WebRequest.onBeforeRequest.addListener(CliqzADB.httpopenObserver.observe, undefined, ['blocking', 'adblocking']);
          };

          if (adbEnabled()) {
            initAdBlocker();
          } else {
            events.sub('prefchange', function (pref) {
              if (pref === ADB_PREF && !CliqzADB.adblockInitialized && adbEnabled()) {
                initAdBlocker();
              }
            });
          }
        },

        unload: function unload() {
          CliqzADB.unloadPacemaker();
          browser.forEachWindow(CliqzADB.unloadWindow);
          WebRequest.onBeforeRequest.removeListener(CliqzADB.httpopenObserver.observe);
          ContentPolicy.unload();
        },

        initWindow: function initWindow(window) {
          if (CliqzADB.mutationLogger !== null) {
            window.gBrowser.addProgressListener(CliqzADB.mutationLogger);
          }
        },

        unloadWindow: function unloadWindow(window) {
          if (window.gBrowser && CliqzADB.mutationLogger !== null) {
            window.gBrowser.removeProgressListener(CliqzADB.mutationLogger);
          }
        },

        initPacemaker: function initPacemaker() {
          var t1 = utils.setInterval(function () {
            Object.keys(CliqzADB.adbStats.pages).forEach(function (url) {
              if (!CliqzADB.isTabURL[url]) {
                delete CliqzADB.adbStats.pages[url];
              }
            });
          }, 10 * 60 * 1000);
          CliqzADB.timers.push(t1);

          var t2 = utils.setInterval(function () {
            if (!CliqzADB.cacheADB) {
              return;
            }
            Object.keys(CliqzADB.cacheADB).forEach(function (t) {
              if (!browser.isWindowActive(t)) {
                delete CliqzADB.cacheADB[t];
              }
            });
          }, 10 * 60 * 1000);
          CliqzADB.timers.push(t2);
        },

        unloadPacemaker: function unloadPacemaker() {
          CliqzADB.timers.forEach(utils.clearTimeout);
        },

        httpopenObserver: {
          observe: function observe(requestDetails) {
            if (!adbEnabled()) {
              return {};
            }

            var requestContext = new HttpRequestContext(requestDetails);
            var url = requestContext.url;

            if (!url) {
              return {};
            }

            var urlParts = URLInfo.get(url);

            if (requestContext.isFullPage()) {
              CliqzADB.adbStats.pages[url] = 0;
            }

            var sourceUrl = requestContext.getLoadingDocument();
            var sourceUrlParts = null;
            var sourceTab = requestContext.getOriginWindowID();

            if (!sourceUrl || sourceUrl.startsWith('about:')) {
              return {};
            }

            sourceUrlParts = URLInfo.get(sourceUrl);

            // same general domain
            var sameGd = sameGeneralDomain(urlParts.hostname, sourceUrlParts.hostname) || false;
            if (sameGd) {
              var wOri = requestContext.getOriginWindowID();
              var wOut = requestContext.getOuterWindowID();
              if (wOri !== wOut) {
                // request from iframe
                // const wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                //   .getService(Components.interfaces.nsIWindowMediator);
                // const frame = wm.getOuterWindowWithId(wOut).frameElement;

                // if (adbEnabled() && CliqzADB.adBlocker.match(requestContext)) {
                //   frame.style.display = 'none';  // hide this node
                //   CliqzADB.adbStats.pages[sourceUrl] = (CliqzADB.adbStats.pages[sourceUrl] || 0) + 1;

                //   frame.setAttribute('cliqz-adb', `source: ${url}`);
                //   return { cancel: true };
                // }
                //frame.setAttribute('cliqz-adblocker', 'safe');
                if (adbEnabled() && CliqzADB.adBlocker.match(requestContext)) {
                  return { cancel: true };
                }
              }
              return {};
            } else if (adbEnabled()) {
              var tpLog = requestActionLogger.get(url, urlParts, sourceUrl, sourceUrlParts, sourceTab);
              if (CliqzADB.mutationLogger && CliqzADB.mutationLogger.tabsInfo[sourceTab] && !CliqzADB.mutationLogger.tabsInfo[sourceTab].observerAdded) {
                CliqzADB.mutationLogger.addMutationObserver(sourceTab);
              }
              if (CliqzADB.adBlocker.match(requestContext)) {
                requestActionLogger.incrementStat(tpLog, 'adblock_block');
                //hideNodes(requestContext);
                return { cancel: true };
              }
            }

            return {};
          }
        },
        getBrowserMajorVersion: function getBrowserMajorVersion() {
          try {
            var appInfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
            return parseInt(appInfo.version.split('.')[0], 10);
          } catch (e) {
            return 100;
          }
        },
        isTabURL: function isTabURL(url) {
          try {
            var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
            var browserEnumerator = wm.getEnumerator('navigator:browser');

            while (browserEnumerator.hasMoreElements()) {
              var browserWin = browserEnumerator.getNext();
              var tabbrowser = browserWin.gBrowser;

              var numTabs = tabbrowser.browsers.length;
              for (var index = 0; index < numTabs; index++) {
                var currentBrowser = tabbrowser.getBrowserAtIndex(index);
                if (currentBrowser) {
                  var tabURL = currentBrowser.currentURI.spec;
                  if (url === tabURL || url === tabURL.split('#')[0]) {
                    return true;
                  }
                }
              }
            }
            return false;
          } catch (e) {
            return false;
          }
        }
      };

      _export('default', CliqzADB);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9hZGJsb2NrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7bU1BdUJhLE9BQU8sRUFHUCxRQUFRLEVBQ1IsZUFBZSxFQUNmLGVBQWUsRUFLZixpQkFBaUIsRUEwQnhCLFNBQVMsRUFzTFQsUUFBUTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTdNUCxXQUFTLFlBQVksR0FBRztBQUM3QixXQUFPLElBQUksQ0FBQztHQUNiOztBQUdNLFdBQVMsZ0JBQWdCLEdBQUc7QUFDakMsV0FBTyxVQUFVLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztHQUNuRDs7QUFHTSxXQUFTLFVBQVUsR0FBRzs7Ozs7QUFLM0IsV0FBTyxnQkFBZ0IsRUFBRSxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDM0Y7Ozs7eUJBcERRLEtBQUs7MEJBQUUsTUFBTTs7OztpQ0FHYixPQUFPOzs2Q0FDUCxnQkFBZ0I7OENBQUUsaUJBQWlCOzs7OzBEQUduQyxvQkFBb0I7Ozs7Ozs0QkFJcEIsR0FBRzs7Ozs7Ozs7O0FBWUMsYUFBTyxHQUFHLElBQUk7Ozs7O0FBR2QsY0FBUSxHQUFHLFdBQVc7Ozs7QUFDdEIscUJBQWUsR0FBRyxrQkFBa0I7Ozs7QUFDcEMscUJBQWUsR0FBRztBQUM3QixpQkFBUyxFQUFFLENBQUM7QUFDWixlQUFPLEVBQUUsQ0FBQztBQUNWLGdCQUFRLEVBQUUsQ0FBQztPQUNaOzs7O0FBQ1ksdUJBQWlCLEdBQUcsZUFBZSxDQUFDLFFBQVE7Ozs7QUEwQm5ELGVBQVM7QUFDRixpQkFEUCxTQUFTLEdBQ0M7OztnQ0FEVixTQUFTOztBQUVYLGNBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQzs7QUFFakMsY0FBSSxDQUFDLFlBQVksR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO0FBQ3hDLGNBQUksQ0FBQyxZQUFZ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QUFDM0MsbUJBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7QUFDNUMsb0JBQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzRCxvQkFBSSxjQUFjLEVBQUU7QUFDbEIsc0JBQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO0FBQzlDLHNCQUFJLEdBQUcsS0FBSyxNQUFNLElBQUksR0FBRyxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDbEQsMkJBQU8sSUFBSSxDQUFDO21CQUNiO2lCQUNGO2VBQ0Y7YUFDRjtBQUNELG1CQUFPLEtBQUssQ0FBQztXQUNkLENBQUMsT0FBTSxDQUFDLEVBQUU7QUFDVCxtQkFBTyxLQUFLLENBQUM7V0FDZDtTQUNGO09BQ0Y7O3lCQUVjLFFBQVEiLCJmaWxlIjoiYWRibG9ja2VyL2FkYmxvY2tlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHV0aWxzLCBldmVudHMgfSBmcm9tICdjb3JlL2NsaXF6JztcbmltcG9ydCBXZWJSZXF1ZXN0IGZyb20gJ2NvcmUvd2VicmVxdWVzdCc7XG5cbmltcG9ydCB7IFVSTEluZm8gfSBmcm9tICdhbnRpdHJhY2tpbmcvdXJsJztcbmltcG9ydCB7IGdldEdlbmVyYWxEb21haW4sIHNhbWVHZW5lcmFsRG9tYWluIH0gZnJvbSAnYW50aXRyYWNraW5nL2RvbWFpbic7XG5pbXBvcnQgKiBhcyBicm93c2VyIGZyb20gJ3BsYXRmb3JtL2Jyb3dzZXInO1xuXG5pbXBvcnQgeyBMYXp5UGVyc2lzdGVudE9iamVjdCB9IGZyb20gJ2FudGl0cmFja2luZy9wZXJzaXN0ZW50LXN0YXRlJztcbmltcG9ydCBMUlVDYWNoZSBmcm9tICdhbnRpdHJhY2tpbmcvZml4ZWQtc2l6ZS1jYWNoZSc7XG5pbXBvcnQgSHR0cFJlcXVlc3RDb250ZXh0IGZyb20gJ2FudGl0cmFja2luZy93ZWJyZXF1ZXN0LWNvbnRleHQnO1xuXG5pbXBvcnQgeyBsb2cgfSBmcm9tICdhZGJsb2NrZXIvdXRpbHMnO1xuaW1wb3J0IEZpbHRlckVuZ2luZSBmcm9tICdhZGJsb2NrZXIvZmlsdGVycy1lbmdpbmUnO1xuaW1wb3J0IEZpbHRlcnNMb2FkZXIgZnJvbSAnYWRibG9ja2VyL2ZpbHRlcnMtbG9hZGVyJztcblxuLy9pbXBvcnQgQ29udGVudFBvbGljeSBmcm9tICdhZGJsb2NrZXIvY29udGVudC1wb2xpY3knO1xuLy9pbXBvcnQgeyBoaWRlTm9kZXMgfSBmcm9tICdhZGJsb2NrZXIvY29zbWV0aWNzJztcbi8vaW1wb3J0IHsgTXV0YXRpb25Mb2dnZXIgfSBmcm9tICdhZGJsb2NrZXIvbXV0YXRpb24tbG9nZ2VyJztcblxuLy9pbXBvcnQgQ2xpcXpIdW1hbldlYiBmcm9tICdodW1hbi13ZWIvaHVtYW4td2ViJztcbmltcG9ydCByZXF1ZXN0QWN0aW9uTG9nZ2VyIGZyb20gJ2FudGl0cmFja2luZy90cF9ldmVudHMnO1xuXG4vLyBhZGIgdmVyc2lvblxuZXhwb3J0IGNvbnN0IEFEQl9WRVIgPSAwLjAxO1xuXG4vLyBQcmVmZXJlbmNlc1xuZXhwb3J0IGNvbnN0IEFEQl9QUkVGID0gJ2NsaXF6LWFkYic7XG5leHBvcnQgY29uc3QgQURCX0FCVEVTVF9QUkVGID0gJ2NsaXF6LWFkYi1hYnRlc3QnO1xuZXhwb3J0IGNvbnN0IEFEQl9QUkVGX1ZBTFVFUyA9IHtcbiAgT3B0aW1pemVkOiAyLFxuICBFbmFibGVkOiAxLFxuICBEaXNhYmxlZDogMCxcbn07XG5leHBvcnQgY29uc3QgQURCX0RFRkFVTFRfVkFMVUUgPSBBREJfUFJFRl9WQUxVRVMuRGlzYWJsZWQ7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGF1dG9CbG9ja0FkcygpIHtcbiAgcmV0dXJuIHRydWU7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFkYkFCVGVzdEVuYWJsZWQoKSB7XG4gIHJldHVybiBDbGlxelV0aWxzLmdldFByZWYoQURCX0FCVEVTVF9QUkVGLCBmYWxzZSk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFkYkVuYWJsZWQoKSB7XG4gIC8vIFRPRE86IERlYWwgd2l0aCAnb3B0aW1pemVkJyBtb2RlLlxuICAvLyAwID0gRGlzYWJsZWRcbiAgLy8gMSA9IEVuYWJsZWRcbiAgLy8gMiA9IE9wdGltaXplZFxuICByZXR1cm4gYWRiQUJUZXN0RW5hYmxlZCgpICYmIENsaXF6VXRpbHMuZ2V0UHJlZihBREJfUFJFRiwgQURCX1BSRUZfVkFMVUVTLkRpc2FibGVkKSAhPT0gMDtcbn1cblxuXG4vKiBXcmFwcyBmaWx0ZXItYmFzZWQgYWRibG9ja2luZyBpbiBhIGNsYXNzLiBJdCBoYXMgdG8gaGFuZGxlIGJvdGhcbiAqIHRoZSBtYW5hZ2VtZW50IG9mIGxpc3RzIChmZXRjaGluZywgdXBkYXRpbmcpIHVzaW5nIGEgRmlsdGVyc0xvYWRlclxuICogYW5kIHRoZSBtYXRjaGluZyB1c2luZyBhIEZpbHRlckVuZ2luZS5cbiAqL1xuY2xhc3MgQWRCbG9ja2VyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5lbmdpbmUgPSBuZXcgRmlsdGVyRW5naW5lKCk7XG5cbiAgICB0aGlzLmxpc3RzTWFuYWdlciA9IG5ldyBGaWx0ZXJzTG9hZGVyKCk7XG4gICAgdGhpcy5saXN0c01hbmFnZXIub25VcGRhdGUodXBkYXRlID0+IHtcbiAgICAgIC8vIFVwZGF0ZSBsaXN0IGluIGVuZ2luZVxuICAgICAgY29uc3QgeyBhc3NldCwgZmlsdGVycyB9ID0gdXBkYXRlO1xuICAgICAgdGhpcy5lbmdpbmUub25VcGRhdGVGaWx0ZXJzKGFzc2V0LCBmaWx0ZXJzKTtcblxuICAgICAgdGhpcy5pbml0Q2FjaGUoKTtcbiAgICB9KTtcblxuICAgIC8vIEJsYWNrbGlzdHMgdG8gZGlzYWJsZSBhZGJsb2NraW5nIG9uIGNlcnRhaW4gZG9tYWlucy91cmxzXG4gICAgdGhpcy5ibGFja2xpc3QgPSBuZXcgU2V0KCk7XG4gICAgdGhpcy5ibGFja2xpc3RQZXJzaXN0ID0gbmV3IExhenlQZXJzaXN0ZW50T2JqZWN0KCdhZGItYmxhY2tsaXN0Jyk7XG5cbiAgICAvLyBJcyB0aGUgYWRibG9ja2VyIGluaXRpYWxpemVkXG4gICAgdGhpcy5pbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgaW5pdENhY2hlKCkge1xuICAgIC8vIFRvIG1ha2Ugc3VyZSB3ZSBkb24ndCBicmVhayBhbnkgZmlsdGVyIGJlaGF2aW9yLCBlYWNoIGtleSBpbiB0aGUgTFJVXG4gICAgLy8gY2FjaGUgaXMgbWFkZSB1cCBvZiB7IHNvdXJjZSBnZW5lcmFsIGRvbWFpbiB9ICsgeyB1cmwgfS5cbiAgICAvLyBUaGlzIGlzIGJlY2F1c2Ugc29tZSBmaWx0ZXJzIHdpbGwgYmVoYXZlIGRpZmZlcmVudGx5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGRvbWFpbiBvZiB0aGUgc291cmNlLlxuXG4gICAgLy8gQ2FjaGUgcXVlcmllcyB0byBGaWx0ZXJFbmdpbmVcbiAgICB0aGlzLmNhY2hlID0gbmV3IExSVUNhY2hlKFxuICAgICAgdGhpcy5lbmdpbmUubWF0Y2guYmluZCh0aGlzLmVuZ2luZSksICAgICAgLy8gQ29tcHV0ZSByZXN1bHRcbiAgICAgIDEwMDAsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1heGltdW0gbnVtYmVyIG9mIGVudHJpZXNcbiAgICAgIHJlcXVlc3QgPT4gcmVxdWVzdC5zb3VyY2VHRCArIHJlcXVlc3QudXJsIC8vIFNlbGVjdCBrZXlcbiAgICApO1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgICB0aGlzLmluaXRDYWNoZSgpO1xuICAgIHRoaXMubGlzdHNNYW5hZ2VyLmxvYWQoKTtcbiAgICB0aGlzLmJsYWNrbGlzdFBlcnNpc3QubG9hZCgpLnRoZW4odmFsdWUgPT4ge1xuICAgICAgLy8gU2V0IHZhbHVlXG4gICAgICBpZiAodmFsdWUudXJscyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuYmxhY2tsaXN0ID0gbmV3IFNldCh2YWx1ZS51cmxzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgfVxuXG4gIHBlcnNpc3RCbGFja2xpc3QoKSB7XG4gICAgdGhpcy5ibGFja2xpc3RQZXJzaXN0LnNldFZhbHVlKHsgdXJsczogWy4uLnRoaXMuYmxhY2tsaXN0LnZhbHVlcygpXSB9KTtcbiAgfVxuXG4gIGFkZFRvQmxhY2tsaXN0KHVybCkge1xuICAgIHRoaXMuYmxhY2tsaXN0LmFkZCh1cmwpO1xuICAgIHRoaXMucGVyc2lzdEJsYWNrbGlzdCgpO1xuICB9XG5cbiAgcmVtb3ZlRnJvbUJsYWNrbGlzdCh1cmwpIHtcbiAgICB0aGlzLmJsYWNrbGlzdC5kZWxldGUodXJsKTtcbiAgICB0aGlzLnBlcnNpc3RCbGFja2xpc3QoKTtcbiAgfVxuXG4gIGlzSW5CbGFja2xpc3QocmVxdWVzdCkge1xuICAgIHJldHVybiAodGhpcy5ibGFja2xpc3QuaGFzKHJlcXVlc3Quc291cmNlVVJMKSB8fFxuICAgICAgICAgICAgdGhpcy5ibGFja2xpc3QuaGFzKHJlcXVlc3Quc291cmNlR0QpKTtcbiAgfVxuXG4gIGlzRG9tYWluSW5CbGFja2xpc3QodXJsKSB7XG4gICAgLy8gU2hvdWxkIGFsbCB0aGlzIGRvbWFpbiBzdHVmZiBiZSBleHRyYWN0ZWQgaW50byBhIGZ1bmN0aW9uP1xuICAgIC8vIFdoeSBpcyBDbGlxelV0aWxzLmRldERldGFpbHNGcm9tVXJsIG5vdCB1c2VkP1xuICAgIGNvbnN0IHVybFBhcnRzID0gVVJMSW5mby5nZXQodXJsKTtcbiAgICBsZXQgaG9zdG5hbWUgPSB1cmxQYXJ0cy5ob3N0bmFtZTtcbiAgICBpZiAoaG9zdG5hbWUuc3RhcnRzV2l0aCgnd3d3LicpKSB7XG4gICAgICBob3N0bmFtZSA9IGhvc3RuYW1lLnN1YnN0cmluZyg0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ibGFja2xpc3QuaGFzKGhvc3RuYW1lKTtcbiAgfVxuXG4gIGlzVXJsSW5CbGFja2xpc3QodXJsKSB7XG4gICAgcmV0dXJuIHRoaXMuYmxhY2tsaXN0Lmhhcyh1cmwpO1xuICB9XG5cbiAgbG9nQWN0aW9uSFcodXJsLCBhY3Rpb24sIGRvbWFpbikge1xuICAgIGxldCB0eXBlID0gJ3VybCc7XG4gICAgaWYgKGRvbWFpbikge1xuICAgICAgdHlwZSA9ICdkb21haW4nO1xuICAgIH1cbiAgICBpZiAoIUNsaXF6SHVtYW5XZWIuc3RhdGUudlt1cmxdLmFkYmxvY2tlcl9ibGFja2xpc3QpIHtcbiAgICAgIENsaXF6SHVtYW5XZWIuc3RhdGUudlt1cmxdLmFkYmxvY2tlcl9ibGFja2xpc3QgPSB7fTtcbiAgICB9XG4gICAgQ2xpcXpIdW1hbldlYi5zdGF0ZS52W3VybF0uYWRibG9ja2VyX2JsYWNrbGlzdFthY3Rpb25dID0gdHlwZTtcbiAgfVxuXG4gIHRvZ2dsZVVybCh1cmwsIGRvbWFpbikge1xuICAgIGxldCBwcm9jZXNzZWRVUkwgPSB1cmw7XG4gICAgaWYgKGRvbWFpbikge1xuICAgICAgLy8gU2hvdWxkIGFsbCB0aGlzIGRvbWFpbiBzdHVmZiBiZSBleHRyYWN0ZWQgaW50byBhIGZ1bmN0aW9uP1xuICAgICAgLy8gV2h5IGlzIENsaXF6VXRpbHMuZ2V0RGV0YWlsc0Zyb21Vcmwgbm90IHVzZWQ/XG4gICAgICBwcm9jZXNzZWRVUkwgPSBVUkxJbmZvLmdldCh1cmwpLmhvc3RuYW1lO1xuICAgICAgaWYgKHByb2Nlc3NlZFVSTC5zdGFydHNXaXRoKCd3d3cuJykpIHtcbiAgICAgICAgcHJvY2Vzc2VkVVJMID0gcHJvY2Vzc2VkVVJMLnN1YnN0cmluZyg0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleGlzdEhXID0gQ2xpcXpIdW1hbldlYiAmJiBDbGlxekh1bWFuV2ViLnN0YXRlLnZbdXJsXTtcbiAgICBpZiAodGhpcy5ibGFja2xpc3QuaGFzKHByb2Nlc3NlZFVSTCkpIHtcbiAgICAgIHRoaXMuYmxhY2tsaXN0LmRlbGV0ZShwcm9jZXNzZWRVUkwpO1xuICAgICAgLy8gVE9ETzogSXQncyBiZXR0ZXIgdG8gaGF2ZSBhbiBBUEkgZnJvbSBodW1hbndlYiB0byBpbmRpY2F0ZSBpZiBhIHVybCBpcyBwcml2YXRlXG4gICAgICBpZiAoZXhpc3RIVykge1xuICAgICAgICB0aGlzLmxvZ0FjdGlvbkhXKHVybCwgJ3JlbW92ZScsIGRvbWFpbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYmxhY2tsaXN0LmFkZChwcm9jZXNzZWRVUkwpO1xuICAgICAgaWYgKGV4aXN0SFcpIHtcbiAgICAgICAgdGhpcy5sb2dBY3Rpb25IVyh1cmwsICdhZGQnLCBkb21haW4pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucGVyc2lzdEJsYWNrbGlzdCgpO1xuICB9XG5cbiAgLyogQHBhcmFtIHt3ZWJyZXF1ZXN0LWNvbnRleHR9IGh0dHBDb250ZXh0IC0gQ29udGV4dCBvZiB0aGUgcmVxdWVzdFxuICAgKi9cbiAgbWF0Y2goaHR0cENvbnRleHQpIHtcbiAgICAvLyBDaGVjayBpZiB0aGUgYWRibG9ja2VyIGlzIGluaXRpYWxpemVkXG4gICAgaWYgKCF0aGlzLmluaXRpYWxpemVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gUHJvY2VzcyBlbmRwb2ludCBVUkxcbiAgICBjb25zdCB1cmwgPSBodHRwQ29udGV4dC51cmwudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCB1cmxQYXJ0cyA9IFVSTEluZm8uZ2V0KHVybCk7XG4gICAgbGV0IGhvc3RuYW1lID0gdXJsUGFydHMuaG9zdG5hbWU7XG4gICAgaWYgKGhvc3RuYW1lLnN0YXJ0c1dpdGgoJ3d3dy4nKSkge1xuICAgICAgaG9zdG5hbWUgPSBob3N0bmFtZS5zdWJzdHJpbmcoNCk7XG4gICAgfVxuICAgIGNvbnN0IGhvc3RHRCA9IGdldEdlbmVyYWxEb21haW4oaG9zdG5hbWUpO1xuXG4gICAgLy8gUHJvY2VzcyBzb3VyY2UgdXJsXG4gICAgY29uc3Qgc291cmNlVVJMID0gaHR0cENvbnRleHQuZ2V0U291cmNlVVJMKCkudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCBzb3VyY2VQYXJ0cyA9IFVSTEluZm8uZ2V0KHNvdXJjZVVSTCk7XG4gICAgbGV0IHNvdXJjZUhvc3RuYW1lID0gc291cmNlUGFydHMuaG9zdG5hbWU7XG4gICAgaWYgKHNvdXJjZUhvc3RuYW1lLnN0YXJ0c1dpdGgoJ3d3dy4nKSkge1xuICAgICAgc291cmNlSG9zdG5hbWUgPSBzb3VyY2VIb3N0bmFtZS5zdWJzdHJpbmcoNCk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUdEID0gZ2V0R2VuZXJhbERvbWFpbihzb3VyY2VIb3N0bmFtZSk7XG5cbiAgICAvLyBXcmFwIGluZm9ybWF0aW9ucyBuZWVkZWQgdG8gbWF0Y2ggdGhlIHJlcXVlc3RcbiAgICBjb25zdCByZXF1ZXN0ID0ge1xuICAgICAgLy8gUmVxdWVzdFxuICAgICAgdXJsLFxuICAgICAgY3B0OiBodHRwQ29udGV4dC5nZXRDb250ZW50UG9saWN5VHlwZSgpLFxuICAgICAgLy8gU291cmNlXG4gICAgICBzb3VyY2VVUkwsXG4gICAgICBzb3VyY2VIb3N0bmFtZSxcbiAgICAgIHNvdXJjZUdELFxuICAgICAgLy8gRW5kcG9pbnRcbiAgICAgIGhvc3RuYW1lLFxuICAgICAgaG9zdEdELFxuICAgIH07XG5cbiAgICBsb2coYG1hdGNoICR7SlNPTi5zdHJpbmdpZnkocmVxdWVzdCl9YCk7XG5cbiAgICBjb25zdCB0MCA9IERhdGUubm93KCk7XG4gICAgY29uc3QgaXNBZCA9IHRoaXMuaXNJbkJsYWNrbGlzdChyZXF1ZXN0KSA/IGZhbHNlIDogdGhpcy5jYWNoZS5nZXQocmVxdWVzdCk7XG4gICAgY29uc3QgdG90YWxUaW1lID0gRGF0ZS5ub3coKSAtIHQwO1xuXG4gICAgbG9nKGBCTE9DSyBBRCAke0pTT04uc3RyaW5naWZ5KHtcbiAgICAgIHRpbWVBZEZpbHRlcjogdG90YWxUaW1lLFxuICAgICAgaXNBZEZpbHRlcjogaXNBZCxcbiAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgdXJsOiBodHRwQ29udGV4dC51cmwsXG4gICAgICAgIHNvdXJjZTogaHR0cENvbnRleHQuZ2V0U291cmNlVVJMKCksXG4gICAgICAgIGNwdDogaHR0cENvbnRleHQuZ2V0Q29udGVudFBvbGljeVR5cGUoKSxcbiAgICAgICAgbWV0aG9kOiBodHRwQ29udGV4dC5tZXRob2QsXG4gICAgICB9LFxuICAgIH0pfWApO1xuXG4gICAgcmV0dXJuIGlzQWQ7XG4gIH1cbn1cblxuY29uc3QgQ2xpcXpBREIgPSB7XG4gIGFkYmxvY2tJbml0aWFsaXplZDogZmFsc2UsXG4gIGFkYk1lbToge30sXG4gIGFkYlN0YXRzOiB7IHBhZ2VzOiB7fSB9LFxuICBtdXRhdGlvbkxvZ2dlcjogbnVsbCxcbiAgYWRiRGVidWc6IGZhbHNlLFxuICBNSU5fQlJPV1NFUl9WRVJTSU9OOiAzNSxcbiAgdGltZXJzOiBbXSxcblxuICBpbml0KCkge1xuICAgIC8vIFNldCBgY2xpcXotYWRiYCBkZWZhdWx0IHRvICdEaXNhYmxlZCdcbiAgICBpZiAoQ2xpcXpVdGlscy5nZXRQcmVmKEFEQl9QUkVGLCB1bmRlZmluZWQpID09PSB1bmRlZmluZWQpIHtcbiAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihBREJfUFJFRiwgQURCX1BSRUZfVkFMVUVTLkRpc2FibGVkKTtcbiAgICB9XG5cbiAgICBDbGlxekFEQi5hZEJsb2NrZXIgPSBuZXcgQWRCbG9ja2VyKCk7XG5cbiAgICBjb25zdCBpbml0QWRCbG9ja2VyID0gKCkgPT4ge1xuICAgICAgLy9Db250ZW50UG9saWN5LmluaXQoKTtcbiAgICAgIC8vQ2xpcXpBREIuY3AgPSBDb250ZW50UG9saWN5O1xuICAgICAgLy9DbGlxekFEQi5tdXRhdGlvbkxvZ2dlciA9IG5ldyBNdXRhdGlvbkxvZ2dlcigpO1xuICAgICAgQ2xpcXpBREIuYWRCbG9ja2VyLmluaXQoKTtcbiAgICAgIENsaXF6QURCLmFkYmxvY2tJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICBDbGlxekFEQi5pbml0UGFjZW1ha2VyKCk7XG4gICAgICBXZWJSZXF1ZXN0Lm9uQmVmb3JlUmVxdWVzdC5hZGRMaXN0ZW5lcihcbiAgICAgICAgQ2xpcXpBREIuaHR0cG9wZW5PYnNlcnZlci5vYnNlcnZlLFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIFsnYmxvY2tpbmcnXVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgaWYgKGFkYkVuYWJsZWQoKSkge1xuICAgICAgaW5pdEFkQmxvY2tlcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBldmVudHMuc3ViKCdwcmVmY2hhbmdlJywgcHJlZiA9PiB7XG4gICAgICAgIGlmIChwcmVmID09PSBBREJfUFJFRiAmJlxuICAgICAgICAgICAgIUNsaXF6QURCLmFkYmxvY2tJbml0aWFsaXplZCAmJlxuICAgICAgICAgICAgYWRiRW5hYmxlZCgpKSB7XG4gICAgICAgICAgaW5pdEFkQmxvY2tlcigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgdW5sb2FkKCkge1xuICAgIENsaXF6QURCLnVubG9hZFBhY2VtYWtlcigpO1xuICAgIGJyb3dzZXIuZm9yRWFjaFdpbmRvdyhDbGlxekFEQi51bmxvYWRXaW5kb3cpO1xuICAgIFdlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0LnJlbW92ZUxpc3RlbmVyKENsaXF6QURCLmh0dHBvcGVuT2JzZXJ2ZXIub2JzZXJ2ZSk7XG4gICAgQ29udGVudFBvbGljeS51bmxvYWQoKTtcbiAgfSxcblxuICBpbml0V2luZG93KHdpbmRvdykge1xuICAgIGlmIChDbGlxekFEQi5tdXRhdGlvbkxvZ2dlciAhPT0gbnVsbCkge1xuICAgICAgd2luZG93LmdCcm93c2VyLmFkZFByb2dyZXNzTGlzdGVuZXIoQ2xpcXpBREIubXV0YXRpb25Mb2dnZXIpO1xuICAgIH1cbiAgfSxcblxuICB1bmxvYWRXaW5kb3cod2luZG93KSB7XG4gICAgaWYgKHdpbmRvdy5nQnJvd3NlciAmJiBDbGlxekFEQi5tdXRhdGlvbkxvZ2dlciAhPT0gbnVsbCkge1xuICAgICAgd2luZG93LmdCcm93c2VyLnJlbW92ZVByb2dyZXNzTGlzdGVuZXIoQ2xpcXpBREIubXV0YXRpb25Mb2dnZXIpO1xuICAgIH1cbiAgfSxcblxuICBpbml0UGFjZW1ha2VyKCkge1xuICAgIGNvbnN0IHQxID0gdXRpbHMuc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoQ2xpcXpBREIuYWRiU3RhdHMucGFnZXMpLmZvckVhY2godXJsID0+IHtcbiAgICAgICAgaWYgKCFDbGlxekFEQi5pc1RhYlVSTFt1cmxdKSB7XG4gICAgICAgICAgZGVsZXRlIENsaXF6QURCLmFkYlN0YXRzLnBhZ2VzW3VybF07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sIDEwICogNjAgKiAxMDAwKTtcbiAgICBDbGlxekFEQi50aW1lcnMucHVzaCh0MSk7XG5cbiAgICBjb25zdCB0MiA9IHV0aWxzLnNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICghQ2xpcXpBREIuY2FjaGVBREIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgT2JqZWN0LmtleXMoQ2xpcXpBREIuY2FjaGVBREIpLmZvckVhY2godCA9PiB7XG4gICAgICAgIGlmICghYnJvd3Nlci5pc1dpbmRvd0FjdGl2ZSh0KSkge1xuICAgICAgICAgIGRlbGV0ZSBDbGlxekFEQi5jYWNoZUFEQlt0XTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSwgMTAgKiA2MCAqIDEwMDApO1xuICAgIENsaXF6QURCLnRpbWVycy5wdXNoKHQyKTtcbiAgfSxcblxuICB1bmxvYWRQYWNlbWFrZXIoKSB7XG4gICAgQ2xpcXpBREIudGltZXJzLmZvckVhY2godXRpbHMuY2xlYXJUaW1lb3V0KTtcbiAgfSxcblxuICBodHRwb3Blbk9ic2VydmVyOiB7XG4gICAgb2JzZXJ2ZShyZXF1ZXN0RGV0YWlscykge1xuICAgICAgaWYgKCFhZGJFbmFibGVkKCkpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXF1ZXN0Q29udGV4dCA9IG5ldyBIdHRwUmVxdWVzdENvbnRleHQocmVxdWVzdERldGFpbHMpO1xuICAgICAgY29uc3QgdXJsID0gcmVxdWVzdENvbnRleHQudXJsO1xuXG4gICAgICBpZiAoIXVybCkge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHVybFBhcnRzID0gVVJMSW5mby5nZXQodXJsKTtcblxuICAgICAgaWYgKHJlcXVlc3RDb250ZXh0LmlzRnVsbFBhZ2UoKSkge1xuICAgICAgICBDbGlxekFEQi5hZGJTdGF0cy5wYWdlc1t1cmxdID0gMDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc291cmNlVXJsID0gcmVxdWVzdENvbnRleHQuZ2V0TG9hZGluZ0RvY3VtZW50KCk7XG4gICAgICBsZXQgc291cmNlVXJsUGFydHMgPSBudWxsO1xuICAgICAgY29uc3Qgc291cmNlVGFiID0gcmVxdWVzdENvbnRleHQuZ2V0T3JpZ2luV2luZG93SUQoKTtcblxuICAgICAgaWYgKCFzb3VyY2VVcmwgfHwgc291cmNlVXJsLnN0YXJ0c1dpdGgoJ2Fib3V0OicpKSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cblxuICAgICAgc291cmNlVXJsUGFydHMgPSBVUkxJbmZvLmdldChzb3VyY2VVcmwpO1xuXG4gICAgICAvLyBzYW1lIGdlbmVyYWwgZG9tYWluXG4gICAgICBjb25zdCBzYW1lR2QgPSBzYW1lR2VuZXJhbERvbWFpbih1cmxQYXJ0cy5ob3N0bmFtZSwgc291cmNlVXJsUGFydHMuaG9zdG5hbWUpIHx8IGZhbHNlO1xuICAgICAgaWYgKHNhbWVHZCkge1xuICAgICAgICBjb25zdCB3T3JpID0gcmVxdWVzdENvbnRleHQuZ2V0T3JpZ2luV2luZG93SUQoKTtcbiAgICAgICAgY29uc3Qgd091dCA9IHJlcXVlc3RDb250ZXh0LmdldE91dGVyV2luZG93SUQoKTtcbiAgICAgICAgaWYgKHdPcmkgIT09IHdPdXQpIHsgLy8gcmVxdWVzdCBmcm9tIGlmcmFtZVxuICAgICAgICAgIC8vIGNvbnN0IHdtID0gQ29tcG9uZW50cy5jbGFzc2VzWydAbW96aWxsYS5vcmcvYXBwc2hlbGwvd2luZG93LW1lZGlhdG9yOzEnXVxuICAgICAgICAgIC8vICAgLmdldFNlcnZpY2UoQ29tcG9uZW50cy5pbnRlcmZhY2VzLm5zSVdpbmRvd01lZGlhdG9yKTtcbiAgICAgICAgICAvLyBjb25zdCBmcmFtZSA9IHdtLmdldE91dGVyV2luZG93V2l0aElkKHdPdXQpLmZyYW1lRWxlbWVudDtcblxuICAgICAgICAgIC8vIGlmIChhZGJFbmFibGVkKCkgJiYgQ2xpcXpBREIuYWRCbG9ja2VyLm1hdGNoKHJlcXVlc3RDb250ZXh0KSkge1xuICAgICAgICAgIC8vICAgZnJhbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJzsgIC8vIGhpZGUgdGhpcyBub2RlXG4gICAgICAgICAgLy8gICBDbGlxekFEQi5hZGJTdGF0cy5wYWdlc1tzb3VyY2VVcmxdID0gKENsaXF6QURCLmFkYlN0YXRzLnBhZ2VzW3NvdXJjZVVybF0gfHwgMCkgKyAxO1xuXG4gICAgICAgICAgLy8gICBmcmFtZS5zZXRBdHRyaWJ1dGUoJ2NsaXF6LWFkYicsIGBzb3VyY2U6ICR7dXJsfWApO1xuICAgICAgICAgIC8vICAgcmV0dXJuIHsgY2FuY2VsOiB0cnVlIH07XG4gICAgICAgICAgLy8gfVxuICAgICAgICAgIC8vZnJhbWUuc2V0QXR0cmlidXRlKCdjbGlxei1hZGJsb2NrZXInLCAnc2FmZScpO1xuICAgICAgICAgIGlmIChhZGJFbmFibGVkKCkgJiYgQ2xpcXpBREIuYWRCbG9ja2VyLm1hdGNoKHJlcXVlc3RDb250ZXh0KSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgY2FuY2VsOiB0cnVlIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH0gZWxzZSBpZiAoYWRiRW5hYmxlZCgpKSB7XG4gICAgICAgIGNvbnN0IHRwTG9nID0gcmVxdWVzdEFjdGlvbkxvZ2dlci5nZXQodXJsLCB1cmxQYXJ0cywgc291cmNlVXJsLCBzb3VyY2VVcmxQYXJ0cywgc291cmNlVGFiKTtcbiAgICAgICAgaWYgKENsaXF6QURCLm11dGF0aW9uTG9nZ2VyICYmIENsaXF6QURCLm11dGF0aW9uTG9nZ2VyLnRhYnNJbmZvW3NvdXJjZVRhYl0gJiZcbiAgICAgICAgICAgICFDbGlxekFEQi5tdXRhdGlvbkxvZ2dlci50YWJzSW5mb1tzb3VyY2VUYWJdLm9ic2VydmVyQWRkZWQpIHtcbiAgICAgICAgICBDbGlxekFEQi5tdXRhdGlvbkxvZ2dlci5hZGRNdXRhdGlvbk9ic2VydmVyKHNvdXJjZVRhYik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKENsaXF6QURCLmFkQmxvY2tlci5tYXRjaChyZXF1ZXN0Q29udGV4dCkpIHtcbiAgICAgICAgICByZXF1ZXN0QWN0aW9uTG9nZ2VyLmluY3JlbWVudFN0YXQodHBMb2csICdhZGJsb2NrX2Jsb2NrJyk7XG4gICAgICAgICAgLy9oaWRlTm9kZXMocmVxdWVzdENvbnRleHQpO1xuICAgICAgICAgIHJldHVybiB7IGNhbmNlbDogdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9LFxuICB9LFxuICBnZXRCcm93c2VyTWFqb3JWZXJzaW9uKCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhcHBJbmZvID0gQ29tcG9uZW50cy5jbGFzc2VzWydAbW96aWxsYS5vcmcveHJlL2FwcC1pbmZvOzEnXVxuICAgICAgICAgICAgICAgICAgICAgIC5nZXRTZXJ2aWNlKENvbXBvbmVudHMuaW50ZXJmYWNlcy5uc0lYVUxBcHBJbmZvKTtcbiAgICAgIHJldHVybiBwYXJzZUludChhcHBJbmZvLnZlcnNpb24uc3BsaXQoJy4nKVswXSwgMTApO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmV0dXJuIDEwMDtcbiAgICB9XG4gIH0sXG4gIGlzVGFiVVJMKHVybCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB3bSA9IENvbXBvbmVudHMuY2xhc3Nlc1snQG1vemlsbGEub3JnL2FwcHNoZWxsL3dpbmRvdy1tZWRpYXRvcjsxJ11cbiAgICAgICAgICAgICAgICAuZ2V0U2VydmljZShDb21wb25lbnRzLmludGVyZmFjZXMubnNJV2luZG93TWVkaWF0b3IpO1xuICAgICAgY29uc3QgYnJvd3NlckVudW1lcmF0b3IgPSB3bS5nZXRFbnVtZXJhdG9yKCduYXZpZ2F0b3I6YnJvd3NlcicpO1xuXG4gICAgICB3aGlsZSAoYnJvd3NlckVudW1lcmF0b3IuaGFzTW9yZUVsZW1lbnRzKCkpIHtcbiAgICAgICAgY29uc3QgYnJvd3NlcldpbiA9IGJyb3dzZXJFbnVtZXJhdG9yLmdldE5leHQoKTtcbiAgICAgICAgY29uc3QgdGFiYnJvd3NlciA9IGJyb3dzZXJXaW4uZ0Jyb3dzZXI7XG5cbiAgICAgICAgY29uc3QgbnVtVGFicyA9IHRhYmJyb3dzZXIuYnJvd3NlcnMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbnVtVGFiczsgaW5kZXgrKykge1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRCcm93c2VyID0gdGFiYnJvd3Nlci5nZXRCcm93c2VyQXRJbmRleChpbmRleCk7XG4gICAgICAgICAgaWYgKGN1cnJlbnRCcm93c2VyKSB7XG4gICAgICAgICAgICBjb25zdCB0YWJVUkwgPSBjdXJyZW50QnJvd3Nlci5jdXJyZW50VVJJLnNwZWM7XG4gICAgICAgICAgICBpZiAodXJsID09PSB0YWJVUkwgfHwgdXJsID09PSB0YWJVUkwuc3BsaXQoJyMnKVswXSkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBDbGlxekFEQjtcbiJdfQ==