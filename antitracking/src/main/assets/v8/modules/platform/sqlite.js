System.register("platform/sqlite", [], function (_export) {
  "use strict";

  _export("default", getDbConn);

  function getDbConn(databaseName) {
    return null;
  }

  return {
    setters: [],
    execute: function () {}
  };
});