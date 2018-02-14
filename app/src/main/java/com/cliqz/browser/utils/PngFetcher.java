package com.cliqz.browser.utils;

import android.graphics.Bitmap;
import android.os.AsyncTask;

import com.cliqz.browser.overview.TabIconHolder;

/**
 * @author Ravjit Uppal
 */
public class PngFetcher extends AsyncTask<TabIconHolder, Void, Bitmap> {

    private static final String TAG = PngFetcher.class.getSimpleName();
    private TabIconHolder tabIconHolder;

    @Override
    protected Bitmap doInBackground(TabIconHolder... params) {
        tabIconHolder = params[0];
        return BitmapDownloader.downloadBitmap(tabIconHolder.iconUrl);
    }

    protected void onPostExecute(Bitmap image) {
        if (image != null) {
            tabIconHolder.iconView.setImageBitmap(image);
            tabIconHolder.iconBackGround.setBackgroundColor(image.getPixel(0,0));
        }
    }
}
