System.register('antitracking/tp_events', ['core/cliqz', 'antitracking/md5', 'antitracking/domain', 'antitracking/telemetry', 'platform/browser'], function (_export) {
    'use strict';

    var utils, md5, sameGeneralDomain, telemetry, browser, debug, stats, tp_events;

    // Class to hold a page load and third party urls loaded by this page.
    function PageLoadData(url, isPrivate) {

        // Create a short md5 hash of the input string s
        this._shortHash = function (s) {
            if (!s) return '';
            return md5(s).substring(0, 16);
        };

        this.url = url.toString();
        this.hostname = url.hostname;
        this.path = this._shortHash(url.path);
        this.scheme = url.protocol;
        this['private'] = isPrivate;
        this.c = 1;
        this.s = new Date().getTime();
        this.e = null;
        this.tps = {};
        this.redirects = [];

        this._plainObject = null;

        // Get a stat counter object for the given third party host and path in
        // this page load.
        this.getTpUrl = function (tp_host, tp_path) {
            // reset cached plain object
            this._plainObject = null;
            var path_key = tp_path; // TODO hash it?
            if (!(tp_host in this.tps)) {
                this.tps[tp_host] = {};
            }
            if (!(path_key in this.tps[tp_host])) {
                this.tps[tp_host][path_key] = this._tpStatCounter();
            }
            return this.tps[tp_host][path_key];
        };

        // Returns true if the given referrer matches this page load.
        // This can be either a direct referral (referrer matches page load url),
        // or nth degree (referrer is somewhere in the graph of referrals originating
        // from the original page load url).
        this.isReferredFrom = function (ref_parts) {
            if (!ref_parts) return false;
            if (sameGeneralDomain(ref_parts.hostname, this.hostname)) {
                return true;
            }
            // not a direct referral, but could be via a third party
            if (ref_parts.hostname in this.tps) {
                return true;
            }
            return false;
        };

        this._tpStatCounter = tp_events._newStatCounter;

        // Creates a plain, aggregated version of this object, suitable for converting
        // to JSON, and sending as telemetry.
        this.asPlainObject = function () {
            return this._plainObject || this._buildPlainObject();
        };

        this._buildPlainObject = function () {
            var _this = this;

            var self = this,
                obj = {
                hostname: this._shortHash(this.hostname),
                path: this.path,
                scheme: this.scheme,
                c: this.c,
                t: this.e - this.s,
                ra: this.ra || 0,
                tps: {},
                redirects: this.redirects.filter(function (hostname) {
                    return !sameGeneralDomain(hostname, self.hostname);
                })
            };
            if (!obj.hostname) return obj;

            var _loop = function (tp_domain) {
                tp_domain_data = _this.tps[tp_domain];
                tp_paths = Object.keys(tp_domain_data);

                // skip same general domain
                if (sameGeneralDomain(self.hostname, tp_domain)) {
                    return 'continue';
                }
                if (tp_paths.length > 0) {
                    // aggregate stats per tp domain.
                    path_data = tp_paths.map(function (k) {
                        tp_domain_data[k]['paths'] = [self._shortHash(k)];
                        return tp_domain_data[k];
                    });

                    obj['tps'][tp_domain] = path_data.reduce(_this._sumStats);

                    // Remove the keys which have value == 0;
                    stats.forEach(function (eachKey) {
                        if (obj['tps'][tp_domain] && obj['tps'][tp_domain][eachKey] == 0) delete obj['tps'][tp_domain][eachKey];
                    });
                }
            };

            for (var tp_domain in this.tps) {
                var tp_domain_data, tp_paths;
                var path_data;

                var _ret = _loop(tp_domain);

                if (_ret === 'continue') continue;
            }
            // This was added to collect data for experiment, safe to stop collecting it now.
            // checkBlackList(this.url, obj);
            // checkFingerPrinting(this.url, obj);
            this._plainObject = obj;
            return obj;
        };

        this._sumStats = function (a, b) {
            var c = {},
                stats_keys = new Set(Object.keys(a).concat(Object.keys(b)));
            // paths is a special case
            stats_keys['delete']('paths');
            stats_keys.forEach(function (s) {
                c[s] = (a[s] || 0) + (b[s] || 0);
            });
            c['paths'] = a['paths'].concat(b['paths']);
            return c;
        };
    }return {
        setters: [function (_coreCliqz) {
            utils = _coreCliqz.utils;
        }, function (_antitrackingMd5) {
            md5 = _antitrackingMd5['default'];
        }, function (_antitrackingDomain) {
            sameGeneralDomain = _antitrackingDomain.sameGeneralDomain;
        }, function (_antitrackingTelemetry) {
            telemetry = _antitrackingTelemetry['default'];
        }, function (_platformBrowser) {
            browser = _platformBrowser;
        }],
        execute: function () {
            debug = false;
            ;

            stats = ['c'];
            tp_events = {
                _active: {},
                _old_tab_idx: {},
                _staged: [],
                _last_clean: 0,
                _clean_interval: 1000 * 10, // 10s
                _push_interval: 1000 * 60 * 20, // 20 minutes decreasing the frequency from 5 minutes to 20 minutes.
                _last_push: 0,
                telemetryAnnotators: [],
                ignore: new Set(['self-repair.mozilla.org']),
                // Called when a url is loaded on windowID source.
                // Returns the PageLoadData object for this url.
                //  or returns null if the url is malformed or null.
                onFullPage: function onFullPage(url, tab_id, isPrivate) {
                    // previous request finished. Move to staged
                    this.stage(tab_id);
                    // create new page load entry for tab
                    if (url && url.hostname && tab_id > 0 && !this.ignore.has(url.hostname)) {
                        this._active[tab_id] = new PageLoadData(url, isPrivate || false);
                        return this._active[tab_id];
                    } else {
                        return null;
                    }
                },
                onRedirect: function onRedirect(url_parts, tab_id, isPrivate) {
                    if (tab_id in this._active) {
                        var prev = this._active[tab_id];
                        this._active[tab_id] = new PageLoadData(url_parts, isPrivate);
                        this._active[tab_id].redirects = prev.redirects;
                        this._active[tab_id].redirects.push(prev.hostname);
                    } else {
                        this.onFullPage(url_parts, tab_id, isPrivate);
                    }
                },
                // Get a stats object for the request to url, referred from ref, on tab source.
                // url_parts and ref_parts contain the decomposed parts (from parseURL) of url and ref respectively.
                // returns an object containing keys specified in tp_events._stats representing the running stats
                // for the requesting third party on the source page.
                // Returns null if the referrer is not valid.
                get: function get(url, url_parts, ref, ref_parts, source) {
                    if (source <= 0 || source === null || source === undefined) {
                        if (debug) utils.log("No source for request, not logging!", "tp_events");
                        return null;
                    }

                    if (!(source in this._active)) {
                        if (!ref || !ref_parts || !ref_parts.hostname) {
                            return null;
                        }
                        if (debug) utils.log("No fullpage request for referrer: " + ref + " -> " + url, "tp_events");
                        return null;
                    }

                    var page_graph = this._active[source];
                    if (!page_graph.isReferredFrom(ref_parts)) {
                        if (!ref || !ref_parts || !ref_parts.hostname) return null;
                        if (source in this._old_tab_idx) {
                            var prev_graph = this._staged[this._old_tab_idx[source]];
                            if (prev_graph && prev_graph.isReferredFrom(ref_parts)) {
                                if (debug) utils.log("Request for expired tab " + ref_parts.hostname + " -> " + url_parts.hostname + " (" + prev_graph['hostname'] + ")", 'tp_events');
                                return prev_graph.getTpUrl(url_parts.hostname, url_parts.path);
                            }
                        }
                        if (debug) utils.log("tab/referrer mismatch " + ref_parts.hostname + " -> " + url_parts.hostname + " (" + page_graph['hostname'] + ")", 'tp_events');
                        return null;
                    }

                    return page_graph.getTpUrl(url_parts.hostname, url_parts.path);
                },
                // Move the PageLoadData object for windowID to the staging area.
                stage: function stage(windowID) {
                    if (windowID in this._active) {
                        this._active[windowID]['e'] = new Date().getTime();
                        // push object to staging and save its id
                        this._old_tab_idx[windowID] = this._staged.push(this._active[windowID]) - 1;
                        delete this._active[windowID];
                    }
                },
                // Periodically stage any tabs which are no longer active.
                // Will run at a period specifed by tp_events._clean_interval, unless force_clean is true
                // If force_stage is true, will stage all tabs, otherwise will only stage inactive.
                commit: function commit(force_clean, force_stage) {
                    var now = new Date().getTime();
                    if (now - this._last_clean > this._clean_interval || force_clean == true) {
                        for (var k in this._active) {
                            var active = browser.isWindowActive(k);
                            if (!active || force_stage == true) {
                                if (debug) utils.log('Stage tab ' + k, 'tp_events');
                                this.stage(k);
                            }
                        }
                        this._last_clean = now;
                    }
                },
                // Push staged PageLoadData to human web.
                // Will run at a period specified by tp_events._push_interval, unless force_push is true.
                push: function push(force_push) {
                    var now = new Date().getTime();
                    if (this._staged.length > 0 && (now - this._last_push > this._push_interval || force_push == true)) {
                        // convert staged objects into simple objects, and aggregate.
                        // then filter out ones with bad data (undefined hostname or no third parties)
                        var payload_data = this._staged.filter(function (pl) {
                            // remove private tabs
                            return !pl['private'];
                        }).map(function (item) {
                            return item.asPlainObject();
                        }).filter(function (item) {
                            return item['hostname'].length > 0 && Object.keys(item['tps']).length > 0;
                        });

                        // if we still have some data, send the telemetry
                        if (payload_data.length > 0) {
                            if (debug) utils.log('Pushing data for ' + payload_data.length + ' requests', 'tp_events');
                            var basePayload = tp_events.telemetryAnnotators.reduce(function (obj, fn) {
                                return fn(obj);
                            }, {});
                            for (var i = 0; i < payload_data.length; i++) {
                                var payl = Object.assign({
                                    'data': [payload_data[i]]
                                }, basePayload);
                                telemetry.telemetry({ 'type': telemetry.msgType, 'action': 'attrack.tp_events', 'payload': payl });
                            }
                        }
                        this._staged = [];
                        this._old_tab_idx = {};
                        this._last_push = now;
                    }
                },
                _newStatCounter: function _newStatCounter() {
                    var ctr = {},
                        stats_keys = stats;
                    for (var s in stats_keys) {
                        ctr[stats_keys[s]] = 0;
                    }
                    return ctr;
                },
                incrementStat: function incrementStat(req_log, stat_key, n) {
                    if (req_log != null) {
                        if (!(stat_key in req_log)) {
                            req_log[stat_key] = 0;
                        }
                        if (!Number.isInteger(n)) {
                            n = 1;
                        }
                        req_log[stat_key] += n;
                    }
                }
            };

            _export('default', tp_events);
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy90cF9ldmVudHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OzJEQU1NLEtBQUssRUF5SFAsS0FBSyxFQUVMLFNBQVM7OztBQXhIYixhQUFTLFlBQVksQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFOzs7QUFHbEMsWUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFTLENBQUMsRUFBRTtBQUMxQixnQkFBRyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztBQUNqQixtQkFBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNsQyxDQUFDOztBQUVGLFlBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzFCLFlBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztBQUM3QixZQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RDLFlBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztBQUMzQixZQUFJLFdBQVEsR0FBRyxTQUFTLENBQUM7QUFDekIsWUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDWCxZQUFJLENBQUMsQ0FBQyxHQUFHLEFBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBRSxPQUFPLEVBQUUsQ0FBQztBQUNoQyxZQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUNkLFlBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ2QsWUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7O0FBRXBCLFlBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDOzs7O0FBSXpCLFlBQUksQ0FBQyxRQUFRLEdBQUcsVUFBUyxPQUFPLEVBQUUsT0FBTyxFQUFFOztBQUV2QyxnQkFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7QUFDekIsZ0JBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUN2QixnQkFBRyxFQUFFLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFBLEFBQUMsRUFBRTtBQUN2QixvQkFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDMUI7QUFDRCxnQkFBRyxFQUFFLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBLEFBQUMsRUFBRTtBQUNqQyxvQkFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7YUFDdkQ7QUFDRCxtQkFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3RDLENBQUM7Ozs7OztBQU1GLFlBQUksQ0FBQyxjQUFjLEdBQUcsVUFBUyxTQUFTLEVBQUU7QUFDdEMsZ0JBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxLQUFLLENBQUM7QUFDNUIsZ0JBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7QUFDckQsdUJBQU8sSUFBSSxDQUFDO2FBQ2Y7O0FBRUQsZ0JBQUcsU0FBUyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO0FBQy9CLHVCQUFPLElBQUksQ0FBQzthQUNmO0FBQ0QsbUJBQU8sS0FBSyxDQUFDO1NBQ2hCLENBQUM7O0FBRUYsWUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDOzs7O0FBSWhELFlBQUksQ0FBQyxhQUFhLEdBQUcsWUFBVztBQUM5QixtQkFBTyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1NBQ3RELENBQUM7O0FBRUYsWUFBSSxDQUFDLGlCQUFpQixHQUFHLFlBQVc7OztBQUNoQyxnQkFBSSxJQUFJLEdBQUcsSUFBSTtnQkFDWCxHQUFHLEdBQUc7QUFDRix3QkFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUN4QyxvQkFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0FBQ2Ysc0JBQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtBQUNuQixpQkFBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ1QsaUJBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ2xCLGtCQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDO0FBQ2hCLG1CQUFHLEVBQUUsRUFBRTtBQUNQLHlCQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBUyxRQUFRLEVBQUU7QUFDaEQsMkJBQU8sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUN0RCxDQUFDO2FBQ0wsQ0FBQztBQUNOLGdCQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLEdBQUcsQ0FBQzs7a0NBRXJCLFNBQVM7QUFDVCw4QkFBYyxHQUFHLE1BQUssR0FBRyxDQUFDLFNBQVMsQ0FBQztBQUNwQyx3QkFBUSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDOzs7QUFFMUMsb0JBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtBQUM1QyxzQ0FBUztpQkFDWjtBQUNELG9CQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFOztBQUVoQiw2QkFBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUU7QUFDckMsc0NBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRCwrQkFBTyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzVCLENBQUM7O0FBQ0YsdUJBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQUssU0FBUyxDQUFDLENBQUM7OztBQUd6RCx5QkFBSyxDQUFDLE9BQU8sQ0FBQyxVQUFTLE9BQU8sRUFBQztBQUMzQiw0QkFBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFDM0QsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQzdDLENBQUMsQ0FBQztpQkFDTjs7O0FBcEJMLGlCQUFJLElBQUksU0FBUyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ3ZCLGNBQWMsRUFDZCxRQUFRO29CQU9KLFNBQVM7O2lDQVRiLFNBQVM7O3lDQUtULFNBQVM7YUFnQmhCOzs7O0FBSUQsZ0JBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDO0FBQ3hCLG1CQUFPLEdBQUcsQ0FBQztTQUNkLENBQUM7O0FBRUYsWUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDNUIsZ0JBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ04sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVoRSxzQkFBVSxVQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDM0Isc0JBQVUsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFDMUIsaUJBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUEsSUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBLEFBQUMsQ0FBQzthQUNwQyxDQUFDLENBQUM7QUFDSCxhQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUMzQyxtQkFBTyxDQUFDLENBQUM7U0FDWixDQUFDO0tBQ0w7OytCQTdIUSxLQUFLOzs7O29EQUVMLGlCQUFpQjs7Ozs7OztBQUlwQixpQkFBSyxHQUFHLEtBQUs7QUF1SGxCLGFBQUM7O0FBRUUsaUJBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQztBQUViLHFCQUFTLEdBQUc7QUFDWix1QkFBTyxFQUFFLEVBQUU7QUFDWCw0QkFBWSxFQUFFLEVBQUU7QUFDaEIsdUJBQU8sRUFBRSxFQUFFO0FBQ1gsMkJBQVcsRUFBRSxDQUFDO0FBQ2QsK0JBQWUsRUFBRSxJQUFJLEdBQUMsRUFBRTtBQUN4Qiw4QkFBYyxFQUFFLElBQUksR0FBQyxFQUFFLEdBQUMsRUFBRTtBQUMxQiwwQkFBVSxFQUFFLENBQUM7QUFDYixtQ0FBbUIsRUFBRSxFQUFFO0FBQ3ZCLHNCQUFNLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDOzs7O0FBSTVDLDBCQUFVLEVBQUUsb0JBQVMsR0FBRyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUU7O0FBRXpDLHdCQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDOztBQUVuQix3QkFBRyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsSUFBSSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQ3BFLDRCQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxTQUFTLElBQUksS0FBSyxDQUFDLENBQUM7QUFDakUsK0JBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztxQkFDL0IsTUFBTTtBQUNILCtCQUFPLElBQUksQ0FBQztxQkFDZjtpQkFDSjtBQUNELDBCQUFVLEVBQUUsb0JBQVMsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUU7QUFDL0Msd0JBQUcsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDdkIsNEJBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDaEMsNEJBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzlELDRCQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQ2hELDRCQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3FCQUN0RCxNQUFNO0FBQ0gsNEJBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztxQkFDakQ7aUJBQ0o7Ozs7OztBQU1ELG1CQUFHLEVBQUUsYUFBUyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFO0FBQ2xELHdCQUFHLE1BQU0sSUFBSSxDQUFDLElBQUcsTUFBTSxLQUFLLElBQUksSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO0FBQ3RELDRCQUFJLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ3pFLCtCQUFPLElBQUksQ0FBQztxQkFDZjs7QUFFRCx3QkFBRyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFBLEFBQUMsRUFBRTtBQUMxQiw0QkFBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7QUFDMUMsbUNBQU8sSUFBSSxDQUFDO3lCQUNmO0FBQ0QsNEJBQUksS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsb0NBQW9DLEdBQUUsR0FBRyxHQUFFLE1BQU0sR0FBRSxHQUFHLEVBQUcsV0FBVyxDQUFDLENBQUM7QUFDM0YsK0JBQU8sSUFBSSxDQUFDO3FCQUNmOztBQUdELHdCQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3RDLHdCQUFHLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUN0Qyw0QkFBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxJQUFJLENBQUM7QUFDMUQsNEJBQUcsTUFBTSxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7QUFDNUIsZ0NBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ3pELGdDQUFHLFVBQVUsSUFBSSxVQUFVLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQ25ELG9DQUFJLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFFLFNBQVMsQ0FBQyxRQUFRLEdBQUUsTUFBTSxHQUFFLFNBQVMsQ0FBQyxRQUFRLEdBQUUsSUFBSSxHQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDakosdUNBQU8sVUFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs2QkFDbEU7eUJBQ0o7QUFDRCw0QkFBSSxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsR0FBRSxTQUFTLENBQUMsUUFBUSxHQUFFLE1BQU0sR0FBRSxTQUFTLENBQUMsUUFBUSxHQUFFLElBQUksR0FBRSxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQy9JLCtCQUFPLElBQUksQ0FBQztxQkFDZjs7QUFFRCwyQkFBTyxVQUFVLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNsRTs7QUFFRCxxQkFBSyxFQUFFLGVBQVMsUUFBUSxFQUFFO0FBQ3RCLHdCQUFHLFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQ3pCLDRCQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEFBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBRSxPQUFPLEVBQUUsQ0FBQzs7QUFFckQsNEJBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM1RSwrQkFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO3FCQUNqQztpQkFDSjs7OztBQUlELHNCQUFNLEVBQUUsZ0JBQVMsV0FBVyxFQUFFLFdBQVcsRUFBRTtBQUN2Qyx3QkFBSSxHQUFHLEdBQUcsQUFBQyxJQUFJLElBQUksRUFBRSxDQUFFLE9BQU8sRUFBRSxDQUFDO0FBQ2pDLHdCQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtBQUNyRSw2QkFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQ3ZCLGdDQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLGdDQUFHLENBQUMsTUFBTSxJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUU7QUFDL0Isb0NBQUksS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNsRCxvQ0FBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDakI7eUJBQ0o7QUFDRCw0QkFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUM7cUJBQzFCO2lCQUNKOzs7QUFHRCxvQkFBSSxFQUFFLGNBQVMsVUFBVSxFQUFFO0FBQ3ZCLHdCQUFJLEdBQUcsR0FBRyxBQUFDLElBQUksSUFBSSxFQUFFLENBQUUsT0FBTyxFQUFFLENBQUM7QUFDakMsd0JBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLElBQUksVUFBVSxJQUFJLElBQUksQ0FBQSxBQUFDLEVBQUU7OztBQUcvRiw0QkFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBUyxFQUFFLEVBQUU7O0FBRWxELG1DQUFPLENBQUMsRUFBRSxXQUFRLENBQUM7eUJBQ3BCLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxJQUFJLEVBQUU7QUFDbEIsbUNBQU8sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO3lCQUMvQixDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQ3JCLG1DQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzt5QkFDN0UsQ0FBQyxDQUFDOzs7QUFHSCw0QkFBRyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUN4QixnQ0FBSSxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRSxZQUFZLENBQUMsTUFBTSxHQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUN6RixnQ0FBSSxXQUFXLEdBQUcsU0FBUyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxVQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUs7QUFBRSx1Q0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7NkJBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM1RixpQ0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDMUMsb0NBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDckIsMENBQU0sRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQ0FDNUIsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNoQix5Q0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQzs2QkFDcEc7eUJBQ0o7QUFDRCw0QkFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDbEIsNEJBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO0FBQ3ZCLDRCQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztxQkFDekI7aUJBQ0o7QUFDRCwrQkFBZSxFQUFFLDJCQUFXO0FBQ3hCLHdCQUFJLEdBQUcsR0FBRyxFQUFFO3dCQUNSLFVBQVUsR0FBRyxLQUFLLENBQUM7QUFDdkIseUJBQUksSUFBSSxDQUFDLElBQUksVUFBVSxFQUFFO0FBQ3JCLDJCQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUMxQjtBQUNELDJCQUFPLEdBQUcsQ0FBQztpQkFDZDtBQUNELDZCQUFhLEVBQUUsdUJBQVMsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUU7QUFDMUMsd0JBQUksT0FBTyxJQUFJLElBQUksRUFBRTtBQUNqQiw0QkFBRyxFQUFFLFFBQVEsSUFBSSxPQUFPLENBQUEsQUFBQyxFQUFFO0FBQ3ZCLG1DQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3lCQUN6QjtBQUNELDRCQUFJLENBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRztBQUN4Qiw2QkFBQyxHQUFHLENBQUMsQ0FBQzt5QkFDVDtBQUNELCtCQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUMxQjtpQkFDSjthQUNKOzsrQkFFYyxTQUFTIiwiZmlsZSI6ImFudGl0cmFja2luZy90cF9ldmVudHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1dGlscyB9IGZyb20gJ2NvcmUvY2xpcXonO1xuaW1wb3J0IG1kNSBmcm9tICdhbnRpdHJhY2tpbmcvbWQ1JztcbmltcG9ydCB7IHNhbWVHZW5lcmFsRG9tYWluIH0gZnJvbSAnYW50aXRyYWNraW5nL2RvbWFpbic7XG5pbXBvcnQgdGVsZW1ldHJ5IGZyb20gJ2FudGl0cmFja2luZy90ZWxlbWV0cnknO1xuaW1wb3J0ICogYXMgYnJvd3NlciBmcm9tICdwbGF0Zm9ybS9icm93c2VyJztcblxuY29uc3QgZGVidWcgPSBmYWxzZTtcblxuLy8gQ2xhc3MgdG8gaG9sZCBhIHBhZ2UgbG9hZCBhbmQgdGhpcmQgcGFydHkgdXJscyBsb2FkZWQgYnkgdGhpcyBwYWdlLlxuZnVuY3Rpb24gUGFnZUxvYWREYXRhKHVybCwgaXNQcml2YXRlKSB7XG5cbiAgICAvLyBDcmVhdGUgYSBzaG9ydCBtZDUgaGFzaCBvZiB0aGUgaW5wdXQgc3RyaW5nIHNcbiAgICB0aGlzLl9zaG9ydEhhc2ggPSBmdW5jdGlvbihzKSB7XG4gICAgICAgIGlmKCFzKSByZXR1cm4gJyc7XG4gICAgICAgIHJldHVybiBtZDUocykuc3Vic3RyaW5nKDAsIDE2KTtcbiAgICB9O1xuXG4gICAgdGhpcy51cmwgPSB1cmwudG9TdHJpbmcoKTtcbiAgICB0aGlzLmhvc3RuYW1lID0gdXJsLmhvc3RuYW1lO1xuICAgIHRoaXMucGF0aCA9IHRoaXMuX3Nob3J0SGFzaCh1cmwucGF0aCk7XG4gICAgdGhpcy5zY2hlbWUgPSB1cmwucHJvdG9jb2w7XG4gICAgdGhpcy5wcml2YXRlID0gaXNQcml2YXRlO1xuICAgIHRoaXMuYyA9IDE7XG4gICAgdGhpcy5zID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICB0aGlzLmUgPSBudWxsO1xuICAgIHRoaXMudHBzID0ge307XG4gICAgdGhpcy5yZWRpcmVjdHMgPSBbXTtcblxuICAgIHRoaXMuX3BsYWluT2JqZWN0ID0gbnVsbDtcblxuICAgIC8vIEdldCBhIHN0YXQgY291bnRlciBvYmplY3QgZm9yIHRoZSBnaXZlbiB0aGlyZCBwYXJ0eSBob3N0IGFuZCBwYXRoIGluXG4gICAgLy8gdGhpcyBwYWdlIGxvYWQuXG4gICAgdGhpcy5nZXRUcFVybCA9IGZ1bmN0aW9uKHRwX2hvc3QsIHRwX3BhdGgpIHtcbiAgICAgICAgLy8gcmVzZXQgY2FjaGVkIHBsYWluIG9iamVjdFxuICAgICAgICB0aGlzLl9wbGFpbk9iamVjdCA9IG51bGw7XG4gICAgICAgIHZhciBwYXRoX2tleSA9IHRwX3BhdGg7IC8vIFRPRE8gaGFzaCBpdD9cbiAgICAgICAgaWYoISh0cF9ob3N0IGluIHRoaXMudHBzKSkge1xuICAgICAgICAgICAgdGhpcy50cHNbdHBfaG9zdF0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZighKHBhdGhfa2V5IGluIHRoaXMudHBzW3RwX2hvc3RdKSkge1xuICAgICAgICAgICAgdGhpcy50cHNbdHBfaG9zdF1bcGF0aF9rZXldID0gdGhpcy5fdHBTdGF0Q291bnRlcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnRwc1t0cF9ob3N0XVtwYXRoX2tleV07XG4gICAgfTtcblxuICAgIC8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gcmVmZXJyZXIgbWF0Y2hlcyB0aGlzIHBhZ2UgbG9hZC5cbiAgICAvLyBUaGlzIGNhbiBiZSBlaXRoZXIgYSBkaXJlY3QgcmVmZXJyYWwgKHJlZmVycmVyIG1hdGNoZXMgcGFnZSBsb2FkIHVybCksXG4gICAgLy8gb3IgbnRoIGRlZ3JlZSAocmVmZXJyZXIgaXMgc29tZXdoZXJlIGluIHRoZSBncmFwaCBvZiByZWZlcnJhbHMgb3JpZ2luYXRpbmdcbiAgICAvLyBmcm9tIHRoZSBvcmlnaW5hbCBwYWdlIGxvYWQgdXJsKS5cbiAgICB0aGlzLmlzUmVmZXJyZWRGcm9tID0gZnVuY3Rpb24ocmVmX3BhcnRzKSB7XG4gICAgICAgIGlmKCFyZWZfcGFydHMpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYoc2FtZUdlbmVyYWxEb21haW4ocmVmX3BhcnRzLmhvc3RuYW1lLCB0aGlzLmhvc3RuYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm90IGEgZGlyZWN0IHJlZmVycmFsLCBidXQgY291bGQgYmUgdmlhIGEgdGhpcmQgcGFydHlcbiAgICAgICAgaWYocmVmX3BhcnRzLmhvc3RuYW1lIGluIHRoaXMudHBzKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHRoaXMuX3RwU3RhdENvdW50ZXIgPSB0cF9ldmVudHMuX25ld1N0YXRDb3VudGVyO1xuXG4gICAgLy8gQ3JlYXRlcyBhIHBsYWluLCBhZ2dyZWdhdGVkIHZlcnNpb24gb2YgdGhpcyBvYmplY3QsIHN1aXRhYmxlIGZvciBjb252ZXJ0aW5nXG4gICAgLy8gdG8gSlNPTiwgYW5kIHNlbmRpbmcgYXMgdGVsZW1ldHJ5LlxuICAgIHRoaXMuYXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYWluT2JqZWN0IHx8IHRoaXMuX2J1aWxkUGxhaW5PYmplY3QoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5fYnVpbGRQbGFpbk9iamVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICBvYmogPSB7XG4gICAgICAgICAgICAgICAgaG9zdG5hbWU6IHRoaXMuX3Nob3J0SGFzaCh0aGlzLmhvc3RuYW1lKSxcbiAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLnBhdGgsXG4gICAgICAgICAgICAgICAgc2NoZW1lOiB0aGlzLnNjaGVtZSxcbiAgICAgICAgICAgICAgICBjOiB0aGlzLmMsXG4gICAgICAgICAgICAgICAgdDogdGhpcy5lIC0gdGhpcy5zLFxuICAgICAgICAgICAgICAgIHJhOiB0aGlzLnJhIHx8IDAsXG4gICAgICAgICAgICAgICAgdHBzOiB7fSxcbiAgICAgICAgICAgICAgICByZWRpcmVjdHM6IHRoaXMucmVkaXJlY3RzLmZpbHRlcihmdW5jdGlvbihob3N0bmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXNhbWVHZW5lcmFsRG9tYWluKGhvc3RuYW1lLCBzZWxmLmhvc3RuYW1lKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgaWYoIW9iai5ob3N0bmFtZSkgcmV0dXJuIG9iajtcblxuICAgICAgICBmb3IobGV0IHRwX2RvbWFpbiBpbiB0aGlzLnRwcykge1xuICAgICAgICAgICAgdmFyIHRwX2RvbWFpbl9kYXRhID0gdGhpcy50cHNbdHBfZG9tYWluXSxcbiAgICAgICAgICAgICAgICB0cF9wYXRocyA9IE9iamVjdC5rZXlzKHRwX2RvbWFpbl9kYXRhKTtcbiAgICAgICAgICAgIC8vIHNraXAgc2FtZSBnZW5lcmFsIGRvbWFpblxuICAgICAgICAgICAgaWYoc2FtZUdlbmVyYWxEb21haW4oc2VsZi5ob3N0bmFtZSwgdHBfZG9tYWluKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodHBfcGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIGFnZ3JlZ2F0ZSBzdGF0cyBwZXIgdHAgZG9tYWluLlxuICAgICAgICAgICAgICAgIHZhciBwYXRoX2RhdGEgPSB0cF9wYXRocy5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgICAgICAgICAgICAgICB0cF9kb21haW5fZGF0YVtrXVsncGF0aHMnXSA9IFtzZWxmLl9zaG9ydEhhc2goayldO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHBfZG9tYWluX2RhdGFba107XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgb2JqWyd0cHMnXVt0cF9kb21haW5dID0gcGF0aF9kYXRhLnJlZHVjZSh0aGlzLl9zdW1TdGF0cyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIGtleXMgd2hpY2ggaGF2ZSB2YWx1ZSA9PSAwO1xuICAgICAgICAgICAgICAgIHN0YXRzLmZvckVhY2goZnVuY3Rpb24oZWFjaEtleSl7XG4gICAgICAgICAgICAgICAgICAgIGlmKG9ialsndHBzJ11bdHBfZG9tYWluXSAmJiBvYmpbJ3RwcyddW3RwX2RvbWFpbl1bZWFjaEtleV0gPT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvYmpbJ3RwcyddW3RwX2RvbWFpbl1bZWFjaEtleV07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhpcyB3YXMgYWRkZWQgdG8gY29sbGVjdCBkYXRhIGZvciBleHBlcmltZW50LCBzYWZlIHRvIHN0b3AgY29sbGVjdGluZyBpdCBub3cuXG4gICAgICAgIC8vIGNoZWNrQmxhY2tMaXN0KHRoaXMudXJsLCBvYmopO1xuICAgICAgICAvLyBjaGVja0ZpbmdlclByaW50aW5nKHRoaXMudXJsLCBvYmopO1xuICAgICAgICB0aGlzLl9wbGFpbk9iamVjdCA9IG9iajtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuXG4gICAgdGhpcy5fc3VtU3RhdHMgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHZhciBjID0ge30sXG4gICAgICAgICAgICBzdGF0c19rZXlzID0gbmV3IFNldChPYmplY3Qua2V5cyhhKS5jb25jYXQoT2JqZWN0LmtleXMoYikpKTtcbiAgICAgICAgLy8gcGF0aHMgaXMgYSBzcGVjaWFsIGNhc2VcbiAgICAgICAgc3RhdHNfa2V5cy5kZWxldGUoJ3BhdGhzJyk7XG4gICAgICAgIHN0YXRzX2tleXMuZm9yRWFjaChmdW5jdGlvbihzKXtcbiAgICAgICAgICAgIGNbc10gPSAoYVtzXSB8fCAwKSArIChiW3NdIHx8IDApO1xuICAgICAgICB9KTtcbiAgICAgICAgY1sncGF0aHMnXSA9IGFbJ3BhdGhzJ10uY29uY2F0KGJbJ3BhdGhzJ10pO1xuICAgICAgICByZXR1cm4gYztcbiAgICB9O1xufTtcblxudmFyIHN0YXRzID0gWydjJ107XG5cbnZhciB0cF9ldmVudHMgPSB7XG4gICAgX2FjdGl2ZToge30sXG4gICAgX29sZF90YWJfaWR4OiB7fSxcbiAgICBfc3RhZ2VkOiBbXSxcbiAgICBfbGFzdF9jbGVhbjogMCxcbiAgICBfY2xlYW5faW50ZXJ2YWw6IDEwMDAqMTAsIC8vIDEwc1xuICAgIF9wdXNoX2ludGVydmFsOiAxMDAwKjYwKjIwLCAvLyAyMCBtaW51dGVzIGRlY3JlYXNpbmcgdGhlIGZyZXF1ZW5jeSBmcm9tIDUgbWludXRlcyB0byAyMCBtaW51dGVzLlxuICAgIF9sYXN0X3B1c2g6IDAsXG4gICAgdGVsZW1ldHJ5QW5ub3RhdG9yczogW10sXG4gICAgaWdub3JlOiBuZXcgU2V0KFsnc2VsZi1yZXBhaXIubW96aWxsYS5vcmcnXSksXG4gICAgLy8gQ2FsbGVkIHdoZW4gYSB1cmwgaXMgbG9hZGVkIG9uIHdpbmRvd0lEIHNvdXJjZS5cbiAgICAvLyBSZXR1cm5zIHRoZSBQYWdlTG9hZERhdGEgb2JqZWN0IGZvciB0aGlzIHVybC5cbiAgICAvLyAgb3IgcmV0dXJucyBudWxsIGlmIHRoZSB1cmwgaXMgbWFsZm9ybWVkIG9yIG51bGwuXG4gICAgb25GdWxsUGFnZTogZnVuY3Rpb24odXJsLCB0YWJfaWQsIGlzUHJpdmF0ZSkge1xuICAgICAgICAvLyBwcmV2aW91cyByZXF1ZXN0IGZpbmlzaGVkLiBNb3ZlIHRvIHN0YWdlZFxuICAgICAgICB0aGlzLnN0YWdlKHRhYl9pZCk7XG4gICAgICAgIC8vIGNyZWF0ZSBuZXcgcGFnZSBsb2FkIGVudHJ5IGZvciB0YWJcbiAgICAgICAgaWYodXJsICYmIHVybC5ob3N0bmFtZSAmJiB0YWJfaWQgPiAwICYmICF0aGlzLmlnbm9yZS5oYXModXJsLmhvc3RuYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5fYWN0aXZlW3RhYl9pZF0gPSBuZXcgUGFnZUxvYWREYXRhKHVybCwgaXNQcml2YXRlIHx8IGZhbHNlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hY3RpdmVbdGFiX2lkXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBvblJlZGlyZWN0OiBmdW5jdGlvbih1cmxfcGFydHMsIHRhYl9pZCwgaXNQcml2YXRlKSB7XG4gICAgICAgIGlmKHRhYl9pZCBpbiB0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIGxldCBwcmV2ID0gdGhpcy5fYWN0aXZlW3RhYl9pZF07XG4gICAgICAgICAgICB0aGlzLl9hY3RpdmVbdGFiX2lkXSA9IG5ldyBQYWdlTG9hZERhdGEodXJsX3BhcnRzLCBpc1ByaXZhdGUpO1xuICAgICAgICAgICAgdGhpcy5fYWN0aXZlW3RhYl9pZF0ucmVkaXJlY3RzID0gcHJldi5yZWRpcmVjdHM7XG4gICAgICAgICAgICB0aGlzLl9hY3RpdmVbdGFiX2lkXS5yZWRpcmVjdHMucHVzaChwcmV2Lmhvc3RuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMub25GdWxsUGFnZSh1cmxfcGFydHMsIHRhYl9pZCwgaXNQcml2YXRlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLy8gR2V0IGEgc3RhdHMgb2JqZWN0IGZvciB0aGUgcmVxdWVzdCB0byB1cmwsIHJlZmVycmVkIGZyb20gcmVmLCBvbiB0YWIgc291cmNlLlxuICAgIC8vIHVybF9wYXJ0cyBhbmQgcmVmX3BhcnRzIGNvbnRhaW4gdGhlIGRlY29tcG9zZWQgcGFydHMgKGZyb20gcGFyc2VVUkwpIG9mIHVybCBhbmQgcmVmIHJlc3BlY3RpdmVseS5cbiAgICAvLyByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIGtleXMgc3BlY2lmaWVkIGluIHRwX2V2ZW50cy5fc3RhdHMgcmVwcmVzZW50aW5nIHRoZSBydW5uaW5nIHN0YXRzXG4gICAgLy8gZm9yIHRoZSByZXF1ZXN0aW5nIHRoaXJkIHBhcnR5IG9uIHRoZSBzb3VyY2UgcGFnZS5cbiAgICAvLyBSZXR1cm5zIG51bGwgaWYgdGhlIHJlZmVycmVyIGlzIG5vdCB2YWxpZC5cbiAgICBnZXQ6IGZ1bmN0aW9uKHVybCwgdXJsX3BhcnRzLCByZWYsIHJlZl9wYXJ0cywgc291cmNlKSB7XG4gICAgICAgIGlmKHNvdXJjZSA8PSAwfHwgc291cmNlID09PSBudWxsIHx8IHNvdXJjZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoZGVidWcpIHV0aWxzLmxvZyhcIk5vIHNvdXJjZSBmb3IgcmVxdWVzdCwgbm90IGxvZ2dpbmchXCIsIFwidHBfZXZlbnRzXCIpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZighKHNvdXJjZSBpbiB0aGlzLl9hY3RpdmUpKSB7XG4gICAgICAgICAgICBpZighcmVmIHx8ICFyZWZfcGFydHMgfHwgIXJlZl9wYXJ0cy5ob3N0bmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRlYnVnKSB1dGlscy5sb2coXCJObyBmdWxscGFnZSByZXF1ZXN0IGZvciByZWZlcnJlcjogXCIrIHJlZiArXCIgLT4gXCIrIHVybCAsIFwidHBfZXZlbnRzXCIpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciBwYWdlX2dyYXBoID0gdGhpcy5fYWN0aXZlW3NvdXJjZV07XG4gICAgICAgIGlmKCFwYWdlX2dyYXBoLmlzUmVmZXJyZWRGcm9tKHJlZl9wYXJ0cykpIHtcbiAgICAgICAgICAgIGlmKCFyZWYgfHwgIXJlZl9wYXJ0cyB8fCAhcmVmX3BhcnRzLmhvc3RuYW1lKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGlmKHNvdXJjZSBpbiB0aGlzLl9vbGRfdGFiX2lkeCkge1xuICAgICAgICAgICAgICAgIHZhciBwcmV2X2dyYXBoID0gdGhpcy5fc3RhZ2VkW3RoaXMuX29sZF90YWJfaWR4W3NvdXJjZV1dO1xuICAgICAgICAgICAgICAgIGlmKHByZXZfZ3JhcGggJiYgcHJldl9ncmFwaC5pc1JlZmVycmVkRnJvbShyZWZfcGFydHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWJ1ZykgdXRpbHMubG9nKFwiUmVxdWVzdCBmb3IgZXhwaXJlZCB0YWIgXCIrIHJlZl9wYXJ0cy5ob3N0bmFtZSArXCIgLT4gXCIrIHVybF9wYXJ0cy5ob3N0bmFtZSArXCIgKFwiKyBwcmV2X2dyYXBoWydob3N0bmFtZSddICtcIilcIiwgJ3RwX2V2ZW50cycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJldl9ncmFwaC5nZXRUcFVybCh1cmxfcGFydHMuaG9zdG5hbWUsIHVybF9wYXJ0cy5wYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGVidWcpIHV0aWxzLmxvZyhcInRhYi9yZWZlcnJlciBtaXNtYXRjaCBcIisgcmVmX3BhcnRzLmhvc3RuYW1lICtcIiAtPiBcIisgdXJsX3BhcnRzLmhvc3RuYW1lICtcIiAoXCIrIHBhZ2VfZ3JhcGhbJ2hvc3RuYW1lJ10gK1wiKVwiLCAndHBfZXZlbnRzJyk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYWdlX2dyYXBoLmdldFRwVXJsKHVybF9wYXJ0cy5ob3N0bmFtZSwgdXJsX3BhcnRzLnBhdGgpO1xuICAgIH0sXG4gICAgLy8gTW92ZSB0aGUgUGFnZUxvYWREYXRhIG9iamVjdCBmb3Igd2luZG93SUQgdG8gdGhlIHN0YWdpbmcgYXJlYS5cbiAgICBzdGFnZTogZnVuY3Rpb24od2luZG93SUQpIHtcbiAgICAgICAgaWYod2luZG93SUQgaW4gdGhpcy5fYWN0aXZlKSB7XG4gICAgICAgICAgICB0aGlzLl9hY3RpdmVbd2luZG93SURdWydlJ10gPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgLy8gcHVzaCBvYmplY3QgdG8gc3RhZ2luZyBhbmQgc2F2ZSBpdHMgaWRcbiAgICAgICAgICAgIHRoaXMuX29sZF90YWJfaWR4W3dpbmRvd0lEXSA9IHRoaXMuX3N0YWdlZC5wdXNoKHRoaXMuX2FjdGl2ZVt3aW5kb3dJRF0pIC0gMTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9hY3RpdmVbd2luZG93SURdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvLyBQZXJpb2RpY2FsbHkgc3RhZ2UgYW55IHRhYnMgd2hpY2ggYXJlIG5vIGxvbmdlciBhY3RpdmUuXG4gICAgLy8gV2lsbCBydW4gYXQgYSBwZXJpb2Qgc3BlY2lmZWQgYnkgdHBfZXZlbnRzLl9jbGVhbl9pbnRlcnZhbCwgdW5sZXNzIGZvcmNlX2NsZWFuIGlzIHRydWVcbiAgICAvLyBJZiBmb3JjZV9zdGFnZSBpcyB0cnVlLCB3aWxsIHN0YWdlIGFsbCB0YWJzLCBvdGhlcndpc2Ugd2lsbCBvbmx5IHN0YWdlIGluYWN0aXZlLlxuICAgIGNvbW1pdDogZnVuY3Rpb24oZm9yY2VfY2xlYW4sIGZvcmNlX3N0YWdlKSB7XG4gICAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgICBpZihub3cgLSB0aGlzLl9sYXN0X2NsZWFuID4gdGhpcy5fY2xlYW5faW50ZXJ2YWwgfHwgZm9yY2VfY2xlYW4gPT0gdHJ1ZSkge1xuICAgICAgICAgICAgZm9yKGxldCBrIGluIHRoaXMuX2FjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHZhciBhY3RpdmUgPSBicm93c2VyLmlzV2luZG93QWN0aXZlKGspO1xuICAgICAgICAgICAgICAgIGlmKCFhY3RpdmUgfHwgZm9yY2Vfc3RhZ2UgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVidWcpIHV0aWxzLmxvZygnU3RhZ2UgdGFiICcraywgJ3RwX2V2ZW50cycpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YWdlKGspO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2xhc3RfY2xlYW4gPSBub3c7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8vIFB1c2ggc3RhZ2VkIFBhZ2VMb2FkRGF0YSB0byBodW1hbiB3ZWIuXG4gICAgLy8gV2lsbCBydW4gYXQgYSBwZXJpb2Qgc3BlY2lmaWVkIGJ5IHRwX2V2ZW50cy5fcHVzaF9pbnRlcnZhbCwgdW5sZXNzIGZvcmNlX3B1c2ggaXMgdHJ1ZS5cbiAgICBwdXNoOiBmdW5jdGlvbihmb3JjZV9wdXNoKSB7XG4gICAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgICBpZih0aGlzLl9zdGFnZWQubGVuZ3RoID4gMCAmJiAobm93IC0gdGhpcy5fbGFzdF9wdXNoID4gdGhpcy5fcHVzaF9pbnRlcnZhbCB8fCBmb3JjZV9wdXNoID09IHRydWUpKSB7XG4gICAgICAgICAgICAvLyBjb252ZXJ0IHN0YWdlZCBvYmplY3RzIGludG8gc2ltcGxlIG9iamVjdHMsIGFuZCBhZ2dyZWdhdGUuXG4gICAgICAgICAgICAvLyB0aGVuIGZpbHRlciBvdXQgb25lcyB3aXRoIGJhZCBkYXRhICh1bmRlZmluZWQgaG9zdG5hbWUgb3Igbm8gdGhpcmQgcGFydGllcylcbiAgICAgICAgICAgIHZhciBwYXlsb2FkX2RhdGEgPSB0aGlzLl9zdGFnZWQuZmlsdGVyKGZ1bmN0aW9uKHBsKSB7XG4gICAgICAgICAgICAgIC8vIHJlbW92ZSBwcml2YXRlIHRhYnNcbiAgICAgICAgICAgICAgcmV0dXJuICFwbC5wcml2YXRlO1xuICAgICAgICAgICAgfSkubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5hc1BsYWluT2JqZWN0KCk7XG4gICAgICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtWydob3N0bmFtZSddLmxlbmd0aCA+IDAgJiYgT2JqZWN0LmtleXMoaXRlbVsndHBzJ10pLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gaWYgd2Ugc3RpbGwgaGF2ZSBzb21lIGRhdGEsIHNlbmQgdGhlIHRlbGVtZXRyeVxuICAgICAgICAgICAgaWYocGF5bG9hZF9kYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWcpIHV0aWxzLmxvZygnUHVzaGluZyBkYXRhIGZvciAnKyBwYXlsb2FkX2RhdGEubGVuZ3RoICsnIHJlcXVlc3RzJywgJ3RwX2V2ZW50cycpO1xuICAgICAgICAgICAgICAgIHZhciBiYXNlUGF5bG9hZCA9IHRwX2V2ZW50cy50ZWxlbWV0cnlBbm5vdGF0b3JzLnJlZHVjZSgob2JqLCBmbikgPT4geyByZXR1cm4gZm4ob2JqKSB9LCB7fSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXlsb2FkX2RhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBheWwgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhJzogW3BheWxvYWRfZGF0YVtpXV1cbiAgICAgICAgICAgICAgICAgICAgfSwgYmFzZVBheWxvYWQpO1xuICAgICAgICAgICAgICAgICAgICB0ZWxlbWV0cnkudGVsZW1ldHJ5KHsndHlwZSc6IHRlbGVtZXRyeS5tc2dUeXBlLCAnYWN0aW9uJzogJ2F0dHJhY2sudHBfZXZlbnRzJywgJ3BheWxvYWQnOiBwYXlsfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fc3RhZ2VkID0gW107XG4gICAgICAgICAgICB0aGlzLl9vbGRfdGFiX2lkeCA9IHt9O1xuICAgICAgICAgICAgdGhpcy5fbGFzdF9wdXNoID0gbm93O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBfbmV3U3RhdENvdW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3RyID0ge30sXG4gICAgICAgICAgICBzdGF0c19rZXlzID0gc3RhdHM7XG4gICAgICAgIGZvcih2YXIgcyBpbiBzdGF0c19rZXlzKSB7XG4gICAgICAgICAgICBjdHJbc3RhdHNfa2V5c1tzXV0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdHI7XG4gICAgfSxcbiAgICBpbmNyZW1lbnRTdGF0OiBmdW5jdGlvbihyZXFfbG9nLCBzdGF0X2tleSwgbikge1xuICAgICAgICBpZiAocmVxX2xvZyAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZighKHN0YXRfa2V5IGluIHJlcV9sb2cpKSB7XG4gICAgICAgICAgICAgICAgcmVxX2xvZ1tzdGF0X2tleV0gPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCEgTnVtYmVyLmlzSW50ZWdlcihuKSApIHtcbiAgICAgICAgICAgICAgICBuID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcV9sb2dbc3RhdF9rZXldICs9IG47XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IHRwX2V2ZW50cztcbiJdfQ==