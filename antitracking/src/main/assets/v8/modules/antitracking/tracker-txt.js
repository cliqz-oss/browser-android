System.register('antitracking/tracker-txt', ['antitracking/fixed-size-cache', 'antitracking/time', 'core/cliqz'], function (_export) {
    /**
    TrackerTXT: caching rules for tracker.txt
     */

    'use strict';

    var MapCache, getTime, utils, trackerTxtActions, DEFAULT_ACTION_PREF, defaultTrackerTxtRule, trackerRuleParser, TrackerTXT;

    _export('getDefaultTrackerTxtRule', getDefaultTrackerTxtRule);

    _export('setDefaultTrackerTxtRule', setDefaultTrackerTxtRule);

    _export('updateDefaultTrackerTxtRule', updateDefaultTrackerTxtRule);

    function getDefaultTrackerTxtRule() {
        return defaultTrackerTxtRule;
    }

    function setDefaultTrackerTxtRule(rule) {
        defaultTrackerTxtRule = rule;
    }

    function updateDefaultTrackerTxtRule() {
        var ruleFromPref = utils.getPref('attrackDefaultAction', 'same');
        // default rule may be either a tracking.txt action, or 'same'
        if (trackerTxtActions.has(ruleFromPref) || ruleFromPref === 'same') {
            defaultTrackerTxtRule = ruleFromPref;
        } else {
            // bad pref value, reset it
            utils.clearPref('attrackDefaultAction');
        }
    }

    return {
        setters: [function (_antitrackingFixedSizeCache) {
            MapCache = _antitrackingFixedSizeCache['default'];
        }, function (_antitrackingTime) {
            getTime = _antitrackingTime.getTime;
        }, function (_coreCliqz) {
            utils = _coreCliqz.utils;
        }],
        execute: function () {
            trackerTxtActions = new Set(['placeholder', 'block', 'empty', 'replace']);
            DEFAULT_ACTION_PREF = 'attrackDefaultAction';

            _export('DEFAULT_ACTION_PREF', DEFAULT_ACTION_PREF);

            defaultTrackerTxtRule = utils.getPref(DEFAULT_ACTION_PREF, 'same');
            ;

            ;

            trackerRuleParser = function trackerRuleParser(str, rules) {
                /* Tracker format:
                 one rule per line: "R tracker action"
                 */
                str.split('\n').map(function (x) {
                    return x.trim();
                }).filter(function (x) {
                    return x[0] == 'R';
                }).forEach(function (element, index, array) {
                    var siteRule = element.split(/\s+/).map(function (x) {
                        return x.trim().toLowerCase();
                    });
                    if (siteRule.length == 3 && trackerTxtActions.has(siteRule[2])) {
                        rules.push({
                            site: siteRule[1],
                            rule: siteRule[2]
                        });
                    }
                });
            };

            TrackerTXT = function TrackerTXT(baseurl) {
                this.baseurl = baseurl;
                this.rules = [];
                this.status = null;
                this.last_update = null;
            };

            TrackerTXT._cache = new MapCache(function (baseurl) {
                return new TrackerTXT(baseurl);
            }, 1000);

            TrackerTXT.get = function (url_parts) {
                var baseurl = url_parts.protocol + '://' + url_parts.hostname + (url_parts.port !== 80 ? ':' + url_parts.port : '');
                return TrackerTXT._cache.get(baseurl);
            };

            TrackerTXT.prototype = {
                update: function update() {
                    if (this.status == 'updating' || this.last_update == getTime()) return; // try max once per hour
                    this.status = 'updating';
                    var self = this;
                    utils.httpGet(self.baseurl + '/tracking.txt', function success(req) {
                        if (req.responseText.length < 4 * 1024) {
                            self.rules = [];
                            trackerRuleParser(req.responseText, self.rules);
                        }
                        self.status = 'updated';
                        self.last_update = getTime();
                    }, function error() {
                        self.status = 'error';
                        self.last_update = getTime();
                    });
                },
                getRule: function getRule(tp) {
                    for (var i = 0; i < this.rules.length; i++) {
                        var rule = this.rules[i];
                        if (tp.endsWith(rule.site)) {
                            return rule.rule;
                        }
                    }
                    return getDefaultTrackerTxtRule();
                }
            };

            _export('TrackerTXT', TrackerTXT);

            _export('trackerRuleParser', trackerRuleParser);
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy90cmFja2VyLXR4dC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O2tDQVFJLGlCQUFpQixFQUVSLG1CQUFtQixFQUU1QixxQkFBcUIsRUFxQnJCLGlCQUFpQixFQWtCakIsVUFBVTs7Ozs7Ozs7QUFyQ1AsYUFBUyx3QkFBd0IsR0FBRztBQUN2QyxlQUFPLHFCQUFxQixDQUFDO0tBQ2hDOztBQUVNLGFBQVMsd0JBQXdCLENBQUMsSUFBSSxFQUFFO0FBQzNDLDZCQUFxQixHQUFHLElBQUksQ0FBQztLQUNoQzs7QUFFTSxhQUFTLDJCQUEyQixHQUFHO0FBQzFDLFlBQUksWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUM7O0FBRWpFLFlBQUssaUJBQWlCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLFlBQVksS0FBSyxNQUFNLEVBQUU7QUFDakUsaUNBQXFCLEdBQUcsWUFBWSxDQUFDO1NBQ3hDLE1BQU07O0FBRUgsaUJBQUssQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUMzQztLQUNKOzs7Ozs7d0NBMUJRLE9BQU87OytCQUNQLEtBQUs7OztBQUVWLDZCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFFaEUsK0JBQW1CLEdBQUcsc0JBQXNCOzs7O0FBRXJELGlDQUFxQixHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDO0FBSXJFLGFBQUM7O0FBSUQsYUFBQzs7QUFhRSw2QkFBaUIsR0FBRyxTQUFwQixpQkFBaUIsQ0FBWSxHQUFHLEVBQUUsS0FBSyxFQUFFOzs7O0FBSXpDLG1CQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBRTtBQUFDLDJCQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtpQkFBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFFO0FBQUMsMkJBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQTtpQkFBQyxDQUFDLENBQUMsT0FBTyxDQUMvRixVQUFTLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO0FBQzVCLHdCQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBRTtBQUFDLCtCQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztxQkFBQyxDQUFDLENBQUM7QUFDdEYsd0JBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQ3BCLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNwQyw2QkFBSyxDQUFDLElBQUksQ0FBQztBQUNQLGdDQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNqQixnQ0FBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7eUJBQ3BCLENBQUMsQ0FBQztxQkFDTjtpQkFDSixDQUNKLENBQUM7YUFDTDs7QUFFRyxzQkFBVSxHQUFHLFNBQWIsVUFBVSxDQUFZLE9BQU8sRUFBRTtBQUMvQixvQkFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDdkIsb0JBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLG9CQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztBQUNuQixvQkFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7YUFDM0I7O0FBRUQsc0JBQVUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQUMsVUFBUyxPQUFPLEVBQUU7QUFBQyx1QkFBTyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7O0FBRTVGLHNCQUFVLENBQUMsR0FBRyxHQUFHLFVBQVMsU0FBUyxFQUFFO0FBQ2pDLG9CQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxHQUFHLEtBQUssR0FBRyxTQUFTLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssRUFBRSxHQUFHLEdBQUcsR0FBRyxTQUFTLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQSxBQUFDLENBQUM7QUFDcEgsdUJBQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDekMsQ0FBQzs7QUFFRixzQkFBVSxDQUFDLFNBQVMsR0FBRztBQUNuQixzQkFBTSxFQUFFLGtCQUFXO0FBQ2Ysd0JBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxVQUFVLElBQ3pCLElBQUksQ0FBQyxXQUFXLElBQUksT0FBTyxFQUFFLEVBQUUsT0FBTztBQUMxQyx3QkFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7QUFDekIsd0JBQUksSUFBSSxHQUFHLElBQUksQ0FBQztBQUNoQix5QkFBSyxDQUFDLE9BQU8sQ0FDVCxJQUFJLENBQUMsT0FBTyxHQUFHLGVBQWUsRUFDOUIsU0FBUyxPQUFPLENBQUMsR0FBRyxFQUFFO0FBQ2xCLDRCQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUU7QUFDcEMsZ0NBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLDZDQUFpQixDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO3lCQUNuRDtBQUNELDRCQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztBQUN4Qiw0QkFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLEVBQUUsQ0FBQztxQkFDaEMsRUFDRCxTQUFTLEtBQUssR0FBRztBQUNiLDRCQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztBQUN0Qiw0QkFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLEVBQUUsQ0FBQztxQkFDaEMsQ0FDSixDQUFDO2lCQUNMO0FBQ0QsdUJBQU8sRUFBRSxpQkFBUyxFQUFFLEVBQUU7QUFDbEIseUJBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN4Qyw0QkFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6Qiw0QkFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN4QixtQ0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO3lCQUNuQjtxQkFDSjtBQUNELDJCQUFPLHdCQUF3QixFQUFFLENBQUM7aUJBQ3JDO2FBQ0osQ0FBQzs7a0NBR0UsVUFBVTs7eUNBQ1YsaUJBQWlCIiwiZmlsZSI6ImFudGl0cmFja2luZy90cmFja2VyLXR4dC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuVHJhY2tlclRYVDogY2FjaGluZyBydWxlcyBmb3IgdHJhY2tlci50eHRcbiAqL1xuXG5pbXBvcnQgTWFwQ2FjaGUgZnJvbSAnYW50aXRyYWNraW5nL2ZpeGVkLXNpemUtY2FjaGUnO1xuaW1wb3J0IHsgZ2V0VGltZSB9IGZyb20gJ2FudGl0cmFja2luZy90aW1lJztcbmltcG9ydCB7IHV0aWxzIH0gZnJvbSAnY29yZS9jbGlxeic7XG5cbnZhciB0cmFja2VyVHh0QWN0aW9ucyA9IG5ldyBTZXQoWydwbGFjZWhvbGRlcicsICdibG9jaycsICdlbXB0eScsICdyZXBsYWNlJ10pO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9BQ1RJT05fUFJFRiA9ICdhdHRyYWNrRGVmYXVsdEFjdGlvbic7XG5cbnZhciBkZWZhdWx0VHJhY2tlclR4dFJ1bGUgPSB1dGlscy5nZXRQcmVmKERFRkFVTFRfQUNUSU9OX1BSRUYsICdzYW1lJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZhdWx0VHJhY2tlclR4dFJ1bGUoKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRUcmFja2VyVHh0UnVsZTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXREZWZhdWx0VHJhY2tlclR4dFJ1bGUocnVsZSkge1xuICAgIGRlZmF1bHRUcmFja2VyVHh0UnVsZSA9IHJ1bGU7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlRGVmYXVsdFRyYWNrZXJUeHRSdWxlKCkge1xuICAgIGxldCBydWxlRnJvbVByZWYgPSB1dGlscy5nZXRQcmVmKCdhdHRyYWNrRGVmYXVsdEFjdGlvbicsICdzYW1lJyk7XG4gICAgLy8gZGVmYXVsdCBydWxlIG1heSBiZSBlaXRoZXIgYSB0cmFja2luZy50eHQgYWN0aW9uLCBvciAnc2FtZSdcbiAgICBpZiAoIHRyYWNrZXJUeHRBY3Rpb25zLmhhcyhydWxlRnJvbVByZWYpIHx8IHJ1bGVGcm9tUHJlZiA9PT0gJ3NhbWUnKSB7XG4gICAgICAgIGRlZmF1bHRUcmFja2VyVHh0UnVsZSA9IHJ1bGVGcm9tUHJlZjtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBiYWQgcHJlZiB2YWx1ZSwgcmVzZXQgaXRcbiAgICAgICAgdXRpbHMuY2xlYXJQcmVmKCdhdHRyYWNrRGVmYXVsdEFjdGlvbicpO1xuICAgIH1cbn1cblxudmFyIHRyYWNrZXJSdWxlUGFyc2VyID0gZnVuY3Rpb24oc3RyLCBydWxlcykge1xuICAgIC8qIFRyYWNrZXIgZm9ybWF0OlxuICAgICBvbmUgcnVsZSBwZXIgbGluZTogXCJSIHRyYWNrZXIgYWN0aW9uXCJcbiAgICAgKi9cbiAgICBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbih4KSB7cmV0dXJuIHgudHJpbSgpfSkuZmlsdGVyKGZ1bmN0aW9uKHgpIHtyZXR1cm4geFswXSA9PSAnUid9KS5mb3JFYWNoKFxuICAgICAgICBmdW5jdGlvbihlbGVtZW50LCBpbmRleCwgYXJyYXkpIHtcbiAgICAgICAgICAgIHZhciBzaXRlUnVsZSA9IGVsZW1lbnQuc3BsaXQoL1xccysvKS5tYXAoZnVuY3Rpb24oeCkge3JldHVybiB4LnRyaW0oKS50b0xvd2VyQ2FzZSgpO30pO1xuICAgICAgICAgICAgaWYgKHNpdGVSdWxlLmxlbmd0aCA9PSAzICYmXG4gICAgICAgICAgICAgICAgdHJhY2tlclR4dEFjdGlvbnMuaGFzKHNpdGVSdWxlWzJdKSkge1xuICAgICAgICAgICAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzaXRlOiBzaXRlUnVsZVsxXSxcbiAgICAgICAgICAgICAgICAgICAgcnVsZTogc2l0ZVJ1bGVbMl1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59O1xuXG52YXIgVHJhY2tlclRYVCA9IGZ1bmN0aW9uKGJhc2V1cmwpIHtcbiAgICB0aGlzLmJhc2V1cmwgPSBiYXNldXJsO1xuICAgIHRoaXMucnVsZXMgPSBbXTtcbiAgICB0aGlzLnN0YXR1cyA9IG51bGw7XG4gICAgdGhpcy5sYXN0X3VwZGF0ZSA9IG51bGw7XG59O1xuXG5UcmFja2VyVFhULl9jYWNoZSA9IG5ldyBNYXBDYWNoZShmdW5jdGlvbihiYXNldXJsKSB7cmV0dXJuIG5ldyBUcmFja2VyVFhUKGJhc2V1cmwpO30sIDEwMDApO1xuXG5UcmFja2VyVFhULmdldCA9IGZ1bmN0aW9uKHVybF9wYXJ0cykge1xuICAgIHZhciBiYXNldXJsID0gdXJsX3BhcnRzLnByb3RvY29sICsgJzovLycgKyB1cmxfcGFydHMuaG9zdG5hbWUgKyAodXJsX3BhcnRzLnBvcnQgIT09IDgwID8gJzonICsgdXJsX3BhcnRzLnBvcnQgOiAnJyk7XG4gICAgcmV0dXJuIFRyYWNrZXJUWFQuX2NhY2hlLmdldChiYXNldXJsKTtcbn07XG5cblRyYWNrZXJUWFQucHJvdG90eXBlID0ge1xuICAgIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PSAndXBkYXRpbmcnIHx8XG4gICAgICAgICAgICB0aGlzLmxhc3RfdXBkYXRlID09IGdldFRpbWUoKSkgcmV0dXJuOyAgLy8gdHJ5IG1heCBvbmNlIHBlciBob3VyXG4gICAgICAgIHRoaXMuc3RhdHVzID0gJ3VwZGF0aW5nJztcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB1dGlscy5odHRwR2V0KFxuICAgICAgICAgICAgc2VsZi5iYXNldXJsICsgJy90cmFja2luZy50eHQnLFxuICAgICAgICAgICAgZnVuY3Rpb24gc3VjY2VzcyhyZXEpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLnJlc3BvbnNlVGV4dC5sZW5ndGggPCA0ICogMTAyNCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnJ1bGVzID0gW107XG4gICAgICAgICAgICAgICAgICAgIHRyYWNrZXJSdWxlUGFyc2VyKHJlcS5yZXNwb25zZVRleHQsIHNlbGYucnVsZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLnN0YXR1cyA9ICd1cGRhdGVkJztcbiAgICAgICAgICAgICAgICBzZWxmLmxhc3RfdXBkYXRlID0gZ2V0VGltZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIGVycm9yKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuc3RhdHVzID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICBzZWxmLmxhc3RfdXBkYXRlID0gZ2V0VGltZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG4gICAgZ2V0UnVsZTogZnVuY3Rpb24odHApIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgcnVsZSA9IHRoaXMucnVsZXNbaV07XG4gICAgICAgICAgICBpZiAodHAuZW5kc1dpdGgocnVsZS5zaXRlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBydWxlLnJ1bGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZ2V0RGVmYXVsdFRyYWNrZXJUeHRSdWxlKCk7XG4gICAgfVxufTtcblxuZXhwb3J0IHtcbiAgICBUcmFja2VyVFhULFxuICAgIHRyYWNrZXJSdWxlUGFyc2VyXG59O1xuIl19