System.register("platform/webrequest", ["core/cliqz"], function (_export) {
  "use strict";

  var utils;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _export("default", {
        onBeforeRequest: {
          listeners: [],
          addListener: function addListener(listener, filter, extraInfo) {
            utils.log("Listener register", "webrequests");
            this.listeners.push({ fn: listener, filter: filter, extraInfo: extraInfo });
          },
          removeListener: function removeListener(listener) {},

          _trigger: function _trigger(requestInfo) {
            // getter for request headers
            requestInfo.getRequestHeader = function (header) {
              return requestInfo.requestHeaders[header];
            };
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = this.listeners[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var listener = _step.value;
                var fn = listener.fn;
                var filter = listener.filter;
                var extraInfo = listener.extraInfo;

                var blockingResponse = fn(requestInfo);

                if (blockingResponse && Object.keys(blockingResponse).length > 0) {
                  blockingResponse['extras'] = extraInfo;
                  return blockingResponse;
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator["return"]) {
                  _iterator["return"]();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            return {};
          }
        },

        onBeforeSendHeaders: {
          addListener: function addListener(listener, filter, extraInfo) {},
          removeListener: function removeListener(listener) {}
        },

        onHeadersReceived: {
          addListener: function addListener(listener, filter, extraInfo) {},
          removeListener: function removeListener(listener) {}
        }
      });
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnJlcXVlc3QuZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O3lCQUFTLEtBQUs7Ozt5QkFFQztBQUNiLHVCQUFlLEVBQUU7QUFDZixtQkFBUyxFQUFFLEVBQUU7QUFDYixxQkFBVyxFQUFBLHFCQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFO0FBQ3ZDLGlCQUFLLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQzlDLGdCQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxTQUFTLEVBQVQsU0FBUyxFQUFDLENBQUMsQ0FBQztXQUN4RDtBQUNELHdCQUFjLEVBQUEsd0JBQUMsUUFBUSxFQUFFLEVBQUU7O0FBRTNCLGtCQUFRLEVBQUEsa0JBQUMsV0FBVyxFQUFFOztBQUVwQix1QkFBVyxDQUFDLGdCQUFnQixHQUFHLFVBQVMsTUFBTSxFQUFFO0FBQzlDLHFCQUFPLFdBQVcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDM0MsQ0FBQzs7Ozs7O0FBQ0YsbUNBQXFCLElBQUksQ0FBQyxTQUFTLDhIQUFFO29CQUE1QixRQUFRO29CQUNSLEVBQUUsR0FBdUIsUUFBUSxDQUFqQyxFQUFFO29CQUFFLE1BQU0sR0FBZSxRQUFRLENBQTdCLE1BQU07b0JBQUUsU0FBUyxHQUFJLFFBQVEsQ0FBckIsU0FBUzs7QUFDMUIsb0JBQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDOztBQUV6QyxvQkFBSSxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNoRSx5QkFBTyxnQkFBZ0IsQ0FBQztpQkFDekI7ZUFDSjs7Ozs7Ozs7Ozs7Ozs7OztBQUNELG1CQUFPLEVBQUUsQ0FBQztXQUNYO1NBQ0Y7O0FBRUQsMkJBQW1CLEVBQUU7QUFDbkIscUJBQVcsRUFBQSxxQkFBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO0FBQzNDLHdCQUFjLEVBQUEsd0JBQUMsUUFBUSxFQUFFLEVBQUU7U0FDNUI7O0FBRUQseUJBQWlCLEVBQUU7QUFDakIscUJBQVcsRUFBQSxxQkFBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO0FBQzNDLHdCQUFjLEVBQUEsd0JBQUMsUUFBUSxFQUFFLEVBQUU7U0FDNUI7T0FDRiIsImZpbGUiOiJ3ZWJyZXF1ZXN0LmVzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXRpbHMgfSBmcm9tIFwiY29yZS9jbGlxelwiO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIG9uQmVmb3JlUmVxdWVzdDoge1xuICAgIGxpc3RlbmVyczogW10sXG4gICAgYWRkTGlzdGVuZXIobGlzdGVuZXIsIGZpbHRlciwgZXh0cmFJbmZvKSB7XG4gICAgICB1dGlscy5sb2coXCJMaXN0ZW5lciByZWdpc3RlclwiLCBcIndlYnJlcXVlc3RzXCIpO1xuICAgICAgdGhpcy5saXN0ZW5lcnMucHVzaCh7Zm46IGxpc3RlbmVyLCBmaWx0ZXIsIGV4dHJhSW5mb30pO1xuICAgIH0sXG4gICAgcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpIHt9LFxuXG4gICAgX3RyaWdnZXIocmVxdWVzdEluZm8pIHtcbiAgICAgIC8vIGdldHRlciBmb3IgcmVxdWVzdCBoZWFkZXJzXG4gICAgICByZXF1ZXN0SW5mby5nZXRSZXF1ZXN0SGVhZGVyID0gZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHJldHVybiByZXF1ZXN0SW5mby5yZXF1ZXN0SGVhZGVyc1toZWFkZXJdO1xuICAgICAgfTtcbiAgICAgIGZvciAobGV0IGxpc3RlbmVyIG9mIHRoaXMubGlzdGVuZXJzKSB7XG4gICAgICAgIGNvbnN0IHtmbiwgZmlsdGVyLCBleHRyYUluZm99ID0gbGlzdGVuZXI7XG4gICAgICAgICAgY29uc3QgYmxvY2tpbmdSZXNwb25zZSA9IGZuKHJlcXVlc3RJbmZvKTtcblxuICAgICAgICAgIGlmIChibG9ja2luZ1Jlc3BvbnNlICYmIE9iamVjdC5rZXlzKGJsb2NraW5nUmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBibG9ja2luZ1Jlc3BvbnNlO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH0sXG5cbiAgb25CZWZvcmVTZW5kSGVhZGVyczoge1xuICAgIGFkZExpc3RlbmVyKGxpc3RlbmVyLCBmaWx0ZXIsIGV4dHJhSW5mbykge30sXG4gICAgcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpIHt9XG4gIH0sXG5cbiAgb25IZWFkZXJzUmVjZWl2ZWQ6IHtcbiAgICBhZGRMaXN0ZW5lcihsaXN0ZW5lciwgZmlsdGVyLCBleHRyYUluZm8pIHt9LFxuICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKSB7fVxuICB9XG59XG5cblxuIl19