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