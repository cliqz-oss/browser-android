System.register('antitracking/block-log', ['antitracking/persistent-state', 'antitracking/pacemaker', 'antitracking/md5', 'core/cliqz', 'antitracking/time', 'antitracking/attrack', 'antitracking/telemetry'], function (_export) {
  'use strict';

  var persist, pacemaker, md5, utils, events, datetime, CliqzAttrack, telemetry, DAYS_EXPIRE, TokenDomain, BlockLog, _default;

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
        }

        _createClass(BlockLog, [{
          key: 'init',
          value: function init() {
            this.blocked.load();
            this.localBlocked.load();
            this._loadReportList();
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
          value: function _loadReportList() {
            utils.loadResource(this.URL_BLOCK_REPORT_LIST, (function (req) {
              try {
                this.blockReportList = JSON.parse(req.response);
              } catch (e) {
                this.blockReportList = {};
              }
            }).bind(this));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9ibG9jay1sb2cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O2lGQVFNLFdBQVcsRUFFWCxXQUFXLEVBOENYLFFBQVE7Ozs7Ozs7Ozs7Ozs7O3lCQXJETCxLQUFLOzBCQUFFLE1BQU07Ozs7Ozs7OztBQUtoQixpQkFBVyxHQUFHLENBQUM7O0FBRWYsaUJBQVc7QUFFSixpQkFGUCxXQUFXLEdBRUQ7Z0NBRlYsV0FBVzs7QUFHYixjQUFJLENBQUMsWUFBWSxHQUFHLElBQUksT0FBTyxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ3JFOztxQkFKRyxXQUFXOztpQkFNWCxnQkFBRztBQUNMLGdCQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1dBQzFCOzs7aUJBRW1CLDhCQUFDLEtBQUssRUFBRSxVQUFVLEVBQUU7QUFDdEMsZ0JBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUNuQyxrQkFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQ3JDO0FBQ0QsZ0JBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzdFLGdCQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1dBQzlCOzs7aUJBRXVCLGtDQUFDLEtBQUssRUFBRTtBQUM5QixtQkFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztXQUNqRTs7O2lCQUVJLGlCQUFHO0FBQ04sZ0JBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztB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Q0FBQyxLQUFLLEVBQUU7QUFDMUMsbUJBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDN0MscUJBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDaEQsdUJBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDbkQseUJBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDdEQsMEJBQUksQ0FBQyxHQUFHLFVBQVUsRUFBRTtBQUNsQiwrQkFBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt1QkFDcEQ7cUJBQ0Y7QUFDRCx3QkFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUN0RSw2QkFBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDakQ7bUJBQ0Y7QUFDRCxzQkFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FB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Qzs7QUFFM0IsZ0JBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7V0FDMUIiLCJmaWxlIjoiYW50aXRyYWNraW5nL2Jsb2NrLWxvZy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBlcnNpc3QgZnJvbSAnYW50aXRyYWNraW5nL3BlcnNpc3RlbnQtc3RhdGUnO1xuaW1wb3J0IHBhY2VtYWtlciBmcm9tICdhbnRpdHJhY2tpbmcvcGFjZW1ha2VyJztcbmltcG9ydCBtZDUgZnJvbSAnYW50aXRyYWNraW5nL21kNSc7XG5pbXBvcnQgeyB1dGlscywgZXZlbnRzIH0gZnJvbSAnY29yZS9jbGlxeic7XG5pbXBvcnQgKiBhcyBkYXRldGltZSBmcm9tICdhbnRpdHJhY2tpbmcvdGltZSc7XG5pbXBvcnQgQ2xpcXpBdHRyYWNrIGZyb20gJ2FudGl0cmFja2luZy9hdHRyYWNrJztcbmltcG9ydCB0ZWxlbWV0cnkgZnJvbSAnYW50aXRyYWNraW5nL3RlbGVtZXRyeSc7XG5cbmNvbnN0IERBWVNfRVhQSVJFID0gNztcblxuY2xhc3MgVG9rZW5Eb21haW4ge1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX3Rva2VuRG9tYWluID0gbmV3IHBlcnNpc3QuTGF6eVBlcnNpc3RlbnRPYmplY3QoJ3Rva2VuRG9tYWluJyk7XG4gIH1cblxuICBpbml0KCkge1xuICAgIHRoaXMuX3Rva2VuRG9tYWluLmxvYWQoKTtcbiAgfVxuXG4gIGFkZFRva2VuT25GaXJzdFBhcnR5KHRva2VuLCBmaXJzdFBhcnR5KSB7XG4gICAgaWYgKCF0aGlzLl90b2tlbkRvbWFpbi52YWx1ZVt0b2tlbl0pIHtcbiAgICAgIHRoaXMuX3Rva2VuRG9tYWluLnZhbHVlW3Rva2VuXSA9IHt9O1xuICAgIH1cbiAgICB0aGlzLl90b2tlbkRvbWFpbi52YWx1ZVt0b2tlbl1bZmlyc3RQYXJ0eV0gPSBkYXRldGltZS5nZXRUaW1lKCkuc3Vic3RyKDAsIDgpO1xuICAgIHRoaXMuX3Rva2VuRG9tYWluLnNldERpcnR5KCk7XG4gIH1cblxuICBnZXRORmlyc3RQYXJ0aWVzRm9yVG9rZW4odG9rZW4pIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdG9rZW5Eb21haW4udmFsdWVbdG9rZW5dIHx8IHt9KS5sZW5ndGg7XG4gIH1cblxuICBjbGVhbigpIHtcbiAgICB2YXIgZGF5ID0gZGF0ZXRpbWUubmV3VVRDRGF0ZSgpO1xuICAgICAgICBkYXkuc2V0RGF0ZShkYXkuZ2V0RGF0ZSgpIC0gREFZU19FWFBJUkUpO1xuICAgIHZhciBkYXlDdXRvZmYgPSBkYXRldGltZS5kYXRlU3RyaW5nKGRheSksXG4gICAgICAgIHRkID0gdGhpcy5fdG9rZW5Eb21haW4udmFsdWU7XG4gICAgZm9yICh2YXIgdG9rIGluIHRkKSB7XG4gICAgICBmb3IgKHZhciBzIGluIHRkW3Rva10pIHtcbiAgICAgICAgaWYgKHRkW3Rva11bc10gPCBkYXlDdXRvZmYpIHtcbiAgICAgICAgICBkZWxldGUgdGRbdG9rXVtzXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKE9iamVjdC5rZXlzKHRkW3Rva10pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWxldGUgdGRbdG9rXTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fdG9rZW5Eb21haW4uc2V0RGlydHkoKTtcbiAgICB0aGlzLl90b2tlbkRvbWFpbi5zYXZlKCk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLl90b2tlbkRvbWFpbi5jbGVhcigpO1xuICB9XG59XG5cbmNsYXNzIEJsb2NrTG9nIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5VUkxfQkxPQ0tfUkVQT1JUX0xJU1QgPSAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvd2hpdGVsaXN0L2FudGktdHJhY2tpbmctcmVwb3J0LWxpc3QuanNvbic7XG4gICAgdGhpcy5ibG9ja1JlcG9ydExpc3QgPSB7fTtcbiAgICB0aGlzLmJsb2NrZWQgPSBuZXcgcGVyc2lzdC5MYXp5UGVyc2lzdGVudE9iamVjdCgnYmxvY2tlZCcpO1xuICAgIHRoaXMubG9jYWxCbG9ja2VkID0gbmV3IHBlcnNpc3QuTGF6eVBlcnNpc3RlbnRPYmplY3QoJ2xvY2FsQmxvY2tlZCcpO1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgICB0aGlzLmJsb2NrZWQubG9hZCgpO1xuICAgIHRoaXMubG9jYWxCbG9ja2VkLmxvYWQoKTtcbiAgICB0aGlzLl9sb2FkUmVwb3J0TGlzdCgpO1xuICB9XG5cbiAgLy8gYmxvY2tlZCArIGxvY2FsQmxvY2tlZFxuICBhZGQoc291cmNlVXJsLCB0cmFja2VyLCBrZXksIHZhbHVlLCB0eXBlKSB7XG4gICAgdmFyIHMgPSB0cmFja2VyLFxuICAgICAgICBrID0gbWQ1KGtleSksXG4gICAgICAgIHYgPSBtZDUodmFsdWUpO1xuICAgIGlmICh0aGlzLmlzSW5CbG9ja1JlcG9ydExpc3QocywgaywgdikpIHtcbiAgICAgICAgdGhpcy5fYWRkQmxvY2tlZChzLCBrLCB2LCB0eXBlKTtcbiAgICB9XG4gICAgLy8gbG9jYWwgbG9nZ2luZyBvZiBibG9ja2VkIHRva2Vuc1xuICAgIHZhciBob3VyID0gZGF0ZXRpbWUuZ2V0VGltZSgpLFxuICAgICAgICBzb3VyY2UgPSBtZDUoc291cmNlVXJsKTtcblxuICAgIHRoaXMuX2FkZExvY2FsQmxvY2tlZChzb3VyY2UsIHRyYWNrZXIsIGtleSwgdmFsdWUsIGhvdXIpO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5ibG9ja1JlcG9ydExpc3QgPSB7fTtcbiAgICB0aGlzLmJsb2NrZWQuY2xlYXIoKTtcbiAgICB0aGlzLmxvY2FsQmxvY2tlZC5jbGVhcigpO1xuICB9XG5cbiAgX2FkZEJsb2NrZWQodHJhY2tlciwga2V5LCB2YWx1ZSwgdHlwZSkge1xuICAgIHZhciBibCA9IHRoaXMuYmxvY2tlZC52YWx1ZTtcbiAgICBpZiAoISh0cmFja2VyIGluIGJsKSkge1xuICAgICAgICAgIGJsW3RyYWNrZXJdID0ge307XG4gICAgfVxuICAgIGlmICghKGtleSBpbiBibFt0cmFja2VyXSkpIHtcbiAgICAgIGJsW3RyYWNrZXJdW2tleV0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCEodmFsdWUgaW4gYmxbdHJhY2tlcl1ba2V5XSkpIHtcbiAgICAgIGJsW3RyYWNrZXJdW2tleV1bdmFsdWVdID0ge307XG4gICAgfVxuICAgIGlmICghKHR5cGUgaW4gYmxbdHJhY2tlcl1ba2V5XVt2YWx1ZV0pKSB7XG4gICAgICBibFt0cmFja2VyXVtrZXldW3ZhbHVlXVt0eXBlXSA9IDA7XG4gICAgfVxuICAgIGJsW3RyYWNrZXJdW2tleV1bdmFsdWVdW3R5cGVdKys7XG4gICAgdGhpcy5ibG9ja2VkLnNldERpcnR5KCk7XG4gIH1cblxuICBfYWRkTG9jYWxCbG9ja2VkKHNvdXJjZSwgcywgaywgdiwgaG91cikge1xuICAgIHZhciBsYiA9IHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlO1xuICAgIGlmICghKHNvdXJjZSBpbiBsYikpIHtcbiAgICAgIGxiW3NvdXJjZV0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCEocyBpbiBsYltzb3VyY2VdKSkge1xuICAgICAgbGJbc291cmNlXVtzXSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIShrIGluIGxiW3NvdXJjZV1bc10pKSB7XG4gICAgICBsYltzb3VyY2VdW3NdW2tdID0ge307XG4gICAgfVxuICAgIGlmICghKHYgaW4gbGJbc291cmNlXVtzXVtrXSkpIHtcbiAgICAgIGxiW3NvdXJjZV1bc11ba11bdl0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCEoaG91ciBpbiBsYltzb3VyY2VdW3NdW2tdW3ZdKSkge1xuICAgICAgbGJbc291cmNlXVtzXVtrXVt2XVtob3VyXSA9IDA7XG4gICAgfVxuICAgIGxiW3NvdXJjZV1bc11ba11bdl1baG91cl0rKztcbiAgICB0aGlzLmxvY2FsQmxvY2tlZC5zZXREaXJ0eSgpO1xuICB9XG5cbiAgX2NsZWFuTG9jYWxCbG9ja2VkKGhvdXJDdXRvZmYpIHtcbiAgICAvLyBsb2NhbEJsb2NrZWRcbiAgICBmb3IgKHZhciBzb3VyY2UgaW4gdGhpcy5sb2NhbEJsb2NrZWQudmFsdWUpIHtcbiAgICAgIGZvciAodmFyIHMgaW4gdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXSkge1xuICAgICAgICBmb3IgKHZhciBrIGluIHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc10pIHtcbiAgICAgICAgICBmb3IgKHZhciB2IGluIHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc11ba10pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGggaW4gdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXVtzXVtrXVt2XSkge1xuICAgICAgICAgICAgICBpZiAoaCA8IGhvdXJDdXRvZmYpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXVtzXVtrXVt2XVtoXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc11ba11bdl0pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXVtzXVtrXVt2XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc11ba10pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV1bc11ba107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLmxvY2FsQmxvY2tlZC52YWx1ZVtzb3VyY2VdW3NdKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXVtzXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMubG9jYWxCbG9ja2VkLnZhbHVlW3NvdXJjZV0pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWxldGUgdGhpcy5sb2NhbEJsb2NrZWQudmFsdWVbc291cmNlXTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5sb2NhbEJsb2NrZWQuc2V0RGlydHkodHJ1ZSk7XG4gICAgdGhpcy5sb2NhbEJsb2NrZWQuc2F2ZSgpO1xuICB9XG5cbiAgX2xvYWRSZXBvcnRMaXN0KCkge1xuICAgIHV0aWxzLmxvYWRSZXNvdXJjZSh0aGlzLlVSTF9CTE9DS19SRVBPUlRfTElTVCwgZnVuY3Rpb24ocmVxKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLmJsb2NrUmVwb3J0TGlzdCA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICB0aGlzLmJsb2NrUmVwb3J0TGlzdCA9IHt9O1xuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICBpc0luQmxvY2tSZXBvcnRMaXN0KHMsIGssIHYpIHtcbiAgICBpZiAoJyonIGluIHRoaXMuYmxvY2tSZXBvcnRMaXN0KSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHMgaW4gdGhpcy5ibG9ja1JlcG9ydExpc3QpIHtcbiAgICAgIGxldCBrZXlMaXN0ID0gdGhpcy5ibG9ja1JlcG9ydExpc3Rbc107XG4gICAgICBpZiAoa2V5TGlzdCA9PT0gJyonKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChrIGluIGtleUxpc3QpIHtcbiAgICAgICAgbGV0IHZhbHVlTGlzdCA9IGtleUxpc3Rba107XG4gICAgICAgIGlmICh2YWx1ZUxpc3QgPT09ICcqJykge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgaW4gdmFsdWVMaXN0KSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbiAgc2VuZFRlbGVtZXRyeSgpIHtcbiAgICBpZiAoT2JqZWN0LmtleXModGhpcy5ibG9ja2VkLnZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgcGF5bCA9IENsaXF6QXR0cmFjay5nZW5lcmF0ZUF0dHJhY2tQYXlsb2FkKHRoaXMuYmxvY2tlZC52YWx1ZSk7XG4gICAgICB0ZWxlbWV0cnkudGVsZW1ldHJ5KHsndHlwZSc6IHRlbGVtZXRyeS5tc2dUeXBlLCAnYWN0aW9uJzogJ2F0dHJhY2suYmxvY2tlZCcsICdwYXlsb2FkJzogcGF5bH0pO1xuICAgICAgLy8gcmVzZXQgdGhlIHN0YXRlXG4gICAgICB0aGlzLmJsb2NrZWQuY2xlYXIoKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBjb25zdHJ1Y3Rvcihxc1doaXRlbGlzdCkge1xuICAgIHRoaXMuYmxvY2tMb2cgPSBuZXcgQmxvY2tMb2coKTtcbiAgICB0aGlzLnRva2VuRG9tYWluID0gbmV3IFRva2VuRG9tYWluKCk7XG4gICAgdGhpcy5jaGVja2VkVG9rZW4gPSBuZXcgcGVyc2lzdC5MYXp5UGVyc2lzdGVudE9iamVjdCgnY2hlY2tlZFRva2VuJyk7XG4gICAgdGhpcy5ibG9ja2VkVG9rZW4gPSBuZXcgcGVyc2lzdC5MYXp5UGVyc2lzdGVudE9iamVjdCgnYmxvY2tlZFRva2VuJyk7XG4gICAgdGhpcy5sb2FkZWRQYWdlID0gbmV3IHBlcnNpc3QuTGF6eVBlcnNpc3RlbnRPYmplY3QoJ2xvYWRlZFBhZ2UnKTtcbiAgICB0aGlzLmN1cnJlbnRIb3VyID0gZGF0ZXRpbWUuZ2V0VGltZSgpO1xuICAgIHRoaXMuX3VwZGF0ZWQgPSB7fTtcbiAgICB0aGlzLnFzV2hpdGVsaXN0ID0gcXNXaGl0ZWxpc3Q7XG4gIH1cblxuICBpbml0KCkge1xuICAgIHRoaXMuYmxvY2tMb2cuaW5pdCgpO1xuICAgIHRoaXMudG9rZW5Eb21haW4uaW5pdCgpO1xuXG4gICAgZXZlbnRzLnN1YignYXR0cmFjazpob3VyX2NoYW5nZWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLmN1cnJlbnRIb3VyID0gZGF0ZXRpbWUuZ2V0VGltZSgpO1xuICAgICAgdGhpcy5fY2xlYW4oKTtcbiAgICAgIHRoaXMuc2VuZFRlbGVtZXRyeSgpO1xuICAgIH0pO1xuICAgIGV2ZW50cy5zdWIoJ2F0dHJhY2s6dG9rZW5fd2hpdGVsaXN0X3VwZGF0ZWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLmNoZWNrV3JvbmdUb2tlbigndG9rZW4nKTtcbiAgICB9KTtcbiAgICBldmVudHMuc3ViKCdhdHRyYWNrOnNhZmVrZXlzX3VwZGF0ZWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLmNoZWNrV3JvbmdUb2tlbignc2FmZUtleScpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5jaGVja2VkVG9rZW4ubG9hZCgpO1xuICAgIHRoaXMuYmxvY2tlZFRva2VuLmxvYWQoKTtcbiAgICB0aGlzLmxvYWRlZFBhZ2UubG9hZCgpO1xuXG4gICAgdGhpcy5zYXZlQmxvY2tsb2cgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY2hlY2tlZFRva2VuLnNhdmUoKTtcbiAgICAgIHRoaXMuYmxvY2tlZFRva2VuLnNhdmUoKTtcbiAgICAgIHRoaXMubG9hZGVkUGFnZS5zYXZlKCk7XG4gICAgICB0aGlzLnRva2VuRG9tYWluLl90b2tlbkRvbWFpbi5zYXZlKCk7XG4gICAgICB0aGlzLmJsb2NrTG9nLmJsb2NrZWQuc2F2ZSgpO1xuICAgICAgdGhpcy5ibG9ja0xvZy5sb2NhbEJsb2NrZWQuc2F2ZSgpO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgICB0aGlzLl9wbVRhc2sgPSBwYWNlbWFrZXIucmVnaXN0ZXIodGhpcy5zYXZlQmxvY2tsb2csIDEwMDAgKiA2MCAqIDUpO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICBwYWNlbWFrZXIuZGVyZWdpc3Rlcih0aGlzLl9wbVRhc2spO1xuICB9XG5cbiAgaW5jcmVtZW50Q2hlY2tlZFRva2VucygpIHtcbiAgICB0aGlzLl9pbmNyZW1lbnRQZXJzaXN0ZW50VmFsdWUodGhpcy5jaGVja2VkVG9rZW4sIDEpO1xuICB9XG5cbiAgaW5jcmVtZW50QmxvY2tlZFRva2VucyhuQmxvY2tlZCkge1xuICAgIHRoaXMuX2luY3JlbWVudFBlcnNpc3RlbnRWYWx1ZSh0aGlzLmJsb2NrZWRUb2tlbiwgbkJsb2NrZWQpO1xuICB9XG5cbiAgaW5jcmVtZW50TG9hZGVkUGFnZXMoKSB7XG4gICAgdGhpcy5faW5jcmVtZW50UGVyc2lzdGVudFZhbHVlKHRoaXMubG9hZGVkUGFnZSwgMSk7XG4gIH1cblxuICBfaW5jcmVtZW50UGVyc2lzdGVudFZhbHVlKHYsIG4pIHtcbiAgICB2YXIgaG91ciA9IHRoaXMuY3VycmVudEhvdXI7XG4gICAgaWYgKCEoaG91ciBpbiB2LnZhbHVlKSkge1xuICAgICAgdi52YWx1ZVtob3VyXSA9IDA7XG4gICAgfVxuICAgIHYudmFsdWVbaG91cl0gKz0gbjtcbiAgICB2LnNldERpcnR5KCk7XG4gIH1cblxuICBzZW5kVGVsZW1ldHJ5KCkge1xuICAgIHRoaXMuYmxvY2tMb2cuc2VuZFRlbGVtZXRyeSgpO1xuICB9XG5cbiAgY2hlY2tXcm9uZ1Rva2VuKGtleSkge1xuICAgIHRoaXMuX2NsZWFuKCk7XG4gICAgLy8gc2VuZCBtYXggb25lIHRpbWUgYSBkYXlcbiAgICB2YXIgZGF5ID0gZGF0ZXRpbWUuZ2V0VGltZSgpLnNsaWNlKDAsIDgpLFxuICAgICAgd3JvbmdUb2tlbkxhc3RTZW50ID0gcGVyc2lzdC5nZXRWYWx1ZSgnd3JvbmdUb2tlbkxhc3RTZW50JywgZGF0ZXRpbWUuZ2V0VGltZSgpLnNsaWNlKDAsIDgpKTtcbiAgICBpZiAod3JvbmdUb2tlbkxhc3RTZW50ID09PSBkYXkpIHtcbiAgICAgIHJldHVybjsgIC8vIG1heCBvbmUgc2lnbmFsIHBlciBkYXlcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlZFtrZXldID0gdHJ1ZTtcbiAgICBpZiAoISgnc2FmZUtleScgaW4gdGhpcy5fdXBkYXRlZCkgfHwgKCEoJ3Rva2VuJyBpbiB0aGlzLl91cGRhdGVkKSkpIHtcbiAgICAgIHJldHVybjsgIC8vIHdhaXQgdW50aWwgYm90aCBsaXN0cyBhcmUgdXBkYXRlZFxuICAgIH1cbiAgICB2YXIgY291bnRMb2FkZWRQYWdlID0gMCxcbiAgICAgICAgY291bnRDaGVja2VkVG9rZW4gPSAwLFxuICAgICAgICBjb3VudEJsb2NrZWRUb2tlbiA9IDAsXG4gICAgICAgIGNvdW50V3JvbmdUb2tlbiA9IDAsXG4gICAgICAgIGNvdW50V3JvbmdQYWdlID0gMDtcblxuICAgIHZhciBsb2NhbEJsb2NrZWQgPSB0aGlzLmJsb2NrTG9nLmxvY2FsQmxvY2tlZC52YWx1ZTtcbiAgICBmb3IgKHZhciBzb3VyY2UgaW4gbG9jYWxCbG9ja2VkKSB7XG4gICAgICB2YXIgX3dyb25nU291cmNlID0gdHJ1ZTtcbiAgICAgIGZvciAodmFyIHMgaW4gbG9jYWxCbG9ja2VkW3NvdXJjZV0pIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBsb2NhbEJsb2NrZWRbc291cmNlXVtzXSkge1xuICAgICAgICAgIGZvciAodmFyIHYgaW4gbG9jYWxCbG9ja2VkW3NvdXJjZV1bc11ba10pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5xc1doaXRlbGlzdC5pc1RyYWNrZXJEb21haW4ocykgfHxcbiAgICAgICAgICAgICAgdGhpcy5xc1doaXRlbGlzdC5pc1NhZmVLZXkocywgaykgfHxcbiAgICAgICAgICAgICAgdGhpcy5xc1doaXRlbGlzdC5pc1NhZmVUb2tlbihzLCB2KSkge1xuICAgICAgICAgICAgICBmb3IgKGxldCBoIGluIGxvY2FsQmxvY2tlZFtzb3VyY2VdW3NdW2tdW3ZdKSB7XG4gICAgICAgICAgICAgICAgY291bnRXcm9uZ1Rva2VuICs9IGxvY2FsQmxvY2tlZFtzb3VyY2VdW3NdW2tdW3ZdW2hdO1xuICAgICAgICAgICAgICAgIGxvY2FsQmxvY2tlZFtzb3VyY2VdW3NdW2tdW3ZdW2hdID0gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0aGlzLmJsb2NrTG9nLmxvY2FsQmxvY2tlZC5zZXREaXJ0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIF93cm9uZ1NvdXJjZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKF93cm9uZ1NvdXJjZSkge1xuICAgICAgICBjb3VudFdyb25nUGFnZSsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNlbmQgc2lnbmFsXG4gICAgLy8gc3VtIGNoZWNrZWRUb2tlbiAmIGJsb2NrZWRUb2tlblxuICAgIGZvciAobGV0IGggaW4gdGhpcy5jaGVja2VkVG9rZW4udmFsdWUpIHtcbiAgICAgIGNvdW50Q2hlY2tlZFRva2VuICs9IHRoaXMuY2hlY2tlZFRva2VuLnZhbHVlW2hdO1xuICAgIH1cbiAgICBmb3IgKGxldCBoIGluIHRoaXMuYmxvY2tlZFRva2VuLnZhbHVlKSB7XG4gICAgICBjb3VudEJsb2NrZWRUb2tlbiArPSB0aGlzLmJsb2NrZWRUb2tlbi52YWx1ZVtoXTtcbiAgICB9XG4gICAgZm9yIChsZXQgaCBpbiB0aGlzLmxvYWRlZFBhZ2UudmFsdWUpIHtcbiAgICAgIGNvdW50TG9hZGVkUGFnZSArPSB0aGlzLmxvYWRlZFBhZ2UudmFsdWVbaF07XG4gICAgfVxuXG4gICAgdmFyIGRhdGEgPSB7XG4gICAgICAnd3JvbmdUb2tlbic6IGNvdW50V3JvbmdQYWdlLFxuICAgICAgJ2NoZWNrZWRUb2tlbic6IGNvdW50Q2hlY2tlZFRva2VuLFxuICAgICAgJ2Jsb2NrZWRUb2tlbic6IGNvdW50QmxvY2tlZFRva2VuLFxuICAgICAgJ3dyb25nUGFnZSc6IGNvdW50V3JvbmdQYWdlLFxuICAgICAgJ2xvYWRlZFBhZ2UnOiBjb3VudExvYWRlZFBhZ2VcbiAgICB9O1xuICAgIHZhciBwYXlsID0gQ2xpcXpBdHRyYWNrLmdlbmVyYXRlQXR0cmFja1BheWxvYWQoZGF0YSwgd3JvbmdUb2tlbkxhc3RTZW50KTtcbiAgICB0ZWxlbWV0cnkudGVsZW1ldHJ5KHsndHlwZSc6IHRlbGVtZXRyeS5tc2dUeXBlLCAnYWN0aW9uJzogJ2F0dHJhY2suRlAnLCAncGF5bG9hZCc6IHBheWx9KTtcbiAgICBwZXJzaXN0LnNldFZhbHVlKCd3cm9uZ1Rva2VuTGFzdFNlbnQnLCBkYXkpO1xuICAgIHRoaXMuX3VwZGF0ZWQgPSB7fTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuYmxvY2tMb2cuY2xlYXIoKTtcbiAgICB0aGlzLnRva2VuRG9tYWluLmNsZWFyKCk7XG4gICAgdGhpcy5jaGVja2VkVG9rZW4uY2xlYXIoKTtcbiAgICB0aGlzLmJsb2NrZWRUb2tlbi5jbGVhcigpO1xuICAgIHRoaXMubG9hZGVkUGFnZS5jbGVhcigpO1xuICB9XG5cbiAgX2NsZWFuKCkge1xuICAgIHZhciBkZWxheSA9IDI0LFxuICAgICAgICBob3VyID0gZGF0ZXRpbWUubmV3VVRDRGF0ZSgpO1xuICAgIGhvdXIuc2V0SG91cnMoaG91ci5nZXRIb3VycygpIC0gZGVsYXkpO1xuICAgIHZhciBob3VyQ3V0b2ZmID0gZGF0ZXRpbWUuaG91clN0cmluZyhob3VyKTtcblxuICAgIHRoaXMuYmxvY2tMb2cuX2NsZWFuTG9jYWxCbG9ja2VkKGhvdXJDdXRvZmYpO1xuICAgIC8vIGNoZWNrZWRUb2tlblxuICAgIGZvciAobGV0IGggaW4gdGhpcy5jaGVja2VkVG9rZW4udmFsdWUpIHtcbiAgICAgIGlmIChoIDwgaG91ckN1dG9mZikge1xuICAgICAgICBkZWxldGUgdGhpcy5jaGVja2VkVG9rZW4udmFsdWVbaF07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAobGV0IGggaW4gdGhpcy5sb2FkZWRQYWdlLnZhbHVlKSB7XG4gICAgICBpZiAoaCA8IGhvdXJDdXRvZmYpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMubG9hZGVkUGFnZS52YWx1ZVtoXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNoZWNrZWRUb2tlbi5zZXREaXJ0eSgpO1xuICAgIHRoaXMubG9hZGVkUGFnZS5zZXREaXJ0eSgpO1xuXG4gICAgdGhpcy50b2tlbkRvbWFpbi5jbGVhbigpO1xuICB9XG5cbn1cbiJdfQ==