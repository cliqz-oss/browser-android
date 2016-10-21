System.register("platform/storage", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", {

        getItem: function getItem(id) {
          return new Promise(function (resolve, reject) {
            readFileNative(id, function (data) {
              resolve(data);
            });
          });
        },

        setItem: function setItem(id, value) {
          writeFileNative(id, value);
        },

        removeItem: function removeItem(id) {
          writeFileNative(id, "");
        },

        clear: function clear() {}
      });
    }
  };
});