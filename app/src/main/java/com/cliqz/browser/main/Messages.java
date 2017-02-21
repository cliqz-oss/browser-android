package com.cliqz.browser.main;

import android.support.annotation.DrawableRes;

import org.json.JSONArray;

import javax.annotation.Resource;

/**
 * @author Stefano Pacifici
 * @date 2015/11/24
 */
public final class Messages {
    // No instances, please
    private Messages() {
    }

    /**
     * Sent when the user click on the Quit entry in the Overflow Menu
     */
    public static class Quit {
    }

    public static class GoToOverview {
    }

    public static class GoToSettings {
    }

    public static class UpdateTitle {
    }

    public static class GoToSearch {
        public final String query;

        public GoToSearch() {
            this.query = null;
        }

        public GoToSearch(String query) {
            this.query = query;
        }
    }

    public static class BackPressed {
    }

    /**
     * !!! THIS IS VERY DIFFERENT FROM {@link com.cliqz.browser.main.Messages.GoToSearch} MESSAGE !!!
     * <p>
     * This message is fired by the web view client when we navigate back to search from web
     * navigation, it is not a transaction between different app statuses.
     */
    public static class ShowSearch {
        public final String query;

        public ShowSearch(String query) {
            this.query = query;
        }
    }

    /**
     * Force the app to show the home page
     */
    public static class ShowHomePage {
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
        public final String url;

        public ShareCard(String url) {
            this.url = url;
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

    public static class FetchYoutubeVideoUrls {
        public final JSONArray urls;
        public final String videoPageUrl;
        //public final boolean instantDownload;

        public FetchYoutubeVideoUrls() {
            this.urls = null;
            this.videoPageUrl = null;
        }

        public FetchYoutubeVideoUrls(JSONArray urls) {
            this.urls = urls;
            this.videoPageUrl = null;
        }

        public FetchYoutubeVideoUrls(String url) {
            this.urls = null;
            this.videoPageUrl = url;
        }
    }

    public static class SetVideoUrls {
        public final JSONArray urls;

        public SetVideoUrls(JSONArray urls) {
            this.urls = urls;
        }
    }

    public static class DownloadYoutubeVideo {
        public final String targetType;

        public DownloadYoutubeVideo(String targetType) {
            this.targetType = targetType;
        }
    }

    public static class SaveId {
        public final long downloadId;

        public SaveId(long downloadId) {
            this.downloadId = downloadId;
        }
    }

    public static class UpdateTrackerCount {
    }

    public static class ResetTrackerCount {
    }

    public static class UpdateTabsOverview {
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

    public static class UpdateControlCenterIcon {
        @DrawableRes public int icon;

        public UpdateControlCenterIcon(int icon) {
            this.icon = icon;
        }
    }

    public static class EnableAdBlock {
    }

    public static class EnableAttrack {
    }
}