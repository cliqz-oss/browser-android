package com.cliqz.browser.utils;

import android.util.Log;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.minibloomfilter.BloomFilter;

import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;

import timber.log.Timber;

/**
 * Created by Ravjit on 27/09/16.
 */
public class BloomFilterUtils {
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
                    Timber.e(e, "IOException while reading filter data");
                } catch (ClassNotFoundException e) {
                    Timber.e(e, "ClassNotFound Exception while reading filter data");
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
