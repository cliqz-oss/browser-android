package com.cliqz.browser.bus;

import java.util.List;

/**
 * Created by Ravjit on 19/10/15.
 *
 * Class of all the Events posted by the TabManager on the Bus
 */
public final class TabManagerEvents {

    private TabManagerEvents() {
    }

    /**
     *  An event posted on the bus for exiting the TabManager view
     */
    public static class ExitTabManager {

    }

    /**
     *  An event posted on the bus to open a tab clicked in the TabManager view
     */
    public static class OpenTab {

        public final String id;

        public OpenTab(final String id) {
            this.id = id;
        }
    }

    /**
     *  An event posted on the bus to close tabs from the TabManager view.
     *  Multiple tabs can be deleted in one click. If the user closes a group
     */
    public static class CloseTab {

        public final List<String> ids;

        public CloseTab(final List<String> ids) {
            this.ids = ids;
        }
    }
}
