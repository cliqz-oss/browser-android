System.register('antitracking/privacy-score', ['core/cliqz', 'antitracking/fixed-size-cache', 'antitracking/time'], function (_export) {
  'use strict';

  var utils, MapCache, datetime, privacyScoreURL, PrivacyScore;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_antitrackingFixedSizeCache) {
      MapCache = _antitrackingFixedSizeCache['default'];
    }, function (_antitrackingTime) {
      datetime = _antitrackingTime;
    }],
    execute: function () {
      privacyScoreURL = 'https://anti-tracking.cliqz.com/api/v1/score?';

      PrivacyScore = function PrivacyScore(tldHashRole) {
        this.tldHash = tldHashRole.substring(0, 16);
        this.role = tldHashRole.substring(16, tldHashRole.length);
        this.score = null;
        this.datetime = null;
        return this;
      };

      PrivacyScore._cache = new MapCache(function (tldHashRole) {
        return new PrivacyScore(tldHashRole);
      }, 1000);

      PrivacyScore.get = function (tldHashRole) {
        return PrivacyScore._cache.get(tldHashRole);
      };

      PrivacyScore.prototype.getPrivacyScore = function () {
        if (this.score !== null && this.datetime === datetime.getTime()) {
          return;
        }
        var prefix = this.tldHash.substring(0, 8),
            suffix = this.tldHash.substring(8, 16);
        var reqURL = privacyScoreURL + 'prefix=' + prefix + '&role=' + this.role;
        this.score = -1;
        this.datetime = datetime.getTime();
        utils.httpGet(reqURL, (function (req) {
          var res = JSON.parse(req.response);
          if (suffix in res) {
            this.score = res[suffix];
          }
        }).bind(this), utils.log, 10000);
      };

      _export('PrivacyScore', PrivacyScore);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9wcml2YWN5LXNjb3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztpQ0FJSSxlQUFlLEVBRWYsWUFBWTs7O3lCQU5SLEtBQUs7Ozs7Ozs7QUFJVCxxQkFBZSxHQUFHLCtDQUErQzs7QUFFakUsa0JBQVksR0FBRyxTQUFmLFlBQVksQ0FBWSxXQUFXLEVBQUU7QUFDdkMsWUFBSSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM1QyxZQUFJLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMxRCxZQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztBQUNsQixZQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztBQUNyQixlQUFPLElBQUksQ0FBQztPQUNiOztBQUVELGtCQUFZLENBQUMsTUFBTSxHQUFHLElBQUksUUFBUSxDQUFDLFVBQVMsV0FBVyxFQUFFO0FBQUUsZUFBTyxJQUFJLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztPQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7O0FBRTFHLGtCQUFZLENBQUMsR0FBRyxHQUFHLFVBQVMsV0FBVyxFQUFFO0FBQ3ZDLGVBQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7T0FDN0MsQ0FBQzs7QUFFRixrQkFBWSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsWUFBVztBQUNsRCxZQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFO0FBQy9ELGlCQUFPO1NBQ1I7QUFDRCxZQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDM0MsWUFBSSxNQUFNLEdBQUcsZUFBZSxHQUFHLFNBQVMsR0FBRyxNQUFNLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDekUsWUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNoQixZQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNuQyxhQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFBLFVBQVMsR0FBRyxFQUFFO0FBQ2xDLGNBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ25DLGNBQUksTUFBTSxJQUFJLEdBQUcsRUFBRTtBQUNqQixnQkFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7V0FDMUI7U0FDRixDQUFBLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7T0FDakMsQ0FBQzs7OEJBR0EsWUFBWSIsImZpbGUiOiJhbnRpdHJhY2tpbmcvcHJpdmFjeS1zY29yZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7dXRpbHN9IGZyb20gJ2NvcmUvY2xpcXonO1xuaW1wb3J0IE1hcENhY2hlIGZyb20gJ2FudGl0cmFja2luZy9maXhlZC1zaXplLWNhY2hlJztcbmltcG9ydCAqIGFzIGRhdGV0aW1lIGZyb20gJ2FudGl0cmFja2luZy90aW1lJztcblxudmFyIHByaXZhY3lTY29yZVVSTCA9ICdodHRwczovL2FudGktdHJhY2tpbmcuY2xpcXouY29tL2FwaS92MS9zY29yZT8nO1xuXG52YXIgUHJpdmFjeVNjb3JlID0gZnVuY3Rpb24odGxkSGFzaFJvbGUpIHtcbiAgdGhpcy50bGRIYXNoID0gdGxkSGFzaFJvbGUuc3Vic3RyaW5nKDAsIDE2KTtcbiAgdGhpcy5yb2xlID0gdGxkSGFzaFJvbGUuc3Vic3RyaW5nKDE2LCB0bGRIYXNoUm9sZS5sZW5ndGgpO1xuICB0aGlzLnNjb3JlID0gbnVsbDtcbiAgdGhpcy5kYXRldGltZSA9IG51bGw7XG4gIHJldHVybiB0aGlzO1xufTtcblxuUHJpdmFjeVNjb3JlLl9jYWNoZSA9IG5ldyBNYXBDYWNoZShmdW5jdGlvbih0bGRIYXNoUm9sZSkgeyByZXR1cm4gbmV3IFByaXZhY3lTY29yZSh0bGRIYXNoUm9sZSk7IH0sIDEwMDApO1xuXG5Qcml2YWN5U2NvcmUuZ2V0ID0gZnVuY3Rpb24odGxkSGFzaFJvbGUpIHtcbiAgcmV0dXJuIFByaXZhY3lTY29yZS5fY2FjaGUuZ2V0KHRsZEhhc2hSb2xlKTtcbn07XG5cblByaXZhY3lTY29yZS5wcm90b3R5cGUuZ2V0UHJpdmFjeVNjb3JlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnNjb3JlICE9PSBudWxsICYmIHRoaXMuZGF0ZXRpbWUgPT09IGRhdGV0aW1lLmdldFRpbWUoKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcHJlZml4ID0gdGhpcy50bGRIYXNoLnN1YnN0cmluZygwLCA4KSxcbiAgICAgIHN1ZmZpeCA9IHRoaXMudGxkSGFzaC5zdWJzdHJpbmcoOCwgMTYpO1xuICB2YXIgcmVxVVJMID0gcHJpdmFjeVNjb3JlVVJMICsgJ3ByZWZpeD0nICsgcHJlZml4ICsgJyZyb2xlPScgKyB0aGlzLnJvbGU7XG4gIHRoaXMuc2NvcmUgPSAtMTtcbiAgdGhpcy5kYXRldGltZSA9IGRhdGV0aW1lLmdldFRpbWUoKTtcbiAgdXRpbHMuaHR0cEdldChyZXFVUkwsIGZ1bmN0aW9uKHJlcSkge1xuICAgIHZhciByZXMgPSBKU09OLnBhcnNlKHJlcS5yZXNwb25zZSk7XG4gICAgaWYgKHN1ZmZpeCBpbiByZXMpIHtcbiAgICAgIHRoaXMuc2NvcmUgPSByZXNbc3VmZml4XTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSwgdXRpbHMubG9nLCAxMDAwMCk7XG59O1xuXG5leHBvcnQge1xuICBQcml2YWN5U2NvcmVcbn07XG4iXX0=