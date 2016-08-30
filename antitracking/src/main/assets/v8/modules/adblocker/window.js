System.register('adblocker/window', ['core/cliqz', 'q-button/buttons', 'adblocker/adblocker'], function (_export) {
  'use strict';

  var utils, simpleBtn, checkBox, CliqzADB, adbEnabled, adbABTestEnabled, ADB_PREF_VALUES, ADB_PREF, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_qButtonButtons) {
      simpleBtn = _qButtonButtons.simpleBtn;
      checkBox = _qButtonButtons.checkBox;
    }, function (_adblockerAdblocker) {
      CliqzADB = _adblockerAdblocker['default'];
      adbEnabled = _adblockerAdblocker.adbEnabled;
      adbABTestEnabled = _adblockerAdblocker.adbABTestEnabled;
      ADB_PREF_VALUES = _adblockerAdblocker.ADB_PREF_VALUES;
      ADB_PREF = _adblockerAdblocker.ADB_PREF;
    }],
    execute: function () {
      _default = (function () {
        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        _createClass(_default, [{
          key: 'init',
          value: function init() {
            if (adbEnabled()) {
              CliqzADB.initWindow(this.window);
              this.window.adbinit = true;
            }
          }
        }, {
          key: 'unload',
          value: function unload() {
            if (adbEnabled()) {
              CliqzADB.unloadWindow(this.window);
              this.window.adbinit = false;
            }
          }
        }, {
          key: 'createAdbButton',
          value: function createAdbButton() {
            var win = this.window;
            var doc = win.document;
            var adbBtn = doc.createElement('menu');
            var adbPopup = doc.createElement('menupopup');

            adbBtn.setAttribute('label', utils.getLocalizedString('adb-menu-option'));

            // we must create the whole ADB popup every time we show it
            // because parts of it depend on the current URL
            adbPopup.addEventListener('popupshowing', function () {
              // clean the whole popup
              while (adbPopup.lastChild) {
                adbPopup.removeChild(adbPopup.lastChild);
              }

              var currentURL = win.gBrowser.currentURI.spec;
              var adbDisabled = !adbEnabled();

              var isCorrectUrl = utils.isUrl(currentURL);
              var disabledForUrl = false;
              var disabledForDomain = false;

              // Check if adblocker is disabled on this page
              if (isCorrectUrl) {
                disabledForDomain = CliqzADB.adBlocker.isDomainInBlacklist(currentURL);
                disabledForUrl = CliqzADB.adBlocker.isUrlInBlacklist(currentURL);
              }

              var disableUrl = checkBox(doc, 'cliqz-adb-url', utils.getLocalizedString('adb-menu-disable-url'), true, function () {
                CliqzADB.adBlocker.toggleUrl(currentURL);
              }, disabledForUrl);

              var disableDomain = checkBox(doc, 'cliqz-adb-domain', utils.getLocalizedString('adb-menu-disable-domain'), true, function () {
                CliqzADB.adBlocker.toggleUrl(currentURL, true);
              }, disabledForDomain);

              // We disabled the option of adding a custom rule for URL
              // in case the whole domain is disabled
              disableUrl.setAttribute('disabled', adbDisabled || disabledForDomain || !isCorrectUrl);
              disableDomain.setAttribute('disabled', adbDisabled || !isCorrectUrl);

              adbPopup.appendChild(disableUrl);
              adbPopup.appendChild(disableDomain);
              adbPopup.appendChild(doc.createElement('menuseparator'));

              Object.keys(ADB_PREF_VALUES).forEach(function (name) {
                var item = doc.createElement('menuitem');

                item.setAttribute('label', utils.getLocalizedString('adb-menu-option-' + name.toLowerCase()));
                item.setAttribute('class', 'menuitem-iconic');
                item.option = ADB_PREF_VALUES[name];

                if (utils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) === item.option) {
                  item.style.listStyleImage = 'url(' + utils.SKIN_PATH + 'checkmark.png)';
                }

                item.addEventListener('command', function () {
                  utils.setPref(ADB_PREF, item.option);
                  if (adbEnabled() && !win.adbinit) {
                    CliqzADB.initWindow(win);
                    win.adbinit = true;
                  }
                  if (!adbEnabled() && win.adbinit) {
                    CliqzADB.unloadWindow(win);
                    win.adbinit = false;
                  }
                  utils.telemetry({
                    type: 'activity',
                    action: 'cliqz_menu_button',
                    button_name: 'adb_option_' + item.option
                  });
                }, false);

                adbPopup.appendChild(item);
              });

              adbPopup.appendChild(doc.createElement('menuseparator'));

              adbPopup.appendChild(simpleBtn(doc, CliqzUtils.getLocalizedString('adb-menu-more'), function () {
                utils.openTabInWindow(win, 'https://cliqz.com/whycliqz/adblocking');
              }, 'cliqz-adb-more'));
            });

            adbBtn.appendChild(adbPopup);

            return adbBtn;
          }
        }, {
          key: 'createButtonItem',
          value: function createButtonItem() {
            if (adbABTestEnabled()) {
              return [this.createAdbButton()];
            }
            return [];
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,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d2luZG93LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXRpbHMgfSBmcm9tICdjb3JlL2NsaXF6JztcbmltcG9ydCB7IHNpbXBsZUJ0biwgY2hlY2tCb3ggfSBmcm9tICdxLWJ1dHRvbi9idXR0b25zJztcbmltcG9ydCBDbGlxekFEQixcbiAgICAgeyBhZGJFbmFibGVkLFxuICAgICAgIGFkYkFCVGVzdEVuYWJsZWQsXG4gICAgICAgQURCX1BSRUZfVkFMVUVTLFxuICAgICAgIEFEQl9QUkVGIH0gZnJvbSAnYWRibG9ja2VyL2FkYmxvY2tlcic7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihzZXR0aW5ncykge1xuICAgIHRoaXMud2luZG93ID0gc2V0dGluZ3Mud2luZG93O1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgICBpZiAoYWRiRW5hYmxlZCgpKSB7XG4gICAgICBDbGlxekFEQi5pbml0V2luZG93KHRoaXMud2luZG93KTtcbiAgICAgIHRoaXMud2luZG93LmFkYmluaXQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHVubG9hZCgpIHtcbiAgICBpZiAoYWRiRW5hYmxlZCgpKSB7XG4gICAgICBDbGlxekFEQi51bmxvYWRXaW5kb3codGhpcy53aW5kb3cpO1xuICAgICAgdGhpcy53aW5kb3cuYWRiaW5pdCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUFkYkJ1dHRvbigpIHtcbiAgICBjb25zdCB3aW4gPSB0aGlzLndpbmRvdztcbiAgICBjb25zdCBkb2MgPSB3aW4uZG9jdW1lbnQ7XG4gICAgY29uc3QgYWRiQnRuID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ21lbnUnKTtcbiAgICBjb25zdCBhZGJQb3B1cCA9IGRvYy5jcmVhdGVFbGVtZW50KCdtZW51cG9wdXAnKTtcblxuICAgIGFkYkJ0bi5zZXRBdHRyaWJ1dGUoJ2xhYmVsJywgdXRpbHMuZ2V0TG9jYWxpemVkU3RyaW5nKCdhZGItbWVudS1vcHRpb24nKSk7XG5cbiAgICAvLyB3ZSBtdXN0IGNyZWF0ZSB0aGUgd2hvbGUgQURCIHBvcHVwIGV2ZXJ5IHRpbWUgd2Ugc2hvdyBpdFxuICAgIC8vIGJlY2F1c2UgcGFydHMgb2YgaXQgZGVwZW5kIG9uIHRoZSBjdXJyZW50IFVSTFxuICAgIGFkYlBvcHVwLmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHVwc2hvd2luZycsICgpID0+IHtcbiAgICAgIC8vIGNsZWFuIHRoZSB3aG9sZSBwb3B1cFxuICAgICAgd2hpbGUgKGFkYlBvcHVwLmxhc3RDaGlsZCkge1xuICAgICAgICBhZGJQb3B1cC5yZW1vdmVDaGlsZChhZGJQb3B1cC5sYXN0Q2hpbGQpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjdXJyZW50VVJMID0gd2luLmdCcm93c2VyLmN1cnJlbnRVUkkuc3BlYztcbiAgICAgIGNvbnN0IGFkYkRpc2FibGVkID0gIWFkYkVuYWJsZWQoKTtcblxuICAgICAgY29uc3QgaXNDb3JyZWN0VXJsID0gdXRpbHMuaXNVcmwoY3VycmVudFVSTCk7XG4gICAgICBsZXQgZGlzYWJsZWRGb3JVcmwgPSBmYWxzZTtcbiAgICAgIGxldCBkaXNhYmxlZEZvckRvbWFpbiA9IGZhbHNlO1xuXG4gICAgICAvLyBDaGVjayBpZiBhZGJsb2NrZXIgaXMgZGlzYWJsZWQgb24gdGhpcyBwYWdlXG4gICAgICBpZiAoaXNDb3JyZWN0VXJsKSB7XG4gICAgICAgIGRpc2FibGVkRm9yRG9tYWluID0gQ2xpcXpBREIuYWRCbG9ja2VyLmlzRG9tYWluSW5CbGFja2xpc3QoY3VycmVudFVSTCk7XG4gICAgICAgIGRpc2FibGVkRm9yVXJsID0gQ2xpcXpBREIuYWRCbG9ja2VyLmlzVXJsSW5CbGFja2xpc3QoY3VycmVudFVSTCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRpc2FibGVVcmwgPSBjaGVja0JveChcbiAgICAgICAgZG9jLFxuICAgICAgICAnY2xpcXotYWRiLXVybCcsXG4gICAgICAgIHV0aWxzLmdldExvY2FsaXplZFN0cmluZygnYWRiLW1lbnUtZGlzYWJsZS11cmwnKSxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgKCkgPT4geyBDbGlxekFEQi5hZEJsb2NrZXIudG9nZ2xlVXJsKGN1cnJlbnRVUkwpOyB9LFxuICAgICAgICBkaXNhYmxlZEZvclVybFxuICAgICAgKTtcblxuICAgICAgY29uc3QgZGlzYWJsZURvbWFpbiA9IGNoZWNrQm94KFxuICAgICAgICBkb2MsXG4gICAgICAgICdjbGlxei1hZGItZG9tYWluJyxcbiAgICAgICAgdXRpbHMuZ2V0TG9jYWxpemVkU3RyaW5nKCdhZGItbWVudS1kaXNhYmxlLWRvbWFpbicpLFxuICAgICAgICB0cnVlLFxuICAgICAgICAoKSA9PiB7IENsaXF6QURCLmFkQmxvY2tlci50b2dnbGVVcmwoY3VycmVudFVSTCwgdHJ1ZSk7IH0sXG4gICAgICAgIGRpc2FibGVkRm9yRG9tYWluXG4gICAgICApO1xuXG4gICAgICAvLyBXZSBkaXNhYmxlZCB0aGUgb3B0aW9uIG9mIGFkZGluZyBhIGN1c3RvbSBydWxlIGZvciBVUkxcbiAgICAgIC8vIGluIGNhc2UgdGhlIHdob2xlIGRvbWFpbiBpcyBkaXNhYmxlZFxuICAgICAgZGlzYWJsZVVybC5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgYWRiRGlzYWJsZWQgfHwgZGlzYWJsZWRGb3JEb21haW4gfHwgIWlzQ29ycmVjdFVybCk7XG4gICAgICBkaXNhYmxlRG9tYWluLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCBhZGJEaXNhYmxlZCB8fCAhaXNDb3JyZWN0VXJsKTtcblxuICAgICAgYWRiUG9wdXAuYXBwZW5kQ2hpbGQoZGlzYWJsZVVybCk7XG4gICAgICBhZGJQb3B1cC5hcHBlbmRDaGlsZChkaXNhYmxlRG9tYWluKTtcbiAgICAgIGFkYlBvcHVwLmFwcGVuZENoaWxkKGRvYy5jcmVhdGVFbGVtZW50KCdtZW51c2VwYXJhdG9yJykpO1xuXG4gICAgICBPYmplY3Qua2V5cyhBREJfUFJFRl9WQUxVRVMpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBkb2MuY3JlYXRlRWxlbWVudCgnbWVudWl0ZW0nKTtcblxuICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAnbGFiZWwnLFxuICAgICAgICAgIHV0aWxzLmdldExvY2FsaXplZFN0cmluZyhgYWRiLW1lbnUtb3B0aW9uLSR7bmFtZS50b0xvd2VyQ2FzZSgpfWApKTtcbiAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ21lbnVpdGVtLWljb25pYycpO1xuICAgICAgICBpdGVtLm9wdGlvbiA9IEFEQl9QUkVGX1ZBTFVFU1tuYW1lXTtcblxuICAgICAgICBpZiAodXRpbHMuZ2V0UHJlZihBREJfUFJFRiwgQURCX1BSRUZfVkFMVUVTLkRpc2FibGVkKSA9PT0gaXRlbS5vcHRpb24pIHtcbiAgICAgICAgICBpdGVtLnN0eWxlLmxpc3RTdHlsZUltYWdlID0gYHVybCgke3V0aWxzLlNLSU5fUEFUSH1jaGVja21hcmsucG5nKWA7XG4gICAgICAgIH1cblxuICAgICAgICBpdGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbW1hbmQnLCAoKSA9PiB7XG4gICAgICAgICAgdXRpbHMuc2V0UHJlZihBREJfUFJFRiwgaXRlbS5vcHRpb24pO1xuICAgICAgICAgIGlmIChhZGJFbmFibGVkKCkgJiYgIXdpbi5hZGJpbml0KSB7XG4gICAgICAgICAgICBDbGlxekFEQi5pbml0V2luZG93KHdpbik7XG4gICAgICAgICAgICB3aW4uYWRiaW5pdCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYWRiRW5hYmxlZCgpICYmIHdpbi5hZGJpbml0KSB7XG4gICAgICAgICAgICBDbGlxekFEQi51bmxvYWRXaW5kb3cod2luKTtcbiAgICAgICAgICAgIHdpbi5hZGJpbml0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIHV0aWxzLnRlbGVtZXRyeSh7XG4gICAgICAgICAgICB0eXBlOiAnYWN0aXZpdHknLFxuICAgICAgICAgICAgYWN0aW9uOiAnY2xpcXpfbWVudV9idXR0b24nLFxuICAgICAgICAgICAgYnV0dG9uX25hbWU6IGBhZGJfb3B0aW9uXyR7aXRlbS5vcHRpb259YCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZmFsc2UpO1xuXG4gICAgICAgIGFkYlBvcHVwLmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgfSk7XG5cbiAgICAgIGFkYlBvcHVwLmFwcGVuZENoaWxkKGRvYy5jcmVhdGVFbGVtZW50KCdtZW51c2VwYXJhdG9yJykpO1xuXG4gICAgICBhZGJQb3B1cC5hcHBlbmRDaGlsZChcbiAgICAgICAgc2ltcGxlQnRuKFxuICAgICAgICAgIGRvYyxcbiAgICAgICAgICBDbGlxelV0aWxzLmdldExvY2FsaXplZFN0cmluZygnYWRiLW1lbnUtbW9yZScpLFxuICAgICAgICAgICgpID0+IHsgdXRpbHMub3BlblRhYkluV2luZG93KHdpbiwgJ2h0dHBzOi8vY2xpcXouY29tL3doeWNsaXF6L2FkYmxvY2tpbmcnKTsgfSxcbiAgICAgICAgICAnY2xpcXotYWRiLW1vcmUnXG4gICAgICAgIClcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBhZGJCdG4uYXBwZW5kQ2hpbGQoYWRiUG9wdXApO1xuXG4gICAgcmV0dXJuIGFkYkJ0bjtcbiAgfVxuXG4gIGNyZWF0ZUJ1dHRvbkl0ZW0oKSB7XG4gICAgaWYgKGFkYkFCVGVzdEVuYWJsZWQoKSkge1xuICAgICAgcmV0dXJuIFt0aGlzLmNyZWF0ZUFkYkJ1dHRvbigpXTtcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG4iXX0=