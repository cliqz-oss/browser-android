System.register("mobile-history/window", ["core/cliqz", "mobile-history/history"], function (_export) {

  /**
  * @namespace mobile-history
  */
  "use strict";

  var utils, History, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_mobileHistoryHistory) {
      History = _mobileHistoryHistory["default"];
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
            this.window.History = History;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS1oaXN0b3J5L3dpbmRvdy5lcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7eUJBQVMsS0FBSzs7Ozs7Ozs7Ozs7O0FBWUQsMEJBQUMsUUFBUSxFQUFFOzs7QUFDckIsY0FBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQzlCOzs7Ozs7OztpQkFJRyxnQkFBRztBQUNOLGdCQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7V0FDOUI7OztpQkFFSyxrQkFBRyxFQUFFIiwiZmlsZSI6Im1vYmlsZS1oaXN0b3J5L3dpbmRvdy5lcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHV0aWxzIH0gZnJvbSBcImNvcmUvY2xpcXpcIjtcbmltcG9ydCBIaXN0b3J5IGZyb20gXCJtb2JpbGUtaGlzdG9yeS9oaXN0b3J5XCI7XG5cbi8qKlxuKiBAbmFtZXNwYWNlIG1vYmlsZS1oaXN0b3J5XG4qL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICAvKipcbiAgKiBAY2xhc3MgV2luZG93XG4gICogQGNvbnN0cnVjdG9yXG4gICogQHBhcmFtIHNldHRpbmdzXG4gICovXG4gIGNvbnN0cnVjdG9yKHNldHRpbmdzKSB7XG4gIFx0dGhpcy53aW5kb3cgPSBzZXR0aW5ncy53aW5kb3c7XG4gIH1cbiAgLyoqXG4gICogQG1ldGhvZCBpbml0XG4gICovXG4gIGluaXQoKSB7XG4gIFx0dGhpcy53aW5kb3cuSGlzdG9yeSA9IEhpc3Rvcnk7XG4gIH1cblxuICB1bmxvYWQoKSB7fVxufVxuIl19