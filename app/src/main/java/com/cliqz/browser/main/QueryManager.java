package com.cliqz.browser.main;

import android.util.Patterns;

import acr.browser.lightning.database.HistoryDatabase;

/**
 * @author Ravjit Uppal
 */
public class QueryManager {

    private static final int MAXIMUM_WAITING_TIME = 2 * 1000;

    private HistoryDatabase historyDatabase;
    private String lastTypedQuery = null;
    private long previousQueryTime = -1;
    private boolean isForgetTab = false;

    public QueryManager(HistoryDatabase historyDatabase) {
        this.historyDatabase = historyDatabase;
    }

    void setForgetMode(boolean isForgetTab) {
        this.isForgetTab = isForgetTab;
    }

    void addLatestQueryToDatabase() {
        addQueryToDatabase(lastTypedQuery);
        lastTypedQuery = null;
    }

    public void addOrIgnoreQuery(String currentQuery) {
        if (isForgetTab) {
            lastTypedQuery = null;
            return;
        }
        if (lastTypedQuery == null) {
            lastTypedQuery = currentQuery;
            previousQueryTime = System.currentTimeMillis();
            return;
        }
        //if time since the previous query is more than MAXIMUM_WAITING_TIME, add the query to the db
        if (System.currentTimeMillis() - previousQueryTime > MAXIMUM_WAITING_TIME) {
            //if either the previous query is not a prefix of current query
            // or the current query is not a prefix of previous query add the previous query also
            if (!currentQuery.startsWith(lastTypedQuery) && !lastTypedQuery.startsWith(currentQuery)) {
                addQueryToDatabase(lastTypedQuery);
            }
            addQueryToDatabase(currentQuery);
            lastTypedQuery = null;
        } else {
            if (!currentQuery.startsWith(lastTypedQuery) && !lastTypedQuery.startsWith(currentQuery)) {
                addQueryToDatabase(lastTypedQuery);
            }
            lastTypedQuery = currentQuery;
            previousQueryTime = System.currentTimeMillis();
        }
    }

    private void addQueryToDatabase(String query) {
        if (query == null || query.isEmpty() || Patterns.WEB_URL.matcher(query).matches()) {
            return;
        }
        historyDatabase.addQuery(query);
    }
}
