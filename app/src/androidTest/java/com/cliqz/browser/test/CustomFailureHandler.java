package com.cliqz.browser.test;

import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Environment;
import android.view.View;

import androidx.test.espresso.FailureHandler;
import androidx.test.espresso.base.DefaultFailureHandler;

import com.cliqz.browser.utils.WindowManagerGlobal;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Date;

import static android.text.format.DateFormat.format;

/**
 * @author Kiiza Joseph Bazaare
 */
public class CustomFailureHandler implements FailureHandler {
    private final FailureHandler delegate;
    private final Activity mActivity;

    public CustomFailureHandler(Activity activity) {
        delegate = new DefaultFailureHandler(activity);
        this.mActivity = activity;
    }

    @Override
    public void handle(Throwable error, org.hamcrest.Matcher<View> viewMatcher) {
        takeScreenshot();
        delegate.handle(error, viewMatcher);
    }

    private void takeScreenshot() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final String now = format("yyyy-MM-dd_hh:mm:ss", new Date()).toString();
                // In Test droid Cloud, taken screenshots are always stored
                // under /test-screenshots/ folder and this ensures those screenshots
                // be shown under Test Results
                final File path =
                        new File(Environment.getExternalStorageDirectory(), "/test-screenshots/");
                // Path does not exist and we can not create it
                if (!path.isDirectory() && !path.mkdirs()) {
                    // TODO @Joseph: Please take appropriate action here
                    return;
                }

                View scrView = getTopMostWindow();
                if (scrView == null) {
                    return;
                }
                mActivity.getWindow();
//                View scrView = Activity.getActivity().getWindow().getDecorView().getRootView();
                scrView.setDrawingCacheEnabled(true);
                Bitmap bitmap = Bitmap.createBitmap(scrView.getDrawingCache());
                scrView.setDrawingCacheEnabled(false);
                OutputStream out = null;
                try {
                    File imageFile = new File(path, now + ".png");
                    out = new FileOutputStream(imageFile);
                    bitmap.compress(Bitmap.CompressFormat.PNG, 90, out);
                    out.flush();
                } catch (IOException e) {
                    // exception
                } finally {

                    try {
                        if (out != null) {
                            out.close();
                        }
                    } catch (Exception ignored) {
                    }

                }
            }
        });
    }

    private View getTopMostWindow() {
        final String[] names = WindowManagerGlobal.getViewRootNames();
        for (String name: names) {
            final View window = WindowManagerGlobal.getRootView(name);
            if (window.getVisibility() == View.VISIBLE && window.hasWindowFocus()) {
                return window;
            }
        }
        return null;
    }
}
