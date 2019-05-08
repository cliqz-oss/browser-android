package com.cliqz.browser.antiphishing;

import com.cliqz.browser.antiphishing.AntiPhishing.AntiPhishingCallback;

import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.AbstractHandler;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import static org.mockito.Mockito.after;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.only;
import static org.mockito.Mockito.verify;

/**
 *
 */
public class AntiphishingTests {

    private static final String PHISHING_URL = "https://phishing.test.url.1234test.com/index.html";
    private static final String PHISHING_URL_MD5 = "2b217f084d08d51a7b3907d81810c507";
    private static final String REGULAR_URL = "https://www.facebook.com/lists/10205616272786391";
    private static final String REGULAR_URL_MD5 = "660328a7f9004d462085aa67a82065db";

    private static final String[] PHISHING_MD5_PARTS = AntiPhishingUtils.splitMD5(PHISHING_URL_MD5);
    private static final String PHISHING_PREFIX = PHISHING_MD5_PARTS[0];
    private static final String PHISHING_SUFFIX = PHISHING_MD5_PARTS[1];
    private static final String JSON_RESPONSE = "{\n" +
            "  \"blacklist\": [\n" +
            "    [\"" + PHISHING_SUFFIX + "\", null]\n" +
            "  ]," +
            "  \"whitelist\": [\n" +
            "    [\"d80806345d31fd78\", null]\n" +
            "  ]\n" +
            "}";

    private final Cache testCache;
    private static Server sServer;

    public AntiphishingTests() {
        testCache = new Cache();
        testCache.addToBlacklist(PHISHING_URL_MD5);
        testCache.addToWhitelist(REGULAR_URL_MD5);
    }

    @BeforeClass
    public static void setupServer() throws Exception {
        sServer = new Server(8080);
        sServer.setHandler(serverHandler);
        sServer.start();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        sServer.stop();
        sServer.join();
    }

    @Test
    public void shouldFilterCachedUrl() {
        final AntiPhishing apCache = new AntiPhishing(testCache);
        final AntiPhishingCallback apCallback = mock(AntiPhishingCallback.class);
        apCache.processUrl(PHISHING_URL, apCallback);

        verify(apCallback, only())
                .onUrlProcessed(PHISHING_URL, true);
    }

    @Test
    public void shouldNotFilterRegularUrl() {
        final AntiPhishing apCache = new AntiPhishing(testCache);
        final AntiPhishingCallback apCallback = mock(AntiPhishingCallback.class);
        apCache.processUrl(REGULAR_URL, apCallback);

        verify(apCallback, after(1000).only())
                .onUrlProcessed(REGULAR_URL, false);
    }

    @Test
    public void shouldFilterNotCachedUrl() {
        final AntiPhishing apCache = new AntiPhishing(new Cache(), "http://127.0.0.1:8080/query");
        final AntiPhishingCallback apCallback = mock(AntiPhishingCallback.class);
        apCache.processUrl(PHISHING_URL, apCallback);

        verify(apCallback, after(1000).only())
                .onUrlProcessed(PHISHING_URL, true);
    }

    private static final Handler serverHandler = new AbstractHandler() {
        @Override
        public void handle(String s, Request request, HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse) throws IOException, ServletException {
            httpServletResponse.setStatus(HttpServletResponse.SC_OK);
            httpServletResponse.setContentType("application/json");
            httpServletResponse.getOutputStream().write(JSON_RESPONSE.getBytes());
            request.setHandled(true);
        }
    };

}