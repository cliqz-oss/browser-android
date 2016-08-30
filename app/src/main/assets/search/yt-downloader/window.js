System.register("yt-downloader/window", ["yt-downloader/main"], function (_export) {
  "use strict";

  var findVideoLinks, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_ytDownloaderMain) {
      findVideoLinks = _ytDownloaderMain.findVideoLinks;
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
            this.window.ytdownloader = { findVideoLinks: findVideoLinks };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInl0LWRvd25sb2FkZXIvd2luZG93LmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O3lDQUFTLGNBQWM7Ozs7QUFHViwwQkFBQyxRQUFRLEVBQUU7OztBQUNyQixjQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDOUI7Ozs7aUJBRUcsZ0JBQUc7QUFDTixnQkFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsRUFBRSxjQUFjLEVBQWQsY0FBYyxFQUFFLENBQUM7V0FDOUM7OztpQkFFSyxrQkFBRyxFQUVSIiwiZmlsZSI6Inl0LWRvd25sb2FkZXIvd2luZG93LmVzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZmluZFZpZGVvTGlua3MgfSBmcm9tIFwieXQtZG93bmxvYWRlci9tYWluXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgY29uc3RydWN0b3Ioc2V0dGluZ3MpIHtcbiAgXHR0aGlzLndpbmRvdyA9IHNldHRpbmdzLndpbmRvdztcbiAgfVxuXG4gIGluaXQoKSB7XG4gIFx0dGhpcy53aW5kb3cueXRkb3dubG9hZGVyID0geyBmaW5kVmlkZW9MaW5rcyB9O1xuICB9XG5cbiAgdW5sb2FkKCkge1xuXG4gIH1cbn1cbiJdfQ==