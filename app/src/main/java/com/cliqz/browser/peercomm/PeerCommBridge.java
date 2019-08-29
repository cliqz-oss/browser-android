package com.cliqz.browser.peercomm;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.connect.SyncEvents;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.utils.DownloadHelper;
import com.cliqz.browser.webview.Bridge;
import com.cliqz.browser.webview.EnhancedAction;
import com.cliqz.nove.Bus;
import com.cliqz.utils.StringUtils;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.preference.PreferenceManager;
import timber.log.Timber;

import static android.Manifest.permission.WRITE_EXTERNAL_STORAGE;
import static android.content.pm.PackageManager.PERMISSION_GRANTED;

/**
 * @author Stefano Pacifici
 */
public class PeerCommBridge extends Bridge {

    private enum Action implements IAction {

        /**
         * Call the function <i>callback</i> with a single string that contais the device ARN.<br>
         * <strong>In case the device has no ARN, the <i>callback</i> will not be called.</strong>
         */
        deviceARN(new EnhancedAction<PeerCommBridge>() {
            @Override
            protected void enhancedExecute(PeerCommBridge bridge, Object data, String callback) {
                if (callback == null) {
                    return;
                }
                final String arn = bridge.preferenceManager.getARNEndpoint();
                // Avoid crash in the module
                if (arn != null) {
                    bridge.executeJavascriptCallback(callback, arn);
                }
            }
        }),

        // data is a string with the url of the tab
        openTab(new EnhancedAction<PeerCommBridge>() {
            @Override
            protected void enhancedExecute(PeerCommBridge bridge, Object data, String callback) {
                Uri uri = null;
                boolean isIncognito = false;
                String title = "";
                try {
                    uri = Uri.parse((String) data);
                    title = (String) data;
                } catch (ClassCastException e) {
                    // Maybe the data is a JSON
                }
                if (uri == null) {
                    JSONArray tabs = null;
                    try {
                        //noinspection ConstantConditions
                        tabs = (JSONArray) data;
                        final JSONObject firstTab = tabs.getJSONObject(0);
                        final String url = firstTab.getString("url");
                        uri = Uri.parse(url);
                        title = firstTab.optString("title", url);
                        isIncognito = firstTab.optBoolean("isPrivate", false);
                    } catch (ClassCastException e) {
                        Timber.e("Invalid openTab data %s", data.toString());
                        return;
                    } catch (NullPointerException e) {
                        Timber.e("opedTab data is null");
                        return;
                    }
                    catch (JSONException e) {
                        Timber.e("Invalid openTab json %s", tabs.toString());
                        return;
                    }
                }
                // Is the uri still null?
                if (uri == null) {
                    Timber.e("Can't parse Url");
                    return;
                }

                // we can only throw an intent here
                final Intent intent = new Intent(bridge.context, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.setData(uri);
                intent.setAction(Intent.ACTION_VIEW);
                intent.putExtra(MainActivity.EXTRA_IS_PRIVATE, isIncognito);
                intent.putExtra(MainActivity.EXTRA_TITLE, title);

                bridge.context.startActivity(intent);
            }
        }),

        // data is a string with the url of the video (file) to download
        downloadVideo(new EnhancedAction<PeerCommBridge>() {
            @Override
            protected void enhancedExecute(final PeerCommBridge bridge, Object data, String callback) {
                final JSONObject jsonObject = data instanceof JSONObject ?
                        (JSONObject) data : new JSONObject();
                final String filename = jsonObject.optString("filename", null);
                final String rawUrl = jsonObject.optString("url", null);
                final String url = StringUtils.encodeURLProperly(rawUrl);
                final Context context = bridge.context;
                if (canDownloadInBackground(context) && url != null) {
                    DownloadHelper.download(context, url, filename, null,
                            new DownloadHelper.DownloaderListener() {
                                @Override
                                public void onSuccess(String url) {
                                    bridge.bus.post(new BrowserEvents
                                            .ShowSnackBarMessage(bridge.context
                                            .getString(R.string.download_started)));
                                }

                                @Override
                                public void onFailure(String url, DownloadHelper.Error error,
                                                      Throwable throwable) {
                                    final String title;
                                    final String message;
                                    switch (error) {
                                        case MEDIA_NOT_MOUNTED:
                                            message = context.getString(R.string.download_sdcard_busy_dlg_msg);
                                            title = context.getString(R.string.download_sdcard_busy_dlg_title);
                                            break;
                                        case MEDIA_NOT_AVAILABLE:
                                            message = context.getString(R.string.download_no_sdcard_dlg_msg);
                                            title = context.getString(R.string.download_no_sdcard_dlg_title);
                                            break;
                                        default:
                                            message = context.getString(R.string.download_failed);
                                            title = context.getString(R.string.title_error);
                                            break;
                                    }
                                    final AlertDialog.Builder builder = new AlertDialog.Builder(context);
                                    builder.setTitle(title)
                                            .setMessage(message)
                                            .setPositiveButton(R.string.action_ok, null)
                                            .show();
                                }
                            });
                } else {
                    // We must show interface here, just start the browser
                    final Intent intent = new Intent(context, MainActivity.class);
                    intent.setAction(MainActivity.ACTION_DOWNLOAD);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    intent.setData(Uri.parse(StringUtils.encodeURLProperly(rawUrl)));
                    intent.putExtra(MainActivity.EXTRA_FILENAME, filename);
                    context.startActivity(intent);
                }
            }
        }),

        // From the Android side, evaluating "peerBridge.getPairingData()" will make the JS side call
        // this function with the pairing data.
        // data.devices should be an array with info about paired devices. Each device
        // should be an object with keys {name, id}. To reference the device (e.g. for unpairing)
        // the id should be used, but for displaying purposes it should be the name.
        pushPairingData(new EnhancedAction<PeerCommBridge>() {
            @Override
            protected void enhancedExecute(PeerCommBridge bridge, Object data, String callback) {
                try {
                    bridge.bus.post(new SyncEvents.PairingData(JSONObject.class.cast(data)));
                } catch (ClassCastException e) {
                    Timber.e(e, "Wrong data type, a JSONObject was expected");
                }
            }
        }),

        pushTelemetry(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                // WTF
            }
        }),

