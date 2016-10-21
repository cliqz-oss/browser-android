System.register("core/fs", ["core/platform", "platform/fs"], function (_export) {

  /**
   * read file from default location
   *
   * @param {string|Array} path
   * @returns {Promise}
   */
  "use strict";

  var notImplemented, fs, readFile, writeFile, mkdir;
  return {
    setters: [function (_corePlatform) {
      notImplemented = _corePlatform.notImplemented;
    }, function (_platformFs) {
      fs = _platformFs;
    }],
    execute: function () {
      readFile = fs.readFile || notImplemented;

      _export("readFile", readFile);

      /**
       * write to file from default location
       *
       * @param {string|Array} path
       * @param {data} data - in a format accepted by the platform
       * @returns {Promise}
       */
      writeFile = fs.writeFile || notImplemented;

      _export("writeFile", writeFile);

      /**
       * create directory in default location
       *
       * @param {string|Array} path
       * @returns {Promise}
       */
      mkdir = fs.mkdir || notImplemented;

      _export("mkdir", mkdir);
    }
  };
});