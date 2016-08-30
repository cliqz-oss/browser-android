System.register('mobile-ui/views/weatherEZ', [], function (_export) {
  'use strict';

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: 'enhanceResults',
          value: function enhanceResults(data) {
            if (data.forecast_url) {
              data.btns = [{
                'title_key': 'extended_forecast',
                'url': data.forecast_url
              }];
            }
          }
        }]);

        return _default;
      })();

      _export('default', _default);

      ;
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS11aS92aWV3cy93ZWF0aGVyRVouZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztpQkFDZ0Isd0JBQUMsSUFBSSxFQUFFO0FBQ25CLGdCQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7QUFDckIsa0JBQUksQ0FBQyxJQUFJLEdBQUcsQ0FDVjtBQUNFLDJCQUFXLEVBQUUsbUJBQW1CO0FBQ2hDLHFCQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVk7ZUFDekIsQ0FDRixDQUFDO2FBQ0g7V0FDRjs7Ozs7Ozs7QUFDRixPQUFDIiwiZmlsZSI6Im1vYmlsZS11aS92aWV3cy93ZWF0aGVyRVouZXMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGVuaGFuY2VSZXN1bHRzKGRhdGEpIHtcbiAgICBpZiAoZGF0YS5mb3JlY2FzdF91cmwpIHtcbiAgICAgIGRhdGEuYnRucyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICd0aXRsZV9rZXknOiAnZXh0ZW5kZWRfZm9yZWNhc3QnLFxuICAgICAgICAgICd1cmwnOiBkYXRhLmZvcmVjYXN0X3VybFxuICAgICAgICB9XG4gICAgICBdO1xuICAgIH1cbiAgfVxufTtcbiJdfQ==