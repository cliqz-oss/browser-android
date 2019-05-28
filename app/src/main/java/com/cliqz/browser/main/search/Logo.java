package com.cliqz.browser.main.search;

import androidx.annotation.Nullable;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author Stefano Pacifici
 */
public class Logo {

    private static Pattern LOGOS_REGEX =
            Pattern.compile("^(url\\()?(.*)/logos/(.*)(\\.svg(\\))?)");

    private enum LogoSizes {
        s48x48(48),
        s72x72(72),
        s96x96(96),
        s144x144(144),
        s192x192(192),
        s288x288(288),
        s384x384(384),
        s528x528(528),
        s672x672(672),
        s816x816(816),
        s1056x1056(1056),
        s1296x1296(1296),
        s1536x1536(1536),
        s1824x1824(1824);


        final int size;

        LogoSizes(int size) {
            this.size = size;
        }

        public static LogoSizes getSize(int maxSide) {
            final LogoSizes[] values = LogoSizes.values();
            int maxIndex = 0;
            float maxError = 1f / Math.abs(values[0].size - maxSide);
            for (int i = 1; i < values.length; i++) {
                final float error = 1f / Math.abs(values[i].size - maxSide);
                if (error > maxError) {
                    maxIndex = i;
                    maxError = error;
                }
            }
            return values[maxIndex];
        }
    }

    @Nullable
    public static String getUriFromSvgUri(@Nullable String iconUrl, int width, int height) {
        if (iconUrl == null || iconUrl.isEmpty()) {
            return null;
        }
        final Matcher matcher = LOGOS_REGEX.matcher(iconUrl);
        if (!matcher.matches()) {
            return null;
        }
        final int maxSide = Math.max(width, height);
        final LogoSizes logoSize = LogoSizes.getSize(maxSide);
        return String.format(Locale.US, "%s/pngs/%s_%d.png",
                matcher.group(2), matcher.group(3), logoSize.size);
    }
}
