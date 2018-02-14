package com.cliqz.jsengine;

/**
 * Created by sammacbeth on 08/05/2017.
 */

public class ActionNotAvailable extends Exception {

    ActionNotAvailable(String actionName) {
        super("action not registered: "+ actionName);
    }

}
