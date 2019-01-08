package com.cliqz.browser.controlcenter;

import android.support.annotation.ColorRes;
import android.support.annotation.DrawableRes;
import android.support.annotation.StringRes;

import com.cliqz.browser.R;

/**
 * @author Ravjit Uppal
 */
public enum GhosteryCategories {

    advertising(R.string.advertising, R.color.advertising, R.drawable.ic_advertising),
    site_analytics(R.string.site_analytics, R.color.analytics, R.drawable.ic_site_analytics),
    comments(R.string.comments, R.color.comments, R.drawable.ic_comments),
    customer_interaction(R.string.customer_interaction, R.color.customer_interaction, R.drawable.ic_customer_intraction),
    audio_video_player(R.string.video_player, R.color.video_player, R.drawable.ic_video_player),
    adult_content(R.string.adult_content, R.color.adult_content, R.drawable.ic_adult_content),
    essential(R.string.essential, R.color.essential, R.drawable.ic_essential),
    social_media(R.string.social_media, R.color.social_media, R.drawable.ic_social_media),
    unknown(R.string.others, R.color.unknown, R.drawable.ic_unknown),
    misc(R.string.misc, R.color.misc, R.drawable.ic_misc),
    hosting(R.string.hosting, R.color.hosting, R.drawable.ic_hosting),
    cdn(R.string.cdn, R.color.hosting, R.drawable.ic_hosting);

    public static GhosteryCategories safeValueOf(String value) {
        try {
            return GhosteryCategories.valueOf(value);
        } catch (IllegalArgumentException e) {
            return unknown;
        }
    }

    public final @StringRes int categoryName;
    public final @ColorRes int categoryColor;
    public final @DrawableRes int categoryIcon;

    GhosteryCategories(@StringRes int name, @ColorRes int color, @DrawableRes int icon) {
        categoryName = name;
        categoryColor = color;
        categoryIcon = icon;
    }
}
