System.register('antitracking/cookie-checker', ['antitracking/url', 'antitracking/domain', 'core/cliqz'], function (_export) {
  'use strict';

  var URLInfo, getGeneralDomain, utils, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_antitrackingUrl) {
      URLInfo = _antitrackingUrl.URLInfo;
    }, function (_antitrackingDomain) {
      getGeneralDomain = _antitrackingDomain.getGeneralDomain;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);

          this.contextFromEvent = null;
        }

        _createClass(_default, [{
          key: 'setContextFromEvent',
          value: function setContextFromEvent(ev, contextHTML) {
            try {
              if (contextHTML) {
                this.contextFromEvent = {
                  html: contextHTML,
                  ts: Date.now(),
                  gDM: getGeneralDomain(URLInfo.get(ev.target.baseURI).hostname)
                };
              }
            } catch (ee) {
              this.contextFromEvent = null;
            }
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9jb29raWUtY2hlY2tlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztpQ0FBUyxPQUFPOzs2Q0FDUCxnQkFBZ0I7O3lCQUNoQixLQUFLOzs7O0FBR0QsNEJBQUc7OztBQUNaLGNBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7U0FDOUI7Ozs7aUJBRWtCLDZCQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUU7QUFDbkMsZ0JBQUk7QUFDRixrQkFBSSxXQUFXLEVBQUU7QUFDZixvQkFBSSxDQUFDLGdCQUFnQixHQUFHO0FBQ3RCLHNCQUFJLEVBQUUsV0FBVztBQUNqQixvQkFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7QUFDZCxxQkFBRyxFQUFFLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUM7aUJBQy9ELENBQUM7ZUFDSDthQUNGLENBQUMsT0FBTSxFQUFFLEVBQUU7QUFDVixrQkFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQzthQUM5QjtXQUNGIiwiZmlsZSI6ImFudGl0cmFja2luZy9jb29raWUtY2hlY2tlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFVSTEluZm8gfSBmcm9tICdhbnRpdHJhY2tpbmcvdXJsJztcbmltcG9ydCB7IGdldEdlbmVyYWxEb21haW4gfSBmcm9tICdhbnRpdHJhY2tpbmcvZG9tYWluJztcbmltcG9ydCB7IHV0aWxzIH0gZnJvbSBcImNvcmUvY2xpcXpcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmNvbnRleHRGcm9tRXZlbnQgPSBudWxsO1xuICB9XG5cbiAgc2V0Q29udGV4dEZyb21FdmVudChldiwgY29udGV4dEhUTUwpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKGNvbnRleHRIVE1MKSB7XG4gICAgICAgIHRoaXMuY29udGV4dEZyb21FdmVudCA9IHtcbiAgICAgICAgICBodG1sOiBjb250ZXh0SFRNTCxcbiAgICAgICAgICB0czogRGF0ZS5ub3coKSxcbiAgICAgICAgICBnRE06IGdldEdlbmVyYWxEb21haW4oVVJMSW5mby5nZXQoZXYudGFyZ2V0LmJhc2VVUkkpLmhvc3RuYW1lKVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gY2F0Y2goZWUpIHtcbiAgICAgIHRoaXMuY29udGV4dEZyb21FdmVudCA9IG51bGw7XG4gICAgfVxuICB9XG59XG4iXX0=