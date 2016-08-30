package com.cliqz.antitracking.test;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.util.Log;
import android.webkit.URLUtil;
import android.webkit.WebView;

import java.util.Deque;
import java.util.LinkedList;

/**
 * @author Stefano Pacifici
 * @date 2016/07/15
 */
public abstract class MessageQueue {

    public static final String TAG = MessageQueue.class.getSimpleName();
    private static final String URL = TAG + "/url";
    private static final String TIMESTAMP = TAG + "/timestamp";
    private static final long LOAD_PAGE_TIMEOUT = 60000; // 1 Minute
    private static final long HARD_TIMEOUT = 600000; // 10 Minutes

    enum MessageType {
        START_TEST,
        STOP,
        PAGE_STARTED,
        LOAD_PAGE,
        NEW_URL,
        NEW_BLOCKED_URL,
        PAGE_FINISHED,
        TIMEOUT,
        HARD_TIMEOUT
    }

    enum State {
        IDLE,
        WAITING_FOR_START,
        LOADING;

        String url = "";
        long startTime = 0;
        int requests = 0;
        int overriddenReuquests = 0;

        void reset() {
            url = "";
            startTime = 0;
            requests = 0;
            overriddenReuquests = 0;
        }
    }

    private Thread mThread;
    private MessageQueueHandler mHandler;
    private WebView mWebView;
    private State mState = State.IDLE;
    private Deque<String> mUrlsDeque;

    public boolean isRunning() {
        return (mThread != null && mThread.isAlive());
    }

    public void start() {
        mThread = new Thread(new Runnable() {
            @Override
            public void run() {
                Looper.prepare();
                mHandler = new MessageQueueHandler();
                Looper.loop();
            }
        }, "Message Queue");
        mThread.start();
    }

    public void stop() {
        if (mThread == null || !mThread.isAlive()) {
            return;
        }

        mHandler.sendMessage(mHandler.obtainMessage(MessageType.STOP.ordinal()));
    }

    public void startTest(Deque<String> urlsDeque, TestWebView webView) {
        this.mUrlsDeque = new LinkedList<>(urlsDeque);
        this.mWebView = webView;
        mHandler.sendMessageDelayed(
                mHandler.obtainMessage(MessageType.HARD_TIMEOUT.ordinal(), ""),
                HARD_TIMEOUT);

        mHandler.sendMessageDelayed(
                mHandler.obtainMessage(MessageType.START_TEST.ordinal(), ""),
                5000);
    }

    private void sendMessage(MessageType type, String url, long timestamp) {
        if (mThread == null || !mThread.isAlive()) {
            return;
        }

        final Message message = mHandler.obtainMessage(type.ordinal());
        final Bundle data = new Bundle();
        data.putString(URL, url);
        data.putLong(TIMESTAMP, timestamp);
        message.setData(data);
        mHandler.sendMessage(message);
    }

    void onPageStarted(String url, long timestamp) {
        sendMessage(MessageType.PAGE_STARTED, url, timestamp);
    }

    void onPageFinished(String url, long timestamp) {
        sendMessage(MessageType.PAGE_FINISHED, url, timestamp);
    }

    void loadPage(String url) {
        sendMessage(MessageType.LOAD_PAGE, url, -1);
    }

    void onNewUrl(String url) {
        sendMessage(MessageType.NEW_URL, url, -1);
    }

    public void onNewBlockedUrl(String url) {
        sendMessage(MessageType.NEW_BLOCKED_URL, url, -1);
    }

    private void load(Bundle data) {
        final String url = data.getString(URL);
        if (mState != State.IDLE) {
            Log.e(TAG, "CAN'T LOAD " + url + "! WRONG STATE");
            return;
        }

        Log.d(TAG, "LOAD PAGE: " + url);
        mState = State.WAITING_FOR_START;
        mState.url = url;
        mWebView.post(new Runnable() {
            @Override
            public void run() {
                mWebView.loadUrl(url);
            }
        });

        mHandler.sendEmptyMessageDelayed(MessageType.TIMEOUT.ordinal(), LOAD_PAGE_TIMEOUT);
    }

