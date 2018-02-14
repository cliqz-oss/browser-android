package com.cliqz.browser.main.search;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

/**
 * @author Stefano Pacifici
 */
public class LogoTest {

    @Test
    public void getUrl() throws Exception {
        assertNull("Should retrun null when the SvgLogoUrl is null", Logo.getUriFromSvgUri(null, 150, 150));
        assertNull("Should return null when the url doesn't contain $.svg",
                Logo.getUriFromSvgUri("abc", 150, 150));
        final String inputUrl = "https://cdn.cliqz.com/brands-database/database/1483980213630/logos/bbc/$.svg";
        final String outputUrl = "https://cdn.cliqz.com/brands-database/database/1483980213630/pngs/bbc/$_192.png";
        assertEquals("It should generate the given url for the given input",
                Logo.getUriFromSvgUri(inputUrl, 180, 180), outputUrl);
        assertEquals("It should return the right url even if the input is inside a url(...)",
                Logo.getUriFromSvgUri("url(" + inputUrl + ")", 180, 180),
                        outputUrl);
    }

}