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