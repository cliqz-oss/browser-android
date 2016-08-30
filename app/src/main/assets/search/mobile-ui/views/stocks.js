System.register("mobile-ui/views/stocks", [], function (_export) {
  "use strict";

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: "enhanceResults",
          value: function enhanceResults(data) {
            var myTime = new Date(data.message.last_update * 1000);
            data.message.time_string = myTime.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
          }
        }]);

        return _default;
      })();

      _export("default", _default);

      ;
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS11aS92aWV3cy9zdG9ja3MuZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztpQkFDZ0Isd0JBQUMsSUFBSSxFQUFFO0FBQ25CLGdCQUFJLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUN2RCxnQkFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztXQUMzRjs7Ozs7Ozs7QUFDRixPQUFDIiwiZmlsZSI6Im1vYmlsZS11aS92aWV3cy9zdG9ja3MuZXMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGVuaGFuY2VSZXN1bHRzKGRhdGEpIHtcbiAgICB2YXIgbXlUaW1lID0gbmV3IERhdGUoZGF0YS5tZXNzYWdlLmxhc3RfdXBkYXRlICogMTAwMCk7XG4gICAgZGF0YS5tZXNzYWdlLnRpbWVfc3RyaW5nID0gbXlUaW1lLnRvVGltZVN0cmluZygpLnJlcGxhY2UoLy4qKFxcZHsyfTpcXGR7Mn06XFxkezJ9KS4qLywgXCIkMVwiKTtcbiAgfVxufTtcbiJdfQ==