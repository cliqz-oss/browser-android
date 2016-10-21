package acr.browser.lightning.dialog;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.DialogInterface;
import android.support.annotation.NonNull;
import android.support.v7.app.AlertDialog;

import com.cliqz.browser.R;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.utils.TelemetryKeys;
import com.squareup.otto.Bus;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.utils.UrlUtils;
import acr.browser.lightning.utils.Utils;

/**
 * TODO Rename this class it doesn't build dialogs only for bookmarks
 *
 * Created by Stefano Pacifici on 02/09/15, based on Anthony C. Restaino's code.
 */
public class LightningDialogBuilder {

//    @Inject
//    BookmarkManager bookmarkManager;

    @Inject
    HistoryDatabase mHistoryDatabase;

    @Inject
    Bus eventBus;

    @Inject
    Telemetry telemetry;

    @Inject
    Activity activity;

    @Inject
    public LightningDialogBuilder() {
        //BrowserApp.getAppComponent().inject(this);
    }

    // TODO There should be a way in which we do not need an activity reference to dowload a file
    public void showLongPressImageDialog(@NonNull final String url,
                                          @NonNull final String userAgent) {
        final boolean isYoutubeVideo = UrlUtils.isYoutubeVideo(url);
        telemetry.sendLongPressSignal(isYoutubeVideo ? TelemetryKeys.VIDEO : TelemetryKeys.IMAGE);
        final DialogInterface.OnClickListener dialogClickListener = new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                switch (which) {
                    case DialogInterface.BUTTON_POSITIVE:
                        telemetry.sendImageDialogSignal(TelemetryKeys.NEW_TAB,
                                isYoutubeVideo ? TelemetryKeys.VIDEO : TelemetryKeys.IMAGE);
                        eventBus.post(new BrowserEvents.OpenUrlInNewTab(url));
                        break;
                    case DialogInterface.BUTTON_NEGATIVE:
                        telemetry.sendImageDialogSignal(TelemetryKeys.OPEN,
                                isYoutubeVideo ? TelemetryKeys.VIDEO : TelemetryKeys.IMAGE);
                        eventBus.post(new BrowserEvents.OpenUrlInCurrentTab(url));
                        break;
                    case DialogInterface.BUTTON_NEUTRAL:
                        telemetry.sendImageDialogSignal(TelemetryKeys.DOWNLOAD,
                                isYoutubeVideo ? TelemetryKeys.VIDEO : TelemetryKeys.IMAGE);
                        Utils.downloadFile(activity, url, userAgent, "attachment", false);
                        break;
                }
            }
        };

        final AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        builder.setTitle(url.replace(Constants.HTTP, ""))
                .setCancelable(true)
                .setMessage(isYoutubeVideo ? R.string.dialog_youtube_video : R.string.dialog_image)
                .setPositiveButton(R.string.action_new_tab, dialogClickListener)
                .setNegativeButton(R.string.action_open, dialogClickListener)
                .setNeutralButton(R.string.action_download, dialogClickListener)
                .show();
    }

    public void showLongPressLinkDialog(final String url, final String userAgent) {
        telemetry.sendLongPressSignal(TelemetryKeys.LINK);
        final boolean isYoutubeVideo = UrlUtils.isYoutubeVideo(url);
        final CharSequence[] mOptions = new CharSequence[] {
                activity.getString(R.string.action_copy),
                activity.getString(R.string.open_in_new_tab),
                activity.getString(R.string.open_in_incognito_tab),
                activity.getString(R.string.save_link)
        };
        final AlertDialog.Builder dialogBuilder = new AlertDialog.Builder(activity);
        dialogBuilder.setTitle(url)
                .setItems(mOptions, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
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
                                Utils.downloadFile(activity, url, userAgent, "attachment", false);
                                break;
                        }
                    }
                });
        dialogBuilder.show();
    }

}
