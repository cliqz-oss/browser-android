System.register('antitracking/qs-whitelist-base', ['antitracking/persistent-state', 'antitracking/time', 'core/cliqz', 'antitracking/attrack', 'antitracking/pacemaker', 'antitracking/telemetry'], function (_export) {
  'use strict';

  var persist, datetime, events, CliqzAttrack, pacemaker, telemetry, safeKeyExpire, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_antitrackingPersistentState) {
      persist = _antitrackingPersistentState;
    }, function (_antitrackingTime) {
      datetime = _antitrackingTime;
    }, function (_coreCliqz) {
      events = _coreCliqz.events;
    }, function (_antitrackingAttrack) {
      CliqzAttrack = _antitrackingAttrack['default'];
    }, function (_antitrackingPacemaker) {
      pacemaker = _antitrackingPacemaker['default'];
    }, function (_antitrackingTelemetry) {
      telemetry = _antitrackingTelemetry['default'];
    }],
    execute: function () {
      safeKeyExpire = 7;

      /** Base QS Whitelist
       *  Contains only local safekeys, extra safekeys and safe tokens are left to sub-class.
       */

      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);

          this.safeKeys = new persist.LazyPersistentObject('safeKey');
        }

        _createClass(_default, [{
          key: 'init',
          value: function init() {
            this.safeKeys.load();
            pacemaker.register(this._hourlyPruneAndSend.bind(this), 60 * 60 * 1000);
          }
        }, {
          key: 'destroy',
          value: function destroy() {}
        }, {
          key: '_hourlyPruneAndSend',
          value: function _hourlyPruneAndSend() {
            // every hour, prune and send safekeys
            var now = datetime.getTime();
            this._pruneSafeKeys();

            if (this._safeKeysLastSent < now) {
              this._sendSafeKeys();
              this._safeKeysLastSent = now;
            }
          }
        }, {
          key: 'isSafeKey',
          value: function isSafeKey(domain, key) {
            return domain in this.safeKeys.value && key in this.safeKeys.value[domain];
          }
        }, {
          key: 'addSafeKey',
          value: function addSafeKey(domain, key, valueCount) {
            var today = datetime.dateString(datetime.newUTCDate());
            if (!(domain in this.safeKeys.value)) {
              this.safeKeys.value[domain] = {};
            }
            this.safeKeys.value[domain][key] = [today, 'l', valueCount];
            this.safeKeys.setDirty();
          }

          /** Annotate safekey entries with count of tokens seen, from requestKeyValue data.
           *  This will add data on how many values were seen for each key by individual users.
           */
        }, {
          key: 'annotateSafeKeys',
          value: function annotateSafeKeys(requestKeyValue) {
            for (var domain in this.safeKeys.value) {
              for (var key in this.safeKeys.value[domain]) {
                var tuple = this.safeKeys.value[domain][key];
                // check if we have key-value data for this domain, key pair
                if (requestKeyValue[domain] && requestKeyValue[domain][key]) {
                  // remote and old safekeys may be in old pair format
                  if (tuple.length === 2) {
                    tuple.push(0);
                  }

                  var valueCount = Object.keys(requestKeyValue[domain][key]).length;
                  tuple[2] = Math.max(tuple[2], valueCount);
                }
              }
            }
            this.safeKeys.setDirty();
            this.safeKeys.save();
          }
        }, {
          key: '_pruneSafeKeys',
          value: function _pruneSafeKeys() {
            var day = datetime.newUTCDate();
            day.setDate(day.getDate() - safeKeyExpire);
            var dayCutoff = datetime.dateString(day);
            for (var s in this.safeKeys.value) {
              for (var key in this.safeKeys.value[s]) {
                if (this.safeKeys.value[s][key][0] < dayCutoff) {
                  delete this.safeKeys.value[s][key];
                }
              }
              if (Object.keys(this.safeKeys.value[s]).length === 0) {
                delete this.safeKeys.value[s];
              }
            }
            this.safeKeys.setDirty();
            this.safeKeys.save();
          }
        }, {
          key: '_sendSafeKeys',
          value: function _sendSafeKeys() {
            // get only keys from local key
            var hour = datetime.getTime(),
                day = hour.substring(0, 8);
            var dts = {},
                local = {},
                localE = 0,
                s,
                k;
            var safeKey = this.safeKeys.value;
            for (s in safeKey) {
              for (k in safeKey[s]) {
                if (safeKey[s][k][1] === 'l') {
                  if (!local[s]) {
                    local[s] = {};
                    localE++;
                  }
                  local[s] = safeKey[s][k];
                  if (safeKey[s][k][0] === day) {
                    if (!dts[s]) {
                      dts[s] = {};
                    }
                    dts[s][k] = safeKey[s][k][0];
                  }
                }
              }
            }
            if (Object.keys(dts).length > 0) {
              var payl = CliqzAttrack.generateAttrackPayload(dts, hour, false, true);
              telemetry.telemetry({ 'type': telemetry.msgType, 'action': 'attrack.safekey', 'payload': payl });
            }
          }
        }, {
          key: '_safeKeysLastSent',
          get: function get() {
            var lastSent = persist.getValue('safeKeysLastSent');
            if (!lastSent) {
              lastSent = datetime.getTime();
              this._safeKeysLastSent = lastSent;
            }
            return lastSent;
          },
          set: function set(value) {
            persist.setValue('safeKeysLastSent', value);
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});