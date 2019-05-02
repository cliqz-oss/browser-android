package com.cliqz.browser.abtesting;

/**
 * @author Ravjit Uppal
 */
public enum AvailableTests {

    QUERY_SUGGESTIONS(1089, "Mobile query suggestions", "QUERY_SUGGESTION"),
    CONNECT(1095, "Connect - DMO pairing", "CONNECT_PAIRING");

    public final int testId;
    public final String testName;
    public final String preferenceName;

    AvailableTests(int testId, String testName, String preferenceName) {
        this.testId = testId;
        this.testName = testName;
        this.preferenceName = preferenceName;
    }
}
