package com.cliqz.utils;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import androidx.annotation.NonNull;
import androidx.annotation.StringRes;
import androidx.core.content.ContextCompat;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ImageSpan;
import android.text.style.URLSpan;

import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author Stefano Pacifici
 */
public final class SpannableUtils {

    private static final Pattern MARKDOWN_PATTERN =
            Pattern.compile("((!?)\\[(.*?)\\]\\((.*?)\\))|(<br\\s*>)");

    private SpannableUtils() {
    } // No instances

    /**
     * Given a string resource id, the procedure tries to convert all
     * <a href="https://guides.github.com/features/mastering-markdown/">markdown tags</a> to a
     * {@link Spannable} with inline images and links.<br>
     * Use ht following formats for the string resources:<ul>
     *     <li>Inline images <pre>
     *     Regular text ![&lt;image alternate text&gt;](&lt;drawable name w/o extension&gt;) remaining string.
     *     </pre></li>
     *     <li>Inline links <pre>
     *     Text [&lt;link text&gt;](&lt;link url&gt;) remaining text.
     *     </pre></li>
     * </ul>
     * <strong>This is able to resolve only resources from the caller package id in the
     * {@link Context#getPackageName()} sense.</strong><br>
     * @param context the context from which load the drawables
     * @param str the string resource id to transform
     * @return the correctly formatted {@link Spannable}
     */
    public static Spannable markdownStringToSpannable(@NonNull Context context,
                                                      @StringRes int str) {
        final String in = context.getString(str);
        final Matcher matcher = MARKDOWN_PATTERN.matcher(in);
        final List<SpannableRegion> regions = new LinkedList<>();
        final Resources resources = context.getResources();
        while (matcher.find()) {
            final SpannableRegion region;
            if (matcher.group(5) != null) {
                // A line break
                region = new SpannableRegion(matcher.start(), matcher.end());
            } else if ("!".equals(matcher.group(2))) {
                // A drawable
                final String drawableName = matcher.group(4);
                int drawableId = resources.getIdentifier(drawableName, "drawable", context.getPackageName());
                final Drawable drawable;
                if (drawableId == 0) {
                    drawable = null;
                } else {
                    drawable = ContextCompat.getDrawable(context, drawableId);
                    drawable.setBounds(0, 0, drawable.getIntrinsicWidth(), drawable.getIntrinsicHeight());
                }
                region = new SpannableRegion(matcher.start(), matcher.end(),
                        matcher.group(3), drawable);
            } else {
                // A link
                region = new SpannableRegion(matcher.start(), matcher.end(), matcher.group(3),
                        matcher.group(4));
            }
            regions.add(region);
        }

        if (regions.size() == 0) {
            return new SpannableString(in);
        }

        final SpannableStringBuilder builder = new SpannableStringBuilder();
        final Iterator<SpannableRegion> iterator = regions.iterator();
        int prev = 0;
        while (iterator.hasNext()) {
            SpannableRegion region = iterator.next();
            builder.append(in.substring(prev, region.regionStart));
            builder.append(region.text);
            final Object span;
            switch (region.type) {
                case DRAWABLE:
                    span = region.drawable != null ? new ImageSpan(region.drawable) : null;
                    break;
                case LINK:
                    span = new URLSpan(region.url);
                    break;
                default:
                    span = null;
            }
            final int length = builder.length();
            final int spanStart = length - region.text.length();
            if (span != null) {
                builder.setSpan(span, spanStart, length, Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
            }
            prev = region.regionEnd;
        }
        if (prev < in.length()) {
            builder.append(in.substring(prev, in.length()));
        }
        return builder;
    }
}
