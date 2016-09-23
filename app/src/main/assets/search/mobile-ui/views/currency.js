System.register("mobile-ui/views/currency", ["core/templates"], function (_export) {
    "use strict";

    var CliqzHandlebars, _default;

    var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function getNumValue(value) {
        return isNaN(value) || value <= 0 ? 0 : value - 0; // rounding value
    }

    function updateCurrencyTpl(data) {
        document.getElementById("currency-tpl").innerHTML = CliqzHandlebars.tplCache.currency({ data: data });
    }

    return {
        setters: [function (_coreTemplates) {
            CliqzHandlebars = _coreTemplates["default"];
        }],
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