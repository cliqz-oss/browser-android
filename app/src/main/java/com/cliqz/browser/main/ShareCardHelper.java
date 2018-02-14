package com.cliqz.browser.main;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.R;
import com.cliqz.utils.StringUtils;
import com.cliqz.utils.ViewUtils;

import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;

/**
 * @author Ravjit Uppal
 */
class ShareCardHelper {

    private static final String TAG = ShareCardHelper.class.getSimpleName();
    private int cardWidth;
    private int cardHeight;
    private String cardHtmlContent;
    private String title;
    private ViewGroup container;
    private Activity activity;

    ShareCardHelper(Activity activity, ViewGroup container, JSONObject cardDetails) {
        this.cardHeight = cardDetails.optInt("height", -1);
        this.cardWidth = cardDetails.optInt("width", -1);
        this.cardHtmlContent = cardDetails.optString("html", "");
        this.title = cardDetails.optString("title", "");
        this.container = container;
        this.activity = activity;
        shareCard();
    }

    private void shareCard() {
        if (cardHeight == -1 || cardWidth == -1 || cardHtmlContent.equals("")) {
            Log.e(TAG, "Invalid parameters provided for sharing the card");
        } else {
            PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(activity, new PermissionsResultAction() {
                @Override
                public void onGranted() {
                    final WebView screenShotWebview = new WebView(activity); //temp webview to draw the cardhtml
                    screenShotWebview.setX(container.getWidth()); //move the webview outside the screen
                    ViewUtils.safelyAddView(container, screenShotWebview);
                    screenShotWebview.setVisibility(View.VISIBLE);
                    screenShotWebview.bringToFront();
                    ViewGroup.LayoutParams layoutParams = screenShotWebview.getLayoutParams();
                    layoutParams.width = (int) (cardWidth * screenShotWebview.getScale());
                    layoutParams.height = (int) (cardHeight * screenShotWebview.getScale());
                    screenShotWebview.setLayoutParams(layoutParams);
                    screenShotWebview.setWebViewClient(new ScreenShotWebViewClient());
                    //i hate you khaled. wrong quotation marks used.
                    //khaled will update it on wednesday after he is back from vacation
                    cardHtmlContent = cardHtmlContent.replaceAll("“", "\"");
                    cardHtmlContent = cardHtmlContent.replaceAll("”", "\"");
                    screenShotWebview.loadDataWithBaseURL("file:///android_asset/", cardHtmlContent,
                            "text/html", null, null);
                }

                @Override
                public void onDenied(String permission) {
                    Toast.makeText(activity, R.string.allow_write_permission, Toast.LENGTH_SHORT).show();
                }
            }, android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }
    }

    private void takeScreenShotAndSend(WebView screenShotWebview) {
        try {
            Thread.sleep(100); //required as webview takes some time to render after page has loaded
            final Bitmap image = Bitmap.createBitmap(screenShotWebview.getWidth(), screenShotWebview.getHeight(),
                    Bitmap.Config.ARGB_8888);
            final Canvas canvas = new Canvas(image);
            screenShotWebview.draw(canvas);
            String path = MediaStore.Images.Media.insertImage(activity.getContentResolver(), image,
                    "card_screenshot", null);
            container.removeView(screenShotWebview);
            final Uri screenshotUri = Uri.parse(path);
            final String footer = activity.getString(R.string.shared_using);
            final Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_SUBJECT, activity.getString(R.string.share_card_email_subject));
            intent.putExtra(Intent.EXTRA_TEXT, title);
            intent.putExtra(Intent.EXTRA_STREAM, screenshotUri);
            intent.setType("image/png");
            activity.startActivity(Intent.createChooser(intent, activity.getString(R.string.share_link)));
        } catch (InterruptedException e) {
            Log.e(TAG, "Error while taking screenshot", e);
        }
    }

    private class ScreenShotWebViewClient extends WebViewClient {

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            takeScreenShotAndSend(view);
        }
    }

}
