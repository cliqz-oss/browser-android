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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS11aS93aW5kb3cuZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O3lCQUFTLEtBQUs7Ozs7Ozs7Ozs7OztBQVlELDBCQUFDLFFBQVEsRUFBRTs7O0FBQ3JCLGNBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUM5Qjs7Ozs7Ozs7aUJBSUcsZ0JBQUc7QUFDTixrQkFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLGtCQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztXQUN2Qjs7O2lCQUVLLGtCQUFHLEVBQUUiLCJmaWxlIjoibW9iaWxlLXVpL3dpbmRvdy5lcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHV0aWxzIH0gZnJvbSBcImNvcmUvY2xpcXpcIjtcbmltcG9ydCBVSSBmcm9tIFwibW9iaWxlLXVpL1VJXCI7XG5cbi8qKlxuKiBAbmFtZXNwYWNlIG1vYmlsZS11aVxuKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgLyoqXG4gICogQGNsYXNzIFdpbmRvd1xuICAqIEBjb25zdHJ1Y3RvclxuICAqIEBwYXJhbSBzZXR0aW5nc1xuICAqL1xuICBjb25zdHJ1Y3RvcihzZXR0aW5ncykge1xuICBcdHRoaXMud2luZG93ID0gc2V0dGluZ3Mud2luZG93O1xuICB9XG4gIC8qKlxuICAqIEBtZXRob2QgaW5pdFxuICAqL1xuICBpbml0KCkge1xuICBcdHdpbmRvdy5DTElRWi5VSSA9IFVJO1xuICBcdHdpbmRvdy5DTElRWi5VSS5pbml0KCk7XG4gIH1cblxuICB1bmxvYWQoKSB7fVxufVxuIl19