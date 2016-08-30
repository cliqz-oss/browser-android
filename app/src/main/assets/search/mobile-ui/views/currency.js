System.register("mobile-ui/views/currency", [], function (_export) {
    "use strict";

    var _default;

    var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function getNumValue(value) {
        return isNaN(value) || value <= 0 ? 0 : value - 0; // rounding value
    }

    function updateCurrencyTpl(data) {
        document.getElementById("currency-tpl").innerHTML = CliqzHandlebars.tplCache.currency({ data: data });
    }

    return {
        setters: [],
        execute: function () {
            _default = (function () {
                function _default() {
                    _classCallCheck(this, _default);
                }

                _createClass(_default, [{
                    key: "enhanceResults",
                    value: function enhanceResults(data) {}
                }, {
                    key: "switchCurrency",
                    value: function switchCurrency(data) {
                        var fromInput = document.getElementById("fromInput");

                        var convRate = 1 / data.mConversionRate;
                        data.mConversionRate = convRate + "";
                        convRate *= data.multiplyer;
                        var fromValue = getNumValue(parseFloat(fromInput.value));
                        data.toAmount.main = getNumValue(fromValue * convRate);
                        data.fromAmount = fromValue;

                        var temp = data.fromCurrency;
                        data.fromCurrency = data.toCurrency;
                        data.toCurrency = temp;

                        temp = data.formSymbol;
                        data.formSymbol = data.toSymbol;
                        data.toSymbol = temp;

                        data.multiplyer = 1 / data.multiplyer;

                        updateCurrencyTpl(data);
                    }
                }, {
                    key: "updateFromValue",
                    value: function updateFromValue(data) {
                        var fromInput = document.getElementById("fromInput");
                        var toInput = document.getElementById("toInput");
                        var toAmount = document.getElementById("calc-answer");
                        var toValue = getNumValue(fromInput.value / data.multiplyer * data.mConversionRate).toFixed(2) - 0;
                        toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
                        toInput.value = toValue;
                    }
                }, {
                    key: "updateToValue",
                    value: function updateToValue(data) {
                        var fromInput = document.getElementById("fromInput");
                        var toInput = document.getElementById("toInput");
                        var toAmount = document.getElementById("calc-answer");
                        var toValue = getNumValue(toInput.value);
                        var fromValue = getNumValue(toValue * data.multiplyer / data.mConversionRate).toFixed(2);
                        toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
                        fromInput.value = fromValue;
                    }
                }]);

                return _default;
            })();

            _export("default", _default);

            ;
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS11aS92aWV3cy9jdXJyZW5jeS5lcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxhQUFTLFdBQVcsQ0FBQyxLQUFLLEVBQUU7QUFDeEIsZUFBUSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBRTtLQUN2RDs7QUFFRCxhQUFTLGlCQUFpQixDQUFDLElBQUksRUFBRTtBQUM3QixnQkFBUSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztLQUN2Rzs7Ozs7Ozs7Ozs7OzJCQUdpQix3QkFBQyxJQUFJLEVBQUUsRUFDcEI7OzsyQkFFYSx3QkFBQyxJQUFJLEVBQUU7QUFDakIsNEJBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7O0FBRXJELDRCQUFJLFFBQVEsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztBQUN4Qyw0QkFBSSxDQUFDLGVBQWUsR0FBRyxRQUFRLEdBQUcsRUFBRSxDQUFDO0FBQ3JDLGdDQUFRLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQztBQUM1Qiw0QkFBSSxTQUFTLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN6RCw0QkFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQztBQUN2RCw0QkFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7O0FBRTVCLDRCQUFJLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0FBQzdCLDRCQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7QUFDcEMsNEJBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDOztBQUV2Qiw0QkFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7QUFDdkIsNEJBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNoQyw0QkFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7O0FBRXJCLDRCQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDOztBQUV0Qyx5Q0FBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDM0I7OzsyQkFFYyx5QkFBQyxJQUFJLEVBQUU7QUFDbEIsNEJBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckQsNEJBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakQsNEJBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDdEQsNEJBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkcsZ0NBQVEsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzRSwrQkFBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7cUJBQzNCOzs7MkJBRVksdUJBQUMsSUFBSSxFQUFFO0FBQ2hCLDRCQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3JELDRCQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2pELDRCQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3RELDRCQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pDLDRCQUFJLFNBQVMsR0FBRyxXQUFXLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RixnQ0FBUSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNFLGlDQUFTLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQztxQkFDL0I7Ozs7Ozs7O0FBQ0osYUFBQyIsImZpbGUiOiJtb2JpbGUtdWkvdmlld3MvY3VycmVuY3kuZXMiLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBnZXROdW1WYWx1ZSh2YWx1ZSkge1xuICAgIHJldHVybiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlIDw9IDAgPyAwIDogdmFsdWUgLSAwKTsgLy8gcm91bmRpbmcgdmFsdWVcbn1cblxuZnVuY3Rpb24gdXBkYXRlQ3VycmVuY3lUcGwoZGF0YSkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3VycmVuY3ktdHBsXCIpLmlubmVySFRNTCA9IENsaXF6SGFuZGxlYmFycy50cGxDYWNoZS5jdXJyZW5jeSh7ZGF0YTogZGF0YX0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gICAgZW5oYW5jZVJlc3VsdHMoZGF0YSkge1xuICAgIH1cblxuICAgIHN3aXRjaEN1cnJlbmN5KGRhdGEpIHtcbiAgICAgICAgdmFyIGZyb21JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZnJvbUlucHV0XCIpO1xuXG4gICAgICAgIHZhciBjb252UmF0ZSA9IDEgLyBkYXRhLm1Db252ZXJzaW9uUmF0ZTtcbiAgICAgICAgZGF0YS5tQ29udmVyc2lvblJhdGUgPSBjb252UmF0ZSArIFwiXCI7XG4gICAgICAgIGNvbnZSYXRlICo9IGRhdGEubXVsdGlwbHllcjtcbiAgICAgICAgdmFyIGZyb21WYWx1ZSA9IGdldE51bVZhbHVlKHBhcnNlRmxvYXQoZnJvbUlucHV0LnZhbHVlKSk7XG4gICAgICAgIGRhdGEudG9BbW91bnQubWFpbiA9IGdldE51bVZhbHVlKGZyb21WYWx1ZSAqIGNvbnZSYXRlKTtcbiAgICAgICAgZGF0YS5mcm9tQW1vdW50ID0gZnJvbVZhbHVlO1xuXG4gICAgICAgIHZhciB0ZW1wID0gZGF0YS5mcm9tQ3VycmVuY3k7XG4gICAgICAgIGRhdGEuZnJvbUN1cnJlbmN5ID0gZGF0YS50b0N1cnJlbmN5O1xuICAgICAgICBkYXRhLnRvQ3VycmVuY3kgPSB0ZW1wO1xuXG4gICAgICAgIHRlbXAgPSBkYXRhLmZvcm1TeW1ib2w7XG4gICAgICAgIGRhdGEuZm9ybVN5bWJvbCA9IGRhdGEudG9TeW1ib2w7XG4gICAgICAgIGRhdGEudG9TeW1ib2wgPSB0ZW1wO1xuXG4gICAgICAgIGRhdGEubXVsdGlwbHllciA9IDEgLyBkYXRhLm11bHRpcGx5ZXI7XG5cbiAgICAgICAgdXBkYXRlQ3VycmVuY3lUcGwoZGF0YSk7XG4gICAgfVxuXG4gICAgdXBkYXRlRnJvbVZhbHVlKGRhdGEpIHtcbiAgICAgICAgdmFyIGZyb21JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZnJvbUlucHV0XCIpO1xuICAgICAgICB2YXIgdG9JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9JbnB1dFwiKTtcbiAgICAgICAgdmFyIHRvQW1vdW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYWxjLWFuc3dlclwiKTtcbiAgICAgICAgdmFyIHRvVmFsdWUgPSBnZXROdW1WYWx1ZShmcm9tSW5wdXQudmFsdWUgLyBkYXRhLm11bHRpcGx5ZXIgKiBkYXRhLm1Db252ZXJzaW9uUmF0ZSkudG9GaXhlZCgyKSAtIDA7XG4gICAgICAgIHRvQW1vdW50LmlubmVyVGV4dCA9IHRvVmFsdWUudG9Mb2NhbGVTdHJpbmcoQ2xpcXpVdGlscy5QUkVGRVJSRURfTEFOR1VBR0UpO1xuICAgICAgICB0b0lucHV0LnZhbHVlID0gdG9WYWx1ZTtcbiAgICB9XG5cbiAgICB1cGRhdGVUb1ZhbHVlKGRhdGEpIHtcbiAgICAgICAgdmFyIGZyb21JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZnJvbUlucHV0XCIpO1xuICAgICAgICB2YXIgdG9JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9JbnB1dFwiKTtcbiAgICAgICAgdmFyIHRvQW1vdW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYWxjLWFuc3dlclwiKTtcbiAgICAgICAgdmFyIHRvVmFsdWUgPSBnZXROdW1WYWx1ZSh0b0lucHV0LnZhbHVlKTtcbiAgICAgICAgdmFyIGZyb21WYWx1ZSA9IGdldE51bVZhbHVlKHRvVmFsdWUgKiBkYXRhLm11bHRpcGx5ZXIgLyBkYXRhLm1Db252ZXJzaW9uUmF0ZSkudG9GaXhlZCgyKTtcbiAgICAgICAgdG9BbW91bnQuaW5uZXJUZXh0ID0gdG9WYWx1ZS50b0xvY2FsZVN0cmluZyhDbGlxelV0aWxzLlBSRUZFUlJFRF9MQU5HVUFHRSk7XG4gICAgICAgIGZyb21JbnB1dC52YWx1ZSA9IGZyb21WYWx1ZTtcbiAgICB9XG59O1xuIl19