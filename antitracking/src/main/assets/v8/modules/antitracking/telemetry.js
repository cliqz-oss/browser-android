System.register("antitracking/telemetry", ["core/cliqz"], function (_export) {
  "use strict";

  var utils;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _export("default", {
        telemetry: function telemetry(payl) {
          utils.log("No telemetry provider loaded", "attrack");
        },

        msgType: 'humanweb',

        loadFromProvider: function loadFromProvider(provider) {
          var _this = this;

          utils.log("Load telemetry provider: " + provider, "attrack");
          System["import"](provider).then(function (mod) {
            _this.telemetry = mod["default"].telemetry.bind(mod);
            _this.msgType = mod["default"].msgType;
          });
        }
      });
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy90ZWxlbWV0cnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O3lCQUFTLEtBQUs7Ozt5QkFFQztBQUNiLGlCQUFTLEVBQUUsbUJBQVMsSUFBSSxFQUFFO0FBQ3hCLGVBQUssQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDdEQ7O0FBRUQsZUFBTyxFQUFFLFVBQVU7O0FBRW5CLHdCQUFnQixFQUFFLDBCQUFTLFFBQVEsRUFBRTs7O0FBQ25DLGVBQUssQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEdBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzVELGdCQUFNLFVBQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFHLEVBQUs7QUFDcEMsa0JBQUssU0FBUyxHQUFHLEdBQUcsV0FBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDakQsa0JBQUssT0FBTyxHQUFHLEdBQUcsV0FBUSxDQUFDLE9BQU8sQ0FBQztXQUNwQyxDQUFDLENBQUM7U0FDSjtPQUNGIiwiZmlsZSI6ImFudGl0cmFja2luZy90ZWxlbWV0cnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1dGlscyB9IGZyb20gJ2NvcmUvY2xpcXonO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHRlbGVtZXRyeTogZnVuY3Rpb24ocGF5bCkge1xuICAgIHV0aWxzLmxvZyhcIk5vIHRlbGVtZXRyeSBwcm92aWRlciBsb2FkZWRcIiwgXCJhdHRyYWNrXCIpO1xuICB9LFxuXG4gIG1zZ1R5cGU6ICdodW1hbndlYicsXG5cbiAgbG9hZEZyb21Qcm92aWRlcjogZnVuY3Rpb24ocHJvdmlkZXIpIHtcbiAgICB1dGlscy5sb2coXCJMb2FkIHRlbGVtZXRyeSBwcm92aWRlcjogXCIrIHByb3ZpZGVyLCBcImF0dHJhY2tcIik7XG4gICAgU3lzdGVtLmltcG9ydChwcm92aWRlcikudGhlbigobW9kKSA9PiB7XG4gICAgICB0aGlzLnRlbGVtZXRyeSA9IG1vZC5kZWZhdWx0LnRlbGVtZXRyeS5iaW5kKG1vZCk7XG4gICAgICB0aGlzLm1zZ1R5cGUgPSBtb2QuZGVmYXVsdC5tc2dUeXBlO1xuICAgIH0pO1xuICB9XG59O1xuIl19