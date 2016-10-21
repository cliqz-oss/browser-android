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