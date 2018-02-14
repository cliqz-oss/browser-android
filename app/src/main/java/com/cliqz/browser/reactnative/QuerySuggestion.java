package com.cliqz.browser.reactnative;

import android.os.Handler;
import android.os.Looper;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;

import java.util.ArrayList;

import javax.inject.Inject;

/**
 * @author Moaz Mohamed
 * @author Stefano Pacifici
 */
public class QuerySuggestion extends ReactContextBaseJavaModule {

    private static final String name = "QuerySuggestion";
    private final Handler handler;

    @Inject
    Bus bus;

    public QuerySuggestion(ReactApplicationContext reactContext) {
        super(reactContext);

        handler = new Handler(Looper.getMainLooper());

        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public String getName() {
        return name;
    }

    @ReactMethod
    public void showQuerySuggestions(String query, ReadableArray suggestions) {
        final String safeQuery = query != null ? query : "";
        if (suggestions == null || suggestions.size() == 0) {
            postSuggestions(safeQuery, new String[0]);
            return;
        }

        final int suggsSize = suggestions.size();
        final ArrayList<String> out = new ArrayList<>(suggsSize);
        for (int i = 0; i < suggsSize; i++) {
            if (!suggestions.isNull(i)) {
                out.add(suggestions.getDynamic(i).asString());
            }
        }
        final String[] outArray = out.toArray(new String[out.size()]);
        postSuggestions(safeQuery, outArray);
    }

    private void postSuggestions(final String query, final String[] suggestions) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                bus.post(new Messages.QuerySuggestions(query, suggestions));
            }
        });
    }
}
