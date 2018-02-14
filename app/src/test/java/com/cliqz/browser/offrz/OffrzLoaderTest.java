package com.cliqz.browser.offrz;

import android.content.Context;
import android.support.annotation.NonNull;

import com.cliqz.utils.FileUtils;

import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.Velocity;
import org.bouncycastle.util.test.SimpleTestResult;
import org.bouncycastle.util.test.TestFailedException;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.AbstractHandler;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Writer;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;


/**
 * Test if:
 * <ol>
 *     <li>Without cache file
 *     <ol>
 *         <li>Return an expired response from local server => {@link OffrzLoader#loadInBackground()}
 *         should return null
 *         </li>
 *         <li>Return a valid response from local server => {@link OffrzLoader#loadInBackground()}
 *         should return a non null {@link org.json.JSONObject}</li>
 *     </ol>
 *     </li>
 *     <li>With a cached file
 *     <ol>
 *         <li>If the cached file is valid => {@link OffrzLoader#loadInBackground()}
 *         should return a non null {@link org.json.JSONObject} (check for the content)</li>
 *         <li>If the cached file is expired => check if we downloaded a new one from the local
 *         server</li>
 *     </ol>
 *     </li>
 * </ol>
 *
 * @author Moaz Rashad
 */
@RunWith(RobolectricTestRunner.class)
public class OffrzLoaderTest{

    private static Server sServer = null;
    private final String LOCAL_ENDPOINT = "http://localhost:8090/offrz_template.vm";
    private static final int PORT = 8090;

    OffrzLoader loader;
    File cacheFile;

    @BeforeClass
    public static void startup() throws Exception {
        sServer = new Server(PORT);
        sServer.setHandler(new Handler());
        sServer.start();
    }

    @AfterClass
    public static void shutdown() throws Exception {
        if (sServer == null) {
            return;
        }
        sServer.stop();
        sServer.join();
    }

    @Before
    public void setup() {
        loader = new TestLoader(RuntimeEnvironment.application);
        cacheFile = loader.getCacheFile();
        if (cacheFile.exists() && !cacheFile.delete()) {
            throw new TestFailedException(
                    new SimpleTestResult(false, "Can't delete test cache file"));
        }
    }

    @Test
    public void checkFileNotExist(){
       assertFalse(cacheFile.exists());
       assertNull(loader.getCachedOffrz(cacheFile));
    }

    @Test
    public void checkFileNotExistDownloadNewFile(){
        assertFalse(cacheFile.exists());
        assertNotNull(loader.loadInBackground());
    }

    @Test
    public void checkFileExistAndNotExpired(){
        assertNotNull(loader.loadInBackground());
        assertTrue(cacheFile.exists());
        assertEquals(loader.getCachedOffrz(cacheFile).toString(),loader.loadInBackground().toString());
    }

    @Test
    public void checkFileExistAndExpired() throws JSONException, IOException {
        // file not exist, then download and cache it
        assertFalse(cacheFile.exists());
        assertNotNull(loader.loadInBackground());
        // overwrite cache file, expire the period
        JSONObject cacheOffrz = loader.getCachedOffrz(cacheFile);
        assertNotNull(cacheOffrz);

        JSONArray expiredValidity = getExpiredValidity();
        cacheOffrz.put(TestLoader.VALIDITY_KEY,expiredValidity);
        FileUtils.writeTextToFile(cacheFile, cacheOffrz.toString());
        // check new download
        JSONObject offrz = loader.loadInBackground();
        assertNotNull(offrz);
        assertNotEquals(expiredValidity.toString(),offrz.getJSONArray(TestLoader.VALIDITY_KEY));
    }

    private JSONArray getExpiredValidity(){
        final long endTime = System.currentTimeMillis()/ 1000L;
        final long startTime = endTime - TestLoader.SIX_HOURS_IN_S;
        JSONArray jsonArray = new JSONArray();
        jsonArray.put(startTime);
        jsonArray.put(endTime);
        return jsonArray;
    }

    private class TestLoader extends OffrzLoader {
        public TestLoader(@NonNull Context context) {
            super(context);
        }

        @Override
        String getEndpoint() {
            return LOCAL_ENDPOINT;
        }
    }

    private static class Handler extends AbstractHandler {

        @Override
        public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_OK);
            baseRequest.setHandled(true);
            generateResponse(response.getWriter());
        }

        public void generateResponse(Writer writer) throws IOException {
            final File file = new File("app/src/test/resources/offrz_template.vm");
            assertTrue(file.exists());
            InputStreamReader reader = null;
            try {
                reader = new InputStreamReader(new FileInputStream(file));
                Velocity.init();
                VelocityContext context = new VelocityContext();

                final long startTime = System.currentTimeMillis()/ 1000L;
                final long endTime = startTime + TestLoader.SIX_HOURS_IN_S;
                context.put("start", String.valueOf(startTime));
                context.put("end", String.valueOf(endTime));

                Velocity.evaluate(context, writer, "TEST", reader);
            } finally {
                if (reader != null) {
                    reader.close();
                }
            }
        }
    }
}
