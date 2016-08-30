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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9xcy13aGl0ZWxpc3QtYmFzZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7cUVBT00sYUFBYTs7Ozs7Ozs7Ozs7OzBCQUxWLE1BQU07Ozs7Ozs7OztBQUtULG1CQUFhLEdBQUcsQ0FBQzs7Ozs7OztBQU9WLDRCQUFHOzs7QUFDWixjQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzdEOzs7O2lCQUVHLGdCQUFHO0FBQ0wsZ0JBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckIscUJBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1dBQ3pFOzs7aUJBRU0sbUJBQUcsRUFDVDs7O2lCQWVrQiwrQkFBRzs7QUFFcEIsZ0JBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUM3QixnQkFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDOztBQUV0QixnQkFBSSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxFQUFFO0FBQ2hDLGtCQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7QUFDckIsa0JBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUM7YUFDOUI7V0FDRjs7O2lCQUVRLG1CQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7QUFDckIsbUJBQU8sTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztXQUM1RTs7O2lCQUNTLG9CQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFO0FBQ2xDLGdCQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZELGdCQUFJLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBLEFBQUMsRUFBRTtBQUNwQyxrQkFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQ2xDO0FBQ0QsZ0JBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUM1RCxnQkFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztXQUMxQjs7Ozs7OztpQkFLZSwwQkFBQyxlQUFlLEVBQUU7QUFDaEMsaUJBQU0sSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUc7QUFDeEMsbUJBQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUc7QUFDN0Msb0JBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUU3QyxvQkFBSyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFOztBQUU1RCxzQkFBSyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRztBQUN4Qix5QkFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzttQkFDZjs7QUFFRCxzQkFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDbEUsdUJBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztpQkFDM0M7ZUFDRjthQUNGO0FBQ0QsZ0JBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDekIsZ0JBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7V0FDdEI7OztpQkFFYSwwQkFBRztBQUNmLGdCQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDaEMsZUFBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFDM0MsZ0JBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekMsaUJBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7QUFDL0IsbUJBQUssSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDcEMsb0JBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxFQUFFO0FBQzVDLHlCQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUN0QztlQUNKO0FBQ0Qsa0JBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDbEQsdUJBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7ZUFDakM7YUFDSjtBQUNELGdCQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ3pCLGdCQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1dBQ3RCOzs7aUJBRVkseUJBQUc7O0FBRWQsZ0JBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUU7Z0JBQzNCLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3QixnQkFBSSxHQUFHLEdBQUcsRUFBRTtnQkFBRSxLQUFLLEdBQUcsRUFBRTtnQkFBRSxNQUFNLEdBQUcsQ0FBQztnQkFBRSxDQUFDO2dCQUFFLENBQUMsQ0FBQztBQUMzQyxnQkFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFDbEMsaUJBQUssQ0FBQyxJQUFJLE9BQU8sRUFBRTtBQUNqQixtQkFBSyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3BCLG9CQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDNUIsc0JBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDYix5QkFBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNkLDBCQUFNLEVBQUcsQ0FBQzttQkFDWDtBQUNELHVCQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLHNCQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDNUIsd0JBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDWCx5QkFBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztxQkFDYjtBQUNELHVCQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO21CQUM5QjtpQkFDRjtlQUNGO2FBQ0Y7QUFDRCxnQkFBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDOUIsa0JBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN2RSx1QkFBUyxDQUFDLFNBQVMsQ0FBQyxFQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQzthQUNoRztXQUNGOzs7ZUF4R29CLGVBQUc7QUFDdEIsZ0JBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNwRCxnQkFBSSxDQUFDLFFBQVEsRUFBRTtBQUNiLHNCQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzlCLGtCQUFJLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDO2FBQ25DO0FBQ0QsbUJBQU8sUUFBUSxDQUFDO1dBQ2pCO2VBRW9CLGFBQUMsS0FBSyxFQUFFO0FBQzNCLG1CQUFPLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO1dBQzdDIiwiZmlsZSI6ImFudGl0cmFja2luZy9xcy13aGl0ZWxpc3QtYmFzZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBlcnNpc3QgZnJvbSAnYW50aXRyYWNraW5nL3BlcnNpc3RlbnQtc3RhdGUnO1xuaW1wb3J0ICogYXMgZGF0ZXRpbWUgZnJvbSAnYW50aXRyYWNraW5nL3RpbWUnO1xuaW1wb3J0IHsgZXZlbnRzIH0gZnJvbSAnY29yZS9jbGlxeic7XG5pbXBvcnQgQ2xpcXpBdHRyYWNrIGZyb20gJ2FudGl0cmFja2luZy9hdHRyYWNrJztcbmltcG9ydCBwYWNlbWFrZXIgZnJvbSAnYW50aXRyYWNraW5nL3BhY2VtYWtlcic7XG5pbXBvcnQgdGVsZW1ldHJ5ICBmcm9tICdhbnRpdHJhY2tpbmcvdGVsZW1ldHJ5JztcblxuY29uc3Qgc2FmZUtleUV4cGlyZSA9IDc7XG5cbi8qKiBCYXNlIFFTIFdoaXRlbGlzdFxuICogIENvbnRhaW5zIG9ubHkgbG9jYWwgc2FmZWtleXMsIGV4dHJhIHNhZmVrZXlzIGFuZCBzYWZlIHRva2VucyBhcmUgbGVmdCB0byBzdWItY2xhc3MuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNhZmVLZXlzID0gbmV3IHBlcnNpc3QuTGF6eVBlcnNpc3RlbnRPYmplY3QoJ3NhZmVLZXknKTtcbiAgfVxuXG4gIGluaXQoKSB7XG4gICAgdGhpcy5zYWZlS2V5cy5sb2FkKCk7XG4gICAgcGFjZW1ha2VyLnJlZ2lzdGVyKHRoaXMuX2hvdXJseVBydW5lQW5kU2VuZC5iaW5kKHRoaXMpLCA2MCAqIDYwICogMTAwMCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICB9XG5cbiAgZ2V0IF9zYWZlS2V5c0xhc3RTZW50KCkge1xuICAgIGxldCBsYXN0U2VudCA9IHBlcnNpc3QuZ2V0VmFsdWUoJ3NhZmVLZXlzTGFzdFNlbnQnKTtcbiAgICBpZiAoIWxhc3RTZW50KSB7XG4gICAgICBsYXN0U2VudCA9IGRhdGV0aW1lLmdldFRpbWUoKTtcbiAgICAgIHRoaXMuX3NhZmVLZXlzTGFzdFNlbnQgPSBsYXN0U2VudDtcbiAgICB9XG4gICAgcmV0dXJuIGxhc3RTZW50O1xuICB9XG5cbiAgc2V0IF9zYWZlS2V5c0xhc3RTZW50KHZhbHVlKSB7XG4gICAgcGVyc2lzdC5zZXRWYWx1ZSgnc2FmZUtleXNMYXN0U2VudCcsIHZhbHVlKTtcbiAgfVxuXG4gIF9ob3VybHlQcnVuZUFuZFNlbmQoKSB7XG4gICAgLy8gZXZlcnkgaG91ciwgcHJ1bmUgYW5kIHNlbmQgc2FmZWtleXNcbiAgICB2YXIgbm93ID0gZGF0ZXRpbWUuZ2V0VGltZSgpO1xuICAgIHRoaXMuX3BydW5lU2FmZUtleXMoKTtcblxuICAgIGlmICh0aGlzLl9zYWZlS2V5c0xhc3RTZW50IDwgbm93KSB7XG4gICAgICB0aGlzLl9zZW5kU2FmZUtleXMoKTtcbiAgICAgIHRoaXMuX3NhZmVLZXlzTGFzdFNlbnQgPSBub3c7XG4gICAgfVxuICB9XG5cbiAgaXNTYWZlS2V5KGRvbWFpbiwga2V5KSB7XG4gICAgcmV0dXJuIGRvbWFpbiBpbiB0aGlzLnNhZmVLZXlzLnZhbHVlICYmIGtleSBpbiB0aGlzLnNhZmVLZXlzLnZhbHVlW2RvbWFpbl07XG4gIH1cbiAgYWRkU2FmZUtleShkb21haW4sIGtleSwgdmFsdWVDb3VudCkge1xuICAgIGxldCB0b2RheSA9IGRhdGV0aW1lLmRhdGVTdHJpbmcoZGF0ZXRpbWUubmV3VVRDRGF0ZSgpKTtcbiAgICBpZiAoIShkb21haW4gaW4gdGhpcy5zYWZlS2V5cy52YWx1ZSkpIHtcbiAgICAgIHRoaXMuc2FmZUtleXMudmFsdWVbZG9tYWluXSA9IHt9O1xuICAgIH1cbiAgICB0aGlzLnNhZmVLZXlzLnZhbHVlW2RvbWFpbl1ba2V5XSA9IFt0b2RheSwgJ2wnLCB2YWx1ZUNvdW50XTtcbiAgICB0aGlzLnNhZmVLZXlzLnNldERpcnR5KCk7XG4gIH1cblxuICAvKiogQW5ub3RhdGUgc2FmZWtleSBlbnRyaWVzIHdpdGggY291bnQgb2YgdG9rZW5zIHNlZW4sIGZyb20gcmVxdWVzdEtleVZhbHVlIGRhdGEuXG4gICAqICBUaGlzIHdpbGwgYWRkIGRhdGEgb24gaG93IG1hbnkgdmFsdWVzIHdlcmUgc2VlbiBmb3IgZWFjaCBrZXkgYnkgaW5kaXZpZHVhbCB1c2Vycy5cbiAgICovXG4gIGFubm90YXRlU2FmZUtleXMocmVxdWVzdEtleVZhbHVlKSB7XG4gICAgZm9yICggbGV0IGRvbWFpbiBpbiB0aGlzLnNhZmVLZXlzLnZhbHVlICkge1xuICAgICAgZm9yICggbGV0IGtleSBpbiB0aGlzLnNhZmVLZXlzLnZhbHVlW2RvbWFpbl0gKSB7XG4gICAgICAgIGxldCB0dXBsZSA9IHRoaXMuc2FmZUtleXMudmFsdWVbZG9tYWluXVtrZXldO1xuICAgICAgICAvLyBjaGVjayBpZiB3ZSBoYXZlIGtleS12YWx1ZSBkYXRhIGZvciB0aGlzIGRvbWFpbiwga2V5IHBhaXJcbiAgICAgICAgaWYgKCByZXF1ZXN0S2V5VmFsdWVbZG9tYWluXSAmJiByZXF1ZXN0S2V5VmFsdWVbZG9tYWluXVtrZXldKSB7XG4gICAgICAgICAgLy8gcmVtb3RlIGFuZCBvbGQgc2FmZWtleXMgbWF5IGJlIGluIG9sZCBwYWlyIGZvcm1hdFxuICAgICAgICAgIGlmICggdHVwbGUubGVuZ3RoID09PSAyICkge1xuICAgICAgICAgICAgdHVwbGUucHVzaCgwKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgdmFsdWVDb3VudCA9IE9iamVjdC5rZXlzKHJlcXVlc3RLZXlWYWx1ZVtkb21haW5dW2tleV0pLmxlbmd0aDtcbiAgICAgICAgICB0dXBsZVsyXSA9IE1hdGgubWF4KHR1cGxlWzJdLCB2YWx1ZUNvdW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnNhZmVLZXlzLnNldERpcnR5KCk7XG4gICAgdGhpcy5zYWZlS2V5cy5zYXZlKCk7XG4gIH1cblxuICBfcHJ1bmVTYWZlS2V5cygpIHtcbiAgICB2YXIgZGF5ID0gZGF0ZXRpbWUubmV3VVRDRGF0ZSgpO1xuICAgIGRheS5zZXREYXRlKGRheS5nZXREYXRlKCkgLSBzYWZlS2V5RXhwaXJlKTtcbiAgICB2YXIgZGF5Q3V0b2ZmID0gZGF0ZXRpbWUuZGF0ZVN0cmluZyhkYXkpO1xuICAgIGZvciAodmFyIHMgaW4gdGhpcy5zYWZlS2V5cy52YWx1ZSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5zYWZlS2V5cy52YWx1ZVtzXSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2FmZUtleXMudmFsdWVbc11ba2V5XVswXSA8IGRheUN1dG9mZikge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNhZmVLZXlzLnZhbHVlW3NdW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuc2FmZUtleXMudmFsdWVbc10pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2FmZUtleXMudmFsdWVbc107XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zYWZlS2V5cy5zZXREaXJ0eSgpO1xuICAgIHRoaXMuc2FmZUtleXMuc2F2ZSgpO1xuICB9XG5cbiAgX3NlbmRTYWZlS2V5cygpIHtcbiAgICAvLyBnZXQgb25seSBrZXlzIGZyb20gbG9jYWwga2V5XG4gICAgdmFyIGhvdXIgPSBkYXRldGltZS5nZXRUaW1lKCksXG4gICAgICBkYXkgPSBob3VyLnN1YnN0cmluZygwLCA4KTtcbiAgICB2YXIgZHRzID0ge30sIGxvY2FsID0ge30sIGxvY2FsRSA9IDAsIHMsIGs7XG4gICAgdmFyIHNhZmVLZXkgPSB0aGlzLnNhZmVLZXlzLnZhbHVlO1xuICAgIGZvciAocyBpbiBzYWZlS2V5KSB7XG4gICAgICBmb3IgKGsgaW4gc2FmZUtleVtzXSkge1xuICAgICAgICBpZiAoc2FmZUtleVtzXVtrXVsxXSA9PT0gJ2wnKSB7XG4gICAgICAgICAgaWYgKCFsb2NhbFtzXSkge1xuICAgICAgICAgICAgbG9jYWxbc10gPSB7fTtcbiAgICAgICAgICAgIGxvY2FsRSArKztcbiAgICAgICAgICB9XG4gICAgICAgICAgbG9jYWxbc10gPSBzYWZlS2V5W3NdW2tdO1xuICAgICAgICAgIGlmIChzYWZlS2V5W3NdW2tdWzBdID09PSBkYXkpIHtcbiAgICAgICAgICAgIGlmICghZHRzW3NdKSB7XG4gICAgICAgICAgICAgIGR0c1tzXSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZHRzW3NdW2tdID0gc2FmZUtleVtzXVtrXVswXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoT2JqZWN0LmtleXMoZHRzKS5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgcGF5bCA9IENsaXF6QXR0cmFjay5nZW5lcmF0ZUF0dHJhY2tQYXlsb2FkKGR0cywgaG91ciwgZmFsc2UsIHRydWUpO1xuICAgICAgdGVsZW1ldHJ5LnRlbGVtZXRyeSh7J3R5cGUnOiB0ZWxlbWV0cnkubXNnVHlwZSwgJ2FjdGlvbic6ICdhdHRyYWNrLnNhZmVrZXknLCAncGF5bG9hZCc6IHBheWx9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==