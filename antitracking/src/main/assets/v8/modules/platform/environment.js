System.register('platform/environment', ['core/events'], function (_export) {
  'use strict';

  var CliqzEvents, _PREFS_FILE, prefs;

  function _persistPrefs() {
    writeFileNative(_PREFS_FILE, JSON.stringify(prefs));
  }return {
    setters: [function (_coreEvents) {
      CliqzEvents = _coreEvents['default'];
    }],
    execute: function () {
      _PREFS_FILE = 'cliqz.prefs.json';
      prefs = {};

      // load prefs from file
      readFileNative(_PREFS_FILE, function (data) {
        prefs = JSON.parse(data || '{}');
      });;

      _export('default', {
        log: logDebug,
        getPref: function getPref(prefKey, defaultValue) {
          return prefs[prefKey] || defaultValue;
        },
        setPref: function setPref(prefKey, value) {
          var changed = prefs[prefKey] === value;
          prefs[prefKey] = value;
          _persistPrefs();
          // trigger prefchange event
          if (changed) {
            CliqzEvents.pub('prefchange', prefKey);
          }
        },
        hasPref: function hasPref(prefKey) {
          return prefKey in prefs;
        },
        httpHandler: (function (_httpHandler) {
          function httpHandler(_x, _x2, _x3, _x4, _x5, _x6) {
            return _httpHandler.apply(this, arguments);
          }

          httpHandler.toString = function () {
            return _httpHandler.toString();
          };

          return httpHandler;
        })(function (method, url, callback, onerror, timeout, data) {
          var wrappedCallback = function wrappedCallback(cb) {
            return function (resp) {
              cb && cb(resp);
            };
          };
          httpHandler(method, url, wrappedCallback(callback), wrappedCallback(onerror), timeout || method === 'POST' ? 10000 : 1000, data || null);
        }),
        promiseHttpHandler: function promiseHttpHandler(method, url, data, timeout, compressedPost) {
          return new Promise(function (resolve, reject) {
            // gzip.compress may be false if there is no implementation for this platform
            // or maybe it is not loaded yet
            if (CLIQZEnvironment.gzip && CLIQZEnvironment.gzip.compress && method === 'POST' && compressedPost) {
              var dataLength = data.length;
              data = CLIQZEnvironment.gzip.compress(data);
              CLIQZEnvironment.log("Compressed request to " + url + ", bytes saved = " + (dataLength - data.length) + " (" + (100 * (dataLength - data.length) / dataLength).toFixed(1) + "%)", "CLIQZEnvironment.httpHandler");
              CLIQZEnvironment.httpHandler(method, url, resolve, reject, timeout, data, undefined, 'gzip');
            } else {
              CLIQZEnvironment.httpHandler(method, url, resolve, reject, timeout, data);
            }
          });
        },
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        clearTimeout: clearInterval,
        Promise: Promise
      });
    }
  };
});
//# sourceMappingURL=data:application/json;base64,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QUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDOUYsTUFBTTtBQUNMLDhCQUFnQixDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzNFO1dBQ0YsQ0FBQyxDQUFDO1NBQ0o7QUFDRCxrQkFBVSxFQUFFLFVBQVU7QUFDdEIsbUJBQVcsRUFBRSxXQUFXO0FBQ3hCLHFCQUFhLEVBQUUsYUFBYTtBQUM1QixvQkFBWSxFQUFFLGFBQWE7QUFDM0IsZUFBTyxFQUFFLE9BQU87T0FDakIiLCJmaWxlIjoiZW52aXJvbm1lbnQuZXMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ2xpcXpFdmVudHMgZnJvbSAnY29yZS9ldmVudHMnO1xuXG52YXIgX1BSRUZTX0ZJTEUgPSAnY2xpcXoucHJlZnMuanNvbic7XG52YXIgcHJlZnMgPSB7fTtcbi8vIGxvYWQgcHJlZnMgZnJvbSBmaWxlXG5yZWFkRmlsZU5hdGl2ZShfUFJFRlNfRklMRSwgKGRhdGEpID0+IHtcbiAgcHJlZnMgPSBKU09OLnBhcnNlKGRhdGEgfHwgJ3t9Jyk7XG59KTtcblxuZnVuY3Rpb24gX3BlcnNpc3RQcmVmcygpIHtcbiAgd3JpdGVGaWxlTmF0aXZlKF9QUkVGU19GSUxFLCBKU09OLnN0cmluZ2lmeShwcmVmcykpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBsb2c6IGxvZ0RlYnVnLFxuICBnZXRQcmVmOiBmdW5jdGlvbihwcmVmS2V5LCBkZWZhdWx0VmFsdWUpIHtcbiAgICByZXR1cm4gcHJlZnNbcHJlZktleV0gfHwgZGVmYXVsdFZhbHVlO1xuICB9LFxuICBzZXRQcmVmOiBmdW5jdGlvbihwcmVmS2V5LCB2YWx1ZSkge1xuICAgIGNvbnN0IGNoYW5nZWQgPSBwcmVmc1twcmVmS2V5XSA9PT0gdmFsdWU7XG4gICAgcHJlZnNbcHJlZktleV0gPSB2YWx1ZTtcbiAgICBfcGVyc2lzdFByZWZzKCk7XG4gICAgLy8gdHJpZ2dlciBwcmVmY2hhbmdlIGV2ZW50XG4gICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgIENsaXF6RXZlbnRzLnB1YigncHJlZmNoYW5nZScsIHByZWZLZXkpO1xuICAgIH1cbiAgfSxcbiAgaGFzUHJlZjogZnVuY3Rpb24ocHJlZktleSkge1xuICAgIHJldHVybiBwcmVmS2V5IGluIHByZWZzO1xuICB9LFxuICBodHRwSGFuZGxlcjogZnVuY3Rpb24obWV0aG9kLCB1cmwsIGNhbGxiYWNrLCBvbmVycm9yLCB0aW1lb3V0LCBkYXRhKSB7XG4gICAgdmFyIHdyYXBwZWRDYWxsYmFjayA9IChjYikgPT4ge1xuICAgICAgcmV0dXJuIChyZXNwKSA9PiB7XG4gICAgICAgIGNiICYmIGNiKHJlc3ApO1xuICAgICAgfVxuICAgIH07XG4gICAgaHR0cEhhbmRsZXIobWV0aG9kLCB1cmwsIHdyYXBwZWRDYWxsYmFjayhjYWxsYmFjayksIHdyYXBwZWRDYWxsYmFjayhvbmVycm9yKSwgdGltZW91dCB8fCBtZXRob2QgPT09ICdQT1NUJyA/IDEwMDAwIDogMTAwMCwgZGF0YSB8fCBudWxsKTtcbiAgfSxcbiAgcHJvbWlzZUh0dHBIYW5kbGVyOiBmdW5jdGlvbihtZXRob2QsIHVybCwgZGF0YSwgdGltZW91dCwgY29tcHJlc3NlZFBvc3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoIGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgLy8gZ3ppcC5jb21wcmVzcyBtYXkgYmUgZmFsc2UgaWYgdGhlcmUgaXMgbm8gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgcGxhdGZvcm1cbiAgICAgIC8vIG9yIG1heWJlIGl0IGlzIG5vdCBsb2FkZWQgeWV0XG4gICAgICBpZiAoQ0xJUVpFbnZpcm9ubWVudC5nemlwICYmIENMSVFaRW52aXJvbm1lbnQuZ3ppcC5jb21wcmVzcyAmJiBtZXRob2QgPT09ICdQT1NUJyAmJiBjb21wcmVzc2VkUG9zdCkge1xuICAgICAgICBjb25zdCBkYXRhTGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gICAgICAgIGRhdGEgPSBDTElRWkVudmlyb25tZW50Lmd6aXAuY29tcHJlc3MoZGF0YSk7XG4gICAgICAgIENMSVFaRW52aXJvbm1lbnQubG9nKFwiQ29tcHJlc3NlZCByZXF1ZXN0IHRvIFwiKyB1cmwgK1wiLCBieXRlcyBzYXZlZCA9IFwiKyAoZGF0YUxlbmd0aCAtIGRhdGEubGVuZ3RoKSArIFwiIChcIiArICgxMDAqKGRhdGFMZW5ndGggLSBkYXRhLmxlbmd0aCkvIGRhdGFMZW5ndGgpLnRvRml4ZWQoMSkgK1wiJSlcIiwgXCJDTElRWkVudmlyb25tZW50Lmh0dHBIYW5kbGVyXCIpO1xuICAgICAgICBDTElRWkVudmlyb25tZW50Lmh0dHBIYW5kbGVyKG1ldGhvZCwgdXJsLCByZXNvbHZlLCByZWplY3QsIHRpbWVvdXQsIGRhdGEsIHVuZGVmaW5lZCwgJ2d6aXAnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIENMSVFaRW52aXJvbm1lbnQuaHR0cEhhbmRsZXIobWV0aG9kLCB1cmwsIHJlc29sdmUsIHJlamVjdCwgdGltZW91dCwgZGF0YSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIHNldFRpbWVvdXQ6IHNldFRpbWVvdXQsXG4gIHNldEludGVydmFsOiBzZXRJbnRlcnZhbCxcbiAgY2xlYXJJbnRlcnZhbDogY2xlYXJJbnRlcnZhbCxcbiAgY2xlYXJUaW1lb3V0OiBjbGVhckludGVydmFsLFxuICBQcm9taXNlOiBQcm9taXNlXG59O1xuXG4iXX0=