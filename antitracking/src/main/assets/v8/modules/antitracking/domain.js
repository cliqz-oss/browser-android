System.register("antitracking/domain", [], function (_export) {
    // Functions for manipulating domain names
    "use strict";

    var TLDs;

    _export("getGeneralDomain", getGeneralDomain);

    _export("sameGeneralDomain", sameGeneralDomain);

    function getGeneralDomain(dom) {
        var v1 = dom.split('.').reverse();
        var pos = 0;
        for (var i = 0; i < v1.length; i++) {
            if (TLDs[v1[i]]) pos = i + 1;else {
                if (i > 0) break;else if (v1.length == 4) {
                    // check for ip
                    var is_ip = v1.map(function (s) {
                        return parseInt(s);
                    }).every(function (d) {
                        return d >= 0 && d < 256;
                    });
                    if (is_ip) {
                        return dom;
                    }
                    continue;
                }
            }
        }
        return v1.slice(0, pos + 1).reverse().join('.');
    }

    function sameGeneralDomain(dom1, dom2) {

        if (dom1 === undefined || dom2 === undefined) return false;
        if (dom1 == dom2) return true;

        var v1 = dom1.split('.').reverse();
        var v2 = dom2.split('.').reverse();

        var same = true;

        var pos = 0;
        for (var i = 0; i < Math.min(v1.length, v2.length); i++) {
            if (TLDs[v1[i]] && TLDs[v2[i]]) {
                pos = i + 1;
            } else {
                if (i > 0) break;
            }
        }
        if (pos == 0 || pos > Math.min(v1.length, v2.length)) return false;
        for (var i = 0; i < pos + 1; i++) {
            if (v1[i] != v2[i]) {
                same = false;
                break;
            }
        }

        return same;
    }

    return {
        setters: [],
        execute: function () {
            TLDs = { "gw": "cc", "gu": "cc", "gt": "cc", "gs": "cc", "gr": "cc", "gq": "cc", "gp": "cc", "dance": "na", "tienda": "na", "gy": "cc", "gg": "cc", "gf": "cc", "ge": "cc", "gd": "cc", "gb": "cc", "ga": "cc", "edu": "na", "gn": "cc", "gm": "cc", "gl": "cc", "公司": "na", "gi": "cc", "gh": "cc", "tz": "cc", "zone": "na", "tv": "cc", "tw": "cc", "tt": "cc", "immobilien": "na", "tr": "cc", "tp": "cc", "tn": "cc", "to": "cc", "tl": "cc", "bike": "na", "tj": "cc", "tk": "cc", "th": "cc", "tf": "cc", "tg": "cc", "td": "cc", "tc": "cc", "coop": "na", "онлайн": "na", "cool": "na", "ro": "cc", "vu": "cc", "democrat": "na", "guitars": "na", "qpon": "na", "срб": "cc", "zm": "cc", "tel": "na", "futbol": "na", "za": "cc", "بازار": "na", "рф": "cc", "zw": "cc", "blue": "na", "mu": "cc", "ไทย": "cc", "asia": "na", "marketing": "na", "测试": "na", "international": "na", "net": "na", "新加坡": "cc", "okinawa": "na", "பரிட்சை": "na", "טעסט": "na", "삼성": "na", "sexy": "na", "institute": "na", "台灣": "cc", "pics": "na", "公益": "na", "机构": "na", "social": "na", "domains": "na", "香港": "cc", "集团": "na", "limo": "na", "мон": "cc", "tools": "na", "nagoya": "na", "properties": "na", "camera": "na", "today": "na", "club": "na", "company": "na", "glass": "na", "berlin": "na", "me": "cc", "md": "cc", "mg": "cc", "mf": "cc", "ma": "cc", "mc": "cc", "tokyo": "na", "mm": "cc", "ml": "cc", "mo": "cc", "mn": "cc", "mh": "cc", "mk": "cc", "cat": "na", "reviews": "na", "mt": "cc", "mw": "cc", "mv": "cc", "mq": "cc", "mp": "cc", "ms": "cc", "mr": "cc", "cab": "na", "my": "cc", "mx": "cc", "mz": "cc", "இலங்கை": "cc", "wang": "na", "estate": "na", "clothing": "na", "monash": "na", "guru": "na", "technology": "na", "travel": "na", "テスト": "na", "pink": "na", "fr": "cc", "테스트": "na", "farm": "na", "lighting": "na", "fi": "cc", "fj": "cc", "fk": "cc", "fm": "cc", "fo": "cc", "sz": "cc", "kaufen": "na", "sx": "cc", "ss": "cc", "sr": "cc", "sv": "cc", "su": "cc", "st": "cc", "sk": "cc", "sj": "cc", "si": "cc", "sh": "cc", "so": "cc", "sn": "cc", "sm": "cc", "sl": "cc", "sc": "cc", "sb": "cc", "rentals": "na", "sg": "cc", "se": "cc", "sd": "cc", "组织机构": "na", "shoes": "na", "中國": "cc", "industries": "na", "lb": "cc", "lc": "cc", "la": "cc", "lk": "cc", "li": "cc", "lv": "cc", "lt": "cc", "lu": "cc", "lr": "cc", "ls": "cc", "holiday": "na", "ly": "cc", "coffee": "na", "ceo": "na", "在线": "na", "ye": "cc", "إختبار": "na", "ninja": "na", "yt": "cc", "name": "na", "moda": "na", "eh": "cc", "بھارت": "cc", "ee": "cc", "house": "na", "eg": "cc", "ec": "cc", "vote": "na", "eu": "cc", "et": "cc", "es": "cc", "er": "cc", "ru": "cc", "rw": "cc", "ભારત": "cc", "rs": "cc", "boutique": "na", "re": "cc", "سورية": "cc", "gov": "na", "орг": "na", "red": "na", "foundation": "na", "pub": "na", "vacations": "na", "org": "na", "training": "na", "recipes": "na", "испытание": "na", "中文网": "na", "support": "na", "onl": "na", "中信": "na", "voto": "na", "florist": "na", "ලංකා": "cc", "қаз": "cc", "management": "na", "مصر": "cc", "آزمایشی": "na", "kiwi": "na", "academy": "na", "sy": "cc", "cards": "na", "संगठन": "na", "pro": "na", "kred": "na", "sa": "cc", "mil": "na", "我爱你": "na", "agency": "na", "みんな": "na", "equipment": "na", "mango": "na", "luxury": "na", "villas": "na", "政务": "na", "singles": "na", "systems": "na", "plumbing": "na", "δοκιμή": "na", "تونس": "cc", "پاکستان": "cc", "gallery": "na", "kg": "cc", "ke": "cc", "বাংলা": "cc", "ki": "cc", "kh": "cc", "kn": "cc", "km": "cc", "kr": "cc", "kp": "cc", "kw": "cc", "link": "na", "ky": "cc", "voting": "na", "cruises": "na", "عمان": "cc", "cheap": "na", "solutions": "na", "測試": "na", "neustar": "na", "partners": "na", "இந்தியா": "cc", "menu": "na", "arpa": "na", "flights": "na", "rich": "na", "do": "cc", "dm": "cc", "dj": "cc", "dk": "cc", "photography": "na", "de": "cc", "watch": "na", "dz": "cc", "supplies": "na", "report": "na", "tips": "na", "გე": "cc", "bar": "na", "qa": "cc", "shiksha": "na", "укр": "cc", "vision": "na", "wiki": "na", "قطر": "cc", "한국": "cc", "computer": "na", "best": "na", "voyage": "na", "expert": "na", "diamonds": "na", "email": "na", "wf": "cc", "jobs": "na", "bargains": "na", "移动": "na", "jp": "cc", "jm": "cc", "jo": "cc", "ws": "cc", "je": "cc", "kitchen": "na", "ਭਾਰਤ": "cc", "ایران": "cc", "ua": "cc", "buzz": "na", "com": "na", "uno": "na", "ck": "cc", "ci": "cc", "ch": "cc", "co": "cc", "cn": "cc", "cm": "cc", "cl": "cc", "cc": "cc", "ca": "cc", "cg": "cc", "cf": "cc", "community": "na", "cd": "cc", "cz": "cc", "cy": "cc", "cx": "cc", "cr": "cc", "cw": "cc", "cv": "cc", "cu": "cc", "pr": "cc", "ps": "cc", "pw": "cc", "pt": "cc", "holdings": "na", "wien": "na", "py": "cc", "ai": "cc", "pa": "cc", "pf": "cc", "pg": "cc", "pe": "cc", "pk": "cc", "ph": "cc", "pn": "cc", "pl": "cc", "pm": "cc", "台湾": "cc", "aero": "na", "catering": "na", "photos": "na", "परीक्षा": "na", "graphics": "na", "فلسطين": "cc", "ভারত": "cc", "ventures": "na", "va": "cc", "vc": "cc", "ve": "cc", "vg": "cc", "iq": "cc", "vi": "cc", "is": "cc", "ir": "cc", "it": "cc", "vn": "cc", "im": "cc", "il": "cc", "io": "cc", "in": "cc", "ie": "cc", "id": "cc", "tattoo": "na", "education": "na", "parts": "na", "events": "na", "భారత్": "cc", "cleaning": "na", "kim": "na", "contractors": "na", "mobi": "na", "center": "na", "photo": "na", "nf": "cc", "مليسيا": "cc", "wed": "na", "supply": "na", "网络": "na", "сайт": "na", "careers": "na", "build": "na", "الاردن": "cc", "bid": "na", "biz": "na", "السعودية": "cc", "gift": "na", "дети": "na", "works": "na", "游戏": "na", "tm": "cc", "exposed": "na", "productions": "na", "koeln": "na", "dating": "na", "christmas": "na", "bd": "cc", "be": "cc", "bf": "cc", "bg": "cc", "ba": "cc", "bb": "cc", "bl": "cc", "bm": "cc", "bn": "cc", "bo": "cc", "bh": "cc", "bi": "cc", "bj": "cc", "bt": "cc", "bv": "cc", "bw": "cc", "bq": "cc", "br": "cc", "bs": "cc", "post": "na", "by": "cc", "bz": "cc", "om": "cc", "ruhr": "na", "امارات": "cc", "repair": "na", "xyz": "na", "شبكة": "na", "viajes": "na", "museum": "na", "fish": "na", "الجزائر": "cc", "hr": "cc", "ht": "cc", "hu": "cc", "hk": "cc", "construction": "na", "hn": "cc", "solar": "na", "hm": "cc", "info": "na", "சிங்கப்பூர்": "cc", "uy": "cc", "uz": "cc", "us": "cc", "um": "cc", "uk": "cc", "ug": "cc", "builders": "na", "ac": "cc", "camp": "na", "ae": "cc", "ad": "cc", "ag": "cc", "af": "cc", "int": "na", "am": "cc", "al": "cc", "ao": "cc", "an": "cc", "aq": "cc", "as": "cc", "ar": "cc", "au": "cc", "at": "cc", "aw": "cc", "ax": "cc", "az": "cc", "ni": "cc", "codes": "na", "nl": "cc", "no": "cc", "na": "cc", "nc": "cc", "ne": "cc", "actor": "na", "ng": "cc", "भारत": "cc", "nz": "cc", "سودان": "cc", "np": "cc", "nr": "cc", "nu": "cc", "xxx": "na", "世界": "na", "kz": "cc", "enterprises": "na", "land": "na", "المغرب": "cc", "中国": "cc", "directory": "na" };

            _export("TLDs", TLDs);

            ;

            ;
        }
    };
});