System.register('adblocker/background', ['adblocker/adblocker'], function (_export) {
  'use strict';

  var CliqzADB;
  return {
    setters: [function (_adblockerAdblocker) {
      CliqzADB = _adblockerAdblocker['default'];
    }],
    execute: function () {
      _export('default', {
        init: function init() {
          if (CliqzADB.getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
            return;
          }
          CliqzADB.init();
        },

        unload: function unload() {
          if (CliqzADB.getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
            return;
          }
          CliqzADB.unload();
        }
      });
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9iYWNrZ3JvdW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozt5QkFHZTtBQUNiLFlBQUksRUFBQSxnQkFBRztBQUNMLGNBQUksUUFBUSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFO0FBQ3BFLG1CQUFPO1dBQ1I7QUFDRCxrQkFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ2pCOztBQUVELGNBQU0sRUFBQSxrQkFBRztBQUNQLGNBQUksUUFBUSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFO0FBQ3BFLG1CQUFPO1dBQ1I7QUFDRCxrQkFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ25CO09BQ0YiLCJmaWxlIjoiYWRibG9ja2VyL2JhY2tncm91bmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ2xpcXpBREIgZnJvbSAnYWRibG9ja2VyL2FkYmxvY2tlcic7XG5cblxuZXhwb3J0IGRlZmF1bHQge1xuICBpbml0KCkge1xuICAgIGlmIChDbGlxekFEQi5nZXRCcm93c2VyTWFqb3JWZXJzaW9uKCkgPCBDbGlxekFEQi5NSU5fQlJPV1NFUl9WRVJTSU9OKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIENsaXF6QURCLmluaXQoKTtcbiAgfSxcblxuICB1bmxvYWQoKSB7XG4gICAgaWYgKENsaXF6QURCLmdldEJyb3dzZXJNYWpvclZlcnNpb24oKSA8IENsaXF6QURCLk1JTl9CUk9XU0VSX1ZFUlNJT04pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgQ2xpcXpBREIudW5sb2FkKCk7XG4gIH0sXG59O1xuIl19