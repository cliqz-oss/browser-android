package com.cliqz.browser.helper;

import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.widget.TextView;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * @author Stefano Pacifici
 * @date 2016/04/26
 */
public class NewsMessageDialog extends Dialog {

    @BindView(R.id.title)
    TextView titleTextView;

    @BindView(R.id.url)
    TextView urlTextView;

    public NewsMessageDialog(Context context) {
        super(context);
        setContentView(R.layout.news_message_dialog);
        setTitle(R.string.send_news_message_action);
        ButterKnife.bind(this);
    }

    @OnClick(android.R.id.button1)
    void onCancel() {
        dismiss();
    }

    @OnClick(android.R.id.button2)
    void onSend() {
        final Intent intent = new Intent("com.google.android.c2dm.intent.RECEIVE");
        intent.setPackage("com.cliqz.browser");
        intent.putExtra("message_type", "gcm");
        intent.putExtra("from", "tests_helper");
        intent.putExtra("type", "20000");
        intent.putExtra("title", titleTextView.getText().toString());
        intent.putExtra("url", urlTextView.getText().toString());
        getContext().startService(intent);
        dismiss();
    }
}
