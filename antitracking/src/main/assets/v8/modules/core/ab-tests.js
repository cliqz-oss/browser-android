System.register("core/ab-tests", ["core/utils"], function (_export) {
    /*
     * This module implements a mechanism which enables/disables AB tests
     *
     */

    "use strict";

    var CliqzUtils, timer, ONE_HOUR, CliqzABTests;

    function log(msg) {
        CliqzUtils.log(msg, "CliqzABTests.jsm");
    }

    return {
        setters: [function (_coreUtils) {
            CliqzUtils = _coreUtils["default"];
        }],
        execute: function () {
            timer = null;
            ONE_HOUR = 60 * 60 * 1000;
            CliqzABTests = {
                PREF: 'ABTests',
                PREF_OVERRIDE: 'ABTestsOverride',
                URL: 'https://logging.cliqz.com/abtests/check?session=',
                init: function init() {
                    CliqzABTests.check();
                },
                // Accessors to list of tests this user is current in
                getCurrent: function getCurrent() {
                    if (CliqzUtils.hasPref(CliqzABTests.PREF)) return JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));
                    return undefined;
                },
                setCurrent: function setCurrent(tests) {
                    CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(tests));
                },

                // Accessors to list of tests in override list
                getOverride: function getOverride() {
                    if (CliqzUtils.hasPref(CliqzABTests.PREF_OVERRIDE)) {
                        var ABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF_OVERRIDE));
                        return ABtests;
                    }
                    return undefined;
                },
                setOverride: function setOverride(tests) {
                    if (tests) CliqzUtils.setPref(CliqzABTests.PREF_OVERRIDE, JSON.stringify(tests));else CliqzUtils.clearPref(CliqzABTests.PREF_OVERRIDE);
                },

                // Check for newest list of AB tests from server
                check: function check() {
                    log('AB checking');
                    // clear the last timer
                    CliqzUtils.clearTimeout(timer);
                    // set a new timer to be triggered after 1 hour
                    timer = CliqzUtils.setTimeout(CliqzABTests.check, ONE_HOUR);

                    CliqzABTests.retrieve(function (response) {
                        try {
                            var prevABtests = {};
                            if (CliqzUtils.hasPref(CliqzABTests.PREF)) prevABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

                            var respABtests = JSON.parse(response.responseText);

                            // Override the backend response - for local testing
                            var overrideABtests = CliqzABTests.getOverride();
                            if (overrideABtests) respABtests = overrideABtests;

                            var newABtests = {};

                            var changes = false; // any changes?

                            // find old AB tests to leave
                            for (var o in prevABtests) {
                                if (!respABtests[o]) {
                                    if (CliqzABTests.leave(o)) changes = true;
                                } else {
                                    // keep this old test in the list of current tests
                                    newABtests[o] = prevABtests[o];
                                }
                            }

                            // find new AB tests to enter
                            for (var n in respABtests) {
                                if (!prevABtests[n]) {
                                    if (CliqzABTests.enter(n, respABtests[n])) {
                                        changes = true;
                                        newABtests[n] = respABtests[n];
                                    }
                                }
                            }

                            if (changes) {
                                CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(newABtests));
                            }
                        } catch (e) {
                            log('retrieve error: ' + e.message);
                        }
                    });
                },
                retrieve: function retrieve(callback) {
                    var url = CliqzABTests.URL + encodeURIComponent(CliqzUtils.getPref('session', ''));

                    var onerror = function onerror() {
                        log("failed to retrieve AB test data");
                    };

                    CliqzUtils.httpGet(url, callback, onerror, 15000);
                },
                enter: function enter(abtest, payload) {
                    // Add new AB tests here.
                    // It is safe to remove them as soon as the test is over.
                    var rule_executed = true;
                    switch (abtest) {
                        case "1024_B":
                            CliqzUtils.setPref("categoryAssessment", true);
                            break;
                        case "1028_A":
                            CliqzUtils.setPref("humanWeb", false);
                            break;
                        case "1028_B":
                            CliqzUtils.setPref("humanWeb", true);
                            break;
                        case "1032_A":
                            CliqzUtils.setPref("spellCorrMessage", false);
                            break;
                        case "1032_B":
                            CliqzUtils.setPref("spellCorrMessage", true);
                            break;
                        case "1036_B":
                            CliqzUtils.setPref("extended_onboarding_same_result", true);
                            break;
                        case "1045_A":
                            break;
                        case "1045_B":
                            CliqzUtils.setPref("antiTrackTest", true);
                            break;
                        case "1046_B":
                            CliqzUtils.setPref("attrackBlockCookieTracking", true);
                            break;
                        case "1047_B":
                            CliqzUtils.setPref("attrackRemoveQueryStringTracking", true);
                            break;
                        case "1048_B":
                            CliqzUtils.setPref("attrackAlterPostdataTracking", true);
                            break;
                        case "1049_B":
                            CliqzUtils.setPref("attrackCanvasFingerprintTracking", true);
                            break;
                        case "1050_B":
                            CliqzUtils.setPref("attrackRefererTracking", true);
                            break;
                        case "1051_B":
                            CliqzUtils.setPref("antiTrackTest", true);
                            break;
                        case "1052_A":
                            CliqzUtils.setPref("attrackBlockCookieTracking", false);
                            break;
                        case "1052_B":
                            CliqzUtils.setPref("attrackBlockCookieTracking", true);
                            break;
                        case "1053_A":
                            CliqzUtils.setPref("attrackRemoveQueryStringTracking", false);
                            break;
                        case "1053_B":
                            CliqzUtils.setPref("attrackRemoveQueryStringTracking", true);
                            break;
                        case "1055_B":
                            CliqzUtils.setPref("unblockMode", "always");
                            break;
                        case "1057_A":
                            CliqzUtils.setPref("trackerTxt", false);
                            break;
                        case "1057_B":
                            CliqzUtils.setPref("trackerTxt", true);
                            break;
                        case "1058_A":
                            CliqzUtils.setPref("unblockMode", "never");
                            break;
                        case "1058_B":
                            CliqzUtils.setPref("unblockMode", "always");
                            break;
                        case "1059_A":
                            CliqzUtils.setPref("attrack.local_tracking", false);
                            break;
                        case "1059_B":
                            CliqzUtils.setPref("attrack.local_tracking", true);
                            break;
                        case "1060_A":
                            CliqzUtils.setPref("attrackBloomFilter", false);
                            break;
                        case "1060_B":
                            CliqzUtils.setPref("attrackBloomFilter", true);
                            break;
                        case "1061_A":
                            CliqzUtils.setPref("attrackUI", false);
                            break;
                        case "1061_B":
                            CliqzUtils.setPref("attrackUI", true);
                            break;
                        case "1063_A":
                            CliqzUtils.setPref("double-enter2", false);
                            break;
                        case "1063_B":
                            CliqzUtils.setPref("double-enter2", true);
                            break;
                        case "1064_A":
                            CliqzUtils.setPref("attrackDefaultAction", "same");
                            break;
                        case "1064_B":
                            CliqzUtils.setPref("attrackDefaultAction", "placeholder");
                            break;
                        case "1064_C":
                            CliqzUtils.setPref("attrackDefaultAction", "block");
                            break;
                        case "1064_D":
                            CliqzUtils.setPref("attrackDefaultAction", "empty");
                            break;
                        case "1064_E":
                            CliqzUtils.setPref("attrackDefaultAction", "replace");
                            break;
                        case "1065_A":
                            CliqzUtils.setPref("freshTabNewsEmail", false);
                            break;
                        case "1065_B":
                            CliqzUtils.setPref("freshTabNewsEmail", true);
                            break;
                        case "1066_A":
                            CliqzUtils.setPref("proxyNetwork", false);
                            break;
                        case "1066_B":
                            CliqzUtils.setPref("proxyNetwork", true);
                            break;
                        case "1067_B":
                            CliqzUtils.setPref("attrackProxyTrackers", true);
                            break;
                        case "1068_A":
                            CliqzUtils.setPref("languageDedup", false);
                            break;
                        case "1068_B":
                            CliqzUtils.setPref("languageDedup", true);
                            break;
                        case "1069_A":
                            CliqzUtils.setPref("grOfferSwitchFlag", false);
                            break;
                        case "1069_B":
                            CliqzUtils.setPref("grOfferSwitchFlag", true);
                            break;
                        case "1070_A":
                            CliqzUtils.setPref("cliqz-anti-phishing", false);
                            CliqzUtils.setPref("cliqz-anti-phishing-enabled", false);
                            break;
                        case "1070_B":
                            CliqzUtils.setPref("cliqz-anti-phishing", true);
                            CliqzUtils.setPref("cliqz-anti-phishing-enabled", true);
                            break;
                        case "1071_A":
                            CliqzUtils.setPref("browser.privatebrowsing.apt", false, '');
                            break;
                        case "1071_B":
                            CliqzUtils.setPref("browser.privatebrowsing.apt", true, '');
                            break;
                        case "1072_A":
                            CliqzUtils.setPref("grFeatureEnabled", false);
                            break;
                        case "1072_B":
                            CliqzUtils.setPref("grFeatureEnabled", true);
                        case "1074_A":
                            CliqzUtils.setPref("cliqz-adb-abtest", false);
                            break;
                        case "1074_B":
                            CliqzUtils.setPref("cliqz-adb-abtest", true);
                            break;
                        case "1075_A":
                            CliqzUtils.setPref("freshtabFeedback", false);
                            break;
                        case "1075_B":
                            CliqzUtils.setPref("freshtabFeedback", true);
                            break;
                        case "1076_A":
                            CliqzUtils.setPref("history.timeouts", false);
                            break;
                        case "1076_B":
                            CliqzUtils.setPref("history.timeouts", true);
                            break;
                        default:
                            rule_executed = false;
                    }
                    if (rule_executed) {
                        var action = {
                            type: 'abtest',
                            action: 'enter',
                            name: abtest
                        };
                        CliqzUtils.telemetry(action);

                        return true;
                    } else {
                        return false;
                    }
                },
                leave: function leave(abtest, disable) {
                    // Restore defaults after an AB test is finished.
                    // DO NOT remove test cleanup code too quickly, a user
                    // might not start the browser for a long time and
                    // get stuck in a test if we remove cases too early.
                    var rule_executed = true;
                    switch (abtest) {
                        case "1024_B":
                            CliqzUtils.clearPref("categoryAssessment");
                            break;
                        case "1028_A":
                        case "1028_B":
                            CliqzUtils.clearPref("humanWeb");
                            break;
                        case "1032_A":
                        case "1032_B":
                            CliqzUtils.clearPref("spellCorrMessage");
                            break;
                        case "1036_A":
                        case "1036_B":
                            CliqzUtils.clearPref("extended_onboarding_same_result");
                            CliqzUtils.clearPref("extended_onboarding");
                            break;
                        case "1045_A":
                        case "1045_B":
                            CliqzUtils.clearPref("antiTrackTest");
                            break;
                        case "1046_A":
                        case "1047_A":
                        case "1048_A":
                        case "1049_A":
                        case "1050_A":
                            break;
                        case "1046_B":
                            CliqzUtils.clearPref("attrackBlockCookieTracking");
                            break;
                        case "1047_B":
                            CliqzUtils.clearPref("attrackRemoveQueryStringTracking");
                            break;
                        case "1048_B":
                            CliqzUtils.clearPref("attrackAlterPostdataTracking");
                            break;
                        case "1049_B":
                            CliqzUtils.clearPref("attrackCanvasFingerprintTracking");
                            break;
                        case "1050_B":
                            CliqzUtils.clearPref("attrackRefererTracking");
                            break;
                        case "1051_B":
                            CliqzUtils.clearPref("antiTrackTest");
                            break;
                        case "1052_B":
                            CliqzUtils.clearPref("attrackBlockCookieTracking");
                            break;
                        case "1053_B":
                            CliqzUtils.clearPref("attrackRemoveQueryStringTracking");
                            break;
                        case "1055_A":
                        case "1055_B":
                            CliqzUtils.clearPref("unblockEnabled");
                            break;
                        case "1056_A":
                        case "1056_B":
                            CliqzUtils.clearPref("freshTabAB");
                            break;
                        case "1057_B":
                            CliqzUtils.clearPref("trackerTxt");
                            break;
                        case "1058_A":
                        case "1058_B":
                            CliqzUtils.clearPref("unblockMode");
                            break;
                        case "1059_A":
                        case "1059_B":
                            CliqzUtils.clearPref("attrack.local_tracking");
                            break;
                        case "1060_A":
                        case "1060_B":
                            CliqzUtils.clearPref("attrackBloomFilter");
                            break;
                        case "1061_A":
                        case "1061_B":
                            CliqzUtils.clearPref("attrackUI");
                            break;
                        case "1063_A":
                        case "1063_B":
                            CliqzUtils.clearPref("double-enter2");
                            break;
                        case "1064_A":
                        case "1064_B":
                        case "1064_C":
                        case "1064_D":
                        case "1064_E":
                            CliqzUtils.clearPref("attrackDefaultAction");
                            break;
                        case "1066_A":
                        case "1066_B":
                            CliqzUtils.clearPref("proxyNetwork");
                            break;
                        case "1065_A":
                        case "1065_B":
                            CliqzUtils.clearPref("freshTabNewsEmail");
                            break;
                        case "1067_B":
                            CliqzUtils.clearPref("attrackProxyTrackers");
                            break;
                        case "1068_A":
                        case "1068_B":
                            CliqzUtils.clearPref("languageDedup");
                            break;
                        case "1069_A":
                        case "1069_B":
                            CliqzUtils.clearPref("grOfferSwitchFlag");
                            break;
                        case "1070_A":
                        case "1070_B":
                            CliqzUtils.clearPref('cliqz-anti-phishing');
                            CliqzUtils.clearPref('cliqz-anti-phishing-enabled');
                            break;
                        case "1071_A":
                        case "1071_B":
                            CliqzUtils.clearPref('browser.privatebrowsing.apt', '');
                            break;
                        case "1072_A":
                        case "1072_B":
                            CliqzUtils.clearPref('grFeatureEnabled');
                            break;
                        case "1074_A":
                        case "1074_B":
                            CliqzUtils.clearPref('cliqz-adb-abtest');
                            break;
                        case "1075_A":
                        case "1075_B":
                            CliqzUtils.clearPref('freshtabFeedback');
                            break;
                        case "1076_A":
                        case "1076_B":
                            CliqzUtils.clearPref('history.timeouts');
                            break;
                        default:
                            rule_executed = false;
                    }
                    if (rule_executed) {
                        var action = {
                            type: 'abtest',
                            action: 'leave',
                            name: abtest,
                            disable: disable
                        };
                        CliqzUtils.telemetry(action);
                        return true;
                    } else {
                        return false;
                    }
                },
                disable: function disable(abtest) {
                    // Disable an AB test but do not remove it from list of active AB tests,
                    // this is intended to be used by the extension itself when it experiences
                    // an error associated with this AB test.
                    if (CliqzUtils.hasPref(CliqzABTests.PREF)) {
                        var curABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

                        if (curABtests[abtest] && CliqzABTests.leave(abtest, true)) {
                            // mark as disabled and save back to preferences
                            curABtests[abtest].disabled = true;
                            CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(curABtests));
                        }
                    }
                }
            };

            _export("default", CliqzABTests);
        }
    };
});
//# sourceMappingURL=data:application/json;base64,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LE1BQU0sRUFBRTs7OztBQUl0Qix3QkFBRyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNyQyw0QkFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOztBQUVwRSw0QkFBRyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7O0FBRXZELHNDQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztBQUNuQyxzQ0FBVSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTt5QkFDcEU7cUJBQ0o7aUJBQ0o7YUFDSjs7K0JBRWMsWUFBWSIsImZpbGUiOiJjb3JlL2FiLXRlc3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIFRoaXMgbW9kdWxlIGltcGxlbWVudHMgYSBtZWNoYW5pc20gd2hpY2ggZW5hYmxlcy9kaXNhYmxlcyBBQiB0ZXN0c1xuICpcbiAqL1xuXG5cbmltcG9ydCBDbGlxelV0aWxzIGZyb20gXCJjb3JlL3V0aWxzXCI7XG5cbnZhciB0aW1lcj1udWxsLCBPTkVfSE9VUiA9IDYwICogNjAgKiAxMDAwO1xuXG5mdW5jdGlvbiBsb2cobXNnKXtcbiAgQ2xpcXpVdGlscy5sb2cobXNnLCBcIkNsaXF6QUJUZXN0cy5qc21cIik7XG59XG5cbnZhciBDbGlxekFCVGVzdHMgPSB7XG4gICAgUFJFRjogJ0FCVGVzdHMnLFxuICAgIFBSRUZfT1ZFUlJJREU6ICdBQlRlc3RzT3ZlcnJpZGUnLFxuICAgIFVSTDogJ2h0dHBzOi8vbG9nZ2luZy5jbGlxei5jb20vYWJ0ZXN0cy9jaGVjaz9zZXNzaW9uPScsXG4gICAgaW5pdDogZnVuY3Rpb24oKXtcbiAgICAgICAgQ2xpcXpBQlRlc3RzLmNoZWNrKCk7XG4gICAgfSxcbiAgICAvLyBBY2Nlc3NvcnMgdG8gbGlzdCBvZiB0ZXN0cyB0aGlzIHVzZXIgaXMgY3VycmVudCBpblxuICAgIGdldEN1cnJlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZihDbGlxelV0aWxzLmhhc1ByZWYoQ2xpcXpBQlRlc3RzLlBSRUYpKVxuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoQ2xpcXpVdGlscy5nZXRQcmVmKENsaXF6QUJUZXN0cy5QUkVGKSk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSxcbiAgICBzZXRDdXJyZW50OiBmdW5jdGlvbih0ZXN0cykge1xuICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoQ2xpcXpBQlRlc3RzLlBSRUYsIEpTT04uc3RyaW5naWZ5KHRlc3RzKSlcbiAgICB9LFxuXG4gICAgLy8gQWNjZXNzb3JzIHRvIGxpc3Qgb2YgdGVzdHMgaW4gb3ZlcnJpZGUgbGlzdFxuICAgIGdldE92ZXJyaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoQ2xpcXpVdGlscy5oYXNQcmVmKENsaXF6QUJUZXN0cy5QUkVGX09WRVJSSURFKSkge1xuICAgICAgICAgICAgdmFyIEFCdGVzdHMgPSBKU09OLnBhcnNlKENsaXF6VXRpbHMuZ2V0UHJlZihDbGlxekFCVGVzdHMuUFJFRl9PVkVSUklERSkpO1xuICAgICAgICAgICAgcmV0dXJuIEFCdGVzdHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9LFxuICAgIHNldE92ZXJyaWRlOiBmdW5jdGlvbih0ZXN0cykge1xuICAgICAgICBpZih0ZXN0cylcbiAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihDbGlxekFCVGVzdHMuUFJFRl9PVkVSUklERSwgSlNPTi5zdHJpbmdpZnkodGVzdHMpKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoQ2xpcXpBQlRlc3RzLlBSRUZfT1ZFUlJJREUpO1xuICAgIH0sXG5cbiAgICAvLyBDaGVjayBmb3IgbmV3ZXN0IGxpc3Qgb2YgQUIgdGVzdHMgZnJvbSBzZXJ2ZXJcbiAgICBjaGVjazogZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvZygnQUIgY2hlY2tpbmcnKTtcbiAgICAgICAgLy8gY2xlYXIgdGhlIGxhc3QgdGltZXJcbiAgICAgICAgQ2xpcXpVdGlscy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAvLyBzZXQgYSBuZXcgdGltZXIgdG8gYmUgdHJpZ2dlcmVkIGFmdGVyIDEgaG91clxuICAgICAgICB0aW1lciA9IENsaXF6VXRpbHMuc2V0VGltZW91dChDbGlxekFCVGVzdHMuY2hlY2ssIE9ORV9IT1VSKTtcblxuICAgICAgICBDbGlxekFCVGVzdHMucmV0cmlldmUoXG4gICAgICAgICAgICBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHJldkFCdGVzdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYoQ2xpcXpVdGlscy5oYXNQcmVmKENsaXF6QUJUZXN0cy5QUkVGKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZBQnRlc3RzID0gSlNPTi5wYXJzZShDbGlxelV0aWxzLmdldFByZWYoQ2xpcXpBQlRlc3RzLlBSRUYpKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcEFCdGVzdHMgPSBKU09OLnBhcnNlKHJlc3BvbnNlLnJlc3BvbnNlVGV4dCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gT3ZlcnJpZGUgdGhlIGJhY2tlbmQgcmVzcG9uc2UgLSBmb3IgbG9jYWwgdGVzdGluZ1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3ZlcnJpZGVBQnRlc3RzID0gQ2xpcXpBQlRlc3RzLmdldE92ZXJyaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKG92ZXJyaWRlQUJ0ZXN0cylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BBQnRlc3RzID0gb3ZlcnJpZGVBQnRlc3RzO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdBQnRlc3RzID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoYW5nZXMgPSBmYWxzZTsgLy8gYW55IGNoYW5nZXM/XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZmluZCBvbGQgQUIgdGVzdHMgdG8gbGVhdmVcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBvIGluIHByZXZBQnRlc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighcmVzcEFCdGVzdHNbb10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihDbGlxekFCVGVzdHMubGVhdmUobykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ga2VlcCB0aGlzIG9sZCB0ZXN0IGluIHRoZSBsaXN0IG9mIGN1cnJlbnQgdGVzdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdBQnRlc3RzW29dID0gcHJldkFCdGVzdHNbb11cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmQgbmV3IEFCIHRlc3RzIHRvIGVudGVyXG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgbiBpbiByZXNwQUJ0ZXN0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIShwcmV2QUJ0ZXN0c1tuXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihDbGlxekFCVGVzdHMuZW50ZXIobiwgcmVzcEFCdGVzdHNbbl0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdBQnRlc3RzW25dID0gcmVzcEFCdGVzdHNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoY2hhbmdlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKENsaXF6QUJUZXN0cy5QUkVGLCBKU09OLnN0cmluZ2lmeShuZXdBQnRlc3RzKSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICBsb2coJ3JldHJpZXZlIGVycm9yOiAnICsgZS5tZXNzYWdlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgIH0sXG4gICAgcmV0cmlldmU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciB1cmwgPSBDbGlxekFCVGVzdHMuVVJMICsgZW5jb2RlVVJJQ29tcG9uZW50KENsaXF6VXRpbHMuZ2V0UHJlZignc2Vzc2lvbicsJycpKTtcblxuICAgICAgICB2YXIgb25lcnJvciA9IGZ1bmN0aW9uKCl7IGxvZyhcImZhaWxlZCB0byByZXRyaWV2ZSBBQiB0ZXN0IGRhdGFcIik7IH1cblxuICAgICAgICBDbGlxelV0aWxzLmh0dHBHZXQodXJsLCBjYWxsYmFjaywgb25lcnJvciwgMTUwMDApO1xuICAgIH0sXG4gICAgZW50ZXI6IGZ1bmN0aW9uKGFidGVzdCwgcGF5bG9hZCkge1xuICAgICAgICAvLyBBZGQgbmV3IEFCIHRlc3RzIGhlcmUuXG4gICAgICAgIC8vIEl0IGlzIHNhZmUgdG8gcmVtb3ZlIHRoZW0gYXMgc29vbiBhcyB0aGUgdGVzdCBpcyBvdmVyLlxuICAgICAgICB2YXIgcnVsZV9leGVjdXRlZCA9IHRydWVcbiAgICAgICAgc3dpdGNoKGFidGVzdCkge1xuICAgICAgICAgICAgY2FzZSBcIjEwMjRfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImNhdGVnb3J5QXNzZXNzbWVudFwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDI4X0FcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJodW1hbldlYlwiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTAyOF9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiaHVtYW5XZWJcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTAzMl9BXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwic3BlbGxDb3JyTWVzc2FnZVwiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTAzMl9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwic3BlbGxDb3JyTWVzc2FnZVwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDM2X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJleHRlbmRlZF9vbmJvYXJkaW5nX3NhbWVfcmVzdWx0XCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNDVfQVwiOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNDVfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImFudGlUcmFja1Rlc3RcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA0Nl9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYXR0cmFja0Jsb2NrQ29va2llVHJhY2tpbmdcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA0N19CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYXR0cmFja1JlbW92ZVF1ZXJ5U3RyaW5nVHJhY2tpbmdcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA0OF9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYXR0cmFja0FsdGVyUG9zdGRhdGFUcmFja2luZ1wiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDQ5X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJhdHRyYWNrQ2FudmFzRmluZ2VycHJpbnRUcmFja2luZ1wiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDUwX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJhdHRyYWNrUmVmZXJlclRyYWNraW5nXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNTFfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImFudGlUcmFja1Rlc3RcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA1Ml9BXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYXR0cmFja0Jsb2NrQ29va2llVHJhY2tpbmdcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNTJfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImF0dHJhY2tCbG9ja0Nvb2tpZVRyYWNraW5nXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNTNfQVwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImF0dHJhY2tSZW1vdmVRdWVyeVN0cmluZ1RyYWNraW5nXCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDUzX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJhdHRyYWNrUmVtb3ZlUXVlcnlTdHJpbmdUcmFja2luZ1wiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDU1X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJ1bmJsb2NrTW9kZVwiLCBcImFsd2F5c1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDU3X0FcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJ0cmFja2VyVHh0XCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDU3X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJ0cmFja2VyVHh0XCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNThfQVwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcInVuYmxvY2tNb2RlXCIsIFwibmV2ZXJcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA1OF9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwidW5ibG9ja01vZGVcIiwgXCJhbHdheXNcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA1OV9BXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYXR0cmFjay5sb2NhbF90cmFja2luZ1wiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA1OV9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYXR0cmFjay5sb2NhbF90cmFja2luZ1wiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDYwX0FcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJhdHRyYWNrQmxvb21GaWx0ZXJcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjBfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImF0dHJhY2tCbG9vbUZpbHRlclwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDYxX0FcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJhdHRyYWNrVUlcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjFfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImF0dHJhY2tVSVwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDYzX0FcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJkb3VibGUtZW50ZXIyXCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDYzX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJkb3VibGUtZW50ZXIyXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjRfQVwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImF0dHJhY2tEZWZhdWx0QWN0aW9uXCIsIFwic2FtZVwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDY0X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJhdHRyYWNrRGVmYXVsdEFjdGlvblwiLCBcInBsYWNlaG9sZGVyXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjRfQ1wiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImF0dHJhY2tEZWZhdWx0QWN0aW9uXCIsIFwiYmxvY2tcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA2NF9EXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYXR0cmFja0RlZmF1bHRBY3Rpb25cIiwgXCJlbXB0eVwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDY0X0VcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJhdHRyYWNrRGVmYXVsdEFjdGlvblwiLCBcInJlcGxhY2VcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA2NV9BXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiZnJlc2hUYWJOZXdzRW1haWxcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjVfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImZyZXNoVGFiTmV3c0VtYWlsXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjZfQVwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcInByb3h5TmV0d29ya1wiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA2Nl9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwicHJveHlOZXR3b3JrXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjdfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImF0dHJhY2tQcm94eVRyYWNrZXJzXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjhfQVwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImxhbmd1YWdlRGVkdXBcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjhfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImxhbmd1YWdlRGVkdXBcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA2OV9BXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiZ3JPZmZlclN3aXRjaEZsYWdcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjlfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImdyT2ZmZXJTd2l0Y2hGbGFnXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNzBfQVwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImNsaXF6LWFudGktcGhpc2hpbmdcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImNsaXF6LWFudGktcGhpc2hpbmctZW5hYmxlZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA3MF9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiY2xpcXotYW50aS1waGlzaGluZ1wiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJjbGlxei1hbnRpLXBoaXNoaW5nLWVuYWJsZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA3MV9BXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYnJvd3Nlci5wcml2YXRlYnJvd3NpbmcuYXB0XCIsIGZhbHNlLCAnJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA3MV9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiYnJvd3Nlci5wcml2YXRlYnJvd3NpbmcuYXB0XCIsIHRydWUsICcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDcyX0FcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJnckZlYXR1cmVFbmFibGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDcyX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJnckZlYXR1cmVFbmFibGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgY2FzZSBcIjEwNzRfQVwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImNsaXF6LWFkYi1hYnRlc3RcIiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNzRfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuc2V0UHJlZihcImNsaXF6LWFkYi1hYnRlc3RcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA3NV9BXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiZnJlc2h0YWJGZWVkYmFja1wiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA3NV9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKFwiZnJlc2h0YWJGZWVkYmFja1wiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDc2X0FcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJoaXN0b3J5LnRpbWVvdXRzXCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDc2X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoXCJoaXN0b3J5LnRpbWVvdXRzXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBydWxlX2V4ZWN1dGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYocnVsZV9leGVjdXRlZCkge1xuICAgICAgICAgICAgdmFyIGFjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnYWJ0ZXN0JyxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdlbnRlcicsXG4gICAgICAgICAgICAgICAgbmFtZTogYWJ0ZXN0XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgQ2xpcXpVdGlscy50ZWxlbWV0cnkoYWN0aW9uKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICB9XG4gICAgfSxcbiAgICBsZWF2ZTogZnVuY3Rpb24oYWJ0ZXN0LCBkaXNhYmxlKSB7XG4gICAgICAgIC8vIFJlc3RvcmUgZGVmYXVsdHMgYWZ0ZXIgYW4gQUIgdGVzdCBpcyBmaW5pc2hlZC5cbiAgICAgICAgLy8gRE8gTk9UIHJlbW92ZSB0ZXN0IGNsZWFudXAgY29kZSB0b28gcXVpY2tseSwgYSB1c2VyXG4gICAgICAgIC8vIG1pZ2h0IG5vdCBzdGFydCB0aGUgYnJvd3NlciBmb3IgYSBsb25nIHRpbWUgYW5kXG4gICAgICAgIC8vIGdldCBzdHVjayBpbiBhIHRlc3QgaWYgd2UgcmVtb3ZlIGNhc2VzIHRvbyBlYXJseS5cbiAgICAgICAgdmFyIHJ1bGVfZXhlY3V0ZWQgPSB0cnVlO1xuICAgICAgICBzd2l0Y2goYWJ0ZXN0KSB7XG4gICAgICAgICAgICBjYXNlIFwiMTAyNF9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoXCJjYXRlZ29yeUFzc2Vzc21lbnRcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTAyOF9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTAyOF9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoXCJodW1hbldlYlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDMyX0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDMyX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcInNwZWxsQ29yck1lc3NhZ2VcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTAzNl9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTAzNl9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoXCJleHRlbmRlZF9vbmJvYXJkaW5nX3NhbWVfcmVzdWx0XCIpO1xuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKFwiZXh0ZW5kZWRfb25ib2FyZGluZ1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDQ1X0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDQ1X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImFudGlUcmFja1Rlc3RcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA0Nl9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA0N19BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA0OF9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA0OV9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA1MF9BXCI6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA0Nl9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoXCJhdHRyYWNrQmxvY2tDb29raWVUcmFja2luZ1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDQ3X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImF0dHJhY2tSZW1vdmVRdWVyeVN0cmluZ1RyYWNraW5nXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNDhfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKFwiYXR0cmFja0FsdGVyUG9zdGRhdGFUcmFja2luZ1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDQ5X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImF0dHJhY2tDYW52YXNGaW5nZXJwcmludFRyYWNraW5nXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNTBfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKFwiYXR0cmFja1JlZmVyZXJUcmFja2luZ1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDUxX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImFudGlUcmFja1Rlc3RcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA1Ml9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoXCJhdHRyYWNrQmxvY2tDb29raWVUcmFja2luZ1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDUzX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImF0dHJhY2tSZW1vdmVRdWVyeVN0cmluZ1RyYWNraW5nXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNTVfQVwiOlxuICAgICAgICAgICAgY2FzZSBcIjEwNTVfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKFwidW5ibG9ja0VuYWJsZWRcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA1Nl9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA1Nl9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoXCJmcmVzaFRhYkFCXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNTdfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKFwidHJhY2tlclR4dFwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDU4X0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDU4X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcInVuYmxvY2tNb2RlXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNTlfQVwiOlxuICAgICAgICAgICAgY2FzZSBcIjEwNTlfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKFwiYXR0cmFjay5sb2NhbF90cmFja2luZ1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDYwX0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDYwX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImF0dHJhY2tCbG9vbUZpbHRlclwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDYxX0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDYxX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImF0dHJhY2tVSVwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDYzX0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDYzX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImRvdWJsZS1lbnRlcjJcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA2NF9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA2NF9CXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA2NF9DXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA2NF9EXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA2NF9FXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoXCJhdHRyYWNrRGVmYXVsdEFjdGlvblwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDY2X0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDY2X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcInByb3h5TmV0d29ya1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDY1X0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDY1X0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZihcImZyZXNoVGFiTmV3c0VtYWlsXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjdfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKFwiYXR0cmFja1Byb3h5VHJhY2tlcnNcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA2OF9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA2OF9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoXCJsYW5ndWFnZURlZHVwXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNjlfQVwiOlxuICAgICAgICAgICAgY2FzZSBcIjEwNjlfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKFwiZ3JPZmZlclN3aXRjaEZsYWdcIik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDcwX0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDcwX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZignY2xpcXotYW50aS1waGlzaGluZycpO1xuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKCdjbGlxei1hbnRpLXBoaXNoaW5nLWVuYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDcxX0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDcxX0JcIjpcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmNsZWFyUHJlZignYnJvd3Nlci5wcml2YXRlYnJvd3NpbmcuYXB0JywgJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBjYXNlIFwiMTA3Ml9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA3Ml9CXCI6XG4gICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKCdnckZlYXR1cmVFbmFibGVkJyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIjEwNzRfQVwiOlxuICAgICAgICAgICAgY2FzZSBcIjEwNzRfQlwiOlxuICAgICAgICAgICAgICAgIENsaXF6VXRpbHMuY2xlYXJQcmVmKCdjbGlxei1hZGItYWJ0ZXN0Jyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiMTA3NV9BXCI6XG4gICAgICAgICAgICBjYXNlIFwiMTA3NV9CXCI6XG4gICAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoJ2ZyZXNodGFiRmVlZGJhY2snKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCIxMDc2X0FcIjpcbiAgICAgICAgICAgIGNhc2UgXCIxMDc2X0JcIjpcbiAgICAgICAgICAgICAgQ2xpcXpVdGlscy5jbGVhclByZWYoJ2hpc3RvcnkudGltZW91dHMnKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJ1bGVfZXhlY3V0ZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZihydWxlX2V4ZWN1dGVkKSB7XG4gICAgICAgICAgICB2YXIgYWN0aW9uID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdhYnRlc3QnLFxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2xlYXZlJyxcbiAgICAgICAgICAgICAgICBuYW1lOiBhYnRlc3QsXG4gICAgICAgICAgICAgICAgZGlzYWJsZTogZGlzYWJsZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIENsaXF6VXRpbHMudGVsZW1ldHJ5KGFjdGlvbik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgIH1cbiAgICB9LFxuICAgIGRpc2FibGU6IGZ1bmN0aW9uKGFidGVzdCkge1xuICAgICAgICAvLyBEaXNhYmxlIGFuIEFCIHRlc3QgYnV0IGRvIG5vdCByZW1vdmUgaXQgZnJvbSBsaXN0IG9mIGFjdGl2ZSBBQiB0ZXN0cyxcbiAgICAgICAgLy8gdGhpcyBpcyBpbnRlbmRlZCB0byBiZSB1c2VkIGJ5IHRoZSBleHRlbnNpb24gaXRzZWxmIHdoZW4gaXQgZXhwZXJpZW5jZXNcbiAgICAgICAgLy8gYW4gZXJyb3IgYXNzb2NpYXRlZCB3aXRoIHRoaXMgQUIgdGVzdC5cbiAgICAgICAgaWYoQ2xpcXpVdGlscy5oYXNQcmVmKENsaXF6QUJUZXN0cy5QUkVGKSkge1xuICAgICAgICAgICAgIHZhciBjdXJBQnRlc3RzID0gSlNPTi5wYXJzZShDbGlxelV0aWxzLmdldFByZWYoQ2xpcXpBQlRlc3RzLlBSRUYpKTtcblxuICAgICAgICAgICAgaWYoY3VyQUJ0ZXN0c1thYnRlc3RdICYmIENsaXF6QUJUZXN0cy5sZWF2ZShhYnRlc3QsIHRydWUpKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFyayBhcyBkaXNhYmxlZCBhbmQgc2F2ZSBiYWNrIHRvIHByZWZlcmVuY2VzXG4gICAgICAgICAgICAgICAgY3VyQUJ0ZXN0c1thYnRlc3RdLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBDbGlxelV0aWxzLnNldFByZWYoQ2xpcXpBQlRlc3RzLlBSRUYsIEpTT04uc3RyaW5naWZ5KGN1ckFCdGVzdHMpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgQ2xpcXpBQlRlc3RzO1xuIl19