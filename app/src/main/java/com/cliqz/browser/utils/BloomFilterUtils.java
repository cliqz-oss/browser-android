package com.cliqz.browser.utils;

import android.util.Log;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.minibloomfilter.BloomFilter;

import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;

/**
 * Created by Ravjit on 27/09/16.
 */
public class BloomFilterUtils {
    private static final String TAG = BloomFilterUtils.class.getSimpleName();
    private BloomFilter bloomFilter;

    public BloomFilterUtils() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                InputStream inputStream = null;
                try {
                    inputStream = BrowserApp.getAppContext().getAssets().open("bloomfilter.data");
                    ObjectInputStream objectInputStream = new ObjectInputStream(inputStream);
                    Object object = objectInputStream.readObject();
                    if (object instanceof BloomFilter) {
                        bloomFilter = (BloomFilter) object;
                    }
                    inputStream.close();
                } catch (IOException e) {
                    Log.e(TAG, "IOException while reading filter data", e);
                } catch (ClassNotFoundException e) {
                    Log.e(TAG, "ClassNotFound Exception while reading filter data", e);
                }
            }
        }).start();
    }

    public boolean contains(String domain) {
        if (bloomFilter == null) {
            return false;
        }
        return bloomFilter.maybe(domain);
    }

}
