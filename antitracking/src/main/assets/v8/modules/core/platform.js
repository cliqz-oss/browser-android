System.register('core/platform', ['platform/platform'], function (_export) {
  'use strict';

  var platform, isFirefox, isMobile;

  _export('notImplemented', notImplemented);

  function notImplemented() {
    throw new Error('Not implemented');
  }

  return {
    setters: [function (_platformPlatform) {
      platform = _platformPlatform['default'];
    }],
    execute: function () {
      isFirefox = platform.isFirefox;

      _export('isFirefox', isFirefox);

      isMobile = platform.isMobile;

      _export('isMobile', isMobile);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvcGxhdGZvcm0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O2dCQU1XLFNBQVMsRUFDVCxRQUFROzs7O0FBTFosV0FBUyxjQUFjLEdBQUc7QUFDL0IsVUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0dBQ3BDOzs7Ozs7O0FBRVUsZUFBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTOzs7O0FBQzlCLGNBQVEsR0FBRyxRQUFRLENBQUMsUUFBUSIsImZpbGUiOiJjb3JlL3BsYXRmb3JtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBsYXRmb3JtIGZyb20gJ3BsYXRmb3JtL3BsYXRmb3JtJztcblxuZXhwb3J0IGZ1bmN0aW9uIG5vdEltcGxlbWVudGVkKCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufVxuXG5leHBvcnQgbGV0IGlzRmlyZWZveCA9IHBsYXRmb3JtLmlzRmlyZWZveDtcbmV4cG9ydCBsZXQgaXNNb2JpbGUgPSBwbGF0Zm9ybS5pc01vYmlsZTtcbiJdfQ==