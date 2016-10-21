System.register('antitracking/bloom-filter', ['antitracking/md5', 'antitracking/time', 'antitracking/pacemaker', 'antitracking/qs-whitelist-base', 'core/cliqz', 'core/resource-loader'], function (_export) {
  'use strict';

  var md5, datetime, pacemaker, QSWhitelistBase, utils, Promise, Resource, BLOOMFILTER_BASE_URL, BLOOMFILTER_CONFIG, UPDATE_EXPIRY_HOURS, AttrackBloomFilter;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

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
          var configURL = arguments.length <= 0 || arguments[0] === undefined ? BLOOMFILTER_CONFIG : arguments[0];
          var baseURL = arguments.length <= 1 || arguments[1] === undefined ? BLOOMFILTER_BASE_URL : arguments[1];

          _classCallCheck(this, AttrackBloomFilter);

          _get(Object.getPrototypeOf(AttrackBloomFilter.prototype), 'constructor', this).call(this);
          this.lastUpdate = '0';
          this.bloomFilter = null;
          this.version = null;
          this.configURL = configURL;
          this.baseURL = baseURL;
          this._config = new Resource(['antitracking', 'bloom_config.json'], {
            remoteURL: configURL
          });
        }

        _createClass(AttrackBloomFilter, [{
          key: 'init',
          value: function init() {
            var _this = this;

            _get(Object.getPrototypeOf(AttrackBloomFilter.prototype), 'init', this).call(this);
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