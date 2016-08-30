System.register("core/cliqz", ["platform/history-manager", "core/utils", "core/events"], function (_export) {
  "use strict";

  var CliqzHistoryManager, CliqzUtils, CliqzEvents, utils, events, Promise;
  return {
    setters: [function (_platformHistoryManager) {
      CliqzHistoryManager = _platformHistoryManager["default"];
    }, function (_coreUtils) {
      CliqzUtils = _coreUtils["default"];
    }, function (_coreEvents) {
      CliqzEvents = _coreEvents["default"];
    }],
    execute: function () {
      _export("historyManager", CliqzHistoryManager);

      utils = CliqzUtils;

      _export("utils", utils);

      events = CliqzEvents;

      _export("events", events);

      Promise = CliqzUtils.Promise;

      _export("Promise", Promise);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvY2xpcXouanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O29EQUtXLEtBQUssRUFDTCxNQUFNLEVBRU4sT0FBTzs7Ozs7Ozs7OztnQ0FQVCxtQkFBbUI7O0FBSWpCLFdBQUssR0FBRyxVQUFVOzs7O0FBQ2xCLFlBQU0sR0FBRyxXQUFXOzs7O0FBRXBCLGFBQU8sR0FBRyxVQUFVLENBQUMsT0FBTyIsImZpbGUiOiJjb3JlL2NsaXF6LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IENsaXF6SGlzdG9yeU1hbmFnZXIgZnJvbSBcInBsYXRmb3JtL2hpc3RvcnktbWFuYWdlclwiO1xuZXhwb3J0IHsgQ2xpcXpIaXN0b3J5TWFuYWdlciBhcyBoaXN0b3J5TWFuYWdlciB9O1xuXG5pbXBvcnQgQ2xpcXpVdGlscyBmcm9tIFwiY29yZS91dGlsc1wiO1xuaW1wb3J0IENsaXF6RXZlbnRzIGZyb20gXCJjb3JlL2V2ZW50c1wiO1xuZXhwb3J0IGxldCB1dGlscyA9IENsaXF6VXRpbHM7XG5leHBvcnQgbGV0IGV2ZW50cyA9IENsaXF6RXZlbnRzO1xuXG5leHBvcnQgbGV0IFByb21pc2UgPSBDbGlxelV0aWxzLlByb21pc2U7XG4iXX0=