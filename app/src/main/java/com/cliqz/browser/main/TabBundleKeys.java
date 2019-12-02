package com.cliqz.browser.main;

/**
 * @author Stefano Pacifici
 */
@SuppressWarnings("WeakerAccess")
public final class TabBundleKeys {
    private static final String PREFIX = TabBundleKeys.class.getName();
    public static final String URL = PREFIX + ".URL";
    public static final String IS_INCOGNITO = PREFIX + ".IS_INCOGNITO";
    public static final String TITLE = PREFIX + ".TITLE";
    public static final String FAVICON = PREFIX + ".FAVICON";
    public static final String ID = PREFIX + ".ID";
    public static final String PARENT_ID = PREFIX + ".PARENT_ID";
    public static final String LAST_VISIT = PREFIX + ".LAST_VISIT";

    private TabBundleKeys() {} // No instances
}
