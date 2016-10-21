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