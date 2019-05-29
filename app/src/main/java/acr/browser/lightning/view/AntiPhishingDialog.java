package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.DialogInterface;
import android.content.res.Resources;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.text.method.LinkMovementMethod;
import android.text.style.URLSpan;
import android.view.KeyEvent;
import android.view.View;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.nove.Bus;

import acr.browser.lightning.bus.BrowserEvents;

/**
 * Simple dialog to be shown when we detect a phishing website
 *
 * @author Stefano Pacifici
 * @date 2016/07/12
 */
class AntiPhishingDialog extends AlertDialog {

    private final Bus eventBus;
    private String mUrl;
    private Telemetry telemetry;

    public AntiPhishingDialog(Context context, Bus eventBus, Telemetry telemetry) {
        super(context);
        this.eventBus = eventBus;
        this.telemetry = telemetry;
        final Resources resources = context.getResources();
        setTitle(resources.getString(R.string.antiphishing_dialog_title));
        setButton(DialogInterface.BUTTON_POSITIVE,
                resources.getString(R.string.antiphishing_walk_away), onClickListener);
        setButton(DialogInterface.BUTTON_NEGATIVE,
                resources.getString(R.string.antiphishing_ignore_danger), onClickListener);
        setCancelable(false);
        setUrl("unknown");
        setOnKeyListener(onKeyListener);
    }

    private final OnKeyListener onKeyListener = new DialogInterface.OnKeyListener() {
        @Override
        public boolean onKey(DialogInterface dialog, int keyCode, KeyEvent event) {
            if (keyCode == KeyEvent.KEYCODE_BACK) {
                eventBus.post(new Messages.BackPressed());
                dialog.dismiss();
                return true;
            }
            return false;
        }
    };

    private final OnClickListener onClickListener = new OnClickListener() {
        @Override
        public void onClick(DialogInterface dialog, int which) {
            switch (which) {
                case DialogInterface.BUTTON_POSITIVE:
                    telemetry.sendAntiPhisingSignal(TelemetryKeys.BACK);
                    eventBus.post(new Messages.BackPressed());
                    break;
                case DialogInterface.BUTTON_NEGATIVE:
                    telemetry.sendAntiPhisingSignal(TelemetryKeys.CONTINUE);
                    break;
                default:
                    break;
            }
            dialog.dismiss();
        }
    };

    public void setUrl(String url) {
        this.mUrl = url;
        final Spannable message = linkify(getContext().getString(R.string.antiphishing_message, mUrl));
        setMessage(message);
    }

    private Spannable linkify(@NonNull String string) {
        final SpannableStringBuilder builder = new SpannableStringBuilder();
        final String[] parts = string.split("\\[");
        builder.append(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            final String[] entry = parts[i].split("\\]");
            final String[] titleAndUrl = entry[0].split("\\|");
            final String title = titleAndUrl[0];
            final String url = titleAndUrl[1];
            builder.append(title);
            final OperURLSpan span = new OperURLSpan(url);
            builder.setSpan(span, builder.length() - title.length(), builder.length(), 0);
            if (entry.length > 1) {
                builder.append(entry[1]);
            }
        }
        return builder;
    }

    @Override
    public void show() {
        telemetry.sendAntiPhisingShowSignal();
        super.show();
        TextView.class.cast(findViewById(android.R.id.message))
                .setMovementMethod(LinkMovementMethod.getInstance());
    }

    @SuppressLint("ParcelCreator")
    private class OperURLSpan extends URLSpan {

        public OperURLSpan(String url) {
            super(url);
        }

        @Override
        public void onClick(View widget) {
            telemetry.sendAntiPhisingSignal(TelemetryKeys.LEARN_MORE);
            eventBus.post(new BrowserEvents.OpenUrlInNewTab(getURL()));
            AntiPhishingDialog.this.dismiss();
        }
    }
}
