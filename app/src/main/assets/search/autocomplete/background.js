System.register("autocomplete/background", ["core/cliqz", "core/platform", "autocomplete/autocomplete", "autocomplete/spell-check", "autocomplete/history-cluster", "autocomplete/result-providers", "autocomplete/smart-cliqz-cache/smart-cliqz-cache", "autocomplete/smart-cliqz-cache/trigger-url-cache", "autocomplete/result", "autocomplete/wikipedia-deduplication", "autocomplete/mixer"], function (_export) {
  "use strict";

  var utils, isFirefox, autocomplete, SpellCheck, historyCluster, ResultProviders, SmartCliqzCache, TriggerUrlCache, Result, WikipediaDeduplication, Mixer, AutocompleteComponent;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function onReady() {
    return new Promise(function (resolve) {
      if (isFirefox && Services.search && Services.search.init) {
        Services.search.init(resolve);
      } else {
        resolve();
      }
    });
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_corePlatform) {
      isFirefox = _corePlatform.isFirefox;
    }, function (_autocompleteAutocomplete) {
      autocomplete = _autocompleteAutocomplete["default"];
    }, function (_autocompleteSpellCheck) {
      SpellCheck = _autocompleteSpellCheck["default"];
    }, function (_autocompleteHistoryCluster) {
      historyCluster = _autocompleteHistoryCluster["default"];
    }, function (_autocompleteResultProviders) {
      ResultProviders = _autocompleteResultProviders["default"];
    }, function (_autocompleteSmartCliqzCacheSmartCliqzCache) {
      SmartCliqzCache = _autocompleteSmartCliqzCacheSmartCliqzCache["default"];
    }, function (_autocompleteSmartCliqzCacheTriggerUrlCache) {
      TriggerUrlCache = _autocompleteSmartCliqzCacheTriggerUrlCache["default"];
    }, function (_autocompleteResult) {
      Result = _autocompleteResult["default"];
    }, function (_autocompleteWikipediaDeduplication) {
      WikipediaDeduplication = _autocompleteWikipediaDeduplication["default"];
    }, function (_autocompleteMixer) {
      Mixer = _autocompleteMixer["default"];
    }],
    execute: function () {
      AutocompleteComponent = (function () {
        function AutocompleteComponent() {
          _classCallCheck(this, AutocompleteComponent);

          this.reg = Cm.QueryInterface(Ci.nsIComponentRegistrar);
          this.FFcontract = {
            classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
            classDescription: 'Cliqz',
            contractID: '@mozilla.org/autocomplete/search;1?name=cliqz-results',
            QueryInterface: XPCOMUtils.generateQI([Ci.nsIAutoCompleteSearch])
          };
        }

        _createClass(AutocompleteComponent, [{
          key: "unregister",
          value: function unregister() {
            try {
              this.reg.unregisterFactory(this.reg.contractIDToCID(this.FFcontract.contractID), this.reg.getClassObjectByContractID(this.FFcontract.contractID, Ci.nsISupports));
            } catch (e) {}
          }
        }, {
          key: "register",
          value: function register() {
            Object.assign(autocomplete.CliqzResults.prototype, this.FFcontract);
            var cp = autocomplete.CliqzResults.prototype;
            var factory = XPCOMUtils.generateNSGetFactory([autocomplete.CliqzResults])(cp.classID);
            this.reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);
          }
        }]);

        return AutocompleteComponent;
      })();

      _export("default", {

        init: function init(settings) {
          var _this = this;

          return onReady().then(function () {
            ResultProviders.init();
            autocomplete.CliqzResultProviders = ResultProviders;

            SpellCheck.init();
            autocomplete.CliqzHistoryCluster = historyCluster;

            _this.smartCliqzCache = new SmartCliqzCache();
            _this.triggerUrlCache = new TriggerUrlCache();
            _this.triggerUrlCache.init();

            if (isFirefox) {
              Mixer.init({
                smartCliqzCache: _this.smartCliqzCache,
                triggerUrlCache: _this.triggerUrlCache
              });
              _this.autocompleteComponent = new AutocompleteComponent();
              _this.autocompleteComponent.unregister();
              _this.autocompleteComponent.register();

              utils.RERANKERS.push(WikipediaDeduplication);
            } else {
              Mixer.init();
            }
            autocomplete.Mixer = Mixer;

            // glueing stuff
            autocomplete.spellCheck = SpellCheck;
            utils.autocomplete = autocomplete;

            utils.registerResultProvider({
              ResultProviders: ResultProviders,
              Result: Result
            });
          });
        },

        unload: function unload() {
          if (isFirefox) {
            this.autocompleteComponent.unregister();
          }

          this.smartCliqzCache.unload();
          this.triggerUrlCache.unload();
        },

        beforeBrowserShutdown: function beforeBrowserShutdown() {}
      });
    }
  };
});