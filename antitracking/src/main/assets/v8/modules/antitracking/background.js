System.register('antitracking/background', ['core/base/background', 'antitracking/popup-button', 'antitracking/attrack', 'antitracking/privacy-score', 'antitracking/md5', 'antitracking/tracker-txt', 'core/cliqz', 'antitracking/telemetry'], function (_export) {

  /**
  * @namespace antitracking
  * @class Background
  */
  'use strict';

  var background, CliqzPopupButton, CliqzAttrack, PrivacyScore, md5, DEFAULT_ACTION_PREF, updateDefaultTrackerTxtRule, utils, events, telemetry;
  return {
    setters: [function (_coreBaseBackground) {
      background = _coreBaseBackground['default'];
    }, function (_antitrackingPopupButton) {
      CliqzPopupButton = _antitrackingPopupButton['default'];
    }, function (_antitrackingAttrack) {
      CliqzAttrack = _antitrackingAttrack['default'];
    }, function (_antitrackingPrivacyScore) {
      PrivacyScore = _antitrackingPrivacyScore.PrivacyScore;
    }, function (_antitrackingMd5) {
      md5 = _antitrackingMd5['default'];
    }, function (_antitrackingTrackerTxt) {
      DEFAULT_ACTION_PREF = _antitrackingTrackerTxt.DEFAULT_ACTION_PREF;
      updateDefaultTrackerTxtRule = _antitrackingTrackerTxt.updateDefaultTrackerTxtRule;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }, function (_antitrackingTelemetry) {
      telemetry = _antitrackingTelemetry['default'];
    }],
    execute: function () {
      _export('default', background({
        /**
        * @method init
        * @param settings
        */
        init: function init(settings) {
          if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
          }

          this.buttonEnabled = utils.getPref('attrackUI', settings.antitrackingButton);

          // fix for users without pref properly set: set to value from build config
          if (!utils.hasPref('attrackRemoveQueryStringTracking')) {
            utils.setPref('attrackRemoveQueryStringTracking', settings.antitrackingButton);
          }

          this.enabled = false;
          this.clickCache = {};

          utils.bindObjectFunctions(this.popupActions, this);

          if (this.buttonEnabled) {
            this.popup = new CliqzPopupButton({
              name: 'antitracking',
              actions: this.popupActions
            });
            this.popup.attach();
            this.popup.updateState(utils.getWindow(), false);
          }

          // inject configured telemetry module
          telemetry.loadFromProvider(settings.telemetryProvider || 'human-web/human-web');

          this.onPrefChange = (function (pref) {
            if (pref === CliqzAttrack.ENABLE_PREF && CliqzAttrack.isEnabled() !== this.enabled) {
              var isEnabled = CliqzAttrack.isEnabled();

              if (isEnabled) {
                // now enabled, initialise module
                CliqzAttrack.init();
              } else {
                // disabled, unload module
                CliqzAttrack.unload();
              }

              if (this.popup) {
                this.popup.updateState(utils.getWindow(), isEnabled);
              }
              this.enabled = isEnabled;
            } else if (pref === DEFAULT_ACTION_PREF) {
              updateDefaultTrackerTxtRule();
            }
          }).bind(this);

          this.onPrefChange(CliqzAttrack.ENABLE_PREF);
          events.sub('prefchange', this.onPrefChange);

          // set up metadata to be sent with tp_events messages
          CliqzAttrack.tp_events.telemetryAnnotators.push(function (payl) {
            payl.conf = {
              'qs': CliqzAttrack.isQSEnabled(),
              'cookie': CliqzAttrack.isCookieEnabled(),
              'bloomFilter': CliqzAttrack.isBloomFilterEnabled(),
              'trackTxt': CliqzAttrack.isTrackerTxtEnabled(),
              'forceBlock': CliqzAttrack.isForceBlockEnabled(),
              'ui': background.buttonEnabled
            };
            payl.ver = CliqzAttrack.VERSION;
            payl.addons = CliqzAttrack.similarAddon;
            payl.updateInTime = CliqzAttrack.qs_whitelist.isUpToDate();
            return payl;
          });
        },

        enabled: function enabled() {
          return this.enabled;
        },

        /**
        * @method unload
        */
        unload: function unload() {
          if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
          }

          if (this.popup) {
            this.popup.destroy();
          }

          events.un_sub('prefchange', this.onPrefChange);

          if (CliqzAttrack.isEnabled()) {
            CliqzAttrack.unload();
            this.enabled = false;
          }
        },

        popupActions: {
          /**
          * @method popupActions.getPopupData
          * @param args
          * @param cb Callback
          */
          getPopupData: function getPopupData(args, cb) {

            var info = CliqzAttrack.getCurrentTabBlockingInfo(),
                ps = info.ps;
            // var ps = PrivacyScore.get(md5(info.hostname).substring(0, 16)  'site');

            // ps.getPrivacyScore();

            cb({
              url: info.hostname,
              cookiesCount: info.cookies.blocked,
              requestsCount: info.requests.unsafe,
              enabled: utils.getPref('antiTrackTest'),
              isWhitelisted: CliqzAttrack.isSourceWhitelisted(info.hostname),
              reload: info.reload || false,
              trakersList: info,
              ps: ps
            });

            if (this.popup) {
              this.popup.setBadge(utils.getWindow(), info.cookies.blocked + info.requests.unsafe);
            }
          },
          /**
          * @method popupActions.toggleAttrack
          * @param args
          * @param cb Callback
          */
          toggleAttrack: function toggleAttrack(args, cb) {
            var currentState = utils.getPref('antiTrackTest');

            if (currentState) {
              CliqzAttrack.disableModule();
            } else {
              CliqzAttrack.enableModule();
            }

            this.popup.updateState(utils.getWindow(), !currentState);

            cb();

            this.popupActions.telemetry({ action: 'click', 'target': currentState ? 'deactivate' : 'activate' });
          },
          /**
          * @method popupActions.closePopup
          */
          closePopup: function closePopup(_, cb) {
            this.popup.tbb.closePopup();
            cb();
          },
          /**
          * @method popupActions.toggleWhiteList
          * @param args
          * @param cb Callback
          */
          toggleWhiteList: function toggleWhiteList(args, cb) {
            var hostname = args.hostname;
            if (CliqzAttrack.isSourceWhitelisted(hostname)) {
              CliqzAttrack.removeSourceDomainFromWhitelist(hostname);
              this.popupActions.telemetry({ action: 'click', target: 'unwhitelist_domain' });
            } else {
              CliqzAttrack.addSourceDomainToWhitelist(hostname);
              this.popupActions.telemetry({ action: 'click', target: 'whitelist_domain' });
            }
            cb();
          },
          /**
          * @method popupActions.updateHeight
          * @param args
          * @param cb Callback
          */
          updateHeight: function updateHeight(args, cb) {
            this.popup.updateView(utils.getWindow(), args[0]);
          },

          _isDuplicate: function _isDuplicate(info) {
            var now = Date.now();
            var key = info.tab + info.hostname + info.path;

            // clean old entries
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = Object.keys(this.clickCache)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var k = _step.value;

                if (now - this.clickCache[k] > 60000) {
                  delete this.clickCache[k];
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator['return']) {
                  _iterator['return']();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            if (key in this.clickCache) {
              return true;
            } else {
              this.clickCache[key] = now;
              return false;
            }
          },

          telemetry: function telemetry(msg) {
            if (msg.includeUnsafeCount) {
              delete msg.includeUnsafeCount;
              var info = CliqzAttrack.getCurrentTabBlockingInfo();
              // drop duplicated messages
              if (info.error || this.popupActions._isDuplicate(info)) {
                return;
              }
              msg.unsafe_count = info.cookies.blocked + info.requests.unsafe;
              msg.special = info.error !== undefined;
            }
            msg.type = 'antitracking';
            utils.telemetry(msg);
          }
        },

        events: {
          "core.tab_location_change": CliqzAttrack.onTabLocationChange,
          "core.tab_state_change": CliqzAttrack.tab_listener.onStateChange.bind(CliqzAttrack.tab_listener)
        }

      }));
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9iYWNrZ3JvdW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OytDQUdRLFlBQVk7Ozs7b0RBRVgsbUJBQW1COzREQUFFLDJCQUEyQjs7eUJBQ2hELEtBQUs7MEJBQUUsTUFBTTs7Ozs7eUJBT1AsVUFBVSxDQUFDOzs7OztBQUt4QixZQUFJLEVBQUEsY0FBQyxRQUFRLEVBQUU7QUFDYixjQUFJLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLFlBQVksQ0FBQyxtQkFBbUIsRUFBRTtBQUM1RSxtQkFBTztXQUNSOztBQUVELGNBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7OztBQUc3RSxjQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFO0FBQ3RELGlCQUFLLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1dBQ2hGOztBQUVELGNBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ3JCLGNBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDOztBQUVyQixlQUFLLENBQUMsbUJBQW1CLENBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUUsQ0FBQzs7QUFFckQsY0FBSSxJQUFJLENBQUMsYUFBYSxFQUFFO0FBQ3RCLGdCQUFJLENBQUMsS0FBSyxHQUFHLElBQUksZ0JBQWdCLENBQUM7QUFDaEMsa0JBQUksRUFBRSxjQUFjO0FBQ3BCLHFCQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVk7YUFDM0IsQ0FBQyxDQUFDO0FBQ0gsZ0JBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDcEIsZ0JBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztX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OztBQUVELGNBQU0sRUFBRTtBQUNOLG9DQUEwQixFQUFFLFlBQVksQ0FBQyxtQkFBbUI7QUFDNUQsaUNBQXVCLEVBQUUsWUFBWSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7U0FDakc7O09BRUYsQ0FBQyIsImZpbGUiOiJhbnRpdHJhY2tpbmcvYmFja2dyb3VuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBiYWNrZ3JvdW5kIGZyb20gXCJjb3JlL2Jhc2UvYmFja2dyb3VuZFwiO1xuaW1wb3J0IENsaXF6UG9wdXBCdXR0b24gZnJvbSAnYW50aXRyYWNraW5nL3BvcHVwLWJ1dHRvbic7XG5pbXBvcnQgQ2xpcXpBdHRyYWNrIGZyb20gJ2FudGl0cmFja2luZy9hdHRyYWNrJztcbmltcG9ydCB7UHJpdmFjeVNjb3JlfSBmcm9tICdhbnRpdHJhY2tpbmcvcHJpdmFjeS1zY29yZSc7XG5pbXBvcnQgbWQ1IGZyb20gJ2FudGl0cmFja2luZy9tZDUnO1xuaW1wb3J0IHsgREVGQVVMVF9BQ1RJT05fUFJFRiwgdXBkYXRlRGVmYXVsdFRyYWNrZXJUeHRSdWxlIH0gZnJvbSAnYW50aXRyYWNraW5nL3RyYWNrZXItdHh0JztcbmltcG9ydCB7IHV0aWxzLCBldmVudHMgfSBmcm9tICdjb3JlL2NsaXF6JztcbmltcG9ydCB0ZWxlbWV0cnkgZnJvbSAnYW50aXRyYWNraW5nL3RlbGVtZXRyeSc7XG5cbi8qKlxuKiBAbmFtZXNwYWNlIGFudGl0cmFja2luZ1xuKiBAY2xhc3MgQmFja2dyb3VuZFxuKi9cbmV4cG9ydCBkZWZhdWx0IGJhY2tncm91bmQoe1xuICAvKipcbiAgKiBAbWV0aG9kIGluaXRcbiAgKiBAcGFyYW0gc2V0dGluZ3NcbiAgKi9cbiAgaW5pdChzZXR0aW5ncykge1xuICAgIGlmIChDbGlxekF0dHJhY2suZ2V0QnJvd3Nlck1ham9yVmVyc2lvbigpIDwgQ2xpcXpBdHRyYWNrLk1JTl9CUk9XU0VSX1ZFUlNJT04pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJ1dHRvbkVuYWJsZWQgPSB1dGlscy5nZXRQcmVmKCdhdHRyYWNrVUknLCBzZXR0aW5ncy5hbnRpdHJhY2tpbmdCdXR0b24pO1xuXG4gICAgLy8gZml4IGZvciB1c2VycyB3aXRob3V0IHByZWYgcHJvcGVybHkgc2V0OiBzZXQgdG8gdmFsdWUgZnJvbSBidWlsZCBjb25maWdcbiAgICBpZiAoIXV0aWxzLmhhc1ByZWYoJ2F0dHJhY2tSZW1vdmVRdWVyeVN0cmluZ1RyYWNraW5nJykpIHtcbiAgICAgIHV0aWxzLnNldFByZWYoJ2F0dHJhY2tSZW1vdmVRdWVyeVN0cmluZ1RyYWNraW5nJywgc2V0dGluZ3MuYW50aXRyYWNraW5nQnV0dG9uKTtcbiAgICB9XG5cbiAgICB0aGlzLmVuYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLmNsaWNrQ2FjaGUgPSB7fTtcblxuICAgIHV0aWxzLmJpbmRPYmplY3RGdW5jdGlvbnMoIHRoaXMucG9wdXBBY3Rpb25zLCB0aGlzICk7XG5cbiAgICBpZiAodGhpcy5idXR0b25FbmFibGVkKSB7XG4gICAgICB0aGlzLnBvcHVwID0gbmV3IENsaXF6UG9wdXBCdXR0b24oe1xuICAgICAgICBuYW1lOiAnYW50aXRyYWNraW5nJyxcbiAgICAgICAgYWN0aW9uczogdGhpcy5wb3B1cEFjdGlvbnNcbiAgICAgIH0pO1xuICAgICAgdGhpcy5wb3B1cC5hdHRhY2goKTtcbiAgICAgIHRoaXMucG9wdXAudXBkYXRlU3RhdGUodXRpbHMuZ2V0V2luZG93KCksIGZhbHNlKTtcbiAgICB9XG5cbiAgICAvLyBpbmplY3QgY29uZmlndXJlZCB0ZWxlbWV0cnkgbW9kdWxlXG4gICAgdGVsZW1ldHJ5LmxvYWRGcm9tUHJvdmlkZXIoc2V0dGluZ3MudGVsZW1ldHJ5UHJvdmlkZXIgfHwgJ2h1bWFuLXdlYi9odW1hbi13ZWInKTtcblxuICAgIHRoaXMub25QcmVmQ2hhbmdlID0gZnVuY3Rpb24ocHJlZikge1xuICAgICAgaWYgKHByZWYgPT09IENsaXF6QXR0cmFjay5FTkFCTEVfUFJFRiAmJiBDbGlxekF0dHJhY2suaXNFbmFibGVkKCkgIT09IHRoaXMuZW5hYmxlZCkge1xuICAgICAgICBjb25zdCBpc0VuYWJsZWQgPSBDbGlxekF0dHJhY2suaXNFbmFibGVkKCk7XG5cbiAgICAgICAgaWYgKGlzRW5hYmxlZCkge1xuICAgICAgICAgIC8vIG5vdyBlbmFibGVkLCBpbml0aWFsaXNlIG1vZHVsZVxuICAgICAgICAgIENsaXF6QXR0cmFjay5pbml0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZGlzYWJsZWQsIHVubG9hZCBtb2R1bGVcbiAgICAgICAgICBDbGlxekF0dHJhY2sudW5sb2FkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLnBvcHVwKXtcbiAgICAgICAgICB0aGlzLnBvcHVwLnVwZGF0ZVN0YXRlKHV0aWxzLmdldFdpbmRvdygpLCBpc0VuYWJsZWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZW5hYmxlZCA9IGlzRW5hYmxlZDtcbiAgICAgIH0gZWxzZSBpZiAocHJlZiA9PT0gREVGQVVMVF9BQ1RJT05fUFJFRikge1xuICAgICAgICB1cGRhdGVEZWZhdWx0VHJhY2tlclR4dFJ1bGUoKTtcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLm9uUHJlZkNoYW5nZShDbGlxekF0dHJhY2suRU5BQkxFX1BSRUYpO1xuICAgIGV2ZW50cy5zdWIoJ3ByZWZjaGFuZ2UnLCB0aGlzLm9uUHJlZkNoYW5nZSk7XG5cbiAgICAvLyBzZXQgdXAgbWV0YWRhdGEgdG8gYmUgc2VudCB3aXRoIHRwX2V2ZW50cyBtZXNzYWdlc1xuICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMudGVsZW1ldHJ5QW5ub3RhdG9ycy5wdXNoKGZ1bmN0aW9uKHBheWwpIHtcbiAgICAgIHBheWwuY29uZiA9IHtcbiAgICAgICAgJ3FzJzogQ2xpcXpBdHRyYWNrLmlzUVNFbmFibGVkKCksXG4gICAgICAgICdjb29raWUnOiBDbGlxekF0dHJhY2suaXNDb29raWVFbmFibGVkKCksXG4gICAgICAgICdibG9vbUZpbHRlcic6IENsaXF6QXR0cmFjay5pc0Jsb29tRmlsdGVyRW5hYmxlZCgpLFxuICAgICAgICAndHJhY2tUeHQnOiBDbGlxekF0dHJhY2suaXNUcmFja2VyVHh0RW5hYmxlZCgpLFxuICAgICAgICAnZm9yY2VCbG9jayc6IENsaXF6QXR0cmFjay5pc0ZvcmNlQmxvY2tFbmFibGVkKCksXG4gICAgICAgICd1aSc6IGJhY2tncm91bmQuYnV0dG9uRW5hYmxlZFxuICAgICAgfTtcbiAgICAgIHBheWwudmVyID0gQ2xpcXpBdHRyYWNrLlZFUlNJT047XG4gICAgICBwYXlsLmFkZG9ucyA9IENsaXF6QXR0cmFjay5zaW1pbGFyQWRkb247XG4gICAgICBwYXlsLnVwZGF0ZUluVGltZSA9IENsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QuaXNVcFRvRGF0ZSgpO1xuICAgICAgcmV0dXJuIHBheWw7XG4gICAgfSk7XG4gIH0sXG5cbiAgZW5hYmxlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbmFibGVkO1xuICB9LFxuXG4gIC8qKlxuICAqIEBtZXRob2QgdW5sb2FkXG4gICovXG4gIHVubG9hZCgpIHtcbiAgICBpZiAoQ2xpcXpBdHRyYWNrLmdldEJyb3dzZXJNYWpvclZlcnNpb24oKSA8IENsaXF6QXR0cmFjay5NSU5fQlJPV1NFUl9WRVJTSU9OKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCB0aGlzLnBvcHVwICkge1xuICAgICAgdGhpcy5wb3B1cC5kZXN0cm95KCk7XG4gICAgfVxuXG4gICAgZXZlbnRzLnVuX3N1YigncHJlZmNoYW5nZScsIHRoaXMub25QcmVmQ2hhbmdlKTtcblxuICAgIGlmIChDbGlxekF0dHJhY2suaXNFbmFibGVkKCkpIHtcbiAgICAgIENsaXF6QXR0cmFjay51bmxvYWQoKTtcbiAgICAgIHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuICAgIH1cbiAgfSxcblxuICBwb3B1cEFjdGlvbnM6IHtcbiAgICAvKipcbiAgICAqIEBtZXRob2QgcG9wdXBBY3Rpb25zLmdldFBvcHVwRGF0YVxuICAgICogQHBhcmFtIGFyZ3NcbiAgICAqIEBwYXJhbSBjYiBDYWxsYmFja1xuICAgICovXG4gICAgZ2V0UG9wdXBEYXRhKGFyZ3MsIGNiKSB7XG5cbiAgICAgIHZhciBpbmZvID0gQ2xpcXpBdHRyYWNrLmdldEN1cnJlbnRUYWJCbG9ja2luZ0luZm8oKSxcbiAgICAgICAgICBwcyA9IGluZm8ucHM7XG4gICAgICAvLyB2YXIgcHMgPSBQcml2YWN5U2NvcmUuZ2V0KG1kNShpbmZvLmhvc3RuYW1lKS5zdWJzdHJpbmcoMCwgMTYpICAnc2l0ZScpO1xuXG4gICAgICAvLyBwcy5nZXRQcml2YWN5U2NvcmUoKTtcblxuICAgICAgY2Ioe1xuICAgICAgICB1cmw6IGluZm8uaG9zdG5hbWUsXG4gICAgICAgIGNvb2tpZXNDb3VudDogaW5mby5jb29raWVzLmJsb2NrZWQsXG4gICAgICAgIHJlcXVlc3RzQ291bnQ6IGluZm8ucmVxdWVzdHMudW5zYWZlLFxuICAgICAgICBlbmFibGVkOiB1dGlscy5nZXRQcmVmKCdhbnRpVHJhY2tUZXN0JyksXG4gICAgICAgIGlzV2hpdGVsaXN0ZWQ6IENsaXF6QXR0cmFjay5pc1NvdXJjZVdoaXRlbGlzdGVkKGluZm8uaG9zdG5hbWUpLFxuICAgICAgICByZWxvYWQ6IGluZm8ucmVsb2FkIHx8IGZhbHNlLFxuICAgICAgICB0cmFrZXJzTGlzdDogaW5mbyxcbiAgICAgICAgcHM6IHBzXG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMucG9wdXApIHtcbiAgICAgICAgdGhpcy5wb3B1cC5zZXRCYWRnZSh1dGlscy5nZXRXaW5kb3coKSwgaW5mby5jb29raWVzLmJsb2NrZWQgKyBpbmZvLnJlcXVlc3RzLnVuc2FmZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAqIEBtZXRob2QgcG9wdXBBY3Rpb25zLnRvZ2dsZUF0dHJhY2tcbiAgICAqIEBwYXJhbSBhcmdzXG4gICAgKiBAcGFyYW0gY2IgQ2FsbGJhY2tcbiAgICAqL1xuICAgIHRvZ2dsZUF0dHJhY2soYXJncywgY2IpIHtcbiAgICAgIHZhciBjdXJyZW50U3RhdGUgPSB1dGlscy5nZXRQcmVmKCdhbnRpVHJhY2tUZXN0Jyk7XG5cbiAgICAgIGlmIChjdXJyZW50U3RhdGUpIHtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLmRpc2FibGVNb2R1bGUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIENsaXF6QXR0cmFjay5lbmFibGVNb2R1bGUoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5wb3B1cC51cGRhdGVTdGF0ZSh1dGlscy5nZXRXaW5kb3coKSwgIWN1cnJlbnRTdGF0ZSk7XG5cbiAgICAgIGNiKCk7XG5cbiAgICAgIHRoaXMucG9wdXBBY3Rpb25zLnRlbGVtZXRyeSgge2FjdGlvbjogJ2NsaWNrJywgJ3RhcmdldCc6IChjdXJyZW50U3RhdGUgPyAnZGVhY3RpdmF0ZScgOiAnYWN0aXZhdGUnKX0gKVxuICAgIH0sXG4gICAgLyoqXG4gICAgKiBAbWV0aG9kIHBvcHVwQWN0aW9ucy5jbG9zZVBvcHVwXG4gICAgKi9cbiAgICBjbG9zZVBvcHVwKF8sIGNiKSB7XG4gICAgICB0aGlzLnBvcHVwLnRiYi5jbG9zZVBvcHVwKCk7XG4gICAgICBjYigpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgKiBAbWV0aG9kIHBvcHVwQWN0aW9ucy50b2dnbGVXaGl0ZUxpc3RcbiAgICAqIEBwYXJhbSBhcmdzXG4gICAgKiBAcGFyYW0gY2IgQ2FsbGJhY2tcbiAgICAqL1xuICAgIHRvZ2dsZVdoaXRlTGlzdChhcmdzLCBjYikge1xuICAgICAgdmFyIGhvc3RuYW1lID0gYXJncy5ob3N0bmFtZTtcbiAgICAgIGlmIChDbGlxekF0dHJhY2suaXNTb3VyY2VXaGl0ZWxpc3RlZChob3N0bmFtZSkpIHtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLnJlbW92ZVNvdXJjZURvbWFpbkZyb21XaGl0ZWxpc3QoaG9zdG5hbWUpO1xuICAgICAgICB0aGlzLnBvcHVwQWN0aW9ucy50ZWxlbWV0cnkoIHsgYWN0aW9uOiAnY2xpY2snLCB0YXJnZXQ6ICd1bndoaXRlbGlzdF9kb21haW4nfSApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLmFkZFNvdXJjZURvbWFpblRvV2hpdGVsaXN0KGhvc3RuYW1lKTtcbiAgICAgICAgdGhpcy5wb3B1cEFjdGlvbnMudGVsZW1ldHJ5KCB7IGFjdGlvbjogJ2NsaWNrJywgdGFyZ2V0OiAnd2hpdGVsaXN0X2RvbWFpbid9ICk7XG4gICAgICB9XG4gICAgICBjYigpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgKiBAbWV0aG9kIHBvcHVwQWN0aW9ucy51cGRhdGVIZWlnaHRcbiAgICAqIEBwYXJhbSBhcmdzXG4gICAgKiBAcGFyYW0gY2IgQ2FsbGJhY2tcbiAgICAqL1xuICAgIHVwZGF0ZUhlaWdodChhcmdzLCBjYikge1xuICAgICAgdGhpcy5wb3B1cC51cGRhdGVWaWV3KHV0aWxzLmdldFdpbmRvdygpLCBhcmdzWzBdKTtcbiAgICB9LFxuXG4gICAgX2lzRHVwbGljYXRlKGluZm8pIHtcbiAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICBjb25zdCBrZXkgPSBpbmZvLnRhYiArIGluZm8uaG9zdG5hbWUgKyBpbmZvLnBhdGg7XG5cbiAgICAgIC8vIGNsZWFuIG9sZCBlbnRyaWVzXG4gICAgICBmb3IgKGxldCBrIG9mIE9iamVjdC5rZXlzKHRoaXMuY2xpY2tDYWNoZSkpIHtcbiAgICAgICAgaWYgKG5vdyAtIHRoaXMuY2xpY2tDYWNoZVtrXSA+IDYwMDAwKSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuY2xpY2tDYWNoZVtrXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoa2V5IGluIHRoaXMuY2xpY2tDYWNoZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY2xpY2tDYWNoZVtrZXldID0gbm93O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHRlbGVtZXRyeShtc2cpIHtcbiAgICAgIGlmIChtc2cuaW5jbHVkZVVuc2FmZUNvdW50KSB7XG4gICAgICAgIGRlbGV0ZSBtc2cuaW5jbHVkZVVuc2FmZUNvdW50XG4gICAgICAgIGNvbnN0IGluZm8gPSBDbGlxekF0dHJhY2suZ2V0Q3VycmVudFRhYkJsb2NraW5nSW5mbygpO1xuICAgICAgICAvLyBkcm9wIGR1cGxpY2F0ZWQgbWVzc2FnZXNcbiAgICAgICAgaWYgKGluZm8uZXJyb3IgfHwgdGhpcy5wb3B1cEFjdGlvbnMuX2lzRHVwbGljYXRlKGluZm8pKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1zZy51bnNhZmVfY291bnQgPSBpbmZvLmNvb2tpZXMuYmxvY2tlZCArIGluZm8ucmVxdWVzdHMudW5zYWZlO1xuICAgICAgICBtc2cuc3BlY2lhbCA9IGluZm8uZXJyb3IgIT09IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIG1zZy50eXBlID0gJ2FudGl0cmFja2luZyc7XG4gICAgICB1dGlscy50ZWxlbWV0cnkobXNnKTtcbiAgICB9XG4gIH0sXG5cbiAgZXZlbnRzOiB7XG4gICAgXCJjb3JlLnRhYl9sb2NhdGlvbl9jaGFuZ2VcIjogQ2xpcXpBdHRyYWNrLm9uVGFiTG9jYXRpb25DaGFuZ2UsXG4gICAgXCJjb3JlLnRhYl9zdGF0ZV9jaGFuZ2VcIjogQ2xpcXpBdHRyYWNrLnRhYl9saXN0ZW5lci5vblN0YXRlQ2hhbmdlLmJpbmQoQ2xpcXpBdHRyYWNrLnRhYl9saXN0ZW5lcilcbiAgfSxcblxufSk7XG4iXX0=