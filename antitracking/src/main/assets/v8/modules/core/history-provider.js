System.register('core/history-provider', [], function (_export) {
  'use strict';

  return {
    setters: [],
    execute: function () {
      Cu['import']('resource://gre/modules/PlacesUtils.jsm');

      _export('default', {
        connection: null,

        query: function query(sql) {
          var columns = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

          if (!this.connection) {
            this.connection = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
          }

          var statement = this.connection.createAsyncStatement(sql),
              results = [];
          var resolver = undefined,
              rejecter = undefined,
              promise = undefined;

          promise = new Promise(function (resolve, reject) {
            resolver = resolve;
            rejecter = reject;
          });

          statement.executeAsync({
            handleCompletion: function handleCompletion(reason) {
              resolver(results);
            },

            handleError: rejecter,

            handleResult: function handleResult(resultSet) {
              var row = undefined;
              while (row = resultSet.getNextRow()) {
                var result = columns.reduce(function (result, column) {
                  result[column] = row.getResultByName(column);
                  return result;
                }, Object.create(null));
                results.push(result);
              }
            }
          });

          return promise;
        }
      });
    }
  };
});