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

            utils.callWindowAction(utils.getWindow(), 'control-center', 'setBadge', [info.cookies.blocked + info.requests.unsafe]);
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
          "core.tab_state_change": CliqzAttrack.tab_listener.onStateChange.bind(CliqzAttrack.tab_listener),
          "control-center:antitracking-strict": function controlCenterAntitrackingStrict() {
            utils.setPref('attrackForceBlock', !utils.getPref('attrackForceBlock', false));
          },
          "control-center:antitracking-activator": function controlCenterAntitrackingActivator(data) {
            if (data.status == 'active') {
              // when we activate we also remove the current url from whitelist
              utils.setPref('antiTrackTest', true);
              if (CliqzAttrack.isSourceWhitelisted(data.hostname)) {
                CliqzAttrack.removeSourceDomainFromWhitelist(data.hostname);
                this.popupActions.telemetry({ action: 'click', target: 'unwhitelist_domain' });
              }
            } else if (data.status == 'inactive') {
              // inactive means that the current url is whitelisted but the whole mechanism is on
              CliqzAttrack.addSourceDomainToWhitelist(data.hostname);
              if (utils.getPref('antiTrackTest', false) == false) {
                utils.setPref('antiTrackTest', true);
              }
              this.popupActions.telemetry({ action: 'click', target: 'whitelist_domain' });
            } else if (data.status == 'critical') {
              // on critical we disable anti tracking completely so we must also clean the current url from whitelist
              utils.setPref('antiTrackTest', false);
              if (CliqzAttrack.isSourceWhitelisted(data.hostname)) {
                CliqzAttrack.removeSourceDomainFromWhitelist(data.hostname);
                this.popupActions.telemetry({ action: 'click', target: 'unwhitelist_domain' });
              }
            }
          }
        }

      }));
    }
  };
});