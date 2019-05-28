package com.cliqz.browser.utils;

import android.content.Context;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapRegionDecoder;
import android.graphics.Rect;
import android.graphics.drawable.BitmapDrawable;
import androidx.annotation.ColorInt;
import androidx.annotation.NonNull;
import androidx.annotation.UiThread;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.facebook.common.memory.PooledByteBuffer;
import com.facebook.common.memory.PooledByteBufferInputStream;
import com.facebook.common.references.CloseableReference;
import com.facebook.datasource.DataSource;
import com.facebook.datasource.DataSubscriber;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.imagepipeline.request.ImageRequest;

import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 *@author Stefano Pacifici
 */
public class AppBackgroundManager {

    private enum Mode {
        COLOR,
        IMAGE
    }
    private static final String TAG = AppBackgroundManager.class.getSimpleName();

    private static final String BACKGROUND_IMAGE_URL_FORMAT = BuildConfig.DEBUG ?
            "https://cdn.cliqz.com/mobile/background/android/staging/%s_%d.jpg" :
            "https://cdn.cliqz.com/mobile/background/android/production/%s_%d.jpg";
    private static final int MIN_BACKGROUND_SIZE = 240;
    private static final int MAX_BACKGROUND_SIZE = 3840;
    private static final int SIZE_DELTA = 120;
    private static final long LAYOUT_SAFE_DELAY = 250L;

    private final DisplayMetrics displayMetrics = new DisplayMetrics();
    private final Executor executor = Executors.newSingleThreadExecutor();
    private final Resources resources;
    private final String backgroundImageUri;
    private final int backgroundSize;
    private final Map<String, BitmapDrawable> portraitCache = new HashMap<>();
    private final Map<String, BitmapDrawable> landscapeCache = new HashMap<>();

    public AppBackgroundManager(Context context) {
        resources = context.getResources();
        WindowManager windowManager = (WindowManager) context.getApplicationContext()
                .getSystemService(Context.WINDOW_SERVICE);
        if (windowManager != null) {
            windowManager.getDefaultDisplay().getMetrics(displayMetrics);
        }
        // Find the right image size
        final int screenSize = Math.max(displayMetrics.widthPixels, displayMetrics.heightPixels);
        final int q = screenSize / SIZE_DELTA;
        final int r = screenSize % SIZE_DELTA;
        backgroundSize = (q * SIZE_DELTA) + (r > 0 ? SIZE_DELTA : 0);
        if (backgroundSize < MIN_BACKGROUND_SIZE || backgroundSize > MAX_BACKGROUND_SIZE) {
            Log.e(TAG, "No valid image size found: " + backgroundSize);
            backgroundImageUri = null;
        } else {
            backgroundImageUri = String.format(Locale.US,
                    BACKGROUND_IMAGE_URL_FORMAT, "default", backgroundSize);
        }
    }

    @UiThread
    public void setViewBackgroundColor(@NonNull View view, @ColorInt int color) {
        view.setTag(R.id.background_manager_mode_key, Mode.COLOR);
        removeLayoutChangedListener(view);
        view.setBackgroundColor(color);
    }

    @UiThread
    private void removeLayoutChangedListener(View view) {
        final LayoutChangedListener listener =
                (LayoutChangedListener) view.getTag(R.id.background_manager_listener_key);
        if (listener != null) {
            view.removeOnLayoutChangeListener(listener);
            view.setTag(R.id.background_manager_listener_key, null);
        }
    }

    @UiThread
    public void setViewBackground(@NonNull final View view, @ColorInt int fallbackColor) {
        if (view.getTag(R.id.background_manager_mode_key) == Mode.IMAGE) {
            // Every thing is already in place, we have nothing to do here
            return;
        }
        view.setTag(R.id.background_manager_mode_key, Mode.IMAGE);
        view.setBackgroundColor(fallbackColor);
        addLayoutChangedListener(view);

        view.postDelayed(new Runnable() {
            @Override
            public void run() {
                internalSetViewBackground(view);
            }
        }, LAYOUT_SAFE_DELAY);
    }

    private Rect genBitmapRect(View view) {
        final int screenWitdh;
        final int screenHeight;
        final int orientation = resources.getConfiguration().orientation;
        if (orientation == Configuration.ORIENTATION_PORTRAIT) {
            screenWitdh = Math.min(displayMetrics.widthPixels, displayMetrics.heightPixels);
            screenHeight = Math.max(displayMetrics.widthPixels, displayMetrics.heightPixels);
        } else {
            screenWitdh = Math.max(displayMetrics.widthPixels, displayMetrics.heightPixels);
            screenHeight = Math.min(displayMetrics.widthPixels, displayMetrics.heightPixels);
        }
        final int[] location = new int[2];
        view.getLocationOnScreen(location);
        final int offLeft = (backgroundSize - screenWitdh) / 2;
        final int offTop = (backgroundSize - screenHeight) / 2;
        final int l = offLeft + location[0];
        final int t = offTop + Math.max(0, location[1]);
        final int r = l + view.getWidth();
        final int b = t + view.getHeight();
        return new Rect(l, t, r, b);
    }

