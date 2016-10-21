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