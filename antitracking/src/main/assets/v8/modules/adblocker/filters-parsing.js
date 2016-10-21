System.register('adblocker/filters-parsing', ['adblocker/utils'], function (_export) {

  // Uniq ID generator
  'use strict';

  var log, uidGen, AdCosmetics, AdFilter;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  _export('default', parseList);

  _export('parseJSResource', parseJSResource);

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function parseLine(line) {
    if (/#[@$%]*#|[$]{2}/.test(line)) {
      return new AdCosmetics(line);
    }
    return new AdFilter(line);
  }

  function parseList(list) {
    try {
      var _ret = (function () {
        var networkFilters = [];
        var cosmeticFilters = [];
        list.forEach(function (line) {
          if (line) {
            var filter = parseLine(line.trim());
            if (filter.supported && !filter.isComment) {
              log('compiled ' + line + ' into ' + JSON.stringify(filter));
              if (filter.isNetworkFilter) {
                networkFilters.push(filter);
              } else {
                cosmeticFilters.push(filter);
              }
            }
          }
        });
        return {
          v: {
            networkFilters: networkFilters,
            cosmeticFilters: cosmeticFilters
          }
        };
      })();

      if (typeof _ret === 'object') return _ret.v;
    } catch (ex) {
      log('ERROR WHILE PARSING ' + typeof list + ' ' + ex);
      return null;
    }
  }

  function parseJSResource(lines) {
    var state = 'end';
    var tmpContent = '';
    var type = null;
    var name = '';
    var parsed = new Map();
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = lines[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var line = _step.value;

        line = line.trim();
        if (line.startsWith('#')) {
          state = 'comment';
        } else if (!line.trim()) {
          state = 'end';
        } else if (state !== 'content' && !type && line.split(' ').length === 2) {
          state = 'title';
        } else {
          state = 'content';
        }
        switch (state) {
          case 'end':
            if (tmpContent) {
              if (!parsed.get(type)) {
                parsed.set(type, new Map());
              }
              parsed.get(type).set(name, tmpContent);
              tmpContent = '';
              type = null;
            }
            break;
          case 'comment':
            break;
          case 'title':
            var _line$split3 = line.split(' ');

            var _line$split32 = _slicedToArray(_line$split3, 2);

            name = _line$split32[0];
            type = _line$split32[1];

            break;
          case 'content':
            tmpContent += line + '\n';
            break;
          default:
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

    if (tmpContent) {
      if (!parsed.get(type)) {
        parsed.set(type, new Map());
      }
      parsed.get(type).set(name, tmpContent);
    }
    return parsed;
  }

  return {
    setters: [function (_adblockerUtils) {
      log = _adblockerUtils.log;
    }],
    execute: function () {
      uidGen = 0;

      // TODO:
      // 1. support script tags filters:
      //    script:contains
      //    script:inject

      AdCosmetics = function AdCosmetics(line) {
        _classCallCheck(this, AdCosmetics);

        // Assign an id to the filter
        this.id = uidGen++;

        this.rawLine = line;
        this.supported = true;
        this.unhide = false;
        this.isCosmeticFilter = true;
        this.scriptInject = false;
        this.scriptReplaced = false;
        this.scriptBlock = false;

        this.hostnames = [];
        this.selector = null;

        // Ignore Adguard filters:
        // `#$#` `#@$#`
        // `#%#` `#@%#`
        // `$$`
        if (/#@?[$%]#|[$]{2}/.test(line)) {
          this.supported = false;
        } else {
          // Check if unhide
          this.unhide = line.includes('#@#');

          // Parse filter

          var _line$split = line.split(/#@?#/);

          var _line$split2 = _slicedToArray(_line$split, 2);

          var prefix = _line$split2[0];
          var suffix = _line$split2[1];

          // Parse hostnames
          if (prefix.length > 0) {
            this.hostnames = prefix.split(',');
          }

          // Parse selector
          if (suffix.length > 0) {
            this.selector = suffix;

            // extract script name
            if (this.selector.includes('script:inject')) {
              this.selector = this.selector.match(/script:inject\((.+)\)/)[1];
              this.scriptInject = true;
            }

            // extract blocked scripts
            if (this.selector.includes('script:contains')) {
              this.selector = this.selector.match(/script:contains\((.+)\)/)[1];
              if (this.selector[0] === '/' && this.selector.endsWith('/')) {
                this.selector = this.selector.substring(1, this.selector.length - 1);
              }
              this.scriptBlock = true;
            }
          }

          // Exceptions
          if (this.selector === null || this.selector.length === 0 || this.selector.endsWith('}') || this.selector.includes('##') || this.unhide && this.hostnames.length === 0) {
            this.supported = false;
          }
        }
      }

      // TODO:
      // 1. Options not supported yet:
      //  - redirect
      //  - popup
      //  - popunder
      //  - generichide
      //  - genericblock
      // 2. Lot of hostname anchors are of the form hostname[...]*[...]
      //    we could split it into prefix + plain pattern
      // 3. Replace some of the attributes by a bitmask
      ;

      _export('AdCosmetics', AdCosmetics);

      AdFilter = (function () {
        function AdFilter(line) {
          _classCallCheck(this, AdFilter);

          // Assign an id to the filter
          this.id = uidGen++;

          this.rawLine = line;
          this.filterStr = this.rawLine;
          this.supported = true;
          this.isException = false;
          this.rawOptions = null;
          this.hostname = null;
          this.isNetworkFilter = true;

          this.regex = null;

          // Options
          // null  == not specified
          // true  == value true
          // false == negation (~)
          this.optDomains = null;
          this.optNotDomains = null;

          this.isImportant = false;
          this.matchCase = false;

          this.thirdParty = null;
          this.firstParty = null;

          // Options on origin policy
          this.fromAny = true;
          this.fromImage = null;
          this.fromMedia = null;
          this.fromObject = null;
          this.fromObjectSubrequest = null;
          this.fromOther = null;
          this.fromPing = null;
          this.fromScript = null;
          this.fromStylesheet = null;
          this.fromSubdocument = null;
          this.fromXmlHttpRequest = null;

          // Kind of pattern
          this.isHostname = false;
          this.isPlain = false;
          this.isRegex = false;
          this.isLeftAnchor = false;
          this.isRightAnchor = false;
          this.isHostnameAnchor = false;

          // Deal with comments
          this.isComment = this.filterStr.startsWith('!') || this.filterStr.startsWith('#') || this.filterStr.startsWith('[Adblock');

          // Trim comments at the end of the line
          // eg: "... # Comment"
          this.filterStr = this.filterStr.replace(/[\s]#.*$/, '');

          if (!this.isComment) {
            // @@filter == Exception
            this.isException = this.filterStr.startsWith('@@');
            if (this.isException) {
              this.filterStr = this.filterStr.substring(2);
            }

            // filter$options == Options
            if (this.filterStr.includes('$')) {
              var filterAndOptions = this.filterStr.split('$');
              this.filterStr = filterAndOptions[0];
              this.rawOptions = filterAndOptions[1];
              // Parse options and set flags
              this.parseOptions(this.rawOptions);
            }

            if (this.supported) {
              // Identify kind of pattern

              // Deal with hostname pattern
              if (this.filterStr.startsWith('127.0.0.1')) {
                this.hostname = this.filterStr.split(' ').pop();
                this.filterStr = '';
                this.isHostname = true;
                this.isPlain = true;
                this.isRegex = false;
                this.isHostnameAnchor = true;
              } else {
                if (this.filterStr.endsWith('|')) {
                  this.isRightAnchor = true;
                  this.filterStr = this.filterStr.substring(0, this.filterStr.length - 1);
                }

                if (this.filterStr.startsWith('||')) {
                  this.isHostnameAnchor = true;
                  this.filterStr = this.filterStr.substring(2);
                } else if (this.filterStr.startsWith('|')) {
                  this.isLeftAnchor = true;
                  this.filterStr = this.filterStr.substring(1);
                }

                // If pattern ends with "*", strip it as it often can be
                // transformed into a "plain pattern" this way.
                if (this.filterStr.endsWith('*') && this.filterStr.length > 1) {
                  this.filterStr = this.filterStr.substring(0, this.filterStr.length - 1);
                }

                // Is regex?
                if (this.filterStr.includes('*') || this.filterStr.includes('^')) {
                  this.isRegex = true;
                } else {
                  this.isPlain = true;
                }

                // Extract hostname to match it more easily
                // NOTE: This is the most common case of filters
                if (this.isPlain && this.isHostnameAnchor) {
                  // Look for next /
                  var slashIndex = this.filterStr.indexOf('/');
                  if (slashIndex !== -1) {
                    this.hostname = this.filterStr.substring(0, slashIndex);
                    this.filterStr = this.filterStr.substring(slashIndex);
                  } else {
                    this.hostname = this.filterStr;
                    this.filterStr = '';
                  }
                } else if (this.isRegex && this.isHostnameAnchor) {
                  try {
                    // Split at the first '/' or '^' character to get the hostname
                    // and then the pattern.
                    var firstSep = this.filterStr.search(/[/^*]/);
                    if (firstSep !== -1) {
                      var hostname = this.filterStr.substring(0, firstSep);
                      var pattern = this.filterStr.substring(firstSep);

                      this.hostname = hostname;
                      this.isRegex = pattern.includes('^') || pattern.includes('*');
                      this.isPlain = !this.isRegex;
                      this.filterStr = pattern;

                      if (this.filterStr === '^') {
                        this.filterStr = '';
                        this.isPlain = true;
                        this.isRegex = false;
                      }

                      log('SPLIT ' + JSON.stringify({
                        raw: this.rawLine,
                        hostname: this.hostname,
                        filterStr: this.filterStr,
                        isRegex: this.isRegex
                      }));
                    }
                  } catch (ex) {
                    log('ERROR !! ' + ex);
                  }
                }
              }

              // Compile Regex
              if (this.isRegex) {
                this.regex = this.compileRegex(this.filterStr);
                this.rawRegex = this.regex.toString();
              } else {
                // if (!this.matchCase) {
                // NOTE: No filter seems to be using the `match-case` option,
                // hence, it's more efficient to just convert everything to
                // lower case before matching.
                if (this.filterStr) {
                  this.filterStr = this.filterStr.toLowerCase();
                }
                if (this.hostname) {
                  this.hostname = this.hostname.toLowerCase();
                }
              }
            }
          }
        }

        _createClass(AdFilter, [{
          key: 'compileRegex',
          value: function compileRegex(filterStr) {
            var filter = filterStr;

            // Escape special regex characters: |.$+?{}()[]\
            filter = filter.replace(/([|.$+?{}()[\]\\])/g, '\\$1');

            // * can match anything
            filter = filter.replace(/\*/g, '.*');
            // ^ can match any separator or the end of the pattern
            filter = filter.replace(/\^/g, '(?:[^\\w\\d_.%-]|$)');

            // Should match end of url
            if (this.isRightAnchor) {
              filter = filter + '$';
            }

            if (this.isHostnameAnchor || this.isLeftAnchor) {
              filter = '^' + filter;
            }

            try {
              // Compile regex
              if (this.matchCase) {
                return new RegExp(filter);
              }
              return new RegExp(filter, 'i');
            } catch (ex) {
              log('failed to compile regex ' + filter + ' with error ' + ex);
              // Ignore this filter
              this.supported = false;
              return null;
            }
          }
        }, {
          key: 'parseOptions',
          value: function parseOptions(rawOptions) {
            var _this = this;

            rawOptions.split(',').forEach(function (rawOption) {
              var negation = false;
              var option = rawOption;

              // Check for negation: ~option
              if (option.startsWith('~')) {
                negation = true;
                option = option.substring(1);
              } else {
                negation = false;
              }

              // Check for options: option=value1|value2
              var optionValues = [];
              if (option.includes('=')) {
                var optionAndValues = option.split('=', 2);
                option = optionAndValues[0];
                optionValues = optionAndValues[1].split('|');
              }

              switch (option) {
                case 'domain':
                  _this.optDomains = new Set();
                  _this.optNotDomains = new Set();

                  optionValues.forEach(function (value) {
                    if (value) {
                      if (value.startsWith('~')) {
                        _this.optNotDomains.add(value.substring(1));
                      } else {
                        _this.optDomains.add(value);
                      }
                    }
                  });

                  if (_this.optDomains.size === 0) {
                    _this.optDomains = null;
                  }
                  if (_this.optNotDomains.size === 0) {
                    _this.optNotDomains = null;
                  }

                  // this.optDomains = [...this.optDomains.values()];
                  // this.optNotDomains = [...this.optNotDomains.values()];
                  break;
                case 'image':
                  _this.fromImage = !negation;
                  break;
                case 'media':
                  _this.fromMedia = !negation;
                  break;
                case 'object':
                  _this.fromObject = !negation;
                  break;
                case 'object-subrequest':
                  _this.fromObjectSubrequest = !negation;
                  break;
                case 'other':
                  _this.fromOther = !negation;
                  break;
                case 'ping':
                  _this.fromPing = !negation;
                  break;
                case 'script':
                  _this.fromScript = !negation;
                  break;
                case 'stylesheet':
                  _this.fromStylesheet = !negation;
                  break;
                case 'subdocument':
                  _this.fromSubdocument = !negation;
                  break;
                case 'xmlhttprequest':
                  _this.fromXmlHttpRequest = !negation;
                  break;
                case 'important':
                  // Note: `negation` should always be `false` here.
                  _this.isImportant = true;
                  break;
                case 'match-case':
                  // Note: `negation` should always be `false` here.
                  _this.matchCase = true;
                  break;
                case 'third-party':
                  _this.thirdParty = !negation;
                  break;
                case 'first-party':
                  _this.firstParty = !negation;
                  break;
                case 'collapse':
                  break;
                // Disable this filter if any other option is encountered
                default:
                  // Disable this filter if we don't support all the options
                  _this.supported = false;
                  log('NOT SUPPORTED OPTION ' + option);
              }
            });

            // Check if any of the fromX flag is set
            this.fromAny = this.fromImage === null && this.fromMedia === null && this.fromObject === null && this.fromObjectSubrequest === null && this.fromOther === null && this.fromPing === null && this.fromScript === null && this.fromStylesheet === null && this.fromSubdocument === null && this.fromXmlHttpRequest === null;
          }
        }]);

        return AdFilter;
      })();

      _export('AdFilter', AdFilter);
    }
  };
});