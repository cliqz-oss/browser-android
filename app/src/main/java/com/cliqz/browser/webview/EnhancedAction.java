package com.cliqz.browser.webview;

import timber.log.Timber;

/**
 * Abstract class that performs a cast to a specific {@link Bridge} subclass before calling the
 * {@link EnhancedAction#enhancedExecute(Bridge, Object, String)} method.
 *
 * @author Stefano Pacifici
 * @date 2017/01/25
 */
public abstract class EnhancedAction<T extends Bridge> implements Bridge.IAction {

    @Override
    public void execute(Bridge bridge, Object data, String callback) {
        try {
            final T specificBridge = ((T) bridge);
            enhancedExecute(specificBridge, data, callback);
        } catch (ClassCastException e) {
            Timber.e(e, "Can't cast the given bridge");
        }
    }

    protected abstract void enhancedExecute(T bridge, Object data, String callback);
}