    private void loadStarted(Bundle data) {
        final String url = data.getString(URL);
        if (mState != State.WAITING_FOR_START) {
            Log.w(TAG, String.format(
                    "PAGE STARTED IN %s STATE: %s",
                    mState.toString(), url));
            return;
        }
        if (!mState.url.equals(url)) {
            Log.e(TAG, "PAGE STARTED FOR UNEXPECTED URL: " + url);
            return;
        }

        final long timestamp = data.getLong(TIMESTAMP);
        Log.d(TAG, "PAGE STARTED: " + url);
        mState = State.LOADING;
        mState.url = url;
        mState.startTime = timestamp;
    }

    private void loadFinished(Bundle data) {
        final String url = data.getString(URL);
        if (mState != State.LOADING) {
            Log.e(TAG, String.format(
                    "PAGE FINISHED IN %s STATE: %s",
                    mState.toString(), url));
            return;
        }

        Log.d(TAG, "PAGE COMPLETED: " + url);
        mHandler.removeMessages(MessageType.TIMEOUT.ordinal());
        completeLoad(url, data.getLong(TIMESTAMP));
    }

    private void timeout() {
        if (mState != State.LOADING) {
            Log.e(TAG, String.format(
                    "TIMEOUT IN STATE: %s",
                    mState.toString()));
            return;
        }

        Log.d(TAG, "PAGE TIMEOUT: " + mState.url);
        completeLoad(mState.url, mState.startTime + LOAD_PAGE_TIMEOUT);
    }

    private void hardTimeout(String url) {
        if (mState == State.LOADING) {
            if (url.equals(mState.url)) {
                Log.e(TAG, "HARD TIMEOUT: " + mState.url);
                mUrlsDeque.clear();
                done();
            } else {
                Log.i(TAG, "SCHEDULING HARD TIMEOUT");
                mHandler.sendMessageDelayed(
                        mHandler.obtainMessage(MessageType.HARD_TIMEOUT.ordinal(), mState.url),
                        HARD_TIMEOUT
                );
            }
        }
    }

    private void completeLoad(String url, long timestamp) {
        final Record record = new Record();
        record.origUrl = mState.url;
        record.loadedUrl = url;
        record.startTime = mState.startTime;
        record.endTime = timestamp;
        record.requests = mState.requests;
        record.overriddenRequests = mState.overriddenReuquests;
        mState.reset();
        mState = State.IDLE;
        pushRecord(record);
        loadNext();
    }

    private void loadNext() {
        if (!mUrlsDeque.isEmpty()) {
            final String url = URLUtil.guessUrl(mUrlsDeque.pop());
            loadPage(url);
        } else {
            done();
        }
    }

    public abstract void pushRecord(Record record);

    public abstract void done();

    private class MessageQueueHandler extends Handler {
        @Override
        public void handleMessage(Message msg) {
            final MessageType messageType = MessageType.values()[msg.what];
            switch (messageType) {
                case START_TEST:
                    loadNext();
                    break;
                case STOP:
                    Log.d(TAG, "STOPPING GRACEFULLY");
                    getLooper().quitSafely();
                    break;
                case LOAD_PAGE:
                    load(msg.getData());
                    break;
                case PAGE_STARTED:
                    loadStarted(msg.getData());
                    break;
                case PAGE_FINISHED:
                    loadFinished(msg.getData());
                case NEW_URL:
                    mState.requests++;
                    break;
                case NEW_BLOCKED_URL:
                    mState.overriddenReuquests++;
                    break;
                case TIMEOUT:
                    timeout();
                    break;
                case HARD_TIMEOUT:
                    hardTimeout((String) msg.obj);
                    break;
                default:
                    break;
            }
            // msg.recycle();
        }
    }
}
