System.register('antitracking/qs-whitelists', ['antitracking/persistent-state', 'antitracking/time', 'core/cliqz', 'antitracking/md5', 'antitracking/qs-whitelist-base'], function (_export) {
  'use strict';

  var persist, datetime, utils, events, md5, QSWhitelistBase, updateExpire, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  return {
    setters: [function (_antitrackingPersistentState) {
      persist = _antitrackingPersistentState;
    }, function (_antitrackingTime) {
      datetime = _antitrackingTime;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }, function (_antitrackingMd5) {
      md5 = _antitrackingMd5['default'];
    }, function (_antitrackingQsWhitelistBase) {
      QSWhitelistBase = _antitrackingQsWhitelistBase['default'];
    }],
    execute: function () {
      updateExpire = 48;

      _default = (function (_QSWhitelistBase) {
        _inherits(_default, _QSWhitelistBase);

        function _default() {
          _classCallCheck(this, _default);

          _get(Object.getPrototypeOf(_default.prototype), 'constructor', this).call(this);
          this.safeTokens = new persist.LazyPersistentObject('tokenExtWhitelist');
          this.trackerDomains = new persist.LazyPersistentObject('trackerDomains');
          this.unsafeKeys = new persist.LazyPersistentObject('unsafeKey');
          this.lastUpdate = ['0', '0', '0', '0'];

          this.TOKEN_WHITELIST_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/whitelist_tokens.json';
          this.TRACKER_DM_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/tracker_domains.json';
          this.SAFE_KEY_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json';
          this.UNSAFE_KEY_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_unsafe_key.json';
        }

        _createClass(_default, [{
          key: 'init',
          value: function init() {
            var _this = this;

            _get(Object.getPrototypeOf(_default.prototype), 'init', this).call(this);
            this.safeTokens.load();
            this.unsafeKeys.load();
            this.trackerDomains.load();
            try {
              this.lastUpdate = JSON.parse(persist.getValue('lastUpdate'));
              if (this.lastUpdate.length !== 4) {
                throw 'invalid lastUpdate value';
              }
            } catch (e) {
              this.lastUpdate = ['0', '0', '0', '0'];
            }

            // list update events
            this.onConfigUpdate = function (config) {
              var currentSafeKey = persist.getValue('safeKeyExtVersion', ''),
                  currentToken = persist.getValue('tokenWhitelistVersion', ''),
                  currentUnsafeKey = persist.getValue('unsafeKeyExtVersion', ''),
                  currentTracker = persist.getValue('trackerDomainsversion', '');
              // check safekey
              utils.log('Safe keys: ' + config.safekey_version + ' vs ' + currentSafeKey, 'attrack');
              if (config.safekey_version && currentSafeKey !== config.safekey_version) {
                _this._loadRemoteSafeKey(config.force_clean === true);
              }
              utils.log('Token whitelist: ' + config.whitelist_token_version + ' vs ' + currentToken, 'attrack');
              if (config.token_whitelist_version && currentToken !== config.whitelist_token_version) {
                _this._loadRemoteTokenWhitelist();
              }
              utils.log('Tracker Domain: ' + config.tracker_domain_version + ' vs ' + currentTracker, 'attrack');
              if (config.tracker_domain_version && currentTracker !== config.tracker_domain_version) {
                _this._loadRemoteTrackerDomainList();
              }
              utils.log('Unsafe keys: ' + config.unsafekey_version + ' vs ' + currentUnsafeKey, 'attrack');
              if (config.token_whitelist_version && currentToken !== config.token_whitelist_version) {
                _this._loadRemoteUnsafeKey();
              }
            };

            events.sub('attrack:updated_config', this.onConfigUpdate);
          }
        }, {
          key: 'destroy',
          value: function destroy() {
            _get(Object.getPrototypeOf(_default.prototype), 'destroy', this).call(this);
            events.un_sub('attrack:updated_config', this.onConfigUpdate);
          }
        }, {
          key: 'isUpToDate',
          value: function isUpToDate() {
            var delay = updateExpire,
                hour = datetime.newUTCDate();
            hour.setHours(hour.getHours() - delay);
            var hourCutoff = datetime.hourString(hour);
            return this.lastUpdate.every(function (t) {
              return t > hourCutoff;
            });
          }
        }, {
          key: 'isReady',
          value: function isReady() {
            // just check they're not null
            return this.safeTokens.value && this.safeKeys.value && this.unsafeKeys.value && this.trackerDomains.value;
          }
        }, {
          key: 'isSafeKey',
          value: function isSafeKey(domain, key) {
            return !this.isUnsafeKey(domain, key) && domain in this.safeKeys.value && key in this.safeKeys.value[domain];
          }
        }, {
          key: 'isUnsafeKey',
          value: function isUnsafeKey(domain, key) {
            return this.isTrackerDomain(domain) && domain in this.unsafeKeys.value && key in this.unsafeKeys.value[domain];
          }
        }, {
          key: 'addSafeKey',
          value: function addSafeKey(domain, key, valueCount) {
            if (this.isUnsafeKey(domain, key)) {
              return; // keys in the unsafekey list should not be added to safekey list
            }
            var today = datetime.dateString(datetime.newUTCDate());
            if (!(domain in this.safeKeys.value)) {
              this.safeKeys.value[domain] = {};
            }
            this.safeKeys.value[domain][key] = [today, 'l', valueCount];
            this.safeKeys.setDirty();
          }
        }, {
          key: 'isTrackerDomain',
          value: function isTrackerDomain(domain) {
            return domain in this.trackerDomains.value;
          }
        }, {
          key: 'isSafeToken',
          value: function isSafeToken(domain, token) {
            return this.isTrackerDomain(domain) && token in this.safeTokens.value;
          }
        }, {
          key: 'addSafeToken',
          value: function addSafeToken(domain, token) {
            this.trackerDomains.value[domain] = true;
            if (token && token !== '') {
              this.safeTokens.value[token] = true;
            }
          }
        }, {
          key: 'addUnsafeKey',
          value: function addUnsafeKey(domain, key) {
            if (!(domain in this.unsafeKeys.value)) {
              this.unsafeKeys.value[domain] = {};
            }
            this.unsafeKeys.value[domain][key] = true;
          }
        }, {
          key: 'getVersion',
          value: function getVersion() {
            return {
              whitelist: persist.getValue('tokenWhitelistVersion', ''),
              safeKey: persist.getValue('safeKeyExtVersion', ''),
              unsafeKey: persist.getValue('unsafeKeyExtVersion', ''),
              trackerDomains: persist.getValue('trackerDomainsVersion', '')
            };
          }
        }, {
          key: '_loadRemoteTokenWhitelist',
          value: function _loadRemoteTokenWhitelist() {
            var today = datetime.getTime().substring(0, 10);
            utils.httpGet(this.TOKEN_WHITELIST_URL + '?' + today, (function (req) {
              var rList = JSON.parse(req.response),
                  rListMd5 = md5(req.response);
              this.safeTokens.setValue(rList);
              persist.setValue('tokenWhitelistVersion', rListMd5);
              this.lastUpdate[1] = datetime.getTime();
              persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
              events.pub('attrack:token_whitelist_updated', rListMd5);
            }).bind(this), function () {}, 100000);
          }
        }, {
          key: '_loadRemoteTrackerDomainList',
          value: function _loadRemoteTrackerDomainList() {
            var today = datetime.getTime().substring(0, 10);
            utils.httpGet(this.TRACKER_DM_URL + '?' + today, (function (req) {
              var rList = JSON.parse(req.response),
                  rListMd5 = md5(req.response);
              this.trackerDomains.setValue(rList);
              persist.setValue('trackerDomainsversion', rListMd5);
              this.lastUpdate[3] = datetime.getTime();
              persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
            }).bind(this), function () {}, 100000);
          }
        }, {
          key: '_loadRemoteSafeKey',
          value: function _loadRemoteSafeKey(forceClean) {
            var today = datetime.getTime().substring(0, 10);
            if (forceClean) {
              this.safeKeys.clear();
            }
            utils.httpGet(this.SAFE_KEY_URL + '?' + today, (function (req) {
              var safeKey = JSON.parse(req.response),
                  s,
                  k,
                  safeKeyExtVersion = md5(req.response);
              for (s in safeKey) {
                for (k in safeKey[s]) {
                  // r for remote keys
                  safeKey[s][k] = [safeKey[s][k], 'r'];
                }
              }
              for (s in safeKey) {
                if (!(s in this.safeKeys.value)) {
                  this.safeKeys.value[s] = safeKey[s];
                } else {
                  for (var key in safeKey[s]) {
                    if (this.safeKeys.value[s][key] == null || this.safeKeys.value[s][key][0] < safeKey[s][key][0]) {
                      this.safeKeys.value[s][key] = safeKey[s][key];
                    }
                  }
                }
              }
              this._pruneSafeKeys();
              this.lastUpdate[0] = datetime.getTime();
              persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
              this.safeKeys.setDirty();
              this.safeKeys.save();
              persist.setValue('safeKeyExtVersion', safeKeyExtVersion);
              events.pub('attrack:safekeys_updated', safeKeyExtVersion, forceClean);
            }).bind(this), function () {
              // on error
            }, 60000);
          }
        }, {
          key: '_loadRemoteUnsafeKey',
          value: function _loadRemoteUnsafeKey() {
            var today = datetime.getTime().substring(0, 10);
            utils.log(this.UNSAFE_KEY_URL);
            utils.httpGet(this.UNSAFE_KEY_URL + '?' + today, (function (req) {
              var unsafeKeys = JSON.parse(req.response),
                  unsafeKeyExtVersion = md5(req.response);
              this.unsafeKeys.setValue(unsafeKeys);
              this.lastUpdate[2] = datetime.getTime();
              persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
              persist.setValue('unsafeKeyExtVesion', unsafeKeyExtVersion);
              this.unsafeKeys.setDirty();
              this.unsafeKeys.save();
            }).bind(this), function () {}, 100000);
          }
        }]);

        return _default;
      })(QSWhitelistBase);

      _export('default', _default);
    }
  };
});