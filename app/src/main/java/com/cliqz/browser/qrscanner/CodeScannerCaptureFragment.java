package com.cliqz.browser.qrscanner;

import android.text.Spannable;
import android.view.View;
import android.widget.FrameLayout;

import com.cliqz.browser.R;
import com.cliqz.utils.SpannableUtils;

/**
 * @author Stefano Pacifici
 */
public class CodeScannerCaptureFragment extends CaptureFragment {

    public CodeScannerCaptureFragment() {
        super();
    }

    @Override
    protected void setupInstructions(FrameLayout parent) {
        final Spannable spannedMessage =
                SpannableUtils.markdownStringToSpannable(parent.getContext(),
                        R.string.qrcode_scanner_scanning_instructions);
        instructionsView.setText(spannedMessage);
        instructionsView.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
    }
}
