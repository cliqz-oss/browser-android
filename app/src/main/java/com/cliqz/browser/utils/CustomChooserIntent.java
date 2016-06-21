package com.cliqz.browser.utils;


import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Parcelable;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;

public class CustomChooserIntent {

    /**
     * Creates a chooser that doesn't show installed apps that are blocked by the blackList.
     *
     * @param pm PackageManager instance.
     * @param target The intent to share.
     * @param title The title of the chooser dialog.
     * @param blackList A list of package names that are not allowed to show.
     * @return Updated intent, to be passed to {@link android.content.Context#startActivity}.
     */
    public static Intent create(PackageManager pm, Intent target, String title,
                                List<String> blackList) {
        Intent dummy = new Intent(target.getAction());
        dummy.setType(target.getType());
        dummy.setData(target.getData());
        List<ResolveInfo> resInfo = pm.queryIntentActivities(dummy, 0);
        List<HashMap<String, String>> metaInfo = new ArrayList<>();
        for (ResolveInfo ri : resInfo) {
            if (ri.activityInfo == null) {
                continue;
            }
            boolean isBlackListed = false;
            for (String blackListedPackage : blackList) {
                if (ri.activityInfo.packageName.contains(blackListedPackage)) {
                    isBlackListed = true;
                    break;
                }
            }
            if (isBlackListed) {
                continue;
            }

            HashMap<String, String> info = new HashMap<>();
            info.put("packageName", ri.activityInfo.packageName);
            info.put("className", ri.activityInfo.name);
            info.put("simpleName", String.valueOf(ri.activityInfo.loadLabel(pm)));
            metaInfo.add(info);
        }

        if (metaInfo.isEmpty()) {
            // Force empty chooser by setting a nonexistent target class.
            Intent emptyIntent = (Intent) target.clone();
            emptyIntent.setPackage("your.package.name");
            emptyIntent.setClassName("your.package.name", "NonExistingActivity");
            return Intent.createChooser(emptyIntent, title);
        }

        // Sort items by display name.
        Collections.sort(metaInfo, new Comparator<HashMap<String, String>>() {
            @Override
            public int compare(HashMap<String, String> map, HashMap<String, String> map2) {
                return map.get("simpleName").compareTo(map2.get("simpleName"));
            }
        });

        // create the custom intent list
        List<Intent> targetedIntents = new ArrayList<>();
        for (HashMap<String, String> mi : metaInfo) {
            Intent targetedShareIntent = (Intent) target.clone();
            targetedShareIntent.setPackage(mi.get("packageName"));
            targetedShareIntent.setClassName(mi.get("packageName"), mi.get("className"));
            targetedIntents.add(targetedShareIntent);
        }

        Intent chooserIntent = Intent.createChooser(targetedIntents.get(0), title);
        targetedIntents.remove(0);
        Parcelable[] targetedIntentsParcelable =
                targetedIntents.toArray(new Parcelable[targetedIntents.size()]);
        chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, targetedIntentsParcelable);
        return chooserIntent;
    }

}