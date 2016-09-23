System.register('antitracking/block-log', ['antitracking/persistent-state', 'antitracking/pacemaker', 'antitracking/md5', 'core/cliqz', 'antitracking/time', 'antitracking/attrack', 'antitracking/telemetry', 'core/resource-loader'], function (_export) {
  'use strict';

  var persist, pacemaker, md5, utils, events, datetime, CliqzAttrack, telemetry, ResourceLoader, DAYS_EXPIRE, TokenDomain, BlockLog, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_antitrackingPersistentState) {
      persist = _antitrackingPersistentState;
    }, function (_antitrackingPacemaker) {
      pacemaker = _antitrackingPacemaker['default'];
    }, function (_antitrackingMd5) {
      md5 = _antitrackingMd5['default'];
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }, function (_antitrackingTime) {
      datetime = _antitrackingTime;
    }, function (_antitrackingAttrack) {
      CliqzAttrack = _antitrackingAttrack['default'];
    }, function (_antitrackingTelemetry) {
      telemetry = _antitrackingTelemetry['default'];
    }, function (_coreResourceLoader) {
      ResourceLoader = _coreResourceLoader['default'];
    }],
    execute: function () {
      DAYS_EXPIRE = 7;

      TokenDomain = (function () {
        function TokenDomain() {
          _classCallCheck(this, TokenDomain);

          this._tokenDomain = new persist.LazyPersistentObject('tokenDomain');
        }

        _createClass(TokenDomain, [{
          key: 'init',
          value: function init() {
            this._tokenDomain.load();
          }
        }, {
          key: 'addTokenOnFirstParty',
          value: function addTokenOnFirstParty(token, firstParty) {
            if (!this._tokenDomain.value[token]) {
              this._tokenDomain.value[token] = {};
            }
            this._tokenDomain.value[token][firstParty] = datetime.getTime().substr(0, 8);
            this._tokenDomain.setDirty();
          }
        }, {
          key: 'getNFirstPartiesForToken',
          value: function getNFirstPartiesForToken(token) {
            return Object.keys(this._tokenDomain.value[token] || {}).length;
          }
        }, {
          key: 'clean',
          value: function clean() {
            var day = datetime.newUTCDate();
            day.setDate(day.getDate() - DAYS_EXPIRE);
            var dayCutoff = datetime.dateString(day),
                td = this._tokenDomain.value;
            for (var tok in td) {
              for (var s in td[tok]) {
                if (td[tok][s] < dayCutoff) {
                  delete td[tok][s];
                }
              }
              if (Object.keys(td[tok]).length === 0) {
                delete td[tok];
              }
            }
            this._tokenDomain.setDirty();
            this._tokenDomain.save();
          }
        }, {
          key: 'clear',
          value: function clear() {
            this._tokenDomain.clear();
          }
        }]);

        return TokenDomain;
      })();

      BlockLog = (function () {
        function BlockLog() {
          _classCallCheck(this, BlockLog);

          this.URL_BLOCK_REPORT_LIST = 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-report-list.json';
          this.blockReportList = {};
          this.blocked = new persist.LazyPersistentObject('blocked');
          this.localBlocked = new persist.LazyPersistentObject('localBlocked');
          this._blockReportListLoader = new ResourceLoader(['antitracking', 'anti-tracking-report-list.json'], {
            remoteURL: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-report-list.json',
            cron: 24 * 60 * 60 * 1000
          });
        }

        _createClass(BlockLog, [{
          key: 'init',
          value: function init() {
            this.blocked.load();
            this.localBlocked.load();
            this._blockReportListLoader.load().then(this._loadReportList.bind(this));
            this._blockReportListLoader.onUpdate(this._loadReportList.bind(this));
          }
        }, {
          key: 'destroy',
          value: function destroy() {
            this._blockReportListLoader.stop();
          }

          // blocked + localBlocked
        }, {
          key: 'add',
          value: function add(sourceUrl, tracker, key, value, type) {
            var s = tracker,
                k = md5(key),
                v = md5(value);
            if (this.isInBlockReportList(s, k, v)) {
              this._addBlocked(s, k, v, type);
            }
            // local logging of blocked tokens
            var hour = datetime.getTime(),
                source = md5(sourceUrl);

            this._addLocalBlocked(source, tracker, key, value, hour);
          }
        }, {
          key: 'clear',
          value: function clear() {
            this.blockReportList = {};
            this.blocked.clear();
            this.localBlocked.clear();
          }
        }, {
          key: '_addBlocked',
          value: function _addBlocked(tracker, key, value, type) {
            var bl = this.blocked.value;
            if (!(tracker in bl)) {
              bl[tracker] = {};
            }
            if (!(key in bl[tracker])) {
              bl[tracker][key] = {};
            }
            if (!(value in bl[tracker][key])) {
              bl[tracker][key][value] = {};
            }
            if (!(type in bl[tracker][key][value])) {
              bl[tracker][key][value][type] = 0;
            }
            bl[tracker][key][value][type]++;
            this.blocked.setDirty();
          }
        }, {
          key: '_addLocalBlocked',
          value: function _addLocalBlocked(source, s, k, v, hour) {
            var lb = this.localBlocked.value;
            if (!(source in lb)) {
              lb[source] = {};
            }
            if (!(s in lb[source])) {
              lb[source][s] = {};
            }
            if (!(k in lb[source][s])) {
              lb[source][s][k] = {};
            }
            if (!(v in lb[source][s][k])) {
              lb[source][s][k][v] = {};
            }
            if (!(hour in lb[source][s][k][v])) {
              lb[source][s][k][v][hour] = 0;
            }
            lb[source][s][k][v][hour]++;
            this.localBlocked.setDirty();
          }
        }, {
          key: '_cleanLocalBlocked',
          value: function _cleanLocalBlocked(hourCutoff) {
            // localBlocked
            for (var source in this.localBlocked.value) {
              for (var s in this.localBlocked.value[source]) {
                for (var k in this.localBlocked.value[source][s]) {
                  for (var v in this.localBlocked.value[source][s][k]) {
                    for (var h in this.localBlocked.value[source][s][k][v]) {
                      if (h < hourCutoff) {
                        delete this.localBlocked.value[source][s][k][v][h];
                      }
                    }
                    if (Object.keys(this.localBlocked.value[source][s][k][v]).length === 0) {
                      delete this.localBlocked.value[source][s][k][v];
                    }
                  }
                  if (Object.keys(this.localBlocked.value[source][s][k]).length === 0) {
                    delete this.localBlocked.value[source][s][k];
                  }
                }
                if (Object.keys(this.localBlocked.value[source][s]).length === 0) {
                  delete this.localBlocked.value[source][s];
                }
              }
              if (Object.keys(this.localBlocked.value[source]).length === 0) {
                delete this.localBlocked.value[source];
              }
            }
            this.localBlocked.setDirty(true);
            this.localBlocked.save();
          }
        }, {
          key: '_loadReportList',
          value: function _loadReportList(list) {
            this.blockReportList = list;
          }
        }, {
          key: 'isInBlockReportList',
          value: function isInBlockReportList(s, k, v) {
            if ('*' in this.blockReportList) {
              return true;
            } else if (s in this.blockReportList) {
              var keyList = this.blockReportList[s];
              if (keyList === '*') {
                return true;
              } else if (k in keyList) {
                var valueList = keyList[k];
                if (valueList === '*') {
                  return true;
                } else if (v in valueList) {
                  return true;
                }
              }
              return false;
            }
          }
        }, {
          key: 'sendTelemetry',
          value: function sendTelemetry() {
            if (Object.keys(this.blocked.value).length > 0) {
              var payl = CliqzAttrack.generateAttrackPayload(this.blocked.value);
              telemetry.telemetry({ 'type': telemetry.msgType, 'action': 'attrack.blocked', 'payload': payl });
              // reset the state
              this.blocked.clear();
            }
          }
        }]);

        return BlockLog;
      })();

      _default = (function () {
        function _default(qsWhitelist) {
          _classCallCheck(this, _default);

          this.blockLog = new BlockLog();
          this.tokenDomain = new TokenDomain();
          this.checkedToken = new persist.LazyPersistentObject('checkedToken');
          this.blockedToken = new persist.LazyPersistentObject('blockedToken');
          this.loadedPage = new persist.LazyPersistentObject('loadedPage');
          this.currentHour = datetime.getTime();
          this._updated = {};
          this.qsWhitelist = qsWhitelist;
        }

        _createClass(_default, [{
          key: 'init',
          value: function init() {
            var _this = this;

            this.blockLog.init();
            this.tokenDomain.init();

            events.sub('attrack:hour_changed', function () {
              _this.currentHour = datetime.getTime();
              _this._clean();
              _this.sendTelemetry();
            });
            events.sub('attrack:token_whitelist_updated', function () {
              _this.checkWrongToken('token');
            });
            events.sub('attrack:safekeys_updated', function () {
              _this.checkWrongToken('safeKey');
            });

            this.checkedToken.load();
            this.blockedToken.load();
            this.loadedPage.load();

            this.saveBlocklog = (function () {
              this.checkedToken.save();
              this.blockedToken.save();
              this.loadedPage.save();
              this.tokenDomain._tokenDomain.save();
              this.blockLog.blocked.save();
              this.blockLog.localBlocked.save();
            }).bind(this);
            this._pmTask = pacemaker.register(this.saveBlocklog, 1000 * 60 * 5);
          }
        }, {
          key: 'destroy',
          value: function destroy() {
            pacemaker.deregister(this._pmTask);
            this.blockLog.destroy();
          }
        }, {
          key: 'incrementCheckedTokens',
          value: function incrementCheckedTokens() {
            this._incrementPersistentValue(this.checkedToken, 1);
          }
        }, {
          key: 'incrementBlockedTokens',
          value: function incrementBlockedTokens(nBlocked) {
            this._incrementPersistentValue(this.blockedToken, nBlocked);
          }
        }, {
          key: 'incrementLoadedPages',
          value: function incrementLoadedPages() {
            this._incrementPersistentValue(this.loadedPage, 1);
          }
        }, {
          key: '_incrementPersistentValue',
          value: function _incrementPersistentValue(v, n) {
            var hour = this.currentHour;
            if (!(hour in v.value)) {
              v.value[hour] = 0;
            }
            v.value[hour] += n;
            v.setDirty();
          }
        }, {
          key: 'sendTelemetry',
          value: function sendTelemetry() {
            this.blockLog.sendTelemetry();
          }
        }, {
          key: 'checkWrongToken',
          value: function checkWrongToken(key) {
            this._clean();
            // send max one time a day
            var day = datetime.getTime().slice(0, 8),
                wrongTokenLastSent = persist.getValue('wrongTokenLastSent', datetime.getTime().slice(0, 8));
            if (wrongTokenLastSent === day) {
              return; // max one signal per day
            }
            this._updated[key] = true;
            if (!('safeKey' in this._updated) || !('token' in this._updated)) {
              return; // wait until both lists are updated
            }
            var countLoadedPage = 0,
                countCheckedToken = 0,
                countBlockedToken = 0,
                countWrongToken = 0,
                countWrongPage = 0;

            var localBlocked = this.blockLog.localBlocked.value;
            for (var source in localBlocked) {
              var _wrongSource = true;
              for (var s in localBlocked[source]) {
                for (var k in localBlocked[source][s]) {
                  for (var v in localBlocked[source][s][k]) {
                    if (!this.qsWhitelist.isTrackerDomain(s) || this.qsWhitelist.isSafeKey(s, k) || this.qsWhitelist.isSafeToken(s, v)) {
                      for (var h in localBlocked[source][s][k][v]) {
                        countWrongToken += localBlocked[source][s][k][v][h];
                        localBlocked[source][s][k][v][h] = 0;
                      }
                      this.blockLog.localBlocked.setDirty();
                    } else {
                      _wrongSource = false;
                    }
                  }
                }
              }
              if (_wrongSource) {
                countWrongPage++;
              }
            }

            // send signal
            // sum checkedToken & blockedToken
            for (var h in this.checkedToken.value) {
              countCheckedToken += this.checkedToken.value[h];
            }
            for (var h in this.blockedToken.value) {
              countBlockedToken += this.blockedToken.value[h];
            }
            for (var h in this.loadedPage.value) {
              countLoadedPage += this.loadedPage.value[h];
            }

            var data = {
              'wrongToken': countWrongPage,
              'checkedToken': countCheckedToken,
              'blockedToken': countBlockedToken,
              'wrongPage': countWrongPage,
              'loadedPage': countLoadedPage
            };
            var payl = CliqzAttrack.generateAttrackPayload(data, wrongTokenLastSent);
            telemetry.telemetry({ 'type': telemetry.msgType, 'action': 'attrack.FP', 'payload': payl });
            persist.setValue('wrongTokenLastSent', day);
            this._updated = {};
          }
        }, {
          key: 'clear',
          value: function clear() {
            this.blockLog.clear();
            this.tokenDomain.clear();
            this.checkedToken.clear();
            this.blockedToken.clear();
            this.loadedPage.clear();
          }
        }, {
          key: '_clean',
          value: function _clean() {
            var delay = 24,
                hour = datetime.newUTCDate();
            hour.setHours(hour.getHours() - delay);
            var hourCutoff = datetime.hourString(hour);

            this.blockLog._cleanLocalBlocked(hourCutoff);
            // checkedToken
            for (var h in this.checkedToken.value) {
              if (h < hourCutoff) {
                delete this.checkedToken.value[h];
              }
            }
            for (var h in this.loadedPage.value) {
              if (h < hourCutoff) {
                delete this.loadedPage.value[h];
              }
            }

            this.checkedToken.setDirty();
            this.loadedPage.setDirty();

            this.tokenDomain.clean();
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9ibG9jay1sb2cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O2lHQVNNLFdBQVcsRUFFWCxXQUFXLEVBOENYLFFBQVE7Ozs7Ozs7Ozs7Ozs7O3lCQXRETCxLQUFLOzBCQUFFLE1BQU07Ozs7Ozs7Ozs7O0FBTWhCLGlCQUFXLEdBQUcsQ0FBQzs7QUFFZixpQkFBVztBQUVKLGlCQUZQLFdBQVcsR0FFRDtnQ0FGVixXQUFXOztBQUdiLGNBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDckU7O3FCQUpHLFdBQVc7O2lCQU1YLGdCQUFHO0FBQ0wsZ0JBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7V0FDMUI7OztpQkFFbUIsOEJBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRTtBQUN0QyxnQkFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ25DLGtCQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDckM7QUFDRCxnQkFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0UsZ0JBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7V0FDOUI7OztpQkFFdUIsa0NBQUMsS0FBSyxFQUFFO0FBQzlCLG1CQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO1dBQ2pFOzs7aUJBRUksaUJBQUc7QUFDTixnQkFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFD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SUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtBQUNuQyxrQkFBSSxDQUFDLEdBQUcsVUFBVSxFQUFFO0FBQ2xCLHVCQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2VBQ2pDO2FBQ0Y7O0FBRUQsZ0JBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDN0IsZ0JBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7O0FBRTNCLGdCQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1dBQzFCIiwiZmlsZSI6ImFudGl0cmFja2luZy9ibG9jay1sb2cuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwZXJzaXN0IGZyb20gJ2FudGl0cmFja2luZy9wZXJzaXN0ZW50LXN0YXRlJztcbmltcG9ydCBwYWNlbWFrZXIgZnJvbSAnYW50aXRyYWNraW5nL3BhY2VtYWtlcic7XG5pbXBvcnQgbWQ1IGZyb20gJ2FudGl0cmFja2luZy9tZDUnO1xuaW1wb3J0IHsgdXRpbHMsIGV2ZW50cyB9IGZyb20gJ2NvcmUvY2xpcXonO1xuaW1wb3J0ICogYXMgZGF0ZXRpbWUgZnJvbSAnYW50aXRyYWNraW5nL3RpbWUnO1xuaW1wb3J0IENsaXF6QXR0cmFjayBmcm9tICdhbnRpdHJhY2tpbmcvYXR0cmFjayc7XG5pbXBvcnQgdGVsZW1ldHJ5IGZyb20gJ2FudGl0cmFja2luZy90ZWxlbWV0cnknO1xuaW1wb3J0IFJlc291cmNlTG9hZGVyIGZyb20gJ2NvcmUvcmVzb3VyY2UtbG9hZGVyJztcblxuY29uc3QgREFZU19FWFBJUkUgPSA3O1xuXG5jbGFzcyBUb2tlbkRvbWFpbiB7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fdG9rZW5Eb21haW4gPSBuZXcgcGVyc2lzdC5MYXp5UGVyc2lzdGVudE9iamVjdCgndG9rZW5Eb21haW4nKTtcbiAgfVxuXG4gIGluaXQoKSB7XG4gICAgdGhpcy5fdG9rZW5Eb21haW4ubG9hZCgpO1xuICB9XG5cbiAgYWRkVG9rZW5PbkZpcnN0UGFydHkodG9rZW4sIGZpcnN0UGFydHkpIHtcbiAgICBpZiAoIXRoaXMuX3Rva2VuRG9tYWluLnZhbHVlW3Rva2VuXSkge1xuICAgICAgdGhpcy5fdG9rZW5Eb21haW4udmFsdWVbdG9rZW5dID0ge307XG4gICAgfVxuICAgIHRoaXMuX3Rva2VuRG9tYWluLnZhbHVlW3Rva2VuXVtmaXJzdFBhcnR5XSA9IGRhdGV0aW1lLmdldFRpbWUoKS5zdWJzdHIoMCwgOCk7XG4gICAgdGhpcy5fdG9rZW5Eb21haW4uc2V0RGlydHkoKTtcbiAgfVxuXG4gIGdldE5GaXJzdFBhcnRpZXNGb3JUb2tlbih0b2tlbikge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90b2tlbkRvbWFpbi52YWx1ZVt0b2tlbl0gfHwge30pLmxlbmd0aDtcbiAgfVxuXG4gIGNsZWFuKCkge1xuICAgIHZhciBkYXkgPSBkYXRldGltZS5uZXdVVENEYXRlKCk7XG4gICAgICAgIGRheS5zZXREYXRlKGRheS5nZXREYXRlKCkgLSBEQVlTX0VYUElSRSk7XG4gICAgdmFyIGRheUN1dG9mZiA9IGRhdGV0aW1lLmRhdGVTdHJpbmcoZGF5KSxcbiAgICAgICAgdGQgPSB0aGlzLl90b2tlbkRvbWFpbi52YWx1ZTtcbiAgICBmb3IgKHZhciB0b2sgaW4gdGQpIHtcbiAgICAgIGZvciAodmFyIHMgaW4gdGRbdG9rXSkge1xuICAgICAgICBpZiAodGRbdG9rXVtzXSA8IGRheUN1dG9mZikge1xuICAgICAgICAgIGRlbGV0ZSB0ZFt0b2tdW3NdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoT2JqZWN0LmtleXModGRbdG9rXSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlbGV0ZSB0ZFt0b2tdO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl90b2tlbkRvbWFpbi5zZXREaXJ0eSgpO1xuICAgIHRoaXMuX3Rva2VuRG9tYWluLnNhdmUoKTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuX3Rva2VuRG9tYWluLmNsZWFyKCk7XG4gIH1cbn1cblxuY2xhc3MgQmxvY2tMb2cge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLlVSTF9CTE9DS19SRVBPUlRfTElTVCA9ICdodHRwczovL2Nkbi5jbGlxei5jb20vYW50aS10cmFja2luZy93aGl0ZWxpc3QvYW50aS10cmFja2luZy1yZXBvcnQtbGlzdC5qc29uJztcbiAgICB0aGlzLmJsb2NrUmVwb3J0TGlzdCA9IHt9O1xuICAgIHRoaXMuYmxvY2tlZCA9IG5ldyBwZXJzaXN0LkxhenlQZXJzaXN0ZW50T2JqZWN0KCdibG9ja2VkJyk7XG4gICAgdGhpcy5sb2NhbEJsb2NrZWQgPSBuZXcgcGVyc2lzdC5MYXp5UGVyc2lzdGVudE9iamVjdCgnbG9jYWxCbG9ja2VkJyk7XG4gICAgdGhpcy5fYmxvY2tSZXBvcnRMaXN0TG9hZGVyID0gbmV3IFJlc291cmNlTG9hZGVyKCBbJ2FudGl0cmFja2luZycsICdhbnRpLXRyYWNraW5nLXJlcG9ydC1saXN0Lmpzb24nXSwge1xuICAgICAgcmVtb3RlVVJMOiAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvd2hpdGVsaXN0L2FudGktdHJhY2tpbmctcmVwb3J0LWxpc3QuanNvbicsXG4gICAgICBjcm9uOiAyNCAqIDYwICogNjAgKiAxMDAwLFxuICAgIH0pO1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgICB0aGlzLmJsb2NrZWQubG9hZCgpO1xuICAgIHRoaXMubG9jYWxCbG9ja2VkLmxvYWQoKTtcbiAgICB0aGlzLl9ibG9ja1JlcG9ydExpc3RMb2FkZXIubG9hZCgpLnRoZW4odGhpcy5fbG9hZFJlcG9ydExpc3QuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5fYmxvY2tSZXBvcnRMaXN0TG9hZGVyLm9uVXBkYXRlKHRoaXMuX2xvYWRSZXBvcnRMaXN0LmJpbmQodGhpcykpO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLl9ibG9ja1JlcG9ydExpc3RMb2FkZXIuc3RvcCgpO1xuICB9XG5cbiAgLy8gYmxvY2tlZCArIGxvY2FsQmxvY2tlZFxuICBhZGQoc291cmNlVXJsLCB0cmFja2VyLCBrZXksIHZhbHVlLCB0eXBlKSB7XG4gICAgdmFyIHMgPSB0cmFja2VyLFxuICAgICAgICBrID0gbWQ1KGtleSksXG4gICAgICAgIHYgPSBtZDUodmFsdWUpO1xuICAgIGlmICh0aGlzLmlzSW5CbG9ja1JlcG9ydExpc3QocywgaywgdikpIHtcbiAgICAgICAgdGhpcy5fYWRkQmxvY2tlZChzLCBrLCB2LCB0eXBlKTtcbiAgICB9XG4gICAgLy8gbG9jYWwgbG9nZ2luZyBvZiBibG9ja2VkIHRva2Vuc1xuICAgIHZhciBob3VyID0gZGF0ZXRpbWUuZ2V0VGltZSgpLFxuICAgICAgICBzb3VyY2UgPSBtZDUoc291cmNlVXJsKTtcblxuICAgIHRoaXMuX2FkZExvY2FsQmxvY2tlZChzb3VyY2UsIHRyYWNrZXIsIGtleSwgdmFsdWUsIGhvdXIpO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5ibG9ja1JlcG9ydExpc3QgPSB7fTtcbiAgICB0aGlzLmJsb2NrZWQuY2xlYXIoKTtcbiAgICB0aGlzLmxvY2FsQmxvY2tlZC5jbGVhcigpO1xuICB9XG5cbiAgX2FkZEJsb2NrZWQodHJhY2tlciwga2V5LCB2YWx1ZSwgdHlwZSkge1xuICAgIHZhciBibCA9IHRoaXMuYmxvY2tlZC52YWx1ZTtcbiAgICBpZiAoISh0cmFja2VyIGluIGJsKSkge1xuICAgICAgICAgIGJsW3RyYWNrZXJdID0ge307XG4gICAgfVxuICAgIGlmICghKGtleSBpbiBibFt0cmFja2VyXSkpIHtcbiAgICAgIGJsW3RyYWNrZXJdW2tleV0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCEodmFsdWUgaW4gYmxbdHJhY2tlcl1ba2V5XSkpIHtcbiAgICAgIGJsW3RyYWNrZXJdW2tleV1bdmFsdWVdID0ge307XG4gICAgfVxuICAgIGlmICghKHR5cGUgaW4gYmxbdHJhY2tlcl1ba2V5XVt2YWx1ZV0pKSB7XG4gICAgICBibFt0cmFja2VyXVtrZXldW3ZhbHVlXVt0eXBlXSA9IDA7XG4gICAgfVxuICAgIGJsW3RyYWNrZXJdW2tleV1bdmFsdWVdW3R5cGVdKys7XG4gICAgdGhpcy5ibG9ja2VkLnNldERpcnR5KCk7XG4gIH1cblxuICBfYWRkTG9jYWxCbG9ja2VkKHNvdXJjZSwgcywgaywgdiwgaG91cikge1xuICAgIHZhciBsYiA9IHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlO1xuICAgIGlmICghKHNvdXJjZSBpbiBsYikpIHtcbiAgICAgIGxiW3NvdXJjZV0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCEocyBpbiBsYltzb3VyY2VdKSkge1xuICAgICAgbGJbc291cmNlXVtzXSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIShrIGluIGxiW3NvdXJjZV1bc10pKSB7XG4gICAgICBsYltzb3VyY2VdW3NdW2tdID0ge307XG4gICAgfVxuICAgIGlmICghKHYgaW4gbGJbc291cmNlXVtzXVtrXSkpIHtcbiAgICAgIGxiW3NvdXJjZV1bc11ba11bdl0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCEoaG91ciBpbiBsYltzb3VyY2VdW3NdW2tdW3ZdKSkge1xuICAgICAgbGJbc291cmNlXVtzXVtrXVt2XVtob3VyXSA9IDA7XG4gICAgfVxuICAgIGxiW3NvdXJjZV1bc11ba11bdl1baG91cl0rKztcbiAgICB0aGlzLmxvY2FsQmxvY2tlZC5zZXREaXJ0eSgpO1xuICB9XG5cbiAgX2NsZWFuTG9jYWxCbG9ja2VkKGhvdXJDdXRvZmYpIHtcbiAgICAvLyBsb2NhbEJsb2NrZWRcbiAgICBmb3IgKHZhciBzb3VyY2UgaW4gdGhpcy5sb2NhbEJsb2NrZWQudmFsdWUpIHtcbiAgICAgIGZvciAodmFyIHMgaW4gdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXSkge1xuICAgICAgICBmb3IgKHZhciBrIGluIHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc10pIHtcbiAgICAgICAgICBmb3IgKHZhciB2IGluIHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc11ba10pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGggaW4gdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXVtzXVtrXVt2XSkge1xuICAgICAgICAgICAgICBpZiAoaCA8IGhvdXJDdXRvZmYpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXVtzXVtrXVt2XVtoXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc11ba11bdl0pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXVtzXVtrXVt2XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc11ba10pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc11ba107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLmxvY2FsQmxvY2tlZC52YWx1ZVtzb3VyY2VdW3NdKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXVtzXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV0pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5sb2NhbEJsb2NrZWQuc2V0RGlydHkodHJ1ZSk7XG4gICAgdGhpcy5sb2NhbEJsb2NrZWQuc2F2ZSgpO1xuICB9XG5cbiAgX2xvYWRSZXBvcnRMaXN0KGxpc3QpIHtcbiAgICB0aGlzLmJsb2NrUmVwb3J0TGlzdCA9IGxpc3Q7XG4gIH1cblxuICBpc0luQmxvY2tSZXBvcnRMaXN0KHMsIGssIHYpIHtcbiAgICBpZiAoJyonIGluIHRoaXMuYmxvY2tSZXBvcnRMaXN0KSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHMgaW4gdGhpcy5ibG9ja1JlcG9ydExpc3QpIHtcbiAgICAgIGxldCBrZXlMaXN0ID0gdGhpcy5ibG9ja1JlcG9ydExpc3Rbc107XG4gICAgICBpZiAoa2V5TGlzdCA9PT0gJyonKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChrIGluIGtleUxpc3QpIHtcbiAgICAgICAgbGV0IHZhbHVlTGlzdCA9IGtleUxpc3Rba107XG4gICAgICAgIGlmICh2YWx1ZUxpc3QgPT09ICcqJykge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgaW4gdmFsdWVMaXN0KSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbiAgc2VuZFRlbGVtZXRyeSgpIHtcbiAgICBpZiAoT2JqZWN0LmtleXModGhpcy5ibG9ja2VkLnZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgcGF5bCA9IENsaXF6QXR0cmFjay5nZW5lcmF0ZUF0dHJhY2tQYXlsb2FkKHRoaXMuYmxvY2tlZC52YWx1ZSk7XG4gICAgICB0ZWxlbWV0cnkudGVsZW1ldHJ5KHsndHlwZSc6IHRlbGVtZXRyeS5tc2dUeXBlLCAnYWN0aW9uJzogJ2F0dHJhY2suYmxvY2tlZCcsICdwYXlsb2FkJzogcGF5bH0pO1xuICAgICAgLy8gcmVzZXQgdGhlIHN0YXRlXG4gICAgICB0aGlzLmJsb2NrZWQuY2xlYXIoKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBjb25zdHJ1Y3Rvcihxc1doaXRlbGlzdCkge1xuICAgIHRoaXMuYmxvY2tMb2cgPSBuZXcgQmxvY2tMb2coKTtcbiAgICB0aGlzLnRva2VuRG9tYWluID0gbmV3IFRva2VuRG9tYWluKCk7XG4gICAgdGhpcy5jaGVja2VkVG9rZW4gPSBuZXcgcGVyc2lzdC5MYXp5UGVyc2lzdGVudE9iamVjdCgnY2hlY2tlZFRva2VuJyk7XG4gICAgdGhpcy5ibG9ja2VkVG9rZW4gPSBuZXcgcGVyc2lzdC5MYXp5UGVyc2lzdGVudE9iamVjdCgnYmxvY2tlZFRva2VuJyk7XG4gICAgdGhpcy5sb2FkZWRQYWdlID0gbmV3IHBlcnNpc3QuTGF6eVBlcnNpc3RlbnRPYmplY3QoJ2xvYWRlZFBhZ2UnKTtcbiAgICB0aGlzLmN1cnJlbnRIb3VyID0gZGF0ZXRpbWUuZ2V0VGltZSgpO1xuICAgIHRoaXMuX3VwZGF0ZWQgPSB7fTtcbiAgICB0aGlzLnFzV2hpdGVsaXN0ID0gcXNXaGl0ZWxpc3Q7XG4gIH1cblxuICBpbml0KCkge1xuICAgIHRoaXMuYmxvY2tMb2cuaW5pdCgpO1xuICAgIHRoaXMudG9rZW5Eb21haW4uaW5pdCgpO1xuXG4gICAgZXZlbnRzLnN1YignYXR0cmFjazpob3VyX2NoYW5nZWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLmN1cnJlbnRIb3VyID0gZGF0ZXRpbWUuZ2V0VGltZSgpO1xuICAgICAgdGhpcy5fY2xlYW4oKTtcbiAgICAgIHRoaXMuc2VuZFRlbGVtZXRyeSgpO1xuICAgIH0pO1xuICAgIGV2ZW50cy5zdWIoJ2F0dHJhY2s6dG9rZW5fd2hpdGVsaXN0X3VwZGF0ZWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLmNoZWNrV3JvbmdUb2tlbigndG9rZW4nKTtcbiAgICB9KTtcbiAgICBldmVudHMuc3ViKCdhdHRyYWNrOnNhZmVrZXlzX3VwZGF0ZWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLmNoZWNrV3JvbmdUb2tlbignc2FmZUtleScpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5jaGVja2VkVG9rZW4ubG9hZCgpO1xuICAgIHRoaXMuYmxvY2tlZFRva2VuLmxvYWQoKTtcbiAgICB0aGlzLmxvYWRlZFBhZ2UubG9hZCgpO1xuXG4gICAgdGhpcy5zYXZlQmxvY2tsb2cgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY2hlY2tlZFRva2VuLnNhdmUoKTtcbiAgICAgIHRoaXMuYmxvY2tlZFRva2VuLnNhdmUoKTtcbiAgICAgIHRoaXMubG9hZGVkUGFnZS5zYXZlKCk7XG4gICAgICB0aGlzLnRva2VuRG9tYWluLl90b2tlbkRvbWFpbi5zYXZlKCk7XG4gICAgICB0aGlzLmJsb2NrTG9nLmJsb2NrZWQuc2F2ZSgpO1xuICAgICAgdGhpcy5ibG9ja0xvZy5sb2NhbEJsb2NrZWQuc2F2ZSgpO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9wbVRhc2sgPSBwYWNlbWFrZXIucmVnaXN0ZXIodGhpcy5zYXZlQmxvY2tsb2csIDEwMDAgKiA2MCAqIDUpO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICBwYWNlbWFrZXIuZGVyZWdpc3Rlcih0aGlzLl9wbVRhc2spO1xuICAgIHRoaXMuYmxvY2tMb2cuZGVzdHJveSgpO1xuICB9XG5cbiAgaW5jcmVtZW50Q2hlY2tlZFRva2VucygpIHtcbiAgICB0aGlzLl9pbmNyZW1lbnRQZXJzaXN0ZW50VmFsdWUodGhpcy5jaGVja2VkVG9rZW4sIDEpO1xuICB9XG5cbiAgaW5jcmVtZW50QmxvY2tlZFRva2VucyhuQmxvY2tlZCkge1xuICAgIHRoaXMuX2luY3JlbWVudFBlcnNpc3RlbnRWYWx1ZSh0aGlzLmJsb2NrZWRUb2tlbiwgbkJsb2NrZWQpO1xuICB9XG5cbiAgaW5jcmVtZW50TG9hZGVkUGFnZXMoKSB7XG4gICAgdGhpcy5faW5jcmVtZW50UGVyc2lzdGVudFZhbHVlKHRoaXMubG9hZGVkUGFnZSwgMSk7XG4gIH1cblxuICBfaW5jcmVtZW50UGVyc2lzdGVudFZhbHVlKHYsIG4pIHtcbiAgICB2YXIgaG91ciA9IHRoaXMuY3VycmVudEhvdXI7XG4gICAgaWYgKCEoaG91ciBpbiB2LnZhbHVlKSkge1xuICAgICAgdi52YWx1ZVtob3VyXSA9IDA7XG4gICAgfVxuICAgIHYudmFsdWVbaG91cl0gKz0gbjtcbiAgICB2LnNldERpcnR5KCk7XG4gIH1cblxuICBzZW5kVGVsZW1ldHJ5KCkge1xuICAgIHRoaXMuYmxvY2tMb2cuc2VuZFRlbGVtZXRyeSgpO1xuICB9XG5cbiAgY2hlY2tXcm9uZ1Rva2VuKGtleSkge1xuICAgIHRoaXMuX2NsZWFuKCk7XG4gICAgLy8gc2VuZCBtYXggb25lIHRpbWUgYSBkYXlcbiAgICB2YXIgZGF5ID0gZGF0ZXRpbWUuZ2V0VGltZSgpLnNsaWNlKDAsIDgpLFxuICAgICAgd3JvbmdUb2tlbkxhc3RTZW50ID0gcGVyc2lzdC5nZXRWYWx1ZSgnd3JvbmdUb2tlbkxhc3RTZW50JywgZGF0ZXRpbWUuZ2V0VGltZSgpLnNsaWNlKDAsIDgpKTtcbiAgICBpZiAod3JvbmdUb2tlbkxhc3RTZW50ID09PSBkYXkpIHtcbiAgICAgIHJldHVybjsgIC8vIG1heCBvbmUgc2lnbmFsIHBlciBkYXlcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlZFtrZXldID0gdHJ1ZTtcbiAgICBpZiAoISgnc2FmZUtleScgaW4gdGhpcy5fdXBkYXRlZCkgfHwgKCEoJ3Rva2VuJyBpbiB0aGlzLl91cGRhdGVkKSkpIHtcbiAgICAgIHJldHVybjsgIC8vIHdhaXQgdW50aWwgYm90aCBsaXN0cyBhcmUgdXBkYXRlZFxuICAgIH1cbiAgICB2YXIgY291bnRMb2FkZWRQYWdlID0gMCxcbiAgICAgICAgY291bnRDaGVja2VkVG9rZW4gPSAwLFxuICAgICAgICBjb3VudEJsb2NrZWRUb2tlbiA9IDAsXG4gICAgICAgIGNvdW50V3JvbmdUb2tlbiA9IDAsXG4gICAgICAgIGNvdW50V3JvbmdQYWdlID0gMDtcblxuICAgIHZhciBsb2NhbEJsb2NrZWQgPSB0aGlzLmJsb2NrTG9nLmxvY2FsQmxvY2tlZC52YWx1ZTtcbiAgICBmb3IgKHZhciBzb3VyY2UgaW4gbG9jYWxCbG9ja2VkKSB7XG4gICAgICB2YXIgX3dyb25nU291cmNlID0gdHJ1ZTtcbiAgICAgIGZvciAodmFyIHMgaW4gbG9jYWxCbG9ja2VkW3NvdXJjZV0pIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBsb2NhbEJsb2NrZWRbc291cmNlXVtzXSkge1xuICAgICAgICAgIGZvciAodmFyIHYgaW4gbG9jYWxCbG9ja2VkW3NvdXJjZV1bc11ba10pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5xc1doaXRlbGlzdC5pc1RyYWNrZXJEb21haW4ocykgfHxcbiAgICAgICAgICAgICAgdGhpcy5xc1doaXRlbGlzdC5pc1NhZmVLZXkocywgaykgfHxcbiAgICAgICAgICAgICAgdGhpcy5xc1doaXRlbGlzdC5pc1NhZmVUb2tlbihzLCB2KSkge1xuICAgICAgICAgICAgICBmb3IgKGxldCBoIGluIGxvY2FsQmxvY2tlZFtzb3VyY2VdW3NdW2tdW3ZdKSB7XG4gICAgICAgICAgICAgICAgY291bnRXcm9uZ1Rva2VuICs9IGxvY2FsQmxvY2tlZFtzb3VyY2VdW3NdW2tdW3ZdW2hdO1xuICAgICAgICAgICAgICAgIGxvY2FsQmxvY2tlZFtzb3VyY2VdW3NdW2tdW3ZdW2hdID0gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0aGlzLmJsb2NrTG9nLmxvY2FsQmxvY2tlZC5zZXREaXJ0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIF93cm9uZ1NvdXJjZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKF93cm9uZ1NvdXJjZSkge1xuICAgICAgICBjb3VudFdyb25nUGFnZSsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNlbmQgc2lnbmFsXG4gICAgLy8gc3VtIGNoZWNrZWRUb2tlbiAmIGJsb2NrZWRUb2tlblxuICAgIGZvciAobGV0IGggaW4gdGhpcy5jaGVja2VkVG9rZW4udmFsdWUpIHtcbiAgICAgIGNvdW50Q2hlY2tlZFRva2VuICs9IHRoaXMuY2hlY2tlZFRva2VuLnZhbHVlW2hdO1xuICAgIH1cbiAgICBmb3IgKGxldCBoIGluIHRoaXMuYmxvY2tlZFRva2VuLnZhbHVlKSB7XG4gICAgICBjb3VudEJsb2NrZWRUb2tlbiArPSB0aGlzLmJsb2NrZWRUb2tlbi52YWx1ZVtoXTtcbiAgICB9XG4gICAgZm9yIChsZXQgaCBpbiB0aGlzLmxvYWRlZFBhZ2UudmFsdWUpIHtcbiAgICAgIGNvdW50TG9hZGVkUGFnZSArPSB0aGlzLmxvYWRlZFBhZ2UudmFsdWVbaF07XG4gICAgfVxuXG4gICAgdmFyIGRhdGEgPSB7XG4gICAgICAnd3JvbmdUb2tlbic6IGNvdW50V3JvbmdQYWdlLFxuICAgICAgJ2NoZWNrZWRUb2tlbic6IGNvdW50Q2hlY2tlZFRva2VuLFxuICAgICAgJ2Jsb2NrZWRUb2tlbic6IGNvdW50QmxvY2tlZFRva2VuLFxuICAgICAgJ3dyb25nUGFnZSc6IGNvdW50V3JvbmdQYWdlLFxuICAgICAgJ2xvYWRlZFBhZ2UnOiBjb3VudExvYWRlZFBhZ2VcbiAgICB9O1xuICAgIHZhciBwYXlsID0gQ2xpcXpBdHRyYWNrLmdlbmVyYXRlQXR0cmFja1BheWxvYWQoZGF0YSwgd3JvbmdUb2tlbkxhc3RTZW50KTtcbiAgICB0ZWxlbWV0cnkudGVsZW1ldHJ5KHsndHlwZSc6IHRlbGVtZXRyeS5tc2dUeXBlLCAnYWN0aW9uJzogJ2F0dHJhY2suRlAnLCAncGF5bG9hZCc6IHBheWx9KTtcbiAgICBwZXJzaXN0LnNldFZhbHVlKCd3cm9uZ1Rva2VuTGFzdFNlbnQnLCBkYXkpO1xuICAgIHRoaXMuX3VwZGF0ZWQgPSB7fTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuYmxvY2tMb2cuY2xlYXIoKTtcbiAgICB0aGlzLnRva2VuRG9tYWluLmNsZWFyKCk7XG4gICAgdGhpcy5jaGVja2VkVG9rZW4uY2xlYXIoKTtcbiAgICB0aGlzLmJsb2NrZWRUb2tlbi5jbGVhcigpO1xuICAgIHRoaXMubG9hZGVkUGFnZS5jbGVhcigpO1xuICB9XG5cbiAgX2NsZWFuKCkge1xuICAgIHZhciBkZWxheSA9IDI0LFxuICAgICAgICBob3VyID0gZGF0ZXRpbWUubmV3VVRDRGF0ZSgpO1xuICAgIGhvdXIuc2V0SG91cnMoaG91ci5nZXRIb3VycygpIC0gZGVsYXkpO1xuICAgIHZhciBob3VyQ3V0b2ZmID0gZGF0ZXRpbWUuaG91clN0cmluZyhob3VyKTtcblxuICAgIHRoaXMuYmxvY2tMb2cuX2NsZWFuTG9jYWxCbG9ja2VkKGhvdXJDdXRvZmYpO1xuICAgIC8vIGNoZWNrZWRUb2tlblxuICAgIGZvciAobGV0IGggaW4gdGhpcy5jaGVja2VkVG9rZW4udmFsdWUpIHtcbiAgICAgIGlmIChoIDwgaG91ckN1dG9mZikge1xuICAgICAgICBkZWxldGUgdGhpcy5jaGVja2VkVG9rZW4udmFsdWVbaF07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAobGV0IGggaW4gdGhpcy5sb2FkZWRQYWdlLnZhbHVlKSB7XG4gICAgICBpZiAoaCA8IGhvdXJDdXRvZmYpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMubG9hZGVkUGFnZS52YWx1ZVtoXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNoZWNrZWRUb2tlbi5zZXREaXJ0eSgpO1xuICAgIHRoaXMubG9hZGVkUGFnZS5zZXREaXJ0eSgpO1xuXG4gICAgdGhpcy50b2tlbkRvbWFpbi5jbGVhbigpO1xuICB9XG5cbn1cbiJdfQ==