System.register('antitracking/bloom-filter', ['antitracking/md5', 'antitracking/time', 'antitracking/pacemaker', 'antitracking/qs-whitelist-base', 'core/cliqz', 'core/resource-loader'], function (_export) {
  'use strict';

  var md5, datetime, pacemaker, QSWhitelistBase, utils, Promise, Resource, BLOOMFILTER_BASE_URL, BLOOMFILTER_CONFIG, UPDATE_EXPIRY_HOURS, AttrackBloomFilter;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  _export('BloomFilter', BloomFilter);

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  function BloomFilter(a, k) {
    // a the array, k the number of hash function
    var m = a.length * 32,
        // 32 bits for each element in a
    n = a.length,
        i = -1;
    this.m = m = n * 32;
    this.k = k;
    // choose data type
    var kbytes = 1 << Math.ceil(Math.log(Math.ceil(Math.log(m) / Math.LN2 / 8)) / Math.LN2),
        array = kbytes === 1 ? Uint8Array : kbytes === 2 ? Uint16Array : Uint32Array,
        kbuffer = new ArrayBuffer(kbytes * k),
        buckets = this.buckets = new Int32Array(n);
    while (++i < n) {
      buckets[i] = a[i]; // put the elements into their bucket
    }
    this._locations = new array(kbuffer); // stores location for each hash function
  }

  return {
    setters: [function (_antitrackingMd5) {
      md5 = _antitrackingMd5['default'];
    }, function (_antitrackingTime) {
      datetime = _antitrackingTime;
    }, function (_antitrackingPacemaker) {
      pacemaker = _antitrackingPacemaker['default'];
    }, function (_antitrackingQsWhitelistBase) {
      QSWhitelistBase = _antitrackingQsWhitelistBase['default'];
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
      Promise = _coreCliqz.Promise;
    }, function (_coreResourceLoader) {
      Resource = _coreResourceLoader.Resource;
    }],
    execute: function () {

      BloomFilter.prototype.locations = function (a, b) {
        // we use 2 hash values to generate k hash values
        var k = this.k,
            m = this.m,
            r = this._locations;
        a = parseInt(a, 16);
        b = parseInt(b, 16);
        var x = a % m;

        for (var i = 0; i < k; ++i) {
          r[i] = x < 0 ? x + m : x;
          x = (x + b) % m;
        }
        return r;
      };

      BloomFilter.prototype.test = function (a, b) {
        // since MD5 will be calculated before hand,
        // we allow using hash value as input to

        var l = this.locations(a, b),
            k = this.k,
            buckets = this.buckets;
        for (var i = 0; i < k; ++i) {
          var bk = l[i];
          if ((buckets[Math.floor(bk / 32)] & 1 << bk % 32) === 0) {
            return false;
          }
        }
        return true;
      };

      BloomFilter.prototype.testSingle = function (x) {
        var md5Hex = md5(x);
        var a = md5Hex.substring(0, 8),
            b = md5Hex.substring(8, 16);
        return this.test(a, b);
      };

      BloomFilter.prototype.add = function (a, b) {
        // Maybe used to add local safeKey to bloom filter
        var l = this.locations(a, b),
            k = this.k,
            buckets = this.buckets;
        for (var i = 0; i < k; ++i) {
          buckets[Math.floor(l[i] / 32)] |= 1 << l[i] % 32;
        }
      };

      BloomFilter.prototype.addSingle = function (x) {
        var md5Hex = md5(x);
        var a = md5Hex.substring(0, 8),
            b = md5Hex.substring(8, 16);
        return this.add(a, b);
      };

      BloomFilter.prototype.update = function (a) {
        // update the bloom filter, used in minor revison for every 10 min
        var m = a.length * 32,
            // 32 bit for each element
        n = a.length,
            i = -1;
        m = n * 32;
        if (this.m !== m) {
          throw 'Bloom filter can only be updated with same length';
        }
        while (++i < n) {
          this.buckets[i] |= a[i];
        }
      };

      BLOOMFILTER_BASE_URL = 'https://cdn.cliqz.com/anti-tracking/bloom_filter/';
      BLOOMFILTER_CONFIG = 'https://cdn.cliqz.com/anti-tracking/bloom_filter/config';
      UPDATE_EXPIRY_HOURS = 48;

      AttrackBloomFilter = (function (_QSWhitelistBase) {
        _inherits(AttrackBloomFilter, _QSWhitelistBase);

        function AttrackBloomFilter() {
          _classCallCheck(this, AttrackBloomFilter);

          _get(Object.getPrototypeOf(AttrackBloomFilter.prototype), 'constructor', this).call(this);
          this.lastUpdate = '0';
          this.bloomFilter = null;
          this.version = null;
          this.configURL = BLOOMFILTER_CONFIG;
          this.baseURL = BLOOMFILTER_BASE_URL;
        }

        _createClass(AttrackBloomFilter, [{
          key: 'init',
          value: function init() {
            var _this = this;

            _get(Object.getPrototypeOf(AttrackBloomFilter.prototype), 'init', this).call(this);
            this._config = new Resource(['antitracking', 'bloom_config.json'], {
              remoteURL: BLOOMFILTER_CONFIG
            });
            // try remote update before local
            this._config.updateFromRemote()['catch'](function () {
              return _this._config.load();
            }).then(this.checkUpdate.bind(this)).then(function () {
              _this.lastUpdate = datetime.getTime();
            });
            // check every 10s
            pacemaker.register(this.update.bind(this), 10 * 60 * 1000);
          }
        }, {
          key: 'destroy',
          value: function destroy() {
            _get(Object.getPrototypeOf(AttrackBloomFilter.prototype), 'destroy', this).call(this);
          }
        }, {
          key: 'isUpToDate',
          value: function isUpToDate() {
            var delay = UPDATE_EXPIRY_HOURS,
                hour = datetime.newUTCDate();
            hour.setHours(hour.getHours() - delay);
            var hourCutoff = datetime.hourString(hour);
            return this.lastUpdate > hourCutoff;
          }
        }, {
          key: 'isReady',
          value: function isReady() {
            return this.bloomFilter !== null;
          }
        }, {
          key: 'isTrackerDomain',
          value: function isTrackerDomain(domain) {
            return this.bloomFilter.testSingle('d' + domain);
          }
        }, {
          key: 'isSafeKey',
          value: function isSafeKey(domain, key) {
            return !this.isUnsafeKey(domain, key) && (this.bloomFilter.testSingle('k' + domain + key) || _get(Object.getPrototypeOf(AttrackBloomFilter.prototype), 'isSafeKey', this).call(this, domain, key));
          }
        }, {
          key: 'isSafeToken',
          value: function isSafeToken(domain, token) {
            return this.bloomFilter.testSingle('t' + domain + token);
          }
        }, {
          key: 'isUnsafeKey',
          value: function isUnsafeKey(domain, token) {
            return this.bloomFilter.testSingle('u' + domain + token);
          }
        }, {
          key: 'addDomain',
          value: function addDomain(domain) {
            this.bloomFilter.addSingle('d' + domain);
          }
        }, {
          key: 'addSafeKey',
          value: function addSafeKey(domain, key, valueCount) {
            if (this.isUnsafeKey(domain, key)) {
              return;
            }
            this.bloomFilter.addSingle('k' + domain + key);
            _get(Object.getPrototypeOf(AttrackBloomFilter.prototype), 'addSafeKey', this).call(this, domain, key, valueCount);
          }
        }, {
          key: 'addUnsafeKey',
          value: function addUnsafeKey(domain, token) {
            this.bloomFilter.addSingle('u' + domain + token);
          }
        }, {
          key: 'addSafeToken',
          value: function addSafeToken(domain, token) {
            utils.log([domain, token]);
            if (token === '') {
              utils.log('add domain ' + domain);
              this.addDomain(domain);
            } else {
              this.bloomFilter.addSingle('t' + domain + token);
            }
          }
        }, {
          key: 'getVersion',
          value: function getVersion() {
            return {
              bloomFilterversion: this.bloomFilter ? this.bloomFilter.version : null
            };
          }
        }, {
          key: 'update',
          value: function update() {
            var _this2 = this;

            this._config.updateFromRemote().then(this.checkUpdate.bind(this)).then(function () {
              _this2.lastUpdate = datetime.getTime();
            });
          }
        }, {
          key: 'remoteUpdate',
          value: function remoteUpdate(major, minor) {
            var _this3 = this;

            var url = this.baseURL + major + '/' + minor + '.gz',
                self = this;

            var updateFilter = function updateFilter(bf) {
              if (minor !== 0) {
                self.bloomFilter.update(bf.bkt);
              } else {
                self.bloomFilter = new BloomFilter(bf.bkt, bf.k);
              }
              self.version.major = major;
              self.version.minor = minor;
              return Promise.resolve();
            };

            // load the filter, if possible from the CDN, otherwise grab a cached local version
            if (major === 'local') {
              return this.loadFromLocal().then(updateFilter);
            } else if (minor === 0) {
              var bloomFile = new Resource(['antitracking', 'bloom_filter.json'], {
                remoteURL: url
              });
              return bloomFile.updateFromRemote()['catch'](function () {
                return _this3.loadFromLocal();
              }).then(updateFilter);
            } else {
              return utils.promiseHttpHandler('GET', url, undefined, 10000).then(function (req) {
                return JSON.parse(req.response);
              })['catch'](function () {
                return _this3.loadFromLocal();
              }).then(updateFilter);
            }
          }
        }, {
          key: 'loadFromLocal',
          value: function loadFromLocal() {
            var bloomFile = new Resource(['antitracking', 'bloom_filter.json']);
            return bloomFile.load();
          }
        }, {
          key: 'checkUpdate',
          value: function checkUpdate(version) {
            var self = this;
            if (self.version === null || self.bloomFilter === null) {
              // load the first time
              self.version = { 'major': null, 'minor': null };
              return self.remoteUpdate(version.major, 0); // load the major version and update later
            }
            if (self.version.major === version.major && self.version.minor === version.minor) {
              // already at the latest version
              return Promise.resolve();
            }
            if (self.version.major !== version.major) {
              return self.remoteUpdate(version.major, 0);
            } else {
              return self.remoteUpdate(version.major, version.minor);
            }
          }
        }]);

        return AttrackBloomFilter;
      })(QSWhitelistBase);

      _export('AttrackBloomFilter', AttrackBloomFilter);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9ibG9vbS1maWx0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OzJFQThGSSxvQkFBb0IsRUFDcEIsa0JBQWtCLEVBRWhCLG1CQUFtQixFQUVaLGtCQUFrQjs7Ozs7Ozs7Ozs7O0FBNUZ4QixXQUFTLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFOztBQUNoQyxRQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLEVBQUU7O0FBQ2pCLEtBQUMsR0FBRyxDQUFDLENBQUMsTUFBTTtRQUNaLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNYLFFBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDcEIsUUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRVgsUUFBSSxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDbkYsS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsVUFBVSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsV0FBVyxHQUFHLFdBQVc7UUFDNUUsT0FBTyxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDckMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsV0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDZCxhQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25CO0FBQ0QsUUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEtB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Q0wscUJBQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN4RDtXQUNGOzs7ZUFySlUsa0JBQWtCO1NBQVMsZUFBZSIsImZpbGUiOiJhbnRpdHJhY2tpbmcvYmxvb20tZmlsdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG1kNSBmcm9tICdhbnRpdHJhY2tpbmcvbWQ1JztcbmltcG9ydCAqIGFzIGRhdGV0aW1lIGZyb20gJ2FudGl0cmFja2luZy90aW1lJztcbmltcG9ydCBwYWNlbWFrZXIgZnJvbSAnYW50aXRyYWNraW5nL3BhY2VtYWtlcic7XG5pbXBvcnQgUVNXaGl0ZWxpc3RCYXNlIGZyb20gJ2FudGl0cmFja2luZy9xcy13aGl0ZWxpc3QtYmFzZSc7XG5pbXBvcnQgeyB1dGlscywgUHJvbWlzZSB9IGZyb20gJ2NvcmUvY2xpcXonO1xuaW1wb3J0IHsgUmVzb3VyY2UgfSBmcm9tICdjb3JlL3Jlc291cmNlLWxvYWRlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBCbG9vbUZpbHRlcihhLCBrKSB7ICAvLyBhIHRoZSBhcnJheSwgayB0aGUgbnVtYmVyIG9mIGhhc2ggZnVuY3Rpb25cbiAgdmFyIG0gPSBhLmxlbmd0aCAqIDMyLCAgLy8gMzIgYml0cyBmb3IgZWFjaCBlbGVtZW50IGluIGFcbiAgICAgIG4gPSBhLmxlbmd0aCxcbiAgICAgIGkgPSAtMTtcbiAgdGhpcy5tID0gbSA9IG4gKiAzMjtcbiAgdGhpcy5rID0gaztcbiAgLy8gY2hvb3NlIGRhdGEgdHlwZVxuICB2YXIga2J5dGVzID0gMSA8PCBNYXRoLmNlaWwoTWF0aC5sb2coTWF0aC5jZWlsKE1hdGgubG9nKG0pIC8gTWF0aC5MTjIgLyA4KSkgLyBNYXRoLkxOMiksXG4gICAgICBhcnJheSA9IGtieXRlcyA9PT0gMSA/IFVpbnQ4QXJyYXkgOiBrYnl0ZXMgPT09IDIgPyBVaW50MTZBcnJheSA6IFVpbnQzMkFycmF5LFxuICAgICAga2J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihrYnl0ZXMgKiBrKSxcbiAgICAgIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHMgPSBuZXcgSW50MzJBcnJheShuKTtcbiAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICBidWNrZXRzW2ldID0gYVtpXTsgIC8vIHB1dCB0aGUgZWxlbWVudHMgaW50byB0aGVpciBidWNrZXRcbiAgfVxuICB0aGlzLl9sb2NhdGlvbnMgPSBuZXcgYXJyYXkoa2J1ZmZlcik7ICAvLyBzdG9yZXMgbG9jYXRpb24gZm9yIGVhY2ggaGFzaCBmdW5jdGlvblxufVxuXG5CbG9vbUZpbHRlci5wcm90b3R5cGUubG9jYXRpb25zID0gZnVuY3Rpb24oYSwgYikgeyAgLy8gd2UgdXNlIDIgaGFzaCB2YWx1ZXMgdG8gZ2VuZXJhdGUgayBoYXNoIHZhbHVlc1xuICB2YXIgayA9IHRoaXMuayxcbiAgICAgIG0gPSB0aGlzLm0sXG4gICAgICByID0gdGhpcy5fbG9jYXRpb25zO1xuICBhID0gcGFyc2VJbnQoYSwgMTYpO1xuICBiID0gcGFyc2VJbnQoYiwgMTYpO1xuICB2YXIgeCA9IGEgJSBtO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgazsgKytpKSB7XG4gICAgcltpXSA9IHggPCAwID8gKHggKyBtKSA6IHg7XG4gICAgeCA9ICh4ICsgYikgJSBtO1xuICB9XG4gIHJldHVybiByO1xufTtcblxuQmxvb21GaWx0ZXIucHJvdG90eXBlLnRlc3QgPSBmdW5jdGlvbihhLCBiKSB7XG4gIC8vIHNpbmNlIE1ENSB3aWxsIGJlIGNhbGN1bGF0ZWQgYmVmb3JlIGhhbmQsXG4gIC8vIHdlIGFsbG93IHVzaW5nIGhhc2ggdmFsdWUgYXMgaW5wdXQgdG9cblxuICB2YXIgbCA9IHRoaXMubG9jYXRpb25zKGEsIGIpLFxuICAgICAgayA9IHRoaXMuayxcbiAgICAgIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHM7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgazsgKytpKSB7XG4gICAgdmFyIGJrID0gbFtpXTtcbiAgICBpZiAoKGJ1Y2tldHNbTWF0aC5mbG9vcihiayAvIDMyKV0gJiAoMSA8PCAoYmsgJSAzMikpKSA9PT0gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkJsb29tRmlsdGVyLnByb3RvdHlwZS50ZXN0U2luZ2xlID0gZnVuY3Rpb24oeCkge1xuICB2YXIgbWQ1SGV4ID0gbWQ1KHgpO1xuICB2YXIgYSA9IG1kNUhleC5zdWJzdHJpbmcoMCwgOCksXG4gICAgICBiID0gbWQ1SGV4LnN1YnN0cmluZyg4LCAxNik7XG4gIHJldHVybiB0aGlzLnRlc3QoYSwgYik7XG59O1xuXG5CbG9vbUZpbHRlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oYSwgYikge1xuICAvLyBNYXliZSB1c2VkIHRvIGFkZCBsb2NhbCBzYWZlS2V5IHRvIGJsb29tIGZpbHRlclxuICB2YXIgbCA9IHRoaXMubG9jYXRpb25zKGEsIGIpLFxuICAgICAgayA9IHRoaXMuayxcbiAgICAgIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHM7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgazsgKytpKSB7XG4gICAgYnVja2V0c1tNYXRoLmZsb29yKGxbaV0gLyAzMildIHw9IDEgPDwgKGxbaV0gJSAzMik7XG4gIH1cbn07XG5cbkJsb29tRmlsdGVyLnByb3RvdHlwZS5hZGRTaW5nbGUgPSBmdW5jdGlvbih4KSB7XG4gIHZhciBtZDVIZXggPSBtZDUoeCk7XG4gIHZhciBhID0gbWQ1SGV4LnN1YnN0cmluZygwLCA4KSxcbiAgICAgIGIgPSBtZDVIZXguc3Vic3RyaW5nKDgsIDE2KTtcbiAgcmV0dXJuIHRoaXMuYWRkKGEsIGIpO1xufTtcblxuQmxvb21GaWx0ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKGEpIHtcbiAgLy8gdXBkYXRlIHRoZSBibG9vbSBmaWx0ZXIsIHVzZWQgaW4gbWlub3IgcmV2aXNvbiBmb3IgZXZlcnkgMTAgbWluXG4gIHZhciBtID0gYS5sZW5ndGggKiAzMiwgIC8vIDMyIGJpdCBmb3IgZWFjaCBlbGVtZW50XG4gICAgICBuID0gYS5sZW5ndGgsXG4gICAgICBpID0gLTE7XG4gIG0gPSBuICogMzI7XG4gIGlmICh0aGlzLm0gIT09IG0pIHtcbiAgICB0aHJvdyAnQmxvb20gZmlsdGVyIGNhbiBvbmx5IGJlIHVwZGF0ZWQgd2l0aCBzYW1lIGxlbmd0aCc7XG4gIH1cbiAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICB0aGlzLmJ1Y2tldHNbaV0gfD0gYVtpXTtcbiAgfVxufTtcblxuXG52YXIgQkxPT01GSUxURVJfQkFTRV9VUkwgPSAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvYmxvb21fZmlsdGVyLycsXG4gICAgQkxPT01GSUxURVJfQ09ORklHID0gJ2h0dHBzOi8vY2RuLmNsaXF6LmNvbS9hbnRpLXRyYWNraW5nL2Jsb29tX2ZpbHRlci9jb25maWcnO1xuXG5jb25zdCBVUERBVEVfRVhQSVJZX0hPVVJTID0gNDg7XG5cbmV4cG9ydCBjbGFzcyBBdHRyYWNrQmxvb21GaWx0ZXIgZXh0ZW5kcyBRU1doaXRlbGlzdEJhc2Uge1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5sYXN0VXBkYXRlID0gJzAnO1xuICAgIHRoaXMuYmxvb21GaWx0ZXIgPSBudWxsO1xuICAgIHRoaXMudmVyc2lvbiA9IG51bGw7XG4gICAgdGhpcy5jb25maWdVUkwgPSBCTE9PTUZJTFRFUl9DT05GSUc7XG4gICAgdGhpcy5iYXNlVVJMID0gQkxPT01GSUxURVJfQkFTRV9VUkw7XG4gIH1cblxuICBpbml0KCkge1xuICAgIHN1cGVyLmluaXQoKTtcbiAgICB0aGlzLl9jb25maWcgPSBuZXcgUmVzb3VyY2UoWydhbnRpdHJhY2tpbmcnLCAnYmxvb21fY29uZmlnLmpzb24nXSwge1xuICAgICAgcmVtb3RlVVJMOiBCTE9PTUZJTFRFUl9DT05GSUdcbiAgICB9KTtcbiAgICAvLyB0cnkgcmVtb3RlIHVwZGF0ZSBiZWZvcmUgbG9jYWxcbiAgICB0aGlzLl9jb25maWcudXBkYXRlRnJvbVJlbW90ZSgpLmNhdGNoKCgpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLl9jb25maWcubG9hZCgpO1xuICAgIH0pLnRoZW4odGhpcy5jaGVja1VwZGF0ZS5iaW5kKHRoaXMpKS50aGVuKCgpID0+IHtcbiAgICAgIHRoaXMubGFzdFVwZGF0ZSA9IGRhdGV0aW1lLmdldFRpbWUoKTtcbiAgICB9KTtcbiAgICAvLyBjaGVjayBldmVyeSAxMHNcbiAgICBwYWNlbWFrZXIucmVnaXN0ZXIodGhpcy51cGRhdGUuYmluZCh0aGlzKSwgMTAgKiA2MCAqIDEwMDApO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICBzdXBlci5kZXN0cm95KCk7XG4gIH1cblxuICBpc1VwVG9EYXRlKCkge1xuICAgIHZhciBkZWxheSA9IFVQREFURV9FWFBJUllfSE9VUlMsXG4gICAgICAgIGhvdXIgPSBkYXRldGltZS5uZXdVVENEYXRlKCk7XG4gICAgaG91ci5zZXRIb3Vycyhob3VyLmdldEhvdXJzKCkgLSBkZWxheSk7XG4gICAgdmFyIGhvdXJDdXRvZmYgPSBkYXRldGltZS5ob3VyU3RyaW5nKGhvdXIpO1xuICAgIHJldHVybiB0aGlzLmxhc3RVcGRhdGUgPiBob3VyQ3V0b2ZmO1xuICB9XG5cbiAgaXNSZWFkeSgpIHtcbiAgICByZXR1cm4gdGhpcy5ibG9vbUZpbHRlciAhPT0gbnVsbDtcbiAgfVxuXG4gIGlzVHJhY2tlckRvbWFpbihkb21haW4pIHtcbiAgICByZXR1cm4gdGhpcy5ibG9vbUZpbHRlci50ZXN0U2luZ2xlKCdkJyArIGRvbWFpbik7XG4gIH1cblxuICBpc1NhZmVLZXkoZG9tYWluLCBrZXkpIHtcbiAgICByZXR1cm4gKCF0aGlzLmlzVW5zYWZlS2V5KGRvbWFpbiwga2V5KSkgJiYgKHRoaXMuYmxvb21GaWx0ZXIudGVzdFNpbmdsZSgnaycgKyBkb21haW4gKyBrZXkpIHx8IHN1cGVyLmlzU2FmZUtleShkb21haW4sIGtleSkpO1xuICB9XG5cbiAgaXNTYWZlVG9rZW4oZG9tYWluLCB0b2tlbikge1xuICAgIHJldHVybiB0aGlzLmJsb29tRmlsdGVyLnRlc3RTaW5nbGUoJ3QnICsgZG9tYWluICsgdG9rZW4pO1xuICB9XG5cbiAgaXNVbnNhZmVLZXkoZG9tYWluLCB0b2tlbikge1xuICAgIHJldHVybiB0aGlzLmJsb29tRmlsdGVyLnRlc3RTaW5nbGUoJ3UnICsgZG9tYWluICsgdG9rZW4pO1xuICB9XG5cbiAgYWRkRG9tYWluKGRvbWFpbikge1xuICAgIHRoaXMuYmxvb21GaWx0ZXIuYWRkU2luZ2xlKCdkJyArIGRvbWFpbik7XG4gIH1cblxuICBhZGRTYWZlS2V5KGRvbWFpbiwga2V5LCB2YWx1ZUNvdW50KSB7XG4gICAgaWYgKHRoaXMuaXNVbnNhZmVLZXkoZG9tYWluLCBrZXkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYmxvb21GaWx0ZXIuYWRkU2luZ2xlKCdrJyArIGRvbWFpbiArIGtleSk7XG4gICAgc3VwZXIuYWRkU2FmZUtleShkb21haW4sIGtleSwgdmFsdWVDb3VudCk7XG4gIH1cblxuICBhZGRVbnNhZmVLZXkoZG9tYWluLCB0b2tlbikge1xuICAgIHRoaXMuYmxvb21GaWx0ZXIuYWRkU2luZ2xlKCd1JyArIGRvbWFpbiArIHRva2VuKTtcbiAgfVxuXG4gIGFkZFNhZmVUb2tlbihkb21haW4sIHRva2VuKSB7XG4gICAgdXRpbHMubG9nKFtkb21haW4sIHRva2VuXSk7XG4gICAgaWYgKHRva2VuID09PSAnJykge1xuICAgICAgdXRpbHMubG9nKCdhZGQgZG9tYWluICcgKyBkb21haW4pO1xuICAgICAgdGhpcy5hZGREb21haW4oZG9tYWluKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ibG9vbUZpbHRlci5hZGRTaW5nbGUoJ3QnICsgZG9tYWluICsgdG9rZW4pO1xuICAgIH1cbiAgfVxuXG4gIGdldFZlcnNpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJsb29tRmlsdGVydmVyc2lvbjogdGhpcy5ibG9vbUZpbHRlciA/IHRoaXMuYmxvb21GaWx0ZXIudmVyc2lvbiA6IG51bGxcbiAgICB9O1xuICB9XG5cbiAgdXBkYXRlKCkge1xuICAgIHRoaXMuX2NvbmZpZy51cGRhdGVGcm9tUmVtb3RlKCkudGhlbih0aGlzLmNoZWNrVXBkYXRlLmJpbmQodGhpcykpLnRoZW4oKCkgPT4ge1xuICAgICAgdGhpcy5sYXN0VXBkYXRlID0gZGF0ZXRpbWUuZ2V0VGltZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVtb3RlVXBkYXRlKG1ham9yLCBtaW5vcikge1xuICAgIHZhciB1cmwgPSB0aGlzLmJhc2VVUkwgKyBtYWpvciArICcvJyArIG1pbm9yICsgJy5neicsXG4gICAgICAgIHNlbGYgPSB0aGlzO1xuXG4gICAgbGV0IHVwZGF0ZUZpbHRlciA9IGZ1bmN0aW9uKGJmKSB7XG4gICAgICBpZiAobWlub3IgIT09IDApIHtcbiAgICAgICAgICBzZWxmLmJsb29tRmlsdGVyLnVwZGF0ZShiZi5ia3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLmJsb29tRmlsdGVyID0gbmV3IEJsb29tRmlsdGVyKGJmLmJrdCwgYmYuayk7XG4gICAgICB9XG4gICAgICBzZWxmLnZlcnNpb24ubWFqb3IgPSBtYWpvcjtcbiAgICAgIHNlbGYudmVyc2lvbi5taW5vciA9IG1pbm9yO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH07XG5cbiAgICAvLyBsb2FkIHRoZSBmaWx0ZXIsIGlmIHBvc3NpYmxlIGZyb20gdGhlIENETiwgb3RoZXJ3aXNlIGdyYWIgYSBjYWNoZWQgbG9jYWwgdmVyc2lvblxuICAgIGlmIChtYWpvciA9PT0gJ2xvY2FsJykge1xuICAgICAgcmV0dXJuIHRoaXMubG9hZEZyb21Mb2NhbCgpLnRoZW4odXBkYXRlRmlsdGVyKTtcbiAgICB9IGVsc2UgaWYgKG1pbm9yID09PSAwKSB7XG4gICAgICBjb25zdCBibG9vbUZpbGUgPSBuZXcgUmVzb3VyY2UoWydhbnRpdHJhY2tpbmcnLCAnYmxvb21fZmlsdGVyLmpzb24nXSwge1xuICAgICAgICByZW1vdGVVUkw6IHVybFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gYmxvb21GaWxlLnVwZGF0ZUZyb21SZW1vdGUoKVxuICAgICAgICAuY2F0Y2goKCkgPT4gdGhpcy5sb2FkRnJvbUxvY2FsKCkpXG4gICAgICAgIC50aGVuKHVwZGF0ZUZpbHRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1dGlscy5wcm9taXNlSHR0cEhhbmRsZXIoJ0dFVCcsIHVybCwgdW5kZWZpbmVkLCAxMDAwMClcbiAgICAgICAgLnRoZW4oKHJlcSkgPT4gSlNPTi5wYXJzZShyZXEucmVzcG9uc2UpKVxuICAgICAgICAuY2F0Y2goKCkgPT4gdGhpcy5sb2FkRnJvbUxvY2FsKCkpXG4gICAgICAgIC50aGVuKHVwZGF0ZUZpbHRlcik7XG4gICAgfVxuICB9XG5cbiAgbG9hZEZyb21Mb2NhbCgpIHtcbiAgICBjb25zdCBibG9vbUZpbGUgPSBuZXcgUmVzb3VyY2UoWydhbnRpdHJhY2tpbmcnLCAnYmxvb21fZmlsdGVyLmpzb24nXSk7XG4gICAgcmV0dXJuIGJsb29tRmlsZS5sb2FkKClcbiAgfVxuXG4gIGNoZWNrVXBkYXRlKHZlcnNpb24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYudmVyc2lvbiA9PT0gbnVsbCB8fCBzZWxmLmJsb29tRmlsdGVyID09PSBudWxsKSB7ICAvLyBsb2FkIHRoZSBmaXJzdCB0aW1lXG4gICAgICBzZWxmLnZlcnNpb24gPSB7J21ham9yJzogbnVsbCwgJ21pbm9yJzogbnVsbH07XG4gICAgICByZXR1cm4gc2VsZi5yZW1vdGVVcGRhdGUodmVyc2lvbi5tYWpvciwgMCk7IC8vIGxvYWQgdGhlIG1ham9yIHZlcnNpb24gYW5kIHVwZGF0ZSBsYXRlclxuICAgIH1cbiAgICBpZiAoc2VsZi52ZXJzaW9uLm1ham9yID09PSB2ZXJzaW9uLm1ham9yICYmXG4gICAgICBzZWxmLnZlcnNpb24ubWlub3IgPT09IHZlcnNpb24ubWlub3IpIHsgIC8vIGFscmVhZHkgYXQgdGhlIGxhdGVzdCB2ZXJzaW9uXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGlmIChzZWxmLnZlcnNpb24ubWFqb3IgIT09IHZlcnNpb24ubWFqb3IpIHtcbiAgICAgIHJldHVybiBzZWxmLnJlbW90ZVVwZGF0ZSh2ZXJzaW9uLm1ham9yLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNlbGYucmVtb3RlVXBkYXRlKHZlcnNpb24ubWFqb3IsIHZlcnNpb24ubWlub3IpO1xuICAgIH1cbiAgfVxufVxuIl19