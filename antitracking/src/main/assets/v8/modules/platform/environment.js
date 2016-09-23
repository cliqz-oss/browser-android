System.register('platform/environment', ['core/events'], function (_export) {
  'use strict';

  var CliqzEvents, _PREFS_FILE, prefs, CLIQZEnvironment;

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

      CLIQZEnvironment = {
        log: logDebug,
        getPref: function getPref(prefKey, defaultValue) {
          return prefs[prefKey] || defaultValue;
        },
        setPref: function setPref(prefKey, value) {
          var changed = prefs[prefKey] !== value;
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
      };

      _export('default', CLIQZEnvironment);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVudmlyb25tZW50LmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OzttQkFFSSxXQUFXLEVBQ1gsS0FBSyxFQVVMLGdCQUFnQjs7QUFKcEIsV0FBUyxhQUFhLEdBQUc7QUFDdkIsbUJBQWUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0dBQ3JEOzs7OztBQVRHLGlCQUFXLEdBQUcsa0JBQWtCO0FBQ2hDLFdBQUssR0FBRyxFQUFFOzs7QUFFZCxvQkFBYyxDQUFDLFdBQVcsRUFBRSxVQUFDLElBQUksRUFBSztBQUNwQyxhQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7T0FDbEMsQ0FBQyxDQUFDLEFBSUYsQ0FBQzs7QUFFRSxzQkFBZ0IsR0FBRztBQUNyQixXQUFHLEVBQUUsUUFBUTtBQUNiLGVBQU8sRUFBRSxpQkFBUyxPQUFPLEVBQUUsWUFBWSxFQUFFO0FBQ3ZDLGlCQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxZQUFZLENBQUM7U0FDdkM7QUFDRCxlQUFPLEVBQUUsaUJBQVMsT0FBTyxFQUFFLEtBQUssRUFBRTtBQUNoQyxjQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxDQUFDO0FBQ3pDLGVBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDdkIsdUJBQWEsRUFBRSxDQUFDOztBQUVoQixjQUFJLE9BQU8sRUFBRTtBQUNYLHVCQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztXQUN4QztTQUNGO0FBQ0QsZUFBTyxFQUFFLGlCQUFTLE9BQU8sRUFBRTtBQUN6QixpQkFBTyxPQUFPLElBQUksS0FBSyxDQUFDO1NBQ3pCO0FBQ0QsbUJBQVc7Ozs7Ozs7Ozs7V0FBRSxVQUFTLE1BQU0sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO0FBQ25FLGNBQUksZUFBZSxHQUFHLFNBQWxCLGVBQWUsQ0FBSSxFQUFFLEVBQUs7QUFDNUIsbUJBQU8sVUFBQyxJQUFJLEVBQUs7QUFDZixnQkFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNoQixDQUFBO1dBQ0YsQ0FBQztBQUNGLHFCQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxlQUFlLENBQUMsUUFBUSxDQUFDLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sSUFBSSxNQUFNLEtBQUssTUFBTSxHQUFHLEtBQUssR0FBRyxJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1NBQzFJLENBQUE7QUFDRCwwQkFBa0IsRUFBRSw0QkFBUyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFO0FBQ3ZFLGlCQUFPLElBQUksT0FBTyxDQUFFLFVBQVMsT0FBTyxFQUFFLE1BQU0sRUFBRTs7O0FBRzVDLGdCQUFJLGdCQUFnQixDQUFDLElBQUksSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLE1BQU0sS0FBSyxNQUFNLElBQUksY0FBYyxFQUFFO0FBQ2xHLGtCQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQy9CLGtCQUFJLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1Qyw4QkFBZ0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEdBQUUsR0FBRyxHQUFFLGtCQUFrQixJQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBLEFBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUUsVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUEsQUFBQyxHQUFFLFVBQVUsQ0FBQSxDQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRSxJQUFJLEVBQUUsOEJBQThCLENBQUMsQ0FBQztBQUMzTSw4QkFBZ0IsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQzlGLE1BQU07QUFDTCw4QkFBZ0IsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQzthQUMzRTtXQUNGLENBQUMsQ0FBQztTQUNKO0FBQ0Qsa0JBQVUsRUFBRSxVQUFVO0FBQ3RCLG1CQUFXLEVBQUUsV0FBVztBQUN4QixxQkFBYSxFQUFFLGFBQWE7QUFDNUIsb0JBQVksRUFBRSxhQUFhO0FBQzNCLGVBQU8sRUFBRSxPQUFPO09BQ2pCOzt5QkFFYyxnQkFBZ0IiLCJmaWxlIjoiZW52aXJvbm1lbnQuZXMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ2xpcXpFdmVudHMgZnJvbSAnY29yZS9ldmVudHMnO1xuXG52YXIgX1BSRUZTX0ZJTEUgPSAnY2xpcXoucHJlZnMuanNvbic7XG52YXIgcHJlZnMgPSB7fTtcbi8vIGxvYWQgcHJlZnMgZnJvbSBmaWxlXG5yZWFkRmlsZU5hdGl2ZShfUFJFRlNfRklMRSwgKGRhdGEpID0+IHtcbiAgcHJlZnMgPSBKU09OLnBhcnNlKGRhdGEgfHwgJ3t9Jyk7XG59KTtcblxuZnVuY3Rpb24gX3BlcnNpc3RQcmVmcygpIHtcbiAgd3JpdGVGaWxlTmF0aXZlKF9QUkVGU19GSUxFLCBKU09OLnN0cmluZ2lmeShwcmVmcykpO1xufTtcblxudmFyIENMSVFaRW52aXJvbm1lbnQgPSB7XG4gIGxvZzogbG9nRGVidWcsXG4gIGdldFByZWY6IGZ1bmN0aW9uKHByZWZLZXksIGRlZmF1bHRWYWx1ZSkge1xuICAgIHJldHVybiBwcmVmc1twcmVmS2V5XSB8fCBkZWZhdWx0VmFsdWU7XG4gIH0sXG4gIHNldFByZWY6IGZ1bmN0aW9uKHByZWZLZXksIHZhbHVlKSB7XG4gICAgY29uc3QgY2hhbmdlZCA9IHByZWZzW3ByZWZLZXldICE9PSB2YWx1ZTtcbiAgICBwcmVmc1twcmVmS2V5XSA9IHZhbHVlO1xuICAgIF9wZXJzaXN0UHJlZnMoKTtcbiAgICAvLyB0cmlnZ2VyIHByZWZjaGFuZ2UgZXZlbnRcbiAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgQ2xpcXpFdmVudHMucHViKCdwcmVmY2hhbmdlJywgcHJlZktleSk7XG4gICAgfVxuICB9LFxuICBoYXNQcmVmOiBmdW5jdGlvbihwcmVmS2V5KSB7XG4gICAgcmV0dXJuIHByZWZLZXkgaW4gcHJlZnM7XG4gIH0sXG4gIGh0dHBIYW5kbGVyOiBmdW5jdGlvbihtZXRob2QsIHVybCwgY2FsbGJhY2ssIG9uZXJyb3IsIHRpbWVvdXQsIGRhdGEpIHtcbiAgICB2YXIgd3JhcHBlZENhbGxiYWNrID0gKGNiKSA9PiB7XG4gICAgICByZXR1cm4gKHJlc3ApID0+IHtcbiAgICAgICAgY2IgJiYgY2IocmVzcCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBodHRwSGFuZGxlcihtZXRob2QsIHVybCwgd3JhcHBlZENhbGxiYWNrKGNhbGxiYWNrKSwgd3JhcHBlZENhbGxiYWNrKG9uZXJyb3IpLCB0aW1lb3V0IHx8IG1ldGhvZCA9PT0gJ1BPU1QnID8gMTAwMDAgOiAxMDAwLCBkYXRhIHx8IG51bGwpO1xuICB9LFxuICBwcm9taXNlSHR0cEhhbmRsZXI6IGZ1bmN0aW9uKG1ldGhvZCwgdXJsLCBkYXRhLCB0aW1lb3V0LCBjb21wcmVzc2VkUG9zdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSggZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAvLyBnemlwLmNvbXByZXNzIG1heSBiZSBmYWxzZSBpZiB0aGVyZSBpcyBubyBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBwbGF0Zm9ybVxuICAgICAgLy8gb3IgbWF5YmUgaXQgaXMgbm90IGxvYWRlZCB5ZXRcbiAgICAgIGlmIChDTElRWkVudmlyb25tZW50Lmd6aXAgJiYgQ0xJUVpFbnZpcm9ubWVudC5nemlwLmNvbXByZXNzICYmIG1ldGhvZCA9PT0gJ1BPU1QnICYmIGNvbXByZXNzZWRQb3N0KSB7XG4gICAgICAgIGNvbnN0IGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgZGF0YSA9IENMSVFaRW52aXJvbm1lbnQuZ3ppcC5jb21wcmVzcyhkYXRhKTtcbiAgICAgICAgQ0xJUVpFbnZpcm9ubWVudC5sb2coXCJDb21wcmVzc2VkIHJlcXVlc3QgdG8gXCIrIHVybCArXCIsIGJ5dGVzIHNhdmVkID0gXCIrIChkYXRhTGVuZ3RoIC0gZGF0YS5sZW5ndGgpICsgXCIgKFwiICsgKDEwMCooZGF0YUxlbmd0aCAtIGRhdGEubGVuZ3RoKS8gZGF0YUxlbmd0aCkudG9GaXhlZCgxKSArXCIlKVwiLCBcIkNMSVFaRW52aXJvbm1lbnQuaHR0cEhhbmRsZXJcIik7XG4gICAgICAgIENMSVFaRW52aXJvbm1lbnQuaHR0cEhhbmRsZXIobWV0aG9kLCB1cmwsIHJlc29sdmUsIHJlamVjdCwgdGltZW91dCwgZGF0YSwgdW5kZWZpbmVkLCAnZ3ppcCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQ0xJUVpFbnZpcm9ubWVudC5odHRwSGFuZGxlcihtZXRob2QsIHVybCwgcmVzb2x2ZSwgcmVqZWN0LCB0aW1lb3V0LCBkYXRhKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgc2V0VGltZW91dDogc2V0VGltZW91dCxcbiAgc2V0SW50ZXJ2YWw6IHNldEludGVydmFsLFxuICBjbGVhckludGVydmFsOiBjbGVhckludGVydmFsLFxuICBjbGVhclRpbWVvdXQ6IGNsZWFySW50ZXJ2YWwsXG4gIFByb21pc2U6IFByb21pc2Vcbn07XG5cbmV4cG9ydCBkZWZhdWx0IENMSVFaRW52aXJvbm1lbnQ7XG4iXX0=