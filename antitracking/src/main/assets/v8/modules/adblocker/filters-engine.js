System.register('adblocker/filters-engine', ['antitracking/domain', 'antitracking/url', 'adblocker/utils', 'adblocker/filters-parsing', 'adblocker/filters-matching'], function (_export) {
	'use strict';

	var TLDs, URLInfo, log, parseList, parseJSResource, match, TOKEN_BLACKLIST, FuzzyIndex, FilterReverseIndex, FilterHostnameDispatch, FilterSourceDomainDispatch, CosmeticBucket, CosmeticEngine, _default;

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	_export('tokenizeURL', tokenizeURL);

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function tokenizeHostname(hostname) {
		return hostname.split('.').filter(function (token) {
			return token && !TLDs[token] && !TOKEN_BLACKLIST.has(token);
		});
	}

	function tokenizeURL(pattern) {
		return pattern.match(/[a-zA-Z0-9]+/g) || [];
	}

	return {
		setters: [function (_antitrackingDomain) {
			TLDs = _antitrackingDomain.TLDs;
		}, function (_antitrackingUrl) {
			URLInfo = _antitrackingUrl.URLInfo;
		}, function (_adblockerUtils) {
			log = _adblockerUtils.log;
		}, function (_adblockerFiltersParsing) {
			parseList = _adblockerFiltersParsing['default'];
			parseJSResource = _adblockerFiltersParsing.parseJSResource;
		}, function (_adblockerFiltersMatching) {
			match = _adblockerFiltersMatching['default'];
		}],
		execute: function () {
			TOKEN_BLACKLIST = new Set(['com', 'http', 'https', 'icon', 'images', 'img', 'js', 'net', 'news', 'www']);

			FuzzyIndex = (function () {
				function FuzzyIndex(tokenizer, buildBucket, indexOnlyOne) {
					_classCallCheck(this, FuzzyIndex);

					// Define tokenizer
					this.tokenizer = tokenizer;
					if (this.tokenizer === undefined) {
						this.tokenizer = function (key, cb) {
							tokenizeURL(key).forEach(cb);
						};
					}

					// Should we index with all tokens, or just one
					this.indexOnlyOne = indexOnlyOne;

					// Function used to create a new bucket
					this.buildBucket = buildBucket;
					if (this.buildBucket === undefined) {
						this.buildBucket = function () {
							return [];
						};
					}

					// {token -> list of values}
					this.index = new Map();
					this.size = 0;
				}

				/* A filter reverse index is the lowest level of optimization we apply on filter
     * matching. To avoid inspecting filters that have no chance of matching, we
     * dispatch them in an index { ngram -> list of filter }.
     *
     * When we need to know if there is a match for an URL, we extract ngrams from it
     * and find all the buckets for which filters contains at list one of the ngram of
     * the URL. We then stop at the first match.
     */

				_createClass(FuzzyIndex, [{
					key: 'set',
					value: function set(key, value) {
						var _this = this;

						// Only true if we insert something (we have at least 1 token)
						log('SET ' + key);
						var inserted = false;
						var insertValue = function insertValue(token) {
							log('FOUND TOKEN ' + token);
							if (!(_this.indexOnlyOne && inserted)) {
								inserted = true;
								var bucket = _this.index.get(token);
								if (bucket === undefined) {
									var newBucket = _this.buildBucket(token);
									newBucket.push(value);
									_this.index.set(token, newBucket);
								} else {
									bucket.push(value);
								}
							}
						};

						// Split tokens into good, common, tld
						// common: too common tokens
						// tld: corresponding to hostname extensions
						// good: anything else
						// TODO: What about trying to insert bigger tokens first?
						var goodTokens = [];
						var commonTokens = [];
						var tldTokens = [];
						this.tokenizer(key, function (token) {
							if (TOKEN_BLACKLIST.has(token)) {
								commonTokens.push(token);
							} else if (TLDs[token]) {
								tldTokens.push(token);
							} else {
								goodTokens.push(token);
							}
						});

						// Try to insert
						goodTokens.forEach(insertValue);
						if (!inserted) {
							tldTokens.forEach(insertValue);
						}
						if (!inserted) {
							commonTokens.forEach(insertValue);
						}

						if (inserted) {
							this.size += 1;
						}

						return inserted;
					}
				}, {
					key: 'getFromKey',
					value: function getFromKey(key) {
						var _this2 = this;

						var buckets = [];
						this.tokenizer(key, function (token) {
							var bucket = _this2.index.get(token);
							if (bucket !== undefined) {
								log('BUCKET ' + token + ' size ' + bucket.length);
								buckets.push(bucket);
							}
						});
						return buckets;
					}
				}, {
					key: 'getFromTokens',
					value: function getFromTokens(tokens) {
						var _this3 = this;

						var buckets = [];
						tokens.forEach(function (token) {
							var bucket = _this3.index.get(token);
							if (bucket !== undefined) {
								log('BUCKET ' + token + ' size ' + bucket.length);
								buckets.push(bucket);
							}
						});
						return buckets;
					}
				}, {
					key: 'length',
					get: function get() {
						return this.size;
					}
				}]);

				return FuzzyIndex;
			})();

			FilterReverseIndex = (function () {
				function FilterReverseIndex(name, filters) {
					_classCallCheck(this, FilterReverseIndex);

					// Name of this index (for debugging purpose)
					this.name = name;

					// Remaining filters not stored in the index
					this.miscFilters = [];
					this.size = 0;

					// Tokenizer used on patterns for fuzzy matching
					this.tokenizer = function (pattern, cb) {
						pattern.split(/[*^]/g).forEach(function (part) {
							tokenizeURL(part).forEach(cb);
						});
					};
					this.index = new FuzzyIndex(this.tokenizer, undefined, true);

					// Update index
					if (filters) {
						filters.forEach(this.push.bind(this));
					}
				}

				/* A Bucket manages a subsets of all the filters. To avoid matching too many
     * useless filters, there is a second level of dispatch here.
     *
     * [ hostname anchors (||filter) ]    [ remaining filters ]
     *
     * The first structure map { domain -> filters that apply only on domain }
     * as the `hostname anchors` only apply on a specific domain name.
     *
     * Each group of filters is stored in a Filter index that is the last level
     * of dispatch of our matching engine.
     */

				_createClass(FilterReverseIndex, [{
					key: 'push',
					value: function push(filter) {
						log('REVERSE INDEX ' + this.name + ' INSERT ' + filter.rawLine);
						++this.size;
						var inserted = this.index.set(filter.filterStr, filter);

						if (!inserted) {
							log(this.name + ' MISC FILTER ' + filter.rawLine);
							this.miscFilters.push(filter);
						}
					}
				}, {
					key: 'matchList',
					value: function matchList(request, list, checkedFilters) {
						for (var i = 0; i < list.length; i++) {
							var filter = list[i];
							if (!checkedFilters.has(filter.id)) {
								checkedFilters.add(filter.id);
								if (match(filter, request)) {
									log('INDEX ' + this.name + ' MATCH ' + filter.rawLine + ' ~= ' + request.url);
									return filter;
								}
							}
						}
						return null;
					}
				}, {
					key: 'match',
					value: function match(request, checkedFilters) {
						// Keep track of filters checked
						if (checkedFilters === undefined) {
							checkedFilters = new Set();
						}

						var buckets = this.index.getFromTokens(request.tokens);

						var _iteratorNormalCompletion = true;
						var _didIteratorError = false;
						var _iteratorError = undefined;

						try {
							for (var _iterator = buckets[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
								var bucket = _step.value;

								log('INDEX ' + this.name + ' BUCKET => ' + bucket.length);
								if (this.matchList(request, bucket, checkedFilters) !== null) {
									return true;
								}
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

						log('INDEX ' + this.name + ' ' + this.miscFilters.length + ' remaining filters checked');

						// If no match found, check regexes
						return this.matchList(request, this.miscFilters, checkedFilters) !== null;
					}
				}, {
					key: 'length',
					get: function get() {
						return this.size;
					}
				}]);

				return FilterReverseIndex;
			})();

			FilterHostnameDispatch = (function () {
				function FilterHostnameDispatch(name, filters) {
					_classCallCheck(this, FilterHostnameDispatch);

					// TODO: Dispatch also on:
					// - fromImage
					// - fromMedia
					// - fromObject
					// - fromObjectSubrequest
					// - fromOther
					// - fromPing
					// - fromScript
					// - fromStylesheet
					// - fromXmlHttpRequest
					// To avoid matching filter if request type doesn't match
					// If we do it, we could simplify the match function of Filter

					this.name = name;
					this.size = 0;

					// ||hostname filter
					this.hostnameAnchors = new FuzzyIndex(
					// Tokenize key
					function (hostname, cb) {
						tokenizeHostname(hostname).forEach(cb);
					},
					// Create a new empty bucket
					function (token) {
						return new FilterReverseIndex(token + '_' + name);
					});

					// All other filters
					this.filters = new FilterReverseIndex(this.name);

					// Dispatch filters
					if (filters !== undefined) {
						filters.forEach(this.push.bind(this));
					}

					log(name + ' CREATE BUCKET: ' + this.filters.length + ' filters +' + (this.hostnameAnchors.size + ' hostnames'));
				}

				_createClass(FilterHostnameDispatch, [{
					key: 'push',
					value: function push(filter) {
						++this.size;

						log('PUSH ' + filter.rawLine);
						if (filter.hostname !== null) {
							this.hostnameAnchors.set(filter.hostname, filter);
						} else {
							this.filters.push(filter);
						}
					}
				}, {
					key: 'matchWithDomain',
					value: function matchWithDomain(request, domain, checkedFilters) {
						var buckets = this.hostnameAnchors.getFromKey(domain);
						var _iteratorNormalCompletion2 = true;
						var _didIteratorError2 = false;
						var _iteratorError2 = undefined;

						try {
							for (var _iterator2 = buckets[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
								var bucket = _step2.value;

								if (bucket !== undefined) {
									log(this.name + ' bucket try to match hostnameAnchors (' + domain + '/' + bucket.name + ')');
									if (bucket.match(request, checkedFilters)) {
										return true;
									}
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

						return false;
					}
				}, {
					key: 'match',
					value: function match(request, checkedFilters) {
						if (checkedFilters === undefined) {
							checkedFilters = new Set();
						}

						if (this.matchWithDomain(request, request.hostname, checkedFilters)) {
							return true;
						}

						// Try to find a match with remaining filters
						log(this.name + ' bucket try to match misc');
						return this.filters.match(request, checkedFilters);
					}
				}, {
					key: 'length',
					get: function get() {
						return this.size;
					}
				}]);

				return FilterHostnameDispatch;
			})();

			FilterSourceDomainDispatch = (function () {
				function FilterSourceDomainDispatch(name, filters) {
					_classCallCheck(this, FilterSourceDomainDispatch);

					this.name = name;
					this.size = 0;

					// Dispatch on source domain
					this.sourceDomainDispatch = new Map();
					// Filters without source domain specified
					this.miscFilters = new FilterHostnameDispatch(this.name);

					if (filters) {
						filters.forEach(this.push.bind(this));
					}
				}

				/**
     * Dispatch cosmetics filters on selectors
     */

				_createClass(FilterSourceDomainDispatch, [{
					key: 'push',
					value: function push(filter) {
						var _this4 = this;

						++this.size;

						if (filter.optNotDomains === null && filter.optDomains !== null) {
							filter.optDomains.forEach(function (domain) {
								log('SOURCE DOMAIN DISPATCH ' + domain + ' filter: ' + filter.rawLine);
								var bucket = _this4.sourceDomainDispatch.get(domain);
								if (bucket === undefined) {
									var newIndex = new FilterHostnameDispatch(_this4.name + '_' + domain);
									newIndex.push(filter);
									_this4.sourceDomainDispatch.set(domain, newIndex);
								} else {
									bucket.push(filter);
								}
							});
						} else {
							this.miscFilters.push(filter);
						}
					}
				}, {
					key: 'match',
					value: function match(request, checkedFilters) {
						// Check bucket for source domain
						var bucket = this.sourceDomainDispatch.get(request.sourceGD);
						var foundMatch = false;
						if (bucket !== undefined) {
							log('Source domain dispatch ' + request.sourceGD + ' size ' + bucket.length);
							foundMatch = bucket.match(request, checkedFilters);
						}

						if (!foundMatch) {
							log('Source domain dispatch misc size ' + this.miscFilters.length);
							foundMatch = this.miscFilters.match(request, checkedFilters);
						}

						return foundMatch;
					}
				}, {
					key: 'length',
					get: function get() {
						return this.size;
					}
				}]);

				return FilterSourceDomainDispatch;
			})();

			CosmeticBucket = (function () {
				function CosmeticBucket(name, filters) {
					_classCallCheck(this, CosmeticBucket);

					this.name = name;
					this.size = 0;

					this.miscFilters = [];
					this.index = new FuzzyIndex(function (selector, cb) {
						selector.split(/[^#.\w_-]/g).filter(function (token) {
							return token.length > 0;
						}).forEach(cb);
					});

					if (filters) {
						filters.forEach(this.push.bind(this));
					}
				}

				_createClass(CosmeticBucket, [{
					key: 'push',
					value: function push(filter) {
						++this.size;
						var inserted = this.index.set(filter.selector, filter);

						if (!inserted) {
							log(this.name + ' MISC FILTER ' + filter.rawLine);
							this.miscFilters.push(filter);
						}
					}
				}, {
					key: 'getMatchingRules',
					value: function getMatchingRules(nodeInfo) {
						var _this5 = this;

						var rules = [].concat(_toConsumableArray(this.miscFilters));

						nodeInfo.forEach(function (node) {
							// [id, tagName, className] = node
							node.forEach(function (token) {
								_this5.index.getFromKey(token).forEach(function (bucket) {
									bucket.forEach(function (rule) {
										rules.push(rule);
									});
								});
							});
						});

						return rules;
					}
				}]);

				return CosmeticBucket;
			})();

			CosmeticEngine = (function () {
				function CosmeticEngine() {
					_classCallCheck(this, CosmeticEngine);

					this.size = 0;

					this.miscFilters = new CosmeticBucket('misc');
					this.cosmetics = new FuzzyIndex(function (hostname, cb) {
						tokenizeHostname(hostname).forEach(cb);
					}, function (token) {
						return new CosmeticBucket(token + '_cosmetics');
					});
				}

				/* Manage a list of filters and match them in an efficient way.
     * To avoid inspecting to many filters for each request, we create
     * the following accelerating structure:
     *
     * [ Importants ]    [ Exceptions ]    [ Remaining filters ]
     *
     * Each of theses is a `FilterHostnameDispatch`, which manage a subset of filters.
     *
     * Importants filters are not subject to exceptions, hence we try it first.
     * If no important filter matched, try to use the remaining filters bucket.
     * If we have a match, try to find an exception.
     */

				_createClass(CosmeticEngine, [{
					key: 'push',
					value: function push(filter) {
						var _this6 = this;

						if (filter.hostnames.length === 0) {
							this.miscFilters.push(filter);
						} else {
							filter.hostnames.forEach(function (hostname) {
								_this6.cosmetics.set(hostname, filter);
							});
						}
					}

					/**
      * Return a list of potential cosmetics filters
      *
      * @param {string} url - url of the page.
      * @param {Array} nodeInfo - Array of tuples [id, tagName, className].
     **/
				}, {
					key: 'getMatchingRules',
					value: function getMatchingRules(url, nodeInfo) {
						var uniqIds = new Set();
						var rules = [];
						var hostname = URLInfo.get(url).hostname;
						log('getMatchingRules ' + url + ' => ' + hostname + ' (' + JSON.stringify(nodeInfo) + ')');

						// Check misc bucket
						this.miscFilters.getMatchingRules(nodeInfo).forEach(function (rule) {
							if (!uniqIds.has(rule.id)) {
								log('Found rule ' + JSON.stringify(rule));
								uniqIds.add(rule.id);
								rules.push(rule);
							}
						});

						// Check hostname buckets
						this.cosmetics.getFromKey(hostname).forEach(function (bucket) {
							log('Found bucket ' + bucket.size);
							bucket.getMatchingRules(nodeInfo).forEach(function (rule) {
								if (!rule.scriptInject && !uniqIds.has(rule.id)) {
									log('Found rule ' + JSON.stringify(rule));
									uniqIds.add(rule.id);
									rules.push(rule);
								}
							});
						});

						log('COSMETICS found ' + rules.length + ' potential rules for ' + url);
						return rules;
					}

					/**
      * Return all the cosmetic filters on a domain
      *
      * @param {string} url - url of the page
     **/
				}, {
					key: 'getDomainRules',
					value: function getDomainRules(url, js) {
						var hostname = URLInfo.get(url).hostname;
						var rules = [];
						var uniqIds = new Set();
						log('getDomainRules ' + url + ' => ' + hostname);
						this.cosmetics.getFromKey(hostname).forEach(function (bucket) {
							var _iteratorNormalCompletion3 = true;
							var _didIteratorError3 = false;
							var _iteratorError3 = undefined;

							try {
								for (var _iterator3 = bucket.index.index.values()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
									var value = _step3.value;

									value.forEach(function (rule) {
										if (!uniqIds.has(rule.id)) {
											if (rule.scriptInject) {
												// make sure the selector was replaced by javascript
												if (!rule.scriptReplaced) {
													rule.selector = js.get(rule.selector);
													rule.scriptReplaced = true;
												}
											}
											if (rule.selector) {
												rules.push(rule);
												uniqIds.add(rule.id);
											}
										}
									});
								}
							} catch (err) {
								_didIteratorError3 = true;
								_iteratorError3 = err;
							} finally {
								try {
									if (!_iteratorNormalCompletion3 && _iterator3['return']) {
										_iterator3['return']();
									}
								} finally {
									if (_didIteratorError3) {
										throw _iteratorError3;
									}
								}
							}
						});
						return rules;
					}
				}, {
					key: 'length',
					get: function get() {
						return this.size;
					}
				}]);

				return CosmeticEngine;
			})();

			_default = (function () {
				function _default() {
					_classCallCheck(this, _default);

					this.lists = new Map();
					this.size = 0;

					// *************** //
					// Network filters //
					// *************** //

					// @@filter
					this.exceptions = new FilterSourceDomainDispatch('exceptions');
					// $important
					this.importants = new FilterSourceDomainDispatch('importants');
					// All other filters
					this.filters = new FilterSourceDomainDispatch('filters');

					// ***************** //
					// Cosmetic filters  //
					// ***************** //

					this.cosmetics = new CosmeticEngine();

					// injections
					this.js = new Map();
				}

				_createClass(_default, [{
					key: 'onUpdateResource',
					value: function onUpdateResource(asset, data) {
						// the resource containing javascirpts to be injected
						var js = parseJSResource(data).get('application/javascript');
						// TODO: handle other type
						if (js) {
							this.js = js;
						}
					}
				}, {
					key: 'onUpdateFilters',
					value: function onUpdateFilters(asset, newFilters) {
						// Network filters
						var filters = [];
						var exceptions = [];
						var importants = [];

						// Cosmetic filters
						var cosmetics = [];

						// Parse and dispatch filters depending on type
						var parsed = parseList(newFilters);

						parsed.networkFilters.forEach(function (filter) {
							if (filter.isException) {
								exceptions.push(filter);
							} else if (filter.isImportant) {
								importants.push(filter);
							} else {
								filters.push(filter);
							}
						});

						parsed.cosmeticFilters.forEach(function (filter) {
							cosmetics.push(filter);
						});

						if (!this.lists.has(asset)) {
							log('FILTER ENGINE ' + asset + ' UPDATE');
							// Update data structures
							this.size += filters.length + exceptions.length + importants.length + cosmetics.length;
							filters.forEach(this.filters.push.bind(this.filters));
							exceptions.forEach(this.exceptions.push.bind(this.exceptions));
							importants.forEach(this.importants.push.bind(this.importants));
							cosmetics.forEach(this.cosmetics.push.bind(this.cosmetics));

							this.lists.set(asset, { filters: filters, exceptions: exceptions, importants: importants, cosmetics: cosmetics });
						} else {
							log('FILTER ENGINE ' + asset + ' REBUILD');
							// Rebuild everything
							var _iteratorNormalCompletion4 = true;
							var _didIteratorError4 = false;
							var _iteratorError4 = undefined;

							try {
								for (var _iterator4 = this.lists.values()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
									var list = _step4.value;

									list.filters.forEach(filters.push.bind(filters));
									list.exceptions.forEach(exceptions.push.bind(exceptions));
									list.importants.forEach(importants.push.bind(importants));
									list.cosmetics.forEach(cosmetics.push.bind(cosmetics));
								}
							} catch (err) {
								_didIteratorError4 = true;
								_iteratorError4 = err;
							} finally {
								try {
									if (!_iteratorNormalCompletion4 && _iterator4['return']) {
										_iterator4['return']();
									}
								} finally {
									if (_didIteratorError4) {
										throw _iteratorError4;
									}
								}
							}

							this.size = filters.length + exceptions.length + importants.length + cosmetics.length;
							this.filters = new FilterSourceDomainDispatch('filters', filters);
							this.exceptions = new FilterSourceDomainDispatch('exceptions', exceptions);
							this.importants = new FilterSourceDomainDispatch('importants', importants);
							this.cosmetics = new CosmeticEngine(cosmetics);
						}

						log('Filter engine updated with ' + filters.length + ' filters, ' + (exceptions.length + ' exceptions, ') + (importants.length + ' importants and ' + cosmetics.length + ' cosmetic filters\n'));
					}
				}, {
					key: 'getCosmeticsFilters',
					value: function getCosmeticsFilters(url, nodes) {
						return this.cosmetics.getMatchingRules(url, nodes);
					}
				}, {
					key: 'getDomainFilters',
					value: function getDomainFilters(url) {
						return this.cosmetics.getDomainRules(url, this.js);
					}
				}, {
					key: 'match',
					value: function match(request) {
						log('MATCH ' + JSON.stringify(request));
						request.tokens = tokenizeURL(request.url);

						var checkedFilters = new Set();
						var result = false;

						if (this.importants.match(request, checkedFilters)) {
							log('IMPORTANT');
							result = true;
						} else if (this.filters.match(request, checkedFilters)) {
							log('FILTER');
							if (this.exceptions.match(request, checkedFilters)) {
								log('EXCEPTION');
								result = false;
							} else {
								result = true;
							}
						}

						log('Total filters ' + checkedFilters.size);
						return result;
					}
				}]);

				return _default;
			})();

			_export('default', _default);
		}
	};
});