    @UiThread
    private void internalSetViewBackground(View view) {
        // Somebody set a color, we do not set the background view
        if (!Mode.IMAGE.equals(view.getTag(R.id.background_manager_mode_key))) {
            return;
        }

        // Select the correct cache
        final Map<String, BitmapDrawable> cache = getOrientedCache();

        // Check if we have the right bitmap in the cache
        final Rect bitmapRect = genBitmapRect(view);
        final BitmapDrawable bitmapDrawable = cache.get(bitmapRect.flattenToString());
        if (bitmapDrawable != null)  {
            view.setBackground(bitmapDrawable);
        } else {
            // Schedule cache entry creation
            final DataSource<CloseableReference<PooledByteBuffer>> dataSource = Fresco
                    .getImagePipeline()
                    .fetchEncodedImage(ImageRequest.fromUri(backgroundImageUri), null);
            dataSource.subscribe(new Subscriber(view), executor);
        }
    }

    private Map<String, BitmapDrawable> getOrientedCache() {
        final int orientation = resources.getConfiguration().orientation;
        if (orientation == Configuration.ORIENTATION_PORTRAIT) {
            landscapeCache.clear();
            return portraitCache;
        } else {
            portraitCache.clear();
            return landscapeCache;
        }
    }

    @UiThread
    private void addLayoutChangedListener(View view) {
        LayoutChangedListener listener =
                (LayoutChangedListener) view.getTag(R.id.background_manager_listener_key);
        if (listener == null) {
            final LayoutChangedListener newListener = new LayoutChangedListener(view);
            view.addOnLayoutChangeListener(newListener);
            view.setTag(R.id.background_manager_listener_key, newListener);
        }
    }

    private class LayoutChangedListener implements View.OnLayoutChangeListener {

        private final View view;

        LayoutChangedListener(View view) {
            this.view = view;
        }

        @Override
        public void onLayoutChange(View v, int left, int top, int right, int bottom,
                                   int oldLeft, int oldTop, int oldRight, int oldBottom) {
            final int width = right - left;
            final int height = bottom - top;
            final boolean layoutHasChanged = left != oldLeft || top != oldTop ||
                    right != oldRight || bottom != oldBottom;
            final boolean hasValidDimensions = width != 0 && height != 0;
            if (layoutHasChanged && hasValidDimensions) {
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, String.format(Locale.US, "Layout changed - %d %d %d %d",
                            left, top, right, bottom));
                }
                view.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        internalSetViewBackground(view);
                    }
                }, LAYOUT_SAFE_DELAY);
            }
        }
    }

    private class Subscriber implements DataSubscriber<CloseableReference<PooledByteBuffer>> {
        private final View view;

        Subscriber(View view) {
            this.view = view;
        }

        @Override
        public void onNewResult(DataSource<CloseableReference<PooledByteBuffer>> dataSource) {
            try {
                generateBackgroundImage(dataSource.getResult());
            } finally {
                dataSource.close();
            }
        }

        private void generateBackgroundImage(CloseableReference<PooledByteBuffer> ref) {
            if (ref == null) {
                return;
            }
            try {
                final Rect bitmapRect = genBitmapRect(view);
                final Map<String, BitmapDrawable> cache = getOrientedCache();
                if (cache.containsKey(bitmapRect.flattenToString()) ||
                        bitmapRect.width() == 0 || bitmapRect.height() == 0) {
                    return;
                }
                final PooledByteBufferInputStream is = new PooledByteBufferInputStream(ref.get());
                final BitmapRegionDecoder regionDecoder = BitmapRegionDecoder.newInstance(is, false);
                final BitmapFactory.Options options = new BitmapFactory.Options();
                options.inSampleSize = 2;
                final Bitmap bitmap = regionDecoder.decodeRegion(bitmapRect, options);
                final BitmapDrawable background = new BitmapDrawable(resources, bitmap);
                cache.put(bitmapRect.flattenToString(), background);
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "New bitmap generated for " + bitmapRect.flattenToString());
                }
                view.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        internalSetViewBackground(view);
                    }
                }, LAYOUT_SAFE_DELAY);
            } catch (OutOfMemoryError e) {
                Log.e(TAG, "Not enough memory to decode the bitmap");
            } catch (IllegalArgumentException|IOException e) {
                Log.e(TAG, "Error decoding background", e);
            } finally {
                ref.close();
            }
        }

        @Override
        public void onFailure(DataSource<CloseableReference<PooledByteBuffer>> dataSource) {

        }

        @Override
        public void onCancellation(DataSource<CloseableReference<PooledByteBuffer>> dataSource) {

        }

        @Override
        public void onProgressUpdate(DataSource<CloseableReference<PooledByteBuffer>> dataSource) {

        }
    }
}
