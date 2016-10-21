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