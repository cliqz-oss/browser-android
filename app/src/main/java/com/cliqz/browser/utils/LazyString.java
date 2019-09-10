package com.cliqz.browser.utils;

import android.content.res.Resources;

import androidx.annotation.NonNull;
import androidx.annotation.RawRes;

import com.cliqz.utils.StreamUtils;

import java.io.IOException;
import java.io.InputStream;

import timber.log.Timber;

public abstract class LazyString {

    private String content = null;

    @NonNull
    protected abstract String load();

    @NonNull
    @Override
    public String toString() {
        return getString();
    }

    @NonNull
    public final String getString() {
        if (content == null) {
            synchronized (this) {
                while (content == null) {
                    content = load();
                }
            }
        }
        return content;
    }

    @NonNull
    public static LazyString fromRawResource(@NonNull Resources resources, @RawRes int resId) {
        return new RawResourcesLazyString(resources, resId);
    }

    private static class RawResourcesLazyString extends LazyString {
        private final Resources resources;
        private final int resId;

        public RawResourcesLazyString(Resources resources, int resId) {
            this.resources = resources;
            this.resId = resId;
        }

        @NonNull
        @Override
        protected String load() {
            final InputStream is = resources.openRawResource(resId);
            final String result = StreamUtils.readTextStream(is);
            try {
                is.close();
            } catch (IOException e) {
                Timber.d(e, "Error closing raw resource %d", resId);
            }
            return result;
        }
    }
}
