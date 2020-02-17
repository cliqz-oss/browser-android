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

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.Handler;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import android.view.LayoutInflater;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.qrscanner.camera.CameraManager;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.nove.Bus;
import com.google.zxing.Result;

import java.io.IOException;

import javax.inject.Inject;

import butterknife.BindView;
import butterknife.ButterKnife;
import timber.log.Timber;

/**
 * This fragments is derived from
 * <a href="https://github.com/zxing/zxing/blob/master/android/src/com/google/zxing/client/android/CaptureActivity.java">
 * here</a>.<br>
 * It handles qr code capturing, must be extended to cover specific behaviors like pairing and
 * QR-codes scanning
 *
 * @author dswitkin@google.com (Daniel Switkin)
 * @author Sean Owen
 * @author Stefano Pacifici
 */
public class CaptureFragment extends Fragment implements SurfaceHolder.Callback {

    private CameraManager cameraManager;
    private CaptureFragmentHandler handler;

    @BindView(R.id.viewfinder_view)
    ViewfinderView viewfinderView;

    @BindView(R.id.preview_view)
    SurfaceView surfaceView;

    @BindView(R.id.qrscan_instruction_view)
    TextView instructionsView;

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    private boolean hasSurface;

    ViewfinderView getViewfinderView() {
        return viewfinderView;
    }

    public Handler getHandler() {
        return handler;
    }

    CameraManager getCameraManager() {
        return cameraManager;
    }

    @SuppressLint("ValidFragment")
    protected CaptureFragment() {
        // The capture fragment should not be used directly, but extended
        super();
    }

    @Override
    public void onCreate(Bundle icicle) {
        super.onCreate(icicle);
        hasSurface = false;
        BrowserApp.getAppComponent().inject(this);
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.capture, container, false);
        ButterKnife.bind(this, view);
        setupInstructions((FrameLayout) view);
        return view;
    }

    /**
     *
     * @param parent
     */
    @SuppressWarnings("JavaDoc")
    protected void setupInstructions(FrameLayout parent) {
    }


    @Override
    public void onResume() {
        super.onResume();
        // CameraManager must be initialized here, not in onCreate(). This is necessary because we don't
        // want to open the camera driver and measure the screen size if we're going to show the help on
        // first launch. That led to bugs where the scanning rectangle was the wrong size and partially
        // off screen.
        cameraManager = new CameraManager(BrowserApp.getAppContext());
        viewfinderView.setCameraManager(cameraManager);

        handler = null;
        resetStatusView();
        SurfaceHolder surfaceHolder = surfaceView.getHolder();
        if (hasSurface) {
            // The activity was paused but not stopped, so the surface still exists. Therefore
            // surfaceCreated() won't be called, so init the camera here.
            initCamera(surfaceHolder);
        } else {
            // Install the callback and wait for surfaceCreated() to init the camera.
            surfaceHolder.addCallback(this);
        }
    }

    @Override
    public void onPause() {
        if (handler != null) {
            handler.quitSynchronously();
            handler = null;
        }
        cameraManager.closeDriver();
        //historyManager = null; // Keep for onActivityResult
        if (!hasSurface) {
            SurfaceHolder surfaceHolder = surfaceView.getHolder();
            surfaceHolder.removeCallback(this);
        }
        super.onPause();
    }

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        if (holder == null) {
            Timber.e("*** WARNING *** surfaceCreated() gave us a null surface!");
        }
        if (!hasSurface) {
            hasSurface = true;
            initCamera(holder);
        }
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        hasSurface = false;
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
    }

    /**
     * A valid barcode has been found, so give an indication of success and show the results.
     *
     * @param rawResult   The contents of the barcode.
     * @param scaleFactor amount by which thumbnail was scaled
     * @param barcode     A greyscale bitmap of the camera data which was decoded.
     */
    @SuppressWarnings("UnusedParameters")
    public void handleDecode(Result rawResult, Bitmap barcode, float scaleFactor) {
        bus.post(new SyncEvents.QRCodeScanned(rawResult));
        getFragmentManager().popBackStack();
    }

    private void initCamera(SurfaceHolder surfaceHolder) {
        if (surfaceHolder == null) {
            throw new IllegalStateException("No SurfaceHolder provided");
        }
        if (cameraManager.isOpen()) {
            Timber.w("initCamera() while already open -- late SurfaceView callback?");
            return;
        }
        try {
            cameraManager.openDriver(surfaceHolder);
            // Creating the handler starts the preview, which can also throw a RuntimeException.
            if (handler == null) {
                handler = new CaptureFragmentHandler(this, cameraManager);
            }
        } catch (IOException ioe) {
            Timber.w(ioe);
            displayFrameworkBugMessageAndExit();
        } catch (RuntimeException e) {
            // Barcode Scanner has seen crashes in the wild of this variety:
            // java.?lang.?RuntimeException: Fail to connect to camera service
            Timber.w(e, "Unexpected error initializing camera");
            displayFrameworkBugMessageAndExit();
        }
    }

    private void displayFrameworkBugMessageAndExit() {
        CameraFrameworkErrorDialog.show(this);
    }

    private void resetStatusView() {
        viewfinderView.setVisibility(View.VISIBLE);
    }

    public void drawViewfinder() {
        viewfinderView.drawViewfinder();
    }
}
