System.register('antitracking/tracker-proxy', ['core/cliqz', 'antitracking/url', 'core/resource-loader', 'antitracking/domain'], function (_export) {
  'use strict';

  var utils, events, URLInfo, ResourceLoader, getGeneralDomain, ENABLE_PREF, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }, function (_antitrackingUrl) {
      URLInfo = _antitrackingUrl.URLInfo;
    }, function (_coreResourceLoader) {
      ResourceLoader = _coreResourceLoader['default'];
    }, function (_antitrackingDomain) {
      getGeneralDomain = _antitrackingDomain.getGeneralDomain;
    }],
    execute: function () {
      ENABLE_PREF = 'attrackProxyTrackers';

      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);

          if (this.isEnabled()) {
            this.pps = Components.classes['@mozilla.org/network/protocol-proxy-service;1'].getService(Components.interfaces.nsIProtocolProxyService);
            this.proxy = null;
            this.trackerDomains = new Set();
            this.proxyUrls = new Set();
          }
        }

        _createClass(_default, [{
          key: 'isEnabled',
          value: function isEnabled() {
            return utils.getPref(ENABLE_PREF, false);
          }
        }, {
          key: 'init',
          value: function init() {
            if (this.isEnabled()) {
              this.pps.registerFilter(this, 2);
              this._loader = new ResourceLoader(['antitracking', 'tracker_proxy_conf.json'], {
                remoteURL: 'https://cdn.cliqz.com/anti-tracking/tracker_proxy_conf.json',
                cron: 24 * 60 * 60 * 1000
              });
              this._loader.load().then(this._loadProxyConfiguration.bind(this));
              this._loader.onUpdate(this._loadProxyConfiguration.bind(this));
            }
            this.prefListener = this.onPrefChange.bind(this);
            events.sub('prefchange', this.prefListener);
          }
        }, {
          key: 'unload',
          value: function unload() {
            if (this.initialised) {
              this.pps.unregisterFilter(this);
              this.proxy = null;
            }
          }
        }, {
          key: 'destroy',
          value: function destroy() {
            this.unload();
            events.un_sub('prefchange', this.prefListener);
          }
        }, {
          key: 'onPrefChange',
          value: function onPrefChange(pref) {
            if (pref === ENABLE_PREF) {
              if (this.isEnabled() && !this.initialised) {
                this.init();
              } else if (!this.isEnabled() && this.initialised) {
                this.unload();
              }
            }
          }
        }, {
          key: '_loadProxyConfiguration',
          value: function _loadProxyConfiguration(conf) {
            if (conf.proxy) {
              this.proxy = this.pps.newProxyInfo(conf.proxy.type, conf.proxy.host, conf.proxy.port, null, 5000, null);
            }
            if (conf.domains) {
              this.trackerDomains = new Set(conf.domains);
            }
          }
        }, {
          key: 'checkShouldProxy',
          value: function checkShouldProxy(url) {
            // Check if a url should be proxied. We have to do two lookups in the
            // set of domains `trackerDomains`, one for the full hostname, and one
            // for the general domain (the list contains several general domains for
            // which we shall proxy every queries).
            if (this.initialised) {
              var hostname = URLInfo.get(url).hostname;
              if (this.trackerDomains.has(hostname) || this.trackerDomains.has(getGeneralDomain(hostname))) {
                this.proxyOnce(url);
                return true;
              }
            }

            return false;
          }
        }, {
          key: 'proxyOnce',
          value: function proxyOnce(url) {
            this.proxyUrls.add(url);
          }
        }, {
          key: 'applyFilter',
          value: function applyFilter(pps, url, default_proxy) {
            if (this.proxyUrls.has(url.asciiSpec)) {
              this.proxyUrls['delete'](url.asciiSpec);
              return this.proxy;
            }
            return default_proxy;
          }
        }, {
          key: 'initialised',
          get: function get() {
            return this.proxy && this.proxy !== null;
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});