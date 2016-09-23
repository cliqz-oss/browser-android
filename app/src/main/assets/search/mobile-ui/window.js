System.register("mobile-ui/window", ["core/cliqz", "mobile-ui/UI"], function (_export) {

  /**
  * @namespace mobile-ui
  */
  "use strict";

  var utils, UI, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_mobileUiUI) {
      UI = _mobileUiUI["default"];
    }],
    execute: function () {
      _default = (function () {
        /**
        * @class Window
        * @constructor
        * @param settings
        */

        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        /**
        * @method init
        */

        _createClass(_default, [{
          key: "init",
          value: function init() {
            window.CLIQZ.UI = UI;
            window.CLIQZ.UI.init();
          }
        }, {
          key: "unload",
          value: function unload() {}
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});