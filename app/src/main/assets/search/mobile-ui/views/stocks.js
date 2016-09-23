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