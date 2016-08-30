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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR08sV0FBUyxHQUFHLENBQUMsR0FBRyxFQUFFO0FBQ3ZCLFFBQU0sT0FBTyxrQkFBZ0IsR0FBRyxBQUFFLENBQUM7QUFDbkMsUUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFO0FBQ3JCLGNBQVEsQ0FBSSxPQUFPLFNBQU0sS0FBSyxDQUFDLENBQUM7S0FDakM7R0FDRiIsImZpbGUiOiJhZGJsb2NrZXIvdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ2xpcXpBREIgZnJvbSAnYWRibG9ja2VyL2FkYmxvY2tlcic7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxvZyhtc2cpIHtcbiAgY29uc3QgbWVzc2FnZSA9IGBbYWRibG9ja10gJHttc2d9YDtcbiAgaWYgKENsaXF6QURCLmFkYkRlYnVnKSB7XG4gICAgbG9nRGVidWcoYCR7bWVzc2FnZX1cXG5gLCAneHh4Jyk7XG4gIH1cbn1cbiJdfQ==