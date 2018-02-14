package com.cliqz.browser.offrz;

import java.util.Locale;

/**
 * Keep methods and constants used globally by the Offrz module, like per country availability
 *
 * @author Stefano Pacifici
 */
public final class OffrzConfig {

    private OffrzConfig () {} // No instances

    public static boolean isOffrzSupportedForLang() {
        final Locale locale = Locale.getDefault();
        final String lang = locale.getLanguage();
        return Locale.GERMAN.getLanguage().equals(lang);
    }
}
