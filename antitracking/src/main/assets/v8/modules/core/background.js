System.register("core/background", ["core/cliqz", "platform/language", "core/config", "platform/process-script-manager"], function (_export) {
  "use strict";

  var utils, events, language, config, ProcessScriptManager, lastRequestId, callbacks;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }, function (_platformLanguage) {
      language = _platformLanguage["default"];
    }, function (_coreConfig) {
      config = _coreConfig["default"];
    }, function (_platformProcessScriptManager) {
      ProcessScriptManager = _platformProcessScriptManager["default"];
    }],
    execute: function () {
      lastRequestId = 0;
      callbacks = {};

      _export("default", {

        init: function init(settings) {
          this.dispatchMessage = this.dispatchMessage.bind(this);

          utils.bindObjectFunctions(this.actions, this);

          this.mm = new ProcessScriptManager(this.dispatchMessage);
          this.mm.init();
        },

        unload: function unload() {
          this.mm.unload();
        },

        queryHTML: function queryHTML(url, selector, attribute) {
          var requestId = lastRequestId++,
              documents = [];

          this.mm.broadcast("cliqz:core", {
            action: "queryHTML",
            url: url,
            args: [selector, attribute],
            requestId: requestId
          });

          return new Promise(function (resolve, reject) {
            callbacks[requestId] = function (attributeValues) {
              delete callbacks[requestId];
              resolve(attributeValues);
            };

            utils.setTimeout(function () {
              delete callbacks[requestId];
              reject();
            }, 1000);
          });
        },

        getHTML: function getHTML(url) {
          var timeout = arguments.length <= 1 || arguments[1] === undefined ? 1000 : arguments[1];

          var requestId = lastRequestId++,
              documents = [];

          this.mm.broadcast("cliqz:core", {
            action: "getHTML",
            url: url,
            args: [],
            requestId: requestId
          });

          callbacks[requestId] = function (doc) {
            documents.push(doc);
          };

          return new Promise(function (resolve) {
            utils.setTimeout(function () {
              delete callbacks[requestId];
              resolve(documents);
            }, timeout);
          });
        },

        getCookie: function getCookie(url) {
          var requestId = lastRequestId++,
              documents = [];

          this.mm.broadcast("cliqz:core", {
            action: "getCookie",
            url: url,
            args: [],
            requestId: requestId
          });

          return new Promise(function (resolve, reject) {
            callbacks[requestId] = function (attributeValues) {
              delete callbacks[requestId];
              resolve(attributeValues);
            };

            utils.setTimeout(function () {
              delete callbacks[requestId];
              reject();
            }, 1000);
          });
        },

        dispatchMessage: function dispatchMessage(msg) {
          if (typeof msg.data.requestId === "number") {
            if (msg.data.requestId in callbacks) {
              this.handleResponse(msg);
            }
          } else {
            this.handleRequest(msg);
          }
        },

        handleRequest: function handleRequest(msg) {
          var _this = this;

          var _msg$data$payload = msg.data.payload;
          var action = _msg$data$payload.action;
          var module = _msg$data$payload.module;
          var args = _msg$data$payload.args;
          var requestId = _msg$data$payload.requestId;
          var windowId = msg.data.windowId;

          utils.importModule(module + "/background").then(function (module) {
            var background = module["default"];
            return background.actions[action].apply(null, args);
          }).then(function (response) {
            _this.mm.broadcast("window-" + windowId, {
              response: response,
              action: msg.data.payload.action,
              requestId: requestId
            });
          })["catch"](function (e) {
            return utils.log(e.toString() + "--" + e.stack, "Problem with frameScript");
          });
        },

        handleResponse: function handleResponse(msg) {
          callbacks[msg.data.requestId].apply(null, [msg.data.payload]);
        },

        actions: {
          sendTelemetry: function sendTelemetry(msg) {
            utils.telemetry(msg);
            return Promise.resolve();
          },
          queryCliqz: function queryCliqz(query) {
            var urlBar = utils.getWindow().document.getElementById("urlbar");
            urlBar.focus();
            urlBar.mInputField.focus();
            urlBar.mInputField.setUserInput(query);
          },
          setUrlbar: function setUrlbar(value) {
            return this.actions.queryCliqz(value);
          },
          recordLang: function recordLang(url, lang) {
            if (lang) {
              language.addLocale(url, lang);
            }
            return Promise.resolve();
          },
          recordMeta: function recordMeta(url, meta) {
            events.pub("core:url-meta", url, meta);
          },

          getFeedbackPage: function getFeedbackPage() {
            return utils.FEEDBACK_URL;
          }
        }
      });
    }
  };
});
//# sourceMappingURL=data:application/json;base64,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O0FBQ2hFLGtCQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDZixrQkFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUMzQixrQkFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7V0FDeEM7QUFDRCxtQkFBUyxFQUFBLG1CQUFDLEtBQUssRUFBRTtBQUNmLG1CQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1dBQ3ZDO0FBQ0Qsb0JBQVUsRUFBQSxvQkFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQ3BCLGdCQUFJLElBQUksRUFBRTtBQUNSLHNCQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUMvQjtBQUNELG1CQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztXQUMxQjtBQUNELG9CQUFVLEVBQUEsb0JBQUMsR0FBRyxFQUFFLElBQUksRUFBRTtBQUNwQixrQkFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1dBQ3hDOztBQUVELHlCQUFlLEVBQUEsMkJBQUc7QUFDaEIsbUJBQU8sS0FBSyxDQUFDLFlBQVksQ0FBQztXQUMzQjtTQUNGO09BQ0YiLCJmaWxlIjoiY29yZS9iYWNrZ3JvdW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXRpbHMsIGV2ZW50cyB9IGZyb20gXCJjb3JlL2NsaXF6XCI7XG5pbXBvcnQgbGFuZ3VhZ2UgZnJvbSBcInBsYXRmb3JtL2xhbmd1YWdlXCI7XG5pbXBvcnQgY29uZmlnIGZyb20gXCJjb3JlL2NvbmZpZ1wiO1xuaW1wb3J0IFByb2Nlc3NTY3JpcHRNYW5hZ2VyIGZyb20gXCJwbGF0Zm9ybS9wcm9jZXNzLXNjcmlwdC1tYW5hZ2VyXCI7XG5cbnZhciBsYXN0UmVxdWVzdElkID0gMDtcbnZhciBjYWxsYmFja3MgPSB7fTtcblxuZXhwb3J0IGRlZmF1bHQge1xuXG4gIGluaXQoc2V0dGluZ3MpIHtcbiAgICB0aGlzLmRpc3BhdGNoTWVzc2FnZSA9IHRoaXMuZGlzcGF0Y2hNZXNzYWdlLmJpbmQodGhpcyk7XG5cbiAgICB1dGlscy5iaW5kT2JqZWN0RnVuY3Rpb25zKHRoaXMuYWN0aW9ucywgdGhpcyk7XG5cbiAgICB0aGlzLm1tID0gbmV3IFByb2Nlc3NTY3JpcHRNYW5hZ2VyKHRoaXMuZGlzcGF0Y2hNZXNzYWdlKTtcbiAgICB0aGlzLm1tLmluaXQoKTtcbiAgfSxcblxuICB1bmxvYWQoKSB7XG4gICAgdGhpcy5tbS51bmxvYWQoKTtcbiAgfSxcblxuICBxdWVyeUhUTUwodXJsLCBzZWxlY3RvciwgYXR0cmlidXRlKSB7XG4gICAgY29uc3QgcmVxdWVzdElkID0gbGFzdFJlcXVlc3RJZCsrLFxuICAgICAgICAgIGRvY3VtZW50cyA9IFtdO1xuXG4gICAgdGhpcy5tbS5icm9hZGNhc3QoXCJjbGlxejpjb3JlXCIsIHtcbiAgICAgIGFjdGlvbjogXCJxdWVyeUhUTUxcIixcbiAgICAgIHVybCxcbiAgICAgIGFyZ3M6IFtzZWxlY3RvciwgYXR0cmlidXRlXSxcbiAgICAgIHJlcXVlc3RJZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjYWxsYmFja3NbcmVxdWVzdElkXSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGVWYWx1ZXMpIHtcbiAgICAgICAgZGVsZXRlIGNhbGxiYWNrc1tyZXF1ZXN0SWRdO1xuICAgICAgICByZXNvbHZlKGF0dHJpYnV0ZVZhbHVlcyk7XG4gICAgICB9O1xuXG4gICAgICB1dGlscy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGVsZXRlIGNhbGxiYWNrc1tyZXF1ZXN0SWRdO1xuICAgICAgICByZWplY3QoKTtcbiAgICAgIH0sIDEwMDApO1xuICAgIH0pO1xuICB9LFxuXG4gIGdldEhUTUwodXJsLCB0aW1lb3V0ID0gMTAwMCkge1xuICAgIGNvbnN0IHJlcXVlc3RJZCA9IGxhc3RSZXF1ZXN0SWQrKyxcbiAgICAgICAgICBkb2N1bWVudHMgPSBbXTtcblxuICAgIHRoaXMubW0uYnJvYWRjYXN0KFwiY2xpcXo6Y29yZVwiLCB7XG4gICAgICBhY3Rpb246IFwiZ2V0SFRNTFwiLFxuICAgICAgdXJsLFxuICAgICAgYXJnczogW10sXG4gICAgICByZXF1ZXN0SWRcbiAgICB9KTtcblxuICAgIGNhbGxiYWNrc1tyZXF1ZXN0SWRdID0gZnVuY3Rpb24gKGRvYykge1xuICAgICAgZG9jdW1lbnRzLnB1c2goZG9jKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCByZXNvbHZlID0+IHtcbiAgICAgIHV0aWxzLnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBkZWxldGUgY2FsbGJhY2tzW3JlcXVlc3RJZF07XG4gICAgICAgIHJlc29sdmUoZG9jdW1lbnRzKTtcbiAgICAgIH0sIHRpbWVvdXQpO1xuICAgIH0pO1xuICB9LFxuXG4gIGdldENvb2tpZSh1cmwpIHtcbiAgICBjb25zdCByZXF1ZXN0SWQgPSBsYXN0UmVxdWVzdElkKyssXG4gICAgICAgICAgZG9jdW1lbnRzID0gW107XG5cbiAgICB0aGlzLm1tLmJyb2FkY2FzdChcImNsaXF6OmNvcmVcIiwge1xuICAgICAgYWN0aW9uOiBcImdldENvb2tpZVwiLFxuICAgICAgdXJsLFxuICAgICAgYXJnczogW10sXG4gICAgICByZXF1ZXN0SWRcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY2FsbGJhY2tzW3JlcXVlc3RJZF0gPSBmdW5jdGlvbiAoYXR0cmlidXRlVmFsdWVzKSB7XG4gICAgICAgIGRlbGV0ZSBjYWxsYmFja3NbcmVxdWVzdElkXTtcbiAgICAgICAgcmVzb2x2ZShhdHRyaWJ1dGVWYWx1ZXMpO1xuICAgICAgfTtcblxuICAgICAgdXRpbHMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlbGV0ZSBjYWxsYmFja3NbcmVxdWVzdElkXTtcbiAgICAgICAgcmVqZWN0KCk7XG4gICAgICB9LCAxMDAwKTtcbiAgICB9KTtcbiAgfSxcblxuICBkaXNwYXRjaE1lc3NhZ2UobXNnKSB7XG4gICAgaWYgKHR5cGVvZiBtc2cuZGF0YS5yZXF1ZXN0SWQgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgIGlmIChtc2cuZGF0YS5yZXF1ZXN0SWQgaW4gY2FsbGJhY2tzKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlUmVzcG9uc2UobXNnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oYW5kbGVSZXF1ZXN0KG1zZyk7XG4gICAgfVxuICB9LFxuXG4gIGhhbmRsZVJlcXVlc3QobXNnKSB7XG4gICAgY29uc3QgeyBhY3Rpb24sIG1vZHVsZSwgYXJncywgcmVxdWVzdElkIH0gPSBtc2cuZGF0YS5wYXlsb2FkLFxuICAgICAgICAgIHdpbmRvd0lkID0gbXNnLmRhdGEud2luZG93SWQ7XG5cbiAgICB1dGlscy5pbXBvcnRNb2R1bGUoYCR7bW9kdWxlfS9iYWNrZ3JvdW5kYCkudGhlbiggbW9kdWxlID0+IHtcbiAgICAgIGNvbnN0IGJhY2tncm91bmQgPSBtb2R1bGUuZGVmYXVsdDtcbiAgICAgIHJldHVybiBiYWNrZ3JvdW5kLmFjdGlvbnNbYWN0aW9uXS5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9KS50aGVuKCByZXNwb25zZSA9PiB7XG4gICAgICB0aGlzLm1tLmJyb2FkY2FzdChgd2luZG93LSR7d2luZG93SWR9YCwge1xuICAgICAgICByZXNwb25zZSxcbiAgICAgICAgYWN0aW9uOiBtc2cuZGF0YS5wYXlsb2FkLmFjdGlvbixcbiAgICAgICAgcmVxdWVzdElkLFxuICAgICAgfSk7XG4gICAgfSkuY2F0Y2goIGUgPT4gdXRpbHMubG9nKGAke2UudG9TdHJpbmcoKX0tLSR7ZS5zdGFja31gLCBcIlByb2JsZW0gd2l0aCBmcmFtZVNjcmlwdFwiKSApO1xuICB9LFxuXG4gIGhhbmRsZVJlc3BvbnNlKG1zZykge1xuICAgIGNhbGxiYWNrc1ttc2cuZGF0YS5yZXF1ZXN0SWRdLmFwcGx5KG51bGwsIFttc2cuZGF0YS5wYXlsb2FkXSk7XG4gIH0sXG5cbiAgYWN0aW9uczoge1xuICAgIHNlbmRUZWxlbWV0cnkobXNnKSB7XG4gICAgICB1dGlscy50ZWxlbWV0cnkobXNnKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9LFxuICAgIHF1ZXJ5Q2xpcXoocXVlcnkpIHtcbiAgICAgIGxldCB1cmxCYXIgPSB1dGlscy5nZXRXaW5kb3coKS5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVybGJhclwiKVxuICAgICAgdXJsQmFyLmZvY3VzKCk7XG4gICAgICB1cmxCYXIubUlucHV0RmllbGQuZm9jdXMoKTtcbiAgICAgIHVybEJhci5tSW5wdXRGaWVsZC5zZXRVc2VySW5wdXQocXVlcnkpO1xuICAgIH0sXG4gICAgc2V0VXJsYmFyKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25zLnF1ZXJ5Q2xpcXoodmFsdWUpO1xuICAgIH0sXG4gICAgcmVjb3JkTGFuZyh1cmwsIGxhbmcpIHtcbiAgICAgIGlmIChsYW5nKSB7XG4gICAgICAgIGxhbmd1YWdlLmFkZExvY2FsZSh1cmwsIGxhbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH0sXG4gICAgcmVjb3JkTWV0YSh1cmwsIG1ldGEpIHtcbiAgICAgIGV2ZW50cy5wdWIoXCJjb3JlOnVybC1tZXRhXCIsIHVybCwgbWV0YSk7XG4gICAgfSxcblxuICAgIGdldEZlZWRiYWNrUGFnZSgpIHtcbiAgICAgIHJldHVybiB1dGlscy5GRUVEQkFDS19VUkw7XG4gICAgfVxuICB9XG59O1xuIl19