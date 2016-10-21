System.register("autocomplete/autocomplete", ["core/cliqz", "autocomplete/history-cluster", "autocomplete/result", "autocomplete/result-providers"], function (_export) {
    /*
     * This module implements the core functionality based on nsIAutoCompleteResult interface
     * http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
     */

    "use strict";

    var utils, events, historyCluster, Result, resultProviders, CliqzAutocomplete;

    function isQinvalid(q) {
        //TODO: add more
        if (q.indexOf('view-source:') === 0) return true;

        return false;
    }

    return {
        setters: [function (_coreCliqz) {
            utils = _coreCliqz.utils;
            events = _coreCliqz.events;
        }, function (_autocompleteHistoryCluster) {
            historyCluster = _autocompleteHistoryCluster["default"];
        }, function (_autocompleteResult) {
            Result = _autocompleteResult["default"];
        }, function (_autocompleteResultProviders) {
            resultProviders = _autocompleteResultProviders["default"];
        }],
        execute: function () {
            CliqzAutocomplete = {
                LOG_KEY: 'CliqzAutocomplete',
                HISTORY_TIMEOUT: 200,
                SCROLL_SIGNAL_MIN_TIME: 500,
                lastPattern: null,
                lastSearch: '',
                lastResult: null,
                lastSuggestions: null,
                lastResultHeights: [],
                hasUserScrolledCurrentResults: false, // set to true whenever user scrolls, set to false when new results are shown
                lastResultsUpdateTime: null, // to measure how long a result has been shown for
                resultsOverflowHeight: 0, // to determine if scrolling is possible (i.e., overflow > 0px)
                afterQueryCount: 0,
                discardedResults: 0,
                isPopupOpen: false,
                lastPopupOpen: null,
                lastQueryTime: null,
                lastDisplayTime: null,
                lastFocusTime: null,
                highlightFirstElement: false,
                spellCorrectionDict: {},
                spellCorr: {
                    'on': false,
                    'correctBack': {},
                    'override': false,
                    'pushed': null,
                    'userConfirmed': false,
                    'searchTerms': []
                },
                hm: null,
                currentAutoLoadURL: null,
                getResultsOrder: function getResultsOrder(results) {
                    return CliqzAutocomplete.prepareResultOrder(results);
                },
                // SOURCE: https://developer.mozilla.org/en-US/docs/How_to_implement_custom_autocomplete_search_component
                ProviderAutoCompleteResultCliqz: function ProviderAutoCompleteResultCliqz(searchString, searchResult, defaultIndex, errorDescription) {
                    this._searchString = searchString;
                    this._searchResult = searchResult;
                    this._defaultIndex = defaultIndex;
                },
                // SOURCE: http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
                CliqzResults: function CliqzResults() {},
                resetSpellCorr: function resetSpellCorr() {
                    CliqzAutocomplete.spellCorr = {
                        'on': false,
                        'correctBack': {},
                        'override': false,
                        'pushed': null,
                        'userConfirmed': false,
                        'searchTerms': []
                    };
                },
                initProvider: function initProvider() {
                    CliqzAutocomplete.ProviderAutoCompleteResultCliqz.prototype = Object.defineProperties({
                        _searchString: '',
                        _searchResult: 0,
                        _defaultIndex: 0,
                        _errorDescription: '',
                        _results: [],

                        getValueAt: function getValueAt(index) {
                            return (this._results[index] || {}).val;
                        },
                        getFinalCompleteValueAt: function getFinalCompleteValueAt(index) {
                            return null;
                        }, //FF31+
                        getCommentAt: function getCommentAt(index) {
                            return (this._results[index] || {}).comment;
                        },
                        getStyleAt: function getStyleAt(index) {
                            return (this._results[index] || {}).style;
                        },
                        getImageAt: function getImageAt(index) {
                            return '';
                        },
                        getLabelAt: function getLabelAt(index) {
                            return (this._results[index] || {}).label;
                        },
                        getDataAt: function getDataAt(index) {
                            return (this._results[index] || {}).data;
                        },
                        QueryInterface: XPCOMUtils.generateQI([]),
                        setResults: function setResults(results) {

                            this._results = this.filterUnexpected(results);

                            CliqzAutocomplete.lastResult = this;
                            events.pub('autocomplete.new_result', { result: this, isPopupOpen: CliqzAutocomplete.isPopupOpen });
                            var order = CliqzAutocomplete.getResultsOrder(this._results);
                            utils.setResultOrder(order);

                            // flag for rendering to avoid rendering of "unmixed" results
                            this.isMixed = true;
                        },

                        filterUnexpected: function filterUnexpected(results) {
                            // filter out ununsed/unexpected results
                            var ret = [];
                            for (var i = 0; i < results.length; i++) {
                                var r = results[i];
                                if (r.style == 'cliqz-extra') {
                                    if (r.data) {
                                        // override the template if the superTemplate is known
                                        if (utils.isUnknownTemplate(r.data.template)) {
                                            // unexpected/unknown template
                                            continue;
                                        }
                                    }
                                }

                                // If one of the results is data.only = true Remove all others.
                                // if (!r.invalid && r.data && r.data.only) {
                                //  return [r];
                                //}

                                ret.push(r);
                            }
                            return ret;
                        }
                    }, {
                        searchString: {
                            get: function get() {
                                return this._searchString;
                            },
                            configurable: true,
                            enumerable: true
                        },
                        searchResult: {
                            get: function get() {
                                return this._searchResult;
                            },
                            configurable: true,
                            enumerable: true
                        },
                        defaultIndex: {
                            get: function get() {
                                return this._defaultIndex;
                            },
                            configurable: true,
                            enumerable: true
                        },
                        errorDescription: {
                            get: function get() {
                                return this._errorDescription;
                            },
                            configurable: true,
                            enumerable: true
                        },
                        matchCount: {
                            get: function get() {
                                return this._results.length;
                            },
                            configurable: true,
                            enumerable: true
                        }
                    });
                },
                // a result is done once a new result comes in, or once the popup closes
                markResultsDone: function markResultsDone(newResultsUpdateTime) {
                    // is there a result to be marked as done?
                    if (CliqzAutocomplete.lastResultsUpdateTime) {
                        var resultsDisplayTime = Date.now() - CliqzAutocomplete.lastResultsUpdateTime;
                        this.sendResultsDoneSignal(resultsDisplayTime);
                    }
                    // start counting elapsed time anew
                    CliqzAutocomplete.lastResultsUpdateTime = newResultsUpdateTime;
                    CliqzAutocomplete.hasUserScrolledCurrentResults = false;
                },
                sendResultsDoneSignal: function sendResultsDoneSignal(resultsDisplayTime) {
                    // reduced traffic: only consider telemetry data if result was shown long enough (e.g., 0.5s)
                    if (resultsDisplayTime > CliqzAutocomplete.SCROLL_SIGNAL_MIN_TIME) {
                        var action = {
                            type: 'activity',
                            action: 'results_done',
                            has_user_scrolled: CliqzAutocomplete.hasUserScrolledCurrentResults,
                            results_display_time: resultsDisplayTime,
                            results_overflow_height: CliqzAutocomplete.resultsOverflowHeight,
                            can_user_scroll: CliqzAutocomplete.resultsOverflowHeight > 0
                        };
                        utils.telemetry(action);
                    }
                },
                // returns array of result kinds, adding each result's
                // height in terms of occupied dropdown slots (1-3) as
                // parameter (e.g., ["C|{\"h\":1}"],["m|{\"h\":1}"])
                prepareResultOrder: function prepareResultOrder(results) {
                    // heights is updated in UI's handleResults
                    var heights = CliqzAutocomplete.lastResultHeights,
                        resultOrder = [];

                    if (results) {
                        for (var i = 0; i < results.length; i++) {
                            if (results[i].data == null || results[i].data.kind == null) {
                                resultOrder.push('_'); //debug - it should not happen
                                continue;
                            }

                            var kind = results[i].data.kind.slice(0),
                                tokens = kind && kind.length > 0 ? kind[0].split('|') : [],
                                params = tokens.length > 1 ? JSON.parse(tokens[1]) : {};

                            params.h = i < heights.length ? heights[i] : 0;
                            kind[0] = tokens[0] + '|' + JSON.stringify(params);
                            resultOrder.push(kind);
                        }
                    }

                    return resultOrder;
                },
                initResults: function initResults() {
                    CliqzAutocomplete.CliqzResults.prototype = {
                        resultsTimer: null,
                        historyTimer: null,
                        historyTimeout: false,
                        instant: [],

                        historyTimeoutCallback: function historyTimeoutCallback(params) {
                            utils.log('history timeout', CliqzAutocomplete.LOG_KEY);
                            this.historyTimeout = true;
                            // History timed out but maybe we have some results already
                            // So show what you have - AB 1073
                            if (this.historyResults && CliqzUtils.getPref("history.timeouts", false)) {
                                historyCluster.addFirefoxHistory(this.historyResults);
                                CliqzUtils.log('historyTimeoutCallback: push collected results:' + this.historyResults.results.length, CliqzAutocomplete.LOG_KEY);
                            } else {
                                this.pushResults(this.searchString);
                            }
                        },
                        onHistoryDone: function onHistoryDone(result, resultExtra) {
                            if (!this.startTime) {
                                return; // no current search, just discard
                            }

                            var now = Date.now();

                            this.historyResults = result;
                            this.latency.history = now - this.startTime;

                            //utils.log("history results: " + (result ? result.matchCount : "null") + "; done: " + this.isHistoryReady() +
                            //               "; time: " + (now - this.startTime), CliqzAutocomplete.LOG_KEY)
                            // Choose an instant result if we have all history results (timeout)
                            // and we haven't already chosen one
                            if (result && (this.isHistoryReady() || this.historyTimeout) && this.mixedResults.matchCount == 0) {
                                utils.clearTimeout(this.historyTimer);
                                historyCluster.addFirefoxHistory(result);
                            }
                        },
                        isHistoryReady: function isHistoryReady() {
                            return this.historyResults && this.historyResults.ready;
                        },
                        cliqz_hm_search: function cliqz_hm_search(_this, res, hist_search_type) {
                            var data = null;
                            if (hist_search_type === 1) {
                                data = CliqzUtils.hm.do_search(res.query, false);
                                data['cont'] = null;
                            } else {
                                data = CliqzUtils.hm.do_search(res.query, true);
                            }

                            var urlAuto = CliqzUtils.hm.urlForAutoLoad(data);
                            if (false && urlAuto) {
                                var win = CliqzUtils.getWindow().gBrowser.contentWindow;
                                //if (CliqzAutocomplete.currentAutoLoadURL==null || win.location.href=='about:cliqz') {
                                if (win.location.href != urlAuto) {
                                    CliqzUtils.log(">> AUTOLOAD LAUNCH: " + urlAuto, 'CliqzHM');
                                    win.location.href = urlAuto;
                                    CliqzAutocomplete.currentAutoLoadURL = urlAuto;
                                }
                                //}
                            }

                            // Extract results
                            var patterns = [];
                            for (var i = 0; i < data.result.length; i++) {
                                var url = CliqzUtils.cleanMozillaActions(data.result[i][0])[1],
                                    title = data.result[i][1];

                                if (!title || title == 'N/A') {
                                    title = CliqzUtils.generalizeUrl(url);
                                }

                                if (title.length > 0 && url.length > 0 && Result.isValid(url, CliqzUtils.getDetailsFromUrl(url))) {

                                    var item = {
                                        url: url,
                                        title: title,
                                        favicon: null, //history.results[i].image,
                                        _genUrl: CliqzUtils.generalizeUrl(url, true)
                                    };

                                    if (data.result[i][3]) {
                                        if (data.result[i][3].hasOwnProperty('c')) item['xtra_c'] = data.result[i][3]['c'];
                                        if (data.result[i][3].hasOwnProperty('q')) item['xtra_q'] = data.result[i][3]['q'];
                                    }

                                    patterns.push(item);
                                }

                                var cont = null;
                                if (data.hasOwnProperty('cont')) cont = data['cont'];
                            }

                            if (patterns.length > 0) {
                                var res3 = historyCluster._simplePreparePatterns(patterns, res.query);
                                // This is also causing undefined issue. Specifically when the res.length == 0;
                                if (res3.results.length == 0) {
                                    res3.results.push({ "url": res.query, "title": "Found no result in local history for query: ", "favicon": "", "_genUrl": "", "base": true, "debug": "" });
                                }
                                historyCluster.simpleCreateInstantResult(res3, cont, _this.searchString, function (kk2) {
                                    var vjoin = [];
                                    vjoin.push(kk2[0]);
                                    _this.createInstantResultCallback(vjoin, 'hm');
                                });
                            }
                        },
                        historyPatternCallback: function historyPatternCallback(res) {

                            // abort if we already have results
                            if (this.mixedResults.matchCount > 0) return;

                            if (res.query == this.searchString) {
                                CliqzAutocomplete.lastPattern = res;

                                var latency = 0;
                                if (historyCluster.latencies[res.query]) {
                                    latency = new Date().getTime() - historyCluster.latencies[res.query];
                                }
                                this.latency.patterns = latency;

                                // Create instant result
                                historyCluster.createInstantResult(res, this.searchString, this.createInstantResultCallback, this.customResults);
                            }
                        },
                        createInstantResultCallback: function createInstantResultCallback(instant, type_res) {
                            if (type_res == 'hm') {
                                instant[0].type = 'hm';
                                this.instant.unshift(instant[0]);
                            } else {
                                if (this.instant.length > 0 && this.instant[0].type == 'hm') {
                                    this.instant[1] = instant[0];
                                } else {
                                    this.instant = instant;
                                }
                            }
                            this.pushResults(this.searchString);
                        },
                        pushTimeoutCallback: function pushTimeoutCallback(params) {
                            utils.log("pushResults timeout", CliqzAutocomplete.LOG_KEY);
                            this.pushResults(params);
                        },
                        // checks if all the results are ready or if the timeout is exceeded
                        pushResults: function pushResults(q) {
                            if (q == this.searchString && this.startTime != null) {
                                // be sure this is not a delayed result
                                var now = Date.now();

                                if (now > this.startTime + utils.RESULTS_TIMEOUT || (this.isHistoryReady() || this.historyTimeout) && // history is ready or timed out
                                this.cliqzResults) {
                                    // all results are ready
                                    /// Push full result
                                    utils.clearTimeout(this.resultsTimer);
                                    utils.clearTimeout(this.historyTimer);

                                    this.mixResults(false);

                                    this.latency.mixed = Date.now() - this.startTime;

                                    this.callback(this.mixedResults, this);

                                    this.latency.all = Date.now() - this.startTime;

                                    // delay wrapping to make sure rendering is complete
                                    // otherwise we don't get up to date autocomplete stats
                                    utils.setTimeout(this.fullWrapup, 0, this);

                                    return;
                                } else if (this.isHistoryReady()) {
                                    /// Push instant result
                                    this.latency.mixed = Date.now() - this.startTime;

                                    this.mixResults(true);

                                    // try to update as offen as possible if new results are ready
                                    // TODO - try to check if the same results are currently displaying
                                    this.mixedResults.matchCount && this.callback(this.mixedResults, this);

                                    this.latency.all = Date.now() - this.startTime;

                                    // Do partial wrapup, final wrapup will happen after all results are received
                                    utils.setTimeout(this.instantWrapup, 0, this);
                                } else {
                                    /// Nothing to push yet, probably only cliqz results are received, keep waiting
                                }
                            }
                        },

                        // handles fetched results from the cache
                        cliqzResultFetcher: function cliqzResultFetcher(req, q) {

                            // be sure this is not a delayed result
                            if (q != this.searchString) {
                                this.discardedResults += 1; // count results discarded from backend because they were out of date
                            } else {
                                    this.latency.backend = Date.now() - this.startTime;
                                    var results = [];
                                    var json = JSON.parse(req.response);

                                    // apply rerankers
                                    for (var i = 0; i < utils.RERANKERS.length; i++) {
                                        var reranker = utils.RERANKERS[i];
                                        if (reranker != null) {
                                            var rerankerResults = reranker.doRerank(json.result);
                                            json.result = rerankerResults.response;
                                            if (Object.keys(rerankerResults.telemetrySignal).length > 0) {
                                                this.userRerankers[reranker.name] = rerankerResults.telemetrySignal;
                                            }
                                        }
                                    }

                                    utils.log(json.result ? json.result.length : 0, "CliqzAutocomplete.cliqzResultFetcher");

                                    results = json.result || [];

                                    this.cliqzResultsExtra = [];

                                    if (json.images && json.images.results && json.images.results.length > 0) {
                                        var imgs = json.images.results.filter(function (r) {
                                            //ignore empty results
                                            return Object.keys(r).length != 0;
                                        });

                                        this.cliqzResultsExtra = imgs.map(Result.cliqzExtra);
                                    }

                                    var hasExtra = function hasExtra(el) {
                                        if (!el || !el.results || el.results.length == 0) return false;
                                        el.results = el.results.filter(function (r) {
                                            //ignore empty results
                                            return r.hasOwnProperty('url');
                                        });

                                        return el.results.length != 0;
                                    };

                                    if (hasExtra(json.extra)) {
                                        this.cliqzResultsExtra = json.extra.results.map(Result.cliqzExtra);
                                    }
                                    this.latency.cliqz = json.duration;

                                    this.cliqzResults = results.filter(function (r) {
                                        // filter results with no or empty url
                                        return r.url != undefined && r.url != '';
                                    });

                                    this.cliqzResultsParams = {
                                        choice: json.choice
                                    };
                                }
                            this.pushResults(q);
                        },
                        createFavicoUrl: function createFavicoUrl(url) {
                            return 'http://cdnfavicons.cliqz.com/' + url.replace('http://', '').replace('https://', '').split('/')[0];
                        },
                        // mixes backend results, entity zones, history and custom results
                        mixResults: function mixResults(only_instant) {

                            // set first history entry as autocompleted if it was
                            if (this.instant.length > 0 && CliqzAutocomplete.lastAutocompleteActive && !only_instant) {
                                this.instant[0].autocompleted = true;
                            }

                            var results = CliqzAutocomplete.Mixer.mix(this.searchString, this.cliqzResults, this.cliqzResultsExtra, this.instant, this.customResults, only_instant);
                            CliqzAutocomplete.lastResultIsInstant = only_instant;
                            CliqzAutocomplete.afterQueryCount = 0;

                            this.mixedResults.setResults(results);
                        },
                        analyzeQuery: function analyzeQuery(q) {
                            var parts = resultProviders.getCustomResults(q);
                            this.customResults = parts[1];
                            return parts[0];
                        },
                        //FF entry point
                        //TODO: to be moved to Environment!
                        startSearch: function startSearch(searchString, searchParam, previousResult, listener) {
                            this.search(searchString, function (results, ctx) {
                                listener.onSearchResult(ctx, results);
                            });
                        },
                        search: function search(searchString, callback) {

                            CliqzAutocomplete.lastQueryTime = Date.now();
                            CliqzAutocomplete.lastDisplayTime = null;
                            CliqzAutocomplete.lastResult = null;
                            CliqzAutocomplete.lastSuggestions = null;
                            this.oldPushLength = 0;
                            this.customResults = null;
                            this.latency = {
                                cliqz: null,
                                history: null,
                                backend: null,
                                mixed: null,
                                all: null
                            };
                            this.userRerankers = {};

                            utils.log('search: ' + searchString, CliqzAutocomplete.LOG_KEY);

                            var invalidQ = isQinvalid(searchString.trim()),
                                action = {
                                type: 'activity',
                                action: 'key_stroke',
                                current_length: searchString.length,
                                invalid: invalidQ
                            };
                            utils.telemetry(action);

                            if (invalidQ) {
                                //we call the callback with no results to trigger a dropdown close
                                callback(null, this);
                                return;
                            }

                            if (CliqzAutocomplete.lastSearch.length > searchString.length) {
                                CliqzAutocomplete.spellCorr.override = true;
                            }
                            // analyse and modify query for custom results
                            CliqzAutocomplete.lastSearch = searchString;
                            searchString = this.analyzeQuery(searchString);

                            // spell correction
                            var urlbar = utils.getWindow().document.getElementById('urlbar');
                            if (urlbar && //we do not have urlbar on mobile TODO - fix it better!
                            !CliqzAutocomplete.spellCorr.override && urlbar.selectionEnd == urlbar.selectionStart && urlbar.selectionEnd == urlbar.value.length) {
                                var parts = CliqzAutocomplete.spellCheck.check(searchString);
                                var newSearchString = parts[0];
                                var correctBack = parts[1];

                                for (var c in correctBack) {
                                    CliqzAutocomplete.spellCorr.correctBack[c] = correctBack[c];
                                }
                            } else {
                                // user don't want spell correction
                                var newSearchString = searchString;
                            }
                            this.wrongSearchString = searchString;
                            if (newSearchString != searchString) {
                                // the local spell checker kicks in
                                var action = {
                                    type: 'activity',
                                    action: 'spell_correction',
                                    current_length: searchString.length
                                };
                                utils.telemetry(action);
                                CliqzAutocomplete.spellCorr.on = true;
                                searchString = newSearchString;
                                CliqzAutocomplete.spellCorr['userConfirmed'] = false;
                            }

                            this.cliqzResults = null;
                            this.cliqzResultsExtra = null;
                            this.cliqzResultsParams = {};
                            this.cliqzCache = null;
                            this.historyResults = null;
                            this.instant = [];

                            this.callback = callback;
                            this.searchString = searchString;
                            this.searchStringSuggest = null;

                            this.mixedResults = new CliqzAutocomplete.ProviderAutoCompleteResultCliqz(this.searchString, Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS, -2, // blocks autocomplete
                            '');

                            this.startTime = Date.now();
                            this.mixedResults.suggestionsRecieved = false;
                            // ensure context
                            this.cliqzResultFetcher = this.cliqzResultFetcher.bind(this);
                            this.pushResults = this.pushResults.bind(this);
                            this.historyTimeoutCallback = this.historyTimeoutCallback.bind(this);
                            this.pushTimeoutCallback = this.pushTimeoutCallback.bind(this);
                            this.historyPatternCallback = this.historyPatternCallback.bind(this);
                            this.createInstantResultCallback = this.createInstantResultCallback.bind(this);
                            historyCluster.historyCallback = this.historyPatternCallback;
                            if (searchString.trim().length) {
                                // start fetching results
                                utils.getBackendResults(searchString, this.cliqzResultFetcher);
                                // if spell correction, no suggestions
                                if (CliqzAutocomplete.spellCorr.on && !CliqzAutocomplete.spellCorr.override) {
                                    this.suggestionsRecieved = true;
                                    // change the wrong string to the real wrong string
                                    for (var p in CliqzAutocomplete.spellCorr.correctBack) {
                                        if (this.wrongSearchString.indexOf(CliqzAutocomplete.spellCorr.correctBack[p]) == -1) {
                                            this.wrongSearchString = this.wrongSearchString.replace(p, CliqzAutocomplete.spellCorr.correctBack[p]);
                                        }
                                    }
                                    this.cliqzSuggestions = [searchString, this.wrongSearchString];
                                    CliqzAutocomplete.lastSuggestions = this.cliqzSuggestions;
                                    utils.log(CliqzAutocomplete.lastSuggestions, 'spellcorr');

                                    //TODO: extract spell corrector out of CliqzAutocomplete
                                    if (urlbar) urlbar.mInputField.value = searchString;
                                } else {
                                    //utils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
                                }
                                utils.clearTimeout(this.resultsTimer);
                                this.resultsTimer = utils.setTimeout(this.pushTimeoutCallback, utils.RESULTS_TIMEOUT, this.searchString);
                            } else {
                                this.cliqzResults = [];
                                this.cliqzResultsExtra = [];
                                CliqzAutocomplete.resetSpellCorr();
                            }

                            // trigger history search
                            utils.historySearch(searchString, this.onHistoryDone.bind(this), CliqzAutocomplete.sessionStart);

                            utils.clearTimeout(this.historyTimer);
                            this.historyTimer = utils.setTimeout(this.historyTimeoutCallback, CliqzAutocomplete.HISTORY_TIMEOUT, this.searchString);
                            this.historyTimeout = false;

                            var hist_search_type = utils.getPref('hist_search_type', 0);
                            if (hist_search_type != 0) {
                                CliqzUtils.log('Calling CliqzHM.cliqz_hm_search for: ' + searchString, 'CliqzHM');
                                this.cliqz_hm_search(this, { 'query': searchString }, hist_search_type);
                            }
                        },
                        /**
                        * Stops an asynchronous search that is in progress
                        */
                        stopSearch: function stopSearch() {
                            utils.clearTimeout(this.resultsTimer);
                            utils.clearTimeout(this.historyTimer);
                        },

                        sendResultsSignal: function sendResultsSignal(obj, instant) {
                            var results = obj.mixedResults._results;
                            var action = {
                                type: 'activity',
                                action: 'results',
                                query_length: CliqzAutocomplete.lastSearch.length,
                                result_order: CliqzAutocomplete.prepareResultOrder(results),
                                instant: instant,
                                popup: CliqzAutocomplete.isPopupOpen ? true : false,
                                latency_cliqz: obj.latency.cliqz,
                                latency_history: obj.historyTimeout ? null : obj.latency.history,
                                latency_patterns: obj.latency.patterns,
                                latency_backend: obj.latency.backend,
                                latency_mixed: obj.latency.mixed,
                                latency_all: obj.startTime ? Date.now() - obj.startTime : null,
                                discarded: obj.discardedResults,
                                user_rerankers: obj.userRerankers,
                                backend_params: obj.cliqzResultsParams,
                                v: 1
                            };

                            // reset count of discarded backend results
                            obj.discardedResults = 0;

                            if (CliqzAutocomplete.lastAutocompleteActive) {
                                action.autocompleted = CliqzAutocomplete.lastAutocompleteActive;
                                action.autocompleted_length = CliqzAutocomplete.lastAutocompleteLength;
                            }

                            if (action.result_order.indexOf('C') > -1 && utils.getPref('logCluster', false)) {
                                action.Ctype = utils.getClusteringDomain(results[0].val);
                            }

                            if (CliqzAutocomplete.isPopupOpen) {
                                // don't mark as done if popup closed as the user does not see anything
                                CliqzAutocomplete.markResultsDone(Date.now());
                            }

                            // remembers if the popup was open for last result
                            CliqzAutocomplete.lastPopupOpen = CliqzAutocomplete.isPopupOpen;
                            if (results.length > 0) {
                                CliqzAutocomplete.lastDisplayTime = Date.now();
                            }
                            utils.telemetry(action);
                        },

                        // Wrap up after a completed search
                        fullWrapup: function fullWrapup(obj) {
                            obj.sendResultsSignal(obj, false);

                            obj.startTime = null;
                            utils.clearTimeout(obj.resultsTimer);
                            utils.clearTimeout(obj.historyTimer);
                            obj.resultsTimer = null;
                            obj.historyTimer = null;
                            obj.cliqzResults = null;
                            obj.cliqzResultsExtra = null;
                            obj.cliqzCache = null;
                            obj.historyResults = null;
                            obj.instant = [];
                        },

                        // Wrap up after instant results are shown
                        instantWrapup: function instantWrapup(obj) {
                            obj.sendResultsSignal(obj, true);
                        }
                    };
                }
            };

            CliqzAutocomplete.initProvider();
            CliqzAutocomplete.initResults();

            _export("default", CliqzAutocomplete);
        }
    };
});
System.register("autocomplete/background", ["core/cliqz", "core/platform", "autocomplete/autocomplete", "autocomplete/spell-check", "autocomplete/history-cluster", "autocomplete/result-providers", "autocomplete/smart-cliqz-cache/smart-cliqz-cache", "autocomplete/smart-cliqz-cache/trigger-url-cache", "autocomplete/result", "autocomplete/wikipedia-deduplication", "autocomplete/mixer"], function (_export) {
  "use strict";

  var utils, isFirefox, autocomplete, SpellCheck, historyCluster, ResultProviders, SmartCliqzCache, TriggerUrlCache, Result, WikipediaDeduplication, Mixer, AutocompleteComponent;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function onReady() {
    return new Promise(function (resolve) {
      if (isFirefox && Services.search && Services.search.init) {
        Services.search.init(resolve);
      } else {
        resolve();
      }
    });
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_corePlatform) {
      isFirefox = _corePlatform.isFirefox;
    }, function (_autocompleteAutocomplete) {
      autocomplete = _autocompleteAutocomplete["default"];
    }, function (_autocompleteSpellCheck) {
      SpellCheck = _autocompleteSpellCheck["default"];
    }, function (_autocompleteHistoryCluster) {
      historyCluster = _autocompleteHistoryCluster["default"];
    }, function (_autocompleteResultProviders) {
      ResultProviders = _autocompleteResultProviders["default"];
    }, function (_autocompleteSmartCliqzCacheSmartCliqzCache) {
      SmartCliqzCache = _autocompleteSmartCliqzCacheSmartCliqzCache["default"];
    }, function (_autocompleteSmartCliqzCacheTriggerUrlCache) {
      TriggerUrlCache = _autocompleteSmartCliqzCacheTriggerUrlCache["default"];
    }, function (_autocompleteResult) {
      Result = _autocompleteResult["default"];
    }, function (_autocompleteWikipediaDeduplication) {
      WikipediaDeduplication = _autocompleteWikipediaDeduplication["default"];
    }, function (_autocompleteMixer) {
      Mixer = _autocompleteMixer["default"];
    }],
    execute: function () {
      AutocompleteComponent = (function () {
        function AutocompleteComponent() {
          _classCallCheck(this, AutocompleteComponent);

          this.reg = Cm.QueryInterface(Ci.nsIComponentRegistrar);
          this.FFcontract = {
            classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
            classDescription: 'Cliqz',
            contractID: '@mozilla.org/autocomplete/search;1?name=cliqz-results',
            QueryInterface: XPCOMUtils.generateQI([Ci.nsIAutoCompleteSearch])
          };
        }

        _createClass(AutocompleteComponent, [{
          key: "unregister",
          value: function unregister() {
            try {
              this.reg.unregisterFactory(this.reg.contractIDToCID(this.FFcontract.contractID), this.reg.getClassObjectByContractID(this.FFcontract.contractID, Ci.nsISupports));
            } catch (e) {}
          }
        }, {
          key: "register",
          value: function register() {
            Object.assign(autocomplete.CliqzResults.prototype, this.FFcontract);
            var cp = autocomplete.CliqzResults.prototype;
            var factory = XPCOMUtils.generateNSGetFactory([autocomplete.CliqzResults])(cp.classID);
            this.reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);
          }
        }]);

        return AutocompleteComponent;
      })();

      _export("default", {

        init: function init(settings) {
          var _this = this;

          return onReady().then(function () {
            ResultProviders.init();
            autocomplete.CliqzResultProviders = ResultProviders;

            SpellCheck.init();
            autocomplete.CliqzHistoryCluster = historyCluster;

            _this.smartCliqzCache = new SmartCliqzCache();
            _this.triggerUrlCache = new TriggerUrlCache();
            _this.triggerUrlCache.init();

            if (isFirefox) {
              Mixer.init({
                smartCliqzCache: _this.smartCliqzCache,
                triggerUrlCache: _this.triggerUrlCache
              });
              _this.autocompleteComponent = new AutocompleteComponent();
              _this.autocompleteComponent.unregister();
              _this.autocompleteComponent.register();
              utils.RERANKERS.push(WikipediaDeduplication);
            } else {
              Mixer.init();
            }
            autocomplete.Mixer = Mixer;

            utils.getBackendResults = utils.getCliqzResults;
            // glueing stuff
            autocomplete.spellCheck = SpellCheck;
            utils.autocomplete = autocomplete;

            utils.registerResultProvider({
              ResultProviders: ResultProviders,
              Result: Result
            });
          });
        },

        unload: function unload() {
          if (isFirefox) {
            this.autocompleteComponent.unregister();
          }

          this.smartCliqzCache.unload();
          this.triggerUrlCache.unload();
        },

        beforeBrowserShutdown: function beforeBrowserShutdown() {}
      });
    }
  };
});
System.register("autocomplete/calculator", ["core/cliqz", "autocomplete/result", "core/platform"], function (_export) {
  /*
   * This module handles various calculations
   *
   */

  "use strict";

  var utils, Result, isFirefox, mathLib, _global, BROWSER_LANG, CliqzCalculator;

  function getEqualOperator(val, localizedStr) {
    var valStr = val.toString().replace(",", "").replace(".", ""),
        normLocalizedStr = localizedStr.replace(",", "").replace(".", "");
    return valStr === normLocalizedStr ? "=" : "≈";
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_autocompleteResult) {
      Result = _autocompleteResult["default"];
    }, function (_corePlatform) {
      isFirefox = _corePlatform.isFirefox;
    }],
    execute: function () {
      mathLib = undefined;

      if (isFirefox) {
        _global = {};

        Services.scriptloader.loadSubScript('chrome://cliqz/content/bower_components/mathjs/dist/math.min.js', _global);
        mathLib = _global.math;
      } else {
        mathLib = window.math;
      }

      // REF:
      //      http://mathjs.org/docs/index.html
      //      http://stackoverflow.com/questions/26603795/variable-name-and-restrict-operators-in-math-js
      //      http://jsbin.com/duduru/1/edit?html,output

      BROWSER_LANG = utils.getLocalizedString('locale_lang_code');
      CliqzCalculator = {
        CALCULATOR_RES: 0,
        UNIT_RES: '',
        IS_UNIT_CONVERTER: false,
        BASE_UNIT_CONVERTER: '',
        FLOAT_DEC: [100000, 100, 1],
        FLOAT_DEC_THRESHOLD: [99, 99999],
        ACCEPT_ERROR: 1e-8,
        UNIT_CONVERSION_DATA: { // http://en.wikipedia.org/wiki/Conversion_of_units
          // http://www.convert-me.com/en/convert/length/
          'LOCALIZE_KEYS': { 'de-DE': 'names_de', 'en-US': 'names_en', 'default': 'names_de' },
          'types': ['length', 'mass'],
          'length': {
            'base': 'm',
            'units': [{ 'val': 4828, 'names': ['lea', 'leuge', 'league', 'leagues'] }, { 'val': 0.3048006096012192, // this is US foot, there're IDIAN, CLA, BEN,...
              'names': ['ft', 'foot', 'feet', "fuß"],
              'names_en': { 's': 'foot', 'p': 'feet' },
              'names_de': { 's': "fuß", 'p': "fuß" } }, { 'val': 0.0254, 'names': ['in', 'inch', 'inches', 'zoll'] }, { 'val': 1000, 'names': ['km', 'kilometer', 'kilometre', 'kilometres', 'kilometers'] }, { 'val': 1, 'names': ['m', 'meter', 'metre', 'metres', 'meters'] }, { 'val': 0.1, 'names': ['dm', 'decimeter', 'decimetre', 'decimeters', 'decimetres', 'dezimeter'] }, { 'val': 0.01, 'names': ['cm', 'centimeter', 'centimetre', 'centimetres', 'centimeters', 'zentimeter'] }, { 'val': 0.001, 'names': ['mm', 'millimeter', 'millimetre', 'millimetres', 'millimeters'] }, { 'val': 1e-6, 'names': ['micron', 'micrometer', 'micrometre', 'micrometres', 'micrometers', 'mikrometer'] }, { 'val': 1e-9, 'names': ['nm', 'nanometre', 'nanometre', 'nanometer', 'nanometers'] }, { 'val': 10000, 'names': ['mil'] }, // this is Sweden and Norway unit
            { 'val': 1609.344,
              'names': ['mil.', 'mi.', 'mile', 'miles', 'meile', 'meilen'],
              'names_en': { 's': 'mile', 'p': 'miles' },
              'names_de': { 's': 'meile', 'p': 'meilen' } }, { 'val': 201.168, 'names': ['furlong', 'furlongs'] }, { 'val': 0.9144, 'names': ['yd', 'yard', 'yards'] }, { 'val': 2.54 * 1e-5, 'names': ['thou'] }, { 'val': 1.8288, 'names': ['fm', 'fathom', 'fathoms', 'faden', "fäden"] }, { 'val': 5.0292, 'names': ['rd', 'rod', 'rods', 'rute', 'ruten'] }, { 'val': 0.1016, 'names': ['hand', 'hands', 'handbreit'] }, { 'val': 0.2286, 'names': ['span', 'spans', 'spanne', 'spannen'] }, { 'val': 5556, 'names': ['naut.leag', 'nautical league', 'naut.leags', 'nautical league'] }, { 'val': 1852, 'names': ['naut.mil', 'naut.mils', 'nautical mile', 'nautical miles', 'naut.meile', 'naut.meilen', 'nautische meile', 'nautische meilen'] }, { 'val': 1852.216, 'names': ['sm', 'Seemeile'] }, { 'val': 185.2, 'names': ['cbl', 'cable length', "cable'slength", 'Kabel', 'Kabellänge'] }]
          },
          'mass': {
            "base": 'g',
            'units': [{ 'val': 102, 'names': ['kN', 'kn', 'kilonewton', 'kilonewtons'] }, { 'val': 1e9, 'names': ['kt', 'kilotonne', 'kilotonnes', 'kilotonnen'] }, { 'val': 1e6, 'names': ['t', 'tonne', 'tonnes', 'tonnen', 'metric ton', 'metric tons'] }, { 'val': 1e6, 'names': ['Mg', 'megagram', 'megagrams'] }, { 'val': 1000, 'names': ['kg', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes', 'kilogramm', 'kilogramms'] }, { 'val': 100, 'names': ['hg', 'hectogram', 'hectograms', 'hectogramme', 'hectogrammes', 'hectogramm', 'hectogramms'] }, { 'val': 10, 'names': ['dag', 'decagram', 'decagrams', 'decagramme', 'decagrammes', 'decagramm', 'decagramms'] }, { 'val': 1, 'names': ['g', 'gr', 'gram', 'grams', 'gramme', 'grammes', 'gramm', 'gramms'] }, { 'val': 0.1, 'names': ['dg', 'decigram', 'decigrams', 'decigramme', 'decigrammes', 'decigramm', 'decigramms'] }, { 'val': 0.01, 'names': ['cg', 'centigram', 'centigrams', 'centigramme', 'centigrammes', 'centigramm', 'centigramms'] }, { 'val': 0.001, 'names': ['mg', 'milligram', 'milligrams', 'milligramme', 'milligrammes', 'milligramm', 'milligramms'] }, { 'val': 0.000001, 'names': ['mcg', 'microgram', 'micrograms', 'microgramme', 'microgrammes', 'microgramm', 'microgramms'] }, { 'val': 453.59237, 'names': ['lb', 'lbs', 'pound', 'pounds', 'pound-mass', 'pfund'] }, { 'val': 28.349523125, 'names': ['oz', 'ozs', 'ounce ', 'ounces', 'unze', 'unzen'] }, { 'val': 1.7718452, 'names': ['dr', 'dram', 'drams'] }, { 'val': 0.06479891, 'names': ['grain', 'grains', 'Gran'] }]
          }
        },
        shortenNumber: function shortenNumber() {
          // shorten numbers when needed
          try {
            var numRaw,
                num,
                num1,
                floatDec = 1,
                resultSign = "";

            num1 = this.CALCULATOR_RES;

            for (var i = 0; i < this.FLOAT_DEC_THRESHOLD.length; i++) {
              if (Math.abs(num1) < this.FLOAT_DEC_THRESHOLD[i]) {
                floatDec = this.FLOAT_DEC[i];
                break;
              }
            }
            numRaw = Math.round(num1 * floatDec) / floatDec;
            num = numRaw.toLocaleString(utils.getLocalizedString('locale_lang_code'));
            resultSign = getEqualOperator(num1, num);

            this.CALCULATOR_RES = this.IS_UNIT_CONVERTER ? [num, this.UNIT_RES].join(" ") : num.toString();
            return [resultSign, this.CALCULATOR_RES];
          } catch (err) {}
          return null;
        },
        clean: function clean(q) {
          if (!isNaN(q)) {
            return ''; // Don't trigger calculator yet if the query is just a number
          }
          var operators = ['+', '-', '*', '/', '^', '='];
          q = q.replace(/(\d),(\d)/g, '$1.$2'); // commas are separators to german ppl
          q = q.replace(/ /g, ''); // Remove all spaces
          for (var i = 0; i < operators.length; i++) {
            if (q[q.length - 1] == operators[i]) {
              return q.substr(0, q.length - 1); // Remove the last operator
            }
          }
          return q;
        },
        calculate: function calculate(q) {
          if (this.CALCULATOR_RES === null || this.CALCULATOR_RES === q) {
            return null;
          }
          var expandedExpression = this.IS_UNIT_CONVERTER ? this.BASE_UNIT_CONVERTER : mathLib.parse(this.clean(q)).toString(),
              resultSign = this.shortenNumber()[0];

          return Result.cliqzExtra({
            url: "",
            q: q,
            style: "cliqz-extra",
            type: "cliqz-extra",
            subType: JSON.stringify({ type: 'calculator' }),
            data: {
              template: 'calculator',
              expression: expandedExpression,
              answer: this.CALCULATOR_RES,
              is_calculus: true,
              // TODO: support_copy_ans should be platform specific
              support_copy_ans: true
            }
          });
        },

        find_unit_in_data: function find_unit_in_data(unit_) {
          var self = this,
              unit = unit_.toLowerCase(),
              unitFound = null;

          self.UNIT_CONVERSION_DATA.types.some(function (type) {
            return self.UNIT_CONVERSION_DATA[type].units.some(function (item) {
              if (item['names'].indexOf(unit) > -1 || item['names'].indexOf(unit_) > -1) {
                unitFound = [type, true, item];
                return true;
              }
              return false;
            });
          });
          return unitFound || ["", false, null];
        },

        selectUnitTerms: function selectUnitTerms(unit_data, val) {
          /*
           *   + based on the value and the language preference, select unit name in suitable language and form (singular/plural)
           */
          var noun_type = val === 1 ? 's' : 'p',
              nameInfo = unit_data[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS[BROWSER_LANG]] || unit_data[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS['default']] || unit_data['names'],
              name = nameInfo[noun_type];

          return name || unit_data['names']['0'] || "";
        },

        isConverterSearch: function isConverterSearch(q) {
          // --- Process query to recognize a unit-conversion query
          // ACCEPTED query types:
          //    1. a to b, e.g. cm to mm
          var tmp = q.trim(),
              paramList,
              unit1,
              unit2,
              idx,
              num,
              unit1Info;
          // Note: don't use regex match in replace function, e.g. tmp.replace(/ zu | in | im /g, ' to ')
          tmp = q.replace(' zu ', ' to ');
          tmp = tmp.replace(' im ', ' to ');
          tmp = tmp.replace(' in ', ' to ');
          tmp = tmp.replace(' into ', ' to '); // this needs to be at the end
          paramList = tmp.trim().split(' to ');

          if (paramList.length !== 2) return false;
          unit2 = this.find_unit_in_data(paramList[1].trim());
          if (unit2[1]) {
            unit1 = paramList[0].replace(' ', '') + ' ';
            idx = 0;
            while (unit1[idx] === ',' || unit1[idx] === '.' || unit1[idx] >= '0' && unit1[idx] <= '9') idx++;
            if (idx === 0) {
              num = 1;
            } else {
              num = Number(unit1.slice(0, idx));
              if (isNaN(num)) {
                return false;
              }
            }

            unit1 = unit1.slice(idx, unit1.length).trim();
            unit1Info = this.find_unit_in_data(unit1);
            if (!unit1Info[1] || unit1Info[0] !== unit2[0]) {
              return false;
            } // if not unit of the same type, e.g. 1km to g should not return result

            this.IS_UNIT_CONVERTER = true;
            var cvRaw = unit1Info[2].val / unit2[2].val,
                cv = cvRaw.toLocaleString(utils.getLocalizedString('locale_lang_code'));
            this.CALCULATOR_RES = num * cvRaw;
            this.UNIT_RES = CliqzCalculator.selectUnitTerms(unit2[2], this.CALCULATOR_RES);
            this.BASE_UNIT_CONVERTER = ['1', CliqzCalculator.selectUnitTerms(unit1Info[2], 1), getEqualOperator(cvRaw, cv), cv, CliqzCalculator.selectUnitTerms(unit2[2], this.CALCULATOR_RES, cvRaw)].join(" ");

            return true;
          } else {
            return false;
          }
        },

        isCalculatorSearch: function isCalculatorSearch(q) {
          // filter out:
          // + too short query (avoid answering e, pi)
          // + automatically convert queries like '10cm
          var tmp = this.clean(q);
          if (tmp.length <= 2 || tmp.length > 150) {
            return false;
          }

          try {
            this.CALCULATOR_RES = mathLib.eval(tmp);

            if (typeof this.CALCULATOR_RES === 'number') {
              this.IS_UNIT_CONVERTER = false;
              return true;
            }
          } catch (err) {}

          return this.isConverterSearch(q);
        }
      };

      _export("default", CliqzCalculator);
    }
  };
});
System.register("autocomplete/history-cluster", ["core/cliqz", "autocomplete/result"], function (_export) {
  "use strict";

  var utils, Result, FF_DEF_FAVICON, Q_DEF_FAVICON, CliqzHistoryCluster;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_autocompleteResult) {
      Result = _autocompleteResult["default"];
    }],
    execute: function () {
      FF_DEF_FAVICON = 'chrome://mozapps/skin/places/defaultFavicon.png';
      Q_DEF_FAVICON = utils.SKIN_PATH + 'defaultFavicon.png';
      CliqzHistoryCluster = {
        historyCallback: null,
        latencies: [],

        // Generate result json from patterns
        _generateResult: function _generateResult(patterns, query, cluster, baseUrl) {
          if (!patterns) {
            patterns = [];
          }
          return {
            query: query,
            cluster: cluster,
            top_domain: baseUrl || CliqzHistoryCluster._maxDomainShare(patterns)[0],
            results: patterns,
            filteredResults: function filteredResults() {
              var self = this;
              return this.results.filter(function (r) {
                return r.title && utils.getDetailsFromUrl(r.url).name == utils.getDetailsFromUrl(self.top_domain).name;
              });
            }
          };
        },
        // This method is triggered when the Firefox history has finished loading
        addFirefoxHistory: function addFirefoxHistory(history) {
          var query = history.query;
          var res;

          // Extract results
          var patterns = [];
          for (var i = 0; i < history.results.length; i++) {
            var parts = CliqzUtils.cleanMozillaActions(history.results[i].value);
            var url = parts[1],
                action = parts[0],
                title = history.results[i].comment;
            // Filters out results with value: "moz-action:searchengine,{"engineName":"Google","input":"awz","searchQuery":"awz"}"
            // that are returned from the unifiedcomplete history provider that is the only provider from Firefox 49.0 on
            if (action === 'searchengine') {
              continue;
            }

            if (!title) {
              title = utils.generalizeUrl(url);
            }

            if (title.length > 0 && url.length > 0 && Result.isValid(url, utils.getDetailsFromUrl(url))) {

              patterns.push({
                url: url,
                title: title,
                favicon: history.results[i].image,
                _genUrl: utils.generalizeUrl(url, true)
              });
            }
          }
          // Process patterns
          res = CliqzHistoryCluster._preparePatterns(patterns, query);
          CliqzHistoryCluster.firefoxHistory = [];
          CliqzHistoryCluster.firefoxHistory.res = res;
          CliqzHistoryCluster.firefoxHistory.query = query;
          CliqzHistoryCluster.historyCallback(res);
        },
        _simplePreparePatterns: function _simplePreparePatterns(patterns, query) {
          var baseUrl,
              favicon,
              orig_query = query;

          query = CliqzUtils.cleanUrlProtocol(query, true).trim();

          // Filter patterns that don't match search
          //patterns = CliqzHistoryCluster._filterPatterns(patterns, query.toLowerCase());
          //var share = CliqzHistoryCluster._maxDomainShare(patterns);

          // Remove patterns with same url or title
          //patterns = CliqzHistoryCluster._removeDuplicates(patterns);

          // Move base domain to top
          //var adjustedResults = CliqzHistoryCluster._adjustBaseDomain(patterns, query);
          //patterns = adjustedResults[0];
          //baseUrl = adjustedResults[1];
          //favicon = adjustedResults[2];
          //var https = adjustedResults[3];
          var res = CliqzHistoryCluster._generateResult(patterns, orig_query, false, baseUrl);

          res.cluster = false;

          res.results = CliqzHistoryCluster._removeDuplicates(res.results);
          return res;
        },

        // Process patterns
        _preparePatterns: function _preparePatterns(patterns, query) {
          var baseUrl,
              favicon,
              orig_query = query;

          query = utils.cleanUrlProtocol(query, true).trim();

          // Filter patterns that don't match search
          patterns = CliqzHistoryCluster._filterPatterns(patterns, query.toLowerCase());
          var share = CliqzHistoryCluster._maxDomainShare(patterns);

          // Remove patterns with same url or title
          patterns = CliqzHistoryCluster._removeDuplicates(patterns);

          // Move base domain to top
          var adjustedResults = CliqzHistoryCluster._adjustBaseDomain(patterns, query);
          patterns = adjustedResults[0];
          baseUrl = adjustedResults[1];
          favicon = adjustedResults[2];
          var https = adjustedResults[3];
          var res = CliqzHistoryCluster._generateResult(patterns, orig_query, false, baseUrl);

          // Add base domain if above threshold
          var fRes = res.filteredResults();
          var genQ = utils.generalizeUrl(query);
          if (share[1] > 0.5 && fRes.length > 2 && !(utils.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0 && share[1] < 0.8)) {
            // Check if base domain changed due to filtering
            var tmpBaseUrl = CliqzHistoryCluster._adjustBaseDomain(fRes, query)[1];
            baseUrl = tmpBaseUrl;
            CliqzHistoryCluster._addBaseDomain(patterns, baseUrl, favicon, https);
            res.cluster = true;
            // Threshold not reached or clustering not enabled -> no domain clustering
          } else {
              // Disable domain filtering
              res.filteredResults = function () {
                return this.results;
              };
            }

          // Remove automatically added patterns if they don't match query
          if (patterns && patterns.length > 0 && patterns[0].autoAdd && utils.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0) {
            patterns.shift();
            res.cluster = false;
          }

          res.results = CliqzHistoryCluster._removeDuplicates(res.results);
          return res;
        },

        // Calculates the _weighted_ share of the most common domain in given patterns
        _maxDomainShare: function _maxDomainShare(patterns) {
          var patternCount = patterns.length;
          // boost the first X domain entries (i.e., within boostRange)
          var boostRange = 3;
          // weight for the first X entries, all other entries have weight of 1;
          // this makes the first X entries as important as the remaining (N - X) entries
          var boostFactor = (patternCount - boostRange) / (1 * boostRange);

          // make sure the first results do not become less important, which happens if
          // if there are only very few patterns (i.e, patternCount < boostRange * 2)
          boostFactor = Math.max(1, boostFactor);

          var domains = [];
          var index = 0;
          var cnt = 0;

          for (var key in patterns) {
            var url = patterns[key].url;
            var domaintmp = utils.getDetailsFromUrl(url).domain;
            // assign a higher weight to this domain entry if it is one of the first N entries
            var weightedCount = index < boostRange ? boostFactor : 1;
            if (!domains[domaintmp]) {
              domains[domaintmp] = weightedCount;
            } else {
              cnt = 1;
              if (patterns[key].cnt) cnt = patterns[key].cnt;
              domains[domaintmp] += weightedCount;
            }
            index++;
          }
          var max = 0.0;
          cnt = 0.0;
          var domain = null;
          for (key in domains) {
            cnt += domains[key];
            if (domains[key] > max) {
              max = domains[key];
              domain = key;
            }
          }

          return [domain, max / cnt];
        },
        _filterPatterns: function _filterPatterns(patterns, full_query) {
          var queries = full_query.trim().split(' ');
          var newPatterns = [];
          for (var key in patterns) {
            var match = true;
            // Check all queries for matches
            for (var wordKey in queries) {
              var titleUrlMatch = false;
              if (patterns[key].url.indexOf(queries[wordKey]) != -1 || (patterns[key].title || '').toLowerCase().indexOf(queries[wordKey]) != -1) {
                titleUrlMatch = true;
              }
              var queryMatch = false;
              for (var qkey in patterns[key].query) {
                var q = patterns[key].query[qkey];
                if (q.indexOf(queries[wordKey]) != -1) {
                  queryMatch = true;
                  break;
                }
              }
              if (!queryMatch && !titleUrlMatch) {
                match = false;
                break;
              }
            }
            if (match) newPatterns.push(patterns[key]);
          }
          return newPatterns;
        },
        // Deduplicate URLs and titles
        _removeDuplicates: function _removeDuplicates(patterns) {
          var newPatterns;
          newPatterns = CliqzHistoryCluster._removeDuplicatesByKey(patterns, '_genUrl');
          newPatterns = CliqzHistoryCluster._removeDuplicatesByKey(newPatterns, 'title');
          return newPatterns;
        },
        // Deduplicate entries by value of key, with a preference for https and proper titles
        _removeDuplicatesByKey: function _removeDuplicatesByKey(patterns, key) {
          var reorg = {};
          var order = [];

          var value;

          // Pass 1: group similar entries by key
          for (var i = 0; i < patterns.length; i++) {
            value = patterns[i][key];
            if (!reorg.hasOwnProperty(value)) {
              order.push(value);
              reorg[value] = [];
            }
            reorg[value].push(patterns[i]);
          }

          // Pass 2: take the best entry from each group
          // and add to newPatterns in original order.
          var newPatterns = [];
          for (i = 0; i < order.length; i++) {
            value = order[i];

            if (reorg[value].length == 1) {
              newPatterns.push(reorg[value][0]);
              continue;
            }

            // Separate http and https links
            var https = [],
                http = [];
            for (var j = 0; j < reorg[value].length; j++) {
              if (reorg[value][j].url.indexOf('https://') === 0) {
                https.push(reorg[value][j]);
              } else {
                http.push(reorg[value][j]);
              }
            }

            // if any https links, proceed with them only
            var candidates;
            if (https.length > 0) candidates = https;else candidates = http;

            // Pick the one with a "real" title.
            // Some history entries will have a title the same as the URL,
            // don't use these if possible.
            var found = false;
            for (var x = 0; x < candidates.length; x++) {
              if (!(candidates[x].title == candidates[x]._genUrl || candidates[x].title == 'www.' + candidates[x]._genUrl || candidates[x].title == candidates[x].url)) {
                newPatterns.push(candidates[x]);
                found = true;
                break;
              }
            }
            if (!found) newPatterns.push(candidates[0]);
          }

          return newPatterns;
        },
        // Search all patterns for matching substring (should be domain)
        _findCommonDomain: function _findCommonDomain(patterns) {
          if (patterns.length < 2) {
            return null;
          }
          var scores = {};

          for (var key in patterns) {
            var url1 = patterns[key]._genUrl;
            scores[url1] = true;
            for (var key2 in patterns) {
              var url2 = patterns[key2]._genUrl;
              if (key != key2 && url2.indexOf(url1) == -1) {
                scores[url1] = false;
              }
            }
          }

          // Return match with most occurences
          for (var scorekey in scores) {
            if (scores[scorekey] === true) {
              return scorekey;
            }
          }
          return null;
        },
        // Move base domain to top
        _adjustBaseDomain: function _adjustBaseDomain(patterns, query) {
          if (patterns.length === 0) {
            return [];
          }
          var basePattern = null,
              baseUrl = null,
              favicon = null,
              commonDomain = CliqzHistoryCluster._findCommonDomain(patterns);

          // Check for url matching query
          query = utils.generalizeUrl(query, true);
          var key;
          for (key in patterns) {
            var url = patterns[key].url;
            if (url.indexOf(query) === 0) {
              baseUrl = url;
              favicon = patterns[key].favicon;
              break;
            }
          }

          // if none found, use the first entry
          if (!baseUrl) {
            baseUrl = patterns[0]._genUrl;
            favicon = patterns[0].favicon;
          }

          baseUrl = commonDomain || baseUrl.split('/')[0];

          // find if there is an entry matching the base URL.
          var pUrl;
          for (var i = 0; i < patterns.length; i++) {
            pUrl = patterns[i]._genUrl;
            if (baseUrl == pUrl) {
              basePattern = patterns[i];
              break;
            }
          }
          var https = false;
          var newPatterns = [];
          if (basePattern) {
            // found a history entry representing the base pattern,
            // use at the first entry in newPatterns
            basePattern.base = true;
            patterns[0].debug = 'Replaced by base domain';
            newPatterns.push(basePattern);
          } else {
            utils.log('Using a base url that did not exist in history list.', 'CliqzHistoryCluster');

            for (key in patterns) {
              // if any pattern uses an https domain, try to use that for
              // base domain too.
              pUrl = patterns[key].url;
              if (pUrl.indexOf('https://') === 0) {
                https = true;
                break;
              }

              // Add https if required
              if (https) {
                // ...but only if there is a history entry with title
                if (CliqzHistoryManager.getPageTitle('https://' + baseUrl)) {
                  utils.log('found https base URL with title', 'CliqzHistoryCluster');
                  // keep https as true
                } else {
                    utils.log('no https base URL with title, do not change original base URL', 'CliqzHistoryCluster');
                    https = false;
                  }
              }
            }
          }

          for (key in patterns) {
            // keep everything else except for base, it is already there
            if (patterns[key] != basePattern) newPatterns.push(patterns[key]);
          }
          return [newPatterns, baseUrl, favicon, https];
        },
        // Add base domain of given result to top of patterns, if necessary
        _addBaseDomain: function _addBaseDomain(patterns, baseUrl, favicon, https) {
          baseUrl = utils.generalizeUrl(baseUrl, true);
          // Add base domain entry if there is not one already
          if (patterns && patterns.length > 0 && !patterns[0].base) {
            var title = utils.getDetailsFromUrl(baseUrl).domain;
            if (!title) {
              utils.log('Failed to add base domain because there is no title: ' + baseUrl, 'CliqzHistoryCluster');
              return;
            }

            utils.log('Adding base domain to history cluster: ' + baseUrl, 'CliqzHistoryCluster');

            // Add trailing slash if not there
            var urldetails = utils.getDetailsFromUrl(baseUrl);
            if (urldetails.path === '') baseUrl = baseUrl + '/';

            patterns.unshift({
              title: title.charAt(0).toUpperCase() + title.split('.')[0].slice(1),
              url: baseUrl,
              favicon: favicon
            });
            patterns[0].autoAdd = true;
          }
        },
        // Autocomplete an urlbar value with the given patterns
        autocompleteTerm: function autocompleteTerm(urlbar, pattern, loose) {
          var MAX_AUTOCOMPLETE_LENGTH = 80; // max length of autocomplete portion

          function matchQuery(queries) {
            var query = '';
            for (var key in queries) {
              var q = queries[key].toLowerCase();
              if (q.indexOf(input) === 0 && q.length > query.length) {
                query = q;
              }
            }
            return query;
          }
          if (urlbar == 'www.' || urlbar == 'http://' || urlbar.substr(urlbar.indexOf('://') + 3) == 'www.' || urlbar === '') return {};

          var url = utils.simplifyUrl(pattern.url);
          url = utils.generalizeUrl(url, true);
          var input = utils.generalizeUrl(urlbar);
          if (urlbar[urlbar.length - 1] == '/') input += '/';

          var autocomplete = false,
              highlight = false,
              selectionStart = 0,
              urlbarCompleted = '';
          var queryMatch = matchQuery(pattern.query);

          // Url
          if (url.indexOf(input) === 0 && url != input && url.length - input.length <= MAX_AUTOCOMPLETE_LENGTH) {
            autocomplete = true;
            highlight = true;
            urlbarCompleted = urlbar + url.substring(url.indexOf(input) + input.length);
          }

          if (autocomplete) {
            selectionStart = urlbar.toLowerCase().lastIndexOf(input) + input.length;
          }

          // Adjust url to user protocol
          if (urlbar.indexOf('://') != -1) {
            var prot_user = urlbar.substr(0, urlbar.indexOf('://') + 3);
            var prot_auto = pattern.url.substr(0, pattern.url.indexOf('://') + 3);
            pattern.url = pattern.url.replace(prot_auto, prot_user);
          }

          return {
            url: url,
            full_url: pattern.url,
            autocomplete: autocomplete,
            urlbar: urlbarCompleted,
            selectionStart: selectionStart,
            highlight: highlight
          };
        },

        // Attach a list of URLs to a cluster result
        _attachURLs: function _attachURLs(result, urls, with_favicon) {
          result.data.urls = [];

          for (var i = 0; i < urls.length; i++) {
            var domain = utils.generalizeUrl(urls[i].url, true).split('/')[0],
                url = urls[i].url;

            if (url[url.length - 1] == '/') url = url.substring(0, url.length - 1);

            var favicon = with_favicon && (urls[i].favicon == FF_DEF_FAVICON ? Q_DEF_FAVICON : urls[i].favicon),
                cleanUrl = utils.cleanUrlProtocol(utils.simplifyUrl(url), true);

            var item = {
              href: urls[i].url,
              link: cleanUrl,
              domain: cleanUrl.split('/')[0],
              title: urls[i].title,
              extra: 'history-' + i,
              favicon: favicon,
              // logo is only necessary for 3-up mini-history view, this can be removed if that is retired
              logo: CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(urls[i].url)),
              kind: ['H']
            };

            if (urls[i].hasOwnProperty('xtra_c')) {
              item['xtra_c'] = urls[i]['xtra_c'];
              item['class-col-cluster'] = 'cqz-col-12';
              //item['class-col-query'] = 'cqz-col-0';
            }

            if (urls[i].hasOwnProperty('xtra_q')) {
              item['xtra_q'] = urls[i]['xtra_q'];
              item['class-col-cluster'] = 'cqz-col-8';
              item['class-col-query'] = 'cqz-col-4';
            }

            result.data.urls.push(item);

            if (result.data.urls.length > 9 && result.data.template == 'pattern-h1' || result.data.urls.length > 5 && result.data.template == 'pattern-h2' || result.data.urls.length > 2 && result.data.template == 'pattern-h3') {
              break;
            }
          }
        },
        // Creates one (or potentially more) instant results based on history
        createInstantResult: function createInstantResult(res, searchString, callback, customResults) {
          var instant_results = [];
          var results = res.filteredResults();
          var promises = [];

          if (results.length === 0 && !res.urls) {
            // no results, so do nothing

          } else if (res.urls) {
              // Rule-based clustering has already been performed, just take the entry as it is
              var instant = Result.generic('cliqz-pattern', res.url, null, res.title, null, searchString, res);
              instant.comment += ' (history rules cluster)';
              // override with any titles we have saved
              //promises.push(CliqzHistoryCluster._getTitle(instant));

              instant.data.template = 'pattern-h2';
              instant.data.cluster = true; // a history cluster based on a destination bet
              instant_results.push(instant);
            } else if (searchString.length === 0 && customResults === null) {
              // special case for user request of top sites from history
              var instant = Result.generic('cliqz-pattern', '', null, '', null, searchString);
              instant.data.title = utils.getLocalizedString('history_results_cluster');
              instant.data.url = results[0].url;
              instant.comment += ' (history top sites)!';
              instant.data.template = 'pattern-h1';
              instant.data.generic = true;

              this._attachURLs(instant, results);

              instant_results.push(instant);
            } else if (res.cluster) {
              // domain-based cluster
              var instant = Result.generic('cliqz-pattern', results[0].url, null, results[0].title, null, searchString);
              var title = results[0].title;
              if (!title) {
                title = results[0].url;
                utils.log('No title, assigning ' + title, 'CliqzHistoryCluster');
              }
              instant.data.title = title;
              // override with any titles we have saved
              //promises.push(CliqzHistoryCluster._getTitle(instant));

              // get description in case we need it
              //(if this cluster is converted back to simple history)
              //promises.push(CliqzHistoryCluster._getDescription(instant));

              instant.data.url = results[0].url;
              instant.comment += ' (history domain cluster)!';
              instant.data.template = 'pattern-h2';
              instant.data.autoAdd = results[0].autoAdd;
              instant.data.cluster = true; // a history cluster based on a destination bet

              // first entry is used as the main URL of this cluster, remove from remaining result list
              results.shift();

              CliqzHistoryCluster._attachURLs(instant, results);

              instant_results.push(instant);
            } else if (results.length < 3) {
              for (var i = 0; i < results.length; i++) {
                var instant = Result.generic('favicon', results[i].url, null, results[i].title, null, searchString);
                instant.comment += ' (history generic)!';
                instant.data.kind = ['H'];
                //promises.push(CliqzHistoryCluster._getDescription(instant));
                instant_results.push(instant);
              }
            } else {
              // 3-up combined generic history entry
              var instant = Result.generic('cliqz-pattern', '', null, '', null, searchString);
              instant.data.title = '';
              instant.comment += ' (history generic)!';
              instant.data.template = 'pattern-h3';
              instant.data.generic = true;

              this._attachURLs(instant, results, true);
              instant_results.push(instant);
            }

          if (typeof Promise === 'undefined') {
            // Firefox versions < 29
            callback(instant_results, 'cliqz-prod');
          } else {
            Promise.all(promises).then(function (data) {
              callback(instant_results, 'cliqz-prod');
            });
          }
        },
        // Creates one (or potentially more) instant results based on history
        simpleCreateInstantResult: function simpleCreateInstantResult(res, cont, searchString, callback) {
          var instant_results = [];
          //var results = res.filteredResults();
          var results = res.results;
          var promises = [];

          if (results.length === 0 && !res.urls) {
            // no results, so do nothing

          } else {
              // generic history
              var simple_generic = CliqzUtils.getPref('simpleHistory', false);
              //var simple_generic = true;

              // 3-up combined generic history entry
              var instant = Result.generic('cliqz-pattern', '', null, '', null, searchString);
              instant.data.title = '';
              instant.comment += ' (history generic)!';

              //
              // There is so many levels of abstraction here that is impossible to follow,
              // 5 function to be able to printout something, stack overflow :-/
              //
              instant.data.template = 'pattern-hm';
              //instant.data.template = 'pattern-h3';

              instant.data.generic = true;

              instant.data.cont = cont;

              this._attachURLs(instant, results, true);

              instant_results.push(instant);
            }

          if (typeof Promise === 'undefined') {
            // Firefox versions < 29
            callback(instant_results, 'hm');
          } else {
            Promise.all(promises).then(function (data) {
              callback(instant_results, 'hm');
            });
          }
        },
        // Removes a given url from the instant.data.url list
        removeUrlFromResult: function removeUrlFromResult(urlList, _url) {
          var url = utils.generalizeUrl(_url);
          for (var key in urlList) {
            var r_url = utils.generalizeUrl(urlList[key].href);
            if (r_url == url) {
              urlList.splice(key, 1);
              return;
            }
          }
        }
      };

      _export("default", CliqzHistoryCluster);
    }
  };
});
System.register("autocomplete/mixer", ["core/cliqz", "autocomplete/result", "autocomplete/url-compare"], function (_export) {
  /*
   * This module mixes the results from cliqz with the history
   *
   */

  "use strict";

  var utils, Result, UrlCompare, CliqzSmartCliqzCache, SmartCliqzTriggerUrlCache, Mixer;

  function objectExtend(target, obj) {
    Object.keys(obj).forEach(function (key) {
      target[key] = obj[key];
    });

    return target;
  }

  // enriches data kind
  function kindEnricher(newKindParams, kind) {
    var parts = kind.split('|'),
        params = JSON.parse(parts[1] || '{}');

    objectExtend(params, newKindParams);

    return parts[0] + '|' + JSON.stringify(params);
  }

  function resultKindEnricher(newKindParams, result) {
    result.data.kind[0] = kindEnricher(newKindParams, result.data.kind[0]);
    return result;
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_autocompleteResult) {
      Result = _autocompleteResult["default"];
    }, function (_autocompleteUrlCompare) {
      UrlCompare = _autocompleteUrlCompare["default"];
    }],
    execute: function () {
      Mixer = {
        EZ_COMBINE: ['entity-generic', 'ez-generic-2', 'entity-search-1', 'entity-portal', 'entity-banking-2'],
        EZ_QUERY_BLACKLIST: ['www', 'www.', 'http://www', 'https://www', 'http://www.', 'https://www.'],

        init: function init() {
          var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

          var smartCliqzCache = _ref.smartCliqzCache;
          var triggerUrlCache = _ref.triggerUrlCache;

          CliqzSmartCliqzCache = smartCliqzCache;
          SmartCliqzTriggerUrlCache = triggerUrlCache;
        },

        // Prepare 'extra' results (dynamic results from Rich Header) for mixing
        _prepareExtraResults: function _prepareExtraResults(results) {
          // Remove invalid EZs
          results = results.filter(function (r) {
            if (Mixer._isValidEZ(r)) {
              return true;
            } else {
              utils.log('Discarding bad EZ: ' + JSON.stringify(r), 'Mixer');
              return false;
            }
          });

          // set trigger method for EZs returned from RH
          return results.map(resultKindEnricher.bind(null, {
            trigger_method: 'rh_query'
          }));
        },

        // Various checks to make sure the supplied EZ is valid
        _isValidEZ: function _isValidEZ(ez) {
          if (!ez.val) {
            return false;
          }

          if (!ez.data) {
            return false;
          }

          if (!ez.data.subType) {
            return false;
          }

          if (!ez.data.__subType__) {
            return false;
          }

          try {
            var ezId = Mixer._getSmartCliqzId(ez);
            if (!ezId) {
              return false;
            }
            var ezClass = JSON.parse(ez.data.subType)["class"];
            if (!ezClass) {
              return false;
            }
          } catch (e) {
            return false;
          }

          return true;
        },

        // Prepare backend results for mixing
        _prepareCliqzResults: function _prepareCliqzResults(results) {
          return results.map(function (result, i) {
            var subType = JSON.parse(result.subType || '{}');
            subType.i = i;
            result.subType = JSON.stringify(subType);
            return Result.cliqz(result);
          });
        },

        // Prepare history results for mixing
        _prepareHistoryResults: function _prepareHistoryResults(results) {
          return results.map(Result.clone);
        },
        // Is query valid for triggering an EZ?
        // Must have more than 2 chars and not in blacklist
        //  - avoids many unexpected EZ triggerings
        _isValidQueryForEZ: function _isValidQueryForEZ(q) {
          var trimmed = q.trim();
          if (trimmed.length <= utils.MIN_QUERY_LENGHT_FOR_EZ) {
            return false;
          }

          return Mixer.EZ_QUERY_BLACKLIST.indexOf(trimmed.toLowerCase()) == -1;
        },

        // extract any entity zone accompanying the result, add to extraResults
        _addEZfromBM: function _addEZfromBM(extraResults, result) {
          if (!result.extra) {
            return;
          }

          var extra = Result.cliqzExtra(result.extra, result.snippet);
          //resultKindEnricher({trigger_method: 'backend_url'}, extra);
          extraResults.push(extra);
        },

        // Collect all sublinks and return a single list.
        //  - called recursively, looking for any keys that look like URLs
        _collectSublinks: function _collectSublinks(data) {
          var links = [];

          for (var key in data) {
            if (typeof data[key] == 'object') {
              // recurse
              links = links.concat(Mixer._collectSublinks(data[key]));
            } else if (['url', 'href'].indexOf(key) != -1) {
              links.push(data[key]);
            }
          }

          return links;
        },

        // mark entries in second that are found in first
        _getDuplicates: function _getDuplicates(first, second) {
          return second.map(function (c) {
            var duplicate = false;
            first.forEach(function (i) {
              // Does the main link match?
              if (UrlCompare.sameUrls(c.label, i.label)) {
                duplicate = true;
                return;
              }

              // Do any of the sublinks match?
              var sublinks = Mixer._collectSublinks(i.data);
              sublinks.some(function (u) {
                if (UrlCompare.sameUrls(u, c.label)) {
                  duplicate = true;
                  return true; // stop iteration
                }
              });
            });

            if (duplicate) {
              return c;
            }
          }).filter(function (result) {
            return result;
          });
        },

        // Remove results from second list that are present in the first
        // Copy some information (such as the kind) to entry in the first list
        _deduplicateResults: function _deduplicateResults(first, second) {
          var duplicates = Mixer._getDuplicates(first, second);

          // remove duplicates from second list
          second = second.filter(function (c) {
            return duplicates.indexOf(c) === -1;
          });

          // take data from duplicate second result to augment result
          // Note: this does not combine data if it is a sublink match
          first = first.map(function (r) {
            duplicates.forEach(function (dup) {
              if (UrlCompare.sameUrls(r.val, dup.val)) {
                r = Result.combine(r, dup);
              }
            });

            return r;
          });

          return { first: first, second: second };
        },

        // Special case deduplication: remove clustered links from history if already
        // somewhere else in the EZ
        _deduplicateHistory: function _deduplicateHistory(result) {
          // Collect sublinks not in history
          var otherLinks = [];
          Object.keys(result.data).filter(function (key) {
            return key != 'urls';
          }).forEach(function (key) {
            var sublinks = Mixer._collectSublinks(result.data[key]);
            otherLinks.concat(sublinks);
          });

          // Filter history entry, if
          result.data.urls = result.data.urls.filter(function (entry) {
            var duplicate = false;
            otherLinks.some(function (u) {
              if (UrlCompare.sameUrls(u, entry.label)) {
                duplicate = true;
                return true; // stop iteration
              }
            });

            return !duplicate;
          });
        },
        _getSmartCliqzId: function _getSmartCliqzId(smartCliqz) {
          return smartCliqz.data.__subType__.id;
        },

        // Find any entity zone in the results and cache them for later use.
        // Go backwards to prioritize the newest, which will be first in the list.
        _cacheEZs: function _cacheEZs(extraResults) {
          if (!CliqzSmartCliqzCache || !SmartCliqzTriggerUrlCache) {
            return;
          }

          // slice creates a shallow copy, so we don't reverse existing array.
          extraResults.slice().reverse().forEach(function (r) {
            var trigger_urls = r.data.trigger_urls || [];
            var wasCacheUpdated = false;

            trigger_urls.forEach(function (url) {
              if (!SmartCliqzTriggerUrlCache.isCached(url)) {
                SmartCliqzTriggerUrlCache.store(url, true);
                wasCacheUpdated = true;
              }
            });

            if (wasCacheUpdated) {
              SmartCliqzTriggerUrlCache.save();
            }

            CliqzSmartCliqzCache.store(r);
          });
        },

        // Take the first entry (if history cluster) and see if we can trigger an EZ
        // with it, this will override an EZ sent by backend.
        _historyTriggerEZ: function _historyTriggerEZ(result) {
          if (!result || !result.data || !result.data.cluster || // if not history cluster
          result.data.autoAdd) {
            // if the base domain was auto added (guessed)
            return undefined;
          }

          if (!CliqzSmartCliqzCache || !SmartCliqzTriggerUrlCache) {
            return undefined;
          }

          var url = utils.generalizeUrl(result.val, true),
              ez;

          if (SmartCliqzTriggerUrlCache.isCached(url)) {
            var ezId = SmartCliqzTriggerUrlCache.retrieve(url);
            // clear dirty data that got into the data base
            if (ezId === 'deprecated') {
              SmartCliqzTriggerUrlCache["delete"](url);
              return undefined;
            }
            ez = CliqzSmartCliqzCache.retrieveAndUpdate(url);
            if (ez) {
              // Cached EZ is available
              ez = Result.clone(ez);

              // copy over title and description from history entry
              if (!result.data.generic) {
                ez.data.title = result.data.title;
                if (!ez.data.description) ez.data.description = result.data.description;
              }

              resultKindEnricher({ trigger_method: 'history_url' }, ez);
            } else {
              // Not available: start fetching now so it is available soon
              CliqzSmartCliqzCache.fetchAndStore(url);
            }

            if (SmartCliqzTriggerUrlCache.isStale(url)) {
              SmartCliqzTriggerUrlCache["delete"](url);
            }
          }

          return ez;
        },

        // Filter out any EZs that conflict with the firstresult
        _filterConflictingEZ: function _filterConflictingEZ(cliqzExtra, firstresult) {
          return cliqzExtra.filter(function (ez) {

            // Did we make a 'bet' on a url from history that does not match this EZ?
            if (firstresult.data && firstresult.data.cluster && !UrlCompare.sameUrls(ez.val, firstresult.val)) {
              utils.log('Not showing EZ ' + ez.val + ' because different than cluster ' + firstresult.val, 'Mixer');
              return false;
            }

            // Will the autocomplete change if we use this EZ?
            if (firstresult.autocompleted && !UrlCompare.sameUrls(ez.val, firstresult.val)) {
              utils.log('Not showing EZ ' + ez.val + ' because autocomplete would change', 'Mixer');
              return false;
            }

            return true;
          });
        },
        // Mix together history, backend and custom results. Called twice per query:
        // once with only history (instant), second with all data.
        mix: function mix(q, cliqz, cliqzExtra, history, customResults, only_history) {

          if (!Mixer._isValidQueryForEZ(q)) {
            cliqzExtra = [];
          } else {
            // Prepare incoming EZ results
            cliqzExtra = Mixer._prepareExtraResults(cliqzExtra || []);

            // Add EZ from first cliqz results to list of EZs, if valid
            if (cliqz && cliqz.length > 0) {
              Mixer._addEZfromBM(cliqzExtra, cliqz[0]);
            }

            // Cache any EZs found
            Mixer._cacheEZs(cliqzExtra);
          }

          // Prepare other incoming data
          cliqz = Mixer._prepareCliqzResults(cliqz || []);
          history = Mixer._prepareHistoryResults(history || []);

          utils.log('only_history:' + only_history + ' history:' + history.length + ' cliqz:' + cliqz.length + ' extra:' + cliqzExtra.length, 'Mixer');

          // Were any history results also available as a cliqz result?
          //  if so, remove from backend list and combine sources in history result
          var r = Mixer._deduplicateResults(history, cliqz);

          // Prepare results: history (first) then backend results (second)
          var results = r.first.concat(r.second);

          // Trigger EZ with first entry
          var historyEZ = Mixer._historyTriggerEZ(results[0]);
          if (historyEZ) {
            cliqzExtra = [historyEZ];
          }

          // Filter conflicting EZs
          if (results.length > 0) {
            cliqzExtra = Mixer._filterConflictingEZ(cliqzExtra, results[0]);
          }

          // Add custom results to the beginning if there are any
          if (customResults && customResults.length > 0) {
            cliqzExtra = customResults.concat(cliqzExtra);
          }

          // limit to one entity zone
          cliqzExtra = cliqzExtra.slice(0, 1);

          // remove any BM or simple history results covered by EZ
          r = Mixer._deduplicateResults(cliqzExtra, results);
          results = r.second;
          var ez = r.first[0];

          // Add EZ to result list result list
          if (ez) {
            utils.log('EZ (' + ez.data.kind + ') for ' + ez.val, 'Mixer');

            // Make a combined entry, if possible
            if (results.length > 0 && results[0].data.cluster && Mixer.EZ_COMBINE.indexOf(ez.data.template) !== -1 && UrlCompare.sameUrls(results[0].val, ez.val)) {

              utils.log('Making combined entry.', 'Mixer');
              results[0] = Result.combine(ez, result[0]);
              Mixer._deduplicateHistory(results[0]);
            } else {
              // Add EZ to top of result list
              results = [ez].concat(results);
            }
          }

          // Special case: adjust second result if it doesn't fit
          if (utils.getPref('hist_search_type', 0) == 0 && results.length > 1 && results[1].data.template == 'pattern-h2') {
            utils.log('Converting cluster for ' + results[1].val + ' to simple history', 'Mixer');

            // convert to simple history entry
            var simple = Result.generic('favicon', results[1].val, null, results[1].data.title, null, searchString);
            simple.data.kind = ['H'];
            simple.data.description = result[1].data.description;
            results[1] = simple;
          }

          // Only show a maximum 3 BM results
          var cliqzRes = 0;
          results = results.filter(function (r) {
            if (r.style.indexOf('cliqz-results ') === 0) cliqzRes++;
            return cliqzRes <= 3;
          });

          // Show no results message
          if (results.length === 0 && !only_history) {
            utils.getNoResults && results.push(utils.getNoResults());
          }

          return results;
        }
      };

      _export("default", Mixer);
    }
  };
});
System.register("autocomplete/result-providers", ["core/cliqz", "autocomplete/result", "autocomplete/calculator", "core/search-engines"], function (_export) {
  /*
   * This module handles the search engines present in the browser
   * and provides a series of custom results
   *
   */

  // INIT_KEY ('newProvidersAdded') was used only as a boolean but now we have multiple states
  // state 1 -> Google images & Google maps
  // state 2 -> YouTube engine is added
  // state 3 -> Aliases (shortcuts) are updated:
  //  - to first 2 letters for default engines
  //  - to key property for NonDefaultProviders
  // state 4 -> Ecosia engine is added

  "use strict";

  var utils, Result, CliqzCalculator, setSearchEngine, INIT_KEY, LOG_KEY, KEY, CUSTOM, ENGINE_CODES, CliqzResultProviders, NonDefaultProviders;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_autocompleteResult) {
      Result = _autocompleteResult["default"];
    }, function (_autocompleteCalculator) {
      CliqzCalculator = _autocompleteCalculator["default"];
    }, function (_coreSearchEngines) {
      setSearchEngine = _coreSearchEngines.setSearchEngine;
    }],
    execute: function () {
      INIT_KEY = 'newProvidersAdded';
      LOG_KEY = 'NonDefaultProviders.jsm';
      KEY = '#';
      CUSTOM = {
        '#fee': {
          url: 'https://cliqz.com/support/'
        },
        '#team': {
          url: 'https://cliqz.com/team/'
        },
        '#cliqz': {
          url: 'https://cliqz.com/'
        },
        '#join': {
          url: 'https://cliqz.com/jobs/'
        }
      };
      ENGINE_CODES = ['google images', 'google maps', 'google', 'yahoo', 'bing', 'wikipedia', 'amazon', 'ebay', 'leo', 'youtube', 'ecosia'];

      // REFS:
      // http://stenevang.wordpress.com/2013/02/22/google-search-url-request-parameters/
      // https://developers.google.com/custom-search/docs/xml_results#hlsp

      CliqzResultProviders = {
        init: function init() {
          utils.log('CliqzResultProviders initialized', LOG_KEY);
          CliqzResultProviders.manageProviders();
        },
        manageProviders: function manageProviders() {

          var newProviderAdded = CliqzResultProviders.addCustomProviders();

          if (newProviderAdded) {
            CliqzResultProviders.updateEngineAliases();
          }
        },
        addCustomProviders: function addCustomProviders() {
          var providersAddedState,
              maxState = -1,
              newProviderIsAdded = false;

          if (typeof utils.getPref(INIT_KEY) === "boolean") {
            providersAddedState = 1;
          } else {
            providersAddedState = utils.getPref(INIT_KEY, 0);
          }

          NonDefaultProviders.forEach(function (extern) {
            utils.log("NonDefaultProviders");
            try {
              utils.log('Analysing ' + extern.name, LOG_KEY);
              if (!utils.getEngineByName(extern.name)) {
                if (providersAddedState < extern.state) {
                  maxState = extern.state > maxState ? extern.state : maxState;
                  utils.log('Added ' + extern.name, LOG_KEY);
                  utils.addEngineWithDetails(extern);
                }
              }
            } catch (e) {
              utils.log(e, 'err' + LOG_KEY);
            }
          });

          if (maxState > 0) {
            utils.setPref(INIT_KEY, maxState);
            newProviderIsAdded = true;
          }

          return newProviderIsAdded;
        },
        updateEngineAliases: function updateEngineAliases() {
          CliqzResultProviders.getSearchEngines().forEach(function (engine) {
            var alias = engine.alias;
            if (!alias) {
              alias = CliqzResultProviders.createShortcut(engine.name);
            }
            if (engine.prefix && engine.name === alias) {
              alias = engine.prefix;
            }
            CliqzResultProviders.updateAlias(engine.name, alias);
          });
        },
        updateAlias: function updateAlias(name, newAlias) {
          utils.updateAlias(name, newAlias);
          utils.log("Alias of engine  " + name + " was updated to " + newAlias, LOG_KEY);
        },
        getCustomResults: function getCustomResults(q) {
          var results = null;
          var customQuery = CliqzResultProviders.customizeQuery(q);

          if (customQuery) {
            results = [Result.generic(Result.CLIQZC + ' sources-' + customQuery.code, customQuery.queryURI, null, null, null, null, {
              q: customQuery.updatedQ,
              engine: customQuery.engineName
            })];
            q = customQuery.updatedQ;
          } else if (CliqzCalculator.isCalculatorSearch(q)) {
            var calcRes = CliqzCalculator.calculate(q);
            if (calcRes != null) {
              results = [calcRes];
            }
          }
          return [q, results];
        },
        getEngineCode: function getEngineCode(engineName) {
          for (var c in ENGINE_CODES) {
            if (engineName.toLowerCase().indexOf(ENGINE_CODES[c]) != -1) {
              return +c + 1;
            }
          }
          // unknown engine
          return 0;
        },
        setCurrentSearchEngine: function setCurrentSearchEngine(engine) {
          var searchEngine = CliqzResultProviders.getEngineByName(engine);
          setSearchEngine(searchEngine);
        },
        // called for each query
        customizeQuery: function customizeQuery(q) {
          if (CUSTOM[q.trim()] && CUSTOM[q.trim()].url) {
            return {
              updatedQ: q,
              engineName: 'CLIQZ',
              queryURI: CUSTOM[q.trim()].url,
              code: '#'
            };
          }
          //a prefix has min 3 chars
          if (q.length < 4) return false;

          var components = q.split(' ');

          if (components.length < 2) return false;

          var start = components[0],
              end = components[components.length - 1],
              engineName,
              uq;

          if (CliqzResultProviders.getEngineByAlias(start)) {
            engineName = CliqzResultProviders.getEngineByAlias(start).name;
            uq = q.substring(start.length + 1);
          } else if (CliqzResultProviders.getEngineByAlias(end)) {
            engineName = CliqzResultProviders.getEngineByAlias(end).name;
            uq = q.substring(0, q.length - end.length - 1);
          }

          if (engineName) {
            return {
              updatedQ: uq,
              engineName: engineName,
              queryURI: CliqzResultProviders.getSubmissionByEngineName(engineName, uq),
              code: CliqzResultProviders.getEngineCode(engineName)
            };
          } else {
            return null;
          }
        },
        getEngineByName: function getEngineByName(engine) {
          return utils.getEngineByName(engine);
        },
        getEngineByAlias: function getEngineByAlias(alias) {
          return utils.getEngineByAlias(alias);
        },
        getSubmissionByEngineName: function getSubmissionByEngineName(name, query) {
          var engine = CliqzResultProviders.getSearchEngines().find(function (engine) {
            return engine.name === name;
          });
          if (engine) {
            return engine.getSubmissionForQuery(query);
          }
        },
        // called once at visual hashtag creation
        // TODO: use the updated shortcuts from about:preferences#search
        getShortcut: function getShortcut(name) {
          for (var i = 0; i < NonDefaultProviders.length; i++) if (NonDefaultProviders[i].name === name) return NonDefaultProviders[i].key;

          return CliqzResultProviders.createShortcut(name);
        },
        // create a unique shortcut -> first 2 lowercased letters
        createShortcut: function createShortcut(name) {
          return KEY + name.substring(0, 2).toLowerCase();
        },
        getSearchEngines: function getSearchEngines() {
          return utils.getSearchEngines().map(function (e) {
            e.prefix = CliqzResultProviders.getShortcut(e.name);
            e.code = CliqzResultProviders.getEngineCode(e.name);

            return e;
          });
        }
      };

      // TODO: create language/location aware customization
      NonDefaultProviders = [{
        key: "#gi",
        url: "https://www.google.de/search?tbm=isch&q={searchTerms}&hl=de",
        name: "Google Images",
        iconURL: "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
        method: 'GET',
        state: 1
      }, {
        key: "#gm",
        url: "https://maps.google.de/maps?q={searchTerms}",
        name: "Google Maps",
        iconURL: "data:image/vnd.microsoft.icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAABILAAASCwAAAAEAAAABAAA+VeMAZMbFAH7k/wBGy/4A/8hpAITk/wAsPNkAE8P8AFXc/wBF2f8A/8BRAP+5OwAh0v8Aqev/AExm6QA21v8A/cpwAAXJ/wAa0f8A/8dmAP/GYgCa6f8A/8NZAFzd/wCT5/8A/8VeAP++SgAq1P8ABc3/ADRI3gADy/8AKc7+AFRx7gCktfgA/sBPAP/CVgBx4f8ALdP/AAHM/wBAWeUA/7tBADpP4QCJ5f8APtj/ACg31gCi6v8A/71GAL/v/wBFydoAJTjUAB5s3wC8y6AANsD9ACvG/gBNauwAnbWRAKPJ9QCmvpQALdT/ABojzgBRZOAAue7/ACBJ1wAyRdwAFsX0AD2y8QAXz/8AEhnKAJXo/wBoheEA18B3AJ3JqQAKx/4AIS3SAN/OjgAJyP4A+MFfAPf4/gD4wWAAXnzxABWn7gAdvv0Aat//ACY01QA3St4ADcr2AGrI+gA5xuoAPMv0ADrM/gAny/UAM9D+ADHV/wBWgu4AS9r/AI+n7gClrvAAjsetAEnW/gA0xNwAOdf/ACfT/wCO5v8AJ1LXAJ+m7QBed+4AR2LpABjP/wANyPoAcbT0AAzO/wALN80AW27nAEvG0QAV0P8A4r9xADjS/gA0XNsAPdf/AC4/2gCe6f8ARV/oAP+4NgB1wbYAQNH+ANLz/wAAzP8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf2J0Hx9YMxAQBBMZFgoifxIlaxERMAQTFBkjChooCwt4DSRlJkcQe3tGGRYKGih6JAUYfRcBSh4RQDlOFiIuCxIrGw99ZGNVHhFIexkjGigbXg8MBSpvHH4eEQEUFgouKxcJXAI4Q2wcfh5hExkKGghSCAkqXztQbiYmcXNMNzckAiQXRDxJMmUSckJaVzU0ZhgqAm13LDFBDzobJVtZAxgVKlYnHXcsPgccfh5LB1ENDRVdJykdd1NFfX19fX19Lz0tIGonKT8GZ3YPfHx8A38vLU82eQBUd3V8fHx8fH9/f38hIA4nKVRof39/f39/f39/TSFpDnBgf39/f39/f4ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAA4D8AAOB/AAA=",
        method: 'GET',
        state: 1
      }, {
        key: "#yt",
        url: "https://www.youtube.de/results?search_query={searchTerms}",
        name: "YouTube",
        iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNkQkIDZGiCA2RzAgNkcwIDZH/CA2R/wgNkf8IDZH/CA2R/wgNkf8IDZH/CA2R2AgNkcwIDZHMCA2RhAgNkQYIDpWHCA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpWHCQ6ZzAkOmf8JDpn/CQ6Z/wkOmf8JDpb/BQhc/wgMgf8JDpn/CQ6Z/wkOmf8JDpn/CQ6Z/wkOmf8JDpn/CQ6ZzAkOnuoJDp7/CQ6e/wkOnv8JDp7/Exed/8jIy/9RU4j/Bwp0/wkOm/8JDp7/CQ6e/wkOnv8JDp7/CQ6e/wkOnuoJD6T8CQ+k/wkPpP8JD6T/CQ+k/xUbo//V1dX/1dXV/4yNrP8QFG//CA6Y/wkPpP8JD6T/CQ+k/wkPpP8JD6T8CQ+q/wkPqv8JD6r/CQ+q/wkPqv8WG6n/3d3d/93d3f/d3d3/v7/M/y0wjv8JD6r/CQ+q/wkPqv8JD6r/CQ+q/woQr/8KEK//ChCv/woQr/8KEK//Fx2v/+fn5//n5+f/5+fn/+jo6P+YmtP/ChCv/woQr/8KEK//ChCv/woQr/8KELX8ChC1/woQtf8KELX/ChC1/xgdtf/x8fH/8fHx//Ly8v+bndv/Ehi3/woQtf8KELX/ChC1/woQtf8KELX8ChG76goRu/8KEbv/ChG7/woRu/8YH77/+fn5/+/v9/9fY9H/ChG7/woRu/8KEbv/ChG7/woRu/8KEbv/ChG76goRwMwKEcD/ChHA/woRwP8KEcD/EBfB/6Ol5/8tM8n/ChHA/woRwP8KEcD/ChHA/woRwP8KEcD/ChHA/woRwMwLEcSHCxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcSHCxLICQsSyKULEsjMCxLI+QsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI0gsSyMwLEsiiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAD//wAA//8AAA==',
        method: 'GET',
        state: 2
      }, {
        key: "#ec",
        url: "https://www.ecosia.org/search?q={searchTerms}&ref=cliqz",
        name: "Ecosia",
        iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAACMuAAAjLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAC8qzQBuaw3UrmsN6u5rDfruaw37bmsN+25rDfSuaw3fLmsNyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC2rTokrLFGurqsNv+5rDf/uaw3/7msN/+5rDf/uaw3/7urNP/AqS7suqw2aAAAAAAAAAAAAAAAAAAAAAC/qjApkbpn4mvJlf/EqCr/uaw3/7msN/+5rDf/uaw3/7urNP+rsUj/ib5x/7qsNv+9qzKBAAAAAAAAAAC5rDcLwKkvzom9cf813Nb/lrlh/8KoLP+5rDf/uaw3/7msN//BqS3/eMSF/yXj6v+BwHv/lbli/7atO1IAAAAAuaw3bsCqL/+Rumb/K+Di/z3ZzP+dtln/vqox/7msN/+5rDf/waku/23Ikv8s4OH/ONvS/5m4Xv+7qzXZuaw3CbmsN9DBqS7/hL93/zDe3f8v393/RdbD/7OuPv+7qzX/uqw2/8WoKf99wn//Lt/e/y/e3f99wn//v6ow/7msN0+7qzT7s64+/0bWwf8y3tn/L97d/03TuP+usET/vKoz/7isOP+vr0P/XM6n/zDe3P813Nb/L97d/5O6Zf/EpymOu6s0/7OuPv8+2cv/J+Hn/1HStP+0rjz/vasy/76qMP9zxYr/NtzV/zTd1/823NX/NtzV/zLd2f9I1b//mbheqsGpLf+gtVX/bseR/3fEhv+wr0L/vaoy/7msN/+/qjD/Wc+q/yvg4/813Nb/Md7b/zfc1P833NT/Mt7a/zbc1aqHvnT6bMiT/522WP+wr0L/vqox/7msN/+5rDf/vaoy/6C1VP8/2cr/N9zT/2vJlf9hzKD/NtzU/zbc1f813NaONdzWz3HGjv9ky53/prNN/8SoKv+8qzT/uaw3/7msOP/EqCr/ecOE/0HYx/9V0K//N9vT/zXc1v823NX/NtzVTjXc120w3tz/Lt/e/0zUu/+Fv3X/rrBF/7msN/+7qzX/vaoy/6qxSf9G1sH/L9/d/zPd2P8x3tv/L9/e2C/f3Qk23NUKNtzVzDbc1v823NX/OdvQ/0nVvv+xr0H/ta07/7+qL/+7qzT/r69D/2LMoP823NX/VNGx/2TLnVEAAAAAAAAAADbc1Sc03dfgQNnJ/2bKm/862tD/pLRP/1vOqf9S0rP/ib1x/8CpL/+4rDj/qLJM/7qsNn4AAAAAAAAAAAAAAAAAAAAAM93YI0vUvLtux5H/VdGw/3DHj/9Zz6r/Xc2m/3rDgv+5rDf/u6s1672rM2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyaYjUburNaytsUbZuK056cGpLuS/qjDGuaw3gLmsNx4AAAAAAAAAAAAAAAAAAAAA+D8AAOAPAADAAwAAgAMAAIABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAACAAQAAgAMAAMAHAADgDwAA+B8AAA==',
        method: 'GET',
        state: 4
      }];

      _export("default", CliqzResultProviders);
    }
  };
});
System.register('autocomplete/result', ['core/cliqz'], function (_export) {
    /*
     * This module acts as a result factory
     *
     */

    'use strict';

    var utils, Result;

    function log(msg) {}
    //utils.log(msg, 'Result.jsm');

    // returns the super type of a result - type to be consider for UI creation
    function getSuperType(result) {
        if (result.source == 'bm' && result.snippet && result.snippet.rich_data) {
            return utils.getKnownType(result.snippet.rich_data.superType) || // superType used for custom templates
            utils.getKnownType(result.snippet.rich_data.type) || // fallback result type
            'bm'; // backwards compatibility (most generic type, requires only url)
        }
        return null;
    }

    function combineSources(internal, cliqz) {
        // do not add extra sources to end of EZs
        if (internal == "cliqz-extra") return internal;

        var cliqz_sources = cliqz.substr(cliqz.indexOf('sources-'));
        return internal + " " + cliqz_sources;
    }

    return {
        setters: [function (_coreCliqz) {
            utils = _coreCliqz.utils;
        }],
        execute: function () {
            Result = {
                CLIQZR: 'cliqz-results',
                CLIQZC: 'cliqz-custom',
                CLIQZE: 'cliqz-extra',
                CLIQZCLUSTER: 'cliqz-cluster',
                CLIQZSERIES: 'cliqz-series',
                CLIQZICON: 'http://cliqz.com/favicon.ico',
                RULES: {
                    'video': [{ 'domain': 'youtube.com', 'ogtypes': ['video', 'youtube'] }, { 'domain': 'vimeo.com', 'ogtypes': ['video'] }, { 'domain': 'myvideo.de', 'ogtypes': ['video.tv_show', 'video.episode', 'video.other'] }, { 'domain': 'dailymotion.com', 'ogtypes': ['video'] }, { 'vertical': 'video' }],
                    'poster': [{ 'domain': 'imdb.com', 'ogtypes': ['video.tv_show', 'tv_show', 'movie', 'video.movie', 'game', 'video.episode', 'actor', 'public_figure'] }],
                    'person': [{ 'domain': 'xing.com', 'ogtypes': ['profile'] }, { 'vertical': 'people' }],
                    'hq': [{ 'vertical': 'hq' }],
                    'news': [{ 'vertical': 'news' }],
                    'shopping': [{ 'vertical': 'shopping' }]
                },
                generic: function generic(style, value, image, comment, label, query, data, subtype) {
                    //try to show host name if no title (comment) is provided
                    if (style.indexOf(Result.CLIQZC) === -1 // is not a custom search
                     && (!comment || value == comment) // no comment(page title) or comment is exactly the url
                     && utils.isCompleteUrl(value)) {
                        // looks like an url
                        var host = utils.getDetailsFromUrl(value).name;
                        if (host && host.length > 0) {
                            comment = host[0].toUpperCase() + host.slice(1);
                        }
                    }
                    if (!comment) {
                        comment = value;
                    }

                    data = data || {};
                    data.kind = [utils.encodeResultType(style) + (subtype ? '|' + subtype : '')];

                    var item = {
                        style: style,
                        val: value,
                        comment: comment,
                        label: label || value,
                        query: query,
                        data: data
                    };
                    return item;
                },
                cliqz: function cliqz(result) {
                    var resStyle = Result.CLIQZR + ' sources-' + utils.encodeSources(getSuperType(result) || result.source).join('');

                    if (result.snippet) {
                        return Result.generic(resStyle, //style
                        result.url, //value
                        null, //image -> favico
                        result.snippet.title, null, //label
                        result.q, //query
                        Result.getData(result), result.subType);
                    } else {
                        return Result.generic(resStyle, result.url, null, null, null, result.q, null, result.subType);
                    }
                },
                cliqzExtra: function cliqzExtra(result, snippet) {
                    result.data.subType = result.subType;
                    result.data.trigger_urls = result.trigger_urls;
                    result.data.ts = result.ts;

                    return Result.generic(Result.CLIQZE, //style
                    result.url, //value
                    null, //image -> favico
                    result.data.title, null, //label
                    result.q, //query
                    result.data, result.subType);
                },
                // Combine two results into a new result
                combine: function combine(first, second) {
                    var ret = Result.clone(first);
                    ret.style = combineSources(ret.style, second.style);
                    ret.data.kind = (ret.data.kind || []).concat(second.data.kind || []);

                    // copy over description, title and url list, if needed
                    if (second.data.description && !ret.data.description) ret.data.description = second.data.description;
                    if (second.data.title && !ret.data.title) // title
                        ret.data.title = second.data.title;
                    if (second.data.urls && !ret.data.urls) // history url list
                        ret.data.urls = second.data.urls;

                    return ret;
                },
                // not really cloning the object !!!
                clone: function clone(entry) {
                    var ret = Result.generic(entry.style, entry.val, null, entry.comment, entry.label, entry.query, null);
                    ret.data = JSON.parse(JSON.stringify(entry.data)); // nasty way of cloning an object
                    if (entry.autocompleted) ret.autocompleted = true;
                    return ret;
                },
                // check if a result should be kept in final result list
                isValid: function isValid(url, urlparts) {

                    // Google Filters
                    if (urlparts.name.toLowerCase() == "google" && urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() == "www" && (urlparts.extra.indexOf("/search") != -1 || // "/search?" for regular SERPS and ".*/search/.*" for maps
                    urlparts.extra.indexOf("/url?") == 0 || // www.google.*/url? - for redirects
                    urlparts.extra.indexOf("q=") != -1)) {
                        // for instant search results
                        log("Discarding result page from history: " + url);
                        return false;
                    }
                    // Bing Filters
                    // Filter all like:
                    //    www.bing.com/search?
                    if (urlparts.name.toLowerCase() == "bing" && urlparts.extra.indexOf("q=") != -1) {
                        log("Discarding result page from history: " + url);
                        return false;
                    }
                    // Yahoo filters
                    // Filter all like:
                    //   search.yahoo.com/search
                    //   *.search.yahooo.com/search - for international 'de.search.yahoo.com'
                    //   r.search.yahoo.com - for redirects 'r.search.yahoo.com'
                    if (urlparts.name.toLowerCase() == "yahoo" && (urlparts.subdomains.length == 1 && urlparts.subdomains[0].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0 || urlparts.subdomains.length == 2 && urlparts.subdomains[1].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0 || urlparts.subdomains.length == 2 && urlparts.subdomains[0].toLowerCase() == "r" && urlparts.subdomains[1].toLowerCase() == "search")) {
                        log("Discarding result page from history: " + url);
                        return false;
                    }

                    // Ignore bitly redirections
                    if (url.search(/http(s?):\/\/bit\.ly\/.*/i) === 0) {
                        log("Discarding result page from history: " + url);
                        return false;
                    }

                    // Ignore Twitter redirections
                    if (url.search(/http(s?):\/\/t\.co\/.*/i) === 0) {
                        log("Discarding result page from history: " + url);
                        return false;
                    }

                    return true;
                },
                // rich data and image
                getData: function getData(result) {
                    //TODO: rethink the whole image filtering
                    if (!result.snippet) return;

                    var urlparts = utils.getDetailsFromUrl(result.url),
                        resp = {
                        richData: result.snippet.rich_data,
                        adult: result.snippet.adult || false,
                        media: result.snippet.media
                    },
                        source = getSuperType(result) || result.source;

                    resp.type = "other";
                    for (var type in Result.RULES) {
                        var rules = Result.RULES[type];

                        for (var rule_i in rules) {
                            var rule = rules[rule_i];
                            if (rule.domain && urlparts.host.indexOf(rule.domain) != -1) for (var ogtype in rule.ogtypes || []) if (result.snippet && result.snippet.og && result.snippet.og.type == rule.ogtypes[ogtype]) resp.type = type;

                            var verticals = source.split(',');
                            for (var v in verticals) {
                                if (verticals[v].trim() == rule.vertical) resp.type = type;
                            }
                        }

                        var snip = result.snippet;
                        resp.description = snip && (snip.desc || snip.snippet || snip.og && snip.og.description);
                        resp.title = result.snippet.title;
                        // mobile specific url
                        resp.mobile_url = snip.amp_url || snip.m_url;

                        var ogT = snip && snip.og ? snip.og.type : null,
                            imgT = snip && snip.image ? snip.image.type : null;

                        if (resp.type != 'other' || ogT == 'cliqz' || imgT == 'cliqz') resp.image = Result.getVerticalImage(result.snippet.image, result.snippet.rich_data) || Result.getOgImage(result.snippet.og);
                    }

                    return resp;
                },
                getOgImage: function getOgImage(og) {
                    if (og && og.image) {
                        var image = { src: og.image };

                        if (og.duration && parseInt(og.duration)) {
                            var parsedDuration = Result.tryGetImageDuration(og.duration);
                            if (parsedDuration) image.duration = parsedDuration;
                        }

                        return image;
                    }
                },
                getVerticalImage: function getVerticalImage(imageData, richData) {
                    if (imageData == undefined || imageData.src == undefined) return;

                    var image = {
                        src: imageData.src
                    };

                    if (imageData.width) image.width = imageData.width;
                    if (imageData.height) image.height = imageData.height;
                    if (imageData.ratio) image.ratio = imageData.ratio;

                    // add duration from rich data
                    if (richData && richData.duration) {
                        var parsedDuration = Result.tryGetImageDuration(richData.duration);
                        if (parsedDuration) image.duration = parsedDuration;
                    }

                    return image;
                },
                tryGetImageDuration: function tryGetImageDuration(duration) {
                    try {
                        var totalSeconds = parseInt(duration),
                            min = Math.floor(totalSeconds / 60),
                            seconds = totalSeconds % 60;
                        return min + ':' + (seconds < 10 ? '0' + seconds : seconds);
                    } catch (e) {}

                    return undefined;
                }
            };

            _export('default', Result);
        }
    };
});
System.register('autocomplete/smart-cliqz-cache/cache', ['core/cliqz', 'core/fs'], function (_export) {

  /**
  * this simple cache is a dictionary that addionally stores
  * timestamps for each entry; life is time in seconds before
  * entries are marked stale (if life is not specified entries
  * are good forever); going stale has no immediate consequences
  * @namespace smart-cliqz-cache
  */
  'use strict';

  var utils, readFile, writeFile, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_coreFs) {
      readFile = _coreFs.readFile;
      writeFile = _coreFs.writeFile;
    }],
    execute: function () {
      _default = (function () {
        /**
        * @class Cache
        * @constructor
        */

        function _default(life) {
          _classCallCheck(this, _default);

          this._cache = {};
          this._life = life ? life * 1000 : false;
        }

        /**
        * stores entry only if it is newer than current entry,
        * current time is used if time is not specified
        * @method store
        * @param key {string}
        * @param value {string}
        * @param time {timestamp}
        */

        _createClass(_default, [{
          key: 'store',
          value: function store(key, value, time) {
            time = time || Date.now();

            if (this.isNew(key, value, time)) {
              this._cache[key] = {
                time: time,
                value: value
              };
            }
          }

          /**
          * deletes entry
          * @method delete
          * @param key {string}
          */
        }, {
          key: 'delete',
          value: function _delete(key) {
            if (this.isCached(key)) {
              delete this._cache[key];
            }
          }

          /**
          * returns cached entry or false if no entry exists for key
          * @method retrieve
          * @param key {string}
          */
        }, {
          key: 'retrieve',
          value: function retrieve(key) {
            if (!this.isCached(key)) {
              return false;
            }
            return this._cache[key].value;
          }

          /**
          * @method isCached
          * @param key {string}
          */
        }, {
          key: 'isCached',
          value: function isCached(key) {
            return this._cache.hasOwnProperty(key);
          }

          /**
          * @method isNew
          * @param key {string}
          * @param value {string}
          * @param time {timestamp}
          * @returns true if there is no newer entry already cached for key
          */
        }, {
          key: 'isNew',
          value: function isNew(key, value, time) {
            return !this.isCached(key) || time > this._cache[key].time;
          }

          /** an entry is stale if it is not cached or has expired
          * (an entry can only expire if life is specified); this
          * has no immediate consequences, but can be used from
          * outside to decide if this entry should be updated
          * @method isStale
          * @param key {string}
          */
        }, {
          key: 'isStale',
          value: function isStale(key) {
            return !this.isCached(key) || this._life && Date.now() - this._cache[key].time > this._life;
          }

          /**
          * updates time without replacing the entry
          * @method refresh
          * @param key {string}
          * @param time {timestamp}
          */
        }, {
          key: 'refresh',
          value: function refresh(key, time) {
            time = time || Date.now();

            if (this.isCached(key)) {
              this._cache[key].time = time;
            }
          }

          /**
          * save cache to file
          * @method save
          * @param filename {string}
          */
        }, {
          key: 'save',
          value: function save(filename) {
            var _this = this;

            var content = new TextEncoder().encode(JSON.stringify(this._cache));
            writeFile(filename, content).then(function () {
              _this.log('save: saved to ' + filename);
            })['catch'](function (e) {
              _this.log('save: failed saving: ' + e);
            });
          }

          /**
          * load cache from file
          * @method load
          * @param filename {string}
          */
        }, {
          key: 'load',
          value: function load(filename) {
            var _this2 = this;

            readFile(filename).then(function (data) {
              _this2._cache = JSON.parse(new TextDecoder().decode(data));
              _this2.log('load: loaded from: ' + filename);
            })['catch'](function (e) {
              _this2.log('load: failed loading: ' + e);
            });
          }
        }, {
          key: 'log',
          value: function log(msg) {
            utils.log(msg, 'Cache');
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
System.register('autocomplete/smart-cliqz-cache/rich-header', ['core/cliqz', 'autocomplete/result'], function (_export) {
  'use strict';

  var utils, Result;

  _export('getSmartCliqz', getSmartCliqz);

  function getSmartCliqz(url) {
    var _this = this;

    utils.log('getSmartCliqz: start fetching for ' + url);

    return new Promise(function (resolve, reject) {
      var endpointUrl = 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=' + url;

      utils.httpGet(endpointUrl, (function success(req) {
        try {
          var smartCliqzData = JSON.parse(req.response).results[0];
          var smartCliqzExists = typeof smartCliqzData !== 'undefined';
          var smartCliqz = undefined;

          if (!smartCliqzExists) {
            reject({
              type: 'URL_NOT_FOUND',
              message: url + ' not found on server'
            });
          } else {
            smartCliqz = Result.cliqzExtra(smartCliqzData);
            utils.log('getSmartCliqz: done fetching for ' + url);
            resolve(smartCliqz);
          }
        } catch (e) {
          reject({
            type: 'UNKNOWN_ERROR',
            message: e
          });
        }
      }).bind(_this), function error() {
        reject({
          type: 'HTTP_REQUEST_ERROR',
          message: ''
        });
      });
    });
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_autocompleteResult) {
      Result = _autocompleteResult['default'];
    }],
    execute: function () {}
  };
});
System.register('autocomplete/smart-cliqz-cache/smart-cliqz-cache', ['autocomplete/smart-cliqz-cache/rich-header', 'core/cliqz', 'core/fs', 'autocomplete/smart-cliqz-cache/cache'], function (_export) {
  'use strict';

  var getSmartCliqz, utils, mkdir, Cache, CUSTOM_DATA_CACHE_FOLDER, CUSTOM_DATA_CACHE_FILE, MAX_ITEMS, ONE_MINUTE, ONE_HOUR, ONE_DAY, _default;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_autocompleteSmartCliqzCacheRichHeader) {
      getSmartCliqz = _autocompleteSmartCliqzCacheRichHeader.getSmartCliqz;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_coreFs) {
      mkdir = _coreFs.mkdir;
    }, function (_autocompleteSmartCliqzCacheCache) {
      Cache = _autocompleteSmartCliqzCacheCache['default'];
    }],
    execute: function () {
      CUSTOM_DATA_CACHE_FOLDER = 'cliqz';
      CUSTOM_DATA_CACHE_FILE = CUSTOM_DATA_CACHE_FOLDER + '/smartcliqz-custom-data-cache.json';

      // maximum number of items (e.g., categories or links) to keep
      MAX_ITEMS = 5;
      ONE_MINUTE = 60;
      ONE_HOUR = ONE_MINUTE * 60;
      ONE_DAY = ONE_HOUR * 24;

      /*
       * @namespace smart-cliqz-cache
       */

      _default = (function () {
        /**
        * This module caches SmartCliqz results in the extension. It
        * also customizes news SmartCliqz by re-ordering categories and
        * links based on the user's browsing history.
        * @class SmartCliqzCache
        * @constructor
        */

        function _default() {
          var _this = this;

          _classCallCheck(this, _default);

          this._smartCliqzCache = new Cache(ONE_MINUTE);
          // re-customize after an hour
          this._customDataCache = new Cache(ONE_HOUR);
          this._isCustomizationEnabledByDefault = true;
          this._isInitialized = false;
          // to prevent fetching while fetching is still in progress
          this._fetchLock = {};

          mkdir(CUSTOM_DATA_CACHE_FOLDER).then(function () {
            // TODO: detect when loaded; allow save only afterwards
            _this._customDataCache.load(CUSTOM_DATA_CACHE_FILE);
          })['catch'](function (e) {
            _this._log('init: unable to create cache folder:' + e);
          });

          this._isInitialized = true;
          this._log('init: initialized');
        }

        /*
        * stores SmartCliqz if newer than chached version
        * @method store
        * @param smartCliqz
        */

        _createClass(_default, [{
          key: 'store',
          value: function store(smartCliqz) {
            var url = this.getUrl(smartCliqz);

            this._smartCliqzCache.store(url, smartCliqz);

            try {
              if (this.isCustomizationEnabled() && this.isNews(smartCliqz) && this._customDataCache.isStale(url)) {

                this._log('store: found stale data for url ' + url);
                this._prepareCustomData(url);
              }
            } catch (e) {
              this._log('store: error while customizing data: ' + e);
            }
          }

          /**
          * @method fetchAndStore
          * @param id
          */
        }, {
          key: 'fetchAndStore',
          value: function fetchAndStore(url) {
            var _this2 = this;

            if (this._fetchLock.hasOwnProperty(url)) {
              this._log('fetchAndStore: fetching already in progress for ' + url);
              return;
            }

            this._log('fetchAndStore: for ' + url);
            this._fetchLock[url] = true;
            getSmartCliqz(url).then(function (smartCliqz) {
              // limit number of categories/links
              if (smartCliqz.hasOwnProperty('data')) {
                if (smartCliqz.data.hasOwnProperty('links')) {
                  smartCliqz.data.links = smartCliqz.data.links.slice(0, MAX_ITEMS);
                }
                if (smartCliqz.data.hasOwnProperty('categories')) {
                  smartCliqz.data.categories = smartCliqz.data.categories.slice(0, MAX_ITEMS);
                }
              }
              _this2.store(smartCliqz);
              delete _this2._fetchLock[url];
            }, function (e) {
              _this2._log('fetchAndStore: error while fetching data: ' + e.type + ' ' + e.message);
              delete _this2._fetchLock[url];
            });
          }

          /**
          * customizes SmartCliqz if news or domain supported, and user preference is set
          * @method retrieve
          * @param url
          * @returns SmartCliqz from cache (false if not found)
          */
        }, {
          key: 'retrieve',
          value: function retrieve(url) {
            var smartCliqz = this._smartCliqzCache.retrieve(url);

            if (this.isCustomizationEnabled() && smartCliqz && this.isNews(smartCliqz)) {
              try {
                this._customizeSmartCliqz(smartCliqz);
              } catch (e) {
                this._log('retrieveCustomized: error while customizing data: ' + e);
              }
            }

            return smartCliqz;
          }

          /**
           * Same as `retrieve`, but triggers asynchronous cache update:
           * fetches SmartCliqz (again) if not yet cached or if stale. If SmartCliqz
           * was not yet cached `false` is returned and update is initiated.
           * @param {String} url - The SmartCliqz trigger URL
           * @return {SmartCliqz} The cached SmartCliqz or false if not yet cached.
           */
        }, {
          key: 'retrieveAndUpdate',
          value: function retrieveAndUpdate(url) {
            var smartCliqz = this.retrieve(url);

            if (this._smartCliqzCache.isStale(url)) {
              utils.setTimeout((function () {
                this.fetchAndStore(url);
              }).bind(this), 0);
            }

            return smartCliqz;
          }

          /**
          * extracts domain from SmartCliqz
          * @method getDomain
          * @param smartCliqz
          */
        }, {
          key: 'getDomain',
          value: function getDomain(smartCliqz) {
            // TODO: define one place to store domain
            if (smartCliqz.data.domain) {
              return smartCliqz.data.domain;
            } else if (smartCliqz.data.trigger_urls && smartCliqz.data.trigger_urls.length > 0) {
              return utils.generalizeUrl(smartCliqz.data.trigger_urls[0]);
            } else {
              return false;
            }
          }

          /**
          * extracts id from SmartCliqz
          * @method getId
          * @param smartCliqz
          */
        }, {
          key: 'getId',
          value: function getId(smartCliqz) {
            return smartCliqz.data.__subType__.id;
          }

          /**
          * extracts URL from SmartCliqz
          * @method getUrl
          * @param smartCliqz
          */
        }, {
          key: 'getUrl',
          value: function getUrl(smartCliqz) {
            return utils.generalizeUrl(smartCliqz.val, true);
          }

          /**
          * extracts timestamp from SmartCliqz
          * @method getTimestamp
          * @param smartCliqz
          */
        }, {
          key: 'getTimestamp',
          value: function getTimestamp(smartCliqz) {
            return smartCliqz.data.ts;
          }

          /**
          * @method isNews
          * @param smartCliqz
          * returns true this is a news SmartCliqz
          */
        }, {
          key: 'isNews',
          value: function isNews(smartCliqz) {
            return typeof smartCliqz.data.news !== 'undefined';
          }

          /**
          * @method isCustomizationEnabled
          * @returns true if the user enabled customization
          */
        }, {
          key: 'isCustomizationEnabled',
          value: function isCustomizationEnabled() {
            try {
              var isEnabled = utils.getPref('enableSmartCliqzCustomization', undefined);
              return isEnabled === undefined ? this._isCustomizationEnabledByDefault : isEnabled;
            } catch (e) {
              return this._isCustomizationEnabledByDefault;
            }
          }

          // re-orders categories based on visit frequency
        }, {
          key: '_customizeSmartCliqz',
          value: function _customizeSmartCliqz(smartCliqz) {
            var url = this.getUrl(smartCliqz);
            if (this._customDataCache.isCached(url)) {
              this._injectCustomData(smartCliqz, this._customDataCache.retrieve(url));

              if (this._customDataCache.isStale(url)) {
                this._log('_customizeSmartCliqz: found stale data for ' + url);
                this._prepareCustomData(url);
              }
            } else {
              this._log('_customizeSmartCliqz: custom data not yet ready for ' + url);
            }
          }

          // replaces all keys from custom data in SmartCliqz data
        }, {
          key: '_injectCustomData',
          value: function _injectCustomData(smartCliqz, customData) {
            var url = this.getUrl(smartCliqz);
            this._log('_injectCustomData: injecting for ' + url);
            for (var key in customData) {
              if (customData.hasOwnProperty(key)) {
                smartCliqz.data[key] = customData[key];
                this._log('_injectCustomData: injecting key ' + key);
              }
            }
            this._log('_injectCustomData: done injecting for ' + url);
          }

          // prepares and stores custom data for SmartCliqz with given URL (async.),
          // (if custom data has not been prepared before and has not expired)
        }, {
          key: '_prepareCustomData',
          value: function _prepareCustomData(url) {
            var _this3 = this;

            if (this._customDataCache.isStale(url)) {
              // update time so that this method is not executed multiple
              // times while not yet finished (runs asynchronously)
              this._customDataCache.refresh(url);
              this._log('_prepareCustomData: preparing for ' + url);
            } else {
              this._log('_prepareCustomData: already updated or in update progress ' + url);
              return;
            }

            // for stats
            var oldCustomData = this._customDataCache.retrieve(url);

            // (1) fetch template from rich header
            getSmartCliqz(url).then(function (smartCliqz) {
              var domain = _this3.getDomain(smartCliqz);
              return Promise.all([Promise.resolve(smartCliqz), _this3._fetchVisitedUrls(domain)]);
            })
            // (2) fetch history for SmartCliqz domain
            .then(function (_ref) {
              var _ref2 = _slicedToArray(_ref, 2);

              var smartCliqz = _ref2[0];
              var urls = _ref2[1];

              // now, (3) re-order template categories based on history
              var domain = _this3.getDomain(smartCliqz);

              // TODO: define per SmartCliqz what the data field to be customized is called
              if (!_this3.isNews(smartCliqz)) {
                smartCliqz.data.categories = smartCliqz.data.links;
              }

              var categories = smartCliqz.data.categories.slice();

              // add some information to facilitate re-ordering
              for (var j = 0; j < categories.length; j++) {
                categories[j].genUrl = utils.generalizeUrl(categories[j].url);
                categories[j].matchCount = 0;
                categories[j].originalOrder = j;
              }

              // count category-visit matches (visit url contains category url)
              for (var i = 0; i < urls.length; i++) {
                var _url = utils.generalizeUrl(urls[i]);
                for (var j = 0; j < categories.length; j++) {
                  if (_this3._isMatch(_url, categories[j].genUrl)) {
                    categories[j].matchCount++;
                  }
                }
              }

              // re-order by match count; on tie use original order
              categories.sort(function compare(a, b) {
                if (a.matchCount !== b.matchCount) {
                  return b.matchCount - a.matchCount; // descending
                } else {
                    return a.originalOrder - b.originalOrder; // ascending
                  }
              });

              categories = categories.slice(0, MAX_ITEMS);

              var oldCategories = oldCustomData ?
              // previous customization: use either categories (news) or links (other SmartCliqz)
              _this3.isNews(smartCliqz) ? oldCustomData.categories : oldCustomData.links :
              // no previous customization: use default order
              smartCliqz.data.categories;

              // send some stats
              _this3._sendStats(oldCategories, categories, oldCustomData ? true : false, urls);

              // TODO: define per SmartCliqz what the data field to be customized is called
              if (_this3.isNews(smartCliqz)) {
                _this3._customDataCache.store(url, { categories: categories });
              } else {
                _this3._customDataCache.store(url, { links: categories });
              }

              _this3._log('_prepareCustomData: done preparing for ' + url);
              _this3._customDataCache.save(CUSTOM_DATA_CACHE_FILE);
            })['catch'](function (e) {
              return _this3._log('_prepareCustomData: error while fetching data: ' + e.message);
            });
          }

          // checks if URL from history matches a category URL
        }, {
          key: '_isMatch',
          value: function _isMatch(historyUrl, categoryUrl) {
            // TODO: check for subcategories, for example,
            //       Spiegel 'Soziales' has URL 'wirtschaft/soziales',
            //     thus such entries are counted twice, for 'Sozialez',
            //     but also for 'Wirtschaft'
            return historyUrl.indexOf(categoryUrl) > -1;
          }

          // from history, fetches all visits to given domain within 30 days from now (async.)
        }, {
          key: '_fetchVisitedUrls',
          value: function _fetchVisitedUrls(domain) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
              _this4._log('_fetchVisitedUrls: start fetching for domain ' + domain);
              // TODO: make cross platform
              var historyService = Components.classes['@mozilla.org/browser/nav-history-service;1'].getService(Components.interfaces.nsINavHistoryService);

              if (!historyService) {
                reject('_fetchVisitedUrls: history service not available');
              } else {
                var options = historyService.getNewQueryOptions();
                var query = historyService.getNewQuery();
                query.domain = domain;
                // 30 days from now
                query.beginTimeReference = query.TIME_RELATIVE_NOW;
                query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
                query.endTimeReference = query.TIME_RELATIVE_NOW;
                query.endTime = 0;

                var result = historyService.executeQuery(query, options);
                var container = result.root;
                container.containerOpen = true;

                var urls = [];
                for (var i = 0; i < container.childCount; i++) {
                  urls[i] = container.getChild(i).uri;
                }

                _this4._log('_fetchVisitedUrls: done fetching ' + urls.length + ' URLs for domain ' + domain);
                resolve(urls);
              }
            });
          }
        }, {
          key: '_sendStats',
          value: function _sendStats(oldCategories, newCategories, isRepeatedCustomization, urls) {
            var stats = {
              type: 'activity',
              action: 'smart_cliqz_customization',
              // SmartCliqz id
              id: 'na',
              // total number of URLs retrieved from history
              urlCandidateCount: urls.length,
              // number of URLs that produced a match within shown categories (currently 5)
              urlMatchCount: 0,
              // average number of URL matches across shown categories
              urlMatchCountAvg: 0,
              // standard deviation of URL matches across shown categories
              urlMatchCountSd: 0,
              // number of categories that changed (per position; swap counts twice)
              categoriesPosChangeCount: 0,
              // number of categories kept after re-ordering (positions might change)
              categoriesKeptCount: 0,
              // average position change of a kept categories
              categoriesKeptPosChangeAvg: 0,
              // true, if this customization is a re-customization
              isRepeatedCustomization: isRepeatedCustomization
            };

            var oldPositions = {};
            var length = Math.min(oldCategories.length, newCategories.length);

            for (var i = 0; i < length; i++) {
              stats.urlMatchCount += newCategories[i].matchCount;
              oldPositions[oldCategories[i].title] = i;

              if (newCategories[i].title !== oldCategories[i].title) {
                stats.categoriesPosChangeCount++;
              }
            }
            stats.urlMatchCountAvg = stats.urlMatchCount / length;

            for (var i = 0; i < length; i++) {
              stats.urlMatchCountSd += Math.pow(stats.urlMatchCountAvg - newCategories[i].matchCount, 2);
            }
            stats.urlMatchCountSd /= length;
            stats.urlMatchCountSd = Math.sqrt(stats.urlMatchCountSd);

            for (var i = 0; i < length; i++) {
              if (oldPositions.hasOwnProperty(newCategories[i].title)) {
                stats.categoriesKeptCount++;
                stats.categoriesKeptPosChangeAvg += Math.abs(i - oldPositions[newCategories[i].title]);
              }
            }
            stats.categoriesKeptPosChangeAvg /= stats.categoriesKeptCount;

            utils.telemetry(stats);
          }

          // log helper
        }, {
          key: '_log',
          value: function _log(msg) {
            utils.log(msg, 'smart-cliqz-cache');
          }
        }, {
          key: 'unload',
          value: function unload() {}
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
System.register('autocomplete/smart-cliqz-cache/trigger-url-cache', ['autocomplete/smart-cliqz-cache/rich-header', 'core/cliqz', 'autocomplete/smart-cliqz-cache/cache'], function (_export) {
  'use strict';

  var getSmartCliqz, utils, Cache, HOUR, DAY, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  return {
    setters: [function (_autocompleteSmartCliqzCacheRichHeader) {
      getSmartCliqz = _autocompleteSmartCliqzCacheRichHeader.getSmartCliqz;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_autocompleteSmartCliqzCacheCache) {
      Cache = _autocompleteSmartCliqzCacheCache['default'];
    }],
    execute: function () {
      HOUR = 1000 * 60 * 60;
      DAY = 24 * HOUR;

      /**
      * @namespace smart-cliqz-cache
      */

      _default = (function (_Cache) {
        _inherits(_default, _Cache);

        /**
        * @class TriggerUrlCache
        * @constructor
        */

        function _default() {
          var file = arguments.length <= 0 || arguments[0] === undefined ? 'cliqz/smartcliqz-trigger-urls-cache.json' : arguments[0];

          _classCallCheck(this, _default);

          _get(Object.getPrototypeOf(_default.prototype), 'constructor', this).call(this, false);
          this.file = file;
        }

        /**
        * @method init
        */

        _createClass(_default, [{
          key: 'init',
          value: function init() {
            this.load();
            this.scheduleRecurringClean();
          }

          /**
          * @method load
          */
        }, {
          key: 'load',
          value: function load() {
            return _get(Object.getPrototypeOf(_default.prototype), 'load', this).call(this, this.file);
          }

          /**
          * @method save
          */
        }, {
          key: 'save',
          value: function save() {
            return _get(Object.getPrototypeOf(_default.prototype), 'save', this).call(this, this.file);
          }

          /**
          * @method scheduleRecurringClean
          * @param delay
          */
        }, {
          key: 'scheduleRecurringClean',
          value: function scheduleRecurringClean(delay) {
            var _this = this;

            if (!delay) {
              var lastCleanTime = utils.getPref('smart-cliqz-last-clean-ts');
              if (!lastCleanTime) {
                delay = 0;
              } else {
                var timeSinceLastClean = Date.now() - new Date(Number(lastCleanTime));
                delay = timeSinceLastClean > DAY ? 0 : DAY - timeSinceLastClean;
              }
            }

            this.cleanTimeout = utils.setTimeout(function (_) {
              _this.clean().then(function (_) {
                utils.setPref('smart-cliqz-last-clean-ts', Date.now().toString());
                _this.scheduleRecurringClean(DAY);
              });
            }, delay);
            utils.log('scheduled SmartCliqz trigger URLs cleaning in ' + Math.round(delay / 1000 / 60) + ' minutes');
          }

          /**
          * clean trigger URLs that are no longer valid
          * @method clean
          * @param delay {Number}
          */
        }, {
          key: 'clean',
          value: function clean() {
            var _this2 = this;

            var delay = arguments.length <= 0 || arguments[0] === undefined ? 1000 : arguments[0];

            return new Promise(function (resolve, reject) {
              utils.log('start cleaning SmartCliqz trigger URLs');

              var cleaners = Object.keys(_this2._cache).map(function (url, idx) {
                return function () {
                  return new Promise(function (resolve, reject) {
                    utils.setTimeout(function () {
                      if (_this2.isUnloaded) {
                        reject('unloaded');
                        return;
                      }
                      getSmartCliqz(url).then(function (smartCliqz) {
                        if (!smartCliqz.data.trigger_urls.some(function (u) {
                          return u === url;
                        })) {
                          utils.log('unknown trigger URL: deleting SmartCliqz ' + url);
                          _this2['delete'](url);
                          _this2.save();
                        }
                        resolve();
                      })['catch'](function (e) {
                        if (e.type && e.type === 'URL_NOT_FOUND') {
                          utils.log('unkown URL: deleting SmartCliqz ' + url);
                          _this2['delete'](url);
                          _this2.save();
                        }
                        resolve();
                      });
                    }, idx * delay);
                  });
                };
              });
              // final action: resolve
              cleaners.push(function () {
                utils.log('done cleaning SmartCliqz trigger URLs');
                resolve();
                return Promise.resolve();
              });
              // execute sequentually
              cleaners.reduce(function (current, next) {
                return current.then(function (_) {
                  return next();
                }, function (e) {
                  reject(e);return Promise.reject();
                });
              }, Promise.resolve());
            });
          }

          /**
          * @method unload
          */
        }, {
          key: 'unload',
          value: function unload() {
            this.isUnloaded = true;
            utils.clearTimeout(this.cleanTimeout);
          }
        }]);

        return _default;
      })(Cache);

      _export('default', _default);
    }
  };
});
System.register("autocomplete/spell-check", ["autocomplete/autocomplete", "core/cliqz", "core/platform"], function (_export) {
    "use strict";

    var autocomplete, utils, isFirefox, CliqzSpellCheck;
    return {
        setters: [function (_autocompleteAutocomplete) {
            autocomplete = _autocompleteAutocomplete["default"];
        }, function (_coreCliqz) {
            utils = _coreCliqz.utils;
        }, function (_corePlatform) {
            isFirefox = _corePlatform.isFirefox;
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
                    if (isFirefox && utils.getPref("config_location", "") == "de" && Object.keys(autocomplete.spellCorrectionDict).length == 0) {
                        utils.log('loading dict', 'spellcorr');
                        utils.loadResource('chrome://cliqz/content/spell_check.list', CliqzSpellCheck.loadRecords);
                    }
                }
            };

            _export("default", CliqzSpellCheck);
        }
    };
});
System.register('autocomplete/url-compare', [], function (_export) {
  /*
   * This module handles results(url) comparison
   *
   */

  // TLD list extracted from http://www.iana.org/domains/root/db,
  // cc stands fro country code, the other are generic
  'use strict';

  var TLDs, UrlCompare;
  return {
    setters: [],
    execute: function () {
      TLDs = { gw: 'cc', gu: 'cc', gt: 'cc', gs: 'cc', gr: 'cc', gq: 'cc', gp: 'cc', dance: 'na', tienda: 'na', gy: 'cc', gg: 'cc', gf: 'cc', ge: 'cc', gd: 'cc', gb: 'cc', ga: 'cc', edu: 'na', gn: 'cc', gm: 'cc', gl: 'cc', '公司': 'na', gi: 'cc', gh: 'cc', tz: 'cc', zone: 'na', tv: 'cc', tw: 'cc', tt: 'cc', immobilien: 'na', tr: 'cc', tp: 'cc', tn: 'cc', to: 'cc', tl: 'cc', bike: 'na', tj: 'cc', tk: 'cc', th: 'cc', tf: 'cc', tg: 'cc', td: 'cc', tc: 'cc', coop: 'na', 'онлайн': 'na', cool: 'na', ro: 'cc', vu: 'cc', democrat: 'na', guitars: 'na', qpon: 'na', 'срб': 'cc', zm: 'cc', tel: 'na', futbol: 'na', za: 'cc', 'بازار': 'na', 'рф': 'cc', zw: 'cc', blue: 'na', mu: 'cc', 'ไทย': 'cc', asia: 'na', marketing: 'na', '测试': 'na', international: 'na', net: 'na', '新加坡': 'cc', okinawa: 'na', 'பரிட்சை': 'na', 'טעסט': 'na', '삼성': 'na', sexy: 'na', institute: 'na', '台灣': 'cc', pics: 'na', '公益': 'na', '机构': 'na', social: 'na', domains: 'na', '香港': 'cc', '集团': 'na', limo: 'na', 'мон': 'cc', tools: 'na', nagoya: 'na', properties: 'na', camera: 'na', today: 'na', club: 'na', company: 'na', glass: 'na', berlin: 'na', me: 'cc', md: 'cc', mg: 'cc', mf: 'cc', ma: 'cc', mc: 'cc', tokyo: 'na', mm: 'cc', ml: 'cc', mo: 'cc', mn: 'cc', mh: 'cc', mk: 'cc', cat: 'na', reviews: 'na', mt: 'cc', mw: 'cc', mv: 'cc', mq: 'cc', mp: 'cc', ms: 'cc', mr: 'cc', cab: 'na', my: 'cc', mx: 'cc', mz: 'cc', 'இலங்கை': 'cc', wang: 'na', estate: 'na', clothing: 'na', monash: 'na', guru: 'na', technology: 'na', travel: 'na', 'テスト': 'na', pink: 'na', fr: 'cc', '테스트': 'na', farm: 'na', lighting: 'na', fi: 'cc', fj: 'cc', fk: 'cc', fm: 'cc', fo: 'cc', sz: 'cc', kaufen: 'na', sx: 'cc', ss: 'cc', sr: 'cc', sv: 'cc', su: 'cc', st: 'cc', sk: 'cc', sj: 'cc', si: 'cc', sh: 'cc', so: 'cc', sn: 'cc', sm: 'cc', sl: 'cc', sc: 'cc', sb: 'cc', rentals: 'na', sg: 'cc', se: 'cc', sd: 'cc', '组织机构': 'na', shoes: 'na', '中國': 'cc', industries: 'na', lb: 'cc', lc: 'cc', la: 'cc', lk: 'cc', li: 'cc', lv: 'cc', lt: 'cc', lu: 'cc', lr: 'cc', ls: 'cc', holiday: 'na', ly: 'cc', coffee: 'na', ceo: 'na', '在线': 'na', ye: 'cc', 'إختبار': 'na', ninja: 'na', yt: 'cc', name: 'na', moda: 'na', eh: 'cc', 'بھارت': 'cc', ee: 'cc', house: 'na', eg: 'cc', ec: 'cc', vote: 'na', eu: 'cc', et: 'cc', es: 'cc', er: 'cc', ru: 'cc', rw: 'cc', 'ભારત': 'cc', rs: 'cc', boutique: 'na', re: 'cc', 'سورية': 'cc', gov: 'na', 'орг': 'na', red: 'na', foundation: 'na', pub: 'na', vacations: 'na', org: 'na', training: 'na', recipes: 'na', 'испытание': 'na', '中文网': 'na', support: 'na', onl: 'na', '中信': 'na', voto: 'na', florist: 'na', 'ලංකා': 'cc', 'қаз': 'cc', management: 'na', 'مصر': 'cc', 'آزمایشی': 'na', kiwi: 'na', academy: 'na', sy: 'cc', cards: 'na', 'संगठन': 'na', pro: 'na', kred: 'na', sa: 'cc', mil: 'na', '我爱你': 'na', agency: 'na', 'みんな': 'na', equipment: 'na', mango: 'na', luxury: 'na', villas: 'na', '政务': 'na', singles: 'na', systems: 'na', plumbing: 'na', 'δοκιμή': 'na', 'تونس': 'cc', 'پاکستان': 'cc', gallery: 'na', kg: 'cc', ke: 'cc', 'বাংলা': 'cc', ki: 'cc', kh: 'cc', kn: 'cc', km: 'cc', kr: 'cc', kp: 'cc', kw: 'cc', link: 'na', ky: 'cc', voting: 'na', cruises: 'na', 'عمان': 'cc', cheap: 'na', solutions: 'na', '測試': 'na', neustar: 'na', partners: 'na', 'இந்தியா': 'cc', menu: 'na', arpa: 'na', flights: 'na', rich: 'na', 'do': 'cc', dm: 'cc', dj: 'cc', dk: 'cc', photography: 'na', de: 'cc', watch: 'na', dz: 'cc', supplies: 'na', report: 'na', tips: 'na', 'გე': 'cc', bar: 'na', qa: 'cc', shiksha: 'na', 'укр': 'cc', vision: 'na', wiki: 'na', 'قطر': 'cc', '한국': 'cc', computer: 'na', best: 'na', voyage: 'na', expert: 'na', diamonds: 'na', email: 'na', wf: 'cc', jobs: 'na', bargains: 'na', '移动': 'na', jp: 'cc', jm: 'cc', jo: 'cc', ws: 'cc', je: 'cc', kitchen: 'na', 'ਭਾਰਤ': 'cc', 'ایران': 'cc', ua: 'cc', buzz: 'na', com: 'na', uno: 'na', ck: 'cc', ci: 'cc', ch: 'cc', co: 'cc', cn: 'cc', cm: 'cc', cl: 'cc', cc: 'cc', ca: 'cc', cg: 'cc', cf: 'cc', community: 'na', cd: 'cc', cz: 'cc', cy: 'cc', cx: 'cc', cr: 'cc', cw: 'cc', cv: 'cc', cu: 'cc', pr: 'cc', ps: 'cc', pw: 'cc', pt: 'cc', holdings: 'na', wien: 'na', py: 'cc', ai: 'cc', pa: 'cc', pf: 'cc', pg: 'cc', pe: 'cc', pk: 'cc', ph: 'cc', pn: 'cc', pl: 'cc', pm: 'cc', '台湾': 'cc', aero: 'na', catering: 'na', photos: 'na', 'परीक्षा': 'na', graphics: 'na', 'فلسطين': 'cc', 'ভারত': 'cc', ventures: 'na', va: 'cc', vc: 'cc', ve: 'cc', vg: 'cc', iq: 'cc', vi: 'cc', is: 'cc', ir: 'cc', it: 'cc', vn: 'cc', im: 'cc', il: 'cc', io: 'cc', 'in': 'cc', ie: 'cc', id: 'cc', tattoo: 'na', education: 'na', parts: 'na', events: 'na', 'భారత్': 'cc', cleaning: 'na', kim: 'na', contractors: 'na', mobi: 'na', center: 'na', photo: 'na', nf: 'cc', 'مليسيا': 'cc', wed: 'na', supply: 'na', '网络': 'na', 'сайт': 'na', careers: 'na', build: 'na', 'الاردن': 'cc', bid: 'na', biz: 'na', 'السعودية': 'cc', gift: 'na', 'дети': 'na', works: 'na', '游戏': 'na', tm: 'cc', exposed: 'na', productions: 'na', koeln: 'na', dating: 'na', christmas: 'na', bd: 'cc', be: 'cc', bf: 'cc', bg: 'cc', ba: 'cc', bb: 'cc', bl: 'cc', bm: 'cc', bn: 'cc', bo: 'cc', bh: 'cc', bi: 'cc', bj: 'cc', bt: 'cc', bv: 'cc', bw: 'cc', bq: 'cc', br: 'cc', bs: 'cc', post: 'na', by: 'cc', bz: 'cc', om: 'cc', ruhr: 'na', 'امارات': 'cc', repair: 'na', xyz: 'na', 'شبكة': 'na', viajes: 'na', museum: 'na', fish: 'na', 'الجزائر': 'cc', hr: 'cc', ht: 'cc', hu: 'cc', hk: 'cc', construction: 'na', hn: 'cc', solar: 'na', hm: 'cc', info: 'na', 'சிங்கப்பூர்': 'cc', uy: 'cc', uz: 'cc', us: 'cc', um: 'cc', uk: 'cc', ug: 'cc', builders: 'na', ac: 'cc', camp: 'na', ae: 'cc', ad: 'cc', ag: 'cc', af: 'cc', int: 'na', am: 'cc', al: 'cc', ao: 'cc', an: 'cc', aq: 'cc', as: 'cc', ar: 'cc', au: 'cc', at: 'cc', aw: 'cc', ax: 'cc', az: 'cc', ni: 'cc', codes: 'na', nl: 'cc', no: 'cc', na: 'cc', nc: 'cc', ne: 'cc', actor: 'na', ng: 'cc', 'भारत': 'cc', nz: 'cc', 'سودان': 'cc', np: 'cc', nr: 'cc', nu: 'cc', xxx: 'na', '世界': 'na', kz: 'cc', enterprises: 'na', land: 'na', 'المغرب': 'cc', '中国': 'cc', directory: 'na' };
      UrlCompare = {

        // Compare two URLs and return true if same or differing only by
        // country code in subdomain or path.
        sameUrls: function sameUrls(url1, url2) {
          // Get generalized representation of each url
          var keys1 = UrlCompare._extractKeys(url1, '');
          var keys2 = UrlCompare._extractKeys(url2, '');

          // Compare the second one, which takes path into account
          return keys1[1] == keys2[1];
        },

        _filterTLDs: function _filterTLDs(domain) {
          var v = domain.toLowerCase().split('.');

          // remove the first level yes or yes
          var first_level = TLDs[v[v.length - 1]];
          v[v.length - 1] = null;

          if (v.length > 2 && first_level == 'cc') {
            // check if we also have to remove the second level, only if 3 or more
            //  levels and the first_level was a country code
            if (TLDs[v[v.length - 2]]) {
              v[v.length - 2] = null;
            }
          }

          // remove the nulls
          v = v.filter(function (n) {
            return n !== null;
          });

          // let's go to remove locales from the beginning, only if at least 2 or
          // more levels remaining and if the first_level was not a country code
          if (v.length > 1 && first_level != 'cc') {

            // cover the case de.wikipedia.org
            if (TLDs[v[0]] == 'cc' || v[0] == 'en') {
              v[0] = null;
            } else {
              // cover the case de-de.facebook.com
              var w = v[0].split('-');
              if (w.length == 2 && (TLDs[w[0]] == 'cc' || w[0] == 'en') && (TLDs[w[1]] == 'cc' || w[1] == 'en')) {
                v[0] = null;
              }
            }
          }

          // remove the nulls and join
          return v.filter(function (n) {
            return n !== null;
          }).join('.');
        },

        _filterTLDsInPath: function _filterTLDsInPath(path) {

          var v = path.toLowerCase().split('/');

          // it should have at least 2, "/".split('/') => ['', '']

          // we only consider the top level element in the path
          if (v.length > 1) {
            if (TLDs[v[1]] == 'cc') {
              v[1] = null;
            } else {
              var w = v[1].split('-');
              if (w.length == 2 && (TLDs[w[0]] == 'cc' || w[0] == 'en') && (TLDs[w[1]] == 'cc' || w[1] == 'en')) {
                v[1] = null;
              }
            }
          }

          // remove the nulls and join

          var clean_v = v.filter(function (n) {
            return n !== null;
          });

          var new_path = '/';

          if (clean_v.length > 1) {
            new_path = v.filter(function (n) {
              return n !== null;
            }).join('/');
          } else {
            // special case when clean_v has only one element, it will not join the
            // initial slash
            new_path = '/' + v.filter(function (n) {
              return n !== null;
            }).join('/');
          }

          new_path = new_path.replace('//', '/');

          return new_path;
        },

        _extractKeys: function _extractKeys(url, title) {
          var clean_url = url.toLowerCase().replace(/^http[s]*:\/\//, '').replace(/^www\./, '');
          var v = clean_url.split('/');
          var domain = v[0];
          var path = '/';

          if (v.length > 1) {
            // remove the query string
            v[v.length - 1] = v[v.length - 1].split('?')[0];

            if (v[1] == '#') {
              // the path starts with # which is used for internal routing,
              // remove for keys
              // http://klout.com/#/solso == http://klout.com/solso
              if (v.length > 2) path = '/' + v.splice(2, v.length - 1).join('/');
            } else path = '/' + v.splice(1, v.length - 1).join('/');
          }

          domain = UrlCompare._filterTLDs(domain);
          path = UrlCompare._filterTLDsInPath(path);

          // if no title or empty, generate a random key.
          // This is a fail-safe mechanism
          if (title === undefined || title === null || title.trim() === '') {
            title = '' + Math.random();
          }

          // remove debug info from title on the de-duplication, so that we have
          // consistent behaviour.
          // the debug info is anything that has ( foo bar )! end of line
          title = title.replace(/\(.*\)!$/, '').trim();

          return [domain, domain + path, domain + title];
        }
      };

      _export('default', UrlCompare);
    }
  };
});
System.register("autocomplete/wikipedia-deduplication", ["core/cliqz", "platform/language"], function (_export) {
    /**
     * This modules implements reranking of results using user specific data
     */
    "use strict";

    var utils, language, CliqzWikipediaDeduplication;
    return {
        setters: [function (_coreCliqz) {
            utils = _coreCliqz.utils;
        }, function (_platformLanguage) {
            language = _platformLanguage["default"];
        }],
        execute: function () {
            CliqzWikipediaDeduplication = {
                LOG_KEY: 'CliqzWikipediaDeduplication',
                name: 'lang_deduplication',

                /* choose best url from list based on original order (reranking)*/
                chooseUrlByIndex: function chooseUrlByIndex(searchedUrls, originalUrls) {
                    var maxPos = originalUrls.length;
                    var bestUrl = null;
                    Object.keys(searchedUrls).forEach(function (lang) {
                        var urls = searchedUrls[lang];
                        urls.forEach(function (url) {
                            var i = originalUrls.indexOf(url);
                            if (i < maxPos) {
                                maxPos = i;
                                bestUrl = url;
                            }
                        });
                    });
                    return bestUrl;
                },
                /* choose best url from list taking language into account */
                chooseUrlByLang: function chooseUrlByLang(searchedUrls, originalUrls, requestedLangs) {
                    if (requestedLangs == null || requestedLangs.length == 0) {
                        return this.chooseUrlByIndex(searchedUrls, originalUrls);
                    }
                    var maxPos = originalUrls.length;
                    var bestUrl = null;
                    Object.keys(searchedUrls).forEach(function (lang) {
                        var urls = searchedUrls[lang];
                        urls.forEach(function (url) {
                            var i = originalUrls.indexOf(url);
                            if (i < maxPos && requestedLangs.indexOf(lang) != -1) {
                                maxPos = i;
                                bestUrl = url;
                            }
                        });
                    });
                    if (bestUrl == null) {
                        bestUrl = this.chooseUrlByIndex(searchedUrls, originalUrls);
                    }
                    return bestUrl;
                },
                /*strip protocol from url*/
                urlStripProtocol: function urlStripProtocol(url) {
                    var toRemove = ["https://", "http://", "www2.", "www.", "mobile.", "mobil.", "m."];
                    toRemove.forEach(function (part) {
                        if (url.toLowerCase().startsWith(part)) {
                            url = url.substring(part.length);
                        }
                    });
                    return url;
                },
                /*get most used user languages*/
                getUserLanguages: function getUserLanguages(factor) {
                    factor = typeof factor !== 'undefined' ? factor : 1.5;
                    var availableLangs = language.state(true);
                    var langs = [];
                    var lastValue = null;
                    availableLangs.forEach(function (langObj) {
                        // langObj = ["de", 0.0123]
                        if (lastValue == null) lastValue = langObj[1];
                        if (lastValue * factor >= langObj[1]) {
                            langs.push(langObj[0]);
                            lastValue = langObj[1];
                        }
                    });
                    return langs;
                },
                // dedup of languages for wikipedia case
                doRerank: function doRerank(response) {
                    //reset telemetry
                    var telemetrySignal = {};
                    var doDedup = CliqzUtils.getPref("languageDedup", false);
                    if (doDedup && response != null) {

                        var userLangs = this.getUserLanguages();

                        // dict of wiki languages to urls
                        var wikiLangs = {};

                        // list of all wiki urls
                        var wikiUrls = [];

                        // list of candidates to dedup with back link to original url
                        // {"de.wikipedia.org/url": "Https://de.wikipedia.org/URL"}
                        var candidates = {};

                        // list of all urls in response
                        var allUrls = [];

                        // dedup result
                        var dedups = {};

                        // process response and fill all structures
                        response.forEach(function (r) {
                            var obj = CliqzUtils.getDetailsFromUrl(r.url);
                            if (obj.domain == "wikipedia.org" && obj.subdomains.length) {
                                var lang = obj.subdomains[0];
                                if (wikiLangs[lang] == null) wikiLangs[lang] = [];
                                wikiLangs[lang].push(r.url);
                                candidates[this.urlStripProtocol(r.url).toLowerCase()] = r.url;
                                wikiUrls.push(r.url);
                                dedups[r.url] = [];
                            }
                            allUrls.push(r.url);
                        }, this);
                        telemetrySignal['available_languages'] = Object.keys(wikiLangs).length;
                        if (Object.keys(wikiLangs).length > 1) {
                            // we have wikipedia with different langs, try possible dedup
                            var bestUrl = this.chooseUrlByLang(wikiLangs, allUrls, userLangs);

                            var ind = allUrls.indexOf(bestUrl);
                            var bestUrlData = response[ind];
                            var langlinks = [];
                            try {
                                langlinks = bestUrlData.snippet.rich_data.langlinks;
                            } catch (e) {}
                            langlinks.forEach(function (langlink) {
                                var stripUrl = this.urlStripProtocol(langlink).toLowerCase();
                                var stripLang = stripUrl.split(".")[0];
                                if (stripUrl in candidates && userLangs.indexOf(stripLang) == -1) {
                                    var originalUrl = candidates[stripUrl];
                                    dedups[bestUrl].push(originalUrl);
                                    dedups[bestUrl].concat(dedups[originalUrl]);
                                    delete dedups[originalUrl];
                                }
                            }, this);
                            var deduped = wikiUrls.length - Object.keys(dedups).length;
                            telemetrySignal['total_urls'] = wikiUrls.length;
                            telemetrySignal['removed_urls'] = deduped;

                            if (deduped > 0) {
                                // backward structure with link where deduped url is pointing
                                var invertedUrls = {};
                                Object.keys(dedups).forEach(function (k) {
                                    dedups[k].forEach(function (url) {
                                        invertedUrls[url] = k;
                                    });
                                });
                                var dedupResponse = [];
                                for (var i = 0; i < response.length; i++) {
                                    var responseObj = response[i];
                                    if (responseObj.url in invertedUrls) {
                                        // this url should be replaced by main url
                                        var mainInd = allUrls.indexOf(invertedUrls[responseObj.url]);
                                        if (mainInd != -1) {
                                            var mainObj = response[mainInd];
                                            dedupResponse.push(mainObj);
                                            delete allUrls[mainInd];
                                        }
                                    } else {
                                        var maybeDeleted = allUrls.indexOf(responseObj.url);
                                        if (maybeDeleted != -1) {
                                            dedupResponse.push(responseObj);
                                            delete allUrls[i];
                                        }
                                    }
                                }

                                response = dedupResponse;
                            }
                        }
                    }
                    // if no dedups found
                    return {
                        telemetrySignal: telemetrySignal,
                        response: response
                    };
                }

            };

            _export("default", CliqzWikipediaDeduplication);
        }
    };
});
System.register("autocomplete/window", ["autocomplete/autocomplete", "autocomplete/result-providers", "core/cliqz"], function (_export) {
  "use strict";

  var autocomplete, CliqzResultProviders, utils, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_autocompleteAutocomplete) {
      autocomplete = _autocompleteAutocomplete["default"];
    }, function (_autocompleteResultProviders) {
      CliqzResultProviders = _autocompleteResultProviders["default"];
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _default = (function () {
        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        _createClass(_default, [{
          key: "init",
          value: function init() {
            this.window.CliqzAutocomplete = autocomplete;
          }
        }, {
          key: "unload",
          value: function unload() {
            delete this.window.CliqzAutocomplete;
          }
        }, {
          key: "createButtonItem",
          value: function createButtonItem() {
            if (utils.getPref("cliqz_core_disabled", false)) return;

            var doc = this.window.document,
                menu = doc.createElement('menu'),
                menupopup = doc.createElement('menupopup'),
                engines = CliqzResultProviders.getSearchEngines(),
                def = Services.search.currentEngine.name;

            menu.setAttribute('label', utils.getLocalizedString('btnDefaultSearchEngine'));

            for (var i in engines) {

              var engine = engines[i],
                  item = doc.createElement('menuitem');
              item.setAttribute('label', '[' + engine.prefix + '] ' + engine.name);
              item.setAttribute('class', 'menuitem-iconic');
              item.engineName = engine.name;
              if (engine.name == def) {
                item.style.listStyleImage = 'url(' + utils.SKIN_PATH + 'checkmark.png)';
              }
              // TODO: Where is this listener removed?
              item.addEventListener('command', (function (event) {
                CliqzResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
                utils.telemetry({
                  type: 'activity',
                  action: 'cliqz_menu_button',
                  button_name: 'search_engine_change_' + event.currentTarget.engineName
                });
              }).bind(this), false);

              menupopup.appendChild(item);
            }

            menu.appendChild(menupopup);

            return menu;
          }
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});

        System.register('mobile-ui/logo-db', [], function (_exports) {
          var db =
      
{"_version":1473867650984,"domains":{"337":[{"r":"$","b":"333333"}],"uhrcenter":[{"r":"$","b":"8c275f"}],"bosch-home":[{"r":"$","l":1,"b":"d7011d"}],"digitaltrends":[{"r":"$","b":"4592d8"}],"miele":[{"r":"$","l":1,"b":"d7011d"}],"elektrofahrrad-einfach":[{"r":"$","b":"ff951d"}],"dell":[{"r":"$","l":1,"b":"4592d8"}],"rtve":[{"r":"$","b":"ff951d"}],"stepashka":[{"r":"$","b":"ff951d"}],"erdbeerlounge":[{"r":"$","l":1,"b":"d7011d"}],"viooz":[{"r":"$","b":"c3043e"}],"secondlife":[{"r":"$","b":"50b1a2"}],"rent":[{"r":"$","b":"2fc4fc"}],"broker-test":[{"r":"$","b":"f97136"}],"jailbreak-mag":[{"r":"$","b":"328c67"}],"stadtsparkasse-oberhausen":[{"r":"$","l":1,"b":"f9204c"}],"trainer":[{"r":"$","b":"7bebf5"}],"usenet":[{"r":"$","b":"5267a2"}],"fossil":[{"r":"$","b":"ffc802"}],"easybill":[{"r":"$","b":"5267a2"}],"sparda-west":[{"r":"$","l":1,"b":"1747a6"}],"hochschulstart":[{"r":"$","b":"5267a2"}],"casamundo":[{"r":"$","l":1,"b":"073673"}],"wolf-garten":[{"r":"$","b":"d7011d"}],"unio":[{"r":"$","b":"07613c"}],"ostseewelle":[{"r":"$","l":1,"b":"d7011d"}],"stern":[{"r":"$","l":1,"b":"d7011d"}],"wdr2":[{"r":"$","b":"073673"}],"vol":[{"r":"$","l":1,"b":"ffc802"}],"telegraph":[{"r":"$.co.uk","l":1,"b":"333333"},{"r":"$","l":1,"b":"333333"}],"ddl-warez":[{"r":"$","b":"4592d8"}],"sparkasse-karlsruhe":[{"r":"$","l":1,"b":"f9204c"}],"yahoo":[{"r":"$","l":1,"b":"530773"}],"studenten-wg":[{"r":"$","b":"073673"}],"firstrowsports":[{"r":"$","b":"f97136"}],"tripado":[{"r":"$","l":1,"b":"ff951d"}],"rexbo":[{"r":"$","b":"9077e3"}],"grosseleute":[{"r":"$","b":"92dba4"}],"tas-kl":[{"r":"$","l":1,"b":"506bb8"}],"lifehack":[{"r":"$","b":"1747a6"}],"hoerzu":[{"r":"$","l":1,"b":"d7011d"}],"tu-berlin":[{"r":"$","l":1,"b":"d7011d"}],"zooplus":[{"r":"$","l":1,"b":"328c67"}],"speedportip":[{"r":"$","b":"e24b2c"}],"hof":[{"r":"$","b":"c78e6d"}],"nonstopnews":[{"r":"$","b":"fce951"}],"hoc":[{"r":"$","b":"abc8e2"}],"hannover-zeitung":[{"r":"$","l":1,"b":"e24b2c"}],"toysrus":[{"r":"$","l":1,"b":"5267a2"}],"southpark":[{"r":"$","l":1,"b":"333333"}],"hop":[{"r":"$","b":"4592d8"}],"audi":[{"r":"$","l":1,"b":"333333"}],"bazoocam":[{"r":"$","l":1,"b":"1747a6"}],"wolfram":[{"r":"$","b":"e24b2c"}],"mueller":[{"r":"$","l":1,"b":"f97136"}],"kinderspiele":[{"r":"$","b":"07613c"}],"steuertipps":[{"r":"$","b":"fede07"}],"recht":[{"r":"$","b":"abc8e2"}],"leboncoin":[{"r":"$","l":1,"b":"f97136"}],"pc-magazin":[{"r":"$","b":"e24b2c"}],"tropical-islands":[{"r":"$","b":"fede07"}],"antivir":[{"r":"$","b":"d7011d"}],"azvogelzucht":[{"r":"$","b":"e24b2c"}],"autoplus":[{"r":"$","b":"c3043e"}],"barclays":[{"r":"$.co.uk","l":1,"b":"2fc4fc"},{"r":"$","l":1,"b":"2fc4fc"}],"winfuture":[{"r":"$","l":1,"b":"d7011d"}],"lesara":[{"r":"$","b":"50b1a2"}],"fit":[{"r":"$","b":"fede07"}],"cyanogenmod":[{"r":"$","b":"006567"}],"fnweb":[{"r":"$","b":"d7011d"}],"slate":[{"r":"$","l":1,"b":"8c275f"}],"paleo360":[{"r":"$","b":"333333"}],"th-nuernberg":[{"r":"$","l":1,"b":"073673"}],"hockeyweb":[{"r":"$","b":"073673"}],"telekom":[{"r":"fcbayern.$","l":1,"b":"d7011d"},{"r":"$","l":1,"b":"f8458f"}],"witz-des-tages":[{"r":"$","b":"0b47bf"}],"mdm":[{"r":"$","b":"5267a2"}],"psd-bank":[{"r":"$","b":"328c67"}],"xhamster-porn":[{"r":"$","l":1,"b":"f97136"}],"mdr":[{"r":"$","l":1,"b":"1747a6"}],"rt":[{"r":"$","l":1,"b":"91d131"}],"golem":[{"r":"$","l":1,"b":"07613c"}],"rr":[{"r":"$","b":"333333"}],"woxikon":[{"r":"$","l":1,"b":"c78e6d"}],"dge":[{"r":"$","b":"073673"}],"ksk-koeln":[{"r":"$","b":"e24b2c"}],"smh":[{"r":"$","b":"4592d8"}],"rabatt":[{"r":"$","b":"328c67"}],"strato":[{"r":"$","l":1,"b":"ff951d"}],"das-neue-bafoeg":[{"r":"$","b":"c3043e"}],"zdnet":[{"r":"$","l":1,"b":"073673"}],"ate":[{"r":"$","b":"073673"}],"ato":[{"r":"$","b":"5267a2"}],"baby-vornamen":[{"r":"$","b":"9077e3"}],"atv":[{"r":"$","b":"f97136"}],"att":[{"r":"$","l":1,"b":"4592d8"}],"atu":[{"r":"$","l":1,"b":"d7011d"}],"hostels":[{"r":"$","b":"1747a6"}],"kfw":[{"r":"$","b":"073673"}],"nordsee-zeitung":[{"r":"$","l":1,"b":"1747a6"}],"basketball":[{"r":"$","b":"c78e6d"}],"lego":[{"r":"$","l":1,"b":"d7011d"}],"gma-group":[{"r":"$","l":1,"b":"4592d8"}],"klamm":[{"r":"$","b":"ff951d"}],"fernsehserien":[{"r":"$","b":"ffc802"}],"msc-kreuzfahrten":[{"r":"$","b":"073673"}],"sparkasse-moenchengladbach":[{"r":"$","l":1,"b":"f9204c"}],"coursera":[{"r":"$.org","l":1,"b":"4592d8"},{"r":"$","l":1,"b":"4592d8"}],"pm-magazin":[{"r":"$","b":"e24b2c"}],"paket":[{"r":"$","l":1,"b":"ffc802"}],"channel4":[{"r":"$","l":1,"b":"666666"}],"lerntippsammlung":[{"r":"$","b":"07613c"}],"hays":[{"r":"$","b":"073673"}],"nzz":[{"r":"$","l":1,"b":"333333"}],"ogame":[{"r":"$","b":"073673"}],"e39-forum":[{"r":"$","b":"abc8e2"}],"boston":[{"r":"$","l":1,"b":"d7011d"}],"hostlogr":[{"r":"$","b":"073673"}],"pudelek":[{"r":"$","b":"fb91ae"}],"fotoparadies":[{"r":"$","b":"073673"}],"cam4":[{"r":"$","b":"e24b2c"}],"kaercher":[{"r":"$","b":"fce951"}],"kabeleins":[{"r":"$","l":1,"b":"f97136"}],"nh-hotels":[{"r":"$","b":"333333"}],"netlog":[{"r":"$","l":1,"b":"f97136"}],"swiss":[{"r":"$","b":"666666"}],"icloud":[{"r":"$","l":1,"b":"999999"}],"sprachnudel":[{"r":"$","b":"91d131"}],"huk":[{"r":"$","l":1,"b":"ffc802"}],"upenn":[{"r":"$","l":1,"b":"073673"}],"arlt":[{"r":"$","b":"d7011d"}],"minecraft-server":[{"r":"$","b":"d8ee46"}],"silber":[{"r":"$","b":"f36e8d"}],"bosch-pt":[{"r":"$","l":1,"b":"d7011d"}],"g2a":[{"r":"$","b":"ff951d"}],"dwdl":[{"r":"$","b":"328c67"}],"meldebox":[{"r":"$","b":"f97136"}],"vertbaudet":[{"r":"$","b":"91d131"}],"honda":[{"r":"$","l":1,"b":"d7011d"}],"dreamies":[{"r":"$","b":"abc8e2"}],"financescout24":[{"r":"$","b":"073673"}],"rebuy":[{"r":"$","l":1,"b":"5267a2"}],"netto-online":[{"r":"$","l":1,"b":"fede07"}],"cornelsen":[{"r":"$","b":"d7011d"}],"metrogroup":[{"r":"$","l":1,"b":"ffc802"}],"truckscout24":[{"r":"$","b":"073673"}],"mmoga":[{"r":"$","l":1,"b":"333333"}],"vbg":[{"r":"$","l":1,"b":"1747a6"}],"news":[{"r":"$.stv.tv","l":1,"b":"1747a6"},{"r":"$","b":"333333"}],"hammer":[{"r":"$","b":"d7011d"}],"sparkasse-koelnbonn":[{"r":"$","l":1,"b":"f9204c"}],"wikipedia":[{"r":"$","l":1,"b":"999999"}],"metin2":[{"r":"$","b":"fce951"}],"sixx":[{"r":"$","b":"d8ee46"}],"men":[{"r":"$","b":"c78e6d"}],"nature":[{"r":"$","l":1,"b":"d7011d"}],"einfachporno":[{"r":"$","l":1,"b":"d248ca"}],"roller":[{"r":"$","l":1,"b":"d7011d"}],"drei":[{"r":"$","l":1,"b":"333333"}],"oki":[{"r":"$","b":"07613c"}],"ligtv":[{"r":"$","b":"d7011d"}],"radioeins":[{"r":"$","l":1,"b":"f97136"}],"and":[{"r":"$","b":"d7011d"}],"groupon":[{"r":"$","l":1,"b":"91d131"}],"canyon":[{"r":"$","b":"ff951d"}],"radioton":[{"r":"$","l":1,"b":"d7011d"}],"cbslocal":[{"r":"$","l":1,"b":"333333"}],"vrbank-mkb":[{"r":"$","b":"5267a2"}],"tinybuddha":[{"r":"$","l":1,"b":"2fc4fc"}],"west":[{"r":"$","b":"1747a6"}],"boc24":[{"r":"$","b":"328c67"}],"fxnetworks":[{"r":"$","b":"333333"}],"tunein":[{"r":"$","l":1,"b":"f97136"}],"extraenergie":[{"r":"$","b":"f97136"}],"spin":[{"r":"$.de","l":1,"b":"5267a2"},{"r":"$","l":1,"b":"d7011d"}],"op-marburg":[{"r":"$","l":1,"b":"2fc4fc"}],"fidor":[{"r":"$","l":1,"b":"91d131"}],"finya":[{"r":"$","l":1,"b":"4592d8"}],"nolte-kuechen":[{"r":"$","b":"fce951"}],"heidelberg":[{"r":"$","b":"d7011d"}],"pferd-aktuell":[{"r":"$","b":"328c67"}],"koha":[{"r":"$","l":1,"b":"d7011d"}],"az-online":[{"r":"$","b":"333333"}],"thalia":[{"r":"$","l":1,"b":"74d463"}],"klicktel":[{"r":"$","b":"073673"}],"dhm":[{"r":"$","b":"666666"}],"dhl":[{"r":"$","l":1,"b":"ffc802"}],"paysafecard":[{"r":"$","b":"4592d8"}],"fotor":[{"r":"$","b":"ffc802"}],"donnerwetter":[{"r":"$","b":"abc8e2"}],"rp-online":[{"r":"$","l":1,"b":"ffc802"}],"craigslist":[{"r":"$.org","l":1,"b":"530773"},{"r":"$","l":1,"b":"530773"}],"atresplayer":[{"r":"$","b":"4592d8"}],"dhv":[{"r":"$","l":1,"b":"073673"}],"dhs":[{"r":"$","b":"073673"}],"xvideos":[{"r":"$","l":1,"b":"333333"}],"ameropa":[{"r":"$","b":"073673"}],"tune":[{"r":"$","b":"5267a2"}],"fcbarcelona":[{"r":"$","b":"ffc802"}],"rsa-radio":[{"r":"$","l":1}],"jedipedia":[{"r":"$","l":1,"b":"fede07"}],"rtlnitronow":[{"r":"$","b":"073673"}],"tomorrowland":[{"r":"$","b":"8c275f"}],"almountakhab":[{"r":"$","b":"e24b2c"}],"kochbar":[{"r":"$","l":1,"b":"92dba4"}],"journaldugeek":[{"r":"$","b":"8c275f"}],"billiger":[{"r":"$","b":"9077e3"}],"hat":[{"r":"$","b":"07613c"}],"mileycyrus":[{"r":"$","b":"c78e6d"}],"bitreactor":[{"r":"$","b":"073673"}],"x-filme":[{"r":"$","l":1,"b":"333333"}],"gigajob":[{"r":"$","b":"1747a6"}],"omnibussimulator":[{"r":"$","b":"c78e6d"}],"tvspielfilm":[{"r":"$","l":1,"b":"073673"}],"battlefield":[{"r":"$","l":1,"b":"333333"}],"olb":[{"r":"$","l":1,"b":"07613c"}],"people":[{"r":"$","l":1,"b":"43bdd9"}],"zimbio":[{"r":"$","b":"429abd"}],"zala":[{"r":"$","l":1,"b":"d7011d"}],"raiffeisen":[{"r":"$","l":1,"b":"e92207"}],"billboard":[{"r":"$","b":"fce951"}],"fos":[{"r":"$","b":"ff951d"}],"tu-chemnitz":[{"r":"$","l":1,"b":"07613c"}],"fox":[{"r":"$","b":"e24b2c"}],"viadeo":[{"r":"$","b":"f97136"}],"westfalia":[{"r":"$","b":"eaeaea"}],"psychologies":[{"r":"$","b":"d7011d"}],"fom":[{"r":"$","b":"328c67"}],"lastfm":[{"r":"$","l":1,"b":"d7011d"}],"arbeiten":[{"r":"$","b":"073673"}],"albeu":[{"r":"$","l":1,"b":"d7011d"}],"globetrotter":[{"r":"$","l":1,"b":"ff951d"}],"joomla":[{"r":"$","b":"5267a2"}],"wirkaufens":[{"r":"$","b":"4592d8"}],"sol":[{"r":"$","b":"5267a2"}],"pferde":[{"r":"$","b":"91d131"}],"mamba":[{"r":"$","l":1,"b":"ff951d"}],"halle":[{"r":"$","b":"333333"}],"wordpress":[{"r":"$","l":1,"b":"429abd"}],"shirtinator":[{"r":"$","b":"333333"}],"pollin":[{"r":"$","l":1,"b":"d7011d"}],"lifenews":[{"r":"$","b":"d7011d"}],"thesaurus":[{"r":"$","l":1,"b":"ff951d"}],"abacho":[{"r":"$","l":1,"b":"530773"}],"verdi":[{"r":"$","l":1,"b":"c3043e"}],"kohls":[{"r":"$.com","l":1,"b":"333333"},{"r":"$","l":1,"b":"333333"}],"shopware":[{"r":"$","b":"4592d8"}],"aeriagames":[{"r":"$","l":1,"b":"4592d8"}],"onmeda":[{"r":"$","l":1,"b":"429abd"}],"calciomercato":[{"r":"$","b":"07613c"}],"spieleass":[{"r":"$","b":"2fc4fc"}],"marburg":[{"r":"$","b":"333333"}],"youjizzdeutsch":[{"r":"$","b":"530773"}],"playboy":[{"r":"$","l":1,"b":"333333"}],"slideshare":[{"r":"$","b":"50b1a2"}],"poster":[{"r":"$","b":"4592d8"}],"livefoot":[{"r":"$","b":"8c275f"}],"alobilethatti":[{"r":"$","b":"d7011d"}],"swtor":[{"r":"$","b":"d7011d"}],"stoffundstil":[{"r":"$","b":"c78e6d"}],"deutschlandcard":[{"r":"$","b":"8c275f"}],"g-star":[{"r":"$","l":1,"b":"333333"}],"educom-group":[{"r":"$","b":"c78e6d"}],"jochen-schweizer":[{"r":"$","b":"333333"}],"kuenstlersozialkasse":[{"r":"$","l":1,"b":"d7011d"}],"newyorker":[{"r":"$.com","l":1,"b":"333333"},{"r":"$","l":1,"b":"d7011d"}],"blackhatworld":[{"r":"$","b":"07613c"}],"kurier":[{"r":"$","l":1,"b":"d7011d"}],"dastelefonbuch":[{"r":"$","l":1,"b":"d7011d"}],"planet-wissen":[{"r":"$","b":"8c275f"}],"ted":[{"r":"$","l":1,"b":"f9204c"}],"time":[{"r":"$","l":1,"b":"d7011d"}],"street-one":[{"r":"$","b":"d7011d"}],"euronews":[{"r":"$","l":1,"b":"333333"}],"hunkemoller":[{"r":"$","l":1,"b":"333333"}],"selbst":[{"r":"$","b":"fce951"}],"kreissparkasse-ravensburg":[{"r":"$","l":1,"b":"f9204c"}],"rbb-online":[{"r":"$","l":1,"b":"c3043e"}],"freelance":[{"r":"$","b":"74d463"}],"sanicare":[{"r":"$","b":"abc8e2"}],"ninite":[{"r":"$","b":"4592d8"}],"absolventa":[{"r":"$","b":"006567"}],"pokewiki":[{"r":"$","l":1,"b":"5ea3f9"}],"unserding":[{"r":"$","l":1,"b":"ff951d"}],"wandtattoo-home":[{"r":"$","b":"333333"}],"sparkasse-mol":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-mainz":[{"r":"$","l":1,"b":"f9204c"}],"gamespot":[{"r":"$","b":"ff951d"}],"jappy":[{"r":"$","l":1,"b":"ffc802"}],"medizinfuchs":[{"r":"$","b":"f97136"}],"sip-scootershop":[{"r":"$","b":"e24b2c"}],"szene-streams":[{"r":"$","b":"abc8e2"}],"address":[{"r":"$","b":"abc8e2"}],"stellenmarkt":[{"r":"$","b":"073673"}],"spartoo":[{"r":"$","b":"c3043e"}],"fakt":[{"r":"$","b":"e24b2c"}],"dueren":[{"r":"$","b":"d7011d"}],"bundeswehr":[{"r":"$","b":"073673"}],"photobucket":[{"r":"$","l":1,"b":"5267a2"}],"tuev-nord":[{"r":"$","b":"1747a6"}],"volksstimme":[{"r":"$","b":"429abd"}],"lexoffice":[{"r":"$","b":"91d131"}],"gutscheinrausch":[{"r":"$","b":"1747a6"}],"michaeljackson":[{"r":"$","b":"d7011d"}],"sparkasse-aurich-norden":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-ffb":[{"r":"$","l":1,"b":"f9204c"}],"spox":[{"r":"$","l":1,"b":"c3043e"}],"lidl":[{"r":"$","l":1,"b":"fede07"}],"swoodoo":[{"r":"$","l":1,"b":"1747a6"}],"m6replay":[{"r":"$","b":"5267a2"}],"1822direkt":[{"r":"$","l":1,"b":"073673"}],"data":[{"r":"$","b":"5ea3f9"}],"epost":[{"r":"$","b":"ffc802"}],"residentadvisor":[{"r":"$","b":"333333"}],"st":[{"r":"$.nu","l":1,"b":"5ea3f9"},{"r":"$","l":1,"b":"5267a2"}],"mamikreisel":[{"r":"$","l":1,"b":"429abd"}],"mango":[{"r":"$","l":1,"b":"333333"}],"wallstreetjournal":[{"r":"$","l":1,"b":"333333"}],"freiepresse":[{"r":"$","b":"4592d8"}],"ninjakiwi":[{"r":"$","b":"d7011d"}],"uni-goettingen":[{"r":"$","l":1,"b":"1747a6"}],"hagebau":[{"r":"$","l":1,"b":"d7011d"}],"hoh":[{"r":"$","b":"c78e6d"}],"festlichekleideronline":[{"r":"$","b":"c78e6d"}],"avis":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-hamm":[{"r":"$","l":1,"b":"f9204c"}],"odnoklassniki":[{"r":"$","b":"ff951d"}],"duckduckgo":[{"r":"$","l":1,"b":"ff5349"}],"travelbird":[{"r":"$","b":"429abd"}],"katproxy":[{"r":"$","b":"07613c"}],"hl-live":[{"r":"$","b":"1747a6"}],"resellerratings":[{"r":"$","b":"ff951d"}],"jungewelt":[{"r":"$","b":"e24b2c"}],"frontlineshop":[{"r":"$","b":"333333"}],"roche":[{"r":"$","l":1,"b":"1747a6"}],"ego4u":[{"r":"$","b":"333333"}],"bundesliga":[{"r":"$","l":1,"b":"d7011d"}],"ble":[{"r":"$","b":"92dba4"}],"massa-haus":[{"r":"$","b":"c78e6d"}],"zentrada":[{"r":"$","b":"fce951"}],"blazingstar":[{"r":"$","b":"e24b2c"}],"ddizi":[{"r":"$","b":"8a52a2"}],"boersennews":[{"r":"$","b":"92dba4"}],"mobildiscounter":[{"r":"$","b":"91d131"}],"avira":[{"r":"$","l":1,"b":"d7011d"}],"karstadt":[{"r":"$","l":1,"b":"073673"}],"onk":[{"r":"$","b":"fce951"}],"handytarife":[{"r":"$","b":"5267a2"}],"solvusoft":[{"r":"$","b":"abc8e2"}],"one":[{"r":"$.de","l":1,"b":"333333"},{"r":"$.org","l":1,"b":"333333"},{"r":"$","l":1,"b":"91d131"}],"dierotenbullen":[{"r":"$","l":1,"b":"f9204c"}],"moebel-mahler":[{"r":"$","b":"d7011d"}],"open":[{"r":"$","b":"abc8e2"}],"opel":[{"r":"$","l":1,"b":"fede07"}],"travanto":[{"r":"$","b":"4592d8"}],"santander":[{"r":"$.co.uk","l":1,"b":"e92207"},{"r":"$","l":1,"b":"e92207"}],"centerparcs":[{"r":"$","b":"07613c"}],"sparkasse-leerwittmund":[{"r":"$","l":1,"b":"f9204c"}],"ibtimes":[{"r":"$","b":"333333"}],"sparkasse-emh":[{"r":"$","l":1,"b":"f9204c"}],"reifen":[{"r":"$","b":"c3043e"}],"volksbank-jever":[{"r":"$","l":1,"b":"1747a6"}],"bbradio":[{"r":"$","l":1,"b":"d7011d"}],"kern-sohn":[{"r":"$","b":"abc8e2"}],"bauer":[{"r":"$","l":1,"b":"073673"}],"travelscout24":[{"r":"$","b":"073673"}],"fewo-direkt":[{"r":"$","b":"7bebf5"}],"tagesspiegel":[{"r":"$","l":1,"b":"c3043e"}],"sag":[{"r":"$","b":"abc8e2"}],"pubmed":[{"r":"$","b":"4592d8"}],"sport":[{"r":"$","l":1,"b":"006567"}],"cam4s":[{"r":"$","l":1,"b":"f97136"}],"mynet":[{"r":"$","l":1,"b":"c3043e"}],"innogames":[{"r":"$","b":"07613c"}],"sparkasse-soest":[{"r":"$","l":1,"b":"f9204c"}],"gdata":[{"r":"$","l":1,"b":"d7011d"}],"netflix":[{"r":"$","l":1,"b":"d7011d"}],"abus":[{"r":"$","l":1,"b":"d7011d"}],"buffed":[{"r":"$","b":"073673"}],"willhaben":[{"r":"$","l":1,"b":"4592d8"}],"axa":[{"r":"$","b":"073673"}],"rockstargames":[{"r":"$","l":1,"b":"ff951d"}],"boerse-frankfurt":[{"r":"$","b":"c78e6d"}],"yellostrom":[{"r":"$","l":1,"b":"fede07"}],"nw-news":[{"r":"$","b":"d7011d"}],"cpasbien":[{"r":"$","b":"fb91ae"}],"autohaus24":[{"r":"$","b":"f97136"}],"liberation":[{"r":"$","b":"d7011d"}],"itwissen":[{"r":"$","b":"073673"}],"stream2watch":[{"r":"$","b":"fb91ae"}],"westernunion":[{"r":"$","b":"fede07"}],"xhamsterdeutsch":[{"r":"$","l":1,"b":"f97136"}],"fertighaus":[{"r":"$","b":"74d463"}],"autoscout24":[{"r":"$","l":1,"b":"f97136"}],"clans":[{"r":"$","b":"ff951d"}],"helios-kliniken":[{"r":"$","b":"333333"}],"polo-motorrad":[{"r":"$","b":"d7011d"}],"mytoys":[{"r":"$","l":1,"b":"fede07"}],"weibo":[{"r":"$","b":"d7011d"}],"googlewatchblog":[{"r":"$","b":"999999"}],"p-jentschura":[{"r":"$","l":1,"b":"d7011d"}],"taufspruch":[{"r":"$","b":"8a52a2"}],"aljazeera":[{"r":"$","l":1,"b":"ffc802"}],"lifeline":[{"r":"$","b":"1747a6"}],"adac-postbus":[{"r":"$","l":1,"b":"ffc802"}],"iconarchive":[{"r":"$","b":"ffc802"}],"baden":[{"r":"$","l":1,"b":"d7011d"}],"bader":[{"r":"$","b":"ffc802"}],"myp2p-pe":[{"r":"$","b":"4592d8"}],"worldstarhiphop":[{"r":"$","b":"333333"}],"collider":[{"r":"$","b":"328c67"}],"sozcu":[{"r":"$","b":"d7011d"}],"sparkasse-bottrop":[{"r":"$","l":1,"b":"f9204c"}],"theguardian":[{"r":"$","l":1,"b":"1747a6"}],"angel-domaene":[{"r":"$","b":"07613c"}],"reebok":[{"r":"$","l":1,"b":"d7011d"}],"lehrer-online":[{"r":"$","l":1,"b":"1747a6"}],"creditreform":[{"r":"$","b":"4592d8"}],"ryanair":[{"r":"$","l":1,"b":"073673"}],"xxxlshop":[{"r":"$","l":1,"b":"d7011d"}],"simplytel":[{"r":"$","b":"5ea3f9"}],"trello":[{"r":"$","b":"5267a2"}],"kostenlos":[{"r":"$","b":"328c67"}],"jobrapido":[{"r":"$","l":1,"b":"5ea3f9"}],"canon":[{"r":"$","b":"d7011d"}],"stadtplandienst":[{"r":"$","b":"ffc802"}],"lieferanten":[{"r":"$","b":"4592d8"}],"xnxx":[{"r":"$.org","l":1,"b":"1747a6"},{"r":"$.at","l":1,"b":"1747a6"},{"r":"$","l":1,"b":"1747a6"}],"maschinensucher":[{"r":"$","b":"4592d8"}],"stromio":[{"r":"$","b":"8c275f"}],"otto":[{"r":"$","l":1,"b":"d7011d"}],"barmer-gek":[{"r":"$","b":"91d131"}],"ibash":[{"r":"$","b":"333333"}],"pr-inside":[{"r":"$","b":"50b1a2"}],"wired":[{"r":"$","l":1,"b":"333333"}],"mobilcom-debitel":[{"r":"$","l":1,"b":"91d131"}],"wortmann":[{"r":"$","b":"8a52a2"}],"the-west":[{"r":"$","l":1,"b":"c78e6d"}],"paderborn":[{"r":"$","b":"073673"}],"harvardbusinessmanager":[{"r":"$","b":"073673"}],"elitepvpers":[{"r":"$","b":"ff951d"}],"gdv":[{"r":"$","b":"c3043e"}],"rumundco":[{"r":"$","b":"c78e6d"}],"mpo":[{"r":"$","b":"91d131"}],"esprit":[{"r":"$","l":1,"b":"c3043e"}],"toptarif":[{"r":"$","b":"1747a6"}],"c-and-a":[{"r":"$","l":1,"b":"56eac6"}],"fvw":[{"r":"$","b":"d7011d"}],"rosenheim24":[{"r":"$","b":"ffc802"}],"huffpost":[{"r":"$","l":1,"b":"006567"}],"klingel":[{"r":"$","b":"d7011d"}],"expert-technomarkt":[{"r":"$","b":"1747a6"}],"union-investment":[{"r":"$","b":"1747a6"}],"tvp":[{"r":"$","b":"4592d8"}],"erzgebirgssparkasse":[{"r":"$","l":1,"b":"f9204c"}],"ddl":[{"r":"$","b":"1747a6"}],"hvv":[{"r":"$","l":1,"b":"d7011d"}],"dresden":[{"r":"$","b":"d7011d"}],"seniorentreff":[{"r":"$","b":"abc8e2"}],"razerzone":[{"r":"$","b":"07613c"}],"friendscout24":[{"r":"$","l":1,"b":"1747a6"}],"wied":[{"r":"$","b":"d7011d"}],"deutsche-rentenversicherung":[{"r":"$","b":"4592d8"}],"kaufland":[{"r":"$","l":1,"b":"d7011d"}],"diba":[{"r":"$","l":1,"b":"f97136"}],"accor":[{"r":"$","b":"073673"}],"wikia":[{"r":"$","l":1,"b":"333333"}],"sr-online":[{"r":"$","l":1,"b":"073673"}],"chillmo":[{"r":"$","b":"d7011d"}],"porsche":[{"r":"$","l":1,"b":"333333"}],"planet-beruf":[{"r":"$","b":"abc8e2"}],"essen":[{"r":"$","b":"1747a6"}],"corriere":[{"r":"$","l":1,"b":"333"}],"hollywoodlife":[{"r":"$","b":"db5c8c"}],"magix-online":[{"r":"$","b":"073673"}],"bouyguestelecom":[{"r":"$","b":"429abd"}],"hem":[{"r":"$","b":"fce951"}],"uni-wuerzburg":[{"r":"$","l":1,"b":"073673"}],"enbw":[{"r":"$","l":1,"b":"1747a6"}],"xxxlutz":[{"r":"$","l":1,"b":"d7011d"}],"rush":[{"r":"$","b":"e24b2c"}],"flirt":[{"r":"$","b":"91d131"}],"brands4friends":[{"r":"$","b":"91d131"}],"cnbc":[{"r":"$","l":1,"b":"4592d8"}],"hurriyet":[{"r":"$","b":"d7011d"}],"ae":[{"r":"$","l":1,"b":"073673"}],"ad":[{"r":"$","b":"d7011d"}],"ah":[{"r":"$","l":1,"b":"2fc4fc"}],"al":[{"r":"$","b":"d7011d"}],"an":[{"r":"$","l":1,"b":"333333"}],"aq":[{"r":"$","b":"429abd"}],"as":[{"r":"$","l":1,"b":"e92207"}],"jeuxvideo":[{"r":"$","b":"f97136"}],"typepad":[{"r":"$","l":1,"b":"333333"}],"sparkassen-kreditkarten":[{"r":"$","l":1,"b":"f9204c"}],"readwrite":[{"r":"$","l":1,"b":"d7011d"}],"guildwars2":[{"r":"$","l":1,"b":"d7011d"}],"herner-sparkasse":[{"r":"$","l":1,"b":"f9204c"}],"myp2p-eu":[{"r":"$","b":"4592d8"}],"s4-league":[{"r":"$","l":1,"b":"5ea3f9"}],"vag-freiburg":[{"r":"$","b":"d7011d"}],"html-seminar":[{"r":"$","b":"fce951"}],"a1":[{"r":"$","l":1,"b":"333333"}],"berufe-universum":[{"r":"$","b":"abc8e2"}],"s4league":[{"r":"$","l":1,"b":"5ea3f9"}],"adac":[{"r":"$","l":1,"b":"ffc802"}],"offenburg":[{"r":"$","b":"e24b2c"}],"rd":[{"r":"$","b":"1747a6"}],"tamilo":[{"r":"$","b":"4592d8"}],"tz":[{"r":"$","l":1,"b":"d7011d"}],"tt":[{"r":"$","b":"333333"}],"tk":[{"r":"$","l":1,"b":"2fc4fc"}],"td":[{"r":"$","b":"07613c"}],"te":[{"r":"$","l":1,"b":"5267a2"}],"ta":[{"r":"$","b":"c78e6d"}],"menshealth":[{"r":"$","b":"d7011d"}],"ehow":[{"r":"$","l":1,"b":"91d131"}],"pbs":[{"r":"$","l":1,"b":"333333"}],"gettyimages":[{"r":"$","b":"333333"}],"obsproject":[{"r":"$","b":"333333"}],"netzwelt":[{"r":"$","l":1,"b":"7bebf5"}],"heise":[{"r":"$","l":1,"b":"999999"}],"bafa":[{"r":"$","b":"91d131"}],"laut":[{"r":"$","b":"333333"}],"yabeat":[{"r":"$","l":1,"b":"333333"}],"sparkasse-siegen":[{"r":"$","l":1,"b":"f9204c"}],"hasbro":[{"r":"$","l":1,"b":"429abd"}],"adopteunmec":[{"r":"$","b":"333333"}],"shockwave":[{"r":"$","b":"5267a2"}],"unitymedia":[{"r":"$","l":1,"b":"2fc4fc"}],"areamobile":[{"r":"$","b":"ffc802"}],"fcaugsburg":[{"r":"$","l":1,"b":"d7011d"}],"chefkoch":[{"r":"$","l":1,"b":"328c67"}],"action":[{"r":"$","b":"429abd"}],"adidas":[{"r":"$","l":1,"b":"333333"}],"symptome":[{"r":"$","b":"4592d8"}],"vip":[{"r":"$","l":1,"b":"333333"}],"targobank":[{"r":"$","l":1,"b":"1747a6"}],"deerberg":[{"r":"$","b":"ffc802"}],"raiffeisenvolksbank":[{"r":"$","l":1,"b":"1747a6"}],"sparkassehanau":[{"r":"$","l":1,"b":"f9204c"}],"vine-videos":[{"r":"$","b":"328c67"}],"burdastyle":[{"r":"$","l":1,"b":"f8458f"}],"pearl":[{"r":"$","l":1,"b":"1747a6"}],"basler-haarkosmetik":[{"r":"$","l":1,"b":"f8458f"}],"more":[{"r":"$","b":"073673"}],"sparkasse-pforzheim-calw":[{"r":"$","l":1,"b":"f9204c"}],"02elf":[{"r":"$","l":1,"b":"d7011d"}],"tinmoi":[{"r":"$","b":"f9204c"}],"fotolia":[{"r":"$","l":1,"b":"74d463"}],"xhamster-best":[{"r":"$","l":1,"b":"f97136"}],"horizonhobby":[{"r":"$","b":"5267a2"}],"novatv":[{"r":"$","b":"2fc4fc"}],"wbs-law":[{"r":"$","b":"d7011d"}],"onvista":[{"r":"$","l":1,"b":"d248ca"}],"jades24":[{"r":"$","b":"333333"}],"impulse":[{"r":"$","l":1,"b":"fede07"}],"oanda":[{"r":"$","l":1,"b":"91d131"}],"sparkasse-suew":[{"r":"$","l":1,"b":"f9204c"}],"fu-berlin":[{"r":"$","l":1,"b":"91d131"}],"notepad-plus-plus":[{"r":"$","b":"c78e6d"}],"otelo":[{"r":"$","b":"c78e6d"}],"maxblue":[{"r":"$","b":"073673"}],"cewe":[{"r":"$","b":"e24b2c"}],"muenchenticket":[{"r":"$","b":"d248ca"}],"ise":[{"r":"$","b":"e24b2c"}],"nvidia":[{"r":"$","b":"91d131"}],"dfb":[{"r":"$","l":1,"b":"328c67"}],"rwth-aachen":[{"r":"$","l":1,"b":"1747a6"}],"reise-preise":[{"r":"$","b":"1747a6"}],"fahrschulcard":[{"r":"$","b":"4592d8"}],"yandex":[{"r":"$","l":1,"b":"d7011d"}],"its":[{"r":"$","b":"92dba4"}],"free-muenchen":[{"r":"$","l":1,"b":"ff951d"}],"sparkasse-ruegen":[{"r":"$","l":1,"b":"f9204c"}],"arndt-bruenner":[{"r":"$","b":"d8ee46"}],"yatego":[{"r":"$","b":"f97136"}],"chrisbrownworld":[{"r":"$","b":"d7011d"}],"ostermann":[{"r":"$","b":"d7011d"}],"yasni":[{"r":"$","l":1,"b":"f97136"}],"u60311":[{"r":"$","l":1,"b":"073673"}],"jetztspielen":[{"r":"$","l":1,"b":"ff5349"}],"proxer":[{"r":"$","l":1,"b":"c3043e"}],"santanderbank":[{"r":"$","l":1,"b":"e92207"}],"deiters":[{"r":"$","b":"429abd"}],"gfk":[{"r":"$","l":1,"b":"f97136"}],"vb-mittelhessen":[{"r":"$","l":1,"b":"1747a6"}],"rudaw":[{"r":"$","b":"eaeaea"}],"mandmdirect":[{"r":"$","b":"2fc4fc"}],"pflanzmich":[{"r":"$","b":"abc8e2"}],"claires":[{"r":"$","b":"9077e3"}],"sparkasse-herford":[{"r":"$","l":1,"b":"f9204c"}],"leagueoflegends":[{"r":"$","l":1,"b":"073673"}],"fti":[{"r":"$","b":"ff951d"}],"ness":[{"r":"$","b":"333333"}],"pcgameshardware":[{"r":"$","l":1,"b":"1747a6"}],"siegen":[{"r":"$","b":"e24b2c"}],"echo-online":[{"r":"$","b":"d7011d"}],"huaweidevices":[{"r":"$","b":"d7011d"}],"meinestadt":[{"r":"$","l":1,"b":"fede07"}],"gamesonly":[{"r":"$","b":"073673"}],"topsy":[{"r":"$","b":"ff951d"}],"buecher":[{"r":"$","b":"50b1a2"}],"aver":[{"r":"$","b":"328c67"}],"peterhahn":[{"r":"$","l":1,"b":"333333"}],"motorvision":[{"r":"$","b":"e24b2c"}],"allkpop":[{"r":"$","b":"d7011d"}],"regensburg":[{"r":"$","b":"d7011d"}],"emirates":[{"r":"$","b":"e24b2c"}],"sncf":[{"r":"$","b":"d7011d"}],"sparkasse-westmuensterland":[{"r":"$","l":1,"b":"f9204c"}],"telefonbuch":[{"r":"$","b":"d7011d"}],"mathaeser":[{"r":"$","l":1,"b":"1747a6"}],"minecraft-modding":[{"r":"$","b":"7bebf5"}],"kaufda":[{"r":"$","b":"c3043e"}],"l-bank":[{"r":"$","l":1,"b":"8c275f"}],"buffalo-technology":[{"r":"$","b":"d7011d"}],"singles":[{"r":"$","b":"f97136"}],"buchhandel":[{"r":"$","b":"d7011d"}],"asus":[{"r":"$","b":"333333"}],"sparkasse-oberlausitz-niederschlesien":[{"r":"$","l":1,"b":"f9204c"}],"microsoft":[{"r":"$","l":1,"b":"5ea3f9"}],"meincokebonus":[{"r":"$","l":1,"b":"d7011d"}],"golf":[{"r":"$","b":"5267a2"}],"gold":[{"r":"$","l":1,"b":"07613c"}],"taylorswift":[{"r":"$","b":"e24b2c"}],"nasdaq":[{"r":"$","b":"429abd"}],"ferienwohnung":[{"r":"$","b":"ff951d"}],"juris":[{"r":"$","b":"ffc802"}],"condor":[{"r":"$","l":1,"b":"ffc802"}],"mcdonalds-duisburg":[{"r":"$","l":1,"b":"ffc802"}],"barclaycard":[{"r":"$","b":"1747a6"}],"neon":[{"r":"$","b":"07613c"}],"disqus":[{"r":"$","b":"5ea3f9"}],"gamefront":[{"r":"$","b":"5ea3f9"}],"x-herford":[{"r":"$","l":1,"b":"d7011d"}],"rfi":[{"r":"$","b":"e24b2c"}],"ser":[{"r":"$","l":1,"b":"4592d8"}],"bmfsfj":[{"r":"$","l":1,"b":"333333"}],"sec":[{"r":"$","b":"1747a6"}],"seo":[{"r":"$","b":"abc8e2"}],"kununu":[{"r":"$","l":1,"b":"d8ee46"}],"movie":[{"r":"$.to","l":1,"b":"333333"},{"r":"$","b":"073673"}],"5goldig":[{"r":"$","b":"999999"}],"mybb":[{"r":"$","b":"4592d8"}],"abendblatt":[{"r":"$","l":1,"b":"07613c"}],"europa":[{"r":"$","l":1,"b":"0b47bf"}],"mindfactory":[{"r":"$","l":1,"b":"073673"}],"lem":[{"r":"$","b":"e24b2c"}],"playit-online":[{"r":"$","b":"abc8e2"}],"crew-united":[{"r":"$","b":"429abd"}],"last":[{"r":"$","b":"d7011d"}],"firstrows":[{"r":"$","b":"07613c"}],"empireonline":[{"r":"$","b":"d7011d"}],"tuwien":[{"r":"$","l":1,"b":"1747a6"}],"extratorrent":[{"r":"$","b":"2fc4fc"}],"zoopla":[{"r":"$","l":1,"b":"530773"}],"sw-augsburg":[{"r":"$","l":1,"b":"2fc4fc"}],"bell":[{"r":"$","l":1,"b":"d7011d"}],"ubuntu":[{"r":"$","l":1,"b":"333333"}],"novosti":[{"r":"$","b":"d7011d"}],"apobank":[{"r":"$","b":"073673"}],"nrc":[{"r":"$","b":"d7011d"}],"stardoll":[{"r":"$","b":"ffc802"}],"atlassian":[{"r":"$","b":"073673"}],"stylefile":[{"r":"$","b":"f97136"}],"fritz":[{"r":"$","l":1,"b":"d7011d"}],"nrw":[{"r":"$","l":1,"b":"d7011d"}],"funk":[{"r":"$","b":"4592d8"}],"mlb":[{"r":"$","l":1,"b":"1747a6"}],"rojadirectaonline":[{"r":"$","b":"5267a2"}],"bankofamerica":[{"r":"$","l":1,"b":"c3043e"}],"regenbogen":[{"r":"$","l":1,"b":"2fc4fc"}],"selfhtml":[{"r":"$","b":"429abd"}],"sueddeutsche":[{"r":"$","l":1,"b":"333333"}],"peugeot":[{"r":"$","l":1,"b":"333333"}],"vox":[{"r":"$.de","l":1,"b":"333333"},{"r":"$","l":1,"b":"333333"}],"chase":[{"r":"$","l":1,"b":"1747a6"}],"vergleich":[{"r":"$","b":"d7011d"}],"t-online":[{"r":"$","l":1,"b":"f8458f"}],"gayroyal":[{"r":"$","b":"333333"}],"sparkasse-hrv":[{"r":"$","l":1,"b":"f9204c"}],"vgn":[{"r":"$","b":"328c67"}],"nabu":[{"r":"$","b":"5267a2"}],"timeanddate":[{"r":"$","b":"4592d8"}],"ddl-music":[{"r":"$","b":"ffc802"}],"stiftung-warentest":[{"r":"$","b":"f97136"}],"telegram":[{"r":"$","l":1}],"oyunkolu":[{"r":"$","b":"9077e3"}],"sonepar":[{"r":"$","b":"073673"}],"limango-outlet":[{"r":"$","b":"91d131"}],"blizzard":[{"r":"$","b":"fede07"}],"sputnik":[{"r":"$","l":1,"b":"333333"}],"traktorpool":[{"r":"$","b":"abc8e2"}],"spruch-des-tages":[{"r":"$","b":"ffc802"}],"format":[{"r":"$","b":"c3043e"}],"warthunder":[{"r":"$","b":"92dba4"}],"pixum":[{"r":"$","b":"4592d8"}],"boerse":[{"r":"$.to","l":1,"b":"333333"},{"r":"$.de","t":"b","b":"073673"},{"r":"$","l":1,"b":"1747a6"}],"sofort-bank":[{"r":"$","b":"ff951d"}],"nissan":[{"r":"$","l":1,"b":"d7011d"}],"megogo":[{"r":"$","b":"eaeaea"}],"freewar":[{"r":"$","b":"e24b2c"}],"gutscheincodes":[{"r":"$","b":"f9204c"}],"investopedia":[{"r":"$","l":1,"b":"5267a2"}],"takko-fashion":[{"r":"$","b":"fce951"}],"sparkasse-olpe":[{"r":"$","l":1,"b":"f9204c"}],"be":[{"r":"$","b":"92dba4"}],"eplus":[{"r":"$","l":1,"b":"07613c"}],"falk-navigation":[{"r":"$","l":1,"b":"d7011d"}],"bo":[{"r":"$","l":1,"b":"fede07"}],"needforspeed":[{"r":"$","b":"fce951"}],"bt":[{"r":"$","l":1,"b":"506bb8"}],"bu":[{"r":"$","l":1,"b":"d7011d"}],"br":[{"r":"ard.$","l":1,"b":"073673"},{"r":"$","l":1,"b":"429abd"}],"sportsliveworld":[{"r":"$","b":"c78e6d"}],"daimler":[{"r":"$","b":"073673"}],"kik-textilien":[{"r":"$","l":1,"b":"d7011d"}],"nationalgeographic":[{"r":"$","l":1,"b":"ffc802"}],"louisvuitton":[{"r":"$","l":1,"b":"333333"}],"libero":[{"r":"$","l":1,"b":"1747a6"}],"hosteurope":[{"r":"$","b":"073673"}],"sparknotes":[{"r":"$","l":1,"b":"2fc4fc"}],"r-project":[{"r":"$","l":1,"b":"abc8e2"}],"tsv1860":[{"r":"$","l":1,"b":"333333"}],"01net":[{"r":"$","b":"d7011d"}],"spar":[{"r":"$.ch","l":1,"b":"006567"},{"r":"$","l":1,"b":"006567"}],"tvrain":[{"r":"$","b":"c3043e"}],"posteo":[{"r":"$","l":1,"b":"d8ee46"}],"webtentvizle":[{"r":"$","b":"ffc802"}],"boxofficemojo":[{"r":"$","b":"d7011d"}],"cic":[{"r":"$","b":"50b1a2"}],"outdoor-magazin":[{"r":"$","b":"f97136"}],"pathofexile":[{"r":"$","b":"fce951"}],"cio":[{"r":"$","b":"d7011d"}],"webfail":[{"r":"$","l":1,"b":"333333"}],"bluestacks":[{"r":"$","b":"91d131"}],"wpcentral":[{"r":"$","b":"ffc802"}],"testbericht":[{"r":"$","b":"ff951d"}],"buecherhallen":[{"r":"$","b":"333333"}],"tiervermittlung":[{"r":"$","b":"2fc4fc"}],"hermespaketshop":[{"r":"$","b":"073673"}],"alpenverein":[{"r":"$","b":"91d131"}],"innova24":[{"r":"$","b":"c3043e"}],"netzkino":[{"r":"$","b":"5ea3f9"}],"repubblica":[{"r":"$","l":1,"b":"333"}],"omegle":[{"r":"$","b":"5ea3f9"}],"lufthansa":[{"r":"$","l":1,"b":"ffc802"}],"vietnamnet":[{"r":"$","b":"d7011d"}],"hidemyass":[{"r":"$","b":"ffc802"}],"berlinersparkasse":[{"r":"$","l":1,"b":"f9204c"}],"aga":[{"r":"$","b":"333333"}],"cwtv":[{"r":"$","b":"328c67"}],"mangareader":[{"r":"$","b":"abc8e2"}],"bvb":[{"r":"$","l":1,"b":"fede07"}],"bvg":[{"r":"$","l":1,"b":"fede07"}],"overclock":[{"r":"$","b":"073673"}],"wunderweib":[{"r":"maxi.$","l":1,"b":"f8458f"},{"r":"intouch.$","l":1,"b":"d248ca"},{"r":"astrowoche.$","l":1,"b":"d7011d"},{"r":"wohnidee.$","l":1,"b":"d7011d"},{"r":"$","l":1,"b":"f36e8d"}],"derwesten":[{"r":"$","l":1,"b":"d7011d"}],"ostsee-zeitung":[{"r":"$","b":"4592d8"}],"uploaded":[{"r":"$","b":"1747a6"}],"goodgamestudios":[{"r":"$","l":1,"b":"1747a6"}],"statravel":[{"r":"$","b":"5267a2"}],"evi":[{"r":"$","l":1,"b":"666666"}],"tubegalore":[{"r":"$","b":"333333"}],"trt":[{"r":"$","b":"d7011d"}],"magix":[{"r":"$","b":"333333"}],"photobox":[{"r":"$","b":"74d463"}],"video":[{"r":"$","b":"f97136"}],"tuttosport":[{"r":"$","b":"d7011d"}],"index":[{"r":"$","b":"d7011d"}],"wunderlist":[{"r":"$","b":"e24b2c"}],"leg":[{"r":"$","b":"c78e6d"}],"21run":[{"r":"$","b":"1747a6"}],"alternativefuer":[{"r":"$","b":"4592d8"}],"len":[{"r":"$","b":"d7011d"}],"leo":[{"r":"$","l":1,"b":"fede07"}],"mixcloud":[{"r":"$","b":"333333"}],"haspa":[{"r":"$","l":1,"b":"f9204c"}],"bz-berlin":[{"r":"$","l":1,"b":"d7011d"}],"sgd":[{"r":"$","b":"07613c"}],"reisegeier":[{"r":"$","b":"5267a2"}],"cliqz":[{"r":"$","l":1,"b":"43bdd9"}],"router-forum":[{"r":"$","b":"abc8e2"}],"charite":[{"r":"$","b":"999999"}],"ove":[{"r":"$","b":"fede07"}],"zimmer":[{"r":"$","b":"0b47bf"}],"srf":[{"r":"$","l":1,"b":"c3043e"}],"check24":[{"r":"$","l":1,"b":"91d131"}],"ebookers":[{"r":"$","b":"006567"}],"steampowered":[{"r":"$","l":1,"b":"333333"}],"mgid":[{"r":"$","b":"abc8e2"}],"hallopizza":[{"r":"$","b":"c78e6d"}],"spruch":[{"r":"$","b":"8a52a2"}],"stoffe":[{"r":"$","b":"8c275f"}],"twitpic":[{"r":"$","b":"2fc4fc"}],"visitlondon":[{"r":"$","b":"c3043e"}],"reifendirekt":[{"r":"$","l":1,"b":"4592d8"}],"junghanswolle":[{"r":"$","b":"c78e6d"}],"hearthstoneheroes":[{"r":"$","b":"d7011d"}],"misterspex":[{"r":"$","b":"333333"}],"idowa":[{"r":"$","b":"c3043e"}],"dominos":[{"r":"$","b":"f9204c"}],"fitx":[{"r":"$","b":"ff951d"}],"tier":[{"r":"$","b":"ffc802"}],"bikeunit":[{"r":"$","b":"fce951"}],"nordbayern":[{"r":"$","b":"c3043e"}],"couchsurfing":[{"r":"$","b":"e24b2c"}],"counter":[{"r":"$","b":"91d131"}],"reuter":[{"r":"$","b":"43bdd9"}],"outlook":[{"r":"$","l":1,"b":"4592d8"}],"oracle":[{"r":"$","l":1,"b":"d7011d"}],"logitech":[{"r":"$","b":"f9204c"}],"dynamo-dresden":[{"r":"$","b":"d7011d"}],"karriere":[{"r":"$","b":"1747a6"}],"foerde-sparkasse":[{"r":"$","l":1,"b":"f9204c"}],"xxlscore":[{"r":"$","b":"d7011d"}],"total":[{"r":"$","b":"07613c"}],"body-attack":[{"r":"$","b":"ffc802"}],"python":[{"r":"$","l":1,"b":"b3b3b3"}],"redbullmuenchen":[{"r":"$","l":1,"b":"d7011d"}],"lzo":[{"r":"$","l":1,"b":"d7011d"}],"amorelie":[{"r":"$","b":"333333"}],"flohmarkt":[{"r":"$","b":"fce951"}],"handytick":[{"r":"$","b":"91d131"}],"stock":[{"r":"$","b":"073673"}],"sparkasse-dieburg":[{"r":"$","l":1,"b":"f9204c"}],"smsvongesternnacht":[{"r":"$","b":"8c275f"}],"rezeptefinden":[{"r":"$","b":"fce951"}],"kabelbw":[{"r":"$","b":"1747a6"}],"badoo":[{"r":"$","l":1,"b":"ff951d"}],"trailerseite":[{"r":"$","b":"5267a2"}],"fotomac":[{"r":"$","b":"4592d8"}],"erfurt":[{"r":"$","b":"92dba4"}],"klm":[{"r":"$","b":"429abd"}],"1001fonts":[{"r":"$","b":"fce951"}],"uni-passau":[{"r":"$","b":"ff951d"}],"berliner-volksbank":[{"r":"$","l":1,"b":"1747a6"}],"tempo":[{"r":"$","l":1,"b":"4592d8"}],"hyundai":[{"r":"$","l":1,"b":"073673"}],"dachdecker":[{"r":"$","b":"333333"}],"mybestbrands":[{"r":"$","b":"fb91ae"}],"preisvergleich":[{"r":"$","b":"0b47bf"}],"flughafen-stuttgart":[{"r":"$","b":"1747a6"}],"vgwort":[{"r":"$","b":"333333"}],"flightradar24":[{"r":"$","b":"073673"}],"ihk":[{"r":"$","l":1,"b":"073673"}],"start":[{"r":"$","b":"5267a2"}],"norton":[{"r":"$","b":"ffc802"}],"wetterzentrale":[{"r":"$","b":"ff951d"}],"aachener-nachrichten":[{"r":"$","b":"ffc802"}],"general-overnight":[{"r":"$","l":1,"b":"8c275f"}],"4teachers":[{"r":"$","b":"7bebf5"}],"twoo":[{"r":"$","b":"f97136"}],"manufactum":[{"r":"$","b":"328c67"}],"finanztip":[{"r":"$","b":"006567"}],"myprotein":[{"r":"$","b":"4592d8"}],"plz-postleitzahl":[{"r":"$","b":"ffc802"}],"bing":[{"r":"$","l":1,"b":"ffc802"}],"digitalkamera":[{"r":"$","b":"fce951"}],"zattoo":[{"r":"$","l":1,"b":"ff951d"}],"tonight":[{"r":"$","b":"ffc802"}],"waze":[{"r":"$","l":1,"b":"43bdd9"}],"pgatour":[{"r":"$","b":"073673"}],"arminia-bielefeld":[{"r":"$","l":1,"b":"1747a6"}],"disneychannel":[{"r":"$","l":1,"b":"333333"}],"mediafire":[{"r":"$","b":"5267a2"}],"zoomumba":[{"r":"$","b":"d7011d"}],"emiko":[{"r":"$","l":1,"b":"74d463"}],"4tube":[{"r":"$","l":1,"b":"ff951d"}],"linguee":[{"r":"$","l":1,"b":"abc8e2"}],"dbb":[{"r":"$","l":1,"b":"8c275f"}],"fettspielen":[{"r":"$","b":"333333"}],"roseversand":[{"r":"$","b":"07613c"}],"systemkamera-forum":[{"r":"$","b":"fce951"}],"economist":[{"r":"$","l":1,"b":"e92207"}],"aldi-nord":[{"r":"$","l":1,"b":"4592d8"}],"winscp":[{"r":"$","b":"1747a6"}],"filmpalast":[{"r":"$.net","l":1,"b":"d7011d"}],"jam":[{"r":"$","l":1,"b":"fede07"}],"sparkasse-goslar-harz":[{"r":"$","l":1,"b":"f9204c"}],"brille24":[{"r":"$","b":"333333"}],"prada":[{"r":"$","l":1,"b":"333333"}],"mister-auto":[{"r":"$","b":"5267a2"}],"aer":[{"r":"$","b":"07613c"}],"aeg":[{"r":"$","b":"d7011d"}],"tv-replay":[{"r":"$","b":"c3043e"}],"umzugsauktion":[{"r":"$","b":"073673"}],"gidonlinekino":[{"r":"$","b":"abc8e2"}],"schwarzkopf":[{"r":"$","b":"333333"}],"fixya":[{"r":"$","l":1,"b":"073673"}],"systemexplorer":[{"r":"$","b":"abc8e2"}],"immobilien-zeitung":[{"r":"$","b":"9077e3"}],"flightstats":[{"r":"$","l":1,"b":"073673"}],"ende":[{"r":"$","b":"c78e6d"}],"mifcom":[{"r":"$","b":"c78e6d"}],"ets":[{"r":"$","b":"1747a6"}],"meinfernbus":[{"r":"$","l":1,"b":"91d131"}],"traumflieger":[{"r":"$","b":"333333"}],"npr":[{"r":"$","l":1,"b":"333333"}],"ebizmba":[{"r":"$","l":1,"b":"073673"}],"rama":[{"r":"$","b":"073673"}],"cj":[{"r":"$","b":"07613c"}],"ch":[{"r":"$","l":1,"b":"d7011d"}],"ca":[{"r":"$","l":1,"b":"333333"}],"politico":[{"r":"$","l":1,"b":"d7011d"}],"hotel":[{"r":"$","l":1,"b":"ff951d"}],"teleauskunft":[{"r":"$","l":1,"b":"ffc802"}],"maxxim":[{"r":"$","b":"92dba4"}],"nordkurier":[{"r":"$","b":"429abd"}],"vi":[{"r":"$","l":1,"b":"d7011d"}],"vk":[{"r":"$","l":1,"b":"429abd"}],"trustpilot":[{"r":"$","b":"ff951d"}],"vr":[{"r":"$","l":1,"b":"1747a6"}],"baumschule-horstmann":[{"r":"$","b":"f36e8d"}],"spektrum":[{"r":"$","b":"333333"}],"24sata":[{"r":"$","b":"d7011d"}],"android":[{"r":"$","l":1,"b":"91d131"}],"fluege":[{"r":"$","l":1,"b":"ff951d"}],"a10center":[{"r":"$","b":"5267a2"}],"mydirtyhobby":[{"r":"$","l":1,"b":"c3043e"}],"mailchimp":[{"r":"$","l":1,"b":"333333"}],"ikea":[{"r":"$","l":1,"b":"fede07"}],"freetetris":[{"r":"$","b":"abc8e2"}],"eisenbahn-bundesamt":[{"r":"$","b":"ffc802"}],"landal":[{"r":"$","b":"91d131"}],"dguv":[{"r":"$","b":"1747a6"}],"gulli":[{"r":"$","l":1,"b":"c3043e"}],"foxnewsinsider":[{"r":"$","l":1,"b":"333333"}],"uni-hannover":[{"r":"$","b":"5267a2"}],"web":[{"r":"$","l":1,"b":"ffc802"}],"neuss":[{"r":"$","b":"e24b2c"}],"wei":[{"r":"$","b":"e24b2c"}],"newlook":[{"r":"$","b":"333333"}],"trnd":[{"r":"$","b":"333333"}],"haus":[{"r":"$","b":"c78e6d"}],"sofort":[{"r":"$","b":"ff951d"}],"themovieblog":[{"r":"$","b":"c78e6d"}],"babylon":[{"r":"$","l":1,"b":"073673"}],"risingcities":[{"r":"$","b":"43bdd9"}],"3sat":[{"r":"$","b":"d7011d"}],"borderline-borderliner":[{"r":"$","b":"ff951d"}],"polar":[{"r":"$","b":"f9204c"}],"flyeralarm":[{"r":"$","l":1,"b":"333333"}],"forgeofempires":[{"r":"$","b":"fce951"}],"fn-neon":[{"r":"$","b":"07613c"}],"shakira":[{"r":"$","b":"c78e6d"}],"fyve":[{"r":"$","b":"333333"}],"fedex":[{"r":"$","l":1,"b":"8a52a2"}],"sprachreisen":[{"r":"$","b":"5267a2"}],"eurosport":[{"r":"$","l":1,"b":"333333"}],"freitag":[{"r":"$","l":1,"b":"333333"}],"filmpalast-kino":[{"r":"$","b":"abc8e2"}],"netcup":[{"r":"$","b":"006567"}],"langen":[{"r":"$","b":"073673"}],"jako-o":[{"r":"$","l":1,"b":"073673"}],"qrcode-generator":[{"r":"$","b":"333333"}],"telegraaf":[{"r":"$","b":"333333"}],"myspass":[{"r":"$","b":"2fc4fc"}],"virtualbox":[{"r":"$","b":"073673"}],"bawagpsk":[{"r":"$","l":1,"b":"c3043e"}],"ard-digital":[{"r":"$","l":1,"b":"073673"}],"cosmopolitan":[{"r":"$","b":"c3043e"}],"pixiz":[{"r":"$","b":"ff951d"}],"klarna":[{"r":"$","b":"4592d8"}],"ebay-kleinanzeigen":[{"r":"$","l":1,"b":"91d131"}],"moviestarplanet":[{"r":"$","l":1,"b":"43bdd9"}],"wuestenrot":[{"r":"$","b":"e24b2c"}],"ini":[{"r":"$","b":"fce951"}],"ing":[{"r":"$","l":1,"b":"f97136"}],"dofus":[{"r":"$","b":"fce951"}],"inc":[{"r":"$","l":1,"b":"333333"}],"dress-for-less":[{"r":"$","b":"f97136"}],"uni-bremen":[{"r":"$","l":1,"b":"d7011d"}],"babbel":[{"r":"$","l":1,"b":"ff951d"}],"xmarks":[{"r":"$","b":"5267a2"}],"norma-online":[{"r":"$","l":1,"b":"d7011d"}],"arschficken":[{"r":"$","b":"c78e6d"}],"die-staemme":[{"r":"$","b":"c78e6d"}],"comunio":[{"r":"$","l":1,"b":"07613c"}],"meineschufa":[{"r":"$","b":"fede07"}],"netgear":[{"r":"$","b":"073673"}],"morgenweb":[{"r":"$","l":1,"b":"ff951d"}],"fischkopf":[{"r":"$","b":"fce951"}],"gossipyouth":[{"r":"$","b":"d7011d"}],"eon":[{"r":"$","l":1,"b":"e92207"}],"mercedes-benz-bank":[{"r":"$","l":1,"b":"333333"}],"juve":[{"r":"$","b":"07613c"}],"ciao":[{"r":"$","b":"f97136"}],"m2p":[{"r":"$","b":"d7011d"}],"spie":[{"r":"$","l":1,"b":"d7011d"}],"kassel":[{"r":"$","b":"f8458f"}],"spex":[{"r":"$","b":"333333"}],"ergo":[{"r":"$","b":"f9204c"}],"r-statistik":[{"r":"$","b":"4592d8"}],"penny":[{"r":"$","l":1,"b":"e92207"}],"sparkasse-bielefeld":[{"r":"$","l":1,"b":"f9204c"}],"eurolines":[{"r":"$","b":"0b47bf"}],"cher":[{"r":"$","b":"c78e6d"}],"eurovision":[{"r":"$","b":"333333"}],"viessmann":[{"r":"$","b":"d7011d"}],"theladbible":[{"r":"$","l":1,"b":"2fc4fc"}],"playmobil-funpark":[{"r":"$","b":"429abd"}],"privalia":[{"r":"$","b":"d7011d"}],"shisha-world":[{"r":"$","b":"ff951d"}],"subscene":[{"r":"$","b":"1747a6"}],"kinokiste":[{"r":"$","b":"43bdd9"}],"eprimo":[{"r":"$","b":"d8ee46"}],"akt":[{"r":"$","b":"91d131"}],"tuneup":[{"r":"$","b":"ffc802"}],"gls":[{"r":"$","l":1,"b":"91d131"}],"bnpparibas":[{"r":"$","b":"50b1a2"}],"qthemusic":[{"r":"$","l":1,"b":"d7011d"}],"kuechen-quelle":[{"r":"$","b":"d7011d"}],"doccheck":[{"r":"$","b":"333333"}],"uni-bamberg":[{"r":"$","l":1,"b":"1747a6"}],"tuev-sued":[{"r":"$","b":"073673"}],"nkd":[{"r":"$","b":"d7011d"}],"hipp":[{"r":"$","b":"f8458f"}],"nkl":[{"r":"$","b":"f9204c"}],"tz-online":[{"r":"$","b":"d7011d"}],"ert":[{"r":"$","b":"fb91ae"}],"tnt":[{"r":"$","l":1,"b":"f97136"}],"springer":[{"r":"$","b":"073673"}],"lovefilm":[{"r":"$","b":"d7011d"}],"gebrauchtwagen":[{"r":"$","b":"5267a2"}],"erf":[{"r":"$","l":1,"b":"d7011d"}],"fr-online":[{"r":"$","l":1,"b":"07613c"}],"foxsports":[{"r":"$","l":1,"b":"073673"}],"meteofrance":[{"r":"$","b":"4592d8"}],"movies":[{"r":"$","b":"d7011d"}],"kleinanzeigen":[{"r":"$","b":"e24b2c"}],"bet365":[{"r":"$","l":1,"b":"328c67"}],"joyclub":[{"r":"$","l":1,"b":"333333"}],"pizza":[{"r":"$","l":1,"b":"ffc802"}],"lan":[{"r":"$","b":"073673"}],"uproxx":[{"r":"$","b":"e24b2c"}],"thesun":[{"r":"$","l":1,"b":"e92207"}],"voyages-sncf":[{"r":"$","b":"4592d8"}],"schneider":[{"r":"$","b":"fb91ae"}],"youporn":[{"r":"$","l":1,"b":"f9204c"}],"kreissparkasse-augsburg":[{"r":"$","l":1,"b":"f9204c"}],"lustich":[{"r":"$","b":"333333"}],"berliner-kurier":[{"r":"$","b":"d7011d"}],"cinecitta":[{"r":"$","l":1,"b":"50b1a2"}],"salon":[{"r":"$","l":1,"b":"e92207"}],"office":[{"r":"$","l":1,"b":"e24b2c"}],"mvv-muenchen":[{"r":"$","l":1,"b":"91d131"}],"telecinco":[{"r":"$","b":"429abd"}],"shisha-nil":[{"r":"$","b":"d7011d"}],"sony":[{"r":"$","l":1,"b":"333333"}],"metatube":[{"r":"$","b":"5267a2"}],"staples":[{"r":"$","b":"d7011d"}],"truecrypt":[{"r":"$","b":"0b47bf"}],"ad-hoc-news":[{"r":"$","l":1,"b":"073673"}],"fotocommunity":[{"r":"$","b":"333333"}],"freundin":[{"r":"$","l":1,"b":"d7011d"}],"apotheken-umschau":[{"r":"$","b":"fb91ae"}],"mmog-welt":[{"r":"$","b":"c78e6d"}],"pornhub":[{"r":"$","l":1,"b":"333333"}],"seattletimes":[{"r":"$","l":1,"b":"333333"}],"norisbank":[{"r":"$","l":1,"b":"d7011d"}],"dawanda":[{"r":"$","l":1,"b":"c3043e"}],"roxy":[{"r":"$","b":"07613c"}],"streamiz":[{"r":"$","b":"006567"}],"freeware":[{"r":"$","b":"92dba4"}],"moebel-boss":[{"r":"$","b":"f8458f"}],"diesel":[{"r":"$","l":1,"b":"d7011d"}],"computerwissen":[{"r":"$","b":"fce951"}],"ntv":[{"r":"$.ru","l":1,"b":"74d463"},{"r":"$","l":1,"b":"ffc802"}],"pregnantchicken":[{"r":"$","l":1,"b":"92dba4"}],"soundcloud":[{"r":"$","l":1,"b":"f97136"}],"mvb":[{"r":"$","b":"073673"}],"arcor":[{"r":"$","l":1,"b":"5267a2"}],"indiatimes":[{"r":"$","l":1,"b":"f9204c"}],"o2online":[{"r":"$","l":1,"b":"073673"}],"kreuzfahrten":[{"r":"$","b":"1747a6"}],"zippyshare":[{"r":"$","b":"d7011d"}],"coop":[{"r":"$","l":1,"b":"ff951d"}],"thesimsresource":[{"r":"$","b":"073673"}],"heilkraeuter":[{"r":"$","b":"ffc802"}],"target":[{"r":"$","l":1,"b":"d7011d"}],"anno-online":[{"r":"$","b":"d7011d"}],"germanwings":[{"r":"$","l":1,"b":"8c275f"}],"ebay":[{"r":"$","l":1,"b":"ffc802"}],"digitalo":[{"r":"$","b":"e24b2c"}],"galatasaray":[{"r":"$","b":"ff951d"}],"sparkasse-leipzig":[{"r":"$","l":1,"b":"f9204c"}],"bonprix":[{"r":"$","l":1,"b":"d7011d"}],"reichelt-berlin":[{"r":"$","b":"4592d8"}],"dafont":[{"r":"$","b":"d7011d"}],"tatort-fans":[{"r":"$","b":"333333"}],"nbc":[{"r":"$","l":1,"b":"333333"}],"prad":[{"r":"$","l":1,"b":"d7011d"}],"uni-duesseldorf":[{"r":"$","b":"5267a2"}],"verleihshop":[{"r":"$","b":"7bebf5"}],"sinemalar":[{"r":"$","b":"c3043e"}],"pi-news":[{"r":"$","l":1,"b":"333333"}],"mangapanda":[{"r":"$","b":"333333"}],"play3":[{"r":"$","b":"073673"}],"gumtree":[{"r":"$","l":1,"b":"91d131"}],"skyrock":[{"r":"$","l":1,"b":"5ea3f9"}],"germany":[{"r":"$","b":"333333"}],"free-youporn":[{"r":"$","l":1,"b":"333333"}],"beatport":[{"r":"$","b":"91d131"}],"pcworld":[{"r":"$","b":"c3043e"}],"cash4webmaster":[{"r":"$","b":"fede07"}],"uni-stuttgart":[{"r":"$","l":1,"b":"333333"}],"thelocal":[{"r":"$","b":"c3043e"}],"mallorcazeitung":[{"r":"$","b":"1747a6"}],"sparkasse-bamberg":[{"r":"$","l":1,"b":"f9204c"}],"hrs":[{"r":"$","l":1,"b":"d7011d"}],"aldi":[{"r":"$","l":1,"b":"4592d8"}],"lvz-online":[{"r":"$","b":"5267a2"}],"do":[{"r":"$","b":"abc8e2"}],"dm":[{"r":"$","l":1,"b":"073673"}],"di":[{"r":"$","l":1,"b":"1747a6"}],"df":[{"r":"$","l":1,"b":"91d131"}],"de":[{"r":"$","b":"ffc802"}],"db":[{"r":"$.com","l":1,"b":"1747a6"},{"r":"$","l":1,"b":"e92207"}],"dx":[{"r":"$","b":"91d131"}],"dw":[{"r":"$","l":1,"b":"073673"}],"dr":[{"r":"$","t":"DR","b":"333333"}],"squidoo":[{"r":"$","b":"abc8e2"}],"kurzurlaub":[{"r":"$","b":"c3043e"}],"emp":[{"r":"$","l":1,"b":"c3043e"}],"cosmosdirekt":[{"r":"$","b":"073673"}],"hbm":[{"r":"$","l":1,"b":"1747a6"}],"manoto1":[{"r":"$","b":"8c275f"}],"bier":[{"r":"$","l":1,"b":"333333"}],"t-mobile":[{"r":"$","l":1,"b":"f8458f"}],"sfgate":[{"r":"$","l":1,"b":"e92207"}],"britishairways":[{"r":"$","l":1,"b":"073673"}],"mmafighting":[{"r":"$","b":"ffc802"}],"sondakika":[{"r":"$","b":"ff951d"}],"franzis":[{"r":"$","b":"5267a2"}],"wp":[{"r":"$","l":1,"b":"e92207"}],"cor":[{"r":"$","b":"1747a6"}],"hitenergie":[{"r":"$","b":"abc8e2"}],"click-tt":[{"r":"$","b":"d7011d"}],"tischtennis":[{"r":"$","b":"4592d8"}],"ils":[{"r":"$","b":"ff951d"}],"fileformat":[{"r":"$","b":"07613c"}],"mackolik":[{"r":"$","l":1,"b":"1747a6"}],"americanapparel":[{"r":"$","b":"c78e6d"}],"th-wildau":[{"r":"$","l":1,"b":"1747a6"}],"buttinette-fasching":[{"r":"$","b":"f97136"}],"haz":[{"r":"$","l":1,"b":"5267a2"}],"gofeminin":[{"r":"$","l":1,"b":"8c275f"}],"parismatch":[{"r":"$","b":"e24b2c"}],"baur":[{"r":"$","l":1,"b":"ffc802"}],"gnu":[{"r":"$","b":"333333"}],"minecraftwiki":[{"r":"$","b":"5ea3f9"}],"finanzen":[{"r":"$","l":1,"b":"d8ee46"}],"beko-bbl":[{"r":"$","b":"073673"}],"vrbank":[{"r":"$","l":1,"b":"1747a6"}],"phpforum":[{"r":"$","b":"1747a6"}],"goeuro":[{"r":"$","b":"4592d8"}],"tu-braunschweig":[{"r":"$","l":1,"b":"c3043e"}],"sunshine-live":[{"r":"$","l":1,"b":"073673"}],"nih":[{"r":"$","l":1,"b":"5267a2"}],"nin":[{"r":"$","b":"8c275f"}],"ista":[{"r":"$","b":"8c275f"}],"nic":[{"r":"$","b":"333333"}],"rain":[{"r":"$","b":"5267a2"}],"norwegian":[{"r":"$","b":"f9204c"}],"braunschweig":[{"r":"$","l":1,"b":"333333"}],"newsaktuell":[{"r":"$","b":"92dba4"}],"aponet":[{"r":"$","b":"d7011d"}],"yamaha":[{"r":"$","b":"5267a2"}],"cornell":[{"r":"$","l":1,"b":"d7011d"}],"help":[{"r":"$","b":"c78e6d"}],"antec":[{"r":"$","b":"ffc802"}],"ihk-koeln":[{"r":"$","b":"1747a6"}],"ntv-tennis":[{"r":"$","l":1,"b":"d7011d"}],"anten":[{"r":"$","b":"4592d8"}],"kl-ruppert":[{"r":"$","l":1,"b":"073673"}],"inside-handy":[{"r":"$","l":1,"b":"073673"}],"pornmd":[{"r":"$","l":1,"b":"d7011d"}],"lcl":[{"r":"$","b":"073673"}],"bpb":[{"r":"$","b":"c3043e"}],"nudelsalat-rezept":[{"r":"$","b":"abc8e2"}],"utorrent":[{"r":"$","b":"07613c"}],"jugendherberge":[{"r":"$","b":"328c67"}],"gawker":[{"r":"$","l":1,"b":"e24b2c"}],"sixt":[{"r":"$","b":"ff951d"}],"zeitung":[{"r":"$","b":"4592d8"}],"deutschebahn":[{"r":"$","l":1,"b":"d7011d"}],"ok-magazin":[{"r":"$","l":1,"b":"f8458f"}],"peek-cloppenburg":[{"r":"$","b":"073673"}],"telerik":[{"r":"$","b":"d8ee46"}],"4players":[{"r":"$","l":1,"b":"073673"}],"liveleak":[{"r":"$","l":1,"b":"c3043e"}],"sfr":[{"r":"$","b":"e24b2c"}],"ariva":[{"r":"$","l":1,"b":"d7011d"}],"huffingtonpost":[{"r":"$","l":1,"b":"006567"}],"randstad":[{"r":"$","b":"4592d8"}],"bahn":[{"r":"$","l":1,"b":"d7011d"}],"volksbank-ueberlingen":[{"r":"$","l":1,"b":"1747a6"}],"banken":[{"r":"$","b":"1747a6"}],"dhd24":[{"r":"$","b":"429abd"}],"ofm-tools":[{"r":"$","b":"c78e6d"}],"microsoftonline":[{"r":"$","l":1,"b":"e24b2c"}],"pietsmiet":[{"r":"$","b":"91d131"}],"tu-darmstadt":[{"r":"$","l":1,"b":"333333"}],"waz":[{"r":"$","l":1,"b":"d7011d"}],"jimdo":[{"r":"$","l":1,"b":"91d131"}],"wikiquote":[{"r":"$","b":"073673"}],"vevo":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-fulda":[{"r":"$","l":1,"b":"f9204c"}],"tinychat":[{"r":"$","b":"073673"}],"mtv":[{"r":"$","l":1,"b":"333333"}],"tvmovie":[{"r":"$","l":1,"b":"d7011d"}],"olx":[{"r":"$","b":"8a52a2"}],"stanford":[{"r":"$.edu","l":1,"b":"d7011d"}],"naslovi":[{"r":"$","b":"ff951d"}],"test":[{"r":"$","l":1,"b":"f97136"}],"zoover":[{"r":"$","b":"f97136"}],"kinogo":[{"r":"$","b":"333333"}],"rewe-group":[{"r":"$","l":1,"b":"666666"}],"kvv":[{"r":"$","b":"c3043e"}],"fcbayern":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-rottal-inn":[{"r":"$","l":1,"b":"f9204c"}],"sz-online":[{"r":"$","l":1,"b":"07613c"}],"ebog":[{"r":"$","b":"328c67"}],"costakreuzfahrten":[{"r":"$","b":"1747a6"}],"simfy":[{"r":"$","b":"5ea3f9"}],"battle":[{"r":"$","l":1,"b":"333333"}],"deutsche-wirtschafts-nachrichten":[{"r":"$","b":"eaeaea"}],"madmoizelle":[{"r":"$","b":"7bebf5"}],"giga":[{"r":"$","l":1,"b":"91d131"}],"tagesanzeiger":[{"r":"$","b":"429abd"}],"fon":[{"r":"$","b":"92dba4"}],"babygalerie24":[{"r":"$","b":"fb91ae"}],"myfreezoo":[{"r":"$","b":"d7011d"}],"bravo":[{"r":"$.com","l":1,"b":"c3043e"},{"r":"$","l":1,"b":"d7011d"}],"sparkasse-werl":[{"r":"$","l":1,"b":"f9204c"}],"sk-gaming":[{"r":"$","l":1,"b":"333333"}],"filezilla-project":[{"r":"$","b":"d7011d"}],"ou":[{"r":"$","l":1,"b":"333333"}],"paypal":[{"r":"$","l":1,"b":"073673"}],"apache":[{"r":"spark.$.org","l":1,"b":"f97136"}],"uni-muenchen":[{"r":"$","l":1,"b":"328c67"}],"change":[{"r":"$","b":"e24b2c"}],"buch":[{"r":"$","b":"d7011d"}],"pornhubgold":[{"r":"$","l":1,"b":"333333"}],"toom-baumarkt":[{"r":"$","b":"d7011d"}],"fbi":[{"r":"$","l":1,"b":"073673"}],"uci-kinowelt":[{"r":"$","l":1,"b":"fede07"}],"myvideo":[{"r":"$","l":1,"b":"333333"}],"live":[{"r":"$","l":1,"b":"4592d8"}],"translit-portal":[{"r":"$","b":"cccccc"}],"ga-online":[{"r":"$","l":1,"b":"4592d8"}],"irishtimes":[{"r":"$","l":1,"b":"333333"}],"die-linke":[{"r":"$","b":"d7011d"}],"ibm":[{"r":"$","l":1,"b":"4592d8"}],"car":[{"r":"$","b":"328c67"}],"hochzeitsplaza":[{"r":"$","b":"ffc802"}],"lieferservice":[{"r":"$","b":"ff951d"}],"tuifly":[{"r":"$","b":"fce951"}],"hu-berlin":[{"r":"$","l":1,"b":"073673"}],"spi":[{"r":"$","l":1,"b":"073673"}],"sparkasse-muensterland-ost":[{"r":"$","l":1,"b":"f9204c"}],"chio":[{"r":"$","b":"07613c"}],"spd":[{"r":"$","b":"e24b2c"}],"dis-ag":[{"r":"$","b":"c3043e"}],"motor-talk":[{"r":"$","l":1,"b":"073673"}],"lieferheld":[{"r":"$","l":1,"b":"d7011d"}],"aol":[{"r":"$","l":1,"b":"5ea3f9"}],"aok":[{"r":"$","b":"328c67"}],"divx":[{"r":"$","b":"7bebf5"}],"diply":[{"r":"$.com","l":1,"b":"073673"},{"r":"$","l":1,"b":"073673"}],"staedte-info":[{"r":"$","l":1,"b":"d7011d"}],"mallorca-homepage":[{"r":"$","b":"abc8e2"}],"die-abnehm-seite":[{"r":"$","b":"abc8e2"}],"kliniken":[{"r":"$","b":"07613c"}],"nickjr":[{"r":"$","l":1,"b":"ff951d"}],"indeed":[{"r":"$","l":1,"b":"1747a6"}],"einstieg":[{"r":"$","b":"4592d8"}],"light11":[{"r":"$","b":"eaeaea"}],"ruhrnachrichten":[{"r":"$","b":"4592d8"}],"gothaer":[{"r":"$","b":"006567"}],"stuttgarter-nachrichten":[{"r":"$","l":1,"b":"4592d8"}],"nox":[{"r":"$","b":"abc8e2"}],"noz":[{"r":"$","l":1,"b":"073673"}],"fastcompany":[{"r":"$","b":"333333"}],"rundschau-online":[{"r":"$","b":"4592d8"}],"wer-weiss-was":[{"r":"$","b":"333333"}],"goodreads":[{"r":"$","l":1,"b":"c78e6d"}],"ed":[{"r":"$.ac.uk","l":1,"b":"333333"}],"ea":[{"r":"$","l":1,"b":"333333"}],"engelbert-strauss":[{"r":"$","l":1,"b":"d7011d"}],"volksbank-lahr":[{"r":"$","l":1,"b":"1747a6"}],"aliexpress":[{"r":"$","l":1,"b":"e92207"}],"ey":[{"r":"$","l":1,"b":"999999"}],"ep":[{"r":"$","b":"d7011d"}],"space":[{"r":"$","b":"d7011d"}],"ktosexy":[{"r":"$","b":"ff951d"}],"on-online":[{"r":"$","b":"d7011d"}],"play4free":[{"r":"$","b":"07613c"}],"cars":[{"r":"$","b":"abc8e2"}],"lmu":[{"r":"$","l":1,"b":"328c67"}],"uni-tuebingen":[{"r":"$","l":1,"b":"d7011d"}],"fewo":[{"r":"$","b":"91d131"}],"sparkasse-luenen":[{"r":"$","l":1,"b":"f9204c"}],"xe":[{"r":"$","l":1,"b":"073673"}],"deutschebank":[{"r":"$","l":1,"b":"1747a6"}],"hespress":[{"r":"$","b":"1747a6"}],"jobpilot":[{"r":"$","b":"d7011d"}],"wuppertal":[{"r":"$","b":"c3043e"}],"moddb":[{"r":"$","b":"8c275f"}],"weltbild":[{"r":"$","l":1,"b":"d7011d"}],"tipico":[{"r":"$","l":1,"b":"c3043e"}],"pnp":[{"r":"$","t":"PP","b":"333333"}],"pnn":[{"r":"$","b":"d7011d"}],"studivz":[{"r":"$","b":"1747a6"}],"aamc":[{"r":"$","l":1,"b":"506bb8"}],"egun":[{"r":"$","b":"fede07"}],"ernstings-family":[{"r":"$","b":"d7011d"}],"talktalk":[{"r":"$","l":1,"b":"f8458f"}],"lulaonline":[{"r":"$","b":"f97136"}],"ntvspor":[{"r":"$","b":"e24b2c"}],"bmvi":[{"r":"$","b":"e24b2c"}],"deutsche-bank":[{"r":"$","l":1,"b":"1747a6"}],"merriam-webster":[{"r":"$","l":1,"b":"073673"}],"alditalk":[{"r":"$","l":1,"b":"1747a6"}],"rewe-dortmund":[{"r":"$","l":1,"b":"d7011d"}],"laola1":[{"r":"$","l":1,"b":"4592d8"}],"fanpop":[{"r":"$","l":1,"b":"2fc4fc"}],"deichmann":[{"r":"$","l":1,"b":"07613c"}],"wacken":[{"r":"$","b":"333333"}],"mitfahrgelegenheit":[{"r":"$","b":"d8ee46"}],"mainz":[{"r":"$","b":"073673"}],"beuth-hochschule":[{"r":"$","b":"7bebf5"}],"redtubes":[{"r":"$","l":1,"b":"333333"}],"mashable":[{"r":"$","l":1,"b":"2fc4fc"}],"7-zip":[{"r":"$","b":"333333"}],"bundeswehr-karriere":[{"r":"$","b":"1747a6"}],"only":[{"r":"$","b":"333333"}],"serienjunkies":[{"r":"$","l":1,"b":"c3043e"}],"theatlantic":[{"r":"$","l":1,"b":"333333"}],"quoka":[{"r":"$","l":1,"b":"4592d8"}],"kika":[{"r":"$","l":1,"b":"fce951"}],"fussballcup":[{"r":"$","b":"74d463"}],"planetromeo":[{"r":"$","l":1,"b":"1747a6"}],"bluewin":[{"r":"$","l":1,"b":"429abd"}],"contao":[{"r":"$","b":"f97136"}],"movieparkgermany":[{"r":"$","b":"1747a6"}],"sporx":[{"r":"$","b":"e24b2c"}],"kioskea":[{"r":"$","b":"d7011d"}],"all-inkl":[{"r":"$","l":1,"b":"c3043e"}],"cbsnews":[{"r":"$","l":1,"b":"333333"}],"zoll":[{"r":"$","b":"4592d8"}],"wetransfer":[{"r":"$","l":1,"b":"4592d8"}],"curvefever":[{"r":"$","l":1,"b":"333333"}],"zara":[{"r":"$","l":1,"b":"333333"}],"sis-handball":[{"r":"$","b":"92dba4"}],"stimme":[{"r":"$","b":"4592d8"}],"yugioh-wiki":[{"r":"$","b":"d7011d"}],"kwick":[{"r":"$","b":"f9204c"}],"hvb":[{"r":"$","l":1,"b":"d7011d"}],"hongkongdisneyland":[{"r":"$","l":1,"b":"333333"}],"tu-bs":[{"r":"$","l":1,"b":"c3043e"}],"zedge":[{"r":"$","l":1,"b":"333333"}],"movieweb":[{"r":"$","b":"8c275f"}],"eyeslipsface":[{"r":"$","b":"333333"}],"save":[{"r":"$","b":"fb91ae"}],"universal-music":[{"r":"$","l":1,"b":"333333"}],"mensa":[{"r":"$","b":"7bebf5"}],"informer":[{"r":"$","b":"ffc802"}],"bafin":[{"r":"$","b":"d7011d"}],"krone":[{"r":"$","l":1,"b":"d7011d"}],"aero":[{"r":"$","b":"fede07"}],"naspa":[{"r":"$","l":1,"b":"d7011d"}],"eis":[{"r":"$","b":"abc8e2"}],"realtotal":[{"r":"$","b":"07613c"}],"care2":[{"r":"$","b":"328c67"}],"redcoon":[{"r":"$","l":1,"b":"e24b2c"}],"pro-medienmagazin":[{"r":"$","l":1,"b":"d7011d"}],"verkehrsmittelvergleich":[{"r":"$","b":"ffc802"}],"tinyurl":[{"r":"$","b":"073673"}],"scpaderborn07":[{"r":"$","l":1,"b":"1747a6"}],"the-voice-of-germany":[{"r":"$","l":1,"b":"d7011d"}],"tlc":[{"r":"$","l":1,"b":"f9204c"}],"vooberlin":[{"r":"$","b":"cccccc"}],"ixquick":[{"r":"$","l":1,"b":"abc8e2"}],"motherless":[{"r":"$","l":1,"b":"333333"}],"ampya":[{"r":"$","b":"2fc4fc"}],"akademie":[{"r":"$","b":"91d131"}],"16bars":[{"r":"$","b":"c3043e"}],"spi0n":[{"r":"$","b":"d7011d"}],"dovoba":[{"r":"$","l":1,"b":"1747a6"}],"diepresse":[{"r":"$","b":"1747a6"}],"speed":[{"r":"$","b":"ffc802"}],"diziizle":[{"r":"$","b":"f97136"}],"yr":[{"r":"$","b":"4592d8"}],"lesechos":[{"r":"$","b":"c3043e"}],"prezi":[{"r":"$","b":"5267a2"}],"macwelt":[{"r":"$","b":"d7011d"}],"jobisjob":[{"r":"$","b":"ff951d"}],"amo":[{"r":"$","b":"d7011d"}],"interpals":[{"r":"$","b":"5ea3f9"}],"ams":[{"r":"$","l":1,"b":"1747a6"}],"hoeffner":[{"r":"$","b":"d7011d"}],"friseur":[{"r":"$","b":"333333"}],"superrtl":[{"r":"$","b":"ff951d"}],"sharp":[{"r":"$","b":"d7011d"}],"cisco":[{"r":"$","l":1,"b":"d7011d"}],"onlinefussballmanager":[{"r":"$","b":"5267a2"}],"cyberport":[{"r":"$","l":1,"b":"073673"}],"ruthe":[{"r":"$","b":"ff951d"}],"stylight":[{"r":"$","b":"8c275f"}],"klinikbewertungen":[{"r":"$","b":"abc8e2"}],"knowyourmeme":[{"r":"$","b":"073673"}],"rechtschreibpruefung24":[{"r":"$","b":"ff951d"}],"herthabsc":[{"r":"$","l":1,"b":"1747a6"}],"epson":[{"r":"$","b":"0b47bf"}],"volkswagen":[{"r":"$","l":1,"b":"5267a2"}],"nme":[{"r":"$","b":"d7011d"}],"zwickau":[{"r":"$","b":"c78e6d"}],"ospa":[{"r":"$","b":"d7011d"}],"agoda":[{"r":"$","b":"fb91ae"}],"goethe":[{"r":"$","b":"91d131"}],"office-discount":[{"r":"$","b":"fede07"}],"berliner-ensemble":[{"r":"$","l":1,"b":"333333"}],"hertz":[{"r":"$","b":"fede07"}],"los":[{"r":"$","b":"328c67"}],"eigene-ip":[{"r":"$","b":"abc8e2"}],"miniatur-wunderland":[{"r":"$","b":"07613c"}],"fraunhofer":[{"r":"$","l":1,"b":"50b1a2"}],"myhermes":[{"r":"$","l":1,"b":"429abd"}],"phonostar":[{"r":"$","b":"d7011d"}],"premierleague":[{"r":"$","l":1,"b":"073673"}],"tipp24":[{"r":"$","b":"d7011d"}],"sparkasse-mittelthueringen":[{"r":"$","l":1,"b":"f9204c"}],"dvdvideosoft":[{"r":"$","b":"fce951"}],"sparkasse-worms-alzey-ried":[{"r":"$","l":1,"b":"f9204c"}],"pr0gramm":[{"r":"$","l":1,"b":"e24b2c"}],"pixelio":[{"r":"$","b":"e24b2c"}],"ldlc":[{"r":"$","b":"073673"}],"nero":[{"r":"$","b":"333333"}],"deezer":[{"r":"$","l":1,"b":"333333"}],"akinator":[{"r":"$","b":"073673"}],"antenne":[{"r":"$","l":1,"b":"1747a6"}],"uni-saarland":[{"r":"$","l":1,"b":"1747a6"}],"hahasport":[{"r":"$","b":"07613c"}],"karlsruhe":[{"r":"$","b":"e24b2c"}],"tameteo":[{"r":"$","l":1,"b":"4592d8"}],"corel":[{"r":"$","b":"073673"}],"watchever":[{"r":"$","b":"ffc802"}],"uni-mainz":[{"r":"$","l":1,"b":"d7011d"}],"juraforum":[{"r":"$","b":"5267a2"}],"messe":[{"r":"$","b":"ffc802"}],"wikimapia":[{"r":"$","b":"e24b2c"}],"mp3":[{"r":"$","b":"073673"}],"infojobs":[{"r":"$","b":"073673"}],"metacritic":[{"r":"$","b":"073673"}],"ferienhaus":[{"r":"$","b":"d7011d"}],"deka":[{"r":"$","b":"fce951"}],"computerwoche":[{"r":"$","l":1,"b":"d7011d"}],"wmf":[{"r":"$","b":"333333"}],"skodacommunity":[{"r":"$","l":1,"b":"328c67"}],"lausitznews":[{"r":"$","b":"d7011d"}],"fielmann":[{"r":"$","b":"b3b3b3"}],"louis":[{"r":"$","b":"d7011d"}],"aboalarm":[{"r":"$","b":"abc8e2"}],"usatoday":[{"r":"$","l":1,"b":"2fc4fc"}],"clubic":[{"r":"$","b":"fb91ae"}],"instagram":[{"r":"$","l":1,"b":"333333"}],"zvg":[{"r":"$","b":"d7011d"}],"farming-simulator":[{"r":"$","b":"333333"}],"vw":[{"r":"$","l":1,"b":"5267a2"}],"gogle":[{"r":"$","b":"5267a2"}],"vidtomp3":[{"r":"$","b":"91d131"}],"investing":[{"r":"$","l":1,"b":"666666"}],"nudevista":[{"r":"$","l":1,"b":"1747a6"}],"sparkasse-wetzlar":[{"r":"$","l":1,"b":"f9204c"}],"theverge":[{"r":"$","l":1,"b":"ff5349"}],"answers":[{"r":"$","l":1,"b":"4592d8"}],"hugendubel":[{"r":"$","b":"e24b2c"}],"real":[{"r":"$","l":1,"b":"d7011d"}],"ase":[{"r":"$","b":"ffc802"}],"family":[{"r":"$","b":"abc8e2"}],"singelboersen-test":[{"r":"$","b":"d7011d"}],"ask":[{"r":"$","l":1,"b":"d7011d"}],"famili":[{"r":"$","b":"f36e8d"}],"toys":[{"r":"$","b":"ff951d"}],"gronkh":[{"r":"$","b":"ff951d"}],"kopp-verlag":[{"r":"$","l":1,"b":"d7011d"}],"cubestat":[{"r":"$","l":1,"b":"333333"}],"meineip":[{"r":"$","b":"5267a2"}],"cewe-print":[{"r":"$","b":"d7011d"}],"kalaydo":[{"r":"$","b":"e24b2c"}],"spielothek":[{"r":"$","b":"e24b2c"}],"eulerhermes":[{"r":"$","b":"4592d8"}],"wildstar-online":[{"r":"$","b":"073673"}],"fc-moto":[{"r":"$","b":"fede07"}],"urgeschmack":[{"r":"$","b":"c3043e"}],"fanfiction":[{"r":"$","b":"fb91ae"}],"emp-online":[{"r":"$","b":"d7011d"}],"mytischtennis":[{"r":"$","b":"4592d8"}],"ning":[{"r":"$","l":1,"b":"91d131"}],"justjared":[{"r":"$","b":"d8ee46"}],"celebritynetworth":[{"r":"$","b":"006567"}],"history":[{"r":"$","l":1,"b":"ffc802"}],"hhv":[{"r":"$","l":1,"b":"333333"}],"magento":[{"r":"$","b":"f97136"}],"walmart":[{"r":"$","l":1,"b":"5ea3f9"}],"swr3":[{"r":"$","b":"073673"}],"clarks":[{"r":"$","b":"333333"}],"ft":[{"r":"$","l":1,"b":"c78e6d"}],"stupidedia":[{"r":"$","b":"333333"}],"breitbart":[{"r":"$","l":1,"b":"f97136"}],"trier":[{"r":"$","b":"d7011d"}],"fm":[{"r":"$","b":"073673"}],"a":[{"r":"$","b":"92dba4"}],"cnnturk":[{"r":"$","l":1,"b":"d7011d"}],"comdirect":[{"r":"$","l":1,"b":"ff951d"}],"ffn":[{"r":"$","l":1,"b":"f9204c"}],"ffh":[{"r":"$","l":1,"b":"91d131"}],"fff":[{"r":"$","b":"d7011d"}],"mcdonalds":[{"r":"$","l":1,"b":"ffc802"}],"weser-kurier":[{"r":"$","b":"1747a6"}],"dummies":[{"r":"$","b":"fce951"}],"uni-potsdam":[{"r":"$","l":1,"b":"073673"}],"dailymail":[{"r":"$","l":1,"b":"1747a6"}],"gute-filme-sehen":[{"r":"$","b":"e24b2c"}],"fool":[{"r":"$","b":"c78e6d"}],"food":[{"r":"$","b":"fce951"}],"mt":[{"r":"$","b":"ffc802"}],"uni-erlangen":[{"r":"$","l":1,"b":"4592d8"}],"aktion-mensch":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-neuss":[{"r":"$","l":1,"b":"f9204c"}],"druckerzubehoer":[{"r":"$","b":"d7011d"}],"literaturcafe":[{"r":"$","b":"fce951"}],"railnation":[{"r":"$","b":"d7011d"}],"sheego":[{"r":"$","b":"d7011d"}],"bleacherreport":[{"r":"$","l":1,"b":"999999"}],"hartgeld":[{"r":"$","b":"ffc802"}],"bessermitfahren":[{"r":"$","b":"e24b2c"}],"douglas":[{"r":"$","l":1,"b":"43bdd9"}],"fc-union-berlin":[{"r":"$","l":1,"b":"e92207"}],"postbank":[{"r":"$","l":1,"b":"ffc802"}],"ass":[{"r":"$","b":"2fc4fc"}],"ast":[{"r":"$","b":"429abd"}],"basf":[{"r":"$","l":1,"b":"91d131"}],"base":[{"r":"$","l":1,"b":"07613c"}],"journaldesfemmes":[{"r":"$","b":"8c275f"}],"sat1spiele":[{"r":"$","b":"c3043e"}],"tatort-fundus":[{"r":"$","b":"0b47bf"}],"drupal":[{"r":"$","b":"4592d8"}],"send4free":[{"r":"$","b":"8a52a2"}],"baby-und-familie":[{"r":"$","b":"43bdd9"}],"dir":[{"r":"$","b":"ffc802"}],"fc-erzgebirge":[{"r":"$","b":"8a52a2"}],"meinfoto":[{"r":"$","b":"91d131"}],"drive2day":[{"r":"$","b":"ff951d"}],"bunte":[{"r":"$","l":1,"b":"d7011d"}],"eventim":[{"r":"$","l":1,"b":"ffc802"}],"klarmobil":[{"r":"$","b":"91d131"}],"uni-muenster":[{"r":"$","l":1,"b":"333333"}],"14model":[{"r":"$","b":"c78e6d"}],"berliner-stadtplan":[{"r":"$","b":"fb91ae"}],"cnnchile":[{"r":"$","l":1,"b":"d7011d"}],"supertoinette":[{"r":"$","b":"073673"}],"elo":[{"r":"$","b":"5267a2"}],"ultras":[{"r":"$","b":"e24b2c"}],"ltur":[{"r":"$","l":1,"b":"f8458f"}],"soliver":[{"r":"$","l":1,"b":"d7011d"}],"123recht":[{"r":"$","b":"50b1a2"}],"tube8":[{"r":"$","l":1,"b":"333333"}],"iber":[{"r":"$","b":"fce951"}],"kas":[{"r":"$","b":"073673"}],"mobile":[{"r":"$","l":1,"b":"f97136"}],"tube2mp3":[{"r":"$","b":"073673"}],"tamaris":[{"r":"$","b":"333333"}],"moneycontrol":[{"r":"$","l":1,"b":"073673"}],"denios":[{"r":"$","b":"5267a2"}],"liebeskind-berlin":[{"r":"$","b":"c78e6d"}],"pole-emploi":[{"r":"$","b":"d7011d"}],"stuttgart-tourist":[{"r":"$","b":"4592d8"}],"ikon":[{"r":"$","b":"4592d8"}],"stargames":[{"r":"$","b":"1747a6"}],"alfaromeo":[{"r":"$","l":1,"b":"073673"}],"erochatcommunity":[{"r":"$","b":"8c275f"}],"erfahrungen":[{"r":"$","b":"91d131"}],"terrafemina":[{"r":"$","b":"d7011d"}],"lolnexus":[{"r":"$","l":1,"b":"4592d8"}],"eishockeynews":[{"r":"$","b":"2fc4fc"}],"php":[{"r":"$","b":"5267a2"}],"sparkasse-wuppertal":[{"r":"$","l":1,"b":"f9204c"}],"habbo":[{"r":"$","l":1,"b":"fede07"}],"kooora":[{"r":"$","b":"fce951"}],"katholisch":[{"r":"$","b":"d7011d"}],"preissuchmaschine":[{"r":"$","b":"fede07"}],"ranker":[{"r":"$","b":"073673"}],"isfree":[{"r":"$","b":"92dba4"}],"wdrmaus":[{"r":"$","b":"5267a2"}],"youtube-mp3":[{"r":"$","l":1,"b":"5267a2"}],"augsburger-allgemeine":[{"r":"$","b":"d7011d"}],"chilloutzone":[{"r":"$","b":"f97136"}],"diesiedleronline":[{"r":"$","b":"ffc802"}],"medion":[{"r":"$","l":1,"b":"073673"}],"linux":[{"r":"$","l":1,"b":"333333"}],"czin":[{"r":"$","b":"c3043e"}],"teamviewer":[{"r":"$","b":"2fc4fc"}],"spieletipps":[{"r":"$","l":1,"b":"f97136"}],"gmx":[{"r":"$","l":1,"b":"91d131"}],"reise":[{"r":"$","b":"1747a6"}],"adb":[{"r":"$","l":1,"b":"333333"}],"floraprima":[{"r":"$","b":"07613c"}],"hollywoodreporter":[{"r":"$","b":"e24b2c"}],"vhv":[{"r":"$","l":1,"b":"ffc802"}],"turf-fr":[{"r":"$","b":"328c67"}],"heute":[{"r":"$.at","b":"f9204c"},{"r":"$","l":1,"b":"ff951d"}],"dpreview":[{"r":"$","b":"5267a2"}],"schriftarten":[{"r":"$","b":"333333"}],"fÄ±rstrowsports":[{"r":"$","b":"333333"}],"smartekarte":[{"r":"$","b":"8c275f"}],"jpc":[{"r":"$","l":1,"b":"333333"}],"videolan":[{"r":"$","b":"ff951d"}],"seniorbook":[{"r":"$","b":"ff951d"}],"handelsblatt":[{"r":"$","l":1,"b":"ff951d"}],"epochtimes":[{"r":"$","b":"4592d8"}],"gimp":[{"r":"$","b":"f97136"}],"ettlingen":[{"r":"$","b":"d7011d"}],"joeys":[{"r":"$","b":"d7011d"}],"univie":[{"r":"$","b":"5267a2"}],"zzstream":[{"r":"$","b":"c3043e"}],"wertpapier-forum":[{"r":"$","b":"073673"}],"sparkasse-bodensee":[{"r":"$","l":1,"b":"f9204c"}],"weltkarte":[{"r":"$","b":"abc8e2"}],"easports":[{"r":"$","l":1,"b":"1747a6"}],"gsp":[{"r":"$","b":"d7011d"}],"manutd":[{"r":"$","l":1,"b":"d7011d"}],"minecraft":[{"r":"$","l":1,"b":"666666"}],"earthtimes":[{"r":"$","l":1,"b":"91d131"}],"osthessen-zeitung":[{"r":"$","b":"c3043e"}],"ab-in-den-urlaub-deals":[{"r":"$","b":"1747a6"}],"ghanaweb":[{"r":"$","b":"e24b2c"}],"kreiszeitung":[{"r":"$","b":"1747a6"}],"wirecardbank":[{"r":"$","b":"1747a6"}],"cineplex":[{"r":"$.com","l":1,"b":"333333"},{"r":"$.de","l":1,"b":"4592d8"},{"r":"$","b":"073673"}],"weihenstephan":[{"r":"$","b":"073673"}],"uni-due":[{"r":"$","b":"1747a6"}],"marca":[{"r":"$","b":"e24b2c"}],"uhrzeit":[{"r":"$","b":"429abd"}],"efa":[{"r":"$","b":"073673"}],"tour-magazin":[{"r":"$","b":"1747a6"}],"computerbild":[{"r":"$","l":1,"b":"d7011d"}],"mexx":[{"r":"$","l":1,"b":"333333"}],"boardreader":[{"r":"$","b":"d7011d"}],"allgemeine-zeitung":[{"r":"$","l":1,"b":"073673"}],"vesti":[{"r":"$","b":"073673"}],"cinemaxx":[{"r":"$.ru","b":"1747a6"},{"r":"$","l":1,"b":"8c275f"}],"schoener-wohnen":[{"r":"$","b":"d7011d"}],"trends":[{"r":"$","b":"333333"}],"coupedumonde2014":[{"r":"$","b":"d7011d"}],"koeln":[{"r":"$","b":"1747a6"}],"rub":[{"r":"$","l":1,"b":"073673"}],"ruf":[{"r":"$","b":"abc8e2"}],"ruv":[{"r":"$","l":1,"b":"4592d8"}],"roblox":[{"r":"$","l":1,"b":"d7011d"}],"starflash":[{"r":"$","b":"2fc4fc"}],"tui":[{"r":"$","l":1,"b":"e92207"}],"serverfault":[{"r":"$","b":"8c275f"}],"browsergames":[{"r":"$","l":1,"b":"ff951d"}],"hvb-harz":[{"r":"$","l":1,"b":"0b47bf"}],"nydailynews":[{"r":"$","b":"c3043e"}],"tiberiumalliances":[{"r":"$","b":"07613c"}],"zelluloid":[{"r":"$","b":"07613c"}],"wer-kennt-wen":[{"r":"$","b":"5ea3f9"}],"seznam":[{"r":"$","b":"e24b2c"}],"wg-gesucht":[{"r":"$","l":1,"b":"ff951d"}],"planetradio":[{"r":"$","l":1,"b":"d7011d"}],"espnfc":[{"r":"$","b":"328c67"}],"teslamotors":[{"r":"$","b":"cccccc"}],"pwc":[{"r":"$","l":1,"b":"ff951d"}],"sparda":[{"r":"$","l":1,"b":"1747a6"}],"urbandictionary":[{"r":"$","l":1,"b":"429abd"}],"fdp":[{"r":"$","b":"fede07"}],"vrbank-fl-sl":[{"r":"$","b":"5267a2"}],"studentjob":[{"r":"$","b":"ff951d"}],"din-formate":[{"r":"$","b":"abc8e2"}],"wuerth":[{"r":"$","b":"d7011d"}],"sfgame":[{"r":"$","l":1,"b":"530773"}],"polygon":[{"r":"$","l":1,"b":"8c275f"}],"mygully":[{"r":"$","b":"333333"}],"bmas":[{"r":"$","b":"fede07"}],"taringa":[{"r":"$","b":"1747a6"}],"techcrunch":[{"r":"$","l":1,"b":"74d463"}],"bodensee":[{"r":"$","b":"d7011d"}],"depot-online":[{"r":"$","l":1,"b":"07613c"}],"weightwatchers":[{"r":"$","l":1,"b":"1747a6"}],"youtube":[{"r":"$","l":1,"b":"d7011d"}],"jazzradio":[{"r":"$","l":1,"b":"e92207"}],"dvb":[{"r":"$","b":"333333"}],"casio-europe":[{"r":"$","b":"073673"}],"thomascook":[{"r":"$","b":"ffc802"}],"sportschau":[{"r":"$","l":1,"b":"4592d8"}],"gr":[{"r":"$","b":"073673"}],"postdirekt":[{"r":"$","b":"ffc802"}],"feratel":[{"r":"$","b":"5267a2"}],"modhoster":[{"r":"$","l":1,"b":"ff951d"}],"ge":[{"r":"$","l":1,"b":"5ea3f9"}],"airliners":[{"r":"$","b":"1747a6"}],"go":[{"r":"abcfamily.$","l":1,"b":"e24b2c"},{"r":"disney.$","l":1,"b":"073673"},{"r":"oscar.$","l":1,"b":"ffc802"},{"r":"abc.$","l":1,"b":"333333"},{"r":"abcnews.$","l":1,"b":"073673"},{"r":"espn.$","l":1,"b":"c3043e"},{"r":"watchdisneyxd.$","l":1,"b":"91d131"},{"r":"secsports.$","l":1,"b":"1747a6"},{"r":"$.de","l":1,"b":"91d131"},{"r":"$.co","l":1,"b":"f97136"},{"r":"$","b":"333333"}],"gm":[{"r":"$","l":1,"b":"1747a6"}],"uni-freiburg":[{"r":"$","l":1,"b":"1747a6"}],"staemme":[{"r":"$","b":"429abd"}],"gi":[{"r":"$","b":"073673"}],"hi5":[{"r":"$","b":"ff951d"}],"hse24":[{"r":"$","b":"f97136"}],"cewe-fotobuch":[{"r":"$","b":"d7011d"}],"fly":[{"r":"$","b":"5267a2"}],"nno":[{"r":"$","b":"5ea3f9"}],"mvg-mainz":[{"r":"$","b":"073673"}],"facebook":[{"r":"$","l":1,"b":"5267a2"}],"metric-conversions":[{"r":"$","b":"eaeaea"}],"photovoltaikforum":[{"r":"$","b":"5267a2"}],"tripsdrill":[{"r":"$","b":"f97136"}],"vfl-bochum":[{"r":"$","l":1,"b":"1747a6"}],"clever-tanken":[{"r":"$","b":"073673"}],"kle-point":[{"r":"$","b":"5ea3f9"}],"sparkasse-nuernberg":[{"r":"$","l":1,"b":"f9204c"}],"shutterstock":[{"r":"$","b":"e24b2c"}],"ze":[{"r":"$","l":1,"b":"ff951d"}],"zf":[{"r":"$","b":"5267a2"}],"1001spiele":[{"r":"$","b":"d7011d"}],"ilfattoquotidiano":[{"r":"$","b":"d7011d"}],"zu":[{"r":"$","b":"d7011d"}],"skispringen":[{"r":"$","b":"1747a6"}],"shopwahl":[{"r":"$","l":1,"b":"fede07"}],"textilwirtschaft":[{"r":"$","l":1,"b":"c3043e"}],"cortexpower":[{"r":"$","b":"0b47bf"}],"eminem":[{"r":"$.com","l":1,"b":"333333"}],"parfumo":[{"r":"$","b":"abc8e2"}],"vbb":[{"r":"$","b":"d7011d"}],"gamersfirst":[{"r":"$","b":"4592d8"}],"zumba":[{"r":"$","l":1,"b":"ffc802"}],"wizzair":[{"r":"$","l":1,"b":"f8458f"}],"schiesser":[{"r":"$","b":"333333"}],"911tabs":[{"r":"$","b":"fce951"}],"austria":[{"r":"$","b":"d7011d"}],"bugmenot":[{"r":"$","b":"d7011d"}],"gameone":[{"r":"$","b":"c78e6d"}],"lotto24":[{"r":"$","b":"d7011d"}],"bfv":[{"r":"$","l":1,"b":"1747a6"}],"1tv":[{"r":"$","b":"43bdd9"}],"consors":[{"r":"$","b":"328c67"}],"barnesandnoble":[{"r":"$","l":1,"b":"07613c"}],"medpex":[{"r":"$","b":"d7011d"}],"dfbnet":[{"r":"$","b":"328c67"}],"ecosiawatch":[{"r":"$","b":"333333"}],"snipesshop":[{"r":"$","b":"f97136"}],"kuechengoetter":[{"r":"$","l":1,"b":"ff951d"}],"fuer-gruender":[{"r":"$","b":"4592d8"}],"bankofscotland":[{"r":"$","b":"073673"}],"hotmail":[{"r":"$","l":1,"b":"4592d8"}],"similarsitesearch":[{"r":"$","b":"5267a2"}],"tu-dortmund":[{"r":"$","l":1,"b":"91d131"}],"1-2-3":[{"r":"$","b":"328c67"}],"6play":[{"r":"$","b":"429abd"}],"unitymediakabelbwforum":[{"r":"$","b":"4592d8"}],"ikariam":[{"r":"$","b":"fce951"}],"voelkner":[{"r":"$","l":1,"b":"d8ee46"}],"bigfm":[{"r":"$","l":1,"b":"ff951d"}],"meinvz":[{"r":"$","l":1,"b":"f97136"}],"abendzeitung-muenchen":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-holstein":[{"r":"$","l":1,"b":"f9204c"}],"moviepilot":[{"r":"$.de","l":1,"b":"073673"},{"r":"$","l":1,"b":"333333"}],"tvinfo":[{"r":"$","l":1,"b":"506bb8"}],"vfl-wolfsburg":[{"r":"$","l":1,"b":"74d463"}],"softpedia":[{"r":"$","b":"073673"}],"def-shop":[{"r":"$","b":"333333"}],"pixel":[{"r":"$","b":"006567"}],"rockpapershotgun":[{"r":"$","b":"333333"}],"breuninger":[{"r":"$","l":1,"b":"d7011d"}],"baden-wuerttemberg":[{"r":"$","b":"fede07"}],"globo":[{"r":"$","l":1,"b":"0b47bf"}],"hafen-hamburg":[{"r":"$","b":"d7011d"}],"carls-sims-3-guide":[{"r":"$","b":"073673"}],"debeka":[{"r":"$","b":"429abd"}],"tagesschau":[{"r":"$","l":1,"b":"4592d8"}],"stagram":[{"r":"$","b":"999999"}],"aetv":[{"r":"$","l":1,"b":"333333"}],"immowelt":[{"r":"$","l":1,"b":"ffc802"}],"eco":[{"r":"$","b":"ff951d"}],"waschbaer":[{"r":"$","b":"073673"}],"calvinklein":[{"r":"$","l":1,"b":"333333"}],"gameforge":[{"r":"$","l":1,"b":"4592d8"}],"hellweg":[{"r":"$","b":"d7011d"}],"volksbank-wuemme-wieste":[{"r":"$","l":1,"b":"1747a6"}],"volksbank-phd":[{"r":"$","l":1,"b":"1747a6"}],"autohus":[{"r":"$","b":"9077e3"}],"sparwelt":[{"r":"$","b":"5267a2"}],"blogger":[{"r":"$","l":1,"b":"ff951d"}],"hundeseite":[{"r":"$","b":"92dba4"}],"titanshare":[{"r":"$","b":"c78e6d"}],"rs2":[{"r":"$","l":1,"b":"1747a6"}],"11freunde":[{"r":"$","b":"333333"}],"papystreaming":[{"r":"$","b":"92dba4"}],"ef-magazin":[{"r":"$","b":"1747a6"}],"behance":[{"r":"$","b":"333333"}],"fashionforhome":[{"r":"$","b":"d7011d"}],"handball-world":[{"r":"$","b":"c3043e"}],"selgros":[{"r":"$","l":1,"b":"d7011d"}],"rsh":[{"r":"$","l":1,"b":"1747a6"}],"radiobremen":[{"r":"$","l":1,"b":"ff951d"}],"felgenoutlet":[{"r":"$","b":"d7011d"}],"joop":[{"r":"$","l":1,"b":"1747a6"}],"godmode-trader":[{"r":"$","b":"ffc802"}],"01basma":[{"r":"$","l":1,"b":"333333"}],"edeka":[{"r":"$","l":1,"b":"fede07"}],"viki":[{"r":"$","b":"429abd"}],"super-spanisch":[{"r":"$","b":"ffc802"}],"wieistmeineip":[{"r":"$","b":"073673"}],"brand":[{"r":"$","l":1,"b":"333333"}],"rojadirecta":[{"r":"$","b":"d7011d"}],"nytimes":[{"r":"$","l":1,"b":"333333"}],"landsend":[{"r":"$","b":"073673"}],"hiphop":[{"r":"$","b":"e24b2c"}],"achilles":[{"r":"$","b":"9077e3"}],"spielaffe":[{"r":"$","l":1,"b":"4592d8"}],"urb":[{"r":"$","b":"333333"}],"manga":[{"r":"$","b":"e24b2c"}],"ingd":[{"r":"$","l":1,"b":"333333"}],"wirtschaft":[{"r":"$","l":1,"b":"d7011d"}],"belkin":[{"r":"$","l":1,"b":"333333"}],"thedailyshow":[{"r":"$","b":"073673"}],"ikarus":[{"r":"$","b":"333333"}],"ceneo":[{"r":"$","b":"ff951d"}],"gamyun":[{"r":"$","b":"ff951d"}],"herrenausstatter":[{"r":"$","b":"073673"}],"rambler":[{"r":"$","l":1,"b":"d7011d"}],"michigan":[{"r":"$","l":1,"b":"fede07"}],"flashgames":[{"r":"$","b":"c3043e"}],"nachdenkseiten":[{"r":"$","b":"d7011d"}],"shopping":[{"r":"$","b":"8c275f"}],"shz":[{"r":"$","l":1,"b":"2fc4fc"}],"steuerlinks":[{"r":"$","b":"fce951"}],"geschaeftsideen":[{"r":"$","b":"91d131"}],"dpd":[{"r":"$","l":1,"b":"d7011d"}],"nbcolympics":[{"r":"$","l":1,"b":"073673"}],"roosterteeth":[{"r":"$","b":"073673"}],"einmalige-erlebnisse":[{"r":"$","b":"c3043e"}],"oldenburg":[{"r":"$","b":"1747a6"}],"fitnessfreaks":[{"r":"$","b":"bf638e"}],"partnersuche":[{"r":"$","b":"c3043e"}],"wetpaint":[{"r":"$","b":"d8ee46"}],"cacaoweb":[{"r":"$","b":"d7011d"}],"tripadvisor":[{"r":"$","l":1,"b":"74d463"}],"key":[{"r":"$","b":"f97136"}],"einsfestival":[{"r":"$","b":"d7011d"}],"admin":[{"r":"$","b":"506bb8"}],"swarovski":[{"r":"$","b":"b3b3b3"}],"burberry":[{"r":"$","l":1,"b":"333333"}],"dab-bank":[{"r":"$","l":1,"b":"333333"}],"euroclix":[{"r":"$","b":"ff951d"}],"dortmund":[{"r":"$","l":1,"b":"333333"}],"reverso":[{"r":"$","b":"1747a6"}],"tv":[{"r":"$","b":"abc8e2"}],"yac":[{"r":"$","b":"2fc4fc"}],"vinci":[{"r":"$","b":"e24b2c"}],"kickz":[{"r":"$","b":"333333"}],"otz":[{"r":"$","b":"d7011d"}],"hamburg":[{"r":"$","l":1,"b":"d7011d"}],"winrar":[{"r":"$","b":"8a52a2"}],"garmin":[{"r":"$","l":1,"b":"4592d8"}],"fehmarn":[{"r":"$","b":"abc8e2"}],"lieferando":[{"r":"$","l":1,"b":"ff951d"}],"examiner":[{"r":"$","l":1,"b":"333333"}],"demo":[{"r":"$","b":"8c275f"}],"techspot":[{"r":"$","b":"1747a6"}],"allrecipes":[{"r":"$","l":1,"b":"ff5349"}],"formblitz":[{"r":"$","b":"d7011d"}],"uni-siegen":[{"r":"$","l":1,"b":"0b47bf"}],"brinkmann-du":[{"r":"$","b":"0b47bf"}],"askubuntu":[{"r":"$","b":"e24b2c"}],"w3schools":[{"r":"$","l":1,"b":"91d131"}],"ehorses":[{"r":"$","b":"d7011d"}],"zinsen-berechnen":[{"r":"$","b":"d7011d"}],"sparkasse-werne":[{"r":"$","l":1,"b":"f9204c"}],"lrworld":[{"r":"$","b":"c78e6d"}],"sparda-bw":[{"r":"$","l":1,"b":"1747a6"}],"verivox":[{"r":"$","l":1,"b":"ff951d"}],"scienceblogs":[{"r":"$","b":"eaeaea"}],"sparkassenversicherung":[{"r":"$","l":1,"b":"f9204c"}],"teenvogue":[{"r":"$","l":1,"b":"f8458f"}],"welt":[{"r":"$","l":1,"b":"429abd"}],"mathworks":[{"r":"$","b":"1747a6"}],"lecker":[{"r":"$","l":1,"b":"43bdd9"}],"kotte-zeller":[{"r":"$","b":"fede07"}],"rue89":[{"r":"$","b":"e24b2c"}],"veromoda":[{"r":"$","l":1,"b":"333333"}],"daskochrezept":[{"r":"$","l":1,"b":"91d131"}],"passion":[{"r":"$","b":"073673"}],"gehalt":[{"r":"$","b":"073673"}],"fashionid":[{"r":"$","l":1,"b":"333333"}],"sparda-sw":[{"r":"$","l":1,"b":"1747a6"}],"twitter":[{"r":"$","l":1,"b":"2fc4fc"}],"gelbe-seiten":[{"r":"$","b":"fede07"}],"self":[{"r":"$","l":1,"b":"333333"}],"sherdog":[{"r":"$","b":"333333"}],"virgilio":[{"r":"$","b":"f97136"}],"sparkasse-karlsruhe-ettlingen":[{"r":"$","l":1,"b":"f9204c"}],"1001freefonts":[{"r":"$","b":"ffc802"}],"musik-sammler":[{"r":"$","b":"333333"}],"ubs":[{"r":"$","l":1,"b":"d7011d"}],"digitec":[{"r":"$.ch","l":1,"b":"1747a6"}],"toggo":[{"r":"$","l":1,"b":"ff951d"}],"lokalisten":[{"r":"$","b":"91d131"}],"stackexchange":[{"r":"$","l":1,"b":"1747a6"}],"akkushop":[{"r":"$","b":"073673"}],"versteigerungspool":[{"r":"$","b":"92dba4"}],"makeuseof":[{"r":"$","b":"4592d8"}],"schlafwelt":[{"r":"$","b":"abc8e2"}],"posterjack":[{"r":"$","b":"eaeaea"}],"toner-dumping":[{"r":"$","b":"073673"}],"imperial":[{"r":"$","l":1,"b":"073673"}],"n-tv":[{"r":"$","l":1,"b":"c3043e"}],"counter-strike":[{"r":"$","l":1,"b":"333333"}],"uni-jena":[{"r":"$","l":1,"b":"333333"}],"pg":[{"r":"$","b":"1747a6"}],"eam":[{"r":"$","b":"7bebf5"}],"hp":[{"r":"$","l":1,"b":"4592d8"}],"battlefieldheroes":[{"r":"$","b":"07613c"}],"klick":[{"r":"$","b":"07613c"}],"hm":[{"r":"$.edu","l":1,"b":"d7011d"},{"r":"$","l":1,"b":"d7011d"}],"feedly":[{"r":"$","b":"91d131"}],"swr":[{"r":"$","l":1,"b":"073673"}],"babycenter":[{"r":"$","l":1,"b":"91d131"}],"oebel":[{"r":"$","b":"fede07"}],"dertour":[{"r":"$","b":"5267a2"}],"autozeitung":[{"r":"$","b":"d7011d"}],"restposten":[{"r":"$","b":"abc8e2"}],"opera":[{"r":"$","b":"d7011d"}],"bittorrent":[{"r":"$","b":"5267a2"}],"hallo-eltern":[{"r":"$","b":"1747a6"}],"zuliefermesse":[{"r":"$","l":1,"b":"1747a6"}],"altervista":[{"r":"$","b":"1747a6"}],"hamburg-tourism":[{"r":"$","b":"073673"}],"meteox":[{"r":"$","b":"073673"}],"hna":[{"r":"$","l":1,"b":"d7011d"}],"samsung":[{"r":"$","l":1,"b":"1747a6"}],"5vorflug":[{"r":"$","b":"1747a6"}],"foreignpolicy":[{"r":"$","l":1,"b":"e92207"}],"minijob-zentrale":[{"r":"$","b":"f97136"}],"frankfurt":[{"r":"$","b":"d7011d"}],"promobil":[{"r":"$","b":"fede07"}],"surfmusik":[{"r":"$","b":"073673"}],"sportal":[{"r":"$","l":1,"b":"ff951d"}],"pressekatalog":[{"r":"$","b":"f97136"}],"skill7":[{"r":"$","b":"073673"}],"fussballdaten":[{"r":"$","b":"07613c"}],"ecamp":[{"r":"$","b":"4592d8"}],"cnet":[{"r":"$","l":1,"b":"d7011d"}],"technikboerse":[{"r":"$","b":"07613c"}],"jackjones":[{"r":"$","b":"333333"}],"bgbau":[{"r":"$","l":1,"b":"1747a6"}],"aachen":[{"r":"$","b":"50b1a2"}],"wikihow":[{"r":"$","b":"4592d8"}],"stayfriends":[{"r":"$","b":"ff951d"}],"force":[{"r":"$","b":"0b47bf"}],"aldi-sued":[{"r":"$","l":1,"b":"1747a6"}],"howtogeek":[{"r":"$","b":"073673"}],"moviemaze":[{"r":"$","b":"073673"}],"travian":[{"r":"$","b":"c3043e"}],"new":[{"r":"$","b":"91d131"}],"einslive":[{"r":"$","l":1,"b":"f8458f"}],"brooksrunning":[{"r":"$","b":"4592d8"}],"titanfall":[{"r":"$","b":"006567"}],"fashionette":[{"r":"$","b":"333333"}],"drk":[{"r":"$","b":"d7011d"}],"thefreedictionary":[{"r":"$","l":1,"b":"50b1a2"}],"chessbase":[{"r":"$","b":"d7011d"}],"rossmann":[{"r":"$","l":1,"b":"d7011d"}],"lwl":[{"r":"$","b":"073673"}],"mein-schoener-garten":[{"r":"$","b":"91d131"}],"steine":[{"r":"$","b":"073673"}],"freeletics":[{"r":"$","b":"333333"}],"grillfuerst":[{"r":"$","b":"8c275f"}],"solitairekostenlos":[{"r":"$","b":"328c67"}],"berlin":[{"r":"$","l":1,"b":"e92207"}],"gutscheinpony":[{"r":"$","b":"c78e6d"}],"wordreference":[{"r":"$","b":"ff951d"}],"solarmovie":[{"r":"$","b":"ffc802"}],"freemail":[{"r":"$.hu","l":1,"b":"4592d8"},{"r":"$","l":1,"b":"ffc802"}],"picdumps":[{"r":"$","b":"c78e6d"}],"zitate-online":[{"r":"$","b":"fce951"}],"skype":[{"r":"$","l":1,"b":"2fc4fc"}],"limango":[{"r":"$","l":1,"b":"91d131"}],"pogo":[{"r":"$","b":"d7011d"}],"tennis-point":[{"r":"$","b":"fce951"}],"post":[{"r":"$.de","l":1,"b":"fede07"},{"r":"$.ch","l":1,"b":"ffc802"},{"r":"$.at","l":1,"b":"fede07"},{"r":"$","b":"fede07"}],"panasonic":[{"r":"$","b":"333333"}],"hartware":[{"r":"$","l":1,"b":"5ea3f9"}],"jack-wolfskin":[{"r":"$","l":1,"b":"ffc802"}],"sat1":[{"r":"$","l":1,"b":"8c275f"}],"gesetze-im-internet":[{"r":"$","l":1,"b":"abc8e2"}],"vfb":[{"r":"$","l":1,"b":"e92207"}],"urlaubspiraten":[{"r":"$","b":"8c275f"}],"fifa":[{"r":"$","l":1,"b":"5267a2"}],"versatel":[{"r":"$","b":"d7011d"}],"blume2000":[{"r":"$","b":"7bebf5"}],"showtvnet":[{"r":"$","b":"abc8e2"}],"gruenderszene":[{"r":"$","l":1,"b":"5267a2"}],"apotheken":[{"r":"$","b":"d7011d"}],"thieme":[{"r":"$","b":"1747a6"}],"betten":[{"r":"$","b":"d7011d"}],"sz":[{"r":"$","l":1,"b":"333333"}],"unity3d":[{"r":"$","b":"333333"}],"sparda-bank-hamburg":[{"r":"$","b":"7bebf5"}],"academics":[{"r":"$","b":"073673"}],"edreams":[{"r":"$","b":"1747a6"}],"leben-und-erziehen":[{"r":"$","b":"d7011d"}],"suedkurier":[{"r":"$","l":1,"b":"333333"}],"bonn":[{"r":"$","b":"073673"}],"sido":[{"r":"$","b":"07613c"}],"mangafox":[{"r":"$","b":"d8ee46"}],"adobe":[{"r":"$","l":1,"b":"d7011d"}],"aida":[{"r":"$","l":1,"b":"d7011d"}],"oeffentlicher-dienst":[{"r":"$","l":1,"b":"43bdd9"}],"reisebus24":[{"r":"$","b":"fce951"}],"bauhaus":[{"r":"$.de","b":"d7011d"},{"r":"$","l":1,"b":"d7011d"}],"kiel":[{"r":"$","b":"333333"}],"foto":[{"r":"$","b":"91d131"}],"convertworld":[{"r":"$","b":"1747a6"}],"uni-bayreuth":[{"r":"$","b":"74d463"}],"spark-die-klassische-band":[{"r":"$","l":1,"b":"333333"}],"otels":[{"r":"$","b":"4592d8"}],"startv":[{"r":"$","b":"d7011d"}],"ustream":[{"r":"$","b":"4592d8"}],"duesseldorf-international":[{"r":"$","b":"5267a2"}],"ist":[{"r":"$","b":"abc8e2"}],"isi":[{"r":"$","b":"5267a2"}],"rakuten":[{"r":"$","b":"d7011d"}],"gebrueder-goetz":[{"r":"$","b":"d7011d"}],"preis":[{"r":"$","b":"abc8e2"}],"kfzteile24":[{"r":"$","b":"abc8e2"}],"chaturbate":[{"r":"$","l":1,"b":"ffc802"}],"hood":[{"r":"$","b":"fce951"}],"sparkasse-geseke":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-re":[{"r":"$","l":1,"b":"f9204c"}],"formel1":[{"r":"$","b":"d7011d"}],"lefigaro":[{"r":"$","b":"5267a2"}],"nosto":[{"r":"$","b":"db5c8c"}],"zoosk":[{"r":"$","b":"d8ee46"}],"digg":[{"r":"$","b":"5267a2"}],"frankonia":[{"r":"$","b":"91d131"}],"frankfurter-sparkasse":[{"r":"$","l":1,"b":"f9204c"}],"comfortplan":[{"r":"$","b":"4592d8"}],"mini":[{"r":"$","l":1,"b":"333333"}],"worldlingo":[{"r":"$","b":"429abd"}],"daserste":[{"r":"$","l":1,"b":"073673"}],"sparkasse-bgl":[{"r":"$","l":1,"b":"f9204c"}],"autotrader":[{"r":"$.co.uk","l":1,"b":"506bb8"}],"alibi":[{"r":"$","b":"e24b2c"}],"sparkasse-hagen":[{"r":"$","l":1,"b":"f9204c"}],"lohnsteuer-kompakt":[{"r":"$","b":"91d131"}],"billiger-telefonieren":[{"r":"$","b":"d7011d"}],"wiesbadener-kurier":[{"r":"$","b":"c3043e"}],"studentenwerk-berlin":[{"r":"$","b":"8a52a2"}],"hornbach":[{"r":"$","l":1,"b":"ff951d"}],"usnews":[{"r":"$","l":1,"b":"4592d8"}],"nichtlustig":[{"r":"$","b":"d7011d"}],"dow":[{"r":"$","b":"073673"}],"lyrics":[{"r":"$","b":"f9204c"}],"7trends":[{"r":"$","b":"333333"}],"piriform":[{"r":"$","b":"d8ee46"}],"toshiba":[{"r":"$","b":"d7011d"}],"commentcamarche":[{"r":"$","b":"d7011d"}],"beepworld":[{"r":"$","b":"fce951"}],"immoweb":[{"r":"$","b":"5267a2"}],"20minutes":[{"r":"$","b":"abc8e2"}],"intersport-wohlleben":[{"r":"$","b":"07613c"}],"infobebes":[{"r":"$","b":"91d131"}],"sskm":[{"r":"$","l":1,"b":"d7011d"}],"sska":[{"r":"$","b":"d7011d"}],"saturn":[{"r":"$","l":1,"b":"333333"}],"runnersworld":[{"r":"$","b":"1747a6"}],"bab":[{"r":"$","l":1,"b":"4592d8"}],"translit":[{"r":"$","b":"ff951d"}],"bal":[{"r":"$","b":"5267a2"}],"playstation":[{"r":"$","l":1,"b":"333333"}],"reference":[{"r":"dictionary.$","l":1,"b":"4592d8"},{"r":"$","l":1,"b":"328c67"}],"vbs-hobby":[{"r":"$","b":"073673"}],"haberturk":[{"r":"$","l":1,"b":"c3043e"}],"peta":[{"r":"$","b":"1747a6"}],"tauschticket":[{"r":"$","b":"4592d8"}],"reddit":[{"r":"$","l":1,"b":"5ea3f9"}],"foxchannel":[{"r":"$","l":1,"b":"ff951d"}],"we":[{"r":"$","b":"e24b2c"}],"tyre24":[{"r":"$","b":"e24b2c"}],"filmifullizle":[{"r":"$","b":"073673"}],"rhein-zeitung":[{"r":"$","b":"333333"}],"rabodirect":[{"r":"$","b":"1747a6"}],"gelbeseiten":[{"r":"$","b":"fede07"}],"kmcomputer":[{"r":"$","b":"91d131"}],"general-anzeiger-bonn":[{"r":"$","b":"333333"}],"kanald":[{"r":"$","b":"4592d8"}],"etwasverpasst":[{"r":"$","b":"429abd"}],"apodiscounter":[{"r":"$","b":"d7011d"}],"sam":[{"r":"$","b":"92dba4"}],"notebooksbilliger":[{"r":"$","b":"f97136"}],"hamburg-magazin":[{"r":"$","b":"d7011d"}],"consolewars":[{"r":"$","b":"c3043e"}],"wiesbaden":[{"r":"$","b":"333333"}],"windowsphone":[{"r":"$","l":1,"b":"8c275f"}],"usps":[{"r":"$","l":1,"b":"4592d8"}],"in":[{"r":"$","l":1,"b":"d7011d"}],"creditplus":[{"r":"$","b":"328c67"}],"hansa":[{"r":"$","b":"ffc802"}],"sap":[{"r":"$","l":1,"b":"506bb8"}],"kizi":[{"r":"$","b":"e24b2c"}],"uni-frankfurt":[{"r":"$","l":1,"b":"4592d8"}],"justanswer":[{"r":"$","b":"429abd"}],"elle":[{"r":"$","l":1,"b":"073673"}],"kit":[{"r":"$","l":1,"b":"50b1a2"}],"kik":[{"r":"$","l":1,"b":"d7011d"}],"bloomberg":[{"r":"$","l":1,"b":"1747a6"}],"goalunited":[{"r":"$","b":"d7011d"}],"thesims":[{"r":"$","b":"0b47bf"}],"werder":[{"r":"$","l":1,"b":"07613c"}],"serialu":[{"r":"$","b":"429abd"}],"forever21":[{"r":"$","b":"333333"}],"pandora":[{"r":"$","l":1,"b":"5267a2"}],"freeonlinegames":[{"r":"$","b":"d7011d"}],"prosiebenmaxx":[{"r":"$","b":"333333"}],"edsheeran":[{"r":"$","b":"333333"}],"agof":[{"r":"$","b":"2fc4fc"}],"torfabrik":[{"r":"$","b":"1747a6"}],"eatsmarter":[{"r":"$","b":"f97136"}],"malwarebytes":[{"r":"$","b":"5ea3f9"}],"whatsapp":[{"r":"$","l":1,"b":"74d463"}],"w3snoop":[{"r":"$","l":1,"b":"2fc4fc"}],"parship":[{"r":"$","l":1,"b":"d7011d"}],"spigo":[{"r":"$","b":"fce951"}],"opo":[{"r":"$","b":"c3043e"}],"apotal":[{"r":"$","b":"e24b2c"}],"atÄ‘he":[{"r":"$","b":"333333"}],"vdk":[{"r":"$","b":"5267a2"}],"centos":[{"r":"$","b":"8c275f"}],"toyota":[{"r":"$","l":1,"b":"d7011d"}],"wwe":[{"r":"$","l":1,"b":"666666"}],"webcamgalore":[{"r":"$","b":"07613c"}],"msv-duisburg":[{"r":"$","l":1,"b":"506bb8"}],"printplanet":[{"r":"$","b":"92dba4"}],"promod":[{"r":"$","b":"333333"}],"huber":[{"r":"$","b":"073673"}],"agame":[{"r":"$","b":"5267a2"}],"luftlinie":[{"r":"$","b":"abc8e2"}],"local24":[{"r":"$","b":"1747a6"}],"zum":[{"r":"$","b":"43bdd9"}],"bukkit":[{"r":"$","b":"4592d8"}],"orsay":[{"r":"$","b":"c3043e"}],"futbol24":[{"r":"$","b":"abc8e2"}],"slysoft":[{"r":"$","b":"f9204c"}],"tivi":[{"r":"$","b":"fce951"}],"usembassy":[{"r":"$","b":"073673"}],"form":[{"r":"$","b":"fce951"}],"spike":[{"r":"$","l":1,"b":"333333"}],"ford":[{"r":"$","l":1,"b":"073673"}],"sparkasse-alk":[{"r":"$","l":1,"b":"f9204c"}],"ethz":[{"r":"$","l":1,"b":"073673"}],"rsa-sachsen":[{"r":"$","l":1,"b":"2fc4fc"}],"camelactive":[{"r":"$","l":1,"b":"fede07"}],"saarbruecker-zeitung":[{"r":"$","b":"1747a6"}],"purepeople":[{"r":"$","b":"333333"}],"a10":[{"r":"$","l":1,"b":"ff951d"}],"gametrailers":[{"r":"$","b":"073673"}],"op-online":[{"r":"$","l":1,"b":"4592d8"}],"kreissparkasse-boerde":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-bochum":[{"r":"$","l":1,"b":"f9204c"}],"telecolumbus":[{"r":"$","b":"f97136"}],"stylefruits":[{"r":"$","b":"bf638e"}],"nextag":[{"r":"$","l":1,"b":"91d131"}],"uni-bonn":[{"r":"$","l":1,"b":"073673"}],"markt":[{"r":"$","b":"e24b2c"}],"foursquare":[{"r":"$","l":1,"b":"f36e8d"}],"fahrrad":[{"r":"$","b":"d7011d"}],"excitingcommerce":[{"r":"$","b":"fede07"}],"liveticker":[{"r":"$","b":"328c67"}],"schulferien":[{"r":"$","l":1,"b":"f97136"}],"myimg":[{"r":"$","b":"abc8e2"}],"din":[{"r":"$","b":"d7011d"}],"presseportal":[{"r":"$","b":"7bebf5"}],"amctv":[{"r":"$","l":1,"b":"fede07"}],"starwars":[{"r":"$","l":1,"b":"333333"}],"rollingstone":[{"r":"$","l":1,"b":"d7011d"}],"codeproject":[{"r":"$","b":"ff951d"}],"konsumgoettinnen":[{"r":"$","b":"fb91ae"}],"congstar":[{"r":"$","l":1,"b":"333333"}],"bosch-professional":[{"r":"$","l":1,"b":"d7011d"}],"cdiscount":[{"r":"$","b":"1747a6"}],"guardian":[{"r":"$","b":"1747a6"}],"topnews":[{"r":"$","b":"fce951"}],"box":[{"r":"$","b":"74d463"}],"hbo":[{"r":"$","l":1,"b":"333333"}],"autobid":[{"r":"$","b":"073673"}],"bol":[{"r":"$","b":"4592d8"}],"bod":[{"r":"$","b":"07613c"}],"hbr":[{"r":"$","b":"d7011d"}],"easyjet":[{"r":"$","l":1,"b":"f97136"}],"myip":[{"r":"$","b":"5ea3f9"}],"kayak":[{"r":"$","l":1,"b":"ff951d"}],"hotels":[{"r":"$","l":1,"b":"e92207"}],"bayern":[{"r":"anl.$","l":1,"b":"ffc802"},{"r":"$","l":1,"b":"ffc802"}],"turkbase":[{"r":"$","b":"abc8e2"}],"gamestop":[{"r":"$","b":"d7011d"}],"blablacar":[{"r":"$","l":1,"b":"4592d8"}],"deutsches-architektur-forum":[{"r":"$","b":"1747a6"}],"autoplenum":[{"r":"$","b":"8c275f"}],"mytheresa":[{"r":"$","b":"333333"}],"ult":[{"r":"$","b":"ffc802"}],"vianavigo":[{"r":"$","b":"4592d8"}],"zvg-portal":[{"r":"$","b":"328c67"}],"el-kurier":[{"r":"$","l":1,"b":"d7011d"}],"ping":[{"r":"$","b":"073673"}],"footballitarin":[{"r":"$","b":"07613c"}],"promotionbasis":[{"r":"$","b":"5267a2"}],"asmc":[{"r":"$","b":"c3043e"}],"auto-motor-und-sport":[{"r":"$","l":1,"b":"d7011d"}],"map":[{"r":"$","l":1,"b":"666666"}],"mar":[{"r":"$","b":"e24b2c"}],"berlinlinienbus":[{"r":"$","b":"d7011d"}],"you-fm":[{"r":"$","l":1,"b":"006567"}],"mag":[{"r":"$","b":"073673"}],"docma":[{"r":"$","b":"c78e6d"}],"ene":[{"r":"$","b":"f97136"}],"mundodeportivo":[{"r":"$","b":"fce951"}],"vw-dresden":[{"r":"$","l":1,"b":"5267a2"}],"atlasformen":[{"r":"$","b":"c3043e"}],"mail":[{"r":"$.ru","l":1,"b":"5ea3f9"},{"r":"$.de","l":1,"b":"abc8e2"},{"r":"$","l":1,"b":"1747a6"}],"boywankers":[{"r":"$","b":"abc8e2"}],"blauer":[{"r":"$","l":1,"b":"333333"}],"goldseiten":[{"r":"$","b":"ffc802"}],"bildderfrau":[{"r":"$","l":1,"b":"d7011d"}],"onedio":[{"r":"$","b":"4592d8"}],"kkh":[{"r":"$","l":1,"b":"073673"}],"lehmanns":[{"r":"$","b":"333333"}],"deutschland":[{"r":"$","l":1,"b":"666666"}],"gamesaktuell":[{"r":"$","b":"d7011d"}],"engadget":[{"r":"$","l":1,"b":"43bdd9"}],"bayer04":[{"r":"$","l":1,"b":"e92207"}],"qvc":[{"r":"$","l":1,"b":"50b1a2"}],"kimeta":[{"r":"$","b":"91d131"}],"weh":[{"r":"$","b":"c78e6d"}],"kleiderkreisel":[{"r":"$","l":1,"b":"50b1a2"}],"skygo":[{"r":"$","l":1,"b":"333333"}],"gira":[{"r":"$","b":"333333"}],"royalgames":[{"r":"$","b":"91d131"}],"eltern":[{"r":"$","b":"8c275f"}],"vebidoo":[{"r":"$","l":1,"b":"333333"}],"horoscope":[{"r":"$","b":"c78e6d"}],"poco":[{"r":"$","l":1,"b":"e92207"}],"kikisweb":[{"r":"$","b":"ffc802"}],"pizzeria":[{"r":"$","b":"abc8e2"}],"mt-online":[{"r":"$","b":"ffc802"}],"monster":[{"r":"$","l":1,"b":"8a52a2"}],"autoteilemann":[{"r":"$","b":"429abd"}],"spiel":[{"r":"$","b":"43bdd9"}],"bayer":[{"r":"$","l":1,"b":"429abd"}],"orf":[{"r":"digital.$.at","l":1,"b":"d7011d"},{"r":"tvthek.$.at","l":1,"b":"d7011d"},{"r":"oe3.$","l":1,"b":"d7011d"},{"r":"$","l":1,"b":"d7011d"}],"eurogamer":[{"r":"$","l":1,"b":"1747a6"}],"mein-deal":[{"r":"$","b":"ff951d"}],"jobscout24":[{"r":"$","b":"073673"}],"firstpost":[{"r":"$","b":"d7011d"}],"netmoms":[{"r":"$","b":"8c275f"}],"wiki":[{"r":"$","b":"d7011d"}],"hutshopping":[{"r":"$","b":"abc8e2"}],"wimdu":[{"r":"$","b":"1747a6"}],"bayreuth":[{"r":"$","b":"74d463"}],"apotheke":[{"r":"$","b":"5267a2"}],"stuttgarter-zeitung":[{"r":"$","l":1,"b":"333333"}],"memo":[{"r":"$","b":"e24b2c"}],"heinze":[{"r":"$","b":"d7011d"}],"migros":[{"r":"$","l":1,"b":"ff951d"}],"mmnews":[{"r":"$","b":"c3043e"}],"bw-bank":[{"r":"$","l":1,"b":"073673"}],"integralrechner":[{"r":"$","b":"abc8e2"}],"lich":[{"r":"$","b":"2fc4fc"}],"formula1":[{"r":"$","b":"e24b2c"}],"staufenbiel":[{"r":"$","b":"d7011d"}],"uni-halle":[{"r":"$","l":1,"b":"333333"}],"stellenanzeigen":[{"r":"$","b":"5267a2"}],"bmi-rechner":[{"r":"$","l":1,"b":"ffc802"}],"kath":[{"r":"$","b":"073673"}],"livetv":[{"r":"$","l":1,"b":"d7011d"}],"checkdomain":[{"r":"$","b":"4592d8"}],"zim-bmwi":[{"r":"$","l":1,"b":"333333"}],"canna":[{"r":"$","l":1,"b":"006567"}],"drudgereport":[{"r":"$","l":1,"b":"333333"}],"turkishairlines":[{"r":"$","l":1,"b":"e92207"}],"fddb":[{"r":"$","l":1,"b":"1747a6"}],"kn-online":[{"r":"$","l":1,"b":"d7011d"}],"brick-force":[{"r":"$","b":"ff951d"}],"commerzbank":[{"r":"$","l":1,"b":"ffc802"}],"bibel-online":[{"r":"$","b":"d7011d"}],"synonym":[{"r":"$","b":"07613c"}],"smsgott":[{"r":"$","b":"333333"}],"youjizz":[{"r":"$.co","l":1,"b":"333333"},{"r":"$.com","l":1,"b":"333333"},{"r":"$.vc","l":1,"b":"530773"},{"r":"$.ws","l":1,"b":"333333"},{"r":"$","l":1,"b":"d7011d"}],"licht":[{"r":"$","b":"d7011d"}],"klassenarbeiten":[{"r":"$","b":"abc8e2"}],"munich-airport":[{"r":"$","b":"9077e3"}],"eporner":[{"r":"$","t":"eP","c":"0","b":"d7011d"}],"sanego":[{"r":"$","l":1,"b":"74d463"}],"flypgs":[{"r":"$","b":"e24b2c"}],"mopo":[{"r":"$","l":1,"b":"d7011d"}],"dict":[{"r":"$","l":1,"b":"ff951d"}],"fotobuch":[{"r":"$","b":"d7011d"}],"onlinetvrecorder":[{"r":"$","b":"abc8e2"}],"parfumdreams":[{"r":"$","b":"fb91ae"}],"brazzer":[{"r":"$","b":"ffc802"}],"seat":[{"r":"$","l":1,"b":"d7011d"}],"jobs":[{"r":"$","b":"abc8e2"}],"puma":[{"r":"$","l":1,"b":"d7011d"}],"nestle":[{"r":"$","l":1,"b":"999999"}],"fc-koeln":[{"r":"$","l":1,"b":"e92207"}],"jw":[{"r":"$","l":1,"b":"333333"}],"tuv":[{"r":"$","b":"4592d8"}],"chacha":[{"r":"$","b":"5267a2"}],"tum":[{"r":"$","l":1,"b":"506bb8"}],"dkv":[{"r":"$","b":"006567"}],"ln-online":[{"r":"$","l":1,"b":"429abd"}],"xt-commerce":[{"r":"$","b":"ff951d"}],"meinpaket":[{"r":"$","b":"ffc802"}],"dkb":[{"r":"$","l":1,"b":"4592d8"}],"daten":[{"r":"$","b":"ff951d"}],"lascana":[{"r":"$","b":"8a52a2"}],"arte":[{"r":"$","l":1,"b":"f97136"}],"vogue":[{"r":"$","l":1,"b":"333333"}],"adfc":[{"r":"$","l":1,"b":"073673"}],"bmw":[{"r":"$","l":1,"b":"333333"}],"weebly":[{"r":"$","b":"ff951d"}],"comma-fashion":[{"r":"$","b":"eaeaea"}],"wunschkennzeichen-reservieren":[{"r":"$","b":"92dba4"}],"pap":[{"r":"$","b":"4592d8"}],"mangahead":[{"r":"$","b":"ff951d"}],"photoshop":[{"r":"$","b":"2fc4fc"}],"comedycentral":[{"r":"$","l":1,"b":"2fc4fc"}],"landwirt":[{"r":"$","b":"328c67"}],"essen-und-trinken":[{"r":"$","l":1,"b":"d7011d"}],"frag-mutti":[{"r":"$","b":"fce951"}],"ffffound":[{"r":"$","b":"333333"}],"bundesfinanzministerium":[{"r":"$","b":"d7011d"}],"frankenpost":[{"r":"$","b":"d7011d"}],"derstandard":[{"r":"$","l":1,"b":"073673"}],"sparkasse-heilbronn":[{"r":"$","l":1,"b":"f9204c"}],"payback":[{"r":"$","l":1,"b":"1747a6"}],"quelle":[{"r":"$","l":1,"b":"073673"}],"asos":[{"r":"$","l":1,"b":"333333"}],"xbox":[{"r":"$","b":"91d131"}],"potsdam":[{"r":"$","b":"333333"}],"moz":[{"r":"$","b":"91d131"}],"dlang":[{"r":"$","l":1,"b":"c3043e"}],"teamspeak":[{"r":"$","b":"5267a2"}],"googlemail":[{"r":"$","l":1,"b":"f9204c"}],"moo":[{"r":"$","l":1,"b":"328c67"}],"mog":[{"r":"$","b":"073673"}],"amway":[{"r":"$","l":1,"b":"073673"}],"wyborcza":[{"r":"$","b":"f9204c"}],"mehr-tanken":[{"r":"$","b":"429abd"}],"wowhead":[{"r":"$","b":"d7011d"}],"ing-diba":[{"r":"$","l":1,"b":"f97136"}],"gls-group":[{"r":"$","l":1,"b":"073673"}],"sunriseavenue":[{"r":"$","b":"d7011d"}],"playmobil":[{"r":"$","b":"2fc4fc"}],"profi":[{"r":"$","b":"abc8e2"}],"windows":[{"r":"$","l":1,"b":"5ea3f9"}],"lotto":[{"r":"$","l":1,"b":"ffc802"}],"abercrombie":[{"r":"$","b":"333333"}],"thunderbird-mail":[{"r":"$","b":"073673"}],"beka":[{"r":"$","b":"429abd"}],"matratzen-concord":[{"r":"$","b":"d7011d"}],"mappy":[{"r":"$","b":"073673"}],"allianz":[{"r":"$","l":1,"b":"073673"}],"tf1":[{"r":"$","b":"e24b2c"}],"fahrinfo-berlin":[{"r":"$","b":"fede07"}],"impressionen":[{"r":"$","b":"333333"}],"smosh":[{"r":"$","b":"c78e6d"}],"hueber":[{"r":"$","b":"d7011d"}],"suzuki":[{"r":"$","b":"c3043e"}],"vh1":[{"r":"$","l":1,"b":"8a52a2"}],"gravis":[{"r":"$","b":"91d131"}],"art-magazin":[{"r":"$","l":1,"b":"e92207"}],"uni-kiel":[{"r":"$","l":1,"b":"333333"}],"shoutcast":[{"r":"$","b":"ffc802"}],"fanatik":[{"r":"$","b":"d7011d"}],"karnevalswierts":[{"r":"$","b":"d7011d"}],"e":[{"r":"$","b":"006567"}],"myimmo":[{"r":"$","b":"fce951"}],"refinery29":[{"r":"$","l":1,"b":"333333"}],"host-unlimited":[{"r":"$","b":"c3043e"}],"gamesradar":[{"r":"$","l":1,"b":"666666"}],"file":[{"r":"$","b":"073673"}],"bmf":[{"r":"$","l":1,"b":"d7011d"}],"zalando":[{"r":"$","l":1,"b":"f97136"}],"pferdemarkt":[{"r":"$","b":"e24b2c"}],"prettynailshop24":[{"r":"$","b":"8c275f"}],"searchenginejournal":[{"r":"$","b":"91d131"}],"sto":[{"r":"$","b":"d7011d"}],"moenchengladbach":[{"r":"$","b":"d7011d"}],"alltours-reisecenter":[{"r":"$","b":"d7011d"}],"dropbox":[{"r":"$","l":1,"b":"5ea3f9"}],"boesner":[{"r":"$","l":1,"b":"328c67"}],"vistaprint":[{"r":"$","b":"5267a2"}],"winzip":[{"r":"$","b":"fede07"}],"kinox":[{"r":"$","l":1,"b":"073673"}],"lucky-bike":[{"r":"$","b":"328c67"}],"sparkasse-passau":[{"r":"$","l":1,"b":"f9204c"}],"ipla":[{"r":"$","b":"91d131"}],"aerztezeitung":[{"r":"$","l":1,"b":"073673"}],"monsterzeug":[{"r":"$","b":"f97136"}],"baidu":[{"r":"$","l":1,"b":"1747a6"}],"dailymotion":[{"r":"$","l":1,"b":"5267a2"}],"billig":[{"r":"$","b":"328c67"}],"falk":[{"r":"$","l":1,"b":"d7011d"}],"metin2wiki":[{"r":"$","b":"073673"}],"scout":[{"r":"$","b":"8c275f"}],"stage-entertainment":[{"r":"$","b":"d7011d"}],"wsj":[{"r":"$","l":1,"b":"333333"}],"clubpenguin":[{"r":"$","b":"1747a6"}],"unric":[{"r":"$","b":"abc8e2"}],"nik":[{"r":"$","b":"4592d8"}],"ingdiba":[{"r":"$","l":1,"b":"f97136"}],"foxnews":[{"r":"insider.$","l":1,"b":"333333"},{"r":"$","l":1,"b":"073673"}],"gazetekeyfi":[{"r":"$","b":"ff951d"}],"burger":[{"r":"$","b":"5267a2"}],"abc":[{"r":"$","b":"bf638e"}],"marketwatch":[{"r":"$","l":1,"b":"328c67"}],"reservix":[{"r":"$","b":"ff951d"}],"abo":[{"r":"$","b":"91d131"}],"uni-giessen":[{"r":"$","l":1,"b":"4592d8"}],"autoteile-guenstig":[{"r":"$","b":"d7011d"}],"teufel":[{"r":"$","b":"e24b2c"}],"public":[{"r":"$","b":"d7011d"}],"search":[{"r":"$","l":1,"b":"333333"}],"freenet":[{"r":"$","l":1,"b":"91d131"}],"milka":[{"r":"$","l":1,"b":"8a52a2"}],"sparda-b":[{"r":"$","l":1,"b":"1747a6"}],"airport":[{"r":"$","b":"4592d8"}],"sparda-m":[{"r":"$","b":"1747a6"}],"weeb":[{"r":"$","b":"073673"}],"ling":[{"r":"$","b":"006567"}],"tchatche":[{"r":"$","b":"d7011d"}],"testberichte":[{"r":"$","b":"f97136"}],"digitalfernsehen":[{"r":"$","b":"333333"}],"twt":[{"r":"$","b":"8c275f"}],"sskduesseldorf":[{"r":"$","b":"d7011d"}],"motorsport-total":[{"r":"$","b":"e24b2c"}],"dayzmod":[{"r":"$","b":"333333"}],"myfreefarm":[{"r":"$","l":1,"b":"ffc802"}],"fluxfm":[{"r":"$","l":1,"b":"fede07"}],"outerstats":[{"r":"$","b":"5ea3f9"}],"blau":[{"r":"$","b":"4592d8"}],"mozilla":[{"r":"$","l":1,"b":"e24b2c"}],"sparkasse-rheine":[{"r":"$","l":1,"b":"f9204c"}],"finanznachrichten":[{"r":"$","l":1,"b":"c3043e"}],"der":[{"r":"$","l":1,"b":"d7011d"}],"sparkpeople":[{"r":"$","l":1,"b":"1747a6"}],"del":[{"r":"$","b":"c3043e"}],"urbia":[{"r":"$","l":1,"b":"f97136"}],"dee":[{"r":"$","b":"fce951"}],"yourfone":[{"r":"$","b":"bf638e"}],"geeksaresexy":[{"r":"$","b":"eaeaea"}],"societegenerale":[{"r":"$","b":"e24b2c"}],"startpagina":[{"r":"$","l":1,"b":"ff951d"}],"businessinsider":[{"r":"$","l":1,"b":"006567"}],"duesseldorf":[{"r":"$","b":"d7011d"}],"yellowpages":[{"r":"$","b":"fce951"}],"ulm":[{"r":"$","b":"8c275f"}],"billiger-mietwagen":[{"r":"$","b":"fce951"}],"bayernwelle":[{"r":"$.de","l":1,"b":"073673"}],"worum":[{"r":"$","b":"07613c"}],"greek-movies":[{"r":"$","b":"d7011d"}],"transfermarkt":[{"r":"$","l":1,"b":"073673"}],"elster":[{"r":"$","l":1,"b":"073673"}],"wwwgoogle":[{"r":"$","l":1,"b":"5ea3f9"}],"heizoel24":[{"r":"$","b":"328c67"}],"travel24":[{"r":"$","b":"1747a6"}],"gametwist":[{"r":"$","b":"429abd"}],"sonymobile":[{"r":"$","l":1,"b":"333333"}],"fupa":[{"r":"$","l":1,"b":"073673"}],"taschenkaufhaus":[{"r":"$","b":"c3043e"}],"dnes":[{"r":"$","b":"d7011d"}],"basteln-gestalten":[{"r":"$","b":"d8ee46"}],"fantasy":[{"r":"$","l":1,"b":"d7011d"}],"vesti-online":[{"r":"$","b":"073673"}],"zweirad-stadler":[{"r":"$","b":"fce951"}],"designmadeingermany":[{"r":"$","b":"333333"}],"energy":[{"r":"$.ch","l":1,"b":"d7011d"},{"r":"$","l":1,"b":"d7011d"}],"connect":[{"r":"$","b":"e24b2c"}],"americanexpress":[{"r":"$","l":1,"b":"1747a6"}],"charles-voegele":[{"r":"$","l":1,"b":"530773"}],"prinz":[{"r":"$","b":"e24b2c"}],"print":[{"r":"$","b":"f97136"}],"99designs":[{"r":"$","b":"e24b2c"}],"musicstore":[{"r":"$","b":"d7011d"}],"derhandel":[{"r":"$","b":"d7011d"}],"gayromeo":[{"r":"$","l":1,"b":"2fc4fc"}],"hermes":[{"r":"$","l":1,"b":"f97136"}],"groops":[{"r":"$","b":"f97136"}],"teltarif":[{"r":"$","b":"50b1a2"}],"nbcsports":[{"r":"profootballtalk.$","l":1,"b":"333333"},{"r":"$","l":1,"b":"333333"}],"netzclub":[{"r":"$","b":"8a52a2"}],"urlaubsguru":[{"r":"$","l":1,"b":"fede07"}],"schleswig-holstein":[{"r":"$","b":"ffc802"}],"ipaddress":[{"r":"$","t":"IP","b":"5ea3f9"}],"mainpost":[{"r":"$","l":1,"b":"1747a6"}],"rundfunkbeitrag":[{"r":"$","b":"006567"}],"sparkasse-landshut":[{"r":"$","l":1,"b":"f9204c"}],"ozap":[{"r":"$","b":"073673"}],"livestream":[{"r":"$","b":"d7011d"}],"etsy":[{"r":"$","l":1,"b":"f97136"}],"b":[{"r":"$","b":"5267a2"}],"mydays":[{"r":"$","b":"c3043e"}],"horizont":[{"r":"$","b":"1747a6"}],"favicon":[{"r":"$","b":"abc8e2"}],"kostenlosspielen":[{"r":"$","b":"4592d8"}],"netbank":[{"r":"$","b":"1747a6"}],"voxnow":[{"r":"$","l":1,"b":"333333"}],"jungefreiheit":[{"r":"$","b":"fb91ae"}],"goldentigercasino":[{"r":"$","b":"fede07"}],"strassenverkehrsamt":[{"r":"$","b":"91d131"}],"kp":[{"r":"$","b":"d7011d"}],"whatismyip":[{"r":"$","b":"5267a2"}],"weber":[{"r":"$","b":"333333"}],"1und1":[{"r":"$","l":1,"b":"073673"}],"eveonline":[{"r":"$","b":"006567"}],"thefa":[{"r":"$","l":1,"b":"333333"}],"gehaltsvergleich":[{"r":"$","b":"1747a6"}],"express":[{"r":"$.co.uk","l":1,"b":"e92207"},{"r":"$.com.pk","b":"666666"},{"r":"$.com","b":"333333"},{"r":"$","l":1,"b":"d7011d"}],"jameda":[{"r":"$","l":1,"b":"91d131"}],"playm":[{"r":"$","b":"abc8e2"}],"oddset":[{"r":"$","l":1,"b":"d7011d"}],"lesinrocks":[{"r":"$","b":"f97136"}],"posterxxl":[{"r":"$","l":1,"b":"91d131"}],"berliner-sparkasse":[{"r":"$","l":1,"b":"f9204c"}],"schnaeppchenfuchs":[{"r":"$","b":"ff951d"}],"seekingalpha":[{"r":"$","b":"c3043e"}],"care-energy":[{"r":"$","b":"073673"}],"my-klein-toys":[{"r":"$","l":1,"b":"ffc802"}],"vw-jahreswagen":[{"r":"$","l":1,"b":"5267a2"}],"expert":[{"r":"$","b":"f97136"}],"radikal":[{"r":"$","b":"5267a2"}],"petobel":[{"r":"$","b":"328c67"}],"kijiji":[{"r":"$","l":1,"b":"073673"}],"moodle":[{"r":"$","l":1,"b":"ff951d"}],"ika":[{"r":"$","b":"fce951"}],"europcar":[{"r":"$","b":"fede07"}],"spielkarussell":[{"r":"$","b":"abc8e2"}],"modelkartei":[{"r":"$","b":"5ea3f9"}],"klick-tipp":[{"r":"$","b":"91d131"}],"braunschweiger-zeitung":[{"r":"$","l":1,"b":"fede07"}],"fan2":[{"r":"$","b":"8a52a2"}],"rag":[{"r":"$","b":"006567"}],"leifiphysik":[{"r":"$","b":"073673"}],"android-hilfe":[{"r":"$","b":"4592d8"}],"volksbankwfsz":[{"r":"$","l":1,"b":"1747a6"}],"iloxx":[{"r":"$","b":"ffc802"}],"secret":[{"r":"$","b":"073673"}],"sparkasse-offenburg":[{"r":"$","l":1,"b":"f9204c"}],"allmovie":[{"r":"$","b":"c3043e"}],"weheartit":[{"r":"$","l":1,"b":"f36e8d"}],"motogp":[{"r":"$","b":"d7011d"}],"bild":[{"r":"$","l":1,"b":"d7011d"}],"prosiebengames":[{"r":"$","l":1,"b":"d7011d"}],"uni-heidelberg":[{"r":"$","l":1,"b":"c3043e"}],"bochum":[{"r":"$","b":"1747a6"}],"fun":[{"r":"$","b":"ff951d"}],"db-ip":[{"r":"$","b":"1747a6"}],"kskwn":[{"r":"$","b":"d7011d"}],"rap":[{"r":"$","b":"333333"}],"bigpoint":[{"r":"$","b":"8c275f"}],"wettladen":[{"r":"$","b":"073673"}],"weddix":[{"r":"$","b":"50b1a2"}],"gamigo":[{"r":"$","l":1,"b":"ffc802"}],"lolking":[{"r":"$","l":1,"b":"ffc802"}],"sportscheck":[{"r":"$","l":1,"b":"ff951d"}],"volkswagenbank":[{"r":"$","l":1,"b":"073673"}],"ewe":[{"r":"$","l":1,"b":"073673"}],"autoteile-preiswert":[{"r":"$","b":"d7011d"}],"reisen":[{"r":"$","b":"d7011d"}],"reiser":[{"r":"$","b":"91d131"}],"mix1":[{"r":"$","b":"ff951d"}],"jesuismort":[{"r":"$","b":"07613c"}],"discavo":[{"r":"$","b":"8c275f"}],"globus":[{"r":"$","b":"ff951d"}],"sparkasse-bremen":[{"r":"$","l":1,"b":"f9204c"}],"minecraft-serverlist":[{"r":"$","b":"073673"}],"zone-telechargement":[{"r":"$","b":"abc8e2"}],"shape":[{"r":"$","b":"d8ee46"}],"alternate":[{"r":"$","b":"d7011d"}],"hochschulkompass":[{"r":"$","b":"fb91ae"}],"snap":[{"r":"$","b":"8a52a2"}],"online-translator":[{"r":"$","b":"2fc4fc"}],"bil":[{"r":"$","b":"7bebf5"}],"big":[{"r":"$","b":"073673"}],"bundesanzeiger":[{"r":"$","b":"333333"}],"intel":[{"r":"$","l":1,"b":"1747a6"}],"anandtech":[{"r":"$","b":"7bebf5"}],"flug":[{"r":"$","b":"c3043e"}],"flygermania":[{"r":"$","b":"07613c"}],"hypovereinsbank":[{"r":"$","l":1,"b":"d7011d"}],"google":[{"r":"plus.$","l":1,"b":"ff5349"},{"r":"maps.$","l":1,"b":"4592d8"},{"r":"images.$","l":1,"b":"50b1a2"},{"r":"play.$","l":1,"b":"56eac6"},{"r":"drive.$","l":1,"b":"5ea3f9"},{"r":"mail.$","l":1,"b":"f9204c"},{"r":"translate.$","l":1,"b":"5ea3f9"},{"r":"$","l":1,"b":"5ea3f9"}],"trainingsworld":[{"r":"$","b":"43bdd9"}],"bach":[{"r":"$","b":"abc8e2"}],"chemnitz":[{"r":"$","b":"c78e6d"}],"kfz-steuer":[{"r":"$","b":"abc8e2"}],"sparkasse-opr":[{"r":"$","l":1,"b":"f9204c"}],"ebook":[{"r":"$","b":"07613c"}],"rmv":[{"r":"$","l":1,"b":"073673"}],"minecraftforum":[{"r":"$","l":1,"b":"999999"}],"fahrplanauskunft":[{"r":"$","l":1,"b":"d7011d"}],"sahibinden":[{"r":"$","l":1,"b":"fede07"}],"fem":[{"r":"$","b":"8a52a2"}],"volksbank-straubing":[{"r":"$","l":1,"b":"1747a6"}],"superillu":[{"r":"$","b":"e24b2c"}],"chicagotribune":[{"r":"$","l":1,"b":"1747a6"}],"butlers":[{"r":"$","b":"fce951"}],"questler":[{"r":"$","b":"073673"}],"movie-blog":[{"r":"$","b":"006567"}],"sparhandy":[{"r":"$","b":"c3043e"}],"hifi-forum":[{"r":"$","b":"333333"}],"sourceforge":[{"r":"audacity.$","l":1,"b":"1747a6"},{"r":"$","l":1,"b":"429abd"}],"allmusic":[{"r":"$","l":1,"b":"2fc4fc"}],"tuebingen":[{"r":"$","b":"c3043e"}],"pressonline":[{"r":"$","b":"d7011d"}],"weltfussball":[{"r":"$","b":"f97136"}],"poppen":[{"r":"$","l":1,"b":"429abd"}],"kinopolis":[{"r":"$","l":1,"b":"d7011d"}],"xda-developers":[{"r":"$","b":"e24b2c"}],"smeet":[{"r":"$","b":"4592d8"}],"filsh":[{"r":"$","l":1,"b":"333333"}],"delfi":[{"r":"$","l":1,"b":"1747a6"}],"callofduty":[{"r":"$","l":1,"b":"333333"}],"deutschlandsim":[{"r":"$","b":"f36e8d"}],"oster":[{"r":"$","b":"ff951d"}],"handy-deutschland":[{"r":"$","b":"ff951d"}],"weather":[{"r":"$","l":1,"b":"1747a6"}],"ty":[{"r":"$","b":"333333"}],"stumbleupon":[{"r":"$","b":"e24b2c"}],"kabeldeutschland":[{"r":"$","l":1,"b":"fede07"}],"vlc":[{"r":"$","b":"f97136"}],"bergzeit":[{"r":"$","b":"e24b2c"}],"livejournal":[{"r":"$","l":1,"b":"073673"}],"11teamsports":[{"r":"$","b":"c3043e"}],"autobild":[{"r":"$","l":1,"b":"d7011d"}],"imgur":[{"r":"$","l":1,"b":"333333"}],"webmiles":[{"r":"$","b":"073673"}],"quotenmeter":[{"r":"$","b":"5267a2"}],"vmware":[{"r":"$","b":"333333"}],"vr-nms":[{"r":"$","b":"333333"}],"sparkasse-neumarkt":[{"r":"$","l":1,"b":"f9204c"}],"huawei":[{"r":"$","b":"e24b2c"}],"sparkasse-hannover":[{"r":"$","l":1,"b":"f9204c"}],"sinn":[{"r":"$","b":"c78e6d"}],"alphatv":[{"r":"$","b":"f9204c"}],"azlyrics":[{"r":"$","l":1,"b":"9077e3"}],"extreme":[{"r":"$","b":"c78e6d"}],"dibadu":[{"r":"$","l":1,"b":"d7011d"}],"tu-dresden":[{"r":"$","l":1,"b":"073673"}],"cinetrafic":[{"r":"$","b":"c78e6d"}],"probuilds":[{"r":"$","b":"fce951"}],"auswaertiges-amt":[{"r":"$","b":"fede07"}],"myfritz":[{"r":"$","b":"d7011d"}],"youporndeutsch":[{"r":"$","l":1,"b":"f97136"}],"jobbÃ¶rse":[{"r":"$","b":"5267a2"}],"che":[{"r":"$","b":"c78e6d"}],"kin":[{"r":"$","l":1,"b":"4592d8"}],"filmstarts":[{"r":"$","l":1,"b":"073673"}],"olymp":[{"r":"$","l":1,"b":"333333"}],"tabtech":[{"r":"$","b":"4592d8"}],"techradar":[{"r":"$","b":"5267a2"}],"flaconi":[{"r":"$","b":"f36e8d"}],"goneo":[{"r":"$","b":"d7011d"}],"afa":[{"r":"$","b":"91d131"}],"kia":[{"r":"$","l":1,"b":"d7011d"}],"messe-stuttgart":[{"r":"$","b":"fce951"}],"kickstarter":[{"r":"$","b":"91d131"}],"daenischesbettenlager":[{"r":"$","b":"1747a6"}],"miles-and-more":[{"r":"$","b":"073673"}],"fritzbox-kundendienst":[{"r":"$","b":"d7011d"}],"manager-magazin":[{"r":"$","l":1,"b":"073673"}],"acronis":[{"r":"$","b":"5267a2"}],"pcwelt":[{"r":"$","l":1,"b":"1747a6"}],"pagesjaunes":[{"r":"$","b":"fce951"}],"lg":[{"r":"$","b":"c3043e"}],"lz":[{"r":"$","b":"d7011d"}],"dal":[{"r":"$","b":"91d131"}],"dam":[{"r":"$","b":"333333"}],"dai":[{"r":"$","b":"073673"}],"dak":[{"r":"$","b":"f97136"}],"googlemaps":[{"r":"$","l":1,"b":"506bb8"}],"das":[{"r":"$","b":"333333"}],"degussa-bank":[{"r":"$","b":"c78e6d"}],"deltaradio":[{"r":"$","l":1,"b":"d7011d"}],"paltalk":[{"r":"$","b":"429abd"}],"winkel":[{"r":"$","b":"1747a6"}],"eule":[{"r":"$","b":"073673"}],"s-bahn-berlin":[{"r":"$","l":1,"b":"328c67"}],"airbnb":[{"r":"$","l":1,"b":"ff5349"}],"grohe":[{"r":"$","b":"1747a6"}],"rei":[{"r":"$","b":"c78e6d"}],"scfreiburg":[{"r":"$","l":1,"b":"333333"}],"rezeptwelt":[{"r":"$","l":1,"b":"91d131"}],"dmax":[{"r":"$","l":1,"b":"f97136"}],"uni-leipzig":[{"r":"$","l":1,"b":"666666"}],"viamichelin":[{"r":"$","l":1,"b":"073673"}],"beliebte-vornamen":[{"r":"$","l":1,"b":"ff5349"}],"hollister":[{"r":"$","b":"8c275f"}],"sparkasse-koblenz":[{"r":"$","l":1,"b":"f9204c"}],"bamf":[{"r":"$","b":"e24b2c"}],"medikamente-per-klick":[{"r":"$","b":"ff951d"}],"radionora":[{"r":"$","l":1,"b":"073673"}],"forumieren":[{"r":"$","l":1,"b":"429abd"}],"bosch":[{"r":"$","l":1,"b":"d7011d"}],"yourepeat":[{"r":"$","b":"e24b2c"}],"sportbild":[{"r":"$","l":1,"b":"d7011d"}],"metager2":[{"r":"$","b":"fce951"}],"venturebeat":[{"r":"$","l":1,"b":"333333"}],"myfitnesspal":[{"r":"$","b":"2fc4fc"}],"spiegel":[{"r":"$.com","b":"d248ca"},{"r":"$","l":1,"b":"c3043e"}],"engelhorn":[{"r":"$","l":1,"b":"333333"}],"beuth":[{"r":"$","b":"7bebf5"}],"redbull":[{"r":"$","l":1,"b":"d7011d"}],"w3":[{"r":"$","b":"1747a6"}],"hagen":[{"r":"$","b":"1747a6"}],"curved":[{"r":"$","b":"006567"}],"lohn-info":[{"r":"$","b":"92dba4"}],"booklooker":[{"r":"$","l":1,"b":"d7011d"}],"mim":[{"r":"$","b":"8c275f"}],"mio":[{"r":"$","b":"fede07"}],"mic":[{"r":"$","b":"d7011d"}],"aufeminin":[{"r":"$","b":"8c275f"}],"loesdau":[{"r":"$","b":"07613c"}],"guenstiger":[{"r":"$","l":1,"b":"d7011d"}],"onkelz":[{"r":"$","b":"333333"}],"mit":[{"r":"$.edu","l":1,"b":"d7011d"}],"frankfurter-volksbank":[{"r":"$","l":1,"b":"1747a6"}],"rottentomatoes":[{"r":"$","l":1,"b":"e92207"}],"xojane":[{"r":"$.com","l":1,"b":"c3043e"}],"studis-online":[{"r":"$","b":"328c67"}],"diigo":[{"r":"$","b":"4592d8"}],"ich-liebe-kaese":[{"r":"$","b":"fce951"}],"mirapodo":[{"r":"$","l":1,"b":"c3043e"}],"hanfverband":[{"r":"$","b":"328c67"}],"schlankr":[{"r":"$","b":"4592d8"}],"backinjob":[{"r":"$","b":"1747a6"}],"spreadshirt":[{"r":"$","l":1,"b":"56eac6"}],"apetito":[{"r":"$","b":"d7011d"}],"nachrichten":[{"r":"$","b":"4592d8"}],"tom-tailor":[{"r":"$","l":1,"b":"073673"}],"ksc":[{"r":"$","l":1,"b":"1747a6"}],"hypestat":[{"r":"$","l":1,"b":"ff951d"}],"latimes":[{"r":"$","l":1,"b":"333333"}],"myp2p":[{"r":"$","b":"4592d8"}],"hvberlin":[{"r":"$","l":1,"b":"e92207"}],"zeitblueten":[{"r":"$","b":"5267a2"}],"cicero":[{"r":"$","b":"c3043e"}],"blogspot":[{"r":"$","l":1,"b":"ff951d"}],"mercedes":[{"r":"$","l":1,"b":"333333"}],"dekra":[{"r":"$","b":"07613c"}],"business-punk":[{"r":"$","l":1,"b":"333333"}],"ofdb":[{"r":"$","b":"abc8e2"}],"gardasee":[{"r":"$","b":"d8ee46"}],"netdoktor":[{"r":"$","b":"4592d8"}],"virginmedia":[{"r":"$.com","l":1,"b":"e92207"},{"r":"$","l":1,"b":"e92207"}],"nostale":[{"r":"$","b":"fce951"}],"allestÃ¶rungen":[{"r":"$","b":"abc8e2"}],"discounto":[{"r":"$","b":"ff951d"}],"rueck":[{"r":"$","b":"073673"}],"vrr":[{"r":"$","l":1,"b":"07613c"}],"iban-bic-rechner":[{"r":"$","b":"2fc4fc"}],"spotify":[{"r":"$","l":1,"b":"74d463"}],"pharmazeutische-zeitung":[{"r":"$","l":1,"b":"d7011d"}],"kik24":[{"r":"$","b":"d7011d"}],"viersen":[{"r":"$","b":"0b47bf"}],"stepmap":[{"r":"$","b":"d8ee46"}],"scientificamerican":[{"r":"$","b":"333333"}],"sachsen":[{"r":"$","l":1,"b":"07613c"}],"bostonherald":[{"r":"$","l":1,"b":"4592d8"}],"qipu":[{"r":"$","b":"d7011d"}],"denic":[{"r":"$","b":"328c67"}],"girls-day":[{"r":"$","b":"073673"}],"esyoil":[{"r":"$","b":"ffc802"}],"slashdot":[{"r":"$","b":"006567"}],"sparkasse-staufen-breisach":[{"r":"$","l":1,"b":"f9204c"}],"guenstig":[{"r":"$","b":"d7011d"}],"pcgames":[{"r":"$","l":1,"b":"4592d8"}],"sonyentertainmentnetwork":[{"r":"$","b":"429abd"}],"orange":[{"r":"$","l":1,"b":"f97136"}],"uni-mannheim":[{"r":"$","l":1,"b":"073673"}],"osnabrueck":[{"r":"$","b":"073673"}],"hintergrund":[{"r":"$","b":"073673"}],"ap":[{"r":"$.org","l":1,"b":"333333"}],"football365":[{"r":"$","b":"abc8e2"}],"hnmusik":[{"r":"$","l":1,"b":"c78e6d"}],"io9":[{"r":"$","b":"bf638e"}],"linkedin":[{"r":"$","l":1,"b":"429abd"}],"easycosmetic":[{"r":"$","b":"ff951d"}],"netbet":[{"r":"$","b":"073673"}],"statista":[{"r":"$","b":"073673"}],"y":[{"r":"$","b":"333333"}],"lo-net2":[{"r":"$","l":1,"b":"91d131"}],"probux":[{"r":"$","b":"073673"}],"business2community":[{"r":"$","b":"e24b2c"}],"oetker":[{"r":"$","b":"d7011d"}],"interia":[{"r":"$","b":"ffc802"}],"gma":[{"r":"$","l":1,"b":"4592d8"}],"jas":[{"r":"$","b":"666666"}],"gleich":[{"r":"$","b":"d7011d"}],"forbes":[{"r":"$","l":1,"b":"1747a6"}],"comstats":[{"r":"$","b":"073673"}],"marktcom":[{"r":"$","b":"0b47bf"}],"journalist":[{"r":"$","b":"073673"}],"billigflug":[{"r":"$","b":"c3043e"}],"conrad":[{"r":"$","l":1,"b":"4592d8"}],"audible":[{"r":"$","l":1,"b":"ff951d"}],"fh-koeln":[{"r":"$","l":1,"b":"d7011d"}],"idealo":[{"r":"$","l":1,"b":"1747a6"}],"ullapopken":[{"r":"$","b":"333333"}],"wetteronline":[{"r":"$","l":1,"b":"5267a2"}],"hurricane":[{"r":"$","b":"f9204c"}],"ese":[{"r":"$","b":"fce951"}],"esl":[{"r":"$","l":1,"b":"333333"}],"fk-shop":[{"r":"$","b":"333333"}],"brigitte":[{"r":"$","l":1,"b":"d7011d"}],"panet":[{"r":"$","b":"d7011d"}],"about":[{"r":"$","l":1,"b":"f9204c"}],"bergfex":[{"r":"$","l":1,"b":"2fc4fc"}],"sidereel":[{"r":"$","b":"429abd"}],"myfont":[{"r":"$","b":"333333"}],"www-ebay":[{"r":"$","l":1,"b":"ffc802"}],"bestanuce1":[{"r":"$","b":"d7011d"}],"mydealz":[{"r":"$","l":1,"b":"74d463"}],"eins":[{"r":"$","b":"f97136"}],"gutscheine":[{"r":"$","b":"74d463"}],"worldofwarplanes":[{"r":"$","b":"073673"}],"hostessen-meile":[{"r":"$","b":"d7011d"}],"gazeta":[{"r":"$","b":"8c275f"}],"immoscout24":[{"r":"$","l":1,"b":"f97136"}],"ardmediathek":[{"r":"$","l":1,"b":"073673"}],"alohatube":[{"r":"$","b":"91d131"}],"jobware":[{"r":"$","b":"073673"}],"csgolounge":[{"r":"$","l":1,"b":"ff951d"}],"washingtonpost":[{"r":"$","l":1,"b":"333333"}],"qype":[{"r":"$","l":1,"b":"d7011d"}],"coke":[{"r":"$","l":1,"b":"d7011d"}],"congstar-forum":[{"r":"$","l":1,"b":"333333"}],"uni-marburg":[{"r":"$","l":1,"b":"333333"}],"gameduell":[{"r":"$","l":1,"b":"d7011d"}],"kraft":[{"r":"$","l":1,"b":"f9204c"}],"bug":[{"r":"$","b":"333333"}],"arstechnica":[{"r":"$","b":"e24b2c"}],"bmwusa":[{"r":"$","l":1,"b":"333333"}],"schnittberichte":[{"r":"$","b":"d7011d"}],"sophos":[{"r":"$","b":"073673"}],"wix":[{"r":"$","b":"ffc802"}],"bmbf":[{"r":"$","l":1,"b":"333333"}],"garten":[{"r":"$","b":"d7011d"}],"onlinewelten":[{"r":"$","b":"333333"}],"my-hammer":[{"r":"$","b":"1747a6"}],"eintracht-frankfurt":[{"r":"$","l":1,"b":"d7011d"}],"volksbank-brawo":[{"r":"$","l":1,"b":"1747a6"}],"fussballtransfers":[{"r":"$","l":1,"b":"1747a6"}],"highsnobiety":[{"r":"$","b":"e24b2c"}],"deutsches-seniorenportal":[{"r":"$","b":"92dba4"}],"ubi":[{"r":"$","b":"5ea3f9"}],"sparkasse":[{"r":"$","l":1,"b":"f9204c"}],"philips":[{"r":"$","b":"0b47bf"}],"yelp":[{"r":"$","l":1,"b":"d7011d"}],"herozerogame":[{"r":"$","b":"ff951d"}],"forum-fuer-senioren":[{"r":"$","b":"fce951"}],"volkskrant":[{"r":"$","b":"333333"}],"thehill":[{"r":"$","l":1,"b":"1747a6"}],"ergebnisselive":[{"r":"$","l":1,"b":"91d131"}],"checkmytrip":[{"r":"$","b":"7bebf5"}],"gamepedia":[{"r":"$","l":1,"b":"f97136"}],"googoodolls":[{"r":"$","l":1,"b":"ff5349"}],"albamoda":[{"r":"$","l":1,"b":"cccccc"}],"ilmeteo":[{"r":"$","l":1,"b":"4592d8"}],"medizinfo":[{"r":"$","b":"333333"}],"wick":[{"r":"$","b":"f9204c"}],"tvtoday":[{"r":"$","l":1,"b":"d7011d"}],"younow":[{"r":"$","l":1,"b":"91d131"}],"tube":[{"r":"$","b":"ff5349"}],"zdf":[{"r":"$","l":1,"b":"ff951d"}],"blick":[{"r":"$","l":1,"b":"d7011d"}],"ksta":[{"r":"$","l":1,"b":"333333"}],"wahl-o-mat":[{"r":"$","l":1,"b":"c3043e"}],"skoda":[{"r":"$","l":1,"b":"328c67"}],"lablue":[{"r":"$","l":1,"b":"1747a6"}],"sparkasse-lev":[{"r":"$","l":1,"b":"f9204c"}],"christ":[{"r":"$","b":"333333"}],"disney":[{"r":"$","l":1,"b":"333333"}],"fanfiktion":[{"r":"$","b":"333333"}],"meister":[{"r":"$","b":"c78e6d"}],"ka-news":[{"r":"$","b":"4592d8"}],"kicker":[{"r":"$","l":1,"b":"d7011d"}],"aid":[{"r":"$","b":"abc8e2"}],"path":[{"r":"$","l":1,"b":"ff5349"}],"sparkasse-lemgo":[{"r":"$","l":1,"b":"f9204c"}],"fonic":[{"r":"$","l":1,"b":"429abd"}],"caritas":[{"r":"$","b":"e24b2c"}],"wdc":[{"r":"$","b":"328c67"}],"borussia":[{"r":"$","l":1,"b":"333333"}],"wdr":[{"r":"digit.$","l":1,"b":"8c275f"},{"r":"webmail.$","l":1,"b":"073673"},{"r":"$","l":1,"b":"073673"}],"generali":[{"r":"$","b":"c3043e"}],"ostsaechsische-sparkasse-dresden":[{"r":"$","l":1,"b":"f9204c"}],"instyle":[{"r":"$","b":"d7011d"}],"streamcloud":[{"r":"$","b":"333333"}],"onlinemarketing":[{"r":"$","b":"5267a2"}],"500px":[{"r":"$","b":"333333"}],"instructables":[{"r":"$","b":"ffc802"}],"skoda-auto":[{"r":"$","l":1,"b":"328c67"}],"topito":[{"r":"$","b":"1747a6"}],"joiz":[{"r":"$","b":"333333"}],"techrepublic":[{"r":"$","b":"4592d8"}],"majorleaguegaming":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-emsland":[{"r":"$","l":1,"b":"f9204c"}],"jumpradio":[{"r":"$","l":1,"b":"d7011d"}],"ti":[{"r":"$","b":"d7011d"}],"end":[{"r":"$","b":"ff951d"}],"bund":[{"r":"$","l":1,"b":"333333"}],"xhamster":[{"r":"$","l":1,"b":"f97136"}],"simyo":[{"r":"$","l":1,"b":"f97136"}],"wefashion":[{"r":"$","l":1,"b":"333333"}],"skiresort":[{"r":"$","b":"07613c"}],"virtualnights":[{"r":"$","b":"d8ee46"}],"computerbase":[{"r":"$","b":"f97136"}],"flightaware":[{"r":"$","l":1}],"traum-ferienwohnungen":[{"r":"$","b":"abc8e2"}],"ima":[{"r":"$","b":"07613c"}],"ime":[{"r":"$","b":"ff951d"}],"macrumors":[{"r":"$","b":"073673"}],"travianer":[{"r":"$","b":"92dba4"}],"metacafe":[{"r":"$","b":"ff951d"}],"trendsderzukunft":[{"r":"$","b":"d7011d"}],"startfenster":[{"r":"$","l":1,"b":"abc8e2"}],"mediamarkt":[{"r":"$","l":1,"b":"d7011d"}],"internations":[{"r":"$","b":"5ea3f9"}],"viewster":[{"r":"$","b":"ff951d"}],"kaspersky":[{"r":"$","b":"006567"}],"tvtv":[{"r":"$","b":"e24b2c"}],"armorgames":[{"r":"$","b":"073673"}],"fitness":[{"r":"$","b":"073673"}],"independent":[{"r":"$.ie","l":1,"b":"91d131"},{"r":"$","l":1,"b":"d7011d"}],"sparkasse-hanau":[{"r":"$","l":1,"b":"f9204c"}],"rutube":[{"r":"$","b":"328c67"}],"goo":[{"r":"$","l":1,"b":"5ea3f9"}],"gog":[{"r":"$","b":"d8ee46"}],"labanquepostale":[{"r":"$","b":"073673"}],"nitrado":[{"r":"$","l":1,"b":"333333"}],"vvs":[{"r":"$","l":1,"b":"f97136"}],"free":[{"r":"$","l":1,"b":"d7011d"}],"reichelt":[{"r":"$","b":"073673"}],"dpstream":[{"r":"$","b":"c78e6d"}],"hannover":[{"r":"$","b":"d7011d"}],"nhl":[{"r":"$","l":1,"b":"333333"}],"morgenpost":[{"r":"$","l":1,"b":"328c67"}],"primark":[{"r":"$","b":"43bdd9"}],"crazyslip":[{"r":"$","b":"073673"}],"a3-freunde":[{"r":"$","b":"d7011d"}],"verkaufsoffene-sonntage":[{"r":"$","b":"c3043e"}],"top":[{"r":"$","b":"d7011d"}],"bitcoin":[{"r":"$","l":1,"b":"ff951d"}],"kinder":[{"r":"$","b":"ffc802"}],"n24":[{"r":"$","l":1,"b":"073673"}],"thw":[{"r":"$","b":"073673"}],"fri-frechen":[{"r":"$","l":1,"b":"1747a6"}],"oeffnungszeitenbuch":[{"r":"$","b":"4592d8"}],"lbs":[{"r":"$","l":1,"b":"d7011d"}],"lbv":[{"r":"$","l":1,"b":"1747a6"}],"ran":[{"r":"$","l":1,"b":"5267a2"}],"rai":[{"r":"$","l":1,"b":"1747a6"}],"rewe":[{"r":"$","l":1,"b":"d7011d"}],"lbb":[{"r":"$","l":1,"b":"d7011d"}],"maxx":[{"r":"$","b":"333333"}],"softonic":[{"r":"$","l":1,"b":"5ea3f9"}],"enuygun":[{"r":"$","b":"74d463"}],"wohnen-im-alter":[{"r":"$","b":"91d131"}],"bsr":[{"r":"$","l":1,"b":"e24b2c"}],"bsh":[{"r":"$","l":1,"b":"073673"}],"bsi":[{"r":"$","b":"d7011d"}],"lisa-freundeskreis":[{"r":"$","b":"c78e6d"}],"flow":[{"r":"$","b":"43bdd9"}],"pkr":[{"r":"$","b":"7bebf5"}],"radio":[{"r":"$.de","l":1,"b":"91d131"},{"r":"$.at","l":1,"b":"91d131"},{"r":"$","l":1,"b":"f8458f"}],"sparkasse-nea":[{"r":"$","l":1,"b":"f9204c"}],"och":[{"r":"$","b":"073673"}],"aerzteblatt":[{"r":"$","l":1,"b":"429abd"}],"rund-ums-baby":[{"r":"$","b":"c78e6d"}],"zvab":[{"r":"$","b":"ffc802"}],"mobafire":[{"r":"$","l":1,"b":"073673"}],"watch":[{"r":"$","b":"f97136"}],"geek":[{"r":"$","b":"8c275f"}],"amazon":[{"r":"aws.$","l":1,"b":"ff951d"},{"r":"$","l":1,"b":"ff951d"}],"wikitravel":[{"r":"$","b":"073673"}],"wunderground":[{"r":"$","l":1,"b":"abc8e2"}],"diabetes-ratgeber":[{"r":"$","b":"8c275f"}],"gigaom":[{"r":"$","b":"4592d8"}],"num":[{"r":"$","b":"333333"}],"winrar-rog":[{"r":"$","b":"1747a6"}],"bundesanzeiger-verlag":[{"r":"$","b":"50b1a2"}],"gosupermodel":[{"r":"$","b":"d248ca"}],"eplus-gruppe":[{"r":"$","l":1,"b":"07613c"}],"laposte":[{"r":"$","b":"ffc802"}],"humblebundle":[{"r":"$","b":"e24b2c"}],"journaldunet":[{"r":"$","b":"333333"}],"gymondo":[{"r":"$","l":1,"b":"d7011d"}],"discovery":[{"r":"$.com","l":1,"b":"1747a6"},{"r":"$","l":1,"b":"1747a6"}],"mazda":[{"r":"$","b":"5267a2"}],"uni-kassel":[{"r":"$","b":"f8458f"}],"decathlon":[{"r":"$","l":1,"b":"4592d8"}],"smartmobil":[{"r":"$","b":"07613c"}],"bose":[{"r":"$","b":"333333"}],"eonline":[{"r":"$","l":1,"b":"f9204c"}],"uni-oldenburg":[{"r":"$","l":1,"b":"1747a6"}],"thehollywoodgossip":[{"r":"$","b":"fb91ae"}],"myheimat":[{"r":"$","b":"ff5349"}],"beeg":[{"r":"$","l":1,"b":"073673"}],"adblockplus":[{"r":"$","l":1,"b":"e92207"}],"totaljerkface":[{"r":"$","b":"f36e8d"}],"com-magazin":[{"r":"$","l":1,"b":"d7011d"}],"lotto-bayern":[{"r":"$","l":1,"b":"ffc802"}],"t411":[{"r":"$","b":"abc8e2"}],"xrel":[{"r":"$","b":"fce951"}],"thalys":[{"r":"$","b":"d7011d"}],"y-punkt":[{"r":"$.de","l":1,"b":"506bb8"},{"r":"$","l":1,"b":"506bb8"}],"cracked":[{"r":"$","b":"ffc802"}],"viking":[{"r":"$","b":"d7011d"}],"dooyoo":[{"r":"$","l":1,"b":"74d463"}],"visitberlin":[{"r":"$","b":"8c275f"}],"nike":[{"r":"$","l":1,"b":"333333"}],"motorradonline":[{"r":"$","b":"d7011d"}],"sparkasse-allgaeu":[{"r":"$","l":1,"b":"f9204c"}],"fh-aachen":[{"r":"$","l":1,"b":"50b1a2"}],"uni-dortmund":[{"r":"$","l":1,"b":"91d131"}],"stempel-fabrik":[{"r":"$","b":"073673"}],"moebel":[{"r":"$","b":"fede07"}],"speedtest":[{"r":"$","l":1,"b":"333333"}],"jamendo":[{"r":"$","b":"8c275f"}],"arbeitsagentur":[{"r":"$","l":1,"b":"d7011d"}],"hugoboss":[{"r":"$","l":1,"b":"333333"}],"digitalradio":[{"r":"$","l":1,"b":"91d131"}],"hofer":[{"r":"$.de","b":"506bb8"},{"r":"$","l":1,"b":"328c67"}],"feuerwehr":[{"r":"$","b":"e24b2c"}],"uni-regensburg":[{"r":"$","l":1,"b":"b3b3b3"}],"eld":[{"r":"$","b":"c78e6d"}],"ele":[{"r":"$","l":1,"b":"abc8e2"}],"spankwire":[{"r":"$","b":"d248ca"}],"elv":[{"r":"$","b":"f97136"}],"wissen":[{"r":"$","b":"328c67"}],"witt-weiden":[{"r":"$","b":"d7011d"}],"supercell":[{"r":"$","b":"333333"}],"zynga":[{"r":"$","b":"c3043e"}],"vattenfall":[{"r":"$","b":"ff951d"}],"volksbank-hellweg":[{"r":"$","l":1,"b":"1747a6"}],"mylifetime":[{"r":"$","b":"8a52a2"}],"badische-zeitung":[{"r":"$","l":1,"b":"333333"}],"skysports":[{"r":"$","l":1,"b":"073673"}],"bremerhaven":[{"r":"$","b":"073673"}],"testsieger":[{"r":"$","b":"d7011d"}],"schuhtempel24":[{"r":"$","b":"ffc802"}],"ico":[{"r":"$","b":"74d463"}],"gamestar":[{"r":"$","l":1,"b":"1747a6"}],"cnn":[{"r":"money.$","l":1,"b":"073673"},{"r":"$","l":1,"b":"d7011d"}],"icq":[{"r":"$","b":"74d463"}],"kompass":[{"r":"$","b":"c78e6d"}],"booking":[{"r":"$","l":1,"b":"1747a6"}],"mfo-matratzen":[{"r":"$","b":"c3043e"}],"whatculture":[{"r":"$","b":"c3043e"}],"hsv":[{"r":"$","l":1,"b":"073673"}],"nexusmods":[{"r":"$","b":"ffc802"}],"marmiton":[{"r":"$","b":"333333"}],"schneehoehen":[{"r":"$","b":"43bdd9"}],"moonsault":[{"r":"$","b":"1747a6"}],"twitch":[{"r":"$","l":1,"b":"530773"}],"bleepingcomputer":[{"r":"$","b":"4592d8"}],"kidsweb":[{"r":"$","b":"91d131"}],"ahr":[{"r":"$","b":"073673"}],"entrepreneur":[{"r":"$","b":"d7011d"}],"bielefeld":[{"r":"$","b":"073673"}],"dialo":[{"r":"$","b":"f36e8d"}],"hr-online":[{"r":"$","l":1,"b":"4592d8"}],"cristianoronaldo":[{"r":"$","b":"073673"}],"bet3000":[{"r":"$","b":"ff951d"}],"head":[{"r":"$","b":"ff951d"}],"finanzen100":[{"r":"$","b":"429abd"}],"caisse-epargne":[{"r":"$","b":"e24b2c"}],"sparkasse-magdeburg":[{"r":"$","l":1,"b":"f9204c"}],"viva":[{"r":"$","b":"333333"}],"kkiste":[{"r":"$","l":1,"b":"333333"}],"tomshardware":[{"r":"$","l":1,"b":"d7011d"}],"gesundheit":[{"r":"$","b":"abc8e2"}],"un":[{"r":"$","l":1,"b":"4592d8"}],"boerse-online":[{"r":"$","l":1,"b":"d7011d"}],"metrolyrics":[{"r":"$","l":1,"b":"333333"}],"arcgames":[{"r":"$","b":"073673"}],"nuerburgring":[{"r":"$","b":"d7011d"}],"dresden-tourist":[{"r":"$","b":"abc8e2"}],"expedia":[{"r":"$","l":1,"b":"073673"}],"ni":[{"r":"$","l":1,"b":"1747a6"}],"promiflash":[{"r":"$","l":1,"b":"f9204c"}],"livestation":[{"r":"$","b":"1747a6"}],"np":[{"r":"$","b":"d7011d"}],"nu":[{"r":"$","l":1,"b":"073673"}],"phoenix":[{"r":"$","b":"ffc802"}],"optifine":[{"r":"$","b":"4592d8"}],"digibet":[{"r":"$","b":"d7011d"}],"bambi":[{"r":"$","l":1,"b":"ffc802"}],"telefonica":[{"r":"$","b":"1747a6"}],"schufa":[{"r":"$","b":"ffc802"}],"sendungverpasst":[{"r":"$","t":"SV","b":"073673"}],"sparkasse-fuerth":[{"r":"$","l":1,"b":"f9204c"}],"focus":[{"r":"$","l":1,"b":"d7011d"}],"newegg":[{"r":"$","b":"073673"}],"csmonitor":[{"r":"$","b":"ffc802"}],"airberlin":[{"r":"$","l":1,"b":"d7011d"}],"huk24":[{"r":"$","l":1,"b":"ff951d"}],"boerse-stuttgart":[{"r":"$","b":"073673"}],"za-eg":[{"r":"$","l":1,"b":"1747a6"}],"topagrar":[{"r":"$","b":"328c67"}],"mercedes-benz":[{"r":"$","l":1,"b":"333333"}],"clipfish":[{"r":"$","l":1,"b":"333333"}],"bbbank":[{"r":"$","b":"1747a6"}],"blue-tomato":[{"r":"$","l":1,"b":"4592d8"}],"yale":[{"r":"$","l":1,"b":"073673"}],"asm-rugby":[{"r":"$","b":"0b47bf"}],"posta":[{"r":"$","l":1,"b":"d7011d"}],"pmu":[{"r":"$","b":"5267a2"}],"vnexpress":[{"r":"$","b":"c3043e"}],"kalorientabelle":[{"r":"$","b":"8a52a2"}],"heine":[{"r":"$","l":1,"b":"073673"}],"marktkauf":[{"r":"$","b":"328c67"}],"dolce-gusto":[{"r":"$","b":"d7011d"}],"kl-angelsport":[{"r":"$","l":1,"b":"4592d8"}],"witzcharts":[{"r":"$","b":"c78e6d"}],"justfab":[{"r":"$","b":"f9204c"}],"ameli":[{"r":"$","b":"1747a6"}],"channelpartner":[{"r":"$","b":"c3043e"}],"lolskill":[{"r":"$","l":1,"b":"333333"}],"footlocker":[{"r":"$","b":"d7011d"}],"websitetrafficspy":[{"r":"$","b":"333333"}],"mycare":[{"r":"$","b":"abc8e2"}],"polyvore":[{"r":"$","l":1,"b":"333333"}],"lifehacker":[{"r":"$","l":1,"b":"91d131"}],"romaniatv":[{"r":"$","b":"c3043e"}],"dasoertliche":[{"r":"$","l":1,"b":"4592d8"}],"holidaycheck":[{"r":"$","l":1,"b":"4592d8"}],"baby-walz":[{"r":"$","b":"1747a6"}],"anda":[{"r":"$","b":"d8ee46"}],"kabam":[{"r":"$","b":"ff951d"}],"msn":[{"r":"$","l":1,"b":"429abd"}],"basketusa":[{"r":"$","b":"073673"}],"msi":[{"r":"$","b":"1747a6"}],"allegro":[{"r":"$","b":"f97136"}],"obi":[{"r":"$","l":1,"b":"f97136"}],"gamona":[{"r":"$","b":"d7011d"}],"pressetext":[{"r":"$","l":1,"b":"f97136"}],"bankaustria":[{"r":"$","b":"d7011d"}],"gizmodo":[{"r":"$","l":1,"b":"abc8e2"}],"amazone":[{"r":"$","l":1,"b":"ff951d"}],"phantasialand":[{"r":"$","b":"e24b2c"}],"b92":[{"r":"$","b":"073673"}],"vital":[{"r":"$","b":"ffc802"}],"vodafone":[{"r":"$","l":1,"b":"e92207"}],"ligainsider":[{"r":"$","b":"ff951d"}],"schulranzen-onlineshop":[{"r":"$","b":"fb91ae"}],"shortnews":[{"r":"$","b":"d7011d"}],"unity":[{"r":"$","b":"0b47bf"}],"bmwi":[{"r":"$","l":1,"b":"333333"}],"unterwegs":[{"r":"$","b":"91d131"}],"ticketonline":[{"r":"$","b":"fede07"}],"stylebop":[{"r":"$","b":"c78e6d"}],"wiziwig":[{"r":"$","b":"eaeaea"}],"eset":[{"r":"$","b":"006567"}],"supremacy1914":[{"r":"$","b":"333333"}],"thomann":[{"r":"$","l":1,"b":"429abd"}],"deviantart":[{"r":"$","l":1,"b":"74d463"}],"dacia":[{"r":"$","l":1,"b":"1747a6"}],"stellen-online":[{"r":"$","b":"c78e6d"}],"westfalen-blatt":[{"r":"$","b":"328c67"}],"championselect":[{"r":"$","b":"8c275f"}],"home24":[{"r":"$","t":"24","b":"e24b2c"}],"keno":[{"r":"$","b":"1747a6"}],"jennyfer":[{"r":"$","b":"f8458f"}],"travelchannel":[{"r":"$","l":1,"b":"e24b2c"}],"tudou":[{"r":"$","l":1,"b":"f97136"}],"hulu":[{"r":"$","l":1,"b":"91d131"}],"betreut":[{"r":"$","b":"92dba4"}],"partner":[{"r":"$","b":"8c275f"}],"alltours":[{"r":"$","b":"d7011d"}],"ftbpro":[{"r":"$","b":"ff951d"}],"wiktionary":[{"r":"$","l":1,"b":"333333"}],"wetter24":[{"r":"$","l":1,"b":"1747a6"}],"origin":[{"r":"$","b":"f97136"}],"unternehmer":[{"r":"$","b":"2fc4fc"}],"mcleodgaming":[{"r":"$","b":"e24b2c"}],"maxdome":[{"r":"$","l":1,"b":"50b1a2"}],"goertz":[{"r":"$","b":"d7011d"}],"preis24":[{"r":"$","b":"073673"}],"grund":[{"r":"$","b":"073673"}],"fahrrad-xxl":[{"r":"$","b":"d7011d"}],"cosmoty":[{"r":"$","b":"f8458f"}],"github":[{"r":"$","l":1,"b":"333333"}],"meinprospekt":[{"r":"$","b":"f97136"}],"t3n":[{"r":"$","l":1,"b":"d7011d"}],"iobit":[{"r":"$","b":"1747a6"}],"buzzfeed":[{"r":"$","l":1,"b":"e24b2c"}],"wwf":[{"r":"$","l":1,"b":"333333"}],"logitel":[{"r":"$","b":"c78e6d"}],"elflirt":[{"r":"$","b":"d7011d"}],"ane":[{"r":"$","b":"c78e6d"}],"suite101":[{"r":"$","b":"91d131"}],"reno":[{"r":"$","b":"c3043e"}],"kulturradio":[{"r":"$","l":1,"b":"d7011d"}],"zapmeta":[{"r":"$","b":"ffc802"}],"infranken":[{"r":"$","b":"d7011d"}],"wegerer":[{"r":"$","b":"abc8e2"}],"interwetten":[{"r":"$","b":"fede07"}],"ultimate-guitar":[{"r":"$","b":"ffc802"}],"friv":[{"r":"$","l":1,"b":"8a52a2"}],"mypolacy":[{"r":"$","b":"fce951"}],"fck":[{"r":"$","l":1,"b":"e92207"}],"fcn":[{"r":"$","l":1,"b":"c3043e"}],"ruhr-uni-bochum":[{"r":"$","l":1,"b":"073673"}],"talkingpointsmemo":[{"r":"$","l":1,"b":"d7011d"}],"wohnen-und-garten":[{"r":"$","b":"fb91ae"}],"webmd":[{"r":"$","l":1,"b":"5267a2"}],"cheat":[{"r":"$","b":"abc8e2"}],"mtviggy":[{"r":"$","l":1,"b":"333333"}],"fusion-festival":[{"r":"$","b":"d7011d"}],"bosch-do-it":[{"r":"$","l":1,"b":"d7011d"}],"nuernberg":[{"r":"$","l":1,"b":"d7011d"}],"convert2mp3":[{"r":"$","b":"f97136"}],"car2go":[{"r":"$","b":"2fc4fc"}],"mz-web":[{"r":"$","b":"d7011d"}],"ita":[{"r":"$","b":"ff5349"}],"flickr":[{"r":"$","l":1,"b":"333333"}],"futhead":[{"r":"$","b":"c3043e"}],"bundesregierung":[{"r":"$","b":"fede07"}],"pornhubdeutsch":[{"r":"$","l":1,"b":"333333"}],"netto":[{"r":"$","l":1,"b":"fede07"}],"chemie":[{"r":"$","b":"d7011d"}],"tropo":[{"r":"$","b":"ff951d"}],"l-mag":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-guetersloh":[{"r":"$","l":1,"b":"f9204c"}],"itv":[{"r":"$","l":1,"b":"333333"}],"fahren-lernen":[{"r":"$","b":"c78e6d"}],"travelzoo":[{"r":"$","b":"0b47bf"}],"gutefrage":[{"r":"$","l":1,"b":"2fc4fc"}],"buttinette":[{"r":"$","l":1,"b":"f97136"}],"ladenzeile":[{"r":"$","b":"073673"}],"blinde-kuh":[{"r":"$","b":"ffc802"}],"knuddels":[{"r":"$","l":1,"b":"d7011d"}],"ksk-syke":[{"r":"$","b":"e24b2c"}],"fahrschule":[{"r":"$","b":"fb91ae"}],"worldoftanks":[{"r":"$","b":"8c275f"}],"joy":[{"r":"$","l":1,"b":"fb91ae"}],"kreissparkasse-heinsberg":[{"r":"$","l":1,"b":"f9204c"}],"westlotto":[{"r":"$","b":"d8ee46"}],"globus-baumarkt":[{"r":"$","l":1,"b":"ff951d"}],"fensterhandel":[{"r":"$","b":"073673"}],"bike-magazin":[{"r":"$","b":"f97136"}],"mercateo":[{"r":"$","b":"e24b2c"}],"maclife":[{"r":"$","b":"2fc4fc"}],"hausarbeiten":[{"r":"$","b":"073673"}],"edudip":[{"r":"$","b":"91d131"}],"luebeck":[{"r":"$","b":"073673"}],"velux":[{"r":"$","b":"e24b2c"}],"lephoceen":[{"r":"$","b":"5ea3f9"}],"kenfm":[{"r":"$","b":"073673"}],"reuters":[{"r":"$","l":1,"b":"f97136"}],"magistrix":[{"r":"$","b":"ffc802"}],"med-kolleg":[{"r":"$","b":"c78e6d"}],"pilot":[{"r":"$","b":"ff951d"}],"myself":[{"r":"$","b":"d7011d"}],"wiwi-online":[{"r":"$","b":"91d131"}],"tchibo":[{"r":"$","l":1,"b":"073673"}],"top-model":[{"r":"$","b":"d248ca"}],"spk-schaumburg":[{"r":"$","b":"c78e6d"}],"eintracht":[{"r":"$","l":1,"b":"d7011d"}],"kindernetz":[{"r":"$","b":"f9204c"}],"picmonkey":[{"r":"$","b":"f97136"}],"trip":[{"r":"$","b":"56eac6"}],"upjers":[{"r":"$","b":"d7011d"}],"kenn-dein-limit":[{"r":"$","b":"c3043e"}],"mallorca":[{"r":"$","b":"328c67"}],"f-secure":[{"r":"$","b":"abc8e2"}],"cleverbot":[{"r":"$","b":"abc8e2"}],"downloads":[{"r":"$","b":"5267a2"}],"nk":[{"r":"$","b":"5267a2"}],"notebookreview":[{"r":"$","b":"5267a2"}],"servustv":[{"r":"$","b":"d7011d"}],"geizhals":[{"r":"$","b":"1747a6"}],"handelsregister":[{"r":"$","b":"56eac6"}],"zap-hosting":[{"r":"$","b":"91d131"}],"isnichwahr":[{"r":"$","b":"abc8e2"}],"ya":[{"r":"$","b":"f97136"}],"tip":[{"r":"$","b":"c3043e"}],"tecson":[{"r":"$","l":1,"b":"073673"}],"blog":[{"r":"$.com","l":1,"b":"91d131"},{"r":"$","l":1,"b":"429abd"}],"lexilogos":[{"r":"$","b":"fce951"}],"libreoffice":[{"r":"$","b":"74d463"}],"sea":[{"r":"$","b":"1747a6"}],"qz":[{"r":"$","l":1,"b":"333333"}],"routenplaner24":[{"r":"$","b":"ff951d"}],"seriesyonkis":[{"r":"$","b":"fede07"}],"mobilfunk-talk":[{"r":"$","b":"ff951d"}],"xing":[{"r":"$","l":1,"b":"006567"}],"shopstyle":[{"r":"$","b":"333333"}],"o2":[{"r":"$","l":1,"b":"073673"}],"boingboing":[{"r":"$","b":"e24b2c"}],"gartenhaus-gmbh":[{"r":"$","b":"c78e6d"}],"kasseler-sparkasse":[{"r":"$","l":1,"b":"f9204c"}],"fussball":[{"r":"$","l":1,"b":"91d131"}],"om":[{"r":"$","b":"abc8e2"}],"ok":[{"r":"$.ru","l":1,"b":"ff951d"},{"r":"$.de","l":1,"b":"ff951d"},{"r":"$","b":"ffc802"}],"strassenkatalog":[{"r":"$","b":"c78e6d"}],"mitfahrzentrale":[{"r":"$","b":"e24b2c"}],"ob":[{"r":"$","b":"ff951d"}],"zillow":[{"r":"$.com","l":1,"b":"4592d8"},{"r":"$","l":1,"b":"4592d8"}],"landeswelle":[{"r":"$","l":1,"b":"ff951d"}],"ladies":[{"r":"$","b":"333333"}],"gardena":[{"r":"$","b":"d7011d"}],"linuxquestions":[{"r":"$","b":"c78e6d"}],"pikengo":[{"r":"$","l":1,"b":"f97136"}],"volkswagenag":[{"r":"$","l":1,"b":"333333"}],"programme-tv":[{"r":"$","b":"91d131"}],"beck-shop":[{"r":"$","b":"d7011d"}],"hs-osnabrueck":[{"r":"$","b":"4592d8"}],"versicherungsjournal":[{"r":"$","b":"5267a2"}],"neckermann-reisen":[{"r":"$","b":"fede07"}],"oebb":[{"r":"$","l":1,"b":"d7011d"}],"schalke04":[{"r":"$","l":1,"b":"1747a6"}],"harz":[{"r":"$","b":"0b47bf"}],"cinema":[{"r":"$","b":"073673"}],"cbs":[{"r":"$","l":1,"b":"333333"}],"intro":[{"r":"$","b":"333333"}],"acer":[{"r":"$","b":"07613c"}],"sofatutor":[{"r":"$","b":"74d463"}],"oto":[{"r":"$","b":"333333"}],"printus":[{"r":"$","b":"abc8e2"}],"kaufmich":[{"r":"$","l":1,"b":"333333"}],"uni-wuppertal":[{"r":"$","l":1,"b":"333333"}],"wmagazine":[{"r":"$","l":1,"b":"333333"}],"sunexpress":[{"r":"$","b":"1747a6"}],"topshop":[{"r":"$","b":"333333"}],"marinetraffic":[{"r":"$","b":"7bebf5"}],"movie2k":[{"r":"$.tl","l":1,"b":"006567"},{"r":"$","b":"006567"}],"bmw-dreieich":[{"r":"$","l":1,"b":"333333"}],"bausep":[{"r":"$","b":"d7011d"}],"stadt-koeln":[{"r":"$","b":"d7011d"}],"trauerspruch":[{"r":"$","b":"abc8e2"}],"movie4k":[{"r":"$","l":1,"b":"429abd"}],"pcmag":[{"r":"$","b":"e24b2c"}],"ald":[{"r":"$","b":"91d131"}],"hamburger-volksbank":[{"r":"$","l":1,"b":"1747a6"}],"merkur":[{"r":"$","b":"328c67"}],"ott":[{"r":"$","b":"333333"}],"groener":[{"r":"$","b":"328c67"}],"ferienwohnungen":[{"r":"$","b":"abc8e2"}],"faz":[{"r":"$","l":1,"b":"666666"}],"fau":[{"r":"$","l":1,"b":"1747a6"}],"fal":[{"r":"$","l":1,"b":"91d131"}],"fab":[{"r":"$","b":"f9204c"}],"ingenieur":[{"r":"$","b":"d7011d"}],"vorwerk":[{"r":"$","b":"328c67"}],"winfuture-forum":[{"r":"$","b":"d7011d"}],"list":[{"r":"$","b":"1747a6"}],"vimeo":[{"r":"$","l":1,"b":"2fc4fc"}],"nba":[{"r":"$","l":1,"b":"d7011d"}],"pinterest":[{"r":"$","l":1,"b":"c3043e"}],"daswetter":[{"r":"$","l":1,"b":"4592d8"}],"guna":[{"r":"$","b":"1747a6"}],"nbcnews":[{"r":"$","l":1,"b":"333333"}],"umrechnung24":[{"r":"$","b":"c78e6d"}],"vente-privee":[{"r":"$","b":"8c275f"}],"avast":[{"r":"$","b":"ff951d"}],"sbb":[{"r":"$","l":1,"b":"e92207"}],"maedchen":[{"r":"$","b":"f8458f"}],"frauenzimmer":[{"r":"$","b":"8c275f"}],"ebookee":[{"r":"$","b":"fce951"}],"docmorris":[{"r":"$","l":1,"b":"91d131"}],"immonet":[{"r":"$","l":1,"b":"073673"}],"mtvema":[{"r":"$","l":1,"b":"333333"}],"kraemer-pferdesport":[{"r":"$","b":"073673"}],"eden":[{"r":"$","b":"333333"}],"kickass":[{"r":"$","b":"07613c"}],"ab-in-den-urlaub":[{"r":"$","b":"ff951d"}],"pons":[{"r":"$","l":1,"b":"328c67"}],"pbskids":[{"r":"$","l":1,"b":"91d131"}],"goal":[{"r":"$","l":1,"b":"333333"}],"readmore":[{"r":"$","b":"4592d8"}],"fraps":[{"r":"$","b":"fce951"}],"panoramio":[{"r":"$","b":"1747a6"}],"deutung":[{"r":"$","b":"fce951"}],"lovoo":[{"r":"$","l":1,"b":"d248ca"}],"fh-duesseldorf":[{"r":"$","b":"e24b2c"}],"oyunskor":[{"r":"$","b":"fce951"}],"otto-office":[{"r":"$","b":"d7011d"}],"style":[{"r":"$","b":"333333"}],"beyonce":[{"r":"$","b":"333333"}],"ricardo":[{"r":"$","l":1,"b":"ff951d"}],"sinnleffers":[{"r":"$","b":"b3b3b3"}],"ksk-saarlouis":[{"r":"$","b":"d7011d"}],"ecosia":[{"r":"$","l":1,"b":"429abd"}],"volksbanking":[{"r":"$","l":1,"b":"1747a6"}],"momox":[{"r":"$","b":"4592d8"}],"brother":[{"r":"$","l":1,"b":"073673"}],"thueringer-allgemeine":[{"r":"$","l":1,"b":"328c67"}],"rtl2":[{"r":"$","l":1,"b":"d8ee46"}],"sia-homefashion":[{"r":"$","b":"8c275f"}],"barcoo":[{"r":"$","b":"c3043e"}],"miniclip":[{"r":"$","b":"ff951d"}],"liebeschenken":[{"r":"$","b":"c3043e"}],"abnehmen":[{"r":"$","b":"ff951d"}],"wattpad":[{"r":"$","b":"ff951d"}],"guess":[{"r":"$","l":1,"b":"d7011d"}],"sonnenklar":[{"r":"$","b":"e24b2c"}],"fiat":[{"r":"$","l":1,"b":"c3043e"}],"restaurant-kritik":[{"r":"$","b":"f97136"}],"achtzehn99":[{"r":"$","l":1,"b":"1747a6"}],"wlw":[{"r":"$","b":"073673"}],"angelsport":[{"r":"$","b":"d7011d"}],"yoox":[{"r":"$","b":"eaeaea"}],"trivago":[{"r":"$","l":1,"b":"506bb8"}],"marcopolo":[{"r":"$","b":"fede07"}],"3dl":[{"r":"$","t":"3D","b":"333333"}],"htc":[{"r":"$","b":"91d131"}],"darkorbit":[{"r":"$","b":"0b47bf"}],"apotheke-adhoc":[{"r":"$","b":"abc8e2"}],"baywa":[{"r":"$","l":1,"b":"328c67"}],"filmix":[{"r":"$","b":"ff951d"}],"hotukdeals":[{"r":"$","l":1,"b":"91d131"}],"thueringen":[{"r":"$","b":"e24b2c"}],"king":[{"r":"$","l":1,"b":"ff951d"}],"architonic":[{"r":"$","b":"333333"}],"marktplatz-mittelstand":[{"r":"$","b":"fce951"}],"kino":[{"r":"$","l":1,"b":"c3043e"}],"htt":[{"r":"$","l":1,"b":"d7011d"}],"shop-apotheke":[{"r":"$","b":"073673"}],"gala":[{"r":"$","l":1,"b":"c3043e"}],"wolframalpha":[{"r":"$","b":"073673"}],"port":[{"r":"$","b":"d7011d"}],"medimax":[{"r":"$","b":"d7011d"}],"nivea":[{"r":"$","l":1,"b":"1747a6"}],"deutschepost":[{"r":"$","l":1,"b":"fede07"}],"urlaub":[{"r":"$","b":"abc8e2"}],"kleinezeitung":[{"r":"$","b":"d7011d"}],"antolin":[{"r":"$","b":"e24b2c"}],"apfeltalk":[{"r":"$","b":"d7011d"}],"rtl":[{"r":"$","l":1,"b":"d7011d"}],"wetter":[{"r":"$","l":1,"b":"1747a6"}],"rts":[{"r":"$","b":"d7011d"}],"gamepro":[{"r":"$","b":"5267a2"}],"notebookcheck":[{"r":"$","b":"c3043e"}],"calbears":[{"r":"$","l":1,"b":"073673"}],"autoteile24":[{"r":"$","b":"abc8e2"}],"noeastro":[{"r":"$","b":"073673"}],"emailn":[{"r":"$","b":"abc8e2"}],"his":[{"r":"$","b":"1747a6"}],"hiv":[{"r":"$","b":"fce951"}],"ekomi":[{"r":"$","b":"74d463"}],"kreissparkasse-rhein-pfalz":[{"r":"$","l":1,"b":"f9204c"}],"erento":[{"r":"$","b":"328c67"}],"e-hoi":[{"r":"$","b":"1747a6"}],"ard":[{"r":"$","l":1,"b":"073673"}],"arm":[{"r":"$","b":"073673"}],"guter-rat":[{"r":"$","b":"d7011d"}],"esta-online":[{"r":"$","b":"1747a6"}],"milliyet":[{"r":"$","l":1,"b":"d7011d"}],"kreissparkasse-schwalm-eder":[{"r":"$","l":1,"b":"f9204c"}],"tro":[{"r":"$","b":"073673"}],"lebensmittelzeitung":[{"r":"$","b":"d7011d"}],"fernbus":[{"r":"$","b":"f97136"}],"themeforest":[{"r":"$","b":"c78e6d"}],"tera-europe":[{"r":"$","b":"333333"}],"webaslan":[{"r":"$","b":"8c275f"}],"ups":[{"r":"$","l":1,"b":"c78e6d"}],"anews":[{"r":"$","b":"abc8e2"}],"skyscanner":[{"r":"$","b":"7bebf5"}],"glamourparis":[{"r":"$","l":1,"b":"333333"}],"oekotest":[{"r":"$","b":"d7011d"}],"epicfail":[{"r":"$","b":"e24b2c"}],"parispornmovies":[{"r":"$","l":1,"b":"c3043e"}],"duden":[{"r":"$","l":1,"b":"333333"}],"asda":[{"r":"$.com","l":1,"b":"91d131"},{"r":"$","l":1,"b":"91d131"}],"macworld":[{"r":"$","b":"333333"}],"java":[{"r":"$","b":"d7011d"}],"rad-net":[{"r":"$","b":"c3043e"}],"pc":[{"r":"$","b":"333333"}],"rihannadaily":[{"r":"$","b":"eaeaea"}],"pe":[{"r":"$","b":"fce951"}],"swp":[{"r":"$","l":1,"b":"4592d8"}],"dus":[{"r":"$","b":"d7011d"}],"baixaki":[{"r":"$","b":"abc8e2"}],"schwab":[{"r":"$","b":"bf638e"}],"xpartner":[{"r":"$","b":"c78e6d"}],"ris":[{"r":"$","b":"073673"}],"bbs-reisen":[{"r":"$","b":"d7011d"}],"muensterland":[{"r":"$","b":"d7011d"}],"billigweg":[{"r":"$","b":"ff951d"}],"euronics":[{"r":"$","b":"073673"}],"therapie":[{"r":"$","b":"4592d8"}],"chelseafc":[{"r":"$","b":"1747a6"}],"lastminute":[{"r":"$","l":1,"b":"f8458f"}],"bergfreunde":[{"r":"$","b":"d7011d"}],"merkur-online":[{"r":"$","l":1,"b":"5267a2"}],"wiwo":[{"r":"$","l":1,"b":"d7011d"}],"rautemusik":[{"r":"$","b":"d7011d"}],"ksklb":[{"r":"$","l":1,"b":"d7011d"}],"fleurop":[{"r":"$","b":"fce951"}],"volvocars":[{"r":"$","b":"073673"}],"bravofly":[{"r":"$","b":"4592d8"}],"sfimg":[{"r":"$","b":"91d131"}],"womenshealth":[{"r":"$","b":"d7011d"}],"ixxx":[{"r":"$","b":"333333"}],"anwalt":[{"r":"$","b":"429abd"}],"gema":[{"r":"$","b":"c3043e"}],"cunda":[{"r":"$","l":1,"b":"56eac6"}],"hardwareluxx":[{"r":"$","b":"d7011d"}],"wallstreet-online":[{"r":"$","l":1,"b":"07613c"}],"thedailybeast":[{"r":"$","l":1,"b":"e92207"}],"buffalo-shop":[{"r":"$","b":"333333"}],"9gag":[{"r":"$","l":1,"b":"333333"}],"1up":[{"r":"$","b":"073673"}],"girlsgogames":[{"r":"$","b":"f8458f"}],"advanzia":[{"r":"$","b":"abc8e2"}],"soccerway":[{"r":"$","b":"ff951d"}],"affili":[{"r":"$","b":"ff951d"}],"proz":[{"r":"$","b":"006567"}],"medi":[{"r":"$","l":1,"b":"f8458f"}],"norma24":[{"r":"$","b":"d7011d"}],"atelco":[{"r":"$","b":"1747a6"}],"grooveshark":[{"r":"$","b":"333333"}],"native-instruments":[{"r":"$","b":"429abd"}],"thepiratebay":[{"r":"$","l":1,"b":"333333"}],"redtube":[{"r":"$","l":1,"b":"c3043e"}],"billigfluege":[{"r":"$","b":"006567"}],"accorhotels":[{"r":"$","l":1,"b":"073673"}],"med1":[{"r":"$","l":1,"b":"07613c"}],"glamour":[{"r":"$","l":1,"b":"f8458f"}],"familie":[{"r":"$","b":"429abd"}],"windeln":[{"r":"$","b":"c3043e"}],"delta":[{"r":"$","b":"abc8e2"}],"meinauto":[{"r":"$","b":"1747a6"}],"today":[{"r":"$","l":1,"b":"f97136"}],"newsdeutschland":[{"r":"$","l":1,"b":"4592d8"}],"bankenverband":[{"r":"$","b":"8c275f"}],"pflegewiki":[{"r":"$","b":"5ea3f9"}],"nick":[{"r":"$","l":1,"b":"ff951d"}],"lemonde":[{"r":"$","b":"333333"}],"livescore":[{"r":"$","b":"abc8e2"}],"ip-phone-forum":[{"r":"$","b":"abc8e2"}],"vice":[{"r":"$","l":1,"b":"333333"}],"reisekostenabrechnung":[{"r":"$","b":"333333"}],"omeglesites":[{"r":"$","b":"2fc4fc"}],"pret":[{"r":"$","b":"f97136"}],"gant":[{"r":"$","l":1,"b":"666666"}],"metager":[{"r":"$","b":"abc8e2"}],"technorati":[{"r":"$","b":"74d463"}],"cinestar":[{"r":"$","l":1,"b":"ffc802"}],"uni-hamburg":[{"r":"$","l":1,"b":"d7011d"}],"barcelo":[{"r":"$","b":"0b47bf"}],"immobilienscout24":[{"r":"$","l":1,"b":"e24b2c"}],"prosieben":[{"r":"$","l":1,"b":"d7011d"}],"abt-configurator":[{"r":"$","l":1,"b":"333333"}],"easybell":[{"r":"$","l":1,"b":"f97136"}],"sparkasse-essen":[{"r":"$","l":1,"b":"f9204c"}],"snipes":[{"r":"$","l":1,"b":"666666"}],"flixbus":[{"r":"$","l":1,"b":"74d463"}],"stackoverflow":[{"r":"$","l":1,"b":"666666"}],"reifen-vor-ort":[{"r":"$","b":"fce951"}],"wa":[{"r":"$","l":1,"b":"5267a2"}],"zeit":[{"r":"$","l":1,"b":"666666"}],"deals":[{"r":"$","b":"91d131"}],"chatrandom":[{"r":"$","l":1,"b":"fede07"}],"iba":[{"r":"$","b":"ffc802"}],"sport1":[{"r":"$","l":1,"b":"ffc802"}],"mangahere":[{"r":"$","b":"073673"}],"comma-store":[{"r":"$","l":1,"b":"333333"}],"wn":[{"r":"$","l":1,"b":"d7011d"}],"obelink":[{"r":"$","b":"1747a6"}],"datingcafe":[{"r":"$","b":"d7011d"}],"k-online":[{"r":"$","l":1,"b":"4592d8"}],"bdcraft":[{"r":"$","b":"07613c"}],"tasso":[{"r":"$","b":"fce951"}],"anime-stream24":[{"r":"$","b":"073673"}],"ticketmaster":[{"r":"$","b":"ffc802"}],"kotaku":[{"r":"$","b":"d8ee46"}],"novasol":[{"r":"$","b":"e24b2c"}],"cad":[{"r":"$","b":"333333"}],"gazzetta":[{"r":"$","b":"f8458f"}],"nachbelichtet":[{"r":"$","b":"c78e6d"}],"apple":[{"r":"$","l":1,"b":"cccccc"}],"app":[{"r":"$","b":"333333"}],"mctrek":[{"r":"$","b":"91d131"}],"fressnapf":[{"r":"$","b":"d7011d"}],"webmail":[{"r":"$","l":1,"b":"f97136"}],"jaumo":[{"r":"$","b":"d7011d"}],"apl":[{"r":"$","b":"c78e6d"}],"fed":[{"r":"$","b":"073673"}],"fee":[{"r":"$","b":"4592d8"}],"mittelbayerische":[{"r":"$","b":"073673"}],"usa":[{"r":"$","l":1,"b":"1747a6"}],"doodle":[{"r":"$","l":1,"b":"1747a6"}],"siemens-home":[{"r":"$","l":1,"b":"50b1a2"}],"fer":[{"r":"$","b":"4592d8"}],"chip":[{"r":"$","l":1,"b":"d7011d"}],"bitly":[{"r":"$","b":"f97136"}],"ral":[{"r":"$","b":"073673"}],"commerzbanking":[{"r":"$","l":1,"b":"ffc802"}],"ultras-dynamo":[{"r":"$","b":"d7011d"}],"windows-8-forum":[{"r":"$","b":"073673"}],"berliner-zeitung":[{"r":"$","l":1,"b":"073673"}],"boersenblatt":[{"r":"$","l":1,"b":"d7011d"}],"tas":[{"r":"$","b":"e24b2c"}],"wwitv":[{"r":"$","b":"d7011d"}],"onedirectionmusic":[{"r":"$","b":"fb91ae"}],"taz":[{"r":"$","l":1,"b":"d7011d"}],"tad":[{"r":"$","b":"4592d8"}],"koffer-direkt":[{"r":"$","b":"333333"}],"united":[{"r":"$","l":1,"b":"429abd"}],"goldesel":[{"r":"$","b":"ffc802"}],"dwd":[{"r":"$","l":1,"b":"1747a6"}],"berge-meer":[{"r":"$","b":"073673"}],"m-net":[{"r":"$","l":1,"b":"4592d8"}],"farmerama":[{"r":"$","b":"d8ee46"}],"ebaykleinanzeigen":[{"r":"$","l":1,"b":"91d131"}],"westwing":[{"r":"$","b":"fce951"}],"lingen":[{"r":"$","b":"d7011d"}],"herold":[{"r":"$","l":1,"b":"ffc802"}],"gaijin":[{"r":"$","b":"333333"}],"ansa":[{"r":"$","b":"07613c"}],"hs-heilbronn":[{"r":"$","b":"ff951d"}],"looki":[{"r":"$","b":"07613c"}],"schoeffel":[{"r":"$","l":1,"b":"1747a6"}],"allposters":[{"r":"$","b":"d7011d"}],"delamar":[{"r":"$","b":"e24b2c"}],"spot":[{"r":"$","b":"f97136"}],"europapark":[{"r":"$","b":"ffc802"}],"billa":[{"r":"$","l":1,"b":"d7011d"}],"nfl":[{"r":"$","l":1,"b":"d7011d"}],"nkprojekt":[{"r":"$","b":"333333"}],"whatismyipaddress":[{"r":"$","b":"abc8e2"}],"selbstklebefolien":[{"r":"$","b":"8a52a2"}],"ebooks":[{"r":"$","b":"f9204c"}],"geox":[{"r":"$","l":1,"b":"333333"}],"oe24":[{"r":"$","l":1,"b":"d7011d"}],"massivum":[{"r":"$","b":"8c275f"}],"comicguide":[{"r":"$","b":"d7011d"}],"fernuni-hagen":[{"r":"$","b":"1747a6"}],"schoener-fernsehen":[{"r":"$","b":"073673"}],"kvb-koeln":[{"r":"$","b":"d7011d"}],"1-2-fly":[{"r":"$","b":"fce951"}],"transformice":[{"r":"$","b":"4592d8"}],"aerticket":[{"r":"$","b":"1747a6"}],"mtvbase":[{"r":"$","l":1,"b":"333333"}],"myspace":[{"r":"$","l":1,"b":"333333"}],"wunderkarten":[{"r":"$","b":"c3043e"}],"linux-magazin":[{"r":"$","l":1,"b":"333333"}],"stephan":[{"r":"$","b":"073673"}],"kicktipp":[{"r":"$","l":1,"b":"d7011d"}],"esta-registrierung":[{"r":"$","b":"92dba4"}],"elten":[{"r":"$","b":"333333"}],"bwin":[{"r":"$","l":1,"b":"ffc802"}],"allthetests":[{"r":"$","l":1,"b":"fede07"}],"tommy":[{"r":"$","l":1,"b":"073673"}],"devk":[{"r":"$","b":"328c67"}],"blic":[{"r":"$","l":1,"b":"1747a6"}],"krimi-couch":[{"r":"$","b":"07613c"}],"threema":[{"r":"$","b":"07613c"}],"imdb":[{"r":"$","l":1,"b":"ffc802"}],"ingdirect":[{"r":"$","l":1,"b":"f97136"}],"getpaint":[{"r":"$","b":"5267a2"}],"busliniensuche":[{"r":"$","b":"429abd"}],"kongregate":[{"r":"$","b":"d7011d"}],"europe1":[{"r":"$","b":"1747a6"}],"windelbar":[{"r":"$","b":"c3043e"}],"fujitsu":[{"r":"$","b":"d7011d"}],"uefa":[{"r":"$","l":1,"b":"1747a6"}],"galeria-kaufhof":[{"r":"$","l":1,"b":"91d131"}],"local":[{"r":"$","l":1,"b":"d7011d"}],"geizkragen":[{"r":"$","b":"c3043e"}],"cube":[{"r":"$","b":"9077e3"}],"vr-bank":[{"r":"$","l":1,"b":"1747a6"}],"onet":[{"r":"$","l":1,"b":"073673"}],"jutarnji":[{"r":"$","b":"333333"}],"titus":[{"r":"$","b":"d7011d"}],"sparkasse-paderborn-detmold":[{"r":"$","l":1,"b":"f9204c"}],"herokon-online":[{"r":"$","b":"07613c"}],"mona":[{"r":"$","b":"d7011d"}],"mp3juices":[{"r":"$","b":"ff951d"}],"geschenke":[{"r":"$","b":"c78e6d"}],"pixect":[{"r":"$","b":"c78e6d"}],"stepstone":[{"r":"$","l":1,"b":"666666"}],"telegrafi":[{"r":"$","l":1,"b":"f8458f"}],"ebs":[{"r":"$","b":"1747a6"}],"gmail":[{"r":"$","l":1,"b":"f9204c"}],"meinchef":[{"r":"$","b":"5267a2"}],"sunmaker":[{"r":"$","b":"073673"}],"bundesbank":[{"r":"$","b":"5267a2"}],"flatex":[{"r":"$","l":1,"b":"ff951d"}],"job":[{"r":"$","b":"ff951d"}],"g-ba":[{"r":"$","l":1,"b":"ff951d"}],"renault":[{"r":"$","l":1,"b":"ffc802"}],"nespresso":[{"r":"$","l":1,"b":"333333"}],"wald":[{"r":"$","b":"91d131"}],"sparkasse-msh":[{"r":"$","l":1,"b":"f9204c"}],"volksbankeg":[{"r":"$","l":1,"b":"1747a6"}],"hdm-stuttgart":[{"r":"$","b":"333333"}],"aachener-zeitung":[{"r":"$","b":"4592d8"}],"vit":[{"r":"$","b":"91d131"}],"yves-rocher":[{"r":"$","l":1,"b":"91d131"}],"bbc":[{"r":"$","l":1,"b":"333333"}],"charts":[{"r":"$","b":"c78e6d"}],"gopro":[{"r":"$","b":"2fc4fc"}],"allocine":[{"r":"$","b":"ffc802"}],"momondo":[{"r":"$","l":1,"b":"2fc4fc"}],"livingathome":[{"r":"$","b":"999999"}],"passau":[{"r":"$","b":"ff951d"}],"dhl-paket":[{"r":"$","l":1,"b":"ffc802"}],"volksbank-stuttgart":[{"r":"$","l":1,"b":"1747a6"}],"avm":[{"r":"$","l":1,"b":"4592d8"}],"avo":[{"r":"$","b":"8c275f"}],"ave":[{"r":"$","b":"91d131"}],"avg":[{"r":"$","b":"073673"}],"radio-galaxy":[{"r":"$","l":1,"b":"333333"}],"watchseries":[{"r":"$","b":"2fc4fc"}],"oovoo":[{"r":"$","b":"ff951d"}],"blogcu":[{"r":"$","l":1,"b":"5267a2"}],"openoffice":[{"r":"$","b":"4592d8"}],"rheinbahn":[{"r":"$","b":"d7011d"}],"windfinder":[{"r":"$","b":"d7011d"}],"baeckergoertz":[{"r":"$","b":"d7011d"}],"simuwelt":[{"r":"$","b":"ff951d"}],"rossmann-fotowelt":[{"r":"$","b":"abc8e2"}],"paketda":[{"r":"$","b":"abc8e2"}],"sky":[{"r":"$","l":1,"b":"333333"}],"bestsecret":[{"r":"$","b":"333333"}],"howrse":[{"r":"$","b":"50b1a2"}],"mnet-online":[{"r":"$","l":1,"b":"4592d8"}],"stadtsparkasse-kaiserslautern":[{"r":"$","l":1,"b":"f9204c"}],"20min":[{"r":"$","l":1,"b":"1747a6"}],"lebenslauf":[{"r":"$","b":"c3043e"}],"siemens":[{"r":"$","l":1,"b":"50b1a2"}],"deutsche-startups":[{"r":"$","b":"5267a2"}],"spielen":[{"r":"$","l":1,"b":"ff5349"}],"matchendirect":[{"r":"$","b":"1747a6"}],"ksk-es":[{"r":"$","b":"d7011d"}],"sparkasse-aachen":[{"r":"$","l":1,"b":"f9204c"}],"absc":[{"r":"$","b":"073673"}],"con-nect":[{"r":"$","t":"CO","b":"429abd"}],"tumblr":[{"r":"$","l":1,"b":"073673"}],"fondsfinanz":[{"r":"$","b":"073673"}],"eliteprospects":[{"r":"$","b":"d7011d"}],"thoughtcatalog":[{"r":"$","b":"333333"}],"eurojackpot":[{"r":"$","b":"fce951"}],"seagate":[{"r":"$","l":1,"b":"333333"}],"visions":[{"r":"$","b":"333333"}],"burning-seri":[{"r":"$","l":1,"b":"1747a6"}],"uni-koeln":[{"r":"$","l":1,"b":"5267a2"}],"burgerking":[{"r":"$","l":1,"b":"ffc802"}],"ndr":[{"r":"$","l":1,"b":"073673"}],"lindenstrasse":[{"r":"$","b":"4592d8"}],"nintendo":[{"r":"$","l":1,"b":"333333"}],"owa":[{"r":"$","l":1,"b":"d7011d"}],"domain":[{"r":"$","b":"74d463"}],"kreissparkasse-eichsfeld":[{"r":"$","l":1,"b":"f9204c"}],"opodo":[{"r":"$","l":1,"b":"f97136"}],"bluray-disc":[{"r":"$","b":"4592d8"}],"alexa":[{"r":"$","l":1,"b":"4592d8"}],"tubebox":[{"r":"$","b":"c78e6d"}],"giantbomb":[{"r":"$","b":"e24b2c"}],"lvm":[{"r":"$","b":"328c67"}],"rheinpfalz":[{"r":"$","b":"5267a2"}],"vans":[{"r":"$","l":1,"b":"e92207"}],"einsplus":[{"r":"$","b":"91d131"}],"playstationfront":[{"r":"$","b":"abc8e2"}],"baby-markt":[{"r":"$","b":"91d131"}],"straubing":[{"r":"$","b":"abc8e2"}],"iloveradio":[{"r":"$","l":1,"b":"333333"}],"jung":[{"r":"$","b":"07613c"}],"mmorpg":[{"r":"$","b":"1747a6"}],"piratenpartei":[{"r":"$","b":"ff951d"}],"frauenaerzte-im-netz":[{"r":"$","b":"c78e6d"}],"blogg":[{"r":"$","b":"2fc4fc"}],"unternehmensregister":[{"r":"$","b":"d7011d"}],"emero":[{"r":"$","b":"c78e6d"}],"br-online":[{"r":"$","l":1,"b":"4592d8"}],"die-topnews":[{"r":"$","l":1,"b":"c3043e"}],"abendzeitung":[{"r":"$","l":1,"b":"d7011d"}],"fussballportal":[{"r":"$","l":1,"b":"91d131"}],"der-postillon":[{"r":"$","l":1,"b":"fce951"}],"googleblog":[{"r":"$","l":1,"b":"5ea3f9"}],"sparkasse-mainfranken":[{"r":"$","l":1,"b":"f9204c"}],"kreissparkasse-duesseldorf":[{"r":"$","l":1,"b":"f9204c"}],"bmf-steuerrechner":[{"r":"$","l":1,"b":"333333"}],"mustang-jeans":[{"r":"$","l":1,"b":"d7011d"}],"cbc":[{"r":"$","l":1,"b":"f9204c"}],"orlandosentinel":[{"r":"$","l":1,"b":"50b1a2"}],"sparkasse-wesel":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-haslach-zell":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-hochfranken":[{"r":"$","l":1,"b":"f9204c"}],"planet-sports":[{"r":"$","l":1,"b":"2fc4fc"}],"denverpost":[{"r":"$","l":1,"b":"333333"}],"elpais":[{"r":"$","l":1,"b":"333333"}],"farnell":[{"r":"$","l":1,"b":"333333"}],"falke":[{"r":"$","l":1,"b":"333333"}],"hubert-burda-media":[{"r":"$","l":1,"b":"333333"}],"heftig":[{"r":"$","l":1,"b":"ff951d"}],"steamcommunity":[{"r":"$","l":1,"b":"333333"}],"mammut":[{"r":"$","l":1,"b":"d7011d"}],"antenneduesseldorf":[{"r":"$","l":1,"b":"2fc4fc"}],"lotto-niedersachsen":[{"r":"$","l":1,"b":"ffc802"}],"thenextweb":[{"r":"$","l":1,"b":"ff5349"}],"birminghammail":[{"r":"$","l":1,"b":"d7011d"}],"washingtontimes":[{"r":"$","l":1,"b":"333333"}],"sparkasse-uelzen-luechow-dannenberg":[{"r":"$","l":1,"b":"f9204c"}],"planetoftech":[{"r":"$","l":1,"b":"1747a6"}],"whitehouse":[{"r":"$","l":1,"b":"073673"}],"napapijri":[{"r":"$","l":1,"b":"000000"}],"n-joy":[{"r":"$","l":1,"b":"91d131"}],"mirror":[{"r":"$","l":1,"b":"d7011d"}],"porsche-design":[{"r":"$","l":1,"b":"333333"}],"macnn":[{"r":"$","l":1,"b":"1747a6"}],"metro":[{"r":"$..co.uk","l":1,"b":"ff951d"},{"r":"$.co.uk","l":1,"b":"ff951d"},{"r":"$","l":1}],"internetworld":[{"r":"$","l":1,"b":"c3043e"}],"savefrom":[{"r":"$","l":1,"b":"d8ee46"}],"ladepeche":[{"r":"$","l":1,"b":"d7011d"}],"ouest-france":[{"r":"$","l":1,"b":"d7011d"}],"fashionnstyle":[{"r":"$","l":1,"b":"333333"}],"agfeo":[{"r":"$","l":1,"b":"1747a6"}],"radiohamburg":[{"r":"$","l":1,"b":"d7011d"}],"cnnexpansion":[{"r":"$","l":1,"b":"d7011d"}],"standard":[{"r":"$..co.uk","b":"333333"},{"r":"$.co.uk","l":1,"b":"333333"}],"chevrolet":[{"r":"$","l":1,"b":"ffc802"}],"kieler-volksbank":[{"r":"$","l":1,"b":"1747a6"}],"wikimedia":[{"r":"$","l":1,"b":"429abd"}],"stadtsparkasse-remscheid":[{"r":"$","l":1,"b":"f9204c"}],"dhfpg":[{"r":"$","l":1,"b":"333333"}],"sparkasse-paderborn":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-stade-altes-land":[{"r":"$","l":1,"b":"f9204c"}],"cinexx":[{"r":"$","l":1,"b":"073673"}],"sparkasse-ulm":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-witten":[{"r":"$","l":1,"b":"f9204c"}],"ufastuttgart":[{"r":"$","l":1,"b":"1747a6"}],"barackobama":[{"r":"$","l":1,"b":"5ea3f9"}],"sparkasse-dortmund":[{"r":"$","l":1,"b":"f9204c"}],"fortune":[{"r":"$","l":1,"b":"ff5349"}],"newsweek":[{"r":"$","l":1,"b":"e92207"}],"sparkasse-chemnitz":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-st-blasien":[{"r":"$","l":1,"b":"f9204c"}],"ingbank":[{"r":"$","l":1,"b":"f97136"}],"goog":[{"r":"$","l":1,"b":"666666"}],"tiempo":[{"r":"$","l":1,"b":"4592d8"}],"thestar":[{"r":"$","l":1,"b":"e92207"}],"uq":[{"r":"$","l":1,"b":"530773"}],"sparkasse-unstrut-hainich":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-krefeld":[{"r":"$","l":1,"b":"f9204c"}],"moresiteslike":[{"r":"$","b":"5ea3f9"}],"sparkasse-niederbayern-mitte":[{"r":"$","l":1,"b":"f9204c"}],"cbssports":[{"r":"$","l":1,"b":"073673"}],"troisetoiles":[{"r":"$","l":1,"b":"d7011d"}],"sternefresser":[{"r":"$","l":1,"b":"ffc802"}],"cobi":[{"r":"$","l":1,"b":"333333"}],"riotgames":[{"r":"$","l":1,"b":"333333"}],"consorsbank":[{"r":"$","l":1,"b":"2fc4fc"}],"nw":[{"r":"$","l":1,"b":"d7011d"}],"tech":[{"r":"$","l":1,"b":"4592d8"}],"searchengineland":[{"r":"$","l":1,"b":"5ea3f9"}],"heraldscotland":[{"r":"$","l":1,"b":"4592d8"}],"gecce":[{"r":"$","l":1,"b":"1747a6"}],"dailyrecord":[{"r":"$","l":1,"b":"d7011d"}],"eleconomista":[{"r":"$","l":1,"b":"f97136"}],"nypost":[{"r":"$","l":1,"b":"d7011d"}],"vitalfootball":[{"r":"$","l":1,"b":"333333"}],"thetimes":[{"r":"$","l":1,"b":"333333"}],"1and1":[{"r":"$","l":1,"b":"073673"}],"yourweather":[{"r":"$","l":1,"b":"4592d8"}],"thenation":[{"r":"$","l":1,"b":"d7011d"}],"lasvegassun":[{"r":"$","l":1,"b":"ffc802"}],"wwnytv":[{"r":"$","l":1,"b":"1747a6"}],"thinkprogress":[{"r":"$","l":1,"b":"333333"}],"volksbank-vorarlberg":[{"r":"$","l":1,"b":"5267a2"}],"motherjones":[{"r":"$","l":1,"b":"d7011d"}],"uzh":[{"r":"$","b":"666666"}],"volksbank-ulm-biberach":[{"r":"$","l":1,"b":"1747a6"}],"property-magazine":[{"r":"$","l":1,"b":"999999"}],"volksbank-rietberg":[{"r":"$","l":1,"b":"1747a6"}],"worldtime":[{"r":"$","l":1,"b":"429abd"}],"kiweb":[{"r":"$","l":1,"b":"ffc802"}],"tengelmann":[{"r":"$","l":1,"b":"d7011d"}],"msnbc":[{"r":"$","l":1,"b":"333333"}],"klassikradio":[{"r":"$","l":1,"b":"91d131"}],"thehendonmob":[{"r":"$","l":1,"b":"333333"}],"benetton":[{"r":"$","l":1,"b":"74d463"}],"uni-magdeburg":[{"r":"$","l":1,"b":"333333"}],"golang":[{"r":"$","l":1,"b":"2fc4fc"}],"4chan":[{"r":"$","l":1,"b":"91d131"}],"ama":[{"r":"$","l":1,"b":"e92207"}],"observer":[{"r":"$","l":1,"b":"333333"}],"volksbank":[{"r":"$","l":1,"b":"1747a6"}],"netd":[{"r":"$","l":1,"b":"5ea3f9"}],"sparkasse-celle":[{"r":"$","l":1,"b":"f9204c"}],"rightmove":[{"r":"$.co.uk","l":1,"b":"91d131"},{"r":"$.com","l":1,"b":"91d131"},{"r":"$","l":1,"b":"91d131"}],"sparkasse-freiburg":[{"r":"$","l":1,"b":"f9204c"}],"alnatura":[{"r":"$","l":1,"b":"d8ee46"}],"sparkasse-trier":[{"r":"$","l":1,"b":"f9204c"}],"taunussparkasse":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-gelsenkirchen":[{"r":"$","l":1,"b":"f9204c"}],"credit-suisse":[{"r":"$","l":1,"b":"073673"}],"rockantenne":[{"r":"$","l":1,"b":"d7011d"}],"ferrari":[{"r":"$","l":1,"b":"333333"}],"sparkasse-duisburg":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-hildesheim":[{"r":"$","l":1,"b":"f9204c"}],"walbusch":[{"r":"$","l":1,"b":"c3043e"}],"zalando-lounge":[{"r":"$","l":1,"b":"ffc802"}],"sparkasse-oberhessen":[{"r":"$","l":1,"b":"f9204c"}],"bmwgroup":[{"r":"$","l":1,"b":"333333"}],"f-i":[{"r":"$","l":1,"b":"333333"}],"tesco":[{"r":"$.com","l":1,"b":"e92207"}],"sparkasse-osnabrueck":[{"r":"$","l":1,"b":"f9204c"}],"medi-learn":[{"r":"$","l":1,"b":"1747a6"}],"brazzers":[{"r":"$","l":1,"b":"ffc802"}],"webstatsdomain":[{"r":"$","b":"1747a6"}],"fa":[{"r":"$","l":1,"b":"073673"}],"fachwerk":[{"r":"$","l":1,"b":"c78e6d"}],"aldi-suisse":[{"r":"$","l":1,"b":"1747a6"}],"maps24":[{"r":"$","l":1,"b":"073673"}],"immobilien":[{"r":"$","l":1,"b":"1747a6"}],"argos":[{"r":"$.co.uk","l":1,"b":"e92207"}],"putlocker":[{"r":"$","l":1,"b":"74d463"}],"zeitverschiebung":[{"r":"$","l":1,"b":"999999"}],"mpg":[{"r":"$","l":1,"b":"50b1a2"}],"cinedom":[{"r":"$","l":1,"b":"333333"}],"evernote":[{"r":"$","l":1,"b":"74d463"}],"tedox":[{"r":"$","l":1,"b":"d7011d"}],"dasding":[{"r":"$","l":1,"b":"fede07"}],"sparkasse-darmstadt":[{"r":"$","l":1,"b":"f9204c"}],"hs-mannheim":[{"r":"$","l":1,"b":"1747a6"}],"victoriassecret":[{"r":"$","l":1,"b":"fb91ae"}],"eba":[{"r":"$","l":1,"b":"1747a6"}],"fh-bielefeld":[{"r":"$","l":1,"b":"2fc4fc"}],"sparkasse-heidelberg":[{"r":"$","l":1,"b":"f9204c"}],"rtdeutsch":[{"r":"$","l":1,"b":"91d131"}],"deutschlandfunk":[{"r":"$","l":1,"b":"1747a6"}],"vanityfair":[{"r":"$","l":1,"b":"e92207"}],"fcstpauli":[{"r":"$","l":1,"b":"d7011d"}],"hot":[{"r":"$","l":1,"b":"1747a6"}],"engelvoelkers":[{"r":"$","l":1,"b":"333333"}],"desigual":[{"r":"$","l":1,"b":"333333"}],"saalesparkasse":[{"r":"$","l":1,"b":"f9204c"}],"spardeingeld":[{"r":"$","l":1,"b":"073673"}],"akb":[{"r":"$","l":1,"b":"2fc4fc"}],"volksbank-freiburg":[{"r":"$","l":1,"b":"1747a6"}],"s-immobilien":[{"r":"$","l":1,"b":"d7011d"}],"marc-o-polo":[{"r":"$.com","l":1,"b":"666666"},{"r":"$","l":1,"b":"666666"}],"gazetaexpress":[{"r":"$","l":1,"b":"e92207"}],"bmw-motorrad":[{"r":"$","l":1,"b":"333333"}],"startpage":[{"r":"$","l":1,"b":"43bdd9"}],"comcast":[{"r":"$","l":1,"b":"333333"}],"livejasmin":[{"r":"$.com","l":1,"b":"e92207"}],"gamefaqs":[{"r":"$","l":1,"b":"506bb8"}],"marksandspencer":[{"r":"$.com","l":1,"b":"333333"},{"r":"$","l":1,"b":"333333"}],"sparkasse-wittgenstein":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-schwerte":[{"r":"$","l":1,"b":"f9204c"}],"rvbmil":[{"r":"$","l":1,"b":"1747a6"}],"sparkasse-saarbruecken":[{"r":"$","l":1,"b":"f9204c"}],"bostonglobe":[{"r":"$","l":1,"b":"333333"}],"sparkasse-dachau":[{"r":"$","l":1,"b":"f9204c"}],"gillette":[{"r":"$","l":1,"b":"073673"}],"lacoste":[{"r":"$","l":1,"b":"07613c"}],"lopoca":[{"r":"$","l":1,"b":"ffc802"}],"sparkasse-unnakamen":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-neuburg-rain":[{"r":"$","l":1,"b":"f9204c"}],"scotsman":[{"r":"$","l":1,"b":"333333"}],"dailystar":[{"r":"$.co.uk","l":1,"b":"e92207"}],"sparkasse-kehl":[{"r":"$","l":1,"b":"f9204c"}],"youjizz-tube":[{"r":"$","b":"333333"}],"sparkasse-iserlohn":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-forchheim":[{"r":"$","l":1,"b":"f9204c"}],"funkhauseuropa":[{"r":"$","l":1,"b":"073673"}],"bestbuy":[{"r":"$","l":1,"b":"1747a6"}],"bs":[{"r":"$.to","l":1,"b":"1747a6"},{"r":"$","l":1,"b":"999999"}],"homedepot":[{"r":"$","l":1,"b":"ff951d"}],"epfl":[{"r":"$","l":1,"b":"d7011d"}],"armani":[{"r":"$","l":1,"b":"333333"}],"metropolfm":[{"r":"$","l":1,"b":"f8458f"}],"harmonyfm":[{"r":"$.de","l":1,"b":"ffc802"}],"sparkasseel175":[{"r":"$","l":1,"b":"f9204c"}],"fc-heidenheim":[{"r":"$","l":1,"b":"073673"}],"sparkasse-sw":[{"r":"$","l":1,"b":"f9204c"}],"cartoonnetworkasia":[{"r":"$","l":1,"b":"2fc4fc"}],"office365":[{"r":"$","l":1,"b":"e24b2c"}],"harvard":[{"r":"$","l":1,"b":"c3043e"}],"sparkasse-tauberfranken":[{"r":"$","l":1,"b":"f9204c"}],"vo":[{"r":"$","l":1,"b":"f97136"}],"chanel":[{"r":"$","l":1,"b":"333333"}],"sparkasse-unna":[{"r":"$","l":1,"b":"f9204c"}],"traumpalast":[{"r":"$","l":1,"b":"506bb8"}],"sparkasse-detmold":[{"r":"$","l":1,"b":"f9204c"}],"easywg":[{"r":"$","l":1,"b":"506bb8"}],"sparkasse-hochschwarzwald":[{"r":"$","l":1,"b":"f9204c"}],"themoneyconverter":[{"r":"$","l":1,"b":"91d131"}],"au":[{"r":"$","l":1,"b":"c78e6d"}],"sparkasse-neuwied":[{"r":"$","l":1,"b":"f9204c"}],"sv98":[{"r":"$","l":1,"b":"1747a6"}],"sparkasse-kaufbeuren":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-hildburghausen":[{"r":"$","l":1,"b":"f9204c"}],"kcl":[{"r":"$","l":1,"b":"d7011d"}],"bmjv":[{"r":"$","l":1,"b":"333333"}],"sparkasse-gevelsberg":[{"r":"$","l":1,"b":"f9204c"}],"tegut":[{"r":"$","l":1,"b":"f97136"}],"unibas":[{"r":"$","l":1,"b":"333333"}],"kreissparkasse-diepholz":[{"r":"$","l":1,"b":"f9204c"}],"facecoverz":[{"r":"$","t":"fc","b":"506bb8"}],"sparkasse-rhein-neckar-nord":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-dillenburg":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-osterode":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-am-niederrhein":[{"r":"$","l":1,"b":"f9204c"}],"dgb":[{"r":"$","l":1,"b":"d7011d"}],"walesonline":[{"r":"$","l":1,"b":"d7011d"}],"cartoonnetwork":[{"r":"$","l":1,"b":"2fc4fc"}],"fhv":[{"r":"$","l":1,"b":"333333"}],"sparkasse-singen-radolfzell":[{"r":"$","l":1,"b":"f9204c"}],"bmwbank":[{"r":"$","l":1,"b":"333333"}],"sparkasse-schwelm":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-bremerhaven":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-freising":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-langenfeld":[{"r":"$","l":1,"b":"f9204c"}],"royalmail":[{"r":"$.com","l":1,"b":"e92207"},{"r":"$","l":1,"b":"e92207"}],"sparkasse-duderstadt":[{"r":"$","l":1,"b":"f9204c"}],"amalgama-lab":[{"r":"$","b":"d7011d"}],"salesforce":[{"r":"$","l":1,"b":"4592d8"}],"sparkasse-arnsberg-sundern":[{"r":"$","l":1,"b":"f9204c"}],"zappos":[{"r":"$.com","l":1,"b":"506bb8"},{"r":"$","l":1,"b":"506bb8"}],"national-lottery":[{"r":"$.co.uk","l":1,"b":"e92207"},{"r":"$","l":1,"b":"e92207"}],"kreissparkasse-gotha":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-vorpommern":[{"r":"$","l":1,"b":"f9204c"}],"radiobrocken":[{"r":"$","l":1,"b":"d7011d"}],"mckinsey":[{"r":"$.com","l":1,"b":"073673"}],"sparkasse-landsberg":[{"r":"$","l":1,"b":"f9204c"}],"mangooutlet":[{"r":"$","l":1,"b":"333333"}],"harzsparkasse":[{"r":"$","l":1,"b":"f9204c"}],"neu":[{"r":"$","l":1,"b":"d7011d"}],"mopo24":[{"r":"$","l":1,"b":"d7011d"}],"w-support":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-schongau":[{"r":"$","l":1,"b":"f9204c"}],"kreissparkasse-ahrweiler":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-mittelfranken-sued":[{"r":"$","l":1,"b":"f9204c"}],"zarahome":[{"r":"$","l":1,"b":"333333"}],"sparkasse-ingolstadt":[{"r":"$","l":1,"b":"f9204c"}],"mainz05":[{"r":"$","l":1,"b":"d7011d"}],"eterna":[{"r":"$","l":1,"b":"333333"}],"sparkasse-weserbergland":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-herdecke":[{"r":"$","l":1,"b":"f9204c"}],"deseretnews":[{"r":"$","l":1,"b":"333333"}],"greuther-fuerth":[{"r":"$","l":1,"b":"328c67"}],"sparkasse-mecklenburg-schwerin":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-erlangen":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-regen-viechtach":[{"r":"$","l":1,"b":"f9204c"}],"kbs":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-werra-meissner":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-neunkirchen":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-uecker-randow":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-guenzburg-krumbach":[{"r":"$","l":1,"b":"f9204c"}],"hsbc":[{"r":"$.co.uk","l":1,"b":"e92207"}],"rhoen-rennsteig-sparkasse":[{"r":"$","l":1,"b":"f9204c"}],"radiosaw":[{"r":"$","l":1,"b":"d7011d"}],"radio7":[{"r":"$","l":1,"b":"073673"}],"sparkasse-parchim":[{"r":"$","l":1,"b":"f9204c"}],"ucl":[{"r":"$","l":1,"b":"ff951d"}],"sparkasse-hochrhein":[{"r":"$","l":1,"b":"f9204c"}],"ard-text":[{"r":"$","l":1,"b":"073673"}],"balkanweb":[{"r":"$","l":1,"b":"1747a6"}],"marc-cain":[{"r":"$","l":1,"b":"999999"}],"corrieredellosport":[{"r":"$","l":1,"b":"d7011d"}],"sparkassedeggendorf":[{"r":"$","l":1,"b":"f9204c"}],"t-nation":[{"r":"$","l":1,"b":"d7011d"}],"radiobob":[{"r":"$","l":1,"b":"333333"}],"cartoonnetworkarabic":[{"r":"$","l":1,"b":"2fc4fc"}],"sparkasse-beckum":[{"r":"$","l":1,"b":"f9204c"}],"lastampa":[{"r":"$","l":1,"b":"333"}],"6rtl":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-oberpfalz-nord":[{"r":"$","l":1,"b":"f9204c"}],"immobilo":[{"r":"$","l":1,"b":"d7011d"}],"aachener-bausparkasse":[{"r":"$","l":1,"b":"f9204c"}],"c1-cinema":[{"r":"$","l":1,"b":"333333"}],"zlb":[{"r":"$","l":1,"b":"d7011d"}],"radioarabella":[{"r":"$","l":1,"b":"073673"}],"sparkasse-niederlausitz":[{"r":"$","l":1,"b":"f9204c"}],"fortuna-duesseldorf":[{"r":"$","l":1,"b":"e92207"}],"salzlandsparkasse":[{"r":"$","l":1,"b":"f9204c"}],"aha":[{"r":"$","l":1,"b":"f97136"}],"sparkasse-starkenburg":[{"r":"$","l":1,"b":"f9204c"}],"obeta":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-bayreuth":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-rhein-haardt":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-lueneburg":[{"r":"$","l":1,"b":"f9204c"}],"radiorst":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-dessau":[{"r":"$","l":1,"b":"f9204c"}],"hitradio-rtl":[{"r":"$","l":1,"b":"d7011d"}],"genius":[{"r":"$","l":1,"b":"fede07"}],"basecamp":[{"r":"$","l":1,"b":"74d463"}],"kreissparkasse-nordhausen":[{"r":"$","l":1,"b":"f9204c"}],"sparkassemerzig-wadern":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-minden-luebbecke":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-emden":[{"r":"$","l":1,"b":"f9204c"}],"gminsidenews":[{"r":"$","b":"1747a6"}],"dior":[{"r":"$","l":1,"b":"333333"}],"trigema":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-solingen":[{"r":"$","l":1,"b":"f9204c"}],"lse":[{"r":"$","l":1,"b":"d7011d"}],"lowes":[{"r":"$.com","l":1,"b":"073673"},{"r":"$","l":1,"b":"073673"}],"sparkasse-neckartal-odenwald":[{"r":"$","l":1,"b":"f9204c"}],"bugatti":[{"r":"$","l":1,"b":"333333"}],"drykorn":[{"r":"$","l":1,"b":"333333"}],"sparkasse-regensburg":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-wittenberg":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-muelheim-ruhr":[{"r":"$","l":1,"b":"f9204c"}],"charivari":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-gera-greiz":[{"r":"$","l":1,"b":"f9204c"}],"kreissparkasse-euskirchen":[{"r":"$","l":1,"b":"f9204c"}],"bogner":[{"r":"$","l":1,"b":"999999"}],"st-peter-ording":[{"r":"$","l":1,"b":"4592d8"}],"bodas":[{"r":"$","l":1,"b":"d7011d"}],"fakku":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-nordhorn":[{"r":"$","l":1,"b":"f9204c"}],"k-plus-s":[{"r":"$","l":1,"b":"1747a6"}],"kreissparkasse-osterholz":[{"r":"$","l":1,"b":"f9204c"}],"capitalone":[{"r":"$.com","l":1,"b":"d7011d"},{"r":"$","l":1,"b":"d7011d"}],"sparkasse-dillingen":[{"r":"$","l":1,"b":"f9204c"}],"dailykos":[{"r":"$","l":1,"b":"f97136"}],"out":[{"r":"$","l":1,"b":"ff951d"}],"fsv-frankfurt":[{"r":"$.de","l":1,"b":"1747a6"},{"r":"$","l":1,"b":"1747a6"}],"gov":[{"r":"service.$.uk","l":1,"b":"333333"},{"r":"direct.$.uk","l":1,"b":"333333"},{"r":"$.uk","l":1,"b":"333333"},{"r":"$","b":"74d463"}],"moevenpick-hotels":[{"r":"$","l":1,"b":"c3043e"}],"wellensteyn":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-neu-ulm-illertissen":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-vorderpfalz":[{"r":"$","l":1,"b":"f9204c"}],"stantonamarlberg":[{"r":"$","l":1,"b":"d7011d"}],"go-ofterschwang":[{"r":"$","l":1,"b":"91d131"}],"radiof":[{"r":"$","l":1,"b":"74d463"}],"williamhill":[{"r":"$","l":1,"b":"073673"}],"eventimsports":[{"r":"$","l":1,"b":"ffc802"}],"sparkasse-hoexter":[{"r":"$","l":1,"b":"f9204c"}],"egofm":[{"r":"$","l":1,"b":"91d131"}],"sparkasse-dueren":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-meissen":[{"r":"$","l":1,"b":"f9204c"}],"lloydsbank":[{"r":"$.com","l":1,"b":"328c67"},{"r":"$","l":1,"b":"328c67"}],"sparkasse-rhein-nahe":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-amberg-sulzbach":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-co-lif":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-donnersberg":[{"r":"$","l":1,"b":"f9204c"}],"alsterradio":[{"r":"$.de","l":1,"b":"ff951d"}],"deloitte":[{"r":"$","l":1,"b":"073673"}],"natwest":[{"r":"$.com","l":1,"b":"530773"},{"r":"$","l":1,"b":"530773"}],"sparkasse-giessen":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-vogtland":[{"r":"$","l":1,"b":"f9204c"}],"wartburg-sparkasse":[{"r":"$","l":1,"b":"f9204c"}],"next":[{"r":"$","l":1,"b":"333333"}],"radiopsr":[{"r":"$","l":1,"b":"328c67"}],"fromatob":[{"r":"$","l":1,"b":"429abd"}],"s-bausparkasse":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-gm":[{"r":"$","l":1,"b":"f9204c"}],"tubecup":[{"r":"$","l":1,"b":"d7011d"}],"thenorthface":[{"r":"$","l":1,"b":"d7011d"}],"gfds":[{"r":"$.de","l":1,"b":"56eac6"}],"sparkasse-gladbeck":[{"r":"$","l":1,"b":"f9204c"}],"wargaming":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-wetter":[{"r":"$","l":1,"b":"f9204c"}],"spreeradio":[{"r":"$","l":1,"b":"91d131"}],"gerryweber":[{"r":"$","l":1,"b":"333333"}],"sparkasse-badneustadt":[{"r":"$","l":1,"b":"f9204c"}],"quora":[{"r":"$","l":1,"b":"c3043e"}],"sparkasse-mittelsachsen":[{"r":"$","l":1,"b":"f9204c"}],"animalplanet":[{"r":"$","l":1,"b":"d8ee46"}],"stefanel":[{"r":"$","l":1,"b":"333333"}],"khl":[{"r":"$","l":1,"b":"1747a6"}],"penny-reisen":[{"r":"$","l":1,"b":"e92207"}],"sparkasse-spree-neisse":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-nienburg":[{"r":"$","l":1,"b":"f9204c"}],"bfmtv":[{"r":"$","l":1,"b":"073673"}],"southparkstudios":[{"r":"$","l":1,"b":"333333"}],"bmvit":[{"r":"$","l":1,"b":"91d131"}],"antennethueringen":[{"r":"$","l":1,"b":"c3043e"}],"sparkasse-schwandorf":[{"r":"$","l":1,"b":"f9204c"}],"sparkassen-direkt":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-bensheim":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-wa-fkb":[{"r":"$","l":1,"b":"f9204c"}],"gap":[{"r":"$","l":1,"b":"073673"}],"sparkasse-harburg-buxtehude":[{"r":"$","l":1,"b":"f9204c"}],"kreissparkasse-kelheim":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-wiehl":[{"r":"$","l":1,"b":"f9204c"}],"duke":[{"r":"$","l":1,"b":"1747a6"}],"sparkasse-suedwestpfalz":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-kleve":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-odenwaldkreis":[{"r":"$","l":1,"b":"f9204c"}],"ralphlauren":[{"r":"$","l":1,"b":"333333"}],"radiokiepenkerl-online":[{"r":"$","l":1,"b":"1747a6"}],"underarmour":[{"r":"$","l":1,"b":"d7011d"}],"dallasnews":[{"r":"$","l":1,"b":"333333"}],"sparkasse-loerrach":[{"r":"$","l":1,"b":"f9204c"}],"monopol-magazin":[{"r":"$.de","l":1,"b":"333333"},{"r":"$","l":1,"b":"333333"}],"sparkasse-meschede":[{"r":"$","l":1,"b":"f9204c"}],"suntimes":[{"r":"$","l":1,"b":"333333"}],"vereinigte-sparkassen":[{"r":"$","l":1,"b":"f9204c"}],"sbausparkasse":[{"r":"$","l":1,"b":"f9204c"}],"freeroms":[{"r":"$","l":1}],"stadtsparkasse-bocholt":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-schwedt":[{"r":"$","l":1,"b":"f9204c"}],"salue":[{"r":"$","l":1,"b":"333333"}],"spielfilm":[{"r":"$","l":1,"b":"333333"}],"sparkasse-wilhelmshaven":[{"r":"$","l":1,"b":"f9204c"}],"ugb":[{"r":"$","l":1,"b":"74d463"}],"sparkasse-rottweil":[{"r":"$","l":1,"b":"f9204c"}],"wellsfargo":[{"r":"$","l":1,"b":"e92207"}],"sparkasse-zollernalb":[{"r":"$","l":1,"b":"f9204c"}],"cbn":[{"r":"$","l":1,"b":"2fc4fc"}],"volksbank-bi-gt":[{"r":"$","l":1,"b":"1747a6"}],"pepejeans":[{"r":"$","l":1,"b":"333333"}],"breakingnews":[{"r":"$","l":1,"b":"ff5349"}],"rewe-reisen":[{"r":"$","l":1,"b":"d7011d"}],"gutscheinfun":[{"r":"$","t":"GF","b":"c3043e"}],"radiogong":[{"r":"$","l":1,"b":"d7011d"}],"radiowuppertal":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-wasserburg":[{"r":"$","l":1,"b":"f9204c"}],"slf":[{"r":"$","l":1,"b":"4592d8"}],"vdh":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-saalfeld-rudolstadt":[{"r":"$","l":1,"b":"f9204c"}],"radiobielefeld":[{"r":"$","l":1,"b":"d7011d"}],"southparkstreaming":[{"r":"$","l":1,"b":"333333"}],"you":[{"r":"$","l":1,"b":"56eac6"}],"sparkasse-sha":[{"r":"$","l":1,"b":"f9204c"}],"t-shirtforums":[{"r":"$","l":1,"b":"d7011d"}],"dolcegabbana":[{"r":"$","l":1,"b":"999999"}],"sparkasse-hochsauerland":[{"r":"$","l":1,"b":"f9204c"}],"rtlradio":[{"r":"$","l":1,"b":"d7011d"}],"sparkasse-ger-kandel":[{"r":"$","l":1,"b":"f9204c"}],"domradio":[{"r":"$","l":1,"b":"d7011d"}],"nobelprize":[{"r":"$","l":1,"b":"ffc802"}],"sparkasse-kraichgau":[{"r":"$","l":1,"b":"f9204c"}],"fcingolstadt":[{"r":"$","l":1,"b":"e92207"}],"berkeley":[{"r":"$","l":1,"b":"073673"}],"rewe-online":[{"r":"$","l":1,"b":"d7011d"}],"espn":[{"r":"$","l":1,"b":"c3043e"}],"radiodresden":[{"r":"$","l":1,"b":"073673"}],"nationwide":[{"r":"$.co.uk","l":1,"b":"073673"},{"r":"$","l":1,"b":"073673"}],"starfm":[{"r":"$","l":1,"b":"d7011d"}],"house-of-gerryweber":[{"r":"$","l":1,"b":"333333"}],"ki":[{"r":"$","l":1,"b":"ff5349"}],"kreissparkassealtenkirchen":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-pfaffenhofen":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-luedenscheid":[{"r":"$","l":1,"b":"f9204c"}],"strellson":[{"r":"$","l":1,"b":"333333"}],"radio-mk":[{"r":"$","l":1,"b":"f8458f"}],"macys":[{"r":"$","l":1,"b":"d7011d"}],"nationaljournal":[{"r":"$","l":1,"b":"c78e6d"}],"sparkasse-garmisch":[{"r":"$","l":1,"b":"f9204c"}],"radiolippe":[{"r":"$","l":1,"b":"d7011d"}],"radiopaloma":[{"r":"$","l":1,"b":"ff951d"}],"sparkasse-offenbach":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-lippstadt":[{"r":"$","l":1,"b":"f9204c"}],"sparkassen-immo":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-ansbach":[{"r":"$","l":1,"b":"f9204c"}],"sparkasse-goch":[{"r":"$","l":1,"b":"f9204c"}],"dieneue1077":[{"r":"$","l":1,"b":"333333"}],"googeln":[{"r":"$","l":1,"b":"073673"}],"t-systems":[{"r":"$","l":1,"b":"f8458f"}],"googelmail":[{"r":"$","l":1,"b":"d7011d"}],"chefkoch-app":[{"r":"$","l":1,"b":"328c67"}],"berliner-rundfunk":[{"r":"$","l":1,"b":"073673"}],"sparkasse-koelnbonn-stiftungen":[{"r":"$","l":1,"b":"f9204c"}],"fronhofer-realschule":[{"r":"$","t":"FR","b":"1747a6"}],"boobdesign":[{"r":"$.com","l":1,"b":"fb91ae"}],"chaturbatefreecams":[{"r":"$","b":"d7011d"}],"thisamericanlife":[{"r":"$","l":1,"b":"073673"}],"facenet":[{"r":"$","l":1,"b":"e92207"}],"domproof":[{"r":"$","b":"2fc4fc"}],"rene-lezard":[{"r":"$","l":1,"b":"333333"}],"spa-francorchamps":[{"r":"$","l":1,"b":"333333"}],"we-online":[{"r":"$","l":1,"b":"e92207"}],"youporn-deutsch-tv":[{"r":"$","l":1,"b":"d7011d"}],"x-tra":[{"r":"$","l":1,"b":"333333"}],"uniba":[{"r":"$","l":1,"b":"1747a6"}],"porndull":[{"r":"$","b":"333333"}],"nus":[{"r":"$","l":1,"b":"073673"}],"fdating":[{"r":"$","l":1,"b":"d7011d"}],"brown":[{"r":"$","l":1,"b":"333333"}],"pandastats":[{"r":"$","b":"333333"}],"x-verleih":[{"r":"$","l":1,"b":"333333"}],"osnabruecker-nachrichten":[{"r":"$","t":"ON","b":"d7011d"}],"my-login24":[{"r":"$","l":1,"b":"2fc4fc"}],"volksbank-neu-ulm":[{"r":"$","l":1,"b":"1747a6"}],"ebas":[{"r":"$","l":1,"b":"1747a6"}],"ystuff":[{"r":"$","l":1,"b":"ffc802"}],"adidas-group":[{"r":"$","l":1,"b":"999999"}],"mein-login":[{"r":"$","l":1,"b":"43bdd9"}],"immonetmanager":[{"r":"$","l":1,"b":"2fc4fc"}],"g-net":[{"r":"$","l":1,"b":"74d463"}],"team-f":[{"r":"$","l":1,"b":"1747a6"}],"jjgirls":[{"r":"$","b":"d7011d"}],"ox":[{"r":"$","l":1,"b":"073673"}],"cinema-muenchen":[{"r":"$","l":1,"b":"333333"}],"extremnews":[{"r":"$","l":1,"b":"c3043e"}],"h-germanistik":[{"r":"$","l":1,"b":"50b1a2"}],"tube8sex":[{"r":"$","l":1,"b":"333333"}],"mi":[{"r":"$","l":1,"b":"f97136"}],"tnt-express":[{"r":"$","l":1,"b":"f97136"}],"sparkassen-stiftungsmanagement":[{"r":"$","l":1,"b":"f9204c"}],"fac":[{"r":"$","l":1,"b":"073673"}],"ama-sensorik":[{"r":"$","l":1,"b":"d7011d"}],"cprogramming":[{"r":"$","l":1,"b":"d7011d"}],"fakkudroid":[{"r":"$","l":1,"b":"d7011d"}],"pku":[{"r":"$","l":1,"b":"d7011d"}],"out-ev":[{"r":"$","b":"ffc802"}],"replay":[{"r":"$","l":1,"b":"d7011d"}],"columbia":[{"r":"$","l":1,"b":"1747a6"}],"justyo":[{"r":"$","l":1,"b":"8a52a2"}],"moevenpick-eis":[{"r":"$","l":1,"b":"333333"}],"wewillrockyou":[{"r":"$","l":1,"b":"333333"}],"citi":[{"r":"$.com","l":1,"b":"1747a6"},{"r":"$","l":1,"b":"1747a6"}],"planetromeofoundation":[{"r":"$","l":1,"b":"91d131"}],"sparkassen-finanzportal":[{"r":"$","l":1,"b":"f9204c"}],"rstudio":[{"r":"$","l":1,"b":"4592d8"}],"sugru":[{"r":"$","l":1,"b":"f9204c"}],"ko-j":[{"r":"$","l":1,"b":"999999"}],"youjizz-now":[{"r":"$","l":1,"b":"e92207"}],"editionf":[{"r":"$","l":1,"b":"333333"}],"hotm":[{"r":"$.eu","l":1,"b":"5ea3f9"},{"r":"$","l":1,"b":"666666"}],"vmagazine":[{"r":"$","l":1,"b":"333333"}],"z-bar":[{"r":"$","l":1,"b":"d7011d"}],"jgerman":[{"r":"$","l":1,"b":"999999"}],"goo-u":[{"r":"$","l":1,"b":"fede07"}],"ebv-berlin":[{"r":"$","l":1,"b":"429abd"}],"immobilienscout":[{"r":"$","l":1,"b":"e24b2c"}],"bs-net":[{"r":"$","l":1,"b":"5ea3f9"}],"radio-z":[{"r":"$","l":1,"b":"d7011d"}],"re-publica":[{"r":"$","l":1,"b":"333333"}],"ki-records":[{"r":"$","l":1,"b":"333333"}],"sparkasseblog":[{"r":"$","l":1,"b":"f9204c"}],"onospa":[{"r":"$","l":1,"b":"999999"}],"nordseeduggen":[{"r":"$","l":1,"b":"d7011d"}],"vpay":[{"r":"$","l":1,"b":"073673"}],"emule-mods":[{"r":"$","t":"eM","b":"91d131"}],"mai":[{"r":"$","l":1,"b":"d8ee46"}],"b-und-b":[{"r":"$","l":1,"b":"74d463"}],"q-das":[{"r":"$","l":1,"b":"073673"}],"porsche-stuttgart":[{"r":"$.de","l":1,"b":"333333"}],"d-velop":[{"r":"$","l":1,"b":"666666"}],"1000robota":[{"r":"$","b":"333333"}],"caltech":[{"r":"$","l":1,"b":"ff951d"}],"princeton":[{"r":"$","l":1,"b":"ff951d"}],"6pm":[{"r":"$.com","l":1,"b":"c3043e"}],"ww-clean":[{"r":"$","l":1,"b":"5ea3f9"}],"bela-b":[{"r":"$","l":1,"b":"ffc802"}],"jhu":[{"r":"$","l":1,"b":"073673"}],"cam":[{"r":"$","l":1,"b":"006567"}],"comdirekt":[{"r":"$","l":1,"b":"333333"}],"me-berlin":[{"r":"$","l":1,"b":"d7011d"}],"brazzers-videos":[{"r":"$","l":1,"b":"ffc802"}],"ifttt":[{"r":"$","l":1,"b":"2fc4fc"}],"svs1916":[{"r":"$","l":1,"b":"333333"}],"j-et":[{"r":"$","l":1,"b":"d7011d"}],"state":[{"r":"$","l":1,"b":"073673"}],"drop":[{"r":"$","b":"d7011d"}],"hsozkult":[{"r":"$","l":1,"b":"ff951d"}],"ycombinator":[{"r":"$","l":1,"b":"f97136"}],"inforadio":[{"r":"$.de","l":1,"b":"4592d8"}],"hsv-hockey":[{"r":"$","l":1,"b":"073673"}],"dortmunder-u":[{"r":"$","l":1,"b":"666666"}],"hotmaill":[{"r":"$","l":1,"b":"4592d8"}],"c-base":[{"r":"$","l":1,"b":"1747a6"}],"bl":[{"r":"$","l":1,"b":"d7011d"}],"zeitschrift-marxistische-erneuerung":[{"r":"$","l":1,"b":"e24b2c"}],"fi-ppp":[{"r":"$","l":1,"b":"fede07"}],"correctiv":[{"r":"$","l":1,"b":"333333"}],"propeller-island":[{"r":"$","l":1}],"goocreate":[{"r":"$","l":1,"b":"333333"}],"re-el":[{"r":"$","l":1,"b":"073673"}],"kuestenforum":[{"r":"$","l":1,"b":"506bb8"}],"agar":[{"r":"$","l":1,"b":"d7011d"}],"ally":[{"r":"$","l":1,"b":"8c275f"}],"startseite24":[{"r":"$","b":"2fc4fc"}],"sparkassen-giro":[{"r":"$","l":1,"b":"f9204c"}],"fckoeln":[{"r":"$","l":1,"b":"e92207"}],"mainchat":[{"r":"$","b":"2fc4fc"}],"sparkassesiegen":[{"r":"$","l":1,"b":"f9204c"}],"fgb":[{"r":"$","l":1,"b":"5ea3f9"}],"gazetatema":[{"r":"$","l":1,"b":"333333"}],"fck-shop":[{"r":"$","l":1,"b":"e92207"}],"ulforum":[{"r":"$","l":1,"b":"ffc802"}],"917xfm":[{"r":"$.de","l":1,"b":"74d463"}],"fcn-fan-shop":[{"r":"$","l":1,"b":"c3043e"}],"medium":[{"r":"$","l":1,"b":"74d463"}],"radioteddy":[{"r":"$","l":1,"b":"fede07"}],"sparkassen-muensterland-giro":[{"r":"$","l":1,"b":"f9204c"}],"ucla":[{"r":"$","l":1,"b":"1747a6"}],"escada":[{"r":"$","l":1,"b":"333333"}],"sparkassenmakler":[{"r":"$","l":1,"b":"f9204c"}],"seidensticker":[{"r":"$","l":1,"b":"333333"}],"bfd":[{"r":"$","l":1,"b":"d248ca"}],"herthabsc-bonus":[{"r":"$","l":1,"b":"1747a6"}],"youfm":[{"r":"$","l":1,"b":"006567"}],"tw":[{"r":"$","l":1,"b":"4592d8"}],"digel":[{"r":"$","l":1,"b":"333333"}],"ksc-onlineshop":[{"r":"$","l":1,"b":"1747a6"}],"agar-disco":[{"r":"$","l":1,"b":"c3043e"}],"fiducia":[{"r":"$.de","l":1,"b":"506bb8"}],"sparkasse-mslo":[{"r":"$","l":1,"b":"f9204c"}],"nfp":[{"r":"$","l":1,"b":"4592d8"}],"jacobs":[{"r":"$","l":1,"b":"333333"}],"ard-buffet":[{"r":"$","l":1,"b":"073673"}],"youm7":[{"r":"$","l":1,"b":"d7011d"}],"mnet":[{"r":"$","l":1,"b":"4592d8"}],"radiorsg":[{"r":"$","l":1,"b":"50b1a2"}],"kunsthalle-sparkasse":[{"r":"$","b":"f9204c"}],"brax":[{"r":"$","l":1,"b":"333333"}],"sparkasseiserlohn":[{"r":"$","l":1,"b":"f9204c"}],"mdgms":[{"r":"$","l":1,"b":"1747a6"}],"pravda":[{"r":"$","l":1,"b":"d7011d"}],"bugatti-fashion":[{"r":"$","l":1,"b":"333333"}],"joker-jeans":[{"r":"$","l":1,"b":"e24b2c"}],"khb":[{"r":"$","l":1,"b":"073673"}],"kissfmuk":[{"r":"$","l":1,"b":"c3043e"}],"sparkassewitten":[{"r":"$","l":1,"b":"f9204c"}],"afp":[{"r":"$.com","l":1,"b":"4592d8"},{"r":"$","l":1,"b":"4592d8"}],"afd":[{"r":"$","l":1,"b":"92dba4"}],"bi-web":[{"r":"$","l":1,"b":"073673"}],"transferwise":[{"r":"$.com","l":1,"b":"2fc4fc"},{"r":"$","l":1,"b":"2fc4fc"}],"faz-archiv-shop":[{"r":"$","l":1,"b":"666666"}],"worldtimezone":[{"r":"$","t":"WT"}],"sch":[{"r":"$","l":1,"b":"d7011d"}],"hosports":[{"r":"$","l":1,"b":"333333"}],"northwestern":[{"r":"$","l":1,"b":"530773"}],"ens":[{"r":"$","l":1,"b":"530773"}],"sparkasse-engo":[{"r":"$","l":1,"b":"f9204c"}],"p-exclamation":[{"r":"$","l":1,"b":"f97136"}],"hsv-bu":[{"r":"$","l":1,"b":"fede07"}],"sparkasse-gunzenhausen":[{"r":"$","l":1,"b":"f9204c"}],"sparkasseamniederrhein":[{"r":"$","l":1,"b":"f9204c"}],"ntu":[{"r":"$","l":1,"b":"073673"}],"citigroup":[{"r":"$","l":1,"b":"1747a6"}],"classicrock-radio":[{"r":"$","l":1,"b":"d7011d"}],"ilovespa":[{"r":"$","l":1,"b":"fb91ae"}],"sparkasse-dinkelsbuehl":[{"r":"$","l":1,"b":"f9204c"}],"agf":[{"r":"$","l":1,"b":"2fc4fc"}],"anu":[{"r":"$","l":1,"b":"333333"}],"airfield":[{"r":"$","l":1,"b":"333333"}],"radiocharivari":[{"r":"$","l":1,"b":"c3043e"}],"verizonwireless":[{"r":"$","l":1,"b":"d7011d"}],"directrev":[{"r":"$","l":1,"b":"e92207"}],"gfycat":[{"r":"$","l":1,"b":"f97136"}],"halifax-online":[{"r":"$","l":1,"b":"9077e3"}],"ijreview":[{"r":"$","l":1,"b":"333333"}],"johnlewis":[{"r":"$","l":1,"b":"006567"}],"moneysavingexpert":[{"r":"$","l":1,"b":"530773"}],"mpnrs":[{"r":"$","l":1,"b":"333333"}],"onclickads":[{"r":"$","l":1,"b":"91d131"}],"outbrain":[{"r":"$","l":1,"b":"ff951d"}],"pretty52":[{"r":"$","l":1,"b":"333333"}],"slickdeals":[{"r":"$","l":1,"b":"4592d8"}],"thesportbible":[{"r":"$","l":1,"b":"07613c"}],"xfinity":[{"r":"$","l":1,"b":"d7011d"}],"nwolb":[{"r":"$","l":1,"b":"530773"}],"redtubeporns":[{"r":"$","l":1,"b":"d7011d"}],"hotel-q":[{"r":"$","t":"Q!","b":"333333"}],"brazzerstveurope":[{"r":"$","l":1,"b":"ffc802"}],"h-net":[{"r":"$","l":1,"b":"333333"}],"woolrich":[{"r":"$","l":1,"b":"333333"}],"miamiherald":[{"r":"$","l":1,"b":"4592d8"}],"destinytracker":[{"r":"$","l":1,"b":"333333"}],"t-online-shop":[{"r":"$","l":1,"b":"f8458f"}],"absolutrelax":[{"r":"$","l":1,"b":"d7011d"}],"afkmax":[{"r":"$","l":1,"b":"333333"}],"alpenwelle":[{"r":"$","l":1,"b":"073673"}],"antenne-ac":[{"r":"$","l":1,"b":"ffc802"}],"antenne-frankfurt":[{"r":"$","l":1,"b":"d7011d"}],"antenne-mainz":[{"r":"$","l":1,"b":"d7011d"}],"antenneniederrhein":[{"r":"$","l":1,"b":"ffc802"}],"antenneunna":[{"r":"$","l":1,"b":"d7011d"}],"apolloradio":[{"r":"$","l":1,"b":"74d463"}],"christlichesradio":[{"r":"$","l":1,"b":"333333"}],"die-neue-welle":[{"r":"$","l":1,"b":"c3043e"}],"donau3fm":[{"r":"$","l":1,"b":"d7011d"}],"fac-gmbh":[{"r":"$","l":1,"b":"333333"}],"hamburg-zwei":[{"r":"$","l":1,"b":"5ea3f9"}],"hellwegradio":[{"r":"$","l":1,"b":"92dba4"}],"hitradio-ohr":[{"r":"$","l":1,"b":"d7011d"}],"radiochemnitz":[{"r":"$","l":1,"b":"073673"}],"radio-cottbus":[{"r":"$","l":1,"b":"1747a6"}],"jackfm":[{"r":"$","l":1,"b":"ff951d"}],"kanal-c":[{"r":"$","l":1,"b":"333333"}],"rockland-sachsen":[{"r":"$","l":1,"b":"333333"}],"megaradioonline":[{"r":"$","l":1,"b":"ff951d"}],"news894":[{"r":"$","l":1,"b":"d7011d"}],"purefm":[{"r":"$","l":1,"b":"530773"}],"radio912":[{"r":"$","l":1,"b":"d7011d"}],"aref":[{"r":"$","l":1,"b":"74d463"}],"radio-augsburg":[{"r":"$","l":1,"b":"d7011d"}],"radioerzgebirge-online":[{"r":"$","l":1,"b":"d7011d"}],"horeb":[{"r":"$","l":1,"b":"1747a6"}],"radiolausitz":[{"r":"$","l":1,"b":"1747a6"}],"radio901":[{"r":"$","l":1,"b":"74d463"}],"radio-seefunk":[{"r":"$","l":1,"b":"f36e8d"}],"radiowsw":[{"r":"$","l":1,"b":"2fc4fc"}],"radiozwickau":[{"r":"$","l":1,"b":"1747a6"}],"radio2day":[{"r":"$","l":1,"b":"d7011d"}],"radio700":[{"r":"$","l":1,"b":"073673"}],"schlagerparadies":[{"r":"$","l":1,"b":"530773"}],"smartradio":[{"r":"$","l":1,"b":"ffc802"}],"top-fm":[{"r":"$","l":1,"b":"d7011d"}],"vogtlandradio":[{"r":"$","l":1,"b":"74d463"}],"uchicago":[{"r":"$","l":1,"b":"d7011d"}],"mcgill":[{"r":"$","l":1,"b":"d7011d"}],"tsinghua":[{"r":"www.$.edu.cn","l":1,"b":"530773"},{"r":"$","l":1,"b":"530773"}],"ust":[{"r":"$","l":1,"b":"073673"}],"manchester":[{"r":"$","l":1,"b":"8a52a2"}],"utoronto":[{"r":"$","l":1,"b":"073673"}],"bristol":[{"r":"$","l":1,"b":"d7011d"}],"u-tokyo":[{"r":"www.$","l":1,"b":"2fc4fc"},{"r":"$","l":1,"b":"2fc4fc"}],"unimelb":[{"r":"$","l":1,"b":"073673"}],"kyoto-u":[{"r":"www.$.ac","l":1,"b":"073673"}],"wherecoolthingshappen":[{"r":"$","l":1,"b":"fede07"}],"kaist":[{"r":"$","l":1,"b":"5ea3f9"}],"ucsd":[{"r":"$","l":1,"b":"4592d8"}],"sydney":[{"r":"$","l":1,"b":"333333"}],"unsw":[{"r":"$","l":1,"b":"333333"}],"warwick":[{"r":"$","l":1,"b":"f97136"}],"ubc":[{"r":"$","l":1,"b":"073673"}],"polytechnique":[{"r":"$","l":1,"b":"073673"}],"antennemuenster":[{"r":"$","l":1,"b":"d7011d"}],"wasgau-ag":[{"r":"$","l":1,"b":"91d131"}],"gatorade":[{"r":"$","l":1,"b":"ff951d"}],"yesnetwork":[{"r":"$","l":1,"b":"1747a6"}],"daniel-hechter":[{"r":"$","l":1,"b":"333333"}],"misssixty":[{"r":"$","l":1,"b":"ffc802"}],"windsor":[{"r":"$","l":1,"b":"333333"}],"royrobson":[{"r":"$","l":1,"b":"333333"}],"cinque":[{"r":"$","l":1,"b":"333333"}],"maxmara":[{"r":"$","l":1,"b":"333333"}],"miumiu":[{"r":"$","l":1,"b":"333333"}],"mc-neal":[{"r":"$","l":1,"b":"073673"}],"vanlaack":[{"r":"$","l":1,"b":"666666"}],"atelier-gardeur":[{"r":"$","l":1,"b":"333333"}],"zegna":[{"r":"$","l":1,"b":"333333"}],"hackett":[{"r":"$","l":1,"b":"333333"}],"eduard-dressler":[{"r":"$","l":1,"b":"333333"}],"luisacerano":[{"r":"$","l":1,"b":"333333"}],"arqueonautas":[{"r":"$","l":1,"b":"073673"}],"peuterey":[{"r":"$","l":1,"b":"d7011d"}],"nydj":[{"r":"$","l":1,"b":"333333"}],"impossiblefoods":[{"r":"$","l":1,"b":"91d131"}],"noa":[{"r":"$","l":1,"b":"1747a6"}],"klinikumfrankfurt":[{"r":"$","l":1,"b":"d7011d"}],"ilsole24ore":[{"r":"$","l":1,"b":"c78e6d"}],"adfd":[{"r":"$","l":1,"b":"d7011d"}],"sbsun":[{"r":"$","l":1,"b":"333333"}],"jagbani":[{"r":"$","l":1,"b":"d7011d"}],"bento":[{"r":"$","l":1,"b":"d248ca"}],"strichpunkt-design":[{"r":"$","l":1,"b":"333333"}],"htvanime":[{"r":"$","l":1,"b":"333333"}],"bambi-tagi":[{"r":"$","c":"0"}],"buhv":[{"r":"$","l":1,"b":"328c67"}],"bmw-boerse":[{"r":"$","l":1,"b":"333333"}],"bm-brandmedia":[{"r":"$","l":1,"b":"c78e6d"}],"filgoal":[{"r":"$","l":1,"b":"ffc802"}],"ngb":[{"r":"$","l":1,"b":"f97136"}],"bgbm":[{"r":"$","b":"073673"}],"ahram":[{"r":"gate.$.org.en","l":1,"b":"fff"},{"r":"gate.$.org.eg","l":1,"b":"1747a6"},{"r":"$","l":1,"b":"333333"}],"afdb":[{"r":"$","l":1,"b":"91d131"}],"blockhaus":[{"r":"$","l":1,"b":"ffc802"}],"interaction-design":[{"r":"$","l":1,"b":"666666"}],"gazette":[{"r":"$","l":1,"b":"333333"}],"nbclosangeles":[{"r":"$","l":1,"b":"1747a6"}],"michigancapitolconfidential":[{"r":"$","l":1,"b":"ffc802"}],"c-span":[{"r":"$","l":1,"b":"4592d8"}],"usatodayeducation":[{"r":"$","l":1,"b":"4592d8"}],"nbclearn":[{"r":"$","l":1,"b":"333333"}],"nbcnewyork":[{"r":"$","l":1,"b":"073673"}],"abc7":[{"r":"$","l":1,"b":"1747a6"}],"washingtonexaminer":[{"r":"$","l":1,"b":"d7011d"}],"ktnv":[{"r":"$","l":1,"b":"073673"}],"newyorkdailynews":[{"r":"$","l":1,"b":"d7011d"}],"wtsp":[{"r":"$","l":1,"b":"e92207"}],"sunshinestatenews":[{"r":"$","l":1,"b":"073673"}],"timestalks":[{"r":"$","l":1,"b":"ff5349"}],"descrier":[{"r":"$","l":1,"b":"073673"}],"thesundaytimes":[{"r":"$","l":1,"b":"333333"}],"irishmirror":[{"r":"$","l":1,"b":"e92207"}],"thescottishsun":[{"r":"$","l":1,"b":"d7011d"}],"shqiptarja":[{"r":"$","l":1,"b":"e92207"}],"top-channel":[{"r":"$","l":1,"b":"4592d8"}],"ikub":[{"r":"$","l":1,"b":"073673"}],"madamasr":[{"r":"$","l":1,"b":"7bebf5"}],"masrawy":[{"r":"$","l":1,"b":"d7011d"}],"albawabhnews":[{"r":"$","l":1,"b":"d7011d"}],"almasryalyoum":[{"r":"$","l":1,"b":"d7011d"}],"sasapost":[{"r":"$","l":1,"b":"333333"}],"yallakora":[{"r":"$","l":1,"b":"333333"}],"elwatannews":[{"r":"$","l":1,"b":"333333"}],"lajmi":[{"r":"$","l":1,"b":"f97136"}],"rassd":[{"r":"$","l":1,"b":"4592d8"}],"shorouknews":[{"r":"$","l":1,"b":"1747a6"}]},"palette":["c3043e","d7011d","e92207","f9204c","ff5349","e24b2c","f97136","ff951d","ffc802","fede07","d8ee46","91d131","74d463","92dba4","328c67","07613c","006567","50b1a2","56eac6","abc8e2","7bebf5","43bdd9","429abd","2fc4fc","5ea3f9","4592d8","506bb8","1747a6","073673","530773","8a52a2","9077e3","8c275f","d248ca","db5c8c","f8458f","f36e8d","fb91ae","c78e6d","999999","666666","333333"],"buttons":[1,1,1,1,1,2,2,2,3,3,4,4,4,4,4,4,5,5,5,6,6,6,6,6,6,6,6,6,6,7,7,7,7,7,8,8,8,8,9,10,10,10]}



          _exports('default', db);
        });
      

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
                            break;
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
                        case "1077_A":
                            CliqzUtils.setPref("languageDedup", false);
                            break;
                        case "1077_B":
                            CliqzUtils.setPref("languageDedup", true);
                            break;
                        case "1079_A":
                            CliqzUtils.setPref("controlCenter", false);
                            break;
                        case "1079_B":
                            CliqzUtils.setPref("controlCenter", true);
                            break;
                        case "1080_A":
                            CliqzUtils.setPref("freshtabNewBrand", false);
                            break;
                        case "1080_B":
                            CliqzUtils.setPref("freshtabNewBrand", true);
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
                        case "1077_A":
                        case "1077_B":
                            CliqzUtils.clearPref("languageDedup");
                            break;
                        case "1079_A":
                        case "1079_B":
                            CliqzUtils.clearPref("controlCenter");
                            break;
                        case "1080_A":
                        case "1080_B":
                            CliqzUtils.clearPref("freshtabNewBrand");
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
System.register("core/background", ["core/cliqz", "platform/language", "core/config", "platform/process-script-manager", "platform/load-logo-db"], function (_export) {
  "use strict";

  var utils, events, Promise, language, config, ProcessScriptManager, loadLogoDb, lastRequestId, callbacks;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
      Promise = _coreCliqz.Promise;
    }, function (_platformLanguage) {
      language = _platformLanguage["default"];
    }, function (_coreConfig) {
      config = _coreConfig["default"];
    }, function (_platformProcessScriptManager) {
      ProcessScriptManager = _platformProcessScriptManager["default"];
    }, function (_platformLoadLogoDb) {
      loadLogoDb = _platformLoadLogoDb["default"];
    }],
    execute: function () {
      lastRequestId = 0;
      callbacks = {};

      _export("default", {

        init: function init(settings) {
          this.dispatchMessage = this.dispatchMessage.bind(this);

          utils.bindObjectFunctions(this.actions, this);
          loadLogoDb().then(utils.setLogoDb);

          this.mm = new ProcessScriptManager(this.dispatchMessage);
          this.mm.init();
        },

        unload: function unload() {
          this.mm.unload();
        },

        queryHTML: function queryHTML(url, selector, attribute) {
          var requestId = lastRequestId++,
              documents = [];

          this.mm.broadcast("cliqz:core", {
            action: "queryHTML",
            url: url,
            args: [selector, attribute],
            requestId: requestId
          });

          return new Promise(function (resolve, reject) {
            callbacks[requestId] = function (attributeValues) {
              delete callbacks[requestId];
              resolve(attributeValues);
            };

            utils.setTimeout(function () {
              delete callbacks[requestId];
              reject();
            }, 1000);
          });
        },

        getHTML: function getHTML(url) {
          var timeout = arguments.length <= 1 || arguments[1] === undefined ? 1000 : arguments[1];

          var requestId = lastRequestId++,
              documents = [];

          this.mm.broadcast("cliqz:core", {
            action: "getHTML",
            url: url,
            args: [],
            requestId: requestId
          });

          callbacks[requestId] = function (doc) {
            documents.push(doc);
          };

          return new Promise(function (resolve) {
            utils.setTimeout(function () {
              delete callbacks[requestId];
              resolve(documents);
            }, timeout);
          });
        },

        getCookie: function getCookie(url) {
          var requestId = lastRequestId++,
              documents = [];

          this.mm.broadcast("cliqz:core", {
            action: "getCookie",
            url: url,
            args: [],
            requestId: requestId
          });

          return new Promise(function (resolve, reject) {
            callbacks[requestId] = function (attributeValues) {
              delete callbacks[requestId];
              resolve(attributeValues);
            };

            utils.setTimeout(function () {
              delete callbacks[requestId];
              reject();
            }, 1000);
          });
        },

        dispatchMessage: function dispatchMessage(msg) {
          if (typeof msg.data.requestId === "number") {
            if (msg.data.requestId in callbacks) {
              this.handleResponse(msg);
            }
          } else {
            this.handleRequest(msg);
          }
        },

        handleRequest: function handleRequest(msg) {
          var _this = this;

          var _msg$data$payload = msg.data.payload;
          var action = _msg$data$payload.action;
          var module = _msg$data$payload.module;
          var args = _msg$data$payload.args;
          var requestId = _msg$data$payload.requestId;
          var windowId = msg.data.windowId;
          utils.importModule(module + "/background").then(function (module) {
            var background = module["default"];
            return background.actions[action].apply(null, args);
          }).then(function (response) {
            _this.mm.broadcast("window-" + windowId, {
              response: response,
              action: msg.data.payload.action,
              requestId: requestId
            });
          })["catch"](function (e) {
            return utils.log(e.toString() + "--" + e.stack, "Problem with frameScript");
          });
        },

        handleResponse: function handleResponse(msg) {
          callbacks[msg.data.requestId].apply(null, [msg.data.payload]);
        },

        getWindowStatusFromModules: function getWindowStatusFromModules(win) {
          return config.modules.map(function (moduleName) {
            var module = win.CLIQZ.Core.windowModules[moduleName];
            return module && module.status ? module.status() : {};
          });
        },

        actions: {
          getWindowStatus: function getWindowStatus(win) {
            return Promise.all(this.getWindowStatusFromModules(win)).then(function (allStatus) {
              var result = {};

              allStatus.forEach(function (status, moduleIdx) {
                result[config.modules[moduleIdx]] = status || null;
              });

              return result;
            });
          },
          sendTelemetry: function sendTelemetry(msg) {
            utils.telemetry(msg);
            return Promise.resolve();
          },
          queryCliqz: function queryCliqz(query) {
            var urlBar = utils.getWindow().document.getElementById("urlbar");
            urlBar.focus();
            urlBar.mInputField.focus();
            urlBar.mInputField.setUserInput(query);
          },
          setUrlbar: function setUrlbar(value) {
            return this.actions.queryCliqz(value);
          },
          recordLang: function recordLang(url, lang) {
            if (lang) {
              language.addLocale(url, lang);
            }
            return Promise.resolve();
          },
          recordMeta: function recordMeta(url, meta) {
            events.pub("core:url-meta", url, meta);
          },

          getFeedbackPage: function getFeedbackPage() {
            return utils.FEEDBACK_URL;
          }
        }
      });
    }
  };
});
System.register("core/base/background", ["core/cliqz"], function (_export) {
  "use strict";

  var utils, events;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }],
    execute: function () {
      _export("default", function (background) {
        var bgInit = background.init,
            bgUnload = background.unload,
            bgEvents = background.events;
        var enabled = undefined;

        // bind actions to background object
        Object.keys(background.actions || {}).forEach(function (action) {
          background.actions[action] = background.actions[action].bind(background);
        });

        background.init = function init() {
          enabled = background.enabled.apply(background, arguments);

          if (!enabled) {
            return;
          }

          bgInit.apply(background, arguments);

          Object.keys(bgEvents || {}).forEach(function (event) {

            bgEvents[event] = bgEvents[event].bind(background);
            events.sub(event, bgEvents[event]);
          });
        };

        background.unload = function unload() {
          if (!enabled) {
            return;
          }

          Object.keys(bgEvents || {}).forEach(function (event) {
            events.un_sub(event, bgEvents[event]);
          });

          bgUnload.apply(background, arguments);
        };

        return background;
      });
    }
  };
});
System.register("core/cliqz", ["platform/history-manager", "core/utils", "core/events"], function (_export) {
  "use strict";

  var CliqzHistoryManager, CliqzUtils, CliqzEvents, utils, events, Promise;
  return {
    setters: [function (_platformHistoryManager) {
      CliqzHistoryManager = _platformHistoryManager["default"];
    }, function (_coreUtils) {
      CliqzUtils = _coreUtils["default"];
    }, function (_coreEvents) {
      CliqzEvents = _coreEvents["default"];
    }],
    execute: function () {
      _export("historyManager", CliqzHistoryManager);

      utils = CliqzUtils;

      _export("utils", utils);

      events = CliqzEvents;

      _export("events", events);

      Promise = CliqzUtils.Promise;

      _export("Promise", Promise);
    }
  };
});
System.register("core/config", [], function (_export) {
  /* global {"platform":"mobile","testsBasePath":"./build/tests","testem_launchers":["Mocha","Chrome"],"settings":{"frameScriptWhitelist":["http://localhost:3000/"]},"modules":["core","autocomplete","mobile-ui","mobile-freshtab","mobile-history","yt-downloader","static"],"buildEnv":"development","sourceMaps":false,"EXTENSION_VERSION":"3.9.0-beta.3"} */
  // {"platform":"mobile","testsBasePath":"./build/tests","testem_launchers":["Mocha","Chrome"],"settings":{"frameScriptWhitelist":["http://localhost:3000/"]},"modules":["core","autocomplete","mobile-ui","mobile-freshtab","mobile-history","yt-downloader","static"],"buildEnv":"development","sourceMaps":false,"EXTENSION_VERSION":"3.9.0-beta.3"} is populated by build system
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", Object.freeze({"platform":"mobile","testsBasePath":"./build/tests","testem_launchers":["Mocha","Chrome"],"settings":{"frameScriptWhitelist":["http://localhost:3000/"]},"modules":["core","autocomplete","mobile-ui","mobile-freshtab","mobile-history","yt-downloader","static"],"buildEnv":"development","sourceMaps":false,"EXTENSION_VERSION":"3.9.0-beta.3"}));
    }
  };
});
System.register("core/events", ["core/utils"], function (_export) {
  /*
   * This method implements the publish subscribe design pattern
   *
   * Event naming scheme:
   *    cliqz.module_name.event_name
   *
   *  single sender -> multiple potential recipients
   *    for example: cliqz.core.urlbar_focus (inform others about urlbar focus)
   *    module_name describes sender
   *  multiple potential senders -> single recipient
   *    for example: cliqz.msg_center.show_message (tell the message center to show a message)
   *    module_name describes recipient (this is more like a RPC)
   */

  "use strict";

  var CliqzUtils, CliqzEvents;
  return {
    setters: [function (_coreUtils) {
      CliqzUtils = _coreUtils["default"];
    }],
    execute: function () {
      CliqzEvents = CliqzEvents || {
        //use a javascript object to push the message ids and the callbacks
        cache: {},
        /*
         * Publish events of interest with a specific id
         */
        pub: function pub(id) {
          var args = Array.prototype.slice.call(arguments, 1);
          (CliqzEvents.cache[id] || []).forEach(function (ev) {
            CliqzUtils.setTimeout(function () {
              try {
                ev.apply(null, args);
              } catch (e) {
                CliqzUtils.log(e.toString() + " -- " + e.stack, "CliqzEvents error: " + id);
              }
            }, 0);
          });
        },

        /* Subscribe to events of interest
         * with a specific id and a callback
         * to be executed when the event is observed
         */
        sub: function sub(id, fn) {
          CliqzEvents.cache[id] = CliqzEvents.cache[id] || [];
          CliqzEvents.cache[id].push(fn);
        },

        un_sub: function un_sub(id, fn) {
          var index;
          if (!CliqzEvents.cache[id]) {
            return;
          }
          if (!fn) {
            CliqzEvents.cache[id] = [];
          } else {
            index = CliqzEvents.cache[id].indexOf(fn);
            if (index > -1) {
              CliqzEvents.cache[id].splice(index, 1);
            }
          }
        },

        nextId: function nextId() {
          nextId.id = nextId.id || 0;
          nextId.id += 1;
          return nextId.id;
        }
      };

      _export("default", CliqzEvents);
    }
  };
});
System.register("core/fs", ["core/platform", "platform/fs"], function (_export) {

  /**
   * read file from default location
   *
   * @param {string|Array} path
   * @returns {Promise}
   */
  "use strict";

  var notImplemented, fs, readFile, writeFile, mkdir;
  return {
    setters: [function (_corePlatform) {
      notImplemented = _corePlatform.notImplemented;
    }, function (_platformFs) {
      fs = _platformFs;
    }],
    execute: function () {
      readFile = fs.readFile || notImplemented;

      _export("readFile", readFile);

      /**
       * write to file from default location
       *
       * @param {string|Array} path
       * @param {data} data - in a format accepted by the platform
       * @returns {Promise}
       */
      writeFile = fs.writeFile || notImplemented;

      _export("writeFile", writeFile);

      /**
       * create directory in default location
       *
       * @param {string|Array} path
       * @returns {Promise}
       */
      mkdir = fs.mkdir || notImplemented;

      _export("mkdir", mkdir);
    }
  };
});
System.register("core/gzip", ["platform/gzip"], function (_export) {

  /**
   *  Compress a string
   *
   *  @param {string} string to compress
   *  @returns {UInt8Array} compressed data
   */
  "use strict";

  var gzip, compress, decompress;
  return {
    setters: [function (_platformGzip) {
      gzip = _platformGzip;
    }],
    execute: function () {
      compress = gzip.compress || false;

      _export("compress", compress);

      /**
       *  Decompress a Gzip compressed string
       *
       *  @param {UInt8Array} gzipped data
       *  @returns {string} decompressed string
       */
      decompress = gzip.decompress || false;

      _export("decompress", decompress);
    }
  };
});
System.register('core/helpers/md5', [], function (_export) {
  // WARNING: for utf-8 strings result will be different than 'standard' md5.
  // This is because unicode values instead of utf-8 bytes are used (to avoid
  // conversion overhead). Using this to not break anything, since it has been
  // used for long time in several places in our code. If you need a 'standard'
  // md5 function, use another one.

  // Copied from http://www.myersdaily.org/joseph/javascript/md5-text.html
  // and adapted to match our coding style guide

  /* this function is much faster,
  so if possible we use it. Some IEs
  are the only ones I know of that
  need the idiotic second function,
  generated by an if clause.  */
  'use strict';

  var hexChr;
  function add32(a, b) {
    return a + b & 0xFFFFFFFF;
  }

  function cmn(q, a, b, x, s, t) {
    var aa = add32(add32(a, q), add32(x, t));
    return add32(aa << s | aa >>> 32 - s, b);
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn(b & c | ~b & d, a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn(b & d | c & ~d, a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md5cycle(x, k) {
    var a = x[0];
    var b = x[1];
    var c = x[2];
    var d = x[3];
    var xx = x;

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    xx[0] = add32(a, x[0]);
    xx[1] = add32(b, x[1]);
    xx[2] = add32(c, x[2]);
    xx[3] = add32(d, x[3]);
  }

  /* there needs to be support for Unicode here,
   * unless we pretend that we can redefine the MD-5
   * algorithm for multi-byte characters (perhaps
   * by adding every four 16-bit characters and
   * shortening the sum to 32 bits). Otherwise
   * I suggest performing MD-5 as if every character
   * was two bytes--e.g., 0040 0025 = @%--but then
   * how will an ordinary MD-5 sum be matched?
   * There is no way to standardize text to something
   * like UTF-8 before transformation; speed cost is
   * utterly prohibitive. The JavaScript standard
   * itself needs to look at this: it should start
   * providing access to strings as preformed UTF-8
   * 8-bit unsigned value arrays.
   */
  function md5blk(s) {
    /* I figured global was faster.   */
    var md5blks = [];
    var i = undefined; /* Andy King said do it this way. */
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  function md51(s) {
    var n = s.length;
    var state = [1732584193, -271733879, -1732584194, 271733878];
    var i = undefined;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    var ss = s.substring(i - 64);
    var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < ss.length; i++) {
      tail[i >> 2] |= ss.charCodeAt(i) << (i % 4 << 3);
    }
    tail[i >> 2] |= 0x80 << (i % 4 << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function rhex(n) {
    var s = '';
    var j = 0;
    for (; j < 4; j++) {
      s += hexChr[n >> j * 8 + 4 & 0x0F] + hexChr[n >> j * 8 & 0x0F];
    }
    return s;
  }

  function hex(x) {
    var xx = x;
    for (var i = 0; i < x.length; i++) {
      xx[i] = rhex(x[i]);
    }
    return x.join('');
  }

  function md5(s) {
    return hex(md51(s));
  }

  return {
    setters: [],
    execute: function () {
      hexChr = '0123456789abcdef'.split('');

      _export('default', md5);
    }
  };
});
System.register('core/history-provider', [], function (_export) {
  'use strict';

  return {
    setters: [],
    execute: function () {
      Cu['import']('resource://gre/modules/PlacesUtils.jsm');

      _export('default', {
        connection: null,

        query: function query(sql) {
          var columns = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

          if (!this.connection) {
            this.connection = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
          }

          var statement = this.connection.createAsyncStatement(sql),
              results = [];
          var resolver = undefined,
              rejecter = undefined,
              promise = undefined;

          promise = new Promise(function (resolve, reject) {
            resolver = resolve;
            rejecter = reject;
          });

          statement.executeAsync({
            handleCompletion: function handleCompletion(reason) {
              resolver(results);
            },

            handleError: rejecter,

            handleResult: function handleResult(resultSet) {
              var row = undefined;
              while (row = resultSet.getNextRow()) {
                var result = columns.reduce(function (result, column) {
                  result[column] = row.getResultByName(column);
                  return result;
                }, Object.create(null));
                results.push(result);
              }
            }
          });

          return promise;
        }
      });
    }
  };
});
System.register("core/history-service", [], function (_export) {
  "use strict";

  var hs;
  return {
    setters: [],
    execute: function () {
      hs = undefined;

      try {
        hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
      } catch (e) {
        hs = {
          addObserver: function addObserver() {},
          removeObserver: function removeObserver() {}
        };
      }

      _export("default", hs);
    }
  };
});
System.register('core/platform', ['platform/platform'], function (_export) {
  'use strict';

  var platform, isFirefox, isMobile;

  _export('notImplemented', notImplemented);

  function notImplemented() {
    throw new Error('Not implemented');
  }

  return {
    setters: [function (_platformPlatform) {
      platform = _platformPlatform['default'];
    }],
    execute: function () {
      isFirefox = platform.isFirefox;

      _export('isFirefox', isFirefox);

      isMobile = platform.isMobile;

      _export('isMobile', isMobile);
    }
  };
});
System.register('core/resource-loader', ['core/fs', 'core/cliqz'], function (_export) {

  // Common durations
  'use strict';

  var readFile, writeFile, mkdir, utils, ONE_SECOND, ONE_MINUTE, ONE_HOUR, UpdateCallbackHandler, Resource, _default;

  var _get = function get(_x4, _x5, _x6) { var _again = true; _function: while (_again) { var object = _x4, property = _x5, receiver = _x6; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x4 = parent; _x5 = property; _x6 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

  function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function get(url) {
    return new Promise(function (resolve, reject) {
      utils.httpGet(url, function (res) {
        resolve(res.response);
      }, reject);
    });
  }

  function makeDirRecursive(path) {
    var from = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    var _path = _toArray(path);

    var first = _path[0];

    var rest = _path.slice(1);

    if (!first) {
      return Promise.resolve();
    }

    return mkdir(from.concat(first)).then(function () {
      return makeDirRecursive(rest, from.concat(first));
    });
  }

  /* Abstract away the pattern `onUpdate` trigger list of
   * callbacks. This pattern is used a lot, so it looks worth
   * it to create a base class to handle it.
   */
  return {
    setters: [function (_coreFs) {
      readFile = _coreFs.readFile;
      writeFile = _coreFs.writeFile;
      mkdir = _coreFs.mkdir;
    }, function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      ONE_SECOND = 1000;
      ONE_MINUTE = 60 * ONE_SECOND;
      ONE_HOUR = 60 * ONE_MINUTE;

      UpdateCallbackHandler = (function () {
        function UpdateCallbackHandler() {
          _classCallCheck(this, UpdateCallbackHandler);

          this.callbacks = [];
        }

        /* A resource is responsible for handling a remote resource persisted on
         * disk. It will be persisted on disk upon each update from remote. It is
         * also able to parse JSON automatically if `dataType` is 'json'.
         */

        _createClass(UpdateCallbackHandler, [{
          key: 'onUpdate',
          value: function onUpdate(callback) {
            this.callbacks.push(callback);
          }
        }, {
          key: 'triggerCallbacks',
          value: function triggerCallbacks(args) {
            this.callbacks.map(function (cb) {
              return cb(args);
            });
          }
        }]);

        return UpdateCallbackHandler;
      })();

      _export('UpdateCallbackHandler', UpdateCallbackHandler);

      Resource = (function (_UpdateCallbackHandler) {
        _inherits(Resource, _UpdateCallbackHandler);

        function Resource(name) {
          var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

          _classCallCheck(this, Resource);

          _get(Object.getPrototypeOf(Resource.prototype), 'constructor', this).call(this);

          this.name = typeof name === 'string' ? [name] : name;
          this.remoteURL = options.remoteURL;
          this.dataType = options.dataType || 'json';
          this.filePath = ['cliqz'].concat(_toConsumableArray(this.name));
          this.chromeURL = 'chrome://cliqz/content/' + this.name.join('/');
        }

        _createClass(Resource, [{
          key: 'persist',
          value: function persist(data) {
            var _this = this;

            var dirPath = this.filePath.slice(0, -1);
            return makeDirRecursive(dirPath).then(function () {
              return writeFile(_this.filePath, new TextEncoder().encode(data));
            }).then(function () {
              return data;
            });
          }
        }, {
          key: 'load',
          value: function load() {
            var _this2 = this;

            return readFile(this.filePath).then(function (data) {
              return new TextDecoder().decode(data);
            }).then(this.parseData.bind(this))['catch'](function () {
              return _this2.updateFromURL(_this2.chromeURL);
            })['catch'](function () {
              return _this2.updateFromRemote();
            });
          }
        }, {
          key: 'updateFromURL',
          value: function updateFromURL(url) {
            return get(url).then(this.persist.bind(this)).then(this.parseData.bind(this));
          }
        }, {
          key: 'updateFromRemote',
          value: function updateFromRemote() {
            var _this3 = this;

            if (this.remoteURL === undefined) {
              return Promise.resolve();
            }
            return this.updateFromURL(this.remoteURL).then(function (data) {
              _this3.triggerCallbacks(data);
              return data;
            });
          }
        }, {
          key: 'parseData',
          value: function parseData(data) {
            if (this.dataType === 'json') {
              return JSON.parse(data);
            }
            return data;
          }
        }]);

        return Resource;
      })(UpdateCallbackHandler);

      _export('Resource', Resource);

      _default = (function () {
        function _default(resourceName) {
          var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

          _classCallCheck(this, _default);

          this.resource = new Resource(resourceName, options);
          this.cron = options.cron || ONE_HOUR;
          this.updateInterval = utils.setInterval(this.updateFromRemote.bind(this), this.cron);
        }

        _createClass(_default, [{
          key: 'load',
          value: function load() {
            return this.resource.load();
          }
        }, {
          key: 'updateFromRemote',
          value: function updateFromRemote() {
            var pref = 'resource-loader.lastUpdates.' + this.resource.name.join('/');
            var lastUpdate = Number(utils.getPref(pref, 0));
            var currentTime = Date.now();

            if (currentTime > this.cron + lastUpdate) {
              return this.resource.updateFromRemote().then(function () {
                return utils.setPref(pref, String(Date.now()));
              });
            }
            return Promise.resolve();
          }
        }, {
          key: 'onUpdate',
          value: function onUpdate(callback) {
            this.resource.onUpdate(callback);
          }
        }, {
          key: 'stop',
          value: function stop() {
            utils.clearInterval(this.updateInterval);
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
System.register('core/search-engines', [], function (_export) {
  'use strict';

  _export('setSearchEngine', setSearchEngine);

  function setSearchEngine(engine) {
    Services.search.currentEngine = engine;
  }

  return {
    setters: [],
    execute: function () {
      Components.utils['import']('resource://gre/modules/Services.jsm');
    }
  };
});
System.register("core/startup", ["core/platform", "platform/startup"], function (_export) {
  "use strict";

  var notImplemented, startup;
  return {
    setters: [function (_corePlatform) {
      notImplemented = _corePlatform.notImplemented;
    }, function (_platformStartup) {
      startup = _platformStartup["default"];
    }],
    execute: function () {
      _export("default", startup || notImplemented);
    }
  };
});
System.register("core/storage", ["platform/storage"], function (_export) {
	/**
 * @namespace core
 */
	"use strict";

	var storage, _default;

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	return {
		setters: [function (_platformStorage) {
			storage = _platformStorage["default"];
		}],
		execute: function () {
			_default = (function () {
				/**
    * @class Storage
    * @constructor
    */

				function _default() {
					_classCallCheck(this, _default);

					this.storage = storage;
					this.getItem = this.storage.getItem.bind(this.storage);
					this.setItem = this.storage.setItem.bind(this.storage);
					this.removeItem = this.storage.removeItem.bind(this.storage);
					this.clear = this.storage.clear.bind(this.storage);
				}

				/**
    * @method setObject
    * @param key {string}
    * @param object
    */

				_createClass(_default, [{
					key: "setObject",
					value: function setObject(key, object) {
						this.storage.setItem(key, JSON.stringify(object));
					}

					/**
     * @method getObject
     * @param key {string}
     * @param notFound {Boolean}
     */
				}, {
					key: "getObject",
					value: function getObject(key) {
						var notFound = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

						var o = storage.getItem(key);
						if (o) {
							return JSON.parse(o);
						}
						return notFound;
					}
				}]);

				return _default;
			})();

			_export("default", _default);
		}
	};
});
System.register("core/tabs", [], function (_export) {
  "use strict";

  _export("queryActiveTabs", queryActiveTabs);

  function queryActiveTabs(window) {
    var selectedBrowser = window.gBrowser.selectedBrowser;
    return Array.prototype.map.call(window.gBrowser.tabs, function (tab, index) {
      return {
        index: index,
        url: tab.linkedBrowser.currentURI.spec,
        isCurrent: selectedBrowser === tab.linkedBrowser
      };
    });
  }

  return {
    setters: [],
    execute: function () {}
  };
});
System.register("core/templates", ["core/utils", "core/platform"], function (_export) {
    /*
        handlebars wrapper which adds all the needed helpers
    */

    "use strict";

    var CliqzUtils, isFirefox, CliqzHandlebars, TEMPLATES, MESSAGE_TEMPLATES, PARTIALS, AGO_CEILINGS, ZERO_CLICK_INFO_PRIO;

    function compileTemplates() {
        Object.keys(TEMPLATES).forEach(fetchTemplate);
        MESSAGE_TEMPLATES.forEach(fetchTemplate);
        PARTIALS.forEach(function (tName) {
            fetchTemplate(tName, true);
        });
    }

    function fetchTemplate(tName, isPartial) {
        try {
            CliqzUtils.httpGet(CliqzUtils.TEMPLATES_PATH + tName + '.tpl', function (res) {
                if (isPartial === true) {
                    Handlebars.registerPartial(tName, res.response);
                    CliqzHandlebars.tplCache[tName] = Handlebars.compile(res.response);
                } else CliqzHandlebars.tplCache[tName] = Handlebars.compile(res.response);
            });
        } catch (e) {
            CliqzUtils.log('ERROR loading template ' + tName);
        }
    }

    function registerHelpers() {
        Handlebars.registerHelper('partial', function (name, options) {
            var template = CliqzHandlebars.tplCache[name] || CliqzHandlebars.tplCache["partials/" + name] || CliqzHandlebars.tplCache.empty;
            return new Handlebars.SafeString(template(this));
        });

        Handlebars.registerHelper('get_array_element', function (arr, idx, subelement) {
            if (typeof subelement == undefined) return arr && arr[idx];else return arr && arr[idx] && arr[idx][subelement];
        });

        Handlebars.registerHelper('agoline', function (ts, options) {
            if (!ts) return '';
            var now = new Date().getTime() / 1000,
                seconds = parseInt(now - ts),
                i = 0,
                slot;

            while (slot = AGO_CEILINGS[i++]) if (seconds < slot[0]) return CliqzUtils.getLocalizedString(slot[1], parseInt(seconds / slot[2]));
            return '';
        });

        Handlebars.registerHelper('sec_to_duration', function (seconds) {
            if (!seconds) return null;
            try {
                var s = parseInt(seconds);
                return Math.floor(s / 60) + ':' + ("0" + s % 60).slice(-2);
            } catch (e) {
                return null;
            }
        });

        Handlebars.registerHelper('distance', function (meters) {
            if (meters < 1000) {
                return meters.toFixed(0) + " m";
            }
            return (meters / 1000).toFixed(1) + " km";
        });

        Handlebars.registerHelper('shopping_stars_width', function (rating) {
            return rating * 14;
        });

        Handlebars.registerHelper('even', function (value, options) {
            if (value % 2) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        Handlebars.registerHelper('local', function (key) {
            var args = Array.prototype.slice.call(arguments);
            var name = args.shift();
            return CliqzUtils.getLocalizedString.apply(null, [name, args]);
        });

        Handlebars.registerHelper('views_helper', function (val) {
            if (!val || val == '-1') return '';

            try {
                return parseFloat(val).toLocaleString() + ' ' + CliqzUtils.getLocalizedString('views');
            } catch (e) {
                return '';
            }
        });

        Handlebars.registerHelper('wikiEZ_height', function (data_richData) {
            if (data_richData && data_richData.hasOwnProperty('images') && data_richData.images.length > 0) {
                if (this.type === 'cliqz-extra' || this.url === CliqzUtils.autocomplete.lastResult._results[0].val) // is the first result in the show list
                    return 'cqz-result-h2';
                // BM hq result, but not the 1st result -> remove images
                data_richData.images = [];
            }

            return 'cqz-result-h3';
        });

        Handlebars.registerHelper('recipe_rd_template', function (data_richData) {
            var minimalData = data_richData && typeof data_richData["cook_time"] !== "undefined" && typeof data_richData["numportion"] !== "undefined" && typeof data_richData["total_review"] !== "undefined";

            // is the only result in the show list
            return CliqzUtils.autocomplete.lastResult._results.length === 1 && minimalData;
        });

        Handlebars.registerHelper('cpgame_movie_rd_template', function (data_richData) {
            if (!CliqzUtils.autocomplete.lastResult) return false;

            var minimalData_pcgame = data_richData && (typeof data_richData["image"] !== "undefined" || typeof data_richData["game_cat"] !== "undefined" && typeof data_richData["rating"] !== "undefined" && typeof data_richData["categories"] !== "undefined");
            var minimalData_movie = data_richData && (typeof data_richData["image"] !== "undefined" || data_richData["director"] && data_richData["director"]["title"] || data_richData["length"] && data_richData["length"] !== "_" || data_richData["categories"]);

            return CliqzUtils.autocomplete.lastResult._results.length == 1 && (minimalData_pcgame || minimalData_movie); // is the only result in the show list
        });

        Handlebars.registerHelper('image_rd_specification', function (richData) {
            return richData['superType'] === "movie" ? "50px" : "76px";
        });

        Handlebars.registerHelper('localizeNumbers', function (num) {
            /*
            * USE only when you really understand your data (see below)!
            * this function supports localization for:
            *   + normal number strings (e.g. 1.2, 3...),
            *   + standardized abrv. strings: 12e-4, and
            *   + extended forms, e.g. 1.2B, 1M etc.
            * In general, any string in the form of xxxyyy where xxx is a standardized number string (recognized by isFinite())
            * and yyy is an arbitrary string (called postfix) that does not start with a number will be localized
            * WARNING: numbers in the form such as: 12e3M, which might be seen as 12000 Million, will be parsed incorrectly
            */
            try {
                var parsedNum = parseFloat(num),
                    postfix,
                    dummy = "-";
                if (!isNaN(parsedNum) && isFinite(parsedNum)) {
                    postfix = isFinite(num) ? "" : (num + "").substring((parsedNum + "").length);
                    return parsedNum.toLocaleString(CliqzUtils.getLocalizedString('locale_lang_code')) + postfix;
                }
                return dummy;
            } catch (e) {
                return num;
            }
        });

        Handlebars.registerHelper('limit', function (idx, max_idx) {
            return idx < max_idx;
        });

        Handlebars.registerHelper('json', function (value, options) {
            return JSON.stringify(value);
        });

        Handlebars.registerHelper('log', function (value, key) {
            CliqzUtils.log(value, 'TEMPLATE LOG HELPER');
        });

        Handlebars.registerHelper('toLowerCase', function (str) {
            return str.toLowerCase();
        });

        Handlebars.registerHelper('toUpperCase', function (str) {
            return str.toUpperCase();
        });

        Handlebars.registerHelper('emphasis', function (text, q, minQueryLength, cleanControlChars) {
            // lucian: questionable solution performance wise
            // strip out all the control chars
            // eg :text = "... \u001a"
            if (!q) return text;
            q = q.trim();
            if (text && cleanControlChars) text = text.replace(/[\u0000-\u001F]/g, ' ');

            if (!text || !q || q.length < (minQueryLength || 2)) return text;

            var map = Array(text.length),
                tokens = q.toLowerCase().split(/\s+|\.+/).filter(function (t) {
                return t && t.length > 1;
            }),
                lowerText = text.toLowerCase(),
                out,
                high = false;

            tokens.forEach(function (token) {
                var poz = lowerText.indexOf(token);
                while (poz !== -1) {
                    for (var i = poz; i < poz + token.length; i++) map[i] = true;
                    poz = lowerText.indexOf(token, poz + 1);
                }
            });
            out = [];
            var current = '';
            for (var i = 0; i < text.length; i++) {
                if (map[i] && !high) {
                    out.push(current);
                    current = '';
                    current += text[i];
                    high = true;
                } else if (!map[i] && high) {
                    out.push(current);
                    current = '';
                    current += text[i];
                    high = false;
                } else current += text[i];
            }
            out.push(current);

            return new Handlebars.SafeString(CliqzHandlebars.tplCache.emphasis(out));
        });

        Handlebars.registerHelper('hasimage', function (image) {
            if (image && image.src && !(image.src.indexOf('xing') !== -1 && image.src.indexOf('nobody_') !== -1)) return true;else return false;
        });

        Handlebars.registerHelper('date', function (_date) {
            var d = new Date(_date);
            var date = d.getDate();
            var month = d.getMonth();
            month++;
            var year = d.getFullYear();
            var formatedDate = date + '/' + month + '/' + year;
            return formatedDate;
        });

        Handlebars.registerHelper("math", function (lvalue, operator, rvalue, options) {
            lvalue = parseFloat(lvalue);
            rvalue = parseFloat(rvalue);

            switch (operator) {
                case "+":
                    return lvalue + rvalue;
                case "-":
                    return lvalue - rvalue;
                case "*":
                    return lvalue * rvalue;
                case "/":
                    return lvalue / rvalue;
                case "%":
                    return lvalue % rvalue;
            }
        });

        Handlebars.registerHelper("logic", function (lvalue, operator, rvalue, options) {
            switch (operator) {
                case "|":
                    return lvalue | rvalue;
                case "||":
                    return lvalue || rvalue;
                case "&":
                    return lvalue & rvalue;
                case "&&":
                    return lvalue && rvalue;
                case "^":
                    return lvalue ^ rvalue;
                case "is":
                    return lvalue == rvalue;
                case "starts_with":
                    return lvalue.indexOf(rvalue) == 0;
                case "===":
                    return lvalue === rvalue;
                case "!=":
                    return lvalue != rvalue;
                case "<":
                    return lvalue < rvalue;
                case ">":
                    return lvalue > rvalue;
            }
        });

        Handlebars.registerHelper('is_not_dummy', function (s) {
            return s && s !== "_";
        });

        Handlebars.registerHelper('nameify', function (str) {
            if (str.length == 0) return "";else return str[0].toUpperCase() + str.slice(1);
        });

        Handlebars.registerHelper('kind_printer', function (kind) {
            //we need to join with semicolon to avoid conflicting with the comma from json objects
            return kind ? kind.join(';') : '';
        });

        Handlebars.registerHelper('links_or_sources', function (richData) {
            return richData ? richData.internal_links && richData.internal_links.length > 0 ? richData.internal_links : richData.additional_sources ? richData.additional_sources : [] : 0;
        });

        Handlebars.registerHelper('pref', function (key) {
            return CliqzUtils.getPref(key, false);
        });

        Handlebars.registerHelper('repeat', function (num, block) {
            var accum = '';
            for (var i = 0; i < num; i++) {
                accum += block.fn(i);
            }
            return accum;
        });

        /* If conditions on preferences */
        Handlebars.registerHelper('ifpref', function (name, val, options) {
            if (val == undefined) return CliqzUtils.getPref(name) ? options.fn(this) : options.inverse(this);else return CliqzUtils.getPref(name) == val ? options.fn(this) : options.inverse(this);
        });

        Handlebars.registerHelper('unlesspref', function (name, val, options) {
            if (val == undefined) return CliqzUtils.getPref(name) ? options.inverse(this) : options.fn(this);else return CliqzUtils.getPref(name) == val ? options.inverse(this) : options.fn(this);
        });
        /* End If conditions on preferences */

        Handlebars.registerHelper('zeroclick_prep', function (zeroInfo_raw) {
            var n,
                name,
                item,
                zeroInfo = [];
            for (n = 0; n < ZERO_CLICK_INFO_PRIO.length; n++) {
                item = ZERO_CLICK_INFO_PRIO[n];
                name = item[0];
                if (zeroInfo_raw[name]) {
                    zeroInfo.push({
                        'name': name,
                        'val': zeroInfo_raw[name],
                        'img': item[1]
                    });
                }
            }
            zeroInfo_raw = zeroInfo;
            return zeroInfo_raw;
        });

        Handlebars.registerHelper('convRateDigitSplit', function (rate) {
            var result = "<span class='cqz-conv-rate'>" + rate.substr(0, rate.length - 2) + "<span class='cqz-rate-last-digits'>" + rate.substr(-2) + "</span>" + "</span>";

            return new Handlebars.SafeString(result);
        });

        Handlebars.registerHelper('numberFormat', function (number) {
            try {
                //just in case this helper is used on unsanitezed data from backend
                number = parseFloat(number);
                number = number.toFixed(2);
                return parseFloat(number).toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
            } catch (e) {
                return '';
            }
        });

        /* mobile helpers */
        Handlebars.registerHelper("debug", function (optionalValue) {
            console.log("%c Template Data " + this.vertical + " ", "color:#fff;background:green", this);
        });

        Handlebars.registerHelper("trimNumbers", function (number) {
            return Math.round(number);
        });

        Handlebars.registerHelper('conversationsTime', function (time) {
            var d = new Date(time);
            var hours = d.getHours();
            hours = hours > 9 ? hours : '0' + hours;
            var minutes = d.getMinutes();
            minutes = minutes > 9 ? minutes : '0' + minutes;
            var formatedDate = hours + ':' + minutes;
            return formatedDate;
        });

        Handlebars.registerHelper('uriEncode', function (uriComponent) {
            return encodeURIComponent(uriComponent);
        });

        Handlebars.registerHelper('timeOrCalculator', function (ezType) {
            if (ezType == "time") {
                return Handlebars.helpers.local("time");
            } else {
                return Handlebars.helpers.local("calculator");
            }
        });

        Handlebars.registerHelper('ifShowSearch', function (results, options) {
            // if equal
            if (!results[0] || results[0].data.template !== "noResult") {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        Handlebars.registerHelper('mobileWikipediaUrls', function (url) {
            return url.replace("http://de.wikipedia.org/wiki", "https://de.m.wikipedia.org/wiki");
        });

        Handlebars.registerHelper('eachIncludeParent', function (context, options) {
            var fn = options.fn,
                inverse = options.inverse,
                ret = "",
                _context = [];

            $.each(context, function (index, object) {
                var _object = $.extend({}, object);
                _context.push(_object);
            });

            if (_context && _context.length > 0) {
                for (var i = 0, j = _context.length; i < j; i++) {
                    _context[i]["parentContext"] = options.hash.parent;
                    ret = ret + fn(_context[i]);
                }
            } else {
                ret = inverse(this);
            }
            return ret;
        });

        Handlebars.registerHelper('conversationsTime', function (time) {
            var d = new Date(time);
            var hours = d.getHours();
            hours = hours > 9 ? hours : '0' + hours;
            var minutes = d.getMinutes();
            minutes = minutes > 9 ? minutes : '0' + minutes;
            var formatedDate = hours + ':' + minutes;
            return formatedDate;
        });

        Handlebars.registerHelper('sendTelemetry', function (nResults) {
            CliqzUtils.telemetry({
                type: 'Results Rendered',
                nResults: nResults
            });
        });

        Handlebars.registerHelper('generate_background_color', function (url) {
            var urlDetails = CliqzUtils.getDetailsFromUrl(url);
            var logoDetails = CliqzUtils.getLogoDetails(urlDetails);
            return "#" + logoDetails.backgroundColor;
        });
    }

    return {
        setters: [function (_coreUtils) {
            CliqzUtils = _coreUtils["default"];
        }, function (_corePlatform) {
            isFirefox = _corePlatform.isFirefox;
        }],
        execute: function () {

            if (isFirefox) {
                Services.scriptloader.loadSubScript('chrome://cliqz/content/bower_components/handlebars/handlebars.js', undefined);
            }

            CliqzHandlebars = Handlebars || undefined.Handlebars;
            TEMPLATES = CliqzUtils.TEMPLATES;
            MESSAGE_TEMPLATES = CliqzUtils.MESSAGE_TEMPLATES || [];
            PARTIALS = CliqzUtils.PARTIALS;
            AGO_CEILINGS = [[0, '', 1], [120, 'ago1Minute', 1], [3600, 'agoXMinutes', 60], [7200, 'ago1Hour', 1], [86400, 'agoXHours', 3600], [172800, 'agoYesterday', 1], [604800, 'agoXDays', 86400], [4838400, 'ago1Month', 1], [29030400, 'agoXMonths', 2419200], [58060800, 'ago1year', 1], [2903040000, 'agoXYears', 29030400]];
            ZERO_CLICK_INFO_PRIO = [["Phone", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/phone.svg"], ["BIC", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/BIC.svg"], ["E-Mail", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/emaill.svg"]];

            CliqzHandlebars.tplCache = {};

            /* Needed by the view layer */
            CliqzHandlebars.TEMPLATES = TEMPLATES;
            CliqzHandlebars.MESSAGE_TEMPLATES = MESSAGE_TEMPLATES;
            CliqzHandlebars.PARTIALS = PARTIALS;

            compileTemplates();
            registerHelpers();
            _export("default", CliqzHandlebars);
        }
    };
});
System.register('core/utils', ['platform/environment'], function (_export) {
  'use strict';

  var CLIQZEnvironment, CliqzLanguage, VERTICAL_ENCODINGS, COLOURS, LOGOS, BRANDS_DATABASE, ipv4_part, ipv4_regex, ipv6_regex, CliqzUtils;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

  return {
    setters: [function (_platformEnvironment) {
      CLIQZEnvironment = _platformEnvironment['default'];
    }],
    execute: function () {
      VERTICAL_ENCODINGS = {
        'people': 'p',
        'news': 'n',
        'video': 'v',
        'hq': 'h',
        'bm': 'm',
        'recipeRD': 'r',
        'game': 'g',
        'movie': 'o'
      };
      COLOURS = ['#ffce6d', '#ff6f69', '#96e397', '#5c7ba1', '#bfbfbf', '#3b5598', '#fbb44c', '#00b2e5', '#b3b3b3', '#99cccc', '#ff0027', '#999999'];
      LOGOS = ['wikipedia', 'google', 'facebook', 'youtube', 'duckduckgo', 'sternefresser', 'zalando', 'bild', 'web', 'ebay', 'gmx', 'amazon', 't-online', 'wiwo', 'wwe', 'weightwatchers', 'rp-online', 'wmagazine', 'chip', 'spiegel', 'yahoo', 'paypal', 'imdb', 'wikia', 'msn', 'autobild', 'dailymotion', 'hm', 'hotmail', 'zeit', 'bahn', 'softonic', 'handelsblatt', 'stern', 'cnn', 'mobile', 'aetv', 'postbank', 'dkb', 'bing', 'adobe', 'bbc', 'nike', 'starbucks', 'techcrunch', 'vevo', 'time', 'twitter', 'weatherunderground', 'xing', 'yelp', 'yandex', 'weather', 'flickr'];
      BRANDS_DATABASE = { domains: {}, palette: ["999"] };
      ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])";
      ipv4_regex = new RegExp("^" + ipv4_part + "\\." + ipv4_part + "\\." + ipv4_part + "\\." + ipv4_part + "([:]([0-9])+)?$");
      ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$");
      CliqzUtils = {
        LANGS: { 'de': 'de', 'en': 'en', 'fr': 'fr' },
        RESULTS_PROVIDER: 'https://newbeta.cliqz.com/api/v1/results?q=',
        RICH_HEADER: 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map',
        RESULTS_PROVIDER_LOG: 'https://newbeta.cliqz.com/api/v1/logging?q=',
        RESULTS_PROVIDER_PING: 'https://newbeta.cliqz.com/ping',
        CONFIG_PROVIDER: 'https://newbeta.cliqz.com/api/v1/config',
        SAFE_BROWSING: 'https://safe-browsing.cliqz.com',
        TUTORIAL_URL: 'https://cliqz.com/home/onboarding',
        UNINSTALL: 'https://cliqz.com/home/offboarding',
        FEEDBACK: 'https://cliqz.com/feedback/',
        SYSTEM_BASE_URL: CLIQZEnvironment.SYSTEM_BASE_URL,
        PREFERRED_LANGUAGE: null,
        RESULTS_TIMEOUT: CLIQZEnvironment.RESULTS_TIMEOUT,

        BRANDS_DATABASE: BRANDS_DATABASE,

        //will be updated from the mixer config endpoint every time new logos are generated
        BRANDS_DATABASE_VERSION: 1473867650984,
        GEOLOC_WATCH_ID: null, // The ID of the geolocation watcher (function that updates cached geolocation on change)
        VERTICAL_TEMPLATES: {
          'n': 'news',
          'p': 'people',
          'v': 'video',
          'h': 'hq',
          'r': 'recipe',
          'g': 'cpgame_movie',
          'o': 'cpgame_movie'
        },
        hm: null,
        TEMPLATES_PATH: CLIQZEnvironment.TEMPLATES_PATH,
        TEMPLATES: CLIQZEnvironment.TEMPLATES,
        MESSAGE_TEMPLATES: CLIQZEnvironment.MESSAGE_TEMPLATES,
        PARTIALS: CLIQZEnvironment.PARTIALS,
        SKIN_PATH: CLIQZEnvironment.SKIN_PATH,
        LOCALE_PATH: CLIQZEnvironment.LOCALE_PATH,
        RERANKERS: CLIQZEnvironment.RERANKERS,
        MIN_QUERY_LENGHT_FOR_EZ: CLIQZEnvironment.MIN_QUERY_LENGHT_FOR_EZ,

        init: function init(options) {
          options = options || {};

          if (!options.lang) {
            return Promise.reject("lang missing");
          }
          CliqzUtils.importModule('core/gzip').then(function (gzip) {
            CLIQZEnvironment.gzip = gzip;
          })['catch'](function () {
            //no gzip, do nothing
          });

          // FIXME: `import CliqzLanguage from "platform/language";` does not work
          CliqzUtils.importModule('platform/language').then(function (language) {
            CliqzLanguage = language['default'];
          })['catch'](function () {
            CliqzUtils.log('error: cannot load CliqzLanguage');
          });

          // cutting cyclic dependency
          CLIQZEnvironment.getLogoDetails = CliqzUtils.getLogoDetails.bind(CliqzUtils);
          CLIQZEnvironment.getDetailsFromUrl = CliqzUtils.getDetailsFromUrl.bind(CliqzUtils);
          CLIQZEnvironment.getLocalizedString = CliqzUtils.getLocalizedString.bind(CliqzUtils);
          CLIQZEnvironment.SKIN_PATH = CliqzUtils.SKIN_PATH;

          CliqzUtils.log('Initialized', 'CliqzUtils');

          CliqzUtils.setLang(options.lang);
        },

        setLang: function setLang(lang) {
          CliqzUtils.PREFERRED_LANGUAGE = lang;
          CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
        },

        initPlatform: function initPlatform(System) {
          System.baseURL = CLIQZEnvironment.SYSTEM_BASE_URL;
          CliqzUtils.System = System;
        },

        importModule: function importModule(moduleName) {
          return CliqzUtils.System['import'](moduleName);
        },

        callAction: function callAction(moduleName, actionName, args) {
          var module = CliqzUtils.System.get(moduleName + "/background");
          var action = module['default'].actions[actionName];
          return action.apply(null, args);
        },

        callWindowAction: function callWindowAction(win, moduleName, actionName, args) {
          try {
            var module = win.CLIQZ.Core.windowModules[moduleName];
            var action = module.actions[actionName];
            return action.apply(null, args);
          } catch (e) {
            CliqzUtils.log('Failed to call "' + actionName + '" on "' + moduleName + '"', "callWindowAction failed");
          }
        },

        isNumber: function isNumber(n) {
          /*
          NOTE: this function can't recognize numbers in the form such as: "1.2B", but it can for "1e4". See specification for isFinite()
           */
          return !isNaN(parseFloat(n)) && isFinite(n);
        },

        //returns the type only if it is known
        getKnownType: function getKnownType(type) {
          return VERTICAL_ENCODINGS.hasOwnProperty(type) && type;
        },

        /**
         * Construct a uri from a url
         * @param {string}  aUrl - url
         * @param {string}  aOriginCharset - optional character set for the URI
         * @param {nsIURI}  aBaseURI - base URI for the spec
         */
        makeUri: CLIQZEnvironment.makeUri,

        //move this out of CliqzUtils!
        setSupportInfo: function setSupportInfo(status) {
          var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch),
              host = 'firefox',
              hostVersion = '';

          //check if the prefs exist and if they are string
          if (prefs.getPrefType('distribution.id') == 32 && prefs.getPrefType('distribution.version') == 32) {
            host = prefs.getCharPref('distribution.id');
            hostVersion = prefs.getCharPref('distribution.version');
          }
          var info = JSON.stringify({
            version: CliqzUtils.extensionVersion,
            host: host,
            hostVersion: hostVersion,
            status: status != undefined ? status : "active"
          }),
              sites = ["http://cliqz.com", "https://cliqz.com"];

          sites.forEach(function (url) {
            var ls = CLIQZEnvironment.getLocalStorage(url);

            if (ls) ls.setItem("extension-info", info);
          });
        },
        setLogoDb: function setLogoDb(db) {
          BRANDS_DATABASE = CliqzUtils.BRANDS_DATABASE = db;
        },
        getLogoDetails: function getLogoDetails(urlDetails) {
          var base = urlDetails.name,
              baseCore = base.replace(/[-]/g, ""),
              check = function check(host, rule) {
            var address = host.lastIndexOf(base),
                parseddomain = host.substr(0, address) + "$" + host.substr(address + base.length);

            return parseddomain.indexOf(rule) != -1;
          },
              result = {},
              domains = BRANDS_DATABASE.domains;

          if (base.length == 0) return result;

          if (base == "IP") result = { text: "IP", backgroundColor: "9077e3" };else if (domains[base]) {
            for (var i = 0, imax = domains[base].length; i < imax; i++) {
              var rule = domains[base][i]; // r = rule, b = background-color, l = logo, t = text, c = color

              if (i == imax - 1 || check(urlDetails.host, rule.r)) {
                result = {
                  backgroundColor: rule.b ? rule.b : null,
                  backgroundImage: rule.l ? "url(https://cdn.cliqz.com/brands-database/database/" + this.BRANDS_DATABASE_VERSION + "/logos/" + base + "/" + rule.r + ".svg)" : "",
                  text: rule.t,
                  color: rule.c ? "" : "#fff"
                };

                break;
              }
            }
          }
          result.text = result.text || (baseCore.length > 1 ? baseCore[0].toUpperCase() + baseCore[1].toLowerCase() : "");
          result.backgroundColor = result.backgroundColor || BRANDS_DATABASE.palette[base.split("").reduce(function (a, b) {
            return a + b.charCodeAt(0);
          }, 0) % BRANDS_DATABASE.palette.length];
          var colorID = BRANDS_DATABASE.palette.indexOf(result.backgroundColor),
              buttonClass = BRANDS_DATABASE.buttons && colorID != -1 && BRANDS_DATABASE.buttons[colorID] ? BRANDS_DATABASE.buttons[colorID] : 10;

          result.buttonsClass = "cliqz-brands-button-" + buttonClass;
          result.style = "background-color: #" + result.backgroundColor + ";color:" + (result.color || '#fff') + ";";

          if (result.backgroundImage) result.style += "background-image:" + result.backgroundImage + "; text-indent: -10em;";

          return result;
        },
        httpHandler: function httpHandler() {
          var errorHandler = arguments[3]; // see httpGet or httpPost arguments
          try {
            return CLIQZEnvironment.httpHandler.apply(CLIQZEnvironment, arguments);
          } catch (e) {
            if (errorHandler) {
              errorHandler(e);
            } else {
              CliqzUtils.log(e, "httpHandler failed");
            }
          }
        },
        httpGet: function httpGet(url, callback, onerror, timeout, _, sync) {
          return CliqzUtils.httpHandler('GET', url, callback, onerror, timeout, _, sync);
        },
        httpPost: function httpPost(url, callback, data, onerror, timeout) {
          return CliqzUtils.httpHandler('POST', url, callback, onerror, timeout, data);
        },
        getLocalStorage: CLIQZEnvironment.getLocalStorage,
        /**
         * Loads a resource URL from the xpi.
         *
         * Wraps httpGet in a try-catch clause. We need to do this, because when
         * trying to load a non-existing file from an xpi via xmlhttprequest, Firefox
         * throws a NS_ERROR_FILE_NOT_FOUND exception instead of calling the onerror
         * function.
         *
         * @see https://bugzilla.mozilla.org/show_bug.cgi?id=827243 (probably).
         */
        loadResource: function loadResource(url, callback, onerror) {
          try {
            return CliqzUtils.httpGet(url, callback, onerror, 3000);
          } catch (e) {
            CliqzUtils.log("Could not load resource " + url + " from the xpi", "CliqzUtils.httpHandler");
            onerror && onerror();
          }
        },
        openTabInWindow: CLIQZEnvironment.openTabInWindow,
        /**
         * Get a value from preferences db
         * @param {string}  pref - preference identifier
         * @param {*=}      defautlValue - returned value in case pref is not defined
         * @param {string=} prefix - prefix for pref
         */
        getPref: CLIQZEnvironment.getPref,
        /**
         * Set a value in preferences db
         * @param {string}  pref - preference identifier
         * @param {*=}      defautlValue - returned value in case pref is not defined
         * @param {string=} prefix - prefix for pref
         */
        setPref: CLIQZEnvironment.setPref,
        /**
         * Check if there is a value in preferences db
         * @param {string}  pref - preference identifier
         * @param {string=} prefix - prefix for pref
         */
        hasPref: CLIQZEnvironment.hasPref,
        /**
         * Clear value in preferences db
         * @param {string}  pref - preference identifier
         * @param {string=} prefix - prefix for pref
         */
        clearPref: CLIQZEnvironment.clearPref,
        log: CLIQZEnvironment.log,
        getDay: function getDay() {
          return Math.floor(new Date().getTime() / 86400000);
        },
        //creates a random 'len' long string from the input space
        rand: function rand(len, _space) {
          var ret = '',
              i,
              space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
              sLen = space.length;

          for (i = 0; i < len; i++) ret += space.charAt(Math.floor(Math.random() * sLen));

          return ret;
        },
        hash: function hash(s) {
          return s.split('').reduce(function (a, b) {
            return (a << 4) - a + b.charCodeAt(0) & 0xEFFFFFF;
          }, 0);
        },
        cleanMozillaActions: function cleanMozillaActions(url) {
          if (url.indexOf("moz-action:") == 0) {
            var _url$match = url.match(/^moz-action:([^,]+),(.*)$/);

            var _url$match2 = _slicedToArray(_url$match, 3);

            var action = _url$match2[1];
            var url = _url$match2[2];

            //url = url.match(/^moz-action:([^,]+),(.*)$/)[2];
          }
          return [action, url];
        },
        cleanUrlProtocol: function cleanUrlProtocol(url, cleanWWW) {
          if (!url) return '';

          var protocolPos = url.indexOf('://');

          // removes protocol http(s), ftp, ...
          if (protocolPos != -1 && protocolPos <= 6) url = url.split('://')[1];

          // removes the www.
          if (cleanWWW && url.toLowerCase().indexOf('www.') == 0) url = url.slice(4);

          return url;
        },
        getDetailsFromUrl: function getDetailsFromUrl(originalUrl) {
          var _CliqzUtils$cleanMozillaActions = CliqzUtils.cleanMozillaActions(originalUrl);

          var _CliqzUtils$cleanMozillaActions2 = _slicedToArray(_CliqzUtils$cleanMozillaActions, 2);

          var action = _CliqzUtils$cleanMozillaActions2[0];
          var originalUrl = _CliqzUtils$cleanMozillaActions2[1];

          // exclude protocol
          var url = originalUrl,
              name = '',
              tld = '',
              subdomains = [],
              path = '',
              query = '',
              fragment = '',
              ssl = originalUrl.indexOf('https') == 0;

          // remove scheme
          url = CliqzUtils.cleanUrlProtocol(url, false);
          var scheme = originalUrl.replace(url, '').replace('//', '');

          // separate hostname from path, etc. Could be separated from rest by /, ? or #
          var host = url.split(/[\/\#\?]/)[0].toLowerCase();
          var path = url.replace(host, '');

          // separate username:password@ from host
          var userpass_host = host.split('@');
          if (userpass_host.length > 1) host = userpass_host[1];

          // Parse Port number
          var port = "";

          var isIPv4 = ipv4_regex.test(host);
          var isIPv6 = ipv6_regex.test(host);

          var indexOfColon = host.indexOf(":");
          if ((!isIPv6 || isIPv4) && indexOfColon >= 0) {
            port = host.substr(indexOfColon + 1);
            host = host.substr(0, indexOfColon);
          } else if (isIPv6) {
            // If an IPv6 address has a port number, it will be right after a closing bracket ] : format [ip_v6]:port
            var endOfIP = host.indexOf(']:');
            if (endOfIP >= 0) {
              port = host.split(']:')[1];
              host = host.split(']:')[0].replace('[', '').replace(']', '');
            }
          }

          // extract query and fragment from url
          var query = '';
          var query_idx = path.indexOf('?');
          if (query_idx != -1) {
            query = path.substr(query_idx + 1);
          }

          var fragment = '';
          var fragment_idx = path.indexOf('#');
          if (fragment_idx != -1) {
            fragment = path.substr(fragment_idx + 1);
          }

          // remove query and fragment from path
          path = path.replace('?' + query, '');
          path = path.replace('#' + fragment, '');
          query = query.replace('#' + fragment, '');

          // extra - all path, query and fragment
          var extra = path;
          if (query) extra += "?" + query;
          if (fragment) extra += "#" + fragment;

          isIPv4 = ipv4_regex.test(host);
          isIPv6 = ipv6_regex.test(host);
          var isLocalhost = CliqzUtils.isLocalhost(host, isIPv4, isIPv6);

          // find parts of hostname
          if (!isIPv4 && !isIPv6 && !isLocalhost) {
            try {
              tld = CLIQZEnvironment.tldExtractor(host);

              // Get the domain name w/o subdomains and w/o TLD
              name = host.slice(0, -(tld.length + 1)).split('.').pop(); // +1 for the '.'

              // Get subdomains
              var name_tld = name + "." + tld;
              subdomains = host.slice(0, -name_tld.length).split(".").slice(0, -1);

              //remove www if exists
              // TODO: I don't think this is the right place to do this.
              //       Disabled for now, but check there are no issues.
              // host = host.indexOf('www.') == 0 ? host.slice(4) : host;
            } catch (e) {
              name = "";
              host = "";
              //CliqzUtils.log('WARNING Failed for: ' + originalUrl, 'CliqzUtils.getDetailsFromUrl');
            }
          } else {
              name = isLocalhost ? "localhost" : "IP";
            }

          // remove www from beginning, we need cleanHost in the friendly url
          var cleanHost = host;
          if (host.toLowerCase().indexOf('www.') == 0) {
            cleanHost = host.slice(4);
          }

          var friendly_url = cleanHost + extra;
          //remove trailing slash from the end
          friendly_url = CliqzUtils.stripTrailingSlash(friendly_url);

          //Handle case where we have only tld for example http://cliqznas
          if (cleanHost === tld) {
            name = tld;
          }

          var urlDetails = {
            scheme: scheme,
            name: name,
            domain: tld ? name + '.' + tld : '',
            tld: tld,
            subdomains: subdomains,
            path: path,
            query: query,
            fragment: fragment,
            extra: extra,
            host: host,
            cleanHost: cleanHost,
            ssl: ssl,
            port: port,
            friendly_url: friendly_url
          };

          return urlDetails;
        },
        stripTrailingSlash: function stripTrailingSlash(str) {
          if (str.substr(-1) === '/') {
            return str.substr(0, str.length - 1);
          }
          return str;
        },
        _isUrlRegExp: /^(([a-z\d]([a-z\d-]*[a-z\d]))\.)+[a-z]{2,}(\:\d+)?$/i,
        isUrl: function isUrl(input) {
          //step 1 remove eventual protocol
          var protocolPos = input.indexOf('://');
          if (protocolPos != -1 && protocolPos <= 6) {
            input = input.slice(protocolPos + 3);
          }
          //step2 remove path & everything after
          input = input.split('/')[0];
          //step3 run the regex
          return CliqzUtils._isUrlRegExp.test(input);
        },

        // Chechks if the given string is a valid IPv4 addres
        isIPv4: function isIPv4(input) {
          var ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])"; // numbers 0 - 255
          var ipv4_regex = new RegExp("^" + ipv4_part + "\\." + ipv4_part + "\\." + ipv4_part + "\\." + ipv4_part + "([:]([0-9])+)?$"); // port number
          return ipv4_regex.test(input);
        },

        isIPv6: function isIPv6(input) {

          // Currently using a simple regex for "what looks like an IPv6 address" for readability
          var ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$");
          return ipv6_regex.test(input);

          /* A better (more precise) regex to validate IPV6 addresses from StackOverflow:
          link: http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
           var ipv6_regex = new RegExp("(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:)"
          + "{1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,"
          + "4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a"
          + "-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}"
          + "|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])"
          + "|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))");
          */
        },

        isLocalhost: function isLocalhost(host, isIPv4, isIPv6) {
          if (host == "localhost") return true;
          if (isIPv4 && host.substr(0, 3) == "127") return true;
          if (isIPv6 && host == "::1") return true;

          return false;
        },

        // checks if a value represents an url which is a seach engine
        isSearch: function isSearch(value) {
          if (CliqzUtils.isUrl(value)) {
            return CliqzUtils.getDetailsFromUrl(value).host.indexOf('google') === 0 ? true : false;
          }
          return false;
        },
        // checks if a string is a complete url
        isCompleteUrl: function isCompleteUrl(input) {
          var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
          if (!pattern.test(input)) {
            return false;
          } else {
            return true;
          }
        },
        // extract query term from search engine result page URLs
        extractQueryFromUrl: function extractQueryFromUrl(url) {
          // Google
          if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
            url = url.substring(url.lastIndexOf('q=') + 2).split('&')[0];
            // Bing
          } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
              url = url.substring(url.indexOf('q=') + 2).split('&')[0];
              // Yahoo
            } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
                url = url.substring(url.indexOf('p=') + 2).split('&')[0];
              } else {
                url = null;
              }
          var decoded = url ? decodeURIComponent(url.replace(/\+/g, ' ')) : null;
          if (decoded) return decoded;else return url;
        },
        // Remove clutter (http, www) from urls
        generalizeUrl: function generalizeUrl(url, skipCorrection) {
          if (!url) {
            return '';
          }
          var val = url.toLowerCase();
          var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
              host = cleanParts[0],
              pathLength = 0,
              SYMBOLS = /,|\./g;
          if (!skipCorrection) {
            if (cleanParts.length > 1) {
              pathLength = ('/' + cleanParts.slice(1).join('/')).length;
            }
            if (host.indexOf('www') === 0 && host.length > 4) {
              // only fix symbols in host
              if (SYMBOLS.test(host[3]) && host[4] != ' ')
                // replace only issues in the host name, not ever in the path
                val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') + (pathLength ? val.substr(-pathLength) : '');
            }
          }
          url = CliqzUtils.cleanUrlProtocol(val, true);
          return url[url.length - 1] == '/' ? url.slice(0, -1) : url;
        },
        // Remove clutter from urls that prevents pattern detection, e.g. checksum
        simplifyUrl: function simplifyUrl(url) {
          var q;
          // Google redirect urls
          if (url.search(/http(s?):\/\/www\.google\..*\/url\?.*url=.*/i) === 0) {
            // Return target URL instead
            url = url.substring(url.lastIndexOf('url=')).split('&')[0];
            url = url.substr(4);
            return decodeURIComponent(url);

            // Remove clutter from Google searches
          } else if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
              q = url.substring(url.lastIndexOf('q=')).split('&')[0];
              if (q != 'q=') {
                // tbm defines category (images/news/...)
                var param = url.indexOf('#') != -1 ? url.substr(url.indexOf('#')) : url.substr(url.indexOf('?'));
                var tbm = param.indexOf('tbm=') != -1 ? '&' + param.substring(param.lastIndexOf('tbm=')).split('&')[0] : '';
                var page = param.indexOf('start=') != -1 ? '&' + param.substring(param.lastIndexOf('start=')).split('&')[0] : '';
                return 'https://www.google.com/search?' + q + tbm /*+ page*/;
              } else {
                  return url;
                }
              // Bing
            } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
                q = url.substring(url.indexOf('q=')).split('&')[0];
                if (q != 'q=') {
                  if (url.indexOf('search?') != -1) return url.substr(0, url.indexOf('search?')) + 'search?' + q;else return url.substr(0, url.indexOf('/?')) + '/?' + q;
                } else {
                  return url;
                }
                // Yahoo redirect
              } else if (url.search(/http(s?):\/\/r.search\.yahoo\.com\/.*/i) === 0) {
                  url = url.substring(url.lastIndexOf('/RU=')).split('/RK=')[0];
                  url = url.substr(4);
                  return decodeURIComponent(url);
                  // Yahoo
                } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
                    var p = url.substring(url.indexOf('p=')).split('&')[0];
                    if (p != 'p=' && url.indexOf(';') != -1) {
                      return url.substr(0, url.indexOf(';')) + '?' + p;
                    } else {
                      return url;
                    }
                  } else {
                    return url;
                  }
        },
        // establishes the connection
        pingCliqzResults: function pingCliqzResults() {
          CliqzUtils.httpHandler('HEAD', CliqzUtils.RESULTS_PROVIDER_PING);
        },
        getBackendResults: function getBackendResults(q, callback) {},
        getCliqzResults: function getCliqzResults(q, callback) {
          CliqzUtils._sessionSeq++;

          // if the user sees the results more than 500ms we consider that he starts a new query
          if (CliqzUtils._queryLastDraw && Date.now() > CliqzUtils._queryLastDraw + 500) {
            CliqzUtils._queryCount++;
          }
          CliqzUtils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
          CliqzUtils._queryLastLength = q.length;

          var url = CliqzUtils.RESULTS_PROVIDER + encodeURIComponent(q) + CliqzUtils.encodeSessionParams() + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale() + CliqzUtils.encodeResultOrder() + CliqzUtils.encodeCountry() + CliqzUtils.encodeFilter() + CliqzUtils.encodeLocation() + CliqzUtils.encodeResultCount(7) + CliqzUtils.disableWikiDedup();

          var req = CliqzUtils.httpGet(url, function (res) {
            callback && callback(res, q);
          });
        },
        // IP driven configuration
        fetchAndStoreConfig: function fetchAndStoreConfig(callback) {
          CliqzUtils.httpGet(CliqzUtils.CONFIG_PROVIDER, function (res) {
            if (res && res.response) {
              try {
                var config = JSON.parse(res.response);
                for (var k in config) {
                  CliqzUtils.setPref('config_' + k, config[k]);
                }
              } catch (e) {}
            }

            callback();
          }, callback, //on error the callback still needs to be called
          2000);
        },
        encodeLocale: function encodeLocale() {
          // send browser language to the back-end
          return '&locale=' + (CliqzUtils.PREFERRED_LANGUAGE || "");
        },
        encodeCountry: function encodeCountry() {
          //international results not supported
          return '&force_country=true';
        },
        disableWikiDedup: function disableWikiDedup() {
          // disable wikipedia deduplication on the backend side
          var doDedup = CliqzUtils.getPref("languageDedup", false);
          if (doDedup) return '&ddl=0';else return "";
        },
        encodeFilter: function encodeFilter() {
          var data = {
            'conservative': 3,
            'moderate': 0,
            'liberal': 1
          },
              state = data[CliqzUtils.getPref('adultContentFilter', 'moderate')];

          return '&adult=' + state;
        },
        encodeResultCount: function encodeResultCount(count) {
          var doDedup = CliqzUtils.getPref("languageDedup", false);
          count = count || 5;
          if (doDedup) return '&count=' + count;else return "";
        },
        encodeResultType: function encodeResultType(type) {
          if (type.indexOf('action') !== -1) return ['T'];else if (type.indexOf('cliqz-results') == 0) return CliqzUtils.encodeCliqzResultType(type);else if (type.indexOf('cliqz-pattern') == 0) return ['C'];else if (type === 'cliqz-extra') return ['X'];else if (type === 'cliqz-series') return ['S'];else if (type.indexOf('bookmark') == 0 || type.indexOf('tag') == 0) return ['B'].concat(CliqzUtils.encodeCliqzResultType(type));else if (type.indexOf('favicon') == 0 || type.indexOf('history') == 0) return ['H'].concat(CliqzUtils.encodeCliqzResultType(type));

          // cliqz type = "cliqz-custom sources-X"
          else if (type.indexOf('cliqz-custom') == 0) return type.substr(21);

          return type; //should never happen
        },
        //eg types: [ "H", "m" ], [ "H|instant", "X|11" ]
        isPrivateResultType: function isPrivateResultType(type) {
          var onlyType = type[0].split('|')[0];
          return 'HBTCS'.indexOf(onlyType) != -1 && type.length == 1;
        },
        // cliqz type = "cliqz-results sources-XXXXX" or "favicon sources-XXXXX" if combined with history
        encodeCliqzResultType: function encodeCliqzResultType(type) {
          var pos = type.indexOf('sources-');
          if (pos != -1) return CliqzUtils.encodeSources(type.substr(pos + 8));else return [];
        },
        // random ID generated at each urlbar focus
        _searchSession: '',
        // number of sequences in each session
        _sessionSeq: 0,
        _queryLastLength: null,
        _queryLastDraw: null,
        // number of queries in search session
        _queryCount: null,
        setSearchSession: function setSearchSession(rand) {
          CliqzUtils._searchSession = rand;
          CliqzUtils._sessionSeq = 0;
          CliqzUtils._queryCount = 0;
          CliqzUtils._queryLastLength = 0;
          CliqzUtils._queryLastDraw = 0;
        },
        encodeSessionParams: function encodeSessionParams() {
          if (CliqzUtils._searchSession.length) {
            return '&s=' + encodeURIComponent(CliqzUtils._searchSession) + '&n=' + CliqzUtils._sessionSeq + '&qc=' + CliqzUtils._queryCount;
          } else return '';
        },

        encodeLocation: function encodeLocation(specifySource, lat, lng) {
          var qs = ['&loc_pref=', CliqzUtils.getPref('share_location', 'ask')].join('');

          if (CliqzUtils.USER_LAT && CliqzUtils.USER_LNG || lat && lng) {
            qs += ['&loc=', lat || CliqzUtils.USER_LAT, ',', lng || CliqzUtils.USER_LNG, specifySource ? ',U' : ''].join('');
          }

          return qs;
        },
        encodeSources: function encodeSources(sources) {
          return sources.toLowerCase().split(', ').map(function (s) {
            if (s.indexOf('cache') == 0) // to catch 'cache-*' for specific countries
              return 'd';else return VERTICAL_ENCODINGS[s] || s;
          });
        },
        isPrivate: CLIQZEnvironment.isPrivate,
        telemetry: CLIQZEnvironment.telemetry,
        resultTelemetry: function resultTelemetry(query, queryAutocompleted, resultIndex, resultUrl, resultOrder, extra) {
          CliqzUtils.setResultOrder(resultOrder);
          var params = encodeURIComponent(query) + (queryAutocompleted ? '&a=' + encodeURIComponent(queryAutocompleted) : '') + '&i=' + resultIndex + (resultUrl ? '&u=' + encodeURIComponent(resultUrl) : '') + CliqzUtils.encodeSessionParams() + CliqzUtils.encodeResultOrder() + (extra ? '&e=' + extra : '');
          CliqzUtils.httpGet(CliqzUtils.RESULTS_PROVIDER_LOG + params);
          CliqzUtils.setResultOrder('');
          CliqzUtils.log(params, 'Utils.resultTelemetry');
        },
        _resultOrder: '',
        setResultOrder: function setResultOrder(resultOrder) {
          CliqzUtils._resultOrder = resultOrder;
        },
        encodeResultOrder: function encodeResultOrder() {
          return CliqzUtils._resultOrder && CliqzUtils._resultOrder.length ? '&o=' + encodeURIComponent(JSON.stringify(CliqzUtils._resultOrder)) : '';
        },
        setInterval: CLIQZEnvironment.setInterval,
        setTimeout: CLIQZEnvironment.setTimeout,
        clearTimeout: CLIQZEnvironment.clearTimeout,
        clearInterval: CLIQZEnvironment.clearTimeout,
        Promise: CLIQZEnvironment.Promise,
        locale: {},
        currLocale: null,
        loadLocale: function loadLocale(lang_locale) {
          var locales = {
            "en-US": "en"
          };
          lang_locale = locales[lang_locale] || lang_locale;

          if (!CliqzUtils.locale.hasOwnProperty(lang_locale) && !CliqzUtils.locale.hasOwnProperty('default')) {
            try {
              CliqzUtils.getLocaleFile(encodeURIComponent(lang_locale), lang_locale);
            } catch (e) {
              var loc = CliqzUtils.getLanguageFromLocale(lang_locale);
              try {
                CliqzUtils.getLocaleFile(loc, lang_locale);
              } catch (e) {
                try {
                  CliqzUtils.getLocaleFile('de', 'default');
                } catch (e) {}
              }
            }
          }
        },
        getLocaleFile: function getLocaleFile(locale_path, locale_key) {
          function callback(req) {
            if (CliqzUtils) {
              if (locale_key !== 'default') {
                CliqzUtils.currLocale = locale_key;
              }
              CliqzUtils.locale[locale_key] = JSON.parse(req.response);
            }
          }
          function onerror(err) {}
          var url = CLIQZEnvironment.LOCALE_PATH + locale_path + '/cliqz.json';
          var response = CliqzUtils.httpGet(url, callback, onerror, 3000, null, true);
          if (response.readyState !== 2) {
            throw "Error";
          }
          return response;
        },
        getLanguageFromLocale: function getLanguageFromLocale(locale) {
          return locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];
        },
        getLanguage: function getLanguage(win) {
          return CliqzUtils.LANGS[CliqzUtils.getLanguageFromLocale(win.navigator.language)] || 'en';
        },
        getLocalizedString: function getLocalizedString(key, substitutions) {
          if (!key) return '';

          var str = key,
              localMessages;

          if (CliqzUtils.currLocale != null && CliqzUtils.locale[CliqzUtils.currLocale] && CliqzUtils.locale[CliqzUtils.currLocale][key]) {
            str = CliqzUtils.locale[CliqzUtils.currLocale][key].message;
            localMessages = CliqzUtils.locale[CliqzUtils.currLocale];
          } else if (CliqzUtils.locale['default'] && CliqzUtils.locale['default'][key]) {
            str = CliqzUtils.locale['default'][key].message;
            localMessages = CliqzUtils.locale['default'];
          }

          if (!substitutions) {
            substitutions = [];
          }
          if (!Array.isArray(substitutions)) {
            substitutions = [substitutions];
          }

          function replacer(matched, index, dollarSigns) {
            if (index) {
              index = parseInt(index, 10) - 1;
              return index in substitutions ? substitutions[index] : "";
            } else {
              // For any series of contiguous `$`s, the first is dropped, and
              // the rest remain in the output string.
              return dollarSigns;
            }
          }
          return str.replace(/\$(?:([1-9]\d*)|(\$+))/g, replacer);
        },
        // gets all the elements with the class 'cliqz-locale' and adds
        // the localized string - key attribute - as content
        localizeDoc: function localizeDoc(doc) {
          var locale = doc.getElementsByClassName('cliqz-locale');
          for (var i = 0; i < locale.length; i++) {
            var el = locale[i];
            el.textContent = CliqzUtils.getLocalizedString(el.getAttribute('key'));
          }
        },
        extensionRestart: function extensionRestart(changes) {
          var enumerator = Services.wm.getEnumerator('navigator:browser');
          while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            if (win.CLIQZ && win.CLIQZ.Core) {
              win.CLIQZ.Core.unload(true);
            }
          }

          changes && changes();

          var corePromises = [];
          enumerator = Services.wm.getEnumerator('navigator:browser');
          while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            if (win.CLIQZ && win.CLIQZ.Core) {
              corePromises.push(win.CLIQZ.Core.init());
            }
          }

          return Promise.all(corePromises);
        },
        isWindows: function isWindows() {
          return CLIQZEnvironment.OS.indexOf("win") === 0;
        },
        isMac: function isMac() {
          return CLIQZEnvironment.OS.indexOf("darwin") === 0;
        },
        isLinux: function isLinux() {
          return CLIQZEnvironment.OS.indexOf("linux") === 0;
        },
        getWindow: CLIQZEnvironment.getWindow,
        getWindowID: CLIQZEnvironment.getWindowID,
        hasClass: function hasClass(element, className) {
          return (' ' + element.className + ' ').indexOf(' ' + className + ' ') > -1;
        },
        /**
         * Bind functions contexts to a specified object.
         * @param {Object} from - An object, whose function properties will be processed.
         * @param {Object} to - An object, which will be the context (this) of processed functions.
         */
        bindObjectFunctions: function bindObjectFunctions(from, to) {
          for (var funcName in from) {
            var func = from[funcName];
            if (!from.hasOwnProperty(funcName)) continue;
            // Can't compare with prototype of object from a different module.
            if (typeof func != "function") continue;
            from[funcName] = func.bind(to);
          }
        },
        tryDecodeURIComponent: function tryDecodeURIComponent(s) {
          // avoide error from decodeURIComponent('%2')
          try {
            return decodeURIComponent(s);
          } catch (e) {
            return s;
          }
        },
        tryEncodeURIComponent: function tryEncodeURIComponent(s) {
          try {
            return encodeURIComponent(s);
          } catch (e) {
            return s;
          }
        },
        parseQueryString: function parseQueryString(qstr) {
          var query = {};
          var a = (qstr || '').split('&');
          for (var i in a) {
            var b = a[i].split('=');
            query[CliqzUtils.tryDecodeURIComponent(b[0])] = CliqzUtils.tryDecodeURIComponent(b[1]);
          }

          return query;
        },
        roundToDecimal: function roundToDecimal(number, digits) {
          var multiplier = Math.pow(10, digits);
          return Math.round(number * multiplier) / multiplier;
        },
        getAdultFilterState: function getAdultFilterState() {
          var data = {
            'conservative': {
              name: CliqzUtils.getLocalizedString('always'),
              selected: false
            },
            'moderate': {
              name: CliqzUtils.getLocalizedString('always_ask'),
              selected: false
            },
            'liberal': {
              name: CliqzUtils.getLocalizedString('never'),
              selected: false
            }
          };

          data[CliqzUtils.getPref('adultContentFilter', 'moderate')].selected = true;

          return data;
        },
        getLocationPermState: function getLocationPermState() {
          var data = {
            'yes': {
              name: CliqzUtils.getLocalizedString('always'),
              selected: false
            },
            'ask': {
              name: CliqzUtils.getLocalizedString('always_ask'),
              selected: false
            },
            'no': {
              name: CliqzUtils.getLocalizedString('never'),
              selected: false
            }
          };

          data[CliqzUtils.getPref('share_location', 'ask')].selected = true;

          return data;
        },

        // Returns result elements selecatble and navigatable from keyboard.
        // |container| search context, usually it's `CLIQZ.UI.gCliqzBox`.
        extractSelectableElements: function extractSelectableElements(container) {
          return Array.prototype.slice.call(container.querySelectorAll('[arrow]')).filter(function (el) {
            // dont consider hidden elements
            if (el.offsetParent == null) return false;

            if (!el.getAttribute('arrow-if-visible')) return true;

            // check if the element is visible
            //
            // for now this check is enough but we might be forced to switch to a
            // more generic approach - maybe using document.elementFromPoint(x, y)
            if (el.offsetLeft + el.offsetWidth > el.parentElement.offsetWidth) return false;
            return true;
          });
        },

        getNoResults: CLIQZEnvironment.getNoResults,
        disableCliqzResults: CLIQZEnvironment.disableCliqzResults,
        enableCliqzResults: CLIQZEnvironment.enableCliqzResults,
        getParameterByName: function getParameterByName(name, location) {
          name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
          var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
              results = regex.exec(location.search);
          return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        },
        addEventListenerToElements: CLIQZEnvironment.addEventListenerToElements,
        search: CLIQZEnvironment.search,
        distance: function distance(lon1, lat1) {
          var lon2 = arguments.length <= 2 || arguments[2] === undefined ? CliqzUtils.USER_LNG : arguments[2];
          var lat2 = arguments.length <= 3 || arguments[3] === undefined ? CliqzUtils.USER_LAT : arguments[3];

          /** Converts numeric degrees to radians */
          function degreesToRad(degree) {
            return degree * Math.PI / 180;
          }

          var R = 6371; // Radius of the earth in km
          if (!lon2 || !lon1 || !lat2 || !lat1) {
            return -1;
          }
          var dLat = degreesToRad(lat2 - lat1); // Javascript functions in radians
          var dLon = degreesToRad(lon2 - lon1);
          var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(degreesToRad(lat1)) * Math.cos(degreesToRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          var d = R * c; // Distance in km
          return d;
        },
        getDefaultSearchEngine: CLIQZEnvironment.getDefaultSearchEngine,
        copyResult: CLIQZEnvironment.copyResult,
        openPopup: CLIQZEnvironment.openPopup,
        isOnPrivateTab: CLIQZEnvironment.isOnPrivateTab,
        getCliqzPrefs: CLIQZEnvironment.getCliqzPrefs,
        isDefaultBrowser: CLIQZEnvironment.isDefaultBrowser,
        initHomepage: CLIQZEnvironment.initHomepage,
        setDefaultSearchEngine: CLIQZEnvironment.setDefaultSearchEngine,
        isUnknownTemplate: CLIQZEnvironment.isUnknownTemplate,
        historySearch: CLIQZEnvironment.historySearch,
        getEngineByName: CLIQZEnvironment.getEngineByName,
        addEngineWithDetails: CLIQZEnvironment.addEngineWithDetails,
        getEngineByAlias: CLIQZEnvironment.getEngineByAlias,
        getSearchEngines: CLIQZEnvironment.getSearchEngines,
        updateAlias: CLIQZEnvironment.updateAlias,
        openLink: CLIQZEnvironment.openLink,
        promiseHttpHandler: CLIQZEnvironment.promiseHttpHandler,
        registerResultProvider: function registerResultProvider(o) {
          CLIQZEnvironment.CliqzResultProviders = o.ResultProviders;
          CLIQZEnvironment.Result = o.Result;
        },
        onRenderComplete: function onRenderComplete(query, box) {
          if (!CLIQZEnvironment.onRenderComplete) return;

          var linkNodes = this.extractSelectableElements(box);
          var urls = linkNodes.map(function (node) {
            return node.getAttribute("url") || node.getAttribute("href");
          }).filter(function (url) {
            return !!url;
          });

          CLIQZEnvironment.onRenderComplete(query, urls);
        }
      };

      _export('default', CliqzUtils);
    }
  };
});
// numbers 0 - 255
// port number
System.register('core/webrequest', ['platform/webrequest'], function (_export) {
  'use strict';

  var WebRequest;
  return {
    setters: [function (_platformWebrequest) {
      WebRequest = _platformWebrequest['default'];
    }],
    execute: function () {
      _export('default', WebRequest);
    }
  };
});
System.register("core/window", ["core/storage", "core/utils", "core/ab-tests"], function (_export) {
  "use strict";

  var Storage, utils, ABTests, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreStorage) {
      Storage = _coreStorage["default"];
    }, function (_coreUtils) {
      utils = _coreUtils["default"];
    }, function (_coreAbTests) {
      ABTests = _coreAbTests["default"];
    }],
    execute: function () {
      _default = (function () {
        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        _createClass(_default, [{
          key: "init",
          value: function init() {
            ABTests.check();
          }
        }, {
          key: "unload",
          value: function unload() {}
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});
System.register("mobile-freshtab/background", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", {
        init: function init(settings) {},

        unload: function unload() {}
      });
    }
  };
});
System.register('mobile-freshtab/news', ['core/utils', 'core/storage', 'mobile-ui/webview'], function (_export) {
  /* global CustomEvent, osAPI */

  'use strict';

  var CliqzUtils, Storage, window, document, Hammer, storage, topSitesList, tempBlockedTopSites, newsVersion, displayedTopSitesCount, TOPSITES_LIMIT, NEWS_LIMIT, News;

  function displayTopSites(list) {
    var isEditMode = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    var blockedTopSites = storage.getObject('blockedTopSites', []);

    list = deduplicateTopsites(list);

    list = list.filter(function (item) {
      return blockedTopSites.indexOf(item.mainDomain) === -1;
    });

    list = list.filter(function (item) {
      return tempBlockedTopSites.indexOf(item.mainDomain) === -1;
    });

    displayedTopSitesCount = Math.min(list.length, TOPSITES_LIMIT);

    list = list.map(function (r) {
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      var logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        displayUrl: details.domain || r.title,
        url: r.url,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style,
        mainDomain: r.mainDomain,
        baseDomain: r.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[0],
        domain: r.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1]
      };
    });

    var isEmpty = list.length ? false : true;

    list = list.concat(Array(TOPSITES_LIMIT).fill(''));
    list = list.splice(0, TOPSITES_LIMIT);

    var div = document.getElementById('topSites');
    var theme = CliqzUtils.getPref('incognito', false) === 'true' ? 'incognito' : 'standard';
    div.innerHTML = CLIQZ.templates.topsites({ isEmpty: isEmpty, isEditMode: isEditMode, list: list, theme: theme });

    CliqzUtils.addEventListenerToElements('#doneEditTopsites', 'click', function (_) {
      var delete_count = tempBlockedTopSites.length;
      var blockedTopSites = storage.getObject('blockedTopSites', []);
      storage.setObject('blockedTopSites', blockedTopSites.concat(tempBlockedTopSites));
      tempBlockedTopSites = [];
      displayTopSites(topSitesList);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target: 'confirm_delete',
        count: displayedTopSitesCount,
        delete_count: delete_count
      });
    });

    CliqzUtils.addEventListenerToElements('#cancelEditTopsites', 'click', function () {
      var delete_count = tempBlockedTopSites.length;
      tempBlockedTopSites = [];
      displayTopSites(topSitesList);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target: 'cancel_delete',
        count: displayedTopSitesCount,
        delete_count: delete_count
      });
    });

    CliqzUtils.addEventListenerToElements('.blockTopsite', 'click', function (_ref) {
      var element = _ref.target;

      tempBlockedTopSites.push(this.getAttribute('mainDomain'));
      displayTopSites(topSitesList, true);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target: 'delete_topsite',
        count: displayedTopSitesCount,
        index: element.dataset.index
      });
    });

    function onLongpress(_ref2) {
      var element = _ref2.target;

      displayTopSites(topSitesList, true);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'longpress',
        target: 'topsite',
        count: displayedTopSitesCount,
        index: element.dataset.index
      });
    }

    function onTap(_ref3) {
      var element = _ref3.srcEvent.currentTarget;

      osAPI.openLink(element.dataset.url);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target_type: 'topsites',
        target_index: element.dataset.index
      });
    }

    var elements = $('.topSitesLink');
    for (var i = 0; i < elements.length; i++) {
      new Hammer(elements[i]).on('tap', onTap);
      new Hammer(elements[i]).on('press', onLongpress);
    }
  }

  function deduplicateTopsites(list) {
    var domains = {};
    return list.filter(function (item) {
      return !domains[item.mainDomain] && (domains[item.mainDomain] = true);
    });
  }

  function log() {
    CliqzUtils.log(arguments, 'News');
  }
  return {
    setters: [function (_coreUtils) {
      CliqzUtils = _coreUtils['default'];
    }, function (_coreStorage) {
      Storage = _coreStorage['default'];
    }, function (_mobileUiWebview) {
      window = _mobileUiWebview.window;
      document = _mobileUiWebview.document;
      Hammer = _mobileUiWebview.Hammer;
    }],
    execute: function () {
      storage = new Storage();
      topSitesList = [];
      tempBlockedTopSites = [];
      newsVersion = undefined;
      displayedTopSitesCount = undefined;
      TOPSITES_LIMIT = 5;
      NEWS_LIMIT = 2;
      News = {
        lastShowTime: 0,
        GENERIC_NEWS_URL: 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com&lang=de,en&locale=de',
        _recentHistory: {},
        getNews: function getNews() {
          log('loading news');

          var method = 'GET',
              callback = function callback(data) {
            try {
              var sResponse = JSON.parse(data.responseText);
              newsVersion = sResponse.results[0].news_version;
              News.displayTopNews(sResponse.results[0].articles);
            } catch (e) {
              log(e);
            }
          },
              onerror = function onerror() {
            log('news error', arguments);
            setTimeout(News.getNews, 1500);
          },
              timeout = function timeout() {
            log('timeout error', arguments);
            News.getNews();
          },
              data = null;
          CliqzUtils.httpHandler(method, News.GENERIC_NEWS_URL, callback, onerror, timeout, data);
        },
        displayTopNews: function displayTopNews(news) {
          if (!news) {
            return;
          }

          news = news.map(function (r) {
            var details = CliqzUtils.getDetailsFromUrl(r.url);
            var logo = CliqzUtils.getLogoDetails(details);
            var type = r.breaking ? 'breakingnews' : 'topnews';
            return {
              breaking: r.breaking,
              title: r.title,
              description: r.description,
              short_title: r.short_title || r.title,
              displayUrl: details.domain || r.title,
              url: r.url,
              text: logo.text,
              backgroundColor: logo.backgroundColor,
              buttonsClass: logo.buttonsClass,
              style: logo.style,
              type: type
            };
          });
          news = news.splice(0, NEWS_LIMIT);
          var div = document.getElementById('topNews');
          div.innerHTML = CLIQZ.templates.topnews(news);
          CliqzUtils.addEventListenerToElements('.answer', 'click', function (_ref4) {
            var item = _ref4.currentTarget;
            var element = _ref4.target;

            osAPI.openLink(item.dataset.url);
            CliqzUtils.telemetry({
              type: 'home',
              action: 'click',
              target: item.dataset.type,
              element: element.dataset.extra,
              index: item.dataset.index
            });
          });
          window.dispatchEvent(new CustomEvent('newsLoadingDone'));
          var breakingnews_count = news.reduce(function (count, item) {
            return item.breaking ? count + 1 : count;
          }, 0);
          var topnews_count = news.length - breakingnews_count;
          CliqzUtils.telemetry({
            type: 'home',
            action: 'show',
            topsite_count: displayedTopSitesCount,
            topnews_version: newsVersion,
            topnews_count: topnews_count,
            breakingnews_count: breakingnews_count
          });
        },

        getRecentHistory: function getRecentHistory(history) {
          history.results.forEach(function (result) {
            return News._recentHistory[result.url] = true;
          });
        },
        startPageHandler: function startPageHandler(list) {

          News.lastShowTime = Date.now();

          News.getNews();

          topSitesList = [];
          var domain = undefined,
              domainArr = undefined,
              mainDomain = undefined;
          for (var i = 0; i < list.length; i++) {
            domain = list[i].url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
            domainArr = domain.split('.');
            mainDomain = domainArr[domainArr.length - 2].substr(0, 10);
            mainDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
            list[i].mainDomain = mainDomain;
            topSitesList.push(list[i]);
          }

          displayTopSites(topSitesList);
        },

        sendHideTelemetry: function sendHideTelemetry() {
          var showDuration = Date.now() - News.lastShowTime;
          CliqzUtils.telemetry({
            type: 'home',
            action: 'hide',
            show_duration: showDuration
          });
        }
      };

      _export('default', News);
    }
  };
});
System.register("mobile-freshtab/window", ["core/cliqz", "mobile-freshtab/news"], function (_export) {
  /**
  * @namespace mobile-freshtab
  */
  "use strict";

  var utils, News, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_mobileFreshtabNews) {
      News = _mobileFreshtabNews["default"];
    }],
    execute: function () {
      _default = (function () {
        /**
        * @class Window
        * @constructor
        * @param settings
        */

        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        /**
        * @method init
        */

        _createClass(_default, [{
          key: "init",
          value: function init() {
            this.window.News = News;
          }
        }, {
          key: "unload",
          value: function unload() {}
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});
System.register('mobile-history/background', ['core/base/background'], function (_export) {
  /* global jsAPI */

  'use strict';

  var background;
  return {
    setters: [function (_coreBaseBackground) {
      background = _coreBaseBackground['default'];
    }],
    execute: function () {
      _export('default', background({
        enabled: function enabled() {
          return true;
        },
        init: function init() {},

        unload: function unload() {},

        events: {
          'mobile-browser:show': jsAPI.onShow,
          'mobile-browser:clear-favorites': jsAPI.clearFavorites,
          'mobile-browser:clear-history': jsAPI.clearHistory
        }
      }));
    }
  };
});
System.register("mobile-history/content/helpers", ["core/utils"], function (_export) {
  "use strict";

  var utils;
  return {
    setters: [function (_coreUtils) {
      utils = _coreUtils["default"];
    }],
    execute: function () {
      _export("default", {
        local: function local(key) {
          var args = Array.prototype.slice.call(arguments);
          var name = args.shift();
          return utils.getLocalizedString.apply(null, [name, args]);
        },
        debug: function debug(optionalValue) {
          console.log("%c Template Data " + this.vertical + " ", "color:#fff;background:green", this);
        },
        conversationsTime: function conversationsTime(time) {
          var d = new Date(time);
          var hours = d.getHours();
          hours = hours > 9 ? hours : '0' + hours;
          var minutes = d.getMinutes();
          minutes = minutes > 9 ? minutes : '0' + minutes;
          var formatedDate = hours + ':' + minutes;
          return formatedDate;
        }
      });
    }
  };
});
System.register('mobile-history/history', ['core/cliqz', 'mobile-history/webview'], function (_export) {
  'use strict';
  /* global osAPI, math */

  var utils, document, Hammer, allHistory, allFavorites, History;

  function showHistory(history) {
    if (!utils.BRANDS_DATABASE.buttons) {
      return setTimeout(History.showHistory, 50, history);
    }

    allHistory = history;
    var queries = utils.getLocalStorage().getObject('recentQueries', []).reverse();

    history.forEach(function (item) {
      item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
    });

    var historyWithLogos = addLogos(history);
    var data = mixHistoryWithQueries(queries, historyWithLogos);
    History.displayData(data, History.showOnlyFavorite);
  }

  function showFavorites(favorites) {
    if (!utils.BRANDS_DATABASE.buttons) {
      return setTimeout(History.showFavorites, 50, favorites);
    }

    allFavorites = favorites;

    favorites.forEach(function (item) {
      item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
    });

    var favoritesWithLogos = addLogos(favorites);

    History.displayData(favoritesWithLogos, History.showOnlyFavorite);
  }

  function addLogos(list) {
    return list.map(function (item) {
      var details = utils.getDetailsFromUrl(item.url);
      item.logo = utils.getLogoDetails(details);
      return item;
    });
  }

  function sendShowTelemetry(data, type) {
    var queryCount = data.filter(function (item) {
      return item.query;
    }).length,
        urlCount = data.filter(function (item) {
      return item.url;
    }).length;
    utils.telemetry({
      type: type,
      action: 'show',
      active_day_count: data.length - queryCount - urlCount,
      query_count: queryCount,
      url_count: urlCount
    });
  }

  function mixHistoryWithQueries(queries, history) {
    var data = [];
    var hi = 0;
    var qi = 0;
    var date = '';
    while (true) {
      if (hi >= history.length || qi >= queries.length) {
        break;
      }

      if (history[hi].timestamp <= queries[qi].timestamp) {
        if (getDateFromTimestamp(history[hi].timestamp) !== date) {
          data.push({ date: getDateFromTimestamp(history[hi].timestamp) });
          date = getDateFromTimestamp(history[hi].timestamp);
        }
        data.push(history[hi]);

        hi++;
      } else {
        if (getDateFromTimestamp(queries[qi].timestamp) !== date) {
          data.push({ date: getDateFromTimestamp(queries[qi].timestamp) });
          date = getDateFromTimestamp(queries[qi].timestamp);
        }
        data.push(queries[qi]);
        qi++;
      }
    }
    while (hi < history.length) {
      if (getDateFromTimestamp(history[hi].timestamp) !== date) {
        data.push({ date: getDateFromTimestamp(history[hi].timestamp) });
        date = getDateFromTimestamp(history[hi].timestamp);
      }
      data.push(history[hi]);
      hi++;
    }
    while (qi < queries.length) {
      if (getDateFromTimestamp(queries[qi].timestamp) !== date) {
        data.push({ date: getDateFromTimestamp(queries[qi].timestamp) });
        date = getDateFromTimestamp(queries[qi].timestamp);
      }
      data.push(queries[qi]);
      qi++;
    }

    return data;
  }

  function displayData(data) {
    var isFavorite = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    var template = isFavorite ? 'favorites' : 'conversations';
    document.body.innerHTML = CLIQZ.templates[template]({ data: data });

    var B = document.body,
        H = document.documentElement;

    var height = undefined;

    if (typeof document.height !== 'undefined') {
      height = document.height; // For webkit browsers
    } else {
        height = Math.max(B.scrollHeight, B.offsetHeight, H.clientHeight, H.scrollHeight, H.offsetHeight);
      }

    document.body.scrollTop = height + 100;

    attachListeners(document.getElementById('container'));

    var type = isFavorite ? 'favorites' : 'history';
    History.sendShowTelemetry(data, type);
  }

  function getDateFromTimestamp(time) {
    var d = new Date(time);

    var days = d.getDate();
    days = days > 9 ? days : '0' + days;

    var months = d.getMonth() + 1;
    months = months > 9 ? months : '0' + months;

    var year = d.getFullYear();

    var formatedDate = days + '.' + months + '.' + year;
    return formatedDate;
  }
  function removeQuery(id) {
    var queries = utils.getLocalStorage().getObject('recentQueries', []);

    queries = queries.filter(function (query) {
      return id !== query.id;
    });
    utils.getLocalStorage().setObject('recentQueries', queries);
  }

  function removeHistoryItem(id) {
    allHistory = allHistory.filter(function (history) {
      return id !== history.id;
    });
    osAPI.removeHistoryItems([id]);
  }

  function removeItem(item) {
    var id = parseInt(item.dataset.id);
    item.getAttribute('class').indexOf('question') >= 0 ? removeQuery(id) : removeHistoryItem(id);
  }

  function unfavoriteItem(item) {
    var url = item.dataset.ref;
    var title = item.dataset.title;
    osAPI.setFavorites([{ title: title, url: url }], false);
  }

  function init(onlyFavorites) {
    migrateQueries();
    History.showOnlyFavorite = onlyFavorites;
    update();
  }

  function update() {
    var callback = History.showOnlyFavorite ? showFavorites : showHistory;
    History.showOnlyFavorite ? osAPI.getFavorites('History.showFavorites') : osAPI.getHistoryItems('History.showHistory');
  }

  function clearHistory() {
    utils.getLocalStorage().setObject('recentQueries', []);
  }

  function clearFavorites() {
    utils.getLocalStorage().setObject('favoriteQueries', []);
  }

  function onElementClick(event) {
    var element = event.srcEvent.currentTarget;
    var tab = History.showOnlyFavorite ? 'favorites' : 'history';
    var targetType = element.getAttribute('class');
    if (targetType.indexOf('question') >= 0) {
      osAPI.notifyQuery(element.dataset.ref);
      sendClickTelemetry(event.target, 'query', tab);
    } else {
      osAPI.openLink(element.dataset.ref);
      sendClickTelemetry(event.target, 'site', tab);
    }
  }

  function crossTransform(element, x) {
    var platforms = ['', '-webkit-', '-ms-'];
    platforms.forEach(function (platform) {
      element.style[platform + 'transform'] = 'translate3d(' + x + 'px, 0px, 0px)';
    });
  }

  function isElementDate(element) {
    return !element.dataset.timestamp;
  }

  function attachListeners(list) {
    var listItems = list.getElementsByTagName("li");

    for (var i = 0; i < listItems.length; i++) {
      if (!isElementDate(listItems[i])) {
        new Hammer(listItems[i]).on('pan', onSwipe);
        new Hammer(listItems[i]).on('panend', onSwipeEnd);
        new Hammer(listItems[i]).on('tap', onElementClick);
      }
    }
  }

  function removeDomElement(element) {
    var prev = element.previousElementSibling;
    var next = element.nextElementSibling;
    if (prev && isElementDate(prev)) {
      if (!next || isElementDate(next)) {
        element.parentElement.removeChild(prev);
      }
    }
    element.parentElement.removeChild(element);
  }

  function onSwipe(e) {
    crossTransform(e.srcEvent.currentTarget, e.deltaX);
  }
  function onSwipeEnd(e) {
    var element = e.srcEvent.currentTarget;
    var tab = History.showOnlyFavorite ? 'favorites' : 'history';
    var targetType = element.getAttribute('class').indexOf('question') >= 0 ? 'query' : 'site';
    var direction = e.direction === 4 ? 'right' : 'left';
    if (math.abs(e.velocityX) < -1 || math.abs(e.deltaX) > 150) {
      History.showOnlyFavorite ? unfavoriteItem(element) : removeItem(element);
      removeDomElement(element);
      sendSwipeTelemetry(targetType, tab, direction);
    } else {
      crossTransform(element, 0);
    }
  }

  function sendClickTelemetry(element, targetType, tab) {
    utils.telemetry({
      type: tab,
      action: 'click',
      target_type: targetType,
      element: element.dataset.name
    });
  }

  function sendSwipeTelemetry(targetType, tab, direction) {
    utils.telemetry({
      type: tab,
      action: 'swipe_' + direction,
      target: targetType
    });
  }

  /**
    This function is for migration of history and favorite queries
    to extension version Mobile Extension 3.5.2
  **/
  function migrateQueries() {
    if (utils.getLocalStorage().getItem('isFavoritesRefactored')) {
      return;
    }
    var queries = utils.getLocalStorage().getObject('recentQueries', []);
    var favoriteQueries = utils.getLocalStorage().getObject('favoriteQueries', []);
    queries = queries.map(function (query) {
      if (query.favorite) {
        favoriteQueries.unshift({ query: query.query, timestamp: query.timestamp });
      }
      delete query.favorite;
      return query;
    });
    utils.getLocalStorage().setObject('recentQueries', queries);
    utils.getLocalStorage().setObject('favoriteQueries', favoriteQueries);
    utils.getLocalStorage().setItem('isFavoritesRefactored', true);
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_mobileHistoryWebview) {
      document = _mobileHistoryWebview.document;
      Hammer = _mobileHistoryWebview.Hammer;
    }],
    execute: function () {
      allHistory = [];
      allFavorites = [];
      History = {
        init: init,
        update: update,
        showHistory: showHistory,
        showFavorites: showFavorites,
        clearHistory: clearHistory,
        clearFavorites: clearFavorites,
        displayData: displayData,
        sendShowTelemetry: sendShowTelemetry,
        showOnlyFavorite: false
      };

      _export('default', History);
    }
  };
});

        'use strict';
        System.register('mobile-history/templates', [], function (_export) {
      
if (typeof templates === 'undefined') { var templates = {};}templates['conversations'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.url : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(8, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "\n            <li class=\"cf answer\" data-ref=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" data-title=\""
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\"\n                 data-id=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" data-timestamp="
    + alias4(((helper = (helper = helpers.timestamp || (depth0 != null ? depth0.timestamp : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"timestamp","hash":{},"data":data}) : helper)))
    + " data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\">\n\n                <div class=\"item\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                    <div class=\"url\" data-name=\"url\"><div>"
    + alias4(((helper = (helper = helpers.domain || (depth0 != null ? depth0.domain : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"domain","hash":{},"data":data}) : helper)))
    + "</div></div>\n                    <div class=\"item__head\" data-name=\"title\">\n                        "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n                    </div>\n                    <div class=\"item__meta\" data-name=\"time\">\n                        "
    + alias4((helpers.conversationsTime || (depth0 && depth0.conversationsTime) || alias2).call(alias1,(depth0 != null ? depth0.timestamp : depth0),{"name":"conversationsTime","hash":{},"data":data}))
    + "\n                    </div>\n                </div>\n            </li>\n\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                            <div class=\"item__logo bg\" data-name=\"logo\"\n                            style=\"background-image:"
    + alias4(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";\n                                   background-color:#"
    + alias4(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + "\"></div>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                            <div class=\"item__logo\" style=\""
    + alias4(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"style","hash":{},"data":data}) : helper)))
    + "\" data-name=\"logo\">\n                                "
    + alias4(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n                            </div>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.query : depth0),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.program(11, data, 0),"data":data})) != null ? stack1 : "")
    + "\n";
},"9":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "\n                <li class=\"cf question\" data-ref=\""
    + alias4(((helper = (helper = helpers.query || (depth0 != null ? depth0.query : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"query","hash":{},"data":data}) : helper)))
    + "\"\n                       data-id=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" data-timestamp="
    + alias4(((helper = (helper = helpers.timestamp || (depth0 != null ? depth0.timestamp : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"timestamp","hash":{},"data":data}) : helper)))
    + " data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\">\n                    <div class=\"item\">\n                        <div class=\"item__meta\">\n                            <div data-name=\"time\">"
    + alias4((helpers.conversationsTime || (depth0 && depth0.conversationsTime) || alias2).call(alias1,(depth0 != null ? depth0.timestamp : depth0),{"name":"conversationsTime","hash":{},"data":data}))
    + "</div>\n                        </div>\n                        <div data-name=\"title\" class=\"item__head\">\n                            "
    + alias4(((helper = (helper = helpers.query || (depth0 != null ? depth0.query : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"query","hash":{},"data":data}) : helper)))
    + "\n                        </div>\n                    </div>\n                </li>\n\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "                    \n                    <li>\n                        <div class=\"dateline\"><span>"
    + container.escapeExpression(container.lambda((depth0 != null ? depth0.date : depth0), depth0))
    + "</span></div>\n                    </li>\n\n";
},"13":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "	<div class=\"nohistoryyet\">\n        <p>"
    + ((stack1 = (helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(depth0 != null ? depth0 : {},"mobile_no_history",{"name":"local","hash":{},"data":data})) != null ? stack1 : "")
    + "</p>\n	</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- conversations.tpl -->\n\n<ul id=\"container\" class=\"content history\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ul>\n    \n"
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"unless","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n\n\n<div style=\"clear:both;\"></div>\n<div id=\"search\" style=\"display:none\">\n    <input id=\"search_input\" type=\"text\" placeholder=\"Filtern nach...\" />\n</div>\n\n<!-- end conversations.tpl -->";
},"useData":true});
templates['favorites'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "\n        <li class=\"cf answer\" data-ref=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" data-title=\""
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\"\n             data-id=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" data-timestamp="
    + alias4(((helper = (helper = helpers.timestamp || (depth0 != null ? depth0.timestamp : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"timestamp","hash":{},"data":data}) : helper)))
    + " data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\">\n\n            <div class=\"item\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                <div class=\"url\" data-name=\"url\"><div>"
    + alias4(((helper = (helper = helpers.domain || (depth0 != null ? depth0.domain : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"domain","hash":{},"data":data}) : helper)))
    + "</div></div>\n                <div class=\"item__head\" data-name=\"title\">\n                    "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n                </div>\n            </div>\n        </li>\n\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(5, data, 0),"data":data})) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                        <div class=\"item__logo bg\" data-name=\"logo\"\n                             style=\"background-image:"
    + alias4(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";\n                                    background-color:#"
    + alias4(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + "\"></div>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                        <div class=\"item__logo\" style=\""
    + alias4(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"style","hash":{},"data":data}) : helper)))
    + "\" data-name=\"logo\">\n                            "
    + alias4(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n                        </div>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div class=\"nohistoryyet\">\n        <p>"
    + ((stack1 = (helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(depth0 != null ? depth0 : {},"mobile_no_favorites",{"name":"local","hash":{},"data":data})) != null ? stack1 : "")
    + "</p>\n    </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- conversations.tpl -->\n\n<ul id=\"container\" class=\"content favorites cf\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n</ul>\n\n"
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"unless","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<!-- end conversations.tpl -->";
},"useData":true});

          _export('default', templates);
        });
      

System.register("mobile-history/webview", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("window", window);

      _export("document", document);

      _export("Hammer", Hammer);
    }
  };
});
System.register("mobile-history/window", ["core/cliqz", "mobile-history/history", "mobile-history/templates", "mobile-history/content/helpers"], function (_export) {

  /**
  * @namespace mobile-history
  */
  "use strict";

  var utils, History, templates, helpers, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_mobileHistoryHistory) {
      History = _mobileHistoryHistory["default"];
    }, function (_mobileHistoryTemplates) {
      templates = _mobileHistoryTemplates["default"];
    }, function (_mobileHistoryContentHelpers) {
      helpers = _mobileHistoryContentHelpers["default"];
    }],
    execute: function () {
      _default = (function () {
        /**
        * @class Window
        * @constructor
        * @param settings
        */

        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        /**
        * @method init
        */

        _createClass(_default, [{
          key: "init",
          value: function init() {
            Object.keys(helpers).forEach(function (helperName) {
              Handlebars.registerHelper(helperName, helpers[helperName]);
            });
            window.CLIQZ.templates = Handlebars.templates = templates;
            this.window.History = History;
          }
        }, {
          key: "unload",
          value: function unload() {}
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});
System.register("mobile-ui/DelayedImageLoader", [], function (_export) {
  'use strict';

  function DelayedImageLoader(selector) {
    this.DELAY = 500;
    this.BANDWITH = 2;

    this.selector = selector;
  }

  return {
    setters: [],
    execute: function () {
      DelayedImageLoader.prototype = {

        start: function start() {
          this.timeout = setTimeout(this.loadFirstBatch.bind(this), this.DELAY);
        },

        stop: function stop() {
          if (this.timeout) {
            clearTimeout(this.timeout);
          }
          this.isRunning = false;
        },

        loadFirstBatch: function loadFirstBatch() {
          this.isRunning = true;
          // TODO: Move loading of images to constructor. But make sure that DOM exists when constructor is called.
          this.elements = Array.prototype.slice.call(document.querySelectorAll(this.selector));
          this.inProcess = this.elements.length;
          if (this.inProcess === 0) {
            window.dispatchEvent(new CustomEvent("imgLoadingDone"));
            return;
          }
          Array.apply(null, Array(this.BANDWITH)).forEach(this.loadNext.bind(this));
        },

        loadNext: function loadNext() {
          var self = this;
          function safeLoadNext() {
            self.inProcess--;
            if (self.inProcess <= 0) {
              window.dispatchEvent(new CustomEvent("imgLoadingDone"));
              return;
            }
            self.loadNext();
          };

          var el = self.elements.shift();
          if (!self.isRunning) {
            return;
          }
          if (!el) {
            return;
          }

          if (el.dataset.src) {

            // TODO: onerror should show default error img
            el.onload = el.onerror = safeLoadNext;
            el.src = el.dataset.src;
          } else if (el.dataset.style) {
            var url = self.getBackgroundImageUrlFromStyle(el.dataset.style),
                img = new Image();
            // TODO: onerror should show default error img
            img.onload = img.onerror = function () {
              el.setAttribute('style', el.dataset.style);
              safeLoadNext();
            };
            img.src = url;
          }
        },

        getBackgroundImageUrlFromStyle: function getBackgroundImageUrlFromStyle(style) {
          var match = style.match(/background-image:\s*url\(([^\)]*)\)/);
          return match && match.length === 2 ? match[1] : '';
        }
      };

      _export("default", DelayedImageLoader);
    }
  };
});
System.register('mobile-ui/UI', ['mobile-ui/DelayedImageLoader', 'mobile-ui/webview', 'core/utils'], function (_export) {
  /*
   * This is the module which creates the UI for the results
   *   - uses handlebars templates
   *   - attaches all the needed listners (keyboard/mouse)
   */

  'use strict';

  var DelayedImageLoader, window, document, utils, resultsBox, freshtabDiv, incognitoDiv, viewPager, currentResults, imgLoader, progressBarInterval, PEEK, currentResultsCount, FRAME, UI, resizeTimeout;

  function setCardCountPerPage(windowWidth) {
    UI.nCardsPerPage = Math.floor(windowWidth / 320) || 1;
  }

  function loadAsyncResult(res, query) {
    for (var i in res) {
      var r = res[i];
      var qt = query + ": " + new Date().getTime();
      CliqzUtils.log(r, "LOADINGASYNC");
      CliqzUtils.log(query, "loadAsyncResult");
      var loop_count = 0;
      var async_callback = function async_callback(req) {
        CliqzUtils.log(query, "async_callback");
        var resp = null;
        try {
          resp = JSON.parse(req.response).results[0];
        } catch (err) {
          res.splice(i, 1);
        }
        if (resp && CliqzAutocomplete.lastSearch === query) {

          var kind = r.data.kind;
          if ("__callback_url__" in resp.data) {
            // If the result is again a promise, retry.
            if (loop_count < 10 /*smartCliqzMaxAttempts*/) {
                setTimeout(function () {
                  loop_count += 1;
                  CliqzUtils.httpGet(resp.data.__callback_url__, async_callback, async_callback);
                }, 100 /*smartCliqzWaitTime*/);
              } else if (!currentResults.results.length) {
                redrawDropdown(CLIQZ.templates.results(currentResults), query);
              }
          } else {
            r.data = resp.data;
            r.url = resp.url;
            r.data.kind = kind;
            r.data.subType = resp.subType;
            r.data.trigger_urls = resp.trigger_urls;
            r.vertical = getVertical(r);
            r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
            r.logo = CliqzUtils.getLogoDetails(r.urlDetails);

            if (resultsBox && CliqzAutocomplete.lastSearch === query) {
              // Remove all existing extra results
              currentResults.results = currentResults.results.filter(function (r) {
                return r.type !== 'cliqz-extra';
              });
              // add the current one on top of the list
              currentResults.results.unshift(r);

              redrawDropdown(CLIQZ.templates.results(currentResults), query);
              imgLoader = new UI.DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
              imgLoader.start();
            }
          }
        }
        // to handle broken promises (eg. Weather and flights) on mobile
        else if (r.data && r.data.__callback_url__) {
            shiftResults();
          } else {
            res.splice(i, 1);
            redrawDropdown(CLIQZ.templates.results(currentResults), query);
          }
      };
      CliqzUtils.httpGet(r.data.__callback_url__, async_callback, async_callback);
    }
  }

  function assessAsync(getAsync) {
    return function (result) {
      var isAsync = result.type === 'cliqz-extra' && result.data && '__callback_url__' in result.data;
      return getAsync ? isAsync : !isAsync;
    };
  }

  function redrawDropdown(newHTML) {
    resultsBox.style.display = 'block';
    freshtabDiv.style.display = 'none';
    incognitoDiv.style.display = 'none';

    resultsBox.innerHTML = newHTML;
  }

  function getVertical(result) {
    // if history records are less than 3 it goes to generic
    var template = undefined;
    if (result.data.template === 'pattern-h3') {
      template = 'history';
    } else if (CliqzUtils.TEMPLATES[result.data.superTemplate]) {
      template = result.data.superTemplate;
    } else if (CliqzUtils.TEMPLATES[result.data.template]) {
      template = result.data.template;
    } else {
      template = 'generic';
    }
    return template;
  }

  function enhanceResults(results) {

    var enhancedResults = [];
    var filteredResults = results.filter(function (r) {
      return !(r.data && r.data.adult);
    });

    filteredResults.forEach(function (r, index) {
      var _tmp = getDebugMsg(r.comment || '');
      var url = r.val || '';
      var urlDetails = CliqzUtils.getDetailsFromUrl(url);
      var kind = r.data.kind[0];
      var historyStyle = '';
      if (kind === 'H' || kind === 'C') {
        historyStyle = 'history';
      }

      enhancedResults.push(enhanceSpecificResult({
        query: r.query,
        type: r.style,
        left: UI.CARD_WIDTH * index,
        data: r.data || {},
        historyStyle: historyStyle,
        url: url,
        urlDetails: urlDetails,
        logo: CliqzUtils.getLogoDetails(urlDetails),
        title: _tmp[0],
        debug: _tmp[1]
      }));
    });

    return enhancedResults;
  }

  // debug message are at the end of the title like this: "title (debug)!"
  function getDebugMsg(fullTitle) {
    // regex matches two parts:
    // 1) the title, can be anything ([\s\S] is more inclusive than '.' as it includes newline)
    // followed by:
    // 2) a debug string like this " (debug)!"
    if (fullTitle === null) {
      return [null, null];
    }
    var r = fullTitle.match(/^([\s\S]+) \((.*)\)!$/);
    if (r && r.length >= 3) {
      return [r[1], r[2]];
    } else {
      return [fullTitle, null];
    }
  }

  function enhanceSpecificResult(r) {
    var contentArea = {
      width: UI.CARD_WIDTH,
      height: window.screen.height
    };

    if (r.subType && JSON.parse(r.subType).ez) {
      // Indicate that this is a RH result.
      r.type = 'cliqz-extra';
    }

    var template = r.vertical = getVertical(r);
    var specificView = UI.VIEWS[template] || UI.VIEWS.generic;
    specificView.enhanceResults && specificView.enhanceResults(r.data, contentArea);

    return r;
  }

  function crossTransform(element, x) {
    var platforms = ['', '-webkit-', '-ms-'];
    platforms.forEach(function (platform) {
      element.style[platform + 'transform'] = 'translate3d(' + x + 'px, 0px, 0px)';
    });
  }

  function getResultKind(el) {
    return getResultOrChildAttr(el, 'kind').split(';');
  }

  // bubbles up maximum to the result container
  function getResultOrChildAttr(_x2, _x3) {
    var _left;

    var _again = true;

    _function: while (_again) {
      var el = _x2,
          attr = _x3;
      _again = false;

      if (el === null) return '';
      if (el.className === FRAME) return el.getAttribute(attr) || '';

      if (_left = el.getAttribute(attr)) {
        return _left;
      }

      _x2 = el.parentElement;
      _x3 = attr;
      _again = true;
      continue _function;
    }
  }

  function resultClick(ev) {
    var el = ev.target,
        url,
        extra,
        action;

    while (el) {
      extra = extra || el.getAttribute('extra');
      url = el.getAttribute('url');
      action = el.getAttribute('cliqz-action');

      if (url && url !== '#') {

        var card = document.getElementsByClassName('card')[UI.currentPage];
        var cardPosition = card.getBoundingClientRect();
        var coordinate = [ev.clientX - cardPosition.left, ev.clientY - cardPosition.top, UI.CARD_WIDTH];

        var signal = {
          type: 'activity',
          action: 'result_click',
          extra: extra,
          mouse: coordinate,
          position_type: getResultKind(el),
          current_position: UI.currentPage
        };

        CliqzUtils.telemetry(signal);
        CliqzUtils.openLink(window, url);
        return;
      } else if (action) {
        switch (action) {
          case 'stop-click-event-propagation':
            return;
          case 'copy-calc-answer':
            CliqzUtils.copyResult(document.getElementById('calc-answer').innerHTML);
            document.getElementById('calc-copied-msg').style.display = '';
            document.getElementById('calc-copy-msg').style.display = 'none';
            break;
        }
      }

      if (el.className === FRAME) break; // do not go higher than a result
      el = el.parentElement;
    }
  }

  function shiftResults() {
    var frames = document.getElementsByClassName('frame');
    for (var i = 0; i < frames.length; i++) {
      var left = frames[i].style.left.substring(0, frames[i].style.left.length - 1);
      left = parseInt(left);
      left -= left / (i + 1);
      UI.lastResults[i] && (UI.lastResults[i].left = left);
      frames[i].style.left = left + 'px';
    }
    currentResultsCount = UI.lastResults.length;

    setResultNavigation(currentResultsCount);
  }

  function setResultNavigation(resultCount) {

    var showGooglethis = 1;

    resultsBox.style.width = window.innerWidth + 'px';
    resultsBox.style.marginLeft = PEEK + 'px';

    // get number of pages according to number of cards per page
    UI.nPages = Math.ceil((currentResultsCount + showGooglethis) / UI.nCardsPerPage);

    if (document.getElementById('currency-tpl')) {
      document.getElementById('currency-tpl').parentNode.removeAttribute('url');
    }
  }

  return {
    setters: [function (_mobileUiDelayedImageLoader) {
      DelayedImageLoader = _mobileUiDelayedImageLoader['default'];
    }, function (_mobileUiWebview) {
      window = _mobileUiWebview.window;
      document = _mobileUiWebview.document;
    }, function (_coreUtils) {
      utils = _coreUtils['default'];
    }],
    execute: function () {
      resultsBox = null;
      freshtabDiv = window.document.getElementById('startingpoint');
      incognitoDiv = window.document.getElementById('incognito');
      viewPager = null;
      currentResults = null;
      imgLoader = null;
      progressBarInterval = null;
      PEEK = 25;
      currentResultsCount = 0;
      FRAME = 'frame';
      UI = {
        isIncognito: false,
        currentPage: 0,
        lastResults: null,
        CARD_WIDTH: 0,
        nCardsPerPage: 1,
        nPages: 1,
        DelayedImageLoader: null,
        VIEWS: {},
        init: function init() {

          var box = document.getElementById('results');
          box.innerHTML = CLIQZ.templates.main();

          resultsBox = document.getElementById('cliqz-results', box);

          resultsBox.addEventListener('click', resultClick);

          // FIXME: import does not work
          UI.DelayedImageLoader = DelayedImageLoader;
        },
        onBoardingSwipe: function onBoardingSwipe() {
          var DELAY = 1200;
          var PAUSE = 1000;
          setTimeout(viewPager.goToIndex, DELAY, 1, 1000);
          setTimeout(viewPager.goToIndex, DELAY + PAUSE, 0, 1000);
        },
        setDimensions: function setDimensions() {
          UI.CARD_WIDTH = window.innerWidth - 2 * PEEK;
          UI.CARD_WIDTH /= UI.nCardsPerPage;
        },
        renderResults: function renderResults(r) {

          if (!viewPager) {
            viewPager = UI.initViewpager();
          }

          var renderedResults = UI.results(r);

          UI.lastResults = renderedResults;

          CLIQZ.UI.stopProgressBar();

          return renderedResults;
        },
        setTheme: function setTheme() {
          var incognito = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

          UI.isIncognito = incognito;
          window.document.body.style.backgroundColor = incognito ? '#4a4a4a' : '#E8E8E8';
          if (!UI.isSearch()) {
            if (incognito) {
              incognitoDiv.innerHTML = utils.getLocalizedString('mobile_incognito');
              freshtabDiv.style.display = 'none';
              incognitoDiv.style.display = 'block';
            } else {
              freshtabDiv.style.display = 'block';
              incognitoDiv.style.display = 'none';
            }
          }
        },
        setMobileBasedUrls: function setMobileBasedUrls(o) {
          if (!o) return;
          var url = o.data && o.data.mobile_url;
          if (o.val) {
            o.val = url || o.val;
          }
          if (o.url) {
            o.url = url || o.url;
          }
          if (o.url && o.m_url) {
            o.url = o.m_url;
          }
          for (var i in o) {
            if (typeof o[i] === 'object') {
              UI.setMobileBasedUrls(o[i]);
            }
          }
        },
        results: function results(r) {

          UI.currentPage = 0;
          viewPager.goToIndex(UI.currentPage);
          UI.setMobileBasedUrls(r);

          setCardCountPerPage(window.innerWidth);

          UI.setDimensions();

          var engine = CliqzUtils.getDefaultSearchEngine();
          var details = CliqzUtils.getDetailsFromUrl(engine.url);
          var logo = CliqzUtils.getLogoDetails(details);

          var enhancedResults = enhanceResults(r._results);

          var title = CliqzUtils.getLocalizedString(enhancedResults[0] ? 'mobile_more_results_title' : 'mobile_no_result_title');

          currentResults = {
            searchString: r._searchString,
            frameWidth: UI.CARD_WIDTH,
            results: enhancedResults,
            isInstant: false,
            isMixed: true,
            googleThis: {
              title: title,
              left: UI.CARD_WIDTH * enhancedResults.length,
              frameWidth: UI.CARD_WIDTH,
              searchString: encodeURIComponent(r._searchString),
              searchEngineUrl: engine.url,
              logo: logo,
              background: logo.backgroundColor
            }
          };

          var query = currentResults.searchString || '';

          if (imgLoader) imgLoader.stop();

          // Results that are not ready (extra results, for which we received a callback_url)
          var asyncResults = currentResults.results.filter(assessAsync(true));
          currentResults.results = currentResults.results.filter(assessAsync(false));

          redrawDropdown(CLIQZ.templates.results(currentResults), query);

          if (asyncResults.length) loadAsyncResult(asyncResults, query);

          imgLoader = new UI.DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
          imgLoader.start();

          crossTransform(resultsBox, 0);

          currentResultsCount = enhancedResults.length;

          setResultNavigation(currentResultsCount);

          return currentResults.results;
        },
        initViewpager: function initViewpager() {
          var views = { 0: 1 },
              pageShowTs = Date.now(),
              innerWidth = window.innerWidth,
              offset = 0;

          return new ViewPager(resultsBox, {
            dragSize: window.innerWidth,
            prevent_all_native_scrolling: false,
            vertical: false,
            anim_duration: 400,
            tipping_point: 0.4,
            onPageScroll: function onPageScroll(scrollInfo) {
              offset = -scrollInfo.totalOffset;
              crossTransform(resultsBox, offset * UI.CARD_WIDTH * UI.nCardsPerPage);
            },

            onPageChange: function onPageChange(page) {
              page = Math.abs(page);

              if (page === UI.currentPage || !UI.isSearch()) return;

              views[page] = (views[page] || 0) + 1;
              var direction = page > UI.currentPage ? 'right' : 'left';

              CliqzUtils.telemetry({
                type: 'cards',
                action: 'swipe_' + direction,
                index: page,
                show_count: views[page],
                show_duration: Date.now() - pageShowTs,
                count: currentResultsCount
              });

              pageShowTs = Date.now();

              UI.currentPage = page;
            }
          });
        },
        hideResultsBox: function hideResultsBox() {
          if (UI.isIncognito) {
            incognitoDiv.style.display = 'block';
          } else {
            freshtabDiv.style.display = 'block';
          }
          resultsBox.style.display = 'none';
        },
        updateSearchCard: function updateSearchCard(engine) {
          var engineDiv = document.getElementById('defaultEngine');
          if (engineDiv && CliqzAutocomplete.lastSearch) {
            engineDiv.setAttribute('url', engine.url + encodeURIComponent(CliqzAutocomplete.lastSearch));
          }
        },
        startProgressBar: function startProgressBar() {
          // suspended
          return;
          if (progressBarInterval) {
            clearInterval(progressBarInterval);
          }
          var multiplier = parseInt(Math.ceil(window.innerWidth / 100)),
              progress = document.getElementById('progress'),
              i = 0;
          progressBarInterval = setInterval(function () {
            i++;
            progress.style.width = i * multiplier + 'px';
          }, 20);

          setTimeout(UI.stopProgressBar, 4000);
        },

        stopProgressBar: function stopProgressBar() {
          // suspended
          return;
          if (progressBarInterval) {
            clearInterval(progressBarInterval);
          }
          document.getElementById('progress').style.width = '0px';
        },
        isSearch: function isSearch() {
          return Boolean(UI.lastResults);
        }
      };

      window.addEventListener('resize', function () {
        if (!UI.isSearch()) return;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
          var lastnCardsPerPage = UI.nCardsPerPage;
          setCardCountPerPage(window.innerWidth);
          UI.setDimensions();
          var frames = document.getElementsByClassName(FRAME);
          for (var i = 0; i < frames.length; i++) {
            var left = UI.CARD_WIDTH * i;
            frames[i].style.left = left + 'px';
            UI.lastResults[i] && (UI.lastResults[i].left = left);
            frames[i].style.width = UI.CARD_WIDTH + 'px';
          }
          setResultNavigation(currentResultsCount);
          UI.currentPage = Math.floor(UI.currentPage * lastnCardsPerPage / UI.nCardsPerPage);
          viewPager.goToIndex(UI.currentPage, 0);
        }, 200);
      });

      window.addEventListener('disconnected', function () {
        var elem = document.getElementById('reconnecting');
        elem && (elem.innerHTML = '<h3>' + CliqzUtils.getLocalizedString('mobile_reconnecting_msg') + '</h3>');
      });

      window.addEventListener('connected', function () {
        var elem = document.getElementById('reconnecting');
        elem && (elem.innerHTML = '');
      });

      _export('default', UI);
    }
  };
});
System.register('mobile-ui/background', ['core/base/background'], function (_export) {
  /* global jsAPI */

  'use strict';

  var background;
  return {
    setters: [function (_coreBaseBackground) {
      background = _coreBaseBackground['default'];
    }],
    execute: function () {
      _export('default', background({
        enabled: function enabled() {
          return true;
        },
        init: function init() {},

        unload: function unload() {},

        events: {
          'mobile-browser:show': jsAPI.onShow,
          'mobile-browser:search': jsAPI.search,
          'mobile-browser:notify-preferences': jsAPI.setClientPreferences,
          'mobile-browser:restore-blocked-topsites': jsAPI.restoreBlockedTopSites,
          'mobile-browser:reset-state': jsAPI.resetState,
          'mobile-browser:set-search-engine': jsAPI.setDefaultSearchEngine,
          'mobile-browser:publish-card-url': jsAPI.getCardUrl,
          'mobile-browser:showcase-swipe-card': jsAPI.onboardingSwipe
        }
      }));
    }
  };
});
System.register('mobile-ui/content/helpers', ['core/utils'], function (_export) {
  /* global Handlebars */
  'use strict';

  var utils, AGO_CEILINGS;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

  return {
    setters: [function (_coreUtils) {
      utils = _coreUtils['default'];
    }],
    execute: function () {
      AGO_CEILINGS = [[0, '', 1], [120, 'ago1Minute', 1], [3600, 'agoXMinutes', 60], [7200, 'ago1Hour', 1], [86400, 'agoXHours', 3600], [172800, 'agoYesterday', 1], [604800, 'agoXDays', 86400], [4838400, 'ago1Month', 1], [29030400, 'agoXMonths', 2419200], [58060800, 'ago1year', 1], [2903040000, 'agoXYears', 29030400]];

      _export('default', {
        local: function local() {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          var name = args.shift();
          return utils.getLocalizedString.apply(null, [name, args]);
        },

        sendTelemetry: function sendTelemetry(nResults) {
          CliqzUtils.telemetry({
            type: 'Results Rendered',
            nResults: nResults
          });
        },

        json: function json(value) {
          return JSON.stringify(value);
        },

        math: function math(lvalue, operator, rvalue) {
          var lval = parseFloat(lvalue);
          var rval = parseFloat(rvalue);

          switch (operator) {
            case '+':
              return lval + rval;
            case '-':
              return lval - rval;
            case '*':
              return lval * rval;
            case '/':
              return lval / rval;
            case '%':
              return lval % rval;
            default:
              break;
          }
          return '';
        },

        debug: function debug() {
          /* eslint-disable */
          console.log("%c Template Data " + this.vertical + " ", "color:#fff;background:green", this);
          /* eslint-enable */
        },

        timeOrCalculator: function timeOrCalculator(ezType) {
          var type = ezType === 'time' ? 'time' : 'calculator';
          return Handlebars.helpers.local(type);
        },

        mobileWikipediaUrls: function mobileWikipediaUrls(url) {
          return url.replace('http://de.wikipedia.org/wiki","https://de.m.wikipedia.org/wiki');
        },
        kind_printer: function kind_printer() {
          var kind = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

          // we need to join with semicolon to avoid conflicting with the comma from json objects
          return kind.join(';');
        },
        /* eslint-disable */
        /* @TODO fix it!!! */
        emphasis: function emphasis(text, q, minQueryLength, cleanControlChars) {
          // lucian: questionable solution performance wise
          // strip out all the control chars
          // eg :text = "... \u001a"
          if (!q) return text;
          q = q.trim();
          if (text && cleanControlChars) text = text.replace(/[\u0000-\u001F]/g, ' ');

          if (!text || !q || q.length < (minQueryLength || 2)) return text;

          var map = Array(text.length),
              tokens = q.toLowerCase().split(/\s+|\.+/).filter(function (t) {
            return t && t.length > 1;
          }),
              lowerText = text.toLowerCase(),
              out,
              high = false;

          tokens.forEach(function (token) {
            var poz = lowerText.indexOf(token);
            while (poz !== -1) {
              for (var i = poz; i < poz + token.length; i++) map[i] = true;
              poz = lowerText.indexOf(token, poz + 1);
            }
          });
          out = [];
          var current = '';
          for (var i = 0; i < text.length; i++) {
            if (map[i] && !high) {
              out.push(current);
              current = '';
              current += text[i];
              high = true;
            } else if (!map[i] && high) {
              out.push(current);
              current = '';
              current += text[i];
              high = false;
            } else current += text[i];
          }
          out.push(current);

          return new Handlebars.SafeString(CLIQZ.templates.emphasis(out));
        },
        /* eslint-enable */

        limit: function limit(idx, maxIdx) {
          return idx < maxIdx;
        },

        agoline: function agoline(ts) {
          if (!ts) {
            return '';
          }

          var now = Date.now() / 1000;
          var seconds = parseInt(now - ts, 10);

          var ago = AGO_CEILINGS.find(function (_ref) {
            var _ref2 = _slicedToArray(_ref, 1);

            var time = _ref2[0];
            return seconds < time;
          });

          if (ago) {
            var roundedTime = parseInt(seconds / ago[2], 10);
            var translation = CliqzUtils.getLocalizedString(ago[1], roundedTime);
            return translation;
          }

          return '';
        },
        even: function even(value, options) {
          return value % 2 ? options.fn(this) : options.inverse(this);
        },

        distance: function distance(meters) {
          var distance = undefined;
          var unit = undefined;
          if (meters < 1000) {
            distance = meters.toFixed(0);
            unit = 'm';
          } else {
            distance = (meters / 1000).toFixed(1);
            unit = 'km';
          }
          return distance + ' ' + unit;
        },

        sec_to_duration: function sec_to_duration(seconds) {
          if (!seconds) {
            return null;
          }
          try {
            var s = parseInt(seconds, 10);
            var min = Math.floor(s / 60);
            var sec = ('0' + s % 60).slice(-2);
            return min + ':' + sec;
          } catch (e) {
            return null;
          }
        },

        numberFormat: function numberFormat(number) {
          // just in case this helper is used on unsanitezed data from backend
          try {
            var num = parseFloat(number).toFixed(2);
            return parseFloat(num).toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
          } catch (e) {
            return '';
          }
        },

        trimNumbers: function trimNumbers(number) {
          return Math.round(number);
        }
      });
    }
  };
});

        'use strict';
        System.register('mobile-ui/templates', [], function (_export) {
      
if (typeof templates === 'undefined') { var templates = {};}templates['Cliqz'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "	<div class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression, alias4=container.lambda;

  return "            <div class=\"cqz-result-h2 nopadding\">\n             <div class=\"EZ-Cliqz-Header\"\n                    data-style=\"background-image: url("
    + alias3(((helper = (helper = helpers.cliqz_logo || (depth0 != null ? depth0.cliqz_logo : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"cliqz_logo","hash":{},"data":data}) : helper)))
    + ")\">\n                    <img url=\"https://twitter.com/cliqz\" class=\"EZ-Cliqz_Header-Contact-icon\" data-src=\"http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-twitter.svg\" arrow-override=\"\" arrow=\"true\" style=\"text-decoration: none;\">\n                    <img url=\"https://www.facebook.com/cliqzde\" class=\"EZ-Cliqz_Header-Contact-icon\" data-src=\"http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-facebook.svg\" arrow-override=\"\">\n             </div>\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.slogan : depth0),{"name":"with","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n             <div class=\"EZ-Cliqz-Footer\">\n                <ul class=\"cta\">\n                    <li class=\"cqz-ez-btn\"  url=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.Common_Questions : depth0)) != null ? stack1.url : stack1), depth0))
    + "\">\n                        <a>"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cliqz_common_questions",{"name":"local","hash":{},"data":data}))
    + "</a>\n                     </li>\n                    <li class=\"cqz-ez-btn\"  url=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.Give_Feedback : depth0)) != null ? stack1.url : stack1), depth0))
    + "\">\n                        <a>"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cliqz_give_feedback",{"name":"local","hash":{},"data":data}))
    + "</a>\n                     </li>\n                    <li class=\"cqz-ez-btn\" url=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.About_Us : depth0)) != null ? stack1.url : stack1), depth0))
    + "\">\n                        <a>"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cliqz_about_us",{"name":"local","hash":{},"data":data}))
    + "</a>\n                     </li>\n                    <li class=\"cqz-ez-btn\"  url=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.Jobs : depth0)) != null ? stack1.url : stack1), depth0))
    + "\">\n                        <a>"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cliqz_jobs",{"name":"local","hash":{},"data":data}))
    + "</a>\n                     </li>\n                    <li class=\"cqz-ez-btn\" url=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.Privacy : depth0)) != null ? stack1.url : stack1), depth0))
    + "\">\n                        <a>"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cliqz_privacy",{"name":"local","hash":{},"data":data}))
    + "</a>\n                    </li>\n                    <li class=\"cqz-ez-btn\"  url=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.Blog : depth0)) != null ? stack1.url : stack1), depth0))
    + "\">\n                        <a>"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cliqz_blog",{"name":"local","hash":{},"data":data}))
    + "</a>\n                    </li>\n                </ul>\n             </div>\n            </div>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "                 <div style=\"\">\n                            <div class=\"EZ-Cliqz-Body-H1\"> "
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cliqz_slogan_H1",{"name":"local","hash":{},"data":data}))
    + " </div>\n                            <div class=\"EZ-Cliqz-Body-H2\">"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cliqz_slogan_H2",{"name":"local","hash":{},"data":data}))
    + "</div>\n                 </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- Cliqz.tpl -->\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<section class=\"primary\">\n    <div class=\"card__description\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n</section>\n\n\n\n\n";
},"useData":true});
templates['EZ-category'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <div url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" extra=\"cat-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" class=\"cards__item ez-category\">\n            <h2 class=\"cards__title__secondary\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.title_key : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(4, data, 0),"data":data})) != null ? stack1 : "")
    + "            </h2>\n        </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "                    "
    + container.escapeExpression((helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.title_key : depth0),{"name":"local","hash":{},"data":data}))
    + "\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                    "
    + container.escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"title","hash":{},"data":data}) : helper)))
    + "\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<!-- EZ-category -->\n<div class=\"third\">\n\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.links : stack1),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n<!-- end EZ-category -->\n";
},"useData":true});
templates['EZ-history'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "            <li url='"
    + alias4(((helper = (helper = helpers.href || (depth0 != null ? depth0.href : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"href","hash":{},"data":data}) : helper)))
    + "' shortUrl='"
    + alias4(((helper = (helper = helpers.link || (depth0 != null ? depth0.link : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"link","hash":{},"data":data}) : helper)))
    + "' domain='"
    + alias4(((helper = (helper = helpers.domain || (depth0 != null ? depth0.domain : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"domain","hash":{},"data":data}) : helper)))
    + "' extra='"
    + alias4(((helper = (helper = helpers.extra || (depth0 != null ? depth0.extra : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"extra","hash":{},"data":data}) : helper)))
    + "' arrow=\"false\">\n                 <a href=\""
    + alias4(((helper = (helper = helpers.href || (depth0 != null ? depth0.href : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"href","hash":{},"data":data}) : helper)))
    + "\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                    <h3>"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</h3>\n                    <span>"
    + alias4((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,(depth0 != null ? depth0.link : depth0),(depths[1] != null ? depths[1].query : depths[1]),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "</span>\n                </a>\n\n            </li>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                         <div newtab='true' class='cta__logo'\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.add_logo_url : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                             style=\""
    + alias4(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"style","hash":{},"data":data}) : helper)))
    + ";\"\n                         >\n                             "
    + alias4(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n                         </div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                                 url=\""
    + container.escapeExpression(((helper = (helper = helpers.logo_url || (depth0 != null ? depth0.logo_url : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"logo_url","hash":{},"data":data}) : helper)))
    + "\"\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "<!-- EZ-history.tpl -->\n"
    + ((stack1 = container.invokePartial(partials.history,depth0,{"name":"history","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "<div class='main'>\n    <ul class='cta cta__history'>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.urls : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </ul>\n</div>\n\n<!-- end EZ-history.tpl -->\n";
},"usePartial":true,"useData":true,"useDepths":true});
templates['calculator'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["with"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <div class=\"card__meta\">\n        <div>"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.friendly_url : stack1), depth0))
    + "</div>\n    </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "    	<div class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" data-style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(8, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "bg";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"6":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"8":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "            <div class='cqz-result-h3 ez-calculator' cliqz-action='copy-calc-answer'>\n"
    + ((stack1 = helpers["with"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </div>\n";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <div class=\"main\">\n                   <div class=\"main__headline\">"
    + alias4(((helper = (helper = helpers.prefix_answer || (depth0 != null ? depth0.prefix_answer : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"prefix_answer","hash":{},"data":data}) : helper)))
    + " <span id='calc-answer'>"
    + alias4(((helper = (helper = helpers.answer || (depth0 != null ? depth0.answer : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"answer","hash":{},"data":data}) : helper)))
    + "</span></div>\n                   <div class=\"expression \"> "
    + alias4(((helper = (helper = helpers.expression || (depth0 != null ? depth0.expression : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"expression","hash":{},"data":data}) : helper)))
    + "</div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.support_copy_ans : depth0),{"name":"if","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </div>\n";
},"12":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "                       <div class=\"message\" id=\"calc-copy-msg\">"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"mobile_calc_copy_ans",{"name":"local","hash":{},"data":data}))
    + "</div>\n                       <div class=\"message\" id=\"calc-copied-msg\" style=\"display: none\">"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"Copied",{"name":"local","hash":{},"data":data}))
    + "</div>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "            <div class='cqz-result-h3 ez-calculator'>\n"
    + ((stack1 = helpers["with"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </div>\n";
},"15":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <div>\n                   <div class=\"answer\">"
    + alias4(((helper = (helper = helpers.prefix_answer || (depth0 != null ? depth0.prefix_answer : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"prefix_answer","hash":{},"data":data}) : helper)))
    + " "
    + alias4(((helper = (helper = helpers.answer || (depth0 != null ? depth0.answer : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"answer","hash":{},"data":data}) : helper)))
    + "</div>\n                   <div class=\"expression\">"
    + alias4(((helper = (helper = helpers.expression || (depth0 != null ? depth0.expression : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"expression","hash":{},"data":data}) : helper)))
    + "</div>\n                </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {}, alias2=container.escapeExpression;

  return "<!-- calculator.tpl -->\n\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.friendly_url : stack1),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<section class=\"primary\">\n\n    <h1 class=\"card__title\">\n       "
    + alias2((helpers.timeOrCalculator || (depth0 && depth0.timeOrCalculator) || helpers.helperMissing).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.ez_type : stack1),{"name":"timeOrCalculator","hash":{},"data":data}))
    + " "
    + alias2(container.lambda(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.location : stack1), depth0))
    + "\n    </h1>\n\n    <div class=\"card__description\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.is_calculus : stack1),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.program(14, data, 0),"data":data})) != null ? stack1 : "")
    + "    </div>\n</section>\n";
},"useData":true});
templates['celebrities'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "	<div extra=\"logo\" class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" data-style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<section class=\"primary\">\n		<h1 extra=\"title\" class=\"card__title\">"
    + alias3((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,(depth0 != null ? depth0.name : depth0),(depths[1] != null ? depths[1].text : depths[1]),2,true,{"name":"emphasis","hash":{},"data":data}))
    + " ("
    + alias3(((helper = (helper = helpers.ocupation || (depth0 != null ? depth0.ocupation : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"ocupation","hash":{},"data":data}) : helper)))
    + ")</a><span>Wikipedia</span></h1>\n		<div extra=\"url\" class=\"card__meta\">\n			<div>"
    + alias3(container.lambda(((stack1 = (depths[1] != null ? depths[1].urlDetails : depths[1])) != null ? stack1.friendly_url : stack1), depth0))
    + "</div>\n		</div>\n		<div class=\"card__gallery\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.images : depth0),{"name":"each","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "		</div>\n		<div extra=\"des\" class=\"card__description\">\n			"
    + alias3((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,(depth0 != null ? depth0.description_wiki : depth0),(depths[1] != null ? depths[1].query : depths[1]),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "\n		</div>\n\n		<div class=\"social\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.social : depth0),{"name":"each","hash":{},"fn":container.program(13, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "		</div>\n	</section>\n\n	<section class=\"secondary\">\n\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.news : stack1),{"name":"if","hash":{},"fn":container.program(15, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.actionsExternalMixed : stack1),{"name":"each","hash":{},"fn":container.program(19, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.internal_links : stack1),{"name":"each","hash":{},"fn":container.program(21, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.additional_sources : stack1),{"name":"each","hash":{},"fn":container.program(23, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n	</section>\n\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(helpers.limit || (depth0 && depth0.limit) || helpers.helperMissing).call(alias1,(data && data.index),3,{"name":"limit","hash":{},"data":data}),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"11":function(container,depth0,helpers,partials,data) {
    var helper, alias1=container.escapeExpression;

  return "					<div extra=\"image-"
    + alias1(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"index","hash":{},"data":data}) : helper)))
    + "\" class=\"image\" data-style=\"background-image: url("
    + alias1(container.lambda(depth0, depth0))
    + ")\">Image</div>\n";
},"13":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "				<div extra=\"social-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" class=\"social__logo\">\n					<div class=\"card__logo__secondary bg\" data-style=\"background-image: url("
    + alias4(((helper = (helper = helpers.img || (depth0 != null ? depth0.img : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"img","hash":{},"data":data}) : helper)))
    + ");background-color:#fff;\">"
    + alias4(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n				</div>\n";
},"15":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "			<!-- data.news -->\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.news : stack1),{"name":"each","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "			<!-- end data.news -->\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "				<div class=\"cards__item news\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logoDetails : depth0),{"name":"with","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n					<h2 class=\"cards__title__secondary\" url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\"><div>"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</div></h2>\n					<div class=\"card__meta__secondary\">\n						"
    + alias4(container.lambda(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.url : stack1), depth0))
    + "\n					</div>\n				</div>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "					<div class=\"card__logo__secondary "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" data-style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "			<div class=\"cards__item actionsExternalMixed\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logoDetails : depth0),{"name":"with","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "				<h2 class=\"cards__title__secondary\" url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">\n					"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n					<span>"
    + alias4((helpers.trimNumbers || (depth0 && depth0.trimNumbers) || alias2).call(alias1,(depth0 != null ? depth0.rank : depth0),{"name":"trimNumbers","hash":{},"data":data}))
    + "</span>\n				</h2>\n			</div>\n";
},"21":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "			<div url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" extra=\"link-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" class=\"cards__item internal_links\">\n\n				<h2 class=\"cards__title__secondary\">\n					"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n				</h2>\n			</div>\n";
},"23":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "			<div class=\"additional_sources\">\n				<h2 class=\"cards__title__secondary\" url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</h2>\n			</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- celebrities.tpl @TODO -->\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<!-- end celebrities.tpl @TODO -->\n";
},"useData":true,"useDepths":true});
templates['currency'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=container.escapeExpression, alias2=depth0 != null ? depth0 : {};

  return "	<div extra=\"logo\" url=\""
    + alias1(container.lambda((depths[1] != null ? depths[1].url : depths[1]), depth0))
    + "\" class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias2,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias2,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.program(7, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "\">"
    + alias1(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias2,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression, alias4=container.lambda;

  return "<!-- currency.tpl -->\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<div id=\"currency-tpl\" class='cqz-result-h3 currency' >\n    <section cliqz-action='copy-calc-answer' class=\"primary\">\n\n      <div class=\"card__meta\">\n          <div>"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"no_legal_disclaimer",{"name":"local","hash":{},"data":data}))
    + "</div>\n      </div>\n\n      <h1 class=\"card__title\">\n         <div class=\"main__headline\">\n            "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toSymbol : stack1), depth0))
    + " <i id=\"calc-answer\">"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toAmount : stack1)) != null ? stack1.main : stack1),{"name":"numberFormat","hash":{},"data":data}))
    + "</i> "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "\n          </div>\n      </h1>\n\n      <div class=\"card__description\">\n            <div class=\"message\" id=\"calc-copy-msg\">"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"mobile_calc_copy_ans",{"name":"local","hash":{},"data":data}))
    + "</div>\n            <div class=\"message\" id=\"calc-copied-msg\" style=\"display: none\">"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"Copied",{"name":"local","hash":{},"data":data}))
    + "</div>\n      </div>\n\n  </section>\n\n  <section class=\"secondary\">\n        <div class=\"main\">\n\n            <table style=\"width:100%\" class=\"currency__table\">\n              <tr>\n                <td class=\"text-center\">\n                  "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + "\n                </td>\n                <td>\n                </td>\n                <td class=\"text-center\">\n                  "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "\n                </td>\n              </tr>\n              <tr class=\"currency__swap\">\n                <td style=\"width: 40%\">\n                  <input class=\"currencyInput\" id=\"fromInput\" type\"number\" step=\"0.01\" onkeyup=\"CLIQZ.UI.VIEWS.currency.updateFromValue("
    + alias3((helpers.json || (depth0 && depth0.json) || alias2).call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"json","hash":{},"data":data}))
    + ")\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromAmount : stack1), depth0))
    + "\" />\n                </td>\n                <td>\n                  <button class=\"currencySwitch\" onclick=\"CLIQZ.UI.VIEWS.currency.switchCurrency("
    + alias3((helpers.json || (depth0 && depth0.json) || alias2).call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"json","hash":{},"data":data}))
    + ")\">Swap</button>\n                </td>\n                <td style=\"width: 40%\">\n                  <input class=\"currencyInput\" id=\"toInput\" type\"number\" step=\"0.01\" onkeyup=\"CLIQZ.UI.VIEWS.currency.updateToValue("
    + alias3((helpers.json || (depth0 && depth0.json) || alias2).call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"json","hash":{},"data":data}))
    + ")\" value=\""
    + alias3(alias4(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toAmount : stack1)) != null ? stack1.main : stack1), depth0))
    + "\" />\n                </td>\n              </tr>\n              <tr class=\"currency__legend first\">\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + "</td>\n                <td style=\"text-align: center\">=</td>\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</td>\n              </tr>\n              <tr class=\"currency__legend\">\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",10,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + "</td>\n                <td style=\"text-align: center\">=</td>\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",10,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</td>\n              </tr>\n              <tr class=\"currency__legend\">\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",50,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + "</td>\n                <td style=\"text-align: center\">=</td>\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",50,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</td>\n              </tr>\n              <tr class=\"currency__legend\">\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",100,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + "</td>\n                <td style=\"text-align: center\">=</td>\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",100,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</td>\n              </tr>\n              <tr class=\"currency__legend\">\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",200,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + "</td>\n                <td style=\"text-align: center\">=</td>\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",200,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</td>\n              </tr>\n              <tr class=\"currency__legend\">\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",500,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + "</td>\n                <td style=\"text-align: center\">=</td>\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",500,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</td>\n              </tr>\n              <tr class=\"currency__legend\">\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",1000,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + "</td>\n                <td style=\"text-align: center\">=</td>\n                <td>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",1000,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</td>\n              </tr>\n            </table>\n           <!-- <br>\n          <p>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + " = "
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</p>\n          <p>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",10,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + " = "
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",10,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</p>\n          <p>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",50,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + " = "
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",50,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</p>\n          <p>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",100,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + " = "
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",100,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</p>\n          <p>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",200,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + " = "
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",200,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</p>\n          <p>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",500,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + " = "
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",500,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</p>\n          <p>"
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.multiplyer : stack1),"*",1000,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.fromCurrency : stack1), depth0))
    + " = "
    + alias3((helpers.numberFormat || (depth0 && depth0.numberFormat) || alias2).call(alias1,(helpers.math || (depth0 && depth0.math) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.mConversionRate : stack1),"*",10,{"name":"math","hash":{},"data":data}),{"name":"numberFormat","hash":{},"data":data}))
    + " "
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.toCurrency : stack1), depth0))
    + "</p>-->\n          </div>\n          <div extra=\"url\" url=\"http://www.xe.com\" class=\"poweredby\">\n              "
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"mobile_calc_more",{"name":"local","hash":{},"data":data}))
    + " XE.com\n          </div>\n\n  </section>\n</div>\n";
},"useData":true,"useDepths":true});
templates['emphasis'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.even || (depth0 && depth0.even) || helpers.helperMissing).call(depth0 != null ? depth0 : {},(data && data.index),{"name":"even","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(4, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    return "<em>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</em>";
},"4":function(container,depth0,helpers,partials,data) {
    return container.escapeExpression(container.lambda(depth0, depth0));
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},depth0,{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"useData":true});
templates['empty'] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "";
},"useData":true});
templates['entity-news-1'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "	<div extra=\"logo\" class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "            <div url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" extra=\"entry-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" class=\"item\">\n              <div class=\"main__image\" data-style=\"background-image: url("
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.thumbnail : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.program(12, data, 0),"data":data})) != null ? stack1 : "")
    + ");\">\n                  Image\n              </div>\n              <h1 class=\"main__headline\">\n                "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n                <span>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.tweet_count : depth0),{"name":"if","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                  "
    + alias4(((helper = (helper = helpers.time || (depth0 != null ? depth0.time : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"time","hash":{},"data":data}) : helper)))
    + "\n                </span>  \n              </h1>\n            </div>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.thumbnail || (depth0 != null ? depth0.thumbnail : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"thumbnail","hash":{},"data":data}) : helper)));
},"12":function(container,depth0,helpers,partials,data) {
    return "http://cdn.cliqz.com/extension/EZ/news/no-image-mobile.png";
},"14":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                    <span class=\"tweet_count\">\n                      <img data-src=\"http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-twitter.svg\"> "
    + container.escapeExpression(((helper = (helper = helpers.tweet_count || (depth0 != null ? depth0.tweet_count : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"tweet_count","hash":{},"data":data}) : helper)))
    + "\n                    </span>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<!-- entity-news-1 -->\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<section class=\"primary\">\n\n    <h1 class=\"card__title\" url=\""
    + alias3(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" extra=\"title\">\n       "
    + alias3((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.name : stack1),(depth0 != null ? depth0.text : depth0),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "\n    </h1>\n\n    <div extra=\"url\" class=\"card__meta\">\n        <div>"
    + alias3(container.lambda(((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.friendly_url : stack1), depth0))
    + "</div>\n    </div>\n\n    <div class=\"primary card__description\">\n        <div class=\"main mulitple\">\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.news : stack1),{"name":"each","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </div>\n    </div>\n"
    + ((stack1 = container.invokePartial(partials["EZ-category"],depth0,{"name":"EZ-category","data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</section>\n\n\n";
},"usePartial":true,"useData":true});
templates['entity-search-1'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "	<div class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data) {
    return "          class=\"cqz-result-h1 cqz-result-padding\"\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "          class=\"cqz-result-h2 cqz-result-padding\"\n";
},"13":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "            <li\n              class=\"cqz-ez-search-app transition\"\n              style=\"background-color: "
    + alias2(alias1((depth0 != null ? depth0.background_color_icon : depth0), depth0))
    + ";\"\n              url=\""
    + alias2(alias1((depth0 != null ? depth0.url : depth0), depth0))
    + "\"\n              extra=\"link-"
    + alias2(alias1((depth0 != null ? depth0.logg_as : depth0), depth0))
    + "\"\n              ><span class=\"cta__logo image\" data-style=\"background-image: url("
    + alias2(alias1((depth0 != null ? depth0.icon_url : depth0), depth0))
    + ")\">Icon</span>\n                  <a>"
    + alias2(alias1((depth0 != null ? depth0.text : depth0), depth0))
    + "</a>\n            </li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {}, alias2=container.lambda, alias3=container.escapeExpression;

  return "<!-- entity-search-1.tpl -->\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<section class=\"primary\">\n\n    <h1 class=\"card__title\">\n       <div>"
    + alias3(alias2(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.search_provider : stack1), depth0))
    + "</div>\n    </h1>\n\n    <div class=\"card__meta\">\n        <div>"
    + alias3(alias2(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.friendly_url : stack1), depth0))
    + "</div>\n    </div>\n\n    <div class=\"card__description\">\n        \n      <div\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.urls : stack1),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.program(11, data, 0),"data":data})) != null ? stack1 : "")
    + "      >\n        <div class=\"cqz-ez-search-app-box\">\n          <ul class=\"cta-list\">\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.links : stack1),{"name":"each","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n        </div>\n"
    + ((stack1 = container.invokePartial(partials["EZ-history"],depth0,{"name":"EZ-history","data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "      </div>\n\n        \n    </div>\n\n</section>\n\n\n\n\n\n\n<!-- end entity-search-1.tpl -->";
},"usePartial":true,"useData":true});
templates['flightStatusEZ-2'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "	<div extra=\"logo\" class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression, alias5=container.lambda;

  return "    <section class=\"primary\">\n\n        <h1 extra=\"title\" class=\"card__title\">\n           "
    + alias4(((helper = (helper = helpers.flight_name || (depth0 != null ? depth0.flight_name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"flight_name","hash":{},"data":data}) : helper)))
    + "\n        </h1>\n\n        <div extra=\"status\" class=\"card__meta\">\n            <div class=\"flightStatusEZ-flightStatus\" style=\"color:"
    + alias4(((helper = (helper = helpers.status_color || (depth0 != null ? depth0.status_color : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"status_color","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.status || (depth0 != null ? depth0.status : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"status","hash":{},"data":data}) : helper)))
    + "</div>\n            "
    + alias4(((helper = (helper = helpers.status_detail || (depth0 != null ? depth0.status_detail : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"status_detail","hash":{},"data":data}) : helper)))
    + "\n        </div>\n\n    </section>\n\n    <section class=\"card__description\">\n       <div extra=\"route\" class=\"flightStatusEZ-plane-position\">\n           <img class=\"flightStatusEZ-plane-position-plane-img\" style=\"left:0\" data-src=\""
    + alias4(((helper = (helper = helpers.plane_icon || (depth0 != null ? depth0.plane_icon : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"plane_icon","hash":{},"data":data}) : helper)))
    + "\" />\n           <div class=\"flightStatusEZ-plane-position-bar\">\n               <div class=\"flightStatusEZ-plane-position-dot\" style=\"left:"
    + alias4(((helper = (helper = helpers.plane_position || (depth0 != null ? depth0.plane_position : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"plane_position","hash":{},"data":data}) : helper)))
    + "%; background:"
    + alias4(((helper = (helper = helpers.status_color || (depth0 != null ? depth0.status_color : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"status_color","hash":{},"data":data}) : helper)))
    + "\"></div>\n           </div>\n       </div>\n\n        <div class=\"flightStatusEZ-depart-arrival cf\">\n             <div extra=\"departure\" class=\"flightStatusEZ-depart\">\n              <div class=\"flightStatusEZ-depart-arrival-name\"> "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["0"] : stack1)) != null ? stack1.location_name : stack1), depth0))
    + " </div>\n              <div style=\"color: "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["0"] : stack1)) != null ? stack1.time_color : stack1), depth0))
    + "\">"
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["0"] : stack1)) != null ? stack1.estimate_actual_time : stack1), depth0))
    + "</div>\n              <div> "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["0"] : stack1)) != null ? stack1.estimate_actual_date : stack1), depth0))
    + " </div>\n              <div>"
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"Terminal",{"name":"local","hash":{},"data":data}))
    + " "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["0"] : stack1)) != null ? stack1.terminal : stack1), depth0))
    + "</div>\n              <div>"
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"Gate",{"name":"local","hash":{},"data":data}))
    + " "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["0"] : stack1)) != null ? stack1.gate : stack1), depth0))
    + "</div>\n             </div>\n\n             <div extra=\"arrival\" class=\"flightStatusEZ-arrival\" style=\"float:right; \">\n              <div class=\"flightStatusEZ-depart-arrival-name\"> "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["1"] : stack1)) != null ? stack1.location_name : stack1), depth0))
    + " </div>\n              <div style=\"color: "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["1"] : stack1)) != null ? stack1.time_color : stack1), depth0))
    + "\">"
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["1"] : stack1)) != null ? stack1.estimate_actual_time : stack1), depth0))
    + "</div>\n              <div> "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["1"] : stack1)) != null ? stack1.estimate_actual_date : stack1), depth0))
    + " </div>\n              <div>"
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"Terminal",{"name":"local","hash":{},"data":data}))
    + " "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["1"] : stack1)) != null ? stack1.terminal : stack1), depth0))
    + "</div>\n              <div>"
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"Gate",{"name":"local","hash":{},"data":data}))
    + " "
    + alias4(alias5(((stack1 = ((stack1 = (depth0 != null ? depth0.depart_arrive : depth0)) != null ? stack1["1"] : stack1)) != null ? stack1.gate : stack1), depth0))
    + "</div>\n             </div>\n        </div>\n    \n\n    <div url=\"http://www.flightstats.com\" extra=\"url\" class=\"poweredby\">\n        "
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"mobile_calc_more",{"name":"local","hash":{},"data":data}))
    + " Flightstats\n    </div>\n</section>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- flightStatusEZ -->\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n\n";
},"useData":true});
templates['generic'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "    <div extra=\"logo\" class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "            "
    + container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.full_name : stack1), depth0))
    + "\n";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.title : stack1),{"name":"if","hash":{},"fn":container.program(12, data, 0),"inverse":container.program(14, data, 0),"data":data})) != null ? stack1 : "");
},"12":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                "
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.title : stack1), depth0))
    + "\n";
},"14":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                "
    + container.escapeExpression(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"title","hash":{},"data":data}) : helper)))
    + "\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<span>"
    + container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.under_name : stack1), depth0))
    + "</span>";
},"18":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <div class=\"timestamp\">"
    + container.escapeExpression((helpers.agoline || (depth0 && depth0.agoline) || helpers.helperMissing).call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.discovery_timestamp : stack1),{"name":"agoline","hash":{},"data":data}))
    + "</div>\n";
},"20":function(container,depth0,helpers,partials,data) {
    return "    	<div class=\"separator\"></div>\n";
},"22":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(helpers.limit || (depth0 && depth0.limit) || helpers.helperMissing).call(alias1,(data && data.index),3,{"name":"limit","hash":{},"data":data}),{"name":"if","hash":{},"fn":container.program(23, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"23":function(container,depth0,helpers,partials,data) {
    return "				<div class=\"image\" data-style=\"background-image: url("
    + container.escapeExpression(container.lambda(depth0, depth0))
    + ")\">Image</div>\n";
},"25":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "            <div class=\"image big\" data-style=\"background-image: url("
    + container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.image : stack1), depth0))
    + ");\">\n                Image\n            </div>\n";
},"27":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.media : stack1),{"name":"if","hash":{},"fn":container.program(28, data, 0),"inverse":container.program(30, data, 0),"data":data})) != null ? stack1 : "")
    + "\n";
},"28":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "				<div class=\"image big\" data-style=\"background-image: url("
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.media : stack1), depth0))
    + ");\">\n					Image\n				</div>\n";
},"30":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.image : stack1)) != null ? stack1.src : stack1),{"name":"if","hash":{},"fn":container.program(31, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.i : stack1),{"name":"if","hash":{},"fn":container.program(33, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"31":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "					<div class=\"image big\" data-style=\"background-image: url("
    + container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.image : stack1)) != null ? stack1.src : stack1), depth0))
    + ")\">\n						Image\n					</div>\n";
},"33":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "					<div class=\"image big\" data-style=\"background-image: url("
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.i : stack1), depth0))
    + ")\">\n						Image\n					</div>\n";
},"35":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "		<div class=\"ez-video\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.items : stack1),{"name":"each","hash":{},"fn":container.program(36, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "		</div>\n";
},"36":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "\n				<div class=\"item\" url=\""
    + alias4(((helper = (helper = helpers.link || (depth0 != null ? depth0.link : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"link","hash":{},"data":data}) : helper)))
    + "\">\n				  <div class=\"main__image\" data-style=\"background-image: url("
    + alias4(((helper = (helper = helpers.thumbnail || (depth0 != null ? depth0.thumbnail : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"thumbnail","hash":{},"data":data}) : helper)))
    + ")\">\n					  "
    + ((stack1 = helpers["if"].call(alias1,(helpers.sec_to_duration || (depth0 && depth0.sec_to_duration) || alias2).call(alias1,(depth0 != null ? depth0.duration : depth0),{"name":"sec_to_duration","hash":{},"data":data}),{"name":"if","hash":{},"fn":container.program(37, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n				  </div>\n				  <h1 class=\"main__headline\">"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</h1>\n				</div>\n\n";
},"37":function(container,depth0,helpers,partials,data) {
    return "<span> "
    + container.escapeExpression((helpers.sec_to_duration || (depth0 && depth0.sec_to_duration) || helpers.helperMissing).call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.duration : depth0),{"name":"sec_to_duration","hash":{},"data":data}))
    + "</span>";
},"39":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "			<div class=\"main__rating\">\n				<img data-src=\""
    + container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.url_ratingimg : stack1), depth0))
    + "\" class=\"cqz-rd-rateimg\"/>\n			</div>\n";
},"41":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.rating : stack1)) != null ? stack1.val : stack1),{"name":"if","hash":{},"fn":container.program(42, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"42":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "				<div class=\"main__rating\">\n					<img data-src=\""
    + container.escapeExpression(container.lambda(((stack1 = ((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.rating : stack1)) != null ? stack1.img : stack1), depth0))
    + "\" class=\"cqz-rd-rateimg\"/>\n				</div>\n";
},"44":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.r : stack1)) != null ? stack1.val : stack1),{"name":"if","hash":{},"fn":container.program(45, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"45":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "				<div class=\"main__rating\">\n					<img data-src=\""
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.r : stack1)) != null ? stack1.img : stack1), depth0))
    + "\" class=\"cqz-rd-rateimg\"/>\n					"
    + alias2((helpers.numberFormat || (depth0 && depth0.numberFormat) || helpers.helperMissing).call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.r : stack1)) != null ? stack1.val : stack1),{"name":"numberFormat","hash":{},"data":data}))
    + "/"
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.r : stack1)) != null ? stack1.scale : stack1), depth0))
    + " <!--("
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.r : stack1)) != null ? stack1.nVote : stack1), depth0))
    + " Stimmen)-->\n				</div>\n";
},"47":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=container.lambda, alias2=container.escapeExpression;

  return "			<div url=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.info : depth0)) != null ? stack1.url : stack1), depth0))
    + "\" class=\"main__director\">\n				"
    + alias2(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"title","hash":{},"data":data}) : helper)))
    + ": "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.info : depth0)) != null ? stack1.name : stack1), depth0))
    + "\n			</div>\n";
},"49":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "			"
    + container.escapeExpression((helpers.emphasis || (depth0 && depth0.emphasis) || helpers.helperMissing).call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.des : stack1),(depth0 != null ? depth0.query : depth0),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "\n";
},"51":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.current_company : stack1),{"name":"if","hash":{},"fn":container.program(52, data, 0),"inverse":container.program(54, data, 0),"data":data})) != null ? stack1 : "");
},"52":function(container,depth0,helpers,partials,data) {
    return "";
},"54":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "				"
    + container.escapeExpression((helpers.emphasis || (depth0 && depth0.emphasis) || helpers.helperMissing).call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.shortDescription : stack1),(depth0 != null ? depth0.query : depth0),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "\n";
},"56":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "				"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.current_job_title : depth0),{"name":"if","hash":{},"fn":container.program(57, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n				"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.current_company : depth0),{"name":"if","hash":{},"fn":container.program(59, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n				"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.since : depth0),{"name":"if","hash":{},"fn":container.program(61, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"57":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<br />"
    + container.escapeExpression(((helper = (helper = helpers.current_job_title || (depth0 != null ? depth0.current_job_title : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"current_job_title","hash":{},"data":data}) : helper)));
},"59":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<br />"
    + container.escapeExpression(((helper = (helper = helpers.current_company || (depth0 != null ? depth0.current_company : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"current_company","hash":{},"data":data}) : helper)));
},"61":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<br />seit "
    + container.escapeExpression(((helper = (helper = helpers.since || (depth0 != null ? depth0.since : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"since","hash":{},"data":data}) : helper)));
},"63":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "		<div class=\"card__description\">\n			<ul class=\"recipe_ingredients\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.mobi : stack1)) != null ? stack1.ingredients : stack1),{"name":"each","hash":{},"fn":container.program(64, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "			</ul>\n		</div>\n";
},"64":function(container,depth0,helpers,partials,data) {
    return "					<li>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</li>\n";
},"66":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.news : stack1),{"name":"each","hash":{},"fn":container.program(67, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"67":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "			<div class=\"cards__item news\">\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logoDetails : depth0),{"name":"with","hash":{},"fn":container.program(68, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n				<h2 class=\"cards__title__secondary\" url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</h2>\n				<div class=\"card__meta__secondary\">\n					"
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\n				</div>\n			</div>\n";
},"68":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "					<div class=\"card__logo__secondary "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\"\n						 style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n					</div>\n";
},"70":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "		<div class=\"cards__item actionsExternalMixed\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logoDetails : depth0),{"name":"with","hash":{},"fn":container.program(71, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "			<h2 class=\"cards__title__secondary\" url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">\n				"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n				<span>"
    + alias4((helpers.trimNumbers || (depth0 && depth0.trimNumbers) || alias2).call(alias1,(depth0 != null ? depth0.rank : depth0),{"name":"trimNumbers","hash":{},"data":data}))
    + "</span>\n			</h2>\n		</div>\n";
},"71":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "				<div class=\"card__logo__secondary "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"73":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(helpers.limit || (depth0 && depth0.limit) || helpers.helperMissing).call(alias1,(data && data.index),10,{"name":"limit","hash":{},"data":data}),{"name":"if","hash":{},"fn":container.program(74, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"74":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "            <div url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" extra=\"action-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" class=\"cards__item links\">\n                <h2 class=\"cards__title__secondary\">\n                    "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n                </h2>\n            </div>\n";
},"76":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.internal_links : stack1),{"name":"each","hash":{},"fn":container.program(77, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"77":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "            <div url=\""
    + alias3((helpers.mobileWikipediaUrls || (depth0 && depth0.mobileWikipediaUrls) || alias2).call(alias1,(depth0 != null ? depth0.url : depth0),{"name":"mobileWikipediaUrls","hash":{},"data":data}))
    + "\" class=\"cards__item internal_links\">\n                <h2 class=\"cards__title__secondary\">\n                    "
    + alias3(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n                </h2>\n            </div>\n\n";
},"79":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "\n        <div class=\"additional_sources\" url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depths[1] != null ? depths[1].logo : depths[1]),{"name":"with","hash":{},"fn":container.program(80, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            <div class=\"url\"><div>"
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "</div></div>\n            <h2 class=\"cards__title__secondary\" data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\">\n                "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n            </h2>\n        </div>\n";
},"80":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(81, data, 0),"inverse":container.program(83, data, 0),"data":data})) != null ? stack1 : "");
},"81":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                    <div class=\"item__logo bg\" style=\"background-image:"
    + alias4(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";\n                                                      background-color:#"
    + alias4(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + "\">\n                    </div>\n";
},"83":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                    <div class=\"item__logo\" style=\""
    + alias4(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"style","hash":{},"data":data}) : helper)))
    + "\">\n                        "
    + alias4(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n                    </div>\n";
},"85":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <div class=\"cards__item external_social\">\n            <div class=\"card__logo__secondary bg\" data-style=\"background-image: url("
    + alias4(((helper = (helper = helpers.img || (depth0 != null ? depth0.img : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"img","hash":{},"data":data}) : helper)))
    + ");background-color:#fff;\">"
    + alias4(((helper = (helper = helpers.domain || (depth0 != null ? depth0.domain : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"domain","hash":{},"data":data}) : helper)))
    + "</div>\n            <h2 class=\"cards__title__secondary\" url=\""
    + alias4(((helper = (helper = helpers.u || (depth0 != null ? depth0.u : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"u","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.domain || (depth0 != null ? depth0.domain : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"domain","hash":{},"data":data}) : helper)))
    + "</h2>\n        </div>\n";
},"87":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "			<div extra=\"social-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" url=\""
    + alias4(((helper = (helper = helpers.u || (depth0 != null ? depth0.u : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"u","hash":{},"data":data}) : helper)))
    + "\" class=\"social__logo\">\n				<div class=\"card__logo__secondary bg\" data-style=\"background-image: url("
    + alias4(((helper = (helper = helpers.logo || (depth0 != null ? depth0.logo : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"logo","hash":{},"data":data}) : helper)))
    + ");background-color:#fff; background-size: 100%\"></div>\n			</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<!-- generic.tpl -->\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<div extra=\"url\" class=\"card__meta "
    + alias4(((helper = (helper = helpers.historyStyle || (depth0 != null ? depth0.historyStyle : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"historyStyle","hash":{},"data":data}) : helper)))
    + "\">\n    <div>"
    + alias4(container.lambda(((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.friendly_url : stack1), depth0))
    + "</div>\n</div>\n\n<section class=\"primary\">\n\n    <h1 extra=\"title\" class=\"card__title "
    + alias4(((helper = (helper = helpers.historyStyle || (depth0 != null ? depth0.historyStyle : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"historyStyle","hash":{},"data":data}) : helper)))
    + "\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.full_name : stack1),{"name":"if","hash":{},"fn":container.program(9, data, 0, blockParams, depths),"inverse":container.program(11, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "        "
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.under_name : stack1),{"name":"if","hash":{},"fn":container.program(16, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    </h1>\n\n\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.discovery_timestamp : stack1),{"name":"if","hash":{},"fn":container.program(18, data, 0, blockParams, depths),"inverse":container.program(20, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "\n    <!-- main images -->\n\n    <div class=\"card__gallery\">\n\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.images : stack1),{"name":"each","hash":{},"fn":container.program(22, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.image : stack1),{"name":"if","hash":{},"fn":container.program(25, data, 0, blockParams, depths),"inverse":container.program(27, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "	</div>\n\n    <!-- end main images -->\n\n	<!-- for videos -->\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.items : stack1),{"name":"if","hash":{},"fn":container.program(35, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "	<!--end for videos -->\n\n	<div extra=\"des\" class=\"card__description\">\n\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.url_ratingimg : stack1),{"name":"if","hash":{},"fn":container.program(39, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.rating : stack1)) != null ? stack1.img : stack1),{"name":"if","hash":{},"fn":container.program(41, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.r : stack1)) != null ? stack1.img : stack1),{"name":"if","hash":{},"fn":container.program(44, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["with"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.director : stack1),{"name":"with","hash":{},"fn":container.program(47, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.des : stack1),{"name":"if","hash":{},"fn":container.program(49, data, 0, blockParams, depths),"inverse":container.program(51, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "\n		<!-- people data -->\n"
    + ((stack1 = helpers["with"].call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1),{"name":"with","hash":{},"fn":container.program(56, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "		<!-- end people data -->\n	</div>\n\n</section>\n\n<section class=\"secondary\">\n\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.mobi : stack1)) != null ? stack1.ingredients : stack1),{"name":"if","hash":{},"fn":container.program(63, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.news : stack1),{"name":"if","hash":{},"fn":container.program(66, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.actionsExternalMixed : stack1),{"name":"each","hash":{},"fn":container.program(70, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.actions : stack1),{"name":"each","hash":{},"fn":container.program(73, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.internal_links : stack1),{"name":"if","hash":{},"fn":container.program(76, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.richData : stack1)) != null ? stack1.additional_sources : stack1),{"name":"each","hash":{},"fn":container.program(79, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.external_social : stack1),{"name":"each","hash":{},"fn":container.program(85, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n	<div class=\"social\">\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.w : stack1),{"name":"each","hash":{},"fn":container.program(87, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "	</div>\n\n</section>\n\n"
    + ((stack1 = container.invokePartial(partials["EZ-category"],depth0,{"name":"EZ-category","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.history,depth0,{"name":"history","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n<!-- end generic.tpl -->\n";
},"usePartial":true,"useData":true,"useDepths":true});
templates['history'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "    \n    <div class=\"primary\">\n        <h1 class=\"card__title\">"
    + container.escapeExpression((helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(alias1,"mobile_history_card_title",{"name":"local","hash":{},"data":data}))
    + "</h1>\n    </div>\n\n    <section class=\"secondary\">\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.urls : stack1),{"name":"each","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </section>\n";
},"2":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "\n            <div class=\"additional_sources history\" url=\""
    + alias4(((helper = (helper = helpers.href || (depth0 != null ? depth0.href : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"href","hash":{},"data":data}) : helper)))
    + "\" shortUrl='"
    + alias4(((helper = (helper = helpers.link || (depth0 != null ? depth0.link : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"link","hash":{},"data":data}) : helper)))
    + "' domain='"
    + alias4(((helper = (helper = helpers.domain || (depth0 != null ? depth0.domain : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"domain","hash":{},"data":data}) : helper)))
    + "'\n                 extra='"
    + alias4(((helper = (helper = helpers.extra || (depth0 != null ? depth0.extra : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"extra","hash":{},"data":data}) : helper)))
    + "' arrow=\"false\">\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                <div class=\"url\"><div>"
    + alias4((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,(depth0 != null ? depth0.link : depth0),(depths[1] != null ? depths[1].text : depths[1]),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "</div></div>\n                <h2 class=\"cards__title__secondary\" data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\">\n                    "
    + alias4((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,(depth0 != null ? depth0.title : depth0),(depths[1] != null ? depths[1].text : depths[1]),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "\n                </h2>\n            </div>\n\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                        <div class=\"item__logo bg\" style=\"background-image:"
    + alias4(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";\n                                                          background-color:#"
    + alias4(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + "\">\n                        </div>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                        <div class=\"item__logo\" style=\""
    + alias4(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"style","hash":{},"data":data}) : helper)))
    + "\">\n                            "
    + alias4(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n                        </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "<!-- history.tpl -->\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.urls : stack1),{"name":"if","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<!-- end history.tpl -->\n";
},"useData":true,"useDepths":true});
templates['ligaEZ1Game'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "    <div class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "\n\n    <section class=\"primary\">  \n\n        <h1 class=\"card__title\">\n            "
    + alias4(((helper = (helper = helpers.club || (depth0 != null ? depth0.club : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"club","hash":{},"data":data}) : helper)))
    + "\n        </h1>\n\n        <div class=\"card__meta\">\n            <div>"
    + alias4(container.lambda((depths[1] != null ? depths[1].url : depths[1]), depth0))
    + "</div>\n        </div>\n\n        <div class=\"card__description\">\n            Offizielle Webseite von "
    + alias4(((helper = (helper = helpers.club || (depth0 != null ? depth0.club : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"club","hash":{},"data":data}) : helper)))
    + "\n        </div>\n\n        \n\n        <div class=\"soccer__result\" cliqz-action=\"stop-click-event-propagation\" onclick=\"osAPI.openLink('"
    + alias4(((helper = (helper = helpers.live_url || (depth0 != null ? depth0.live_url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"live_url","hash":{},"data":data}) : helper)))
    + "')\">\n            \n           <h5>"
    + alias4(((helper = (helper = helpers.spielTag || (depth0 != null ? depth0.spielTag : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"spielTag","hash":{},"data":data}) : helper)))
    + "</h5>\n           <span class=\"meta__legend\">"
    + alias4(((helper = (helper = helpers.gameTime || (depth0 != null ? depth0.gameTime : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"gameTime","hash":{},"data":data}) : helper)))
    + " - "
    + alias4(((helper = (helper = helpers.location || (depth0 != null ? depth0.location : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"location","hash":{},"data":data}) : helper)))
    + "</span>\n           <table cellspacing=\"0\" cellpadding=\"0\">\n               <tr>\n                   <td>"
    + alias4(((helper = (helper = helpers.HOST || (depth0 != null ? depth0.HOST : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"HOST","hash":{},"data":data}) : helper)))
    + "</td>\n                   <td class=\"score\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.score : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.program(12, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "                   </td>\n                   <td>"
    + alias4(((helper = (helper = helpers.GUESS || (depth0 != null ? depth0.GUESS : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"GUESS","hash":{},"data":data}) : helper)))
    + "</td>\n               </tr>\n           </table>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.news : depth0),{"name":"if","hash":{},"fn":container.program(17, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n       </div>\n    </section>\n\n    \n\n    <div class=\"poweredby\" url=\"http://www.kicker.de/mobile/startseite.html\">\n        <div class=\"card__logo__poweredby bg\"\n            data-style=\"background-size: 75%;background-image:url(https://cdn.cliqz.com/brands-database/database/1452759183853/logos/kicker/$.svg);background-color:#FF1D1D;top:inherit;\"\n            style=\"background-size: 75%;background-image:url(https://cdn.cliqz.com/brands-database/database/1452759183853/logos/kicker/$.svg);background-color: #FF1D1D;top:inherit;\">\n                Ki\n        </div> \n        "
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"KickerSponsor",{"name":"local","hash":{},"data":data}))
    + "\n    </div>\n\n    <section class=\"secondary\" cliqz-action=\"stop-click-event-propagation\">\n\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0["static"] : depth0)) != null ? stack1.links : stack1),{"name":"each","hash":{},"fn":container.program(25, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    </section>\n\n";
},"10":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                           <div class=\"ez-liga-score\">"
    + container.escapeExpression(((helper = (helper = helpers.score || (depth0 != null ? depth0.score : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"score","hash":{},"data":data}) : helper)))
    + "\n                               <div class=\"ez-liga-live\">live</div>\n                           </div>\n";
},"12":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.scored : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.program(15, data, 0),"data":data})) != null ? stack1 : "");
},"13":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                               <div class=\"ez-liga-vs\">"
    + container.escapeExpression(((helper = (helper = helpers.scored || (depth0 != null ? depth0.scored : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"scored","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"15":function(container,depth0,helpers,partials,data) {
    return "                               <div class=\"ez-liga-vs\">"
    + container.escapeExpression((helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(depth0 != null ? depth0 : {},"vs",{"name":"local","hash":{},"data":data}))
    + "</div>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <section class=\"secondary\" cliqz-action=\"stop-click-event-propagation\">\n                    <div class=\"main mulitple\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.news : depth0),{"name":"each","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                    </div>\n                </section>\n";
},"18":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                            <div url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" extra=\"entry-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" class=\"item\">\n                                <div class=\"main__image\" data-style=\"background-image: url("
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.thumbnail : depth0),{"name":"if","hash":{},"fn":container.program(19, data, 0),"inverse":container.program(21, data, 0),"data":data})) != null ? stack1 : "")
    + ");\">\n                                    Image\n                                </div>\n                                <h1 class=\"main__headline\">\n                                    "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n                                    <span>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.tweet_count : depth0),{"name":"if","hash":{},"fn":container.program(23, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                                      "
    + alias4((helpers.agoline || (depth0 && depth0.agoline) || alias2).call(alias1,(depth0 != null ? depth0.discovery_timestamp : depth0),{"name":"agoline","hash":{},"data":data}))
    + "\n                                    </span>\n                                </h1>\n                            </div>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.thumbnail || (depth0 != null ? depth0.thumbnail : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"thumbnail","hash":{},"data":data}) : helper)));
},"21":function(container,depth0,helpers,partials,data) {
    return "http://cdn.cliqz.com/extension/EZ/news/no-image-mobile.png";
},"23":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                                            <span class=\"tweet_count\">\n                                                <img data-src=\"http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-twitter.svg\"> "
    + container.escapeExpression(((helper = (helper = helpers.tweet_count || (depth0 != null ? depth0.tweet_count : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"tweet_count","hash":{},"data":data}) : helper)))
    + "\n                                            </span>\n";
},"25":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(helpers.limit || (depth0 && depth0.limit) || helpers.helperMissing).call(alias1,(data && data.index),10,{"name":"limit","hash":{},"data":data}),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"26":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <div url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" extra=\"link-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" class=\"cards__item additional_sources\">\n                    <h2 class=\"cards__title__secondary\">\n                        "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n                    </h2>\n                </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- ligaEZ1Game.tpl-->\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n\n<!-- end ligaEZ1Game.tpl-->\n";
},"useData":true,"useDepths":true});
templates['ligaEZTable'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "	<div class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, options, alias1=container.escapeExpression, alias2=depth0 != null ? depth0 : {}, alias3=helpers.helperMissing, alias4="function", buffer = 
  "\n    <section class=\"primary\">\n        <h1 class=\"card__title\">\n           <a href=\""
    + alias1(container.lambda((depths[1] != null ? depths[1].url : depths[1]), depth0))
    + "\">"
    + alias1(((helper = (helper = helpers.leagueName || (depth0 != null ? depth0.leagueName : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"leagueName","hash":{},"data":data}) : helper)))
    + "</a>\n        </h1>\n    </section>\n\n    <section class=\"secondary\">\n        <div class=\"card__description\">\n            \n            <div class=\"ez-liga-tableHeader\">\n              <table>\n                <thead>\n                     <th></th>\n                     <th>Mannschaft</th>\n                     <th class=\"small\">SP</th> \n                     <th class=\"small\">TD</th> \n                     <th class=\"small bold\">PKT</th> \n                </thead> \n\n                <tbody> \n";
  stack1 = ((helper = (helper = helpers.ranking || (depth0 != null ? depth0.ranking : depth0)) != null ? helper : alias3),(options={"name":"ranking","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.noop,"data":data}),(typeof helper === alias4 ? helper.call(alias2,options) : helper));
  if (!helpers.ranking) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "                </tbody> \n              </table> \n            </div>\n\n\n            <div class=\"poweredby\" url=\""
    + alias1(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">"
    + alias1((helpers.local || (depth0 && depth0.local) || alias3).call(alias2,"GoToTable",{"name":"local","hash":{},"data":data}))
    + "</div>\n\n            <div class=\"poweredby\">\n            <a href=\"http://www.kicker.de\">"
    + alias1((helpers.local || (depth0 && depth0.local) || alias3).call(alias2,"KickerSponsor",{"name":"local","hash":{},"data":data}))
    + "</a>\n            </div>\n\n\n        </div>\n    </section>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                    <tr> \n                        <td>"
    + alias4(((helper = (helper = helpers.rank || (depth0 != null ? depth0.rank : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rank","hash":{},"data":data}) : helper)))
    + ".</td>\n                        <td>"
    + alias4(((helper = (helper = helpers.club || (depth0 != null ? depth0.club : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"club","hash":{},"data":data}) : helper)))
    + "</td>\n                        <td class=\"small\">"
    + alias4(((helper = (helper = helpers.SP || (depth0 != null ? depth0.SP : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"SP","hash":{},"data":data}) : helper)))
    + "</td> \n                        <td class=\"small\">"
    + alias4(((helper = (helper = helpers.TD || (depth0 != null ? depth0.TD : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"TD","hash":{},"data":data}) : helper)))
    + "</td> \n                        <td class=\"small bold\">"
    + alias4(((helper = (helper = helpers.PKT || (depth0 != null ? depth0.PKT : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"PKT","hash":{},"data":data}) : helper)))
    + "</td> \n                    </tr> \n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- ligaEZTable.tpl -->\n   \n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n\n<!-- end ligaEZTable.tpl -->";
},"useData":true,"useDepths":true});
templates['ligaEZUpcomingGames'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=container.escapeExpression, alias2=depth0 != null ? depth0 : {}, alias3=helpers.helperMissing, alias4="function";

  return "  <div class=\"cqz-ez-title\" selectable=''><a href=\""
    + alias1(container.lambda((depths[1] != null ? depths[1].url : depths[1]), depth0))
    + "\">"
    + alias1(((helper = (helper = helpers.leagueName || (depth0 != null ? depth0.leagueName : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"leagueName","hash":{},"data":data}) : helper)))
    + "</a></div>\n  <div class=\"ez-liga-spieltag-ucg\" selectable=''>"
    + alias1(((helper = (helper = helpers.spieltag || (depth0 != null ? depth0.spieltag : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"spieltag","hash":{},"data":data}) : helper)))
    + "</div>\n\n"
    + ((stack1 = helpers.each.call(alias2,(depth0 != null ? depth0.games : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n  <div class=\"cqz-ez-btn ez-liga-button\" url=\""
    + alias1(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">"
    + alias1((helpers.local || (depth0 && depth0.local) || alias3).call(alias2,"AllGames",{"name":"local","hash":{},"data":data}))
    + "</div>\n  <div class=\"ez-liga-ucg-timezone ez-liga-timezone-short\"> "
    + alias1((helpers.local || (depth0 && depth0.local) || alias3).call(alias2,"LocalTimeGermany",{"name":"local","hash":{},"data":data}))
    + " </div>\n  <div class=\"ez-liga-sponsor\">"
    + alias1((helpers.local || (depth0 && depth0.local) || alias3).call(alias2,"KickerSponsor",{"name":"local","hash":{},"data":data}))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "  <div class=\"ez-liga-upcominggames\" >\n              <div class=\"ez-liga-gameTimeLoc\">"
    + container.escapeExpression(((helper = (helper = helpers.gamedate || (depth0 != null ? depth0.gamedate : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"gamedate","hash":{},"data":data}) : helper)))
    + "</div>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.games : depth0),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n  </div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                    <div class=\"ez-liga-1upcominggame\">\n                          <div class=\"ez-liga-ucg-teamName\">"
    + alias4(((helper = (helper = helpers.HOST || (depth0 != null ? depth0.HOST : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"HOST","hash":{},"data":data}) : helper)))
    + "</div>\n                          <div class=\"ez-liga-gameTimeLoc\">"
    + alias4(((helper = (helper = helpers.GTIME || (depth0 != null ? depth0.GTIME : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"GTIME","hash":{},"data":data}) : helper)))
    + "</div>\n                          <div class=\"ez-liga-ucg-teamName\">"
    + alias4(((helper = (helper = helpers.GUESS || (depth0 != null ? depth0.GUESS : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"GUESS","hash":{},"data":data}) : helper)))
    + "</div>\n                    </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "<!-- ligaEZUpcomingGames.tpl -->\n<div class=\"cqz-result-h1 ez-liga cqz-result-padding\">\n"
    + ((stack1 = helpers["with"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n\n"
    + ((stack1 = container.invokePartial(partials.logo,depth0,{"name":"logo","data":data,"indent":" ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n</div>\n\n\n<!-- end ligaEZUpcomingGames.tpl -->\n";
},"usePartial":true,"useData":true,"useDepths":true});
templates['liveTicker'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "    <div extra=\"logo\" class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" data-style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">\n        "
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n    </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, alias3=depth0 != null ? depth0 : {};

  return "            <h2>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.spielTag : stack1), depth0))
    + " "
    + alias2(alias1((depth0 != null ? depth0.date : depth0), depth0))
    + "</h2>\n            \n            <div class=\"card__incard cf\">\n"
    + ((stack1 = helpers.each.call(alias3,(depth0 != null ? depth0.matches : depth0),{"name":"each","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                \n            </div>\n            \n            <!--<table cellspacing=\"0\" cellpadding=\"0\">\n"
    + ((stack1 = helpers.each.call(alias3,(depth0 != null ? depth0.matches : depth0),{"name":"each","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </table>-->\n";
},"10":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "                \n                    <div class=\"card__incard__item\">\n                        \n                        <div class=\"card__incard__content\">\n                            <h4>\n                                "
    + alias2(alias1((depth0 != null ? depth0.HOST : depth0), depth0))
    + "\n                            </h4>\n                            <div class=\"score\">\n                                "
    + alias2(alias1((depth0 != null ? depth0.scored : depth0), depth0))
    + " <span>("
    + alias2(alias1((depth0 != null ? depth0.gameTimeHour : depth0), depth0))
    + ")</span>\n                            </div>\n                            <h4>\n                                "
    + alias2(alias1((depth0 != null ? depth0.GUESS : depth0), depth0))
    + "\n                            </h4>\n                        </div>\n                        \n                    </div>\n                    \n";
},"12":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "                    <tr class=\""
    + alias2(alias1((depth0 != null ? depth0["class"] : depth0), depth0))
    + "\" url=\""
    + alias2(alias1((depth0 != null ? depth0.live_url : depth0), depth0))
    + "\">\n                        <td class=\"cqz-game-time\">\n                            "
    + alias2(alias1((depth0 != null ? depth0.gameTimeHour : depth0), depth0))
    + "\n                        </td>\n                        <td>\n                            "
    + alias2(alias1((depth0 != null ? depth0.HOST : depth0), depth0))
    + "\n                        </td>\n                        <td class=\"cqz-score\">\n                            "
    + alias2(alias1((depth0 != null ? depth0.scored : depth0), depth0))
    + "\n                        </td>\n                        <td class=\"lastcell\">\n                            "
    + alias2(alias1((depth0 != null ? depth0.GUESS : depth0), depth0))
    + "\n                        </td>\n                    </tr>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=container.escapeExpression, alias3=helpers.helperMissing;

  return "<!-- liveTicker.tpl -->\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    \n<section class=\"primary\">\n    <h1 extra=\"title\" class=\"card__title\">"
    + alias2(container.lambda(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.title : stack1), depth0))
    + "</h1>\n    <div extra=\"url\" class=\"card__meta\">\n        <div>"
    + alias2(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias3),(typeof helper === "function" ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "</div>\n    </div>\n</section>\n<section class=\"secondary\">\n    <div class=\"card__description bundesliga\">\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.matches : stack1),{"name":"each","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n</section>\n\n<div class=\"poweredby\" url=\"http://www.kicker.de/?gomobile=1\">\n    <div class=\"card__logo__poweredby bg\"\n        data-style=\"background-size: 75%;background-image:url(https://cdn.cliqz.com/brands-database/database/1452759183853/logos/kicker/$.svg);background-color:#FF1D1D;top:inherit;\"\n        style=\"background-size: 75%;background-image:url(https://cdn.cliqz.com/brands-database/database/1452759183853/logos/kicker/$.svg);background-color: #FF1D1D;top:inherit;\">\n            Ki\n    </div> \n    "
    + alias2((helpers.local || (depth0 && depth0.local) || alias3).call(alias1,"KickerSponsor",{"name":"local","hash":{},"data":data}))
    + "\n</div>\n<!-- end liveTicker.tpl -->";
},"useData":true});
templates['local-cinema-sc'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "cqz-result-h2";
},"3":function(container,depth0,helpers,partials,data) {
    return "cqz-result-h1";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression, alias4=container.lambda;

  return "    \n        \n            <div extra=\"url\" class=\"card__meta\">\n                <div>"
    + alias3((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,(depth0 != null ? depth0.friendly_url : depth0),(depth0 != null ? depth0.query : depth0),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "</div>\n            </div>\n        </div>\n    \n        <div class=\"main\">\n            <h1 class=\"main__headline\"><a href=\""
    + alias3(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">"
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.cinema : depth0)) != null ? stack1.name : stack1), depth0))
    + "</a></h1>\n            <div class=\"main__meta\">\n              <span>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.stars : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "              </span>\n            </div>\n            <div class=\"cinema-showtimes-container local-sc-data-container\" id=\"cinema-showtimes-container\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.no_location : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.program(10, data, 0),"data":data})) != null ? stack1 : "")
    + "            </div>\n            \n            <p class=\"main__content description\">"
    + alias3((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.cinema : depth0)) != null ? stack1.desc : stack1),(depth0 != null ? depth0.query : depth0),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "</p>\n            \n            <ul class=\"cta\">\n                  <li><a xmlns=\"http://www.w3.org/1999/xhtml\" arrow-override=\"\"\n     class=\"cqz-ez-btn cqz-cinema-program-btn\"\n     url=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.cinema : depth0)) != null ? stack1.cinepass_url : stack1), depth0))
    + "\"\n     extra=\"cinemaSC_program\"\n>\n    "
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"cinema_program_btn",{"name":"local","hash":{},"data":data}))
    + "\n</a></li>\n            </ul>\n        </div>\n    \n";
},"6":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                  <span class='cqz-rating-star "
    + container.escapeExpression(((helper = (helper = helpers.star_class || (depth0 != null ? depth0.star_class : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"star_class","hash":{},"data":data}) : helper)))
    + "'>★</span>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.missing_location,depth0,{"name":"missing_location","data":data,"indent":"                  ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"10":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "              "
    + container.escapeExpression((helpers.distance || (depth0 && depth0.distance) || helpers.helperMissing).call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.cinema : depth0)) != null ? stack1.distance : stack1),{"name":"distance","hash":{},"data":data}))
    + "\n"
    + ((stack1 = container.invokePartial(partials["partials/timetable-movie"],depth0,{"name":"partials/timetable-movie","data":data,"indent":"                ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "\n<!-- local-cinema-sc.tpl -->\n\n<div class=\""
    + ((stack1 = (helpers.ifpref || (depth0 && depth0.ifpref) || helpers.helperMissing).call(alias1,"share_location","no",{"name":"ifpref","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + " cqz-result-padding local-cinema-result local-movie-result\">\n    <div class=\"meta\">\n"
    + ((stack1 = container.invokePartial(partials.logo,depth0,{"name":"logo","data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n</div>\n";
},"usePartial":true,"useData":true});
templates['local-data-sc'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "	<div extra=\"logo\" class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=container.escapeExpression, alias2=depth0 != null ? depth0 : {}, alias3=helpers.helperMissing, alias4="function";

  return "    <section class=\"primary\">\n        <div class=\"card__title\">\n            <div url=\""
    + alias1(container.lambda((depths[1] != null ? depths[1].url : depths[1]), depth0))
    + "\" extra=\"title\">"
    + alias1(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"title","hash":{},"data":data}) : helper)))
    + "</div>\n        </div>\n        <div class=\"cqz-local-result\">\n            <div class=\"local__head\">\n"
    + ((stack1 = helpers["if"].call(alias2,(depth0 != null ? depth0.address : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias2,(depth0 != null ? depth0.map_img : depth0),{"name":"if","hash":{},"fn":container.program(12, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </div>\n            <div class=\"local__details\">\n"
    + ((stack1 = helpers.unless.call(alias2,(depth0 != null ? depth0.no_location : depth0),{"name":"unless","hash":{},"fn":container.program(14, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </div>\n        </div>\n        <div extra=\"des\" class=\"card__description\">"
    + alias1(((helper = (helper = helpers.description || (depth0 != null ? depth0.description : depth0)) != null ? helper : alias3),(typeof helper === alias4 ? helper.call(alias2,{"name":"description","hash":{},"data":data}) : helper)))
    + "</div>\n    </section>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                    <div class=\"address__details\">\n                        <div extra=\"address\" show-status='true' class=\"address__text\"\n                            cliqz-action=\"stop-click-event-propagation\" onclick=\"osAPI.browserAction('"
    + alias4(((helper = (helper = helpers.mu || (depth0 != null ? depth0.mu : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"mu","hash":{},"data":data}) : helper)))
    + "','map')\">\n                            "
    + alias4(((helper = (helper = helpers.address || (depth0 != null ? depth0.address : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"address","hash":{},"data":data}) : helper)))
    + "\n                        </div>\n                    </div>\n";
},"12":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                    <img class=\"map__img\" data-src=\""
    + alias4(((helper = (helper = helpers.map_img || (depth0 != null ? depth0.map_img : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"map_img","hash":{},"data":data}) : helper)))
    + "\" extra=\"map-image\"\n                         onerror=\"this.style.display='none';\"\n                         cliqz-action=\"stop-click-event-propagation\" onclick=\"osAPI.browserAction('"
    + alias4(((helper = (helper = helpers.mu || (depth0 != null ? depth0.mu : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"mu","hash":{},"data":data}) : helper)))
    + "','map')\"/>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "                    <div class=\"cqz-local-info\">\n                        <div class=\"local-distance\">\n                            <div class=\"icon\" data-style=\"background-image: url(http://cdn.cliqz.com/extension/EZ/local/map-pin.svg)\">\n                            icon\n                            </div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.distance : depth0),{"name":"if","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                        </div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.phone_address : depth0),{"name":"if","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.opening_hours : depth0),{"name":"if","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                    </div>\n";
},"15":function(container,depth0,helpers,partials,data) {
    return "                                "
    + container.escapeExpression((helpers.distance || (depth0 && depth0.distance) || helpers.helperMissing).call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.distance : depth0),{"name":"distance","hash":{},"data":data}))
    + "\n";
},"17":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.phonenumber : depth0),{"name":"if","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"18":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                                <div class=\"phone_num\" cliqz-action=\"stop-click-event-propagation\" onclick=\"osAPI.browserAction('"
    + alias4(((helper = (helper = helpers.phonenumber || (depth0 != null ? depth0.phonenumber : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"phonenumber","hash":{},"data":data}) : helper)))
    + "','phoneNumber')\">\n                                  <div class=\"icon\" data-style=\"background-image: url(http://cdn.cliqz.com/extension/EZ/local/phone-1.svg)\">\n                                    Icon\n                                  </div>\n                                  "
    + alias4(((helper = (helper = helpers.phonenumber || (depth0 != null ? depth0.phonenumber : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"phonenumber","hash":{},"data":data}) : helper)))
    + "\n                                </div>\n";
},"20":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "                            <div class=\"cqz-local-info-right cqz-local-info-box\" extra=\"open-hour\">\n                                <div class=\"cqz-local-time\">\n                                    <div class=\"icon\" data-style=\"background-image: url(http://cdn.cliqz.com/extension/EZ/local/clock.svg)\">\n                                      Icon\n                                    </div>\n                                    <p class=\"cqz-local-time-title\" style=\"color: "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.opening_status : depth0)) != null ? stack1.color : stack1), depth0))
    + "\">\n                                        "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.opening_status : depth0)) != null ? stack1.stt_text : stack1), depth0))
    + "\n                                    </p>\n                                    <p>\n                                        "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.opening_status : depth0)) != null ? stack1.time_info_til : stack1), depth0))
    + "\n                                    </p>\n                                    <p>\n                                        "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.opening_status : depth0)) != null ? stack1.time_info_str : stack1), depth0))
    + "\n                                    </p>\n                                </div>\n                            </div>\n";
},"22":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <div url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" extra=\"link-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\" class=\"cards__item links\">\n            <h2 class=\"cards__title__secondary\">\n                "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\n            </h2>\n        </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<!-- local-data-sc.tpl -->\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<div extra=\"url\" class=\"card__meta\"><div>"
    + container.escapeExpression(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "</div></div>\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<section class=\"secondary\">\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.deepLinks : stack1),{"name":"each","hash":{},"fn":container.program(22, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n</section>\n\n<!-- end local-data-sc.tpl -->\n";
},"useData":true,"useDepths":true});
templates['local-movie-sc'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "cqz-result-h2";
},"3":function(container,depth0,helpers,partials,data) {
    return "cqz-result-h1";
},"5":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <div extra=\"url\" class=\"card__meta\"><div>"
    + alias4(((helper = (helper = helpers.friendly_url || (depth0 != null ? depth0.friendly_url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"friendly_url","hash":{},"data":data}) : helper)))
    + "</div></div>\n    </div>\n    <div class=\"main\">\n        <div class=\"item\">\n          <div class=\"main__image\" data-style=\"background-image: url("
    + alias4(container.lambda(((stack1 = (depth0 != null ? depth0.movie : depth0)) != null ? stack1.poster_img : stack1), depth0))
    + ");\">\n              Image\n          </div>\n          <h1 class=\"main__headline\"><a href=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</a></h1>\n          <div class=\"main__meta\">\n            <span>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.stars : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </span>\n          </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.movie : depth0)) != null ? stack1.trailer_url : stack1),{"name":"if","hash":{},"fn":container.program(8, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n          <div class=\"cinema-showtimes-container local-sc-data-container\" id=\"cinema-showtimes-container\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.no_location : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.program(13, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "          </div>\n\n          <p class=\"main__content description\">"
    + alias4(((helper = (helper = helpers.description || (depth0 != null ? depth0.description : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"description","hash":{},"data":data}) : helper)))
    + "</p>\n\n\n        </div>\n\n      </div>\n    </div>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                  <span class='cqz-rating-star "
    + container.escapeExpression(((helper = (helper = helpers.star_class || (depth0 != null ? depth0.star_class : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"star_class","hash":{},"data":data}) : helper)))
    + "'>★</span>\n";
},"8":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "            <ul class=\"cta\">\n            <li\n              arrow-override=''\n              class=\"cqz-ez-btn movie-trailer-btn "
    + alias2(alias1(((stack1 = (depths[2] != null ? depths[2].logo : depths[2])) != null ? stack1.buttonsClass : stack1), depth0))
    + "\"\n              href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.movie : depth0)) != null ? stack1.trailer_url : stack1), depth0))
    + "\"\n              extra=\"movieSC_trailer\"><a>\n               "
    + alias2((helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(depth0 != null ? depth0 : {},"cqz_watch_trailer",{"name":"local","hash":{},"data":data}))
    + "</a>\n            </li></ul>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = (helpers.ifpref || (depth0 && depth0.ifpref) || helpers.helperMissing).call(depth0 != null ? depth0 : {},"share_location","no",{"name":"ifpref","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"11":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <div class=\"main__notifications\">\n"
    + ((stack1 = container.invokePartial(partials.missing_location,depth0,{"name":"missing_location","data":data,"indent":"                  ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "                </div>\n";
},"13":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials["partials/timetable-cinema"],depth0,{"name":"partials/timetable-cinema","data":data,"indent":"              ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- local-movie-sc.tpl -->\n\n<div class=\""
    + ((stack1 = (helpers.ifpref || (depth0 && depth0.ifpref) || helpers.helperMissing).call(alias1,"share_location","no",{"name":"ifpref","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.program(3, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + " cqz-result-padding local-movie-result\">\n\n    <div class=\"meta\">\n"
    + ((stack1 = container.invokePartial(partials.logo,depth0,{"name":"logo","data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(5, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"usePartial":true,"useData":true,"useDepths":true});
templates['logo'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<div newtab='true' class=\"meta__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\"\n                style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "               \">\n       "
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "image";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "\n                      	background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";\n                     	"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                      		"
    + container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<!-- logo.tpl -->\n"
    + ((stack1 = helpers["with"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " <!-- end logo.tpl -->";
},"useData":true});
templates['main'] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<!-- main.tpl -->\n<div id=\"cliqz-popup\" style=\"height: 100%;\">\n    <div id='cliqz-results' style=\"height: 100%;\">\n    </div>\n</div>\n<!-- end main.tpl -->\n";
},"useData":true});
templates['pattern-h1'] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<!-- pattern-h1 -->\n"
    + ((stack1 = container.invokePartial(partials.generic,depth0,{"name":"generic","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "\n<!-- end pattern-h1 -->\n";
},"usePartial":true,"useData":true});
templates['pattern-h2'] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<!-- pattern-h2 -->\n"
    + ((stack1 = container.invokePartial(partials.history,depth0,{"name":"history","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true});
templates['pattern-h3-cluster'] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<!-- pattern-h3-cluster -->\n"
    + container.escapeExpression(((helper = (helper = helpers.history || (depth0 != null ? depth0.history : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"history","hash":{},"data":data}) : helper)))
    + "\n";
},"useData":true});
templates['pattern-h3'] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<!-- pattern-h3 -->\n"
    + container.escapeExpression(((helper = (helper = helpers.history || (depth0 != null ? depth0.history : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"history","hash":{},"data":data}) : helper)))
    + "\n";
},"useData":true});
templates['rd-h3-w-rating'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {}, alias2=container.lambda, alias3=container.escapeExpression;

  return "\n    <div class=\"main\">\n\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.image : stack1),{"name":"if","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <h1 class=\"main__headline\"><a href=\""
    + alias3(alias2((depths[1] != null ? depths[1].url : depths[1]), depth0))
    + "\">"
    + alias3(alias2(((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.name : stack1), depth0))
    + "</a></h1>\n        <div class=\"main__rating\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.url_ratingimg : stack1),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = ((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.rating : stack1)) != null ? stack1.img : stack1),{"name":"if","hash":{},"fn":container.program(6, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </div>\n        <p class=\"main__content\">\n            <p>"
    + alias3((helpers.emphasis || (depth0 && depth0.emphasis) || helpers.helperMissing).call(alias1,(depth0 != null ? depth0.description : depth0),(depths[1] != null ? depths[1].query : depths[1]),2,true,{"name":"emphasis","hash":{},"data":data}))
    + "</p>\n            <br />\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.mobi : stack1),{"name":"if","hash":{},"fn":container.program(8, data, 0, blockParams, depths),"inverse":container.program(11, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "        </p>\n\n    </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "            <div class=\"main__image\" data-style=\"background-image: url("
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.image : stack1), depth0))
    + ");\">\n                Image\n            </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <img data-src=\""
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.url_ratingimg : stack1), depth0))
    + "\" class=\"cqz-rd-rateimg\"/>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <img data-src=\""
    + container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.rating : stack1)) != null ? stack1.img : stack1), depth0))
    + "\" class=\"cqz-rd-rateimg\"/>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <ul class=\"recipe_ingredients\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.mobi : stack1)) != null ? stack1.ingredients : stack1),{"name":"each","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </ul>\n\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "                    <li>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</li>\n";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <p>"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.richData : depth0)) != null ? stack1.des : stack1), depth0))
    + "</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "<!-- rd-h3-w-rating.tpl -->\n\n\n<!--this template is similar to people, youtube, but with rating starts,\nused initially for food, movie, game (in 1 height results)\nIT IS USED AS A PARTIAL template\n-->\n\n<div class=\"meta\">\n"
    + ((stack1 = container.invokePartial(partials.logo,depth0,{"name":"logo","data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "    <div extra=\"url\" class=\"card__meta\"><div>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.host : stack1), depth0))
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.extra : stack1), depth0))
    + "</div></div>\n</div>\n\n"
    + ((stack1 = helpers["with"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<!-- end rd-h3-w-rating.tpl -->\n";
},"usePartial":true,"useData":true,"useDepths":true});
templates['results'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.invalid : depth0),{"name":"unless","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <div class=\"frame\" "
    + ((stack1 = helpers["if"].call(alias1,(depths[1] != null ? depths[1].frameWidth : depths[1]),{"name":"if","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <div class=\"card\">\n                <div class=\"cqz-result-box\"\n                    type='"
    + alias4(((helper = (helper = helpers.type || (depth0 != null ? depth0.type : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data}) : helper)))
    + "'\n                    kind='"
    + alias4((helpers.kind_printer || (depth0 && depth0.kind_printer) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.kind : stack1),{"name":"kind_printer","hash":{},"data":data}))
    + "'\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.url : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                    idx='"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "'\n                    id='cqz-result-box-"
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "'\n                    >\n"
    + ((stack1 = container.invokePartial(helpers.lookup.call(alias1,depth0,"vertical",{"name":"lookup","hash":{},"data":data}),depth0,{"data":data,"indent":"                        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.url : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </div>\n            </div>\n            <br>\n        </div>\n";
},"3":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var helper, alias1=container.escapeExpression;

  return " style=\"width: "
    + alias1(container.lambda((depths[1] != null ? depths[1].frameWidth : depths[1]), depth0))
    + "px; left: "
    + alias1(((helper = (helper = helpers.left || (depth0 != null ? depth0.left : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"left","hash":{},"data":data}) : helper)))
    + "px\" ";
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                        url='"
    + container.escapeExpression(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"url","hash":{},"data":data}) : helper)))
    + "'\n";
},"7":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                        <section class=\"share\">\n                            <p cliqz-action='stop-click-event-propagation'\n                                onclick=\"osAPI.shareCard('"
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "')\"\n                                >"
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"mobile_share_card",{"name":"local","hash":{},"data":data}))
    + ": "
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "</p>\n                        </section>\n";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <div class=\"frame\" extra=\"search\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frameWidth : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n        <div class=\"card last-card\">\n            <div id=\"defaultEngine\" url=\""
    + alias4(((helper = (helper = helpers.searchEngineUrl || (depth0 != null ? depth0.searchEngineUrl : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"searchEngineUrl","hash":{},"data":data}) : helper)))
    + alias4(((helper = (helper = helpers.searchString || (depth0 != null ? depth0.searchString : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"searchString","hash":{},"data":data}) : helper)))
    + "\" kind=\"CL\" class=\"cqz-result-box\"  style=\"background-color: #"
    + alias4(((helper = (helper = helpers.background || (depth0 != null ? depth0.background : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"background","hash":{},"data":data}) : helper)))
    + "\">\n                <div id=\"googleThisAnim\">\n                    <!-- <img data-src=\"skin/img/icon-google.svg\"><br> -->\n                    <h3>"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</h3>\n\n                </div>\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </div>\n        </div>\n    </div>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return " style=\"width: "
    + alias4(((helper = (helper = helpers.frameWidth || (depth0 != null ? depth0.frameWidth : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frameWidth","hash":{},"data":data}) : helper)))
    + "px; left: "
    + alias4(((helper = (helper = helpers.left || (depth0 != null ? depth0.left : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"left","hash":{},"data":data}) : helper)))
    + "px\" ";
},"12":function(container,depth0,helpers,partials,data) {
    var helper;

  return "                    <div id=\"searchEngineLogo\"\n                         class=\"search_engine_logo\"\n                         style=\""
    + container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + "\">\n                    </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- results.tpl -->\n"
    + container.escapeExpression((helpers.sendTelemetry || (depth0 && depth0.sendTelemetry) || helpers.helperMissing).call(alias1,((stack1 = (depth0 != null ? depth0.results : depth0)) != null ? stack1.length : stack1),{"name":"sendTelemetry","hash":{},"data":data}))
    + "\n\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.results : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<!-- googlethis -->\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.googleThis : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<!-- end googlethis -->\n\n<div class='cqz-result-selected transition'></div>\n\n<!-- end results.tpl -->\n";
},"usePartial":true,"useData":true,"useDepths":true});
templates['stocks'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "          - <span>"
    + container.escapeExpression((helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(depth0 != null ? depth0 : {},"agoXMinutes",((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.min_ago : stack1),{"name":"local","hash":{},"data":data}))
    + "</span>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=container.lambda, alias2=container.escapeExpression, alias3=depth0 != null ? depth0 : {}, alias4=helpers.helperMissing;

  return "<!-- stocks -->\n<div class=\"cqz-result-h2\">\n\n  <div class=\"meta\">\n"
    + ((stack1 = container.invokePartial(partials.logo,depth0,{"name":"logo","data":data,"indent":"      ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "      <h3 class=\"meta__url no-indent\">\n        <span>"
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.StockExchange : stack1), depth0))
    + " : "
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.Symbol : stack1), depth0))
    + "</span>\n"
    + ((stack1 = helpers["if"].call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.min_ago : stack1),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        - <span>"
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.time_string : stack1), depth0))
    + "</span>\n      </h3>\n  </div>\n\n  <div class=\"main\">\n    <div class=\"main__headline\">\n      <a href=\""
    + alias2(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias4),(typeof helper === "function" ? helper.call(alias3,{"name":"url","hash":{},"data":data}) : helper)))
    + "\">"
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.Name : stack1), depth0))
    + "</a>\n    </div>\n\n  </div>\n\n  <div class=\"cqz-ez-stock-trend\">\n    <span>"
    + alias2((helpers.localizeNumbers || (depth0 && depth0.localizeNumbers) || alias4).call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.LastTradePriceOnly : stack1),{"name":"localizeNumbers","hash":{},"data":data}))
    + "</span>\n    <span class=\""
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.Colour : stack1), depth0))
    + "\">\n      <img data-src=\"https://cdn.cliqz.com/extension/EZ/stocks/EZ-stock-arrow-"
    + alias2(alias1(((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.Colour : stack1), depth0))
    + ".svg\" class=\"cqz-ez-img-trend\"/>\n      "
    + alias2((helpers.localizeNumbers || (depth0 && depth0.localizeNumbers) || alias4).call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.Change : stack1),{"name":"localizeNumbers","hash":{},"data":data}))
    + " ("
    + alias2((helpers.localizeNumbers || (depth0 && depth0.localizeNumbers) || alias4).call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.PercentChange : stack1),{"name":"localizeNumbers","hash":{},"data":data}))
    + "%)\n    </span>\n  </div>\n\n  <table class=\"cliqz-stock-price-table\">\n    <tr>\n      <td> "
    + alias2((helpers.local || (depth0 && depth0.local) || alias4).call(alias3,"cliqz_stock_open",{"name":"local","hash":{},"data":data}))
    + " </td>\n      <td class=\"cliqz-stock-price-td\">"
    + alias2((helpers.localizeNumbers || (depth0 && depth0.localizeNumbers) || alias4).call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.Open : stack1),{"name":"localizeNumbers","hash":{},"data":data}))
    + "</td>\n      <td class=\"cliqz-stock-price-td\"> "
    + alias2((helpers.local || (depth0 && depth0.local) || alias4).call(alias3,"cliqz_stock_market_cap",{"name":"local","hash":{},"data":data}))
    + " </td>\n      <td class=\"cliqz-stock-price-td\">"
    + alias2((helpers.localizeNumbers || (depth0 && depth0.localizeNumbers) || alias4).call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.MarketCapitalization : stack1),{"name":"localizeNumbers","hash":{},"data":data}))
    + "</td>\n    </tr>\n    <tr>\n      <td> "
    + alias2((helpers.local || (depth0 && depth0.local) || alias4).call(alias3,"cliqz_stock_high",{"name":"local","hash":{},"data":data}))
    + " </td>\n      <td class=\"cliqz-stock-price-td\">"
    + alias2((helpers.localizeNumbers || (depth0 && depth0.localizeNumbers) || alias4).call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.DaysHigh : stack1),{"name":"localizeNumbers","hash":{},"data":data}))
    + "</td>\n      <td class=\"cliqz-stock-price-td\"> "
    + alias2((helpers.local || (depth0 && depth0.local) || alias4).call(alias3,"cliqz_stock_pe_ratio",{"name":"local","hash":{},"data":data}))
    + "</td>\n      <td class=\"cliqz-stock-price-td\">"
    + alias2((helpers.localizeNumbers || (depth0 && depth0.localizeNumbers) || alias4).call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.PERatio : stack1),{"name":"localizeNumbers","hash":{},"data":data}))
    + "</td>\n    </tr>\n    <tr>\n      <td> "
    + alias2((helpers.local || (depth0 && depth0.local) || alias4).call(alias3,"cliqz_stock_low",{"name":"local","hash":{},"data":data}))
    + " </td>\n      <td colspan=\"3\" class=\"cliqz-stock-price-td\">"
    + alias2((helpers.localizeNumbers || (depth0 && depth0.localizeNumbers) || alias4).call(alias3,((stack1 = ((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.message : stack1)) != null ? stack1.DaysLow : stack1),{"name":"localizeNumbers","hash":{},"data":data}))
    + "</td>\n    </tr>\n  </table>\n\n  <div class=\"cqz-disclaimer cqz-ez-stock-disclaimer\">"
    + alias2((helpers.local || (depth0 && depth0.local) || alias4).call(alias3,"no_legal_disclaimer",{"name":"local","hash":{},"data":data}))
    + "</div>\n</div>\n\n<div class=\"poweredby\">\n    Mehr auf <a href=\"http://finance.yahoo.com\">Yahoo finance</a>\n</div>\n";
},"usePartial":true,"useData":true});
templates['topnews'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "  <div class=\"main\">\n    <ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},depth0,{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </ul>\n  </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "            <li class=\"cf answer\" data-url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" data-type=\""
    + alias4(((helper = (helper = helpers.type || (depth0 != null ? depth0.type : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data}) : helper)))
    + "\" data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\">\n                <div class=\"item\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(5, data, 0),"data":data})) != null ? stack1 : "")
    + "                    <div class=\"url\"><div data-extra=\"url\">"
    + alias4(((helper = (helper = helpers.displayUrl || (depth0 != null ? depth0.displayUrl : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"displayUrl","hash":{},"data":data}) : helper)))
    + "</div></div>\n                    <h1 class=\"item__head\" data-extra=\"head\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.breaking : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                        "
    + alias4(((helper = (helper = helpers.short_title || (depth0 != null ? depth0.short_title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"short_title","hash":{},"data":data}) : helper)))
    + "\n                    </h1>\n                </div>\n            </li>\n\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                        <div class=\"item__logo bg\" style=\"background-image:"
    + alias4(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";\n                                                          background-color:#"
    + alias4(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + "\"\n                             data-extra=\"logo\"></div>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                        <div class=\"item__logo\" style=\""
    + alias4(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"style","hash":{},"data":data}) : helper)))
    + "\" data-extra=\"logo\">\n                            "
    + alias4(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n                        </div>\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "                            <span class=\"breaking_news\">\n                                "
    + container.escapeExpression((helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(depth0 != null ? depth0 : {},"mobile_freshtab_breaking_news",{"name":"local","hash":{},"data":data}))
    + "\n                            </span>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<!-- topnews.tpl -->\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},depth0,{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<!-- end topnews.tpl -->\n";
},"useData":true});
templates['topsites'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "\n<div class=\"main noselect\">\n  <table>\n    <tr>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.list : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "     </tr>\n    </table>\n\n    <div id=\"doneEditTopsites\" class=\"topSitesOption\" "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.isEditMode : depth0),{"name":"unless","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"mobile_freshtab_edit_done",{"name":"local","hash":{},"data":data}))
    + "</div>\n    <div id=\"cancelEditTopsites\" class=\"topSitesOption\" "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.isEditMode : depth0),{"name":"unless","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">"
    + alias3((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"mobile_freshtab_edit_cancel",{"name":"local","hash":{},"data":data}))
    + "</div>\n  </ul>\n</div>\n";
},"2":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "          <td align=\"center\" valign=\"top\">\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},depth0,{"name":"if","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.program(6, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "          </td>\n";
},"3":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "              <div class=\"blockTopsite\" mainDomain=\""
    + alias4(((helper = (helper = helpers.mainDomain || (depth0 != null ? depth0.mainDomain : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"mainDomain","hash":{},"data":data}) : helper)))
    + "\" "
    + ((stack1 = helpers.unless.call(alias1,(depths[1] != null ? depths[1].isEditMode : depths[1]),{"name":"unless","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\">X</div>\n              <div class=\"topSitesLink\" data-url=\""
    + alias4(((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data}) : helper)))
    + "\" data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\">\n                  <div class=\"topsites__item\"\n                   data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\"\n                   style=\""
    + alias4(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"style","hash":{},"data":data}) : helper)))
    + "\"\n                   show-status=\"\"\n                   extra=\""
    + alias4(((helper = (helper = helpers.extra || (depth0 != null ? depth0.extra : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"extra","hash":{},"data":data}) : helper)))
    + "\"\n                   >"
    + alias4(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "\n                  </div>\n              </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    return " style=\"display: none;\" ";
},"6":function(container,depth0,helpers,partials,data,blockParams,depths) {
    return "              <div class=\"topsites__item "
    + container.escapeExpression(container.lambda((depths[1] != null ? depths[1].theme : depths[1]), depth0))
    + "\"></div>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.isEditMode : depth0),{"name":"unless","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"9":function(container,depth0,helpers,partials,data) {
    return "    <div class=\"noTopsites\">"
    + container.escapeExpression((helpers.local || (depth0 && depth0.local) || helpers.helperMissing).call(depth0 != null ? depth0 : {},"mobile_freshtab_no_topsites",{"name":"local","hash":{},"data":data}))
    + "</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- topsites.tpl -->\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.list : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.isEmpty : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<!-- end topsites.tpl -->\n";
},"useData":true,"useDepths":true});
templates['url'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "		  cliqz-result-url-ssl\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<!-- URL.tpl -->\n<div class='cliqz-result-url-box overflow'>\n	<span class='cliqz-result-url-host\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.ssl : stack1),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "		'\n	>\n		"
    + alias3((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.host : stack1),(depth0 != null ? depth0.query : depth0),2,false,{"name":"emphasis","hash":{},"data":data}))
    + "</span><span class='cliqz-result-url-path'>"
    + alias3((helpers.emphasis || (depth0 && depth0.emphasis) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.urlDetails : depth0)) != null ? stack1.extra : stack1),(depth0 != null ? depth0.query : depth0),2,false,{"name":"emphasis","hash":{},"data":data}))
    + "\n	</span>\n</div>";
},"useData":true});
templates['weatherAlert'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "    <div class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <section class=\"primary\">\n\n        <h1 class=\"card__title\">\n            "
    + alias4(((helper = (helper = helpers.returned_location || (depth0 != null ? depth0.returned_location : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"returned_location","hash":{},"data":data}) : helper)))
    + "\n        </h1>\n        \n        <div class='EZ-weather-container weather__today'>\n            <div class='EZ-weather-date'>"
    + alias4(((helper = (helper = helpers.todayWeekday || (depth0 != null ? depth0.todayWeekday : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"todayWeekday","hash":{},"data":data}) : helper)))
    + "</div>\n            <div class=\"EZ-weather-temp\"><span>max.</span> "
    + alias4(((helper = (helper = helpers.todayTemp || (depth0 != null ? depth0.todayTemp : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"todayTemp","hash":{},"data":data}) : helper)))
    + "<span> / min.</span> "
    + alias4(((helper = (helper = helpers.todayMin || (depth0 != null ? depth0.todayMin : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"todayMin","hash":{},"data":data}) : helper)))
    + "</div>\n            <div class=\"EZ-weather-img\" data-style=\"background-image:url("
    + alias4(((helper = (helper = helpers.todayIcon || (depth0 != null ? depth0.todayIcon : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"todayIcon","hash":{},"data":data}) : helper)))
    + ")\"></div>\n        \n        </div>\n        <div class=\"weather__gallery\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.forecast : depth0),{"name":"each","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </div>\n        \n        <div class=\"card__description\">\n\n\n            "
    + alias4(container.lambda(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.description : stack1), depth0))
    + "\n\n        </div>\n\n    </section>\n    \n    <div class=\"poweredby\">\n        "
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"more_on",{"name":"local","hash":{},"data":data}))
    + " <a href=\"http://www.weatherunderground.com\">weatherunderground.com</a>\n    </div>\n\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(helpers.limit || (depth0 && depth0.limit) || helpers.helperMissing).call(alias1,(data && data.index),4,{"name":"limit","hash":{},"data":data}),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        \n";
},"11":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <div class='EZ-weather-container'>\n                    <div class='EZ-weather-date'>"
    + alias4(((helper = (helper = helpers.weekday || (depth0 != null ? depth0.weekday : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"weekday","hash":{},"data":data}) : helper)))
    + "</div>\n                    <div class=\"EZ-weather-temp\"><span>max.</span> "
    + alias4(((helper = (helper = helpers.max || (depth0 != null ? depth0.max : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"max","hash":{},"data":data}) : helper)))
    + "<span> / min.</span>"
    + alias4(((helper = (helper = helpers.min || (depth0 != null ? depth0.min : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"min","hash":{},"data":data}) : helper)))
    + "</div>\n                    <div class=\"EZ-weather-img\" data-style=\"background-image:url("
    + alias4(((helper = (helper = helpers.icon || (depth0 != null ? depth0.icon : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"icon","hash":{},"data":data}) : helper)))
    + ")\"></div>\n                </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- weatherAlert.tpl -->\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<!-- end weatherAlert.tpl -->\n";
},"useData":true});
templates['weatherEZ'] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "    <div class=\"card__logo "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" style=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundImage : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data})) != null ? stack1 : "")
    + "\">"
    + container.escapeExpression(((helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"text","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "bg";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "background-image:"
    + container.escapeExpression(((helper = (helper = helpers.backgroundImage || (depth0 != null ? depth0.backgroundImage : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"backgroundImage","hash":{},"data":data}) : helper)))
    + ";"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.backgroundColor : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return " background-color:#"
    + container.escapeExpression(((helper = (helper = helpers.backgroundColor || (depth0 != null ? depth0.backgroundColor : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"backgroundColor","hash":{},"data":data}) : helper)))
    + ";";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.style || (depth0 != null ? depth0.style : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"style","hash":{},"data":data}) : helper)))
    + ";";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <section class=\"primary\">\n\n        <h1 class=\"card__title\">\n            "
    + alias4(((helper = (helper = helpers.returned_location || (depth0 != null ? depth0.returned_location : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"returned_location","hash":{},"data":data}) : helper)))
    + "\n        </h1>\n\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.alert : depth0),{"name":"with","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        \n        <div class='EZ-weather-container weather__today'>\n            <div class='EZ-weather-date'>"
    + alias4(((helper = (helper = helpers.todayWeekday || (depth0 != null ? depth0.todayWeekday : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"todayWeekday","hash":{},"data":data}) : helper)))
    + "</div>\n            <div class=\"EZ-weather-temp\"><span>max.</span> "
    + alias4(((helper = (helper = helpers.todayTemp || (depth0 != null ? depth0.todayTemp : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"todayTemp","hash":{},"data":data}) : helper)))
    + "<span> / min.</span> "
    + alias4(((helper = (helper = helpers.todayMin || (depth0 != null ? depth0.todayMin : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"todayMin","hash":{},"data":data}) : helper)))
    + "</div>\n            <div class=\"EZ-weather-img\" data-style=\"background-image:url("
    + alias4(((helper = (helper = helpers.todayIcon || (depth0 != null ? depth0.todayIcon : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"todayIcon","hash":{},"data":data}) : helper)))
    + ")\"></div>\n        \n        </div>\n        <div class=\"weather__gallery\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.forecast : depth0),{"name":"each","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </div>\n        \n        <div class=\"card__description\">\n\n\n            "
    + alias4(container.lambda(((stack1 = (depth0 != null ? depth0.data : depth0)) != null ? stack1.description : stack1), depth0))
    + "\n\n        </div>\n\n    </section>\n    \n    <div class=\"poweredby\">\n        "
    + alias4((helpers.local || (depth0 && depth0.local) || alias2).call(alias1,"more_on",{"name":"local","hash":{},"data":data}))
    + " <a href=\"http://www.weatherunderground.com\">weatherunderground.com</a>\n    </div>\n\n";
},"10":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "            <div class=\"alert\">\n                <div class=\"header\">"
    + alias4(((helper = (helper = helpers.des || (depth0 != null ? depth0.des : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"des","hash":{},"data":data}) : helper)))
    + "</div>\n                <div class=\"info\">"
    + alias4(((helper = (helper = helpers.time || (depth0 != null ? depth0.time : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"time","hash":{},"data":data}) : helper)))
    + "</div>\n            </div>\n";
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(helpers.limit || (depth0 && depth0.limit) || helpers.helperMissing).call(alias1,(data && data.index),4,{"name":"limit","hash":{},"data":data}),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        \n";
},"13":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <div class='EZ-weather-container'>\n                    <div class='EZ-weather-date'>"
    + alias4(((helper = (helper = helpers.weekday || (depth0 != null ? depth0.weekday : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"weekday","hash":{},"data":data}) : helper)))
    + "</div>\n                    <div class=\"EZ-weather-temp\"><span>max.</span> "
    + alias4(((helper = (helper = helpers.max || (depth0 != null ? depth0.max : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"max","hash":{},"data":data}) : helper)))
    + "<span> / min.</span>"
    + alias4(((helper = (helper = helpers.min || (depth0 != null ? depth0.min : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"min","hash":{},"data":data}) : helper)))
    + "</div>\n                    <div class=\"EZ-weather-img\" data-style=\"background-image:url("
    + alias4(((helper = (helper = helpers.icon || (depth0 != null ? depth0.icon : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"icon","hash":{},"data":data}) : helper)))
    + ")\"></div>\n                </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<!-- weatherEZ.tpl -->\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.logo : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.data : depth0),{"name":"with","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<!-- end weatherEZ.tpl -->\n";
},"useData":true});

          _export('default', templates);
        });
      

System.register("mobile-ui/views/currency", [], function (_export) {
    "use strict";

    var _default;

    var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function getNumValue(value) {
        return isNaN(value) || value <= 0 ? 0 : value - 0; // rounding value
    }

    function updateCurrencyTpl(data) {
        document.getElementById("currency-tpl").innerHTML = CLIQZ.templates.currency({ data: data });
    }

    return {
        setters: [],
        execute: function () {
            _default = (function () {
                function _default() {
                    _classCallCheck(this, _default);
                }

                _createClass(_default, [{
                    key: "enhanceResults",
                    value: function enhanceResults(data) {}
                }, {
                    key: "switchCurrency",
                    value: function switchCurrency(data) {
                        var fromInput = document.getElementById("fromInput");

                        var convRate = 1 / data.mConversionRate;
                        data.mConversionRate = convRate + "";
                        convRate *= data.multiplyer;
                        var fromValue = getNumValue(parseFloat(fromInput.value));
                        data.toAmount.main = getNumValue(fromValue * convRate);
                        data.fromAmount = fromValue;

                        var temp = data.fromCurrency;
                        data.fromCurrency = data.toCurrency;
                        data.toCurrency = temp;

                        temp = data.formSymbol;
                        data.formSymbol = data.toSymbol;
                        data.toSymbol = temp;

                        data.multiplyer = 1 / data.multiplyer;

                        updateCurrencyTpl(data);
                    }
                }, {
                    key: "updateFromValue",
                    value: function updateFromValue(data) {
                        var fromInput = document.getElementById("fromInput");
                        var toInput = document.getElementById("toInput");
                        var toAmount = document.getElementById("calc-answer");
                        var toValue = getNumValue(fromInput.value / data.multiplyer * data.mConversionRate).toFixed(2) - 0;
                        toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
                        toInput.value = toValue;
                    }
                }, {
                    key: "updateToValue",
                    value: function updateToValue(data) {
                        var fromInput = document.getElementById("fromInput");
                        var toInput = document.getElementById("toInput");
                        var toAmount = document.getElementById("calc-answer");
                        var toValue = getNumValue(toInput.value);
                        var fromValue = getNumValue(toValue * data.multiplyer / data.mConversionRate).toFixed(2);
                        toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
                        fromInput.value = fromValue;
                    }
                }]);

                return _default;
            })();

            _export("default", _default);

            ;
        }
    };
});
System.register('mobile-ui/views/entity-generic', ['mobile-ui/views/generic'], function (_export) {
  'use strict';

  var generic;
  return {
    setters: [function (_mobileUiViewsGeneric) {
      generic = _mobileUiViewsGeneric['default'];
    }],
    execute: function () {
      _export('default', generic);
    }
  };
});
System.register('mobile-ui/views/generic', [], function (_export) {
  'use strict';

  var GenericResult, Generic;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function getLogoDetails(url) {
    return CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(url));
  }

  function attachLogoDetails() {
    var resources = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

    return resources.map(function (resource) {
      return Object.assign({}, resource, {
        logoDetails: getLogoDetails(resource.url)
      });
    });
  }

  return {
    setters: [],
    execute: function () {
      GenericResult = (function () {
        function GenericResult() {
          _classCallCheck(this, GenericResult);
        }

        _createClass(GenericResult, [{
          key: 'links',
          get: function get() {
            return this.categories || this.richData && this.richData.categories;
          }
        }, {
          key: 'shortDescription',
          get: function get() {
            var description = this.description;
            if (this.template === 'pattern-h2' && this.description) {
              // rough calculations to determine how much of description to show
              // line padding: 60, character width: 10, keyboard height: 400, line height: 20
              var descLength = (this.screen.width - 60) / 10 * Math.max((this.screen.height - 400) / 20, 1);
              if (this.description.length > descLength + 3) {
                var shortDescription = this.description.slice(0, descLength);
                description = shortDescription + '...';
              }
            }
            return description;
          }
        }]);

        return GenericResult;
      })();

      _export('GenericResult', GenericResult);

      Generic = (function () {
        function Generic() {
          _classCallCheck(this, Generic);
        }

        _createClass(Generic, [{
          key: 'enhanceResults',
          value: function enhanceResults(data, screen) {
            var result = data;
            result.richData = result.richData || {};
            result.screen = screen;
            Object.setPrototypeOf(result, GenericResult.prototype);

            result.external_links = attachLogoDetails(result.external_links);
            result.richData.additional_sources = attachLogoDetails(result.richData.additional_sources);
            result.news = attachLogoDetails(result.news);

            if (result.actions && result.external_links) {
              result.actionsExternalMixed = result.actions.concat(result.external_links);
              result.actionsExternalMixed.sort(function (a, b) {
                if (a.rank < b.rank) {
                  return 1;
                }
                if (a.rank > b.rank) {
                  return -1;
                }
                return 0;
              });
            }
          }
        }]);

        return Generic;
      })();

      _export('default', Generic);
    }
  };
});
System.register('mobile-ui/views/hq', ['mobile-ui/views/generic'], function (_export) {
  'use strict';

  var generic;
  return {
    setters: [function (_mobileUiViewsGeneric) {
      generic = _mobileUiViewsGeneric['default'];
    }],
    execute: function () {
      _export('default', generic);
    }
  };
});
System.register('mobile-ui/views/liveTicker', [], function (_export) {
  /**
  * @namespace ui.views
  */
  'use strict';

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: 'enhanceResults',

          /**
          * @method enhanceResults
          * @param data
          */
          value: function enhanceResults(data) {
            data.matches.forEach(function (matchday) {
              matchday.matches.forEach(function (match) {
                match.gameTimeHour = match.gameTime.split(', ')[1];
                match['class'] = match.isLive ? 'cqz-live' : '';
              });
            });
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
System.register("mobile-ui/views/local-data-sc", [], function (_export) {
  "use strict";

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: "enhanceResults",
          value: function enhanceResults(data) {

            function parseTime(timeStr) {
              // e.g. timeStr: 10.30
              var time = timeStr.split(".");
              return {
                hours: parseInt(time[0]) || 0,
                minutes: parseInt(time[1]) || 0
              };
            }

            function twoDigit(num) {
              return [num < 10 ? "0" : "", num].join("");
            }

            var isBigSnippet = Boolean(data.phonenumber || data.address || data.opening_hours || data.no_location),
                rating_img = null,
                t = new Date(),
                current_t = [twoDigit(t.getHours()), twoDigit(t.getMinutes())].join("."),
                open_stt,
                timeInfos = [],
                openingColors = {
              open: "#74d463",
              closed: "#E92207",
              open_soon: "#FFC802",
              close_soon: "#FFC802"
            };

            data.phone_address = data.phonenumber || data.address;

            if (data.opening_hours) {

              data.opening_hours.forEach(function (el) {
                if (!el.open || !el.close) {
                  return;
                }
                timeInfos.push(el.open.time + " - " + el.close.time);
                if (open_stt && open_stt !== "closed") {
                  return;
                }

                var openTime = parseTime(el.open.time),
                    closeTime = parseTime(el.close.time),
                    closesNextDay = el.close.day !== el.open.day,

                /** Difference in minutes from opening/closing times to current time **/
                minutesFrom = {
                  opening: 60 * (t.getHours() - openTime.hours) + (t.getMinutes() - openTime.minutes),
                  /* If it closes the next day, we need to subtract 24 hours from the hour difference */
                  closing: 60 * (t.getHours() - closeTime.hours - (closesNextDay ? 24 : 0)) + (t.getMinutes() - closeTime.minutes)
                };

                if (minutesFrom.opening > 0 && minutesFrom.closing < 0) {
                  open_stt = "open";
                  if (minutesFrom.closing > -60) {
                    open_stt = "close_soon";
                  }
                } else {
                  open_stt = "closed";
                  if (minutesFrom.opening > -60 && minutesFrom.opening < 0) {
                    open_stt = "open_soon";
                  }
                }
              });

              data.opening_status = {
                color: openingColors[open_stt],
                stt_text: open_stt && CliqzUtils.getLocalizedString(open_stt),
                time_info_til: CliqzUtils.getLocalizedString("open_hour"),
                time_info_str: timeInfos.join(", ")
              };
            }

            if (!data.rating) {
              data.rating = 0;
            }

            rating_img = "http://cdn.cliqz.com/extension/EZ/richresult/stars" + Math.max(0, Math.min(Math.round(data.rating), 5)) + ".svg";

            if (!isBigSnippet) {
              data.richData = {
                image: data.image,
                url_ratingimg: rating_img,
                name: data.t,
                des: data.desc
              };
            } else {
              data.url_ratingimg = rating_img;
            }

            data.big_rs_size = isBigSnippet;

            var distance = CliqzUtils.distance(data.lon, data.lat) * 1000;
            if (distance > -1) {
              data.distance = distance;
            }

            data.deepLinks = ((data.deepResults || []).find(function (res) {
              return res.type === 'buttons';
            }) || {}).links;
          }
        }]);

        return _default;
      })();

      _export("default", _default);

      ;
    }
  };
});
System.register("mobile-ui/views/stocks", [], function (_export) {
  "use strict";

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: "enhanceResults",
          value: function enhanceResults(data) {
            var myTime = new Date(data.message.last_update * 1000);
            data.message.time_string = myTime.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
          }
        }]);

        return _default;
      })();

      _export("default", _default);

      ;
    }
  };
});
System.register('mobile-ui/views/weatherAlert', ['mobile-ui/views/weatherEZ'], function (_export) {
  'use strict';

  var weatherEZ;
  return {
    setters: [function (_mobileUiViewsWeatherEZ) {
      weatherEZ = _mobileUiViewsWeatherEZ['default'];
    }],
    execute: function () {
      _export('default', weatherEZ);
    }
  };
});
System.register('mobile-ui/views/weatherEZ', [], function (_export) {
  'use strict';

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: 'enhanceResults',
          value: function enhanceResults(data) {
            if (data.forecast_url) {
              data.btns = [{
                'title_key': 'extended_forecast',
                'url': data.forecast_url
              }];
            }
          }
        }]);

        return _default;
      })();

      _export('default', _default);

      ;
    }
  };
});
System.register('mobile-ui/views', ['mobile-ui/views/currency', 'mobile-ui/views/entity-generic', 'mobile-ui/views/local-data-sc', 'mobile-ui/views/generic', 'mobile-ui/views/hq', 'mobile-ui/views/stocks', 'mobile-ui/views/weatherEZ', 'mobile-ui/views/liveTicker'], function (_export) {
  'use strict';

  var currency, entityGeneric, localDataSc, generic, hq, stocks, weatherEZ, liveTicker;
  return {
    setters: [function (_mobileUiViewsCurrency) {
      currency = _mobileUiViewsCurrency['default'];
    }, function (_mobileUiViewsEntityGeneric) {
      entityGeneric = _mobileUiViewsEntityGeneric['default'];
    }, function (_mobileUiViewsLocalDataSc) {
      localDataSc = _mobileUiViewsLocalDataSc['default'];
    }, function (_mobileUiViewsGeneric) {
      generic = _mobileUiViewsGeneric['default'];
    }, function (_mobileUiViewsHq) {
      hq = _mobileUiViewsHq['default'];
    }, function (_mobileUiViewsStocks) {
      stocks = _mobileUiViewsStocks['default'];
    }, function (_mobileUiViewsWeatherEZ) {
      weatherEZ = _mobileUiViewsWeatherEZ['default'];
    }, function (_mobileUiViewsLiveTicker) {
      liveTicker = _mobileUiViewsLiveTicker['default'];
    }],
    execute: function () {
      _export('default', {
        currency: currency,
        'entity-generic': entityGeneric,
        'local-data-sc': localDataSc,
        generic: generic,
        hq: hq,
        stocks: stocks,
        weatherEZ: weatherEZ,
        liveTicker: liveTicker
      });
    }
  };
});
System.register("mobile-ui/webview", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("window", window);

      _export("document", document);

      _export("Hammer", Hammer);

      _export("$", $);
    }
  };
});
System.register("mobile-ui/window", ["core/cliqz", "mobile-ui/UI", "mobile-ui/templates", "mobile-ui/content/helpers", "mobile-ui/views"], function (_export) {

  /**
  * @namespace mobile-ui
  */
  "use strict";

  var utils, UI, templates, helpers, VIEWS, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_mobileUiUI) {
      UI = _mobileUiUI["default"];
    }, function (_mobileUiTemplates) {
      templates = _mobileUiTemplates["default"];
    }, function (_mobileUiContentHelpers) {
      helpers = _mobileUiContentHelpers["default"];
    }, function (_mobileUiViews) {
      VIEWS = _mobileUiViews["default"];
    }],
    execute: function () {
      _default = (function () {
        /**
        * @class Window
        * @constructor
        * @param settings
        */

        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        /**
        * @method init
        */

        _createClass(_default, [{
          key: "init",
          value: function init() {

            Object.keys(helpers).forEach(function (helperName) {
              Handlebars.registerHelper(helperName, helpers[helperName]);
            });
            window.CLIQZ.templates = Handlebars.templates = templates;
            Handlebars.partials = templates;
            Object.keys(VIEWS).forEach(function (view) {
              return UI.VIEWS[view] = new VIEWS[view]();
            });

            window.CLIQZ.UI = UI;
            window.CLIQZ.UI.init();
          }
        }, {
          key: "unload",
          value: function unload() {}
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});
System.register("platform/environment", [], function (_export) {
  //TODO: get rid of me!
  "use strict";

  var lastSucceededUrl, latestUrl, TEMPLATES, CLIQZEnvironment;
  return {
    setters: [],
    execute: function () {

      // END TEMP
      TEMPLATES = Object.freeze(Object.assign(Object.create(null), {
        "Cliqz": true,
        "EZ-category": true,
        "EZ-history": true,
        "calculator": true,
        "celebrities": true,
        "currency": true,
        "emphasis": true,
        "empty": true,
        "entity-news-1": true,
        "entity-search-1": true,
        "flightStatusEZ-2": true,
        "generic": true,
        "history": true,
        "ligaEZ1Game": true,
        "ligaEZTable": true,
        "ligaEZUpcomingGames": true,
        "local-cinema-sc": true,
        "local-data-sc": true,
        "local-movie-sc": true,
        "logo": true,
        "main": true,
        "noResult": true,
        "rd-h3-w-rating": true,
        "results": true,
        "stocks": true,
        "topnews": true,
        "topsites": true,
        "url": true,
        "weatherAlert": true,
        "weatherEZ": true,
        "liveTicker": true
      }));
      CLIQZEnvironment = {
        BRANDS_DATA_URL: 'static/brands_database.json',
        TEMPLATES_PATH: 'mobile-ui/templates/',
        LOCALE_PATH: 'static/locale/',
        SYSTEM_BASE_URL: './',
        RESULTS_LIMIT: 3,
        MIN_QUERY_LENGHT_FOR_EZ: 0,
        RERANKERS: [],
        RESULTS_TIMEOUT: 60000, // 1 minute
        TEMPLATES: TEMPLATES,
        KNOWN_TEMPLATES: {
          'entity-portal': true,
          'entity-generic': true,
          'entity-video-1': true,
          'recipe': true,
          'ez-generic-2': true,
          'vod': true
        },
        PARTIALS: ['url', 'logo', 'EZ-category', 'EZ-history', 'rd-h3-w-rating', 'pattern-h1'],
        GOOGLE_ENGINE: { name: 'Google', url: 'http://www.google.com/search?q=' },
        log: function log(msg, key) {
          console.log('[[' + key + ']]', msg);
        },
        //TODO: check if calling the bridge for each telemetry point is expensive or not
        telemetry: function telemetry(msg) {
          msg.ts = Date.now();
          osAPI.pushTelemetry(msg);
        },
        isUnknownTemplate: function isUnknownTemplate(template) {
          // in case an unknown template is required
          return template && !CLIQZEnvironment.TEMPLATES[template] && !CLIQZEnvironment.KNOWN_TEMPLATES.hasOwnProperty(template);
        },
        getBrandsDBUrl: function getBrandsDBUrl(version) {
          //TODO - consider the version !!
          return 'static/brands_database.json';
        },
        // TODO - SHOUD BE MOVED TO A LOGIC MODULE
        autoComplete: function autoComplete(val, searchString) {

          if (val && val.length > 0) {
            (function () {
              val = val.replace(/http([s]?):\/\/(www.)?/, '');
              val = val.toLowerCase();
              var searchLower = searchString.toLowerCase();

              if (val.startsWith(searchLower)) {
                osAPI.autocomplete(val);
              } else {
                storage.getObject('recentQueries', []).some(function (item) {
                  var queryLower = item.query.toLowerCase();
                  if (queryLower !== searchLower && queryLower.startsWith(searchLower)) {
                    osAPI.autocomplete(queryLower);
                    return true;
                  }
                  return false;
                });
              }
            })();
          }
        },
        // TODO - SHOUD BE MOVED TO A LOGIC MODULE
        putHistoryFirst: function putHistoryFirst(r) {
          var history = [],
              backend = [];
          r._results.forEach(function (res) {
            if (res.style === 'cliqz-pattern' || res.style === 'favicon') {
              history.push(res);
            } else {
              backend.push(res);
            }
          });
          r._results = history.concat(backend);
        },
        resultsHandler: function resultsHandler(r) {

          if (CLIQZEnvironment.lastSearch !== r._searchString) {
            CliqzUtils.log("u='" + CLIQZEnvironment.lastSearch + "'' s='" + r._searchString + "', returning", "urlbar!=search");
            return;
          }

          CLIQZEnvironment.putHistoryFirst(r);

          r._results.splice(CLIQZEnvironment.RESULTS_LIMIT);

          var renderedResults = window.CLIQZ.UI.renderResults(r);

          renderedResults[0] && CLIQZEnvironment.autoComplete(renderedResults[0].url, r._searchString);
        },
        search: function search(e) {
          if (!e || e === '') {
            // should be moved to UI except 'CLIQZEnvironment.initHomepage(true);'
            CLIQZEnvironment.lastSearch = '';
            window.CLIQZ.UI.hideResultsBox();
            CLIQZEnvironment.initHomepage(true);
            window.CLIQZ.UI.stopProgressBar();
            window.CLIQZ.UI.lastResults = null;
            return;
          }

          CLIQZEnvironment.setCurrentQuery(e);

          e = e.toLowerCase().trim();

          CLIQZEnvironment.lastSearch = e;

          News.sendHideTelemetry();

          window.CLIQZ.UI.startProgressBar();

          // start XHR call ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          //CliqzUtils.log(e,'XHR');
          new CliqzAutocomplete.CliqzResults().search(e, CLIQZEnvironment.resultsHandler);
        },
        getPref: function getPref(pref, notFound) {
          var mypref;
          if (mypref = CLIQZEnvironment.getLocalStorage().getItem(pref)) {
            return mypref;
          } else {
            return notFound;
          }
        },
        setPref: function setPref(pref, val) {
          //CliqzUtils.log('setPrefs',arguments);
          CLIQZEnvironment.getLocalStorage().setItem(pref, val);
        },
        setInterval: (function (_setInterval) {
          function setInterval() {
            return _setInterval.apply(this, arguments);
          }

          setInterval.toString = function () {
            return _setInterval.toString();
          };

          return setInterval;
        })(function () {
          return setInterval.apply(null, arguments);
        }),
        setTimeout: (function (_setTimeout) {
          function setTimeout() {
            return _setTimeout.apply(this, arguments);
          }

          setTimeout.toString = function () {
            return _setTimeout.toString();
          };

          return setTimeout;
        })(function () {
          return setTimeout.apply(null, arguments);
        }),
        clearTimeout: (function (_clearTimeout) {
          function clearTimeout() {
            return _clearTimeout.apply(this, arguments);
          }

          clearTimeout.toString = function () {
            return _clearTimeout.toString();
          };

          return clearTimeout;
        })(function () {
          clearTimeout.apply(null, arguments);
        }),
        Promise: Promise,
        tldExtractor: function tldExtractor(host) {
          //temp
          return host.split('.').splice(-1)[0];
        },
        getLocalStorage: function getLocalStorage(url) {
          return CLIQZEnvironment.storage;
        },
        OS: 'mobile',
        isPrivate: function isPrivate() {
          return false;
        },
        isOnPrivateTab: function isOnPrivateTab(win) {
          return false;
        },
        getWindow: function getWindow() {
          return window;
        },
        httpHandler: function httpHandler(method, url, callback, onerror, timeout, data, sync) {
          latestUrl = url;

          function isMixerUrl(url) {
            return url.indexOf(CliqzUtils.RESULTS_PROVIDER) === 0;
          }

          var req = new XMLHttpRequest();
          req.open(method, url, !sync);
          req.overrideMimeType && req.overrideMimeType('application/json');
          req.onload = function () {
            if (!parseInt) {
              return;
            } //parseInt is not a function after extension disable/uninstall

            var statusClass = parseInt(req.status / 100);
            if (statusClass === 2 || statusClass === 3 || statusClass === 0 /* local files */) {

                if (isMixerUrl(url)) {
                  if (typeof CustomEvent !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('connected'));
                  }
                  lastSucceededUrl = url;
                  CliqzUtils.log('status ' + req.status, 'CLIQZEnvironment.httpHandler.onload');
                }

                callback && callback(req);
              } else {
              CliqzUtils.log('loaded with non-200 ' + url + ' (status=' + req.status + ' ' + req.statusText + ')', 'CLIQZEnvironment.httpHandler.onload');
              onerror && onerror();
            }
          };
          req.onerror = function () {
            if (latestUrl !== url || url === lastSucceededUrl || !isMixerUrl(url)) {
              onerror && onerror();
              return;
            }
            if (typeof CustomEvent !== 'undefined') {
              window.dispatchEvent(new CustomEvent('disconnected', { 'detail': 'This could be caused because of request error' }));
            }

            if (CLIQZEnvironment) {
              if (isMixerUrl(url)) {
                setTimeout(CLIQZEnvironment.httpHandler, 500, method, url, callback, onerror, timeout, data, sync);
              }
              CliqzUtils.log('error loading ' + url + ' (status=' + req.status + ' ' + req.statusText + ')', 'CLIQZEnvironment.httpHandler,onerror');
              onerror && onerror();
            }
          };
          req.ontimeout = function () {

            CliqzUtils.log('BEFORE', 'CLIQZEnvironment.httpHandler.ontimeout');
            if (latestUrl !== url || url === lastSucceededUrl || !isMixerUrl(url)) {
              return;
            }
            if (typeof CustomEvent !== 'undefined') {
              window.dispatchEvent(new CustomEvent('disconnected', { 'detail': 'This could be caused because of timed out request' }));
            }

            if (CLIQZEnvironment) {
              //might happen after disabling the extension
              if (isMixerUrl(url)) {
                setTimeout(CLIQZEnvironment.httpHandler, 500, method, url, callback, onerror, timeout, data, sync);
              }
              CliqzUtils.log('resending: timeout for ' + url, 'CLIQZEnvironment.httpHandler.ontimeout');
              onerror && onerror();
            }
          };

          if (callback && !sync) {
            if (timeout) {
              req.timeout = parseInt(timeout);
            } else {
              req.timeout = method === 'POST' ? 10000 : 1000;
            }
          }

          req.send(data);
          return req;
        },
        // TODO - SHOUD BE MOVED TO A LOGIC MODULE
        openLink: function openLink(window, url) {
          if (url !== '#') {
            if (url.indexOf('http') === -1) {
              url = 'http://' + url;
            }
            osAPI.openLink(url);
          }

          return false;
        },
        // TODO - SHOUD BE MOVED TO A LOGIC MODULE
        processHistory: function processHistory(data) {
          try {
            var items = data.results;
            var res = [];
            for (var i in items) {
              var item = items[i];
              res.push({
                style: 'favicon',
                value: item.url,
                image: '',
                comment: typeof item.title !== 'undefined' ? item.title : 'no comment',
                label: ''
              });
            }
            return { results: res, query: data.query, ready: true };
          } catch (e) {
            CliqzUtils.log('Error: ' + e, 'CLIQZEnvironment.processHistory');
          }
        },
        // TODO - SHOUD BE MOVED TO A LOGIC MODULE
        displayHistory: function displayHistory(data) {
          console.log(this, 'bbb');
          CLIQZEnvironment.searchHistoryCallback(CLIQZEnvironment.processHistory(data));
        },
        // TODO - SHOUD BE MOVED TO A LOGIC MODULE
        historySearch: function historySearch(q, callback) {
          CLIQZEnvironment.searchHistoryCallback = callback;
          console.log(this, 'aaa');
          window.osAPI.searchHistory(q, 'CLIQZEnvironment.displayHistory');
        },
        //TODO: remove this dependency
        getSearchEngines: function getSearchEngines() {
          return [];
        },
        // mocked functions
        getEngineByName: function getEngineByName() {
          return '';
        },
        getEngineByAlias: function getEngineByAlias() {
          return '';
        },
        copyResult: function copyResult(val) {
          osAPI.copyResult(val);
        },
        addEventListenerToElements: function addEventListenerToElements(elementSelector, eventType, listener) {
          Array.prototype.slice.call(document.querySelectorAll(elementSelector)).forEach(function (element) {
            element.addEventListener(eventType, listener);
          });
        },

        initHomepage: function initHomepage(hideLastState) {
          if (hideLastState) {
            var start = document.getElementById('resetState');
            start && (start.style.display = 'none');
          }
          osAPI.getTopSites('News.startPageHandler', 15);
        },
        setDefaultSearchEngine: function setDefaultSearchEngine(engine) {
          CLIQZEnvironment.getLocalStorage().setObject('defaultSearchEngine', engine);
        },
        getDefaultSearchEngine: function getDefaultSearchEngine() {
          return CLIQZEnvironment.getLocalStorage().getObject('defaultSearchEngine') || CLIQZEnvironment.GOOGLE_ENGINE;
        }
      };

      CLIQZEnvironment.setCurrentQuery = function (query) {

        if (CLIQZEnvironment.getPref('incognito') === "true" || query.match(/http[s]{0,1}:/)) {
          return;
        }

        var recentItems = CLIQZEnvironment.getLocalStorage().getObject('recentQueries', []);

        if (!recentItems[0]) {
          recentItems = [{ id: 1, query: query, timestamp: Date.now() }];
          CLIQZEnvironment.getLocalStorage().setObject('recentQueries', recentItems);
        } else if (recentItems[0].query === query && Date.now() - recentItems[0].timestamp < 10 * 1000 * 60) {
          // DO NOTHING
          // temporary work around repetitive queries coming from iOS
        } else if (recentItems[0].query.indexOf(query) + query.indexOf(recentItems[0].query) > -2 && Date.now() - recentItems[0].timestamp < 5 * 1000) {
            recentItems[0] = { id: recentItems[0].id, query: query, timestamp: Date.now() };
            CLIQZEnvironment.getLocalStorage().setObject('recentQueries', recentItems);
          } else {
            recentItems.unshift({ id: recentItems[0].id + 1, query: query, timestamp: Date.now() });
            recentItems = recentItems.slice(0, 60);
            CLIQZEnvironment.getLocalStorage().setObject('recentQueries', recentItems);
          }
      };

      _export("default", CLIQZEnvironment);
    }
  };
});
System.register('platform/fs', [], function (_export) {
  'use strict';

  _export('readFile', readFile);

  _export('writeFile', writeFile);

  _export('mkdir', mkdir);

  function readFile(filePath) {
    return Promise.reject('not implemented');
  }

  function writeFile(filePath, data) {
    return Promise.reject('not implemented');
  }

  function mkdir(dirPath) {
    return Promise.reject('not implemented');
  }

  return {
    setters: [],
    execute: function () {}
  };
});
System.register("platform/gzip", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {}
  };
});
// not implemented on mobile
System.register("platform/history-manager", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {}
  };
});
// not implemented on mobile
System.register('platform/language', [], function (_export) {
  'use strict';

  var CliqzLanguage;
  return {
    setters: [],
    execute: function () {
      CliqzLanguage = {
        stateToQueryString: function stateToQueryString() {
          return '&lang=de,en';
        }
      };

      _export('default', CliqzLanguage);
    }
  };
});
System.register("platform/load-logo-db", ["mobile-ui/logo-db"], function (_export) {
  "use strict";

  var logoDb;
  return {
    setters: [function (_mobileUiLogoDb) {
      logoDb = _mobileUiLogoDb["default"];
    }],
    execute: function () {
      _export("default", function () {
        return Promise.resolve(logoDb);
      });
    }
  };
});
System.register("platform/platform", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", {
        isMobile: true,
        isFirefox: false,
        isChromium: false
      });
    }
  };
});
System.register("platform/process-script-manager", [], function (_export) {
  "use strict";

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default(dispatcher) {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: "init",
          value: function init() {}
        }, {
          key: "unload",
          value: function unload() {}
        }, {
          key: "broadcast",
          value: function broadcast(channel, msg) {}
        }, {
          key: "addMessageListener",
          value: function addMessageListener(channel, cb) {}
        }, {
          key: "removeMessageListener",
          value: function removeMessageListener(channel, cb) {}
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});
System.register("platform/startup", ["core/config"], function (_export) {
  /* global System */
  "use strict";

  var config;

  function loadModule(moduleName) {
    return System["import"](moduleName + "/background").then(function (module) {
      return module["default"].init(config);
    }).then(function () {
      return System["import"](moduleName + "/window");
    }).then(function (module) {
      return new module["default"]({ window: window }).init();
    })["catch"](function (e) {
      CliqzUtils.log("Error on loading module: " + moduleName + " - " + e.toString() + " -- " + e.stack, "Extension");
    });
  }

  return {
    setters: [function (_coreConfig) {
      config = _coreConfig["default"];
    }],
    execute: function () {
      _export("default", function (window) {
        var modules = arguments.length <= 1 || arguments[1] === undefined ? config.modules : arguments[1];

        // intersent config file with
        var modulesToLoad = modules.filter(function (n) {
          return config.modules.indexOf(n) != -1;
        });

        return loadModule("core").then(function () {
          return Promise.all(modulesToLoad.map(loadModule));
        });
      });

      ;
    }
  };
});
System.register("platform/storage", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", localStorage);
    }
  };
});
System.register("static/background", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", {
        init: function init() {},
        unload: function unload() {}
      });
    }
  };
});
System.register("static/window", [], function (_export) {
  "use strict";

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default(settings) {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: "init",
          value: function init() {}
        }, {
          key: "unload",
          value: function unload() {}
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});
System.register("tests/autocomplete/unit/history-cluster-test", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", describeModule("autocomplete/history-cluster", function () {
        return {
          "core/cliqz": { utils: {} },
          "autocomplete/result": { "default": {} }
        };
      }, function () {

        describe('_removeDuplicates', function () {
          // Cannot load real CliqzUtils so had no other way than copy code
          var utils = {
            cleanUrlProtocol: function cleanUrlProtocol(url, cleanWWW) {
              if (!url) return '';

              var protocolPos = url.indexOf('://');

              // removes protocol http(s), ftp, ...
              if (protocolPos != -1 && protocolPos <= 6) url = url.split('://')[1];

              // removes the www.
              if (cleanWWW && url.toLowerCase().indexOf('www.') == 0) url = url.slice(4);

              return url;
            },
            generalizeUrl: function generalizeUrl(url, skipCorrection) {
              if (!url) {
                return '';
              }
              var val = url.toLowerCase();
              var cleanParts = utils.cleanUrlProtocol(val, false).split('/'),
                  host = cleanParts[0],
                  pathLength = 0,
                  SYMBOLS = /,|\./g;
              if (!skipCorrection) {
                if (cleanParts.length > 1) {
                  pathLength = ('/' + cleanParts.slice(1).join('/')).length;
                }
                if (host.indexOf('www') === 0 && host.length > 4) {
                  // only fix symbols in host
                  if (SYMBOLS.test(host[3]) && host[4] != ' ')
                    // replace only issues in the host name, not ever in the path
                    val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') + (pathLength ? val.substr(-pathLength) : '');
                }
              }
              url = utils.cleanUrlProtocol(val, true);
              return url[url.length - 1] == '/' ? url.slice(0, -1) : url;
            }
          };

          beforeEach(function () {
            this.deps("core/cliqz").utils.generalizeUrl = utils.generalizeUrl;
          });

          it('should take first if no https', function () {
            var source = [{ title: 'title 1',
              url: 'http://www.abs.com/'
            }, { title: 'title 2',
              url: 'http://www.abs.com/'
            }, { title: 'title 3',
              url: 'http://www.abs.com/'
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = [source[0]];

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });

          it('should take first if all https', function () {
            var source = [{ title: 'title 1',
              url: 'https://www.abs.com/'
            }, { title: 'title 2',
              url: 'https://www.abs.com/'
            }, { title: 'title 3',
              url: 'https://www.abs.com/'
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = [source[0]];

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });

          it('should take https if in pos 0', function () {
            var source = [{ title: 'title 1',
              url: 'https://www.abs.com/'
            }, { title: 'title 2',
              url: 'http://www.abs.com/'
            }, { title: 'title 3',
              url: 'http://www.abs.com/'
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = [source[0]];

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });

          it('should take https if in pos 1', function () {
            var source = [{ title: 'title 1',
              url: 'http://www.abs.com/'
            }, { title: 'title 2',
              url: 'https://www.abs.com/'
            }, { title: 'title 3',
              url: 'http://www.abs.com/'
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = [source[1]];

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });

          it('should take https in pos 0 if titles the same', function () {
            var source = [{ title: 'title',
              url: 'https://www.abs.com/gsgfds'
            }, { title: 'title',
              url: 'http://www.abs.com/sssssss'
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = [source[0]];

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });

          it('should take https in pos 1 if titles the same', function () {
            var source = [{ title: 'title',
              url: 'http://www.abs.com/gsgfds'
            }, { title: 'title',
              url: 'https://www.abs.com/sssssss'
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = [source[1]];

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });

          it('should leave alone if all different urls and titles', function () {
            var source = [{ title: 'title 1',
              url: 'http://www.abs.com/gsgfds'
            }, { title: 'title 2',
              url: 'https://www.abs.com/sssssss'
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = source;

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });

          it('should take one with best title without www', function () {
            var source = [{ "url": "https://www.twitter.com/",
              "title": "twitter.com"
            }, { "url": "https://twitter.com/",
              "title": "Welcome to Twitter - Login or Sign up"
            }, { "url": "http://www.twitter.com/",
              "title": "twitter.com"
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = [source[1]];

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });

          it('should take one with best title with www', function () {
            var source = [{ "url": "https://www.twitter.com/",
              "title": "www.twitter.com"
            }, { "url": "https://twitter.com/",
              "title": "Welcome to Twitter - Login or Sign up"
            }, { "url": "http://www.twitter.com/",
              "title": "www.twitter.com"
            }].map(function (entry) {
              return {
                title: entry.title,
                url: entry.url,
                _genUrl: utils.generalizeUrl(entry.url)
              };
            });

            var expected = [source[1]];

            chai.expect(this.module()["default"]._removeDuplicates(source)).to.deep.equal(expected);
          });
        });
      }));
    }
  };
});
System.register("tests/autocomplete/unit/mixer-test", [], function (_export) {
  "use strict";

  var expect;
  return {
    setters: [],
    execute: function () {
      expect = chai.expect;

      _export("default", describeModule("autocomplete/mixer", function () {
        return {
          "autocomplete/url-complete": { "default": {} },
          "core/cliqz": {
            utils: {
              setTimeout: setTimeout,
              log: console.log.bind(console),
              encodeSources: function encodeSources() {
                return [];
              },
              getDetailsFromUrl: function getDetailsFromUrl(url) {
                return { extra: "", path: "", host: "" };
              },
              encodeResultType: function encodeResultType() {
                return "";
              },
              isCompleteUrl: function isCompleteUrl() {
                return true;
              },
              generalizeUrl: function generalizeUrl() {},
              MIN_QUERY_LENGHT_FOR_EZ: 3
            }
          }
        };
      }, function () {
        beforeEach(function () {
          // Disable cleaning of smartCLIQZ trigger URLs during testing
          this.module()["default"]._cleanTriggerUrls = function () {};
        });

        describe('prepareExtraResults', function () {
          it('should discard bad EZs', function () {
            var input = [{
              data: { garbage: 'useless' }
            }];
            this.module()["default"]._prepareExtraResults(input);
            expect(this.module()["default"]._prepareExtraResults(input)).to.be.empty;
          });

          it('should add trigger_method to each result', function () {
            var input = [{
              style: 'cliqz-extra',
              val: 'https://cliqz.com/',
              comment: 'Cliqz',
              label: 'https://cliqz.com/',
              query: 'cliqz.c',
              data: {
                answer: '15:16',
                expression: 'Mittwoch - 30 September 2015',
                ez_type: 'time',
                friendly_url: 'worldtime.io/current/WzUxLCA5XXw5fDUx',
                is_calculus: true,
                line3: 'Central European Summer Time (UTC/GMT +2:00)',
                location: 'Deutschland',
                mapped_location: 'DE',
                meta: {
                  lazyRH_: '0.00108695030212'
                },
                prefix_answer: '',
                support_copy_ans: null,
                template: 'calculator',
                subType: '{"ez": "-6262111850032132334"}',
                ts: 1443619006,
                kind: ['X|{"ez": "-6262111850032132334"}']
              }
            }];

            var expected = 'X|{"ez":"-6262111850032132334","trigger_method":"rh_query"}';

            var results = this.module()["default"]._prepareExtraResults(input);

            results.forEach(function (result) {
              expect(result).to.contain.all.keys(input[0]);
              expect(result.data.kind[0]).to.equal(expected);
            });
          });
        });

        describe('prepareCliqzResults', function () {

          it('should add i to each subtype', function () {
            var input = [{
              q: 'cinema',
              url: 'http://www.cinema.de/',
              source: 'bm',
              snippet: {
                desc: 'Das Kinoprogramm in Deutschland mit allen Neustarts, Filmen, DVDs, dem Filmquiz und vielen Stars, News, Fotos und Insider-Infos: alles rund ums Kino bei CINEMA Online.',
                title: 'Kino bei CINEMA: Kinoprogramm, Filme, DVDs, Stars, Trailer und mehr - Cinema.de'
              }
            }, {
              q: 'cinema',
              url: 'http://www.cinemaxx.de/',
              source: 'bm',
              snippet: {
                desc: 'Aktuelles Kinoprogramm und Filmstarts. Kinotickets gleich online kaufen oder reservieren. Kino in bester Qualität - Willkommen bei CinemaxX',
                title: 'Kino in bester Qualität - Herzlich willkommen in Ihrem CinemaxX.'
              }
            }, {
              q: 'cinema',
              url: 'http://www.cinema-muenchen.de/',
              source: 'bm',
              snippet: {
                desc: 'Startseite',
                title: 'Willkommen bei Cinema München - Cinema München'
              }
            }];

            var results = this.module()["default"]._prepareCliqzResults(input);

            results.forEach(function (result, i) {
              var parts = result.data.kind[0].split('|'),
                  params = JSON.parse(parts[1] || '{}');
              expect(params).to.contain.key('i');
              expect(params.i).to.equal(i);
            });
          });
        });

        describe('isValidQueryForEZ', function () {

          var subject = undefined,
              blacklist = undefined;

          beforeEach(function () {
            subject = this.module()["default"]._isValidQueryForEZ, blacklist;

            blacklist = this.module()["default"].EZ_QUERY_BLACKLIST;
            this.module()["default"].EZ_QUERY_BLACKLIST = ['xxx', 'yyy', 'ggg'];
          });

          afterEach(function () {
            this.module()["default"].EZ_QUERY_BLACKLIST = blacklist;
          });

          it('rejects queries in blacklist', function () {
            this.module()["default"].EZ_QUERY_BLACKLIST.forEach(function (query) {
              expect(subject(query)).to.be["false"];
            });
          });

          it('ignores capitalization', function () {
            this.module()["default"].EZ_QUERY_BLACKLIST.map(function (q) {
              return q.toUpperCase();
            }).forEach(function (query) {
              expect(subject(query)).to.be["false"];
            });

            expect(subject('A')).to.be["false"];
            expect(subject('AA')).to.be["false"];
          });

          it('ignores whitespace', function () {
            this.module()["default"].EZ_QUERY_BLACKLIST.map(function (q) {
              return ' ' + q + ' ';
            }).forEach(function (query) {
              expect(subject(query)).to.be["false"];
            });

            expect(subject(' ')).to.be["false"];
            expect(subject('a ')).to.be["false"];
            expect(subject(' aa ')).to.be["false"];
          });

          it('rejects short queries', function () {
            expect(subject('')).to.be["false"];
            expect(subject('a')).to.be["false"];
            expect(subject('aa')).to.be["false"];
          });

          it('accepts queries not in blacklist longer than 2 chars', function () {
            expect(subject('wwww')).to.be["true"];
            expect(subject('http://www.fac')).to.be["true"];
            expect(subject('wmag')).to.be["true"];
            expect(subject(' www.f')).to.be["true"];
          });
        });

        describe('addEZfromBM', function () {
          var result = {
            url: 'http://www.bild.de/',
            snippet: {
              title: 'Bild',
              desc: 'Bild News'
            },
            extra: {
              data: {
                domain: 'bild.de',
                friendly_url: 'bild.de',
                name: 'Bild',
                template: 'entity-news-1'
              },
              url: 'http://www.bild.de',
              subType: '{"ez": "4573617661040092857"}',
              trigger_urls: ['bild.de']
            }
          };

          beforeEach(function () {
            this.deps("core/cliqz").utils.isCompleteUrl = function () {
              return true;
            };
            this.deps("core/cliqz").utils.getDetailsFromUrl = function () {
              return { name: 'bild' };
            };
          });

          it('should add EZ to empty list', function () {

            var extra = [];

            this.module()["default"]._addEZfromBM(extra, result);

            expect(extra).to.have.length(1);
            expect(extra[0].data.subType).to.equal(result.extra.subType);
            expect(extra[0].comment).to.equal(result.snippet.title);
          });

          it('should add EZ to end of existing list', function () {
            var extra = [{ test: 'abc' }];

            this.module()["default"]._addEZfromBM(extra, result);

            expect(extra).to.have.length(2);
            expect(extra[extra.length - 1].data.subType).to.equal(result.extra.subType);
            expect(extra[extra.length - 1].comment).to.equal(result.snippet.title);
          });
        });

        describe('collectSublinks', function () {
          it('should find nothing', function () {
            var data = {
              dsf: 'Asfd',
              afds: {
                sdfa: {
                  fds: 'fdsa'
                }
              }
            };
            var sublinks = this.module()["default"]._collectSublinks(data);

            expect(sublinks).to.be.empty;
          });

          it('should find with key url', function () {
            var data = {
              dsf: 'Asfd',
              afds: {
                adfs: ['ff', 'ff'],
                sdfa: {
                  url: 'http://www.test.com'
                }
              }
            };
            var sublinks = this.module()["default"]._collectSublinks(data);

            expect(sublinks).to.contain('http://www.test.com');
          });

          it('should find with key href', function () {
            var data = {
              dsf: 'Asfd',
              afds: {
                adfs: ['ff', 'ff'],
                sdfa: {
                  href: 'http://www.test.com'
                }
              }
            };
            var sublinks = this.module()["default"]._collectSublinks(data);

            expect(sublinks).to.contain('http://www.test.com');
          });

          it('should find three', function () {
            var data = {
              dsf: 'Asfd',
              url: 'http://bbb.com',
              afds: {
                adfs: ['ff', 'ff'],
                sdfa: [{
                  href: 'http://www.test.com'
                }, {
                  href: 'http://aaa.com'
                }]
              }
            };
            var sublinks = this.module()["default"]._collectSublinks(data);

            expect(sublinks).to.contain('http://www.test.com');
            expect(sublinks).to.contain('http://aaa.com');
            expect(sublinks).to.contain('http://bbb.com');
          });
        });

        describe('getDuplicates', function () {
          var results, cliqz;
          beforeEach(function () {
            results = [{
              style: 'favicon',
              val: 'https://www.facebook.com/',
              comment: 'Facebook (history generic)!',
              label: 'https://www.facebook.com/',
              query: 'f',
              data: {
                kind: ['H'],
                description: 'Facebook is a social utility.'
              }
            }, {
              style: 'favicon',
              val: 'http://www.fasd-hh.rosenke.de/',
              comment: 'FASD-Hamburg - Startseite (history generic)!',
              label: 'http://www.fasd-hh.rosenke.de/',
              query: 'f',
              data: {
                kind: ['H'],
                description: 'FASD-Hamburg'
              }
            }];

            cliqz = [{
              style: 'cliqz-results sources-m',
              val: 'https://mail.facebook.com/',
              comment: 'Facebook',
              label: 'https://mail.facebook.com/',
              query: 'bm f undefined',
              data: {
                description: 'Facebook ist ein soziales.',
                title: 'Facebook',
                kind: ['m|{"i":0}']
              }
            }, {
              style: 'cliqz-results sources-m',
              val: 'https://fxyz.com/',
              comment: 'FXYZ',
              label: 'https://fxyz.com/',
              query: 'bm f undefined',
              data: {
                description: 'FXYZ is cool',
                title: 'FXYZ',
                kind: ['m|{"i":1}']
              }
            }];
          });

          it('should find no duplicates', function () {
            var duplicates = this.module()["default"]._getDuplicates(results, cliqz);
            expect(duplicates).to.be.empty;
          });

          it('should find one duplicate - main link', function () {
            cliqz[0].label = cliqz[0].val = results[0].label;
            var duplicates = this.module()["default"]._getDuplicates(results, cliqz);
            expect(duplicates).to.have.length(1);
            expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
          });

          it('should find one duplicate - sub link', function () {
            results[0].style = 'cliqz-pattern';
            results[0].data.urls = [{ href: 'https://mail.facebook.com/' }];
            var duplicates = this.module()["default"]._getDuplicates(results, cliqz);
            expect(duplicates).to.have.length(1);
            expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
          });

          it('should find one duplicate - main link different country', function () {
            cliqz[0].label = cliqz[0].val = 'https://de-de.facebook.com/';
            var duplicates = this.module()["default"]._getDuplicates(results, cliqz);
            expect(duplicates).to.have.length(1);
            expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
          });
        });

        describe('deduplicateResults', function () {
          var results, cliqz;
          beforeEach(function () {
            results = [{
              style: 'favicon',
              val: 'https://www.facebook.com/',
              comment: 'Facebook (history generic)!',
              label: 'https://www.facebook.com/',
              query: 'f',
              data: {
                kind: ['H'],
                description: 'Facebook is a social utility.'
              }
            }, {
              style: 'favicon',
              val: 'http://www.fasd-hh.rosenke.de/',
              comment: 'FASD-Hamburg - Startseite (history generic)!',
              label: 'http://www.fasd-hh.rosenke.de/',
              query: 'f',
              data: {
                kind: ['H'],
                description: 'FASD-Hamburg'
              }
            }];

            cliqz = [{
              style: 'cliqz-results sources-m',
              val: 'https://mail.facebook.com/',
              comment: 'Facebook',
              label: 'https://mail.facebook.com/',
              query: 'bm f undefined',
              data: {
                description: 'Facebook ist ein soziales.',
                title: 'Facebook',
                kind: ['m|{"i":0}']
              }
            }, {
              style: 'cliqz-results sources-m',
              val: 'https://fxyz.com/',
              comment: 'FXYZ',
              label: 'https://fxyz.com/',
              query: 'bm f undefined',
              data: {
                description: 'FXYZ is cool',
                title: 'FXYZ',
                kind: ['m|{"i":1}']
              }
            }];
          });

          it('should leave both lists alone', function () {
            var r = this.module()["default"]._deduplicateResults(results, cliqz);

            expect(r.first).to.have.length(2);
            expect(r.second).to.have.length(2);
          });

          it('should remove facebook from cliqz', function () {
            cliqz[0].label = cliqz[0].val = results[0].label;

            var r = this.module()["default"]._deduplicateResults(results, cliqz);

            expect(r.first).to.have.length(2);
            expect(r.second).to.have.length(1);

            // Check kinds are combined properly
            expect(r.first[0].data.kind).to.contain(cliqz[0].data.kind[0]);
          });

          it('should remove facebook from cliqz because of matching sublink', function () {
            results[0].style = 'cliqz-pattern';
            results[0].data.urls = [{ href: 'https://mail.facebook.com/' }];

            var r = this.module()["default"]._deduplicateResults(results, cliqz);

            expect(r.first).to.have.length(2);
            expect(r.second).to.have.length(1);
          });

          it('should remove facebook from cliqz because only different by country', function () {
            cliqz[0].label = cliqz[0].val = 'https://de-de.facebook.com/';

            var r = this.module()["default"]._deduplicateResults(results, cliqz);

            expect(r.first).to.have.length(2);
            expect(r.second).to.have.length(1);

            // Check kinds are combined properly
            expect(r.first[0].data.kind).to.contain(cliqz[0].data.kind[0]);
          });
        });

        describe('isValidEZ', function () {
          var result;

          beforeEach(function () {
            result = {
              style: 'cliqz-extra',
              val: 'https://cliqz.com/',
              comment: 'Cliqz',
              label: 'https://cliqz.com/',
              query: 'cliqz.c',
              data: {
                friendly_url: 'cliqz.com',
                template: 'Cliqz',
                subType: '{"class": "CliqzEZ", "ez": "deprecated"}',
                trigger_urls: ['cliqz.com'],
                ts: 1447772162,
                kind: ['X|{"ez":"-7290289273393613729","trigger_method":"rh_query"}'],
                __subType__: {
                  "class": "CliqzEZ",
                  id: "2700150093133398460",
                  name: "Cliqz 1"
                }
              }
            };
          });

          it('should accept good ez', function () {
            expect(this.module()["default"]._isValidEZ(result)).to.be["true"];
          });

          it('should discard if url is missing', function () {
            delete result.val;
            expect(this.module()["default"]._isValidEZ(result)).to.be["false"];
          });

          it('should discard if data is missing', function () {
            delete result.data;
            expect(this.module()["default"]._isValidEZ(result)).to.be["false"];
          });

          it('should discard if subType is missing or unparsable', function () {
            result.data.subType = 'afsdfdasfdsfds{';
            expect(this.module()["default"]._isValidEZ(result)).to.be["false"];
            delete result.subType;
            expect(this.module()["default"]._isValidEZ(result)).to.be["false"];
          });

          it('should discard if __subType__ is missing or ID is missing', function () {
            delete result.data.__subType__.id;
            expect(this.module()["default"]._isValidEZ(result)).to.be["false"];
            delete result.data.__subType__;
            expect(this.module()["default"]._isValidEZ(result)).to.be["false"];
          });
        });

        describe('cacheEZs', function () {

          function getUrlfunction(smartCliqz) {
            //return CliqzUtils.generalizeUrl(smartCliqz.val, true);
          }

          var saved = false,
              results = {},
              urls = {},
              ezs = {},
              smartCliqzCache = {},
              triggerUrlCache = {},
              ezstore,
              test;

          // Mock CliqzSmartCliqzCache
          beforeEach(function () {
            results = [{
              style: 'cliqz-extra',
              val: 'https://cliqz.com/',
              comment: 'Cliqz',
              label: 'https://cliqz.com/',
              query: 'cliqz.c',
              data: {
                friendly_url: 'cliqz.com',
                template: 'Cliqz',
                subType: '{"class": "CliqzEZ", "ez": "deprecated"}',
                trigger_urls: ['cliqz.com'],
                ts: 1447772162,
                kind: ['X|{"ez":"-7290289273393613729","trigger_method":"rh_query"}'],
                __subType__: {
                  "class": "CliqzEZ",
                  id: "2700150093133398460",
                  name: "Cliqz 1"
                }
              }
            }];

            saved = false;
            urls = {};
            ezs = {};

            triggerUrlCache.retrieve = function (url) {
              if (!(url in urls)) {
                return urls[url];
              } else {
                return false;
              }
            };
            triggerUrlCache.store = function (url, eztype) {
              urls[url] = eztype;
              saved = false;
            };
            triggerUrlCache.save = function () {
              saved = true;
            };

            smartCliqzCache.store = function (ezData) {
              ezs[getUrlfunction(ezData)] = ezData;
            };
            triggerUrlCache.isCached = function () {
              return false;
            };

            this.module()["default"].init({
              smartCliqzCache: smartCliqzCache,
              triggerUrlCache: triggerUrlCache
            });
          });

          it('should cache 1 entry given 1', function () {
            this.module()["default"]._cacheEZs([results[0]]);

            expect(saved).to.be["true"];
            expect(Object.keys(urls)).length.to.be(1);
            expect(urls[results[0].data.trigger_urls[0]]).to.be["true"];
            expect(ezs[getUrlfunction(results[0])]).to.equal(results[0]);
          });

          it('should cache 1 entry given 2 with same URL', function () {
            results.push(JSON.parse(JSON.stringify(results[0])));
            results[1].comment = 'Second entry';
            this.module()["default"]._cacheEZs(results);

            expect(saved).to.be["true"];
            expect(Object.keys(urls)).length.to.be(1);
            expect(urls[results[0].data.trigger_urls[0]]).to.be["true"];

            // require first entry to have priority over the second
            expect(ezs[getUrlfunction(results[0])]).to.equal(results[0]);
          });

          it('should cache 2 entries given 2', function () {
            results.push(JSON.parse(JSON.stringify(results[0])));
            results[1].val = 'http://test.com';
            results[1].data.trigger_urls[0] = 'test.com';
            results[1].data.__subType__ = { id: "1111111111" };

            this.module()["default"]._cacheEZs(results);

            expect(saved).to.be["true"];
            expect(Object.keys(urls)).length.to.be(2);
            results.forEach(function (result) {
              expect(urls[result.data.trigger_urls[0]]).to.be["true"];
              // expect(ezs[getUrlfunction(result)]).to.equal(result);
            });
          });
        });

        describe('historyTriggerEZ', function () {
          var fetching,
              result = {},
              urls = {},
              ezs = {},
              smartCliqzCache = {},
              triggerUrlCache = {};

          // Mock CliqzSmartCliqzCache
          beforeEach(function () {
            result = {
              style: 'cliqz-pattern',
              val: 'https://cliqz.com/',
              comment: 'Cliqz',
              label: 'https://cliqz.com/',
              query: 'cliqz.c',
              data: {
                cluster: true,
                urls: []
              }
            };

            ezs = {
              '-7290289273393613729': {
                style: 'cliqz-extra',
                val: 'https://cliqz.com/',
                comment: 'Cliqz',
                label: 'https://cliqz.com/',
                query: 'cliqz.c',
                data: {
                  friendly_url: 'cliqz.com',
                  template: 'Cliqz',
                  subType: '{"class": "CliqzEZ", "ez": "deprecated"}',
                  trigger_urls: ['cliqz.com'],
                  ts: 1447772162,
                  kind: ['X|{"ez":"-7290289273393613729","trigger_method":"rh_query"}'],
                  __subType__: {
                    "class": "CliqzEZ",
                    id: "2700150093133398460",
                    name: "Cliqz 1"
                  }
                }
              }
            };

            urls = {
              'cliqz.com': true
            };

            fetching = undefined;

            triggerUrlCache.isCached = function (url) {
              return urls[url] ? true : false;
            };

            triggerUrlCache.retrieve = function (url) {
              return urls[url];
            };

            triggerUrlCache.isStale = function () {
              return false;
            };

            smartCliqzCache.fetchAndStore = function (url) {
              fetching = url;
            };

            smartCliqzCache.retrieve = function (url) {
              return ezs[url];
            };

            smartCliqzCache.retrieveAndUpdate = smartCliqzCache.retrieve;

            this.deps("core/cliqz").utils.generalizeUrl = function () {
              return "cliqz.com";
            };
            this.module()["default"].init({
              smartCliqzCache: smartCliqzCache,
              triggerUrlCache: triggerUrlCache
            });
          });

          it('should trigger ez', function () {
            var ez = this.module()["default"]._historyTriggerEZ(result);
            expect(ez).to.equal(ezs[urls['cliqz.com']]);
          });

          it('should not trigger ez but fetch', function () {
            ezs = {};
            var ez = this.module()["default"]._historyTriggerEZ(result);
            expect(ez).to.be.undefined;
            expect(fetching).to.equal('cliqz.com');
          });

          it('should trigger ez because no cluster', function () {
            result.data.cluster = false;
            var ez = this.module()["default"]._historyTriggerEZ(result);
            expect(ez).to.be.undefined;
          });

          it('should trigger ez because cluster base domain inferred', function () {
            result.data.autoAdd = true;
            var ez = this.module()["default"]._historyTriggerEZ(result);
            expect(ez).to.be.undefined;
          });
        });

        describe('filterConflictingEZ', function () {

          var firstResult, ezs;

          beforeEach(function () {
            firstResult = {
              style: 'cliqz-pattern',
              val: 'https://cliqz.com/',
              comment: 'Cliqz',
              label: 'https://cliqz.com/',
              query: 'cliqz.c',
              data: {
                cluster: true,
                urls: []
              }
            };

            ezs = [{
              style: 'cliqz-extra',
              val: 'https://cliqz.com/',
              comment: 'Cliqz',
              label: 'https://cliqz.com/',
              query: 'cliqz.c',
              data: {
                friendly_url: 'cliqz.com',
                template: 'Cliqz',
                subType: '{"class": "CliqzEZ", "ez": "deprecated"}',
                trigger_urls: ['cliqz.com'],
                ts: 1447772162,
                kind: ['X|{"ez":"-7290289273393613729","trigger_method":"rh_query"}'],
                __subType__: {
                  "class": "CliqzEZ",
                  id: "2700150093133398460",
                  name: "Cliqz 1"
                }
              }
            }];
          });

          it('should not conflict if history matches', function () {
            var finalExtra = this.module()["default"]._filterConflictingEZ(ezs, firstResult);
            expect(finalExtra).to.deep.equal(ezs);
          });

          it('should not conflict if no bet', function () {
            firstResult.val = 'http://facebook.com';
            firstResult.data.cluster = false;
            var finalExtra = this.module()["default"]._filterConflictingEZ(ezs, firstResult);
            expect(finalExtra).to.deep.equal(ezs);
          });

          it('should conflict if history bet does not match', function () {
            firstResult.val = 'http://facebook.com';
            var finalExtra = this.module()["default"]._filterConflictingEZ(ezs, firstResult);
            expect(finalExtra).to.have.length(0);
          });

          // Will the autocomplete change if we use this EZ?
          it('should conflict if autocomplete does not match', function () {
            firstResult.val = 'http://facebook.com';
            firstResult.cluster = false;
            firstResult.autocompleted = true;
            var finalExtra = this.module()["default"]._filterConflictingEZ(ezs, firstResult);
            expect(finalExtra).to.have.length(0);
          });
        });
      }));
    }
  };
});
System.register("tests/autocomplete/unit/result-providers-test", [], function (_export) {
  "use strict";

  var ENGINES;
  return {
    setters: [],
    execute: function () {
      ENGINES = [{
        "name": "google",
        "alias": "",
        "icon": "data:image/x-icon;base64,aaabaaiaebaaaaaaaab9aqaajgaaacagaaaaaaaa8giaakmbaacjue5hdqoacgaaaa1jsersaaaaeaaaabaibgaaab/z/2eaaafesurbvdjlpznjswnbeixnt4le4khxovgt9bdwjhqpy0heeojbiaucrg+kudc4qs4krpc4gcbge3nq48jsnz6ez3uom6gjaephqu93v6+qq2q0pqgejj2s8edjt1hr0oxbtkcd5ied8qxdypvhvobaumdkurx9c9apu4ga1gevkzvmg10ubfyvewawgyap00v01fa+r9m2ba51wjvhin3qr+ybt3d3jnqbe5smjciolfpohzowdslro22qa6r6kiziwwxuvy/puqzihyz1vfm9cvcoosyndcbgysisdsjbnzjjmlr0fw8vap0xoz5gao/h+nzby4i/10xgwrpa+hmvdyhvrg2avu/lwcrkfadza16l1h330w1rngc3dijzcppyrm1bpvexx11clqr28xwblhpk1vq1ip/5mcos0coxdzil0vsj+dzfl+3t/vyaaaaasuvork5cyikjue5hdqoacgaaaa1jsersaaaaiaaaacaibgaaahn6evqaaak5surbvfjdxvfrsxrrfj9/jta/oywjf5xqm6d6ekhrgygiigjutcuevgqvwsrrkppeuqywwb8ye1igwilwlo/ude489s7m6zw7d9dlt53dmd29cfiwvxvo77x+51xpaausosxbauwzq4ecy5xji2xkzdycmlmew6lcniosgwzkjk1skckesealfp64t0mbjl4ow39mkdul0p2rsrootqhzdeueym1pbl39xcg/feeftwcy7g9w4csvuxjlbkcsq4nt9qywvfvt6rsakxw3aodgatzeyit+w1kjw7cjg0rctwdtrebbkd8a6h5pwsdb70ba3w/eur3wt/cmwgfw6yft4tnmqay7o1p2ncm4ft4anqh/jqbj2xv7kqixeaddql8es3+n8bku7oxnm+edim/du92upb3t/njgeanbdx/asbslruy5xn92cawxy5d8rv6gwllxsg4faentc90dqw13bllgxr2d3dcuedvkwotha1bxspxilwcm3hdthcfvufb26lcjpkoeaz9nki/lzqpsec7feol5ewnpseslixcalukapmuldjuqxqvaqnl3d/x/yqda4qbeq2tyc12by091mq17bg3r88nhklqbvmhvj89awnblyrwt9zxy2abaxtkgfdisxp/jp6fldw+as7gfsdjtj2eqso5khd43ngfbary/zxoqgzhe7gpm1jzuvchutmnbaxqpckgmjp3fdfgq6nbyehiao4b/yptffqjwnyq/bzkvqgcf90ja25ndiyrkboa/f8wipwi3x1g8ucxnu7ozus7tih0jbswws3riaf1w6lyku/ml2+8sgnjygqswtkrviy/qd9qqp6lno64q4fpakpxyziymho1jwk6p1ag2bsdnwqmhcc+m5khfjx+ylpxpvlbcx2mz5dzpi04k4kuwhhdsku3ph76iftg8ywlkaaaaaelftksuqmcc",
        "code": 3,
        "searchform": "https://www.google.com/search?q=&ie=utf-8&oe=utf-8"
      }, {
        "name": "bing",
        "alias": "#bi",
        "icon": "data:image/x-icon;base64,aaabaaiaebaaaaeacadacwaajgaaacagaaabaagalaiaaaamaacjue5hdqoacgaaaa1jsersaaaaeaaaabaiagaaajcradyaaaajcehzcwaacxmaaastaqcanbgaaappaundufbob3rvc2hvccbjq0mgchjvzmlszqaaenqdu2duu+kwpffe9ejliicus29sfqggukklgbsrjiohcrbkicgh2rvrwrffrqqbykcia46ogiwvuswmigryb+qhoo6do4ikyvvhe6nr1rz35s3+tdc+56zznbppb8aidjzim1e1gaypqh4r4iphxmbh5c5agqokcaaqclnkixp9iwea+h48pcsiwae+aaf40wsiambnm8awhif/d+pcmvwbgiqbwhsroesigbqaqhqoqqyaqeybgj2yjlmaoaqaymtjyumauc0aycd/5tmagj34mxsbafuuirubojeaibnlieqaadsarm9wikuawdaafgzlxdka2c0amelxzkgaslcawm4qc7iacawamfgihskabhsaymgji3gahjkafebyvzzxk64q5yoaahizsjy5jdlfgvsilxehv1cuhijosrcrfdzhamgaqc7cezkzmoe0d+dzzaaaojeveecd8/14zg6uzs42jryoxy3qvwb/imji4/7lz6twqaaa4xr+0f4sl7magdsggg3+oixubghec6b194tmsg9atqcg6dpx83d4fjw8ragqudnz5etk2ereqlthyld9/mfcx8bx/wz5fjz89/xgvuikgtjdguce+odczprmprzpkgmeytzmj0f8twv//b3tisrjyrlykhtjurjxjksajpmypskjqpipxsxs/2ti3yz7az7fnqcwaj4be5etqf1ja/zljxbydmdi9waa8rtvwdqocaoaaiphz3f/7z/9r6alaibmszjxaabercquvmqzp8ciaabeoieqseeb9meylmaghmef3mel/ga2heikxmjceeikziaccmaprijckibnsb0qyc/uqb00wffohpnwdi7cvbgopxap+meinseoviejbehicbnhidqiawkkwcoocbezhfghwugeeoskimmiffeis5e1sdfsilqgvugd8j1yajmhxea6ktviadkc/ia8rzgugbjrpdqmtuo5qdcaheaic9bkddgajxagm9bytbo9jdah59craa/ajz5dxzda6bghm8rsmc7gw0kxocwjk2plssksdkvggrbwrao7ifvjz7f3bbkbrcajngr3qibhhkfiwexytthiqcacjdqr2gk3cqoeucinipoos7qmuhh5xbhimjghwegsi9ysjxmvehuiq8q3jbkjqzinuzacsbgkvnis0kbsblij6sypmzrigiotydpka7ihozqsicvihesd5mpkm+qb5chywwqdykbxppht4ihsympkgeuq5ttlbmwymkfvo5ps3aihvbe1j1pcrag2uq9rh6gtnhwaoc2dfkllpa2ildmaabdo92mv6hs6ed2vhk6x0ffsy+lh6jfoa/r3da2gfyphigcogzsybxhngxcyr5hmphntixnhvda3meuy55kpmw9vwcq2knwvkcokluqvjpubki9uqaqmqt6qc1xzvctuj6leu32urluzu+opcdswq1wqnvdruxttz6k7qieqz6hvvd+kfln9iqzzw0zdt0okuacxx+o8xialyxmzecwhaw2rhnwbncqmsc3zfhyqu5j9hbulpaqpotldm0ozv7ns85rmpwfjmhh4nhrocecop5fzforefo8p4ikbpjrmutflxguqlpewwktiq1grr+u9nq7tp52mvuw7wfubdkhhsidcj0dnj84fnedt2vpdpwqnfk09ovwulqprpruhu0r3v26n7pievl6ankxvp955vef6hh0v/vt9bfqn9ucmwaazdcqg2wzogdzfnxfvpb0vx9vxuundw0bdpwgvyzfhhjg50tyj1uanrg+maczc4ytjbcztxqmmbiyhjktn6k3umljnuayppjtmo0zhzcznos3wmtwbpthxmueb55vxm9+3yfp4wiy2qla4zumy5fqmwe62vg6fwjlzpvhvwl2zrq2drsxwu627pxgnuu6ttque1mfdspg2ybaptxmw5dgg2662bbz9ywdif2e3xa7d7po9k326fy39pqcnh9koqx1ahx5zthiuoly63prono4/fcx0lukvz1jpem/ym+o2e8spxgmdu5vtr2cxz7lzg/oii4llgssulz4umxvg3ci95ep09xfd4xrs9z2bs5vc7ajbr+427mnuh9yfzdsfkz5zm3pqw8hd4fhl0t8ln5uwa9+sfk9dt4fntecjl2mvkvet17c3pxeq92hvfz72pnkf4z7jpdfemt5zx8w3wlfit8tpw2+ex4xfq38j/2t/ev/rakeajqfna4mbqyfbavv4enwhv44/ottl9rlz7ugmollbfugpgq2c5cgtiwji7jctiffnmm6rzmkohvb+6nbqb2hmyyvdfgwnhyefv4y/jnciwbrrmzc1d9hcq3pfrppelktem2cxtzmvluo1kj6qlmo82je6nlo/xi5mwczvwj1yswxlhdkukq42bmy+3/zt84fineil43sxmc/ixxb5oc7c9iwnfqkueiw6lkbmie44lpbbecqofowl8hn3jy4kecidwmcil9e20yjyq1wqhk7yscpneplskbw1estfm6us5bmej6mqvewntn2bop4wmnygbti9or0xg5krkhfcqifnk7zn6mfmznblrgwfsv7fbou3lx6vb8lrs5csbvktcrzcpuhuwijxkgeyz2vxzr/nico5lquek83tzlpk25a3no+f/+0swhlhkralhktxlr1y5r2sajmyphf52wrjfqurhlygrdy4iryqbdvpq+1xl65+vsz6twubxshkgsg1awvrc1uk5yv969zx7v1pwc9z37vh+oadgz4viyqufnsxlxv/2cjceoubh2/kv5ncllspq8s5zm9m0mbp5t4tnlsolqqx5pcobg3z2rqn31a07fx2rdsvl80o27udtko5o788ulxlp8nozts/vkru9ft6vdbu0t21ydf4bthug3u89jts1dtbvpf9psm+21ubvu3vztvl+0n7s/c/romq6fiw+21dru5tce3ha9id/qcjdrbxudtvhdi9vfkp1ivrrw7hh77+ne93lq02dvwnnmbii3beeetp9wnf9x4notp2jhus4qfth3ydzx0vakka8ppgm1oa+1tiw7ppzd7r1ureevxh2x8pndq8wxlk81tjadrpgtotz/lpjj2vnx1+lvncynuitnvny87fag9v77oqdohsrf+l5zu8o85c8rh08rlb5rnxufearzpfbep06jz+k9npx7ucu5quuvxrue56vbv7zvfpg543zt30vxnxfv/w1z45pd2983pv98x39d8w3x5yj/3oy7vzdyfurbxpvf/0qo1b2updh9u/w/7c2o/cf2rad6dz0dxh9wafg8/+kfwpd0mfj5mpy4ynhuueod45oei/cv3p/kddz2tpjp4x/ql+y64xfi9++nxr187rmnghl/kxk79tfkx96sdrga/bxslghr7jedmxxvrw++3bd9x3he+j3w9p5hwgfyj/apmx9vpqp/utgzot/wqdmpp8yzmt2waaacbjsfjnaab6jqaagimaapn/aaca6qaadtaaaopgaaa6maaaf2+sx8vgaaabbuleqvr42ml8v4objmaez/0ntgmlnlxtitkro9jmci9cnr/wsp8mrohfp8ybl4rvvbbwfxuvi/wgsjmyshusmujby8ln/ttm4bmo1btw5n+endippmndbrhjqiin6x9duzc2yk8tlz7hc5kx/atzxecmdazff7mcuys9/7goat8wmjauoz9x0xhi2a98hl+eub/vusg/8ozgmy+ceef+zp/ynyjxfvptv9o63flpbx6iccvz32dd24egt7fo4gb/zcx2z84rpbiiqfylzjtl4rzfsdvjuf3r91+sc09o//7ljmn/ndxmkqhssyzeq0t8j9/znn8s7ql9dy34cwogibuscqadaj+jwqrh9lcsaaaaaelftksuqmccivborw0kggoaaaansuheugaaacaaaaagcaiaaad8go2jaaacw0leqvr4ngp8v5obpocjtsbtwqiwtkguxe5mci9m5v/osl9mzf5hoqwmmheqod0awubg/wmo+8pb/zgzwguylcdiazj48zvl+d2ptz/yklgacbxcfszctulewuahgdqw3hstcoof8p//jkragc+skqe/58/0pa7c7l9n5v+aktw3kh3fxvkxmhyi83y3vxl64jbs3htye2/isbh8nzb9zabw3ft+jr/ntypywmdaegbw+8atwqj71x/mu/clt92xzgt8ry7+zlzxhbnic0n+lxrzic/8yuju5blh4sic//8z3nghfoof8mlj2jkcnydh7extrvoqcjc4g0f2yxtetehslncvft0wcnhm4qxxiymeiiiatcm3mpjvn37gmx7q8oozyylqyclotz/wldulryzpdmt4qff6nzz95gvnyjma+27i/sm6xxgwqjj7r6rtjqyghk8/2naeu9t+rfh3x2zcihwep5fmgazg53qfy9zsv1ed0dh4uexbl5ykudl/r5tdd9o6t4ifghjvyz1ohbkts/qc2qfv7liumtiwogk8irw4yo8jp2o3wezxubhcy7i1dq+/coiymogbqvn0q5rtrtxx93juylfax+b1sw88p+5l4thgy/er2uy6m9ydrsb/ejrht8bs+emcy7q4ndaymlhppyixumbd/gu/0vd1wbtezz7w9o81vvnkee1ctfxdmu0lzdepxbinzwigboa//xhxndfyfu4nusnwcf6ms7jmppgq1bohpwuqcoof0ot9roayryjnr3oz/ybrccisobwmmkp/8foaadmgy6ulkggyaaaaaelftksuqmcc",
        "code": 5,
        "searchform": "https://www.bing.com/search?q=&pc=mozi"
      }, {
        "name": "amazon.com",
        "alias": "amazon",
        "icon": "data:image/x-icon;base64,aaabaaiaebaaaaaaaac0aqaajgaaacagaaaaaaaa6qiaanobaacjue5hdqoacgaaaa1jsersaaaaeaaaabaibgaaab/z/2eaaaf7surbvdjllzplasjafiafrf+ivv+h6ho0gf+gvb9aahwdt64qcg03tqgtdcfiuyhuelmgli66mxthst24knifbulayi6ezjnnxsuawb/itp7v/hnmjgqaeazzpghs/gwctytexuxl2u6na8viebk5hkler28cvrawnb9ptvrah8mrqucaz4ia8fziqsgcxwzptiasun/rwgwdylwcubqfzfkgszlgqdmee7yen8voakyaskuw4nnbafmnyikzpdrx1wqwbbzp089n5f/neqsfl4wqqtsbwjlzdajr5pwsmm1awezzdxibgi3hvc6jczevfgrqrwpy7qcw3ktgfpr8wlrxcpaot/x4gs95mppff6dx9n2a3f+kazycat8bazju6r6b/dud6d3byg9wqq/tkyzhy1bleiz5lmqygc95mro6r2cxgpjcbxgnsjvviolpxjiraeoijjre10juua4sr8v+mo17vvmgqtuocdnlwut8ztqjcj0njifyb2bgtdkh6w4baaaaaelftksuqmccivborw0kggoaaaansuheugaaacaaaaagcayaaabzenr0aaacseleqvryw71xqwsturbe2lqgenklb+tvemt6txctensd/qgc6veigdx5s+ekpqqfgjhlndflbwmp7cu0osawjb70koc9whbvq5so8+xts14mr7svyaydh9m87jv55puzt1npi4yizjmemj7t9owji88455ngc1czx+nsdesumjmpfdwiaqrx6z00gg1qt9vjkjgfgueuo16vy3rjezkymzm9+my1fsm9i9h9zyv7zaznzra4faofvwj1z+wuoysrg1lnmolkhjx4k0igzi5sarywf7vezek0rvo6iyusujfljuqm7zysqrdira4oouzpmnzsnrsl8uvtpkjajh1gzmaspj8mawmyezb5urhrhw5snofuccdo47w1bvpzsp2qahipy3nz1kalg8ducebqm5avpgelqfar01ngizsdco7zb7vasu2yigiyl5tjqcl7q5ykfqxklcqq7dbhthialk/iwakor82xpihshxwabcyiodmz51sexcvi0xog4dpliyvjjktark3scdqnrvo0mdtruhgikzcp4tngo6baei08eqh9z2qow0hypypjgia9p6jwkcn4sa8jskmjidgyrvpjkcrxjfuwngr/i8+mo32ihzwithbd4nm60bet9p77/uba728rltjmiwih6zeefvirwdzftqmmj7w/ofidbzd5m3mvzgwjcop2kmililcke45hopwurwcsg0+uqrd4zyxxid+t7gqb9+4q9sioy5ltrog3l5vqxiijffdx/aui83zj7jr2ohceu8hh6/m+i7owgivxbwkhsz+o3vsoakqfqdsfgqejuikd7wv9ykxbgcesuc3v2km5ejhlhdh3ncgcplg1bxzu98sdmtuba4fsmnz9fnijuagzs+emc540xur0ado2l8y3qpymcdom+r/8xcqra3qp9gaaaabjru5erkjggg==",
        "code": 7,
        "searchform": "http://www.amazon.com/exec/obidos/external-search/?field-keywords=&mode=blended&tag=mozilla-20&sourceid=mozilla-search"
      }, {
        "name": "youtube",
        "alias": "#yt",
        "icon": "data:image/gif;base64,r0lgodlheganaomkaaaaabuvfroagisrkzk5ouxmtgrkzls0tm/pz9/f3////////////////////////yh5baekaa8alaaaaaasaa0aaart8ml5arg3nmkluqihxmruyniwsceanyawakocgisbjc4mskmdwpjbhfc/h+xhqaemsuso9efrnscmezrdcomagbgbsuf0phjq9wipnyjb9/umfyiaow==",
        "code": 1,
        "searchform": "http://www.google.de"
      }];

      _export("default", describeModule("autocomplete/result-providers", function () {
        return {
          "core/cliqz": { utils: { log: function log() {} } },
          "autocomplete/result": { "default": {} },
          "autocomplete/calculator": { "default": {} },
          "core/search-engines": { setSearchEngine: function setSearchEngine() {} }
        };
      }, function () {
        describe('custom search - #team', function () {
          it('should return #team result', function () {
            var team = this.module()["default"].customizeQuery('#team'),
                expected = { "updatedQ": "#team", "engineName": "CLIQZ", "queryURI": "https://cliqz.com/team/", "code": "#" };
            chai.expect(team).to.deep.equal(expected);
          });
        });

        describe('custom search - maps', function () {
          var queryURI = "https://maps.google.de/maps?q=wisen";

          beforeEach(function () {
            this.deps("core/cliqz").utils.getEngineByAlias = function (alias) {
              if (alias === "#gm") {
                return {
                  name: "Google Maps"
                };
              }
            };
            this.deps("core/cliqz").utils.getSearchEngines = function () {
              return [{
                name: "Google Maps",
                getSubmissionForQuery: function getSubmissionForQuery() {
                  return queryURI;
                }
              }];
            };
          });

          it('should return google maps result for wisen', function () {
            var customQuery = this.module()["default"].customizeQuery('#gm wisen'),
                expected = { "updatedQ": "wisen", "engineName": "Google Maps", queryURI: queryURI, "code": 2 };

            chai.expect(customQuery).to.deep.equal(expected);
          });

          it('should return google maps result for wisen when shortcut is in the end', function () {
            var customQuery = this.module()["default"].customizeQuery('wisen #gm'),
                expected = { "updatedQ": "wisen", "engineName": "Google Maps", "queryURI": "https://maps.google.de/maps?q=wisen", "code": 2 };

            chai.expect(customQuery).to.deep.equal(expected);
          });
        });

        describe('custom search - updateAliases', function () {
          beforeEach(function () {
            var CliqzResultProviders = this.module()["default"];
            this.deps("core/cliqz").utils.getEngineByName = function (name) {
              return ENGINES.find(function (engine) {
                return engine.name === name;
              });
            };
            this.deps("core/cliqz").utils.updateAlias = function (name, newAlias) {
              for (var engine in ENGINES) {
                if (ENGINES[engine].name === name) {
                  ENGINES[engine].alias = newAlias;
                }
              }
            };
            this.deps("core/cliqz").utils.getSearchEngines = function () {
              return ENGINES.map(function (e) {
                e.prefix = CliqzResultProviders.getShortcut(e.name);
                return e;
              });
            };
          });

          it('should update an empty alias to first 2 letters', function () {
            var resultProviders = this.module()["default"];
            //arrange
            var expected = "#go";

            //act
            resultProviders.updateEngineAliases();

            //asert
            chai.expect(resultProviders.getEngineByName('google').alias).to.equal(expected);
          });
        });
      }));
    }
  };
});
System.register('tests/autocomplete/unit/url-compare-test', [], function (_export) {
  'use strict';

  var expect;
  return {
    setters: [],
    execute: function () {
      expect = chai.expect;

      _export('default', describeModule("autocomplete/url-compare", function () {
        return {};
      }, function () {
        describe('sameUrls', function () {
          it('returns same if identical', function () {
            var url = 'http://www.facebook.com/';
            expect(this.module()['default'].sameUrls(url, url)).to.be['true'];
          });

          it('returns same if identical except www', function () {
            var url1 = 'http://facebook.com/';
            var url2 = 'http://www.facebook.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['true'];
          });

          it('returns same if identical except http', function () {
            var url1 = 'http://www.facebook.com/';
            var url2 = 'https://www.facebook.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['true'];
          });

          it('returns same if identical except no scheme', function () {
            var url1 = 'www.facebook.com/';
            var url2 = 'https://www.facebook.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['true'];
          });

          it('returns same if identical except no scheme and no www', function () {
            var url1 = 'facebook.com/';
            var url2 = 'https://www.facebook.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['true'];
          });

          it('returns same if identical except country code in domain', function () {
            var url1 = 'de.facebook.com/';
            var url2 = 'www.facebook.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['true'];
          });

          it('returns same if identical except country code in path', function () {
            var url1 = 'www.facebook.com/de';
            var url2 = 'www.facebook.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['true'];
          });

          it('returns same if identical except country code in domain facebook-style', function () {
            var url1 = 'de-de.facebook.com/';
            var url2 = 'www.facebook.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['true'];
          });

          it('returns same if identical except trailing slash', function () {
            var url1 = 'http://www.facebook.com';
            var url2 = 'http://www.facebook.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['true'];
          });

          it('returns not same if different domain', function () {
            var url1 = 'http://www.facebook.com/';
            var url2 = 'http://www.google.com/';
            expect(this.module()['default'].sameUrls(url1, url2)).to.be['false'];
          });
        });
      }));
    }
  };
});
System.register('tests/mobile-history/history-test', [], function (_export) {
  'use strict';

  return {
    setters: [],
    execute: function () {
      _export('default', describeModule('mobile-history/history', function () {
        return {
          'core/utils': { 'default': {} },
          'core/templates': { 'default': { tplCache: {} } },
          'mobile-history/webview': {
            document: {
              body: {},
              documentElement: {},
              getElementById: function getElementById() {
                return { addEventListener: function addEventListener() {} };
              }
            }
          }
        };
      }, function () {
        var _done = undefined;
        beforeEach(function () {
          var _this = this;

          this.module()['default'].displayData = function (data) {
            return _this.module()['default'].sendShowTelemetry(data);
          };
          this.deps('core/utils')['default'].getLocalStorage = function (_) {
            return { getObject: function getObject() {
                return [];
              } };
          };
          this.deps('core/utils')['default'].BRANDS_DATABASE = { buttons: true };
          this.deps('core/utils')['default'].telemetry = function (msg) {
            chai.expect(msg).to.be.ok;
            chai.expect(msg.action).to.equal('show');
            _done();
          };
          this.deps('core/templates')['default'].tplCache.conversations = function (_) {};
        });
        describe('Telemetry', function () {
          it('Should send show telemetry signal for history', function (done) {
            _done = done;
            this.module()['default'].showHistory([]);
          });
          it('Should send show telemetry signal for favorites', function (done) {
            _done = done;
            this.module()['default'].showFavorites([]);
          });
        });
      }));
    }
  };
});
System.register('tests/mobile-ui/ui-test', [], function (_export) {
  /* global chai, describeModule */

  'use strict';

  return {
    setters: [],
    execute: function () {
      _export('default', describeModule('mobile-ui/UI', function () {
        return {
          'mobile-ui/webview': {
            window: {
              addEventListener: function addEventListener() {},
              document: {
                getElementById: function getElementById() {}
              }
            }
          },
          'core/templates': {
            'default': {
              TEMPLATES: []
            }
          }
        };
      }, function () {
        var NO_MOBILE_URL_RESULT = {
          'val': 'http://www.onmeda.de/krankheiten/magersucht.html'
        };
        var MOBILE_URL_RESULT = {
          'val': 'http://www.onmeda.de/krankheiten/magersucht.html',
          'data': {
            'mobile_url': 'http://www.onmeda.de/amp/krankheiten/magersucht.html'
          }
        };
        var M_URL_RESULT = {
          'internal_links': [{
            'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#Leben',
            'title': 'Leben',
            'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#Leben'
          }, {
            'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#K.C3.BCnstlerischer_Werdegang',
            'title': 'Künstlerischer Werdegang',
            'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#K.C3.BCnstlerischer_Werdegang'
          }, {
            'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#Diskografie',
            'title': 'Diskografie',
            'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#Diskografie'
          }, {
            'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#Weblinks',
            'title': 'Weblinks',
            'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#Weblinks'
          }, {
            'm_url': 'http://de.m.wikipedia.org/wiki/Thom_Yorke#Quellen',
            'title': 'Quellen',
            'url': 'http://de.wikipedia.org/wiki/Thom_Yorke#Quellen'
          }]
        };
        describe('Set Mobile urls', function () {
          it('should not replace val if no mobile url supported', function () {
            this.module()['default'].setMobileBasedUrls(NO_MOBILE_URL_RESULT);
            chai.expect(NO_MOBILE_URL_RESULT.val).to.equal('http://www.onmeda.de/krankheiten/magersucht.html');
          });
          it('should set val with amp_url', function () {
            this.module()['default'].setMobileBasedUrls(MOBILE_URL_RESULT);
            chai.expect(MOBILE_URL_RESULT.val).to.equal('http://www.onmeda.de/amp/krankheiten/magersucht.html');
          });
          it('should set links url with m_url', function () {
            this.module()['default'].setMobileBasedUrls(M_URL_RESULT);
            M_URL_RESULT.internal_links.forEach(function (link) {
              return chai.expect(link.url).to.equal(link.m_url);
            });
          });
        });
      }));
    }
  };
});
System.register("yt-downloader/background", [], function (_export) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", {
        init: function init(settings) {},

        unload: function unload() {},

        beforeBrowserShutdown: function beforeBrowserShutdown() {}
      });
    }
  };
});
System.register('yt-downloader/main', [], function (_export) {
  'use strict';

  /*
  This provides the downloadable link for youtube videos.
  Most of the regex and concepts have been picked up from https://github.com/gantt/downloadyoutube.
  
  The idea would be to move the patterns and other config to a web-service so that if patterns change we can easily update the changes.
  */

  var TITLE_REGEX, FORMAT_LABEL, FORMAT_TYPE, FORMAT_ORDER, FORMAT_RULE, SHOW_DASH_FORMATS;

  function findMatch(text, regexp) {
    var matches = text.match(regexp);
    return matches ? matches[1] : null;
  }

  function findVideoLinks(youtubePageContent) {
    osAPI.notifyYoutubeVideoUrls(get_links(youtubePageContent));
  }

  function getSeparators(videoFormats) {
    var sep1 = undefined,
        sep2 = undefined,
        sep3 = undefined;
    if (videoFormats.indexOf(',') > -1) {
      sep1 = ',';
      sep2 = videoFormats.indexOf('&') > -1 ? '&' : '\\u0026';
      sep3 = '=';
    } else {
      sep1 = '%2C';
      sep2 = '%26';
      sep3 = '%3D';
    }
    return { sep1: sep1, sep2: sep2, sep3: sep3 };
  }

  function get_links(bodyContent) {
    var videoID = null,
        videoFormats = undefined,
        videoAdaptFormats = undefined,
        videoManifestURL = undefined;

    if (bodyContent !== null) {
      videoID = findMatch(bodyContent, /\"video_id\":\s*\"([^\"]+)\"/);
      videoFormats = findMatch(bodyContent, /\"url_encoded_fmt_stream_map\":\s*\"([^\"]+)\"/);
      videoAdaptFormats = findMatch(bodyContent, /\"adaptive_fmts\":\s*\"([^\"]+)\"/);
      videoManifestURL = findMatch(bodyContent, /\"dashmpd\":\s*\"([^\"]+)\"/);
    }

    var videoTitle = findMatch(bodyContent, TITLE_REGEX);
    videoTitle = videoTitle ? videoTitle : 'Youtube Video';

    // parse the formats map

    var _getSeparators = getSeparators(videoFormats);

    var sep1 = _getSeparators.sep1;
    var sep2 = _getSeparators.sep2;
    var sep3 = _getSeparators.sep3;

    var videoURL = [];
    var videoSignature = [];
    if (videoAdaptFormats) {
      videoFormats = videoFormats + sep1 + videoAdaptFormats;
    }

    var videoFormatsGroup = videoFormats.split(sep1);
    for (var i = 0; i < videoFormatsGroup.length; i++) {
      var videoFormatsElem = videoFormatsGroup[i].split(sep2);
      var videoFormatsPair = [];
      for (var j = 0; j < videoFormatsElem.length; j++) {
        var pair = videoFormatsElem[j].split(sep3);
        if (pair.length === 2) {
          videoFormatsPair[pair[0]] = pair[1];
        }
      }
      if (videoFormatsPair['url'] === null) {
        continue;
      }
      var url = unescape(unescape(videoFormatsPair['url'])).replace(/\\\//g, '/').replace(/\\u0026/g, '&');
      if (videoFormatsPair['itag'] === null) {
        continue;
      }
      var itag = videoFormatsPair['itag'];
      var sig = videoFormatsPair['sig'] || videoFormatsPair['signature'];
      if (sig) {
        url = url + '&signature=' + sig;
        videoSignature[itag] = null;
      } else if (videoFormatsPair['s']) {
        url = url + '&signature=' + videoFormatsPair['s'];
        videoSignature[itag] = videoFormatsPair['s'];
      }
      if (url.toLowerCase().indexOf('ratebypass') === -1) {
        // speed up download for dash
        url = url + '&ratebypass = yes';
      }
      if (url.toLowerCase().indexOf('http') === 0) {
        // validate URL
        videoURL[itag] = url + '&title=' + videoTitle;
      }
    }

    var showFormat = [];
    for (var category in FORMAT_RULE) {
      var rule = FORMAT_RULE[category];
      for (var index in FORMAT_TYPE) {
        if (FORMAT_TYPE[index] === category) {
          showFormat[index] = rule === 'all';
        }
      }
      if (rule === 'max') {
        for (var i = FORMAT_ORDER.length - 1; i >= 0; i--) {
          var format = FORMAT_ORDER[i];
          if (FORMAT_TYPE[format] === category && videoURL[format] !== undefined) {
            showFormat[format] = true;
            break;
          }
        }
      }
    }

    var downloadCodeList = [];
    for (var i = 0; i < FORMAT_ORDER.length; i++) {
      var format = FORMAT_ORDER[i];
      if (format === '37' && videoURL[format] === undefined) {
        // hack for dash 1080p
        if (videoURL['137']) {
          format = '137';
        }
        showFormat[format] = showFormat['37'];
      } else if (format === '38' && videoURL[format] === undefined) {
        // hack for dash 4K
        if (videoURL['138'] && !videoURL['266']) {
          format = '138';
        }
        showFormat[format] = showFormat['38'];
      }
      if (!SHOW_DASH_FORMATS && format.length > 2) {
        continue;
      }
      if (videoURL[format] !== undefined && FORMAT_LABEL[format] !== undefined && showFormat[format]) {
        downloadCodeList.push({ url: encodeURIComponent(videoURL[format]), sig: videoSignature[format], format: format, label: FORMAT_LABEL[format] });
        console.log('DYVAM - Info: itag' + format + ' url:' + videoURL[format]);
      }
    }

    if (downloadCodeList.length === 0) {
      console.log('No download URL found. Probably YouTube uses encrypted streams.');
    }
    return downloadCodeList;
  }

  return {
    setters: [],
    execute: function () {
      TITLE_REGEX = /<meta\s+name="title"\s+content="([^"]*)">/;
      FORMAT_LABEL = { '5': 'FLV 240p', '18': 'MP4 360p', '22': 'MP4 720p', '34': 'FLV 360p', '35': 'FLV 480p', '37': 'MP4 1080p', '38': 'MP4 2160p', '43': 'WebM 360p', '44': 'WebM 480p', '45': 'WebM 720p', '46': 'WebM 1080p', '135': 'MP4 480p - no audio', '137': 'MP4 1080p - no audio', '138': 'MP4 2160p - no audio', '139': 'M4A 48kbps - audio', '140': 'M4A 128kbps - audio', '141': 'M4A 256kbps - audio', '264': 'MP4 1440p - no audio', '266': 'MP4 2160p - no audio', '298': 'MP4 720p60 - no audio', '299': 'MP4 1080p60 - no audio' };
      FORMAT_TYPE = { '5': 'flv', '18': 'mp4', '22': 'mp4', '34': 'flv', '35': 'flv', '37': 'mp4', '38': 'mp4', '43': 'webm', '44': 'webm', '45': 'webm', '46': 'webm', '135': 'mp4', '137': 'mp4', '138': 'mp4', '139': 'm4a', '140': 'm4a', '141': 'm4a', '264': 'mp4', '266': 'mp4', '298': 'mp4', '299': 'mp4' };
      FORMAT_ORDER = ['5', '18', '34', '43', '35', '135', '44', '22', '298', '45', '37', '299', '46', '264', '38', '266', '139', '140', '141'];
      FORMAT_RULE = { 'flv': 'none', 'mp4': 'all', 'webm': 'max', 'm4a': 'max' };

      // all = display all versions, max = only highest quality version, none = no version
      // the default settings show all MP4 videos, the highest quality FLV and no WebM
      SHOW_DASH_FORMATS = false;

      _export('findVideoLinks', findVideoLinks);
    }
  };
});
System.register("yt-downloader/window", ["yt-downloader/main"], function (_export) {
  "use strict";

  var findVideoLinks, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_ytDownloaderMain) {
      findVideoLinks = _ytDownloaderMain.findVideoLinks;
    }],
    execute: function () {
      _default = (function () {
        function _default(settings) {
          _classCallCheck(this, _default);

          this.window = settings.window;
        }

        _createClass(_default, [{
          key: "init",
          value: function init() {
            this.window.ytdownloader = { findVideoLinks: findVideoLinks };
          }
        }, {
          key: "unload",
          value: function unload() {}
        }]);

        return _default;
      })();

      _export("default", _default);
    }
  };
});//# sourceMappingURL=app.map