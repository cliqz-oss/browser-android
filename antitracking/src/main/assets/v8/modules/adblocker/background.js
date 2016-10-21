System.register('adblocker/background', ['core/cliqz', 'core/base/background', 'adblocker/adblocker'], function (_export) {
  'use strict';

  var utils, background, CliqzADB, ADB_PREF_VALUES, ADB_PREF, ADB_PREF_OPTIMIZED, adbEnabled;

  function isAdbActive(url) {
    return adbEnabled() && !CliqzADB.adBlocker.isDomainInBlacklist(url) && !CliqzADB.adBlocker.isUrlInBlacklist(url);
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_coreBaseBackground) {
      background = _coreBaseBackground['default'];
    }, function (_adblockerAdblocker) {
      CliqzADB = _adblockerAdblocker['default'];
      ADB_PREF_VALUES = _adblockerAdblocker.ADB_PREF_VALUES;
      ADB_PREF = _adblockerAdblocker.ADB_PREF;
      ADB_PREF_OPTIMIZED = _adblockerAdblocker.ADB_PREF_OPTIMIZED;
      adbEnabled = _adblockerAdblocker.adbEnabled;
    }],
    execute: function () {
      _export('default', background({
        enabled: function enabled() {
          return true;
        },

        init: function init() {
          if (CliqzADB.getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
            return;
          }
          CliqzADB.init();
        },

        unload: function unload() {
          if (CliqzADB.getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
            return;
          }
          CliqzADB.unload();
        },

        events: {
          "control-center:adb-optimized": function controlCenterAdbOptimized() {
            utils.setPref(ADB_PREF_OPTIMIZED, !utils.getPref(ADB_PREF_OPTIMIZED, false));
          },
          "control-center:adb-activator": function controlCenterAdbActivator(data) {
            var isUrlInBlacklist = CliqzADB.adBlocker.isUrlInBlacklist(data.url),
                isDomainInBlacklist = CliqzADB.adBlocker.isDomainInBlacklist(data.url);

            //we first need to togle it off to be able to turn it on for the right thing - site or domain
            if (isUrlInBlacklist) {
              CliqzADB.adBlocker.toggleUrl(data.url);
            }

            if (isDomainInBlacklist) {
              CliqzADB.adBlocker.toggleUrl(data.url, true);
            }

            if (data.status == 'active') {
              utils.setPref(ADB_PREF, ADB_PREF_VALUES.Enabled);
            } else if (data.status == 'off') {
              if (data.option == 'all-sites') {
                utils.setPref(ADB_PREF, ADB_PREF_VALUES.Disabled);
              } else {
                utils.setPref(ADB_PREF, ADB_PREF_VALUES.Enabled);
                CliqzADB.adBlocker.toggleUrl(data.url, data.option == 'domain' ? true : false);
              }
            }
          }
        },

        actions: {
          // handles messages coming from process script
          nodes: function nodes(url, _nodes) {
            if (!isAdbActive(url)) {
              return {
                rules: [],
                active: false
              };
            }
            var candidates = CliqzADB.adBlocker.engine.getCosmeticsFilters(url, _nodes);
            return {
              rules: candidates.map(function (rule) {
                return rule.selector;
              }),
              active: true
            };
          },

          url: function url(_url) {
            if (!isAdbActive(_url)) {
              return {
                scripts: [],
                sytles: [],
                type: 'domain-rules',
                active: false
              };
            }

            var candidates = CliqzADB.adBlocker.engine.getDomainFilters(_url);
            return {
              styles: candidates.filter(function (rule) {
                return !rule.scriptInject && !rule.scriptBlock;
              }).map(function (rule) {
                return rule.selector;
              }),
              scripts: candidates.filter(function (rule) {
                return rule.scriptInject;
              }).map(function (rule) {
                return rule.selector;
              }),
              scriptBlock: candidates.filter(function (rule) {
                return rule.scriptBlock;
              }).map(function (rule) {
                return rule.selector;
              }),
              type: 'domain-rules',
              active: true
            };
          }
        }
      }));
    }
  };
});