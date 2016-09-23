System.register("autocomplete/spell-check", ["autocomplete/autocomplete", "core/cliqz"], function (_export) {
    "use strict";

    var autocomplete, utils, CliqzSpellCheck;
    return {
        setters: [function (_autocompleteAutocomplete) {
            autocomplete = _autocompleteAutocomplete["default"];
        }, function (_coreCliqz) {
            utils = _coreCliqz.utils;
        }],
        execute: function () {
            CliqzSpellCheck = {
                check: function check(q) {
                    var words = q.split(" ");
                    var correctBack = {};
                    for (var i = 0; i < words.length; i++) {
                        if (words[i] == "") continue;
                        if (autocomplete.spellCorrectionDict.hasOwnProperty(words[i])) {
                            var correct = autocomplete.spellCorrectionDict[words[i]];
                            if (correct.length > words[i].length && correct.slice(0, words[i].length) == words[i] && i == words.length - 1) continue;
                            if (correct.length < words[i].length && words[i].slice(0, correct.length) == correct && i == words.length - 1) continue;
                            if (i == words.length - 1 && words[i].length <= 10) // long enough to correct the last word
                                continue;
                            correctBack[correct] = words[i];
                            words[i] = correct;
                        }
                    }
                    return [words.join(" "), correctBack];
                },
                loadRecords: function loadRecords(req) {
                    var content = req.response.split("\n");
                    for (var i = 0; i < content.length; i++) {
                        var words = content[i].split("\t");
                        var wrong = words[0];
                        var right = words[1];
                        autocomplete.spellCorrectionDict[wrong] = right;
                    }
                },
                init: function init() {
                    if (utils.getPref("config_location", "") == "de" && Object.keys(autocomplete.spellCorrectionDict).length == 0) {
                        utils.log('loading dict', 'spellcorr');
                        utils.loadResource('chrome://cliqz/content/spell_check.list', CliqzSpellCheck.loadRecords);
                    }
                }
            };

            _export("default", CliqzSpellCheck);
        }
    };
});