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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy93ZWJyZXF1ZXN0LWNvbnRleHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUdhLDBCQUFDLGNBQWMsRUFBRTs7O0FBQzFCLGNBQUksQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDO0FBQzlCLGNBQUksQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQztBQUM5QixjQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUM7QUFDcEMsY0FBSSxDQUFDLE9BQU8sR0FBRztBQUNiLDBCQUFjLEVBQUUsY0FBYyxDQUFDLGNBQWM7V0FDOUMsQ0FBQztBQUNGLGNBQUksQ0FBQyxRQUFRLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQztTQUN6Qzs7OztpQkFFZSw0QkFBRztBQUNqQixtQkFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztXQUM3Qjs7O2lCQUVlLDRCQUFHO0FBQ2pCLG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1dBQzdCOzs7aUJBRWdCLDZCQUFHO0FBQ2xCLG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1dBQy9EOzs7aUJBRWlCLDhCQUFHO0FBQ25CLG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1dBQy9COzs7aUJBRW1CLGdDQUFHO0FBQ3JCLG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1dBQzFCOzs7aUJBRVMsc0JBQUc7QUFDWCxtQkFBTyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7V0FDMUM7OztpQkFFWSx5QkFBRztBQUNkLG1CQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztXQUN4Qzs7O2lCQUVVLHVCQUFHO0FBQ1osbUJBQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1dBQ3pDOzs7aUJBRVcsd0JBQUc7QUFDYixtQkFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztXQUMvQjs7O2lCQUVlLDBCQUFDLE1BQU0sRUFBRTtBQUN2QixtQkFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1dBQzlDOzs7aUJBRWdCLDJCQUFDLE1BQU0sRUFBRTtBQUN4QixtQkFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1dBQy9DOzs7aUJBRWdCLDZCQUFHO0FBQ2xCLG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1dBQzNCOzs7aUJBRWUsNEJBQUc7QUFDakIsbUJBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7V0FDL0I7OztpQkFFVSx1QkFBRztBQUNaLG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7V0FDbkM7OztpQkFFYSwwQkFBRztBQUNmLGdCQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7QUFDcEIsZ0JBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUU7QUFDeEQsa0JBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLEtBQUssSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUU7O0FBRXpELDJCQUFXLEdBQUcsQ0FBQyxDQUFDO2VBQ2pCLE1BQU07O0FBRUwsMkJBQVcsR0FBRyxDQUFDLENBQUM7ZUFDakI7YUFDRjtBQUNELG1CQUFPLFdBQVcsQ0FBQztXQUNwQiIsImZpbGUiOiJhbnRpdHJhY2tpbmcvd2VicmVxdWVzdC1jb250ZXh0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG5cbiAgY29uc3RydWN0b3IocmVxdWVzdERldGFpbHMpIHtcbiAgICB0aGlzLmRldGFpbHMgPSByZXF1ZXN0RGV0YWlscztcbiAgICB0aGlzLnVybCA9IHJlcXVlc3REZXRhaWxzLnVybDtcbiAgICB0aGlzLm1ldGhvZCA9IHJlcXVlc3REZXRhaWxzLm1ldGhvZDtcbiAgICB0aGlzLmNoYW5uZWwgPSB7XG4gICAgICByZXNwb25zZVN0YXR1czogcmVxdWVzdERldGFpbHMucmVzcG9uc2VTdGF0dXNcbiAgICB9O1xuICAgIHRoaXMuaXNDYWNoZWQgPSByZXF1ZXN0RGV0YWlscy5pc0NhY2hlZDtcbiAgfVxuXG4gIGdldElubmVyV2luZG93SUQoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGV0YWlscy5mcmFtZUlkO1xuICB9XG5cbiAgZ2V0T3V0ZXJXaW5kb3dJRCgpIHtcbiAgICByZXR1cm4gdGhpcy5kZXRhaWxzLmZyYW1lSWQ7XG4gIH1cblxuICBnZXRQYXJlbnRXaW5kb3dJRCgpIHtcbiAgICByZXR1cm4gdGhpcy5kZXRhaWxzLnBhcmVudEZyYW1lSWQgfHwgdGhpcy5nZXRPcmlnaW5XaW5kb3dJRCgpO1xuICB9XG5cbiAgZ2V0TG9hZGluZ0RvY3VtZW50KCkge1xuICAgIHJldHVybiB0aGlzLmRldGFpbHMub3JpZ2luVXJsO1xuICB9XG5cbiAgZ2V0Q29udGVudFBvbGljeVR5cGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGV0YWlscy50eXBlO1xuICB9XG5cbiAgaXNGdWxsUGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRDb250ZW50UG9saWN5VHlwZSgpID09PSA2O1xuICB9XG5cbiAgZ2V0Q29va2llRGF0YSgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRSZXF1ZXN0SGVhZGVyKCdDb29raWUnKTtcbiAgfVxuXG4gIGdldFJlZmVycmVyKCkge1xuICAgIHJldHVybiB0aGlzLmdldFJlcXVlc3RIZWFkZXIoJ1JlZmVyZXInKTtcbiAgfVxuXG4gIGdldFNvdXJjZVVSTCgpIHtcbiAgICByZXR1cm4gdGhpcy5kZXRhaWxzLm9yaWdpblVybDtcbiAgfVxuXG4gIGdldFJlcXVlc3RIZWFkZXIoaGVhZGVyKSB7XG4gICAgcmV0dXJuIHRoaXMuZGV0YWlscy5nZXRSZXF1ZXN0SGVhZGVyKGhlYWRlcik7XG4gIH1cblxuICBnZXRSZXNwb25zZUhlYWRlcihoZWFkZXIpIHtcbiAgICByZXR1cm4gdGhpcy5kZXRhaWxzLmdldFJlc3BvbnNlSGVhZGVyKGhlYWRlcik7XG4gIH1cblxuICBnZXRPcmlnaW5XaW5kb3dJRCgpIHtcbiAgICByZXR1cm4gdGhpcy5kZXRhaWxzLnRhYklkO1xuICB9XG5cbiAgaXNDaGFubmVsUHJpdmF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5kZXRhaWxzLmlzUHJpdmF0ZTtcbiAgfVxuXG4gIGdldFBvc3REYXRhKCkge1xuICAgIHJldHVybiB0aGlzLmRldGFpbHMuZ2V0UG9zdERhdGEoKTtcbiAgfVxuXG4gIGdldFdpbmRvd0RlcHRoKCkge1xuICAgIGxldCB3aW5kb3dEZXB0aCA9IDA7XG4gICAgaWYgKHRoaXMuZ2V0SW5uZXJXaW5kb3dJRCgpICE9PSB0aGlzLmdldE9yaWdpbldpbmRvd0lEKCkpIHtcbiAgICAgIGlmICh0aGlzLmdldE9yaWdpbldpbmRvd0lEKCkgPT09IHRoaXMuZ2V0UGFyZW50V2luZG93SUQoKSkge1xuICAgICAgICAvLyBmcmFtZSBpbiBkb2N1bWVudFxuICAgICAgICB3aW5kb3dEZXB0aCA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkZWVwZXIgdGhhbiAxc3QgbGV2ZWwgaWZyYW1lXG4gICAgICAgIHdpbmRvd0RlcHRoID0gMjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdpbmRvd0RlcHRoO1xuICB9XG59XG4iXX0=