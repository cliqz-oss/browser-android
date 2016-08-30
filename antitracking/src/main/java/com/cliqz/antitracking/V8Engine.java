package com.cliqz.antitracking;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;
import android.util.Pair;

import com.eclipsesource.v8.JavaCallback;
import com.eclipsesource.v8.JavaVoidCallback;
import com.eclipsesource.v8.V8;
import com.eclipsesource.v8.V8Array;
import com.eclipsesource.v8.V8Function;
import com.eclipsesource.v8.V8Object;

import java.io.BufferedReader;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.FutureTask;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Container object for the V8 javascript engine
 * <p/>
 * Created by sammacbeth on 23/05/16.
 */
class V8Engine {

    private static final String TAG = V8Engine.class.getSimpleName();
    private static final String HEADER_CONTENT_TYPE = "Content-Type";
    private static final String TYPE_JSON = "application/json";

    private V8 v8;
    private final BlockingQueue<FutureTask<?>> queries = new LinkedBlockingQueue<>();
    private final Context context;
    private static final String MODULE_ROOT = "v8/modules";
    private final Thread v8Thread;

    private final ScheduledExecutorService deferredFnExecutor = Executors.newScheduledThreadPool(1);
    private final Map<Integer, Pair<V8Function, ScheduledFuture>> timers = new HashMap<>();
    private int mTimerCtr = 0;

