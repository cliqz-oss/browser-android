System.register('antitracking/window', ['antitracking/background', 'antitracking/attrack', 'core/cliqz', 'q-button/buttons', 'antitracking/url'], function (_export) {
  'use strict';

  var background, CliqzAttrack, utils, events, simpleBtn, URLInfo, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function onLocationChange(ev) {
    if (this.interval) {
      utils.clearInterval(this.interval);
    }

    var counter = 8;

    this.updateBadge();

    this.interval = utils.setInterval((function () {
      this.updateBadge();

      counter -= 1;
      if (counter <= 0) {
        utils.clearInterval(this.interval);
      }
    }).bind(this), 2000);
  }

  function onPrefChange(pref) {
    if (pref == CliqzAttrack.ENABLE_PREF && CliqzAttrack.isEnabled() != this.enabled) {
      if (CliqzAttrack.isEnabled()) {
        CliqzAttrack.initWindow(this.window);
      } else {
        CliqzAttrack.unloadWindow(this.window);
      }
      this.enabled = CliqzAttrack.isEnabled();
    }
  }return {
    setters: [function (_antitrackingBackground) {
      background = _antitrackingBackground['default'];
    }, function (_antitrackingAttrack) {
      CliqzAttrack = _antitrackingAttrack['default'];
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }, function (_qButtonButtons) {
      simpleBtn = _qButtonButtons.simpleBtn;
    }, function (_antitrackingUrl) {
      URLInfo = _antitrackingUrl.URLInfo;
    }],
    execute: function () {
      ;

      _default = (function () {
        function _default(config) {
          _classCallCheck(this, _default);

          this.window = config.window;

          this.popup = background.popup;

          if (this.popup) {
            this.onLocationChange = onLocationChange.bind(this);
          }
          this.onPrefChange = onPrefChange.bind(this);
          this.enabled = false;
        }

        _createClass(_default, [{
          key: 'init',
          value: function init() {
            if (this.popup) {
              events.sub("core.location_change", this.onLocationChange);
              // Better to wait for first window to set the state of the button
              // otherways button may not be initialized yet
              this.popup.updateState(utils.getWindow(), CliqzAttrack.isEnabled());
            }
            this.onPrefChange(CliqzAttrack.ENABLE_PREF);
            events.sub("prefchange", this.onPrefChange);
          }
        }, {
          key: 'unload',
          value: function unload() {
            if (this.popup) {
              events.un_sub("core.location_change", this.onLocationChange);
              utils.clearInterval(this.interval);
            }
            if (CliqzAttrack.isEnabled()) {
              CliqzAttrack.unloadWindow(this.window);
            }
            events.un_sub("prefchange", this.onPrefChange);
          }
        }, {
          key: 'updateBadge',
          value: function updateBadge() {
            if (this.window !== utils.getWindow()) {
              return;
            }

            var info = CliqzAttrack.getCurrentTabBlockingInfo(),
                count;

            try {
              count = info.cookies.blocked + info.requests.unsafe;
            } catch (e) {
              count = 0;
            }

            // do not display number if site is whitelisted
            if (CliqzAttrack.isSourceWhitelisted(info.hostname)) {
              count = 0;
            }

            this.popup.setBadge(this.window, count);

            utils.callWindowAction(this.window, 'control-center', 'setBadge', [count]);
          }
        }, {
          key: 'createAttrackButton',
          value: function createAttrackButton() {
            var win = this.window,
                doc = win.document,
                attrackBtn = doc.createElement('menu'),
                attrackPopup = doc.createElement('menupopup');

            attrackBtn.setAttribute('label', utils.getLocalizedString('attrack-force-block-setting'));

            var filter_levels = {
              'false': {
                name: utils.getLocalizedString('attrack-force-block-off'),
                selected: false
              },
              'true': {
                name: utils.getLocalizedString('attrack-force-block-on'),
                selected: false
              }
            };
            filter_levels[utils.getPref('attrackForceBlock', false).toString()].selected = true;

            for (var level in filter_levels) {
              var item = doc.createElement('menuitem');
              item.setAttribute('label', filter_levels[level].name);
              item.setAttribute('class', 'menuitem-iconic');

              if (filter_levels[level].selected) {
                item.style.listStyleImage = 'url(chrome://cliqz/content/static/skin/checkmark.png)';
              }

              item.filter_level = level;
              item.addEventListener('command', function (event) {
                if (this.filter_level === 'true') {
                  utils.setPref('attrackForceBlock', true);
                  utils.telemetry({ type: 'antitracking', action: 'click', target: 'attrack_qbutton_strict' });
                } else {
                  utils.clearPref('attrackForceBlock');
                  utils.telemetry({ type: 'antitracking', action: 'click', target: 'attrack_qbutton_default' });
                }
              }, false);

              attrackPopup.appendChild(item);
            };

            var learnMore = simpleBtn(doc, utils.getLocalizedString('learnMore'), (function () {
              utils.openTabInWindow(this.window, 'https://cliqz.com/whycliqz/anti-tracking');
            }).bind(this), 'attrack_learn_more');
            learnMore.setAttribute('class', 'menuitem-iconic');
            attrackPopup.appendChild(doc.createElement('menuseparator'));
            attrackPopup.appendChild(learnMore);

            attrackBtn.appendChild(attrackPopup);

            return attrackBtn;
          }
        }, {
          key: 'createButtonItem',
          value: function createButtonItem() {
            if (!background.buttonEnabled) return [];

            return [this.createAttrackButton()];
          }
        }, {
          key: 'status',
          value: function status() {
            if (background.buttonEnabled) {
              var info = CliqzAttrack.getCurrentTabBlockingInfo(this.window.gBrowser),
                  ps = info.ps,
                  hostname = URLInfo.get(this.window.gBrowser.currentURI.spec).hostname,
                  isWhitelisted = CliqzAttrack.isSourceWhitelisted(hostname),
                  enabled = utils.getPref('antiTrackTest', true) && !isWhitelisted;

              return {
                visible: true,
                strict: utils.getPref('attrackForceBlock', false),
                hostname: hostname,
                cookiesCount: info.cookies.blocked,
                requestsCount: info.requests.unsafe,
                totalCount: info.cookies.blocked + info.requests.unsafe,
                enabled: enabled,
                isWhitelisted: isWhitelisted || enabled,
                reload: info.reload || false,
                trackersList: info,
                ps: ps,
                state: enabled ? 'active' : isWhitelisted ? 'inactive' : 'critical'
              };
            }
          }
        }]);

        return _default;
      })();

      _export('default', _default);

      ;
    }
  };
});