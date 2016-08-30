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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9xcy13aGl0ZWxpc3RzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs4REFNTSxZQUFZOzs7Ozs7Ozs7Ozs7Ozs7O3lCQUpULEtBQUs7MEJBQUUsTUFBTTs7Ozs7OztBQUloQixrQkFBWSxHQUFHLEVBQUU7Ozs7O0FBSVYsNEJBQUc7OztBQUNaLDBGQUFRO0FBQ1IsY0FBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3hFLGNBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxPQUFPLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN6RSxjQUFJLENBQUMsVUFBVSxHQUFHLElBQUksT0FBTyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2hFLGNBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQzs7QUFFdkMsY0FBSSxDQUFDLG1CQUFtQixHQUFHLHFFQUFxRSxDQUFDO0FBQ2pHLGNBQUksQ0FBQyxjQUFjLEdBQUcsb0VBQW9FLENBQUM7QUFDM0YsY0FBSSxDQUFDLFlBQVksR0FBRyxvRUFBb0UsQ0FBQztBQUN6RixjQUFJLENBQUMsY0FBYyxHQUFHLHNFQUFzRSxDQUFDO1NBQzlGOzs7O2lCQUVHLGdCQUFHOzs7QUFDTCxxRkFBYTtBQUNiLGdCQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3ZCLGdCQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3ZCLGdCQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQzNCLGdCQUFJO0FBQ0Ysa0JBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDN0Qsa0JBQUksSUFBSSxD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QUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUNoRSxxQkFBTyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0FBQzVELGtCQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzNCLGtCQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ3hCLENBQUEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBVyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7V0FDdEM7Ozs7U0FqTjBCLGVBQWUiLCJmaWxlIjoiYW50aXRyYWNraW5nL3FzLXdoaXRlbGlzdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwZXJzaXN0IGZyb20gJ2FudGl0cmFja2luZy9wZXJzaXN0ZW50LXN0YXRlJztcbmltcG9ydCAqIGFzIGRhdGV0aW1lIGZyb20gJ2FudGl0cmFja2luZy90aW1lJztcbmltcG9ydCB7IHV0aWxzLCBldmVudHMgfSBmcm9tICdjb3JlL2NsaXF6JztcbmltcG9ydCBtZDUgZnJvbSAnYW50aXRyYWNraW5nL21kNSc7XG5pbXBvcnQgUVNXaGl0ZWxpc3RCYXNlIGZyb20gJ2FudGl0cmFja2luZy9xcy13aGl0ZWxpc3QtYmFzZSc7XG5cbmNvbnN0IHVwZGF0ZUV4cGlyZSA9IDQ4O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBleHRlbmRzIFFTV2hpdGVsaXN0QmFzZSB7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnNhZmVUb2tlbnMgPSBuZXcgcGVyc2lzdC5MYXp5UGVyc2lzdGVudE9iamVjdCgndG9rZW5FeHRXaGl0ZWxpc3QnKTtcbiAgICB0aGlzLnRyYWNrZXJEb21haW5zID0gbmV3IHBlcnNpc3QuTGF6eVBlcnNpc3RlbnRPYmplY3QoJ3RyYWNrZXJEb21haW5zJyk7XG4gICAgdGhpcy51bnNhZmVLZXlzID0gbmV3IHBlcnNpc3QuTGF6eVBlcnNpc3RlbnRPYmplY3QoJ3Vuc2FmZUtleScpO1xuICAgIHRoaXMubGFzdFVwZGF0ZSA9IFsnMCcsICcwJywgJzAnLCAnMCddO1xuXG4gICAgdGhpcy5UT0tFTl9XSElURUxJU1RfVVJMID0gJ2h0dHBzOi8vY2RuLmNsaXF6LmNvbS9hbnRpLXRyYWNraW5nL3doaXRlbGlzdC93aGl0ZWxpc3RfdG9rZW5zLmpzb24nO1xuICAgIHRoaXMuVFJBQ0tFUl9ETV9VUkwgPSAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvd2hpdGVsaXN0L3RyYWNrZXJfZG9tYWlucy5qc29uJztcbiAgICB0aGlzLlNBRkVfS0VZX1VSTCA9ICdodHRwczovL2Nkbi5jbGlxei5jb20vYW50aS10cmFja2luZy93aGl0ZWxpc3QvZG9tYWluX3NhZmVfa2V5Lmpzb24nO1xuICAgIHRoaXMuVU5TQUZFX0tFWV9VUkwgPSAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvd2hpdGVsaXN0L2RvbWFpbl91bnNhZmVfa2V5Lmpzb24nO1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgICBzdXBlci5pbml0KCk7XG4gICAgdGhpcy5zYWZlVG9rZW5zLmxvYWQoKTtcbiAgICB0aGlzLnVuc2FmZUtleXMubG9hZCgpO1xuICAgIHRoaXMudHJhY2tlckRvbWFpbnMubG9hZCgpO1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmxhc3RVcGRhdGUgPSBKU09OLnBhcnNlKHBlcnNpc3QuZ2V0VmFsdWUoJ2xhc3RVcGRhdGUnKSk7XG4gICAgICBpZiAodGhpcy5sYXN0VXBkYXRlLmxlbmd0aCAhPT0gNCkge1xuICAgICAgICAgIHRocm93ICdpbnZhbGlkIGxhc3RVcGRhdGUgdmFsdWUnO1xuICAgICAgfVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgdGhpcy5sYXN0VXBkYXRlID0gWycwJywgJzAnLCAnMCcsICcwJ107XG4gICAgfVxuXG4gICAgLy8gbGlzdCB1cGRhdGUgZXZlbnRzXG4gICAgdGhpcy5vbkNvbmZpZ1VwZGF0ZSA9IChjb25maWcpID0+IHtcbiAgICAgIHZhciBjdXJyZW50U2FmZUtleSA9IHBlcnNpc3QuZ2V0VmFsdWUoJ3NhZmVLZXlFeHRWZXJzaW9uJywgJycpLFxuICAgICAgICAgIGN1cnJlbnRUb2tlbiA9IHBlcnNpc3QuZ2V0VmFsdWUoJ3Rva2VuV2hpdGVsaXN0VmVyc2lvbicsICcnKSxcbiAgICAgICAgICBjdXJyZW50VW5zYWZlS2V5ID0gcGVyc2lzdC5nZXRWYWx1ZSgndW5zYWZlS2V5RXh0VmVyc2lvbicsICcnKSxcbiAgICAgICAgICBjdXJyZW50VHJhY2tlciA9IHBlcnNpc3QuZ2V0VmFsdWUoJ3RyYWNrZXJEb21haW5zdmVyc2lvbicsICcnKTtcbiAgICAgIC8vIGNoZWNrIHNhZmVrZXlcbiAgICAgIHV0aWxzLmxvZygnU2FmZSBrZXlzOiAnKyBjb25maWcuc2FmZWtleV92ZXJzaW9uICsgJyB2cyAnICsgY3VycmVudFNhZmVLZXksICdhdHRyYWNrJyk7XG4gICAgICBpZiAoY29uZmlnLnNhZmVrZXlfdmVyc2lvbiAmJiBjdXJyZW50U2FmZUtleSAhPT0gY29uZmlnLnNhZmVrZXlfdmVyc2lvbikge1xuICAgICAgICB0aGlzLl9sb2FkUmVtb3RlU2FmZUtleShjb25maWcuZm9yY2VfY2xlYW4gPT09IHRydWUpO1xuICAgICAgfVxuICAgICAgdXRpbHMubG9nKCdUb2tlbiB3aGl0ZWxpc3Q6ICcrIGNvbmZpZy53aGl0ZWxpc3RfdG9rZW5fdmVyc2lvbiArICcgdnMgJyArIGN1cnJlbnRUb2tlbiwgJ2F0dHJhY2snKTtcbiAgICAgIGlmIChjb25maWcudG9rZW5fd2hpdGVsaXN0X3ZlcnNpb24gJiYgY3VycmVudFRva2VuICE9PSBjb25maWcud2hpdGVsaXN0X3Rva2VuX3ZlcnNpb24pIHtcbiAgICAgICAgdGhpcy5fbG9hZFJlbW90ZVRva2VuV2hpdGVsaXN0KCk7XG4gICAgICB9XG4gICAgICB1dGlscy5sb2coJ1RyYWNrZXIgRG9tYWluOiAnKyBjb25maWcudHJhY2tlcl9kb21haW5fdmVyc2lvbiArICcgdnMgJyArIGN1cnJlbnRUcmFja2VyLCAnYXR0cmFjaycpO1xuICAgICAgaWYgKGNvbmZpZy50cmFja2VyX2RvbWFpbl92ZXJzaW9uICYmIGN1cnJlbnRUcmFja2VyICE9PSBjb25maWcudHJhY2tlcl9kb21haW5fdmVyc2lvbikge1xuICAgICAgICB0aGlzLl9sb2FkUmVtb3RlVHJhY2tlckRvbWFpbkxpc3QoKTtcbiAgICAgIH1cbiAgICAgIHV0aWxzLmxvZygnVW5zYWZlIGtleXM6ICcrIGNvbmZpZy51bnNhZmVrZXlfdmVyc2lvbiArICcgdnMgJyArIGN1cnJlbnRVbnNhZmVLZXksICdhdHRyYWNrJyk7XG4gICAgICBpZiAoY29uZmlnLnRva2VuX3doaXRlbGlzdF92ZXJzaW9uICYmIGN1cnJlbnRUb2tlbiAhPT0gY29uZmlnLnRva2VuX3doaXRlbGlzdF92ZXJzaW9uKSB7XG4gICAgICAgIHRoaXMuX2xvYWRSZW1vdGVVbnNhZmVLZXkoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZXZlbnRzLnN1YignYXR0cmFjazp1cGRhdGVkX2NvbmZpZycsIHRoaXMub25Db25maWdVcGRhdGUpO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICBzdXBlci5kZXN0cm95KCk7XG4gICAgZXZlbnRzLnVuX3N1YignYXR0cmFjazp1cGRhdGVkX2NvbmZpZycsIHRoaXMub25Db25maWdVcGRhdGUpO1xuICB9XG5cbiAgaXNVcFRvRGF0ZSgpIHtcbiAgICB2YXIgZGVsYXkgPSB1cGRhdGVFeHBpcmUsXG4gICAgICAgIGhvdXIgPSBkYXRldGltZS5uZXdVVENEYXRlKCk7XG4gICAgaG91ci5zZXRIb3Vycyhob3VyLmdldEhvdXJzKCkgLSBkZWxheSk7XG4gICAgdmFyIGhvdXJDdXRvZmYgPSBkYXRldGltZS5ob3VyU3RyaW5nKGhvdXIpO1xuICAgIHJldHVybiB0aGlzLmxhc3RVcGRhdGUuZXZlcnkoKHQpID0+IHtyZXR1cm4gdCA+IGhvdXJDdXRvZmY7fSk7XG4gIH1cblxuICBpc1JlYWR5KCkge1xuICAgIC8vIGp1c3QgY2hlY2sgdGhleSdyZSBub3QgbnVsbFxuICAgIHJldHVybiB0aGlzLnNhZmVUb2tlbnMudmFsdWUgJiYgdGhpcy5zYWZlS2V5cy52YWx1ZSAmJiB0aGlzLnVuc2FmZUtleXMudmFsdWUgJiYgdGhpcy50cmFja2VyRG9tYWlucy52YWx1ZTtcbiAgfVxuXG4gIGlzU2FmZUtleShkb21haW4sIGtleSkge1xuICAgIHJldHVybiAoIXRoaXMuaXNVbnNhZmVLZXkoZG9tYWluLCBrZXkpKSAmJiBkb21haW4gaW4gdGhpcy5zYWZlS2V5cy52YWx1ZSAmJiBrZXkgaW4gdGhpcy5zYWZlS2V5cy52YWx1ZVtkb21haW5dO1xuICB9XG5cbiAgaXNVbnNhZmVLZXkoZG9tYWluLCBrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5pc1RyYWNrZXJEb21haW4oZG9tYWluKSAmJiBkb21haW4gaW4gdGhpcy51bnNhZmVLZXlzLnZhbHVlICYmIGtleSBpbiB0aGlzLnVuc2FmZUtleXMudmFsdWVbZG9tYWluXTtcbiAgfVxuXG4gIGFkZFNhZmVLZXkoZG9tYWluLCBrZXksIHZhbHVlQ291bnQpIHtcbiAgICBpZiAodGhpcy5pc1Vuc2FmZUtleShkb21haW4sIGtleSkpIHtcbiAgICAgIHJldHVybjsgIC8vIGtleXMgaW4gdGhlIHVuc2FmZWtleSBsaXN0IHNob3VsZCBub3QgYmUgYWRkZWQgdG8gc2FmZWtleSBsaXN0XG4gICAgfVxuICAgIGxldCB0b2RheSA9IGRhdGV0aW1lLmRhdGVTdHJpbmcoZGF0ZXRpbWUubmV3VVRDRGF0ZSgpKTtcbiAgICBpZiAoIShkb21haW4gaW4gdGhpcy5zYWZlS2V5cy52YWx1ZSkpIHtcbiAgICAgIHRoaXMuc2FmZUtleXMudmFsdWVbZG9tYWluXSA9IHt9O1xuICAgIH1cbiAgICB0aGlzLnNhZmVLZXlzLnZhbHVlW2RvbWFpbl1ba2V5XSA9IFt0b2RheSwgJ2wnLCB2YWx1ZUNvdW50XTtcbiAgICB0aGlzLnNhZmVLZXlzLnNldERpcnR5KCk7XG4gIH1cblxuICBpc1RyYWNrZXJEb21haW4oZG9tYWluKSB7XG4gICAgcmV0dXJuIGRvbWFpbiBpbiB0aGlzLnRyYWNrZXJEb21haW5zLnZhbHVlO1xuICB9XG5cbiAgaXNTYWZlVG9rZW4oZG9tYWluLCB0b2tlbikge1xuICAgIHJldHVybiB0aGlzLmlzVHJhY2tlckRvbWFpbihkb21haW4pICYmIHRva2VuIGluIHRoaXMuc2FmZVRva2Vucy52YWx1ZTtcbiAgfVxuXG4gIGFkZFNhZmVUb2tlbihkb21haW4sIHRva2VuKSB7XG4gICAgdGhpcy50cmFja2VyRG9tYWlucy52YWx1ZVtkb21haW5dID0gdHJ1ZTtcbiAgICBpZiAodG9rZW4gJiYgdG9rZW4gIT09ICcnKSB7XG4gICAgICB0aGlzLnNhZmVUb2tlbnMudmFsdWVbdG9rZW5dID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBhZGRVbnNhZmVLZXkoZG9tYWluLCBrZXkpIHtcbiAgICBpZiAoIShkb21haW4gaW4gdGhpcy51bnNhZmVLZXlzLnZhbHVlKSkge1xuICAgICAgdGhpcy51bnNhZmVLZXlzLnZhbHVlW2RvbWFpbl0gPSB7fTtcbiAgICB9XG4gICAgdGhpcy51bnNhZmVLZXlzLnZhbHVlW2RvbWFpbl1ba2V5XSA9IHRydWU7XG4gIH1cblxuICBnZXRWZXJzaW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB3aGl0ZWxpc3Q6IHBlcnNpc3QuZ2V0VmFsdWUoJ3Rva2VuV2hpdGVsaXN0VmVyc2lvbicsICcnKSxcbiAgICAgIHNhZmVLZXk6IHBlcnNpc3QuZ2V0VmFsdWUoJ3NhZmVLZXlFeHRWZXJzaW9uJywgJycpLFxuICAgICAgdW5zYWZlS2V5OiBwZXJzaXN0LmdldFZhbHVlKCd1bnNhZmVLZXlFeHRWZXJzaW9uJywgJycpLFxuICAgICAgdHJhY2tlckRvbWFpbnM6IHBlcnNpc3QuZ2V0VmFsdWUoJ3RyYWNrZXJEb21haW5zVmVyc2lvbicsICcnKVxuICAgIH07XG4gIH1cblxuICBfbG9hZFJlbW90ZVRva2VuV2hpdGVsaXN0KCkge1xuICAgIHZhciB0b2RheSA9IGRhdGV0aW1lLmdldFRpbWUoKS5zdWJzdHJpbmcoMCwgMTApO1xuICAgIHV0aWxzLmh0dHBHZXQodGhpcy5UT0tFTl9XSElURUxJU1RfVVJMICsnPycrIHRvZGF5LCBmdW5jdGlvbihyZXEpIHtcbiAgICAgIHZhciByTGlzdCA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKSxcbiAgICAgICAgICByTGlzdE1kNSA9IG1kNShyZXEucmVzcG9uc2UpO1xuICAgICAgdGhpcy5zYWZlVG9rZW5zLnNldFZhbHVlKHJMaXN0KTtcbiAgICAgIHBlcnNpc3Quc2V0VmFsdWUoJ3Rva2VuV2hpdGVsaXN0VmVyc2lvbicsIHJMaXN0TWQ1KTtcbiAgICAgIHRoaXMubGFzdFVwZGF0ZVsxXSA9IGRhdGV0aW1lLmdldFRpbWUoKTtcbiAgICAgIHBlcnNpc3Quc2V0VmFsdWUoJ2xhc3RVcGRhdGUnLCBKU09OLnN0cmluZ2lmeSh0aGlzLmxhc3RVcGRhdGUpKTtcbiAgICAgIGV2ZW50cy5wdWIoJ2F0dHJhY2s6dG9rZW5fd2hpdGVsaXN0X3VwZGF0ZWQnLCByTGlzdE1kNSk7XG4gICAgfS5iaW5kKHRoaXMpLFxuICAgIGZ1bmN0aW9uKCkge30sXG4gICAgMTAwMDAwKTtcbiAgfVxuXG4gIF9sb2FkUmVtb3RlVHJhY2tlckRvbWFpbkxpc3QoKSB7XG4gICAgdmFyIHRvZGF5ID0gZGF0ZXRpbWUuZ2V0VGltZSgpLnN1YnN0cmluZygwLCAxMCk7XG4gICAgdXRpbHMuaHR0cEdldCh0aGlzLlRSQUNLRVJfRE1fVVJMICsnPycrIHRvZGF5LCBmdW5jdGlvbihyZXEpIHtcbiAgICAgIHZhciByTGlzdCA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKSxcbiAgICAgICAgICByTGlzdE1kNSA9IG1kNShyZXEucmVzcG9uc2UpO1xuICAgICAgdGhpcy50cmFja2VyRG9tYWlucy5zZXRWYWx1ZShyTGlzdCk7XG4gICAgICBwZXJzaXN0LnNldFZhbHVlKCd0cmFja2VyRG9tYWluc3ZlcnNpb24nLCByTGlzdE1kNSk7XG4gICAgICB0aGlzLmxhc3RVcGRhdGVbM10gPSBkYXRldGltZS5nZXRUaW1lKCk7XG4gICAgICBwZXJzaXN0LnNldFZhbHVlKCdsYXN0VXBkYXRlJywgSlNPTi5zdHJpbmdpZnkodGhpcy5sYXN0VXBkYXRlKSk7XG4gICAgfS5iaW5kKHRoaXMpLFxuICAgIGZ1bmN0aW9uKCkge30sXG4gICAgMTAwMDAwKTtcbiAgfVxuXG4gIF9sb2FkUmVtb3RlU2FmZUtleShmb3JjZUNsZWFuKSB7XG4gICAgdmFyIHRvZGF5ID0gZGF0ZXRpbWUuZ2V0VGltZSgpLnN1YnN0cmluZygwLCAxMCk7XG4gICAgaWYgKGZvcmNlQ2xlYW4pIHtcbiAgICAgIHRoaXMuc2FmZUtleXMuY2xlYXIoKTtcbiAgICB9XG4gICAgdXRpbHMuaHR0cEdldCh0aGlzLlNBRkVfS0VZX1VSTCArJz8nKyB0b2RheSwgZnVuY3Rpb24ocmVxKSB7XG4gICAgICB2YXIgc2FmZUtleSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKSxcbiAgICAgICAgICBzLCBrLFxuICAgICAgICAgIHNhZmVLZXlFeHRWZXJzaW9uID0gbWQ1KHJlcS5yZXNwb25zZSk7XG4gICAgICBmb3IgKHMgaW4gc2FmZUtleSkge1xuICAgICAgICBmb3IgKGsgaW4gc2FmZUtleVtzXSkge1xuICAgICAgICAgIC8vIHIgZm9yIHJlbW90ZSBrZXlzXG4gICAgICAgICAgc2FmZUtleVtzXVtrXSA9IFtzYWZlS2V5W3NdW2tdLCAnciddO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHMgaW4gc2FmZUtleSkge1xuICAgICAgICBpZiAoIShzIGluIHRoaXMuc2FmZUtleXMudmFsdWUpKSB7XG4gICAgICAgICAgdGhpcy5zYWZlS2V5cy52YWx1ZVtzXSA9IHNhZmVLZXlbc107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIga2V5IGluIHNhZmVLZXlbc10pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNhZmVLZXlzLnZhbHVlW3NdW2tleV0gPT0gbnVsbCB8fFxuICAgICAgICAgICAgICAgIHRoaXMuc2FmZUtleXMudmFsdWVbc11ba2V5XVswXSA8IHNhZmVLZXlbc11ba2V5XVswXSkge1xuICAgICAgICAgICAgICB0aGlzLnNhZmVLZXlzLnZhbHVlW3NdW2tleV0gPSBzYWZlS2V5W3NdW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLl9wcnVuZVNhZmVLZXlzKCk7XG4gICAgICB0aGlzLmxhc3RVcGRhdGVbMF0gPSBkYXRldGltZS5nZXRUaW1lKCk7XG4gICAgICBwZXJzaXN0LnNldFZhbHVlKCdsYXN0VXBkYXRlJywgSlNPTi5zdHJpbmdpZnkodGhpcy5sYXN0VXBkYXRlKSk7XG4gICAgICB0aGlzLnNhZmVLZXlzLnNldERpcnR5KCk7XG4gICAgICB0aGlzLnNhZmVLZXlzLnNhdmUoKTtcbiAgICAgIHBlcnNpc3Quc2V0VmFsdWUoJ3NhZmVLZXlFeHRWZXJzaW9uJywgc2FmZUtleUV4dFZlcnNpb24pO1xuICAgICAgZXZlbnRzLnB1YignYXR0cmFjazpzYWZla2V5c191cGRhdGVkJywgc2FmZUtleUV4dFZlcnNpb24sIGZvcmNlQ2xlYW4pO1xuICAgIH0uYmluZCh0aGlzKSxcbiAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBvbiBlcnJvclxuICAgICAgfSwgNjAwMDBcbiAgICApO1xuICB9XG5cbiAgX2xvYWRSZW1vdGVVbnNhZmVLZXkoKSB7XG4gICAgbGV0IHRvZGF5ID0gZGF0ZXRpbWUuZ2V0VGltZSgpLnN1YnN0cmluZygwLCAxMCk7XG4gICAgdXRpbHMubG9nKHRoaXMuVU5TQUZFX0tFWV9VUkwpO1xuICAgIHV0aWxzLmh0dHBHZXQodGhpcy5VTlNBRkVfS0VZX1VSTCArJz8nKyB0b2RheSwgZnVuY3Rpb24ocmVxKSB7XG4gICAgICBsZXQgdW5zYWZlS2V5cyA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKSxcbiAgICAgICAgICB1bnNhZmVLZXlFeHRWZXJzaW9uID0gbWQ1KHJlcS5yZXNwb25zZSk7XG4gICAgICB0aGlzLnVuc2FmZUtleXMuc2V0VmFsdWUodW5zYWZlS2V5cyk7XG4gICAgICB0aGlzLmxhc3RVcGRhdGVbMl0gPSBkYXRldGltZS5nZXRUaW1lKCk7XG4gICAgICBwZXJzaXN0LnNldFZhbHVlKCdsYXN0VXBkYXRlJywgSlNPTi5zdHJpbmdpZnkodGhpcy5sYXN0VXBkYXRlKSk7XG4gICAgICBwZXJzaXN0LnNldFZhbHVlKCd1bnNhZmVLZXlFeHRWZXNpb24nLCB1bnNhZmVLZXlFeHRWZXJzaW9uKTtcbiAgICAgIHRoaXMudW5zYWZlS2V5cy5zZXREaXJ0eSgpO1xuICAgICAgdGhpcy51bnNhZmVLZXlzLnNhdmUoKTtcbiAgICB9LmJpbmQodGhpcyksIGZ1bmN0aW9uKCkge30sIDEwMDAwMCk7XG4gIH1cblxufVxuIl19