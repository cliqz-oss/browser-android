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
                                var payload = {
                                    source: source_url,
                                    status: requestContext.channel.responseStatus,
                                    url_info: {
                                        protocol: url_parts.protocol,
                                        hostname: url_parts.hostname,
                                        path: md5(url_parts.path),
                                        params: url_parts.getKeyValuesMD5()
                                    },
                                    context: requestContext.getWindowDepth()
                                };
                                var msg = {
                                    'type': telemetry.msgType,
                                    'action': 'attrack.breakage',
                                    'payload': CliqzAttrack.generateAttrackPayload(payload)
                                };
                                telemetry.telemetry(msg);
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

                    WebRequest.onBeforeRequest.addListener(CliqzAttrack.httpopenObserver.observe, undefined, ['blocking', 'antitracking']);
                    WebRequest.onBeforeSendHeaders.addListener(CliqzAttrack.httpmodObserver.observe, undefined, ['blocking','antitracking']);
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
                    utils.loadResource(CliqzAttrack.URL_BLOCK_RULES, function (req) {
                        try {
                            CliqzAttrack.qsBlockRule = JSON.parse(req.response);
                        } catch (e) {
                            CliqzAttrack.qsBlockRule = [];
                        }
                    });
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
                        trackers = Object.keys(tabData.tps).filter(function (domain) {
                        return CliqzAttrack.qs_whitelist.isTrackerDomain(md5(getGeneralDomain(domain)).substring(0, 16));
                    }),
                        plain_data = tabData.asPlainObject(),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9hdHRyYWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztnZUE0QkksV0FBVyxFQTBEWCxZQUFZOztBQXhEaEIsYUFBUyxhQUFhLEdBQUU7QUFDcEIsbUJBQVcsR0FBRyxJQUFJLENBQUM7S0FDdEI7Ozs7Ozs7OztBQVNELGFBQVMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFOztBQUVoQyxZQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0FBQ3BCLGtCQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7U0FDcEU7O0FBRUQsWUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLElBQUksRUFBRTtBQUN0QixtQkFBTyxHQUFHLENBQUM7U0FDWixNQUNJO0FBQ0gsbUJBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBRTtTQUMvQztLQUNGOzs7Ozs7Ozs7Ozs7Ozs7QUFlRCxhQUFTLHNCQUFzQixDQUFDLFdBQVcsRUFBRTs7QUFFM0MsWUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ2QsWUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO0FBQ3BDLFlBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQzs7O0FBRy9ELFlBQUkscUJBQXFCLEdBQUcsRUFBRSxDQUFDOztBQUUvQixhQUFLLElBQUksV0FBVyxJQUFJLFdBQVcsRUFBRTtBQUNuQyxnQkFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztB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LEVBQUUseUNBQVMsTUFBTSxFQUFFO0FBQ2hELGdDQUFZLENBQUMsY0FBYyxVQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0MsZ0NBQVksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO2lCQUMxQzthQUNKOzsrQkFFYyxZQUFZIiwiZmlsZSI6ImFudGl0cmFja2luZy9hdHRyYWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIFRoaXMgbW9kdWxlIHByZXZlbnRzIHVzZXIgZnJvbSAzcmQgcGFydHkgdHJhY2tpbmdcbiAqL1xuaW1wb3J0IHBhY2VtYWtlciBmcm9tICdhbnRpdHJhY2tpbmcvcGFjZW1ha2VyJztcbmltcG9ydCAqIGFzIHBlcnNpc3QgZnJvbSAnYW50aXRyYWNraW5nL3BlcnNpc3RlbnQtc3RhdGUnO1xuaW1wb3J0IFRlbXBTZXQgZnJvbSAnYW50aXRyYWNraW5nL3RlbXAtc2V0JztcbmltcG9ydCBIdHRwUmVxdWVzdENvbnRleHQgZnJvbSAnYW50aXRyYWNraW5nL3dlYnJlcXVlc3QtY29udGV4dCc7XG5pbXBvcnQgdHBfZXZlbnRzIGZyb20gJ2FudGl0cmFja2luZy90cF9ldmVudHMnO1xuaW1wb3J0IG1kNSBmcm9tICdhbnRpdHJhY2tpbmcvbWQ1JztcbmltcG9ydCB7IHBhcnNlVVJMLCBkVVJJQywgZ2V0SGVhZGVyTUQ1LCBVUkxJbmZvLCBzaHVmZmxlLCBmaW5kT2F1dGggfSBmcm9tICdhbnRpdHJhY2tpbmcvdXJsJztcbmltcG9ydCB7IGdldEdlbmVyYWxEb21haW4sIHNhbWVHZW5lcmFsRG9tYWluIH0gZnJvbSAnYW50aXRyYWNraW5nL2RvbWFpbic7XG5pbXBvcnQgeyBIYXNoUHJvYiB9IGZyb20gJ2FudGl0cmFja2luZy9oYXNoJztcbmltcG9ydCB7IFRyYWNrZXJUWFQsIHNsZWVwLCBnZXREZWZhdWx0VHJhY2tlclR4dFJ1bGUgfSBmcm9tICdhbnRpdHJhY2tpbmcvdHJhY2tlci10eHQnO1xuaW1wb3J0IHsgQXR0cmFja0Jsb29tRmlsdGVyIH0gZnJvbSAnYW50aXRyYWNraW5nL2Jsb29tLWZpbHRlcic7XG5pbXBvcnQgKiBhcyBkYXRldGltZSBmcm9tICdhbnRpdHJhY2tpbmcvdGltZSc7XG5pbXBvcnQgUVNXaGl0ZWxpc3QgZnJvbSAnYW50aXRyYWNraW5nL3FzLXdoaXRlbGlzdHMnO1xuaW1wb3J0IEJsb2NrTG9nIGZyb20gJ2FudGl0cmFja2luZy9ibG9jay1sb2cnO1xuaW1wb3J0IHsgdXRpbHMsIGV2ZW50cywgUHJvbWlzZSB9IGZyb20gJ2NvcmUvY2xpcXonO1xuaW1wb3J0IFJlc291cmNlTG9hZGVyIGZyb20gJ2NvcmUvcmVzb3VyY2UtbG9hZGVyJztcbmltcG9ydCBjb3JlIGZyb20gJ2NvcmUvYmFja2dyb3VuZCc7XG5pbXBvcnQgQ29va2llQ2hlY2tlciBmcm9tICdhbnRpdHJhY2tpbmcvY29va2llLWNoZWNrZXInO1xuaW1wb3J0IFRyYWNrZXJQcm94eSBmcm9tICdhbnRpdHJhY2tpbmcvdHJhY2tlci1wcm94eSc7XG5pbXBvcnQgeyBjb21wcmVzc2lvbkF2YWlsYWJsZSwgc3BsaXRUZWxlbWV0cnlEYXRhLCBjb21wcmVzc0pTT05Ub0Jhc2U2NCwgZ2VuZXJhdGVQYXlsb2FkIH0gZnJvbSAnYW50aXRyYWNraW5nL3V0aWxzJztcbmltcG9ydCB7UHJpdmFjeVNjb3JlfSBmcm9tICdhbnRpdHJhY2tpbmcvcHJpdmFjeS1zY29yZSc7XG5pbXBvcnQgKiBhcyBicm93c2VyIGZyb20gJ3BsYXRmb3JtL2Jyb3dzZXInO1xuaW1wb3J0IFdlYlJlcXVlc3QgZnJvbSAnY29yZS93ZWJyZXF1ZXN0JztcbmltcG9ydCB0ZWxlbWV0cnkgZnJvbSAnYW50aXRyYWNraW5nL3RlbGVtZXRyeSc7XG5cbnZhciBjb3VudFJlbG9hZCA9IGZhbHNlO1xuXG5mdW5jdGlvbiBvblVybGJhckZvY3VzKCl7XG4gICAgY291bnRSZWxvYWQgPSB0cnVlO1xufVxuXG4vKipcbiAqIEFkZCBwYWRkaW5nIGNoYXJhY3RlcnMgdG8gdGhlIGxlZnQgb2YgdGhlIGdpdmVuIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyICAtIG9yaWdpbmFsIHN0cmluZy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBjaGFyIC0gY2hhciB1c2VkIGZvciBwYWRkaW5nIHRoZSBzdHJpbmcuXG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSAtIGRlc2lyZWQgc2l6ZSBvZiB0aGUgcmVzdWx0aW5nIHN0cmluZyAoYWZ0ZXIgcGFkZGluZylcbioqL1xuZnVuY3Rpb24gbGVmdHBhZChzdHIsIGNoYXIsIHNpemUpIHtcbiAgLy8gVGhpcyBmdW5jdGlvbiBvbmx5IG1ha2VzIHNlbnMgaWYgYGNoYXJgIGlzIGEgY2hhcmFjdGVyLlxuICBpZiAoY2hhci5sZW5ndGggIT0gMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImBjaGFyYCBhcmd1bWVudCBtdXN0IG9ubHkgY29udGFpbiBvbmUgY2hhcmFjdGVyXCIpO1xuICB9XG5cbiAgaWYgKHN0ci5sZW5ndGggPj0gc2l6ZSkge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIChjaGFyLnJlcGVhdChzaXplIC0gc3RyLmxlbmd0aCkgKyBzdHIpO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlIGFueSB0cmFjZSBvZiBzb3VyY2UgZG9tYWlucywgb3IgaGFzaGVzIG9mIHNvdXJjZSBkb21haW5zXG4gKiBmcm9tIHRoZSBkYXRhIHRvIGJlIHNlbnQgdG8gdGhlIGJhY2tlbmQuIFRoaXMgaXMgbWFkZSB0byBlbnN1cmVcbiAqIHRoZXJlIGlzIG5vIHdheSB0byBiYWNrdHJhY2sgdG8gdXNlcidzIGhpc3RvcnkgdXNpbmcgZGF0YSBzZW50IHRvXG4gKiB0aGUgYmFja2VuZC5cbiAqXG4gKiBSZXBsYWNlIGFsbCB0aGUga2V5cyBvZiBgdHJhY2tlckRhdGFgICh3aGljaCBhcmUgMTYtY2hhcnMgcHJlZml4ZXMgb2ZcbiAqIGhhc2ggb2YgdGhlIHNvdXJjZSBkb21haW4pIGJ5IHVuaXF1ZSByYW5kb20gc3RyaW5ncyBvZiBzaXplIDE2ICh3aGljaCBpc1xuICogZXhwZWN0ZWQgYnkgYmFja2VuZCkuIFdlIGRvbid0IGhhdmUgdG8gbWFrZSB0aGVtIHVuaXF1ZSBhbW9uZyBhbGwgZGF0YSxcbiAqIGl0IGlzIGVub3VnaCB0byBlbnN1cmUgdW5pY2l0eSBvbiBhIHBlci10cmFja2VyIGJhc2lzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0cmFja2VyRGF0YSAtIGFzc29jaWF0ZSBzb3VyY2UgZG9tYWlucyB0byBrZXkvdmFsdWUgcGFpcnMuXG4qKi9cbmZ1bmN0aW9uIGFub255bWl6ZVRyYWNrZXJUb2tlbnModHJhY2tlckRhdGEpIHtcbiAgLy8gUmFuZG9tIGJhc2UgaWRcbiAgY29uc3QgbWluID0gMTtcbiAgY29uc3QgbWF4ID0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XG4gIGxldCByYW5kSWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuXG4gIC8vIEFub255bWl6ZSB0aGUgZ2l2ZW4gdHJhY2tlciBkYXRhXG4gIGxldCBhbm9ueW1pemVkVHJhY2tlckRhdGEgPSB7fTtcblxuICBmb3IgKGxldCBvcmlnaW5hbEtleSBpbiB0cmFja2VyRGF0YSkge1xuICAgIGNvbnN0IG5ld1JhbmRvbUtleSA9IGxlZnRwYWQocmFuZElkLnRvU3RyaW5nKCkuc3Vic3RyKDAsIDE2KSwgJzAnLCAxNik7XG4gICAgcmFuZElkID0gKHJhbmRJZCArIDEpICUgbWF4O1xuICAgIGFub255bWl6ZWRUcmFja2VyRGF0YVtuZXdSYW5kb21LZXldID0gdHJhY2tlckRhdGFbb3JpZ2luYWxLZXldO1xuICB9XG5cbiAgcmV0dXJuIGFub255bWl6ZWRUcmFja2VyRGF0YTtcbn1cblxudmFyIENsaXF6QXR0cmFjayA9IHtcbiAgICBWRVJTSU9OOiAnMC45NicsXG4gICAgTUlOX0JST1dTRVJfVkVSU0lPTjogMzUsXG4gICAgTE9HX0tFWTogJ2F0dHJhY2snLFxuICAgIFZFUlNJT05DSEVDS19VUkw6ICdodHRwczovL2Nkbi5jbGlxei5jb20vYW50aS10cmFja2luZy93aGl0ZWxpc3QvdmVyc2lvbmNoZWNrLmpzb24nLFxuICAgIFVSTF9BTEVSVF9SVUxFUzogJ2Nocm9tZTovL2NsaXF6L2NvbnRlbnQvYW50aS10cmFja2luZy1ydWxlcy5qc29uJyxcbiAgICBVUkxfQkxPQ0tfUlVMRVM6ICdodHRwczovL2Nkbi5jbGlxei5jb20vYW50aS10cmFja2luZy93aGl0ZWxpc3QvYW50aS10cmFja2luZy1ibG9jay1ydWxlcy5qc29uJyxcbiAgICBFTkFCTEVfUFJFRjogJ2FudGlUcmFja1Rlc3QnLFxuICAgIGRlYnVnOiBmYWxzZSxcbiAgICBtc2dUeXBlOidhdHRyYWNrJyxcbiAgICB0aW1lQ2xlYW5pbmdDYWNoZTogMTgwKjEwMDAsXG4gICAgdGltZUFmdGVyTGluazogNSoxMDAwLFxuICAgIHRpbWVBY3RpdmU6IDIwKjEwMDAsXG4gICAgdGltZUJvb3R1cDogMTAqMTAwMCxcbiAgICBib290dXBUaW1lOiBEYXRlLm5vdygpLFxuICAgIGJvb3RpbmdVcDogdHJ1ZSxcbiAgICB3aGl0ZWxpc3Q6IG51bGwsXG4gICAgb2JzQ291bnRlcjoge30sXG4gICAgc2ltaWxhckFkZG9uOiBmYWxzZSxcbiAgICBibG9ja2luZ0ZhaWxlZDp7fSxcbiAgICB0cmFja1JlbG9hZDp7fSxcbiAgICByZWxvYWRXaGl0ZUxpc3Q6e30sXG4gICAgdG9rZW5Eb21haW5Db3VudFRocmVzaG9sZDogMixcbiAgICBzYWZlS2V5RXhwaXJlOiA3LFxuICAgIGxvY2FsQmxvY2tFeHBpcmU6IDI0LFxuICAgIHNob3J0VG9rZW5MZW5ndGg6IDgsXG4gICAgc2FmZWtleVZhbHVlc1RocmVzaG9sZDogNCxcbiAgICBjQ2hlY2tlcjogbmV3IENvb2tpZUNoZWNrZXIoKSxcbiAgICBxc0Jsb2NrUnVsZTogbnVsbCwgIC8vIGxpc3Qgb2YgZG9tYWlucyBzaG91bGQgYmUgYmxvY2tlZCBpbnN0ZWFkIG9mIHNodWZmbGluZ1xuICAgIGJsb2NrZWQ6IG51bGwsICAvLyBsb2cgd2hhdCdzIGJlZW4gYmxvY2tlZFxuICAgIHBsYWNlSG9sZGVyOiAnJyxcbiAgICB0cF9ldmVudHM6IHRwX2V2ZW50cyxcbiAgICB0b2tlbnM6IG51bGwsXG4gICAgaW5zdGFudFRva2VuQ2FjaGU6IHt9LFxuICAgIHJlcXVlc3RLZXlWYWx1ZTogbnVsbCxcbiAgICByZWNlbnRseU1vZGlmaWVkOiBuZXcgVGVtcFNldCgpLFxuICAgIGNsaXF6SGVhZGVyOiAnQ0xJUVotQW50aVRyYWNraW5nJyxcbiAgICByZXBsYWNlbWVudDogXCJcIixcbiAgICBvYmZ1c2NhdGU6IGZ1bmN0aW9uKHMsIG1ldGhvZCwgcmVwbGFjZW1lbnQpIHtcbiAgICAgICAgLy8gdXNlZCB3aGVuIGFjdGlvbiAhPSAnYmxvY2snXG4gICAgICAgIC8vIGRlZmF1bHQgaXMgYSBwbGFjZWhvbGRlclxuICAgICAgICBzd2l0Y2gobWV0aG9kKSB7XG4gICAgICAgIGNhc2UgJ2VtcHR5JzpcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgY2FzZSAncmVwbGFjZSc6XG4gICAgICAgICAgICByZXR1cm4gc2h1ZmZsZShzKTtcbiAgICAgICAgY2FzZSAnc2FtZSc6XG4gICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgY2FzZSAncGxhY2Vob2xkZXInOlxuICAgICAgICAgICAgcmV0dXJuIENsaXF6QXR0cmFjay5wbGFjZUhvbGRlcjtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBDbGlxekF0dHJhY2sucGxhY2VIb2xkZXI7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGJvb3R1cFdoaXRlbGlzdENhY2hlOiB7fSxcbiAgICBibG9ja2VkQ2FjaGU6IHt9LFxuICAgIHZpc2l0Q2FjaGU6IHt9LFxuICAgIGNvbnRleHRPYXV0aDoge30sXG4gICAgbGlua3NGcm9tRG9tOiB7fSxcbiAgICBjb29raWVzRnJvbURvbToge30sXG4gICAgbG9hZGVkVGFiczoge30sXG4gICAgZ2V0QnJvd3Nlck1ham9yVmVyc2lvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmFyIGFwcEluZm8gPSBDb21wb25lbnRzLmNsYXNzZXNbXCJAbW96aWxsYS5vcmcveHJlL2FwcC1pbmZvOzFcIl1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmdldFNlcnZpY2UoQ29tcG9uZW50cy5pbnRlcmZhY2VzLm5zSVhVTEFwcEluZm8pO1xuICAgICAgICAgIHJldHVybiBwYXJzZUludChhcHBJbmZvLnZlcnNpb24uc3BsaXQoJy4nKVswXSk7XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgIC8vIGZhbGxiYWNrIGZvciB3aGVuIG5vIHZlcnNpb24gQVBJXG4gICAgICAgICAgcmV0dXJuIDEwMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0UHJpdmF0ZVZhbHVlczogZnVuY3Rpb24od2luZG93KSB7XG4gICAgICAgIC8vIGNyZWF0ZXMgYSBsaXN0IG9mIHJldHVybiB2YWx1ZXMgb2YgZnVuY3Rpb25zIG1heSBsZWFrIHByaXZhdGUgaW5mb1xuICAgICAgICB2YXIgcCA9IHt9O1xuICAgICAgICAvLyB2YXIgbmF2aWdhdG9yID0gdXRpbHMuZ2V0V2luZG93KCkubmF2aWdhdG9yO1xuICAgICAgICB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbiAgICAgICAgLy8gcGx1Z2luc1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hdmlnYXRvci5wbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IG5hdmlnYXRvci5wbHVnaW5zW2ldLm5hbWU7XG4gICAgICAgICAgICBpZiAobmFtZS5sZW5ndGggPj0gOCkge1xuICAgICAgICAgICAgICAgIHBbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIENsaXF6QXR0cmFjay5wcml2YXRlVmFsdWVzID0gcDtcbiAgICB9LFxuICAgIGdldENvb2tpZVZhbHVlczogZnVuY3Rpb24oYywgdXJsKSB7XG4gICAgICAgIGlmIChjID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdiA9IDAsIGNvb2tpZXMgPSB7fTtcbiAgICAgICAgaWYgKGMubWF0Y2goL15cXHMqXFwkVmVyc2lvbj0oPzpcIjFcInwxKTtcXHMqKC4qKS8pKSB7XG4gICAgICAgICAgICBjID0gUmVnRXhwLiQxO1xuICAgICAgICAgICAgdiA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHYgPT09IDApIHtcbiAgICAgICAgICAgIGMuc3BsaXQoL1ssO10vKS5tYXAoZnVuY3Rpb24oY29va2llKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gY29va2llLnNwbGl0KC89Lyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHBhcnRzWzFdID0gcGFydHMuc2xpY2UoMSkuam9pbignPScpO1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gZFVSSUMocGFydHNbMF0udHJpbUxlZnQoKSksXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gcGFydHMubGVuZ3RoID4gMSA/IGRVUklDKHBhcnRzWzFdLnRyaW1SaWdodCgpKSA6IG51bGw7XG4gICAgICAgICAgICAgICAgY29va2llc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjLm1hdGNoKC8oPzpefFxccyspKFshIyQlJicqK1xcLS4wLTlBLVpeYGEtenx+XSspPShbISMkJSYnKitcXC0uMC05QS1aXmBhLXp8fl0qfFwiKD86W1xceDIwLVxceDdFXFx4ODBcXHhGRl18XFxcXFtcXHgwMC1cXHg3Rl0pKlwiKSg/PVxccypbLDtdfCQpL2cpLm1hcChmdW5jdGlvbigkMCwgJDEpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gJDAsXG4gICAgICAgICAgICAgICAgdmFsdWUgPSAkMS5jaGFyQXQoMCkgPT09ICdcIidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPyAkMS5zdWJzdHIoMSwgLTEpLnJlcGxhY2UoL1xcXFwoLikvZywgXCIkMVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICA6ICQxO1xuICAgICAgICAgICAgICAgIGNvb2tpZXNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJldHVybiBjb29raWVzO1xuICAgICAgICB2YXIgY29va2llVmFsID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb29raWVzKSB7XG4gICAgICAgICAgICBpZiAodXJsLmluZGV4T2YoY29va2llc1trZXldKSA9PSAtMSkgeyAvLyBjb29raWVzIHNhdmUgYXMgcGFydCBvZiB0aGUgdXJsIGlzIGFsbG93ZWRcbiAgICAgICAgICAgICAgICBjb29raWVWYWxbY29va2llc1trZXldXSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvb2tpZVZhbDtcbiAgICB9LFxuICAgIGh0dHBvcGVuT2JzZXJ2ZXI6IHtcbiAgICAgICAgb2JzZXJ2ZSA6IGZ1bmN0aW9uKHJlcXVlc3REZXRhaWxzKSB7XG4gICAgICAgICAgICBpZiAoIUNsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QuaXNSZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcmVxdWVzdENvbnRleHQgPSBuZXcgSHR0cFJlcXVlc3RDb250ZXh0KHJlcXVlc3REZXRhaWxzKTtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXF1ZXN0Q29udGV4dC51cmw7XG4gICAgICAgICAgICBpZiAoIXVybCB8fCB1cmwgPT0gJycpIHJldHVybjtcbiAgICAgICAgICAgIHZhciB1cmxfcGFydHMgPSBVUkxJbmZvLmdldCh1cmwpO1xuXG4gICAgICAgICAgICBpZiAocmVxdWVzdENvbnRleHQuaXNGdWxsUGFnZSgpKSB7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5vbkZ1bGxQYWdlKHVybF9wYXJ0cywgcmVxdWVzdENvbnRleHQuZ2V0T3V0ZXJXaW5kb3dJRCgpLCByZXF1ZXN0Q29udGV4dC5pc0NoYW5uZWxQcml2YXRlKCkpO1xuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suaXNUcmFja2VyVHh0RW5hYmxlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIFRyYWNrZXJUWFQuZ2V0KHVybF9wYXJ0cykudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5ibG9ja0xvZy5pbmNyZW1lbnRMb2FkZWRQYWdlcygpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhpcyBuZWVkcyB0byBiZSBhIGNvbW1vbiBmdW5jdGlvbiBhc3dlbGwuIEFsc28gY29uc2lkZXIgZ2V0dGluZyBPUklHSU4gaGVhZGVyLlxuICAgICAgICAgICAgdmFyIHJlZmVycmVyID0gcmVxdWVzdENvbnRleHQuZ2V0UmVmZXJyZXIoKTtcbiAgICAgICAgICAgIHZhciBzYW1lX2dkID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFdlIG5lZWQgdG8gZ2V0IHRoZSBzb3VyY2UgZnJvbSB3aGVyZSB0aGUgcmVxdWVzdCBvcmlnaW5hdGVkLlxuICAgICAgICAgICAgLy8gVGhlcmUgYXJlIHR3byB3YXlzIGluIHdoaWNoIHdlIGNhbiBnZXQgaXQuXG4gICAgICAgICAgICAvLyAxLiBoZWFkZXIgLT4gUkVGRVJSRVJcbiAgICAgICAgICAgIC8vIDIuIEdldCBzb3VyY2UgdXJsLlxuICAgICAgICAgICAgLy8gMy4gaGVhZGVyIC0+IE9SSUdJTiAoVGhpcyBuZWVkcyB0byBiZSBpbnZlc3RpZ2F0ZWQuKVxuXG4gICAgICAgICAgICB2YXIgc291cmNlX3VybCA9IHJlcXVlc3RDb250ZXh0LmdldExvYWRpbmdEb2N1bWVudCgpLFxuICAgICAgICAgICAgICAgIHNvdXJjZV91cmxfcGFydHMgPSBudWxsLFxuICAgICAgICAgICAgICAgIHNvdXJjZV90YWIgPSByZXF1ZXN0Q29udGV4dC5nZXRPcmlnaW5XaW5kb3dJRCgpO1xuXG4gICAgICAgICAgICB2YXIgcGFnZV9sb2FkX3R5cGUgPSBudWxsO1xuICAgICAgICAgICAgdmFyIHJlcXVlc3RfdHlwZSA9IG51bGw7XG4gICAgICAgICAgICBzd2l0Y2gocmVxdWVzdENvbnRleHQuZ2V0Q29udGVudFBvbGljeVR5cGUoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgICAgICAgcGFnZV9sb2FkX3R5cGUgPSBcImZ1bGxwYWdlXCI7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RfdHlwZSA9IFwiZnVsbHBhZ2VcIjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA3OiBwYWdlX2xvYWRfdHlwZSA9IFwiZnJhbWVcIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDogcGFnZV9sb2FkX3R5cGUgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvdXJjZV91cmwgPT0gJycgfHwgc291cmNlX3VybC5pbmRleE9mKCdhYm91dDonKT09MCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYocGFnZV9sb2FkX3R5cGUgPT0gJ2Z1bGxwYWdlJykgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBtb2RpZnkgb3IgY2FuY2VsIHRoZSBodHRwIHJlcXVlc3QgaWYgdGhlIHVybCBjb250YWlucyBwZXJzb25hbCBpZGVudGlmaWVyXG4gICAgICAgICAgICAvLyBOb3cgcmVmc3RyIHNob3VsZCBub3QgYmUgbnVsbCwgYnV0IHN0aWxsIGtlZXBpbmcgdGhlIGNsYXVzZSB0byBjaGVjayBmcm9tIGVkZ2UgY2FzZXMuXG5cbiAgICAgICAgICAgIGlmIChzb3VyY2VfdXJsICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzb3VyY2VfdXJsX3BhcnRzID0gVVJMSW5mby5nZXQoc291cmNlX3VybCk7XG5cbiAgICAgICAgICAgICAgICAvLyBzYW1lIGdlbmVyYWwgZG9tYWluXG4gICAgICAgICAgICAgICAgc2FtZV9nZCA9IHNhbWVHZW5lcmFsRG9tYWluKHVybF9wYXJ0cy5ob3N0bmFtZSwgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSkgfHwgZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKHNhbWVfZ2QpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBmaW5kIHRoZSBvayB0b2tlbnMgZmllbGRzXG4gICAgICAgICAgICAgICAgdmFyIGlzUHJpdmF0ZSA9IHJlcXVlc3RDb250ZXh0LmlzQ2hhbm5lbFByaXZhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzUHJpdmF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suZXhhbWluZVRva2Vucyh1cmxfcGFydHMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGV4dHJhY3QgYW5kIHNhdmUgdG9rZW5zXG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmV4dHJhY3RLZXlUb2tlbnModXJsX3BhcnRzLCBzb3VyY2VfdXJsX3BhcnRzWydob3N0bmFtZSddLCBpc1ByaXZhdGUsIENsaXF6QXR0cmFjay5zYXZlS2V5VG9rZW5zKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucmVjb3JkTGlua3NGb3JVUkwoc291cmNlX3VybCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcmVmbGlua3MgPSBDbGlxekF0dHJhY2subGlua3NGcm9tRG9tW3NvdXJjZV91cmxdIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgLy8gd29yayBhcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9jbGlxei9uYXZpZ2F0aW9uLWV4dGVuc2lvbi9pc3N1ZXMvMTIzMFxuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sucmVjZW50bHlNb2RpZmllZC5jb250YWlucyhzb3VyY2VfdGFiICsgdXJsKSkge1xuICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucmVjZW50bHlNb2RpZmllZC5kZWxldGUoc291cmNlX3RhYiArIHVybCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7Y2FuY2VsOiB0cnVlfSA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh1cmwgaW4gcmVmbGlua3MpIHtcbiAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csIFwidXJsX2luX3JlZmxpbmtzXCIpO1xuICAgICAgICAgICAgICAgICAgICAvLyByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gbG9nIHRoaXJkIHBhcnR5IHJlcXVlc3RcbiAgICAgICAgICAgICAgICB2YXIgcmVxX2xvZyA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYodXJsX3BhcnRzLmhvc3RuYW1lICE9IHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxX2xvZyA9IENsaXF6QXR0cmFjay50cF9ldmVudHMuZ2V0KHVybCwgdXJsX3BhcnRzLCBzb3VyY2VfdXJsLCBzb3VyY2VfdXJsX3BhcnRzLCBzb3VyY2VfdGFiKTtcbiAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2MnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYodXJsX3BhcnRzWydxdWVyeSddLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdoYXNfcXMnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZih1cmxfcGFydHNbJ3BhcmFtZXRlcnMnXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnaGFzX3BzJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYodXJsX3BhcnRzWydmcmFnbWVudCddLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdoYXNfZnJhZ21lbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZXQgY29udGVudF90eXBlID0gcmVxdWVzdENvbnRleHQuZ2V0Q29udGVudFBvbGljeVR5cGUoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb250ZW50X3R5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCBcInR5cGVfdW5rbm93blwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCBcInR5cGVfXCIgKyBjb250ZW50X3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gbG9nIHByb3RvY29sIChzZWN1cmUgb3Igbm90KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0hUVFAgPSBwcm90b2NvbCA9PiBwcm90b2NvbCA9PT0gXCJodHRwXCIgfHwgcHJvdG9jb2wgPT09IFwiaHR0cHNcIlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2hlbWUgPSBpc0hUVFAodXJsX3BhcnRzLnByb3RvY29sKSA/IHVybF9wYXJ0cy5wcm90b2NvbCA6IFwib3RoZXJcIjtcbiAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ3NjaGVtZV8nICsgc2NoZW1lKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBmaW5kIGZyYW1lIGRlcHRoXG4gICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICd3aW5kb3dfZGVwdGhfJyArIHJlcXVlc3RDb250ZXh0LmdldFdpbmRvd0RlcHRoKCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGdldCBjb29raWUgZGF0YVxuICAgICAgICAgICAgICAgIHZhciBjb29raWV2YWx1ZSA9IHt9LFxuICAgICAgICAgICAgICAgICAgICBkb2NDb29raWUgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoc291cmNlX3VybCBpbiBDbGlxekF0dHJhY2suY29va2llc0Zyb21Eb20gJiYgQ2xpcXpBdHRyYWNrLmNvb2tpZXNGcm9tRG9tW3NvdXJjZV91cmxdKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY0Nvb2tpZSA9IENsaXF6QXR0cmFjay5jb29raWVzRnJvbURvbVtzb3VyY2VfdXJsXTtcbiAgICAgICAgICAgICAgICAgICAgY29va2lldmFsdWUgPSBDbGlxekF0dHJhY2suZ2V0Q29va2llVmFsdWVzKGRvY0Nvb2tpZSwgdXJsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0cnkgdG8gZ2V0IHRoZSBkb2N1bWVudCBmcm9tIHNvdXJjZVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5sYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY0Nvb2tpZSA9IHNvdXJjZS5sYy50b3BXaW5kb3cuZG9jdW1lbnQuY29va2llO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkb2NDb29raWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29va2lldmFsdWUgPSBDbGlxekF0dHJhY2suZ2V0Q29va2llVmFsdWVzKGRvY0Nvb2tpZSwgdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb29raWVkYXRhID0gcmVxdWVzdENvbnRleHQuZ2V0UmVxdWVzdEhlYWRlcignQ29va2llJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb29raWUyID0gQ2xpcXpBdHRyYWNrLmdldENvb2tpZVZhbHVlcyhjb29raWVkYXRhLCB1cmwpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29va2llMiA9IHt9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGMgaW4gY29va2llMikge1xuICAgICAgICAgICAgICAgICAgICBjb29raWV2YWx1ZVtjXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHN0YXRzID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGJhZFRva2VucyA9IENsaXF6QXR0cmFjay5jaGVja1Rva2Vucyh1cmxfcGFydHMsIHNvdXJjZV91cmwsIGNvb2tpZXZhbHVlLCBzdGF0cywgc291cmNlX3VybF9wYXJ0cyk7XG4gICAgICAgICAgICAgICAgaWYocmVxX2xvZykge1xuICAgICAgICAgICAgICAgICAgICAvLyBzYXZlIHRva2VuIHN0YXRzIHRvIHRoZSBsb2cuXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHN0YXRzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhdHNba2V5XSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAndG9rZW4uaGFzXycrIGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ3Rva2VuLicrIGtleSwgc3RhdHNba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChiYWRUb2tlbnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay50cmFja2VyUHJveHkuY2hlY2tTaG91bGRQcm94eSh1cmwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAncHJveHknKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQmxvY2sgcmVxdWVzdCBiYXNlZCBvbiBydWxlcyBzcGVjaWZpZWRcbiAgICAgICAgICAgICAgICB2YXIgX2tleSA9IHNvdXJjZV90YWIgKyBcIjpcIiArIHNvdXJjZV91cmw7XG4gICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5pc1FTRW5hYmxlZCgpICYmICEoQ2xpcXpBdHRyYWNrLnJlbG9hZFdoaXRlTGlzdFtfa2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBDbGlxekF0dHJhY2sucXNCbG9ja1J1bGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzUnVsZSA9IENsaXF6QXR0cmFjay5xc0Jsb2NrUnVsZVtpXVswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1UnVsZSA9IENsaXF6QXR0cmFjay5xc0Jsb2NrUnVsZVtpXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lLmVuZHNXaXRoKHNSdWxlKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybF9wYXJ0cy5ob3N0bmFtZS5lbmRzV2l0aCh1UnVsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAncmVxX3J1bGVfYWJvcnRlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7Y2FuY2VsOiB0cnVlfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKGJhZFRva2Vucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdiYWRfcXMnKTtcbiAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2JhZF90b2tlbnMnLCBiYWRUb2tlbnMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBhbHRlcmluZyByZXF1ZXN0XG4gICAgICAgICAgICAgICAgLy8gQWRkaXRpb25hbCBjaGVjayB0byB2ZXJpZnkgaWYgdGhlIHVzZXIgcmVsb2FkZWQgdGhlIHBhZ2UuXG4gICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5pc1FTRW5hYmxlZCgpICYmICEoQ2xpcXpBdHRyYWNrLnJlbG9hZFdoaXRlTGlzdFtfa2V5XSkpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmlzU291cmNlV2hpdGVsaXN0ZWQoc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCBcInNvdXJjZV93aGl0ZWxpc3RlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmxvZyhcImFsdGVyaW5nIHJlcXVlc3QgXCIgKyB1cmwgKyBcIiBcIiArIHNvdXJjZV91cmwgKyAnICcgKyBzYW1lX2dkLCAndG9raycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMubG9nKCdiYWQgdG9rZW5zOiAnICsgSlNPTi5zdHJpbmdpZnkoYmFkVG9rZW5zKSwgJ3Rva2snKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYWRUb2tlbnMubGVuZ3RoID4gMCAmJiBDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmlzVXBUb0RhdGUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGV0ZXJtaW4gYWN0aW9uIGJhc2VkIG9uIHRyYWNrZXIudHh0XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcnVsZSA9IENsaXF6QXR0cmFjay5nZXREZWZhdWx0UnVsZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90cmFja2VyVHh0ID0gVHJhY2tlclRYVC5nZXQoc291cmNlX3VybF9wYXJ0cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIUNsaXF6QXR0cmFjay5pc0ZvcmNlQmxvY2tFbmFibGVkKCkgJiYgQ2xpcXpBdHRyYWNrLmlzVHJhY2tlclR4dEVuYWJsZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfdHJhY2tlclR4dC5sYXN0X3VwZGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgZmlyc3QgdXBkYXRlIGlzIG5vdCByZWFkeSB5ZXQgZm9yIHRoaXMgZmlyc3QgcGFydHksIGFsbG93IGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICd0cmFja2VyLnR4dF9ub3RfcmVhZHknICsgcnVsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcnVsZSA9IF90cmFja2VyVHh0LmdldFJ1bGUodXJsX3BhcnRzLmhvc3RuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydWxlID09ICdibG9jaycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAndG9rZW5fYmxvY2tlZF8nICsgcnVsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtjYW5jZWw6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXBfdXJsID0gcmVxdWVzdENvbnRleHQudXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYmFkVG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0bXBfdXJsLmluZGV4T2YoYmFkVG9rZW5zW2ldKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhZFRva2Vuc1tpXSA9IGVuY29kZVVSSUNvbXBvbmVudChiYWRUb2tlbnNbaV0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG1wX3VybCA9IHRtcF91cmwucmVwbGFjZShiYWRUb2tlbnNbaV0sIENsaXF6QXR0cmFjay5vYmZ1c2NhdGUoYmFkVG9rZW5zW2ldLCBydWxlLCBDbGlxekF0dHJhY2sucmVwbGFjZW1lbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbiBjYXNlIHVuc2FmZSB0b2tlbnMgd2VyZSBpbiB0aGUgaG9zdG5hbWUsIHRoZSBVUkkgaXMgbm90IHZhbGlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW55bW9yZSBhbmQgd2UgY2FuIGNhbmNlbCB0aGUgcmVxdWVzdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRtcF91cmwuc3RhcnRzV2l0aCh1cmxfcGFydHMucHJvdG9jb2wgKyAnOi8vJyArIHVybF9wYXJ0cy5ob3N0bmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7Y2FuY2VsOiB0cnVlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICd0b2tlbl9ibG9ja2VkXycgKyBydWxlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sudHJhY2tlclByb3h5LmNoZWNrU2hvdWxkUHJveHkodG1wX3VybCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ3Byb3h5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5yZWNlbnRseU1vZGlmaWVkLmFkZChzb3VyY2VfdGFiICsgdXJsLCAzMDAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnJlY2VudGx5TW9kaWZpZWQuYWRkKHNvdXJjZV90YWIgKyB0bXBfdXJsLCAzMDAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZGlyZWN0VXJsOiB0bXBfdXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdEhlYWRlcnM6IHJ1bGUgIT0gJ3NhbWUnID8gW3tuYW1lOiBDbGlxekF0dHJhY2suY2xpcXpIZWFkZXIsIHZhbHVlOiAnICd9XSA6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gcmVmc3RyOiBtaWdodCBiZSBhYmxlIHRvIGdldCBhIHJlZmVycmVyIGZyb20gbG9hZCBjb250ZXh0IHRvIHZlcmlmeSBpZiBmYXZpY29uIG9yIGV4dGVuc2lvbiByZXF1ZXN0XG4gICAgICAgICAgICAgICAgLy8gTm93IHRoaXMgc2hvdWxkIG5vdCBoYXBwZW4uIEtlZXBpbmcgdGhlIGNvZGUgYmxvY2sgZm9yIG5vdy4gV2lsbCByZW1vdmUgaXQgYWZ0ZXIgbW9yZSB0ZXN0aW5nLlxuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIlRISVMgQ0FMTCBESUQgTk9UIEhBVkUgQSBSRUZcIixcIm5vX3JlZnN0clwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgaHR0cFJlc3BvbnNlT2JzZXJ2ZXI6IHtcbiAgICAgICAgb2JzZXJ2ZTogZnVuY3Rpb24ocmVxdWVzdERldGFpbHMpIHtcbiAgICAgICAgICAgIGlmICghQ2xpcXpBdHRyYWNrLnFzX3doaXRlbGlzdC5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVxdWVzdENvbnRleHQgPSBuZXcgSHR0cFJlcXVlc3RDb250ZXh0KHJlcXVlc3REZXRhaWxzKSxcbiAgICAgICAgICAgICAgICB1cmwgPSByZXF1ZXN0Q29udGV4dC51cmw7XG5cbiAgICAgICAgICAgIGlmICghdXJsKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgdXJsX3BhcnRzID0gVVJMSW5mby5nZXQodXJsKTtcbiAgICAgICAgICAgIHZhciByZWZlcnJlciA9IHJlcXVlc3RDb250ZXh0LmdldFJlZmVycmVyKCk7XG4gICAgICAgICAgICB2YXIgc2FtZV9nZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICB2YXIgc291cmNlX3VybCA9IHJlcXVlc3RDb250ZXh0LmdldExvYWRpbmdEb2N1bWVudCgpLFxuICAgICAgICAgICAgICAgIHNvdXJjZV91cmxfcGFydHMgPSBudWxsLFxuICAgICAgICAgICAgICAgIHNvdXJjZV90YWIgPSByZXF1ZXN0Q29udGV4dC5nZXRPcmlnaW5XaW5kb3dJRCgpO1xuXG4gICAgICAgICAgICAvLyBmdWxsIHBhZ2VcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0Q29udGV4dC5pc0Z1bGxQYWdlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoWzMwMCwgMzAxLCAzMDIsIDMwMywgMzA3XS5pbmRleE9mKHJlcXVlc3RDb250ZXh0LmNoYW5uZWwucmVzcG9uc2VTdGF0dXMpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QsIHVwZGF0ZSBsb2NhdGlvbiBmb3IgdGFiXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIG5vIHJlZGlyZWN0IGxvY2F0aW9uIHNldCwgc3RhZ2UgdGhlIHRhYiBpZCBzbyB3ZSBkb24ndCBnZXQgZmFsc2UgZGF0YVxuICAgICAgICAgICAgICAgICAgICBsZXQgcmVkaXJlY3RfdXJsID0gcmVxdWVzdENvbnRleHQuZ2V0UmVzcG9uc2VIZWFkZXIoXCJMb2NhdGlvblwiKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlZGlyZWN0X3VybF9wYXJ0cyA9IFVSTEluZm8uZ2V0KHJlZGlyZWN0X3VybCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHJlZGlyZWN0IGlzIHJlbGF0aXZlLCB1c2Ugc291cmNlIGRvbWFpblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlZGlyZWN0X3VybF9wYXJ0cy5ob3N0bmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVkaXJlY3RfdXJsX3BhcnRzLmhvc3RuYW1lID0gdXJsX3BhcnRzLmhvc3RuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVkaXJlY3RfdXJsX3BhcnRzLnBhdGggPSByZWRpcmVjdF91cmw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5vblJlZGlyZWN0KHJlZGlyZWN0X3VybF9wYXJ0cywgcmVxdWVzdENvbnRleHQuZ2V0T3V0ZXJXaW5kb3dJRCgpLCByZXF1ZXN0Q29udGV4dC5pc0NoYW5uZWxQcml2YXRlKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzb3VyY2VfdXJsID09ICcnIHx8IHNvdXJjZV91cmwuaW5kZXhPZignYWJvdXQ6Jyk9PTApIHJldHVybjtcblxuICAgICAgICAgICAgaWYgKHNvdXJjZV91cmwgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHNvdXJjZV91cmxfcGFydHMgPSBVUkxJbmZvLmdldChzb3VyY2VfdXJsKTtcbiAgICAgICAgICAgICAgICAvLyBleHRyYWN0IGFuZCBzYXZlIHRva2Vuc1xuICAgICAgICAgICAgICAgIHNhbWVfZ2QgPSBzYW1lR2VuZXJhbERvbWFpbih1cmxfcGFydHMuaG9zdG5hbWUsIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpIHx8IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChzYW1lX2dkKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICBpZih1cmxfcGFydHMuaG9zdG5hbWUgIT0gc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSlcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlcV9sb2cgPSBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmdldCh1cmwsIHVybF9wYXJ0cywgc291cmNlX3VybCwgc291cmNlX3VybF9wYXJ0cywgc291cmNlX3RhYik7XG4gICAgICAgICAgICAgICAgaWYgKHJlcV9sb2cpIHtcbiAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ3Jlc3Bfb2InKTtcbiAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2NvbnRlbnRfbGVuZ3RoJywgcGFyc2VJbnQocmVxdWVzdENvbnRleHQuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJykpIHx8IDApO1xuICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCBgc3RhdHVzXyR7cmVxdWVzdENvbnRleHQuY2hhbm5lbC5yZXNwb25zZVN0YXR1c31gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBpcyBjYWNoZWQ/XG4gICAgICAgICAgICAgICAgbGV0IGNhY2hlZCA9IHJlcXVlc3RDb250ZXh0LmlzQ2FjaGVkO1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCBjYWNoZWQgPyAnY2FjaGVkJyA6ICdub3RfY2FjaGVkJyk7XG5cblxuICAgICAgICAgICAgICAgIC8vIGJyb2tlbiBieSBhdHRyYWNrP1xuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sucmVjZW50bHlNb2RpZmllZC5oYXMoc291cmNlX3RhYiArIHVybCkgJiYgcmVxdWVzdENvbnRleHQuY2hhbm5lbC5yZXNwb25zZVN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlX3VybCxcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiByZXF1ZXN0Q29udGV4dC5jaGFubmVsLnJlc3BvbnNlU3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICB1cmxfaW5mbzoge1xuICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB1cmxfcGFydHMucHJvdG9jb2wsXG4gICAgICAgICAgICAgICAgICAgICAgaG9zdG5hbWU6IHVybF9wYXJ0cy5ob3N0bmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBtZDUodXJsX3BhcnRzLnBhdGgpLFxuICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogdXJsX3BhcnRzLmdldEtleVZhbHVlc01ENSgpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6IHJlcXVlc3RDb250ZXh0LmdldFdpbmRvd0RlcHRoKClcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSB7XG4gICAgICAgICAgICAgICAgICAgICd0eXBlJzogdGVsZW1ldHJ5Lm1zZ1R5cGUsXG4gICAgICAgICAgICAgICAgICAgICdhY3Rpb24nOiAnYXR0cmFjay5icmVha2FnZScsXG4gICAgICAgICAgICAgICAgICAgICdwYXlsb2FkJzogQ2xpcXpBdHRyYWNrLmdlbmVyYXRlQXR0cmFja1BheWxvYWQocGF5bG9hZClcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICB0ZWxlbWV0cnkudGVsZW1ldHJ5KG1zZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBodHRwbW9kT2JzZXJ2ZXI6IHtcbiAgICAgICAgb2JzZXJ2ZSA6IGZ1bmN0aW9uKHJlcXVlc3REZXRhaWxzKSB7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdENvbnRleHQgPSBuZXcgSHR0cFJlcXVlc3RDb250ZXh0KHJlcXVlc3REZXRhaWxzKSxcbiAgICAgICAgICAgICAgICB1cmwgPSByZXF1ZXN0Q29udGV4dC51cmwsXG4gICAgICAgICAgICAgICAgYmxvY2tpbmdSZXNwb25zZSA9IHt9O1xuXG4gICAgICAgICAgICBpZiAoIXVybCkgcmV0dXJuO1xuXG4gICAgICAgICAgICB2YXIgdXJsX3BhcnRzID0gVVJMSW5mby5nZXQodXJsKTtcblxuICAgICAgICAgICAgdmFyIGNvb2tpZV9kYXRhID0gcmVxdWVzdENvbnRleHQuZ2V0Q29va2llRGF0YSgpO1xuXG5cbiAgICAgICAgICAgIC8vIFF1aWNrIGVzY2FwZXM6XG4gICAgICAgICAgICAvLyBsb2NhbGhvc3Qgb3Igbm8gY29va2llIGRhdGFcbiAgICAgICAgICAgIGlmICh1cmxfcGFydHNbJ2hvc3RuYW1lJ10gPT0gJ2xvY2FsaG9zdCcgfHwgIWNvb2tpZV9kYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBHYXRoZXIgbW9yZSBpbmZvIGZvciBmdXJ0aGVyIGNoZWNrc1xuICAgICAgICAgICAgdmFyIGN1cnJfdGltZSA9IERhdGUubm93KCk7XG4gICAgICAgICAgICBpZiAoKGN1cnJfdGltZSAtIENsaXF6QXR0cmFjay5ib290dXBUaW1lKSA+IENsaXF6QXR0cmFjay50aW1lQm9vdHVwKSBDbGlxekF0dHJhY2suYm9vdGluZ1VwID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGZpbGwgY29udGV4dCBvYXV0aCwgdGhpcyBuZWVkcyB0byBiZSBkb25lIGJlZm9yZSBhY2NlcHRpbmcgb3IgcmVxdWVzdGluZyB0aGUgY29va2llcy5cbiAgICAgICAgICAgIHZhciBvdXJsID0gZmluZE9hdXRoKHVybCwgdXJsX3BhcnRzKTtcbiAgICAgICAgICAgIGlmIChvdXJsKSB7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmNvbnRleHRPYXV0aCA9IHsndHMnOiBjdXJyX3RpbWUsICdodG1sJzogZFVSSUMob3VybCkgKyAnOicgKyB1cmx9O1xuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIk9BVVRIOiBcIiArIEpTT04uc3RyaW5naWZ5KENsaXF6QXR0cmFjay5jb250ZXh0T2F1dGgpLCBDbGlxekF0dHJhY2suTE9HX0tFWSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNvbnRlbnQgcG9saWN5IHR5cGUgNiA9PSBUWVBFX0RPQ1VNRU5UOiB0b3AgbGV2ZWwgZG9tIGVsZW1lbnQuIERvIG5vdCBibG9jay5cbiAgICAgICAgICAgIGlmIChyZXF1ZXN0Q29udGV4dC5pc0Z1bGxQYWdlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciByZWZlcnJlciA9IHJlcXVlc3RDb250ZXh0LmdldFJlZmVycmVyKCk7XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSByZXF1ZXN0IGlzIG9yaWdpbmF0aW5nIGZyb20gYSB0YWIsIHdlIGNhbiBnZXQgYSBzb3VyY2UgdXJsXG4gICAgICAgICAgICAvLyBUaGUgaW1wbGVtZW50YXRpb24gYmVsb3cgaXMgY2F1c2luZyBhIGJ1ZywgaWYgd2UgbG9hZCBkaWZmZXJlbnQgdXJscyBpbiBzYW1lIHRhYi5cbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYmV0dGVyIGhhbmRlbGVkIGluIGNhcHR1cmluZyByZXF1ZXN0IHR5cGUuIFdoZW4gcmVxdWVzdCB0eXBlID09IGZ1bGxwYWdlXG4gICAgICAgICAgICAvLyBUaGVuIHVyaS5zcGVjID09IHNvdXJjZV91cmxcbiAgICAgICAgICAgIC8vIE9ubHkgZ2V0IHNvdXJjZSB0YWJzIGZvciBub3cuXG5cbiAgICAgICAgICAgIHZhciBzb3VyY2VfdXJsID0gcmVxdWVzdENvbnRleHQuZ2V0TG9hZGluZ0RvY3VtZW50KCksXG4gICAgICAgICAgICAgICAgc291cmNlX3VybF9wYXJ0cyA9IG51bGwsXG4gICAgICAgICAgICAgICAgc291cmNlX3RhYiA9IHJlcXVlc3RDb250ZXh0LmdldE9yaWdpbldpbmRvd0lEKCk7XG5cbiAgICAgICAgICAgIHZhciBwYWdlX2xvYWRfdHlwZSA9IG51bGw7XG4gICAgICAgICAgICB2YXIgcmVxdWVzdF90eXBlID0gbnVsbDtcbiAgICAgICAgICAgIHN3aXRjaChyZXF1ZXN0Q29udGV4dC5nZXRDb250ZW50UG9saWN5VHlwZSgpKSB7XG4gICAgICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAgICAgICBwYWdlX2xvYWRfdHlwZSA9IFwiZnVsbHBhZ2VcIjtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdF90eXBlID0gXCJmdWxscGFnZVwiO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDc6IHBhZ2VfbG9hZF90eXBlID0gXCJmcmFtZVwiOyBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBwYWdlX2xvYWRfdHlwZSA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZmVycmVyIGlmIHdlIGRvbid0IGZpbmQgc291cmNlIGZyb20gdGFiXG4gICAgICAgICAgICBpZiAoc291cmNlX3VybCA9PT0gdW5kZWZpbmVkIHx8IHNvdXJjZV91cmwgPT0gJycpe1xuICAgICAgICAgICAgICAgIHNvdXJjZV91cmwgPSByZWZlcnJlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFzb3VyY2VfdXJsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzb3VyY2VfdXJsX3BhcnRzID0gVVJMSW5mby5nZXQoc291cmNlX3VybCk7XG4gICAgICAgICAgICB2YXIgcmVxX2xvZyA9IG51bGw7XG5cbiAgICAgICAgICAgIHZhciBzYW1lX2dkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodXJsX3BhcnRzLmhvc3RuYW1lIT0nJyAmJiBzb3VyY2VfdXJsX3BhcnRzICYmIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUhPScnKSB7XG4gICAgICAgICAgICAgICAgc2FtZV9nZCA9IHNhbWVHZW5lcmFsRG9tYWluKHVybF9wYXJ0cy5ob3N0bmFtZSwgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzYW1lX2dkKSB7XG4gICAgICAgICAgICAgICAgLy8gbm90IGEgM3JkIHBhcnR5IGNvb2tpZSwgZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxX2xvZyA9IENsaXF6QXR0cmFjay50cF9ldmVudHMuZ2V0KHVybCwgdXJsX3BhcnRzLCBzb3VyY2VfdXJsLCBzb3VyY2VfdXJsX3BhcnRzLCBzb3VyY2VfdGFiKTtcblxuICAgICAgICAgICAgaWYgKHJlcV9sb2cgJiYgcmVxX2xvZy5jID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYmxvY2tpbmdSZXNwb25zZSA9IENsaXF6QXR0cmFjay5odHRwb3Blbk9ic2VydmVyLm9ic2VydmUocmVxdWVzdERldGFpbHMpIHx8IHt9O1xuICAgICAgICAgICAgICAgIHJlcV9sb2cgPSBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmdldCh1cmwsIHVybF9wYXJ0cywgc291cmNlX3VybCwgc291cmNlX3VybF9wYXJ0cywgc291cmNlX3RhYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfc2V0Jyk7XG4gICAgICAgICAgICBpZiAoc291cmNlX3VybC5pbmRleE9mKCdhYm91dDonKT09MCkge1xuICAgICAgICAgICAgICAgIC8vIGl0J3MgYSBicmFuZCBuZXcgdGFiLCBhbmQgdGhlIHVybCBpcyBsb2FkZWQgZXh0ZXJuYWxseSxcbiAgICAgICAgICAgICAgICAvLyBhYm91dDpob21lLCBhYm91dDpibGFua1xuICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYWxsb3dfbmV3dGFiJyk7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmFsbG93Q29va2llKHVybCwgeydkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdzcmMnOiBzb3VyY2VfdXJsLCAnZGF0YSc6IGNvb2tpZV9kYXRhLCAndHMnOiBjdXJyX3RpbWV9LCBcImFib3V0OmJsYW5rXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9ja2luZ1Jlc3BvbnNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiBkb21haW4gaXMgd2hpdGVsaXN0ZWQsXG4gICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmlzSW5XaGl0ZWxpc3QodXJsX3BhcnRzLmhvc3RuYW1lKSkge1xuICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYWxsb3dfd2hpdGVsaXN0ZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coXCJJcyB3aGl0ZWxpc3RlZCAodHlwZTogZGlyZWN0KTogXCIgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGhvc3QgPSBnZXRHZW5lcmFsRG9tYWluKHVybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICB2YXIgZGlmZiA9IGN1cnJfdGltZSAtIChDbGlxekF0dHJhY2sudmlzaXRDYWNoZVtob3N0XSB8fCAwKTtcblxuICAgICAgICAgICAgLy8gVGhpcyBpcyBvcmRlciB0byBvbmx5IGFsbG93IHZpc2l0ZWQgc291cmNlcyBmcm9tIGJyb3dzZXIuIEVsc2Ugc29tZSByZWRpcmVjdCBjYWxsc1xuICAgICAgICAgICAgLy8gR2V0dGluZyBsZWFrZWQuXG4gICAgICAgICAgICB2YXIgc19ob3N0ID0gJyc7XG4gICAgICAgICAgICBpZihzb3VyY2VfdXJsICYmIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpe1xuICAgICAgICAgICAgICAgIHNfaG9zdCA9IGdldEdlbmVyYWxEb21haW4oc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIHZpc2l0Y2FjaGUgdG8gc2VlIGlmIHRoaXMgZG9tYWluIGlzIHRlbXBvcmFyaWx5IGFsbG93ZWQuXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrIHJlcXVpcmVkIHdoZW4gZ2Q9ZmFsc2UgYW5kIHJlcXVlc3RfdHlwZT09IGZ1bGxfcGFnZSwgZWxzZSBibG9ja1xuICAgICAgICAgICAgaWYgKGRpZmYgPCBDbGlxekF0dHJhY2sudGltZUFjdGl2ZSAmJiBDbGlxekF0dHJhY2sudmlzaXRDYWNoZVtzX2hvc3RdKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNyYyA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZV91cmxfcGFydHMgJiYgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSkgc3JjID0gc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZTtcbiAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnY29va2llX2FsbG93X3Zpc2l0Y2FjaGUnKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suYWxsb3dDb29raWUodXJsLCB7J2RzdCc6IHVybF9wYXJ0cy5ob3N0bmFtZSwgJ3NyYyc6IHNyYywgJ2RhdGEnOiBjb29raWVfZGF0YSwgJ3RzJzogY3Vycl90aW1lfSwgXCJ2aXNpdGNhY2hlXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBibG9ja2luZ1Jlc3BvbnNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiB1c2VyIGluaXRpYXRlZCB0aGlzIHJlcXVlc3QgYnkgYW4gZWxlbWVudCBjbGljay5cbiAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suY0NoZWNrZXIuY29udGV4dEZyb21FdmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gY3Vycl90aW1lIC0gKENsaXF6QXR0cmFjay5jQ2hlY2tlci5jb250ZXh0RnJvbUV2ZW50LnRzIHx8IDApO1xuICAgICAgICAgICAgICAgIGlmIChkaWZmIDwgQ2xpcXpBdHRyYWNrLnRpbWVBZnRlckxpbmspIHtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaG9zdCA9IGdldEdlbmVyYWxEb21haW4odXJsX3BhcnRzLmhvc3RuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhvc3QgPT09IENsaXF6QXR0cmFjay5jQ2hlY2tlci5jb250ZXh0RnJvbUV2ZW50LmdETSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnZpc2l0Q2FjaGVbaG9zdF0gPSBjdXJyX3RpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3JjID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2VfdXJsX3BhcnRzICYmIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpIHNyYyA9IHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnY29va2llX2FsbG93X3VzZXJpbml0X3NhbWVfY29udGV4dF9nZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmFsbG93Q29va2llKHVybCwgeydkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdzcmMnOiBzcmMsICdkYXRhJzogY29va2llX2RhdGEsICd0cyc6IGN1cnJfdGltZX0sIFwiY29udGV4dEZyb21FdmVudFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBibG9ja2luZ1Jlc3BvbnNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBwdSA9IHVybC5zcGxpdCgvWz8mO10vKVswXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5jQ2hlY2tlci5jb250ZXh0RnJvbUV2ZW50Lmh0bWwuaW5kZXhPZihwdSkhPS0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coXCI+Pj4gQ29va2llIEFMTE9XRUQgKHR5cGUyKTogXCIgKyBwdSArIFwiIFwiICsgQ2xpcXpBdHRyYWNrLmNDaGVja2VyLmNvbnRleHRGcm9tRXZlbnQuaHRtbCwgQ2xpcXpBdHRyYWNrLkxPR19LRVkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgdXJsIGlzIGluIHB1XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXJsX3BhcnRzICYmIHVybF9wYXJ0cy5ob3N0bmFtZSAmJiB1cmxfcGFydHMuaG9zdG5hbWUhPScnKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sudmlzaXRDYWNoZVtob3N0XSA9IGN1cnJfdGltZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYWxsb3dfdXNlcmluaXRfc2FtZV9nZF9saW5rJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmFsbG93Q29va2llKHVybCwgeydkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdzcmMnOiBzcmMsICdkYXRhJzogY29va2llX2RhdGEsICd0cyc6IGN1cnJfdGltZX0sIFwiY29udGV4dEZyb21FdmVudFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY2hlY2sgZm9yIE9BdXRoIHJlcXVlc3RzXG4gICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmNvbnRleHRPYXV0aCkge1xuICAgICAgICAgICAgICAgIHZhciBkaWZmID0gY3Vycl90aW1lIC0gKENsaXF6QXR0cmFjay5jb250ZXh0T2F1dGgudHMgfHwgMCk7XG4gICAgICAgICAgICAgICAgaWYgKGRpZmYgPCBDbGlxekF0dHJhY2sudGltZUFjdGl2ZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBwdSA9IHVybC5zcGxpdCgvWz8mO10vKVswXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmNvbnRleHRPYXV0aC5odG1sLmluZGV4T2YocHUpIT0tMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHVybCBpcyBpbiBwdVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVybF9wYXJ0cyAmJiB1cmxfcGFydHMuaG9zdG5hbWUgJiYgdXJsX3BhcnRzLmhvc3RuYW1lIT0nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb250ZXh0RnJvbUV2ZW50ID0gYnJvd3Nlci5jb250ZXh0RnJvbUV2ZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHRGcm9tRXZlbnQgJiYgY29udGV4dEZyb21FdmVudC5odG1sICYmIGNvbnRleHRGcm9tRXZlbnQuaHRtbC5pbmRleE9mKHB1KSE9LTEpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coXCJPQVVUSCBhbmQgY2xpY2sgXCIgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhvc3QgPSBnZXRHZW5lcmFsRG9tYWluKHVybF9wYXJ0cy5ob3N0bmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzcmMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlX3VybF9wYXJ0cyAmJiBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKSBzcmMgPSBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnY29va2llX2FsbG93X29hdXRoJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdyZXFfb2F1dGgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmFsbG93Q29va2llKHVybCwgeydkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdzcmMnOiBzcmMsICdkYXRhJzogY29va2llX2RhdGEsICd0cyc6IGN1cnJfdGltZX0sIFwiY29udGV4dE9hdXRoXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIk9BVVRIIGFuZCBOT1QgY2xpY2sgXCIgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh1cmxfcGFydHMuaG9zdG5hbWUhPScnICYmIHNvdXJjZV91cmxfcGFydHMgJiYgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSE9JycpIHtcblxuICAgICAgICAgICAgICAgIC8vIHRoZSBob3N0bmFtZXMgYXJlIGRpZmZlcmVudCwgYnV0IHRoZXkgbWlnaHQgc3RpbGwgYmUgdGhlIHNhbWUgc2l0ZTogZS5nLlxuICAgICAgICAgICAgICAgIC8vIGxvYzUubGFjYWl4YS5lcyA9PiBtZXRyaWNzLmxhY2FpeGEuZXNcblxuICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHtcbiAgICAgICAgICAgICAgICAgICAgdXRpbHMubG9nKFwiY29va2llIGRldGVjdGVkID4+PiBcIiArIHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUgKyBcIiA6IFwiICsgdXJsX3BhcnRzLmhvc3RuYW1lLCBDbGlxekF0dHJhY2suTE9HX0tFWSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCghc2FtZV9nZCkgJiYgY29va2llX2RhdGEgJiYgIGNvb2tpZV9kYXRhLmxlbmd0aD4xMCkge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGFzIHRlc3QsIHdlIGRvIG5vdCBzZW5kIHRoZSBob3N0bmFtZSBhcyBtZDVcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1kNV9zb3VyY2VfaG9zdG5hbWUgPSBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIG5vdywgbGV0J3Mga2lsbCB0aGF0IGNvb2tpZSBhbmQgc2VlIHdoYXQgaGFwcGVucyA6LSlcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9rZXkgPSBzb3VyY2VfdGFiICsgXCI6XCIgKyBzb3VyY2VfdXJsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmlzQ29va2llRW5hYmxlZChzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKSAmJiAhKENsaXF6QXR0cmFjay5yZWxvYWRXaGl0ZUxpc3RbX2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBibG9ja2luZyBjb29raWVcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzcmMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZV91cmxfcGFydHMgJiYgc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZSkgc3JjID0gc291cmNlX3VybF9wYXJ0cy5ob3N0bmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYmxvY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2Nvb2tpZV9ibG9ja190cDEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5ibG9ja0Nvb2tpZShzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lLCB7J3NyYyc6IHNyYywgJ2RzdCc6IHVybF9wYXJ0cy5ob3N0bmFtZSwgJ2RhdGEnOiBjb29raWVfZGF0YSwgJ3RzJzogY3Vycl90aW1lfSwgJ3R5cGUxJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NraW5nUmVzcG9uc2UucmVxdWVzdEhlYWRlcnMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtuYW1lOiAnQ29va2llJywgdmFsdWU6ICcnfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge25hbWU6IENsaXF6QXR0cmFjay5jbGlxekhlYWRlciwgdmFsdWU6ICcgJ31cbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhcyBub3QgZW5hYmxlZCwgdGhlcmVmb3JlIHRoZSBjb29raWUgZ2V0cyBzZW50XG4gICAgICAgICAgICAgICAgICAgICAgICB0cF9ldmVudHMuaW5jcmVtZW50U3RhdChyZXFfbG9nLCAnYmFkX2Nvb2tpZV9zZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5ib290aW5nVXApIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoKGN1cnJfdGltZSAtIENsaXF6QXR0cmFjay5ib290dXBUaW1lKSA+IENsaXF6QXR0cmFjay50aW1lQm9vdHVwKSBDbGlxekF0dHJhY2suYm9vdGluZ1VwID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5kZWJ1ZykgdXRpbHMubG9nKFwiPj4+IEJvb3RpbmcgdXA6IFwiICArIHVybCArIFwiIDogXCIgKyB1cmxfcGFydHMuaG9zdG5hbWUsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IHVybF9wYXJ0cy5ob3N0bmFtZSArIHVybF9wYXJ0cy5wYXRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICYmIGtleSE9JycpIENsaXF6QXR0cmFjay5ib290dXBXaGl0ZWxpc3RDYWNoZVtrZXldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2Nvb2tpZV9hbGxvd19ib290aW5ndXAnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5kZWJ1ZykgdXRpbHMubG9nKFwiPj4+IENvb2tpZSBBTExPV0VEIGJlY2F1c2UgYm9vdHVwOiBcIiArIGtleSwgQ2xpcXpBdHRyYWNrLkxPR19LRVkpO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSB1cmxfcGFydHMuaG9zdG5hbWUgKyB1cmxfcGFydHMucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5ib290dXBXaGl0ZWxpc3RDYWNoZVtrZXldPT1udWxsKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suaXNDb29raWVFbmFibGVkKHNvdXJjZV91cmxfcGFydHMuaG9zdG5hbWUpICYmICEoQ2xpcXpBdHRyYWNrLnJlbG9hZFdoaXRlTGlzdFtfa2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBibG9ja2luZyBjb29raWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3JjID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlX3VybF9wYXJ0cyAmJiBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKSBzcmMgPSBzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYmxvY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRwX2V2ZW50cy5pbmNyZW1lbnRTdGF0KHJlcV9sb2csICdjb29raWVfYmxvY2tfdHAyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrQ29va2llKHVybCwgeydzcmMnOiBzcmMsICdkc3QnOiB1cmxfcGFydHMuaG9zdG5hbWUsICdkYXRhJzogY29va2llX2RhdGEsICd0cyc6IGN1cnJfdGltZX0sICd0eXBlMicpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tpbmdSZXNwb25zZS5yZXF1ZXN0SGVhZGVycyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtuYW1lOiAnQ29va2llJywgdmFsdWU6ICcnfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtuYW1lOiBDbGlxekF0dHJhY2suY2xpcXpIZWFkZXIsIHZhbHVlOiAnICd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2tpbmdSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhcyBub3QgZW5hYmxlZCwgdGhlcmVmb3JlIHRoZSBjb29raWUgZ2V0cyBzZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHBfZXZlbnRzLmluY3JlbWVudFN0YXQocmVxX2xvZywgJ2JhZF9jb29raWVfc2VudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2hvdWxkIGFsbG93LCBzYW1lIGRvbWFpbiBhbmQgcGF0aCBhcyBib290dXAgcmVxdWVzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIj4+PiBDb29raWUgQUxMT1dFRCBiZWNhdXNlIGJvb3R1cDogXCIgKyBrZXksIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJsb2NraW5nUmVzcG9uc2U7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGFsbG93Q29va2llOiBmdW5jdGlvbih1cmwsIHJlcV9tZXRhZGF0YSwgcmVhc29uKSB7XG4gICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIkFMTE9XSU5HIGJlY2F1c2Ugb2YgXCIgKyByZWFzb24gKyBcIiBcIiArIHJlcV9tZXRhZGF0YVsnZHN0J10gKyAnICUlICcgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICB9LFxuICAgIGJsb2NrQ29va2llOiBmdW5jdGlvbih1cmwsIHJlcV9tZXRhZGF0YSwgcmVhc29uKSB7XG4gICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIj4+PiBDb29raWUgUkVNT1ZFRCAoXCIgKyByZWFzb24gKyBcIik6IFwiICArIHJlcV9tZXRhZGF0YVsnZHN0J10gKyBcIiA+Pj4gXCIgKyB1cmwsIENsaXF6QXR0cmFjay5MT0dfS0VZKTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrZWRDYWNoZVtyZXFfbWV0YWRhdGFbJ2RzdCddXSA9IHJlcV9tZXRhZGF0YVsndHMnXTtcbiAgICB9LFxuICAgIG9uVGFiTG9jYXRpb25DaGFuZ2U6IGZ1bmN0aW9uKGV2bnQpIHtcbiAgICAgICAgdmFyIHVybCA9IGV2bnQudXJsO1xuXG4gICAgICAgIENsaXF6QXR0cmFjay5saW5rc0Zyb21Eb21bdXJsXSA9IHt9O1xuXG4gICAgICAgIGlmIChldm50LmlzTG9hZGluZ0RvY3VtZW50KSB7XG4gICAgICAgICAgICAvLyB3aGVuIGEgbmV3IHBhZ2UgaXMgbG9hZGVkLCB0cnkgdG8gZXh0cmFjdCBpbnRlcm5hbCBsaW5rcyBhbmQgY29va2llc1xuICAgICAgICAgICAgdmFyIGRvYyA9IGV2bnQuZG9jdW1lbnQ7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2subG9hZGVkVGFic1t1cmxdID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmKGRvYykge1xuICAgICAgICAgICAgICAgIGlmIChkb2MuYm9keSkge1xuICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucmVjb3JkTGlua3NGb3JVUkwodXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG9jLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgICAgICAgICAgICdET01Db250ZW50TG9hZGVkJyxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5sb2FkZWRUYWJzW3VybF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnJlY29yZExpbmtzRm9yVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5jbGVhckRvbUxpbmtzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXcgbG9jYXRpb24sIG1lYW5zIGEgcGFnZSBsb2FkZWQgb24gdGhlIHRvcCB3aW5kb3csIHZpc2libGUgdGFiXG4gICAgICAgIHZhciBhY3RpdmVVUkwgPSBicm93c2VyLmN1cnJlbnRVUkwoKTtcbiAgICAgICAgdmFyIGN1cnJfdGltZSA9IERhdGUubm93KCk7XG5cbiAgICAgICAgaWYgKChhY3RpdmVVUkwuaW5kZXhPZignYWJvdXQ6JykhPTApICYmIChhY3RpdmVVUkwuaW5kZXhPZignY2hyb21lOicpIT0wKSkge1xuXG4gICAgICAgICAgICB2YXIgdXJsX3BhcnRzID0gcGFyc2VVUkwoYWN0aXZlVVJMKTtcblxuICAgICAgICAgICAgaWYgKHVybF9wYXJ0cyAmJiB1cmxfcGFydHMuaG9zdG5hbWUgJiYgdXJsX3BhcnRzLmhvc3RuYW1lIT0nJykge1xuICAgICAgICAgICAgICAgIHZhciBob3N0ID0gZ2V0R2VuZXJhbERvbWFpbih1cmxfcGFydHMuaG9zdG5hbWUpO1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay52aXNpdENhY2hlW2hvc3RdID0gY3Vycl90aW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXREZWZhdWx0UnVsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChDbGlxekF0dHJhY2suaXNGb3JjZUJsb2NrRW5hYmxlZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Jsb2NrJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBnZXREZWZhdWx0VHJhY2tlclR4dFJ1bGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgaXNFbmFibGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHV0aWxzLmdldFByZWYoQ2xpcXpBdHRyYWNrLkVOQUJMRV9QUkVGLCBmYWxzZSk7XG4gICAgfSxcbiAgICBpc0Nvb2tpZUVuYWJsZWQ6IGZ1bmN0aW9uKHNvdXJjZV9ob3N0bmFtZSkge1xuICAgICAgICBpZiAoc291cmNlX2hvc3RuYW1lICE9IHVuZGVmaW5lZCAmJiBDbGlxekF0dHJhY2suaXNTb3VyY2VXaGl0ZWxpc3RlZChzb3VyY2VfaG9zdG5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0aWxzLmdldFByZWYoJ2F0dHJhY2tCbG9ja0Nvb2tpZVRyYWNraW5nJywgdHJ1ZSk7XG4gICAgfSxcbiAgICBpc1FTRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRQcmVmKCdhdHRyYWNrUmVtb3ZlUXVlcnlTdHJpbmdUcmFja2luZycsIHRydWUpO1xuICAgIH0sXG4gICAgaXNGaW5nZXJwcmludGluZ0VuYWJsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0UHJlZignYXR0cmFja0NhbnZhc0ZpbmdlcnByaW50VHJhY2tpbmcnLCBmYWxzZSk7XG4gICAgfSxcbiAgICBpc1JlZmVycmVyRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRQcmVmKCdhdHRyYWNrUmVmZXJlclRyYWNraW5nJywgZmFsc2UpO1xuICAgIH0sXG4gICAgaXNUcmFja2VyVHh0RW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRQcmVmKCd0cmFja2VyVHh0JywgZmFsc2UpO1xuICAgIH0sXG4gICAgaXNCbG9vbUZpbHRlckVuYWJsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0UHJlZignYXR0cmFja0Jsb29tRmlsdGVyJywgZmFsc2UpO1xuICAgIH0sXG4gICAgaXNGb3JjZUJsb2NrRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRQcmVmKCdhdHRyYWNrRm9yY2VCbG9jaycsIGZhbHNlKTtcbiAgICB9LFxuICAgIGluaXRQYWNlbWFrZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgdHdvX21pbnMgPSAyICogNjAgKiAxMDAwO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhIGNvbnN0cmFpbnQgd2hpY2ggcmV0dXJucyB0cnVlIHdoZW4gdGhlIHRpbWUgY2hhbmdlcyBhdCB0aGUgc3BlY2lmaWVkIGZpZGVsaXR5XG4gICAgICAgIGZ1bmN0aW9uIHRpbWVDaGFuZ2VDb25zdHJhaW50KG5hbWUsIGZpZGVsaXR5KSB7XG4gICAgICAgICAgICBpZiAoZmlkZWxpdHkgPT0gXCJkYXlcIikgZmlkZWxpdHkgPSA4O1xuICAgICAgICAgICAgZWxzZSBpZihmaWRlbGl0eSA9PSBcImhvdXJcIikgZmlkZWxpdHkgPSAxMDtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICAgICAgICAgIHZhciB0aW1lc3RhbXAgPSBkYXRldGltZS5nZXRUaW1lKCkuc2xpY2UoMCwgZmlkZWxpdHkpLFxuICAgICAgICAgICAgICAgICAgICBsYXN0SG91ciA9IHBlcnNpc3QuZ2V0VmFsdWUobmFtZSArIFwibGFzdFJ1blwiKSB8fCB0aW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgcGVyc2lzdC5zZXRWYWx1ZShuYW1lICtcImxhc3RSdW5cIiwgdGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGltZXN0YW1wICE9IGxhc3RIb3VyO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihDbGlxekF0dHJhY2sudXBkYXRlQ29uZmlnLCAzICogNjAgKiA2MCAqIDEwMDApO1xuXG4gICAgICAgIC8vIHNlbmQgaW5zdGFudCBjYWNoZSB0b2tlbnMgd2hlbmV2ZXIgaG91ciBjaGFuZ2VzXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihDbGlxekF0dHJhY2suc2VuZFRva2VucywgNSAqIDYwICogMTAwMCk7XG4gICAgICAgIC8vIGlmIHRoZSBob3VyIGhhcyBjaGFuZ2VkXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihDbGlxekF0dHJhY2suaG91ckNoYW5nZWQsIHR3b19taW5zLCB0aW1lQ2hhbmdlQ29uc3RyYWludChcImhvdXJDaGFuZ2VkXCIsIFwiaG91clwiKSk7XG5cbiAgICAgICAgLy8gZXZlcnkgMiBtaW5zXG5cbiAgICAgICAgZnVuY3Rpb24gY2xlYW5UaW1lc3RhbXBDYWNoZShjYWNoZU9iaiwgdGltZW91dCwgY3VyclRpbWUpIHtcbiAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoY2FjaGVPYmopXG4gICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgICAgICAgIGlmIChjdXJyVGltZSAtIGNhY2hlT2JqW2tdIHx8IDAgPiB0aW1lb3V0KSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSBjYWNoZU9ialtrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihmdW5jdGlvbiBjbGVhbl9jYWNoZXMoY3VyclRpbWUpIHtcbiAgICAgICAgICAvLyB2aXNpdCBjYWNoZVxuICAgICAgICAgIGNsZWFuVGltZXN0YW1wQ2FjaGUoQ2xpcXpBdHRyYWNrLnZpc2l0Q2FjaGUsIENsaXF6QXR0cmFjay50aW1lQ2xlYW5pbmdDYWNoZSwgY3VyclRpbWUpO1xuICAgICAgICAgIC8vIHJlbG9hZCB3aGl0ZWxpc3RcbiAgICAgICAgICBjbGVhblRpbWVzdGFtcENhY2hlKENsaXF6QXR0cmFjay5yZWxvYWRXaGl0ZUxpc3QsIENsaXF6QXR0cmFjay50aW1lQ2xlYW5pbmdDYWNoZSwgY3VyclRpbWUpO1xuICAgICAgICAgIC8vIHRyYWNrIHJlbG9hZFxuICAgICAgICAgIGNsZWFuVGltZXN0YW1wQ2FjaGUoQ2xpcXpBdHRyYWNrLnRyYWNrUmVsb2FkLCBDbGlxekF0dHJhY2sudGltZUNsZWFuaW5nQ2FjaGUsIGN1cnJUaW1lKTtcbiAgICAgICAgICAvLyBibG9ja2VkIGNhY2hlXG4gICAgICAgICAgY2xlYW5UaW1lc3RhbXBDYWNoZShDbGlxekF0dHJhY2suYmxvY2tlZENhY2hlLCBDbGlxekF0dHJhY2sudGltZUNsZWFuaW5nQ2FjaGUsIGN1cnJUaW1lKTtcbiAgICAgICAgICAvLyByZWNvcmQgY2FjaGVcbiAgICAgICAgICBjbGVhblRpbWVzdGFtcENhY2hlKENsaXF6QXR0cmFjay5saW5rc1JlY29yZGVkLCAxMDAwLCBjdXJyVGltZSk7XG4gICAgICAgICAgLy8gdGFiIGxpc3RlbmVyIHN0YXR1c2VzXG4gICAgICAgICAgQ2xpcXpBdHRyYWNrLnRhYl9saXN0ZW5lci5jbGVhblRhYnNTdGF0dXMoKTtcbiAgICAgICAgfSwgdHdvX21pbnMpO1xuXG4gICAgICAgIHZhciBib290dXBfdGFzayA9IHBhY2VtYWtlci5yZWdpc3RlcihmdW5jdGlvbiBib290dXBfY2hlY2soY3Vycl90aW1lKSB7XG4gICAgICAgICAgICBpZiAoKGN1cnJfdGltZSAtIENsaXF6QXR0cmFjay5ib290dXBUaW1lKSA+IENsaXF6QXR0cmFjay50aW1lQm9vdHVwKSB7XG4gICAgICAgICAgICAgICAgdXRpbHMubG9nKFwiYm9vdHVwIGVuZFwiKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suYm9vdGluZ1VwID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGFjZW1ha2VyLmRlcmVnaXN0ZXIoYm9vdHVwX3Rhc2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBwYWNlbWFrZXIucmVnaXN0ZXIoZnVuY3Rpb24gdHBfZXZlbnRfY29tbWl0KCkge1xuICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5jb21taXQoKTtcbiAgICAgICAgICAgIENsaXF6QXR0cmFjay50cF9ldmVudHMucHVzaCgpO1xuICAgICAgICB9LCB0d29fbWlucyk7XG5cbiAgICAgICAgLy8gZXZlcnkgaG91clxuICAgICAgICBsZXQgaG91cmx5ID0gNjAgKiA2MCAqIDEwMDA7XG4gICAgICAgIHBhY2VtYWtlci5yZWdpc3RlcihDbGlxekF0dHJhY2sucHJ1bmVSZXF1ZXN0S2V5VmFsdWUsIGhvdXJseSk7XG5cbiAgICAgICAgcGFjZW1ha2VyLnJlZ2lzdGVyKGZ1bmN0aW9uIGFubm90YXRlU2FmZUtleXMoKSB7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmFubm90YXRlU2FmZUtleXMoQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZSk7XG4gICAgICAgIH0sIDEwICogNjAgKiA2MCAqIDEwMDApO1xuXG4gICAgfSxcbiAgICAvKiogR2xvYmFsIG1vZHVsZSBpbml0aWFsaXNhdGlvbi5cbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gZGlzYWJsZSBmb3Igb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgaWYgKENsaXF6QXR0cmFjay5nZXRCcm93c2VyTWFqb3JWZXJzaW9uKCkgPCBDbGlxekF0dHJhY2suTUlOX0JST1dTRVJfVkVSU0lPTikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVwbGFjZSBnZXRXaW5kb3cgZnVuY3Rpb25zIHdpdGggd2luZG93IG9iamVjdCB1c2VkIGluIGluaXQuXG4gICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZyhcIkluaXQgZnVuY3Rpb24gY2FsbGVkOlwiLCBDbGlxekF0dHJhY2suTE9HX0tFWSk7XG5cbiAgICAgICAgaWYgKCFDbGlxekF0dHJhY2suaGFzaFByb2IpIHtcbiAgICAgICAgICBDbGlxekF0dHJhY2suaGFzaFByb2IgPSBuZXcgSGFzaFByb2IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGxvYWQgYWxsIGNhY2hlczpcbiAgICAgICAgLy8gTGFyZ2UgZHluYW1pYyBjYWNoZXMgYXJlIGxvYWRlZCB2aWEgdGhlIHBlcnNpc3QgbW9kdWxlLCB3aGljaCB3aWxsIGxhemlseSBwcm9wZWdhdGUgY2hhbmdlcyBiYWNrXG4gICAgICAgIC8vIHRvIHRoZSBicm93c2VyJ3Mgc3FsaXRlIGRhdGFiYXNlLlxuICAgICAgICAvLyBMYXJnZSBzdGF0aWMgY2FjaGVzIChlLmcuIHRva2VuIHdoaXRlbGlzdCkgYXJlIGxvYWRlZCBmcm9tIHNxbGl0ZVxuICAgICAgICAvLyBTbWFsbGVyIGNhY2hlcyAoZS5nLiB1cGRhdGUgdGltZXN0YW1wcykgYXJlIGtlcHQgaW4gcHJlZnNcbiAgICAgICAgaWYgKCF0aGlzLl90b2tlbnMpIHtcbiAgICAgICAgICB0aGlzLl90b2tlbnMgPSBuZXcgcGVyc2lzdC5BdXRvUGVyc2lzdGVudE9iamVjdChcInRva2Vuc1wiLCAodikgPT4gQ2xpcXpBdHRyYWNrLnRva2VucyA9IHYsIDYwMDAwKTtcbiAgICAgICAgfVxuICAgICAgICAvL3RoaXMuX2Jsb2NrZWQgPSBuZXcgcGVyc2lzdC5BdXRvUGVyc2lzdGVudE9iamVjdChcImJsb2NrZWRcIiwgKHYpID0+IENsaXF6QXR0cmFjay5ibG9ja2VkID0gdiwgMzAwMDAwKTtcblxuICAgICAgICBDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0ID0gQ2xpcXpBdHRyYWNrLmlzQmxvb21GaWx0ZXJFbmFibGVkKCkgPyBuZXcgQXR0cmFja0Jsb29tRmlsdGVyKCkgOiBuZXcgUVNXaGl0ZWxpc3QoKTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLnFzX3doaXRlbGlzdC5pbml0KCk7XG4gICAgICAgIENsaXF6QXR0cmFjay5ibG9ja0xvZyA9IG5ldyBCbG9ja0xvZyhDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0KTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrTG9nLmluaXQoKTtcblxuICAgICAgICBpZiAoIXRoaXMuX3JlcXVlc3RLZXlWYWx1ZSkge1xuICAgICAgICAgIHRoaXMuX3JlcXVlc3RLZXlWYWx1ZSA9IG5ldyBwZXJzaXN0LkF1dG9QZXJzaXN0ZW50T2JqZWN0KFwicmVxdWVzdEtleVZhbHVlXCIsICh2KSA9PiBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlID0gdiwgNjAwMDApO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGNsZWFuIHJlcXVlc3RLZXlWYWx1ZVxuICAgICAgICBldmVudHMuc3ViKFwiYXR0cmFjazpzYWZla2V5c191cGRhdGVkXCIsICh2ZXJzaW9uLCBmb3JjZUNsZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAoZm9yY2VDbGVhbikge1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5fcmVxdWVzdEtleVZhbHVlLmNsZWFyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChDbGlxekF0dHJhY2sucXNCbG9ja1J1bGUgPT0gbnVsbCkgQ2xpcXpBdHRyYWNrLmxvYWRCbG9ja1J1bGVzKCk7XG5cbiAgICAgICAgLy8gbG9hZCB0cmFja2VyIGNvbXBhbmllcyBkYXRhXG4gICAgICAgIHRoaXMuX3RyYWNrZXJMb2FkZXIgPSBuZXcgUmVzb3VyY2VMb2FkZXIoIFsnYW50aXRyYWNraW5nJywgJ3RyYWNrZXJfb3duZXJzLmpzb24nXSwge1xuICAgICAgICAgICAgcmVtb3RlVVJMOiAnaHR0cHM6Ly9jZG4uY2xpcXouY29tL2FudGktdHJhY2tpbmcvdHJhY2tlcl9vd25lcnNfbGlzdC5qc29uJyxcbiAgICAgICAgICAgIGNyb246IDI0ICogNjAgKiA2MCAqIDEwMDAsXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl90cmFja2VyTG9hZGVyLmxvYWQoKS50aGVuKENsaXF6QXR0cmFjay5fcGFyc2VUcmFja2VyQ29tcGFuaWVzKTtcbiAgICAgICAgdGhpcy5fdHJhY2tlckxvYWRlci5vblVwZGF0ZShDbGlxekF0dHJhY2suX3BhcnNlVHJhY2tlckNvbXBhbmllcyk7XG5cbiAgICAgICAgLy8gbG9hZCBjb29raWUgd2hpdGVsaXN0XG4gICAgICAgIHRoaXMuX2Nvb2tpZVdoaXRlbGlzdExvYWRlciA9IG5ldyBSZXNvdXJjZUxvYWRlciggWydhbnRpdHJhY2tpbmcnLCAnY29va2llX3doaXRlbGlzdC5qc29uJ10sIHtcbiAgICAgICAgICAgIHJlbW90ZVVSTDogJ2h0dHBzOi8vY2RuLmNsaXF6LmNvbS9hbnRpLXRyYWNraW5nL3doaXRlbGlzdC9jb29raWVfd2hpdGVsaXN0Lmpzb24nLFxuICAgICAgICAgICAgY3JvbjogMjQgKiA2MCAqIDYwICogMTAwMFxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHVwZGF0ZUNvb2tpZVdoaXRlbGlzdCA9IChkYXRhKSA9PiB7IENsaXF6QXR0cmFjay53aGl0ZWxpc3QgPSBkYXRhIH1cbiAgICAgICAgdGhpcy5fY29va2llV2hpdGVsaXN0TG9hZGVyLmxvYWQoKS50aGVuKHVwZGF0ZUNvb2tpZVdoaXRlbGlzdCk7XG4gICAgICAgIHRoaXMuX2Nvb2tpZVdoaXRlbGlzdExvYWRlci5vblVwZGF0ZSh1cGRhdGVDb29raWVXaGl0ZWxpc3QpO1xuXG4gICAgICAgIENsaXF6QXR0cmFjay5jaGVja0luc3RhbGxlZEFkZG9ucygpO1xuXG4gICAgICAgIGlmIChDbGlxekF0dHJhY2sudmlzaXRDYWNoZSA9PSBudWxsKSB7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2sudmlzaXRDYWNoZSA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgQ2xpcXpBdHRyYWNrLmluaXRQYWNlbWFrZXIoKTtcbiAgICAgICAgcGFjZW1ha2VyLnN0YXJ0KCk7XG5cbiAgICAgICAgV2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QuYWRkTGlzdGVuZXIoQ2xpcXpBdHRyYWNrLmh0dHBvcGVuT2JzZXJ2ZXIub2JzZXJ2ZSwgdW5kZWZpbmVkLCBbJ2Jsb2NraW5nJ10pO1xuICAgICAgICBXZWJSZXF1ZXN0Lm9uQmVmb3JlU2VuZEhlYWRlcnMuYWRkTGlzdGVuZXIoQ2xpcXpBdHRyYWNrLmh0dHBtb2RPYnNlcnZlci5vYnNlcnZlLCB1bmRlZmluZWQsIFsnYmxvY2tpbmcnXSk7XG4gICAgICAgIFdlYlJlcXVlc3Qub25IZWFkZXJzUmVjZWl2ZWQuYWRkTGlzdGVuZXIoQ2xpcXpBdHRyYWNrLmh0dHBSZXNwb25zZU9ic2VydmVyLm9ic2VydmUpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2suZGlzYWJsZWRfc2l0ZXMgPSBuZXcgU2V0KEpTT04ucGFyc2UodXRpbHMuZ2V0UHJlZihDbGlxekF0dHJhY2suRElTQUJMRURfU0lURVNfUFJFRiwgXCJbXVwiKSkpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIENsaXF6QXR0cmFjay5kaXNhYmxlZF9zaXRlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5vdGU6IGlmIGEgMCB2YWx1ZSB3ZXJlIHRvIGJlIHNhdmVkLCB0aGUgZGVmYXVsdCB3b3VsZCBiZSBwcmVmZXJyZWQuIFRoaXMgaXMgb2sgYmVjYXVzZSB0aGVzZSBvcHRpb25zXG4gICAgICAgIC8vIGNhbm5vdCBoYXZlIDAgdmFsdWVzLlxuICAgICAgICBDbGlxekF0dHJhY2suc2FmZWtleVZhbHVlc1RocmVzaG9sZCA9IHBhcnNlSW50KHBlcnNpc3QuZ2V0VmFsdWUoJ3NhZmVrZXlWYWx1ZXNUaHJlc2hvbGQnKSkgfHwgNDtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLnNob3J0VG9rZW5MZW5ndGggPSBwYXJzZUludChwZXJzaXN0LmdldFZhbHVlKCdzaG9ydFRva2VuTGVuZ3RoJykpIHx8IDg7XG5cbiAgICAgICAgQ2xpcXpBdHRyYWNrLnBsYWNlSG9sZGVyID0gcGVyc2lzdC5nZXRWYWx1ZSgncGxhY2VIb2xkZXInLCBDbGlxekF0dHJhY2sucGxhY2VIb2xkZXIpO1xuICAgICAgICBDbGlxekF0dHJhY2suY2xpcXpIZWFkZXIgPSBwZXJzaXN0LmdldFZhbHVlKCdjbGlxekhlYWRlcicsIENsaXF6QXR0cmFjay5jbGlxekhlYWRlcik7XG5cbiAgICAgICAgQ2xpcXpBdHRyYWNrLnRyYWNrZXJQcm94eSA9IG5ldyBUcmFja2VyUHJveHkoKTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLnRyYWNrZXJQcm94eS5pbml0KCk7XG4gICAgfSxcbiAgICAvKiogUGVyLXdpbmRvdyBtb2R1bGUgaW5pdGlhbGlzYXRpb25cbiAgICAgKi9cbiAgICBpbml0V2luZG93OiBmdW5jdGlvbih3aW5kb3cpIHtcbiAgICAgICAgaWYgKENsaXF6QXR0cmFjay5nZXRCcm93c2VyTWFqb3JWZXJzaW9uKCkgPCBDbGlxekF0dHJhY2suTUlOX0JST1dTRVJfVkVSU0lPTikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIExvYWQgbGlzdGVybmVyczpcbiAgICAgICAgd2luZG93LkNMSVFaLkNvcmUudXJsYmFyLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25VcmxiYXJGb2N1cyk7XG5cbiAgICAgICAgQ2xpcXpBdHRyYWNrLmdldFByaXZhdGVWYWx1ZXMod2luZG93KTtcbiAgICB9LFxuICAgIHVubG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGRvbid0IG5lZWQgdG8gdW5sb2FkIGlmIGRpc2FibGVkXG4gICAgICAgIGlmIChDbGlxekF0dHJhY2suZ2V0QnJvd3Nlck1ham9yVmVyc2lvbigpIDwgQ2xpcXpBdHRyYWNrLk1JTl9CUk9XU0VSX1ZFUlNJT04pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvL0NoZWNrIGlzIGFjdGl2ZSB1c2FnZSwgd2FzIHNlbnRcblxuICAgICAgICAvLyBmb3JjZSBzZW5kIHRhYiB0ZWxlbWV0cnkgZGF0YVxuICAgICAgICBDbGlxekF0dHJhY2sudHBfZXZlbnRzLmNvbW1pdCh0cnVlLCB0cnVlKTtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5wdXNoKHRydWUpO1xuXG4gICAgICAgIENsaXF6QXR0cmFjay5ibG9ja0xvZy5kZXN0cm95KCk7XG4gICAgICAgIENsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QuZGVzdHJveSgpO1xuXG4gICAgICAgIGJyb3dzZXIuZm9yRWFjaFdpbmRvdyhDbGlxekF0dHJhY2sudW5sb2FkV2luZG93KTtcblxuICAgICAgICBXZWJSZXF1ZXN0Lm9uQmVmb3JlUmVxdWVzdC5yZW1vdmVMaXN0ZW5lcihDbGlxekF0dHJhY2suaHR0cG9wZW5PYnNlcnZlci5vYnNlcnZlKTtcbiAgICAgICAgV2ViUmVxdWVzdC5vbkJlZm9yZVNlbmRIZWFkZXJzLnJlbW92ZUxpc3RlbmVyKENsaXF6QXR0cmFjay5odHRwbW9kT2JzZXJ2ZXIub2JzZXJ2ZSk7XG4gICAgICAgIFdlYlJlcXVlc3Qub25IZWFkZXJzUmVjZWl2ZWQucmVtb3ZlTGlzdGVuZXIoQ2xpcXpBdHRyYWNrLmh0dHBSZXNwb25zZU9ic2VydmVyLm9ic2VydmUpO1xuXG4gICAgICAgIHBhY2VtYWtlci5zdG9wKCk7XG5cbiAgICAgICAgQ2xpcXpBdHRyYWNrLnRyYWNrZXJQcm94eS5kZXN0cm95KCk7XG5cbiAgICAgICAgdGhpcy5fdHJhY2tlckxvYWRlci5zdG9wKCk7XG4gICAgICAgIHRoaXMuX2Nvb2tpZVdoaXRlbGlzdExvYWRlci5zdG9wKCk7XG5cbiAgICAgICAgZXZlbnRzLnVuX3N1YihcImF0dHJhY2s6c2FmZWtleXNfdXBkYXRlZFwiKTtcbiAgICB9LFxuICAgIHVubG9hZFdpbmRvdzogZnVuY3Rpb24od2luZG93KSB7XG4gICAgICAgIGlmICh3aW5kb3cuQ0xJUVopIHtcbiAgICAgICAgICAgIHdpbmRvdy5DTElRWi5Db3JlLnVybGJhci5yZW1vdmVFdmVudExpc3RlbmVyKCdmb2N1cycsIG9uVXJsYmFyRm9jdXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBjaGVja0luc3RhbGxlZEFkZG9uczogZnVuY3Rpb24oKSB7XG4gICAgICAgIFN5c3RlbS5pbXBvcnQoJ3BsYXRmb3JtL2FudGl0cmFja2luZy9hZGRvbi1jaGVjaycpLnRoZW4oIChhZGRvbnMpID0+IHtcbiAgICAgICAgICAgIENsaXF6QXR0cmFjay5zaW1pbGFyQWRkb24gPSBhZGRvbnMuY2hlY2tJbnN0YWxsZWRBZGRvbnMoKTtcbiAgICAgICAgfSkuY2F0Y2goIChlKSA9PiB7XG4gICAgICAgICAgICB1dGlscy5sb2coXCJFcnJvciBsb2FkaW5nIGFkZG9uIGNoZWNrZXJcIiwgXCJhdHRyYWNrXCIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGdlbmVyYXRlQXR0cmFja1BheWxvYWQ6IGZ1bmN0aW9uKGRhdGEsIHRzKSB7XG4gICAgICAgIGNvbnN0IGV4dHJhQXR0cnMgPSBDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmdldFZlcnNpb24oKTtcbiAgICAgICAgZXh0cmFBdHRycy52ZXIgPSBDbGlxekF0dHJhY2suVkVSU0lPTjtcbiAgICAgICAgdHMgPSB0cyB8fCBkYXRldGltZS5nZXRIb3VyVGltZXN0YW1wKCk7XG4gICAgICAgIHJldHVybiBnZW5lcmF0ZVBheWxvYWQoZGF0YSwgdHMsIGZhbHNlLCBleHRyYUF0dHJzKTtcbiAgICB9LFxuICAgIHNlbmRUb2tlbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBzZW5kIHRva2VucyBldmVyeSA1IG1pbnV0ZXNcbiAgICAgICAgbGV0IGRhdGEgPSB7fSxcbiAgICAgICAgICAgIGhvdXIgPSBkYXRldGltZS5nZXRUaW1lKCksXG4gICAgICAgICAgICBsaW1pdCA9IE9iamVjdC5rZXlzKENsaXF6QXR0cmFjay50b2tlbnMpLmxlbmd0aCAvIDEyO1xuXG4gICAgICAgIC8vIHNvcnQgdHJhY2tlciBrZXlzIGJ5IGxhc3RTZW50LCBpLmUuIHNlbmQgb2xkZXN0IGRhdGEgZmlyc3RcbiAgICAgICAgbGV0IHNvcnRlZFRyYWNrZXJzID0gT2JqZWN0LmtleXMoQ2xpcXpBdHRyYWNrLnRva2Vucykuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KENsaXF6QXR0cmFjay50b2tlbnNbYV0ubGFzdFNlbnQgfHwgMCkgLSBwYXJzZUludChDbGlxekF0dHJhY2sudG9rZW5zW2JdLmxhc3RTZW50IHx8IDApXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZvciAobGV0IGkgaW4gc29ydGVkVHJhY2tlcnMpIHtcbiAgICAgICAgICAgIGxldCB0cmFja2VyID0gc29ydGVkVHJhY2tlcnNbaV07XG5cbiAgICAgICAgICAgIGlmIChsaW1pdCA+IDAgJiYgT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoID4gbGltaXQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHRva2VuRGF0YSA9IENsaXF6QXR0cmFjay50b2tlbnNbdHJhY2tlcl07XG4gICAgICAgICAgICBpZiAoISh0b2tlbkRhdGEubGFzdFNlbnQpIHx8IHRva2VuRGF0YS5sYXN0U2VudCA8IGhvdXIpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUodG9rZW5EYXRhLmxhc3RTZW50KTtcbiAgICAgICAgICAgICAgICBkYXRhW3RyYWNrZXJdID0gYW5vbnltaXplVHJhY2tlclRva2Vucyh0b2tlbkRhdGEpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZShDbGlxekF0dHJhY2sudG9rZW5zW3RyYWNrZXJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhkYXRhKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBjb21wcmVzcyA9IGNvbXByZXNzaW9uQXZhaWxhYmxlKCk7XG5cbiAgICAgICAgICAgIHNwbGl0VGVsZW1ldHJ5RGF0YShkYXRhLCAyMDAwMCkubWFwKChkKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF5bCA9IENsaXF6QXR0cmFjay5nZW5lcmF0ZUF0dHJhY2tQYXlsb2FkKGQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IHtcbiAgICAgICAgICAgICAgICAgICAgJ3R5cGUnOiB0ZWxlbWV0cnkubXNnVHlwZSxcbiAgICAgICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdhdHRyYWNrLnRva2VucycsXG4gICAgICAgICAgICAgICAgICAgICdwYXlsb2FkJzogcGF5bFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKCBjb21wcmVzcyApIHtcbiAgICAgICAgICAgICAgICAgICAgbXNnLmNvbXByZXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtc2cucGF5bG9hZCA9IGNvbXByZXNzSlNPTlRvQmFzZTY0KHBheWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0ZWxlbWV0cnkudGVsZW1ldHJ5KG1zZyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBDbGlxekF0dHJhY2suX3Rva2Vucy5zZXREaXJ0eSgpO1xuICAgIH0sXG4gICAgaG91ckNoYW5nZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyB0cmlnZ2VyIG90aGVyIGhvdXJseSBldmVudHNcbiAgICAgICAgZXZlbnRzLnB1YihcImF0dHJhY2s6aG91cl9jaGFuZ2VkXCIpO1xuICAgIH0sXG4gICAgdXBkYXRlQ29uZmlnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRvZGF5ID0gZGF0ZXRpbWUuZ2V0VGltZSgpLnN1YnN0cmluZygwLCAxMCk7XG4gICAgICAgIHV0aWxzLmh0dHBHZXQoQ2xpcXpBdHRyYWNrLlZFUlNJT05DSEVDS19VUkwgK1wiP1wiKyB0b2RheSwgZnVuY3Rpb24ocmVxKSB7XG4gICAgICAgICAgICAvLyBvbiBsb2FkXG4gICAgICAgICAgICB2YXIgdmVyc2lvbmNoZWNrID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAvLyBjb25maWcgaW4gdmVyc2lvbmNoZWNrXG4gICAgICAgICAgICBpZiAodmVyc2lvbmNoZWNrLnBsYWNlSG9sZGVyKSB7XG4gICAgICAgICAgICAgICAgcGVyc2lzdC5zZXRWYWx1ZSgncGxhY2VIb2xkZXInLCB2ZXJzaW9uY2hlY2sucGxhY2VIb2xkZXIpO1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5wbGFjZUhvbGRlciA9IHZlcnNpb25jaGVjay5wbGFjZUhvbGRlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHZlcnNpb25jaGVjay5zaG9ydFRva2VuTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVyc2lzdC5zZXRWYWx1ZSgnc2hvcnRUb2tlbkxlbmd0aCcsIHZlcnNpb25jaGVjay5zaG9ydFRva2VuTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suc2hvcnRUb2tlbkxlbmd0aCA9IHBhcnNlSW50KHZlcnNpb25jaGVjay5zaG9ydFRva2VuTGVuZ3RoKSB8fCBDbGlxekF0dHJhY2suc2hvcnRUb2tlbkxlbmd0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHZlcnNpb25jaGVjay5zYWZla2V5VmFsdWVzVGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgcGVyc2lzdC5zZXRWYWx1ZSgnc2FmZWtleVZhbHVlc1RocmVzaG9sZCcsIHZlcnNpb25jaGVjay5zYWZla2V5VmFsdWVzVGhyZXNob2xkKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suc2FmZWtleVZhbHVlc1RocmVzaG9sZCA9IHBhcnNlSW50KHZlcnNpb25jaGVjay5zYWZla2V5VmFsdWVzVGhyZXNob2xkKSB8fCBDbGlxekF0dHJhY2suc2FmZWtleVZhbHVlc1RocmVzaG9sZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHZlcnNpb25jaGVjay5jbGlxekhlYWRlcikge1xuICAgICAgICAgICAgICAgIHBlcnNpc3Quc2V0VmFsdWUoJ2NsaXF6SGVhZGVyJywgdmVyc2lvbmNoZWNrLmNsaXF6SGVhZGVyKTtcbiAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2suY2xpcXpIZWFkZXIgPSB2ZXJzaW9uY2hlY2suY2xpcXpIZWFkZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZpcmUgZXZlbnRzIGZvciBsaXN0IHVwZGF0ZVxuICAgICAgICAgICAgZXZlbnRzLnB1YihcImF0dHJhY2s6dXBkYXRlZF9jb25maWdcIiwgdmVyc2lvbmNoZWNrKTtcbiAgICAgICAgfSwgdXRpbHMubG9nLCAxMDAwMCk7XG4gICAgfSxcbiAgICBwcnVuZVJlcXVlc3RLZXlWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBkYXkgPSBkYXRldGltZS5uZXdVVENEYXRlKCk7XG4gICAgICAgIGRheS5zZXREYXRlKGRheS5nZXREYXRlKCkgLSBDbGlxekF0dHJhY2suc2FmZUtleUV4cGlyZSk7XG4gICAgICAgIHZhciBkYXlDdXRvZmYgID0gZGF0ZXRpbWUuZGF0ZVN0cmluZyhkYXkpO1xuICAgICAgICBmb3IgKHZhciBzIGluIENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWUpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdG9rIGluIENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc11ba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXVtrZXldW3Rva10gPCBkYXlDdXRvZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdW2tleV1bdG9rXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMoQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXVtrZXldKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXVtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIENsaXF6QXR0cmFjay5fcmVxdWVzdEtleVZhbHVlLnNldERpcnR5KCk7XG4gICAgICAgIENsaXF6QXR0cmFjay5fcmVxdWVzdEtleVZhbHVlLnNhdmUoKTtcbiAgICB9LFxuICAgIGxvYWRCbG9ja1J1bGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgQ2xpcXpBdHRyYWNrLnFzQmxvY2tSdWxlID0gW107XG4gICAgICAgIHV0aWxzLmxvYWRSZXNvdXJjZShDbGlxekF0dHJhY2suVVJMX0JMT0NLX1JVTEVTLCBmdW5jdGlvbihyZXEpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnFzQmxvY2tSdWxlID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2UpO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnFzQmxvY2tSdWxlID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgaXNJbldoaXRlbGlzdDogZnVuY3Rpb24oZG9tYWluKSB7XG4gICAgICAgIGlmKCFDbGlxekF0dHJhY2sud2hpdGVsaXN0KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBrZXlzID0gQ2xpcXpBdHRyYWNrLndoaXRlbGlzdDtcbiAgICAgICAgZm9yKHZhciBpPTA7aTxrZXlzLmxlbmd0aDtpKyspIHtcbiAgICAgICAgICAgIHZhciBpbmQgPSBkb21haW4uaW5kZXhPZihrZXlzW2ldKTtcbiAgICAgICAgICAgIGlmIChpbmQ+PTApIHtcbiAgICAgICAgICAgICAgICBpZiAoKGluZCtrZXlzW2ldLmxlbmd0aCkgPT0gZG9tYWluLmxlbmd0aCkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgY2hlY2tUb2tlbnM6IGZ1bmN0aW9uKHVybF9wYXJ0cywgc291cmNlX3VybCwgY29va2lldmFsdWUsIHN0YXRzLCBzb3VyY2VfdXJsX3BhcnRzKSB7XG4gICAgICAgIC8vIGJhZCB0b2tlbnMgd2lsbCBzdGlsbCBiZSByZXR1cm5lZCBpbiB0aGUgc2FtZSBmb3JtYXRcblxuICAgICAgICB2YXIgcyA9IGdldEdlbmVyYWxEb21haW4odXJsX3BhcnRzLmhvc3RuYW1lKTtcbiAgICAgICAgcyA9IG1kNShzKS5zdWJzdHIoMCwgMTYpO1xuICAgICAgICAvLyBJZiBpdCdzIGEgcmFyZSAzcmQgcGFydHksIHdlIGRvbid0IGRvIHRoZSByZXN0XG4gICAgICAgIGlmICghQ2xpcXpBdHRyYWNrLnFzX3doaXRlbGlzdC5pc1RyYWNrZXJEb21haW4ocykpIHJldHVybiBbXTtcblxuICAgICAgICB2YXIgc291cmNlRCA9IG1kNShzb3VyY2VfdXJsX3BhcnRzLmhvc3RuYW1lKS5zdWJzdHIoMCwgMTYpO1xuICAgICAgICB2YXIgdG9kYXkgPSBkYXRldGltZS5nZXRUaW1lKCkuc3Vic3RyKDAsIDgpO1xuXG4gICAgICAgIGlmICh1cmxfcGFydHNbJ3F1ZXJ5J10ubGVuZ3RoID09IDAgJiYgdXJsX3BhcnRzWydwYXJhbWV0ZXJzJ10ubGVuZ3RoID09IDApIHJldHVybiBbXTtcbiAgICAgICAgdmFyIHRvaztcblxuICAgICAgICB2YXIgYmFkVG9rZW5zID0gW107XG5cbiAgICAgICAgLy8gc3RhdHMga2V5c1xuICAgICAgICBbJ2Nvb2tpZScsICdwcml2YXRlJywgJ2Nvb2tpZV9iNjQnLCAncHJpdmF0ZV9iNjQnLCAnc2FmZWtleScsICd3aGl0ZWxpc3RlZCcsXG4gICAgICAgICAnY29va2llX25ld1Rva2VuJywgJ2Nvb2tpZV9jb3VudFRocmVzaG9sZCcsICdwcml2YXRlX25ld1Rva2VuJywgJ3ByaXZhdGVfY291bnRUaHJlc2hvbGQnLFxuICAgICAgICAgJ3Nob3J0X25vX2hhc2gnLCAnY29va2llX2I2NF9uZXdUb2tlbicsICdjb29raWVfYjY0X2NvdW50VGhyZXNob2xkJywgJ3ByaXZhdGVfYjY0X25ld1Rva2VuJyxcbiAgICAgICAgICdwcml2YXRlX2I2NF9jb3VudFRocmVzaG9sZCcsICdxc19uZXdUb2tlbicsICdxc19jb3VudFRocmVzaG9sZCcsIF0uZm9yRWFjaChmdW5jdGlvbihrKSB7c3RhdHNba10gPSAwO30pO1xuXG4gICAgICAgIHZhciBfY291bnRDaGVjayA9IGZ1bmN0aW9uKHRvaykge1xuICAgICAgICAgICAgLy8gZm9yIHRva2VuIGxlbmd0aCA8IDEyIGFuZCBtYXkgYmUgbm90IGEgaGFzaCwgd2UgbGV0IGl0IHBhc3NcbiAgICAgICAgICAgIGlmICh0b2subGVuZ3RoIDwgMTIgJiYgIUNsaXF6QXR0cmFjay5oYXNoUHJvYi5pc0hhc2godG9rKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0b2tlbkRvbWFpblxuICAgICAgICAgICAgdG9rID0gbWQ1KHRvayk7XG4gICAgICAgICAgICBDbGlxekF0dHJhY2suYmxvY2tMb2cudG9rZW5Eb21haW4uYWRkVG9rZW5PbkZpcnN0UGFydHkodG9rLCBzb3VyY2VEKTtcbiAgICAgICAgICAgIHJldHVybiBDbGlxekF0dHJhY2suYmxvY2tMb2cudG9rZW5Eb21haW4uZ2V0TkZpcnN0UGFydGllc0ZvclRva2VuKHRvayk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIF9pbmNyU3RhdHMgPSBmdW5jdGlvbihjYywgcHJlZml4LCB0b2ssIGtleSwgdmFsKSB7XG4gICAgICAgICAgICBpZiAoY2MgPT0gMClcbiAgICAgICAgICAgICAgICBzdGF0c1snc2hvcnRfbm9faGFzaCddKys7XG4gICAgICAgICAgICBlbHNlIGlmIChjYyA8IENsaXF6QXR0cmFjay50b2tlbkRvbWFpbkNvdW50VGhyZXNob2xkKVxuICAgICAgICAgICAgICAgIHN0YXRzW3ByZWZpeCsnX25ld1Rva2VuJ10rKztcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIF9hZGRCbG9ja0xvZyhzLCBrZXksIHZhbCwgcHJlZml4KTtcbiAgICAgICAgICAgICAgICBiYWRUb2tlbnMucHVzaCh2YWwpO1xuICAgICAgICAgICAgICAgIGlmIChjYyA9PSBDbGlxekF0dHJhY2sudG9rZW5Eb21haW5Db3VudFRocmVzaG9sZClcbiAgICAgICAgICAgICAgICAgICAgc3RhdHNbcHJlZml4ICsgJ19jb3VudFRocmVzaG9sZCddKys7XG4gICAgICAgICAgICAgICAgc3RhdHNbcHJlZml4XSsrO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBfYWRkQmxvY2tMb2cgPSAocywga2V5LCB2YWwsIHByZWZpeCkgPT4ge1xuICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrTG9nLmJsb2NrTG9nLmFkZChzb3VyY2VfdXJsLCBzLCBrZXksIHZhbCwgcHJlZml4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfY2hlY2tUb2tlbnMgPSBmdW5jdGlvbihrZXksIHZhbCkge1xuICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLmJsb2NrTG9nLmluY3JlbWVudENoZWNrZWRUb2tlbnMoKTtcblxuICAgICAgICAgICAgdmFyIHRvayA9IGRVUklDKHZhbCk7XG4gICAgICAgICAgICB3aGlsZSAodG9rICE9IGRVUklDKHRvaykpIHtcbiAgICAgICAgICAgICAgICB0b2sgPSBkVVJJQyh0b2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodG9rLmxlbmd0aCA8IENsaXF6QXR0cmFjay5zaG9ydFRva2VuTGVuZ3RoIHx8IHNvdXJjZV91cmwuaW5kZXhPZih0b2spID4gLTEpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gQmFkIHZhbHVlcyAoY29va2llcylcbiAgICAgICAgICAgIGZvciAodmFyIGMgaW4gY29va2lldmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoKHRvay5pbmRleE9mKGMpID4gLTEgJiYgYy5sZW5ndGggPj0gQ2xpcXpBdHRyYWNrLnNob3J0VG9rZW5MZW5ndGgpIHx8IGMuaW5kZXhPZih0b2spID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5kZWJ1ZykgdXRpbHMubG9nKCdzYW1lIHZhbHVlIGFzIGNvb2tpZSAnICsgdmFsLCAndG9raycpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2MgPSBfY291bnRDaGVjayh0b2spO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyAhPSB0b2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNjID0gTWF0aC5tYXgoY2MsIF9jb3VudENoZWNrKGMpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoX2luY3JTdGF0cyhjYywgJ2Nvb2tpZScsIHRvaywga2V5LCB2YWwpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHJpdmF0ZSB2YWx1ZSAoZnJvbSBqcyBmdW5jdGlvbiByZXR1cm5zKVxuICAgICAgICAgICAgZm9yICh2YXIgYyBpbiBDbGlxekF0dHJhY2sucHJpdmF0ZVZhbHVlcykge1xuICAgICAgICAgICAgICAgIGlmICgodG9rLmluZGV4T2YoYykgPiAtMSAmJiBjLmxlbmd0aCA+PSBDbGlxekF0dHJhY2suc2hvcnRUb2tlbkxlbmd0aCkgfHwgYy5pbmRleE9mKHRvaykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoQ2xpcXpBdHRyYWNrLmRlYnVnKSB1dGlscy5sb2coJ3NhbWUgcHJpdmF0ZSB2YWx1ZXMgJyArIHZhbCwgJ3Rva2snKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNjID0gX2NvdW50Q2hlY2sodG9rKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgIT0gdG9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYyA9IE1hdGgubWF4KGNjLCBfY291bnRDaGVjayhjKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKF9pbmNyU3RhdHMoY2MsICdwcml2YXRlJywgdG9rLCBrZXksIHZhbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGI2NCA9IG51bGw7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGI2NCA9IGF0b2IodG9rKTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGI2NCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYyBpbiBjb29raWV2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGI2NC5pbmRleE9mKGMpID4gLTEgJiYgYy5sZW5ndGggPj0gQ2xpcXpBdHRyYWNrLnNob3J0VG9rZW5MZW5ndGgpIHx8IGMuaW5kZXhPZihiNjQpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZygnc2FtZSB2YWx1ZSBhcyBjb29raWUgJyArIGI2NCwgJ3Rva2stYjY0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2MgPSBfY291bnRDaGVjayh0b2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGMgIT0gdG9rKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2MgPSBNYXRoLm1heChjYywgX2NvdW50Q2hlY2soYykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9pbmNyU3RhdHMoY2MsICdjb29raWVfYjY0JywgdG9rLCBrZXksIHZhbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGMgaW4gQ2xpcXpBdHRyYWNrLnByaXZhdGVWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGI2NC5pbmRleE9mKGMpID4gLTEgJiYgYy5sZW5ndGggPj0gQ2xpcXpBdHRyYWNrLnNob3J0VG9rZW5MZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2suZGVidWcpIHV0aWxzLmxvZygnc2FtZSBwcml2YXRlIHZhbHVlcyAnICsgYjY0LCAndG9ray1iNjQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYyA9IF9jb3VudENoZWNrKHRvayk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYyAhPSB0b2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYyA9IE1hdGgubWF4KGNjLCBfY291bnRDaGVjayhjKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2luY3JTdGF0cyhjYywgJ3ByaXZhdGVfYjY0JywgdG9rLCBrZXksIHZhbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIC8vIEdvb2Qga2V5cy5cbiAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmlzU2FmZUtleShzLCBtZDUoa2V5KSkpIHtcbiAgICAgICAgICAgICAgICBzdGF0c1snc2FmZWtleSddKys7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc291cmNlX3VybC5pbmRleE9mKHRvaykgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUNsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QuaXNTYWZlVG9rZW4ocywgbWQ1KHRvaykpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYyA9IF9jb3VudENoZWNrKHRvayk7XG4gICAgICAgICAgICAgICAgICAgIF9pbmNyU3RhdHMoY2MsICdxcycsIHRvaywga2V5LCB2YWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICBzdGF0c1snd2hpdGVsaXN0ZWQnXSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHVybF9wYXJ0cy5nZXRLZXlWYWx1ZXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChrdikge1xuICAgICAgICAgIF9jaGVja1Rva2Vucyhrdi5rLCBrdi52KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGJsb2NrZWRUb2tlblxuICAgICAgICBDbGlxekF0dHJhY2suYmxvY2tMb2cuaW5jcmVtZW50QmxvY2tlZFRva2VucyhiYWRUb2tlbnMubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJhZFRva2VucztcbiAgICB9LFxuICAgIGV4YW1pbmVUb2tlbnM6IGZ1bmN0aW9uKHVybF9wYXJ0cykge1xuICAgICAgICB2YXIgZGF5ID0gZGF0ZXRpbWUubmV3VVRDRGF0ZSgpO1xuICAgICAgICB2YXIgdG9kYXkgPSBkYXRldGltZS5kYXRlU3RyaW5nKGRheSk7XG4gICAgICAgIC8vIHNhdmUgYXBwZWFyZWQgdG9rZW5zIHdpdGggZmllbGQgbmFtZVxuICAgICAgICAvLyBtYXJrIGZpZWxkIG5hbWUgYXMgXCJzYWZlXCIgaWYgZGlmZmVyZW50IHZhbHVlcyBhcHBlYXJzXG4gICAgICAgIHZhciBzID0gZ2V0R2VuZXJhbERvbWFpbih1cmxfcGFydHMuaG9zdG5hbWUpO1xuICAgICAgICBzID0gbWQ1KHMpLnN1YnN0cigwLCAxNik7XG4gICAgICAgIHVybF9wYXJ0cy5nZXRLZXlWYWx1ZXNNRDUoKS5maWx0ZXIoZnVuY3Rpb24gKGt2KSB7XG4gICAgICAgICAgcmV0dXJuIGt2LnZfbGVuID49IENsaXF6QXR0cmFjay5zaG9ydFRva2VuTGVuZ3RoO1xuICAgICAgICB9KS5mb3JFYWNoKGZ1bmN0aW9uIChrdikge1xuICAgICAgICAgICAgdmFyIGtleSA9IGt2LmssXG4gICAgICAgICAgICAgICAgdG9rID0ga3YudjtcbiAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sucXNfd2hpdGVsaXN0LmlzU2FmZUtleShzLCBrZXkpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdID09IG51bGwpXG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXSA9IHt9O1xuICAgICAgICAgICAgaWYgKENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc11ba2V5XSA9PSBudWxsKVxuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay5yZXF1ZXN0S2V5VmFsdWVbc11ba2V5XSA9IHt9O1xuXG4gICAgICAgICAgICBDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdW2tleV1bdG9rXSA9IHRvZGF5O1xuICAgICAgICAgICAgLy8gc2VlIGF0IGxlYXN0IDMgZGlmZmVyZW50IHZhbHVlIHVudGlsIGl0J3Mgc2FmZVxuICAgICAgICAgICAgbGV0IHZhbHVlQ291bnQgPSBPYmplY3Qua2V5cyhDbGlxekF0dHJhY2sucmVxdWVzdEtleVZhbHVlW3NdW2tleV0pLmxlbmd0aFxuICAgICAgICAgICAgaWYgKCB2YWx1ZUNvdW50ID4gQ2xpcXpBdHRyYWNrLnNhZmVrZXlWYWx1ZXNUaHJlc2hvbGQgKSB7XG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnFzX3doaXRlbGlzdC5hZGRTYWZlS2V5KHMsIGtleSwgdmFsdWVDb3VudCk7XG4gICAgICAgICAgICAgICAgLy8ga2VlcCB0aGUgbGFzdCBzZWVuIHRva2VuXG4gICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnJlcXVlc3RLZXlWYWx1ZVtzXVtrZXldID0ge3RvazogdG9kYXl9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLl9yZXF1ZXN0S2V5VmFsdWUuc2V0RGlydHkoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBleHRyYWN0S2V5VG9rZW5zOiBmdW5jdGlvbih1cmxfcGFydHMsIHJlZnN0ciwgaXNQcml2YXRlLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBrZXlzLCB2YWx1ZSBvZiBxdWVyeSBzdHJpbmdzIHdpbGwgYmUgc2VudCBpbiBtZDVcbiAgICAgICAgLy8gdXJsLCByZWZzdHIgd2lsbCBiZSBzZW50IGluIGhhbGYgb2YgbWQ1XG4gICAgICAgIGlmIChpc1ByaXZhdGUpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleVRva2VucyA9IHVybF9wYXJ0cy5nZXRLZXlWYWx1ZXNNRDUoKTtcbiAgICAgICAgaWYgKGtleVRva2Vucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgcyA9IG1kNSh1cmxfcGFydHMuaG9zdG5hbWUpLnN1YnN0cigwLCAxNik7XG4gICAgICAgICAgICByZWZzdHIgPSBtZDUocmVmc3RyKS5zdWJzdHIoMCwgMTYpO1xuICAgICAgICAgICAgY2FsbGJhY2socywga2V5VG9rZW5zLCByZWZzdHIsIGlzUHJpdmF0ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNhdmVLZXlUb2tlbnM6IGZ1bmN0aW9uKHMsIGtleVRva2VucywgciwgaXNQcml2YXRlKSB7XG4gICAgICAgIGlmIChpc1ByaXZhdGUpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gYW55dGhpbmcgaGVyZSBzaG91bGQgYWxyZWFkeSBiZSBoYXNoXG4gICAgICAgIGlmIChDbGlxekF0dHJhY2sudG9rZW5zW3NdID09IG51bGwpIENsaXF6QXR0cmFjay50b2tlbnNbc10gPSB7bGFzdFNlbnQ6IGRhdGV0aW1lLmdldFRpbWUoKX07XG4gICAgICAgIGlmIChDbGlxekF0dHJhY2sudG9rZW5zW3NdW3JdID09IG51bGwpIENsaXF6QXR0cmFjay50b2tlbnNbc11bcl0gPSB7J2MnOiAwLCAna3YnOiB7fX07XG4gICAgICAgIENsaXF6QXR0cmFjay50b2tlbnNbc11bcl1bJ2MnXSA9ICAoQ2xpcXpBdHRyYWNrLnRva2Vuc1tzXVtyXVsnYyddIHx8IDApICsgMTtcbiAgICAgICAgZm9yICh2YXIga3Ygb2Yga2V5VG9rZW5zKSB7XG4gICAgICAgICAgICB2YXIgdG9rID0ga3YudixcbiAgICAgICAgICAgICAgICBrID0ga3YuaztcbiAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sudG9rZW5zW3NdW3JdWydrdiddW2tdID09IG51bGwpIENsaXF6QXR0cmFjay50b2tlbnNbc11bcl1bJ2t2J11ba10gPSB7fTtcbiAgICAgICAgICAgIGlmIChDbGlxekF0dHJhY2sudG9rZW5zW3NdW3JdWydrdiddW2tdW3Rva10gPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIENsaXF6QXR0cmFjay50b2tlbnNbc11bcl1bJ2t2J11ba11bdG9rXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgYzogMCxcbiAgICAgICAgICAgICAgICAgICAga19sZW46IGt2LmtfbGVuLFxuICAgICAgICAgICAgICAgICAgICB2X2xlbjoga3Yudl9sZW5cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRva2Vuc1tzXVtyXVsna3YnXVtrXVt0b2tdLmMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBDbGlxekF0dHJhY2suX3Rva2Vucy5zZXREaXJ0eSgpO1xuICAgIH0sXG4gICAgbGlua3NSZWNvcmRlZDoge30sIC8vIGNhY2hlIHdoZW4gd2UgcmVjb3JkZWQgbGlua3MgZm9yIGVhY2ggdXJsXG4gICAgcmVjb3JkTGlua3NGb3JVUkwodXJsKSB7XG4gICAgICBpZiAoQ2xpcXpBdHRyYWNrLmxvYWRlZFRhYnNbdXJsXSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgY29uc3QgbGFzdFF1ZXJ5ID0gQ2xpcXpBdHRyYWNrLmxpbmtzUmVjb3JkZWRbdXJsXSB8fCAwO1xuICAgICAgaWYgKG5vdyAtIGxhc3RRdWVyeSA8IDEwMDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBDbGlxekF0dHJhY2subGlua3NSZWNvcmRlZFt1cmxdID0gbm93O1xuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtcblxuICAgICAgICBjb3JlLmdldENvb2tpZSh1cmwpLnRoZW4oXG4gICAgICAgICAgY29va2llID0+IENsaXF6QXR0cmFjay5jb29raWVzRnJvbURvbVt1cmxdID0gY29va2llXG4gICAgICAgICksXG5cbiAgICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgIGNvcmUucXVlcnlIVE1MKHVybCwgJ2FbaHJlZl0nLCAnaHJlZicpLFxuICAgICAgICAgIGNvcmUucXVlcnlIVE1MKHVybCwgJ2xpbmtbaHJlZl0nLCAnaHJlZicpLFxuICAgICAgICAgIGNvcmUucXVlcnlIVE1MKHVybCwgJ3NjcmlwdFtzcmNdJywgJ3NyYycpLnRoZW4oZnVuY3Rpb24gKGhyZWZzKSB7XG4gICAgICAgICAgICByZXR1cm4gaHJlZnMuZmlsdGVyKCBocmVmID0+IGhyZWYuaW5kZXhPZignaHR0cCcpID09PSAwICk7XG4gICAgICAgICAgfSksXG4gICAgICAgIF0pLnRoZW4oZnVuY3Rpb24gKHJlZmxpbmtzKSB7XG4gICAgICAgICAgdmFyIGhyZWZTZXQgPSByZWZsaW5rcy5yZWR1Y2UoKGhyZWZTZXQsIGhyZWZzKSA9PiB7XG4gICAgICAgICAgICBocmVmcy5mb3JFYWNoKCBocmVmID0+IGhyZWZTZXRbaHJlZl0gPSB0cnVlICk7XG4gICAgICAgICAgICByZXR1cm4gaHJlZlNldDtcbiAgICAgICAgICB9LCB7fSk7XG5cbiAgICAgICAgICBDbGlxekF0dHJhY2subGlua3NGcm9tRG9tW3VybF0gPSBocmVmU2V0O1xuICAgICAgICB9KVxuXG4gICAgICBdKTtcbiAgICB9LFxuICAgIGNsZWFyRG9tTGlua3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICBmb3IgKHZhciB1cmwgaW4gQ2xpcXpBdHRyYWNrLmxpbmtzRnJvbURvbSkge1xuICAgICAgICAgICAgaWYgKCFDbGlxekF0dHJhY2suaXNUYWJVUkwodXJsKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBDbGlxekF0dHJhY2subGlua3NGcm9tRG9tW3VybF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIENsaXF6QXR0cmFjay5jb29raWVzRnJvbURvbVt1cmxdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBDbGlxekF0dHJhY2subG9hZGVkVGFic1t1cmxdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBpc1RhYlVSTDogZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIHZhciB3bSA9IENvbXBvbmVudHMuY2xhc3Nlc1tcIkBtb3ppbGxhLm9yZy9hcHBzaGVsbC93aW5kb3ctbWVkaWF0b3I7MVwiXVxuICAgICAgICAgICAgICAgIC5nZXRTZXJ2aWNlKENvbXBvbmVudHMuaW50ZXJmYWNlcy5uc0lXaW5kb3dNZWRpYXRvcik7XG4gICAgICAgIHZhciBicm93c2VyRW51bWVyYXRvciA9IHdtLmdldEVudW1lcmF0b3IoXCJuYXZpZ2F0b3I6YnJvd3NlclwiKTtcblxuICAgICAgICB3aGlsZSAoYnJvd3NlckVudW1lcmF0b3IuaGFzTW9yZUVsZW1lbnRzKCkpIHtcbiAgICAgICAgICAgIHZhciBicm93c2VyV2luID0gYnJvd3NlckVudW1lcmF0b3IuZ2V0TmV4dCgpO1xuICAgICAgICAgICAgdmFyIHRhYmJyb3dzZXIgPSBicm93c2VyV2luLmdCcm93c2VyO1xuXG4gICAgICAgICAgICB2YXIgbnVtVGFicyA9IHRhYmJyb3dzZXIuYnJvd3NlcnMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IG51bVRhYnM7IGluZGV4KyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEJyb3dzZXIgPSB0YWJicm93c2VyLmdldEJyb3dzZXJBdEluZGV4KGluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEJyb3dzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhYlVSTCA9IGN1cnJlbnRCcm93c2VyLmN1cnJlbnRVUkkuc3BlYztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVybCA9PSB0YWJVUkwgfHwgdXJsID09IHRhYlVSTC5zcGxpdCgnIycpWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICAvLyBMaXN0ZW5zIGZvciByZXF1ZXN0cyBpbml0aWF0ZWQgaW4gdGFicy5cbiAgICAvLyBBbGxvd3MgdXMgdG8gdHJhY2sgdGFiIHdpbmRvd0lEcyB0byB1cmxzLlxuICAgIHRhYl9saXN0ZW5lcjoge1xuICAgICAgICBfdGFic1N0YXR1czoge30sXG5cbiAgICAgICAgb25TdGF0ZUNoYW5nZTogZnVuY3Rpb24oZXZudCkge1xuICAgICAgICAgICAgbGV0IHt1cmxTcGVjLCBpc05ld1BhZ2UsIHdpbmRvd0lEfSA9IGV2bnQ7XG4gICAgICAgICAgICAvLyBjaGVjayBmbGFncyBmb3Igc3RhcnRlZCByZXF1ZXN0XG4gICAgICAgICAgICBpZiAoaXNOZXdQYWdlICYmIHVybFNwZWMgJiYgd2luZG93SUQgJiYgdXJsU3BlYy5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgICAgICAgICAvLyBhZGQgd2luZG93IC0+IHVybCBwYWlyIHRvIHRhYiBjYWNoZS5cbiAgICAgICAgICAgICAgICB0aGlzLl90YWJzU3RhdHVzW3dpbmRvd0lEXSA9IHVybFNwZWM7XG4gICAgICAgICAgICAgICAgdmFyIF9rZXkgPSB3aW5kb3dJRCArIFwiOlwiICsgdXJsU3BlYztcbiAgICAgICAgICAgICAgICBpZighKENsaXF6QXR0cmFjay50cmFja1JlbG9hZFtfa2V5XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRyYWNrUmVsb2FkW19rZXldID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdDIgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZHVyID0gKHQyIC0gIENsaXF6QXR0cmFjay50cmFja1JlbG9hZFtfa2V5XSkgLyAxMDAwO1xuICAgICAgICAgICAgICAgICAgICBpZihkdXIgPCAzMDAwMCAmJiBjb3VudFJlbG9hZCAmJiB3aW5kb3dJRCBpbiBDbGlxekF0dHJhY2sudHBfZXZlbnRzLl9hY3RpdmUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5fYWN0aXZlW3dpbmRvd0lEXVsncmEnXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBDbGlxekF0dHJhY2sucmVsb2FkV2hpdGVMaXN0W19rZXldID0gdDI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY291bnRSZWxvYWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBHZXQgYW4gYXJyYXkgb2Ygd2luZG93SURzIGZvciB0YWJzIHdoaWNoIGEgY3VycmVudGx5IG9uIHRoZSBnaXZlbiBVUkwuXG4gICAgICAgIGdldFRhYnNGb3JVUkw6IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICAgICAgdmFyIHRhYnMgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgd2luZG93SUQgaW4gdGhpcy5fdGFic1N0YXR1cykge1xuICAgICAgICAgICAgICAgIHZhciB0YWJVUkwgPSB0aGlzLl90YWJzU3RhdHVzW3dpbmRvd0lEXTtcbiAgICAgICAgICAgICAgICBpZiAodXJsID09IHRhYlVSTCB8fCB1cmwgPT0gdGFiVVJMLnNwbGl0KCcjJylbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGFicy5wdXNoKHdpbmRvd0lEKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGFicztcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhblRhYnNTdGF0dXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGZvciAobGV0IHRhYklkIG9mIE9iamVjdC5rZXlzKHRoaXMuX3RhYnNTdGF0dXMpKSB7XG4gICAgICAgICAgICBpZiAoISB0aGlzLmlzV2luZG93QWN0aXZlKHRhYklkKSApIHtcbiAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3RhYnNTdGF0dXNbdGFiSWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBpc1dpbmRvd0FjdGl2ZTogYnJvd3Nlci5pc1dpbmRvd0FjdGl2ZVxuXG4gICAgfSxcbiAgICAvKiogR2V0IGluZm8gYWJvdXQgdHJhY2tlcnMgYW5kIGJsb2NraW5nIGRvbmUgaW4gYSBzcGVjaWZpZWQgdGFiLlxuICAgICAqXG4gICAgICogIFJldHVybnMgYW4gb2JqZWN0IGRlc2NyaWJpbmcgYW50aS10cmFja2luZyBhY3Rpb25zIGZvciB0aGlzIHBhZ2UsIHdpdGgga2V5cyBhcyBmb2xsb3dzOlxuICAgICAqICAgIGNvb2tpZXM6ICdhbGxvd2VkJyBhbmQgJ2Jsb2NrZWQnIGNvdW50cy5cbiAgICAgKiAgICByZXF1ZXN0czogJ3NhZmUnIGFuZCAndW5zYWZlJyBjb3VudHMuICdVbnNhZmUnIG1lYW5zIHRoYXQgdW5zYWZlIGRhdGEgd2FzIHNlZW4gaW4gYSByZXF1ZXN0IHRvIGEgdHJhY2tlci5cbiAgICAgKiAgICB0cmFja2VyczogbW9yZSBkZXRhaWxlZCBpbmZvcm1hdGlvbiBhYm91dCBlYWNoIHRyYWNrZXIuIE9iamVjdCB3aXRoIGtleXMgYmVpbmcgdHJhY2tlciBkb21haW4gYW5kIHZhbHVlc1xuICAgICAqICAgICAgICBtb3JlIGRldGFpbGVkIGJsb2NraW5nIGRhdGEuXG4gICAgICovXG4gICAgZ2V0VGFiQmxvY2tpbmdJbmZvOiBmdW5jdGlvbih0YWJJZCwgdXJsKSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgIHRhYjogdGFiSWQsXG4gICAgICAgICAgaG9zdG5hbWU6ICcnLFxuICAgICAgICAgIHBhdGg6ICcnLFxuICAgICAgICAgIGNvb2tpZXM6IHthbGxvd2VkOiAwLCBibG9ja2VkOiAwfSxcbiAgICAgICAgICByZXF1ZXN0czoge3NhZmU6IDAsIHVuc2FmZTogMCwgYWRibG9jazogMH0sXG4gICAgICAgICAgdHJhY2tlcnM6IHt9LFxuICAgICAgICAgIGNvbXBhbmllczoge30sXG4gICAgICAgICAgcHM6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgLy8gaWdub3JlIHNwZWNpYWwgdGFic1xuICAgICAgaWYgKHVybCAmJiAodXJsLmluZGV4T2YoJ2Fib3V0JykgPT0gMCB8fCB1cmwuaW5kZXhPZignY2hyb21lJykgPT0gMCkpIHtcbiAgICAgICAgcmVzdWx0LmVycm9yID0gJ1NwZWNpYWwgdGFiJztcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cblxuICAgICAgaWYgKCEodGFiSWQgaW4gQ2xpcXpBdHRyYWNrLnRwX2V2ZW50cy5fYWN0aXZlKSkge1xuICAgICAgICAvLyBubyB0cCBldmVudCwgYnV0ICdhY3RpdmUnIHRhYiA9IG11c3QgcmVsb2FkIGZvciBkYXRhXG4gICAgICAgIC8vIG90aGVyd2lzZSAtPiBzeXN0ZW0gdGFiXG4gICAgICAgIGlmIChicm93c2VyLmlzV2luZG93QWN0aXZlKHRhYklkKSkge1xuICAgICAgICAgIHJlc3VsdC5yZWxvYWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5lcnJvciA9ICdObyBEYXRhJztcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cblxuICAgICAgdmFyIHRhYkRhdGEgPSBDbGlxekF0dHJhY2sudHBfZXZlbnRzLl9hY3RpdmVbdGFiSWRdLFxuICAgICAgICB0cmFja2VycyA9IE9iamVjdC5rZXlzKHRhYkRhdGEudHBzKS5maWx0ZXIoZnVuY3Rpb24oZG9tYWluKSB7XG4gICAgICAgICAgcmV0dXJuIENsaXF6QXR0cmFjay5xc193aGl0ZWxpc3QuaXNUcmFja2VyRG9tYWluKG1kNShnZXRHZW5lcmFsRG9tYWluKGRvbWFpbikpLnN1YnN0cmluZygwLCAxNikpO1xuICAgICAgICB9KSxcbiAgICAgICAgcGxhaW5fZGF0YSA9IHRhYkRhdGEuYXNQbGFpbk9iamVjdCgpLFxuICAgICAgICBmaXJzdFBhcnR5Q29tcGFueSA9IENsaXF6QXR0cmFjay50cmFja2VyX2NvbXBhbmllc1tnZXRHZW5lcmFsRG9tYWluKHRhYkRhdGEuaG9zdG5hbWUpXTtcbiAgICAgIHJlc3VsdC5ob3N0bmFtZSA9IHRhYkRhdGEuaG9zdG5hbWU7XG4gICAgICByZXN1bHQucGF0aCA9IHRhYkRhdGEucGF0aDtcbiAgICAgIC8vIHJlc3VsdC5wcyA9IFByaXZhY3lTY29yZS5nZXQobWQ1KGdldEdlbmVyYWxEb21haW4ocmVzdWx0Lmhvc3RuYW1lKSkuc3Vic3RyKDAsIDE2KSArICdzaXRlJyk7XG4gICAgICAvLyBpZiAoIXJlc3VsdC5wcy5zY29yZSkge1xuICAgICAgLy8gICByZXN1bHQucHMuZ2V0UHJpdmFjeVNjb3JlKCk7XG4gICAgICAvLyB9XG5cbiAgICAgIHRyYWNrZXJzLmZvckVhY2goZnVuY3Rpb24oZG9tKSB7XG4gICAgICAgIHJlc3VsdC50cmFja2Vyc1tkb21dID0ge307XG4gICAgICAgIFsnYycsICdjb29raWVfc2V0JywgJ2Nvb2tpZV9ibG9ja2VkJywgJ2JhZF9jb29raWVfc2VudCcsICdiYWRfcXMnLCAndG9rZW5zX2Jsb2NrZWQnLCAncmVxX2Fib3J0ZWQnLCAnYWRibG9ja19ibG9jayddLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICByZXN1bHQudHJhY2tlcnNbZG9tXVtrXSA9IHBsYWluX2RhdGEudHBzW2RvbV1ba10gfHwgMDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5jb29raWVzLmFsbG93ZWQgKz0gcmVzdWx0LnRyYWNrZXJzW2RvbV1bJ2Nvb2tpZV9zZXQnXSAtIHJlc3VsdC50cmFja2Vyc1tkb21dWydjb29raWVfYmxvY2tlZCddO1xuICAgICAgICByZXN1bHQuY29va2llcy5ibG9ja2VkICs9IHJlc3VsdC50cmFja2Vyc1tkb21dWydjb29raWVfYmxvY2tlZCddO1xuICAgICAgICByZXN1bHQucmVxdWVzdHMuc2FmZSArPSByZXN1bHQudHJhY2tlcnNbZG9tXVsnYyddIC0gcmVzdWx0LnRyYWNrZXJzW2RvbV1bJ2JhZF9xcyddO1xuICAgICAgICByZXN1bHQucmVxdWVzdHMudW5zYWZlICs9IHJlc3VsdC50cmFja2Vyc1tkb21dWydiYWRfcXMnXTtcbiAgICAgICAgcmVzdWx0LnJlcXVlc3RzLmFkYmxvY2sgKz0gcmVzdWx0LnRyYWNrZXJzW2RvbV1bJ2FkYmxvY2tfYmxvY2snXTtcblxuICAgICAgICBsZXQgdGxkID0gZ2V0R2VuZXJhbERvbWFpbihkb20pLFxuICAgICAgICAgIGNvbXBhbnkgPSB0bGQ7XG4gICAgICAgIC8vIGZpbmQgdGhlIGNvbXBhbnkgYmVoaW5kIHRoaXMgdHJhY2tlci4gSVxuICAgICAgICAvLyBJZiB0aGUgZmlyc3QgcGFydHkgaXMgZnJvbSBhIHRyYWNrZXIgY29tcGFueSwgdGhlbiBkbyBub3QgYWRkIHRoZSBjb21wYW55IHNvIHRoYXQgdGhlIGFjdHVhbCB0bGRzIHdpbGwgYmUgc2hvd24gaW4gdGhlIGxpc3RcbiAgICAgICAgaWYgKHRsZCBpbiBDbGlxekF0dHJhY2sudHJhY2tlcl9jb21wYW5pZXMgJiYgQ2xpcXpBdHRyYWNrLnRyYWNrZXJfY29tcGFuaWVzW3RsZF0gIT09IGZpcnN0UGFydHlDb21wYW55KSB7XG4gICAgICAgICAgY29tcGFueSA9IENsaXF6QXR0cmFjay50cmFja2VyX2NvbXBhbmllc1t0bGRdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghKGNvbXBhbnkgaW4gcmVzdWx0LmNvbXBhbmllcykpIHtcbiAgICAgICAgICByZXN1bHQuY29tcGFuaWVzW2NvbXBhbnldID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LmNvbXBhbmllc1tjb21wYW55XS5wdXNoKGRvbSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIGdldEN1cnJlbnRUYWJCbG9ja2luZ0luZm86IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHRhYklkLCB1cmxGb3JUYWI7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgZ0Jyb3dzZXIgPSB1dGlscy5nZXRXaW5kb3coKS5nQnJvd3NlcixcbiAgICAgICAgICAgIHNlbGVjdGVkQnJvd3NlciA9IGdCcm93c2VyLnNlbGVjdGVkQnJvd3NlcjtcbiAgICAgICAgLy8gb24gRkYgPCAzOCBzZWxlY3RCcm93c2VyLm91dGVyV2luZG93SUQgaXMgdW5kZWZpbmVkLCBzbyB3ZSBnZXQgdGhlIHdpbmRvd0lEIGZyb20gX2xvYWRDb250ZXh0XG4gICAgICAgIHRhYklkID0gc2VsZWN0ZWRCcm93c2VyLm91dGVyV2luZG93SUQgfHwgc2VsZWN0ZWRCcm93c2VyLl9sb2FkQ29udGV4dC5ET01XaW5kb3dJRDtcbiAgICAgICAgdXJsRm9yVGFiID0gc2VsZWN0ZWRCcm93c2VyLmN1cnJlbnRVUkkuc3BlYztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIH1cbiAgICAgIHJldHVybiBDbGlxekF0dHJhY2suZ2V0VGFiQmxvY2tpbmdJbmZvKHRhYklkLCB1cmxGb3JUYWIpO1xuICAgIH0sXG4gICAgdHJhY2tlcl9jb21wYW5pZXM6IHt9LFxuICAgIC8qKiBQYXJzZSB0cmFja2VyIG93bmVycyBsaXN0IHtDb21wYW55OiBbbGlzdCwgb2YsIGRvbWFpbnNdfSwgaW50byBsb29rdXAgdGFibGUge2RvbWFpbjogQ29tcGFueX1cbiAgICAgKi9cbiAgICBfcGFyc2VUcmFja2VyQ29tcGFuaWVzOiBmdW5jdGlvbihjb21wYW55X2xpc3QpIHtcbiAgICAgIHZhciByZXZfbGlzdCA9IHt9O1xuICAgICAgZm9yICh2YXIgY29tcGFueSBpbiBjb21wYW55X2xpc3QpIHtcbiAgICAgICAgY29tcGFueV9saXN0W2NvbXBhbnldLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldl9saXN0W2RdID0gY29tcGFueTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBDbGlxekF0dHJhY2sudHJhY2tlcl9jb21wYW5pZXMgPSByZXZfbGlzdDtcbiAgICB9LFxuICAgIC8qKiBFbmFibGVzIEF0dHJhY2sgbW9kdWxlIHdpdGggY29va2llLCBRUyBhbmQgcmVmZXJyZXIgcHJvdGVjdGlvbiBlbmFibGVkLlxuICAgICAqICBpZiBtb2R1bGVfb25seSBpcyBzZXQgdG8gdHJ1ZSwgd2lsbCBub3Qgc2V0IHByZWZlcmVuY2VzIGZvciBjb29raWUsIFFTIGFuZCByZWZlcnJlciBwcm90ZWN0aW9uIChmb3Igc2VsZWN0aXZlIGxvYWRpbmcgaW4gQUIgdGVzdHMpXG4gICAgICovXG4gICAgZW5hYmxlTW9kdWxlOiBmdW5jdGlvbihtb2R1bGVfb25seSkge1xuICAgICAgaWYgKENsaXF6QXR0cmFjay5pc0VuYWJsZWQoKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHV0aWxzLnNldFByZWYoQ2xpcXpBdHRyYWNrLkVOQUJMRV9QUkVGLCB0cnVlKTtcbiAgICAgIGlmICghbW9kdWxlX29ubHkpIHtcbiAgICAgICAgdXRpbHMuc2V0UHJlZignYXR0cmFja0Jsb2NrQ29va2llVHJhY2tpbmcnLCB0cnVlKTtcbiAgICAgICAgdXRpbHMuc2V0UHJlZignYXR0cmFja1JlbW92ZVF1ZXJ5U3RyaW5nVHJhY2tpbmcnLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8qKiBEaXNhYmxlcyBhbnRpLXRyYWNraW5nIGltbWVkaWF0ZWx5LlxuICAgICAqL1xuICAgIGRpc2FibGVNb2R1bGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdXRpbHMuc2V0UHJlZihDbGlxekF0dHJhY2suRU5BQkxFX1BSRUYsIGZhbHNlKTtcbiAgICB9LFxuICAgIGRpc2FibGVkX3NpdGVzOiBuZXcgU2V0KCksXG4gICAgRElTQUJMRURfU0lURVNfUFJFRjogXCJhdHRyYWNrU291cmNlRG9tYWluV2hpdGVsaXN0XCIsXG4gICAgc2F2ZVNvdXJjZURvbWFpbldoaXRlbGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICB1dGlscy5zZXRQcmVmKENsaXF6QXR0cmFjay5ESVNBQkxFRF9TSVRFU19QUkVGLFxuICAgICAgICBKU09OLnN0cmluZ2lmeShBcnJheS5mcm9tKENsaXF6QXR0cmFjay5kaXNhYmxlZF9zaXRlcykpKTtcbiAgICB9LFxuICAgIGlzU291cmNlV2hpdGVsaXN0ZWQ6IGZ1bmN0aW9uKGhvc3RuYW1lKSB7XG4gICAgICAgIHJldHVybiBDbGlxekF0dHJhY2suZGlzYWJsZWRfc2l0ZXMuaGFzKGhvc3RuYW1lKTtcbiAgICB9LFxuICAgIGFkZFNvdXJjZURvbWFpblRvV2hpdGVsaXN0OiBmdW5jdGlvbihkb21haW4pIHtcbiAgICAgIENsaXF6QXR0cmFjay5kaXNhYmxlZF9zaXRlcy5hZGQoZG9tYWluKTtcbiAgICAgIC8vIGFsc28gc2VuZCBkb21haW4gdG8gaHVtYW53ZWJcbiAgICAgIHRlbGVtZXRyeS50ZWxlbWV0cnkoe1xuICAgICAgICAndHlwZSc6IHRlbGVtZXRyeS5tc2dUeXBlLFxuICAgICAgICAnYWN0aW9uJzogJ2F0dHJhY2sud2hpdGVsaXN0RG9tYWluJyxcbiAgICAgICAgJ3BheWxvYWQnOiBkb21haW5cbiAgICAgIH0pO1xuICAgICAgQ2xpcXpBdHRyYWNrLnNhdmVTb3VyY2VEb21haW5XaGl0ZWxpc3QoKTtcbiAgICB9LFxuICAgIHJlbW92ZVNvdXJjZURvbWFpbkZyb21XaGl0ZWxpc3Q6IGZ1bmN0aW9uKGRvbWFpbikge1xuICAgICAgQ2xpcXpBdHRyYWNrLmRpc2FibGVkX3NpdGVzLmRlbGV0ZShkb21haW4pO1xuICAgICAgQ2xpcXpBdHRyYWNrLnNhdmVTb3VyY2VEb21haW5XaGl0ZWxpc3QoKTtcbiAgICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBDbGlxekF0dHJhY2s7XG4iXX0=