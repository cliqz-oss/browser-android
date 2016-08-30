System.register("core/cliqz", [], function (_export) {
  "use strict";

  var Promise;
  return {
    setters: [],
    execute: function () {
      _export("utils", CliqzUtils);

      _export("events", CliqzEvents);

      _export("language", CliqzLanguage);

      Promise = CliqzUtils.Promise;

      _export("Promise", Promise);

      _export("handlebars", CliqzHandlebars);

      _export("environment", CLIQZEnvironment);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvY2xpcXouZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O01BR1csT0FBTzs7Ozt1QkFIVCxVQUFVOzt3QkFDVixXQUFXOzswQkFDWCxhQUFhOztBQUNYLGFBQU8sR0FBRyxVQUFVLENBQUMsT0FBTzs7Ozs0QkFDOUIsZUFBZTs7NkJBQ2YsZ0JBQWdCIiwiZmlsZSI6ImNvcmUvY2xpcXouZXMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgeyBDbGlxelV0aWxzIGFzIHV0aWxzIH07XG5leHBvcnQgeyBDbGlxekV2ZW50cyBhcyBldmVudHMgfTtcbmV4cG9ydCB7IENsaXF6TGFuZ3VhZ2UgYXMgbGFuZ3VhZ2UgfTtcbmV4cG9ydCBsZXQgUHJvbWlzZSA9IENsaXF6VXRpbHMuUHJvbWlzZTtcbmV4cG9ydCB7IENsaXF6SGFuZGxlYmFycyBhcyBoYW5kbGViYXJzIH07XG5leHBvcnQgeyBDTElRWkVudmlyb25tZW50IGFzIGVudmlyb25tZW50IH07XG4iXX0=