/*
 * Copyright (C) 2008 ZXing authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.cliqz.browser.qrscanner;

import android.content.Context;
import android.content.res.TypedArray;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.text.Spannable;
import android.view.LayoutInflater;
import android.view.SurfaceHolder;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.FrameLayout.LayoutParams;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.utils.SpannableUtils;

import butterknife.ButterKnife;

/**
 * This fragments is derived from
 * <a href="https://github.com/zxing/zxing/blob/master/android/src/com/google/zxing/client/android/CaptureActivity.java">
 * here</a>.<br>
 * It handles qr code capturing and shows instructions how to perform pairing.
 *
 * @author dswitkin@google.com (Daniel Switkin)
 * @author Sean Owen
 * @author Stefano Pacifici
 */
public final class PairingCaptureFragment extends CaptureFragment implements SurfaceHolder.Callback {

    private InstructionsDialog dialog;
    private long startTime;


    public PairingCaptureFragment() {
        super();
    }

    @Override
    public void onCreate(Bundle icicle) {
        super.onCreate(icicle);
        dialog = new InstructionsDialog(telemetry);
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.capture, container, false);
        ButterKnife.bind(this, view);
        setupInstructions((FrameLayout) view);
        return view;
    }

    @Override
    protected void setupInstructions(FrameLayout parent) {
        final Context context = parent.getContext();

        LayoutParams layoutParams = (LayoutParams) instructionsView.getLayoutParams();
        parent.removeView(instructionsView);

        final int statusBarHeight;
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            statusBarHeight = getResources().getDimensionPixelSize(resourceId);
        } else {
            statusBarHeight = 0;
        }

        final TypedArray attrs = context.getTheme().obtainStyledAttributes(new int[] {
                android.support.design.R.attr.actionBarSize,
        });
        final int actionBarHeight = (int) attrs.getDimension(0, 0);
        attrs.recycle();

        layoutParams.setMargins(0, actionBarHeight + statusBarHeight, 0, 0);
        parent.addView(instructionsView, layoutParams);

        final Spannable spannedMessage =
                SpannableUtils.markdownStringToSpannable(context,
                        R.string.qrcode_scanner_pairing_instructions);
        instructionsView.setText(spannedMessage);
    }


    @Override
    public void onResume() {
        startTime = System.currentTimeMillis();
        super.onResume();
        dialog.show(getContext());
    }

    @Override
    public void onPause() {
        super.onPause();
        telemetry.sendConnectHideSignal(System.currentTimeMillis() - startTime, TelemetryKeys.SCAN_INTRO);
    }
}
