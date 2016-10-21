System.register('antitracking/md5', ['antitracking/fixed-size-cache', 'core/helpers/md5'], function (_export) {
    'use strict';

    var MapCache, coreMd5, md5, md5Cache;
    return {
        setters: [function (_antitrackingFixedSizeCache) {
            MapCache = _antitrackingFixedSizeCache['default'];
        }, function (_coreHelpersMd5) {
            coreMd5 = _coreHelpersMd5['default'];
        }],
        execute: function () {
            md5 = typeof _md5Native !== 'undefined' ? _md5Native : coreMd5;
            md5Cache = new MapCache(md5, 1000);

            _export('default', function (s) {
                if (!s) return "";
                return md5Cache.get(s);
            });
        }
    };
});