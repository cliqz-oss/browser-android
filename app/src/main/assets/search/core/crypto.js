System.register('core/crypto', ['platform/md5'], function (_export) {
  'use strict';

  var md5;
  return {
    setters: [function (_platformMd5) {
      md5 = _platformMd5.md5;
    }],
    execute: function () {
      _export('md5', md5);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvY3J5cHRvLmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozt5QkFBUyxHQUFHOzs7cUJBR1YsR0FBRyIsImZpbGUiOiJjb3JlL2NyeXB0by5lcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IG1kNSB9IGZyb20gJ3BsYXRmb3JtL21kNSc7XG5cbmV4cG9ydCB7XG4gIG1kNVxufVxuIl19