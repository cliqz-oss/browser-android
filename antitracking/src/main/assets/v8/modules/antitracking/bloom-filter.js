System.register('antitracking/bloom-filter', ['antitracking/md5', 'antitracking/time', 'antitracking/pacemaker', 'antitracking/qs-whitelist-base', 'core/cliqz'], function (_export) {
  'use strict';

  var md5, datetime, pacemaker, QSWhitelistBase, utils, BLOOMFILTER_BASE_URL, BLOOMFILTER_CONFIG, UPDATE_EXPIRY_HOURS, AttrackBloomFilter;

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
            _get(Object.getPrototypeOf(AttrackBloomFilter.prototype), 'init', this).call(this);
            this.update();
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
            this.checkUpdate((function () {
              this.lastUpdate = datetime.getTime();
            }).bind(this));
          }
        }, {
          key: 'remoteUpdate',
          value: function remoteUpdate(major, minor, callback) {
            var url = this.baseURL + major + '/' + minor + '.gz',
                self = this;
            utils.httpGet(url, function (req) {
              var bf = JSON.parse(req.response);
              if (minor !== 0) {
                self.bloomFilter.update(bf.bkt);
              } else {
                self.bloomFilter = new BloomFilter(bf.bkt, bf.k);
              }
              self.version.major = major;
              self.version.minor = minor;
              callback && callback();
            }, function () {}, 10000);
          }
        }, {
          key: 'checkUpdate',
          value: function checkUpdate(callback) {
            // check if the bloom filter version is up to date
            if (this.configURL === null) {
              return;
            }
            var self = this;
            utils.httpGet(self.configURL, function (req) {
              var version = JSON.parse(req.response);
              if (self.version === null || self.bloomFilter === null) {
                // load the first time
                self.version = { 'major': null, 'minor': null };
                self.remoteUpdate(version.major, 0, callback);
                return; // load the major version and update later
              }
              if (self.version.major === version.major && self.version.minor === version.minor) {
                // already at the latest version
                return;
              }
              if (self.version.major !== version.major) {
                self.remoteUpdate(version.major, 0, callback);
              } else {
                self.remoteUpdate(version.major, version.minor, callback);
              }
            }, function () {}, 10000);
          }
        }]);

        return AttrackBloomFilter;
      })(QSWhitelistBase);

      _export('AttrackBloomFilter', AttrackBloomFilter);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9ibG9vbS1maWx0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O3dEQTZGSSxvQkFBb0IsRUFDcEIsa0JBQWtCLEVBRWhCLG1CQUFtQixFQUVaLGtCQUFrQjs7Ozs7Ozs7Ozs7O0FBNUZ4QixXQUFTLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFOztBQUNoQyxRQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLEVBQUU7O0FBQ2pCLEtBQUMsR0FBRyxDQUFDLENBQUMsTUFBTTtRQUNaLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNYLFFBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDcEIsUUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRVgsUUFBSSxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDbkYsS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsVUFBVSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsV0FBVyxHQUFHLFdBQVc7UUFDNUUsT0FBTyxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDckMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsV0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDZCxhQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25CO0FBQ0QsUUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEtB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QUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7ZUFDL0MsTUFBTTtBQUNMLG9CQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztlQUMzRDthQUNGLEVBQUUsWUFBVyxFQUNiLEVBQUUsS0FBSyxDQUFDLENBQUM7V0FDWDs7O2VBaElVLGtCQUFrQjtTQUFTLGVBQWUiLCJmaWxlIjoiYW50aXRyYWNraW5nL2Jsb29tLWZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtZDUgZnJvbSAnYW50aXRyYWNraW5nL21kNSc7XG5pbXBvcnQgKiBhcyBkYXRldGltZSBmcm9tICdhbnRpdHJhY2tpbmcvdGltZSc7XG5pbXBvcnQgcGFjZW1ha2VyIGZyb20gJ2FudGl0cmFja2luZy9wYWNlbWFrZXInO1xuaW1wb3J0IFFTV2hpdGVsaXN0QmFzZSBmcm9tICdhbnRpdHJhY2tpbmcvcXMtd2hpdGVsaXN0LWJhc2UnO1xuaW1wb3J0IHsgdXRpbHMgfSBmcm9tICdjb3JlL2NsaXF6JztcblxuZXhwb3J0IGZ1bmN0aW9uIEJsb29tRmlsdGVyKGEsIGspIHsgIC8vIGEgdGhlIGFycmF5LCBrIHRoZSBudW1iZXIgb2YgaGFzaCBmdW5jdGlvblxuICB2YXIgbSA9IGEubGVuZ3RoICogMzIsICAvLyAzMiBiaXRzIGZvciBlYWNoIGVsZW1lbnQgaW4gYVxuICAgICAgbiA9IGEubGVuZ3RoLFxuICAgICAgaSA9IC0xO1xuICB0aGlzLm0gPSBtID0gbiAqIDMyO1xuICB0aGlzLmsgPSBrO1xuICAvLyBjaG9vc2UgZGF0YSB0eXBlXG4gIHZhciBrYnl0ZXMgPSAxIDw8IE1hdGguY2VpbChNYXRoLmxvZyhNYXRoLmNlaWwoTWF0aC5sb2cobSkgLyBNYXRoLkxOMiAvIDgpKSAvIE1hdGguTE4yKSxcbiAgICAgIGFycmF5ID0ga2J5dGVzID09PSAxID8gVWludDhBcnJheSA6IGtieXRlcyA9PT0gMiA/IFVpbnQxNkFycmF5IDogVWludDMyQXJyYXksXG4gICAgICBrYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKGtieXRlcyAqIGspLFxuICAgICAgYnVja2V0cyA9IHRoaXMuYnVja2V0cyA9IG5ldyBJbnQzMkFycmF5KG4pO1xuICB3aGlsZSAoKytpIDwgbikge1xuICAgIGJ1Y2tldHNbaV0gPSBhW2ldOyAgLy8gcHV0IHRoZSBlbGVtZW50cyBpbnRvIHRoZWlyIGJ1Y2tldFxuICB9XG4gIHRoaXMuX2xvY2F0aW9ucyA9IG5ldyBhcnJheShrYnVmZmVyKTsgIC8vIHN0b3JlcyBsb2NhdGlvbiBmb3IgZWFjaCBoYXNoIGZ1bmN0aW9uXG59XG5cbkJsb29tRmlsdGVyLnByb3RvdHlwZS5sb2NhdGlvbnMgPSBmdW5jdGlvbihhLCBiKSB7ICAvLyB3ZSB1c2UgMiBoYXNoIHZhbHVlcyB0byBnZW5lcmF0ZSBrIGhhc2ggdmFsdWVzXG4gIHZhciBrID0gdGhpcy5rLFxuICAgICAgbSA9IHRoaXMubSxcbiAgICAgIHIgPSB0aGlzLl9sb2NhdGlvbnM7XG4gIGEgPSBwYXJzZUludChhLCAxNik7XG4gIGIgPSBwYXJzZUludChiLCAxNik7XG4gIHZhciB4ID0gYSAlIG07XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrOyArK2kpIHtcbiAgICByW2ldID0geCA8IDAgPyAoeCArIG0pIDogeDtcbiAgICB4ID0gKHggKyBiKSAlIG07XG4gIH1cbiAgcmV0dXJuIHI7XG59O1xuXG5CbG9vbUZpbHRlci5wcm90b3R5cGUudGVzdCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgLy8gc2luY2UgTUQ1IHdpbGwgYmUgY2FsY3VsYXRlZCBiZWZvcmUgaGFuZCxcbiAgLy8gd2UgYWxsb3cgdXNpbmcgaGFzaCB2YWx1ZSBhcyBpbnB1dCB0b1xuXG4gIHZhciBsID0gdGhpcy5sb2NhdGlvbnMoYSwgYiksXG4gICAgICBrID0gdGhpcy5rLFxuICAgICAgYnVja2V0cyA9IHRoaXMuYnVja2V0cztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrOyArK2kpIHtcbiAgICB2YXIgYmsgPSBsW2ldO1xuICAgIGlmICgoYnVja2V0c1tNYXRoLmZsb29yKGJrIC8gMzIpXSAmICgxIDw8IChiayAlIDMyKSkpID09PSAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuQmxvb21GaWx0ZXIucHJvdG90eXBlLnRlc3RTaW5nbGUgPSBmdW5jdGlvbih4KSB7XG4gIHZhciBtZDVIZXggPSBtZDUoeCk7XG4gIHZhciBhID0gbWQ1SGV4LnN1YnN0cmluZygwLCA4KSxcbiAgICAgIGIgPSBtZDVIZXguc3Vic3RyaW5nKDgsIDE2KTtcbiAgcmV0dXJuIHRoaXMudGVzdChhLCBiKTtcbn07XG5cbkJsb29tRmlsdGVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihhLCBiKSB7XG4gIC8vIE1heWJlIHVzZWQgdG8gYWRkIGxvY2FsIHNhZmVLZXkgdG8gYmxvb20gZmlsdGVyXG4gIHZhciBsID0gdGhpcy5sb2NhdGlvbnMoYSwgYiksXG4gICAgICBrID0gdGhpcy5rLFxuICAgICAgYnVja2V0cyA9IHRoaXMuYnVja2V0cztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrOyArK2kpIHtcbiAgICBidWNrZXRzW01hdGguZmxvb3IobFtpXSAvIDMyKV0gfD0gMSA8PCAobFtpXSAlIDMyKTtcbiAgfVxufTtcblxuQmxvb21GaWx0ZXIucHJvdG90eXBlLmFkZFNpbmdsZSA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIG1kNUhleCA9IG1kNSh4KTtcbiAgdmFyIGEgPSBtZDVIZXguc3Vic3RyaW5nKDAsIDgpLFxuICAgICAgYiA9IG1kNUhleC5zdWJzdHJpbmcoOCwgMTYpO1xuICByZXR1cm4gdGhpcy5hZGQoYSwgYik7XG59O1xuXG5CbG9vbUZpbHRlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oYSkge1xuICAvLyB1cGRhdGUgdGhlIGJsb29tIGZpbHRlciwgdXNlZCBpbiBtaW5vciByZXZpc29uIGZvciBldmVyeSAxMCBtaW5cbiAgdmFyIG0gPSBhLmxlbmd0aCAqIDMyLCAgLy8gMzIgYml0IGZvciBlYWNoIGVsZW1lbnRcbiAgICAgIG4gPSBhLmxlbmd0aCxcbiAgICAgIGkgPSAtMTtcbiAgbSA9IG4gKiAzMjtcbiAgaWYgKHRoaXMubSAhPT0gbSkge1xuICAgIHRocm93ICdCbG9vbSBmaWx0ZXIgY2FuIG9ubHkgYmUgdXBkYXRlZCB3aXRoIHNhbWUgbGVuZ3RoJztcbiAgfVxuICB3aGlsZSAoKytpIDwgbikge1xuICAgIHRoaXMuYnVja2V0c1tpXSB8PSBhW2ldO1xuICB9XG59O1xuXG5cbnZhciBCTE9PTUZJTFRFUl9CQVNFX1VSTCA9ICdodHRwczovL2Nkbi5jbGlxei5jb20vYW50aS10cmFja2luZy9ibG9vbV9maWx0ZXIvJyxcbiAgICBCTE9PTUZJTFRFUl9DT05GSUcgPSAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvYmxvb21fZmlsdGVyL2NvbmZpZyc7XG5cbmNvbnN0IFVQREFURV9FWFBJUllfSE9VUlMgPSA0ODtcblxuZXhwb3J0IGNsYXNzIEF0dHJhY2tCbG9vbUZpbHRlciBleHRlbmRzIFFTV2hpdGVsaXN0QmFzZSB7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmxhc3RVcGRhdGUgPSAnMCc7XG4gICAgdGhpcy5ibG9vbUZpbHRlciA9IG51bGw7XG4gICAgdGhpcy52ZXJzaW9uID0gbnVsbDtcbiAgICB0aGlzLmNvbmZpZ1VSTCA9IEJMT09NRklMVEVSX0NPTkZJRztcbiAgICB0aGlzLmJhc2VVUkwgPSBCTE9PTUZJTFRFUl9CQVNFX1VSTDtcbiAgfVxuXG4gIGluaXQoKSB7XG4gICAgc3VwZXIuaW5pdCgpO1xuICAgIHRoaXMudXBkYXRlKCk7XG4gICAgcGFjZW1ha2VyLnJlZ2lzdGVyKHRoaXMudXBkYXRlLmJpbmQodGhpcyksIDEwICogNjAgKiAxMDAwKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgc3VwZXIuZGVzdHJveSgpO1xuICB9XG5cbiAgaXNVcFRvRGF0ZSgpIHtcbiAgICB2YXIgZGVsYXkgPSBVUERBVEVfRVhQSVJZX0hPVVJTLFxuICAgICAgICBob3VyID0gZGF0ZXRpbWUubmV3VVRDRGF0ZSgpO1xuICAgIGhvdXIuc2V0SG91cnMoaG91ci5nZXRIb3VycygpIC0gZGVsYXkpO1xuICAgIHZhciBob3VyQ3V0b2ZmID0gZGF0ZXRpbWUuaG91clN0cmluZyhob3VyKTtcbiAgICByZXR1cm4gdGhpcy5sYXN0VXBkYXRlID4gaG91ckN1dG9mZjtcbiAgfVxuXG4gIGlzUmVhZHkoKSB7XG4gICAgcmV0dXJuIHRoaXMuYmxvb21GaWx0ZXIgIT09IG51bGw7XG4gIH1cblxuICBpc1RyYWNrZXJEb21haW4oZG9tYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuYmxvb21GaWx0ZXIudGVzdFNpbmdsZSgnZCcgKyBkb21haW4pO1xuICB9XG5cbiAgaXNTYWZlS2V5KGRvbWFpbiwga2V5KSB7XG4gICAgcmV0dXJuICghdGhpcy5pc1Vuc2FmZUtleShkb21haW4sIGtleSkpICYmICh0aGlzLmJsb29tRmlsdGVyLnRlc3RTaW5nbGUoJ2snICsgZG9tYWluICsga2V5KSB8fCBzdXBlci5pc1NhZmVLZXkoZG9tYWluLCBrZXkpKTtcbiAgfVxuXG4gIGlzU2FmZVRva2VuKGRvbWFpbiwgdG9rZW4pIHtcbiAgICByZXR1cm4gdGhpcy5ibG9vbUZpbHRlci50ZXN0U2luZ2xlKCd0JyArIGRvbWFpbiArIHRva2VuKTtcbiAgfVxuXG4gIGlzVW5zYWZlS2V5KGRvbWFpbiwgdG9rZW4pIHtcbiAgICByZXR1cm4gdGhpcy5ibG9vbUZpbHRlci50ZXN0U2luZ2xlKCd1JyArIGRvbWFpbiArIHRva2VuKTtcbiAgfVxuXG4gIGFkZERvbWFpbihkb21haW4pIHtcbiAgICB0aGlzLmJsb29tRmlsdGVyLmFkZFNpbmdsZSgnZCcgKyBkb21haW4pO1xuICB9XG5cbiAgYWRkU2FmZUtleShkb21haW4sIGtleSwgdmFsdWVDb3VudCkge1xuICAgIGlmICh0aGlzLmlzVW5zYWZlS2V5KGRvbWFpbiwga2V5KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmJsb29tRmlsdGVyLmFkZFNpbmdsZSgnaycgKyBkb21haW4gKyBrZXkpO1xuICAgIHN1cGVyLmFkZFNhZmVLZXkoZG9tYWluLCBrZXksIHZhbHVlQ291bnQpO1xuICB9XG5cbiAgYWRkVW5zYWZlS2V5KGRvbWFpbiwgdG9rZW4pIHtcbiAgICB0aGlzLmJsb29tRmlsdGVyLmFkZFNpbmdsZSgndScgKyBkb21haW4gKyB0b2tlbik7XG4gIH1cblxuICBhZGRTYWZlVG9rZW4oZG9tYWluLCB0b2tlbikge1xuICAgIHV0aWxzLmxvZyhbZG9tYWluLCB0b2tlbl0pO1xuICAgIGlmICh0b2tlbiA9PT0gJycpIHtcbiAgICAgIHV0aWxzLmxvZygnYWRkIGRvbWFpbiAnICsgZG9tYWluKTtcbiAgICAgIHRoaXMuYWRkRG9tYWluKGRvbWFpbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYmxvb21GaWx0ZXIuYWRkU2luZ2xlKCd0JyArIGRvbWFpbiArIHRva2VuKTtcbiAgICB9XG4gIH1cblxuICBnZXRWZXJzaW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBibG9vbUZpbHRlcnZlcnNpb246IHRoaXMuYmxvb21GaWx0ZXIgPyB0aGlzLmJsb29tRmlsdGVyLnZlcnNpb24gOiBudWxsXG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICB0aGlzLmNoZWNrVXBkYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5sYXN0VXBkYXRlID0gZGF0ZXRpbWUuZ2V0VGltZSgpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICByZW1vdGVVcGRhdGUobWFqb3IsIG1pbm9yLCBjYWxsYmFjaykge1xuICAgIHZhciB1cmwgPSB0aGlzLmJhc2VVUkwgKyBtYWpvciArICcvJyArIG1pbm9yICsgJy5neicsXG4gICAgICAgIHNlbGYgPSB0aGlzO1xuICAgIHV0aWxzLmh0dHBHZXQodXJsLCBmdW5jdGlvbihyZXEpIHtcbiAgICAgIHZhciBiZiA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKTtcbiAgICAgIGlmIChtaW5vciAhPT0gMCkge1xuICAgICAgICAgIHNlbGYuYmxvb21GaWx0ZXIudXBkYXRlKGJmLmJrdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYuYmxvb21GaWx0ZXIgPSBuZXcgQmxvb21GaWx0ZXIoYmYuYmt0LCBiZi5rKTtcbiAgICAgIH1cbiAgICAgIHNlbGYudmVyc2lvbi5tYWpvciA9IG1ham9yO1xuICAgICAgc2VsZi52ZXJzaW9uLm1pbm9yID0gbWlub3I7XG4gICAgICBjYWxsYmFjayAmJiBjYWxsYmFjaygpO1xuICB9LCBmdW5jdGlvbigpIHtcbiAgICB9LCAxMDAwMCk7XG4gIH1cblxuICBjaGVja1VwZGF0ZShjYWxsYmFjaykge1xuICAgIC8vIGNoZWNrIGlmIHRoZSBibG9vbSBmaWx0ZXIgdmVyc2lvbiBpcyB1cCB0byBkYXRlXG4gICAgaWYgKHRoaXMuY29uZmlnVVJMID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB1dGlscy5odHRwR2V0KHNlbGYuY29uZmlnVVJMLCBmdW5jdGlvbihyZXEpIHtcbiAgICAgIHZhciB2ZXJzaW9uID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2UpO1xuICAgICAgaWYgKHNlbGYudmVyc2lvbiA9PT0gbnVsbCB8fCBzZWxmLmJsb29tRmlsdGVyID09PSBudWxsKSB7ICAvLyBsb2FkIHRoZSBmaXJzdCB0aW1lXG4gICAgICAgIHNlbGYudmVyc2lvbiA9IHsnbWFqb3InOiBudWxsLCAnbWlub3InOiBudWxsfTtcbiAgICAgICAgc2VsZi5yZW1vdGVVcGRhdGUodmVyc2lvbi5tYWpvciwgMCwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm47ICAvLyBsb2FkIHRoZSBtYWpvciB2ZXJzaW9uIGFuZCB1cGRhdGUgbGF0ZXJcbiAgICAgIH1cbiAgICAgIGlmIChzZWxmLnZlcnNpb24ubWFqb3IgPT09IHZlcnNpb24ubWFqb3IgJiZcbiAgICAgICAgc2VsZi52ZXJzaW9uLm1pbm9yID09PSB2ZXJzaW9uLm1pbm9yKSB7ICAvLyBhbHJlYWR5IGF0IHRoZSBsYXRlc3QgdmVyc2lvblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoc2VsZi52ZXJzaW9uLm1ham9yICE9PSB2ZXJzaW9uLm1ham9yKSB7XG4gICAgICAgIHNlbGYucmVtb3RlVXBkYXRlKHZlcnNpb24ubWFqb3IsIDAsIGNhbGxiYWNrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYucmVtb3RlVXBkYXRlKHZlcnNpb24ubWFqb3IsIHZlcnNpb24ubWlub3IsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICB9LCAxMDAwMCk7XG4gIH1cbn1cbiJdfQ==