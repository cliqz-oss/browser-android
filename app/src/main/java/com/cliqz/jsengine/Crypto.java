package com.cliqz.jsengine;

import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.security.Key;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;

/**
 * @author Alex Catarineu
 */
public class Crypto extends ReactContextBaseJavaModule {
    private static final String E_NO_SUCH_ALGORITHM = "E_NO_SUCH_ALGORITHM";

    public Crypto(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "Crypto";
    }

    @ReactMethod
    public void generateRSAKey(final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
                    generator.initialize(2048);
                    KeyPair keyPair = generator.generateKeyPair();
                    Key key = keyPair.getPrivate();
                    String res = Base64.encodeToString(key.getEncoded(), Base64.NO_WRAP);
                    promise.resolve(res);
                } catch (NoSuchAlgorithmException e) {
                    promise.reject(E_NO_SUCH_ALGORITHM, e);
                    e.printStackTrace();
                }
            }
        }).start();
    }
}
