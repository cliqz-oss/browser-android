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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy90cmFja2VyLXByb3h5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztnRUFLTSxXQUFXOzs7Ozs7Ozt5QkFMUixLQUFLOzBCQUFFLE1BQU07O2lDQUNiLE9BQU87Ozs7NkNBRVAsZ0JBQWdCOzs7QUFFbkIsaUJBQVcsR0FBRyxzQkFBc0I7OztBQUk3Qiw0QkFBRzs7O0FBQ1osY0FBSSxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUc7QUFDckIsZ0JBQUksQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsQ0FBQyxDQUMzRSxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQzdELGdCQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztBQUNsQixnQkFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2hDLGdCQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7V0FDNUI7U0FDRjs7OztpQkFFUSxxQkFBRztBQUNWLG1CQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1dBQzFDOzs7aUJBRUcsZ0JBQUc7QUFDTCxnQkFBSyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUc7QUFDdEIsa0JBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNqQyxrQkFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBRSxDQUFDLGNBQWMsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFO0FBQzlFLHlCQUFTLEVBQUcsNkRBQTZEO0FBQ3pFLG9CQUFJLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSTtlQUMxQixDQUFDLENBQUM7QUFDSCxrQkFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLGtCQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDaEU7QUFDRCxnQkFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqRCxrQkFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1dBQzdDOzs7aUJBRUssa0JBQUc7QUFDUCxnQkFBSyxJQUFJLENBQUMsV0FBVyxFQUFHO0FBQ3RCLGtCQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hDLGtCQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQzthQUNuQjtXQUNGOzs7aUJBRU0sbUJBQUc7QUFDUixnQkFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2Qsa0JBQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztXQUNoRDs7O2lCQUVXLHNCQUFDLElBQUksRUFBRTtBQUNqQixnQkFBSyxJQUFJLEtBQUssV0FBVyxFQUFHO0FBQzFCLGtCQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUc7QUFDM0Msb0JBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztlQUNiLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFHO0FBQ2pELG9CQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7ZUFDZjthQUNGO1dBQ0Y7OztpQkFFc0IsaUNBQUMsSUFBSSxFQUFFO0FBQzVCLGdCQUFLLElBQUksQ0FBQyxLQUFLLEVBQUc7QUFDaEIsa0JBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzthQUN6RztBQUNELGdCQUFLLElBQUksQ0FBQyxPQUFPLEVBQUc7QUFDbEIsa0JBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBRSxDQUFDO2FBQy9DO1dBQ0Y7OztpQkFNZSwwQkFBQyxHQUFHLEVBQUU7Ozs7O0FBS3BCLGdCQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7QUFDcEIsa0JBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzNDLGtCQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUNqQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFO0FBQ25ELG9CQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLHVCQUFPLElBQUksQ0FBQztlQUNqQjthQUNGOztBQUVELG1CQUFPLEtBQUssQ0FBQztXQUNkOzs7aUJBRVEsbUJBQUMsR0FBRyxFQUFFO0FBQ2IsZ0JBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1dBQ3pCOzs7aUJBRVUscUJBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUU7QUFDbkMsZ0JBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQ3JDLGtCQUFJLENBQUMsU0FBUyxVQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JDLHFCQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7YUFDbkI7QUFDRCxtQkFBTyxhQUFhLENBQUM7V0FDdEI7OztlQS9CYyxlQUFHO0FBQ2hCLG1CQUFPLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUM7V0FDMUMiLCJmaWxlIjoiYW50aXRyYWNraW5nL3RyYWNrZXItcHJveHkuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1dGlscywgZXZlbnRzIH0gZnJvbSAnY29yZS9jbGlxeic7XG5pbXBvcnQgeyBVUkxJbmZvIH0gZnJvbSAnYW50aXRyYWNraW5nL3VybCc7XG5pbXBvcnQgUmVzb3VyY2VMb2FkZXIgZnJvbSAnY29yZS9yZXNvdXJjZS1sb2FkZXInO1xuaW1wb3J0IHsgZ2V0R2VuZXJhbERvbWFpbiB9IGZyb20gJ2FudGl0cmFja2luZy9kb21haW4nO1xuXG5jb25zdCBFTkFCTEVfUFJFRiA9ICdhdHRyYWNrUHJveHlUcmFja2Vycyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBpZiAodGhpcy5pc0VuYWJsZWQoKSApIHtcbiAgICAgIHRoaXMucHBzID0gQ29tcG9uZW50cy5jbGFzc2VzWydAbW96aWxsYS5vcmcvbmV0d29yay9wcm90b2NvbC1wcm94eS1zZXJ2aWNlOzEnXVxuICAgICAgICAuZ2V0U2VydmljZShDb21wb25lbnRzLmludGVyZmFjZXMubnNJUHJvdG9jb2xQcm94eVNlcnZpY2UpO1xuICAgICAgdGhpcy5wcm94eSA9IG51bGw7XG4gICAgICB0aGlzLnRyYWNrZXJEb21haW5zID0gbmV3IFNldCgpO1xuICAgICAgdGhpcy5wcm94eVVybHMgPSBuZXcgU2V0KCk7XG4gICAgfVxuICB9XG5cbiAgaXNFbmFibGVkKCkge1xuICAgIHJldHVybiB1dGlscy5nZXRQcmVmKEVOQUJMRV9QUkVGLCBmYWxzZSk7XG4gIH1cblxuICBpbml0KCkge1xuICAgIGlmICggdGhpcy5pc0VuYWJsZWQoKSApIHtcbiAgICAgIHRoaXMucHBzLnJlZ2lzdGVyRmlsdGVyKHRoaXMsIDIpO1xuICAgICAgdGhpcy5fbG9hZGVyID0gbmV3IFJlc291cmNlTG9hZGVyKCBbJ2FudGl0cmFja2luZycsICd0cmFja2VyX3Byb3h5X2NvbmYuanNvbiddLCB7XG4gICAgICAgIHJlbW90ZVVSTDogICdodHRwczovL2Nkbi5jbGlxei5jb20vYW50aS10cmFja2luZy90cmFja2VyX3Byb3h5X2NvbmYuanNvbicsXG4gICAgICAgIGNyb246IDI0ICogNjAgKiA2MCAqIDEwMDBcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fbG9hZGVyLmxvYWQoKS50aGVuKHRoaXMuX2xvYWRQcm94eUNvbmZpZ3VyYXRpb24uYmluZCh0aGlzKSk7XG4gICAgICB0aGlzLl9sb2FkZXIub25VcGRhdGUodGhpcy5fbG9hZFByb3h5Q29uZmlndXJhdGlvbi5iaW5kKHRoaXMpKTtcbiAgICB9XG4gICAgdGhpcy5wcmVmTGlzdGVuZXIgPSB0aGlzLm9uUHJlZkNoYW5nZS5iaW5kKHRoaXMpO1xuICAgIGV2ZW50cy5zdWIoJ3ByZWZjaGFuZ2UnLCB0aGlzLnByZWZMaXN0ZW5lcik7XG4gIH1cblxuICB1bmxvYWQoKSB7XG4gICAgaWYgKCB0aGlzLmluaXRpYWxpc2VkICkge1xuICAgICAgdGhpcy5wcHMudW5yZWdpc3RlckZpbHRlcih0aGlzKTtcbiAgICAgIHRoaXMucHJveHkgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy51bmxvYWQoKTtcbiAgICBldmVudHMudW5fc3ViKCdwcmVmY2hhbmdlJywgdGhpcy5wcmVmTGlzdGVuZXIpO1xuICB9XG5cbiAgb25QcmVmQ2hhbmdlKHByZWYpIHtcbiAgICBpZiAoIHByZWYgPT09IEVOQUJMRV9QUkVGICkge1xuICAgICAgaWYgKCB0aGlzLmlzRW5hYmxlZCgpICYmICF0aGlzLmluaXRpYWxpc2VkICkge1xuICAgICAgICB0aGlzLmluaXQoKTtcbiAgICAgIH0gZWxzZSBpZiggIXRoaXMuaXNFbmFibGVkKCkgJiYgdGhpcy5pbml0aWFsaXNlZCApIHtcbiAgICAgICAgdGhpcy51bmxvYWQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBfbG9hZFByb3h5Q29uZmlndXJhdGlvbihjb25mKSB7XG4gICAgaWYgKCBjb25mLnByb3h5ICkge1xuICAgICAgdGhpcy5wcm94eSA9IHRoaXMucHBzLm5ld1Byb3h5SW5mbyhjb25mLnByb3h5LnR5cGUsIGNvbmYucHJveHkuaG9zdCwgY29uZi5wcm94eS5wb3J0LCBudWxsLCA1MDAwLCBudWxsKTtcbiAgICB9XG4gICAgaWYgKCBjb25mLmRvbWFpbnMgKSB7XG4gICAgICB0aGlzLnRyYWNrZXJEb21haW5zID0gbmV3IFNldCggY29uZi5kb21haW5zICk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IGluaXRpYWxpc2VkKCkge1xuICAgIHJldHVybiB0aGlzLnByb3h5ICYmIHRoaXMucHJveHkgIT09IG51bGw7XG4gIH1cblxuICBjaGVja1Nob3VsZFByb3h5KHVybCkge1xuICAgIC8vIENoZWNrIGlmIGEgdXJsIHNob3VsZCBiZSBwcm94aWVkLiBXZSBoYXZlIHRvIGRvIHR3byBsb29rdXBzIGluIHRoZVxuICAgIC8vIHNldCBvZiBkb21haW5zIGB0cmFja2VyRG9tYWluc2AsIG9uZSBmb3IgdGhlIGZ1bGwgaG9zdG5hbWUsIGFuZCBvbmVcbiAgICAvLyBmb3IgdGhlIGdlbmVyYWwgZG9tYWluICh0aGUgbGlzdCBjb250YWlucyBzZXZlcmFsIGdlbmVyYWwgZG9tYWlucyBmb3JcbiAgICAvLyB3aGljaCB3ZSBzaGFsbCBwcm94eSBldmVyeSBxdWVyaWVzKS5cbiAgICBpZiAodGhpcy5pbml0aWFsaXNlZCkge1xuICAgICAgY29uc3QgaG9zdG5hbWUgPSBVUkxJbmZvLmdldCh1cmwpLmhvc3RuYW1lO1xuICAgICAgaWYgKHRoaXMudHJhY2tlckRvbWFpbnMuaGFzKGhvc3RuYW1lKSB8fFxuICAgICAgICAgIHRoaXMudHJhY2tlckRvbWFpbnMuaGFzKGdldEdlbmVyYWxEb21haW4oaG9zdG5hbWUpKSkge1xuICAgICAgICAgICAgdGhpcy5wcm94eU9uY2UodXJsKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByb3h5T25jZSh1cmwpIHtcbiAgICB0aGlzLnByb3h5VXJscy5hZGQodXJsKTtcbiAgfVxuXG4gIGFwcGx5RmlsdGVyKHBwcywgdXJsLCBkZWZhdWx0X3Byb3h5KSB7XG4gICAgaWYgKHRoaXMucHJveHlVcmxzLmhhcyh1cmwuYXNjaWlTcGVjKSkge1xuICAgICAgdGhpcy5wcm94eVVybHMuZGVsZXRlKHVybC5hc2NpaVNwZWMpO1xuICAgICAgcmV0dXJuIHRoaXMucHJveHk7XG4gICAgfVxuICAgIHJldHVybiBkZWZhdWx0X3Byb3h5O1xuICB9XG5cbn1cbiJdfQ==