System.register('adblocker/filters-parsing', ['adblocker/utils'], function (_export) {

  // Uniq ID generator
  'use strict';

  var log, uidGen, AdFilter;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  _export('default', parseList);

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function parseList(list) {
    try {
      var _ret = (function () {
        var filters = [];
        list.forEach(function (line) {
          if (line) {
            var filter = new AdFilter(line);
            if (filter.supported && !filter.isComment) {
              log('compiled ' + line + ' into ' + JSON.stringify(filter));
              filters.push(filter);
            }
          }
        });
        return {
          v: filters
        };
      })();

      if (typeof _ret === 'object') return _ret.v;
    } catch (ex) {
      log('ERROR WHILE PARSING ' + typeof list + ' ' + ex);
      return null;
    }
  }

  return {
    setters: [function (_adblockerUtils) {
      log = _adblockerUtils.log;
    }],
    execute: function () {
      uidGen = 0;

      // TODO: Options not supported yet:
      // redirect
      // popup
      // popunder
      // generichide
      // genericblock

      // TODO: Lot of hostname anchors are of the form hostname[...]*[...]
      //       we could split it into prefix + plain pattern
      // TODO: Make sure we support difference between adblock and ublock when filter is a valid hostname
      // TODO: Replace some of the attributes by a bitmask

      AdFilter = (function () {
        function AdFilter(line) {
          _classCallCheck(this, AdFilter);

          // Assign an id to the filter
          this.id = uidGen++;

          this.rawLine = line.trim();
          this.filterStr = this.rawLine;
          this.supported = true;
          this.isException = false;
          this.rawOptions = null;
          this.hostname = null;

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
            // domains##selector || domains###selector || domains#@#selector
            if (this.filterStr.includes('##') || this.filterStr.includes('#@#')) {
              this.supported = false;
            } else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9maWx0ZXJzLXBhcnNpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7V0FJSSxNQUFNLEVBY0csUUFBUTs7OztxQkEyVUcsU0FBUzs7OztBQUFsQixXQUFTLFNBQVMsQ0FBQyxJQUFJLEVBQUU7QUFDdEMsUUFBSTs7QUFDRixZQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDbkIsWUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksRUFBSTtBQUNuQixjQUFJLElBQUksRUFBRTtBQUNSLGdCQUFNLE1BQU0sR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsQyxnQkFBSSxNQUFNLENBQUMsU0FBUyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRTtBQUN6QyxpQkFBRyxlQUFhLElBQUksY0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFHLENBQUM7QUFDdkQscUJBQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDdEI7V0FDRjtTQUNGLENBQUMsQ0FBQztBQUNIO2FBQU8sT0FBTztVQUFDOzs7O0tBQ2hCLENBQUMsT0FBTyxFQUFFLEVBQUU7QUFDWCxTQUFHLDBCQUF3QixPQUFPLElBQUksU0FBSSxFQUFFLENBQUcsQ0FBQztBQUNoRCxhQUFPLElBQUksQ0FBQztLQUNiO0dBQ0Y7Ozs7NEJBOVdRLEdBQUc7OztBQUlSLFlBQU0sR0FBRyxDQUFDOzs7Ozs7Ozs7Ozs7OztBQWNELGNBQVE7QUFDUixpQkFEQSxRQUFRLENBQ1AsSUFBSSxFQUFFO2dDQURQLFFBQVE7OztBQUdqQixjQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDOztBQUVuQixjQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUMzQixjQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7QUFDOUIsY0FBSSxDQUFDLFNBQVMsR0FBRyxJQUFJ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Q3ZCLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxJQUN2QixJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksSUFDeEIsSUFBSSxDQUFDLG9CQUFvQixLQUFLLElBQUksSUFDbEMsSUFBSSxDQUFDLFNBQVMsS0FBSyxJQUFJLElBQ3ZCLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxJQUN0QixJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksSUFDeEIsSUFBSSxDQUFDLGNBQWMsS0FBSyxJQUFJLElBQzVCLElBQUksQ0FBQyxlQUFlLEtBQUssSUFBSSxJQUM3QixJQUFJLENBQUMsa0JBQWtCLEtBQUssSUFBSSxBQUFDLENBQUM7V0FDckM7OztlQXZVVSxRQUFRIiwiZmlsZSI6ImFkYmxvY2tlci9maWx0ZXJzLXBhcnNpbmcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBsb2cgfSBmcm9tICdhZGJsb2NrZXIvdXRpbHMnO1xuXG5cbi8vIFVuaXEgSUQgZ2VuZXJhdG9yXG5sZXQgdWlkR2VuID0gMDtcblxuXG4vLyBUT0RPOiBPcHRpb25zIG5vdCBzdXBwb3J0ZWQgeWV0OlxuLy8gcmVkaXJlY3Rcbi8vIHBvcHVwXG4vLyBwb3B1bmRlclxuLy8gZ2VuZXJpY2hpZGVcbi8vIGdlbmVyaWNibG9ja1xuXG4vLyBUT0RPOiBMb3Qgb2YgaG9zdG5hbWUgYW5jaG9ycyBhcmUgb2YgdGhlIGZvcm0gaG9zdG5hbWVbLi4uXSpbLi4uXVxuLy8gICAgICAgd2UgY291bGQgc3BsaXQgaXQgaW50byBwcmVmaXggKyBwbGFpbiBwYXR0ZXJuXG4vLyBUT0RPOiBNYWtlIHN1cmUgd2Ugc3VwcG9ydCBkaWZmZXJlbmNlIGJldHdlZW4gYWRibG9jayBhbmQgdWJsb2NrIHdoZW4gZmlsdGVyIGlzIGEgdmFsaWQgaG9zdG5hbWVcbi8vIFRPRE86IFJlcGxhY2Ugc29tZSBvZiB0aGUgYXR0cmlidXRlcyBieSBhIGJpdG1hc2tcbmV4cG9ydCBjbGFzcyBBZEZpbHRlciB7XG4gIGNvbnN0cnVjdG9yKGxpbmUpIHtcbiAgICAvLyBBc3NpZ24gYW4gaWQgdG8gdGhlIGZpbHRlclxuICAgIHRoaXMuaWQgPSB1aWRHZW4rKztcblxuICAgIHRoaXMucmF3TGluZSA9IGxpbmUudHJpbSgpO1xuICAgIHRoaXMuZmlsdGVyU3RyID0gdGhpcy5yYXdMaW5lO1xuICAgIHRoaXMuc3VwcG9ydGVkID0gdHJ1ZTtcbiAgICB0aGlzLmlzRXhjZXB0aW9uID0gZmFsc2U7XG4gICAgdGhpcy5yYXdPcHRpb25zID0gbnVsbDtcbiAgICB0aGlzLmhvc3RuYW1lID0gbnVsbDtcblxuICAgIHRoaXMucmVnZXggPSBudWxsO1xuXG4gICAgLy8gT3B0aW9uc1xuICAgIC8vIG51bGwgID09IG5vdCBzcGVjaWZpZWRcbiAgICAvLyB0cnVlICA9PSB2YWx1ZSB0cnVlXG4gICAgLy8gZmFsc2UgPT0gbmVnYXRpb24gKH4pXG4gICAgdGhpcy5vcHREb21haW5zID0gbnVsbDtcbiAgICB0aGlzLm9wdE5vdERvbWFpbnMgPSBudWxsO1xuXG4gICAgdGhpcy5pc0ltcG9ydGFudCA9IGZhbHNlO1xuICAgIHRoaXMubWF0Y2hDYXNlID0gZmFsc2U7XG5cbiAgICB0aGlzLnRoaXJkUGFydHkgPSBudWxsO1xuICAgIHRoaXMuZmlyc3RQYXJ0eSA9IG51bGw7XG5cbiAgICAvLyBPcHRpb25zIG9uIG9yaWdpbiBwb2xpY3lcbiAgICB0aGlzLmZyb21BbnkgPSB0cnVlO1xuICAgIHRoaXMuZnJvbUltYWdlID0gbnVsbDtcbiAgICB0aGlzLmZyb21NZWRpYSA9IG51bGw7XG4gICAgdGhpcy5mcm9tT2JqZWN0ID0gbnVsbDtcbiAgICB0aGlzLmZyb21PYmplY3RTdWJyZXF1ZXN0ID0gbnVsbDtcbiAgICB0aGlzLmZyb21PdGhlciA9IG51bGw7XG4gICAgdGhpcy5mcm9tUGluZyA9IG51bGw7XG4gICAgdGhpcy5mcm9tU2NyaXB0ID0gbnVsbDtcbiAgICB0aGlzLmZyb21TdHlsZXNoZWV0ID0gbnVsbDtcbiAgICB0aGlzLmZyb21TdWJkb2N1bWVudCA9IG51bGw7XG4gICAgdGhpcy5mcm9tWG1sSHR0cFJlcXVlc3QgPSBudWxsO1xuXG4gICAgLy8gS2luZCBvZiBwYXR0ZXJuXG4gICAgdGhpcy5pc0hvc3RuYW1lID0gZmFsc2U7XG4gICAgdGhpcy5pc1BsYWluID0gZmFsc2U7XG4gICAgdGhpcy5pc1JlZ2V4ID0gZmFsc2U7XG4gICAgdGhpcy5pc0xlZnRBbmNob3IgPSBmYWxzZTtcbiAgICB0aGlzLmlzUmlnaHRBbmNob3IgPSBmYWxzZTtcbiAgICB0aGlzLmlzSG9zdG5hbWVBbmNob3IgPSBmYWxzZTtcblxuICAgIC8vIERlYWwgd2l0aCBjb21tZW50c1xuICAgIHRoaXMuaXNDb21tZW50ID0gKHRoaXMuZmlsdGVyU3RyLnN0YXJ0c1dpdGgoJyEnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyU3RyLnN0YXJ0c1dpdGgoJyMnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyU3RyLnN0YXJ0c1dpdGgoJ1tBZGJsb2NrJykpO1xuXG4gICAgLy8gVHJpbSBjb21tZW50cyBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lXG4gICAgLy8gZWc6IFwiLi4uICMgQ29tbWVudFwiXG4gICAgdGhpcy5maWx0ZXJTdHIgPSB0aGlzLmZpbHRlclN0ci5yZXBsYWNlKC9bXFxzXSMuKiQvLCAnJyk7XG5cbiAgICBpZiAoIXRoaXMuaXNDb21tZW50KSB7XG4gICAgICAvLyBkb21haW5zIyNzZWxlY3RvciB8fCBkb21haW5zIyMjc2VsZWN0b3IgfHwgZG9tYWlucyNAI3NlbGVjdG9yXG4gICAgICBpZiAodGhpcy5maWx0ZXJTdHIuaW5jbHVkZXMoJyMjJykgfHwgdGhpcy5maWx0ZXJTdHIuaW5jbHVkZXMoJyNAIycpKSB7XG4gICAgICAgIHRoaXMuc3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBAQGZpbHRlciA9PSBFeGNlcHRpb25cbiAgICAgICAgdGhpcy5pc0V4Y2VwdGlvbiA9IHRoaXMuZmlsdGVyU3RyLnN0YXJ0c1dpdGgoJ0BAJyk7XG4gICAgICAgIGlmICh0aGlzLmlzRXhjZXB0aW9uKSB7XG4gICAgICAgICAgdGhpcy5maWx0ZXJTdHIgPSB0aGlzLmZpbHRlclN0ci5zdWJzdHJpbmcoMik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaWx0ZXIkb3B0aW9ucyA9PSBPcHRpb25zXG4gICAgICAgIGlmICh0aGlzLmZpbHRlclN0ci5pbmNsdWRlcygnJCcpKSB7XG4gICAgICAgICAgY29uc3QgZmlsdGVyQW5kT3B0aW9ucyA9IHRoaXMuZmlsdGVyU3RyLnNwbGl0KCckJyk7XG4gICAgICAgICAgdGhpcy5maWx0ZXJTdHIgPSBmaWx0ZXJBbmRPcHRpb25zWzBdO1xuICAgICAgICAgIHRoaXMucmF3T3B0aW9ucyA9IGZpbHRlckFuZE9wdGlvbnNbMV07XG4gICAgICAgICAgLy8gUGFyc2Ugb3B0aW9ucyBhbmQgc2V0IGZsYWdzXG4gICAgICAgICAgdGhpcy5wYXJzZU9wdGlvbnModGhpcy5yYXdPcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnN1cHBvcnRlZCkge1xuICAgICAgICAgIC8vIElkZW50aWZ5IGtpbmQgb2YgcGF0dGVyblxuXG4gICAgICAgICAgLy8gRGVhbCB3aXRoIGhvc3RuYW1lIHBhdHRlcm5cbiAgICAgICAgICBpZiAodGhpcy5maWx0ZXJTdHIuc3RhcnRzV2l0aCgnMTI3LjAuMC4xJykpIHtcbiAgICAgICAgICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmZpbHRlclN0ci5zcGxpdCgnICcpLnBvcCgpO1xuICAgICAgICAgICAgdGhpcy5maWx0ZXJTdHIgPSAnJztcbiAgICAgICAgICAgIHRoaXMuaXNIb3N0bmFtZSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmlzUGxhaW4gPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5pc1JlZ2V4ID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmlzSG9zdG5hbWVBbmNob3IgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5maWx0ZXJTdHIuZW5kc1dpdGgoJ3wnKSkge1xuICAgICAgICAgICAgICB0aGlzLmlzUmlnaHRBbmNob3IgPSB0cnVlO1xuICAgICAgICAgICAgICB0aGlzLmZpbHRlclN0ciA9IHRoaXMuZmlsdGVyU3RyLnN1YnN0cmluZygwLCB0aGlzLmZpbHRlclN0ci5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuZmlsdGVyU3RyLnN0YXJ0c1dpdGgoJ3x8JykpIHtcbiAgICAgICAgICAgICAgdGhpcy5pc0hvc3RuYW1lQW5jaG9yID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdGhpcy5maWx0ZXJTdHIgPSB0aGlzLmZpbHRlclN0ci5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZmlsdGVyU3RyLnN0YXJ0c1dpdGgoJ3wnKSkge1xuICAgICAgICAgICAgICB0aGlzLmlzTGVmdEFuY2hvciA9IHRydWU7XG4gICAgICAgICAgICAgIHRoaXMuZmlsdGVyU3RyID0gdGhpcy5maWx0ZXJTdHIuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiBwYXR0ZXJuIGVuZHMgd2l0aCBcIipcIiwgc3RyaXAgaXQgYXMgaXQgb2Z0ZW4gY2FuIGJlXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1lZCBpbnRvIGEgXCJwbGFpbiBwYXR0ZXJuXCIgdGhpcyB3YXkuXG4gICAgICAgICAgICBpZiAodGhpcy5maWx0ZXJTdHIuZW5kc1dpdGgoJyonKSAmJiB0aGlzLmZpbHRlclN0ci5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgIHRoaXMuZmlsdGVyU3RyID0gdGhpcy5maWx0ZXJTdHIuc3Vic3RyaW5nKDAsIHRoaXMuZmlsdGVyU3RyLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJcyByZWdleD9cbiAgICAgICAgICAgIGlmICh0aGlzLmZpbHRlclN0ci5pbmNsdWRlcygnKicpIHx8IHRoaXMuZmlsdGVyU3RyLmluY2x1ZGVzKCdeJykpIHtcbiAgICAgICAgICAgICAgdGhpcy5pc1JlZ2V4ID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuaXNQbGFpbiA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgaG9zdG5hbWUgdG8gbWF0Y2ggaXQgbW9yZSBlYXNpbHlcbiAgICAgICAgICAgIC8vIE5PVEU6IFRoaXMgaXMgdGhlIG1vc3QgY29tbW9uIGNhc2Ugb2YgZmlsdGVyc1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNQbGFpbiAmJiB0aGlzLmlzSG9zdG5hbWVBbmNob3IpIHtcbiAgICAgICAgICAgICAgLy8gTG9vayBmb3IgbmV4dCAvXG4gICAgICAgICAgICAgIGNvbnN0IHNsYXNoSW5kZXggPSB0aGlzLmZpbHRlclN0ci5pbmRleE9mKCcvJyk7XG4gICAgICAgICAgICAgIGlmIChzbGFzaEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmZpbHRlclN0ci5zdWJzdHJpbmcoMCwgc2xhc2hJbmRleCk7XG4gICAgICAgICAgICAgICAgdGhpcy5maWx0ZXJTdHIgPSB0aGlzLmZpbHRlclN0ci5zdWJzdHJpbmcoc2xhc2hJbmRleCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ob3N0bmFtZSA9IHRoaXMuZmlsdGVyU3RyO1xuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyU3RyID0gJyc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc1JlZ2V4ICYmIHRoaXMuaXNIb3N0bmFtZUFuY2hvcikge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIFNwbGl0IGF0IHRoZSBmaXJzdCAnLycgb3IgJ14nIGNoYXJhY3RlciB0byBnZXQgdGhlIGhvc3RuYW1lXG4gICAgICAgICAgICAgICAgLy8gYW5kIHRoZW4gdGhlIHBhdHRlcm4uXG4gICAgICAgICAgICAgICAgY29uc3QgZmlyc3RTZXAgPSB0aGlzLmZpbHRlclN0ci5zZWFyY2goL1svXipdLyk7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0U2VwICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgaG9zdG5hbWUgPSB0aGlzLmZpbHRlclN0ci5zdWJzdHJpbmcoMCwgZmlyc3RTZXApO1xuICAgICAgICAgICAgICAgICAgY29uc3QgcGF0dGVybiA9IHRoaXMuZmlsdGVyU3RyLnN1YnN0cmluZyhmaXJzdFNlcCk7XG5cbiAgICAgICAgICAgICAgICAgIHRoaXMuaG9zdG5hbWUgPSBob3N0bmFtZTtcbiAgICAgICAgICAgICAgICAgIHRoaXMuaXNSZWdleCA9IChwYXR0ZXJuLmluY2x1ZGVzKCdeJykgfHxcbiAgICAgICAgICAgICAgICAgICAgcGF0dGVybi5pbmNsdWRlcygnKicpKTtcbiAgICAgICAgICAgICAgICAgIHRoaXMuaXNQbGFpbiA9ICF0aGlzLmlzUmVnZXg7XG4gICAgICAgICAgICAgICAgICB0aGlzLmZpbHRlclN0ciA9IHBhdHRlcm47XG5cbiAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmZpbHRlclN0ciA9PT0gJ14nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyU3RyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNQbGFpbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNSZWdleCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBsb2coYFNQTElUICR7SlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICByYXc6IHRoaXMucmF3TGluZSxcbiAgICAgICAgICAgICAgICAgICAgaG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlclN0cjogdGhpcy5maWx0ZXJTdHIsXG4gICAgICAgICAgICAgICAgICAgIGlzUmVnZXg6IHRoaXMuaXNSZWdleCxcbiAgICAgICAgICAgICAgICAgIH0pfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgICBsb2coYEVSUk9SICEhICR7ZXh9YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDb21waWxlIFJlZ2V4XG4gICAgICAgICAgaWYgKHRoaXMuaXNSZWdleCkge1xuICAgICAgICAgICAgdGhpcy5yZWdleCA9IHRoaXMuY29tcGlsZVJlZ2V4KHRoaXMuZmlsdGVyU3RyKTtcbiAgICAgICAgICAgIHRoaXMucmF3UmVnZXggPSB0aGlzLnJlZ2V4LnRvU3RyaW5nKCk7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gaWYgKCF0aGlzLm1hdGNoQ2FzZSkge1xuICAgICAgICAgICAgLy8gTk9URTogTm8gZmlsdGVyIHNlZW1zIHRvIGJlIHVzaW5nIHRoZSBgbWF0Y2gtY2FzZWAgb3B0aW9uLFxuICAgICAgICAgICAgLy8gaGVuY2UsIGl0J3MgbW9yZSBlZmZpY2llbnQgdG8ganVzdCBjb252ZXJ0IGV2ZXJ5dGhpbmcgdG9cbiAgICAgICAgICAgIC8vIGxvd2VyIGNhc2UgYmVmb3JlIG1hdGNoaW5nLlxuICAgICAgICAgICAgaWYgKHRoaXMuZmlsdGVyU3RyKSB7XG4gICAgICAgICAgICAgIHRoaXMuZmlsdGVyU3RyID0gdGhpcy5maWx0ZXJTdHIudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmhvc3RuYW1lKSB7XG4gICAgICAgICAgICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29tcGlsZVJlZ2V4KGZpbHRlclN0cikge1xuICAgIGxldCBmaWx0ZXIgPSBmaWx0ZXJTdHI7XG5cbiAgICAvLyBFc2NhcGUgc3BlY2lhbCByZWdleCBjaGFyYWN0ZXJzOiB8LiQrP3t9KClbXVxcXG4gICAgZmlsdGVyID0gZmlsdGVyLnJlcGxhY2UoLyhbfC4kKz97fSgpW1xcXVxcXFxdKS9nLCAnXFxcXCQxJyk7XG5cbiAgICAvLyAqIGNhbiBtYXRjaCBhbnl0aGluZ1xuICAgIGZpbHRlciA9IGZpbHRlci5yZXBsYWNlKC9cXCovZywgJy4qJyk7XG4gICAgLy8gXiBjYW4gbWF0Y2ggYW55IHNlcGFyYXRvciBvciB0aGUgZW5kIG9mIHRoZSBwYXR0ZXJuXG4gICAgZmlsdGVyID0gZmlsdGVyLnJlcGxhY2UoL1xcXi9nLCAnKD86W15cXFxcd1xcXFxkXy4lLV18JCknKTtcblxuICAgIC8vIFNob3VsZCBtYXRjaCBlbmQgb2YgdXJsXG4gICAgaWYgKHRoaXMuaXNSaWdodEFuY2hvcikge1xuICAgICAgZmlsdGVyID0gYCR7ZmlsdGVyfSRgO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzSG9zdG5hbWVBbmNob3IgfHwgdGhpcy5pc0xlZnRBbmNob3IpIHtcbiAgICAgIGZpbHRlciA9IGBeJHtmaWx0ZXJ9YDtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gQ29tcGlsZSByZWdleFxuICAgICAgaWYgKHRoaXMubWF0Y2hDYXNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVnRXhwKGZpbHRlcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cChmaWx0ZXIsICdpJyk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGxvZyhgZmFpbGVkIHRvIGNvbXBpbGUgcmVnZXggJHtmaWx0ZXJ9IHdpdGggZXJyb3IgJHtleH1gKTtcbiAgICAgIC8vIElnbm9yZSB0aGlzIGZpbHRlclxuICAgICAgdGhpcy5zdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlT3B0aW9ucyhyYXdPcHRpb25zKSB7XG4gICAgcmF3T3B0aW9ucy5zcGxpdCgnLCcpLmZvckVhY2gocmF3T3B0aW9uID0+IHtcbiAgICAgIGxldCBuZWdhdGlvbiA9IGZhbHNlO1xuICAgICAgbGV0IG9wdGlvbiA9IHJhd09wdGlvbjtcblxuICAgICAgLy8gQ2hlY2sgZm9yIG5lZ2F0aW9uOiB+b3B0aW9uXG4gICAgICBpZiAob3B0aW9uLnN0YXJ0c1dpdGgoJ34nKSkge1xuICAgICAgICBuZWdhdGlvbiA9IHRydWU7XG4gICAgICAgIG9wdGlvbiA9IG9wdGlvbi5zdWJzdHJpbmcoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZWdhdGlvbiA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBmb3Igb3B0aW9uczogb3B0aW9uPXZhbHVlMXx2YWx1ZTJcbiAgICAgIGxldCBvcHRpb25WYWx1ZXMgPSBbXTtcbiAgICAgIGlmIChvcHRpb24uaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICBjb25zdCBvcHRpb25BbmRWYWx1ZXMgPSBvcHRpb24uc3BsaXQoJz0nLCAyKTtcbiAgICAgICAgb3B0aW9uID0gb3B0aW9uQW5kVmFsdWVzWzBdO1xuICAgICAgICBvcHRpb25WYWx1ZXMgPSBvcHRpb25BbmRWYWx1ZXNbMV0uc3BsaXQoJ3wnKTtcbiAgICAgIH1cblxuICAgICAgc3dpdGNoIChvcHRpb24pIHtcbiAgICAgICAgY2FzZSAnZG9tYWluJzpcbiAgICAgICAgICB0aGlzLm9wdERvbWFpbnMgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgdGhpcy5vcHROb3REb21haW5zID0gbmV3IFNldCgpO1xuXG4gICAgICAgICAgb3B0aW9uVmFsdWVzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZS5zdGFydHNXaXRoKCd+JykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9wdE5vdERvbWFpbnMuYWRkKHZhbHVlLnN1YnN0cmluZygxKSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vcHREb21haW5zLmFkZCh2YWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmICh0aGlzLm9wdERvbWFpbnMuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5vcHREb21haW5zID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRoaXMub3B0Tm90RG9tYWlucy5zaXplID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLm9wdE5vdERvbWFpbnMgPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHRoaXMub3B0RG9tYWlucyA9IFsuLi50aGlzLm9wdERvbWFpbnMudmFsdWVzKCldO1xuICAgICAgICAgIC8vIHRoaXMub3B0Tm90RG9tYWlucyA9IFsuLi50aGlzLm9wdE5vdERvbWFpbnMudmFsdWVzKCldO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdpbWFnZSc6XG4gICAgICAgICAgdGhpcy5mcm9tSW1hZ2UgPSAhbmVnYXRpb247XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ21lZGlhJzpcbiAgICAgICAgICB0aGlzLmZyb21NZWRpYSA9ICFuZWdhdGlvbjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICB0aGlzLmZyb21PYmplY3QgPSAhbmVnYXRpb247XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ29iamVjdC1zdWJyZXF1ZXN0JzpcbiAgICAgICAgICB0aGlzLmZyb21PYmplY3RTdWJyZXF1ZXN0ID0gIW5lZ2F0aW9uO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdvdGhlcic6XG4gICAgICAgICAgdGhpcy5mcm9tT3RoZXIgPSAhbmVnYXRpb247XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3BpbmcnOlxuICAgICAgICAgIHRoaXMuZnJvbVBpbmcgPSAhbmVnYXRpb247XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgdGhpcy5mcm9tU2NyaXB0ID0gIW5lZ2F0aW9uO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzdHlsZXNoZWV0JzpcbiAgICAgICAgICB0aGlzLmZyb21TdHlsZXNoZWV0ID0gIW5lZ2F0aW9uO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzdWJkb2N1bWVudCc6XG4gICAgICAgICAgdGhpcy5mcm9tU3ViZG9jdW1lbnQgPSAhbmVnYXRpb247XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3htbGh0dHByZXF1ZXN0JzpcbiAgICAgICAgICB0aGlzLmZyb21YbWxIdHRwUmVxdWVzdCA9ICFuZWdhdGlvbjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaW1wb3J0YW50JzpcbiAgICAgICAgICAvLyBOb3RlOiBgbmVnYXRpb25gIHNob3VsZCBhbHdheXMgYmUgYGZhbHNlYCBoZXJlLlxuICAgICAgICAgIHRoaXMuaXNJbXBvcnRhbnQgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdtYXRjaC1jYXNlJzpcbiAgICAgICAgICAvLyBOb3RlOiBgbmVnYXRpb25gIHNob3VsZCBhbHdheXMgYmUgYGZhbHNlYCBoZXJlLlxuICAgICAgICAgIHRoaXMubWF0Y2hDYXNlID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndGhpcmQtcGFydHknOlxuICAgICAgICAgIHRoaXMudGhpcmRQYXJ0eSA9ICFuZWdhdGlvbjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZmlyc3QtcGFydHknOlxuICAgICAgICAgIHRoaXMuZmlyc3RQYXJ0eSA9ICFuZWdhdGlvbjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY29sbGFwc2UnOlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBEaXNhYmxlIHRoaXMgZmlsdGVyIGlmIGFueSBvdGhlciBvcHRpb24gaXMgZW5jb3VudGVyZWRcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAvLyBEaXNhYmxlIHRoaXMgZmlsdGVyIGlmIHdlIGRvbid0IHN1cHBvcnQgYWxsIHRoZSBvcHRpb25zXG4gICAgICAgICAgdGhpcy5zdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBsb2coYE5PVCBTVVBQT1JURUQgT1BUSU9OICR7b3B0aW9ufWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQ2hlY2sgaWYgYW55IG9mIHRoZSBmcm9tWCBmbGFnIGlzIHNldFxuICAgIHRoaXMuZnJvbUFueSA9IChcbiAgICAgIHRoaXMuZnJvbUltYWdlID09PSBudWxsICYmXG4gICAgICB0aGlzLmZyb21NZWRpYSA9PT0gbnVsbCAmJlxuICAgICAgdGhpcy5mcm9tT2JqZWN0ID09PSBudWxsICYmXG4gICAgICB0aGlzLmZyb21PYmplY3RTdWJyZXF1ZXN0ID09PSBudWxsICYmXG4gICAgICB0aGlzLmZyb21PdGhlciA9PT0gbnVsbCAmJlxuICAgICAgdGhpcy5mcm9tUGluZyA9PT0gbnVsbCAmJlxuICAgICAgdGhpcy5mcm9tU2NyaXB0ID09PSBudWxsICYmXG4gICAgICB0aGlzLmZyb21TdHlsZXNoZWV0ID09PSBudWxsICYmXG4gICAgICB0aGlzLmZyb21TdWJkb2N1bWVudCA9PT0gbnVsbCAmJlxuICAgICAgdGhpcy5mcm9tWG1sSHR0cFJlcXVlc3QgPT09IG51bGwpO1xuICB9XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGFyc2VMaXN0KGxpc3QpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWx0ZXJzID0gW107XG4gICAgbGlzdC5mb3JFYWNoKGxpbmUgPT4ge1xuICAgICAgaWYgKGxpbmUpIHtcbiAgICAgICAgY29uc3QgZmlsdGVyID0gbmV3IEFkRmlsdGVyKGxpbmUpO1xuICAgICAgICBpZiAoZmlsdGVyLnN1cHBvcnRlZCAmJiAhZmlsdGVyLmlzQ29tbWVudCkge1xuICAgICAgICAgIGxvZyhgY29tcGlsZWQgJHtsaW5lfSBpbnRvICR7SlNPTi5zdHJpbmdpZnkoZmlsdGVyKX1gKTtcbiAgICAgICAgICBmaWx0ZXJzLnB1c2goZmlsdGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmaWx0ZXJzO1xuICB9IGNhdGNoIChleCkge1xuICAgIGxvZyhgRVJST1IgV0hJTEUgUEFSU0lORyAke3R5cGVvZiBsaXN0fSAke2V4fWApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=