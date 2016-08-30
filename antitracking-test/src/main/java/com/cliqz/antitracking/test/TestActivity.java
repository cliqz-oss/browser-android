package com.cliqz.antitracking.test;

import android.app.Dialog;
import android.app.ProgressDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.View;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;

public class TestActivity extends AppCompatActivity {

    private static final String TAG = TestActivity.class.getSimpleName();

    private static final String STATS_FORMAT = "" +
            "Mode: %s\n" +
            "Last loaded page: %s\n" +
            "Last page load time: %d ms\n" +
            "Global load time: %d ms\n" +
            "#pages: %d/%d\n" +
            "#urls loaded: %d\n" +
            "#urls overridden: %d";
    public static final String TEST_MODE = TAG + "/test_mode";
    public static final String ANTITRACKING_MODE = "antitracking";
    public static final String REGULAR_MODE = "regular";


    private FrameLayout mWebViewContainer;
    private TextView mStatsView;

    private Boolean mAntiTrackingMode = false;
    private List<Record> mStats;
    private long mGlobalLoadTime = 0l;
    private long mLoadedUrls = 0l;
    private long mOverriddenUrls = 0l;
    private int mLoadedPages = 0;
    private MessageQueue mMessageQueue;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_test);

        mWebViewContainer = (FrameLayout) findViewById(R.id.webview_container);
        mStatsView = (TextView) findViewById(R.id.stats);

        mAntiTrackingMode = ANTITRACKING_MODE.equals(getIntent().getStringExtra(TEST_MODE));
        mMessageQueue = new MessageQueue() {
            @Override
            public void pushRecord(final Record record) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        addToStats(record);
                    }
                });
            }

            @Override
            public void done() {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        writeStats();
                    }
                });
            }
        };
    }

    @Override
    public void onBackPressed() {
        final Dialog.OnClickListener listener = new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                switch (i) {
                    case Dialog.BUTTON_POSITIVE:
                        setResult(RESULT_CANCELED);
                        finish();
                        break;
                    default:
                        dialogInterface.dismiss();
                        break;
                }
            }
        };
        new AlertDialog.Builder(this)
                .setPositiveButton(R.string.quit, listener)
                .setNegativeButton(R.string.cancel, listener)
                .setMessage(R.string.do_you_really_want_to_quit)
                .show();
    }


    @Override
    protected void onResume() {
        super.onResume();
        mMessageQueue.start();
        runTest();
    }

    private void writeStats() {
        final String statsFileFormat = "force-block-stats-%d.csv"; /* mAntiTrackingMode ?
                "antitracking-stats-%d.csv" :
                "regular-stats-%d.csv";*/
        final String statsFileName = String.format(statsFileFormat,
                System.currentTimeMillis());
        final File statsPath = new File(getExternalFilesDir(null), statsFileName);
        final StatsWriter statsWriter = new StatsWriter(TestActivity.this, statsPath) {
            @Override
            void done() {
                setResult(RESULT_OK);
                finish();
            }
        };
        statsWriter.execute(mStats);
    }

    @Override
    protected void onDestroy() {
        if (mMessageQueue.isRunning()) {
            mMessageQueue.stop();
        }
        super.onDestroy();
    }

    private void runTest() {
        mStats = new ArrayList<>(TestSites.URLS.length);
        mGlobalLoadTime = 0l;
        mLoadedUrls = 0l;
        mOverriddenUrls = 0l;
        mLoadedPages = 0;

        mWebViewContainer.removeAllViews();
        final TestContext testContext = new TestContext(this);
        final TestWebViewClient client = mAntiTrackingMode ?
                new AntiTrackingWebViewClient(mMessageQueue, testContext) :
                new RegularWebViewClient(mMessageQueue);
        final TestWebView webView = new TestWebView(TestActivity.this);
        webView.setWebViewClient(client);
        mWebViewContainer.addView(webView);
        mMessageQueue.startTest(
                new LinkedList<>(Arrays.asList(TestSites.URLS)),
                webView);
    }

    private void addToStats(Record record) {
        if (record != null) {
            mStats.add(record);
            updateInterface(record);
        }
    }

    private void updateInterface(Record record) {
        final long loadTime = record.endTime - record.startTime;
        mGlobalLoadTime += Math.max(0l, loadTime);
        mLoadedUrls += record.requests;
        mOverriddenUrls += record.overriddenRequests;
        mLoadedPages++;
        final String message = String.format(Locale.US,
                STATS_FORMAT,
                mAntiTrackingMode ? "Anti-Tracking" : "Regular",
                record.origUrl,
                loadTime,
                mGlobalLoadTime,
                mLoadedPages,
                TestSites.URLS.length,
                mLoadedUrls,
                mOverriddenUrls);
        mStatsView.setText(message);
    }
}
