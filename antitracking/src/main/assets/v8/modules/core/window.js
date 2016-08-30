System.register("core/window", ["core/storage", "core/utils", "core/ab-tests"], function (_export) {
  "use strict";

  var Storage, utils, ABTests, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreStorage) {
      Storage = _coreStorage["default"];
    }, function (_coreUtils) {
      utils = _coreUtils["default"];
    }, function (_coreAbTests) {
      ABTests = _coreAbTests["default"];
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
            ABTests.check();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvd2luZG93LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFNYSwwQkFBQyxRQUFRLEVBQUU7OztBQUNyQixjQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDOUI7Ozs7aUJBRUcsZ0JBQUc7QUFDTCxtQkFBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1dBQ2pCOzs7aUJBRUssa0JBQUcsRUFDUiIsImZpbGUiOiJjb3JlL3dpbmRvdy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTdG9yYWdlIGZyb20gXCJjb3JlL3N0b3JhZ2VcIjtcbmltcG9ydCB1dGlscyBmcm9tIFwiY29yZS91dGlsc1wiO1xuaW1wb3J0IEFCVGVzdHMgZnJvbSBcImNvcmUvYWItdGVzdHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuXG4gIGNvbnN0cnVjdG9yKHNldHRpbmdzKSB7XG4gIFx0dGhpcy53aW5kb3cgPSBzZXR0aW5ncy53aW5kb3c7XG4gIH1cblxuICBpbml0KCkge1xuICAgIEFCVGVzdHMuY2hlY2soKTtcbiAgfVxuXG4gIHVubG9hZCgpIHtcbiAgfVxufVxuIl19