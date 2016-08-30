System.register('tests/adblocker/unit/adblocker-filters-engine-test', [], function (_export) {
  /* global chai */
  /* global describeModule */

  'use strict';

  function loadLinesFromFile(path) {
    var fs = require('fs');
    var data = fs.readFileSync(path, 'utf8');
    return data.split(/\n/);
  }

  function loadTestCases(path) {
    var testCases = [];

    // Parse test cases
    loadLinesFromFile(path).forEach(function (line) {
      try {
        var testCase = JSON.parse(line);
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
      _export('default', describeModule('adblocker/filters-engine', function () {
        return {
          'adblocker/utils': {
            log: function log(msg) {
              // const message = `[adblock] ${msg}`;
              // console.log(message);
            }
          },
          'antitracking/hash': {
            HashProb: function HashProb() {
              return { isHash: function isHash() {
                  return false;
                } };
            }
          },
          'core/cliqz': {
            utils: {}
          }
        };
      }, function () {
        describe('Test filter engine one filter at a time', function () {
          var _this = this;

          var FilterEngine = undefined;
          var engine = null;
          var matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';

          beforeEach(function () {
            FilterEngine = this.module()['default'];
          });

          it('matches correctly', function () {
            _this.timeout(10000);
            return new Promise(function (resolve, reject) {
              loadTestCases(matchingPath).forEach(function (testCase) {
                // Create filter engine with only one filter
                engine = new FilterEngine();
                engine.onUpdateFilters(undefined, [testCase.filter]);

                // Check should match
                try {
                  if (!engine.match(testCase)) {
                    reject('Expected ' + testCase.filter + ' to match ' + testCase.url);
                  }
                  resolve();
                } catch (ex) {
                  reject('Encountered exception ' + ex + ' while matching ' + (testCase.filter + ' against ' + testCase.url));
                }
              });
            });
          });
        });

        describe('Test filter engine all filters', function () {
          var _this2 = this;

          var FilterEngine = undefined;
          var engine = null;

          // Load test cases
          var matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';
          var testCases = loadTestCases(matchingPath);

          // Load filters
          var filters = [];
          testCases.forEach(function (testCase) {
            filters.push(testCase.filter);
          });

          beforeEach(function () {
            if (engine === null) {
              FilterEngine = this.module()['default'];
              engine = new FilterEngine();
              engine.onUpdateFilters(undefined, filters);
            }
          });

          it('matches correctly against full engine', function () {
            _this2.timeout(10000);
            return new Promise(function (resolve, reject) {
              loadTestCases(matchingPath).forEach(function (testCase) {
                // Check should match
                try {
                  if (!engine.match(testCase)) {
                    reject('Expected ' + testCase.filter + ' to match ' + testCase.url);
                  }
                  resolve();
                } catch (ex) {
                  reject('Encountered exception ' + ex + ' while matching ' + (testCase.filter + ' against ' + testCase.url));
                };
              });
            });
          });
        });

        describe('Test filter engine should not match', function () {
          var _this3 = this;

          var FilterEngine = undefined;
          var engine = null;
          var filterListPath = 'modules/adblocker/tests/unit/data/filters_list.txt';
          var notMatchingPath = 'modules/adblocker/tests/unit/data/filters_not_matching.txt';

          beforeEach(function () {
            if (engine === null) {
              this.timeout(10000);
              FilterEngine = this.module()['default'];
              engine = new FilterEngine();
              engine.onUpdateFilters(undefined, loadLinesFromFile(filterListPath));
            }
          });

          it('does not match', function () {
            _this3.timeout(10000);
            return new Promise(function (resolve, reject) {
              loadTestCases(notMatchingPath).forEach(function (testCase) {
                // Check should match
                try {
                  if (engine.match(testCase)) {
                    reject('Expected to *not* match ' + testCase.url);
                  }
                  resolve();
                } catch (ex) {
                  reject('Encountered exception ' + ex + ' while matching ' + (testCase.filter + ' against ' + testCase.url));
                }
              });
            });
          });
        });
      }));
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3RzL2FkYmxvY2tlci91bml0L2FkYmxvY2tlci1maWx0ZXJzLWVuZ2luZS10ZXN0LmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUlBLFdBQVMsaUJBQWlCLENBQUMsSUFBSSxFQUFFO0FBQy9CLFFBQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6QixRQUFNLElBQUksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUMzQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDekI7O0FBR0QsV0FBUyxhQUFhLENBQUMsSUFBSSxFQUFFO0FBQzNCLFFBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQzs7O0FBR3JCLHFCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksRUFBSTtBQUN0QyxVQUFJO0FBQ0YsWUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsQyxpQkFBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztPQUMxQixDQUFDLE9BQU8sRUFBRSxFQUFFOztPQUVaO0tBQ0YsQ0FBQyxDQUFDOztBQUVILFdBQU8sU0FBUyxDQUFDO0dBQ2xCOzs7Ozt5QkFHYyxjQUFjLENBQUMsMEJBQTBCLEVBQ3RELFlBQVk7QUFDVixlQUFPO0FBQ0wsMkJBQWlCLEVBQUU7QUFDakIsZUFBRyxFQUFFLGFBQUEsR0FBRyxFQUFJOzs7YUFHWDtXQUNGO0FBQ0QsNkJBQW1CLEVBQUU7QUFDbkIsb0JBQVEsRUFBRSxvQkFBTTtBQUFFLHFCQUFPLEVBQUUsTUFBTSxFQUFFO3lCQUFNLEtBQUs7aUJBQUEsRUFBRSxDQUFDO2FBQUU7V0FDcEQ7QUFDRCxzQkFBWSxFQUFFO0FBQ1osaUJBQUssRUFBRSxFQUFFO1dBQ1Y7U0FDRixDQUFDO09BQ0gsRUFDRCxZQUFZO0FBQ1YsZ0JBQVEs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QyxHQUFHLENBQUUsQ0FBQyxDQUFDO2lCQUNqRDtlQUNGLENBQUMsQ0FBQzthQUNKLENBQUMsQ0FBQztXQUNKLENBQUMsQ0FBQztTQUNKLENBQUMsQ0FBQztPQUNKLENBQ0YiLCJmaWxlIjoidGVzdHMvYWRibG9ja2VyL3VuaXQvYWRibG9ja2VyLWZpbHRlcnMtZW5naW5lLXRlc3QuZXMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgY2hhaSAqL1xuLyogZ2xvYmFsIGRlc2NyaWJlTW9kdWxlICovXG5cblxuZnVuY3Rpb24gbG9hZExpbmVzRnJvbUZpbGUocGF0aCkge1xuICBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gIGNvbnN0IGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKTtcbiAgcmV0dXJuIGRhdGEuc3BsaXQoL1xcbi8pO1xufVxuXG5cbmZ1bmN0aW9uIGxvYWRUZXN0Q2FzZXMocGF0aCkge1xuICBjb25zdCB0ZXN0Q2FzZXMgPSBbXTtcblxuICAvLyBQYXJzZSB0ZXN0IGNhc2VzXG4gIGxvYWRMaW5lc0Zyb21GaWxlKHBhdGgpLmZvckVhY2gobGluZSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRlc3RDYXNlID0gSlNPTi5wYXJzZShsaW5lKTtcbiAgICAgIHRlc3RDYXNlcy5wdXNoKHRlc3RDYXNlKTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgLyogSWdub3JlIGV4Y2VwdGlvbiAqL1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRlc3RDYXNlcztcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBkZXNjcmliZU1vZHVsZSgnYWRibG9ja2VyL2ZpbHRlcnMtZW5naW5lJyxcbiAgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnYWRibG9ja2VyL3V0aWxzJzoge1xuICAgICAgICBsb2c6IG1zZyA9PiB7XG4gICAgICAgICAgLy8gY29uc3QgbWVzc2FnZSA9IGBbYWRibG9ja10gJHttc2d9YDtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAnYW50aXRyYWNraW5nL2hhc2gnOiB7XG4gICAgICAgIEhhc2hQcm9iOiAoKSA9PiB7IHJldHVybiB7IGlzSGFzaDogKCkgPT4gZmFsc2UgfTsgfSxcbiAgICAgIH0sXG4gICAgICAnY29yZS9jbGlxeic6IHtcbiAgICAgICAgdXRpbHM6IHt9LFxuICAgICAgfSxcbiAgICB9O1xuICB9LFxuICBmdW5jdGlvbiAoKSB7XG4gICAgZGVzY3JpYmUoJ1Rlc3QgZmlsdGVyIGVuZ2luZSBvbmUgZmlsdGVyIGF0IGEgdGltZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBGaWx0ZXJFbmdpbmU7XG4gICAgICBsZXQgZW5naW5lID0gbnVsbDtcbiAgICAgIGNvbnN0IG1hdGNoaW5nUGF0aCA9ICdtb2R1bGVzL2FkYmxvY2tlci90ZXN0cy91bml0L2RhdGEvZmlsdGVyc19tYXRjaGluZy50eHQnO1xuXG4gICAgICBiZWZvcmVFYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgRmlsdGVyRW5naW5lID0gdGhpcy5tb2R1bGUoKS5kZWZhdWx0O1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdtYXRjaGVzIGNvcnJlY3RseScsICgpID0+IHtcbiAgICAgICAgdGhpcy50aW1lb3V0KDEwMDAwKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICBsb2FkVGVzdENhc2VzKG1hdGNoaW5nUGF0aCkuZm9yRWFjaCh0ZXN0Q2FzZSA9PiB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZmlsdGVyIGVuZ2luZSB3aXRoIG9ubHkgb25lIGZpbHRlclxuICAgICAgICAgICAgZW5naW5lID0gbmV3IEZpbHRlckVuZ2luZSgpO1xuICAgICAgICAgICAgZW5naW5lLm9uVXBkYXRlRmlsdGVycyh1bmRlZmluZWQsIFt0ZXN0Q2FzZS5maWx0ZXJdKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgc2hvdWxkIG1hdGNoXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoIWVuZ2luZS5tYXRjaCh0ZXN0Q2FzZSkpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoYEV4cGVjdGVkICR7dGVzdENhc2UuZmlsdGVyfSB0byBtYXRjaCAke3Rlc3RDYXNlLnVybH1gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgICByZWplY3QoYEVuY291bnRlcmVkIGV4Y2VwdGlvbiAke2V4fSB3aGlsZSBtYXRjaGluZyBgICtcbiAgICAgICAgICAgICAgICBgJHt0ZXN0Q2FzZS5maWx0ZXJ9IGFnYWluc3QgJHt0ZXN0Q2FzZS51cmx9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnVGVzdCBmaWx0ZXIgZW5naW5lIGFsbCBmaWx0ZXJzJywgZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IEZpbHRlckVuZ2luZTtcbiAgICAgIGxldCBlbmdpbmUgPSBudWxsO1xuXG4gICAgICAvLyBMb2FkIHRlc3QgY2FzZXNcbiAgICAgIGNvbnN0IG1hdGNoaW5nUGF0aCA9ICdtb2R1bGVzL2FkYmxvY2tlci90ZXN0cy91bml0L2RhdGEvZmlsdGVyc19tYXRjaGluZy50eHQnO1xuICAgICAgY29uc3QgdGVzdENhc2VzID0gbG9hZFRlc3RDYXNlcyhtYXRjaGluZ1BhdGgpO1xuXG4gICAgICAvLyBMb2FkIGZpbHRlcnNcbiAgICAgIGNvbnN0IGZpbHRlcnMgPSBbXTtcbiAgICAgIHRlc3RDYXNlcy5mb3JFYWNoKHRlc3RDYXNlID0+IHtcbiAgICAgICAgZmlsdGVycy5wdXNoKHRlc3RDYXNlLmZpbHRlcik7XG4gICAgICB9KTtcblxuICAgICAgYmVmb3JlRWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChlbmdpbmUgPT09IG51bGwpIHtcbiAgICAgICAgICBGaWx0ZXJFbmdpbmUgPSB0aGlzLm1vZHVsZSgpLmRlZmF1bHQ7XG4gICAgICAgICAgZW5naW5lID0gbmV3IEZpbHRlckVuZ2luZSgpO1xuICAgICAgICAgIGVuZ2luZS5vblVwZGF0ZUZpbHRlcnModW5kZWZpbmVkLCBmaWx0ZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGl0KCdtYXRjaGVzIGNvcnJlY3RseSBhZ2FpbnN0IGZ1bGwgZW5naW5lJywgKCkgPT4ge1xuICAgICAgICB0aGlzLnRpbWVvdXQoMTAwMDApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIGxvYWRUZXN0Q2FzZXMobWF0Y2hpbmdQYXRoKS5mb3JFYWNoKHRlc3RDYXNlID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIHNob3VsZCBtYXRjaFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWYgKCFlbmdpbmUubWF0Y2godGVzdENhc2UpKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGBFeHBlY3RlZCAke3Rlc3RDYXNlLmZpbHRlcn0gdG8gbWF0Y2ggJHt0ZXN0Q2FzZS51cmx9YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgcmVqZWN0KGBFbmNvdW50ZXJlZCBleGNlcHRpb24gJHtleH0gd2hpbGUgbWF0Y2hpbmcgYCArXG4gICAgICAgICAgICAgICAgYCR7dGVzdENhc2UuZmlsdGVyfSBhZ2FpbnN0ICR7dGVzdENhc2UudXJsfWApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdUZXN0IGZpbHRlciBlbmdpbmUgc2hvdWxkIG5vdCBtYXRjaCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBGaWx0ZXJFbmdpbmU7XG4gICAgICBsZXQgZW5naW5lID0gbnVsbDtcbiAgICAgIGNvbnN0IGZpbHRlckxpc3RQYXRoID0gJ21vZHVsZXMvYWRibG9ja2VyL3Rlc3RzL3VuaXQvZGF0YS9maWx0ZXJzX2xpc3QudHh0JztcbiAgICAgIGNvbnN0IG5vdE1hdGNoaW5nUGF0aCA9ICdtb2R1bGVzL2FkYmxvY2tlci90ZXN0cy91bml0L2RhdGEvZmlsdGVyc19ub3RfbWF0Y2hpbmcudHh0JztcblxuICAgICAgYmVmb3JlRWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChlbmdpbmUgPT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLnRpbWVvdXQoMTAwMDApO1xuICAgICAgICAgIEZpbHRlckVuZ2luZSA9IHRoaXMubW9kdWxlKCkuZGVmYXVsdDtcbiAgICAgICAgICBlbmdpbmUgPSBuZXcgRmlsdGVyRW5naW5lKCk7XG4gICAgICAgICAgZW5naW5lLm9uVXBkYXRlRmlsdGVycyh1bmRlZmluZWQsIGxvYWRMaW5lc0Zyb21GaWxlKGZpbHRlckxpc3RQYXRoKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpdCgnZG9lcyBub3QgbWF0Y2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMudGltZW91dCgxMDAwMCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgbG9hZFRlc3RDYXNlcyhub3RNYXRjaGluZ1BhdGgpLmZvckVhY2godGVzdENhc2UgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgc2hvdWxkIG1hdGNoXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoZW5naW5lLm1hdGNoKHRlc3RDYXNlKSkge1xuICAgICAgICAgICAgICAgIHJlamVjdChgRXhwZWN0ZWQgdG8gKm5vdCogbWF0Y2ggJHt0ZXN0Q2FzZS51cmx9YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgcmVqZWN0KGBFbmNvdW50ZXJlZCBleGNlcHRpb24gJHtleH0gd2hpbGUgbWF0Y2hpbmcgYCArXG4gICAgICAgICAgICAgICAgYCR7dGVzdENhc2UuZmlsdGVyfSBhZ2FpbnN0ICR7dGVzdENhc2UudXJsfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4pO1xuIl19