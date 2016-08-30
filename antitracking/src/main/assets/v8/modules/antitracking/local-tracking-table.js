System.register("antitracking/local-tracking-table", ["platform/sqlite"], function (_export) {

  /** Sqlite table for collecting tracking information locally.
   */
  "use strict";

  var getDbConn, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_platformSqlite) {
      getDbConn = _platformSqlite["default"];
    }],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);

          this.dbConn = getDbConn("cliqz.dbattrack");
          if (this.dbConn && this.isEnabled()) {
            var tracking_table = "create table if not exists 'attrack_tracking' (\
              'tp' VARCHAR(16) NOT NULL,\
              'fp' VARCHAR(16) NOT NULL,\
              'key' VARCHAR(32) NOT NULL,\
              'value' VARCHAR(32) NOT NULL,\
              'count' INTEGER DEFAULT 1,\
              'lastTime' INTEGER DEFAULT 0,\
              CONSTRAINT pkey PRIMARY KEY ('tp', 'fp', 'key', 'value')\
          )";
            (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(tracking_table);
          }
        }

        _createClass(_default, [{
          key: "loadTokens",
          value: function loadTokens(tokens) {
            var now = new Date().getTime(),
                query = "INSERT OR IGNORE INTO 'attrack_tracking'\
      ('tp', 'fp', 'key', 'value', 'lastTime')\
      VALUES\
      (:tp, :fp, :key, :value, :time);\
      UPDATE 'attrack_tracking' SET\
      'count' = 'count' + 1,\
      'lastTime' = :time\
      WHERE 'tp' = :tp,\
      'fp' = :fp,\
      'key' = :key,\
      'value' = :value ;",
                stmt = this.dbConn.createStatement(query),
                params = stmt.newBindingParamsArray(),
                count = 0;

            for (var tp in tokens) {
              // skip header tokens
              if (tp.length > 16) {
                continue;
              }
              for (var fp in tokens[tp]) {
                for (var key in tokens[tp][fp]['kv']) {
                  for (var token in tokens[tp][fp]['kv'][key]) {
                    var bp = params.newBindingParams();
                    bp.bindByName("tp", tp);
                    bp.bindByName("fp", fp);
                    bp.bindByName("key", key);
                    bp.bindByName("value", token);
                    bp.bindByName("time", now);
                    params.addParams(bp);
                    count++;
                  }
                }
              }
            }
            if (count > 0) {
              CliqzUtils.log("Add " + count + " tokens for hour", "attrack");
              stmt.bindParameters(params);
              stmt.executeAsync({
                handleError: function handleError(err) {
                  CliqzUtils.log(err, "xxx");
                }
              });
            }
          }
        }, {
          key: "getTrackingOccurances",
          value: function getTrackingOccurances(cb) {
            var query = "SELECT tp, key, value, COUNT(DISTINCT fp) AS n_fp FROM attrack_tracking GROUP BY tp, key, value HAVING n_fp > 2 ORDER BY n_fp DESC",
                stmt = this.dbConn.createStatement(query);
            stmt.executeAsync({
              handleResult: function handleResult(resultSet) {
                // triple nested map
                var resultObj = [];

                var _loop = function (row) {
                  var tuple = ["tp", "key", "value", "n_fp"].map(function (col) {
                    return row.getResultByName(col);
                  });
                  resultObj.push(tuple);
                };

                for (var row = resultSet.getNextRow(); row; row = resultSet.getNextRow()) {
                  _loop(row);
                }
                cb(resultObj);
              }
            });
          }
        }, {
          key: "getTableSize",
          value: function getTableSize(cb) {
            var query = "SELECT COUNT(*) AS n FROM attrack_tracking",
                stmt = this.dbConn.createStatement(query);
            stmt.executeAsync({
              handleResult: function handleResult(resultSet) {
                cb(resultSet.getNextRow().getResultByName("n"));
              }
            });
          }
        }, {
          key: "cleanTable",
          value: function cleanTable() {
            var cutoff = new Date().getTime() - 1000 * 60 * 60 * 24 * 7; // 7 days ago

            var st = this.dbConn.createStatement("DELETE FROM attrack_tracking WHERE lastTime < :cutoff");
            st.params.cutoff = cutoff;
            st.executeAsync();
          }
        }, {
          key: "isEnabled",
          value: function isEnabled() {
            return CliqzUtils.getPref('attrack.local_tracking', false);
          }
        }]);

        return _default;
      })();

      _export("default", _default);

      ;
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9sb2NhbC10cmFja2luZy10YWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFLYSw0QkFBRzs7O0FBQ1osY0FBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMzQyxjQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFHO0FBQ3BDLGdCQUFJLGNBQWMsR0FBRzs7Ozs7Ozs7WUFRZixDQUFDO0FBQ1AsYUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUEsQ0FBRSxjQUFjLENBQUMsQ0FBQztXQUNyRjtTQUNGOzs7O2lCQUVTLG9CQUFDLE1BQU0sRUFBRTtBQUNqQixnQkFBSSxHQUFHLEdBQUcsQUFBQyxJQUFJLElBQUksRUFBRSxDQUFFLE9BQU8sRUFBRTtnQkFDNUIsS0FBSyxHQUFHOzs7Ozs7Ozs7O3lCQVVTO2dCQUNqQixJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO2dCQUN6QyxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixFQUFFO2dCQUNyQyxLQUFLLEdBQUcsQ0FBQyxDQUFDOztBQUVkLGlCQUFLLElBQUksRUFBRSxJQUFJLE1BQU0sRUFBRTs7QUFFckIsa0JBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUU7QUFDbEIseUJBQVM7ZUFDVjtBQUNELG1CQUFLLElBQUksRUFBRSxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUN6QixxQkFBSyxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDcEMsdUJBQUssSUFBSSxLQUFLLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxD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LEdBQUcsTUFBTSxDQUFDO0FBQzFCLGNBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtXQUNsQjs7O2lCQUVRLHFCQUFHO0FBQ1YsbUJBQU8sVUFBVSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztXQUM1RDs7Ozs7Ozs7QUFFRixPQUFDIiwiZmlsZSI6ImFudGl0cmFja2luZy9sb2NhbC10cmFja2luZy10YWJsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBnZXREYkNvbm4gZnJvbSAncGxhdGZvcm0vc3FsaXRlJztcblxuLyoqIFNxbGl0ZSB0YWJsZSBmb3IgY29sbGVjdGluZyB0cmFja2luZyBpbmZvcm1hdGlvbiBsb2NhbGx5LlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZGJDb25uID0gZ2V0RGJDb25uKFwiY2xpcXouZGJhdHRyYWNrXCIpO1xuICAgIGlmICh0aGlzLmRiQ29ubiAmJiB0aGlzLmlzRW5hYmxlZCgpICkge1xuICAgICAgbGV0IHRyYWNraW5nX3RhYmxlID0gXCJjcmVhdGUgdGFibGUgaWYgbm90IGV4aXN0cyAnYXR0cmFja190cmFja2luZycgKFxcXG4gICAgICAgICAgICAgICd0cCcgVkFSQ0hBUigxNikgTk9UIE5VTEwsXFxcbiAgICAgICAgICAgICAgJ2ZwJyBWQVJDSEFSKDE2KSBOT1QgTlVMTCxcXFxuICAgICAgICAgICAgICAna2V5JyBWQVJDSEFSKDMyKSBOT1QgTlVMTCxcXFxuICAgICAgICAgICAgICAndmFsdWUnIFZBUkNIQVIoMzIpIE5PVCBOVUxMLFxcXG4gICAgICAgICAgICAgICdjb3VudCcgSU5URUdFUiBERUZBVUxUIDEsXFxcbiAgICAgICAgICAgICAgJ2xhc3RUaW1lJyBJTlRFR0VSIERFRkFVTFQgMCxcXFxuICAgICAgICAgICAgICBDT05TVFJBSU5UIHBrZXkgUFJJTUFSWSBLRVkgKCd0cCcsICdmcCcsICdrZXknLCAndmFsdWUnKVxcXG4gICAgICAgICAgKVwiO1xuICAgICAgKHRoaXMuZGJDb25uLmV4ZWN1dGVTaW1wbGVTUUxBc3luYyB8fCB0aGlzLmRiQ29ubi5leGVjdXRlU2ltcGxlU1FMKSh0cmFja2luZ190YWJsZSk7XG4gICAgfVxuICB9XG5cbiAgbG9hZFRva2Vucyh0b2tlbnMpIHtcbiAgICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSxcbiAgICAgICAgcXVlcnkgPSBcIklOU0VSVCBPUiBJR05PUkUgSU5UTyAnYXR0cmFja190cmFja2luZydcXFxuICAgICAgKCd0cCcsICdmcCcsICdrZXknLCAndmFsdWUnLCAnbGFzdFRpbWUnKVxcXG4gICAgICBWQUxVRVNcXFxuICAgICAgKDp0cCwgOmZwLCA6a2V5LCA6dmFsdWUsIDp0aW1lKTtcXFxuICAgICAgVVBEQVRFICdhdHRyYWNrX3RyYWNraW5nJyBTRVRcXFxuICAgICAgJ2NvdW50JyA9ICdjb3VudCcgKyAxLFxcXG4gICAgICAnbGFzdFRpbWUnID0gOnRpbWVcXFxuICAgICAgV0hFUkUgJ3RwJyA9IDp0cCxcXFxuICAgICAgJ2ZwJyA9IDpmcCxcXFxuICAgICAgJ2tleScgPSA6a2V5LFxcXG4gICAgICAndmFsdWUnID0gOnZhbHVlIDtcIixcbiAgICAgICAgc3RtdCA9IHRoaXMuZGJDb25uLmNyZWF0ZVN0YXRlbWVudChxdWVyeSksXG4gICAgICAgIHBhcmFtcyA9IHN0bXQubmV3QmluZGluZ1BhcmFtc0FycmF5KCksXG4gICAgICAgIGNvdW50ID0gMDtcblxuICAgIGZvciAodmFyIHRwIGluIHRva2Vucykge1xuICAgICAgLy8gc2tpcCBoZWFkZXIgdG9rZW5zXG4gICAgICBpZiAodHAubGVuZ3RoID4gMTYpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBmcCBpbiB0b2tlbnNbdHBdKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0b2tlbnNbdHBdW2ZwXVsna3YnXSkge1xuICAgICAgICAgIGZvciAodmFyIHRva2VuIGluIHRva2Vuc1t0cF1bZnBdWydrdiddW2tleV0pIHtcbiAgICAgICAgICAgIHZhciBicCA9IHBhcmFtcy5uZXdCaW5kaW5nUGFyYW1zKCk7XG4gICAgICAgICAgICBicC5iaW5kQnlOYW1lKFwidHBcIiwgdHApO1xuICAgICAgICAgICAgYnAuYmluZEJ5TmFtZShcImZwXCIsIGZwKTtcbiAgICAgICAgICAgIGJwLmJpbmRCeU5hbWUoXCJrZXlcIiwga2V5KTtcbiAgICAgICAgICAgIGJwLmJpbmRCeU5hbWUoXCJ2YWx1ZVwiLCB0b2tlbik7XG4gICAgICAgICAgICBicC5iaW5kQnlOYW1lKFwidGltZVwiLCBub3cpO1xuICAgICAgICAgICAgcGFyYW1zLmFkZFBhcmFtcyhicCk7XG4gICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY291bnQgPiAwKSB7XG4gICAgICBDbGlxelV0aWxzLmxvZyhcIkFkZCBcIisgY291bnQgK1wiIHRva2VucyBmb3IgaG91clwiLCBcImF0dHJhY2tcIik7XG4gICAgICBzdG10LmJpbmRQYXJhbWV0ZXJzKHBhcmFtcyk7XG4gICAgICBzdG10LmV4ZWN1dGVBc3luYyh7XG4gICAgICAgIGhhbmRsZUVycm9yOiBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBDbGlxelV0aWxzLmxvZyhlcnIsIFwieHh4XCIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBnZXRUcmFja2luZ09jY3VyYW5jZXMoY2IpIHtcbiAgICB2YXIgcXVlcnkgPSBcIlNFTEVDVCB0cCwga2V5LCB2YWx1ZSwgQ09VTlQoRElTVElOQ1QgZnApIEFTIG5fZnAgRlJPTSBhdHRyYWNrX3RyYWNraW5nIEdST1VQIEJZIHRwLCBrZXksIHZhbHVlIEhBVklORyBuX2ZwID4gMiBPUkRFUiBCWSBuX2ZwIERFU0NcIixcbiAgICAgICAgc3RtdCA9IHRoaXMuZGJDb25uLmNyZWF0ZVN0YXRlbWVudChxdWVyeSk7XG4gICAgc3RtdC5leGVjdXRlQXN5bmMoe1xuICAgICAgaGFuZGxlUmVzdWx0OiBmdW5jdGlvbihyZXN1bHRTZXQpIHtcbiAgICAgICAgLy8gdHJpcGxlIG5lc3RlZCBtYXBcbiAgICAgICAgdmFyIHJlc3VsdE9iaiA9IFtdXG4gICAgICAgIGZvciAobGV0IHJvdyA9IHJlc3VsdFNldC5nZXROZXh0Um93KCk7IHJvdzsgcm93ID0gcmVzdWx0U2V0LmdldE5leHRSb3coKSkge1xuICAgICAgICAgIGxldCB0dXBsZSA9IFtcInRwXCIsIFwia2V5XCIsIFwidmFsdWVcIiwgXCJuX2ZwXCJdLm1hcChjb2wgPT4gcm93LmdldFJlc3VsdEJ5TmFtZShjb2wpKTtcbiAgICAgICAgICByZXN1bHRPYmoucHVzaCh0dXBsZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2IocmVzdWx0T2JqKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGdldFRhYmxlU2l6ZShjYikge1xuICAgIHZhciBxdWVyeSA9IFwiU0VMRUNUIENPVU5UKCopIEFTIG4gRlJPTSBhdHRyYWNrX3RyYWNraW5nXCIsXG4gICAgICBzdG10ID0gdGhpcy5kYkNvbm4uY3JlYXRlU3RhdGVtZW50KHF1ZXJ5KTtcbiAgICBzdG10LmV4ZWN1dGVBc3luYyh7XG4gICAgICBoYW5kbGVSZXN1bHQ6IGZ1bmN0aW9uKHJlc3VsdFNldCkge1xuICAgICAgICBjYihyZXN1bHRTZXQuZ2V0TmV4dFJvdygpLmdldFJlc3VsdEJ5TmFtZShcIm5cIikpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY2xlYW5UYWJsZSgpIHtcbiAgICB2YXIgY3V0b2ZmID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSAtICgxMDAwICogNjAgKiA2MCAqIDI0ICogNyk7IC8vIDcgZGF5cyBhZ29cblxuICAgIHZhciBzdCA9IHRoaXMuZGJDb25uLmNyZWF0ZVN0YXRlbWVudChcIkRFTEVURSBGUk9NIGF0dHJhY2tfdHJhY2tpbmcgV0hFUkUgbGFzdFRpbWUgPCA6Y3V0b2ZmXCIpO1xuICAgIHN0LnBhcmFtcy5jdXRvZmYgPSBjdXRvZmY7XG4gICAgc3QuZXhlY3V0ZUFzeW5jKClcbiAgfVxuXG4gIGlzRW5hYmxlZCgpIHtcbiAgICByZXR1cm4gQ2xpcXpVdGlscy5nZXRQcmVmKCdhdHRyYWNrLmxvY2FsX3RyYWNraW5nJywgZmFsc2UpO1xuICB9XG5cbn07XG4iXX0=