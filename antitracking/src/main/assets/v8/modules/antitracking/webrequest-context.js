System.register('antitracking/webrequest-context', [], function (_export) {
  'use strict';

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default(requestDetails) {
          _classCallCheck(this, _default);

          this.details = requestDetails;
          this.url = requestDetails.url;
          this.method = requestDetails.method;
          this.channel = {
            responseStatus: requestDetails.responseStatus
          };
          this.isCached = requestDetails.isCached;
        }

        _createClass(_default, [{
          key: 'getInnerWindowID',
          value: function getInnerWindowID() {
            return this.details.frameId;
          }
        }, {
          key: 'getOuterWindowID',
          value: function getOuterWindowID() {
            return this.details.frameId;
          }
        }, {
          key: 'getParentWindowID',
          value: function getParentWindowID() {
            return this.details.parentFrameId || this.getOriginWindowID();
          }
        }, {
          key: 'getLoadingDocument',
          value: function getLoadingDocument() {
            return this.details.originUrl;
          }
        }, {
          key: 'getContentPolicyType',
          value: function getContentPolicyType() {
            return this.details.type;
          }
        }, {
          key: 'isFullPage',
          value: function isFullPage() {
            return this.getContentPolicyType() === 6;
          }
        }, {
          key: 'getCookieData',
          value: function getCookieData() {
            return this.getRequestHeader('Cookie');
          }
        }, {
          key: 'getReferrer',
          value: function getReferrer() {
            return this.getRequestHeader('Referer');
          }
        }, {
          key: 'getSourceURL',
          value: function getSourceURL() {
            return this.details.originUrl;
          }
        }, {
          key: 'getRequestHeader',
          value: function getRequestHeader(header) {
            return this.details.getRequestHeader(header);
          }
        }, {
          key: 'getResponseHeader',
          value: function getResponseHeader(header) {
            return this.details.getResponseHeader(header);
          }
        }, {
          key: 'getOriginWindowID',
          value: function getOriginWindowID() {
            return this.details.tabId;
          }
        }, {
          key: 'isChannelPrivate',
          value: function isChannelPrivate() {
            return this.details.isPrivate;
          }
        }, {
          key: 'getPostData',
          value: function getPostData() {
            return this.details.getPostData();
          }
        }, {
          key: 'getWindowDepth',
          value: function getWindowDepth() {
            var windowDepth = 0;
            if (this.getInnerWindowID() !== this.getOriginWindowID()) {
              if (this.getOriginWindowID() === this.getParentWindowID()) {
                // frame in document
                windowDepth = 1;
              } else {
                // deeper than 1st level iframe
                windowDepth = 2;
              }
            }
            return windowDepth;
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});