    V8Engine(final Context context) {
        this.context = context.getApplicationContext();

        // create a thread which will run tasks on the javascript engine. All calls to V8 must be
        // done from the same thread as that which the runtime was created.
        v8Thread = new Thread(new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "start runtime");
                v8 = V8.createV8Runtime();

                // Provide some core expected functions to the plain JS engine (e.g. setTimeout/setInterval)
                v8.registerJavaMethod(V8Engine.this, "setTimeout", "setTimeout", new Class<?>[]{V8Function.class, Integer.class});
                v8.registerJavaMethod(V8Engine.this, "setInterval", "setInterval", new Class<?>[]{V8Function.class, Integer.class});
                v8.registerJavaMethod(V8Engine.this, "clearInterval", "clearInterval", new Class<?>[]{Integer.class});
                v8.registerJavaMethod(V8Engine.this, "httpHandler", "httpHandler", new Class<?>[]{String.class, String.class, V8Function.class, V8Function.class, Integer.class, String.class});
                v8.registerJavaMethod(V8Engine.this, "readTempFile", "readTempFile", new Class<?>[]{String.class, V8Function.class});
                v8.registerJavaMethod(V8Engine.this, "writeTempFile", "writeTempFile", new Class<?>[]{String.class, String.class});
                v8.registerJavaMethod(V8Engine.this, "mkTempDir", "mkTempDir", new Class<?>[]{String.class});
                v8.registerJavaMethod(V8Engine.this, "readFile", "readFileNative", new Class<?>[]{String.class, V8Function.class});
                v8.registerJavaMethod(V8Engine.this, "writeFile", "writeFileNative", new Class<?>[]{String.class, String.class});

                // loadSubScript function: to allow the extension to dynamically load libraries
                v8.registerJavaMethod(new JavaVoidCallback() {
                    @Override
                    public void invoke(V8Object v8Object, V8Array v8Array) {
                        String path = v8Array.get(0).toString();
                        Log.d(TAG, path);
                        loadJavascriptSource(MODULE_ROOT + path);
                    }
                }, "loadSubScript");

                // logDebug: bridge from JS to android log.
                v8.registerJavaMethod(new JavaVoidCallback() {
                    @Override
                    public void invoke(V8Object v8Object, V8Array v8Array) {
                        final String msg = v8Array.get(0).toString();
                        final String key = v8Array.get(1).toString();
                        Log.d(TAG, key +": " + msg);
                    }
                }, "logDebug");

                // _md5Native: Java implementation of md5 hashing.
                v8.registerJavaMethod(new JavaCallback() {
                    @Override
                    public Object invoke(V8Object v8Object, V8Array v8Array) {
                        final String input = v8Array.getString(0);
                        try {
                            MessageDigest md = MessageDigest.getInstance("MD5");
                            byte[] messageDigest = md.digest(input.getBytes());
                            StringBuffer hexString = new StringBuffer();

                            for (byte bMd5 : messageDigest) {
                                String h = Integer.toHexString(0xFF & bMd5);
                                while (h.length() < 2)
                                    h = "0" + h;
                                hexString.append(h);
                            }

                            return hexString.toString();
                        } catch (NoSuchAlgorithmException e) {
                            Log.e(TAG, "no md5", e);
                        }
                        return "";
                    }
                }, "_md5Native");

                // Executor loop: take and process queries offered to the queue
                while (!v8.isReleased()) {
                    try {
                        FutureTask<?> task = queries.take();
                        task.run();
                    } catch (InterruptedException e) {
                        Log.e(TAG, "Task timeout", e);
                    }
                }

            }
        });
        // start V8 thread
        v8Thread.start();

    }

    public void finalize() {
        // release JS engine resources and shutdown executor thread.
        v8.release();
        try {
            v8Thread.join();
        } catch (InterruptedException e) {

        }
    }

    /**
     * Executes a Javascript source file in the V8 engine.
     * <p/>
     * Note: must be called on v8 thread.
     *
     * @param assetPath Path to JS file to load, relative to asset root.
     */
    protected void loadJavascriptSource(String assetPath) {
        InputStream stream = null;
        Log.d(TAG, "Load script " + assetPath);
        try {
            stream = context.getAssets().open(assetPath);
            BufferedReader srcReader = new BufferedReader(new InputStreamReader(stream));
            String script = "";
            String line;
            while ((line = srcReader.readLine()) != null) {
                script += line + "\n";
            }
            v8.executeScript(script, assetPath, 0);
        } catch (IOException e) {
            Log.e(TAG, Log.getStackTraceString(e));
        } finally {
            try {
                if (stream != null) {
                    stream.close();
                }
            } catch (IOException e) {
            }
        }
    }

    public <V> V queryEngine(final Query<V> q) throws InterruptedException, ExecutionException, TimeoutException {
        return queryEngine(q, 0);
    }

    public <V> V queryEngine(final Query<V> q, final int msTimeout)  throws InterruptedException, ExecutionException, TimeoutException {
        return queryEngine(q, msTimeout, false);
    }

    /**
     * Send a Query to the javascript engine.
     * <p/>
     * May be called from any thread. The task is safely submitted to the v8 thread, which processes
     * the query in turn, at which point this function will return the result.
     *
     * @param q         A Query containing calls to be run on the v8 thread, and a possible return value
     * @param msTimeout an integer timeout in MS for this query. If there is no result within this time at TimeoutException is thrown. If the timeout is 0, the query will never timeout
     * @param <V>       The return type of the query
     * @return The value returned from the query
     * @throws InterruptedException
     * @throws ExecutionException
     * @throws TimeoutException     if the query blocks for more than msTimeout ms.
     */
    public <V> V queryEngine(final Query<V> q, final int msTimeout, final boolean async) throws InterruptedException, ExecutionException, TimeoutException {
        FutureTask<V> future = new FutureTask<V>(new Callable<V>() {
            @Override
            public V call() throws Exception {
                return q.query(v8);
            }
        });
        queries.add(future);
        if (async) {
            return null;
        }
        if (msTimeout > 0) {
            try {
                return future.get(msTimeout, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                future.cancel(true);
                throw e;
            }
        } else {
            return future.get();
        }
    }

    /**
     * Submit a Query to the javscript engine without blocking.
     *
     * @param q A Query containing calls to be run on the v8 thread
     * @throws InterruptedException
     * @throws ExecutionException
     */
    public void asyncQuery(final Query<?> q) throws InterruptedException, ExecutionException {
        try {
            queryEngine(q, 0, true);
        } catch (TimeoutException e) {
            // this shouldn't be possible
        }
    }

    /**
     * Asynchronous task to be run on the javascript engine.
     *
     * @param <V> Return type of the query
     */
    public interface Query<V> {
        /**
         * Query the javascript engine and return a result value
         *
         * @param runtime
         * @return
         */
        V query(V8 runtime);
    }

    /**
     * Run javascript function after specified interval.
     *
     * @param func        Callback function
     * @param timeoutMsec Milliseconds to wait
     */
    public void setTimeout(V8Function func, Integer timeoutMsec) {
        final V8Function callback = (V8Function) func.twin();
        deferredFnExecutor.schedule(new Runnable() {
            @Override
            public void run() {
                try {
                    queryEngine(new Query<Object>() {

                        public Object query(V8 runtime) {
                            callback.call(callback, null);
                            callback.release();
                            return null;
                        }
                    });
                } catch (InterruptedException | ExecutionException | TimeoutException e) {
                    Log.e(TAG, "Exception in setTimeout", e);
                }
            }
        }, timeoutMsec, TimeUnit.MILLISECONDS);
    }

    /**
     * Run javascript function periodically at the specified period
     *
     * @param func     Callback function
     * @param interval Milliseconds between each call
     * @return Integer timerId which can be used to cancel this interval.
     */
    public Integer setInterval(V8Function func, Integer interval) {
        final V8Function callback = (V8Function) func.twin();
        final int timerId = mTimerCtr++;
        ScheduledFuture future = deferredFnExecutor.scheduleWithFixedDelay(new Runnable() {
            @Override
            public void run() {
                try {
                    queryEngine(new Query<Object>() {

                        public Object query(V8 runtime) {
                            callback.call(callback, null);
                            return null;
                        }
                    });
                } catch (InterruptedException | ExecutionException | TimeoutException e) {
                    Log.e(TAG, "Exception in setInterval", e);
                }
            }
        }, interval, interval, TimeUnit.MILLISECONDS);
        timers.put(timerId, Pair.create(callback, future));
        return timerId;
    }

    /**
     * Stop running callbacks for the specified interval created with setInterval
     *
     * @param timerId Integer id returned from setInterval
     */
    public void clearInterval(Integer timerId) {
        Pair<V8Function, ScheduledFuture> timer = timers.get(timerId);
        if (timer != null) {
            V8Function callback = timer.first;
            ScheduledFuture future = timer.second;

            if (!future.isDone() && !future.isCancelled()) {
                future.cancel(false);
            }

            timers.remove(timerId);
            if (!callback.isReleased())
                callback.release();
        }
    }

    /**
     * Requests data from http and file resources, and returns the data via callback.
     * <p/>
     * This implementation is non-blocking - the request is run in a separate thread, so as to
     * not block the javascript engine.
     * <p/>
     * HTTP requests are only made on a Wifi connection, file requests are always served.
     *
     * @param method       HTTP method
     * @param requestedUrl url to request
     * @param callback     V8Function callback for request content
     * @param onerror      V8Function callback on error
     * @param timeout      Integer request timeout in milliseconds
     * @param data         Data to sent (for POST request)
     * @return
     */
    public boolean httpHandler(final String method, final String requestedUrl, final V8Function callback, V8Function onerror, final Integer timeout, final String data) {
        final V8Function successCallback = (V8Function) callback.twin();
        final V8Function errorCallback = (V8Function) onerror.twin();
        Log.d(TAG, "httpHandler " + requestedUrl);

        // do http request in deferred thread
        deferredFnExecutor.schedule(new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "fetch " + requestedUrl);

                // make http request
                final StringBuilder responseData = new StringBuilder();
                int responseCode = 0;
                boolean error = false;

                if (requestedUrl.startsWith("file://")) {
                    // load resource from filesystem
                    try {
                        DataInputStream in = new DataInputStream(context.getAssets().open(requestedUrl.substring(8)));
                        BufferedReader lines = new BufferedReader(new InputStreamReader(in, "UTF-8"));
                        while (true) {
                            String line = lines.readLine();
                            if (line == null) {
                                break;
                            } else {
                                responseData.append(line);
                                responseData.append("\n");
                            }
                        }
                    } catch (IOException e) {
                        Log.e(TAG, Log.getStackTraceString(e));
                        error = true;
                    }
                } else {
                    ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
                    NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
                    if (activeNetwork == null || !activeNetwork.isConnectedOrConnecting() || activeNetwork.getType() != ConnectivityManager.TYPE_WIFI) {
                        // drop requests when not on wifi
                        Log.d(TAG, "httpHandler: not on Wifi connection");
                        error = true;
                    } else {
                        HttpURLConnection httpURLConnection = null;
                        try {
                            URL url = new URL(requestedUrl);
                            httpURLConnection = (HttpURLConnection) url.openConnection();
                            httpURLConnection.setRequestMethod(method);
                            httpURLConnection.setConnectTimeout(timeout);
                            httpURLConnection.setReadTimeout(timeout);

                            if (data != null && data.length() > 0) {
                                httpURLConnection.setRequestProperty(HEADER_CONTENT_TYPE, TYPE_JSON);
                                httpURLConnection.setDoOutput(true);
                                httpURLConnection.setUseCaches(false);
                                DataOutputStream dataOutputStream = new DataOutputStream(httpURLConnection.getOutputStream());
                                dataOutputStream.writeBytes(data);
                                dataOutputStream.close();
                            }

                            try {
                                httpURLConnection.connect();

                                Log.d(TAG, method +": " + requestedUrl +" ("+ httpURLConnection.getResponseCode() +") ");
                                DataInputStream in = new DataInputStream(httpURLConnection.getInputStream());
                                BufferedReader lines = new BufferedReader(new InputStreamReader(in, "UTF-8"));
                                while (true) {
                                    String line = lines.readLine();
                                    if (line == null) {
                                        break;
                                    } else {
                                        responseData.append(line);
                                        responseData.append("\n");
                                    }
                                }
                            } finally {
                                httpURLConnection.disconnect();
                            }

                            responseCode = httpURLConnection.getResponseCode();

                        } catch (IOException e) {
                            Log.e(TAG, "Exception making Http request", e);
                            error = true;
                        }
                    }
                }

                // send data back to callback
                final boolean finalError = error;
                final int finalResponse = responseCode;

                try {
                    queryEngine(new Query<Object>() {
                        public Object query(V8 context) {
                            V8Object resp = new V8Object(context);
                            V8Array callbackArgs = new V8Array(context);
                            try {
                                if (finalError) {
                                    errorCallback.call(errorCallback, new V8Array(v8));
                                } else {
                                    resp.add("status", finalResponse);
                                    resp.add("responseText", responseData.toString());
                                    resp.add("response", responseData.toString());
                                    successCallback.call(successCallback, callbackArgs.push(resp));
                                }
                            } finally {
                                successCallback.release();
                                errorCallback.release();
                                callbackArgs.release();
                                resp.release();
                            }
                            return null;
                        }
                    });
                } catch (ExecutionException | InterruptedException | TimeoutException e) {
                    Log.e(TAG, Log.getStackTraceString(e));
                }


            }
        }, 0, TimeUnit.MILLISECONDS);
        return true;
    }

    /**
     * Read a file from temporary storage, then send the response to the javascript callback
     *
     * @param path     String file path to read
     * @param callback V8Function function to callback with data
     */
    public void readTempFile(final String path, final V8Function callback) {
        File f = new File(context.getCacheDir(), path);
        Log.d(TAG, "Read " + f.getPath());
        FileInputStream inputStream;
        StringBuilder fileData = new StringBuilder();
        V8Array respArgs = new V8Array(v8);
        if (f.exists()) {
            try {
                inputStream = new FileInputStream(f);
                BufferedReader lines = new BufferedReader(new InputStreamReader(inputStream));
                while (true) {
                    String line = lines.readLine();
                    if (line == null) {
                        break;
                    } else {
                        fileData.append(line);
                        fileData.append("\n");
                    }
                }
                inputStream.close();
            } catch (IOException e) {
                Log.e(TAG, Log.getStackTraceString(e));
            }
            callback.call(callback, respArgs.push(fileData.toString()));
        } else {
            callback.call(callback, respArgs);
        }
        respArgs.release();
    }

    /**
     * Write a file to temporary storage
     *
     * @param path String file path to write
     * @param data String data to write into file
     */
    public void writeTempFile(final String path, final String data) {
        File f = new File(context.getCacheDir(), path);
        Log.d(TAG, "Write " + f.getPath());
        FileOutputStream outputStream;

        try {
            if (!f.exists()) {
                f.createNewFile();
            }
            outputStream = new FileOutputStream(f, false);
            outputStream.write(data.getBytes());
            outputStream.close();
        } catch (IOException e) {
            Log.e(TAG, Log.getStackTraceString(e));
        }
    }

    /**
     * Create a folder in temporary storage
     *
     * @param dir
     */
    public void mkTempDir(final String dir) {
        new File(context.getCacheDir(), dir).mkdir();
    }

    /**
     * Read from a file in the app's file system.
     *
     * @param path     String path to read
     * @param callback V8Function function to call back with file contents.
     */
    public void readFile(final String path, final V8Function callback) {
        StringBuilder fileData = new StringBuilder();
        V8Array respArgs = new V8Array(v8);
        try {
            FileInputStream fin = context.openFileInput(safePath(path));
            BufferedReader lines = new BufferedReader(new InputStreamReader(fin));
            while (true) {
                String line = lines.readLine();
                if (line == null) {
                    break;
                } else {
                    fileData.append(line);
                    fileData.append("\n");
                }
            }
            fin.close();
            Log.d(TAG, "Read: " + path + ", " + fileData.length() + "b");
            callback.call(callback, respArgs.push(fileData.toString()));
        } catch (FileNotFoundException e) {
            callback.call(callback, respArgs);
        } catch (IOException e) {
            Log.e(TAG, Log.getStackTraceString(e));
            callback.call(callback, respArgs);
        } catch (Exception e) {
            Log.e(TAG, Log.getStackTraceString(e));
        } finally {
            respArgs.release();
        }
    }

    /**
     * Write to a file in app's file system
     *
     * @param path String path to write
     * @param data String data to file to file.
     */
    public void writeFile(final String path, final String data) {
        Log.d(TAG, "Write: " + path + ", " + data.length() + "b");
        try {
            FileOutputStream fos = context.openFileOutput(safePath(path), Context.MODE_PRIVATE);
            fos.write(data.getBytes());
            fos.close();
        } catch (IOException e) {
            Log.e(TAG, Log.getStackTraceString(e));
        }
    }

    private static String safePath(String path) {
        return path.replace('/', '_');
    }
}
