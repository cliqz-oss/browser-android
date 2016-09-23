System.register("core/gzip", ["platform/gzip"], function (_export) {

  /**
   *  Compress a string
   *
   *  @param {string} string to compress
   *  @returns {UInt8Array} compressed data
   */
  "use strict";

  var gzip, compress, decompress;
  return {
    setters: [function (_platformGzip) {
      gzip = _platformGzip;
    }],
    execute: function () {
      compress = gzip.compress || false;

      _export("compress", compress);

      /**
       *  Decompress a Gzip compressed string
       *
       *  @param {UInt8Array} gzipped data
       *  @returns {string} decompressed string
       */
      decompress = gzip.decompress || false;

      _export("decompress", decompress);
    }
  };
});