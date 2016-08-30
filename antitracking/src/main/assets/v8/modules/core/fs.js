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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvZnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OzswQkFTVyxRQUFRLEVBU1IsU0FBUyxFQVFULEtBQUs7OztxQ0ExQlAsY0FBYzs7Ozs7QUFTWixjQUFRLEdBQUcsRUFBRSxDQUFDLFFBQVEsSUFBSSxjQUFjOzs7Ozs7Ozs7OztBQVN4QyxlQUFTLEdBQUcsRUFBRSxDQUFDLFNBQVMsSUFBSSxjQUFjOzs7Ozs7Ozs7O0FBUTFDLFdBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxJQUFJLGNBQWMiLCJmaWxlIjoiY29yZS9mcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IG5vdEltcGxlbWVudGVkIH0gZnJvbSBcImNvcmUvcGxhdGZvcm1cIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJwbGF0Zm9ybS9mc1wiO1xuXG4vKipcbiAqIHJlYWQgZmlsZSBmcm9tIGRlZmF1bHQgbG9jYXRpb25cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xBcnJheX0gcGF0aFxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBsZXQgcmVhZEZpbGUgPSBmcy5yZWFkRmlsZSB8fCBub3RJbXBsZW1lbnRlZDtcblxuLyoqXG4gKiB3cml0ZSB0byBmaWxlIGZyb20gZGVmYXVsdCBsb2NhdGlvblxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfEFycmF5fSBwYXRoXG4gKiBAcGFyYW0ge2RhdGF9IGRhdGEgLSBpbiBhIGZvcm1hdCBhY2NlcHRlZCBieSB0aGUgcGxhdGZvcm1cbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICovXG5leHBvcnQgbGV0IHdyaXRlRmlsZSA9IGZzLndyaXRlRmlsZSB8fCBub3RJbXBsZW1lbnRlZDtcblxuLyoqXG4gKiBjcmVhdGUgZGlyZWN0b3J5IGluIGRlZmF1bHQgbG9jYXRpb25cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xBcnJheX0gcGF0aFxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBsZXQgbWtkaXIgPSBmcy5ta2RpciB8fCBub3RJbXBsZW1lbnRlZDtcbiJdfQ==