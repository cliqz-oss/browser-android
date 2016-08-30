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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvaGlzdG9yeS1wcm92aWRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxRQUFFLFVBQU8sQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDOzt5QkFFckM7QUFDYixrQkFBVSxFQUFFLElBQUk7O0FBRWhCLGFBQUssRUFBRSxTQUFTLEtBQUssQ0FBQyxHQUFHLEVBQWdCO2NBQWQsT0FBTyx5REFBRyxFQUFFOztBQUNyQyxjQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtBQUNwQixnQkFBSSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUNsQyxjQUFjLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUMsWUFBWSxDQUFDO1dBQ3ZEOztBQUVELGNBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDO2NBQ3pELE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDZixjQUFJLFFBQVEsWUFBQTtjQUFFLFFBQVEsWUFBQTtjQUFFLE9BQU8sWUFBQSxDQUFDOztBQUVoQyxpQkFBTyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvQyxvQkFBUSxHQUFHLE9BQU8sQ0FBQztBQUNuQixvQkFBUSxHQUFHLE1BQU0sQ0FBQztXQUNuQixDQUFDLENBQUM7O0FBRUgsbUJBQVMsQ0FBQyxZQUFZLENBQUM7QUFDckIsNEJBQWdCLEVBQUEsMEJBQUMsTUFBTSxFQUFFO0FBQ3ZCLHNCQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDbkI7O0FBRUQsdUJBQVcsRUFBRSxRQUFROztBQUVyQix3QkFBWSxFQUFBLHNCQUFDLFNBQVMsRUFBRTtBQUN0QixrQkFBSSxHQUFHLFlBQUEsQ0FBQztBQUNSLHFCQUFPLEdBQUcsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLEVBQUU7QUFDbkMsb0JBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUUsVUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFLO0FBQ2pELHdCQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3Qyx5QkFBTyxNQUFNLENBQUM7aUJBQ2YsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDeEIsdUJBQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7ZUFDdEI7YUFDRjtXQUNGLENBQUMsQ0FBQzs7QUFFSCxpQkFBTyxPQUFPLENBQUM7U0FDaEI7T0FDRiIsImZpbGUiOiJjb3JlL2hpc3RvcnktcHJvdmlkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJDdS5pbXBvcnQoJ3Jlc291cmNlOi8vZ3JlL21vZHVsZXMvUGxhY2VzVXRpbHMuanNtJyk7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgY29ubmVjdGlvbjogbnVsbCxcblxuICBxdWVyeTogZnVuY3Rpb24gcXVlcnkoc3FsLCBjb2x1bW5zID0gW10pIHtcbiAgICBpZiAoIXRoaXMuY29ubmVjdGlvbikge1xuICAgICAgdGhpcy5jb25uZWN0aW9uID0gUGxhY2VzVXRpbHMuaGlzdG9yeVxuICAgICAgICAuUXVlcnlJbnRlcmZhY2UoQ2kubnNQSVBsYWNlc0RhdGFiYXNlKS5EQkNvbm5lY3Rpb247XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGVtZW50ID0gdGhpcy5jb25uZWN0aW9uLmNyZWF0ZUFzeW5jU3RhdGVtZW50KHNxbCksXG4gICAgICByZXN1bHRzID0gW107XG4gICAgbGV0IHJlc29sdmVyLCByZWplY3RlciwgcHJvbWlzZTtcblxuICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXNvbHZlciA9IHJlc29sdmU7XG4gICAgICByZWplY3RlciA9IHJlamVjdDtcbiAgICB9KTtcblxuICAgIHN0YXRlbWVudC5leGVjdXRlQXN5bmMoe1xuICAgICAgaGFuZGxlQ29tcGxldGlvbihyZWFzb24pIHtcbiAgICAgICAgcmVzb2x2ZXIocmVzdWx0cyk7XG4gICAgICB9LFxuXG4gICAgICBoYW5kbGVFcnJvcjogcmVqZWN0ZXIsXG5cbiAgICAgIGhhbmRsZVJlc3VsdChyZXN1bHRTZXQpIHtcbiAgICAgICAgbGV0IHJvdztcbiAgICAgICAgd2hpbGUgKHJvdyA9IHJlc3VsdFNldC5nZXROZXh0Um93KCkpIHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBjb2x1bW5zLnJlZHVjZSggKHJlc3VsdCwgY29sdW1uKSA9PiB7XG4gICAgICAgICAgICByZXN1bHRbY29sdW1uXSA9IHJvdy5nZXRSZXN1bHRCeU5hbWUoY29sdW1uKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfSwgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG59O1xuIl19