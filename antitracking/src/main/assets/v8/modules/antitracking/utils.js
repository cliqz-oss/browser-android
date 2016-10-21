System.register('antitracking/utils', ['core/gzip'], function (_export) {
  'use strict';

  var compress;

  _export('compressionAvailable', compressionAvailable);

  _export('compressJSONToBase64', compressJSONToBase64);

  _export('splitTelemetryData', splitTelemetryData);

  _export('generatePayload', generatePayload);

  function _arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function compressionAvailable() {
    return compress !== false;
  }

  function compressJSONToBase64(obj) {
    var bytes = compress(JSON.stringify(obj));
    return _arrayBufferToBase64(bytes);
  }

  function splitTelemetryData(data, bucketSize) {
    var acc = 0;
    var bucket = {};
    var splitData = [];
    for (var k in data) {
      var _length = JSON.stringify(data[k]).length;
      // full bucket
      if (acc != 0 && acc + _length > bucketSize) {
        // full bucket, push it
        splitData.push(bucket);
        bucket = {};
        acc = 0;
      }
      acc += _length;
      bucket[k] = data[k];
    }
    if (Object.keys(bucket).length > 0) {
      splitData.push(bucket);
    }
    return splitData;
  }

  function generatePayload(data, ts, instant, attachAttrs) {
    var payl = {
      'data': data,
      'ts': ts,
      'anti-duplicates': Math.floor(Math.random() * 10000000)
    };
    if (instant) payl['instant'] = true;
    if (attachAttrs) {
      for (var k in attachAttrs) {
        payl[k] = attachAttrs[k];
      }
    }
    return payl;
  }

  return {
    setters: [function (_coreGzip) {
      compress = _coreGzip.compress;
    }],
    execute: function () {}
  };
});