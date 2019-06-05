/*
 * Copyright (c) 2012-2016 Arne Schwabe
 * Distributed under the GNU GPL v2 with additional terms. For full terms see the file doc/LICENSE.txt
 */

package com.cliqz.library.vpn.core;

import com.cliqz.library.vpn.core.LogItem;
import com.cliqz.library.vpn.core.ConnectionStatus;


interface IStatusCallbacks {
    /**
     * Called when the service has a new status for you.
     */
    oneway void newLogItem(in LogItem item);

    oneway void updateStateString(in String state, in String msg, in int resid, in ConnectionStatus level);

    oneway void updateByteCount(long inBytes, long outBytes);

    oneway void connectedVPN(String uuid);
}
