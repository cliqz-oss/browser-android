System.register('antitracking/attrack', ['antitracking/pacemaker', 'antitracking/persistent-state', 'antitracking/temp-set', 'antitracking/webrequest-context', 'antitracking/tp_events', 'antitracking/md5', 'antitracking/url', 'antitracking/domain', 'antitracking/hash', 'antitracking/tracker-txt', 'antitracking/bloom-filter', 'antitracking/time', 'antitracking/qs-whitelists', 'antitracking/block-log', 'core/cliqz', 'core/resource-loader', 'core/background', 'antitracking/cookie-checker', 'antitracking/tracker-proxy', 'antitracking/utils', 'antitracking/privacy-score', 'platform/browser', 'core/webrequest', 'antitracking/telemetry'], function (_export) {
    /*
     * This module prevents user from 3rd party tracking
     */
    'use strict';

    var pacemaker, persist, TempSet, HttpRequestContext, tp_events, md5, parseURL, dURIC, getHeaderMD5, URLInfo, shuffle, findOauth, getGeneralDomain, sameGeneralDomain, HashProb, TrackerTXT, sleep, getDefaultTrackerTxtRule, AttrackBloomFilter, datetime, QSWhitelist, BlockLog, utils, events, Promise, ResourceLoader, core, CookieChecker, TrackerProxy, compressionAvailable, splitTelemetryData, compressJSONToBase64, generatePayload, PrivacyScore, browser, WebRequest, telemetry, countReload, CliqzAttrack;

    function onUrlbarFocus() {
        countReload = true;
    }

    /**
     * Add padding characters to the left of the given string.
     *
     * @param {string} str  - original string.
     * @param {string} char - char used for padding the string.
     * @param {number} size - desired size of the resulting string (after padding)
    **/
    function leftpad(str, char, size) {
        // This function only makes sens if `char` is a character.
        if (char.length != 1) {
            throw new Error("`char` argument must only contain one character");
        }

        if (str.length >= size) {
            return str;
        } else {
            return char.repeat(size - str.length) + str;
        }
    }

    /**
     * Remove any trace of source domains, or hashes of source domains
     * from the data to be sent to the backend. This is made to ensure
     * there is no way to backtrack to user's history using data sent to
     * the backend.
     *
     * Replace all the keys of `trackerData` (which are 16-chars prefixes of
     * hash of the source domain) by unique random strings of size 16 (which is
     * expected by backend). We don't have to make them unique among all data,
     * it is enough to ensure unicity on a per-tracker basis.
     *
     * @param {Object} trackerData - associate source domains to key/value pairs.
    **/
    function anonymizeTrackerTokens(trackerData) {
        // Random base id
        var min = 1;
        var max = Number.MAX_SAFE_INTEGER;
        var randId = Math.floor(Math.random() * (max - min + 1)) + min;

        // Anonymize the given tracker data
        var anonymizedTrackerData = {};

        for (var originalKey in trackerData) {
            var newRandomKey = leftpad(randId.toString().substr(0, 16), '0', 16);
            randId = (randId + 1) % max;
            anonymizedTrackerData[newRandomKey] = trackerData[originalKey];
        }

        return anonymizedTrackerData;
    }

    return {
        setters: [function (_antitrackingPacemaker) {
            pacemaker = _antitrackingPacemaker['default'];
        }, function (_antitrackingPersistentState) {
            persist = _antitrackingPersistentState;
        }, function (_antitrackingTempSet) {
            TempSet = _antitrackingTempSet['default'];
        }, function (_antitrackingWebrequestContext) {
            HttpRequestContext = _antitrackingWebrequestContext['default'];
        }, function (_antitrackingTp_events) {
            tp_events = _antitrackingTp_events['default'];
        }, function (_antitrackingMd5) {
            md5 = _antitrackingMd5['default'];
        }, function (_antitrackingUrl) {
            parseURL = _antitrackingUrl.parseURL;
            dURIC = _antitrackingUrl.dURIC;
            getHeaderMD5 = _antitrackingUrl.getHeaderMD5;
            URLInfo = _antitrackingUrl.URLInfo;
            shuffle = _antitrackingUrl.shuffle;
            findOauth = _antitrackingUrl.findOauth;
        }, function (_antitrackingDomain) {
            getGeneralDomain = _antitrackingDomain.getGeneralDomain;
            sameGeneralDomain = _antitrackingDomain.sameGeneralDomain;
        }, function (_antitrackingHash) {
            HashProb = _antitrackingHash.HashProb;
        }, function (_antitrackingTrackerTxt) {
            TrackerTXT = _antitrackingTrackerTxt.TrackerTXT;
            sleep = _antitrackingTrackerTxt.sleep;
            getDefaultTrackerTxtRule = _antitrackingTrackerTxt.getDefaultTrackerTxtRule;
        }, function (_antitrackingBloomFilter) {
            AttrackBloomFilter = _antitrackingBloomFilter.AttrackBloomFilter;
        }, function (_antitrackingTime) {
            datetime = _antitrackingTime;
        }, function (_antitrackingQsWhitelists) {
            QSWhitelist = _antitrackingQsWhitelists['default'];
        }, function (_antitrackingBlockLog) {
            BlockLog = _antitrackingBlockLog['default'];
        }, function (_coreCliqz) {
            utils = _coreCliqz.utils;
            events = _coreCliqz.events;
            Promise = _coreCliqz.Promise;
        }, function (_coreResourceLoader) {
            ResourceLoader = _coreResourceLoader['default'];
        }, function (_coreBackground) {
            core = _coreBackground['default'];
        }, function (_antitrackingCookieChecker) {
            CookieChecker = _antitrackingCookieChecker['default'];
        }, function (_antitrackingTrackerProxy) {
            TrackerProxy = _antitrackingTrackerProxy['default'];
        }, function (_antitrackingUtils) {
            compressionAvailable = _antitrackingUtils.compressionAvailable;
            splitTelemetryData = _antitrackingUtils.splitTelemetryData;
            compressJSONToBase64 = _antitrackingUtils.compressJSONToBase64;
            generatePayload = _antitrackingUtils.generatePayload;
        }, function (_antitrackingPrivacyScore) {
            PrivacyScore = _antitrackingPrivacyScore.PrivacyScore;
        }, function (_platformBrowser) {
            browser = _platformBrowser;
        }, function (_coreWebrequest) {
            WebRequest = _coreWebrequest['default'];
        }, function (_antitrackingTelemetry) {
            telemetry = _antitrackingTelemetry['default'];
        }],
        execute: function () {
            countReload = false;
            CliqzAttrack = {
                VERSION: '0.96',
                MIN_BROWSER_VERSION: 35,
                LOG_KEY: 'attrack',
                VERSIONCHECK_URL: 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
                URL_ALERT_RULES: 'chrome://cliqz/content/anti-tracking-rules.json',
                URL_BLOCK_RULES: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-block-rules.json',
                ENABLE_PREF: 'antiTrackTest',
                debug: false,
                msgType: 'attrack',
                timeCleaningCache: 180 * 1000,
                timeAfterLink: 5 * 1000,
                timeActive: 20 * 1000,
                timeBootup: 10 * 1000,
                bootupTime: Date.now(),
                bootingUp: true,
                whitelist: null,
                obsCounter: {},
                similarAddon: false,
                blockingFailed: {},
                trackReload: {},
                reloadWhiteList: {},
                tokenDomainCountThreshold: 2,
                safeKeyExpire: 7,
                localBlockExpire: 24,
                shortTokenLength: 8,
                safekeyValuesThreshold: 4,
                cChecker: new CookieChecker(),
                qsBlockRule: null, // list of domains should be blocked instead of shuffling
                blocked: null, // log what's been blocked
                placeHolder: '',
                tp_events: tp_events,
                tokens: null,
                instantTokenCache: {},
                requestKeyValue: null,
                recentlyModified: new TempSet(),
                cliqzHeader: 'CLIQZ-AntiTracking',
                replacement: "",
                obfuscate: function obfuscate(s, method, replacement) {
                    // used when action != 'block'
                    // default is a placeholder
                    switch (method) {
                        case 'empty':
                            return '';
                        case 'replace':
                            return shuffle(s);
                        case 'same':
                            return s;
                        case 'placeholder':
                            return CliqzAttrack.placeHolder;
                        default:
                            return CliqzAttrack.placeHolder;
                    }
                },
                bootupWhitelistCache: {},
                blockedCache: {},
                visitCache: {},
                contextOauth: {},
                linksFromDom: {},
                cookiesFromDom: {},
                loadedTabs: {},
                breakageCache: {},
                getBrowserMajorVersion: function getBrowserMajorVersion() {
                    try {
                        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
                        return parseInt(appInfo.version.split('.')[0]);
                    } catch (e) {
                        // fallback for when no version API
                        return 100;
                    }
                },
                getPrivateValues: function getPrivateValues(window) {
                    // creates a list of return values of functions may leak private info
                    var p = {};
                    // var navigator = utils.getWindow().navigator;
                    var navigator = window.navigator;
                    // plugins
                    for (var i = 0; i < navigator.plugins.length; i++) {
                        var name = navigator.plugins[i].name;
                        if (name.length >= 8) {
                            p[name] = true;
                        }
                    }
                    CliqzAttrack.privateValues = p;
                },
                getCookieValues: function getCookieValues(c, url) {
                    if (c == null) {
                        return {};
                    }
                    var v = 0,
                        cookies = {};
                    if (c.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
                        c = RegExp.$1;
                        v = 1;
                    }
                    if (v === 0) {
                        c.split(/[,;]/).map(function (cookie) {
                            var parts = cookie.split(/=/);
                            if (parts.length > 1) parts[1] = parts.slice(1).join('=');
                            var name = dURIC(parts[0].trimLeft()),
                                value = parts.length > 1 ? dURIC(parts[1].trimRight()) : null;
                            cookies[name] = value;
                        });
                    } else {
                        c.match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g).map(function ($0, $1) {
                            var name = $0,
                                value = $1.charAt(0) === '"' ? $1.substr(1, -1).replace(/\\(.)/g, "$1") : $1;
                            cookies[name] = value;
                        });
                    }
                    // return cookies;
                    var cookieVal = {};
                    for (var key in cookies) {
                        if (url.indexOf(cookies[key]) == -1) {
                            // cookies save as part of the url is allowed
                            cookieVal[cookies[key]] = true;
                        }
                    }
                    return cookieVal;
                },
                httpopenObserver: {
                    observe: function observe(requestDetails) {
                        if (!CliqzAttrack.qs_whitelist.isReady()) {
                            return;
                        }

                        var requestContext = new HttpRequestContext(requestDetails);
                        var url = requestContext.url;
                        if (!url || url == '') return;
                        var url_parts = URLInfo.get(url);

                        if (requestContext.isFullPage()) {
                            CliqzAttrack.tp_events.onFullPage(url_parts, requestContext.getOuterWindowID(), requestContext.isChannelPrivate());
                            if (CliqzAttrack.isTrackerTxtEnabled()) {
                                TrackerTXT.get(url_parts).update();
                            }
                            CliqzAttrack.blockLog.incrementLoadedPages();
                            return;
                        }

                        // This needs to be a common function aswell. Also consider getting ORIGIN header.
                        var referrer = requestContext.getReferrer();
                        var same_gd = false;

                        // We need to get the source from where the request originated.
                        // There are two ways in which we can get it.
                        // 1. header -> REFERRER
                        // 2. Get source url.
                        // 3. header -> ORIGIN (This needs to be investigated.)

                        var source_url = requestContext.getLoadingDocument(),
                            source_url_parts = null,
                            source_tab = requestContext.getOriginWindowID();

                        var page_load_type = null;
                        var request_type = null;
                        switch (requestContext.getContentPolicyType()) {
                            case 6:
                                page_load_type = "fullpage";
                                request_type = "fullpage";
                                break;
                            case 7:
                                page_load_type = "frame";break;
                            default:
                                page_load_type = null;
                        }
                        if (source_url == '' || source_url.indexOf('about:') == 0) return;
                        if (page_load_type == 'fullpage') return;

                        // modify or cancel the http request if the url contains personal identifier
                        // Now refstr should not be null, but still keeping the clause to check from edge cases.

                        if (source_url != null) {
                            source_url_parts = URLInfo.get(source_url);

                            // same general domain
                            same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
                            if (same_gd) {
                                return;
                            }

                            // find the ok tokens fields
                            var isPrivate = requestContext.isChannelPrivate();
                            if (!isPrivate) {
                                CliqzAttrack.examineTokens(url_parts);
                            }

                            // extract and save tokens
                            CliqzAttrack.extractKeyTokens(url_parts, source_url_parts['hostname'], isPrivate, CliqzAttrack.saveKeyTokens);
                            CliqzAttrack.recordLinksForURL(source_url);

                            var reflinks = CliqzAttrack.linksFromDom[source_url] || {};

                            // work around for https://github.com/cliqz/navigation-extension/issues/1230
                            if (CliqzAttrack.recentlyModified.contains(source_tab + url)) {
                                CliqzAttrack.recentlyModified['delete'](source_tab + url);
                                return { cancel: true };
                            }
                            if (url in reflinks) {
                                CliqzAttrack.tp_events.incrementStat(req_log, "url_in_reflinks");
                                // return;
                            }

                            // log third party request
                            var req_log = null;
                            if (url_parts.hostname != source_url_parts.hostname) {
                                req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                                tp_events.incrementStat(req_log, 'c');
                                if (url_parts['query'].length > 0) {
                                    tp_events.incrementStat(req_log, 'has_qs');
                                }
                                if (url_parts['parameters'].length > 0) {
                                    tp_events.incrementStat(req_log, 'has_ps');
                                }
                                if (url_parts['fragment'].length > 0) {
                                    tp_events.incrementStat(req_log, 'has_fragment');
                                }
                                var content_type = requestContext.getContentPolicyType();
                                if (!content_type) {
                                    CliqzAttrack.tp_events.incrementStat(req_log, "type_unknown");
                                } else {
                                    CliqzAttrack.tp_events.incrementStat(req_log, "type_" + content_type);
                                }

                                // log protocol (secure or not)
                                var isHTTP = function isHTTP(protocol) {
                                    return protocol === "http" || protocol === "https";
                                };
                                var scheme = isHTTP(url_parts.protocol) ? url_parts.protocol : "other";
                                tp_events.incrementStat(req_log, 'scheme_' + scheme);

                                // find frame depth
                                tp_events.incrementStat(req_log, 'window_depth_' + requestContext.getWindowDepth());
                            }

                            // get cookie data
                            var cookievalue = {},
                                docCookie = '';
                            if (source_url in CliqzAttrack.cookiesFromDom && CliqzAttrack.cookiesFromDom[source_url]) {
                                docCookie = CliqzAttrack.cookiesFromDom[source_url];
                                cookievalue = CliqzAttrack.getCookieValues(docCookie, url);
                            } else {
                                // try to get the document from source
                                try {
                                    if (source.lc) {
                                        docCookie = source.lc.topWindow.document.cookie;
                                        if (docCookie) {
                                            cookievalue = CliqzAttrack.getCookieValues(docCookie, url);
                                        }
                                    }
                                } catch (e) {}
                            }
                            try {
                                var cookiedata = requestContext.getRequestHeader('Cookie');
                                var cookie2 = CliqzAttrack.getCookieValues(cookiedata, url);
                            } catch (e) {
                                var cookie2 = {};
                            }

                            for (var c in cookie2) {
                                cookievalue[c] = true;
                            }

                            var stats = {};
                            var badTokens = CliqzAttrack.checkTokens(url_parts, source_url, cookievalue, stats, source_url_parts);
                            if (req_log) {
                                // save token stats to the log.
                                Object.keys(stats).forEach(function (key) {
                                    if (stats[key] > 0) {
                                        tp_events.incrementStat(req_log, 'token.has_' + key);
                                        tp_events.incrementStat(req_log, 'token.' + key, stats[key]);
                                    }
                                });
                            }

                            if (badTokens.length == 0) {
                                if (CliqzAttrack.trackerProxy.checkShouldProxy(url)) {
                                    tp_events.incrementStat(req_log, 'proxy');
                                }
                                return;
                            }

                            // Block request based on rules specified
                            var _key = source_tab + ":" + source_url;
                            if (CliqzAttrack.isQSEnabled() && !CliqzAttrack.reloadWhiteList[_key]) {
                                for (var i = 0; i < CliqzAttrack.qsBlockRule.length; i++) {
                                    var sRule = CliqzAttrack.qsBlockRule[i][0],
                                        uRule = CliqzAttrack.qsBlockRule[i][1];
                                    if (source_url_parts.hostname.endsWith(sRule) && url_parts.hostname.endsWith(uRule)) {
                                        tp_events.incrementStat(req_log, 'req_rule_aborted');
                                        return { cancel: true };
                                    }
                                }
                            }

                            if (badTokens.length > 0) {
                                tp_events.incrementStat(req_log, 'bad_qs');
                                tp_events.incrementStat(req_log, 'bad_tokens', badTokens.length);
                            }

                            // altering request
                            // Additional check to verify if the user reloaded the page.
                            if (CliqzAttrack.isQSEnabled() && !CliqzAttrack.reloadWhiteList[_key]) {

                                if (CliqzAttrack.isSourceWhitelisted(source_url_parts.hostname)) {
                                    CliqzAttrack.tp_events.incrementStat(req_log, "source_whitelisted");
                                    return;
                                }

                                if (CliqzAttrack.debug) {
                                    utils.log("altering request " + url + " " + source_url + ' ' + same_gd, 'tokk');
                                    utils.log('bad tokens: ' + JSON.stringify(badTokens), 'tokk');
                                }

                                if (badTokens.length > 0 && CliqzAttrack.qs_whitelist.isUpToDate()) {
                                    // determin action based on tracker.txt
                                    var rule = CliqzAttrack.getDefaultRule(),
                                        _trackerTxt = TrackerTXT.get(source_url_parts);
                                    if (!CliqzAttrack.isForceBlockEnabled() && CliqzAttrack.isTrackerTxtEnabled()) {
                                        if (_trackerTxt.last_update === null) {
                                            // The first update is not ready yet for this first party, allow it
                                            tp_events.incrementStat(req_log, 'tracker.txt_not_ready' + rule);
                                            return;
                                        }
                                        rule = _trackerTxt.getRule(url_parts.hostname);
                                    }
                                    if (rule == 'block') {
                                        tp_events.incrementStat(req_log, 'token_blocked_' + rule);
                                        return { cancel: true };
                                    } else {
                                        var tmp_url = requestContext.url;
                                        for (var i = 0; i < badTokens.length; i++) {
                                            if (tmp_url.indexOf(badTokens[i]) < 0) {
                                                badTokens[i] = encodeURIComponent(badTokens[i]);
                                            }
                                            tmp_url = tmp_url.replace(badTokens[i], CliqzAttrack.obfuscate(badTokens[i], rule, CliqzAttrack.replacement));
                                        }

                                        // In case unsafe tokens were in the hostname, the URI is not valid
                                        // anymore and we can cancel the request.
                                        if (!tmp_url.startsWith(url_parts.protocol + '://' + url_parts.hostname)) {
                                            return { cancel: true };
                                        }

                                        tp_events.incrementStat(req_log, 'token_blocked_' + rule);

                                        if (CliqzAttrack.trackerProxy.checkShouldProxy(tmp_url)) {
                                            tp_events.incrementStat(req_log, 'proxy');
                                        }
                                        CliqzAttrack.recentlyModified.add(source_tab + url, 30000);
                                        CliqzAttrack.recentlyModified.add(source_tab + tmp_url, 30000);
                                        return {
                                            redirectUrl: tmp_url,
                                            requestHeaders: rule != 'same' ? [{ name: CliqzAttrack.cliqzHeader, value: ' ' }] : undefined
                                        };
                                    }
                                }
                            }
                        } else {
                            // no refstr: might be able to get a referrer from load context to verify if favicon or extension request
                            // Now this should not happen. Keeping the code block for now. Will remove it after more testing.
                            if (CliqzAttrack.debug) utils.log("THIS CALL DID NOT HAVE A REF", "no_refstr");
                        }
                    }
                },
                httpResponseObserver: {
                    observe: function observe(requestDetails) {
                        if (!CliqzAttrack.qs_whitelist.isReady()) {
                            return;
                        }
                        var requestContext = new HttpRequestContext(requestDetails),
                            url = requestContext.url;

                        if (!url) return;
                        var url_parts = URLInfo.get(url);
                        var referrer = requestContext.getReferrer();
                        var same_gd = false;

                        var source_url = requestContext.getLoadingDocument(),
                            source_url_parts = null,
                            source_tab = requestContext.getOriginWindowID();

                        // full page
                        if (requestContext.isFullPage()) {
                            if ([300, 301, 302, 303, 307].indexOf(requestContext.channel.responseStatus) >= 0) {
                                // redirect, update location for tab
                                // if no redirect location set, stage the tab id so we don't get false data
                                var redirect_url = requestContext.getResponseHeader("Location");
                                var redirect_url_parts = URLInfo.get(redirect_url);
                                // if redirect is relative, use source domain
                                if (!redirect_url_parts.hostname) {
                                    redirect_url_parts.hostname = url_parts.hostname;
                                    redirect_url_parts.path = redirect_url;
                                }
                                CliqzAttrack.tp_events.onRedirect(redirect_url_parts, requestContext.getOuterWindowID(), requestContext.isChannelPrivate());
                            }
                            return;
                        }

                        if (source_url == '' || source_url.indexOf('about:') == 0) return;

                        if (source_url != null) {
                            source_url_parts = URLInfo.get(source_url);
                            // extract and save tokens
                            same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
                            if (same_gd) return;

                            if (url_parts.hostname != source_url_parts.hostname) var req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                            if (req_log) {
                                tp_events.incrementStat(req_log, 'resp_ob');
                                tp_events.incrementStat(req_log, 'content_length', parseInt(requestContext.getResponseHeader('Content-Length')) || 0);
                                tp_events.incrementStat(req_log, 'status_' + requestContext.channel.responseStatus);
                            }

                            // is cached?
                            var cached = requestContext.isCached;
                            CliqzAttrack.tp_events.incrementStat(req_log, cached ? 'cached' : 'not_cached');

                            // broken by attrack?
                            if (CliqzAttrack.recentlyModified.has(source_tab + url) && requestContext.channel.responseStatus >= 400) {
                                var dedupKey = [source_url, url_parts.hostname, url_parts.path].join('-');
                                CliqzAttrack.breakageCache[dedupKey] = CliqzAttrack.breakageCache[dedupKey] || {
                                    hostname: md5(source_url_parts.hostname).substring(0, 16),
                                    path: md5(source_url_parts.path),
                                    status: requestContext.channel.responseStatus,
                                    url_info: {
                                        protocol: url_parts.protocol,
                                        hostname: url_parts.hostname,
                                        path: md5(url_parts.path),
                                        params: url_parts.getKeyValuesMD5(),
                                        status: requestContext.channel.responseStatus
                                    },
                                    context: requestContext.getWindowDepth(),
                                    count: 0
                                };
                                CliqzAttrack.breakageCache[dedupKey].count += 1;
                            }
                        }
                    }
                },
                httpmodObserver: {
                    observe: function observe(requestDetails) {
                        var requestContext = new HttpRequestContext(requestDetails),
                            url = requestContext.url,
                            blockingResponse = {};

                        if (!url) return;

                        var url_parts = URLInfo.get(url);

                        var cookie_data = requestContext.getCookieData();

                        // Quick escapes:
                        // localhost or no cookie data
                        if (url_parts['hostname'] == 'localhost' || !cookie_data) {
                            return;
                        }

                        // Gather more info for further checks
                        var curr_time = Date.now();
                        if (curr_time - CliqzAttrack.bootupTime > CliqzAttrack.timeBootup) CliqzAttrack.bootingUp = false;

                        // check if fill context oauth, this needs to be done before accepting or requesting the cookies.
                        var ourl = findOauth(url, url_parts);
                        if (ourl) {
                            CliqzAttrack.contextOauth = { 'ts': curr_time, 'html': dURIC(ourl) + ':' + url };
                            if (CliqzAttrack.debug) utils.log("OAUTH: " + JSON.stringify(CliqzAttrack.contextOauth), CliqzAttrack.LOG_KEY);
                        }

                        // content policy type 6 == TYPE_DOCUMENT: top level dom element. Do not block.
                        if (requestContext.isFullPage()) {
                            return;
                        }

                        var referrer = requestContext.getReferrer();

                        // if the request is originating from a tab, we can get a source url
                        // The implementation below is causing a bug, if we load different urls in same tab.
                        // This is better handeled in capturing request type. When request type == fullpage
                        // Then uri.spec == source_url
                        // Only get source tabs for now.

                        var source_url = requestContext.getLoadingDocument(),
                            source_url_parts = null,
                            source_tab = requestContext.getOriginWindowID();

                        var page_load_type = null;
                        var request_type = null;
                        switch (requestContext.getContentPolicyType()) {
                            case 6:
                                page_load_type = "fullpage";
                                request_type = "fullpage";
                                break;
                            case 7:
                                page_load_type = "frame";break;
                            default:
                                page_load_type = null;
                        }

                        // Fallback to referrer if we don't find source from tab
                        if (source_url === undefined || source_url == '') {
                            source_url = referrer;
                        }

                        if (!source_url) {
                            return;
                        }

                        source_url_parts = URLInfo.get(source_url);
                        var req_log = null;

                        var same_gd = false;
                        if (url_parts.hostname != '' && source_url_parts && source_url_parts.hostname != '') {
                            same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname);
                        }

                        if (same_gd) {
                            // not a 3rd party cookie, do nothing
                            return;
                        }

                        req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);

                        if (req_log && req_log.c === 0) {
                            blockingResponse = CliqzAttrack.httpopenObserver.observe(requestDetails) || {};
                            req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                        }

                        tp_events.incrementStat(req_log, 'cookie_set');
                        if (source_url.indexOf('about:') == 0) {
                            // it's a brand new tab, and the url is loaded externally,
                            // about:home, about:blank
                            tp_events.incrementStat(req_log, 'cookie_allow_newtab');
                            CliqzAttrack.allowCookie(url, { 'dst': url_parts.hostname, 'src': source_url, 'data': cookie_data, 'ts': curr_time }, "about:blank");
                            return blockingResponse;
                        }

                        // check if domain is whitelisted,
                        if (CliqzAttrack.isInWhitelist(url_parts.hostname)) {
                            tp_events.incrementStat(req_log, 'cookie_allow_whitelisted');
                            if (CliqzAttrack.debug) utils.log("Is whitelisted (type: direct): " + url, CliqzAttrack.LOG_KEY);
                            return blockingResponse;
                        }

                        var host = getGeneralDomain(url_parts.hostname);
                        var diff = curr_time - (CliqzAttrack.visitCache[host] || 0);

                        // This is order to only allow visited sources from browser. Else some redirect calls
                        // Getting leaked.
                        var s_host = '';
                        if (source_url && source_url_parts.hostname) {
                            s_host = getGeneralDomain(source_url_parts.hostname);
                        }

                        // check visitcache to see if this domain is temporarily allowed.
                        // Additional check required when gd=false and request_type== full_page, else block
                        if (diff < CliqzAttrack.timeActive && CliqzAttrack.visitCache[s_host]) {
                            var src = null;
                            if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                            tp_events.incrementStat(req_log, 'cookie_allow_visitcache');
                            CliqzAttrack.allowCookie(url, { 'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time }, "visitcache");
                            return blockingResponse;
                        }

                        // check if user initiated this request by an element click.
                        if (CliqzAttrack.cChecker.contextFromEvent) {
                            var diff = curr_time - (CliqzAttrack.cChecker.contextFromEvent.ts || 0);
                            if (diff < CliqzAttrack.timeAfterLink) {

                                var host = getGeneralDomain(url_parts.hostname);
                                if (host === CliqzAttrack.cChecker.contextFromEvent.gDM) {
                                    CliqzAttrack.visitCache[host] = curr_time;
                                    var src = null;
                                    if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                                    tp_events.incrementStat(req_log, 'cookie_allow_userinit_same_context_gd');
                                    CliqzAttrack.allowCookie(url, { 'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time }, "contextFromEvent");
                                    return blockingResponse;
                                }
                                var pu = url.split(/[?&;]/)[0];
                                if (CliqzAttrack.cChecker.contextFromEvent.html.indexOf(pu) != -1) {
                                    if (CliqzAttrack.debug) utils.log(">>> Cookie ALLOWED (type2): " + pu + " " + CliqzAttrack.cChecker.contextFromEvent.html, CliqzAttrack.LOG_KEY);

                                    // the url is in pu
                                    if (url_parts && url_parts.hostname && url_parts.hostname != '') {

                                        CliqzAttrack.visitCache[host] = curr_time;

                                        tp_events.incrementStat(req_log, 'cookie_allow_userinit_same_gd_link');
                                        CliqzAttrack.allowCookie(url, { 'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time }, "contextFromEvent");
                                        return blockingResponse;
                                    }
                                }
                            }
                        }

                        // check for OAuth requests
                        if (CliqzAttrack.contextOauth) {
                            var diff = curr_time - (CliqzAttrack.contextOauth.ts || 0);
                            if (diff < CliqzAttrack.timeActive) {

                                var pu = url.split(/[?&;]/)[0];

                                if (CliqzAttrack.contextOauth.html.indexOf(pu) != -1) {
                                    // the url is in pu
                                    if (url_parts && url_parts.hostname && url_parts.hostname != '') {
                                        var contextFromEvent = browser.contextFromEvent();
                                        if (contextFromEvent && contextFromEvent.html && contextFromEvent.html.indexOf(pu) != -1) {

                                            if (CliqzAttrack.debug) utils.log("OAUTH and click " + url, CliqzAttrack.LOG_KEY);
                                            var host = getGeneralDomain(url_parts.hostname);
                                            var src = null;
                                            if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                                            tp_events.incrementStat(req_log, 'cookie_allow_oauth');
                                            tp_events.incrementStat(req_log, 'req_oauth');
                                            CliqzAttrack.allowCookie(url, { 'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time }, "contextOauth");
                                            return blockingResponse;
                                        } else {
                                            if (CliqzAttrack.debug) utils.log("OAUTH and NOT click " + url, CliqzAttrack.LOG_KEY);
                                        }
                                    }
                                }
                            }
                        }

                        if (url_parts.hostname != '' && source_url_parts && source_url_parts.hostname != '') {

                            // the hostnames are different, but they might still be the same site: e.g.
                            // loc5.lacaixa.es => metrics.lacaixa.es

                            if (CliqzAttrack.debug) {
                                utils.log("cookie detected >>> " + source_url_parts.hostname + " : " + url_parts.hostname, CliqzAttrack.LOG_KEY);
                            }

                            if (!same_gd && cookie_data && cookie_data.length > 10) {

                                // as test, we do not send the hostname as md5
                                var md5_source_hostname = source_url_parts.hostname;

                                // now, let's kill that cookie and see what happens :-)
                                var _key = source_tab + ":" + source_url;
                                if (CliqzAttrack.isCookieEnabled(source_url_parts.hostname) && !CliqzAttrack.reloadWhiteList[_key]) {
                                    // blocking cookie
                                    var src = null;
                                    if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                                    tp_events.incrementStat(req_log, 'cookie_blocked');
                                    tp_events.incrementStat(req_log, 'cookie_block_tp1');
                                    CliqzAttrack.blockCookie(source_url_parts.hostname, { 'src': src, 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time }, 'type1');
                                    blockingResponse.requestHeaders = [{ name: 'Cookie', value: '' }, { name: CliqzAttrack.cliqzHeader, value: ' ' }];
                                    return blockingResponse;
                                } else {
                                    // was not enabled, therefore the cookie gets sent
                                    tp_events.incrementStat(req_log, 'bad_cookie_sent');
                                }
                            }
                        } else {
                            if (CliqzAttrack.bootingUp) {

                                if (curr_time - CliqzAttrack.bootupTime > CliqzAttrack.timeBootup) CliqzAttrack.bootingUp = false;

                                if (CliqzAttrack.debug) utils.log(">>> Booting up: " + url + " : " + url_parts.hostname, CliqzAttrack.LOG_KEY);
                                var key = url_parts.hostname + url_parts.path;
                                if (key && key != '') CliqzAttrack.bootupWhitelistCache[key] = true;
                                tp_events.incrementStat(req_log, 'cookie_allow_bootingup');
                                if (CliqzAttrack.debug) utils.log(">>> Cookie ALLOWED because bootup: " + key, CliqzAttrack.LOG_KEY);
                            } else {

                                var key = url_parts.hostname + url_parts.path;
                                if (CliqzAttrack.bootupWhitelistCache[key] == null) {

                                    if (CliqzAttrack.isCookieEnabled(source_url_parts.hostname) && !CliqzAttrack.reloadWhiteList[_key]) {
                                        // blocking cookie
                                        var src = null;
                                        if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                                        tp_events.incrementStat(req_log, 'cookie_blocked');
                                        tp_events.incrementStat(req_log, 'cookie_block_tp2');
                                        CliqzAttrack.blockCookie(url, { 'src': src, 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time }, 'type2');
                                        blockingResponse.requestHeaders = [{ name: 'Cookie', value: '' }, { name: CliqzAttrack.cliqzHeader, value: ' ' }];
                                        return blockingResponse;
                                    } else {
                                        // was not enabled, therefore the cookie gets sent
                                        tp_events.incrementStat(req_log, 'bad_cookie_sent');
                                    }
                                } else {
                                    // should allow, same domain and path as bootup request,
                                    if (CliqzAttrack.debug) utils.log(">>> Cookie ALLOWED because bootup: " + key, CliqzAttrack.LOG_KEY);
                                }
                            }
                        }
                        return blockingResponse;
                    }
                },
                allowCookie: function allowCookie(url, req_metadata, reason) {
                    if (CliqzAttrack.debug) utils.log("ALLOWING because of " + reason + " " + req_metadata['dst'] + ' %% ' + url, CliqzAttrack.LOG_KEY);
                },
                blockCookie: function blockCookie(url, req_metadata, reason) {
                    if (CliqzAttrack.debug) utils.log(">>> Cookie REMOVED (" + reason + "): " + req_metadata['dst'] + " >>> " + url, CliqzAttrack.LOG_KEY);
                    CliqzAttrack.blockedCache[req_metadata['dst']] = req_metadata['ts'];
                },
                onTabLocationChange: function onTabLocationChange(evnt) {
                    var url = evnt.url;

                    CliqzAttrack.linksFromDom[url] = {};

                    if (evnt.isLoadingDocument) {
                        // when a new page is loaded, try to extract internal links and cookies
                        var doc = evnt.document;
                        CliqzAttrack.loadedTabs[url] = false;

                        if (doc) {
                            if (doc.body) {
                                CliqzAttrack.recordLinksForURL(url);
                            }
                            doc.addEventListener('DOMContentLoaded', function (ev) {
                                CliqzAttrack.loadedTabs[url] = true;
                                CliqzAttrack.recordLinksForURL(url);
                            });
                            CliqzAttrack.clearDomLinks();
                        }
                    }

                    // New location, means a page loaded on the top window, visible tab
                    var activeURL = browser.currentURL();
                    var curr_time = Date.now();

                    if (activeURL.indexOf('about:') != 0 && activeURL.indexOf('chrome:') != 0) {

                        var url_parts = parseURL(activeURL);

                        if (url_parts && url_parts.hostname && url_parts.hostname != '') {
                            var host = getGeneralDomain(url_parts.hostname);
                            CliqzAttrack.visitCache[host] = curr_time;
                        }
                    }
                },
                getDefaultRule: function getDefaultRule() {
                    if (CliqzAttrack.isForceBlockEnabled()) {
                        return 'block';
                    } else {
                        return getDefaultTrackerTxtRule();
                    }
                },
                isEnabled: function isEnabled() {
                    return utils.getPref(CliqzAttrack.ENABLE_PREF, false);
                },
                isCookieEnabled: function isCookieEnabled(source_hostname) {
                    if (source_hostname != undefined && CliqzAttrack.isSourceWhitelisted(source_hostname)) {
                        return false;
                    }
                    return utils.getPref('attrackBlockCookieTracking', true);
                },
                isQSEnabled: function isQSEnabled() {
                    return utils.getPref('attrackRemoveQueryStringTracking', true);
                },
                isFingerprintingEnabled: function isFingerprintingEnabled() {
                    return utils.getPref('attrackCanvasFingerprintTracking', false);
                },
                isReferrerEnabled: function isReferrerEnabled() {
                    return utils.getPref('attrackRefererTracking', false);
                },
                isTrackerTxtEnabled: function isTrackerTxtEnabled() {
                    return utils.getPref('trackerTxt', false);
                },
                isBloomFilterEnabled: function isBloomFilterEnabled() {
                    return utils.getPref('attrackBloomFilter', false);
                },
                isForceBlockEnabled: function isForceBlockEnabled() {
                    return utils.getPref('attrackForceBlock', false);
                },
                initPacemaker: function initPacemaker() {
                    var two_mins = 2 * 60 * 1000;

                    // create a constraint which returns true when the time changes at the specified fidelity
                    function timeChangeConstraint(name, fidelity) {
                        if (fidelity == "day") fidelity = 8;else if (fidelity == "hour") fidelity = 10;
                        return function (task) {
                            var timestamp = datetime.getTime().slice(0, fidelity),
                                lastHour = persist.getValue(name + "lastRun") || timestamp;
                            persist.setValue(name + "lastRun", timestamp);
                            return timestamp != lastHour;
                        };
                    }

                    pacemaker.register(CliqzAttrack.updateConfig, 3 * 60 * 60 * 1000);

                    // send instant cache tokens whenever hour changes
                    pacemaker.register(CliqzAttrack.sendTokens, 5 * 60 * 1000);
                    // if the hour has changed
                    pacemaker.register(CliqzAttrack.hourChanged, two_mins, timeChangeConstraint("hourChanged", "hour"));

                    // every 2 mins

                    function cleanTimestampCache(cacheObj, timeout, currTime) {
                        var keys = Object.keys(cacheObj);
                        keys.forEach(function (k) {
                            if (currTime - cacheObj[k] || 0 > timeout) {
                                delete cacheObj[k];
                            }
                        });
                    }

                    pacemaker.register(function clean_caches(currTime) {
                        // visit cache
                        cleanTimestampCache(CliqzAttrack.visitCache, CliqzAttrack.timeCleaningCache, currTime);
                        // reload whitelist
                        cleanTimestampCache(CliqzAttrack.reloadWhiteList, CliqzAttrack.timeCleaningCache, currTime);
                        // track reload
                        cleanTimestampCache(CliqzAttrack.trackReload, CliqzAttrack.timeCleaningCache, currTime);
                        // blocked cache
                        cleanTimestampCache(CliqzAttrack.blockedCache, CliqzAttrack.timeCleaningCache, currTime);
                        // record cache
                        cleanTimestampCache(CliqzAttrack.linksRecorded, 1000, currTime);
                        // tab listener statuses
                        CliqzAttrack.tab_listener.cleanTabsStatus();
                    }, two_mins);

                    var bootup_task = pacemaker.register(function bootup_check(curr_time) {
                        if (curr_time - CliqzAttrack.bootupTime > CliqzAttrack.timeBootup) {
                            utils.log("bootup end");
                            CliqzAttrack.bootingUp = false;
                            pacemaker.deregister(bootup_task);
                        }
                    });

                    pacemaker.register(function tp_event_commit() {
                        CliqzAttrack.tp_events.commit();
                        CliqzAttrack.tp_events.push();
                    }, two_mins);

                    // every hour
                    var hourly = 60 * 60 * 1000;
                    pacemaker.register(CliqzAttrack.pruneRequestKeyValue, hourly);

                    pacemaker.register(function annotateSafeKeys() {
                        CliqzAttrack.qs_whitelist.annotateSafeKeys(CliqzAttrack.requestKeyValue);
                    }, 10 * 60 * 60 * 1000);

                    pacemaker.register(function pushBreakageTelemetry() {
                        Object.keys(CliqzAttrack.breakageCache).forEach(function (k) {
                            var payload = CliqzAttrack.breakageCache[k];
                            var msg = {
                                'type': telemetry.msgType,
                                'action': 'attrack.breakage',
                                'payload': CliqzAttrack.generateAttrackPayload(payload)
                            };
                            telemetry.telemetry(msg);
                        });
                        CliqzAttrack.breakageCache = {};
                    }, 10 * 60 * 1000);
                },
                /** Global module initialisation.
                 */
                init: function init() {
                    // disable for older browsers
                    if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
                        return;
                    }

                    // Replace getWindow functions with window object used in init.
                    if (CliqzAttrack.debug) utils.log("Init function called:", CliqzAttrack.LOG_KEY);

                    if (!CliqzAttrack.hashProb) {
                        CliqzAttrack.hashProb = new HashProb();
                    }

                    // load all caches:
                    // Large dynamic caches are loaded via the persist module, which will lazily propegate changes back
                    // to the browser's sqlite database.
                    // Large static caches (e.g. token whitelist) are loaded from sqlite
                    // Smaller caches (e.g. update timestamps) are kept in prefs
                    if (!this._tokens) {
                        this._tokens = new persist.AutoPersistentObject("tokens", function (v) {
                            return CliqzAttrack.tokens = v;
                        }, 60000);
                    }
                    //this._blocked = new persist.AutoPersistentObject("blocked", (v) => CliqzAttrack.blocked = v, 300000);

                    CliqzAttrack.qs_whitelist = CliqzAttrack.isBloomFilterEnabled() ? new AttrackBloomFilter() : new QSWhitelist();
                    CliqzAttrack.qs_whitelist.init();
                    CliqzAttrack.blockLog = new BlockLog(CliqzAttrack.qs_whitelist);
                    CliqzAttrack.blockLog.init();

                    if (!this._requestKeyValue) {
                        this._requestKeyValue = new persist.AutoPersistentObject("requestKeyValue", function (v) {
                            return CliqzAttrack.requestKeyValue = v;
                        }, 60000);
                    }
                    // force clean requestKeyValue
                    events.sub("attrack:safekeys_updated", function (version, forceClean) {
                        if (forceClean) {
                            CliqzAttrack._requestKeyValue.clear();
                        }
                    });

                    if (CliqzAttrack.qsBlockRule == null) CliqzAttrack.loadBlockRules();

                    // load tracker companies data
                    this._trackerLoader = new ResourceLoader(['antitracking', 'tracker_owners.json'], {
                        remoteURL: 'https://cdn.cliqz.com/anti-tracking/tracker_owners_list.json',
                        cron: 24 * 60 * 60 * 1000
                    });
                    this._trackerLoader.load().then(CliqzAttrack._parseTrackerCompanies);
                    this._trackerLoader.onUpdate(CliqzAttrack._parseTrackerCompanies);

                    // load cookie whitelist
                    this._cookieWhitelistLoader = new ResourceLoader(['antitracking', 'cookie_whitelist.json'], {
                        remoteURL: 'https://cdn.cliqz.com/anti-tracking/whitelist/cookie_whitelist.json',
                        cron: 24 * 60 * 60 * 1000
                    });
                    var updateCookieWhitelist = function updateCookieWhitelist(data) {
                        CliqzAttrack.whitelist = data;
                    };
                    this._cookieWhitelistLoader.load().then(updateCookieWhitelist);
                    this._cookieWhitelistLoader.onUpdate(updateCookieWhitelist);

                    CliqzAttrack.checkInstalledAddons();

                    if (CliqzAttrack.visitCache == null) {
                        CliqzAttrack.visitCache = {};
                    }

                    CliqzAttrack.initPacemaker();
                    pacemaker.start();

                    WebRequest.onBeforeRequest.addListener(CliqzAttrack.httpopenObserver.observe, undefined, ['blocking']);
                    WebRequest.onBeforeSendHeaders.addListener(CliqzAttrack.httpmodObserver.observe, undefined, ['blocking']);
                    WebRequest.onHeadersReceived.addListener(CliqzAttrack.httpResponseObserver.observe);

                    try {
                        CliqzAttrack.disabled_sites = new Set(JSON.parse(utils.getPref(CliqzAttrack.DISABLED_SITES_PREF, "[]")));
                    } catch (e) {
                        CliqzAttrack.disabled_sites = new Set();
                    }

                    // note: if a 0 value were to be saved, the default would be preferred. This is ok because these options
                    // cannot have 0 values.
                    CliqzAttrack.safekeyValuesThreshold = parseInt(persist.getValue('safekeyValuesThreshold')) || 4;
                    CliqzAttrack.shortTokenLength = parseInt(persist.getValue('shortTokenLength')) || 8;

                    CliqzAttrack.placeHolder = persist.getValue('placeHolder', CliqzAttrack.placeHolder);
                    CliqzAttrack.cliqzHeader = persist.getValue('cliqzHeader', CliqzAttrack.cliqzHeader);

                    CliqzAttrack.trackerProxy = new TrackerProxy();
                    CliqzAttrack.trackerProxy.init();
                },
                /** Per-window module initialisation
                 */
                initWindow: function initWindow(window) {
                    if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
                        return;
                    }
                    // Load listerners:
                    window.CLIQZ.Core.urlbar.addEventListener('focus', onUrlbarFocus);

                    CliqzAttrack.getPrivateValues(window);
                },
                unload: function unload() {
                    // don't need to unload if disabled
                    if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
                        return;
                    }
                    //Check is active usage, was sent

                    // force send tab telemetry data
                    CliqzAttrack.tp_events.commit(true, true);
                    CliqzAttrack.tp_events.push(true);

                    CliqzAttrack.blockLog.destroy();
                    CliqzAttrack.qs_whitelist.destroy();

                    browser.forEachWindow(CliqzAttrack.unloadWindow);

                    WebRequest.onBeforeRequest.removeListener(CliqzAttrack.httpopenObserver.observe);
                    WebRequest.onBeforeSendHeaders.removeListener(CliqzAttrack.httpmodObserver.observe);
                    WebRequest.onHeadersReceived.removeListener(CliqzAttrack.httpResponseObserver.observe);

                    pacemaker.stop();

                    CliqzAttrack.trackerProxy.destroy();

                    this._trackerLoader.stop();
                    this._cookieWhitelistLoader.stop();
                    if (this._blockRulesLoader) {
                        this._blockRulesLoader.stop();
                    }

                    events.un_sub("attrack:safekeys_updated");
                },
                unloadWindow: function unloadWindow(window) {
                    if (window.CLIQZ) {
                        window.CLIQZ.Core.urlbar.removeEventListener('focus', onUrlbarFocus);
                    }
                },
                checkInstalledAddons: function checkInstalledAddons() {
                    System['import']('platform/antitracking/addon-check').then(function (addons) {
                        CliqzAttrack.similarAddon = addons.checkInstalledAddons();
                    })['catch'](function (e) {
                        utils.log("Error loading addon checker", "attrack");
                    });
                },
                generateAttrackPayload: function generateAttrackPayload(data, ts) {
                    var extraAttrs = CliqzAttrack.qs_whitelist.getVersion();
                    extraAttrs.ver = CliqzAttrack.VERSION;
                    ts = ts || datetime.getHourTimestamp();
                    return generatePayload(data, ts, false, extraAttrs);
                },
                sendTokens: function sendTokens() {
                    // send tokens every 5 minutes
                    var data = {},
                        hour = datetime.getTime(),
                        limit = Object.keys(CliqzAttrack.tokens).length / 12;

                    // sort tracker keys by lastSent, i.e. send oldest data first
                    var sortedTrackers = Object.keys(CliqzAttrack.tokens).sort(function (a, b) {
                        return parseInt(CliqzAttrack.tokens[a].lastSent || 0) - parseInt(CliqzAttrack.tokens[b].lastSent || 0);
                    });

                    for (var i in sortedTrackers) {
                        var tracker = sortedTrackers[i];

                        if (limit > 0 && Object.keys(data).length > limit) {
                            break;
                        }

                        var tokenData = CliqzAttrack.tokens[tracker];
                        if (!tokenData.lastSent || tokenData.lastSent < hour) {
                            delete tokenData.lastSent;
                            data[tracker] = anonymizeTrackerTokens(tokenData);
                            delete CliqzAttrack.tokens[tracker];
                        }
                    }

                    if (Object.keys(data).length > 0) {
                        (function () {
                            var compress = compressionAvailable();

                            splitTelemetryData(data, 20000).map(function (d) {
                                var payl = CliqzAttrack.generateAttrackPayload(d);
                                var msg = {
                                    'type': telemetry.msgType,
                                    'action': 'attrack.tokens',
                                    'payload': payl
                                };
                                if (compress) {
                                    msg.compressed = true;
                                    msg.payload = compressJSONToBase64(payl);
                                }
                                telemetry.telemetry(msg);
                            });
                        })();
                    }
                    CliqzAttrack._tokens.setDirty();
                },
                hourChanged: function hourChanged() {
                    // trigger other hourly events
                    events.pub("attrack:hour_changed");
                },
                updateConfig: function updateConfig() {
                    var today = datetime.getTime().substring(0, 10);
                    utils.httpGet(CliqzAttrack.VERSIONCHECK_URL + "?" + today, function (req) {
                        // on load
                        var versioncheck = JSON.parse(req.response);

                        // config in versioncheck
                        if (versioncheck.placeHolder) {
                            persist.setValue('placeHolder', versioncheck.placeHolder);
                            CliqzAttrack.placeHolder = versioncheck.placeHolder;
                        }

                        if (versioncheck.shortTokenLength) {
                            persist.setValue('shortTokenLength', versioncheck.shortTokenLength);
                            CliqzAttrack.shortTokenLength = parseInt(versioncheck.shortTokenLength) || CliqzAttrack.shortTokenLength;
                        }

                        if (versioncheck.safekeyValuesThreshold) {
                            persist.setValue('safekeyValuesThreshold', versioncheck.safekeyValuesThreshold);
                            CliqzAttrack.safekeyValuesThreshold = parseInt(versioncheck.safekeyValuesThreshold) || CliqzAttrack.safekeyValuesThreshold;
                        }

                        if (versioncheck.cliqzHeader) {
                            persist.setValue('cliqzHeader', versioncheck.cliqzHeader);
                            CliqzAttrack.cliqzHeader = versioncheck.cliqzHeader;
                        }

                        // fire events for list update
                        events.pub("attrack:updated_config", versioncheck);
                    }, utils.log, 10000);
                },
                pruneRequestKeyValue: function pruneRequestKeyValue() {
                    var day = datetime.newUTCDate();
                    day.setDate(day.getDate() - CliqzAttrack.safeKeyExpire);
                    var dayCutoff = datetime.dateString(day);
                    for (var s in CliqzAttrack.requestKeyValue) {
                        for (var key in CliqzAttrack.requestKeyValue[s]) {
                            for (var tok in CliqzAttrack.requestKeyValue[s][key]) {
                                if (CliqzAttrack.requestKeyValue[s][key][tok] < dayCutoff) {
                                    delete CliqzAttrack.requestKeyValue[s][key][tok];
                                }
                            }
                            if (Object.keys(CliqzAttrack.requestKeyValue[s][key]).length == 0) {
                                delete CliqzAttrack.requestKeyValue[s][key];
                            }
                        }
                        if (Object.keys(CliqzAttrack.requestKeyValue[s]).length == 0) {
                            delete CliqzAttrack.requestKeyValue[s];
                        }
                    }
                    CliqzAttrack._requestKeyValue.setDirty();
                    CliqzAttrack._requestKeyValue.save();
                },
                loadBlockRules: function loadBlockRules() {
                    CliqzAttrack.qsBlockRule = [];
                    CliqzAttrack._blockRulesLoader = new ResourceLoader(['antitracking', 'anti-tracking-block-rules.json'], {
                        remoteURL: CliqzAttrack.URL_BLOCK_RULES,
                        cron: 24 * 60 * 60 * 1000
                    });
                    var updateRules = function updateRules(rules) {
                        CliqzAttrack.qsBlockRule = rules || [];
                    };
                    CliqzAttrack._blockRulesLoader.load().then(updateRules);
                    CliqzAttrack._blockRulesLoader.onUpdate(updateRules);
                },
                isInWhitelist: function isInWhitelist(domain) {
                    if (!CliqzAttrack.whitelist) return false;
                    var keys = CliqzAttrack.whitelist;
                    for (var i = 0; i < keys.length; i++) {
                        var ind = domain.indexOf(keys[i]);
                        if (ind >= 0) {
                            if (ind + keys[i].length == domain.length) return true;
                        }
                    }
                    return false;
                },
                checkTokens: function checkTokens(url_parts, source_url, cookievalue, stats, source_url_parts) {
                    // bad tokens will still be returned in the same format

                    var s = getGeneralDomain(url_parts.hostname);
                    s = md5(s).substr(0, 16);
                    // If it's a rare 3rd party, we don't do the rest
                    if (!CliqzAttrack.qs_whitelist.isTrackerDomain(s)) return [];

                    var sourceD = md5(source_url_parts.hostname).substr(0, 16);
                    var today = datetime.getTime().substr(0, 8);

                    if (url_parts['query'].length == 0 && url_parts['parameters'].length == 0) return [];
                    var tok;

                    var badTokens = [];

                    // stats keys
                    ['cookie', 'private', 'cookie_b64', 'private_b64', 'safekey', 'whitelisted', 'cookie_newToken', 'cookie_countThreshold', 'private_newToken', 'private_countThreshold', 'short_no_hash', 'cookie_b64_newToken', 'cookie_b64_countThreshold', 'private_b64_newToken', 'private_b64_countThreshold', 'qs_newToken', 'qs_countThreshold'].forEach(function (k) {
                        stats[k] = 0;
                    });

                    var _countCheck = function _countCheck(tok) {
                        // for token length < 12 and may be not a hash, we let it pass
                        if (tok.length < 12 && !CliqzAttrack.hashProb.isHash(tok)) return 0;
                        // update tokenDomain
                        tok = md5(tok);
                        CliqzAttrack.blockLog.tokenDomain.addTokenOnFirstParty(tok, sourceD);
                        return CliqzAttrack.blockLog.tokenDomain.getNFirstPartiesForToken(tok);
                    };

                    var _incrStats = function _incrStats(cc, prefix, tok, key, val) {
                        if (cc == 0) stats['short_no_hash']++;else if (cc < CliqzAttrack.tokenDomainCountThreshold) stats[prefix + '_newToken']++;else {
                            _addBlockLog(s, key, val, prefix);
                            badTokens.push(val);
                            if (cc == CliqzAttrack.tokenDomainCountThreshold) stats[prefix + '_countThreshold']++;
                            stats[prefix]++;
                            return true;
                        }
                        return false;
                    };

                    var _addBlockLog = function _addBlockLog(s, key, val, prefix) {
                        CliqzAttrack.blockLog.blockLog.add(source_url, s, key, val, prefix);
                    };

                    var _checkTokens = function _checkTokens(key, val) {
                        CliqzAttrack.blockLog.incrementCheckedTokens();

                        var tok = dURIC(val);
                        while (tok != dURIC(tok)) {
                            tok = dURIC(tok);
                        }

                        if (tok.length < CliqzAttrack.shortTokenLength || source_url.indexOf(tok) > -1) return;

                        // Bad values (cookies)
                        for (var c in cookievalue) {
                            if (tok.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength || c.indexOf(tok) > -1) {
                                if (CliqzAttrack.debug) utils.log('same value as cookie ' + val, 'tokk');
                                var cc = _countCheck(tok);
                                if (c != tok) {
                                    cc = Math.max(cc, _countCheck(c));
                                }
                                if (_incrStats(cc, 'cookie', tok, key, val)) return;
                            }
                        }

                        // private value (from js function returns)
                        for (var c in CliqzAttrack.privateValues) {
                            if (tok.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength || c.indexOf(tok) > -1) {
                                if (CliqzAttrack.debug) utils.log('same private values ' + val, 'tokk');
                                var cc = _countCheck(tok);
                                if (c != tok) {
                                    cc = Math.max(cc, _countCheck(c));
                                }
                                if (_incrStats(cc, 'private', tok, key, val)) return;
                            }
                        }
                        var b64 = null;
                        try {
                            b64 = atob(tok);
                        } catch (e) {}
                        if (b64 != null) {
                            for (var c in cookievalue) {
                                if (b64.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength || c.indexOf(b64) > -1) {
                                    if (CliqzAttrack.debug) utils.log('same value as cookie ' + b64, 'tokk-b64');
                                    var cc = _countCheck(tok);
                                    if (c != tok) {
                                        cc = Math.max(cc, _countCheck(c));
                                    }
                                    if (_incrStats(cc, 'cookie_b64', tok, key, val)) return;
                                }
                            }
                            for (var c in CliqzAttrack.privateValues) {
                                if (b64.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) {
                                    if (CliqzAttrack.debug) utils.log('same private values ' + b64, 'tokk-b64');
                                    var cc = _countCheck(tok);
                                    if (c != tok) {
                                        cc = Math.max(cc, _countCheck(c));
                                    }
                                    if (_incrStats(cc, 'private_b64', tok, key, val)) return;
                                }
                            }
                        }

                        // Good keys.
                        if (CliqzAttrack.qs_whitelist.isSafeKey(s, md5(key))) {
                            stats['safekey']++;
                            return;
                        }

                        if (source_url.indexOf(tok) == -1) {
                            if (!CliqzAttrack.qs_whitelist.isSafeToken(s, md5(tok))) {
                                var cc = _countCheck(tok);
                                _incrStats(cc, 'qs', tok, key, val);
                            } else stats['whitelisted']++;
                        }
                    };

                    url_parts.getKeyValues().forEach(function (kv) {
                        _checkTokens(kv.k, kv.v);
                    });

                    // update blockedToken
                    CliqzAttrack.blockLog.incrementBlockedTokens(badTokens.length);
                    return badTokens;
                },
                examineTokens: function examineTokens(url_parts) {
                    var day = datetime.newUTCDate();
                    var today = datetime.dateString(day);
                    // save appeared tokens with field name
                    // mark field name as "safe" if different values appears
                    var s = getGeneralDomain(url_parts.hostname);
                    s = md5(s).substr(0, 16);
                    url_parts.getKeyValuesMD5().filter(function (kv) {
                        return kv.v_len >= CliqzAttrack.shortTokenLength;
                    }).forEach(function (kv) {
                        var key = kv.k,
                            tok = kv.v;
                        if (CliqzAttrack.qs_whitelist.isSafeKey(s, key)) return;
                        if (CliqzAttrack.requestKeyValue[s] == null) CliqzAttrack.requestKeyValue[s] = {};
                        if (CliqzAttrack.requestKeyValue[s][key] == null) CliqzAttrack.requestKeyValue[s][key] = {};

                        CliqzAttrack.requestKeyValue[s][key][tok] = today;
                        // see at least 3 different value until it's safe
                        var valueCount = Object.keys(CliqzAttrack.requestKeyValue[s][key]).length;
                        if (valueCount > CliqzAttrack.safekeyValuesThreshold) {
                            CliqzAttrack.qs_whitelist.addSafeKey(s, key, valueCount);
                            // keep the last seen token
                            CliqzAttrack.requestKeyValue[s][key] = { tok: today };
                        }
                        CliqzAttrack._requestKeyValue.setDirty();
                    });
                },
                extractKeyTokens: function extractKeyTokens(url_parts, refstr, isPrivate, callback) {
                    // keys, value of query strings will be sent in md5
                    // url, refstr will be sent in half of md5
                    if (isPrivate) {
                        return;
                    }
                    var keyTokens = url_parts.getKeyValuesMD5();
                    if (keyTokens.length > 0) {
                        var s = md5(url_parts.hostname).substr(0, 16);
                        refstr = md5(refstr).substr(0, 16);
                        callback(s, keyTokens, refstr, isPrivate);
                    }
                },
                saveKeyTokens: function saveKeyTokens(s, keyTokens, r, isPrivate) {
                    if (isPrivate) {
                        return;
                    }
                    // anything here should already be hash
                    if (CliqzAttrack.tokens[s] == null) CliqzAttrack.tokens[s] = { lastSent: datetime.getTime() };
                    if (CliqzAttrack.tokens[s][r] == null) CliqzAttrack.tokens[s][r] = { 'c': 0, 'kv': {} };
                    CliqzAttrack.tokens[s][r]['c'] = (CliqzAttrack.tokens[s][r]['c'] || 0) + 1;
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = keyTokens[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var kv = _step.value;

                            var tok = kv.v,
                                k = kv.k;
                            if (CliqzAttrack.tokens[s][r]['kv'][k] == null) CliqzAttrack.tokens[s][r]['kv'][k] = {};
                            if (CliqzAttrack.tokens[s][r]['kv'][k][tok] == null) {
                                CliqzAttrack.tokens[s][r]['kv'][k][tok] = {
                                    c: 0,
                                    k_len: kv.k_len,
                                    v_len: kv.v_len
                                };
                            }
                            CliqzAttrack.tokens[s][r]['kv'][k][tok].c += 1;
                        }
                    } catch (err) {
                        _didIteratorError = true;
                        _iteratorError = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion && _iterator['return']) {
                                _iterator['return']();
                            }
                        } finally {
                            if (_didIteratorError) {
                                throw _iteratorError;
                            }
                        }
                    }

                    CliqzAttrack._tokens.setDirty();
                },
                linksRecorded: {}, // cache when we recorded links for each url
                recordLinksForURL: function recordLinksForURL(url) {
                    if (CliqzAttrack.loadedTabs[url]) {
                        return;
                    }
                    var now = Date.now();
                    var lastQuery = CliqzAttrack.linksRecorded[url] || 0;
                    if (now - lastQuery < 1000) {
                        return;
                    }
                    CliqzAttrack.linksRecorded[url] = now;
                    return Promise.all([core.getCookie(url).then(function (cookie) {
                        return CliqzAttrack.cookiesFromDom[url] = cookie;
                    }), Promise.all([core.queryHTML(url, 'a[href]', 'href'), core.queryHTML(url, 'link[href]', 'href'), core.queryHTML(url, 'script[src]', 'src').then(function (hrefs) {
                        return hrefs.filter(function (href) {
                            return href.indexOf('http') === 0;
                        });
                    })]).then(function (reflinks) {
                        var hrefSet = reflinks.reduce(function (hrefSet, hrefs) {
                            hrefs.forEach(function (href) {
                                return hrefSet[href] = true;
                            });
                            return hrefSet;
                        }, {});

                        CliqzAttrack.linksFromDom[url] = hrefSet;
                    })]);
                },
                clearDomLinks: function clearDomLinks() {
                    for (var url in CliqzAttrack.linksFromDom) {
                        if (!CliqzAttrack.isTabURL(url)) {
                            delete CliqzAttrack.linksFromDom[url];
                            delete CliqzAttrack.cookiesFromDom[url];
                            delete CliqzAttrack.loadedTabs[url];
                        }
                    }
                },
                isTabURL: function isTabURL(url) {
                    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
                    var browserEnumerator = wm.getEnumerator("navigator:browser");

                    while (browserEnumerator.hasMoreElements()) {
                        var browserWin = browserEnumerator.getNext();
                        var tabbrowser = browserWin.gBrowser;

                        var numTabs = tabbrowser.browsers.length;
                        for (var index = 0; index < numTabs; index++) {
                            var currentBrowser = tabbrowser.getBrowserAtIndex(index);
                            if (currentBrowser) {
                                var tabURL = currentBrowser.currentURI.spec;
                                if (url == tabURL || url == tabURL.split('#')[0]) {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                },
                // Listens for requests initiated in tabs.
                // Allows us to track tab windowIDs to urls.
                tab_listener: {
                    _tabsStatus: {},

                    onStateChange: function onStateChange(evnt) {
                        var urlSpec = evnt.urlSpec;
                        var isNewPage = evnt.isNewPage;
                        var windowID = evnt.windowID;

                        // check flags for started request
                        if (isNewPage && urlSpec && windowID && urlSpec.startsWith('http')) {
                            // add window -> url pair to tab cache.
                            this._tabsStatus[windowID] = urlSpec;
                            var _key = windowID + ":" + urlSpec;
                            if (!CliqzAttrack.trackReload[_key]) {
                                CliqzAttrack.trackReload[_key] = new Date();
                            } else {
                                var t2 = new Date();
                                var dur = (t2 - CliqzAttrack.trackReload[_key]) / 1000;
                                if (dur < 30000 && countReload && windowID in CliqzAttrack.tp_events._active) {
                                    CliqzAttrack.tp_events._active[windowID]['ra'] = 1;
                                    CliqzAttrack.reloadWhiteList[_key] = t2;
                                }
                            }
                            countReload = false;
                        }
                    },

                    // Get an array of windowIDs for tabs which a currently on the given URL.
                    getTabsForURL: function getTabsForURL(url) {
                        var tabs = [];
                        for (var windowID in this._tabsStatus) {
                            var tabURL = this._tabsStatus[windowID];
                            if (url == tabURL || url == tabURL.split('#')[0]) {
                                tabs.push(windowID);
                            }
                        }
                        return tabs;
                    },

                    cleanTabsStatus: function cleanTabsStatus() {
                        var _iteratorNormalCompletion2 = true;
                        var _didIteratorError2 = false;
                        var _iteratorError2 = undefined;

                        try {
                            for (var _iterator2 = Object.keys(this._tabsStatus)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                var tabId = _step2.value;

                                if (!this.isWindowActive(tabId)) {
                                    delete this._tabsStatus[tabId];
                                }
                            }
                        } catch (err) {
                            _didIteratorError2 = true;
                            _iteratorError2 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                                    _iterator2['return']();
                                }
                            } finally {
                                if (_didIteratorError2) {
                                    throw _iteratorError2;
                                }
                            }
                        }
                    },

                    isWindowActive: browser.isWindowActive

                },
                /** Get info about trackers and blocking done in a specified tab.
                 *
                 *  Returns an object describing anti-tracking actions for this page, with keys as follows:
                 *    cookies: 'allowed' and 'blocked' counts.
                 *    requests: 'safe' and 'unsafe' counts. 'Unsafe' means that unsafe data was seen in a request to a tracker.
                 *    trackers: more detailed information about each tracker. Object with keys being tracker domain and values
                 *        more detailed blocking data.
                 */
                getTabBlockingInfo: function getTabBlockingInfo(tabId, url) {
                    var result = {
                        tab: tabId,
                        hostname: '',
                        path: '',
                        cookies: { allowed: 0, blocked: 0 },
                        requests: { safe: 0, unsafe: 0, adblock: 0 },
                        trackers: {},
                        companies: {},
                        ps: null
                    };

                    // ignore special tabs
                    if (url && (url.indexOf('about') == 0 || url.indexOf('chrome') == 0)) {
                        result.error = 'Special tab';
                        return result;
                    }

                    if (!(tabId in CliqzAttrack.tp_events._active)) {
                        // no tp event, but 'active' tab = must reload for data
                        // otherwise -> system tab
                        if (browser.isWindowActive(tabId)) {
                            result.reload = true;
                        }
                        result.error = 'No Data';
                        return result;
                    }

                    var tabData = CliqzAttrack.tp_events._active[tabId],
                        plain_data = tabData.asPlainObject(),
                        trackers = Object.keys(tabData.tps).filter(function (domain) {
                        return CliqzAttrack.qs_whitelist.isTrackerDomain(md5(getGeneralDomain(domain)).substring(0, 16)) || plain_data.tps[domain].adblock_block > 0;
                    }),
                        firstPartyCompany = CliqzAttrack.tracker_companies[getGeneralDomain(tabData.hostname)];
                    result.hostname = tabData.hostname;
                    result.path = tabData.path;
                    // result.ps = PrivacyScore.get(md5(getGeneralDomain(result.hostname)).substr(0, 16) + 'site');
                    // if (!result.ps.score) {
                    //   result.ps.getPrivacyScore();
                    // }

                    trackers.forEach(function (dom) {
                        result.trackers[dom] = {};
                        ['c', 'cookie_set', 'cookie_blocked', 'bad_cookie_sent', 'bad_qs', 'tokens_blocked', 'req_aborted', 'adblock_block'].forEach(function (k) {
                            result.trackers[dom][k] = plain_data.tps[dom][k] || 0;
                        });
                        result.cookies.allowed += result.trackers[dom]['cookie_set'] - result.trackers[dom]['cookie_blocked'];
                        result.cookies.blocked += result.trackers[dom]['cookie_blocked'];
                        result.requests.safe += result.trackers[dom]['c'] - result.trackers[dom]['bad_qs'];
                        result.requests.unsafe += result.trackers[dom]['bad_qs'];
                        result.requests.adblock += result.trackers[dom]['adblock_block'];

                        var tld = getGeneralDomain(dom),
                            company = tld;
                        // find the company behind this tracker. I
                        // If the first party is from a tracker company, then do not add the company so that the actual tlds will be shown in the list
                        if (tld in CliqzAttrack.tracker_companies && CliqzAttrack.tracker_companies[tld] !== firstPartyCompany) {
                            company = CliqzAttrack.tracker_companies[tld];
                        }
                        if (!(company in result.companies)) {
                            result.companies[company] = [];
                        }
                        result.companies[company].push(dom);
                    });

                    return result;
                },
                getCurrentTabBlockingInfo: function getCurrentTabBlockingInfo() {
                    var tabId, urlForTab;
                    try {
                        var gBrowser = utils.getWindow().gBrowser,
                            selectedBrowser = gBrowser.selectedBrowser;
                        // on FF < 38 selectBrowser.outerWindowID is undefined, so we get the windowID from _loadContext
                        tabId = selectedBrowser.outerWindowID || selectedBrowser._loadContext.DOMWindowID;
                        urlForTab = selectedBrowser.currentURI.spec;
                    } catch (e) {}
                    return CliqzAttrack.getTabBlockingInfo(tabId, urlForTab);
                },
                tracker_companies: {},
                /** Parse tracker owners list {Company: [list, of, domains]}, into lookup table {domain: Company}
                 */
                _parseTrackerCompanies: function _parseTrackerCompanies(company_list) {
                    var rev_list = {};
                    for (var company in company_list) {
                        company_list[company].forEach(function (d) {
                            rev_list[d] = company;
                        });
                    }
                    CliqzAttrack.tracker_companies = rev_list;
                },
                /** Enables Attrack module with cookie, QS and referrer protection enabled.
                 *  if module_only is set to true, will not set preferences for cookie, QS and referrer protection (for selective loading in AB tests)
                 */
                enableModule: function enableModule(module_only) {
                    if (CliqzAttrack.isEnabled()) {
                        return;
                    }
                    utils.setPref(CliqzAttrack.ENABLE_PREF, true);
                    if (!module_only) {
                        utils.setPref('attrackBlockCookieTracking', true);
                        utils.setPref('attrackRemoveQueryStringTracking', true);
                    }
                },
                /** Disables anti-tracking immediately.
                 */
                disableModule: function disableModule() {
                    utils.setPref(CliqzAttrack.ENABLE_PREF, false);
                },
                disabled_sites: new Set(),
                DISABLED_SITES_PREF: "attrackSourceDomainWhitelist",
                saveSourceDomainWhitelist: function saveSourceDomainWhitelist() {
                    utils.setPref(CliqzAttrack.DISABLED_SITES_PREF, JSON.stringify(Array.from(CliqzAttrack.disabled_sites)));
                },
                isSourceWhitelisted: function isSourceWhitelisted(hostname) {
                    return CliqzAttrack.disabled_sites.has(hostname);
                },
                addSourceDomainToWhitelist: function addSourceDomainToWhitelist(domain) {
                    CliqzAttrack.disabled_sites.add(domain);
                    // also send domain to humanweb
                    telemetry.telemetry({
                        'type': telemetry.msgType,
                        'action': 'attrack.whitelistDomain',
                        'payload': domain
                    });
                    CliqzAttrack.saveSourceDomainWhitelist();
                },
                removeSourceDomainFromWhitelist: function removeSourceDomainFromWhitelist(domain) {
                    CliqzAttrack.disabled_sites['delete'](domain);
                    CliqzAttrack.saveSourceDomainWhitelist();
                }
            };

            _export('default', CliqzAttrack);
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9hdHRyYWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztnZUE0QkksV0FBVyxFQTBEWCxZQUFZOztBQXhEaEIsYUFBUyxhQUFhLEdBQUU7QUFDcEIsbUJBQVcsR0FBRyxJQUFJLENBQUM7S0FDdEI7Ozs7Ozs7OztBQVNELGFBQVMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFOztBQUVoQyxZQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0FBQ3BCLGtCQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7U0FDcEU7O0FBRUQsWUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLElBQUksRUFBRTtBQUN0QixtQkFBTyxHQUFHLENBQUM7U0FDWixNQUNJO0FBQ0gsbUJBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBRTtTQUMvQztLQUNGOzs7Ozs7Ozs7Ozs7Ozs7QUFlRCxhQUFTLHNCQUFzQixDQUFDLFdBQVcsRUFBRTs7QUFFM0MsWUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ2QsWUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO0FBQ3BDLFlBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQzs7O0FBRy9ELFlBQUkscUJBQXFCLEdBQUcsRUFBRSxDQUFDOztBQUUvQixhQUFLLElBQUksV0FBVyxJQUFJLFdBQVcsRUFBRTtBQUNuQyxnQkFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztB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Q3pCLGdDQUFRLEVBQUUseUJBQXlCO0FBQ25DLGlDQUFTLEVBQUUsTUFBTTtxQkFDbEIsQ0FBQyxDQUFDO0FBQ0gsZ0NBQVksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO2lCQUMxQztBQUNELCtDQUErQixFQUFFLHlDQUFTLE1BQU0sRUFBRTtBQUNoRCxnQ0FBWSxDQUFDLGNBQWMsVUFBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNDLGdDQUFZLENBQUMseUJBQXlCLEVBQUUsQ0FBQztpQkFDMUM7YUFDSjs7K0JBRWMsWUFBWSIsImZpbGUiOiJhbnRpdHJhY2tpbmcvYXR0cmFjay5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBUaGlzIG1vZHVsZSBwcmV2ZW50cyB1c2VyIGZyb20gM3JkIHBhcnR5IHRyYWNraW5nXG4gKi9cbmltcG9ydCBwYWNlbWFrZXIgZnJvbSAnYW50aXRyYWNraW5nL3BhY2VtYWtlcic7XG5pbXBvcnQgKiBhcyBwZXJzaXN0IGZyb20gJ2FudGl0cmFja2luZy9wZXJzaXN0ZW50LXN0YXRlJztcbmltcG9ydCBUZW1wU2V0IGZyb20gJ2FudGl0cmFja2luZy90ZW1wLXNldCc7XG5pbXBvcnQgSHR0cFJlcXVlc3RDb250ZXh0IGZyb20gJ2FudGl0cmFja2luZy93ZWJyZXF1ZXN0LWNvbnRleHQnO1xuaW1wb3J0IHRwX2V2ZW50cyBmcm9tICdhbnRpdHJhY2tpbmcvdHBfZXZlbnRzJztcbmltcG9ydCBtZDUgZnJvbSAnYW50aXRyYWNraW5nL21kNSc7XG5pbXBvcnQgeyBwYXJzZVVSTCwgZFVSSUMsIGdldEhlYWRlck1ENSwgVVJMSW5mbywgc2h1ZmZsZSwgZmluZE9hdXRoIH0gZnJvbSAnYW50aXRyYWNraW5nL3VybCc7XG5pbXBvcnQgeyBnZXRHZW5lcmFsRG9tYWluLCBzYW1lR2VuZXJhbERvbWFpbiB9IGZyb20gJ2FudGl0cmFja2luZy9kb21haW4nO1xuaW1wb3J0IHsgSGFzaFByb2IgfSBmcm9tICdhbnRpdHJhY2tpbmcvaGFzaCc7XG5pbXBvcnQgeyBUcmFja2VyVFhULCBzbGVlcCwgZ2V0RGVmYXVsdFRyYWNrZXJUeHRSdWxlIH0gZnJvbSAnYW50aXRyYWNraW5nL3RyYWNrZXItdHh0JztcbmltcG9ydCB7IEF0dHJhY2tCbG9vbUZpbHRlciB9IGZyb20gJ2FudGl0cmFja2luZy9ibG9vbS1maWx0ZXInO1xuaW1wb3J0ICogYXMgZGF0ZXRpbWUgZnJvbSAnYW50aXRyYWNraW5nL3RpbWUnO1xuaW1wb3J0IFFTV2hpdGVsaXN0IGZyb20gJ2FudGl0cmFja2luZy9xcy13aGl0ZWxpc3RzJztcbmltcG9ydCBCbG9ja0xvZyBmcm9tICdhbnRpdHJhY2tpbmcvYmxvY2stbG9nJztcbmltcG9ydCB7IHV0aWxzLCBldmVudHMsIFByb21pc2UgfSBmcm9tICdjb3JlL2NsaXF6JztcbmltcG9ydCBSZXNvdXJjZUxvYWRlciBmcm9tICdjb3JlL3Jlc291cmNlLWxvYWRlcic7XG5pbXBvcnQgY29yZSBmcm9tICdjb3JlL2JhY2tncm91bmQnO1xuaW1wb3J0IENvb2tpZUNoZWNrZXIgZnJvbSAnYW50aXRyYWNraW5nL2Nvb2tpZS1jaGVja2VyJztcbmltcG9ydCBUcmFja2VyUHJveHkgZnJvbSAnYW50aXRyYWNraW5nL3RyYWNrZXItcHJveHknO1xuaW1wb3J0IHsgY29tcHJlc3Npb25BdmFpbGFibGUsIHNwbGl0VGVsZW1ldHJ5RGF0YSwgY29tcHJlc3NKU09OVG9CYXNlNjQsIGdlbmVyYXRlUGF5bG9hZCB9IGZyb20gJ2FudGl0cmFja2luZy91dGlscyc7XG5pbXBvcnQge1ByaXZhY3lTY29yZX0gZnJvbSAnYW50aXRyYWNraW5nL3ByaXZhY3ktc2NvcmUnO1xuaW1wb3J0ICogYXMgYnJvd3NlciBmcm9tICdwbGF0Zm9ybS9icm93c2VyJztcbmltcG9ydCBXZWJSZXF1ZXN0IGZyb20gJ2NvcmUvd2VicmVxdWVzdCc7XG5pbXBvcnQgdGVsZW1ldHJ5IGZyb20gJ2FudGl0cmFja2luZy90ZWxlbWV0cnknO1xuXG52YXIgY291bnRSZWxvYWQgPSBmYWxzZTtcblxuZnVuY3Rpb24gb25VcmxiYXJGb2N1cygpe1xuICAgIGNvdW50UmVsb2FkID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBBZGQgcGFkZGluZyBjaGFyYWN0ZXJzIHRvIHRoZSBsZWZ0IG9mIHRoZSBnaXZlbiBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciAgLSBvcmlnaW5hbCBzdHJpbmcuXG4gKiBAcGFyYW0ge3N0cmluZ30gY2hhciAtIGNoYXIgdXNlZCBmb3IgcGFkZGluZyB0aGUgc3RyaW5nLlxuICogQHBhcmFtIHtudW1iZXJ9IHNpemUgLSBkZXNpcmVkIHNpemUgb2YgdGhlIHJlc3VsdGluZyBzdHJpbmcgKGFmdGVyIHBhZGRpbmcpXG4qKi9cbmZ1bmN0aW9uIGxlZnRwYWQoc3RyLCBjaGFyLCBzaXplKSB7XG4gIC8vIFRoaXMgZnVuY3Rpb24gb25seSBtYWtlcyBzZW5zIGlmIGBjaGFyYCBpcyBhIGNoYXJhY3Rlci5cbiAgaWYgKGNoYXIubGVuZ3RoICE9IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJgY2hhcmAgYXJndW1lbnQgbXVzdCBvbmx5IGNvbnRhaW4gb25lIGNoYXJhY3RlclwiKTtcbiAgfVxuXG4gIGlmIChzdHIubGVuZ3RoID49IHNpemUpIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiAoY2hhci5yZXBlYXQoc2l6ZSAtIHN0ci5sZW5ndGgpICsgc3RyKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZSBhbnkgdHJhY2Ugb2Ygc291cmNlIGRvbWFpbnMsIG9yIGhhc2hlcyBvZiBzb3VyY2UgZG9tYWluc1xuICogZnJvbSB0aGUgZGF0YSB0byBiZSBzZW50IHRvIHRoZSBiYWNrZW5kLiBUaGlzIGlzIG1hZGUgdG8gZW5zdXJlXG4gKiB0aGVyZSBpcyBubyB3YXkgdG8gYmFja3RyYWNrIHRvIHVzZXIncyBoaXN0b3J5IHVzaW5nIGRhdGEgc2VudCB0b1xuICogdGhlIGJhY2tlbmQuXG4gKlxuICogUmVwbGFjZSBhbGwgdGhlIGtleXMgb2YgYHRyYWNrZXJEYXRhYCAod2hpY2ggYXJlIDE2LWNoYXJzIHByZWZpeGVzIG9mXG4gKiBoYXNoIG9mIHRoZSBzb3VyY2UgZG9tYWluKSBieSB1bmlxdWUgcmFuZG9tIHN0cmluZ3Mgb2Ygc2l6ZSAxNiAod2hpY2ggaXNcbiAqIGV4cGVjdGVkIGJ5IGJhY2tlbmQpLiBXZSBkb24ndCBoYXZlIHRvIG1ha2UgdGhlbSB1bmlxdWUgYW1vbmcgYWxsIGRhdGEsXG4gKiBpdCBpcyBlbm91Z2ggdG8gZW5zdXJlIHVuaWNpdHkgb24gYSBwZXItdHJhY2tlciBiYXNpcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdHJhY2tlckRhdGEgLSBhc3NvY2lhdGUgc291cmNlIGRvbWFpbnMgdG8ga2V5L3ZhbHVlIHBhaXJzLlxuKiovXG5mdW5jdGlvbiBhbm9ueW1pemVUcmFja2VyVG9rZW5zKHRyYWNrZXJEYXRhKSB7XG4gIC8vIFJhbmRvbSBiYXNlIGlkXG4gIGNvbnN0IG1pbiA9IDE7XG4gIGNvbnN0IG1heCA9IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSO1xuICBsZXQgcmFuZElkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcblxuICAvLyBBbm9ueW1pemUgdGhlIGdpdmVuIHRyYWNrZXIgZGF0YVxuICBsZXQgYW5vbnltaXplZFRyYWNrZXJEYXRhID0ge307XG5cbiAgZm9yIChsZXQgb3JpZ2luYWxLZXkgaW4gdHJhY2tlckRhdGEpIHtcbiAgICBjb25zdCBuZXdSYW5kb21LZXkgPSBsZWZ0cGFkKHJhbmRJZC50b1N0cmluZygpLnN1YnN0cigwLCAxNiksICcwJywgMTYpO1xuICAgIHJhbmRJZCA9IChyYW5kSWQgKyAxKSAlIG1heDtcbiAgICBhbm9ueW1pemVkVHJhY2tlckRhdGFbbmV3UmFuZG9tS2V5XSA9IHRyYWNrZXJEYXRhW29yaWdpbmFsS2V5XTtcbiAgfVxuXG4gIHJldHVybiBhbm9ueW1pemVkVHJhY2tlckRhdGE7XG59XG5cbnZhciBDbGlxekF0dHJhY2sgPSB7XG4gICAgVkVSU0lPTjogJzAuOTYnLFxuICAgIE1JTl9CUk9XU0VSX1ZFUlNJT046IDM1LFxuICAgIExPR19LRVk6ICdhdHRyYWNrJyxcbiAgICBWRVJTSU9OQ0hFQ0tfVVJMOiAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvd2hpdGVsaXN0L3ZlcnNpb25jaGVjay5qc29uJyxcbiAgICBVUkxfQUxFUlRfUlVMRVM6ICdjaHJvbWU6Ly9jbGlxei9jb250ZW50L2FudGktdHJhY2tpbmctcnVsZXMuanNvbicsXG4gICAgVVJMX0JMT0NLX1JVTEVTOiAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvd2hpdGVsaXN0L2FudGktdHJhY2tpbmctYmxvY2stcnVsZXMuanNvbicsXG4gICAgRU5BQkxFX1BSRUY6ICdhbnRpVHJhY2tUZXN0JyxcbiAgICBkZWJ1ZzogZmFsc2UsXG4gICAgbXNnVHlwZTonYXR0cmFjaycsXG4gICAgdGltZUNsZWFuaW5nQ2FjaGU6IDE4MCoxMDAwLFxuICAgIHRpbWVBZnRlckxpbms6IDUqMTAwMCxcbiAgICB0aW1lQWN0aXZlOiAyMCoxMDAwLFxuICAgIHRpbWVCb290dXA6IDEwKjEwMDAsXG4gICAgYm9vdHVwVGltZTogRGF0ZS5ub3coKSxcbiAgICBib290aW5nVXA6IHRydWUsXG4gICAgd2hpdGVsaXN0OiBudWxsLFxuICAgIG9ic0NvdW50ZXI6IHt9LFxuICAgIHNpbWlsYXJBZGRvbjogZmFsc2UsXG4gICAgYmxvY2tpbmdGYWlsZWQ6e30sXG4gICAgdHJhY2tSZWxvYWQ6e30sXG4gICAgcmVsb2FkV2hpdGVMaXN0Ont9LFxuICAgIHRva2VuRG9tYWluQ291bnRUaHJlc2hvbGQ6IDIsXG4gICAgc2FmZUtleUV4cGlyZTogNyxcbiAgICBsb2NhbEJsb2NrRXhwaXJlOiAyNCxcbiAgICBzaG9ydFRva2VuTGVuZ3RoOiA4LFxuICAgIHNhZmVrZXlWYWx1ZXNUaHJlc2hvbGQ6IDQsXG4gICAgY0NoZWNrZXI6IG5ldyBDb29raWVDaGVja2VyKCksXG4gICAgcXNCbG9ja1J1bGU6IG51bGwsICAvLyBsaXN0IG9mIGRvbWFpbnMgc2hvdWxkIGJlIGJsb2NrZWQgaW5zdGVhZCBvZiBzaHVmZmxpbmdcbiAgICBibG9ja2VkOiBudWxsLCAgLy8gbG9nIHdoYXQncyBiZWVuIGJsb2NrZWRcbiAgICBwbGFjZUhvbGRlcjogJycsXG4gICAgdHBfZXZlbnRzOiB0cF9ldmVudHMsXG4gICAgdG9rZW5zOiBudWxsLFxuICAgIGluc3RhbnRUb2tlbkNhY2hlOiB7fSxcbiAgICByZXF1ZXN0S2V5VmFsdWU6IG51bGwsXG4gICAgcmVjZW50bHlNb2RpZmllZDogbmV3IFRlbXBTZXQoKSxcbiAgICBjbGlxekhlYWRlcjogJ0NMSVFaLUFudGlUcmFja2luZycsXG4gICAgcmVwbGFjZW1lbnQ6IFwiXCIsXG4gICAgb2JmdXNjYXRlOiBmdW5jdGlvbihzLCBtZXRob2QsIHJlcGxhY2VtZW50KSB7XG4gICAgICAgIC8vIHVzZWQgd2hlbiBhY3Rpb24gIT0gJ2Jsb2NrJ1xuICAgICAgICAvLyBkZWZhdWx0IGlzIGEgcGxhY2Vob2xkZXJcbiAgICAgICAgc3dpdGNoKG1ldGhvZCkge1xuICAgICAgICBjYXNlICdlbXB0eSc6XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIGNhc2UgJ3JlcGxhY2UnOlxuICAgICAgICAgICAgcmV0dXJuIHNodWZmbGUocyk7XG4gICAgICAgIGNhc2UgJ3NhbWUnOlxuICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIGNhc2UgJ3BsYWNlaG9sZGVyJzpcbiAgICAgICAgICAgIHJldHVybiBDbGlxekF0dHJhY2sucGxhY2VIb2xkZXI7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gQ2xpcXpBdHRyYWNrLnBsYWNlSG9sZGVyO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBib290dXBXaGl0ZWxpc3RDYWNoZToge30sXG4gICAgYmxvY2tlZENhY2hlOiB7fSxcbiAgICB2aXNpdENhY2hlOiB7fSxcbiAgICBjb250ZXh0T2F1dGg6IHt9LFxuICAgIGxpbmtzRnJvbURvbToge30sXG4gICAgY29va2llc0Zyb21Eb206IHt9LFxuICAgIGxvYWRlZFRhYnM6IHt9LFxuICAgIGJyZWFrYWdlQ2FjaGU6IHt9LFxuICAgIGdldEJyb3dzZXJNYWpvclZlcnNpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZhciBhcHBJbmZvID0gQ29tcG9uZW50cy5jbGFzc2VzW1wiQG1vemlsbGEub3JnL3hyZS9hcHAtaW5mbzsxXCJdXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5nZXRTZXJ2aWNlKENvbXBvbmVudHMuaW50ZXJmYWNlcy5uc0lYVUxBcHBJbmZvKTtcbiAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoYXBwSW5mby52ZXJzaW9uLnNwbGl0KCcuJylbMF0pO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAvLyBmYWxsYmFjayBmb3Igd2hlbiBubyB2ZXJzaW9uIEFQSVxuICAgICAgICAgIHJldHVybiAxMDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGdldFByaXZhdGVWYWx1ZXM6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgICAgICAvLyBjcmVhdGVzIGEgbGlzdCBvZiByZXR1cm4gdmFsdWVzIG9mIGZ1bmN0aW9ucyBtYXkgbGVhayBwcml2YXRlIGluZm9cbiAgICAgICAgdmFyIHAgPSB7fTtcbiAgICAgICAgLy8gdmFyIG5hdmlnYXRvciA9IHV0aWxzLmdldFdpbmRvdygpLm5hdmlnYXRvcjtcbiAgICAgICAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XG4gICAgICAgIC8vIHBsdWdpbnNcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYXZpZ2F0b3IucGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBuYXZpZ2F0b3IucGx1Z2luc1tpXS5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWUubGVuZ3RoID49IDgpIHtcbiAgICAgICAgICAgICAgICBwW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBDbGlxekF0dHJhY2sucHJpdmF0ZVZhbHVlcyA9IHA7XG4gICAgfSxcbiAgICBnZXRDb29raWVWYWx1ZXM6IGZ1bmN0aW9uKGMsIHVybCkge1xuICAgICAgICBpZiAoYyA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHYgPSAwLCBjb29raWVzID0ge307XG4gICAgICAgIGlmIChjLm1hdGNoKC9eXFxzKlxcJFZlcnNpb249KD86XCIxXCJ8MSk7XFxzKiguKikvKSkge1xuICAgICAgICAgICAgYyA9IFJlZ0V4cC4kMTtcbiAgICAgICAgICAgIHYgPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2ID09PSAwKSB7XG4gICAgICAgICAgICBjLnNwbGl0KC9bLDtdLykubWFwKGZ1bmN0aW9uKGNvb2tpZSkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJ0cyA9IGNvb2tpZS5zcGxpdCgvPS8pO1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPiAxKSBwYXJ0c1sxXSA9IHBhcnRzLnNsaWNlKDEpLmpvaW4oJz0nKTtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IGRVUklDKHBhcnRzWzBdLnRyaW1MZWZ0KCkpLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcnRzLmxlbmd0aCA+IDEgPyBkVVJJQyhwYXJ0c1sxXS50cmltUmlnaHQoKSkgOiBudWxsO1xuICAgICAgICAgICAgICAgIGNvb2tpZXNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYy5tYXRjaCgvKD86XnxcXHMrKShbISMkJSYnKitcXC0uMC05QS1aXmBhLXp8fl0rKT0oWyEjJCUmJyorXFwtLjAtOUEtWl5gYS16fH5dKnxcIig/OltcXHgyMC1cXHg3RVxceDgwXFx4RkZdfFxcXFxbXFx4MDAtXFx4N0ZdKSpcIikoPz1cXHMqWyw7XXwkKS9nKS5tYXAoZnVuY3Rpb24oJDAsICQxKSB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9ICQwLFxuICAgICAgICAgICAgICAgIHZhbHVlID0gJDEuY2hhckF0KDApID09PSAnXCInXG4gICAgICAgICAgICAgICAgICAgICAgICAgID8gJDEuc3Vic3RyKDEsIC0xKS5yZXBsYWNlKC9cXFxcKC4pL2csIFwiJDFcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgOiAkMTtcbiAgICAgICAgICAgICAgICBjb29raWVzW25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyByZXR1cm4gY29va2llcztcbiAgICAgICAgdmFyIGNvb2tpZVZhbCA9IHt9O1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29va2llcykge1xuICAgICAgICAgICAgaWYgKHVybC5pbmRleE9mKGNvb2tpZXNba2V5XSkgPT0gLTEpIHsgLy8gY29va2llcyBzYXZlIGFzIHBhcnQgb2YgdGhlIHVybCBpcyBhbGxvd2VkXG4gICAgICAgICAgICAgICAgY29va2llVmFsW2Nvb2tpZXNba2V5XV0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb29raWVWYWw7XG4gICAgfSxcbiAgICBodHRwb3Blbk9ic2VydmVyOiB7XG4gICAgICAgIG9ic2VydmUgOiBmdW5jdGlvbihyZXF1ZXN0RGV0YWlscykge1xuICAgICAgICAgICAgaWYgKCFDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHJlcXVlc3RDb250ZXh0ID0gbmV3IEh0dHBSZXF1ZXN0Q29udGV4dChyZXF1ZXN0RGV0YWlscyk7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVxdWVzdENvbnRleHQudXJsO1xuICAgICAgICAgICAgaWYgKCF1cmwgfHwgdXJsID09ICcnKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgdXJsX3BhcnRzID0gVVJMSW5mby5nZXQodXJsKTtcblxuICAgICAgICAgICAgaWYgKHJlcXVlc3RDb250ZXh0LmlzRnVsbFBhZ2UoKSkge1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMub25GdWxsUGFnZSh1cmxfcGFydHMsIHJlcXVlc3RDb250ZXh0LmdldE91dGVyV2luZG93SUQoKSwgcmVxdWVzdENvbnRleHQuaXNDaGFubmVsUHJpdmF0ZSgpKTtcbiAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmlzVHJhY2tlclR4dEVuYWJsZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICBUcmFja2VyVFhULmdldCh1cmxfcGFydHMpLnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suYmxvY2tMb2cuaW5jcmVtZW50TG9hZGVkUGFnZXMoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoaXMgbmVlZHMgdG8gYmUgYSBjb21tb24gZnVuY3Rpb24gYXN3ZWxsLiBBbHNvIGNvbnNpZGVyIGdldHRpbmcgT1JJR0lOIGhlYWRlci5cbiAgICAgICAgICAgIHZhciByZWZlcnJlciA9IHJlcXVlc3RDb250ZXh0LmdldFJlZmVycmVyKCk7XG4gICAgICAgICAgICB2YXIgc2FtZV9nZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBXZSBuZWVkIHRvIGdldCB0aGUgc291cmNlIGZyb20gd2hlcmUgdGhlIHJlcXVlc3Qgb3JpZ2luYXRlZC5cbiAgICAgICAgICAgIC8vIFRoZXJlIGFyZSB0d28gd2F5cyBpbiB3aGljaCB3ZSBjYW4gZ2V0IGl0LlxuICAgICAgICAgICAgLy8gMS4gaGVhZGVyIC0+IFJFRkVSUkVSXG4gICAgICAgICAgICAvLyAyLiBHZXQgc291cmNlIHVybC5cbiAgICAgICAgICAgIC8vIDMuIGhlYWRlciAtPiBPUklHSU4gKFRoaXMgbmVlZHMgdG8gYmUgaW52ZXN0aWdhdGVkLilcblxuICAgICAgICAgICAgdmFyIHNvdXJjZV91cmwgPSByZXF1ZXN0Q29udGV4dC5nZXRMb2FkaW5nRG9jdW1lbnQoKSxcbiAgICAgICAgICAgICAgICBzb3VyY2VfdXJsX3BhcnRzID0gbnVsbCxcbiAgICAgICAgICAgICAgICBzb3VyY2VfdGFiID0gcmVxdWVzdENvbnRleHQuZ2V0T3JpZ2luV2luZG93SUQoKTtcblxuICAgICAgICAgICAgdmFyIHBhZ2VfbG9hZF90eXBlID0gbnVsbDtcbiAgICAgICAgICAgIHZhciByZXF1ZXN0X3R5cGUgPSBudWxsO1xuICAgICAgICAgICAgc3dpdGNoKHJlcXVlc3RDb250ZXh0LmdldENvbnRlbnRQb2xpY3lUeXBlKCkpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICAgICAgICAgIHBhZ2VfbG9hZF90eXBlID0gXCJmdWxscGFnZVwiO1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0X3R5cGUgPSBcImZ1bGxwYWdlXCI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNzogcGFnZV9sb2FkX3R5cGUgPSBcImZyYW1lXCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHBhZ2VfbG9hZF90eXBlID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzb3VyY2VfdXJsID09ICcnIHx8IHNvdXJjZV91cmwuaW5kZXhPZignYWJvdXQ6Jyk9PTApIHJldHVybjtcbiAgICAgICAgICAgIGlmKHBhZ2VfbG9hZF90eXBlID09ICdmdWxscGFnZScpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gbW9kaWZ5IG9yIGNhbmNlbCB0aGUgaHR0cCByZXF1ZXN0IGlmIHRoZSB1cmwgY29udGFpbnMgcGVyc29uYWwgaWRlbnRpZmllclxuICAgICAgICAgICAgLy8gTm93IHJlZnN0ciBzaG91bGQgbm90IGJlIG51bGwsIGJ1dCBzdGlsbCBrZWVwaW5nIHRoZSBjbGF1c2UgdG8gY2hlY2sgZnJvbSBlZGdlIGNhc2VzLlxuXG4gICAgICAgICAgICBpZiAoc291cmNlX3VybCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgc291cmNlX3VybF9wYXJ0cyA9IFVSTEluZm8uZ2V0KHNvdXJjZV91cmwpO1xuXG4gICAgICAgICAgICAgICAgLy8gc2FtZSBnZW5lcmFsIGRvbWFpblxuICAgICAgICAgICAgICAgIHNhbWVfZ2QgPSBzYW1lR2VuZXJhbERvbWFpbih1cmxfcGFydHMuaG9zdG5hbWUsIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpIHx8IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChzYW1lX2dkKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gZmluZCB0aGUgb2sgdG9rZW5zIGZpZWxkc1xuICAgICAgICAgICAgICAgIHZhciBpc1ByaXZhdGUgPSByZXF1ZXN0Q29udGV4dC5pc0NoYW5uZWxQcml2YXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ByaXZhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmV4YW1pbmVUb2tlbnModXJsX3BhcnRzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBleHRyYWN0IGFuZCBzYXZlIHRva2Vuc1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5leHRyYWN0S2V5VG9rZW5zKHVybF9wYXJ0cywgc291cmNlX3VybF9wYXJ0c1snaG9zdG5hbWUnXSwgaXNQcml2YXRlLCBDbGlxekF0dHJhY2suc2F2ZUtleVRva2Vucyk7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnJlY29yZExpbmtzRm9yVVJMKHNvdXJjZV91cmwpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHJlZmxpbmtzID0gQ2xpcXpBdHRyYWNrLmxpbmtzRnJvbURvbVtzb3VyY2VfdXJsXSB8fCB7fTtcblxuICAgICAgICAgICAgICAgIC8vIHdvcmsgYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vY2xpcXovbmF2aWdhdGlvbi1leHRlbnNpb24vaXNzdWVzLzEyMzBcbiAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLnJlY2VudGx5TW9kaWZpZWQuY29udGFpbnMoc291cmNlX3RhYiArIHVybCkpIHtcbiAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnJlY2VudGx5TW9kaWZpZWQuZGVsZXRlKHNvdXJjZV90YWIgKyB1cmwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2NhbmNlbDogdHJ1ZX0gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodXJsIGluIHJlZmxpbmtzKSB7XG4gICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCBcInVybF9pbl9yZWZsaW5rc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGxvZyB0aGlyZCBwYXJ0eSByZXF1ZXN0XG4gICAgICAgICAgICAgICAgdmFyIHJlcV9sb2cgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmKHVybF9wYXJ0cy5ob3N0bmFtZSAhPSBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcV9sb2cgPSBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmdldCh1cmwsIHVybF9wYXJ0cywgc291cmNlX3VybCwgc291cmNlX3VybF9wYXJ0cywgc291cmNlX3RhYik7XG4gICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHVybF9wYXJ0c1sncXVlcnknXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnaGFzX3FzJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYodXJsX3BhcnRzWydwYXJhbWV0ZXJzJ10ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2hhc19wcycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKHVybF9wYXJ0c1snZnJhZ21lbnQnXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnaGFzX2ZyYWdtZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbnRlbnRfdHlwZSA9IHJlcXVlc3RDb250ZXh0LmdldENvbnRlbnRQb2xpY3lUeXBlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY29udGVudF90eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgXCJ0eXBlX3Vua25vd25cIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgXCJ0eXBlX1wiICsgY29udGVudF90eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGxvZyBwcm90b2NvbCAoc2VjdXJlIG9yIG5vdClcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNIVFRQID0gcHJvdG9jb2wgPT4gcHJvdG9jb2wgPT09IFwiaHR0cFwiIHx8IHByb3RvY29sID09PSBcImh0dHBzXCJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2NoZW1lID0gaXNIVFRQKHVybF9wYXJ0cy5wcm90b2NvbCkgPyB1cmxfcGFydHMucHJvdG9jb2wgOiBcIm90aGVyXCI7XG4gICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdzY2hlbWVfJyArIHNjaGVtZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gZmluZCBmcmFtZSBkZXB0aFxuICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnd2luZG93X2RlcHRoXycgKyByZXF1ZXN0Q29udGV4dC5nZXRXaW5kb3dEZXB0aCgpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBnZXQgY29va2llIGRhdGFcbiAgICAgICAgICAgICAgICB2YXIgY29va2lldmFsdWUgPSB7fSxcbiAgICAgICAgICAgICAgICAgICAgZG9jQ29va2llID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZV91cmwgaW4gQ2xpcXpBdHRyYWNrLmNvb2tpZXNGcm9tRG9tICYmIENsaXF6QXR0cmFjay5jb29raWVzRnJvbURvbVtzb3VyY2VfdXJsXSkge1xuICAgICAgICAgICAgICAgICAgICBkb2NDb29raWUgPSBDbGlxekF0dHJhY2suY29va2llc0Zyb21Eb21bc291cmNlX3VybF07XG4gICAgICAgICAgICAgICAgICAgIGNvb2tpZXZhbHVlID0gQ2xpcXpBdHRyYWNrLmdldENvb2tpZVZhbHVlcyhkb2NDb29raWUsIHVybCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdHJ5IHRvIGdldCB0aGUgZG9jdW1lbnQgZnJvbSBzb3VyY2VcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2UubGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2NDb29raWUgPSBzb3VyY2UubGMudG9wV2luZG93LmRvY3VtZW50LmNvb2tpZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZG9jQ29va2llKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvb2tpZXZhbHVlID0gQ2xpcXpBdHRyYWNrLmdldENvb2tpZVZhbHVlcyhkb2NDb29raWUsIHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29va2llZGF0YSA9IHJlcXVlc3RDb250ZXh0LmdldFJlcXVlc3RIZWFkZXIoJ0Nvb2tpZScpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29va2llMiA9IENsaXF6QXR0cmFjay5nZXRDb29raWVWYWx1ZXMoY29va2llZGF0YSwgdXJsKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvb2tpZTIgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBjIGluIGNvb2tpZTIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29va2lldmFsdWVbY10gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBzdGF0cyA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBiYWRUb2tlbnMgPSBDbGlxekF0dHJhY2suY2hlY2tUb2tlbnModXJsX3BhcnRzLCBzb3VyY2VfdXJsLCBjb29raWV2YWx1ZSwgc3RhdHMsIHNvdXJjZV91cmxfcGFydHMpO1xuICAgICAgICAgICAgICAgIGlmKHJlcV9sb2cpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2F2ZSB0b2tlbiBzdGF0cyB0byB0aGUgbG9nLlxuICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhzdGF0cykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXRzW2tleV0gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ3Rva2VuLmhhc18nKyBrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICd0b2tlbi4nKyBrZXksIHN0YXRzW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoYmFkVG9rZW5zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sudHJhY2tlclByb3h5LmNoZWNrU2hvdWxkUHJveHkodXJsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ3Byb3h5Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEJsb2NrIHJlcXVlc3QgYmFzZWQgb24gcnVsZXMgc3BlY2lmaWVkXG4gICAgICAgICAgICAgICAgdmFyIF9rZXkgPSBzb3VyY2VfdGFiICsgXCI6XCIgKyBzb3VyY2VfdXJsO1xuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suaXNRU0VuYWJsZWQoKSAmJiAhKENsaXF6QXR0cmFjay5yZWxvYWRXaGl0ZUxpc3RbX2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgQ2xpcXpBdHRyYWNrLnFzQmxvY2tSdWxlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc1J1bGUgPSBDbGlxekF0dHJhY2sucXNCbG9ja1J1bGVbaV1bMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdVJ1bGUgPSBDbGlxekF0dHJhY2sucXNCbG9ja1J1bGVbaV1bMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZS5lbmRzV2l0aChzUnVsZSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmxfcGFydHMuaG9zdG5hbWUuZW5kc1dpdGgodVJ1bGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ3JlcV9ydWxlX2Fib3J0ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2NhbmNlbDogdHJ1ZX07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihiYWRUb2tlbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnYmFkX3FzJyk7XG4gICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdiYWRfdG9rZW5zJywgYmFkVG9rZW5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gYWx0ZXJpbmcgcmVxdWVzdFxuICAgICAgICAgICAgICAgIC8vIEFkZGl0aW9uYWwgY2hlY2sgdG8gdmVyaWZ5IGlmIHRoZSB1c2VyIHJlbG9hZGVkIHRoZSBwYWdlLlxuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suaXNRU0VuYWJsZWQoKSAmJiAhKENsaXF6QXR0cmFjay5yZWxvYWRXaGl0ZUxpc3RbX2tleV0pKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5pc1NvdXJjZVdoaXRlbGlzdGVkKHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgXCJzb3VyY2Vfd2hpdGVsaXN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5sb2coXCJhbHRlcmluZyByZXF1ZXN0IFwiICsgdXJsICsgXCIgXCIgKyBzb3VyY2VfdXJsICsgJyAnICsgc2FtZV9nZCwgJ3Rva2snKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmxvZygnYmFkIHRva2VuczogJyArIEpTT04uc3RyaW5naWZ5KGJhZFRva2VucyksICd0b2trJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFkVG9rZW5zLmxlbmd0aCA+IDAgJiYgQ2xpcXpBdHRyYWNrLnFzX3doaXRlbGlzdC5pc1VwVG9EYXRlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRldGVybWluIGFjdGlvbiBiYXNlZCBvbiB0cmFja2VyLnR4dFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJ1bGUgPSBDbGlxekF0dHJhY2suZ2V0RGVmYXVsdFJ1bGUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHJhY2tlclR4dCA9IFRyYWNrZXJUWFQuZ2V0KHNvdXJjZV91cmxfcGFydHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFDbGlxekF0dHJhY2suaXNGb3JjZUJsb2NrRW5hYmxlZCgpICYmIENsaXF6QXR0cmFjay5pc1RyYWNrZXJUeHRFbmFibGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RyYWNrZXJUeHQubGFzdF91cGRhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGZpcnN0IHVwZGF0ZSBpcyBub3QgcmVhZHkgeWV0IGZvciB0aGlzIGZpcnN0IHBhcnR5LCBhbGxvdyBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAndHJhY2tlci50eHRfbm90X3JlYWR5JyArIHJ1bGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGUgPSBfdHJhY2tlclR4dC5nZXRSdWxlKHVybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVsZSA9PSAnYmxvY2snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ3Rva2VuX2Jsb2NrZWRfJyArIHJ1bGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7Y2FuY2VsOiB0cnVlfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG1wX3VybCA9IHJlcXVlc3RDb250ZXh0LnVybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJhZFRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG1wX3VybC5pbmRleE9mKGJhZFRva2Vuc1tpXSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWRUb2tlbnNbaV0gPSBlbmNvZGVVUklDb21wb25lbnQoYmFkVG9rZW5zW2ldKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRtcF91cmwgPSB0bXBfdXJsLnJlcGxhY2UoYmFkVG9rZW5zW2ldLCBDbGlxekF0dHJhY2sub2JmdXNjYXRlKGJhZFRva2Vuc1tpXSwgcnVsZSwgQ2xpcXpBdHRyYWNrLnJlcGxhY2VtZW50KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW4gY2FzZSB1bnNhZmUgdG9rZW5zIHdlcmUgaW4gdGhlIGhvc3RuYW1lLCB0aGUgVVJJIGlzIG5vdCB2YWxpZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFueW1vcmUgYW5kIHdlIGNhbiBjYW5jZWwgdGhlIHJlcXVlc3QuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0bXBfdXJsLnN0YXJ0c1dpdGgodXJsX3BhcnRzLnByb3RvY29sICsgJzovLycgKyB1cmxfcGFydHMuaG9zdG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2NhbmNlbDogdHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAndG9rZW5fYmxvY2tlZF8nICsgcnVsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLnRyYWNrZXJQcm94eS5jaGVja1Nob3VsZFByb3h5KHRtcF91cmwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdwcm94eScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucmVjZW50bHlNb2RpZmllZC5hZGQoc291cmNlX3RhYiArIHVybCwgMzAwMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5yZWNlbnRseU1vZGlmaWVkLmFkZChzb3VyY2VfdGFiICsgdG1wX3VybCwgMzAwMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWRpcmVjdFVybDogdG1wX3VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RIZWFkZXJzOiBydWxlICE9ICdzYW1lJyA/IFt7bmFtZTogQ2xpcXpBdHRyYWNrLmNsaXF6SGVhZGVyLCB2YWx1ZTogJyAnfV0gOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5vIHJlZnN0cjogbWlnaHQgYmUgYWJsZSB0byBnZXQgYSByZWZlcnJlciBmcm9tIGxvYWQgY29udGV4dCB0byB2ZXJpZnkgaWYgZmF2aWNvbiBvciBleHRlbnNpb24gcmVxdWVzdFxuICAgICAgICAgICAgICAgIC8vIE5vdyB0aGlzIHNob3VsZCBub3QgaGFwcGVuLiBLZWVwaW5nIHRoZSBjb2RlIGJsb2NrIGZvciBub3cuIFdpbGwgcmVtb3ZlIGl0IGFmdGVyIG1vcmUgdGVzdGluZy5cbiAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coXCJUSElTIENBTEwgRElEIE5PVCBIQVZFIEEgUkVGXCIsXCJub19yZWZzdHJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGh0dHBSZXNwb25zZU9ic2VydmVyOiB7XG4gICAgICAgIG9ic2VydmU6IGZ1bmN0aW9uKHJlcXVlc3REZXRhaWxzKSB7XG4gICAgICAgICAgICBpZiAoIUNsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QuaXNSZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlcXVlc3RDb250ZXh0ID0gbmV3IEh0dHBSZXF1ZXN0Q29udGV4dChyZXF1ZXN0RGV0YWlscyksXG4gICAgICAgICAgICAgICAgdXJsID0gcmVxdWVzdENvbnRleHQudXJsO1xuXG4gICAgICAgICAgICBpZiAoIXVybCkgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIHVybF9wYXJ0cyA9IFVSTEluZm8uZ2V0KHVybCk7XG4gICAgICAgICAgICB2YXIgcmVmZXJyZXIgPSByZXF1ZXN0Q29udGV4dC5nZXRSZWZlcnJlcigpO1xuICAgICAgICAgICAgdmFyIHNhbWVfZ2QgPSBmYWxzZTtcblxuICAgICAgICAgICAgdmFyIHNvdXJjZV91cmwgPSByZXF1ZXN0Q29udGV4dC5nZXRMb2FkaW5nRG9jdW1lbnQoKSxcbiAgICAgICAgICAgICAgICBzb3VyY2VfdXJsX3BhcnRzID0gbnVsbCxcbiAgICAgICAgICAgICAgICBzb3VyY2VfdGFiID0gcmVxdWVzdENvbnRleHQuZ2V0T3JpZ2luV2luZG93SUQoKTtcblxuICAgICAgICAgICAgLy8gZnVsbCBwYWdlXG4gICAgICAgICAgICBpZiAocmVxdWVzdENvbnRleHQuaXNGdWxsUGFnZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKFszMDAsIDMwMSwgMzAyLCAzMDMsIDMwN10uaW5kZXhPZihyZXF1ZXN0Q29udGV4dC5jaGFubmVsLnJlc3BvbnNlU3RhdHVzKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlZGlyZWN0LCB1cGRhdGUgbG9jYXRpb24gZm9yIHRhYlxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBubyByZWRpcmVjdCBsb2NhdGlvbiBzZXQsIHN0YWdlIHRoZSB0YWIgaWQgc28gd2UgZG9uJ3QgZ2V0IGZhbHNlIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlZGlyZWN0X3VybCA9IHJlcXVlc3RDb250ZXh0LmdldFJlc3BvbnNlSGVhZGVyKFwiTG9jYXRpb25cIik7XG4gICAgICAgICAgICAgICAgICAgIGxldCByZWRpcmVjdF91cmxfcGFydHMgPSBVUkxJbmZvLmdldChyZWRpcmVjdF91cmwpO1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiByZWRpcmVjdCBpcyByZWxhdGl2ZSwgdXNlIHNvdXJjZSBkb21haW5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdF91cmxfcGFydHMuaG9zdG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZGlyZWN0X3VybF9wYXJ0cy5ob3N0bmFtZSA9IHVybF9wYXJ0cy5ob3N0bmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZGlyZWN0X3VybF9wYXJ0cy5wYXRoID0gcmVkaXJlY3RfdXJsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMub25SZWRpcmVjdChyZWRpcmVjdF91cmxfcGFydHMsIHJlcXVlc3RDb250ZXh0LmdldE91dGVyV2luZG93SUQoKSwgcmVxdWVzdENvbnRleHQuaXNDaGFubmVsUHJpdmF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc291cmNlX3VybCA9PSAnJyB8fCBzb3VyY2VfdXJsLmluZGV4T2YoJ2Fib3V0OicpPT0wKSByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChzb3VyY2VfdXJsICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzb3VyY2VfdXJsX3BhcnRzID0gVVJMSW5mby5nZXQoc291cmNlX3VybCk7XG4gICAgICAgICAgICAgICAgLy8gZXh0cmFjdCBhbmQgc2F2ZSB0b2tlbnNcbiAgICAgICAgICAgICAgICBzYW1lX2dkID0gc2FtZUdlbmVyYWxEb21haW4odXJsX3BhcnRzLmhvc3RuYW1lLCBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKSB8fCBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoc2FtZV9nZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgaWYodXJsX3BhcnRzLmhvc3RuYW1lICE9IHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXFfbG9nID0gQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5nZXQodXJsLCB1cmxfcGFydHMsIHNvdXJjZV91cmwsIHNvdXJjZV91cmxfcGFydHMsIHNvdXJjZV90YWIpO1xuICAgICAgICAgICAgICAgIGlmIChyZXFfbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdyZXNwX29iJyk7XG4gICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb250ZW50X2xlbmd0aCcsIHBhcnNlSW50KHJlcXVlc3RDb250ZXh0LmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LUxlbmd0aCcpKSB8fCAwKTtcbiAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgYHN0YXR1c18ke3JlcXVlc3RDb250ZXh0LmNoYW5uZWwucmVzcG9uc2VTdGF0dXN9YCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gaXMgY2FjaGVkP1xuICAgICAgICAgICAgICAgIGxldCBjYWNoZWQgPSByZXF1ZXN0Q29udGV4dC5pc0NhY2hlZDtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgY2FjaGVkID8gJ2NhY2hlZCcgOiAnbm90X2NhY2hlZCcpO1xuXG5cbiAgICAgICAgICAgICAgICAvLyBicm9rZW4gYnkgYXR0cmFjaz9cbiAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLnJlY2VudGx5TW9kaWZpZWQuaGFzKHNvdXJjZV90YWIgKyB1cmwpICYmIHJlcXVlc3RDb250ZXh0LmNoYW5uZWwucmVzcG9uc2VTdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBkZWR1cEtleSA9IFtzb3VyY2VfdXJsLCB1cmxfcGFydHMuaG9zdG5hbWUsIHVybF9wYXJ0cy5wYXRoXS5qb2luKCctJyk7XG4gICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suYnJlYWthZ2VDYWNoZVtkZWR1cEtleV0gPSBDbGlxekF0dHJhY2suYnJlYWthZ2VDYWNoZVtkZWR1cEtleV0gfHwge1xuICAgICAgICAgICAgICAgICAgICBob3N0bmFtZTogbWQ1KHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpLnN1YnN0cmluZygwLCAxNiksXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IG1kNShzb3VyY2VfdXJsX3BhcnRzLnBhdGgpLFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IHJlcXVlc3RDb250ZXh0LmNoYW5uZWwucmVzcG9uc2VTdGF0dXMsXG4gICAgICAgICAgICAgICAgICAgIHVybF9pbmZvOiB7XG4gICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHVybF9wYXJ0cy5wcm90b2NvbCxcbiAgICAgICAgICAgICAgICAgICAgICBob3N0bmFtZTogdXJsX3BhcnRzLmhvc3RuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IG1kNSh1cmxfcGFydHMucGF0aCksXG4gICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiB1cmxfcGFydHMuZ2V0S2V5VmFsdWVzTUQ1KCksXG4gICAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiByZXF1ZXN0Q29udGV4dC5jaGFubmVsLnJlc3BvbnNlU3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6IHJlcXVlc3RDb250ZXh0LmdldFdpbmRvd0RlcHRoKCksXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAwXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmJyZWFrYWdlQ2FjaGVbZGVkdXBLZXldLmNvdW50ICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBodHRwbW9kT2JzZXJ2ZXI6IHtcbiAgICAgICAgb2JzZXJ2ZSA6IGZ1bmN0aW9uKHJlcXVlc3REZXRhaWxzKSB7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdENvbnRleHQgPSBuZXcgSHR0cFJlcXVlc3RDb250ZXh0KHJlcXVlc3REZXRhaWxzKSxcbiAgICAgICAgICAgICAgICB1cmwgPSByZXF1ZXN0Q29udGV4dC51cmwsXG4gICAgICAgICAgICAgICAgYmxvY2tpbmdSZXNwb25zZSA9IHt9O1xuXG4gICAgICAgICAgICBpZiAoIXVybCkgcmV0dXJuO1xuXG4gICAgICAgICAgICB2YXIgdXJsX3BhcnRzID0gVVJMSW5mby5nZXQodXJsKTtcblxuICAgICAgICAgICAgdmFyIGNvb2tpZV9kYXRhID0gcmVxdWVzdENvbnRleHQuZ2V0Q29va2llRGF0YSgpO1xuXG5cbiAgICAgICAgICAgIC8vIFF1aWNrIGVzY2FwZXM6XG4gICAgICAgICAgICAvLyBsb2NhbGhvc3Qgb3Igbm8gY29va2llIGRhdGFcbiAgICAgICAgICAgIGlmICh1cmxfcGFydHNbJ2hvc3RuYW1lJ10gPT0gJ2xvY2FsaG9zdCcgfHwgIWNvb2tpZV9kYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBHYXRoZXIgbW9yZSBpbmZvIGZvciBmdXJ0aGVyIGNoZWNrc1xuICAgICAgICAgICAgdmFyIGN1cnJfdGltZSA9IERhdGUubm93KCk7XG4gICAgICAgICAgICBpZiAoKGN1cnJfdGltZSAtIENsaXF6QXR0cmFjay5ib290dXBUaW1lKSA+IENsaXF6QXR0cmFjay50aW1lQm9vdHVwKSBDbGlxekF0dHJhY2suYm9vdGluZ1VwID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGZpbGwgY29udGV4dCBvYXV0aCwgdGhpcyBuZWVkcyB0byBiZSBkb25lIGJlZm9yZSBhY2NlcHRpbmcgb3IgcmVxdWVzdGluZyB0aGUgY29va2llcy5cbiAgICAgICAgICAgIHZhciBvdXJsID0gZmluZE9hdXRoKHVybCwgdXJsX3BhcnRzKTtcbiAgICAgICAgICAgIGlmIChvdXJsKSB7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmNvbnRleHRPYXV0aCA9IHsndHMnOiBjdXJyX3RpbWUsICdodG1sJzogZFVSSUMob3VybCkgKyAnOicgKyB1cmx9O1xuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIk9BVVRIOiBcIiArIEpTT04uc3RyaW5naWZ5KENsaXF6QXR0cmFjay5jb250ZXh0T2F1dGgpLCBDbGlxekF0dHJhY2suTE9HX0tFWSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNvbnRlbnQgcG9saWN5IHR5cGUgNiA9PSBUWVBFX0RPQ1VNRU5UOiB0b3AgbGV2ZWwgZG9tIGVsZW1lbnQuIERvIG5vdCBibG9jay5cbiAgICAgICAgICAgIGlmIChyZXF1ZXN0Q29udGV4dC5pc0Z1bGxQYWdlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciByZWZlcnJlciA9IHJlcXVlc3RDb250ZXh0LmdldFJlZmVycmVyKCk7XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSByZXF1ZXN0IGlzIG9yaWdpbmF0aW5nIGZyb20gYSB0YWIsIHdlIGNhbiBnZXQgYSBzb3VyY2UgdXJsXG4gICAgICAgICAgICAvLyBUaGUgaW1wbGVtZW50YXRpb24gYmVsb3cgaXMgY2F1c2luZyBhIGJ1ZywgaWYgd2UgbG9hZCBkaWZmZXJlbnQgdXJscyBpbiBzYW1lIHRhYi5cbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYmV0dGVyIGhhbmRlbGVkIGluIGNhcHR1cmluZyByZXF1ZXN0IHR5cGUuIFdoZW4gcmVxdWVzdCB0eXBlID09IGZ1bGxwYWdlXG4gICAgICAgICAgICAvLyBUaGVuIHVyaS5zcGVjID09IHNvdXJjZV91cmxcbiAgICAgICAgICAgIC8vIE9ubHkgZ2V0IHNvdXJjZSB0YWJzIGZvciBub3cuXG5cbiAgICAgICAgICAgIHZhciBzb3VyY2VfdXJsID0gcmVxdWVzdENvbnRleHQuZ2V0TG9hZGluZ0RvY3VtZW50KCksXG4gICAgICAgICAgICAgICAgc291cmNlX3VybF9wYXJ0cyA9IG51bGwsXG4gICAgICAgICAgICAgICAgc291cmNlX3RhYiA9IHJlcXVlc3RDb250ZXh0LmdldE9yaWdpbldpbmRvd0lEKCk7XG5cbiAgICAgICAgICAgIHZhciBwYWdlX2xvYWRfdHlwZSA9IG51bGw7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdF90eXBlID0gbnVsbDtcbiAgICAgICAgICAgIHN3aXRjaChyZXF1ZXN0Q29udGV4dC5nZXRDb250ZW50UG9saWN5VHlwZSgpKSB7XG4gICAgICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAgICAgICBwYWdlX2xvYWRfdHlwZSA9IFwiZnVsbHBhZ2VcIjtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdF90eXBlID0gXCJmdWxscGFnZVwiO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDc6IHBhZ2VfbG9hZF90eXBlID0gXCJmcmFtZVwiOyBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBwYWdlX2xvYWRfdHlwZSA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZmVycmVyIGlmIHdlIGRvbid0IGZpbmQgc291cmNlIGZyb20gdGFiXG4gICAgICAgICAgICBpZiAoc291cmNlX3VybCA9PT0gdW5kZWZpbmVkIHx8IHNvdXJjZV91cmwgPT0gJycpe1xuICAgICAgICAgICAgICAgIHNvdXJjZV91cmwgPSByZWZlcnJlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFzb3VyY2VfdXJsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzb3VyY2VfdXJsX3BhcnRzID0gVVJMSW5mby5nZXQoc291cmNlX3VybCk7XG4gICAgICAgICAgICB2YXIgcmVxX2xvZyA9IG51bGw7XG5cbiAgICAgICAgICAgIHZhciBzYW1lX2dkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodXJsX3BhcnRzLmhvc3RuYW1lIT0nJyAmJiBzb3VyY2VfdXJsX3BhcnRzICYmIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUhPScnKSB7XG4gICAgICAgICAgICAgICAgc2FtZV9nZCA9IHNhbWVHZW5lcmFsRG9tYWluKHVybF9wYXJ0cy5ob3N0bmFtZSwgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzYW1lX2dkKSB7XG4gICAgICAgICAgICAgICAgLy8gbm90IGEgM3JkIHBhcnR5IGNvb2tpZSwgZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxX2xvZyA9IENsaXF6QXR0cmFjay50cF9ldmVudHMuZ2V0KHVybCwgdXJsX3BhcnRzLCBzb3VyY2VfdXJsLCBzb3VyY2VfdXJsX3BhcnRzLCBzb3VyY2VfdGFiKTtcblxuICAgICAgICAgICAgaWYgKHJlcV9sb2cgJiYgcmVxX2xvZy5jID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYmxvY2tpbmdSZXNwb25zZSA9IENsaXF6QXR0cmFjay5odHRwb3Blbk9ic2VydmVyLm9ic2VydmUocmVxdWVzdERldGFpbHMpIHx8IHt9O1xuICAgICAgICAgICAgICAgIHJlcV9sb2cgPSBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmdldCh1cmwsIHVybF9wYXJ0cywgc291cmNlX3VybCwgc291cmNlX3VybF9wYXJ0cywgc291cmNlX3RhYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfc2V0Jyk7XG4gICAgICAgICAgICBpZiAoc291cmNlX3VybC5pbmRleE9mKCdhYm91dDonKT09MCkge1xuICAgICAgICAgICAgICAgIC8vIGl0J3MgYSBicmFuZCBuZXcgdGFiLCBhbmQgdGhlIHVybCBpcyBsb2FkZWQgZXh0ZXJuYWxseSxcbiAgICAgICAgICAgICAgICAvLyBhYm91dDpob21lLCBhYm91dDpibGFua1xuICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYWxsb3dfbmV3dGFiJyk7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmFsbG93Q29va2llKHVybCwgeydkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdzcmMnOiBzb3VyY2VfdXJsLCAnZGF0YSc6IGNvb2tpZV9kYXRhLCAndHMnOiBjdXJyX3RpbWV9LCBcImFib3V0OmJsYW5rXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9ja2luZ1Jlc3BvbnNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiBkb21haW4gaXMgd2hpdGVsaXN0ZWQsXG4gICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmlzSW5XaGl0ZWxpc3QodXJsX3BhcnRzLmhvc3RuYW1lKSkge1xuICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYWxsb3dfd2hpdGVsaXN0ZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coXCJJcyB3aGl0ZWxpc3RlZCAodHlwZTogZGlyZWN0KTogXCIgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGhvc3QgPSBnZXRHZW5lcmFsRG9tYWluKHVybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICB2YXIgZGlmZiA9IGN1cnJfdGltZSAtIChDbGlxekF0dHJhY2sudmlzaXRDYWNoZVtob3N0XSB8fCAwKTtcblxuICAgICAgICAgICAgLy8gVGhpcyBpcyBvcmRlciB0byBvbmx5IGFsbG93IHZpc2l0ZWQgc291cmNlcyBmcm9tIGJyb3dzZXIuIEVsc2Ugc29tZSByZWRpcmVjdCBjYWxsc1xuICAgICAgICAgICAgLy8gR2V0dGluZyBsZWFrZWQuXG4gICAgICAgICAgICB2YXIgc19ob3N0ID0gJyc7XG4gICAgICAgICAgICBpZihzb3VyY2VfdXJsICYmIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpe1xuICAgICAgICAgICAgICAgIHNfaG9zdCA9IGdldEdlbmVyYWxEb21haW4oc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIHZpc2l0Y2FjaGUgdG8gc2VlIGlmIHRoaXMgZG9tYWluIGlzIHRlbXBvcmFyaWx5IGFsbG93ZWQuXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrIHJlcXVpcmVkIHdoZW4gZ2Q9ZmFsc2UgYW5kIHJlcXVlc3RfdHlwZT09IGZ1bGxfcGFnZSwgZWxzZSBibG9ja1xuICAgICAgICAgICAgaWYgKGRpZmYgPCBDbGlxekF0dHJhY2sudGltZUFjdGl2ZSAmJiBDbGlxekF0dHJhY2sudmlzaXRDYWNoZVtzX2hvc3RdKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNyYyA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZV91cmxfcGFydHMgJiYgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSkgc3JjID0gc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZTtcbiAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnY29va2llX2FsbG93X3Zpc2l0Y2FjaGUnKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suYWxsb3dDb29raWUodXJsLCB7J2RzdCc6IHVybF9wYXJ0cy5ob3N0bmFtZSwgJ3NyYyc6IHNyYywgJ2RhdGEnOiBjb29raWVfZGF0YSwgJ3RzJzogY3Vycl90aW1lfSwgXCJ2aXNpdGNhY2hlXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9ja2luZ1Jlc3BvbnNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiB1c2VyIGluaXRpYXRlZCB0aGlzIHJlcXVlc3QgYnkgYW4gZWxlbWVudCBjbGljay5cbiAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suY0NoZWNrZXIuY29udGV4dEZyb21FdmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gY3Vycl90aW1lIC0gKENsaXF6QXR0cmFjay5jQ2hlY2tlci5jb250ZXh0RnJvbUV2ZW50LnRzIHx8IDApO1xuICAgICAgICAgICAgICAgIGlmIChkaWZmIDwgQ2xpcXpBdHRyYWNrLnRpbWVBZnRlckxpbmspIHtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaG9zdCA9IGdldEdlbmVyYWxEb21haW4odXJsX3BhcnRzLmhvc3RuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhvc3QgPT09IENsaXF6QXR0cmFjay5jQ2hlY2tlci5jb250ZXh0RnJvbUV2ZW50LmdETSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnZpc2l0Q2FjaGVbaG9zdF0gPSBjdXJyX3RpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3JjID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2VfdXJsX3BhcnRzICYmIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpIHNyYyA9IHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnY29va2llX2FsbG93X3VzZXJpbml0X3NhbWVfY29udGV4dF9nZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmFsbG93Q29va2llKHVybCwgeydkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdzcmMnOiBzcmMsICdkYXRhJzogY29va2llX2RhdGEsICd0cyc6IGN1cnJfdGltZX0sIFwiY29udGV4dEZyb21FdmVudFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBibG9ja2luZ1Jlc3BvbnNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBwdSA9IHVybC5zcGxpdCgvWz8mO10vKVswXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5jQ2hlY2tlci5jb250ZXh0RnJvbUV2ZW50Lmh0bWwuaW5kZXhPZihwdSkhPS0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coXCI+Pj4gQ29va2llIEFMTE9XRUQgKHR5cGUyKTogXCIgKyBwdSArIFwiIFwiICsgQ2xpcXpBdHRyYWNrLmNDaGVja2VyLmNvbnRleHRGcm9tRXZlbnQuaHRtbCwgQ2xpcXpBdHRyYWNrLkxPR19LRVkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgdXJsIGlzIGluIHB1XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXJsX3BhcnRzICYmIHVybF9wYXJ0cy5ob3N0bmFtZSAmJiB1cmxfcGFydHMuaG9zdG5hbWUhPScnKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sudmlzaXRDYWNoZVtob3N0XSA9IGN1cnJfdGltZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYWxsb3dfdXNlcmluaXRfc2FtZV9nZF9saW5rJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmFsbG93Q29va2llKHVybCwgeydkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdzcmMnOiBzcmMsICdkYXRhJzogY29va2llX2RhdGEsICd0cyc6IGN1cnJfdGltZX0sIFwiY29udGV4dEZyb21FdmVudFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY2hlY2sgZm9yIE9BdXRoIHJlcXVlc3RzXG4gICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmNvbnRleHRPYXV0aCkge1xuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gY3Vycl90aW1lIC0gKENsaXF6QXR0cmFjay5jb250ZXh0T2F1dGgudHMgfHwgMCk7XG4gICAgICAgICAgICAgICAgaWYgKGRpZmYgPCBDbGlxekF0dHJhY2sudGltZUFjdGl2ZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBwdSA9IHVybC5zcGxpdCgvWz8mO10vKVswXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmNvbnRleHRPYXV0aC5odG1sLmluZGV4T2YocHUpIT0tMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHVybCBpcyBpbiBwdVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVybF9wYXJ0cyAmJiB1cmxfcGFydHMuaG9zdG5hbWUgJiYgdXJsX3BhcnRzLmhvc3RuYW1lIT0nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb250ZXh0RnJvbUV2ZW50ID0gYnJvd3Nlci5jb250ZXh0RnJvbUV2ZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHRGcm9tRXZlbnQgJiYgY29udGV4dEZyb21FdmVudC5odG1sICYmIGNvbnRleHRGcm9tRXZlbnQuaHRtbC5pbmRleE9mKHB1KSE9LTEpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coXCJPQVVUSCBhbmQgY2xpY2sgXCIgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhvc3QgPSBnZXRHZW5lcmFsRG9tYWluKHVybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzcmMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlX3VybF9wYXJ0cyAmJiBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKSBzcmMgPSBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnY29va2llX2FsbG93X29hdXRoJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdyZXFfb2F1dGgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmFsbG93Q29va2llKHVybCwgeydkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdzcmMnOiBzcmMsICdkYXRhJzogY29va2llX2RhdGEsICd0cyc6IGN1cnJfdGltZX0sIFwiY29udGV4dE9hdXRoXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIk9BVVRIIGFuZCBOT1QgY2xpY2sgXCIgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh1cmxfcGFydHMuaG9zdG5hbWUhPScnICYmIHNvdXJjZV91cmxfcGFydHMgJiYgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSE9JycpIHtcblxuICAgICAgICAgICAgICAgIC8vIHRoZSBob3N0bmFtZXMgYXJlIGRpZmZlcmVudCwgYnV0IHRoZXkgbWlnaHQgc3RpbGwgYmUgdGhlIHNhbWUgc2l0ZTogZS5nLlxuICAgICAgICAgICAgICAgIC8vIGxvYzUubGFjYWl4YS5lcyA9PiBtZXRyaWNzLmxhY2FpeGEuZXNcblxuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHtcbiAgICAgICAgICAgICAgICAgICAgdXRpbHMubG9nKFwiY29va2llIGRldGVjdGVkID4+PiBcIiArIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUgKyBcIiA6IFwiICsgdXJsX3BhcnRzLmhvc3RuYW1lLCBDbGlxekF0dHJhY2suTE9HX0tFWSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCghc2FtZV9nZCkgJiYgY29va2llX2RhdGEgJiYgIGNvb2tpZV9kYXRhLmxlbmd0aD4xMCkge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGFzIHRlc3QsIHdlIGRvIG5vdCBzZW5kIHRoZSBob3N0bmFtZSBhcyBtZDVcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1kNV9zb3VyY2VfaG9zdG5hbWUgPSBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIG5vdywgbGV0J3Mga2lsbCB0aGF0IGNvb2tpZSBhbmQgc2VlIHdoYXQgaGFwcGVucyA6LSlcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9rZXkgPSBzb3VyY2VfdGFiICsgXCI6XCIgKyBzb3VyY2VfdXJsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmlzQ29va2llRW5hYmxlZChzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKSAmJiAhKENsaXF6QXR0cmFjay5yZWxvYWRXaGl0ZUxpc3RbX2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBibG9ja2luZyBjb29raWVcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzcmMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZV91cmxfcGFydHMgJiYgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSkgc3JjID0gc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYmxvY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2Nvb2tpZV9ibG9ja190cDEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5ibG9ja0Nvb2tpZShzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lLCB7J3NyYyc6IHNyYywgJ2RzdCc6IHVybF9wYXJ0cy5ob3N0bmFtZSwgJ2RhdGEnOiBjb29raWVfZGF0YSwgJ3RzJzogY3Vycl90aW1lfSwgJ3R5cGUxJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NraW5nUmVzcG9uc2UucmVxdWVzdEhlYWRlcnMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtuYW1lOiAnQ29va2llJywgdmFsdWU6ICcnfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge25hbWU6IENsaXF6QXR0cmFjay5jbGlxekhlYWRlciwgdmFsdWU6ICcgJ31cbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhcyBub3QgZW5hYmxlZCwgdGhlcmVmb3JlIHRoZSBjb29raWUgZ2V0cyBzZW50XG4gICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnYmFkX2Nvb2tpZV9zZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5ib290aW5nVXApIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoKGN1cnJfdGltZSAtIENsaXF6QXR0cmFjay5ib290dXBUaW1lKSA+IENsaXF6QXR0cmFjay50aW1lQm9vdHVwKSBDbGlxekF0dHJhY2suYm9vdGluZ1VwID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5kZWJ1ZykgdXRpbHMubG9nKFwiPj4+IEJvb3RpbmcgdXA6IFwiICArIHVybCArIFwiIDogXCIgKyB1cmxfcGFydHMuaG9zdG5hbWUsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IHVybF9wYXJ0cy5ob3N0bmFtZSArIHVybF9wYXJ0cy5wYXRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICYmIGtleSE9JycpIENsaXF6QXR0cmFjay5ib290dXBXaGl0ZWxpc3RDYWNoZVtrZXldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2Nvb2tpZV9hbGxvd19ib290aW5ndXAnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5kZWJ1ZykgdXRpbHMubG9nKFwiPj4+IENvb2tpZSBBTExPV0VEIGJlY2F1c2UgYm9vdHVwOiBcIiArIGtleSwgQ2xpcXpBdHRyYWNrLkxPR19LRVkpO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSB1cmxfcGFydHMuaG9zdG5hbWUgKyB1cmxfcGFydHMucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5ib290dXBXaGl0ZWxpc3RDYWNoZVtrZXldPT1udWxsKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suaXNDb29raWVFbmFibGVkKHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpICYmICEoQ2xpcXpBdHRyYWNrLnJlbG9hZFdoaXRlTGlzdFtfa2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBibG9ja2luZyBjb29raWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3JjID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlX3VybF9wYXJ0cyAmJiBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKSBzcmMgPSBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYmxvY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYmxvY2tfdHAyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrQ29va2llKHVybCwgeydzcmMnOiBzcmMsICdkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdkYXRhJzogY29va2llX2RhdGEsICd0cyc6IGN1cnJfdGltZX0sICd0eXBlMicpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tpbmdSZXNwb25zZS5yZXF1ZXN0SGVhZGVycyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtuYW1lOiAnQ29va2llJywgdmFsdWU6ICcnfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtuYW1lOiBDbGlxekF0dHJhY2suY2xpcXpIZWFkZXIsIHZhbHVlOiAnICd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhcyBub3QgZW5hYmxlZCwgdGhlcmVmb3JlIHRoZSBjb29raWUgZ2V0cyBzZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2JhZF9jb29raWVfc2VudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2hvdWxkIGFsbG93LCBzYW1lIGRvbWFpbiBhbmQgcGF0aCBhcyBib290dXAgcmVxdWVzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIj4+PiBDb29raWUgQUxMT1dFRCBiZWNhdXNlIGJvb3R1cDogXCIgKyBrZXksIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJsb2NraW5nUmVzcG9uc2U7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGFsbG93Q29va2llOiBmdW5jdGlvbih1cmwsIHJlcV9tZXRhZGF0YSwgcmVhc29uKSB7XG4gICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIkFMTE9XSU5HIGJlY2F1c2Ugb2YgXCIgKyByZWFzb24gKyBcIiBcIiArIHJlcV9tZXRhZGF0YVsnZHN0J10gKyAnICUlICcgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICB9LFxuICAgIGJsb2NrQ29va2llOiBmdW5jdGlvbih1cmwsIHJlcV9tZXRhZGF0YSwgcmVhc29uKSB7XG4gICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIj4+PiBDb29raWUgUkVNT1ZFRCAoXCIgKyByZWFzb24gKyBcIik6IFwiICArIHJlcV9tZXRhZGF0YVsnZHN0J10gKyBcIiA+Pj4gXCIgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrZWRDYWNoZVtyZXFfbWV0YWRhdGFbJ2RzdCddXSA9IHJlcV9tZXRhZGF0YVsndHMnXTtcbiAgICB9LFxuICAgIG9uVGFiTG9jYXRpb25DaGFuZ2U6IGZ1bmN0aW9uKGV2bnQpIHtcbiAgICAgICAgdmFyIHVybCA9IGV2bnQudXJsO1xuXG4gICAgICAgIENsaXF6QXR0cmFjay5saW5rc0Zyb21Eb21bdXJsXSA9IHt9O1xuXG4gICAgICAgIGlmIChldm50LmlzTG9hZGluZ0RvY3VtZW50KSB7XG4gICAgICAgICAgICAvLyB3aGVuIGEgbmV3IHBhZ2UgaXMgbG9hZGVkLCB0cnkgdG8gZXh0cmFjdCBpbnRlcm5hbCBsaW5rcyBhbmQgY29va2llc1xuICAgICAgICAgICAgdmFyIGRvYyA9IGV2bnQuZG9jdW1lbnQ7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2subG9hZGVkVGFic1t1cmxdID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmKGRvYykge1xuICAgICAgICAgICAgICAgIGlmIChkb2MuYm9keSkge1xuICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucmVjb3JkTGlua3NGb3JVUkwodXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG9jLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgICAgICAgICAgICdET01Db250ZW50TG9hZGVkJyxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5sb2FkZWRUYWJzW3VybF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnJlY29yZExpbmtzRm9yVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5jbGVhckRvbUxpbmtzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXcgbG9jYXRpb24sIG1lYW5zIGEgcGFnZSBsb2FkZWQgb24gdGhlIHRvcCB3aW5kb3csIHZpc2libGUgdGFiXG4gICAgICAgIHZhciBhY3RpdmVVUkwgPSBicm93c2VyLmN1cnJlbnRVUkwoKTtcbiAgICAgICAgdmFyIGN1cnJfdGltZSA9IERhdGUubm93KCk7XG5cbiAgICAgICAgaWYgKChhY3RpdmVVUkwuaW5kZXhPZignYWJvdXQ6JykhPTApICYmIChhY3RpdmVVUkwuaW5kZXhPZignY2hyb21lOicpIT0wKSkge1xuXG4gICAgICAgICAgICB2YXIgdXJsX3BhcnRzID0gcGFyc2VVUkwoYWN0aXZlVVJMKTtcblxuICAgICAgICAgICAgaWYgKHVybF9wYXJ0cyAmJiB1cmxfcGFydHMuaG9zdG5hbWUgJiYgdXJsX3BhcnRzLmhvc3RuYW1lIT0nJykge1xuICAgICAgICAgICAgICAgIHZhciBob3N0ID0gZ2V0R2VuZXJhbERvbWFpbih1cmxfcGFydHMuaG9zdG5hbWUpO1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay52aXNpdENhY2hlW2hvc3RdID0gY3Vycl90aW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXREZWZhdWx0UnVsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChDbGlxekF0dHJhY2suaXNGb3JjZUJsb2NrRW5hYmxlZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Jsb2NrJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBnZXREZWZhdWx0VHJhY2tlclR4dFJ1bGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgaXNFbmFibGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHV0aWxzLmdldFByZWYoQ2xpcXpBdHRyYWNrLkVOQUJMRV9QUkVGLCBmYWxzZSk7XG4gICAgfSxcbiAgICBpc0Nvb2tpZUVuYWJsZWQ6IGZ1bmN0aW9uKHNvdXJjZV9ob3N0bmFtZSkge1xuICAgICAgICBpZiAoc291cmNlX2hvc3RuYW1lICE9IHVuZGVmaW5lZCAmJiBDbGlxekF0dHJhY2suaXNTb3VyY2VXaGl0ZWxpc3RlZChzb3VyY2VfaG9zdG5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0aWxzLmdldFByZWYoJ2F0dHJhY2tCbG9ja0Nvb2tpZVRyYWNraW5nJywgdHJ1ZSk7XG4gICAgfSxcbiAgICBpc1FTRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRQcmVmKCdhdHRyYWNrUmVtb3ZlUXVlcnlTdHJpbmdUcmFja2luZycsIHRydWUpO1xuICAgIH0sXG4gICAgaXNGaW5nZXJwcmludGluZ0VuYWJsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0UHJlZignYXR0cmFja0NhbnZhc0ZpbmdlcnByaW50VHJhY2tpbmcnLCBmYWxzZSk7XG4gICAgfSxcbiAgICBpc1JlZmVycmVyRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRQcmVmKCdhdHRyYWNrUmVmZXJlclRyYWNraW5nJywgZmFsc2UpO1xuICAgIH0sXG4gICAgaXNUcmFja2VyVHh0RW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRQcmVmKCd0cmFja2VyVHh0JywgZmFsc2UpO1xuICAgIH0sXG4gICAgaXNCbG9vbUZpbHRlckVuYWJsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0UHJlZignYXR0cmFja0Jsb29tRmlsdGVyJywgZmFsc2UpO1xuICAgIH0sXG4gICAgaXNGb3JjZUJsb2NrRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRQcmVmKCdhdHRyYWNrRm9yY2VCbG9jaycsIGZhbHNlKTtcbiAgICB9LFxuICAgIGluaXRQYWNlbWFrZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgdHdvX21pbnMgPSAyICogNjAgKiAxMDAwO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhIGNvbnN0cmFpbnQgd2hpY2ggcmV0dXJucyB0cnVlIHdoZW4gdGhlIHRpbWUgY2hhbmdlcyBhdCB0aGUgc3BlY2lmaWVkIGZpZGVsaXR5XG4gICAgICAgIGZ1bmN0aW9uIHRpbWVDaGFuZ2VDb25zdHJhaW50KG5hbWUsIGZpZGVsaXR5KSB7XG4gICAgICAgICAgICBpZiAoZmlkZWxpdHkgPT0gXCJkYXlcIikgZmlkZWxpdHkgPSA4O1xuICAgICAgICAgICAgZWxzZSBpZihmaWRlbGl0eSA9PSBcImhvdXJcIikgZmlkZWxpdHkgPSAxMDtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICAgICAgICAgIHZhciB0aW1lc3RhbXAgPSBkYXRldGltZS5nZXRUaW1lKCkuc2xpY2UoMCwgZmlkZWxpdHkpLFxuICAgICAgICAgICAgICAgICAgICBsYXN0SG91ciA9IHBlcnNpc3QuZ2V0VmFsdWUobmFtZSArIFwibGFzdFJ1blwiKSB8fCB0aW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgcGVyc2lzdC5zZXRWYWx1ZShuYW1lICtcImxhc3RSdW5cIiwgdGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGltZXN0YW1wICE9IGxhc3RIb3VyO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihDbGlxekF0dHJhY2sudXBkYXRlQ29uZmlnLCAzICogNjAgKiA2MCAqIDEwMDApO1xuXG4gICAgICAgIC8vIHNlbmQgaW5zdGFudCBjYWNoZSB0b2tlbnMgd2hlbmV2ZXIgaG91ciBjaGFuZ2VzXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihDbGlxekF0dHJhY2suc2VuZFRva2VucywgNSAqIDYwICogMTAwMCk7XG4gICAgICAgIC8vIGlmIHRoZSBob3VyIGhhcyBjaGFuZ2VkXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihDbGlxekF0dHJhY2suaG91ckNoYW5nZWQsIHR3b19taW5zLCB0aW1lQ2hhbmdlQ29uc3RyYWludChcImhvdXJDaGFuZ2VkXCIsIFwiaG91clwiKSk7XG5cbiAgICAgICAgLy8gZXZlcnkgMiBtaW5zXG5cbiAgICAgICAgZnVuY3Rpb24gY2xlYW5UaW1lc3RhbXBDYWNoZShjYWNoZU9iaiwgdGltZW91dCwgY3VyclRpbWUpIHtcbiAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoY2FjaGVPYmopXG4gICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgICAgIGlmIChjdXJyVGltZSAtIGNhY2hlT2JqW2tdIHx8IDAgPiB0aW1lb3V0KSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSBjYWNoZU9ialtrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihmdW5jdGlvbiBjbGVhbl9jYWNoZXMoY3VyclRpbWUpIHtcbiAgICAgICAgICAvLyB2aXNpdCBjYWNoZVxuICAgICAgICAgIGNsZWFuVGltZXN0YW1wQ2FjaGUoQ2xpcXpBdHRyYWNrLnZpc2l0Q2FjaGUsIENsaXF6QXR0cmFjay50aW1lQ2xlYW5pbmdDYWNoZSwgY3VyclRpbWUpO1xuICAgICAgICAgIC8vIHJlbG9hZCB3aGl0ZWxpc3RcbiAgICAgICAgICBjbGVhblRpbWVzdGFtcENhY2hlKENsaXF6QXR0cmFjay5yZWxvYWRXaGl0ZUxpc3QsIENsaXF6QXR0cmFjay50aW1lQ2xlYW5pbmdDYWNoZSwgY3VyclRpbWUpO1xuICAgICAgICAgIC8vIHRyYWNrIHJlbG9hZFxuICAgICAgICAgIGNsZWFuVGltZXN0YW1wQ2FjaGUoQ2xpcXpBdHRyYWNrLnRyYWNrUmVsb2FkLCBDbGlxekF0dHJhY2sudGltZUNsZWFuaW5nQ2FjaGUsIGN1cnJUaW1lKTtcbiAgICAgICAgICAvLyBibG9ja2VkIGNhY2hlXG4gICAgICAgICAgY2xlYW5UaW1lc3RhbXBDYWNoZShDbGlxekF0dHJhY2suYmxvY2tlZENhY2hlLCBDbGlxekF0dHJhY2sudGltZUNsZWFuaW5nQ2FjaGUsIGN1cnJUaW1lKTtcbiAgICAgICAgICAvLyByZWNvcmQgY2FjaGVcbiAgICAgICAgICBjbGVhblRpbWVzdGFtcENhY2hlKENsaXF6QXR0cmFjay5saW5rc1JlY29yZGVkLCAxMDAwLCBjdXJyVGltZSk7XG4gICAgICAgICAgLy8gdGFiIGxpc3RlbmVyIHN0YXR1c2VzXG4gICAgICAgICAgQ2xpcXpBdHRyYWNrLnRhYl9saXN0ZW5lci5jbGVhblRhYnNTdGF0dXMoKTtcbiAgICAgICAgfSwgdHdvX21pbnMpO1xuXG4gICAgICAgIHZhciBib290dXBfdGFzayA9IHBhY2VtYWtlci5yZWdpc3RlcihmdW5jdGlvbiBib290dXBfY2hlY2soY3Vycl90aW1lKSB7XG4gICAgICAgICAgICBpZiAoKGN1cnJfdGltZSAtIENsaXF6QXR0cmFjay5ib290dXBUaW1lKSA+IENsaXF6QXR0cmFjay50aW1lQm9vdHVwKSB7XG4gICAgICAgICAgICAgICAgdXRpbHMubG9nKFwiYm9vdHVwIGVuZFwiKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suYm9vdGluZ1VwID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGFjZW1ha2VyLmRlcmVnaXN0ZXIoYm9vdHVwX3Rhc2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBwYWNlbWFrZXIucmVnaXN0ZXIoZnVuY3Rpb24gdHBfZXZlbnRfY29tbWl0KCkge1xuICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5jb21taXQoKTtcbiAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMucHVzaCgpO1xuICAgICAgICB9LCB0d29fbWlucyk7XG5cbiAgICAgICAgLy8gZXZlcnkgaG91clxuICAgICAgICBsZXQgaG91cmx5ID0gNjAgKiA2MCAqIDEwMDA7XG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihDbGlxekF0dHJhY2sucHJ1bmVSZXF1ZXN0S2V5VmFsdWUsIGhvdXJseSk7XG5cbiAgICAgICAgcGFjZW1ha2VyLnJlZ2lzdGVyKGZ1bmN0aW9uIGFubm90YXRlU2FmZUtleXMoKSB7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmFubm90YXRlU2FmZUtleXMoQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZSk7XG4gICAgICAgIH0sIDEwICogNjAgKiA2MCAqIDEwMDApO1xuXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihmdW5jdGlvbiBwdXNoQnJlYWthZ2VUZWxlbWV0cnkoKSB7XG4gICAgICAgICAgT2JqZWN0LmtleXMoQ2xpcXpBdHRyYWNrLmJyZWFrYWdlQ2FjaGUpLmZvckVhY2goKGspID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSBDbGlxekF0dHJhY2suYnJlYWthZ2VDYWNoZVtrXTtcbiAgICAgICAgICAgIGNvbnN0IG1zZyA9IHtcbiAgICAgICAgICAgICAgJ3R5cGUnOiB0ZWxlbWV0cnkubXNnVHlwZSxcbiAgICAgICAgICAgICAgJ2FjdGlvbic6ICdhdHRyYWNrLmJyZWFrYWdlJyxcbiAgICAgICAgICAgICAgJ3BheWxvYWQnOiBDbGlxekF0dHJhY2suZ2VuZXJhdGVBdHRyYWNrUGF5bG9hZChwYXlsb2FkKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRlbGVtZXRyeS50ZWxlbWV0cnkobXNnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBDbGlxekF0dHJhY2suYnJlYWthZ2VDYWNoZSA9IHt9O1xuICAgICAgICB9LCAxMCAqIDYwICogMTAwMCk7XG5cbiAgICB9LFxuICAgIC8qKiBHbG9iYWwgbW9kdWxlIGluaXRpYWxpc2F0aW9uLlxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBkaXNhYmxlIGZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmdldEJyb3dzZXJNYWpvclZlcnNpb24oKSA8IENsaXF6QXR0cmFjay5NSU5fQlJPV1NFUl9WRVJTSU9OKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXBsYWNlIGdldFdpbmRvdyBmdW5jdGlvbnMgd2l0aCB3aW5kb3cgb2JqZWN0IHVzZWQgaW4gaW5pdC5cbiAgICAgICAgaWYgKENsaXF6QXR0cmFjay5kZWJ1ZykgdXRpbHMubG9nKFwiSW5pdCBmdW5jdGlvbiBjYWxsZWQ6XCIsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcblxuICAgICAgICBpZiAoIUNsaXF6QXR0cmFjay5oYXNoUHJvYikge1xuICAgICAgICAgIENsaXF6QXR0cmFjay5oYXNoUHJvYiA9IG5ldyBIYXNoUHJvYigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbG9hZCBhbGwgY2FjaGVzOlxuICAgICAgICAvLyBMYXJnZSBkeW5hbWljIGNhY2hlcyBhcmUgbG9hZGVkIHZpYSB0aGUgcGVyc2lzdCBtb2R1bGUsIHdoaWNoIHdpbGwgbGF6aWx5IHByb3BlZ2F0ZSBjaGFuZ2VzIGJhY2tcbiAgICAgICAgLy8gdG8gdGhlIGJyb3dzZXIncyBzcWxpdGUgZGF0YWJhc2UuXG4gICAgICAgIC8vIExhcmdlIHN0YXRpYyBjYWNoZXMgKGUuZy4gdG9rZW4gd2hpdGVsaXN0KSBhcmUgbG9hZGVkIGZyb20gc3FsaXRlXG4gICAgICAgIC8vIFNtYWxsZXIgY2FjaGVzIChlLmcuIHVwZGF0ZSB0aW1lc3RhbXBzKSBhcmUga2VwdCBpbiBwcmVmc1xuICAgICAgICBpZiAoIXRoaXMuX3Rva2Vucykge1xuICAgICAgICAgIHRoaXMuX3Rva2VucyA9IG5ldyBwZXJzaXN0LkF1dG9QZXJzaXN0ZW50T2JqZWN0KFwidG9rZW5zXCIsICh2KSA9PiBDbGlxekF0dHJhY2sudG9rZW5zID0gdiwgNjAwMDApO1xuICAgICAgICB9XG4gICAgICAgIC8vdGhpcy5fYmxvY2tlZCA9IG5ldyBwZXJzaXN0LkF1dG9QZXJzaXN0ZW50T2JqZWN0KFwiYmxvY2tlZFwiLCAodikgPT4gQ2xpcXpBdHRyYWNrLmJsb2NrZWQgPSB2LCAzMDAwMDApO1xuXG4gICAgICAgIENsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QgPSBDbGlxekF0dHJhY2suaXNCbG9vbUZpbHRlckVuYWJsZWQoKSA/IG5ldyBBdHRyYWNrQmxvb21GaWx0ZXIoKSA6IG5ldyBRU1doaXRlbGlzdCgpO1xuICAgICAgICBDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmluaXQoKTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrTG9nID0gbmV3IEJsb2NrTG9nKENsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QpO1xuICAgICAgICBDbGlxekF0dHJhY2suYmxvY2tMb2cuaW5pdCgpO1xuXG4gICAgICAgIGlmICghdGhpcy5fcmVxdWVzdEtleVZhbHVlKSB7XG4gICAgICAgICAgdGhpcy5fcmVxdWVzdEtleVZhbHVlID0gbmV3IHBlcnNpc3QuQXV0b1BlcnNpc3RlbnRPYmplY3QoXCJyZXF1ZXN0S2V5VmFsdWVcIiwgKHYpID0+IENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWUgPSB2LCA2MDAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yY2UgY2xlYW4gcmVxdWVzdEtleVZhbHVlXG4gICAgICAgIGV2ZW50cy5zdWIoXCJhdHRyYWNrOnNhZmVrZXlzX3VwZGF0ZWRcIiwgKHZlcnNpb24sIGZvcmNlQ2xlYW4pID0+IHtcbiAgICAgICAgICAgIGlmIChmb3JjZUNsZWFuKSB7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLl9yZXF1ZXN0S2V5VmFsdWUuY2xlYXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKENsaXF6QXR0cmFjay5xc0Jsb2NrUnVsZSA9PSBudWxsKSBDbGlxekF0dHJhY2subG9hZEJsb2NrUnVsZXMoKTtcblxuICAgICAgICAvLyBsb2FkIHRyYWNrZXIgY29tcGFuaWVzIGRhdGFcbiAgICAgICAgdGhpcy5fdHJhY2tlckxvYWRlciA9IG5ldyBSZXNvdXJjZUxvYWRlciggWydhbnRpdHJhY2tpbmcnLCAndHJhY2tlcl9vd25lcnMuanNvbiddLCB7XG4gICAgICAgICAgICByZW1vdGVVUkw6ICdodHRwczovL2Nkbi5jbGlxei5jb20vYW50aS10cmFja2luZy90cmFja2VyX293bmVyc19saXN0Lmpzb24nLFxuICAgICAgICAgICAgY3JvbjogMjQgKiA2MCAqIDYwICogMTAwMCxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3RyYWNrZXJMb2FkZXIubG9hZCgpLnRoZW4oQ2xpcXpBdHRyYWNrLl9wYXJzZVRyYWNrZXJDb21wYW5pZXMpO1xuICAgICAgICB0aGlzLl90cmFja2VyTG9hZGVyLm9uVXBkYXRlKENsaXF6QXR0cmFjay5fcGFyc2VUcmFja2VyQ29tcGFuaWVzKTtcblxuICAgICAgICAvLyBsb2FkIGNvb2tpZSB3aGl0ZWxpc3RcbiAgICAgICAgdGhpcy5fY29va2llV2hpdGVsaXN0TG9hZGVyID0gbmV3IFJlc291cmNlTG9hZGVyKCBbJ2FudGl0cmFja2luZycsICdjb29raWVfd2hpdGVsaXN0Lmpzb24nXSwge1xuICAgICAgICAgICAgcmVtb3RlVVJMOiAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvd2hpdGVsaXN0L2Nvb2tpZV93aGl0ZWxpc3QuanNvbicsXG4gICAgICAgICAgICBjcm9uOiAyNCAqIDYwICogNjAgKiAxMDAwXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgdXBkYXRlQ29va2llV2hpdGVsaXN0ID0gKGRhdGEpID0+IHsgQ2xpcXpBdHRyYWNrLndoaXRlbGlzdCA9IGRhdGEgfVxuICAgICAgICB0aGlzLl9jb29raWVXaGl0ZWxpc3RMb2FkZXIubG9hZCgpLnRoZW4odXBkYXRlQ29va2llV2hpdGVsaXN0KTtcbiAgICAgICAgdGhpcy5fY29va2llV2hpdGVsaXN0TG9hZGVyLm9uVXBkYXRlKHVwZGF0ZUNvb2tpZVdoaXRlbGlzdCk7XG5cbiAgICAgICAgQ2xpcXpBdHRyYWNrLmNoZWNrSW5zdGFsbGVkQWRkb25zKCk7XG5cbiAgICAgICAgaWYgKENsaXF6QXR0cmFjay52aXNpdENhY2hlID09IG51bGwpIHtcbiAgICAgICAgICAgIENsaXF6QXR0cmFjay52aXNpdENhY2hlID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBDbGlxekF0dHJhY2suaW5pdFBhY2VtYWtlcigpO1xuICAgICAgICBwYWNlbWFrZXIuc3RhcnQoKTtcblxuICAgICAgICBXZWJSZXF1ZXN0Lm9uQmVmb3JlUmVxdWVzdC5hZGRMaXN0ZW5lcihDbGlxekF0dHJhY2suaHR0cG9wZW5PYnNlcnZlci5vYnNlcnZlLCB1bmRlZmluZWQsIFsnYmxvY2tpbmcnXSk7XG4gICAgICAgIFdlYlJlcXVlc3Qub25CZWZvcmVTZW5kSGVhZGVycy5hZGRMaXN0ZW5lcihDbGlxekF0dHJhY2suaHR0cG1vZE9ic2VydmVyLm9ic2VydmUsIHVuZGVmaW5lZCwgWydibG9ja2luZyddKTtcbiAgICAgICAgV2ViUmVxdWVzdC5vbkhlYWRlcnNSZWNlaXZlZC5hZGRMaXN0ZW5lcihDbGlxekF0dHJhY2suaHR0cFJlc3BvbnNlT2JzZXJ2ZXIub2JzZXJ2ZSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIENsaXF6QXR0cmFjay5kaXNhYmxlZF9zaXRlcyA9IG5ldyBTZXQoSlNPTi5wYXJzZSh1dGlscy5nZXRQcmVmKENsaXF6QXR0cmFjay5ESVNBQkxFRF9TSVRFU19QUkVGLCBcIltdXCIpKSk7XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmRpc2FibGVkX3NpdGVzID0gbmV3IFNldCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbm90ZTogaWYgYSAwIHZhbHVlIHdlcmUgdG8gYmUgc2F2ZWQsIHRoZSBkZWZhdWx0IHdvdWxkIGJlIHByZWZlcnJlZC4gVGhpcyBpcyBvayBiZWNhdXNlIHRoZXNlIG9wdGlvbnNcbiAgICAgICAgLy8gY2Fubm90IGhhdmUgMCB2YWx1ZXMuXG4gICAgICAgIENsaXF6QXR0cmFjay5zYWZla2V5VmFsdWVzVGhyZXNob2xkID0gcGFyc2VJbnQocGVyc2lzdC5nZXRWYWx1ZSgnc2FmZWtleVZhbHVlc1RocmVzaG9sZCcpKSB8fCA0O1xuICAgICAgICBDbGlxekF0dHJhY2suc2hvcnRUb2tlbkxlbmd0aCA9IHBhcnNlSW50KHBlcnNpc3QuZ2V0VmFsdWUoJ3Nob3J0VG9rZW5MZW5ndGgnKSkgfHwgODtcblxuICAgICAgICBDbGlxekF0dHJhY2sucGxhY2VIb2xkZXIgPSBwZXJzaXN0LmdldFZhbHVlKCdwbGFjZUhvbGRlcicsIENsaXF6QXR0cmFjay5wbGFjZUhvbGRlcik7XG4gICAgICAgIENsaXF6QXR0cmFjay5jbGlxekhlYWRlciA9IHBlcnNpc3QuZ2V0VmFsdWUoJ2NsaXF6SGVhZGVyJywgQ2xpcXpBdHRyYWNrLmNsaXF6SGVhZGVyKTtcblxuICAgICAgICBDbGlxekF0dHJhY2sudHJhY2tlclByb3h5ID0gbmV3IFRyYWNrZXJQcm94eSgpO1xuICAgICAgICBDbGlxekF0dHJhY2sudHJhY2tlclByb3h5LmluaXQoKTtcbiAgICB9LFxuICAgIC8qKiBQZXItd2luZG93IG1vZHVsZSBpbml0aWFsaXNhdGlvblxuICAgICAqL1xuICAgIGluaXRXaW5kb3c6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmdldEJyb3dzZXJNYWpvclZlcnNpb24oKSA8IENsaXF6QXR0cmFjay5NSU5fQlJPV1NFUl9WRVJTSU9OKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gTG9hZCBsaXN0ZXJuZXJzOlxuICAgICAgICB3aW5kb3cuQ0xJUVouQ29yZS51cmxiYXIuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvblVybGJhckZvY3VzKTtcblxuICAgICAgICBDbGlxekF0dHJhY2suZ2V0UHJpdmF0ZVZhbHVlcyh3aW5kb3cpO1xuICAgIH0sXG4gICAgdW5sb2FkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gZG9uJ3QgbmVlZCB0byB1bmxvYWQgaWYgZGlzYWJsZWRcbiAgICAgICAgaWYgKENsaXF6QXR0cmFjay5nZXRCcm93c2VyTWFqb3JWZXJzaW9uKCkgPCBDbGlxekF0dHJhY2suTUlOX0JST1dTRVJfVkVSU0lPTikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vQ2hlY2sgaXMgYWN0aXZlIHVzYWdlLCB3YXMgc2VudFxuXG4gICAgICAgIC8vIGZvcmNlIHNlbmQgdGFiIHRlbGVtZXRyeSBkYXRhXG4gICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMuY29tbWl0KHRydWUsIHRydWUpO1xuICAgICAgICBDbGlxekF0dHJhY2sudHBfZXZlbnRzLnB1c2godHJ1ZSk7XG5cbiAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrTG9nLmRlc3Ryb3koKTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLnFzX3doaXRlbGlzdC5kZXN0cm95KCk7XG5cbiAgICAgICAgYnJvd3Nlci5mb3JFYWNoV2luZG93KENsaXF6QXR0cmFjay51bmxvYWRXaW5kb3cpO1xuXG4gICAgICAgIFdlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0LnJlbW92ZUxpc3RlbmVyKENsaXF6QXR0cmFjay5odHRwb3Blbk9ic2VydmVyLm9ic2VydmUpO1xuICAgICAgICBXZWJSZXF1ZXN0Lm9uQmVmb3JlU2VuZEhlYWRlcnMucmVtb3ZlTGlzdGVuZXIoQ2xpcXpBdHRyYWNrLmh0dHBtb2RPYnNlcnZlci5vYnNlcnZlKTtcbiAgICAgICAgV2ViUmVxdWVzdC5vbkhlYWRlcnNSZWNlaXZlZC5yZW1vdmVMaXN0ZW5lcihDbGlxekF0dHJhY2suaHR0cFJlc3BvbnNlT2JzZXJ2ZXIub2JzZXJ2ZSk7XG5cbiAgICAgICAgcGFjZW1ha2VyLnN0b3AoKTtcblxuICAgICAgICBDbGlxekF0dHJhY2sudHJhY2tlclByb3h5LmRlc3Ryb3koKTtcblxuICAgICAgICB0aGlzLl90cmFja2VyTG9hZGVyLnN0b3AoKTtcbiAgICAgICAgdGhpcy5fY29va2llV2hpdGVsaXN0TG9hZGVyLnN0b3AoKTtcbiAgICAgICAgaWYgKHRoaXMuX2Jsb2NrUnVsZXNMb2FkZXIpIHtcbiAgICAgICAgICB0aGlzLl9ibG9ja1J1bGVzTG9hZGVyLnN0b3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50cy51bl9zdWIoXCJhdHRyYWNrOnNhZmVrZXlzX3VwZGF0ZWRcIik7XG4gICAgfSxcbiAgICB1bmxvYWRXaW5kb3c6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgICAgICBpZiAod2luZG93LkNMSVFaKSB7XG4gICAgICAgICAgICB3aW5kb3cuQ0xJUVouQ29yZS51cmxiYXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBvblVybGJhckZvY3VzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgY2hlY2tJbnN0YWxsZWRBZGRvbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICBTeXN0ZW0uaW1wb3J0KCdwbGF0Zm9ybS9hbnRpdHJhY2tpbmcvYWRkb24tY2hlY2snKS50aGVuKCAoYWRkb25zKSA9PiB7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2suc2ltaWxhckFkZG9uID0gYWRkb25zLmNoZWNrSW5zdGFsbGVkQWRkb25zKCk7XG4gICAgICAgIH0pLmNhdGNoKCAoZSkgPT4ge1xuICAgICAgICAgICAgdXRpbHMubG9nKFwiRXJyb3IgbG9hZGluZyBhZGRvbiBjaGVja2VyXCIsIFwiYXR0cmFja1wiKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBnZW5lcmF0ZUF0dHJhY2tQYXlsb2FkOiBmdW5jdGlvbihkYXRhLCB0cykge1xuICAgICAgICBjb25zdCBleHRyYUF0dHJzID0gQ2xpcXpBdHRyYWNrLnFzX3doaXRlbGlzdC5nZXRWZXJzaW9uKCk7XG4gICAgICAgIGV4dHJhQXR0cnMudmVyID0gQ2xpcXpBdHRyYWNrLlZFUlNJT047XG4gICAgICAgIHRzID0gdHMgfHwgZGF0ZXRpbWUuZ2V0SG91clRpbWVzdGFtcCgpO1xuICAgICAgICByZXR1cm4gZ2VuZXJhdGVQYXlsb2FkKGRhdGEsIHRzLCBmYWxzZSwgZXh0cmFBdHRycyk7XG4gICAgfSxcbiAgICBzZW5kVG9rZW5zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gc2VuZCB0b2tlbnMgZXZlcnkgNSBtaW51dGVzXG4gICAgICAgIGxldCBkYXRhID0ge30sXG4gICAgICAgICAgICBob3VyID0gZGF0ZXRpbWUuZ2V0VGltZSgpLFxuICAgICAgICAgICAgbGltaXQgPSBPYmplY3Qua2V5cyhDbGlxekF0dHJhY2sudG9rZW5zKS5sZW5ndGggLyAxMjtcblxuICAgICAgICAvLyBzb3J0IHRyYWNrZXIga2V5cyBieSBsYXN0U2VudCwgaS5lLiBzZW5kIG9sZGVzdCBkYXRhIGZpcnN0XG4gICAgICAgIGxldCBzb3J0ZWRUcmFja2VycyA9IE9iamVjdC5rZXlzKENsaXF6QXR0cmFjay50b2tlbnMpLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludChDbGlxekF0dHJhY2sudG9rZW5zW2FdLmxhc3RTZW50IHx8IDApIC0gcGFyc2VJbnQoQ2xpcXpBdHRyYWNrLnRva2Vuc1tiXS5sYXN0U2VudCB8fCAwKVxuICAgICAgICB9KTtcblxuICAgICAgICBmb3IgKGxldCBpIGluIHNvcnRlZFRyYWNrZXJzKSB7XG4gICAgICAgICAgICBsZXQgdHJhY2tlciA9IHNvcnRlZFRyYWNrZXJzW2ldO1xuXG4gICAgICAgICAgICBpZiAobGltaXQgPiAwICYmIE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCA+IGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB0b2tlbkRhdGEgPSBDbGlxekF0dHJhY2sudG9rZW5zW3RyYWNrZXJdO1xuICAgICAgICAgICAgaWYgKCEodG9rZW5EYXRhLmxhc3RTZW50KSB8fCB0b2tlbkRhdGEubGFzdFNlbnQgPCBob3VyKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlKHRva2VuRGF0YS5sYXN0U2VudCk7XG4gICAgICAgICAgICAgICAgZGF0YVt0cmFja2VyXSA9IGFub255bWl6ZVRyYWNrZXJUb2tlbnModG9rZW5EYXRhKTtcbiAgICAgICAgICAgICAgICBkZWxldGUoQ2xpcXpBdHRyYWNrLnRva2Vuc1t0cmFja2VyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgY29tcHJlc3MgPSBjb21wcmVzc2lvbkF2YWlsYWJsZSgpO1xuXG4gICAgICAgICAgICBzcGxpdFRlbGVtZXRyeURhdGEoZGF0YSwgMjAwMDApLm1hcCgoZCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBheWwgPSBDbGlxekF0dHJhY2suZ2VuZXJhdGVBdHRyYWNrUGF5bG9hZChkKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSB7XG4gICAgICAgICAgICAgICAgICAgICd0eXBlJzogdGVsZW1ldHJ5Lm1zZ1R5cGUsXG4gICAgICAgICAgICAgICAgICAgICdhY3Rpb24nOiAnYXR0cmFjay50b2tlbnMnLFxuICAgICAgICAgICAgICAgICAgICAncGF5bG9hZCc6IHBheWxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICggY29tcHJlc3MgKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zZy5jb21wcmVzc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbXNnLnBheWxvYWQgPSBjb21wcmVzc0pTT05Ub0Jhc2U2NChwYXlsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGVsZW1ldHJ5LnRlbGVtZXRyeShtc2cpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgQ2xpcXpBdHRyYWNrLl90b2tlbnMuc2V0RGlydHkoKTtcbiAgICB9LFxuICAgIGhvdXJDaGFuZ2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdHJpZ2dlciBvdGhlciBob3VybHkgZXZlbnRzXG4gICAgICAgIGV2ZW50cy5wdWIoXCJhdHRyYWNrOmhvdXJfY2hhbmdlZFwiKTtcbiAgICB9LFxuICAgIHVwZGF0ZUNvbmZpZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0b2RheSA9IGRhdGV0aW1lLmdldFRpbWUoKS5zdWJzdHJpbmcoMCwgMTApO1xuICAgICAgICB1dGlscy5odHRwR2V0KENsaXF6QXR0cmFjay5WRVJTSU9OQ0hFQ0tfVVJMICtcIj9cIisgdG9kYXksIGZ1bmN0aW9uKHJlcSkge1xuICAgICAgICAgICAgLy8gb24gbG9hZFxuICAgICAgICAgICAgdmFyIHZlcnNpb25jaGVjayA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgLy8gY29uZmlnIGluIHZlcnNpb25jaGVja1xuICAgICAgICAgICAgaWYgKHZlcnNpb25jaGVjay5wbGFjZUhvbGRlcikge1xuICAgICAgICAgICAgICAgIHBlcnNpc3Quc2V0VmFsdWUoJ3BsYWNlSG9sZGVyJywgdmVyc2lvbmNoZWNrLnBsYWNlSG9sZGVyKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucGxhY2VIb2xkZXIgPSB2ZXJzaW9uY2hlY2sucGxhY2VIb2xkZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2ZXJzaW9uY2hlY2suc2hvcnRUb2tlbkxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHBlcnNpc3Quc2V0VmFsdWUoJ3Nob3J0VG9rZW5MZW5ndGgnLCB2ZXJzaW9uY2hlY2suc2hvcnRUb2tlbkxlbmd0aCk7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnNob3J0VG9rZW5MZW5ndGggPSBwYXJzZUludCh2ZXJzaW9uY2hlY2suc2hvcnRUb2tlbkxlbmd0aCkgfHwgQ2xpcXpBdHRyYWNrLnNob3J0VG9rZW5MZW5ndGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2ZXJzaW9uY2hlY2suc2FmZWtleVZhbHVlc1RocmVzaG9sZCkge1xuICAgICAgICAgICAgICAgIHBlcnNpc3Quc2V0VmFsdWUoJ3NhZmVrZXlWYWx1ZXNUaHJlc2hvbGQnLCB2ZXJzaW9uY2hlY2suc2FmZWtleVZhbHVlc1RocmVzaG9sZCk7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnNhZmVrZXlWYWx1ZXNUaHJlc2hvbGQgPSBwYXJzZUludCh2ZXJzaW9uY2hlY2suc2FmZWtleVZhbHVlc1RocmVzaG9sZCkgfHwgQ2xpcXpBdHRyYWNrLnNhZmVrZXlWYWx1ZXNUaHJlc2hvbGQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2ZXJzaW9uY2hlY2suY2xpcXpIZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBwZXJzaXN0LnNldFZhbHVlKCdjbGlxekhlYWRlcicsIHZlcnNpb25jaGVjay5jbGlxekhlYWRlcik7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmNsaXF6SGVhZGVyID0gdmVyc2lvbmNoZWNrLmNsaXF6SGVhZGVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmaXJlIGV2ZW50cyBmb3IgbGlzdCB1cGRhdGVcbiAgICAgICAgICAgIGV2ZW50cy5wdWIoXCJhdHRyYWNrOnVwZGF0ZWRfY29uZmlnXCIsIHZlcnNpb25jaGVjayk7XG4gICAgICAgIH0sIHV0aWxzLmxvZywgMTAwMDApO1xuICAgIH0sXG4gICAgcHJ1bmVSZXF1ZXN0S2V5VmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZGF5ID0gZGF0ZXRpbWUubmV3VVRDRGF0ZSgpO1xuICAgICAgICBkYXkuc2V0RGF0ZShkYXkuZ2V0RGF0ZSgpIC0gQ2xpcXpBdHRyYWNrLnNhZmVLZXlFeHBpcmUpO1xuICAgICAgICB2YXIgZGF5Q3V0b2ZmICA9IGRhdGV0aW1lLmRhdGVTdHJpbmcoZGF5KTtcbiAgICAgICAgZm9yICh2YXIgcyBpbiBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHRvayBpbiBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc11ba2V5XVt0b2tdIDwgZGF5Q3V0b2ZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXVtrZXldW3Rva107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc11ba2V5XSkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc11ba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMoQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXSkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBDbGlxekF0dHJhY2suX3JlcXVlc3RLZXlWYWx1ZS5zZXREaXJ0eSgpO1xuICAgICAgICBDbGlxekF0dHJhY2suX3JlcXVlc3RLZXlWYWx1ZS5zYXZlKCk7XG4gICAgfSxcbiAgICBsb2FkQmxvY2tSdWxlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIENsaXF6QXR0cmFjay5xc0Jsb2NrUnVsZSA9IFtdO1xuICAgICAgICBDbGlxekF0dHJhY2suX2Jsb2NrUnVsZXNMb2FkZXIgPSBuZXcgUmVzb3VyY2VMb2FkZXIoIFsnYW50aXRyYWNraW5nJywgJ2FudGktdHJhY2tpbmctYmxvY2stcnVsZXMuanNvbiddLCB7XG4gICAgICAgICAgcmVtb3RlVVJMOiBDbGlxekF0dHJhY2suVVJMX0JMT0NLX1JVTEVTLFxuICAgICAgICAgIGNyb246IDI0ICogNjAgKiA2MCAqIDEwMDAsXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCB1cGRhdGVSdWxlcyA9IChydWxlcykgPT4geyBDbGlxekF0dHJhY2sucXNCbG9ja1J1bGUgPSBydWxlcyB8fCBbXX07XG4gICAgICAgIENsaXF6QXR0cmFjay5fYmxvY2tSdWxlc0xvYWRlci5sb2FkKCkudGhlbih1cGRhdGVSdWxlcyk7XG4gICAgICAgIENsaXF6QXR0cmFjay5fYmxvY2tSdWxlc0xvYWRlci5vblVwZGF0ZSh1cGRhdGVSdWxlcyk7XG4gICAgfSxcbiAgICBpc0luV2hpdGVsaXN0OiBmdW5jdGlvbihkb21haW4pIHtcbiAgICAgICAgaWYoIUNsaXF6QXR0cmFjay53aGl0ZWxpc3QpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGtleXMgPSBDbGlxekF0dHJhY2sud2hpdGVsaXN0O1xuICAgICAgICBmb3IodmFyIGk9MDtpPGtleXMubGVuZ3RoO2krKykge1xuICAgICAgICAgICAgdmFyIGluZCA9IGRvbWFpbi5pbmRleE9mKGtleXNbaV0pO1xuICAgICAgICAgICAgaWYgKGluZD49MCkge1xuICAgICAgICAgICAgICAgIGlmICgoaW5kK2tleXNbaV0ubGVuZ3RoKSA9PSBkb21haW4ubGVuZ3RoKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBjaGVja1Rva2VuczogZnVuY3Rpb24odXJsX3BhcnRzLCBzb3VyY2VfdXJsLCBjb29raWV2YWx1ZSwgc3RhdHMsIHNvdXJjZV91cmxfcGFydHMpIHtcbiAgICAgICAgLy8gYmFkIHRva2VucyB3aWxsIHN0aWxsIGJlIHJldHVybmVkIGluIHRoZSBzYW1lIGZvcm1hdFxuXG4gICAgICAgIHZhciBzID0gZ2V0R2VuZXJhbERvbWFpbih1cmxfcGFydHMuaG9zdG5hbWUpO1xuICAgICAgICBzID0gbWQ1KHMpLnN1YnN0cigwLCAxNik7XG4gICAgICAgIC8vIElmIGl0J3MgYSByYXJlIDNyZCBwYXJ0eSwgd2UgZG9uJ3QgZG8gdGhlIHJlc3RcbiAgICAgICAgaWYgKCFDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmlzVHJhY2tlckRvbWFpbihzKSkgcmV0dXJuIFtdO1xuXG4gICAgICAgIHZhciBzb3VyY2VEID0gbWQ1KHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpLnN1YnN0cigwLCAxNik7XG4gICAgICAgIHZhciB0b2RheSA9IGRhdGV0aW1lLmdldFRpbWUoKS5zdWJzdHIoMCwgOCk7XG5cbiAgICAgICAgaWYgKHVybF9wYXJ0c1sncXVlcnknXS5sZW5ndGggPT0gMCAmJiB1cmxfcGFydHNbJ3BhcmFtZXRlcnMnXS5sZW5ndGggPT0gMCkgcmV0dXJuIFtdO1xuICAgICAgICB2YXIgdG9rO1xuXG4gICAgICAgIHZhciBiYWRUb2tlbnMgPSBbXTtcblxuICAgICAgICAvLyBzdGF0cyBrZXlzXG4gICAgICAgIFsnY29va2llJywgJ3ByaXZhdGUnLCAnY29va2llX2I2NCcsICdwcml2YXRlX2I2NCcsICdzYWZla2V5JywgJ3doaXRlbGlzdGVkJyxcbiAgICAgICAgICdjb29raWVfbmV3VG9rZW4nLCAnY29va2llX2NvdW50VGhyZXNob2xkJywgJ3ByaXZhdGVfbmV3VG9rZW4nLCAncHJpdmF0ZV9jb3VudFRocmVzaG9sZCcsXG4gICAgICAgICAnc2hvcnRfbm9faGFzaCcsICdjb29raWVfYjY0X25ld1Rva2VuJywgJ2Nvb2tpZV9iNjRfY291bnRUaHJlc2hvbGQnLCAncHJpdmF0ZV9iNjRfbmV3VG9rZW4nLFxuICAgICAgICAgJ3ByaXZhdGVfYjY0X2NvdW50VGhyZXNob2xkJywgJ3FzX25ld1Rva2VuJywgJ3FzX2NvdW50VGhyZXNob2xkJywgXS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtzdGF0c1trXSA9IDA7fSk7XG5cbiAgICAgICAgdmFyIF9jb3VudENoZWNrID0gZnVuY3Rpb24odG9rKSB7XG4gICAgICAgICAgICAvLyBmb3IgdG9rZW4gbGVuZ3RoIDwgMTIgYW5kIG1heSBiZSBub3QgYSBoYXNoLCB3ZSBsZXQgaXQgcGFzc1xuICAgICAgICAgICAgaWYgKHRvay5sZW5ndGggPCAxMiAmJiAhQ2xpcXpBdHRyYWNrLmhhc2hQcm9iLmlzSGFzaCh0b2spKVxuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgLy8gdXBkYXRlIHRva2VuRG9tYWluXG4gICAgICAgICAgICB0b2sgPSBtZDUodG9rKTtcbiAgICAgICAgICAgIENsaXF6QXR0cmFjay5ibG9ja0xvZy50b2tlbkRvbWFpbi5hZGRUb2tlbk9uRmlyc3RQYXJ0eSh0b2ssIHNvdXJjZUQpO1xuICAgICAgICAgICAgcmV0dXJuIENsaXF6QXR0cmFjay5ibG9ja0xvZy50b2tlbkRvbWFpbi5nZXRORmlyc3RQYXJ0aWVzRm9yVG9rZW4odG9rKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgX2luY3JTdGF0cyA9IGZ1bmN0aW9uKGNjLCBwcmVmaXgsIHRvaywga2V5LCB2YWwpIHtcbiAgICAgICAgICAgIGlmIChjYyA9PSAwKVxuICAgICAgICAgICAgICAgIHN0YXRzWydzaG9ydF9ub19oYXNoJ10rKztcbiAgICAgICAgICAgIGVsc2UgaWYgKGNjIDwgQ2xpcXpBdHRyYWNrLnRva2VuRG9tYWluQ291bnRUaHJlc2hvbGQpXG4gICAgICAgICAgICAgICAgc3RhdHNbcHJlZml4KydfbmV3VG9rZW4nXSsrO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgX2FkZEJsb2NrTG9nKHMsIGtleSwgdmFsLCBwcmVmaXgpO1xuICAgICAgICAgICAgICAgIGJhZFRva2Vucy5wdXNoKHZhbCk7XG4gICAgICAgICAgICAgICAgaWYgKGNjID09IENsaXF6QXR0cmFjay50b2tlbkRvbWFpbkNvdW50VGhyZXNob2xkKVxuICAgICAgICAgICAgICAgICAgICBzdGF0c1twcmVmaXggKyAnX2NvdW50VGhyZXNob2xkJ10rKztcbiAgICAgICAgICAgICAgICBzdGF0c1twcmVmaXhdKys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIF9hZGRCbG9ja0xvZyA9IChzLCBrZXksIHZhbCwgcHJlZml4KSA9PiB7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2suYmxvY2tMb2cuYmxvY2tMb2cuYWRkKHNvdXJjZV91cmwsIHMsIGtleSwgdmFsLCBwcmVmaXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9jaGVja1Rva2VucyA9IGZ1bmN0aW9uKGtleSwgdmFsKSB7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2suYmxvY2tMb2cuaW5jcmVtZW50Q2hlY2tlZFRva2VucygpO1xuXG4gICAgICAgICAgICB2YXIgdG9rID0gZFVSSUModmFsKTtcbiAgICAgICAgICAgIHdoaWxlICh0b2sgIT0gZFVSSUModG9rKSkge1xuICAgICAgICAgICAgICAgIHRvayA9IGRVUklDKHRvayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0b2subGVuZ3RoIDwgQ2xpcXpBdHRyYWNrLnNob3J0VG9rZW5MZW5ndGggfHwgc291cmNlX3VybC5pbmRleE9mKHRvaykgPiAtMSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBCYWQgdmFsdWVzIChjb29raWVzKVxuICAgICAgICAgICAgZm9yICh2YXIgYyBpbiBjb29raWV2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICgodG9rLmluZGV4T2YoYykgPiAtMSAmJiBjLmxlbmd0aCA+PSBDbGlxekF0dHJhY2suc2hvcnRUb2tlbkxlbmd0aCkgfHwgYy5pbmRleE9mKHRvaykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coJ3NhbWUgdmFsdWUgYXMgY29va2llICcgKyB2YWwsICd0b2trJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYyA9IF9jb3VudENoZWNrKHRvayk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjICE9IHRvaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2MgPSBNYXRoLm1heChjYywgX2NvdW50Q2hlY2soYykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChfaW5jclN0YXRzKGNjLCAnY29va2llJywgdG9rLCBrZXksIHZhbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwcml2YXRlIHZhbHVlIChmcm9tIGpzIGZ1bmN0aW9uIHJldHVybnMpXG4gICAgICAgICAgICBmb3IgKHZhciBjIGluIENsaXF6QXR0cmFjay5wcml2YXRlVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCh0b2suaW5kZXhPZihjKSA+IC0xICYmIGMubGVuZ3RoID49IENsaXF6QXR0cmFjay5zaG9ydFRva2VuTGVuZ3RoKSB8fCBjLmluZGV4T2YodG9rKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZygnc2FtZSBwcml2YXRlIHZhbHVlcyAnICsgdmFsLCAndG9raycpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2MgPSBfY291bnRDaGVjayh0b2spO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyAhPSB0b2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNjID0gTWF0aC5tYXgoY2MsIF9jb3VudENoZWNrKGMpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoX2luY3JTdGF0cyhjYywgJ3ByaXZhdGUnLCB0b2ssIGtleSwgdmFsKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYjY0ID0gbnVsbDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYjY0ID0gYXRvYih0b2spO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYjY0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBjIGluIGNvb2tpZXZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoYjY0LmluZGV4T2YoYykgPiAtMSAmJiBjLmxlbmd0aCA+PSBDbGlxekF0dHJhY2suc2hvcnRUb2tlbkxlbmd0aCkgfHwgYy5pbmRleE9mKGI2NCkgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5kZWJ1ZykgdXRpbHMubG9nKCdzYW1lIHZhbHVlIGFzIGNvb2tpZSAnICsgYjY0LCAndG9ray1iNjQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYyA9IF9jb3VudENoZWNrKHRvayk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYyAhPSB0b2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYyA9IE1hdGgubWF4KGNjLCBfY291bnRDaGVjayhjKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2luY3JTdGF0cyhjYywgJ2Nvb2tpZV9iNjQnLCB0b2ssIGtleSwgdmFsKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYyBpbiBDbGlxekF0dHJhY2sucHJpdmF0ZVZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYjY0LmluZGV4T2YoYykgPiAtMSAmJiBjLmxlbmd0aCA+PSBDbGlxekF0dHJhY2suc2hvcnRUb2tlbkxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5kZWJ1ZykgdXRpbHMubG9nKCdzYW1lIHByaXZhdGUgdmFsdWVzICcgKyBiNjQsICd0b2trLWI2NCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNjID0gX2NvdW50Q2hlY2sodG9rKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjICE9IHRvaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNjID0gTWF0aC5tYXgoY2MsIF9jb3VudENoZWNrKGMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfaW5jclN0YXRzKGNjLCAncHJpdmF0ZV9iNjQnLCB0b2ssIGtleSwgdmFsKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgLy8gR29vZCBrZXlzLlxuICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QuaXNTYWZlS2V5KHMsIG1kNShrZXkpKSkge1xuICAgICAgICAgICAgICAgIHN0YXRzWydzYWZla2V5J10rKztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzb3VyY2VfdXJsLmluZGV4T2YodG9rKSA9PSAtMSkge1xuICAgICAgICAgICAgICAgIGlmICghQ2xpcXpBdHRyYWNrLnFzX3doaXRlbGlzdC5pc1NhZmVUb2tlbihzLCBtZDUodG9rKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNjID0gX2NvdW50Q2hlY2sodG9rKTtcbiAgICAgICAgICAgICAgICAgICAgX2luY3JTdGF0cyhjYywgJ3FzJywgdG9rLCBrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHN0YXRzWyd3aGl0ZWxpc3RlZCddKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdXJsX3BhcnRzLmdldEtleVZhbHVlcygpLmZvckVhY2goZnVuY3Rpb24gKGt2KSB7XG4gICAgICAgICAgX2NoZWNrVG9rZW5zKGt2LmssIGt2LnYpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyB1cGRhdGUgYmxvY2tlZFRva2VuXG4gICAgICAgIENsaXF6QXR0cmFjay5ibG9ja0xvZy5pbmNyZW1lbnRCbG9ja2VkVG9rZW5zKGJhZFRva2Vucy5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYmFkVG9rZW5zO1xuICAgIH0sXG4gICAgZXhhbWluZVRva2VuczogZnVuY3Rpb24odXJsX3BhcnRzKSB7XG4gICAgICAgIHZhciBkYXkgPSBkYXRldGltZS5uZXdVVENEYXRlKCk7XG4gICAgICAgIHZhciB0b2RheSA9IGRhdGV0aW1lLmRhdGVTdHJpbmcoZGF5KTtcbiAgICAgICAgLy8gc2F2ZSBhcHBlYXJlZCB0b2tlbnMgd2l0aCBmaWVsZCBuYW1lXG4gICAgICAgIC8vIG1hcmsgZmllbGQgbmFtZSBhcyBcInNhZmVcIiBpZiBkaWZmZXJlbnQgdmFsdWVzIGFwcGVhcnNcbiAgICAgICAgdmFyIHMgPSBnZXRHZW5lcmFsRG9tYWluKHVybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgIHMgPSBtZDUocykuc3Vic3RyKDAsIDE2KTtcbiAgICAgICAgdXJsX3BhcnRzLmdldEtleVZhbHVlc01ENSgpLmZpbHRlcihmdW5jdGlvbiAoa3YpIHtcbiAgICAgICAgICByZXR1cm4ga3Yudl9sZW4gPj0gQ2xpcXpBdHRyYWNrLnNob3J0VG9rZW5MZW5ndGg7XG4gICAgICAgIH0pLmZvckVhY2goZnVuY3Rpb24gKGt2KSB7XG4gICAgICAgICAgICB2YXIga2V5ID0ga3YuayxcbiAgICAgICAgICAgICAgICB0b2sgPSBrdi52O1xuICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QuaXNTYWZlS2V5KHMsIGtleSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc10gPT0gbnVsbClcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdID0ge307XG4gICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXVtrZXldID09IG51bGwpXG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXVtrZXldID0ge307XG5cbiAgICAgICAgICAgIENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc11ba2V5XVt0b2tdID0gdG9kYXk7XG4gICAgICAgICAgICAvLyBzZWUgYXQgbGVhc3QgMyBkaWZmZXJlbnQgdmFsdWUgdW50aWwgaXQncyBzYWZlXG4gICAgICAgICAgICBsZXQgdmFsdWVDb3VudCA9IE9iamVjdC5rZXlzKENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc11ba2V5XSkubGVuZ3RoXG4gICAgICAgICAgICBpZiAoIHZhbHVlQ291bnQgPiBDbGlxekF0dHJhY2suc2FmZWtleVZhbHVlc1RocmVzaG9sZCApIHtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmFkZFNhZmVLZXkocywga2V5LCB2YWx1ZUNvdW50KTtcbiAgICAgICAgICAgICAgICAvLyBrZWVwIHRoZSBsYXN0IHNlZW4gdG9rZW5cbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdW2tleV0gPSB7dG9rOiB0b2RheX07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBDbGlxekF0dHJhY2suX3JlcXVlc3RLZXlWYWx1ZS5zZXREaXJ0eSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGV4dHJhY3RLZXlUb2tlbnM6IGZ1bmN0aW9uKHVybF9wYXJ0cywgcmVmc3RyLCBpc1ByaXZhdGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIGtleXMsIHZhbHVlIG9mIHF1ZXJ5IHN0cmluZ3Mgd2lsbCBiZSBzZW50IGluIG1kNVxuICAgICAgICAvLyB1cmwsIHJlZnN0ciB3aWxsIGJlIHNlbnQgaW4gaGFsZiBvZiBtZDVcbiAgICAgICAgaWYgKGlzUHJpdmF0ZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5VG9rZW5zID0gdXJsX3BhcnRzLmdldEtleVZhbHVlc01ENSgpO1xuICAgICAgICBpZiAoa2V5VG9rZW5zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBzID0gbWQ1KHVybF9wYXJ0cy5ob3N0bmFtZSkuc3Vic3RyKDAsIDE2KTtcbiAgICAgICAgICAgIHJlZnN0ciA9IG1kNShyZWZzdHIpLnN1YnN0cigwLCAxNik7XG4gICAgICAgICAgICBjYWxsYmFjayhzLCBrZXlUb2tlbnMsIHJlZnN0ciwgaXNQcml2YXRlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2F2ZUtleVRva2VuczogZnVuY3Rpb24ocywga2V5VG9rZW5zLCByLCBpc1ByaXZhdGUpIHtcbiAgICAgICAgaWYgKGlzUHJpdmF0ZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBhbnl0aGluZyBoZXJlIHNob3VsZCBhbHJlYWR5IGJlIGhhc2hcbiAgICAgICAgaWYgKENsaXF6QXR0cmFjay50b2tlbnNbc10gPT0gbnVsbCkgQ2xpcXpBdHRyYWNrLnRva2Vuc1tzXSA9IHtsYXN0U2VudDogZGF0ZXRpbWUuZ2V0VGltZSgpfTtcbiAgICAgICAgaWYgKENsaXF6QXR0cmFjay50b2tlbnNbc11bcl0gPT0gbnVsbCkgQ2xpcXpBdHRyYWNrLnRva2Vuc1tzXVtyXSA9IHsnYyc6IDAsICdrdic6IHt9fTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLnRva2Vuc1tzXVtyXVsnYyddID0gIChDbGlxekF0dHJhY2sudG9rZW5zW3NdW3JdWydjJ10gfHwgMCkgKyAxO1xuICAgICAgICBmb3IgKHZhciBrdiBvZiBrZXlUb2tlbnMpIHtcbiAgICAgICAgICAgIHZhciB0b2sgPSBrdi52LFxuICAgICAgICAgICAgICAgIGsgPSBrdi5rO1xuICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay50b2tlbnNbc11bcl1bJ2t2J11ba10gPT0gbnVsbCkgQ2xpcXpBdHRyYWNrLnRva2Vuc1tzXVtyXVsna3YnXVtrXSA9IHt9O1xuICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay50b2tlbnNbc11bcl1bJ2t2J11ba11bdG9rXSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRva2Vuc1tzXVtyXVsna3YnXVtrXVt0b2tdID0ge1xuICAgICAgICAgICAgICAgICAgICBjOiAwLFxuICAgICAgICAgICAgICAgICAgICBrX2xlbjoga3Yua19sZW4sXG4gICAgICAgICAgICAgICAgICAgIHZfbGVuOiBrdi52X2xlblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBDbGlxekF0dHJhY2sudG9rZW5zW3NdW3JdWydrdiddW2tdW3Rva10uYyArPSAxO1xuICAgICAgICB9XG4gICAgICAgIENsaXF6QXR0cmFjay5fdG9rZW5zLnNldERpcnR5KCk7XG4gICAgfSxcbiAgICBsaW5rc1JlY29yZGVkOiB7fSwgLy8gY2FjaGUgd2hlbiB3ZSByZWNvcmRlZCBsaW5rcyBmb3IgZWFjaCB1cmxcbiAgICByZWNvcmRMaW5rc0ZvclVSTCh1cmwpIHtcbiAgICAgIGlmIChDbGlxekF0dHJhY2subG9hZGVkVGFic1t1cmxdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICBjb25zdCBsYXN0UXVlcnkgPSBDbGlxekF0dHJhY2subGlua3NSZWNvcmRlZFt1cmxdIHx8IDA7XG4gICAgICBpZiAobm93IC0gbGFzdFF1ZXJ5IDwgMTAwMCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIENsaXF6QXR0cmFjay5saW5rc1JlY29yZGVkW3VybF0gPSBub3c7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuXG4gICAgICAgIGNvcmUuZ2V0Q29va2llKHVybCkudGhlbihcbiAgICAgICAgICBjb29raWUgPT4gQ2xpcXpBdHRyYWNrLmNvb2tpZXNGcm9tRG9tW3VybF0gPSBjb29raWVcbiAgICAgICAgKSxcblxuICAgICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgICAgY29yZS5xdWVyeUhUTUwodXJsLCAnYVtocmVmXScsICdocmVmJyksXG4gICAgICAgICAgY29yZS5xdWVyeUhUTUwodXJsLCAnbGlua1tocmVmXScsICdocmVmJyksXG4gICAgICAgICAgY29yZS5xdWVyeUhUTUwodXJsLCAnc2NyaXB0W3NyY10nLCAnc3JjJykudGhlbihmdW5jdGlvbiAoaHJlZnMpIHtcbiAgICAgICAgICAgIHJldHVybiBocmVmcy5maWx0ZXIoIGhyZWYgPT4gaHJlZi5pbmRleE9mKCdodHRwJykgPT09IDAgKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSkudGhlbihmdW5jdGlvbiAocmVmbGlua3MpIHtcbiAgICAgICAgICB2YXIgaHJlZlNldCA9IHJlZmxpbmtzLnJlZHVjZSgoaHJlZlNldCwgaHJlZnMpID0+IHtcbiAgICAgICAgICAgIGhyZWZzLmZvckVhY2goIGhyZWYgPT4gaHJlZlNldFtocmVmXSA9IHRydWUgKTtcbiAgICAgICAgICAgIHJldHVybiBocmVmU2V0O1xuICAgICAgICAgIH0sIHt9KTtcblxuICAgICAgICAgIENsaXF6QXR0cmFjay5saW5rc0Zyb21Eb21bdXJsXSA9IGhyZWZTZXQ7XG4gICAgICAgIH0pXG5cbiAgICAgIF0pO1xuICAgIH0sXG4gICAgY2xlYXJEb21MaW5rczogZnVuY3Rpb24oKSB7XG4gICAgICAgIGZvciAodmFyIHVybCBpbiBDbGlxekF0dHJhY2subGlua3NGcm9tRG9tKSB7XG4gICAgICAgICAgICBpZiAoIUNsaXF6QXR0cmFjay5pc1RhYlVSTCh1cmwpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIENsaXF6QXR0cmFjay5saW5rc0Zyb21Eb21bdXJsXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgQ2xpcXpBdHRyYWNrLmNvb2tpZXNGcm9tRG9tW3VybF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIENsaXF6QXR0cmFjay5sb2FkZWRUYWJzW3VybF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGlzVGFiVVJMOiBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgdmFyIHdtID0gQ29tcG9uZW50cy5jbGFzc2VzW1wiQG1vemlsbGEub3JnL2FwcHNoZWxsL3dpbmRvdy1tZWRpYXRvcjsxXCJdXG4gICAgICAgICAgICAgICAgLmdldFNlcnZpY2UoQ29tcG9uZW50cy5pbnRlcmZhY2VzLm5zSVdpbmRvd01lZGlhdG9yKTtcbiAgICAgICAgdmFyIGJyb3dzZXJFbnVtZXJhdG9yID0gd20uZ2V0RW51bWVyYXRvcihcIm5hdmlnYXRvcjpicm93c2VyXCIpO1xuXG4gICAgICAgIHdoaWxlIChicm93c2VyRW51bWVyYXRvci5oYXNNb3JlRWxlbWVudHMoKSkge1xuICAgICAgICAgICAgdmFyIGJyb3dzZXJXaW4gPSBicm93c2VyRW51bWVyYXRvci5nZXROZXh0KCk7XG4gICAgICAgICAgICB2YXIgdGFiYnJvd3NlciA9IGJyb3dzZXJXaW4uZ0Jyb3dzZXI7XG5cbiAgICAgICAgICAgIHZhciBudW1UYWJzID0gdGFiYnJvd3Nlci5icm93c2Vycy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbnVtVGFiczsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50QnJvd3NlciA9IHRhYmJyb3dzZXIuZ2V0QnJvd3NlckF0SW5kZXgoaW5kZXgpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50QnJvd3Nlcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFiVVJMID0gY3VycmVudEJyb3dzZXIuY3VycmVudFVSSS5zcGVjO1xuICAgICAgICAgICAgICAgICAgICBpZiAodXJsID09IHRhYlVSTCB8fCB1cmwgPT0gdGFiVVJMLnNwbGl0KCcjJylbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIC8vIExpc3RlbnMgZm9yIHJlcXVlc3RzIGluaXRpYXRlZCBpbiB0YWJzLlxuICAgIC8vIEFsbG93cyB1cyB0byB0cmFjayB0YWIgd2luZG93SURzIHRvIHVybHMuXG4gICAgdGFiX2xpc3RlbmVyOiB7XG4gICAgICAgIF90YWJzU3RhdHVzOiB7fSxcblxuICAgICAgICBvblN0YXRlQ2hhbmdlOiBmdW5jdGlvbihldm50KSB7XG4gICAgICAgICAgICBsZXQge3VybFNwZWMsIGlzTmV3UGFnZSwgd2luZG93SUR9ID0gZXZudDtcbiAgICAgICAgICAgIC8vIGNoZWNrIGZsYWdzIGZvciBzdGFydGVkIHJlcXVlc3RcbiAgICAgICAgICAgIGlmIChpc05ld1BhZ2UgJiYgdXJsU3BlYyAmJiB3aW5kb3dJRCAmJiB1cmxTcGVjLnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICAgICAgICAgIC8vIGFkZCB3aW5kb3cgLT4gdXJsIHBhaXIgdG8gdGFiIGNhY2hlLlxuICAgICAgICAgICAgICAgIHRoaXMuX3RhYnNTdGF0dXNbd2luZG93SURdID0gdXJsU3BlYztcbiAgICAgICAgICAgICAgICB2YXIgX2tleSA9IHdpbmRvd0lEICsgXCI6XCIgKyB1cmxTcGVjO1xuICAgICAgICAgICAgICAgIGlmKCEoQ2xpcXpBdHRyYWNrLnRyYWNrUmVsb2FkW19rZXldKSkge1xuICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sudHJhY2tSZWxvYWRbX2tleV0gPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0MiA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkdXIgPSAodDIgLSAgQ2xpcXpBdHRyYWNrLnRyYWNrUmVsb2FkW19rZXldKSAvIDEwMDA7XG4gICAgICAgICAgICAgICAgICAgIGlmKGR1ciA8IDMwMDAwICYmIGNvdW50UmVsb2FkICYmIHdpbmRvd0lEIGluIENsaXF6QXR0cmFjay50cF9ldmVudHMuX2FjdGl2ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sudHBfZXZlbnRzLl9hY3RpdmVbd2luZG93SURdWydyYSddID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5yZWxvYWRXaGl0ZUxpc3RbX2tleV0gPSB0MjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb3VudFJlbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIEdldCBhbiBhcnJheSBvZiB3aW5kb3dJRHMgZm9yIHRhYnMgd2hpY2ggYSBjdXJyZW50bHkgb24gdGhlIGdpdmVuIFVSTC5cbiAgICAgICAgZ2V0VGFic0ZvclVSTDogZnVuY3Rpb24odXJsKSB7XG4gICAgICAgICAgICB2YXIgdGFicyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciB3aW5kb3dJRCBpbiB0aGlzLl90YWJzU3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhYlVSTCA9IHRoaXMuX3RhYnNTdGF0dXNbd2luZG93SURdO1xuICAgICAgICAgICAgICAgIGlmICh1cmwgPT0gdGFiVVJMIHx8IHVybCA9PSB0YWJVUkwuc3BsaXQoJyMnKVswXSkge1xuICAgICAgICAgICAgICAgICAgICB0YWJzLnB1c2god2luZG93SUQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0YWJzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFuVGFic1N0YXR1czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZm9yIChsZXQgdGFiSWQgb2YgT2JqZWN0LmtleXModGhpcy5fdGFic1N0YXR1cykpIHtcbiAgICAgICAgICAgIGlmICghIHRoaXMuaXNXaW5kb3dBY3RpdmUodGFiSWQpICkge1xuICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fdGFic1N0YXR1c1t0YWJJZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGlzV2luZG93QWN0aXZlOiBicm93c2VyLmlzV2luZG93QWN0aXZlXG5cbiAgICB9LFxuICAgIC8qKiBHZXQgaW5mbyBhYm91dCB0cmFja2VycyBhbmQgYmxvY2tpbmcgZG9uZSBpbiBhIHNwZWNpZmllZCB0YWIuXG4gICAgICpcbiAgICAgKiAgUmV0dXJucyBhbiBvYmplY3QgZGVzY3JpYmluZyBhbnRpLXRyYWNraW5nIGFjdGlvbnMgZm9yIHRoaXMgcGFnZSwgd2l0aCBrZXlzIGFzIGZvbGxvd3M6XG4gICAgICogICAgY29va2llczogJ2FsbG93ZWQnIGFuZCAnYmxvY2tlZCcgY291bnRzLlxuICAgICAqICAgIHJlcXVlc3RzOiAnc2FmZScgYW5kICd1bnNhZmUnIGNvdW50cy4gJ1Vuc2FmZScgbWVhbnMgdGhhdCB1bnNhZmUgZGF0YSB3YXMgc2VlbiBpbiBhIHJlcXVlc3QgdG8gYSB0cmFja2VyLlxuICAgICAqICAgIHRyYWNrZXJzOiBtb3JlIGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0IGVhY2ggdHJhY2tlci4gT2JqZWN0IHdpdGgga2V5cyBiZWluZyB0cmFja2VyIGRvbWFpbiBhbmQgdmFsdWVzXG4gICAgICogICAgICAgIG1vcmUgZGV0YWlsZWQgYmxvY2tpbmcgZGF0YS5cbiAgICAgKi9cbiAgICBnZXRUYWJCbG9ja2luZ0luZm86IGZ1bmN0aW9uKHRhYklkLCB1cmwpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgdGFiOiB0YWJJZCxcbiAgICAgICAgICBob3N0bmFtZTogJycsXG4gICAgICAgICAgcGF0aDogJycsXG4gICAgICAgICAgY29va2llczoge2FsbG93ZWQ6IDAsIGJsb2NrZWQ6IDB9LFxuICAgICAgICAgIHJlcXVlc3RzOiB7c2FmZTogMCwgdW5zYWZlOiAwLCBhZGJsb2NrOiAwfSxcbiAgICAgICAgICB0cmFja2Vyczoge30sXG4gICAgICAgICAgY29tcGFuaWVzOiB7fSxcbiAgICAgICAgICBwczogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAvLyBpZ25vcmUgc3BlY2lhbCB0YWJzXG4gICAgICBpZiAodXJsICYmICh1cmwuaW5kZXhPZignYWJvdXQnKSA9PSAwIHx8IHVybC5pbmRleE9mKCdjaHJvbWUnKSA9PSAwKSkge1xuICAgICAgICByZXN1bHQuZXJyb3IgPSAnU3BlY2lhbCB0YWInO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICBpZiAoISh0YWJJZCBpbiBDbGlxekF0dHJhY2sudHBfZXZlbnRzLl9hY3RpdmUpKSB7XG4gICAgICAgIC8vIG5vIHRwIGV2ZW50LCBidXQgJ2FjdGl2ZScgdGFiID0gbXVzdCByZWxvYWQgZm9yIGRhdGFcbiAgICAgICAgLy8gb3RoZXJ3aXNlIC0+IHN5c3RlbSB0YWJcbiAgICAgICAgaWYgKGJyb3dzZXIuaXNXaW5kb3dBY3RpdmUodGFiSWQpKSB7XG4gICAgICAgICAgcmVzdWx0LnJlbG9hZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LmVycm9yID0gJ05vIERhdGEnO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICB2YXIgdGFiRGF0YSA9IENsaXF6QXR0cmFjay50cF9ldmVudHMuX2FjdGl2ZVt0YWJJZF0sXG4gICAgICAgIHBsYWluX2RhdGEgPSB0YWJEYXRhLmFzUGxhaW5PYmplY3QoKSxcbiAgICAgICAgdHJhY2tlcnMgPSBPYmplY3Qua2V5cyh0YWJEYXRhLnRwcykuZmlsdGVyKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgICAgICAgIHJldHVybiBDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmlzVHJhY2tlckRvbWFpbihtZDUoZ2V0R2VuZXJhbERvbWFpbihkb21haW4pKS5zdWJzdHJpbmcoMCwgMTYpKSB8fCBwbGFpbl9kYXRhLnRwc1tkb21haW5dLmFkYmxvY2tfYmxvY2sgPiAwO1xuICAgICAgICB9KSxcbiAgICAgICAgZmlyc3RQYXJ0eUNvbXBhbnkgPSBDbGlxekF0dHJhY2sudHJhY2tlcl9jb21wYW5pZXNbZ2V0R2VuZXJhbERvbWFpbih0YWJEYXRhLmhvc3RuYW1lKV07XG4gICAgICByZXN1bHQuaG9zdG5hbWUgPSB0YWJEYXRhLmhvc3RuYW1lO1xuICAgICAgcmVzdWx0LnBhdGggPSB0YWJEYXRhLnBhdGg7XG4gICAgICAvLyByZXN1bHQucHMgPSBQcml2YWN5U2NvcmUuZ2V0KG1kNShnZXRHZW5lcmFsRG9tYWluKHJlc3VsdC5ob3N0bmFtZSkpLnN1YnN0cigwLCAxNikgKyAnc2l0ZScpO1xuICAgICAgLy8gaWYgKCFyZXN1bHQucHMuc2NvcmUpIHtcbiAgICAgIC8vICAgcmVzdWx0LnBzLmdldFByaXZhY3lTY29yZSgpO1xuICAgICAgLy8gfVxuXG4gICAgICB0cmFja2Vycy5mb3JFYWNoKGZ1bmN0aW9uKGRvbSkge1xuICAgICAgICByZXN1bHQudHJhY2tlcnNbZG9tXSA9IHt9O1xuICAgICAgICBbJ2MnLCAnY29va2llX3NldCcsICdjb29raWVfYmxvY2tlZCcsICdiYWRfY29va2llX3NlbnQnLCAnYmFkX3FzJywgJ3Rva2Vuc19ibG9ja2VkJywgJ3JlcV9hYm9ydGVkJywgJ2FkYmxvY2tfYmxvY2snXS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgcmVzdWx0LnRyYWNrZXJzW2RvbV1ba10gPSBwbGFpbl9kYXRhLnRwc1tkb21dW2tdIHx8IDA7XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHQuY29va2llcy5hbGxvd2VkICs9IHJlc3VsdC50cmFja2Vyc1tkb21dWydjb29raWVfc2V0J10gLSByZXN1bHQudHJhY2tlcnNbZG9tXVsnY29va2llX2Jsb2NrZWQnXTtcbiAgICAgICAgcmVzdWx0LmNvb2tpZXMuYmxvY2tlZCArPSByZXN1bHQudHJhY2tlcnNbZG9tXVsnY29va2llX2Jsb2NrZWQnXTtcbiAgICAgICAgcmVzdWx0LnJlcXVlc3RzLnNhZmUgKz0gcmVzdWx0LnRyYWNrZXJzW2RvbV1bJ2MnXSAtIHJlc3VsdC50cmFja2Vyc1tkb21dWydiYWRfcXMnXTtcbiAgICAgICAgcmVzdWx0LnJlcXVlc3RzLnVuc2FmZSArPSByZXN1bHQudHJhY2tlcnNbZG9tXVsnYmFkX3FzJ107XG4gICAgICAgIHJlc3VsdC5yZXF1ZXN0cy5hZGJsb2NrICs9IHJlc3VsdC50cmFja2Vyc1tkb21dWydhZGJsb2NrX2Jsb2NrJ107XG5cbiAgICAgICAgbGV0IHRsZCA9IGdldEdlbmVyYWxEb21haW4oZG9tKSxcbiAgICAgICAgICBjb21wYW55ID0gdGxkO1xuICAgICAgICAvLyBmaW5kIHRoZSBjb21wYW55IGJlaGluZCB0aGlzIHRyYWNrZXIuIElcbiAgICAgICAgLy8gSWYgdGhlIGZpcnN0IHBhcnR5IGlzIGZyb20gYSB0cmFja2VyIGNvbXBhbnksIHRoZW4gZG8gbm90IGFkZCB0aGUgY29tcGFueSBzbyB0aGF0IHRoZSBhY3R1YWwgdGxkcyB3aWxsIGJlIHNob3duIGluIHRoZSBsaXN0XG4gICAgICAgIGlmICh0bGQgaW4gQ2xpcXpBdHRyYWNrLnRyYWNrZXJfY29tcGFuaWVzICYmIENsaXF6QXR0cmFjay50cmFja2VyX2NvbXBhbmllc1t0bGRdICE9PSBmaXJzdFBhcnR5Q29tcGFueSkge1xuICAgICAgICAgIGNvbXBhbnkgPSBDbGlxekF0dHJhY2sudHJhY2tlcl9jb21wYW5pZXNbdGxkXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIShjb21wYW55IGluIHJlc3VsdC5jb21wYW5pZXMpKSB7XG4gICAgICAgICAgcmVzdWx0LmNvbXBhbmllc1tjb21wYW55XSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5jb21wYW5pZXNbY29tcGFueV0ucHVzaChkb20pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50VGFiQmxvY2tpbmdJbmZvOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB0YWJJZCwgdXJsRm9yVGFiO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGdCcm93c2VyID0gdXRpbHMuZ2V0V2luZG93KCkuZ0Jyb3dzZXIsXG4gICAgICAgICAgICBzZWxlY3RlZEJyb3dzZXIgPSBnQnJvd3Nlci5zZWxlY3RlZEJyb3dzZXI7XG4gICAgICAgIC8vIG9uIEZGIDwgMzggc2VsZWN0QnJvd3Nlci5vdXRlcldpbmRvd0lEIGlzIHVuZGVmaW5lZCwgc28gd2UgZ2V0IHRoZSB3aW5kb3dJRCBmcm9tIF9sb2FkQ29udGV4dFxuICAgICAgICB0YWJJZCA9IHNlbGVjdGVkQnJvd3Nlci5vdXRlcldpbmRvd0lEIHx8IHNlbGVjdGVkQnJvd3Nlci5fbG9hZENvbnRleHQuRE9NV2luZG93SUQ7XG4gICAgICAgIHVybEZvclRhYiA9IHNlbGVjdGVkQnJvd3Nlci5jdXJyZW50VVJJLnNwZWM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICB9XG4gICAgICByZXR1cm4gQ2xpcXpBdHRyYWNrLmdldFRhYkJsb2NraW5nSW5mbyh0YWJJZCwgdXJsRm9yVGFiKTtcbiAgICB9LFxuICAgIHRyYWNrZXJfY29tcGFuaWVzOiB7fSxcbiAgICAvKiogUGFyc2UgdHJhY2tlciBvd25lcnMgbGlzdCB7Q29tcGFueTogW2xpc3QsIG9mLCBkb21haW5zXX0sIGludG8gbG9va3VwIHRhYmxlIHtkb21haW46IENvbXBhbnl9XG4gICAgICovXG4gICAgX3BhcnNlVHJhY2tlckNvbXBhbmllczogZnVuY3Rpb24oY29tcGFueV9saXN0KSB7XG4gICAgICB2YXIgcmV2X2xpc3QgPSB7fTtcbiAgICAgIGZvciAodmFyIGNvbXBhbnkgaW4gY29tcGFueV9saXN0KSB7XG4gICAgICAgIGNvbXBhbnlfbGlzdFtjb21wYW55XS5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXZfbGlzdFtkXSA9IGNvbXBhbnk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgQ2xpcXpBdHRyYWNrLnRyYWNrZXJfY29tcGFuaWVzID0gcmV2X2xpc3Q7XG4gICAgfSxcbiAgICAvKiogRW5hYmxlcyBBdHRyYWNrIG1vZHVsZSB3aXRoIGNvb2tpZSwgUVMgYW5kIHJlZmVycmVyIHByb3RlY3Rpb24gZW5hYmxlZC5cbiAgICAgKiAgaWYgbW9kdWxlX29ubHkgaXMgc2V0IHRvIHRydWUsIHdpbGwgbm90IHNldCBwcmVmZXJlbmNlcyBmb3IgY29va2llLCBRUyBhbmQgcmVmZXJyZXIgcHJvdGVjdGlvbiAoZm9yIHNlbGVjdGl2ZSBsb2FkaW5nIGluIEFCIHRlc3RzKVxuICAgICAqL1xuICAgIGVuYWJsZU1vZHVsZTogZnVuY3Rpb24obW9kdWxlX29ubHkpIHtcbiAgICAgIGlmIChDbGlxekF0dHJhY2suaXNFbmFibGVkKCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB1dGlscy5zZXRQcmVmKENsaXF6QXR0cmFjay5FTkFCTEVfUFJFRiwgdHJ1ZSk7XG4gICAgICBpZiAoIW1vZHVsZV9vbmx5KSB7XG4gICAgICAgIHV0aWxzLnNldFByZWYoJ2F0dHJhY2tCbG9ja0Nvb2tpZVRyYWNraW5nJywgdHJ1ZSk7XG4gICAgICAgIHV0aWxzLnNldFByZWYoJ2F0dHJhY2tSZW1vdmVRdWVyeVN0cmluZ1RyYWNraW5nJywgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICAvKiogRGlzYWJsZXMgYW50aS10cmFja2luZyBpbW1lZGlhdGVseS5cbiAgICAgKi9cbiAgICBkaXNhYmxlTW9kdWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIHV0aWxzLnNldFByZWYoQ2xpcXpBdHRyYWNrLkVOQUJMRV9QUkVGLCBmYWxzZSk7XG4gICAgfSxcbiAgICBkaXNhYmxlZF9zaXRlczogbmV3IFNldCgpLFxuICAgIERJU0FCTEVEX1NJVEVTX1BSRUY6IFwiYXR0cmFja1NvdXJjZURvbWFpbldoaXRlbGlzdFwiLFxuICAgIHNhdmVTb3VyY2VEb21haW5XaGl0ZWxpc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgdXRpbHMuc2V0UHJlZihDbGlxekF0dHJhY2suRElTQUJMRURfU0lURVNfUFJFRixcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoQXJyYXkuZnJvbShDbGlxekF0dHJhY2suZGlzYWJsZWRfc2l0ZXMpKSk7XG4gICAgfSxcbiAgICBpc1NvdXJjZVdoaXRlbGlzdGVkOiBmdW5jdGlvbihob3N0bmFtZSkge1xuICAgICAgICByZXR1cm4gQ2xpcXpBdHRyYWNrLmRpc2FibGVkX3NpdGVzLmhhcyhob3N0bmFtZSk7XG4gICAgfSxcbiAgICBhZGRTb3VyY2VEb21haW5Ub1doaXRlbGlzdDogZnVuY3Rpb24oZG9tYWluKSB7XG4gICAgICBDbGlxekF0dHJhY2suZGlzYWJsZWRfc2l0ZXMuYWRkKGRvbWFpbik7XG4gICAgICAvLyBhbHNvIHNlbmQgZG9tYWluIHRvIGh1bWFud2ViXG4gICAgICB0ZWxlbWV0cnkudGVsZW1ldHJ5KHtcbiAgICAgICAgJ3R5cGUnOiB0ZWxlbWV0cnkubXNnVHlwZSxcbiAgICAgICAgJ2FjdGlvbic6ICdhdHRyYWNrLndoaXRlbGlzdERvbWFpbicsXG4gICAgICAgICdwYXlsb2FkJzogZG9tYWluXG4gICAgICB9KTtcbiAgICAgIENsaXF6QXR0cmFjay5zYXZlU291cmNlRG9tYWluV2hpdGVsaXN0KCk7XG4gICAgfSxcbiAgICByZW1vdmVTb3VyY2VEb21haW5Gcm9tV2hpdGVsaXN0OiBmdW5jdGlvbihkb21haW4pIHtcbiAgICAgIENsaXF6QXR0cmFjay5kaXNhYmxlZF9zaXRlcy5kZWxldGUoZG9tYWluKTtcbiAgICAgIENsaXF6QXR0cmFjay5zYXZlU291cmNlRG9tYWluV2hpdGVsaXN0KCk7XG4gICAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgQ2xpcXpBdHRyYWNrO1xuIl19