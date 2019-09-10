package acr.browser.lightning.dialog;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.utils.UrlUtils;
import acr.browser.lightning.utils.Utils;

/**
 * Created by Stefano Pacifici on 02/09/15, based on Anthony C. Restaino's code.
 */
public class LightningDialogBuilder {

    @Inject
    HistoryDatabase mHistoryDatabase;

    @Inject
    Bus eventBus;

    @Inject
    Telemetry telemetry;

    @Inject
    Activity activity;

    @Inject
    LightningDialogBuilder() {
    }

    // TODO There should be a way in which we do not need an activity reference to dowload a file
    public void showLongPressImageDialog(final String linkUrl, @NonNull final String imageUrl,
                                         @NonNull final String userAgent) {
        telemetry.sendLongPressSignal(TelemetryKeys.IMAGE);

        final CharSequence[] linkAndImageOptions = new CharSequence[]{
                activity.getString(R.string.action_copy),
                activity.getString(R.string.download_image),
                activity.getString(R.string.open_image_new_tab),
                activity.getString(R.string.open_image_forget_tab),
                activity.getString(R.string.open_link_new_tab),
                activity.getString(R.string.open_link_forget_tab)
        };
        final CharSequence[] imageOptions = new CharSequence[]{
                activity.getString(R.string.action_copy),
                activity.getString(R.string.download_image),
                activity.getString(R.string.open_image_new_tab),
                activity.getString(R.string.open_image_forget_tab)
        };

        final AlertDialog.Builder dialogBuilder = new AlertDialog.Builder(activity);
        dialogBuilder.setTitle(linkUrl == null ? imageUrl : linkUrl)
                .setItems(linkUrl == null || linkUrl.equals(imageUrl) ? imageOptions : linkAndImageOptions,
                        (dialogInterface, which) -> {
                            switch (which) {
                                case 0:
                                    final ClipboardManager clipboardManager = (ClipboardManager)
                                            activity.getSystemService(Context.CLIPBOARD_SERVICE);
                                    final ClipData clipData = ClipData.newPlainText("url",
                                            linkUrl == null ? imageUrl : linkUrl);
                                    clipboardManager.setPrimaryClip(clipData);
                                    break;
                                case 1:
                                    if (imageUrl.startsWith("data:image/jpeg;base64,")) {
                                        Utils.writeBase64ToStorage(activity, imageUrl);
                                    } else {
                                        Utils.downloadFile(activity, imageUrl, userAgent, "attachment");
                                    }
                                    break;
                                case 2:
                                    eventBus.post(new BrowserEvents.OpenUrlInNewTab(imageUrl, false));
                                    break;
                                case 3:
                                    eventBus.post(new BrowserEvents.OpenUrlInNewTab(imageUrl, true));
                                    break;
                                case 4:
                                    eventBus.post(new BrowserEvents.OpenUrlInNewTab(linkUrl, false));
                                    break;
                                case 5:
                                    eventBus.post(new BrowserEvents.OpenUrlInNewTab(linkUrl, true));
                                    break;
                            }
                        });
        dialogBuilder.show();
    }

    public void showLongPressLinkDialog(final String url, final String userAgent) {
        telemetry.sendLongPressSignal(TelemetryKeys.LINK);
        final CharSequence[] mOptions = new CharSequence[]{
                activity.getString(R.string.action_copy),
                activity.getString(R.string.open_in_new_tab),
                activity.getString(R.string.open_in_incognito_tab),
                activity.getString(R.string.save_link)
        };
        final AlertDialog.Builder dialogBuilder = new AlertDialog.Builder(activity);
        dialogBuilder.setTitle(url)
                .setItems(mOptions, (dialog, which) -> {
                    switch (which) {
                        case 0:
                            telemetry.sendLinkDialogSignal(TelemetryKeys.COPY);
                            final ClipboardManager clipboardManager = (ClipboardManager)
                                    activity.getSystemService(Context.CLIPBOARD_SERVICE);
                            final ClipData clipData = ClipData.newPlainText("url", url);
                            clipboardManager.setPrimaryClip(clipData);
                            break;
                        case 1:
                            telemetry.sendLinkDialogSignal(TelemetryKeys.NEW_TAB);
                            eventBus.post(new BrowserEvents.OpenUrlInNewTab(url, false));
                            break;
                        case 2:
                            telemetry.sendLinkDialogSignal(TelemetryKeys.NEW_FORGET_TAB);
                            eventBus.post(new BrowserEvents.OpenUrlInNewTab(url, true));
                            break;
                        case 3:
                            telemetry.sendLinkDialogSignal(TelemetryKeys.SAVE);
                            Utils.downloadFile(activity, url, userAgent, "attachment");
                            break;
                    }
                });
        dialogBuilder.show();
    }

}
