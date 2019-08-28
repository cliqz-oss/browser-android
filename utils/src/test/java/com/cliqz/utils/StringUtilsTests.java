package com.cliqz.utils;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class StringUtilsTests {

    private static String[] p(String url1, String url2) {
        return new String[] { url1, url2 };
    }

    private static final String[][] TEST_URLS = new String[][] {
        p("http://cliqz.com", "http://cliqz.com/"),
        p("http://www.cliqz.com", "http://www.cliqz.com/"),
        p("http://userid:password@example.com:8080", "http://userid:password@example.com:8080/"),
        p("http://foo.com/blah_blah_(wikipedia)_(again)#cite-1", "http://foo.com/blah_blah_(wikipedia)_(again)#cite-1"),
        p("http://www.example.com/foo/?bar=baz&inga=42&quux", "http://www.example.com/foo/?bar=baz&inga=42&quux"),
        p("http://✪df.ws/123", "http://xn--df-oiy.ws/123"),
        p("http://userid@example.com", "http://userid@example.com/"),
        p("http://userid@example.com:8080/", "http://userid@example.com:8080/"),
        p("http://userid:password@example.com", "http://userid:password@example.com/"),
        p("http://➡.ws/䨹", "http://xn--hgi.ws/%E4%A8%B9"),
        p("http://⌘.ws", "http://xn--bih.ws/"),
        p("http://⌘.ws/", "http://xn--bih.ws/"),
        p("http://foo.com/unicode_(✪)_in_parens", "http://foo.com/unicode_(%E2%9C%AA)_in_parens"),
        p("http://foo.com/(something)?after=parens", "http://foo.com/(something)?after=parens"),
        p("http://☺.damowmow.com/", "http://xn--74h.damowmow.com/"),
        p("http://code.google.com/events/#&product=browser", "http://code.google.com/events/#&product=browser"),
        p("http://foo.bar/baz", "http://foo.bar/baz"),
        p("http://foo.bar/?q=Test%20URL-encoded%20stuff", "http://foo.bar/?q=Test%20URL-encoded%20stuff"),
        p("http://مثال.إختبار", "http://xn--mgbh0fb.xn--kgbechtv/"),
        p("http://例子.测试", "http://xn--fsqu00a.xn--0zwm56d/"),
        p("http://उदाहरण.परीक्षा", "http://xn--p1b6ci4b4b3a.xn--11b5bs3a9aj6g/"),
        p("http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com", "http://-.~_!$&'()*+,;=:%40:80%2F::::::@example.com/"),

        // short url
        p("http://j.mp", "http://j.mp/"),
        p("https://t.co/2Y2tPh0TuJ/", "https://t.co/2Y2tPh0TuJ/"),

        // ip
        p("http://142.42.1.1", "http://142.42.1.1/"),
        p("http://142.42.1.1:8080", "http://142.42.1.1:8080/"),
        p("http://223.255.255.254", "http://223.255.255.254/"),
        p("http://[2001:4860:0:2001::68]/", "http://[2001:4860:0:2001::68]/"),
        p("https://[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443/", "https://[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443/"),

        // url with known protocol
        p("ftp://ftp.mozilla.org/pub/firefox/", "ftp://ftp.mozilla.org/pub/firefox/"),
        p("file:///etc/passwd", "file:///etc/passwd"),
        p("chrome://cliqz/content/pairing/index.html", "chrome://cliqz/content/pairing/index.html"),
        p("moz-extension://f4091876df6a5d39e6690b7395a95399/index.html", "moz-extension://f4091876df6a5d39e6690b7395a95399/index.html"),
        p("about:blank", "about:blank"),
        p("mailto:Cliqz <info@cliqz.com>", "mailto:Cliqz <info@cliqz.com>"),
        p("view-source:https://cliqz.com", "view-source:https://cliqz.com"),
        p("data:text/plain,hello", "data:text/plain,hello"),
        p("data:text,hello", "data:text,hello"),
        p("resource://devtools-client-jsonview/", "resource://devtools-client-jsonview/"),

        // urls without protocols
        p("cliqz.com", "http://cliqz.com/"),
        p("www.cliqz.com", "http://www.cliqz.com/"),
        p("userid:password@example.com:8080", "http://userid:password@example.com:8080/"),
        p("foo.com/blah_blah_(wikipedia)_(again)#cite-1", "http://foo.com/blah_blah_(wikipedia)_(again)#cite-1"),
        p("www.example.com/foo/?bar=baz&inga=42&quux", "http://www.example.com/foo/?bar=baz&inga=42&quux"),
        p("✪df.ws/123", "http://xn--df-oiy.ws/123"),
        p("userid@example.com", "http://userid@example.com/"),
        p("userid@example.com:8080/", "http://userid@example.com:8080/"),
        p("userid:password@example.com", "http://userid:password@example.com/"),
        p("➡.ws/䨹", "http://xn--hgi.ws/%E4%A8%B9"),
        p("⌘.ws", "http://xn--bih.ws/"),
        p("⌘.ws/", "http://xn--bih.ws/"),
        p("foo.com/unicode_(✪)_in_parens", "http://foo.com/unicode_(%E2%9C%AA)_in_parens"),
        p("foo.com/(something)?after=parens", "http://foo.com/(something)?after=parens"),
        p("☺.damowmow.com/", "http://xn--74h.damowmow.com/"),
        p("code.google.com/events/#&product=browser", "http://code.google.com/events/#&product=browser"),
        p("foo.bar/baz", "http://foo.bar/baz"),
        p("foo.bar/?q=Test%20URL-encoded%20stuff", "http://foo.bar/?q=Test%20URL-encoded%20stuff"),
        p("مثال.إختبار", "http://xn--mgbh0fb.xn--kgbechtv/"),
        p("例子.测试", "http://xn--fsqu00a.xn--0zwm56d/"),
        p("उदाहरण.परीक्षा", "http://xn--p1b6ci4b4b3a.xn--11b5bs3a9aj6g/"),
        // p("-.~_!$&'()*+,;=:%40:80%2f::::::@example.com", "http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com/"),
        p("1337.net", "http://1337.net/"),
        p("a.d-b.de", "http://a.d-b.de/"),

        // short URLs
        p("j.mp", "http://j.mp/"),
        p("t.co/2Y2tPh0TuJ/", "http://t.co/2Y2tPh0TuJ/"),

        // ip
        p("142.42.1.1/", "http://142.42.1.1/"),
        p("142.42.1.1:8080", "http://142.42.1.1:8080/"),
        p("223.255.255.254", "http://223.255.255.254/"),
        p("[2001:4860:0:2001::68]", "[2001:4860:0:2001::68]"),
        p("[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443/", "[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443/"),

        // invalid, but fixable
        p("https://cliqz.com.", "https://cliqz.com/"),
        p("https://cliqz.com. ", "https://cliqz.com/"),
        p("http://192.168.1.1.", "http://192.168.1.1/"),
        p("cliqz.com.", "http://cliqz.com/"),
        p("cliqz.com. ", "http://cliqz.com/"),
        p("192.168.1.1.", "http://192.168.1.1/"),

        // special exception
        p("localhost", "localhost"),
        p("LOCALHOST", "LOCALHOST"),

        // known protocol + host, or host + port
        p("http:localhost", "http://localhost/"),
        p("http:localhost:4300", "http://localhost:4300/"),
        p("http:weird-local-domain.dev", "http://weird-local-domain.dev/"),
        p("maghratea:8080", "maghratea:8080"),
        p("cliqz-test:4300", "cliqz-test:4300"),

        // other weirdness
        p("http://www.f", "http://www.f/"),
        p("http:////a", "http://www.a.com/"),
    };

    @Test
    public void shouldGuessCorrectly() {
        assertEquals("http://www.facebook.com/", StringUtils.guessUrl("facebook"));
        assertEquals("http://www.youtube.com/", StringUtils.guessUrl("youtube"));
        assertEquals("http://facebook.com/", StringUtils.guessUrl("facebook.com"));
    }

    @Test
    public void shouldReturnTheSame() {
        assertEquals("https://www.facebook.com/", StringUtils.guessUrl("https://www.facebook.com/"));
    }

    @Test
    public void shouldSupportAnchors() {
        assertEquals("http://test.com/#test", StringUtils.guessUrl("http://test.com/#test"));
        assertEquals("http://test.com/#/test", StringUtils.guessUrl("test.com/#/test"));
    }
    
    @Test
    public void shouldCheckAllUrls() {
        for (String[] pair: TEST_URLS) {
            final String expected = pair[1];
            final String input = pair[0];
            assertEquals(expected, StringUtils.guessUrl(input));
        }
    }
}
