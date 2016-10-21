System.register('antitracking/block-log', ['antitracking/persistent-state', 'antitracking/pacemaker', 'antitracking/md5', 'core/cliqz', 'antitracking/time', 'antitracking/attrack', 'antitracking/telemetry', 'core/resource-loader'], function (_export) {
  'use strict';

  var persist, pacemaker, md5, events, datetime, CliqzAttrack, telemetry, ResourceLoader, DAYS_EXPIRE, TokenDomain, BlockLog, _default;

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
            var dayCutoff = datetime.dateString(day);
            var td = this._tokenDomain.value;
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
            var s = tracker;
            var k = md5(key);
            var v = md5(value);
            var hour = datetime.getTime();
            var source = md5(sourceUrl);

            if (this.isInBlockReportList(s, k, v)) {
              this._addBlocked(s, k, v, type);
            }
            // local logging of blocked tokens
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
            }
            return false;
          }
        }, {
          key: 'sendTelemetry',
          value: function sendTelemetry() {
            if (Object.keys(this.blocked.value).length > 0) {
              var payl = CliqzAttrack.generateAttrackPayload(this.blocked.value);
              telemetry.telemetry({
                type: telemetry.msgType,
                action: 'attrack.blocked',
                payload: payl
              });
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

            this.saveBlocklog = function () {
              _this.checkedToken.save();
              _this.blockedToken.save();
              _this.loadedPage.save();
              _this.tokenDomain._tokenDomain.save();
              _this.blockLog.blocked.save();
              _this.blockLog.localBlocked.save();
            };
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
            var day = datetime.getTime().slice(0, 8);
            var wrongTokenLastSent = persist.getValue('wrongTokenLastSent', datetime.getTime().slice(0, 8));
            if (wrongTokenLastSent === day) {
              return; // max one signal per day
            }
            this._updated[key] = true;
            if (!('safeKey' in this._updated) || !('token' in this._updated)) {
              return; // wait until both lists are updated
            }
            var countLoadedPage = 0;
            var countCheckedToken = 0;
            var countBlockedToken = 0;
            var countWrongToken = 0;
            var countWrongPage = 0;

            var localBlocked = this.blockLog.localBlocked.value;
            for (var source in localBlocked) {
              var wrongSource = true;
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
                      wrongSource = false;
                    }
                  }
                }
              }
              if (wrongSource) {
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
              wrongToken: countWrongPage,
              checkedToken: countCheckedToken,
              blockedToken: countBlockedToken,
              wrongPage: countWrongPage,
              loadedPage: countLoadedPage
            };
            var payl = CliqzAttrack.generateAttrackPayload(data, wrongTokenLastSent);
            telemetry.telemetry({
              type: telemetry.msgType,
              action: 'attrack.FP',
              payload: payl
            });
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
            var delay = 24;
            var hour = datetime.newUTCDate();
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