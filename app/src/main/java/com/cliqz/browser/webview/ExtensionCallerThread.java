package com.cliqz.browser.webview;

import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import androidx.annotation.NonNull;

import com.cliqz.browser.R;

import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.CountDownLatch;

/**
 * @author Stefano Pacifici
 */
class ExtensionCallerThread extends Thread {

    private static final long MESSAGE_DELAY = 100L;

    private final CliqzBridge bridge;
    private final CountDownLatch latch = new CountDownLatch(1);
    private Handler handler;

    ExtensionCallerThread(CliqzBridge bridge) {
        super("ExtensionCallerThread");
        this.bridge = bridge;
    }

    // Read the docs about Handler leak, they are funny
    @SuppressWarnings("HandlerLeak")
    @Override
    public void run() {
        Looper.prepare();
        handler = new MessagesToExtensionHandler();
        latch.countDown();
        Looper.loop();
    }

    @NonNull
    Handler getHandler() {
        try {
            latch.await();
            return handler;
        } catch (InterruptedException e) {
            throw new RuntimeException("Thread killed before getting a valid handler", e);
        }
    }

    private class MessagesToExtensionHandler extends Handler {

        private final List<String> jsCallsQueue = new LinkedList<>();
        boolean extensionReady = false;

        @Override
        public void handleMessage(Message msg) {
            super.handleMessage(msg);
            switch (msg.what) {
                case R.id.msg_extension_ready:
                    extensionReady = true;
                    // Run all the calls
                    for (String call: jsCallsQueue) {
                        bridge.executeJavascriptOnMainThread(call);
                    }
                    jsCallsQueue.clear();
                    break;
                case R.id.msg_execute_javascript_function:
                    if (extensionReady) {
                        bridge.executeJavascriptOnMainThread((String) msg.obj);
                    } else {
                        jsCallsQueue.add((String) msg.obj);
                    }
                    break;
                case R.id.msg_kill_caller_thread:
                    getLooper().quit();
                    break;
            }
        }
    }
}
