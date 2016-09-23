System.register("autocomplete/window", ["autocomplete/autocomplete", "autocomplete/result-providers", "core/cliqz"], function (_export) {
  "use strict";

  var autocomplete, CliqzResultProviders, utils, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_autocompleteAutocomplete) {
      autocomplete = _autocompleteAutocomplete["default"];
    }, function (_autocompleteResultProviders) {
      CliqzResultProviders = _autocompleteResultProviders["default"];
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _default = (function () {
        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        _createClass(_default, [{
          key: "init",
          value: function init() {
            this.window.CliqzAutocomplete = autocomplete;
          }
        }, {
          key: "unload",
          value: function unload() {
            delete this.window.CliqzAutocomplete;
          }
        }, {
          key: "createButtonItem",
          value: function createButtonItem() {
            if (utils.getPref("cliqz_core_disabled", false)) return;

            var doc = this.window.document,
                menu = doc.createElement('menu'),
                menupopup = doc.createElement('menupopup'),
                engines = CliqzResultProviders.getSearchEngines(),
                def = Services.search.currentEngine.name;

            menu.setAttribute('label', utils.getLocalizedString('btnDefaultSearchEngine'));

            for (var i in engines) {

              var engine = engines[i],
                  item = doc.createElement('menuitem');
              item.setAttribute('label', '[' + engine.prefix + '] ' + engine.name);
              item.setAttribute('class', 'menuitem-iconic');
              item.engineName = engine.name;
              if (engine.name == def) {
                item.style.listStyleImage = 'url(' + utils.SKIN_PATH + 'checkmark.png)';
              }
              // TODO: Where is this listener removed?
              item.addEventListener('command', (function (event) {
                CliqzResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
                utils.telemetry({
                  type: 'activity',
                  action: 'cliqz_menu_button',
                  button_name: 'search_engine_change_' + event.currentTarget.engineName
                });
              }).bind(this), false);

              menupopup.appendChild(item);
            }

            menu.appendChild(menupopup);

            return menu;
          }
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});