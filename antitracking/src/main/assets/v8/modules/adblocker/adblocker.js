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
            WebRequest.onBeforeRequest.addListener(CliqzADB.httpopenObserver.observe, undefined, ['blocking']);
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
                var tpLog = requestActionLogger.get(url, urlParts, sourceUrl, sourceUrlParts, sourceTab);
                if (adbEnabled() && CliqzADB.adBlocker.match(requestContext)) {
                  requestActionLogger.incrementStat(tpLog, 'adblock_block');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9hZGJsb2NrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7bU1BdUJhLE9BQU8sRUFHUCxRQUFRLEVBQ1IsZUFBZSxFQUNmLGVBQWUsRUFLZixpQkFBaUIsRUEwQnhCLFNBQVMsRUFzTFQsUUFBUTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTdNUCxXQUFTLFlBQVksR0FBRztBQUM3QixXQUFPLElBQUksQ0FBQztHQUNiOztBQUdNLFdBQVMsZ0JBQWdCLEdBQUc7QUFDakMsV0FBTyxVQUFVLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztHQUNuRDs7QUFHTSxXQUFTLFVBQVUsR0FBRzs7Ozs7QUFLM0IsV0FBTyxnQkFBZ0IsRUFBRSxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDM0Y7Ozs7eUJBcERRLEtBQUs7MEJBQUUsTUFBTTs7OztpQ0FHYixPQUFPOzs2Q0FDUCxnQkFBZ0I7OENBQUUsaUJBQWlCOzs7OzBEQUduQyxvQkFBb0I7Ozs7Ozs0QkFJcEIsR0FBRzs7Ozs7Ozs7O0FBWUMsYUFBTyxHQUFHLElBQUk7Ozs7O0FBR2QsY0FBUSxHQUFHLFdBQVc7Ozs7QUFDdEIscUJBQWUsR0FBRyxrQkFBa0I7Ozs7QUFDcEMscUJBQWUsR0FBRztBQUM3QixpQkFBUyxFQUFFLENBQUM7QUFDWixlQUFPLEVBQUUsQ0FBQztBQUNWLGdCQUFRLEVBQUUsQ0FBQztPQUNaOzs7O0FBQ1ksdUJBQWlCLEdBQUcsZUFBZSxDQUFDLFFBQVE7Ozs7QUEwQm5ELGVBQVM7QUFDRixpQkFEUCxTQUFTLEdBQ0M7OztnQ0FEVixTQUFTOztBQUVYLGNBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQzs7QUFFakMsY0FBSSxDQUFDLFlBQVksR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO0FBQ3hDLGNBQUksQ0FBQyxZQUFZ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QUUsRUFBRTtBQUMxQyxrQkFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDL0Msa0JBQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUM7O0FBRXZDLGtCQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztBQUMzQyxtQkFBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRTtBQUM1QyxvQkFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNELG9CQUFJLGNBQWMsRUFBRTtBQUNsQixzQkFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7QUFDOUMsc0JBQUksR0FBRyxLQUFLLE1BQU0sSUFBSSxHQUFHLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNsRCwyQkFBTyxJQUFJLENBQUM7bUJBQ2I7aUJBQ0Y7ZUFDRjthQUNGO0FBQ0QsbUJBQU8sS0FBSyxDQUFDO1dBQ2QsQ0FBQyxPQUFNLENBQUMsRUFBRTtBQUNULG1CQUFPLEtBQUssQ0FBQztXQUNkO1NBQ0Y7T0FDRjs7eUJBRWMsUUFBUSIsImZpbGUiOiJhZGJsb2NrZXIvYWRibG9ja2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXRpbHMsIGV2ZW50cyB9IGZyb20gJ2NvcmUvY2xpcXonO1xuaW1wb3J0IFdlYlJlcXVlc3QgZnJvbSAnY29yZS93ZWJyZXF1ZXN0JztcblxuaW1wb3J0IHsgVVJMSW5mbyB9IGZyb20gJ2FudGl0cmFja2luZy91cmwnO1xuaW1wb3J0IHsgZ2V0R2VuZXJhbERvbWFpbiwgc2FtZUdlbmVyYWxEb21haW4gfSBmcm9tICdhbnRpdHJhY2tpbmcvZG9tYWluJztcbmltcG9ydCAqIGFzIGJyb3dzZXIgZnJvbSAncGxhdGZvcm0vYnJvd3Nlcic7XG5cbmltcG9ydCB7IExhenlQZXJzaXN0ZW50T2JqZWN0IH0gZnJvbSAnYW50aXRyYWNraW5nL3BlcnNpc3RlbnQtc3RhdGUnO1xuaW1wb3J0IExSVUNhY2hlIGZyb20gJ2FudGl0cmFja2luZy9maXhlZC1zaXplLWNhY2hlJztcbmltcG9ydCBIdHRwUmVxdWVzdENvbnRleHQgZnJvbSAnYW50aXRyYWNraW5nL3dlYnJlcXVlc3QtY29udGV4dCc7XG5cbmltcG9ydCB7IGxvZyB9IGZyb20gJ2FkYmxvY2tlci91dGlscyc7XG5pbXBvcnQgRmlsdGVyRW5naW5lIGZyb20gJ2FkYmxvY2tlci9maWx0ZXJzLWVuZ2luZSc7XG5pbXBvcnQgRmlsdGVyc0xvYWRlciBmcm9tICdhZGJsb2NrZXIvZmlsdGVycy1sb2FkZXInO1xuXG4vL2ltcG9ydCBDb250ZW50UG9saWN5IGZyb20gJ2FkYmxvY2tlci9jb250ZW50LXBvbGljeSc7XG4vL2ltcG9ydCB7IGhpZGVOb2RlcyB9IGZyb20gJ2FkYmxvY2tlci9jb3NtZXRpY3MnO1xuLy9pbXBvcnQgeyBNdXRhdGlvbkxvZ2dlciB9IGZyb20gJ2FkYmxvY2tlci9tdXRhdGlvbi1sb2dnZXInO1xuXG4vL2ltcG9ydCBDbGlxekh1bWFuV2ViIGZyb20gJ2h1bWFuLXdlYi9odW1hbi13ZWInO1xuaW1wb3J0IHJlcXVlc3RBY3Rpb25Mb2dnZXIgZnJvbSAnYW50aXRyYWNraW5nL3RwX2V2ZW50cyc7XG5cbi8vIGFkYiB2ZXJzaW9uXG5leHBvcnQgY29uc3QgQURCX1ZFUiA9IDAuMDE7XG5cbi8vIFByZWZlcmVuY2VzXG5leHBvcnQgY29uc3QgQURCX1BSRUYgPSAnY2xpcXotYWRiJztcbmV4cG9ydCBjb25zdCBBREJfQUJURVNUX1BSRUYgPSAnY2xpcXotYWRiLWFidGVzdCc7XG5leHBvcnQgY29uc3QgQURCX1BSRUZfVkFMVUVTID0ge1xuICBPcHRpbWl6ZWQ6IDIsXG4gIEVuYWJsZWQ6IDEsXG4gIERpc2FibGVkOiAwLFxufTtcbmV4cG9ydCBjb25zdCBBREJfREVGQVVMVF9WQUxVRSA9IEFEQl9QUkVGX1ZBTFVFUy5EaXNhYmxlZDtcblxuXG5leHBvcnQgZnVuY3Rpb24gYXV0b0Jsb2NrQWRzKCkge1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYWRiQUJUZXN0RW5hYmxlZCgpIHtcbiAgcmV0dXJuIENsaXF6VXRpbHMuZ2V0UHJlZihBREJfQUJURVNUX1BSRUYsIGZhbHNlKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYWRiRW5hYmxlZCgpIHtcbiAgLy8gVE9ETzogRGVhbCB3aXRoICdvcHRpbWl6ZWQnIG1vZGUuXG4gIC8vIDAgPSBEaXNhYmxlZFxuICAvLyAxID0gRW5hYmxlZFxuICAvLyAyID0gT3B0aW1pemVkXG4gIHJldHVybiBhZGJBQlRlc3RFbmFibGVkKCkgJiYgQ2xpcXpVdGlscy5nZXRQcmVmKEFEQl9QUkVGLCBBREJfUFJFRl9WQUxVRVMuRGlzYWJsZWQpICE9PSAwO1xufVxuXG5cbi8qIFdyYXBzIGZpbHRlci1iYXNlZCBhZGJsb2NraW5nIGluIGEgY2xhc3MuIEl0IGhhcyB0byBoYW5kbGUgYm90aFxuICogdGhlIG1hbmFnZW1lbnQgb2YgbGlzdHMgKGZldGNoaW5nLCB1cGRhdGluZykgdXNpbmcgYSBGaWx0ZXJzTG9hZGVyXG4gKiBhbmQgdGhlIG1hdGNoaW5nIHVzaW5nIGEgRmlsdGVyRW5naW5lLlxuICovXG5jbGFzcyBBZEJsb2NrZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmVuZ2luZSA9IG5ldyBGaWx0ZXJFbmdpbmUoKTtcblxuICAgIHRoaXMubGlzdHNNYW5hZ2VyID0gbmV3IEZpbHRlcnNMb2FkZXIoKTtcbiAgICB0aGlzLmxpc3RzTWFuYWdlci5vblVwZGF0ZSh1cGRhdGUgPT4ge1xuICAgICAgLy8gVXBkYXRlIGxpc3QgaW4gZW5naW5lXG4gICAgICBjb25zdCB7IGFzc2V0LCBmaWx0ZXJzIH0gPSB1cGRhdGU7XG4gICAgICB0aGlzLmVuZ2luZS5vblVwZGF0ZUZpbHRlcnMoYXNzZXQsIGZpbHRlcnMpO1xuXG4gICAgICB0aGlzLmluaXRDYWNoZSgpO1xuICAgIH0pO1xuXG4gICAgLy8gQmxhY2tsaXN0cyB0byBkaXNhYmxlIGFkYmxvY2tpbmcgb24gY2VydGFpbiBkb21haW5zL3VybHNcbiAgICB0aGlzLmJsYWNrbGlzdCA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLmJsYWNrbGlzdFBlcnNpc3QgPSBuZXcgTGF6eVBlcnNpc3RlbnRPYmplY3QoJ2FkYi1ibGFja2xpc3QnKTtcblxuICAgIC8vIElzIHRoZSBhZGJsb2NrZXIgaW5pdGlhbGl6ZWRcbiAgICB0aGlzLmluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICBpbml0Q2FjaGUoKSB7XG4gICAgLy8gVG8gbWFrZSBzdXJlIHdlIGRvbid0IGJyZWFrIGFueSBmaWx0ZXIgYmVoYXZpb3IsIGVhY2gga2V5IGluIHRoZSBMUlVcbiAgICAvLyBjYWNoZSBpcyBtYWRlIHVwIG9mIHsgc291cmNlIGdlbmVyYWwgZG9tYWluIH0gKyB7IHVybCB9LlxuICAgIC8vIFRoaXMgaXMgYmVjYXVzZSBzb21lIGZpbHRlcnMgd2lsbCBiZWhhdmUgZGlmZmVyZW50bHkgYmFzZWQgb24gdGhlXG4gICAgLy8gZG9tYWluIG9mIHRoZSBzb3VyY2UuXG5cbiAgICAvLyBDYWNoZSBxdWVyaWVzIHRvIEZpbHRlckVuZ2luZVxuICAgIHRoaXMuY2FjaGUgPSBuZXcgTFJVQ2FjaGUoXG4gICAgICB0aGlzLmVuZ2luZS5tYXRjaC5iaW5kKHRoaXMuZW5naW5lKSwgICAgICAvLyBDb21wdXRlIHJlc3VsdFxuICAgICAgMTAwMCwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWF4aW11bSBudW1iZXIgb2YgZW50cmllc1xuICAgICAgcmVxdWVzdCA9PiByZXF1ZXN0LnNvdXJjZUdEICsgcmVxdWVzdC51cmwgLy8gU2VsZWN0IGtleVxuICAgICk7XG4gIH1cblxuICBpbml0KCkge1xuICAgIHRoaXMuaW5pdENhY2hlKCk7XG4gICAgdGhpcy5saXN0c01hbmFnZXIubG9hZCgpO1xuICAgIHRoaXMuYmxhY2tsaXN0UGVyc2lzdC5sb2FkKCkudGhlbih2YWx1ZSA9PiB7XG4gICAgICAvLyBTZXQgdmFsdWVcbiAgICAgIGlmICh2YWx1ZS51cmxzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5ibGFja2xpc3QgPSBuZXcgU2V0KHZhbHVlLnVybHMpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9XG5cbiAgcGVyc2lzdEJsYWNrbGlzdCgpIHtcbiAgICB0aGlzLmJsYWNrbGlzdFBlcnNpc3Quc2V0VmFsdWUoeyB1cmxzOiBbLi4udGhpcy5ibGFja2xpc3QudmFsdWVzKCldIH0pO1xuICB9XG5cbiAgYWRkVG9CbGFja2xpc3QodXJsKSB7XG4gICAgdGhpcy5ibGFja2xpc3QuYWRkKHVybCk7XG4gICAgdGhpcy5wZXJzaXN0QmxhY2tsaXN0KCk7XG4gIH1cblxuICByZW1vdmVGcm9tQmxhY2tsaXN0KHVybCkge1xuICAgIHRoaXMuYmxhY2tsaXN0LmRlbGV0ZSh1cmwpO1xuICAgIHRoaXMucGVyc2lzdEJsYWNrbGlzdCgpO1xuICB9XG5cbiAgaXNJbkJsYWNrbGlzdChyZXF1ZXN0KSB7XG4gICAgcmV0dXJuICh0aGlzLmJsYWNrbGlzdC5oYXMocmVxdWVzdC5zb3VyY2VVUkwpIHx8XG4gICAgICAgICAgICB0aGlzLmJsYWNrbGlzdC5oYXMocmVxdWVzdC5zb3VyY2VHRCkpO1xuICB9XG5cbiAgaXNEb21haW5JbkJsYWNrbGlzdCh1cmwpIHtcbiAgICAvLyBTaG91bGQgYWxsIHRoaXMgZG9tYWluIHN0dWZmIGJlIGV4dHJhY3RlZCBpbnRvIGEgZnVuY3Rpb24/XG4gICAgLy8gV2h5IGlzIENsaXF6VXRpbHMuZGV0RGV0YWlsc0Zyb21Vcmwgbm90IHVzZWQ/XG4gICAgY29uc3QgdXJsUGFydHMgPSBVUkxJbmZvLmdldCh1cmwpO1xuICAgIGxldCBob3N0bmFtZSA9IHVybFBhcnRzLmhvc3RuYW1lO1xuICAgIGlmIChob3N0bmFtZS5zdGFydHNXaXRoKCd3d3cuJykpIHtcbiAgICAgIGhvc3RuYW1lID0gaG9zdG5hbWUuc3Vic3RyaW5nKDQpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmJsYWNrbGlzdC5oYXMoaG9zdG5hbWUpO1xuICB9XG5cbiAgaXNVcmxJbkJsYWNrbGlzdCh1cmwpIHtcbiAgICByZXR1cm4gdGhpcy5ibGFja2xpc3QuaGFzKHVybCk7XG4gIH1cblxuICBsb2dBY3Rpb25IVyh1cmwsIGFjdGlvbiwgZG9tYWluKSB7XG4gICAgbGV0IHR5cGUgPSAndXJsJztcbiAgICBpZiAoZG9tYWluKSB7XG4gICAgICB0eXBlID0gJ2RvbWFpbic7XG4gICAgfVxuICAgIGlmICghQ2xpcXpIdW1hbldlYi5zdGF0ZS52W3VybF0uYWRibG9ja2VyX2JsYWNrbGlzdCkge1xuICAgICAgQ2xpcXpIdW1hbldlYi5zdGF0ZS52W3VybF0uYWRibG9ja2VyX2JsYWNrbGlzdCA9IHt9O1xuICAgIH1cbiAgICBDbGlxekh1bWFuV2ViLnN0YXRlLnZbdXJsXS5hZGJsb2NrZXJfYmxhY2tsaXN0W2FjdGlvbl0gPSB0eXBlO1xuICB9XG5cbiAgdG9nZ2xlVXJsKHVybCwgZG9tYWluKSB7XG4gICAgbGV0IHByb2Nlc3NlZFVSTCA9IHVybDtcbiAgICBpZiAoZG9tYWluKSB7XG4gICAgICAvLyBTaG91bGQgYWxsIHRoaXMgZG9tYWluIHN0dWZmIGJlIGV4dHJhY3RlZCBpbnRvIGEgZnVuY3Rpb24/XG4gICAgICAvLyBXaHkgaXMgQ2xpcXpVdGlscy5nZXREZXRhaWxzRnJvbVVybCBub3QgdXNlZD9cbiAgICAgIHByb2Nlc3NlZFVSTCA9IFVSTEluZm8uZ2V0KHVybCkuaG9zdG5hbWU7XG4gICAgICBpZiAocHJvY2Vzc2VkVVJMLnN0YXJ0c1dpdGgoJ3d3dy4nKSkge1xuICAgICAgICBwcm9jZXNzZWRVUkwgPSBwcm9jZXNzZWRVUkwuc3Vic3RyaW5nKDQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGV4aXN0SFcgPSBDbGlxekh1bWFuV2ViICYmIENsaXF6SHVtYW5XZWIuc3RhdGUudlt1cmxdO1xuICAgIGlmICh0aGlzLmJsYWNrbGlzdC5oYXMocHJvY2Vzc2VkVVJMKSkge1xuICAgICAgdGhpcy5ibGFja2xpc3QuZGVsZXRlKHByb2Nlc3NlZFVSTCk7XG4gICAgICAvLyBUT0RPOiBJdCdzIGJldHRlciB0byBoYXZlIGFuIEFQSSBmcm9tIGh1bWFud2ViIHRvIGluZGljYXRlIGlmIGEgdXJsIGlzIHByaXZhdGVcbiAgICAgIGlmIChleGlzdEhXKSB7XG4gICAgICAgIHRoaXMubG9nQWN0aW9uSFcodXJsLCAncmVtb3ZlJywgZG9tYWluKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ibGFja2xpc3QuYWRkKHByb2Nlc3NlZFVSTCk7XG4gICAgICBpZiAoZXhpc3RIVykge1xuICAgICAgICB0aGlzLmxvZ0FjdGlvbkhXKHVybCwgJ2FkZCcsIGRvbWFpbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5wZXJzaXN0QmxhY2tsaXN0KCk7XG4gIH1cblxuICAvKiBAcGFyYW0ge3dlYnJlcXVlc3QtY29udGV4dH0gaHR0cENvbnRleHQgLSBDb250ZXh0IG9mIHRoZSByZXF1ZXN0XG4gICAqL1xuICBtYXRjaChodHRwQ29udGV4dCkge1xuICAgIC8vIENoZWNrIGlmIHRoZSBhZGJsb2NrZXIgaXMgaW5pdGlhbGl6ZWRcbiAgICBpZiAoIXRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBQcm9jZXNzIGVuZHBvaW50IFVSTFxuICAgIGNvbnN0IHVybCA9IGh0dHBDb250ZXh0LnVybC50b0xvd2VyQ2FzZSgpO1xuICAgIGNvbnN0IHVybFBhcnRzID0gVVJMSW5mby5nZXQodXJsKTtcbiAgICBsZXQgaG9zdG5hbWUgPSB1cmxQYXJ0cy5ob3N0bmFtZTtcbiAgICBpZiAoaG9zdG5hbWUuc3RhcnRzV2l0aCgnd3d3LicpKSB7XG4gICAgICBob3N0bmFtZSA9IGhvc3RuYW1lLnN1YnN0cmluZyg0KTtcbiAgICB9XG4gICAgY29uc3QgaG9zdEdEID0gZ2V0R2VuZXJhbERvbWFpbihob3N0bmFtZSk7XG5cbiAgICAvLyBQcm9jZXNzIHNvdXJjZSB1cmxcbiAgICBjb25zdCBzb3VyY2VVUkwgPSBodHRwQ29udGV4dC5nZXRTb3VyY2VVUkwoKS50b0xvd2VyQ2FzZSgpO1xuICAgIGNvbnN0IHNvdXJjZVBhcnRzID0gVVJMSW5mby5nZXQoc291cmNlVVJMKTtcbiAgICBsZXQgc291cmNlSG9zdG5hbWUgPSBzb3VyY2VQYXJ0cy5ob3N0bmFtZTtcbiAgICBpZiAoc291cmNlSG9zdG5hbWUuc3RhcnRzV2l0aCgnd3d3LicpKSB7XG4gICAgICBzb3VyY2VIb3N0bmFtZSA9IHNvdXJjZUhvc3RuYW1lLnN1YnN0cmluZyg0KTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlR0QgPSBnZXRHZW5lcmFsRG9tYWluKHNvdXJjZUhvc3RuYW1lKTtcblxuICAgIC8vIFdyYXAgaW5mb3JtYXRpb25zIG5lZWRlZCB0byBtYXRjaCB0aGUgcmVxdWVzdFxuICAgIGNvbnN0IHJlcXVlc3QgPSB7XG4gICAgICAvLyBSZXF1ZXN0XG4gICAgICB1cmwsXG4gICAgICBjcHQ6IGh0dHBDb250ZXh0LmdldENvbnRlbnRQb2xpY3lUeXBlKCksXG4gICAgICAvLyBTb3VyY2VcbiAgICAgIHNvdXJjZVVSTCxcbiAgICAgIHNvdXJjZUhvc3RuYW1lLFxuICAgICAgc291cmNlR0QsXG4gICAgICAvLyBFbmRwb2ludFxuICAgICAgaG9zdG5hbWUsXG4gICAgICBob3N0R0QsXG4gICAgfTtcblxuICAgIGxvZyhgbWF0Y2ggJHtKU09OLnN0cmluZ2lmeShyZXF1ZXN0KX1gKTtcblxuICAgIGNvbnN0IHQwID0gRGF0ZS5ub3coKTtcbiAgICBjb25zdCBpc0FkID0gdGhpcy5pc0luQmxhY2tsaXN0KHJlcXVlc3QpID8gZmFsc2UgOiB0aGlzLmNhY2hlLmdldChyZXF1ZXN0KTtcbiAgICBjb25zdCB0b3RhbFRpbWUgPSBEYXRlLm5vdygpIC0gdDA7XG5cbiAgICBsb2coYEJMT0NLIEFEICR7SlNPTi5zdHJpbmdpZnkoe1xuICAgICAgdGltZUFkRmlsdGVyOiB0b3RhbFRpbWUsXG4gICAgICBpc0FkRmlsdGVyOiBpc0FkLFxuICAgICAgY29udGV4dDoge1xuICAgICAgICB1cmw6IGh0dHBDb250ZXh0LnVybCxcbiAgICAgICAgc291cmNlOiBodHRwQ29udGV4dC5nZXRTb3VyY2VVUkwoKSxcbiAgICAgICAgY3B0OiBodHRwQ29udGV4dC5nZXRDb250ZW50UG9saWN5VHlwZSgpLFxuICAgICAgICBtZXRob2Q6IGh0dHBDb250ZXh0Lm1ldGhvZCxcbiAgICAgIH0sXG4gICAgfSl9YCk7XG5cbiAgICByZXR1cm4gaXNBZDtcbiAgfVxufVxuXG5jb25zdCBDbGlxekFEQiA9IHtcbiAgYWRibG9ja0luaXRpYWxpemVkOiBmYWxzZSxcbiAgYWRiTWVtOiB7fSxcbiAgYWRiU3RhdHM6IHsgcGFnZXM6IHt9IH0sXG4gIG11dGF0aW9uTG9nZ2VyOiBudWxsLFxuICBhZGJEZWJ1ZzogZmFsc2UsXG4gIE1JTl9CUk9XU0VSX1ZFUlNJT046IDM1LFxuICB0aW1lcnM6IFtdLFxuXG4gIGluaXQoKSB7XG4gICAgLy8gU2V0IGBjbGlxei1hZGJgIGRlZmF1bHQgdG8gJ0Rpc2FibGVkJ1xuICAgIGlmIChDbGlxelV0aWxzLmdldFByZWYoQURCX1BSRUYsIHVuZGVmaW5lZCkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKEFEQl9QUkVGLCBBREJfUFJFRl9WQUxVRVMuRGlzYWJsZWQpO1xuICAgIH1cblxuICAgIENsaXF6QURCLmFkQmxvY2tlciA9IG5ldyBBZEJsb2NrZXIoKTtcblxuICAgIGNvbnN0IGluaXRBZEJsb2NrZXIgPSAoKSA9PiB7XG4gICAgICAvL0NvbnRlbnRQb2xpY3kuaW5pdCgpO1xuICAgICAgLy9DbGlxekFEQi5jcCA9IENvbnRlbnRQb2xpY3k7XG4gICAgICAvL0NsaXF6QURCLm11dGF0aW9uTG9nZ2VyID0gbmV3IE11dGF0aW9uTG9nZ2VyKCk7XG4gICAgICBDbGlxekFEQi5hZEJsb2NrZXIuaW5pdCgpO1xuICAgICAgQ2xpcXpBREIuYWRibG9ja0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIENsaXF6QURCLmluaXRQYWNlbWFrZXIoKTtcbiAgICAgIFdlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0LmFkZExpc3RlbmVyKFxuICAgICAgICBDbGlxekFEQi5odHRwb3Blbk9ic2VydmVyLm9ic2VydmUsXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgWydibG9ja2luZyddXG4gICAgICApO1xuICAgIH07XG5cbiAgICBpZiAoYWRiRW5hYmxlZCgpKSB7XG4gICAgICBpbml0QWRCbG9ja2VyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV2ZW50cy5zdWIoJ3ByZWZjaGFuZ2UnLCBwcmVmID0+IHtcbiAgICAgICAgaWYgKHByZWYgPT09IEFEQl9QUkVGICYmXG4gICAgICAgICAgICAhQ2xpcXpBREIuYWRibG9ja0luaXRpYWxpemVkICYmXG4gICAgICAgICAgICBhZGJFbmFibGVkKCkpIHtcbiAgICAgICAgICBpbml0QWRCbG9ja2VyKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICB1bmxvYWQoKSB7XG4gICAgQ2xpcXpBREIudW5sb2FkUGFjZW1ha2VyKCk7XG4gICAgYnJvd3Nlci5mb3JFYWNoV2luZG93KENsaXF6QURCLnVubG9hZFdpbmRvdyk7XG4gICAgV2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QucmVtb3ZlTGlzdGVuZXIoQ2xpcXpBREIuaHR0cG9wZW5PYnNlcnZlci5vYnNlcnZlKTtcbiAgICBDb250ZW50UG9saWN5LnVubG9hZCgpO1xuICB9LFxuXG4gIGluaXRXaW5kb3cod2luZG93KSB7XG4gICAgaWYgKENsaXF6QURCLm11dGF0aW9uTG9nZ2VyICE9PSBudWxsKSB7XG4gICAgICB3aW5kb3cuZ0Jyb3dzZXIuYWRkUHJvZ3Jlc3NMaXN0ZW5lcihDbGlxekFEQi5tdXRhdGlvbkxvZ2dlcik7XG4gICAgfVxuICB9LFxuXG4gIHVubG9hZFdpbmRvdyh3aW5kb3cpIHtcbiAgICBpZiAod2luZG93LmdCcm93c2VyICYmIENsaXF6QURCLm11dGF0aW9uTG9nZ2VyICE9PSBudWxsKSB7XG4gICAgICB3aW5kb3cuZ0Jyb3dzZXIucmVtb3ZlUHJvZ3Jlc3NMaXN0ZW5lcihDbGlxekFEQi5tdXRhdGlvbkxvZ2dlcik7XG4gICAgfVxuICB9LFxuXG4gIGluaXRQYWNlbWFrZXIoKSB7XG4gICAgY29uc3QgdDEgPSB1dGlscy5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhDbGlxekFEQi5hZGJTdGF0cy5wYWdlcykuZm9yRWFjaCh1cmwgPT4ge1xuICAgICAgICBpZiAoIUNsaXF6QURCLmlzVGFiVVJMW3VybF0pIHtcbiAgICAgICAgICBkZWxldGUgQ2xpcXpBREIuYWRiU3RhdHMucGFnZXNbdXJsXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSwgMTAgKiA2MCAqIDEwMDApO1xuICAgIENsaXF6QURCLnRpbWVycy5wdXNoKHQxKTtcblxuICAgIGNvbnN0IHQyID0gdXRpbHMuc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKCFDbGlxekFEQi5jYWNoZUFEQikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBPYmplY3Qua2V5cyhDbGlxekFEQi5jYWNoZUFEQikuZm9yRWFjaCh0ID0+IHtcbiAgICAgICAgaWYgKCFicm93c2VyLmlzV2luZG93QWN0aXZlKHQpKSB7XG4gICAgICAgICAgZGVsZXRlIENsaXF6QURCLmNhY2hlQURCW3RdO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LCAxMCAqIDYwICogMTAwMCk7XG4gICAgQ2xpcXpBREIudGltZXJzLnB1c2godDIpO1xuICB9LFxuXG4gIHVubG9hZFBhY2VtYWtlcigpIHtcbiAgICBDbGlxekFEQi50aW1lcnMuZm9yRWFjaCh1dGlscy5jbGVhclRpbWVvdXQpO1xuICB9LFxuXG4gIGh0dHBvcGVuT2JzZXJ2ZXI6IHtcbiAgICBvYnNlcnZlKHJlcXVlc3REZXRhaWxzKSB7XG4gICAgICBpZiAoIWFkYkVuYWJsZWQoKSkge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlcXVlc3RDb250ZXh0ID0gbmV3IEh0dHBSZXF1ZXN0Q29udGV4dChyZXF1ZXN0RGV0YWlscyk7XG4gICAgICBjb25zdCB1cmwgPSByZXF1ZXN0Q29udGV4dC51cmw7XG5cbiAgICAgIGlmICghdXJsKSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdXJsUGFydHMgPSBVUkxJbmZvLmdldCh1cmwpO1xuXG4gICAgICBpZiAocmVxdWVzdENvbnRleHQuaXNGdWxsUGFnZSgpKSB7XG4gICAgICAgIENsaXF6QURCLmFkYlN0YXRzLnBhZ2VzW3VybF0gPSAwO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzb3VyY2VVcmwgPSByZXF1ZXN0Q29udGV4dC5nZXRMb2FkaW5nRG9jdW1lbnQoKTtcbiAgICAgIGxldCBzb3VyY2VVcmxQYXJ0cyA9IG51bGw7XG4gICAgICBjb25zdCBzb3VyY2VUYWIgPSByZXF1ZXN0Q29udGV4dC5nZXRPcmlnaW5XaW5kb3dJRCgpO1xuXG4gICAgICBpZiAoIXNvdXJjZVVybCB8fCBzb3VyY2VVcmwuc3RhcnRzV2l0aCgnYWJvdXQ6JykpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuXG4gICAgICBzb3VyY2VVcmxQYXJ0cyA9IFVSTEluZm8uZ2V0KHNvdXJjZVVybCk7XG5cbiAgICAgIC8vIHNhbWUgZ2VuZXJhbCBkb21haW5cbiAgICAgIGNvbnN0IHNhbWVHZCA9IHNhbWVHZW5lcmFsRG9tYWluKHVybFBhcnRzLmhvc3RuYW1lLCBzb3VyY2VVcmxQYXJ0cy5ob3N0bmFtZSkgfHwgZmFsc2U7XG4gICAgICBpZiAoc2FtZUdkKSB7XG4gICAgICAgIGNvbnN0IHdPcmkgPSByZXF1ZXN0Q29udGV4dC5nZXRPcmlnaW5XaW5kb3dJRCgpO1xuICAgICAgICBjb25zdCB3T3V0ID0gcmVxdWVzdENvbnRleHQuZ2V0T3V0ZXJXaW5kb3dJRCgpO1xuICAgICAgICBpZiAod09yaSAhPT0gd091dCkgeyAvLyByZXF1ZXN0IGZyb20gaWZyYW1lXG4gICAgICAgICAgLy8gY29uc3Qgd20gPSBDb21wb25lbnRzLmNsYXNzZXNbJ0Btb3ppbGxhLm9yZy9hcHBzaGVsbC93aW5kb3ctbWVkaWF0b3I7MSddXG4gICAgICAgICAgLy8gICAuZ2V0U2VydmljZShDb21wb25lbnRzLmludGVyZmFjZXMubnNJV2luZG93TWVkaWF0b3IpO1xuICAgICAgICAgIC8vIGNvbnN0IGZyYW1lID0gd20uZ2V0T3V0ZXJXaW5kb3dXaXRoSWQod091dCkuZnJhbWVFbGVtZW50O1xuXG4gICAgICAgICAgLy8gaWYgKGFkYkVuYWJsZWQoKSAmJiBDbGlxekFEQi5hZEJsb2NrZXIubWF0Y2gocmVxdWVzdENvbnRleHQpKSB7XG4gICAgICAgICAgLy8gICBmcmFtZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnOyAgLy8gaGlkZSB0aGlzIG5vZGVcbiAgICAgICAgICAvLyAgIENsaXF6QURCLmFkYlN0YXRzLnBhZ2VzW3NvdXJjZVVybF0gPSAoQ2xpcXpBREIuYWRiU3RhdHMucGFnZXNbc291cmNlVXJsXSB8fCAwKSArIDE7XG5cbiAgICAgICAgICAvLyAgIGZyYW1lLnNldEF0dHJpYnV0ZSgnY2xpcXotYWRiJywgYHNvdXJjZTogJHt1cmx9YCk7XG4gICAgICAgICAgLy8gICByZXR1cm4geyBjYW5jZWw6IHRydWUgfTtcbiAgICAgICAgICAvLyB9XG4gICAgICAgICAgLy9mcmFtZS5zZXRBdHRyaWJ1dGUoJ2NsaXF6LWFkYmxvY2tlcicsICdzYWZlJyk7XG4gICAgICAgICAgY29uc3QgdHBMb2cgPSByZXF1ZXN0QWN0aW9uTG9nZ2VyLmdldCh1cmwsIHVybFBhcnRzLCBzb3VyY2VVcmwsIHNvdXJjZVVybFBhcnRzLCBzb3VyY2VUYWIpO1xuICAgICAgICAgIGlmIChhZGJFbmFibGVkKCkgJiYgQ2xpcXpBREIuYWRCbG9ja2VyLm1hdGNoKHJlcXVlc3RDb250ZXh0KSkge1xuICAgICAgICAgICAgcmVxdWVzdEFjdGlvbkxvZ2dlci5pbmNyZW1lbnRTdGF0KHRwTG9nLCAnYWRibG9ja19ibG9jaycpO1xuICAgICAgICAgICAgcmV0dXJuIHsgY2FuY2VsOiB0cnVlIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH0gZWxzZSBpZiAoYWRiRW5hYmxlZCgpKSB7XG4gICAgICAgIGNvbnN0IHRwTG9nID0gcmVxdWVzdEFjdGlvbkxvZ2dlci5nZXQodXJsLCB1cmxQYXJ0cywgc291cmNlVXJsLCBzb3VyY2VVcmxQYXJ0cywgc291cmNlVGFiKTtcbiAgICAgICAgaWYgKENsaXF6QURCLm11dGF0aW9uTG9nZ2VyICYmIENsaXF6QURCLm11dGF0aW9uTG9nZ2VyLnRhYnNJbmZvW3NvdXJjZVRhYl0gJiZcbiAgICAgICAgICAgICFDbGlxekFEQi5tdXRhdGlvbkxvZ2dlci50YWJzSW5mb1tzb3VyY2VUYWJdLm9ic2VydmVyQWRkZWQpIHtcbiAgICAgICAgICBDbGlxekFEQi5tdXRhdGlvbkxvZ2dlci5hZGRNdXRhdGlvbk9ic2VydmVyKHNvdXJjZVRhYik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKENsaXF6QURCLmFkQmxvY2tlci5tYXRjaChyZXF1ZXN0Q29udGV4dCkpIHtcbiAgICAgICAgICByZXF1ZXN0QWN0aW9uTG9nZ2VyLmluY3JlbWVudFN0YXQodHBMb2csICdhZGJsb2NrX2Jsb2NrJyk7XG4gICAgICAgICAgLy9oaWRlTm9kZXMocmVxdWVzdENvbnRleHQpO1xuICAgICAgICAgIHJldHVybiB7IGNhbmNlbDogdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9LFxuICB9LFxuICBnZXRCcm93c2VyTWFqb3JWZXJzaW9uKCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhcHBJbmZvID0gQ29tcG9uZW50cy5jbGFzc2VzWydAbW96aWxsYS5vcmcveHJlL2FwcC1pbmZvOzEnXVxuICAgICAgICAgICAgICAgICAgICAgIC5nZXRTZXJ2aWNlKENvbXBvbmVudHMuaW50ZXJmYWNlcy5uc0lYVUxBcHBJbmZvKTtcbiAgICAgIHJldHVybiBwYXJzZUludChhcHBJbmZvLnZlcnNpb24uc3BsaXQoJy4nKVswXSwgMTApO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmV0dXJuIDEwMDtcbiAgICB9XG4gIH0sXG4gIGlzVGFiVVJMKHVybCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB3bSA9IENvbXBvbmVudHMuY2xhc3Nlc1snQG1vemlsbGEub3JnL2FwcHNoZWxsL3dpbmRvdy1tZWRpYXRvcjsxJ11cbiAgICAgICAgICAgICAgICAuZ2V0U2VydmljZShDb21wb25lbnRzLmludGVyZmFjZXMubnNJV2luZG93TWVkaWF0b3IpO1xuICAgICAgY29uc3QgYnJvd3NlckVudW1lcmF0b3IgPSB3bS5nZXRFbnVtZXJhdG9yKCduYXZpZ2F0b3I6YnJvd3NlcicpO1xuXG4gICAgICB3aGlsZSAoYnJvd3NlckVudW1lcmF0b3IuaGFzTW9yZUVsZW1lbnRzKCkpIHtcbiAgICAgICAgY29uc3QgYnJvd3NlcldpbiA9IGJyb3dzZXJFbnVtZXJhdG9yLmdldE5leHQoKTtcbiAgICAgICAgY29uc3QgdGFiYnJvd3NlciA9IGJyb3dzZXJXaW4uZ0Jyb3dzZXI7XG5cbiAgICAgICAgY29uc3QgbnVtVGFicyA9IHRhYmJyb3dzZXIuYnJvd3NlcnMubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbnVtVGFiczsgaW5kZXgrKykge1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRCcm93c2VyID0gdGFiYnJvd3Nlci5nZXRCcm93c2VyQXRJbmRleChpbmRleCk7XG4gICAgICAgICAgaWYgKGN1cnJlbnRCcm93c2VyKSB7XG4gICAgICAgICAgICBjb25zdCB0YWJVUkwgPSBjdXJyZW50QnJvd3Nlci5jdXJyZW50VVJJLnNwZWM7XG4gICAgICAgICAgICBpZiAodXJsID09PSB0YWJVUkwgfHwgdXJsID09PSB0YWJVUkwuc3BsaXQoJyMnKVswXSkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBDbGlxekFEQjtcbiJdfQ==