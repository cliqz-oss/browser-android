System.register('adblocker/filters-engine', ['antitracking/domain', 'adblocker/utils', 'adblocker/filters-parsing', 'adblocker/filters-matching'], function (_export) {
  'use strict';

  var TLDs, log, parseList, match, FuzzyIndex, FilterReverseIndex, FilterBucket, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  _export('tokenizeURL', tokenizeURL);

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function tokenizeURL(pattern) {
    // Deal with big URLs
    if (pattern.length > 150) {
      (function () {
        log('SHORTEN URL ' + pattern);
        var newPattern = pattern;
        pattern.split(/[|?=/&]/g).forEach(function (sub) {
          log('SUB ' + sub + ' (' + sub.length + ')');
          if (sub.length > 100) {
            newPattern = newPattern.replace(sub, '');
          }
        });

        pattern = newPattern;
        log('RES ' + pattern);
      })();
    }

    // Generate tokens (ngrams)
    var NGRAM_SIZE = 6;
    var tokens = [];
    for (var i = 0; i <= pattern.length - NGRAM_SIZE; ++i) {
      tokens.push(pattern.substring(i, i + NGRAM_SIZE));
    }
    return tokens;
  }

  return {
    setters: [function (_antitrackingDomain) {
      TLDs = _antitrackingDomain.TLDs;
    }, function (_adblockerUtils) {
      log = _adblockerUtils.log;
    }, function (_adblockerFiltersParsing) {
      parseList = _adblockerFiltersParsing['default'];
    }, function (_adblockerFiltersMatching) {
      match = _adblockerFiltersMatching['default'];
    }],
    execute: function () {
      FuzzyIndex = (function () {
        function FuzzyIndex(tokenizer, buildBucket) {
          _classCallCheck(this, FuzzyIndex);

          // Define tokenizer
          this.tokenizer = tokenizer;
          if (this.tokenizer === undefined) {
            this.tokenizer = function (key, cb) {
              tokenizeURL(key).forEach(cb);
            };
          }

          // Function used to create a new bucket
          this.buildBucket = buildBucket;
          if (this.buildBucket === undefined) {
            this.buildBucket = function () {
              return [];
            };
          }

          // {token -> list of values}
          this.index = new Map();
          this.size = 0;
        }

        /* A filter reverse index is the lowest level of optimization we apply on filter
         * matching. To avoid inspecting filters that have no chance of matching, we
         * dispatch them in an index { ngram -> list of filter }.
         *
         * When we need to know if there is a match for an URL, we extract ngrams from it
         * and find all the buckets for which filters contains at list one of the ngram of
         * the URL. We then stop at the first match.
         */

        _createClass(FuzzyIndex, [{
          key: 'set',
          value: function set(key, value) {
            var _this = this;

            // Only true if we insert something (we have at least 1 token)
            log('SET ' + key);
            var inserted = false;
            var insertValue = function insertValue(token) {
              log('FOUND TOKEN ' + token);
              inserted = true;
              var bucket = _this.index.get(token);
              if (bucket === undefined) {
                var newBucket = _this.buildBucket(token);
                newBucket.push(value);
                _this.index.set(token, newBucket);
              } else {
                bucket.push(value);
              }
            };

            this.tokenizer(key, insertValue);

            if (inserted) {
              this.size += 1;
            }

            return inserted;
          }
        }, {
          key: 'getFromKey',
          value: function getFromKey(key) {
            var _this2 = this;

            var buckets = [];
            this.tokenizer(key, function (token) {
              var bucket = _this2.index.get(token);
              if (bucket !== undefined) {
                log('BUCKET ' + token + ' size ' + bucket.size);
                buckets.push(bucket);
              }
            });
            return buckets;
          }
        }, {
          key: 'getFromTokens',
          value: function getFromTokens(tokens) {
            var _this3 = this;

            var buckets = [];
            tokens.forEach(function (token) {
              var bucket = _this3.index.get(token);
              if (bucket !== undefined) {
                log('BUCKET ' + token + ' size ' + bucket.length);
                buckets.push(bucket);
              }
            });
            return buckets;
          }
        }]);

        return FuzzyIndex;
      })();

      FilterReverseIndex = (function () {
        function FilterReverseIndex(name, filters) {
          _classCallCheck(this, FilterReverseIndex);

          // Name of this index (for debugging purpose)
          this.name = name;

          // Remaining filters not stored in the index
          this.miscFilters = [];
          this.size = 0;

          // Tokenizer used on patterns for fuzzy matching
          this.tokenizer = function (pattern, cb) {
            pattern.split(/[*^]/g).forEach(function (part) {
              tokenizeURL(part).forEach(cb);
            });
          };
          this.index = new FuzzyIndex(this.tokenizer);

          // Update index
          if (filters) {
            filters.forEach(this.push.bind(this));
          }
        }

        /* A Bucket manages a subsets of all the filters. To avoid matching too many
         * useless filters, there is a second level of dispatch here.
         *
         * [ hostname anchors (||filter) ]    [ remaining filters ]
         *
         * The first structure map { domain -> filters that apply only on domain }
         * as the `hostname anchors` only apply on a specific domain name.
         *
         * Each group of filters is stored in a Filter index that is the last level
         * of dispatch of our matching engine.
         */

        _createClass(FilterReverseIndex, [{
          key: 'push',
          value: function push(filter) {
            log('REVERSE INDEX ' + this.name + ' INSERT ' + filter.rawLine);
            ++this.size;
            var inserted = this.index.set(filter.filterStr, filter, this.tokenizer.bind(this));

            if (!inserted) {
              log(this.name + ' MISC FILTER ' + filter.rawLine);
              this.miscFilters.push(filter);
            }
          }
        }, {
          key: 'matchList',
          value: function matchList(request, list, checkedFilters) {
            for (var i = 0; i < list.length; i++) {
              var filter = list[i];
              if (!checkedFilters.has(filter.id)) {
                checkedFilters.add(filter.id);
                if (match(filter, request)) {
                  log('INDEX ' + this.name + ' MATCH ' + filter.rawLine + ' ~= ' + request.url);
                  return filter;
                }
              }
            }
            return null;
          }
        }, {
          key: 'match',
          value: function match(request, checkedFilters) {
            // Keep track of filters checked
            if (checkedFilters === undefined) {
              checkedFilters = new Set();
            }

            var buckets = this.index.getFromTokens(request.tokens);

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = buckets[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var bucket = _step.value;

                log('INDEX ' + this.name + ' BUCKET => ' + bucket.length);
                if (this.matchList(request, bucket, checkedFilters) !== null) {
                  return true;
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator['return']) {
                  _iterator['return']();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            log('INDEX ' + this.name + ' ' + this.miscFilters.length + ' remaining filters checked');

            // If no match found, check regexes
            return this.matchList(request, this.miscFilters, checkedFilters) !== null;
          }
        }]);

        return FilterReverseIndex;
      })();

      FilterBucket = (function () {
        function FilterBucket(name, filters) {
          _classCallCheck(this, FilterBucket);

          // TODO: Dispatch also on:
          // - fromImage
          // - fromMedia
          // - fromObject
          // - fromObjectSubrequest
          // - fromOther
          // - fromPing
          // - fromScript
          // - fromStylesheet
          // - fromXmlHttpRequest
          // To avoid matching filter if request type doesn't match
          // If we do it, we could simplify the match function of Filter

          this.name = name;

          // ||hostname filter
          this.hostnameAnchors = new FuzzyIndex(
          // Tokenize key
          function (key, cb) {
            key.split('.').filter(function (token) {
              return !TLDs[token] && token;
            }).forEach(function (token) {
              token.split('-').forEach(function (t) {
                log('TOKEN ' + key + ' => ' + t);
                cb(t);
              });
            });
          },
          // Create a new empty bucket
          function (token) {
            return new FilterReverseIndex(token + '_' + name);
          });

          // All other filters
          this.filters = new FilterReverseIndex(this.name);

          // Dispatch filters
          if (filters !== undefined) {
            filters.forEach(this.push.bind(this));
          }

          log(name + ' CREATE BUCKET: ' + this.filters.length + ' filters +' + (this.hostnameAnchors.size + ' hostnames'));
        }

        /* Manage a list of filters and match them in an efficient way.
         * To avoid inspecting to many filters for each request, we create
         * the following accelerating structure:
         *
         * [ Importants ]    [ Exceptions ]    [ Remaining filters ]
         *
         * Each of theses is a `FilterBucket`, which manage a subset of filters.
         *
         * Importants filters are not subject to exceptions, hence we try it first.
         * If no important filter matched, try to use the remaining filters bucket.
         * If we have a match, try to find an exception.
         */

        _createClass(FilterBucket, [{
          key: 'push',
          value: function push(filter) {
            log('PUSH ' + filter.rawLine);
            if (filter.hostname !== null) {
              this.hostnameAnchors.set(filter.hostname, filter);
            } else {
              this.filters.push(filter);
            }
          }
        }, {
          key: 'matchWithDomain',
          value: function matchWithDomain(request, domain, checkedFilters) {
            var buckets = this.hostnameAnchors.getFromKey(domain);
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = buckets[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var bucket = _step2.value;

                if (bucket !== undefined) {
                  log(this.name + ' bucket try to match hostnameAnchors (' + domain + '/' + bucket.name + ')');
                  if (bucket.match(request, checkedFilters)) {
                    return true;
                  }
                }
              }
            } catch (err) {
              _didIteratorError2 = true;
              _iteratorError2 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                  _iterator2['return']();
                }
              } finally {
                if (_didIteratorError2) {
                  throw _iteratorError2;
                }
              }
            }

            return false;
          }
        }, {
          key: 'match',
          value: function match(request) {
            // Keep track of filters we already tried
            var checkedFilters = new Set();

            if (this.matchWithDomain(request, request.hostname, checkedFilters)) {
              return true;
            }

            // Try to find a match with remaining filters
            log(this.name + ' bucket try to match misc');
            var result = this.filters.match(request, checkedFilters);
            log('BUCKET ' + this.name + ' total filters ' + checkedFilters.size);

            return result;
          }
        }]);

        return FilterBucket;
      })();

      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);

          // @@filter
          this.exceptions = new FilterBucket('exceptions');
          // $important
          this.importants = new FilterBucket('importants');
          // All other filters
          this.filters = new FilterBucket('filters');

          this.lists = new Map();

          this.size = 0;
        }

        _createClass(_default, [{
          key: 'onUpdateFilters',
          value: function onUpdateFilters(asset, newFilters) {
            var filters = [];
            var exceptions = [];
            var importants = [];

            // Parse and dispatch filters depending on type
            parseList(newFilters).forEach(function (filter) {
              if (filter.isException) {
                exceptions.push(filter);
              } else if (filter.isImportant) {
                importants.push(filter);
              } else {
                filters.push(filter);
              }
            });

            if (!this.lists.has(asset)) {
              log('FILTER ENGINE ' + asset + ' UPDATE');
              // Update data structures
              this.size += filters.length + exceptions.length + importants.length;
              filters.forEach(this.filters.push.bind(this.filters));
              exceptions.forEach(this.exceptions.push.bind(this.exceptions));
              importants.forEach(this.importants.push.bind(this.importants));

              this.lists.set(asset, { filters: filters, exceptions: exceptions, importants: importants });
            } else {
              log('FILTER ENGINE ' + asset + ' REBUILD');
              // Rebuild everything
              var _iteratorNormalCompletion3 = true;
              var _didIteratorError3 = false;
              var _iteratorError3 = undefined;

              try {
                for (var _iterator3 = this.lists.values()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                  var list = _step3.value;

                  list.filters.forEach(filters.push.bind(filters));
                  list.exceptions.forEach(exceptions.push.bind(exceptions));
                  list.importants.forEach(importants.push.bind(importants));
                }
              } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                    _iterator3['return']();
                  }
                } finally {
                  if (_didIteratorError3) {
                    throw _iteratorError3;
                  }
                }
              }

              this.size = filters.length + exceptions.length + importants.length;
              this.filters = new FilterBucket('filters', filters);
              this.exceptions = new FilterBucket('exceptions', exceptions);
              this.importants = new FilterBucket('importants', importants);
            }

            log('Filter engine updated with ' + filters.length + ' filters, ' + (exceptions.length + ' exceptions and ' + importants.length + ' importants\n'));
          }
        }, {
          key: 'match',
          value: function match(request) {
            log('MATCH ' + JSON.stringify(request));
            request.tokens = tokenizeURL(request.url);
            if (this.importants.match(request)) {
              log('IMPORTANT');
              return true;
            } else if (this.filters.match(request)) {
              log('FILTER');
              if (this.exceptions.match(request)) {
                log('EXCEPTION');
                return false;
              }

              return true;
            }

            return false;
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9maWx0ZXJzLWVuZ2luZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7bUNBaUNNLFVBQVUsRUFpRlYsa0JBQWtCLEVBc0ZsQixZQUFZOzs7Ozs7OztBQWpNWCxXQUFTLFdBQVcsQ0FBQyxPQUFPLEVBQUU7O0FBRW5DLFFBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUU7O0FBQ3hCLFdBQUcsa0JBQWdCLE9BQU8sQ0FBRyxDQUFDO0FBQzlCLFlBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQztBQUN6QixlQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUcsRUFBSTtBQUN2QyxhQUFHLFVBQVEsR0FBRyxVQUFLLEdBQUcsQ0FBQyxNQUFNLE9BQUksQ0FBQztBQUNsQyxjQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFO0FBQ3BCLHNCQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7V0FDMUM7U0FDRixDQUFDLENBQUM7O0FBRUgsZUFBTyxHQUFHLFVBQVUsQ0FBQztBQUNyQixXQUFHLFVBQVEsT0FBTyxDQUFHLENBQUM7O0tBQ3ZCOzs7QUFHRCxRQUFNLFVBQVUsR0FBRyxDQUFDLENBQUM7QUFDckIsUUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2xCLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFPLENBQUMsTUFBTSxHQUFHLFVBQVUsQUFBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3ZELFlBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUM7S0FDbkQ7QUFDRCxXQUFPLE1BQU0sQ0FBQztHQUNmOzs7O2lDQTlCUSxJQUFJOzs0QkFFSixHQUFHOzs7Ozs7O0FBK0JOLGdCQUFVO0FBQ0gsaUJBRFAsVUFBVSxDQUNGLFNBQVMsRUFBRSxXQUFXLEVBQUU7Z0NBRGhDLFVBQVU7OztBQUdaLGNBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0FBQzNCLGNBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTLEVBQUU7QUFDaEMsZ0JBQUksQ0FBQyxTQUFTLEdBQUcsVUFBQyxHQUFHLEVBQUUsRUFBRSxFQUFLO0FBQzVCLHlCQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzlCLENBQUM7V0FDSDs7O0FBR0QsY0FBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7QUFDL0IsY0FBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRTtBQUNsQyxnQkFBSSxDQUFDLFdBQVcsR0FBRztxQkFBTSxFQUFFO2FBQUEsQ0FBQztXQUM3Qjs7O0FBR0QsY0FBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ3ZCLGNBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1NBQ2Y7Ozs7Ozs7Ozs7O3FCQW5CRyxVQUFVOztpQkFxQlgsYUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFFOzs7O0FBRWQsZUFBRyxVQUFRLEdBQUcsQ0FBRyxDQUFDO0FBQ2xCLGdCQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7QUFDckIsZ0JBQU0sV0FBVyxHQUFHLFNBQWQsV0FBVyxDQUFHLEtBQUssRUFBSTtBQUMzQixpQkFBRyxrQkFBZ0IsS0FBSyxDQUFHLENBQUM7QUFDNUIsc0JBQVEsR0FBRyxJQUFJLENBQUM7QUFDaEIsa0JBQU0sTUFBTSxHQUFHLE1BQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQyxrQkFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO0FBQ3hCLG9CQUFNLFNBQVMsR0FBRyxNQUFLLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxQyx5QkFBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN0QixzQkFBSyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztlQUNsQyxNQUFNO0FBQ0wsc0JBQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7ZUFDcEI7YUFDRixDQUFDOztBQUVGLGdCQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQzs7QUFFakMsZ0JBQUksUUFBUSxFQUFFO0FBQ1osa0JBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDO2FBQ2hCOztBQUVELG1CQUFPLFFBQVEsQ0FBQztXQUNqQjs7O2lCQUVTLG9CQUFDLEdBQUcsRUFBRTs7O0FBQ2QsZ0JBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNuQixnQkFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsVUFBQSxLQUFLLEVBQUk7QUFDM0Isa0JBQU0sTUFBTSxHQUFHLE9BQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQyxrQkFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO0FBQ3hCLG1CQUFHLGFBQVcsS0FBSyxjQUFTLE1BQU0sQ0FBQyxJQUFJLENBQUcsQ0FBQztBQUMzQyx1QkFBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztlQUN0QjthQUNGLENBQUMsQ0FBQztBQUNILG1CQUFPLE9BQU8sQ0FBQztXQUNoQjs7O2lCQUVZLHVCQUFDLE1BQU0sRUFBRTs7O0FBQ3BCLGdCQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDbkIsa0JBQU0sQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLLEVBQUk7QUFDdEIsa0JBQU0sTUFBTSxHQUFHLE9BQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQyxrQkFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO0FBQ3hCLG1CQUFHLGFBQVcsS0FBSyxjQUFTLE1BQU0sQ0FBQyxNQUFNLENBQUcsQ0FBQztBQUM3Qyx1QkFBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztlQUN0QjthQUNGLENBQUMsQ0FBQztBQUNILG1CQUFPLE9BQU8sQ0FBQztXQUNoQjs7O2VBckVHLFVBQVU7OztBQWlGVix3QkFBa0I7QUFDWCxpQkFEUCxrQkFBa0IsQ0FDVixJQUFJLEVBQUUsT0FBTyxFQUFFO2dDQUR2QixrQkFBa0I7OztBQUdwQixjQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs7O0FBR2pCLGNBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLGNBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzs7QUFHZCxjQUFJLENBQUMsU0FBUyxHQUFHLFVBQUMsT0FBTyxFQUFFLEVBQUUsRUFBSztBQUNoQyxtQkFBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJLEVBQUk7QUFDckMseUJBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDL0IsQ0FBQyxDQUFDO1dBQ0osQ0FBQztBQUNGLGNBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzs7QUFHNUMsY0FBSSxPQUFPLEVBQUU7QUFDWCxtQkFBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1dBQ3ZDO1NBQ0Y7Ozs7Ozs7Ozs7Ozs7O3FCQXJCRyxrQkFBa0I7O2lCQXVCbEIsY0FBQyxNQUFNLEVBQUU7QUFDWCxlQUFHLG9CQUFrQixJQUFJLENBQUMsSUFBSSxnQkFBVyxNQUFNLENBQUMsT0FBTyxDQUFHLENBQUM7QUFDM0QsY0FBRSxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ1osZ0JBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUM3QixNQUFNLENBQUMsU0FBUyxFQUNoQixNQUFNLEVBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQzFCLENBQUM7O0FBRUYsZ0JBQUksQ0FBQyxRQUFRLEVBQUU7QUFDYixpQkFBRyxDQUFJLElBQUksQ0FBQyxJQUFJLHFCQUFnQixNQUFNLENBQUMsT0FBTyxDQUFHLENBQUM7QUFDbEQsa0JBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQy9CO1dBQ0Y7OztpQkFFUSxtQkFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRTtBQUN2QyxpQkFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDcEMsa0JBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixrQkFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ2xDLDhCQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM5QixvQkFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFO0FBQzFCLHFCQUFHLFlBQVUsSUFBSSxDQUFDLElBQUksZUFBVSxNQUFNLENBQUMsT0FBTyxZQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUcsQ0FBQztBQUNwRSx5QkFBTyxNQUFNLENBQUM7aUJBQ2Y7ZUFDRjthQUNGO0FBQ0QsbUJBQU8sSUFBSSxDQUFDO1dBQ2I7OztpQkFFSSxlQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUU7O0FBRTdCLGdCQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUU7QUFDaEMsNEJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO2FBQzVCOztBQUVELGdCQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Ozs7Ozs7QUFFekQsbUNBQXFCLE9BQU8sOEhBQUU7b0JBQW5CLE1BQU07O0FBQ2YsbUJBQUcsWUFBVSxJQUFJLENBQUMsSUFBSSxtQkFBYyxNQUFNLENBQUMsTUFBTSxDQUFHLENBQUM7QUFDckQsb0JBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxLQUFLLElBQUksRUFBRTtBQUM1RCx5QkFBTyxJQUFJLENBQUM7aUJBQ2I7ZUFDRjs7Ozs7Ozs7Ozs7Ozs7OztBQUVELGVBQUcsWUFBVSxJQUFJLENBQUMsSUFBSSxTQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxnQ0FBNkIsQ0FBQzs7O0FBRy9FLG1CQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLEtBQUssSUFBSSxDQUFDO1dBQzNFOzs7ZUF2RUcsa0JBQWtCOzs7QUFzRmxCLGtCQUFZO0FBRUwsaUJBRlAsWUFBWSxDQUVKLElBQUksRUFBRSxPQUFPLEVBQUU7Z0NBRnZCLFlBQVk7Ozs7Ozs7Ozs7Ozs7OztBQWdCZCxjQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs7O0FBR2pCLGNBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxVQUFVOztBQUVuQyxvQkFBQyxHQUFHLEVBQUUsRUFBRSxFQUFLO0FBQ1gsZUFBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBQSxLQUFLO3FCQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUs7YUFBQSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSyxFQUFJO0FBQ3JFLG1CQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUMsRUFBSTtBQUM1QixtQkFBRyxZQUFVLEdBQUcsWUFBTyxDQUFDLENBQUcsQ0FBQztBQUM1QixrQkFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2VBQ1AsQ0FBQyxDQUFDO2FBQ0osQ0FBQyxDQUFDO1dBQ0o7O0FBRUQsb0JBQUEsS0FBSzttQkFBSSxJQUFJLGtCQUFrQixDQUFJLEtBQUssU0FBSSxJQUFJLENBQUc7V0FBQSxDQUNwRCxDQUFDOzs7QUFHRixjQUFJLENBQUMsT0FBTyxHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7QUFHakQsY0FBSSxPQUFPLEtBQUssU0FBUyxFQUFFO0FBQ3pCLG1CQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7V0FDdkM7O0FBRUQsYUFBRyxDQUFDLEFBQUcsSUFBSSx3QkFBbUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLG1CQUMxQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksZ0JBQVksQ0FBQyxDQUFDO1NBQy9DOzs7Ozs7Ozs7Ozs7Ozs7cUJBM0NHLFlBQVk7O2lCQTZDWixjQUFDLE1BQU0sRUFBRTtBQUNYLGVBQUcsV0FBUyxNQUFNLENBQUMsT0FBTyxDQUFHLENBQUM7QUFDOUIsZ0JBQUksTUFBTSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7QUFDNUIsa0JBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDbkQsTUFBTTtBQUNMLGtCQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUMzQjtXQUNGOzs7aUJBRWMseUJBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUU7QUFDL0MsZ0JBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDOzs7Ozs7QUFDeEQsb0NBQXFCLE9BQU8sbUlBQUU7b0JBQW5CLE1BQU07O0FBQ2Ysb0JBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtBQUN4QixxQkFBRyxDQUFJLElBQUksQ0FBQyxJQUFJLDhDQUF5QyxNQUFNLFNBQUksTUFBTSxDQUFDLElBQUksT0FBSSxDQUFDO0FBQ25GLHNCQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxFQUFFO0FBQ3pDLDJCQUFPLElBQUksQ0FBQzttQkFDYjtpQkFDRjtlQUNGOzs7Ozs7Ozs7Ozs7Ozs7O0FBRUQsbUJBQU8sS0FBSyxDQUFDO1dBQ2Q7OztpQkFFSSxlQUFDLE9BQU8sRUFBRTs7QUFFYixnQkFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQzs7QUFFakMsZ0JBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsRUFBRTtBQUNuRSxxQkFBTyxJQUFJLENBQUM7YUFDYjs7O0FBR0QsZUFBRyxDQUFJLElBQUksQ0FBQyxJQUFJLCtCQUE0QixDQUFDO0FBQzdDLGdCQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDM0QsZUFBRyxhQUFXLElBQUksQ0FBQyxJQUFJLHVCQUFrQixjQUFjLENBQUMsSUFBSSxDQUFHLENBQUM7O0FBRWhFLG1CQUFPLE1BQU0sQ0FBQztXQUNmOzs7ZUFsRkcsWUFBWTs7OztBQW1HTCw0QkFBRzs7OztBQUVaLGNBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBRWpELGNBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBRWpELGNBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7O0FBRTNDLGNBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQzs7QUFFdkIsY0FBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7U0FDZjs7OztpQkFFYyx5QkFBQyxLQUFLLEVBQUUsVUFBVSxFQUFFO0FBQ2pDLGdCQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDbkIsZ0JBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQztBQUN0QixnQkFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDOzs7QUFHdEIscUJBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxNQUFNLEVBQUk7QUFDdEMsa0JBQUksTUFBTSxDQUFDLFdBQVcsRUFBRTtBQUN0QiwwQkFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztlQUN6QixNQUFNLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRTtBQUM3QiwwQkFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztlQUN6QixNQUFNO0FBQ0wsdUJBQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7ZUFDdEI7YUFDRixDQUFDLENBQUM7O0FBRUgsZ0JBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUMxQixpQkFBRyxvQkFBa0IsS0FBSyxhQUFVLENBQUM7O0FBRXJDLGtCQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO0FBQ3BFLHFCQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUN0RCx3QkFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDL0Qsd0JBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDOztBQUUvRCxrQkFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFQLE9BQU8sRUFBRSxVQUFVLEVBQVYsVUFBVSxFQUFFLFVBQVUsRUFBVixVQUFVLEVBQUUsQ0FBQyxDQUFDO2FBQzVELE1BQU07QUFDTCxpQkFBRyxvQkFBa0IsS0FBSyxjQUFXLENBQUM7Ozs7Ozs7QUFFdEMsc0NBQW1CLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLG1JQUFFO3NCQUE3QixJQUFJOztBQUNiLHNCQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2pELHNCQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzFELHNCQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2lCQUMzRDs7Ozs7Ozs7Ozs7Ozs7OztBQUVELGtCQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO0FBQ25FLGtCQUFJLENBQUMsT0FBTyxHQUFHLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNwRCxrQkFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLFlBQVksQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDN0Qsa0JBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxZQUFZLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQzlEOztBQUVELGVBQUcsQ0FBQyxnQ0FBOEIsT0FBTyxDQUFDLE1BQU0sbUJBQ3pDLFVBQVUsQ0FBQyxNQUFNLHdCQUFtQixVQUFVLENBQUMsTUFBTSxtQkFBZSxDQUFDLENBQUM7V0FDOUU7OztpQkFFSSxlQUFDLE9BQU8sRUFBRTtBQUNiLGVBQUcsWUFBVSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFHLENBQUM7QUFDeEMsbUJBQU8sQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxQyxnQkFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUNsQyxpQkFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2pCLHFCQUFPLElBQUksQ0FBQzthQUNiLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUN0QyxpQkFBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2Qsa0JBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDbEMsbUJBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNqQix1QkFBTyxLQUFLLENBQUM7ZUFDZDs7QUFFRCxxQkFBTyxJQUFJLENBQUM7YUFDYjs7QUFFRCxtQkFBTyxLQUFLLENBQUM7V0FDZCIsImZpbGUiOiJhZGJsb2NrZXIvZmlsdGVycy1lbmdpbmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUTERzIH0gZnJvbSAnYW50aXRyYWNraW5nL2RvbWFpbic7XG5cbmltcG9ydCB7IGxvZyB9IGZyb20gJ2FkYmxvY2tlci91dGlscyc7XG5pbXBvcnQgcGFyc2VMaXN0IGZyb20gJ2FkYmxvY2tlci9maWx0ZXJzLXBhcnNpbmcnO1xuaW1wb3J0IG1hdGNoIGZyb20gJ2FkYmxvY2tlci9maWx0ZXJzLW1hdGNoaW5nJztcblxuXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemVVUkwocGF0dGVybikge1xuICAvLyBEZWFsIHdpdGggYmlnIFVSTHNcbiAgaWYgKHBhdHRlcm4ubGVuZ3RoID4gMTUwKSB7XG4gICAgbG9nKGBTSE9SVEVOIFVSTCAke3BhdHRlcm59YCk7XG4gICAgbGV0IG5ld1BhdHRlcm4gPSBwYXR0ZXJuO1xuICAgIHBhdHRlcm4uc3BsaXQoL1t8Pz0vJl0vZykuZm9yRWFjaChzdWIgPT4ge1xuICAgICAgbG9nKGBTVUIgJHtzdWJ9ICgke3N1Yi5sZW5ndGh9KWApO1xuICAgICAgaWYgKHN1Yi5sZW5ndGggPiAxMDApIHtcbiAgICAgICAgbmV3UGF0dGVybiA9IG5ld1BhdHRlcm4ucmVwbGFjZShzdWIsICcnKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHBhdHRlcm4gPSBuZXdQYXR0ZXJuO1xuICAgIGxvZyhgUkVTICR7cGF0dGVybn1gKTtcbiAgfVxuXG4gIC8vIEdlbmVyYXRlIHRva2VucyAobmdyYW1zKVxuICBjb25zdCBOR1JBTV9TSVpFID0gNjtcbiAgY29uc3QgdG9rZW5zID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDw9IChwYXR0ZXJuLmxlbmd0aCAtIE5HUkFNX1NJWkUpOyArK2kpIHtcbiAgICB0b2tlbnMucHVzaChwYXR0ZXJuLnN1YnN0cmluZyhpLCBpICsgTkdSQU1fU0laRSkpO1xuICB9XG4gIHJldHVybiB0b2tlbnM7XG59XG5cblxuY2xhc3MgRnV6enlJbmRleCB7XG4gIGNvbnN0cnVjdG9yKHRva2VuaXplciwgYnVpbGRCdWNrZXQpIHtcbiAgICAvLyBEZWZpbmUgdG9rZW5pemVyXG4gICAgdGhpcy50b2tlbml6ZXIgPSB0b2tlbml6ZXI7XG4gICAgaWYgKHRoaXMudG9rZW5pemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMudG9rZW5pemVyID0gKGtleSwgY2IpID0+IHtcbiAgICAgICAgdG9rZW5pemVVUkwoa2V5KS5mb3JFYWNoKGNiKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgYSBuZXcgYnVja2V0XG4gICAgdGhpcy5idWlsZEJ1Y2tldCA9IGJ1aWxkQnVja2V0O1xuICAgIGlmICh0aGlzLmJ1aWxkQnVja2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuYnVpbGRCdWNrZXQgPSAoKSA9PiBbXTtcbiAgICB9XG5cbiAgICAvLyB7dG9rZW4gLT4gbGlzdCBvZiB2YWx1ZXN9XG4gICAgdGhpcy5pbmRleCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLnNpemUgPSAwO1xuICB9XG5cbiAgc2V0KGtleSwgdmFsdWUpIHtcbiAgICAvLyBPbmx5IHRydWUgaWYgd2UgaW5zZXJ0IHNvbWV0aGluZyAod2UgaGF2ZSBhdCBsZWFzdCAxIHRva2VuKVxuICAgIGxvZyhgU0VUICR7a2V5fWApO1xuICAgIGxldCBpbnNlcnRlZCA9IGZhbHNlO1xuICAgIGNvbnN0IGluc2VydFZhbHVlID0gdG9rZW4gPT4ge1xuICAgICAgbG9nKGBGT1VORCBUT0tFTiAke3Rva2VufWApO1xuICAgICAgaW5zZXJ0ZWQgPSB0cnVlO1xuICAgICAgY29uc3QgYnVja2V0ID0gdGhpcy5pbmRleC5nZXQodG9rZW4pO1xuICAgICAgaWYgKGJ1Y2tldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IG5ld0J1Y2tldCA9IHRoaXMuYnVpbGRCdWNrZXQodG9rZW4pO1xuICAgICAgICBuZXdCdWNrZXQucHVzaCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuaW5kZXguc2V0KHRva2VuLCBuZXdCdWNrZXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnVja2V0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnRva2VuaXplcihrZXksIGluc2VydFZhbHVlKTtcblxuICAgIGlmIChpbnNlcnRlZCkge1xuICAgICAgdGhpcy5zaXplICs9IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIGluc2VydGVkO1xuICB9XG5cbiAgZ2V0RnJvbUtleShrZXkpIHtcbiAgICBjb25zdCBidWNrZXRzID0gW107XG4gICAgdGhpcy50b2tlbml6ZXIoa2V5LCB0b2tlbiA9PiB7XG4gICAgICBjb25zdCBidWNrZXQgPSB0aGlzLmluZGV4LmdldCh0b2tlbik7XG4gICAgICBpZiAoYnVja2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbG9nKGBCVUNLRVQgJHt0b2tlbn0gc2l6ZSAke2J1Y2tldC5zaXplfWApO1xuICAgICAgICBidWNrZXRzLnB1c2goYnVja2V0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYnVja2V0cztcbiAgfVxuXG4gIGdldEZyb21Ub2tlbnModG9rZW5zKSB7XG4gICAgY29uc3QgYnVja2V0cyA9IFtdO1xuICAgIHRva2Vucy5mb3JFYWNoKHRva2VuID0+IHtcbiAgICAgIGNvbnN0IGJ1Y2tldCA9IHRoaXMuaW5kZXguZ2V0KHRva2VuKTtcbiAgICAgIGlmIChidWNrZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2coYEJVQ0tFVCAke3Rva2VufSBzaXplICR7YnVja2V0Lmxlbmd0aH1gKTtcbiAgICAgICAgYnVja2V0cy5wdXNoKGJ1Y2tldCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGJ1Y2tldHM7XG4gIH1cbn1cblxuXG4vKiBBIGZpbHRlciByZXZlcnNlIGluZGV4IGlzIHRoZSBsb3dlc3QgbGV2ZWwgb2Ygb3B0aW1pemF0aW9uIHdlIGFwcGx5IG9uIGZpbHRlclxuICogbWF0Y2hpbmcuIFRvIGF2b2lkIGluc3BlY3RpbmcgZmlsdGVycyB0aGF0IGhhdmUgbm8gY2hhbmNlIG9mIG1hdGNoaW5nLCB3ZVxuICogZGlzcGF0Y2ggdGhlbSBpbiBhbiBpbmRleCB7IG5ncmFtIC0+IGxpc3Qgb2YgZmlsdGVyIH0uXG4gKlxuICogV2hlbiB3ZSBuZWVkIHRvIGtub3cgaWYgdGhlcmUgaXMgYSBtYXRjaCBmb3IgYW4gVVJMLCB3ZSBleHRyYWN0IG5ncmFtcyBmcm9tIGl0XG4gKiBhbmQgZmluZCBhbGwgdGhlIGJ1Y2tldHMgZm9yIHdoaWNoIGZpbHRlcnMgY29udGFpbnMgYXQgbGlzdCBvbmUgb2YgdGhlIG5ncmFtIG9mXG4gKiB0aGUgVVJMLiBXZSB0aGVuIHN0b3AgYXQgdGhlIGZpcnN0IG1hdGNoLlxuICovXG5jbGFzcyBGaWx0ZXJSZXZlcnNlSW5kZXgge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBmaWx0ZXJzKSB7XG4gICAgLy8gTmFtZSBvZiB0aGlzIGluZGV4IChmb3IgZGVidWdnaW5nIHB1cnBvc2UpXG4gICAgdGhpcy5uYW1lID0gbmFtZTtcblxuICAgIC8vIFJlbWFpbmluZyBmaWx0ZXJzIG5vdCBzdG9yZWQgaW4gdGhlIGluZGV4XG4gICAgdGhpcy5taXNjRmlsdGVycyA9IFtdO1xuICAgIHRoaXMuc2l6ZSA9IDA7XG5cbiAgICAvLyBUb2tlbml6ZXIgdXNlZCBvbiBwYXR0ZXJucyBmb3IgZnV6enkgbWF0Y2hpbmdcbiAgICB0aGlzLnRva2VuaXplciA9IChwYXR0ZXJuLCBjYikgPT4ge1xuICAgICAgcGF0dGVybi5zcGxpdCgvWypeXS9nKS5mb3JFYWNoKHBhcnQgPT4ge1xuICAgICAgICB0b2tlbml6ZVVSTChwYXJ0KS5mb3JFYWNoKGNiKTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgdGhpcy5pbmRleCA9IG5ldyBGdXp6eUluZGV4KHRoaXMudG9rZW5pemVyKTtcblxuICAgIC8vIFVwZGF0ZSBpbmRleFxuICAgIGlmIChmaWx0ZXJzKSB7XG4gICAgICBmaWx0ZXJzLmZvckVhY2godGhpcy5wdXNoLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIHB1c2goZmlsdGVyKSB7XG4gICAgbG9nKGBSRVZFUlNFIElOREVYICR7dGhpcy5uYW1lfSBJTlNFUlQgJHtmaWx0ZXIucmF3TGluZX1gKTtcbiAgICArK3RoaXMuc2l6ZTtcbiAgICBjb25zdCBpbnNlcnRlZCA9IHRoaXMuaW5kZXguc2V0KFxuICAgICAgZmlsdGVyLmZpbHRlclN0cixcbiAgICAgIGZpbHRlcixcbiAgICAgIHRoaXMudG9rZW5pemVyLmJpbmQodGhpcylcbiAgICApO1xuXG4gICAgaWYgKCFpbnNlcnRlZCkge1xuICAgICAgbG9nKGAke3RoaXMubmFtZX0gTUlTQyBGSUxURVIgJHtmaWx0ZXIucmF3TGluZX1gKTtcbiAgICAgIHRoaXMubWlzY0ZpbHRlcnMucHVzaChmaWx0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIG1hdGNoTGlzdChyZXF1ZXN0LCBsaXN0LCBjaGVja2VkRmlsdGVycykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZmlsdGVyID0gbGlzdFtpXTtcbiAgICAgIGlmICghY2hlY2tlZEZpbHRlcnMuaGFzKGZpbHRlci5pZCkpIHtcbiAgICAgICAgY2hlY2tlZEZpbHRlcnMuYWRkKGZpbHRlci5pZCk7XG4gICAgICAgIGlmIChtYXRjaChmaWx0ZXIsIHJlcXVlc3QpKSB7XG4gICAgICAgICAgbG9nKGBJTkRFWCAke3RoaXMubmFtZX0gTUFUQ0ggJHtmaWx0ZXIucmF3TGluZX0gfj0gJHtyZXF1ZXN0LnVybH1gKTtcbiAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbWF0Y2gocmVxdWVzdCwgY2hlY2tlZEZpbHRlcnMpIHtcbiAgICAvLyBLZWVwIHRyYWNrIG9mIGZpbHRlcnMgY2hlY2tlZFxuICAgIGlmIChjaGVja2VkRmlsdGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjaGVja2VkRmlsdGVycyA9IG5ldyBTZXQoKTtcbiAgICB9XG5cbiAgICBjb25zdCBidWNrZXRzID0gdGhpcy5pbmRleC5nZXRGcm9tVG9rZW5zKHJlcXVlc3QudG9rZW5zKTtcblxuICAgIGZvciAoY29uc3QgYnVja2V0IG9mIGJ1Y2tldHMpIHtcbiAgICAgIGxvZyhgSU5ERVggJHt0aGlzLm5hbWV9IEJVQ0tFVCA9PiAke2J1Y2tldC5sZW5ndGh9YCk7XG4gICAgICBpZiAodGhpcy5tYXRjaExpc3QocmVxdWVzdCwgYnVja2V0LCBjaGVja2VkRmlsdGVycykgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbG9nKGBJTkRFWCAke3RoaXMubmFtZX0gJHt0aGlzLm1pc2NGaWx0ZXJzLmxlbmd0aH0gcmVtYWluaW5nIGZpbHRlcnMgY2hlY2tlZGApO1xuXG4gICAgLy8gSWYgbm8gbWF0Y2ggZm91bmQsIGNoZWNrIHJlZ2V4ZXNcbiAgICByZXR1cm4gdGhpcy5tYXRjaExpc3QocmVxdWVzdCwgdGhpcy5taXNjRmlsdGVycywgY2hlY2tlZEZpbHRlcnMpICE9PSBudWxsO1xuICB9XG59XG5cblxuLyogQSBCdWNrZXQgbWFuYWdlcyBhIHN1YnNldHMgb2YgYWxsIHRoZSBmaWx0ZXJzLiBUbyBhdm9pZCBtYXRjaGluZyB0b28gbWFueVxuICogdXNlbGVzcyBmaWx0ZXJzLCB0aGVyZSBpcyBhIHNlY29uZCBsZXZlbCBvZiBkaXNwYXRjaCBoZXJlLlxuICpcbiAqIFsgaG9zdG5hbWUgYW5jaG9ycyAofHxmaWx0ZXIpIF0gICAgWyByZW1haW5pbmcgZmlsdGVycyBdXG4gKlxuICogVGhlIGZpcnN0IHN0cnVjdHVyZSBtYXAgeyBkb21haW4gLT4gZmlsdGVycyB0aGF0IGFwcGx5IG9ubHkgb24gZG9tYWluIH1cbiAqIGFzIHRoZSBgaG9zdG5hbWUgYW5jaG9yc2Agb25seSBhcHBseSBvbiBhIHNwZWNpZmljIGRvbWFpbiBuYW1lLlxuICpcbiAqIEVhY2ggZ3JvdXAgb2YgZmlsdGVycyBpcyBzdG9yZWQgaW4gYSBGaWx0ZXIgaW5kZXggdGhhdCBpcyB0aGUgbGFzdCBsZXZlbFxuICogb2YgZGlzcGF0Y2ggb2Ygb3VyIG1hdGNoaW5nIGVuZ2luZS5cbiAqL1xuY2xhc3MgRmlsdGVyQnVja2V0IHtcblxuICBjb25zdHJ1Y3RvcihuYW1lLCBmaWx0ZXJzKSB7XG4gICAgLy8gVE9ETzogRGlzcGF0Y2ggYWxzbyBvbjpcbiAgICAvLyAtIGZyb21JbWFnZVxuICAgIC8vIC0gZnJvbU1lZGlhXG4gICAgLy8gLSBmcm9tT2JqZWN0XG4gICAgLy8gLSBmcm9tT2JqZWN0U3VicmVxdWVzdFxuICAgIC8vIC0gZnJvbU90aGVyXG4gICAgLy8gLSBmcm9tUGluZ1xuICAgIC8vIC0gZnJvbVNjcmlwdFxuICAgIC8vIC0gZnJvbVN0eWxlc2hlZXRcbiAgICAvLyAtIGZyb21YbWxIdHRwUmVxdWVzdFxuICAgIC8vIFRvIGF2b2lkIG1hdGNoaW5nIGZpbHRlciBpZiByZXF1ZXN0IHR5cGUgZG9lc24ndCBtYXRjaFxuICAgIC8vIElmIHdlIGRvIGl0LCB3ZSBjb3VsZCBzaW1wbGlmeSB0aGUgbWF0Y2ggZnVuY3Rpb24gb2YgRmlsdGVyXG5cbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuXG4gICAgLy8gfHxob3N0bmFtZSBmaWx0ZXJcbiAgICB0aGlzLmhvc3RuYW1lQW5jaG9ycyA9IG5ldyBGdXp6eUluZGV4KFxuICAgICAgLy8gVG9rZW5pemUga2V5XG4gICAgICAoa2V5LCBjYikgPT4ge1xuICAgICAgICBrZXkuc3BsaXQoJy4nKS5maWx0ZXIodG9rZW4gPT4gIVRMRHNbdG9rZW5dICYmIHRva2VuKS5mb3JFYWNoKHRva2VuID0+IHtcbiAgICAgICAgICB0b2tlbi5zcGxpdCgnLScpLmZvckVhY2godCA9PiB7XG4gICAgICAgICAgICBsb2coYFRPS0VOICR7a2V5fSA9PiAke3R9YCk7XG4gICAgICAgICAgICBjYih0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgLy8gQ3JlYXRlIGEgbmV3IGVtcHR5IGJ1Y2tldFxuICAgICAgdG9rZW4gPT4gbmV3IEZpbHRlclJldmVyc2VJbmRleChgJHt0b2tlbn1fJHtuYW1lfWApXG4gICAgKTtcblxuICAgIC8vIEFsbCBvdGhlciBmaWx0ZXJzXG4gICAgdGhpcy5maWx0ZXJzID0gbmV3IEZpbHRlclJldmVyc2VJbmRleCh0aGlzLm5hbWUpO1xuXG4gICAgLy8gRGlzcGF0Y2ggZmlsdGVyc1xuICAgIGlmIChmaWx0ZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZpbHRlcnMuZm9yRWFjaCh0aGlzLnB1c2guYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgbG9nKGAke25hbWV9IENSRUFURSBCVUNLRVQ6ICR7dGhpcy5maWx0ZXJzLmxlbmd0aH0gZmlsdGVycyArYCArXG4gICAgICAgIGAke3RoaXMuaG9zdG5hbWVBbmNob3JzLnNpemV9IGhvc3RuYW1lc2ApO1xuICB9XG5cbiAgcHVzaChmaWx0ZXIpIHtcbiAgICBsb2coYFBVU0ggJHtmaWx0ZXIucmF3TGluZX1gKTtcbiAgICBpZiAoZmlsdGVyLmhvc3RuYW1lICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmhvc3RuYW1lQW5jaG9ycy5zZXQoZmlsdGVyLmhvc3RuYW1lLCBmaWx0ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZpbHRlcnMucHVzaChmaWx0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIG1hdGNoV2l0aERvbWFpbihyZXF1ZXN0LCBkb21haW4sIGNoZWNrZWRGaWx0ZXJzKSB7XG4gICAgY29uc3QgYnVja2V0cyA9IHRoaXMuaG9zdG5hbWVBbmNob3JzLmdldEZyb21LZXkoZG9tYWluKTtcbiAgICBmb3IgKGNvbnN0IGJ1Y2tldCBvZiBidWNrZXRzKSB7XG4gICAgICBpZiAoYnVja2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbG9nKGAke3RoaXMubmFtZX0gYnVja2V0IHRyeSB0byBtYXRjaCBob3N0bmFtZUFuY2hvcnMgKCR7ZG9tYWlufS8ke2J1Y2tldC5uYW1lfSlgKTtcbiAgICAgICAgaWYgKGJ1Y2tldC5tYXRjaChyZXF1ZXN0LCBjaGVja2VkRmlsdGVycykpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIG1hdGNoKHJlcXVlc3QpIHtcbiAgICAvLyBLZWVwIHRyYWNrIG9mIGZpbHRlcnMgd2UgYWxyZWFkeSB0cmllZFxuICAgIGNvbnN0IGNoZWNrZWRGaWx0ZXJzID0gbmV3IFNldCgpO1xuXG4gICAgaWYgKHRoaXMubWF0Y2hXaXRoRG9tYWluKHJlcXVlc3QsIHJlcXVlc3QuaG9zdG5hbWUsIGNoZWNrZWRGaWx0ZXJzKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVHJ5IHRvIGZpbmQgYSBtYXRjaCB3aXRoIHJlbWFpbmluZyBmaWx0ZXJzXG4gICAgbG9nKGAke3RoaXMubmFtZX0gYnVja2V0IHRyeSB0byBtYXRjaCBtaXNjYCk7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5maWx0ZXJzLm1hdGNoKHJlcXVlc3QsIGNoZWNrZWRGaWx0ZXJzKTtcbiAgICBsb2coYEJVQ0tFVCAke3RoaXMubmFtZX0gdG90YWwgZmlsdGVycyAke2NoZWNrZWRGaWx0ZXJzLnNpemV9YCk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5cblxuLyogTWFuYWdlIGEgbGlzdCBvZiBmaWx0ZXJzIGFuZCBtYXRjaCB0aGVtIGluIGFuIGVmZmljaWVudCB3YXkuXG4gKiBUbyBhdm9pZCBpbnNwZWN0aW5nIHRvIG1hbnkgZmlsdGVycyBmb3IgZWFjaCByZXF1ZXN0LCB3ZSBjcmVhdGVcbiAqIHRoZSBmb2xsb3dpbmcgYWNjZWxlcmF0aW5nIHN0cnVjdHVyZTpcbiAqXG4gKiBbIEltcG9ydGFudHMgXSAgICBbIEV4Y2VwdGlvbnMgXSAgICBbIFJlbWFpbmluZyBmaWx0ZXJzIF1cbiAqXG4gKiBFYWNoIG9mIHRoZXNlcyBpcyBhIGBGaWx0ZXJCdWNrZXRgLCB3aGljaCBtYW5hZ2UgYSBzdWJzZXQgb2YgZmlsdGVycy5cbiAqXG4gKiBJbXBvcnRhbnRzIGZpbHRlcnMgYXJlIG5vdCBzdWJqZWN0IHRvIGV4Y2VwdGlvbnMsIGhlbmNlIHdlIHRyeSBpdCBmaXJzdC5cbiAqIElmIG5vIGltcG9ydGFudCBmaWx0ZXIgbWF0Y2hlZCwgdHJ5IHRvIHVzZSB0aGUgcmVtYWluaW5nIGZpbHRlcnMgYnVja2V0LlxuICogSWYgd2UgaGF2ZSBhIG1hdGNoLCB0cnkgdG8gZmluZCBhbiBleGNlcHRpb24uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gQEBmaWx0ZXJcbiAgICB0aGlzLmV4Y2VwdGlvbnMgPSBuZXcgRmlsdGVyQnVja2V0KCdleGNlcHRpb25zJyk7XG4gICAgLy8gJGltcG9ydGFudFxuICAgIHRoaXMuaW1wb3J0YW50cyA9IG5ldyBGaWx0ZXJCdWNrZXQoJ2ltcG9ydGFudHMnKTtcbiAgICAvLyBBbGwgb3RoZXIgZmlsdGVyc1xuICAgIHRoaXMuZmlsdGVycyA9IG5ldyBGaWx0ZXJCdWNrZXQoJ2ZpbHRlcnMnKTtcblxuICAgIHRoaXMubGlzdHMgPSBuZXcgTWFwKCk7XG5cbiAgICB0aGlzLnNpemUgPSAwO1xuICB9XG5cbiAgb25VcGRhdGVGaWx0ZXJzKGFzc2V0LCBuZXdGaWx0ZXJzKSB7XG4gICAgY29uc3QgZmlsdGVycyA9IFtdO1xuICAgIGNvbnN0IGV4Y2VwdGlvbnMgPSBbXTtcbiAgICBjb25zdCBpbXBvcnRhbnRzID0gW107XG5cbiAgICAvLyBQYXJzZSBhbmQgZGlzcGF0Y2ggZmlsdGVycyBkZXBlbmRpbmcgb24gdHlwZVxuICAgIHBhcnNlTGlzdChuZXdGaWx0ZXJzKS5mb3JFYWNoKGZpbHRlciA9PiB7XG4gICAgICBpZiAoZmlsdGVyLmlzRXhjZXB0aW9uKSB7XG4gICAgICAgIGV4Y2VwdGlvbnMucHVzaChmaWx0ZXIpO1xuICAgICAgfSBlbHNlIGlmIChmaWx0ZXIuaXNJbXBvcnRhbnQpIHtcbiAgICAgICAgaW1wb3J0YW50cy5wdXNoKGZpbHRlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmaWx0ZXJzLnB1c2goZmlsdGVyKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICghdGhpcy5saXN0cy5oYXMoYXNzZXQpKSB7XG4gICAgICBsb2coYEZJTFRFUiBFTkdJTkUgJHthc3NldH0gVVBEQVRFYCk7XG4gICAgICAvLyBVcGRhdGUgZGF0YSBzdHJ1Y3R1cmVzXG4gICAgICB0aGlzLnNpemUgKz0gZmlsdGVycy5sZW5ndGggKyBleGNlcHRpb25zLmxlbmd0aCArIGltcG9ydGFudHMubGVuZ3RoO1xuICAgICAgZmlsdGVycy5mb3JFYWNoKHRoaXMuZmlsdGVycy5wdXNoLmJpbmQodGhpcy5maWx0ZXJzKSk7XG4gICAgICBleGNlcHRpb25zLmZvckVhY2godGhpcy5leGNlcHRpb25zLnB1c2guYmluZCh0aGlzLmV4Y2VwdGlvbnMpKTtcbiAgICAgIGltcG9ydGFudHMuZm9yRWFjaCh0aGlzLmltcG9ydGFudHMucHVzaC5iaW5kKHRoaXMuaW1wb3J0YW50cykpO1xuXG4gICAgICB0aGlzLmxpc3RzLnNldChhc3NldCwgeyBmaWx0ZXJzLCBleGNlcHRpb25zLCBpbXBvcnRhbnRzIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2coYEZJTFRFUiBFTkdJTkUgJHthc3NldH0gUkVCVUlMRGApO1xuICAgICAgLy8gUmVidWlsZCBldmVyeXRoaW5nXG4gICAgICBmb3IgKGNvbnN0IGxpc3Qgb2YgdGhpcy5saXN0cy52YWx1ZXMoKSkge1xuICAgICAgICBsaXN0LmZpbHRlcnMuZm9yRWFjaChmaWx0ZXJzLnB1c2guYmluZChmaWx0ZXJzKSk7XG4gICAgICAgIGxpc3QuZXhjZXB0aW9ucy5mb3JFYWNoKGV4Y2VwdGlvbnMucHVzaC5iaW5kKGV4Y2VwdGlvbnMpKTtcbiAgICAgICAgbGlzdC5pbXBvcnRhbnRzLmZvckVhY2goaW1wb3J0YW50cy5wdXNoLmJpbmQoaW1wb3J0YW50cykpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNpemUgPSBmaWx0ZXJzLmxlbmd0aCArIGV4Y2VwdGlvbnMubGVuZ3RoICsgaW1wb3J0YW50cy5sZW5ndGg7XG4gICAgICB0aGlzLmZpbHRlcnMgPSBuZXcgRmlsdGVyQnVja2V0KCdmaWx0ZXJzJywgZmlsdGVycyk7XG4gICAgICB0aGlzLmV4Y2VwdGlvbnMgPSBuZXcgRmlsdGVyQnVja2V0KCdleGNlcHRpb25zJywgZXhjZXB0aW9ucyk7XG4gICAgICB0aGlzLmltcG9ydGFudHMgPSBuZXcgRmlsdGVyQnVja2V0KCdpbXBvcnRhbnRzJywgaW1wb3J0YW50cyk7XG4gICAgfVxuXG4gICAgbG9nKGBGaWx0ZXIgZW5naW5lIHVwZGF0ZWQgd2l0aCAke2ZpbHRlcnMubGVuZ3RofSBmaWx0ZXJzLCBgICtcbiAgICAgICAgYCR7ZXhjZXB0aW9ucy5sZW5ndGh9IGV4Y2VwdGlvbnMgYW5kICR7aW1wb3J0YW50cy5sZW5ndGh9IGltcG9ydGFudHNcXG5gKTtcbiAgfVxuXG4gIG1hdGNoKHJlcXVlc3QpIHtcbiAgICBsb2coYE1BVENIICR7SlNPTi5zdHJpbmdpZnkocmVxdWVzdCl9YCk7XG4gICAgcmVxdWVzdC50b2tlbnMgPSB0b2tlbml6ZVVSTChyZXF1ZXN0LnVybCk7XG4gICAgaWYgKHRoaXMuaW1wb3J0YW50cy5tYXRjaChyZXF1ZXN0KSkge1xuICAgICAgbG9nKCdJTVBPUlRBTlQnKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodGhpcy5maWx0ZXJzLm1hdGNoKHJlcXVlc3QpKSB7XG4gICAgICBsb2coJ0ZJTFRFUicpO1xuICAgICAgaWYgKHRoaXMuZXhjZXB0aW9ucy5tYXRjaChyZXF1ZXN0KSkge1xuICAgICAgICBsb2coJ0VYQ0VQVElPTicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19