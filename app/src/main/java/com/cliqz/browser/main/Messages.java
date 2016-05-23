package com.cliqz.browser.main;

/**
 * @author Stefano Pacifici
 * @date 2015/11/24
 */
public final class Messages {
    // No instances, please
    private Messages() {}

    public static class Exit {}

    public static class GoToHistory {}

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

    /**
     * This will make the app to transact to the Main fragment, the main fragment then will switch
     * to browsing mode displaying the relative web page
     */
    public static class GoToLink {
        public final String url;

        public GoToLink(String url) {
            this.url = url;
        }
    }

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
        public final long id;

        public AddToFavourites(long id) {
            this.id = id;
        }
    }

    public static class SaveLink {}
}
