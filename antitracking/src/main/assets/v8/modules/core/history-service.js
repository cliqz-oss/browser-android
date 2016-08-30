System.register("core/history-service", [], function (_export) {
  "use strict";

  var hs;
  return {
    setters: [],
    execute: function () {
      hs = undefined;

      try {
        hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
      } catch (e) {
        hs = {
          addObserver: function addObserver() {},
          removeObserver: function removeObserver() {}
        };
      }

      _export("default", hs);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvaGlzdG9yeS1zZXJ2aWNlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztNQUFJLEVBQUU7Ozs7QUFBRixRQUFFOztBQUVOLFVBQUk7QUFDRixVQUFFLEdBQUcsRUFBRSxDQUFDLDRDQUE0QyxDQUFDLENBQzdDLFVBQVUsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQztPQUM3QyxDQUFDLE9BQU0sQ0FBQyxFQUFFO0FBQ1QsVUFBRSxHQUFHO0FBQ0gscUJBQVcsRUFBQSx1QkFBRyxFQUFFO0FBQ2hCLHdCQUFjLEVBQUEsMEJBQUcsRUFBRTtTQUNwQixDQUFDO09BQ0g7O3lCQUVjLEVBQUUiLCJmaWxlIjoiY29yZS9oaXN0b3J5LXNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgaHM7XG5cbnRyeSB7XG4gIGhzID0gQ2NbXCJAbW96aWxsYS5vcmcvYnJvd3Nlci9uYXYtaGlzdG9yeS1zZXJ2aWNlOzFcIl1cbiAgICAgICAgIC5nZXRTZXJ2aWNlKENpLm5zSU5hdkhpc3RvcnlTZXJ2aWNlKTtcbn0gY2F0Y2goZSkge1xuICBocyA9IHtcbiAgICBhZGRPYnNlcnZlcigpIHt9LFxuICAgIHJlbW92ZU9ic2VydmVyKCkge31cbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgaHM7XG4iXX0=