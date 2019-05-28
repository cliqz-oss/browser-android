package com.cliqz.browser.webview;

import androidx.annotation.NonNull;
import android.view.animation.Animation;
import android.webkit.URLUtil;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

import org.json.JSONException;
import org.json.JSONObject;

import javax.annotation.Nullable;

import acr.browser.lightning.bus.BrowserEvents;

import static acr.browser.lightning.utils.Utils.convertMapToJson;

/**
 * These messages replace older callback mechanism with a more generic message passing. We were
 * calling the callback inside the bridge, but the bridge should not be so dependant on the type
 * of the webview he is related to (especially since we reuse the same bridge for the freshtab).
 *
 * @author Stefano Pacifici
 * @author Moaz Rashad
 */
public class CliqzMessages {

    // No instances please
    private CliqzMessages() {
    }

    /**
     * Autocomplete callback from the extension
     */
    public static final class Autocomplete {
        public final String completion;

        public Autocomplete(String completion) {
            this.completion = completion;
        }
    }

    /**
     * The extension notify us it want to change the query string in the url bar
     */
    public static final class NotifyQuery {
        public final String query;

        NotifyQuery(String query) {
            this.query = query;
        }
    }

    /**
     * More generic message than open search result! Used by the FreshTab to open suggested article
     * or history element and by the search to open result pages. The reset flag is used when
     * opening a new tab in a new Task, it avoids the search screen to appear when back is pressed:
     * by navigating back to the trampoline, it will send an "Exit" message
     * ({@link BrowserEvents.CloseTab}).
     */
    public static final class OpenLink {
        public final String url;
        public final boolean reset;
        public final boolean fromHistory;
        public final Animation animation;

        private OpenLink(String url, boolean reset, boolean fromHistory, Animation animation) {
            this.url = URLUtil.guessUrl(url);
            this.reset = reset;
            this.fromHistory = fromHistory;
            this.animation = animation;
        }

        public static OpenLink open(String url) {
            return new OpenLink(url, false, false, null);
        }

        public static OpenLink open(String url, Animation animation) {
            return new OpenLink(url, false, false, animation);
        }

        public static OpenLink resetAndOpen(String url) {
            return new OpenLink(url, true, false, null);
        }

        public static OpenLink openFromHistory(String url) {
            return new OpenLink(url, false, true, null);
        }
    }

    public static final class OpenTab {
        public final boolean isValid;
        public final boolean isIncognito;
        @NonNull public final String title;
        @Nullable public final String url;

        public OpenTab(ReadableMap data) {
            if (data.hasKey("url")) {
                isValid = true;
                url = data.getString("url");
                if (data.hasKey("title")) {
                    title = data.getString("title");
                } else {
                    title = "";
                }
                isIncognito = data.hasKey("isPrivate") && data.getBoolean("isPrivate");
            } else {
                isValid = false;
                isIncognito = false;
                title = "";
                url = null;
            }
        }

        public OpenTab(@Nullable String url, @Nullable String title, boolean isIncognito) {
            this.isValid = url != null && !url.isEmpty();
            this.url = url;
            this.title = title != null ? title : "";
            this.isIncognito = isIncognito;
        }
    }

    public static class CopyData {
        public final String data;

        public CopyData(String data) {
            this.data = data;
        }
    }

    public static class HideKeyboard {
    }

    public static class ShowKeyboard {
    }

    public static class CallNumber {
        public final String number;

        public CallNumber(String number) {
            this.number = number;
        }
    }

    private static class ConnectMessage {
        public JSONObject json;

        ConnectMessage(ReadableMap data) {
            try {
                this.json = convertMapToJson(data);
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    }

    public static final class PushPairingData extends ConnectMessage {

        public PushPairingData(ReadableMap data) {
            super(data);
        }
    }

    public static final class NotifyPairingSuccess extends ConnectMessage {

        public NotifyPairingSuccess(ReadableMap data) {
            super(data);
        }
    }

    public static final class NotifyPairingError extends ConnectMessage {

        public NotifyPairingError(ReadableMap data) {
            super(data);
        }
    }

    public static final class DownloadVideo extends ConnectMessage {

        public DownloadVideo(ReadableMap data) {
            super(data);
        }
    }

    public static final class NotifyTabError extends ConnectMessage {

        public NotifyTabError(ReadableMap data) {
            super(data);
        }
    }

    public static final class NotifyTabSuccess extends ConnectMessage {

        public NotifyTabSuccess(ReadableMap data) {
            super(data);
        }
    }

    public static class Subscribe {
        public final String type;
        public final String subtype;
        public final String id;
        private final Promise promise;

        public Subscribe(String type, String subtype, String id, Promise promise) {
            this.type = type;
            this.subtype = subtype;
            this.id = id;
            this.promise = promise;
        }

        public void resolve() {
            promise.resolve(true);
        }
    }

    public static class Unsubscribe {
        public final String type;
        public final String subtype;
        public final String id;
        private final Promise promise;

        public Unsubscribe(String type, String subtype, String id, Promise promise) {
            this.type = type;
            this.subtype = subtype;
            this.id = id;
            this.promise = promise;
        }

        public void resolve() {
            promise.resolve(true);
        }
    }

    public static class OnPageFinished {}
}
