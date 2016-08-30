package acr.browser.lightning.view;

import android.content.Context;
import android.content.DialogInterface;
import android.content.res.Resources;
import android.support.annotation.NonNull;
import android.support.v7.app.AlertDialog;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.method.LinkMovementMethod;
import android.text.style.URLSpan;
import android.text.util.Linkify;
import android.view.View;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.squareup.otto.Bus;

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

    public AntiPhishingDialog(Context context,Bus eventBus) {
        super(context);
        this.eventBus = eventBus;
        final Resources resources = context.getResources();
        setTitle(resources.getString(R.string.antiphishing_dialog_title));
        setButton(DialogInterface.BUTTON_POSITIVE,
                resources.getString(R.string.antiphishing_walk_away), onClickListener);
        setButton(DialogInterface.BUTTON_NEGATIVE,
                resources.getString(R.string.antiphishing_ignore_danger), onClickListener);
        setCancelable(false);
        setUrl("unknown");
    }

    private final OnClickListener onClickListener = new OnClickListener() {
        @Override
        public void onClick(DialogInterface dialog, int which) {
            switch (which) {
                case DialogInterface.BUTTON_POSITIVE:
                    eventBus.post(new Messages.BackPressed());
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
        super.show();
        TextView.class.cast(findViewById(android.R.id.message))
                .setMovementMethod(LinkMovementMethod.getInstance());
    }

    private class OperURLSpan extends URLSpan {

        public OperURLSpan(String url) {
            super(url);
        }

        @Override
        public void onClick(View widget) {
            eventBus.post(new BrowserEvents.OpenUrlInNewTab(getURL()));
            AntiPhishingDialog.this.dismiss();
        }
    }
}
