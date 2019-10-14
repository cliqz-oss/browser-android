package acr.browser.lightning.bus;

import android.os.Message;

import androidx.annotation.AnimRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebChromeClient.FileChooserParams;

import acr.browser.lightning.view.LightningView;

/**
 * @author Stefano Pacifici
 */
public final class BrowserEvents {

    private BrowserEvents() {
        // No instances
    }

    /**
     * Notify the Browser to display a SnackBar in the main activity
     */
    public static class ShowSnackBarMessage {
        public final String message;
        @StringRes
        public final int stringRes;

        public ShowSnackBarMessage(final String message) {
            this.message = message;
            this.stringRes = -1;
        }

        public ShowSnackBarMessage(@StringRes final int stringRes) {
            this.message = null;
            this.stringRes = stringRes;
        }
    }

    /**
     * The user want to open the given url in the current tab
     */
    public final static class OpenUrlInCurrentTab {
        public final String url;

        public OpenUrlInCurrentTab(final String url) {
            this.url = url;
        }
    }

    /**
     * The user ask to open the given url as new tab
     */
    public final static class OpenUrlInNewTab {
        public final String parentId;
        public final String url;
        public final boolean isIncognito;
        public final boolean showImmediately;

        public OpenUrlInNewTab( @Nullable String parentId,
                                @NonNull String url,
                                boolean isIncognito) {
            this(parentId, url, isIncognito, false);
        }

        public OpenUrlInNewTab( @Nullable String parentId,
                                @NonNull String url,
                                boolean isIncognito,
                                boolean showImmediately) {
            this.parentId = parentId;
            this.url = url;
            this.isIncognito = isIncognito;
            this.showImmediately = showImmediately;
        }
    }

    /**
     * Notify the browser to show the Action Bar
     */
    public static class ShowToolBar {
    }

    /**
     * Notify the browser to update the URL in the URL bar
     */
    public static class UpdateUrl {
        public final String url;
        final Boolean isShortUrl;

        public UpdateUrl(final String url, final Boolean isShortUrl) {
            this.url = url;
            this.isShortUrl = isShortUrl;
        }

    }

    /**
     * Update the current progress of loading a page.
     */
    public static class UpdateProgress {
        public final int progress;

        public UpdateProgress(final int progress) {
            this.progress = progress;
        }
    }

    /**
     * Request the browser to create a new window
     */
    public static class CreateWindow {
        public final Message msg;
        public final String tabId;

        public CreateWindow(@NonNull final String tabId, final Message msg) {
            this.tabId = tabId;
            this.msg = msg;
        }
    }

    /**
     * Request the browser to close the given WebView and remove it
     * from the view system
     */
    public static class CloseWindow {
        public final String tabId;

        public CloseWindow(@NonNull String tabId) {
            this.tabId = tabId;
        }
    }

    /**
     * Tell the browser to show a file chooser.
     *
     * This is called to handle HTML forms with 'file' input type, in response to the
     * user pressing the "Select File" button.
     */
    public static class ShowFileChooser {

        @NonNull
        public final Class callbackParamType;
        @NonNull
        public final ValueCallback valueCallback;
        @Nullable
        public final String acceptType;
        @Nullable
        public final FileChooserParams fileChooserParams;

        public ShowFileChooser(@NonNull Class callbackParamType,
                               @NonNull  ValueCallback valueCallback, @Nullable String acceptType,
                               @Nullable FileChooserParams fileChooserParams) {
            this.callbackParamType = callbackParamType;
            this.valueCallback = valueCallback;
            this.acceptType = acceptType;
            this.fileChooserParams = fileChooserParams;
        }
    }

    /**
     * Notify the browser that the current page has exited full
     * screen mode and to hide the custom View
     */
    public static class HideCustomView {
    }

    /**
     * Notify the browser that the current page has entered full screen mode. The browser must show
     * the custom View which contains the web contents: video or other HTML content
     * in full screen mode or in a particular orientation.
     */
    public static class ShowCustomView {
        public final View view;
        public final WebChromeClient.CustomViewCallback callback;
        final Integer requestedOrientation;

        public ShowCustomView(View view, WebChromeClient.CustomViewCallback callback) {
            this.view = view;
            this.callback = callback;
            this.requestedOrientation = null;
        }

        public ShowCustomView(View view, WebChromeClient.CustomViewCallback callback,
                              int requestedOrientation) {
            this.view = view;
            this.callback = callback;
            this.requestedOrientation = requestedOrientation;
        }
    }

    public static class NewTab {
        public final boolean isIncognito;
        @AnimRes
        public final int animation;

        public NewTab(boolean isIncognito) {
            this(isIncognito, 0);
        }

        public NewTab(boolean isIncognito, @AnimRes int animation) {
            this.isIncognito = isIncognito;
            this.animation = animation;
        }
    }

    public static class ShowTab {
        public final String tabId;

        public ShowTab(@NonNull String tabId) {
            this.tabId = tabId;
        }
    }

    /**
     * Search on page message
     */
    public static class SearchInPage {
    }

    /**
     * Sent when the user want to close the current tab
     */
    public static class CloseTab {}

    /**
     * Sent when we want to close all the active tabs
     */
    public static class CloseAllTabs {}
}
