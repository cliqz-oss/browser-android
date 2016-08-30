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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9tZDUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OzJCQUdNLEdBQUcsRUFFTCxRQUFROzs7Ozs7OztBQUZOLGVBQUcsR0FBRyxPQUFPLFVBQVUsS0FBSyxXQUFXLEdBQUcsVUFBVSxHQUFHLE9BQU87QUFFaEUsb0JBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDOzsrQkFFdkIsVUFBUyxDQUFDLEVBQUU7QUFDdkIsb0JBQUksQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUM7QUFDbEIsdUJBQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMxQiIsImZpbGUiOiJhbnRpdHJhY2tpbmcvbWQ1LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1hcENhY2hlIGZyb20gJ2FudGl0cmFja2luZy9maXhlZC1zaXplLWNhY2hlJztcbmltcG9ydCBjb3JlTWQ1IGZyb20gJ2NvcmUvaGVscGVycy9tZDUnXG5cbmNvbnN0IG1kNSA9IHR5cGVvZiBfbWQ1TmF0aXZlICE9PSAndW5kZWZpbmVkJyA/IF9tZDVOYXRpdmUgOiBjb3JlTWQ1O1xuXG52YXIgbWQ1Q2FjaGUgPSBuZXcgTWFwQ2FjaGUobWQ1LCAxMDAwKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24ocykge1xuICAgIGlmICghcykgcmV0dXJuIFwiXCI7XG4gICAgcmV0dXJuIG1kNUNhY2hlLmdldChzKTtcbn1cbiJdfQ==