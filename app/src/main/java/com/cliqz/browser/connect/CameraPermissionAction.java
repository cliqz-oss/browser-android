package com.cliqz.browser.connect;

import com.anthonycr.grant.PermissionsResultAction;

/**
 * @author Stefano Pacifici
 */
class CameraPermissionAction extends PermissionsResultAction {

    private final PairedDevicesFragment fragment;

    CameraPermissionAction(PairedDevicesFragment fragment) {
        this.fragment = fragment;
    }
    @Override
    public void onGranted() {
        fragment.displayCaptureFragment();
    }

    @Override
    public void onDenied(String permission) {
        // Nothing to do here, we can not simply display the PairingCaptureFragment
    }
}
