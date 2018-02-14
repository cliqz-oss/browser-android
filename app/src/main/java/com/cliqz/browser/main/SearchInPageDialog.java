package com.cliqz.browser.main;

import android.content.Context;
import android.content.DialogInterface;
import android.content.res.TypedArray;
import android.os.Handler;
import android.os.Looper;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AlertDialog;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.FrameLayout;

import com.cliqz.browser.R;

import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.view.LightningView;


/**
 * @author Ravjit Uppal
 */
class SearchInPageDialog implements DialogInterface.OnClickListener {

    private static final int KEYBOARD_DELAY = 200;

    private final View inPageSearchBar;
    private final LightningView lightningView;
    private final EditText queryEditText;
    private final Context context;

    private SearchInPageDialog(Context context, View inPageSearchBar, LightningView lightningView) {
        this.context = context;
        this.inPageSearchBar = inPageSearchBar;
        this.lightningView = lightningView;
        this.queryEditText = new EditText(context);
    }

    public static void show(Context context, View inPageSearchBar, LightningView lightningView) {
        final SearchInPageDialog searchInPageDialog = new SearchInPageDialog(context, inPageSearchBar, lightningView);
        final int verticalMargin = 10; //dps
        final int[] dialogTitlePadding = new int[]{android.support.v7.appcompat.R.attr.dialogPreferredPadding};
        final TypedArray typedArray = context.obtainStyledAttributes(dialogTitlePadding);
        final int sidePadding = typedArray.getDimensionPixelSize(0, -1);
        typedArray.recycle();
        final AlertDialog.Builder finder = new AlertDialog.Builder(context);
        finder.setTitle(context.getResources().getString(R.string.action_find));
        if (searchInPageDialog.queryEditText.getCurrentHintTextColor()
                == searchInPageDialog.queryEditText.getHintTextColors().getDefaultColor()) {
            searchInPageDialog.queryEditText.setHintTextColor(ContextCompat.getColorStateList(context, R.color.search_text_hint));
        }
        searchInPageDialog.queryEditText.setHint(context.getResources().getString(R.string.find_hint));
        finder.setView(searchInPageDialog.queryEditText)
                .setPositiveButton(context.getResources().getString(R.string.find_hint), searchInPageDialog)
                .setNegativeButton(context.getResources().getString(R.string.action_cancel), searchInPageDialog)
                .show();
        final FrameLayout.LayoutParams layoutParams = (FrameLayout.LayoutParams) searchInPageDialog.queryEditText.getLayoutParams();
        layoutParams.setMargins(sidePadding - searchInPageDialog.queryEditText.getPaddingLeft(),
                Utils.dpToPx(verticalMargin), sidePadding, Utils.dpToPx(verticalMargin));
        searchInPageDialog.queryEditText.setLayoutParams(layoutParams);

        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                InputMethodManager inputMethodManager = (InputMethodManager) searchInPageDialog.context
                        .getSystemService(Context.INPUT_METHOD_SERVICE);
                inputMethodManager.showSoftInput(searchInPageDialog.queryEditText, InputMethodManager.SHOW_IMPLICIT);
            }
        }, KEYBOARD_DELAY);
    }

    @Override
    public void onClick(DialogInterface dialog, int which) {
        switch (which) {
            case DialogInterface.BUTTON_POSITIVE:
                String query = queryEditText.getText().toString();
                if (!query.isEmpty()) {
                    inPageSearchBar.setVisibility(View.VISIBLE);
                    lightningView.findInPage(query);
                }
                break;
            case DialogInterface.BUTTON_NEGATIVE:
                dialog.dismiss();
                break;
        }
    }
}
