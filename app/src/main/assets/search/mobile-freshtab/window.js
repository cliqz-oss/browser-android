System.register("mobile-freshtab/window", ["core/cliqz", "mobile-freshtab/news"], function (_export) {
  /**
  * @namespace mobile-freshtab
  */
  "use strict";

  var utils, News, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_mobileFreshtabNews) {
      News = _mobileFreshtabNews["default"];
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
            this.window.News = News;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS1mcmVzaHRhYi93aW5kb3cuZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7eUJBQVMsS0FBSzs7Ozs7Ozs7Ozs7O0FBV0QsMEJBQUMsUUFBUSxFQUFFOzs7QUFDckIsY0FBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQzlCOzs7Ozs7OztpQkFJRyxnQkFBRztBQUNOLGdCQUFJLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7V0FDeEI7OztpQkFFSyxrQkFBRyxFQUFFIiwiZmlsZSI6Im1vYmlsZS1mcmVzaHRhYi93aW5kb3cuZXMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1dGlscyB9IGZyb20gXCJjb3JlL2NsaXF6XCI7XG5pbXBvcnQgTmV3cyBmcm9tIFwibW9iaWxlLWZyZXNodGFiL25ld3NcIjtcbi8qKlxuKiBAbmFtZXNwYWNlIG1vYmlsZS1mcmVzaHRhYlxuKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgLyoqXG4gICogQGNsYXNzIFdpbmRvd1xuICAqIEBjb25zdHJ1Y3RvclxuICAqIEBwYXJhbSBzZXR0aW5nc1xuICAqL1xuICBjb25zdHJ1Y3RvcihzZXR0aW5ncykge1xuICBcdHRoaXMud2luZG93ID0gc2V0dGluZ3Mud2luZG93O1xuICB9XG4gIC8qKlxuICAqIEBtZXRob2QgaW5pdFxuICAqL1xuICBpbml0KCkge1xuICBcdHRoaXMud2luZG93Lk5ld3MgPSBOZXdzO1xuICB9XG5cbiAgdW5sb2FkKCkge31cbn1cbiJdfQ==