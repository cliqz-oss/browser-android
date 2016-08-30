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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0b3JhZ2UuZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O3lCQUVlOztBQUViLGVBQU8sRUFBQSxpQkFBQyxFQUFFLEVBQUU7QUFDVixpQkFBTyxJQUFJLE9BQU8sQ0FBRSxVQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUs7QUFDdkMsMEJBQWMsQ0FBQyxFQUFFLEVBQUUsVUFBQyxJQUFJLEVBQUs7QUFDM0IscUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNmLENBQUMsQ0FBQztXQUNKLENBQUMsQ0FBQztTQUNKOztBQUVELGVBQU8sRUFBQSxpQkFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFO0FBQ2pCLHlCQUFlLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzVCOztBQUVELGtCQUFVLEVBQUEsb0JBQUMsRUFBRSxFQUFFO0FBQ2IseUJBQWUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDekI7O0FBRUQsYUFBSyxFQUFBLGlCQUFHLEVBQ1A7T0FDRiIsImZpbGUiOiJzdG9yYWdlLmVzIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbmV4cG9ydCBkZWZhdWx0IHtcblxuICBnZXRJdGVtKGlkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICByZWFkRmlsZU5hdGl2ZShpZCwgKGRhdGEpID0+IHtcbiAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIHNldEl0ZW0oaWQsIHZhbHVlKSB7XG4gICAgd3JpdGVGaWxlTmF0aXZlKGlkLCB2YWx1ZSk7XG4gIH0sXG5cbiAgcmVtb3ZlSXRlbShpZCkge1xuICAgIHdyaXRlRmlsZU5hdGl2ZShpZCwgXCJcIik7XG4gIH0sXG5cbiAgY2xlYXIoKSB7XG4gIH1cbn07XG4iXX0=