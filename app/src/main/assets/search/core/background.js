System.register("core/background", ["core/cliqz", "core/config", "platform/process-script-manager"], function (_export) {
  "use strict";

  var language, utils, events, config, ProcessScriptManager, lastRequestId, callbacks;
  return {
    setters: [function (_coreCliqz) {
      language = _coreCliqz.language;
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
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
            //utils.getWindow().CLIQZ.Core.urlbar.focus("ss");
          },
          getUrlbar: function getUrlbar(value) {
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
          }
        }
      });
    }
  };
});
//# sourceMappingURL=data:application/json;base64,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Q0FBQyxDQUFBO0FBQ2hFLGtCQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDZixrQkFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUMzQixrQkFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7O1dBRXhDO0FBQ0QsbUJBQVMsRUFBQSxtQkFBQyxLQUFLLEVBQUU7QUFDZixtQkFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztXQUN2QztBQUNELG9CQUFVLEVBQUEsb0JBQUMsR0FBRyxFQUFFLElBQUksRUFBRTtBQUNwQixnQkFBSSxJQUFJLEVBQUU7QUFDUixzQkFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDL0I7QUFDRCxtQkFBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7V0FDMUI7QUFDRCxvQkFBVSxFQUFBLG9CQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUU7QUFDcEIsa0JBQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztXQUN4QztTQUNGO09BQ0YiLCJmaWxlIjoiY29yZS9iYWNrZ3JvdW5kLmVzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbGFuZ3VhZ2UsIHV0aWxzLCBldmVudHMgfSBmcm9tIFwiY29yZS9jbGlxelwiO1xuaW1wb3J0IGNvbmZpZyBmcm9tIFwiY29yZS9jb25maWdcIjtcbmltcG9ydCBQcm9jZXNzU2NyaXB0TWFuYWdlciBmcm9tIFwicGxhdGZvcm0vcHJvY2Vzcy1zY3JpcHQtbWFuYWdlclwiO1xuXG52YXIgbGFzdFJlcXVlc3RJZCA9IDA7XG52YXIgY2FsbGJhY2tzID0ge307XG5cbmV4cG9ydCBkZWZhdWx0IHtcblxuICBpbml0KHNldHRpbmdzKSB7XG4gICAgdGhpcy5kaXNwYXRjaE1lc3NhZ2UgPSB0aGlzLmRpc3BhdGNoTWVzc2FnZS5iaW5kKHRoaXMpO1xuXG4gICAgdXRpbHMuYmluZE9iamVjdEZ1bmN0aW9ucyh0aGlzLmFjdGlvbnMsIHRoaXMpO1xuXG4gICAgdGhpcy5tbSA9IG5ldyBQcm9jZXNzU2NyaXB0TWFuYWdlcih0aGlzLmRpc3BhdGNoTWVzc2FnZSk7XG4gICAgdGhpcy5tbS5pbml0KCk7XG4gIH0sXG5cbiAgdW5sb2FkKCkge1xuICAgIHRoaXMubW0udW5sb2FkKCk7XG4gIH0sXG5cbiAgcXVlcnlIVE1MKHVybCwgc2VsZWN0b3IsIGF0dHJpYnV0ZSkge1xuICAgIGNvbnN0IHJlcXVlc3RJZCA9IGxhc3RSZXF1ZXN0SWQrKyxcbiAgICAgICAgICBkb2N1bWVudHMgPSBbXTtcblxuICAgIHRoaXMubW0uYnJvYWRjYXN0KFwiY2xpcXo6Y29yZVwiLCB7XG4gICAgICBhY3Rpb246IFwicXVlcnlIVE1MXCIsXG4gICAgICB1cmwsXG4gICAgICBhcmdzOiBbc2VsZWN0b3IsIGF0dHJpYnV0ZV0sXG4gICAgICByZXF1ZXN0SWRcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY2FsbGJhY2tzW3JlcXVlc3RJZF0gPSBmdW5jdGlvbiAoYXR0cmlidXRlVmFsdWVzKSB7XG4gICAgICAgIGRlbGV0ZSBjYWxsYmFja3NbcmVxdWVzdElkXTtcbiAgICAgICAgcmVzb2x2ZShhdHRyaWJ1dGVWYWx1ZXMpO1xuICAgICAgfTtcblxuICAgICAgdXRpbHMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlbGV0ZSBjYWxsYmFja3NbcmVxdWVzdElkXTtcbiAgICAgICAgcmVqZWN0KCk7XG4gICAgICB9LCAxMDAwKTtcbiAgICB9KTtcbiAgfSxcblxuICBnZXRIVE1MKHVybCwgdGltZW91dCA9IDEwMDApIHtcbiAgICBjb25zdCByZXF1ZXN0SWQgPSBsYXN0UmVxdWVzdElkKyssXG4gICAgICAgICAgZG9jdW1lbnRzID0gW107XG5cbiAgICB0aGlzLm1tLmJyb2FkY2FzdChcImNsaXF6OmNvcmVcIiwge1xuICAgICAgYWN0aW9uOiBcImdldEhUTUxcIixcbiAgICAgIHVybCxcbiAgICAgIGFyZ3M6IFtdLFxuICAgICAgcmVxdWVzdElkXG4gICAgfSk7XG5cbiAgICBjYWxsYmFja3NbcmVxdWVzdElkXSA9IGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgIGRvY3VtZW50cy5wdXNoKGRvYyk7XG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSggcmVzb2x2ZSA9PiB7XG4gICAgICB1dGlscy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGVsZXRlIGNhbGxiYWNrc1tyZXF1ZXN0SWRdO1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50cyk7XG4gICAgICB9LCB0aW1lb3V0KTtcbiAgICB9KTtcbiAgfSxcblxuICBnZXRDb29raWUodXJsKSB7XG4gICAgY29uc3QgcmVxdWVzdElkID0gbGFzdFJlcXVlc3RJZCsrLFxuICAgICAgICAgIGRvY3VtZW50cyA9IFtdO1xuXG4gICAgdGhpcy5tbS5icm9hZGNhc3QoXCJjbGlxejpjb3JlXCIsIHtcbiAgICAgIGFjdGlvbjogXCJnZXRDb29raWVcIixcbiAgICAgIHVybCxcbiAgICAgIGFyZ3M6IFtdLFxuICAgICAgcmVxdWVzdElkXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNhbGxiYWNrc1tyZXF1ZXN0SWRdID0gZnVuY3Rpb24gKGF0dHJpYnV0ZVZhbHVlcykge1xuICAgICAgICBkZWxldGUgY2FsbGJhY2tzW3JlcXVlc3RJZF07XG4gICAgICAgIHJlc29sdmUoYXR0cmlidXRlVmFsdWVzKTtcbiAgICAgIH07XG5cbiAgICAgIHV0aWxzLnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBkZWxldGUgY2FsbGJhY2tzW3JlcXVlc3RJZF07XG4gICAgICAgIHJlamVjdCgpO1xuICAgICAgfSwgMTAwMCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgZGlzcGF0Y2hNZXNzYWdlKG1zZykge1xuICAgIGlmICh0eXBlb2YgbXNnLmRhdGEucmVxdWVzdElkID09PSBcIm51bWJlclwiKSB7XG4gICAgICBpZiAobXNnLmRhdGEucmVxdWVzdElkIGluIGNhbGxiYWNrcykge1xuICAgICAgICB0aGlzLmhhbmRsZVJlc3BvbnNlKG1zZyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGFuZGxlUmVxdWVzdChtc2cpO1xuICAgIH1cbiAgfSxcblxuICBoYW5kbGVSZXF1ZXN0KG1zZykge1xuICAgIGNvbnN0IHsgYWN0aW9uLCBtb2R1bGUsIGFyZ3MsIHJlcXVlc3RJZCB9ID0gbXNnLmRhdGEucGF5bG9hZCxcbiAgICAgICAgICB3aW5kb3dJZCA9IG1zZy5kYXRhLndpbmRvd0lkO1xuXG4gICAgdXRpbHMuaW1wb3J0TW9kdWxlKGAke21vZHVsZX0vYmFja2dyb3VuZGApLnRoZW4oIG1vZHVsZSA9PiB7XG4gICAgICBjb25zdCBiYWNrZ3JvdW5kID0gbW9kdWxlLmRlZmF1bHQ7XG4gICAgICByZXR1cm4gYmFja2dyb3VuZC5hY3Rpb25zW2FjdGlvbl0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfSkudGhlbiggcmVzcG9uc2UgPT4ge1xuICAgICAgdGhpcy5tbS5icm9hZGNhc3QoYHdpbmRvdy0ke3dpbmRvd0lkfWAsIHtcbiAgICAgICAgcmVzcG9uc2UsXG4gICAgICAgIGFjdGlvbjogbXNnLmRhdGEucGF5bG9hZC5hY3Rpb24sXG4gICAgICAgIHJlcXVlc3RJZCxcbiAgICAgIH0pO1xuICAgIH0pLmNhdGNoKCBlID0+IHV0aWxzLmxvZyhgJHtlLnRvU3RyaW5nKCl9LS0ke2Uuc3RhY2t9YCwgXCJQcm9ibGVtIHdpdGggZnJhbWVTY3JpcHRcIikgKTtcbiAgfSxcblxuICBoYW5kbGVSZXNwb25zZShtc2cpIHtcbiAgICBjYWxsYmFja3NbbXNnLmRhdGEucmVxdWVzdElkXS5hcHBseShudWxsLCBbbXNnLmRhdGEucGF5bG9hZF0pO1xuICB9LFxuXG4gIGFjdGlvbnM6IHtcbiAgICBzZW5kVGVsZW1ldHJ5KG1zZykge1xuICAgICAgdXRpbHMudGVsZW1ldHJ5KG1zZyk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfSxcbiAgICBxdWVyeUNsaXF6KHF1ZXJ5KSB7XG4gICAgICBsZXQgdXJsQmFyID0gdXRpbHMuZ2V0V2luZG93KCkuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1cmxiYXJcIilcbiAgICAgIHVybEJhci5mb2N1cygpO1xuICAgICAgdXJsQmFyLm1JbnB1dEZpZWxkLmZvY3VzKCk7XG4gICAgICB1cmxCYXIubUlucHV0RmllbGQuc2V0VXNlcklucHV0KHF1ZXJ5KTtcbiAgICAgIC8vdXRpbHMuZ2V0V2luZG93KCkuQ0xJUVouQ29yZS51cmxiYXIuZm9jdXMoXCJzc1wiKTtcbiAgICB9LFxuICAgIGdldFVybGJhcih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuYWN0aW9ucy5xdWVyeUNsaXF6KHZhbHVlKTtcbiAgICB9LFxuICAgIHJlY29yZExhbmcodXJsLCBsYW5nKSB7XG4gICAgICBpZiAobGFuZykge1xuICAgICAgICBsYW5ndWFnZS5hZGRMb2NhbGUodXJsLCBsYW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9LFxuICAgIHJlY29yZE1ldGEodXJsLCBtZXRhKSB7XG4gICAgICBldmVudHMucHViKFwiY29yZTp1cmwtbWV0YVwiLCB1cmwsIG1ldGEpO1xuICAgIH1cbiAgfVxufTtcbiJdfQ==