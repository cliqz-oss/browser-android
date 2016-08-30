System.register("core/window", ["core/storage"], function (_export) {
  "use strict";

  var Storage, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreStorage) {
      Storage = _coreStorage["default"];
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
            this.window.CLIQZ.CliqzStorage = new Storage();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvd2luZG93LmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUlhLDBCQUFDLFFBQVEsRUFBRTs7O0FBQ3JCLGNBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUM5Qjs7OztpQkFFRyxnQkFBRztBQUNOLGdCQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztXQUMvQzs7O2lCQUVLLGtCQUFHLEVBQ1IiLCJmaWxlIjoiY29yZS93aW5kb3cuZXMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU3RvcmFnZSBmcm9tIFwiY29yZS9zdG9yYWdlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcblxuICBjb25zdHJ1Y3RvcihzZXR0aW5ncykge1xuICBcdHRoaXMud2luZG93ID0gc2V0dGluZ3Mud2luZG93O1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgXHR0aGlzLndpbmRvdy5DTElRWi5DbGlxelN0b3JhZ2UgPSBuZXcgU3RvcmFnZSgpO1xuICB9XG5cbiAgdW5sb2FkKCkge1xuICB9XG59XG4iXX0=