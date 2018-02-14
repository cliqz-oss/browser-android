package com.cliqz.browser.connect;

import com.google.zxing.Result;

import org.json.JSONObject;

/**
 * @author Stefano Pacifici
 */
public final class SyncEvents {
    private SyncEvents() {
        // No instances
    }

    public static class PairingData {
        public final JSONObject data;

        public PairingData(JSONObject data) {
            this.data = data;
        }
    }

    public static class PairingError {
        final int errorCode;

        public PairingError(int errorCode) {
            this.errorCode = errorCode;
        }
    }

    public static class QRCodeScanned {
        public final Result result;

        public QRCodeScanned(Result result) {
            this.result = result;
        }
    }

    public static class PairingSuccess {
    }

    @SuppressWarnings("WeakerAccess")
    public static class SendTabError {
        public final String peerID;
        public final String name;

        public SendTabError(String peerID, String name) {
            this.peerID = peerID;
            this.name = name;
        }
    }

    @SuppressWarnings("WeakerAccess")
    public static class SendTabSuccess {
        public final String peerID;
        public final String name;

        public SendTabSuccess(String peerID, String name) {
            this.peerID = peerID;
            this.name = name;
        }
    }
}
