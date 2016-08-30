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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvZ3ppcC5lcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O1lBUVcsUUFBUSxFQVFSLFVBQVU7Ozs7OztBQVJWLGNBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLEtBQUs7Ozs7Ozs7Ozs7QUFRakMsZ0JBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLEtBQUsiLCJmaWxlIjoiY29yZS9nemlwLmVzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZ3ppcCBmcm9tIFwicGxhdGZvcm0vZ3ppcFwiO1xuXG4vKipcbiAqICBDb21wcmVzcyBhIHN0cmluZ1xuICpcbiAqICBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGNvbXByZXNzXG4gKiAgQHJldHVybnMge1VJbnQ4QXJyYXl9IGNvbXByZXNzZWQgZGF0YVxuICovXG5leHBvcnQgbGV0IGNvbXByZXNzID0gZ3ppcC5jb21wcmVzcyB8fCBmYWxzZTtcblxuLyoqXG4gKiAgRGVjb21wcmVzcyBhIEd6aXAgY29tcHJlc3NlZCBzdHJpbmdcbiAqXG4gKiAgQHBhcmFtIHtVSW50OEFycmF5fSBnemlwcGVkIGRhdGFcbiAqICBAcmV0dXJucyB7c3RyaW5nfSBkZWNvbXByZXNzZWQgc3RyaW5nXG4gKi9cbmV4cG9ydCBsZXQgZGVjb21wcmVzcyA9IGd6aXAuZGVjb21wcmVzcyB8fCBmYWxzZTtcbiJdfQ==