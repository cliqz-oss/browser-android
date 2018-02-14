package com.cliqz.jsengine;

import com.facebook.react.bridge.WritableMap;

import java.util.Arrays;

/**
 * Created by sammacbeth on 08/05/2017.
 */

public class EmptyResponseException extends Exception {

    EmptyResponseException(String actionName) {
        super("action timed out or gave null response: "+ actionName);
    }
}
