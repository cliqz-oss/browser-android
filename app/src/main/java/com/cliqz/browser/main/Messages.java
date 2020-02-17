package com.cliqz.browser.main;

import androidx.annotation.NonNull;

import org.json.JSONObject;

/**
 * @author Stefano Pacifici
 */
@SuppressWarnings("WeakerAccess")
public final class Messages {
    // No instances, please
    private Messages() {
    }

    public enum ControlCenterStatus {
        DISABLED,
        ENABLED
    }

    /**
     * Sent when the user click on the Quit entry in the Overflow Menu
     */
    public static class Quit {
    }

    public static class GoToOverview {
    }

    public static class GoToHistory {
    }

    public static class GoToFavorites {
    }

    public static class GoToOffrz {
    }

    public static class GoToSettings {
    }

    public static class UpdateTitle {
    }

    public static class BackPressed {
    }

    public static class GoToPurchase {
        public final int trialDaysLeft;

        public GoToPurchase(int trialDaysLeft) {
            this.trialDaysLeft = trialDaysLeft;
        }
    }

    /**
     * This message is fired by the web view client when we navigate back to search from web
     * navigation, it is not a transaction between different app statuses.
     */
    public static class ShowSearch {
        public final String query;

        public ShowSearch(String query) {
            this.query = query;
        }
    }

    public static class ReloadPage {
    }

    public static class ShareLink {
    }

    public static class CopyUrl {
    }

    public static class GoForward {
    }

    public static class ShareCard {
        public final JSONObject cardDetails;

        public ShareCard(JSONObject cardDetails) {
            this.cardDetails = cardDetails;
        }
    }

    public static class AddToFavourites {
        public final String url;
        public final String title;

        public AddToFavourites(String url, String title) {
            this.url = url;
            this.title = title;
        }
    }

    public static class SaveLink {
    }

    public static class AdjustPan {
    }

    public static class AdjustResize {
    }

    public static class ForceUpdateTrackerCount {
        public final int trackerCount;

        public ForceUpdateTrackerCount(int trackerCount) {
            this.trackerCount = trackerCount;
        }
    }

    public static class ResetTrackerCount {
    }

    public static class UpdateTabCounter {
        public final int count;

        public UpdateTabCounter(int count) {
            this.count = count;
        }
    }

    /**
     * Change the user agent of the webview
     */
    public static class ChangeUserAgent {
        public final boolean isDesktopSiteEnabled;

        /**
         * Change the user agent of the webview
         *
         * @param isDesktopSiteEnabled true if the useragent is of desktop, false if it is mobile useragent
         */
        public ChangeUserAgent(boolean isDesktopSiteEnabled) {
            this.isDesktopSiteEnabled = isDesktopSiteEnabled;
        }
    }

    public static class SwitchToForget {
    }

    public static class SwitchToNormalTab {
    }

    public static class UpdateAntiTrackingList {
        public final int trackerCount;

        public UpdateAntiTrackingList(int trackerCount) {
            this.trackerCount = trackerCount;
        }
    }

    public static class UpdateAdBlockingList {
    }

    public static class DismissControlCenter {
    }

    public static class DismissVpnPanel {
    }

    public static class UpdateControlCenterIcon {
        @NonNull public final ControlCenterStatus status;

        public UpdateControlCenterIcon(@NonNull ControlCenterStatus status) {
            this.status = status;
        }
    }

    public static class EnableAdBlock {
    }

    public static class EnableAttrack {
    }

    public static class UpdateFavIcon {
    }

    public static class KeyBoardClosed {
    }

    public static class UpdateQuery {
        public final String suggestion;

        public UpdateQuery(String suggestion) {
            this.suggestion = suggestion;
        }
    }

    public static class QuerySuggestions {
        public final String query;
        public final String[] suggestions;

        public QuerySuggestions(@NonNull String query, @NonNull String[] suggestions) {
            this.query = query;
            this.suggestions = suggestions;
        }
    }

    public static class OnFreshTabVisible {
    }

    public static class NotifySubscription {
    }

    public static class OpenQuery {
        public final String query;

        public OpenQuery(String query) {
            this.query = query;
        }
    }
  
    public static class OnOverviewTabSwitched {
        public int position;

        public OnOverviewTabSwitched(int position) {
            this.position = position;
        }
    }

    public static class OnContextualBarDeletePressed {
    }

    public static class OnContextualBarCancelPressed {
    }

    /**
     * Sent from {@link QuickAccessBar} to open the {@link com.cliqz.browser.widget.OverFlowMenu}
     */
    public static class OnOpenMenuButton {
    }

    public static class ClearDashboardData {
    }

    public static class OnVpnPermissionGranted {
    }

    public static class OnTrialPeriodResponse {
    }

    public static class OnDashboardStateChange {
    }

    public static class onVpnStateChange {
    }

    public static class PurchaseCompleted {
    }

    public static class SearchBarBackPressed {
    }

    public static class SearchBarClearPressed {
    }

    public static class OnAllProfilesImported {
    }

    public static class CloseOpenTabs {
    }
}