        notifyPairingError(new EnhancedAction<PeerCommBridge>() {
            @Override
            protected void enhancedExecute(PeerCommBridge bridge, Object data, String callback) {
                try {
                    final JSONObject error = JSONObject.class.cast(data);
                    int errorCode = error.optInt("error", -1);
                    bridge.bus.post(new SyncEvents.PairingError(errorCode));
                } catch (ClassCastException e) {
                    Timber.e(e, "Wrong data type, a JSONObject was expected");
                }
            }
        }),

        notifyPairingSuccess(new EnhancedAction<PeerCommBridge>() {
            @Override
            protected void enhancedExecute(PeerCommBridge bridge, Object data, String callback) {
                bridge.bus.post(new SyncEvents.PairingSuccess());
            }
        }),

        notifyTabSuccess(new EnhancedAction<PeerCommBridge>() {
            @Override
            protected void enhancedExecute(PeerCommBridge bridge, Object data, String callback) {
                try {
                    final JSONObject result = JSONObject.class.cast(data);
                    final String peerID = result.getString("peerID");
                    final String name = result.getString("name");
                    bridge.bus.post(new SyncEvents.SendTabSuccess(peerID, name));
                } catch (Throwable e) {
                    Timber.e(e, "Wrong message format");
                }
            }
        }),

        notifyTabError(new EnhancedAction<PeerCommBridge>() {
            @Override
            protected void enhancedExecute(PeerCommBridge bridge, Object data, String callback) {
                try {
                    final JSONObject result = JSONObject.class.cast(data);
                    final String peerID = result.getString("peerID");
                    final String name = result.getString("name");
                    bridge.bus.post(new SyncEvents.SendTabError(peerID, name));
                } catch (Throwable e) {
                    Timber.e(e, "Wrong message format");
                }
            }
        }),

        none(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                throw new RuntimeException("Undefined");
            }
        });

        private static boolean canDownloadInBackground(Context context) {
            final int result = ContextCompat
                    .checkSelfPermission(context, WRITE_EXTERNAL_STORAGE);
            return result == PERMISSION_GRANTED;
        }

        private final IAction action;

        Action(final IAction action) {
            this.action = action;
        }

        @Override
        public void execute(Bridge bridge, Object data, String callback) {
            action.execute(bridge, data, callback);
        }
    }

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    ChunkedFileManager chunkedFileManager;

    @Inject
    Bus bus;

    @Inject
    Context context;

    PeerCommBridge() {
        super();
        BrowserApp.getAppComponent().inject(this);
    }

    @Override
    protected void inject(Context context) {
        BrowserApp.getAppComponent().inject(this);
    }

    @Override
    protected IAction safeValueOf(@NonNull String name) {
        try {
            return Action.valueOf(name);
        } catch (IllegalArgumentException e) {
            Timber.e(e, "Can't convert the given name to Action: %s", name);
            return Action.none;
        }
    }
    @Override
    protected boolean checkCapabilities() {
        return true;
    }
}
