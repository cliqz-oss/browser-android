package com.cliqz.browser.qrscanner;

import com.google.zxing.Result;

/**
 * @author Stefano Pacifici
 */
public final class SyncEvents {
    private SyncEvents() {
        // No instances
    }

    public static class QRCodeScanned {
        public final Result result;

        public QRCodeScanned(Result result) {
            this.result = result;
        }
    }

}
