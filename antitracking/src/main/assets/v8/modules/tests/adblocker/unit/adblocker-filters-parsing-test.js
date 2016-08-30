System.register('tests/adblocker/unit/adblocker-filters-parsing-test', [], function (_export) {
  /* global chai */
  /* global describeModule */

  'use strict';

  function loadTestCases(path) {
    var fs = require('fs');
    var data = fs.readFileSync(path, 'utf8');
    var testCases = [];

    // Parse test cases
    data.split(/\n/).forEach(function (line) {
      var testCase = null;
      try {
        testCase = JSON.parse(line);
        testCases.push(testCase);
      } catch (ex) {
        /* Ignore exception */
      }
    });

    return testCases;
  }

  return {
    setters: [],
    execute: function () {
      _export('default', describeModule('adblocker/filters-parsing', function () {
        return {
          'adblocker/utils': {
            log: function log() {
              return 0;
            }
          },
          'core/cliqz': {
            utils: {}
          }
        };
      }, function () {
        describe('#AdFilter', function () {
          var AdFilter = undefined;

          // Generate test cases
          context('Filters parsing', function () {
            beforeEach(function () {
              AdFilter = this.module().AdFilter;
            });

            var dataPath = 'modules/adblocker/tests/unit/data/filters_parsing.txt';
            loadTestCases(dataPath).forEach(function (testCase) {
              it('parses ' + testCase.filter + ' correctly', function () {
                return new Promise(function (resolve, reject) {
                  var parsed = new AdFilter(testCase.filter);
                  Object.keys(testCase.compiled).forEach(function (key) {
                    if (parsed[key] !== testCase.compiled[key]) {
                      reject('Expected ' + key + ' == ' + testCase.compiled[key] + ' (found ' + parsed[key] + ')');
                    }
                  });
                  resolve();
                });
              });
            });
          });
        });
      }));
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3RzL2FkYmxvY2tlci91bml0L2FkYmxvY2tlci1maWx0ZXJzLXBhcnNpbmctdGVzdC5lcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFJQSxXQUFTLGFBQWEsQ0FBQyxJQUFJLEVBQUU7QUFDM0IsUUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pCLFFBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzNDLFFBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQzs7O0FBR3JCLFFBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSSxFQUFJO0FBQzlCLFVBQUksUUFBUSxHQUFHLElBQUksQ0FBQztBQUNwQixVQUFJO0FBQ0YsZ0JBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVCLGlCQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO09BQzFCLENBQUMsT0FBTyxFQUFFLEVBQUU7O09BRVo7S0FDSCxDQUFDLENBQUM7O0FBRUgsV0FBTyxTQUFTLENBQUM7R0FDbEI7Ozs7O3lCQUdjLGNBQWMsQ0FBQywyQkFBMkIsRUFDdkQsWUFBWTtBQUNWLGVBQU87QUFDTCwyQkFBaUIsRUFBRTtBQUNqQixlQUFHLEVBQUU7cUJBQU0sQ0FBQzthQUFBO1dBQ2I7QUFDRCxzQkFBWSxFQUFFO0FBQ1osaUJBQUssRUFBRSxFQUFFO1dBQ1Y7U0FDRixDQUFDO09BQ0gsRUFDRCxZQUFZO0FBQ1YsZ0JBQVEsQ0FBQyxXQUFXLEVBQUUsWUFBWTtBQUNoQyxjQUFJLFFBQVEsWUFBQSxDQUFDOzs7QUFHYixpQkFBTyxDQUFDLGlCQUFpQixFQUFFLFlBQVk7QUFDckMsc0JBQVUsQ0FBQyxZQUFZO0FBQ3JCLHNCQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQzthQUNuQyxDQUFDLENBQUM7O0FBRUgsZ0JBQU0sUUFBUSxHQUFHLHVEQUF1RCxDQUFDO0FBQ3pFLHlCQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsUUFBUSxFQUFJO0FBQzFDLGdCQUFFLGFBQVcsUUFBUSxDQUFDLE1BQU0saUJBQWMsWUFBTTtBQUM5Qyx1QkFBTyxJQUFJLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDNUMsc0JBQU0sTUFBTSxHQUFHLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3Qyx3QkFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRyxFQUFJO0FBQzVDLHdCQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzFDLDRCQUFNLGVBQWEsR0FBRyxZQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFXLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBSSxDQUFDO3FCQUMvRTttQkFDRixDQUFDLENBQUM7QUFDSCx5QkFBTyxFQUFFLENBQUM7aUJBQ1gsQ0FBQyxDQUFDO2VBQ0osQ0FBQyxDQUFDO2FBQ0osQ0FBQyxDQUFDO1dBQ0osQ0FBQyxDQUFDO1NBQ0osQ0FBQyxDQUFDO09BQ0osQ0FDRiIsImZpbGUiOiJ0ZXN0cy9hZGJsb2NrZXIvdW5pdC9hZGJsb2NrZXItZmlsdGVycy1wYXJzaW5nLXRlc3QuZXMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgY2hhaSAqL1xuLyogZ2xvYmFsIGRlc2NyaWJlTW9kdWxlICovXG5cblxuZnVuY3Rpb24gbG9hZFRlc3RDYXNlcyhwYXRoKSB7XG4gIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgY29uc3QgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpO1xuICBjb25zdCB0ZXN0Q2FzZXMgPSBbXTtcblxuICAvLyBQYXJzZSB0ZXN0IGNhc2VzXG4gIGRhdGEuc3BsaXQoL1xcbi8pLmZvckVhY2gobGluZSA9PiB7XG4gICAgIGxldCB0ZXN0Q2FzZSA9IG51bGw7XG4gICAgIHRyeSB7XG4gICAgICAgdGVzdENhc2UgPSBKU09OLnBhcnNlKGxpbmUpO1xuICAgICAgIHRlc3RDYXNlcy5wdXNoKHRlc3RDYXNlKTtcbiAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAvKiBJZ25vcmUgZXhjZXB0aW9uICovXG4gICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRlc3RDYXNlcztcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBkZXNjcmliZU1vZHVsZSgnYWRibG9ja2VyL2ZpbHRlcnMtcGFyc2luZycsXG4gIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2FkYmxvY2tlci91dGlscyc6IHtcbiAgICAgICAgbG9nOiAoKSA9PiAwLFxuICAgICAgfSxcbiAgICAgICdjb3JlL2NsaXF6Jzoge1xuICAgICAgICB1dGlsczoge30sXG4gICAgICB9LFxuICAgIH07XG4gIH0sXG4gIGZ1bmN0aW9uICgpIHtcbiAgICBkZXNjcmliZSgnI0FkRmlsdGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IEFkRmlsdGVyO1xuXG4gICAgICAvLyBHZW5lcmF0ZSB0ZXN0IGNhc2VzXG4gICAgICBjb250ZXh0KCdGaWx0ZXJzIHBhcnNpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGJlZm9yZUVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIEFkRmlsdGVyID0gdGhpcy5tb2R1bGUoKS5BZEZpbHRlcjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgZGF0YVBhdGggPSAnbW9kdWxlcy9hZGJsb2NrZXIvdGVzdHMvdW5pdC9kYXRhL2ZpbHRlcnNfcGFyc2luZy50eHQnO1xuICAgICAgICBsb2FkVGVzdENhc2VzKGRhdGFQYXRoKS5mb3JFYWNoKHRlc3RDYXNlID0+IHtcbiAgICAgICAgICBpdChgcGFyc2VzICR7dGVzdENhc2UuZmlsdGVyfSBjb3JyZWN0bHlgLCAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBuZXcgQWRGaWx0ZXIodGVzdENhc2UuZmlsdGVyKTtcbiAgICAgICAgICAgICAgT2JqZWN0LmtleXModGVzdENhc2UuY29tcGlsZWQpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VkW2tleV0gIT09IHRlc3RDYXNlLmNvbXBpbGVkW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgIHJlamVjdChgRXhwZWN0ZWQgJHtrZXl9ID09ICR7dGVzdENhc2UuY29tcGlsZWRba2V5XX0gKGZvdW5kICR7cGFyc2VkW2tleV19KWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4pO1xuIl19