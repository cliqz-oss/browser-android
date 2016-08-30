package com.cliqz.browser.main;

import org.json.JSONArray;

/**
 * @author Stefano Pacifici
 * @date 2015/11/24
 */
public final class Messages {
    // No instances, please
    private Messages() {}

    public static class Exit {}

    public static class GoToOverview {}

    public static class GoToSuggestions {}

    public static class GoToSettings {}

    public static class UpdateTitle {}

    public static class GoToSearch {
        public final String query;

        public GoToSearch() {
            this.query = null;
        }

        public GoToSearch(String query) {
            this.query = query;
        }
    }

    public static class BackPressed {}

    /**
     * !!! THIS IS VERY DIFFERENT FROM {@link com.cliqz.browser.main.Messages.GoToSearch} MESSAGE !!!
     *
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
    public static class ShowHomePage {}

    public static class ReloadPage {}

    public static class ShareLink {}

    public static class ContactCliqz {}

    public static class CopyUrl {}

    public static class GoForward {}

    public static class ShareCard {
        public final String url;

        public ShareCard(String url) {
            this.url = url;
        }
    }

    public static class AddToFavourites {
        public final String url;

        public AddToFavourites(String url) {
            this.url = url;
        }
    }

    public static class SaveLink {}

    public static class AdjustPan {}

    public static class AdjustResize {}

    public static class FetchYoutubeVideoUrls {
        public final JSONArray urls;
        public final String videoPageUrl;
        //public final boolean instantDownload;

        public FetchYoutubeVideoUrls() {
            this. urls = null;
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

    public static class HideLoadingScreen {
    }
}
