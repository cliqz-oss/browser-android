System.register('adblocker/utils', ['adblocker/adblocker'], function (_export) {
  'use strict';

  var CliqzADB;

  _export('log', log);

  function log(msg) {
    var message = '[adblock] ' + msg;
    if (CliqzADB.adbDebug) {
      logDebug(message + '\n', 'xxx');
    }
  }

  return {
    setters: [function (_adblockerAdblocker) {
      CliqzADB = _adblockerAdblocker['default'];
    }],
    execute: function () {}
  };
});