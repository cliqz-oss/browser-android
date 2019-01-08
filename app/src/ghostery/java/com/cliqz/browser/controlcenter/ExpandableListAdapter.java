package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseExpandableListAdapter;
import android.widget.ImageView;
import android.widget.TextView;

import com.cliqz.browser.R;

import java.util.HashMap;
import java.util.List;

/**
 * @author Ravjit Uppal
 */
public class ExpandableListAdapter extends BaseExpandableListAdapter {

    private Context context;
    private List<GhosteryCategories> listDataHEader;
    private HashMap<String, List<TrackerCompanyModel>> listDataChild;
    private boolean mIsEnabled;


    ExpandableListAdapter(Context context, List<GhosteryCategories> listDataHEader, HashMap<String,
            List<TrackerCompanyModel>> listDataChild, boolean isEnabled) {
        this.context = context;
        this.listDataHEader = listDataHEader;
        this.listDataChild = listDataChild;
        this.mIsEnabled = isEnabled;
    }


    @Override
    public int getGroupCount() {
        return listDataHEader.size();
    }

    @Override
    public int getChildrenCount(int groupPosition) {
        return listDataChild.get(listDataHEader.get(groupPosition).name()).size();
    }

    @Override
    public GhosteryCategories getGroup(int groupPosition) {
        return listDataHEader.get(groupPosition);
    }

    @Override
    public TrackerCompanyModel getChild(int groupPosition, int childPosition) {
        return listDataChild.get(listDataHEader.get(groupPosition).name()).get(childPosition);
    }

    @Override
    public long getGroupId(int groupPosition) {
        return groupPosition;
    }

    @Override
    public long getChildId(int groupPosition, int childPosition) {
        return childPosition;
    }

    @Override
    public boolean hasStableIds() {
        return false;
    }

    @Override
    public boolean areAllItemsEnabled() {
        return true;
    }

    @Override
    public View getGroupView(int groupPosition, boolean isExpanded, View convertView, ViewGroup parent) {
        GhosteryCategories headerTitle = getGroup(groupPosition);
        if (convertView == null) {
            LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            convertView = inflater.inflate(R.layout.list_group, null);
        }
        TextView header = (TextView) convertView.findViewById(R.id.category_name);
        TextView trackerCount = (TextView) convertView.findViewById(R.id.tracker_count);
        TextView trackerBlocked = (TextView) convertView.findViewById(R.id.trackers_blocked);
        ImageView categoryIcon = (ImageView) convertView.findViewById(R.id.category_icon);
        ImageView groupArrowIndicator = (ImageView) convertView.findViewById(R.id.group_arrow_indicator);
        if (isExpanded) {
            groupArrowIndicator.setImageDrawable(context.getDrawable(R.drawable.ic_arrow_up));
        } else {
            groupArrowIndicator.setImageDrawable(context.getDrawable(R.drawable.ic_arrow_down));
        }
        header.setText(headerTitle.categoryName);
        trackerCount.setText(Integer.toString(listDataChild.get(headerTitle.name()).size())+" Trackers");
        int blockedCount = 0;
        for (int i = 0; i < listDataChild.get(headerTitle.name()).size(); i++) {
            if (listDataChild.get(headerTitle.name()).get(i).isBlocked) {
                blockedCount++;
            }
        }
        if (mIsEnabled) {
            trackerBlocked.setText(Integer.toString(blockedCount) + " "
                    + context.getResources().getString(R.string.blocked));
            trackerBlocked.setTextColor(context.getResources().getColor(R.color.control_center_green));
        } else {
            trackerBlocked.setText(Integer.toString(listDataChild.get(headerTitle.name()).size()) + " "
                    + context.getResources().getString(R.string.active));
            trackerBlocked.setTextColor(context.getResources().getColor(R.color.attrack_red_1));
        }
        categoryIcon.setImageDrawable(context.getDrawable(getGroup(groupPosition).categoryIcon));
        return convertView;
    }

    @Override
    public View getChildView(int groupPosition, int childPosition, boolean isLastChild, View convertView, ViewGroup parent) {
        final TrackerCompanyModel trackerCompany = getChild(groupPosition, childPosition);
        if (convertView == null) {
            LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            convertView = inflater.inflate(R.layout.list_item, null);
        }
        TextView company = (TextView) convertView.findViewById(R.id.company_name);
        ImageView blockStatusIcon = (ImageView) convertView.findViewById(R.id.block_status_icon);
        company.setText(trackerCompany.trackerName);
        if (mIsEnabled && trackerCompany.isBlocked) {
            company.setTypeface(company.getTypeface(), Typeface.ITALIC);
            company.setPaintFlags(company.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
        } else {
            company.setTypeface(company.getTypeface(), Typeface.NORMAL);
            company.setPaintFlags(company.getPaintFlags() & (~ Paint.STRIKE_THRU_TEXT_FLAG));

        }
        if (mIsEnabled) {
            blockStatusIcon.setImageDrawable(trackerCompany.isBlocked ? context.getDrawable(R.drawable.ic_shield_green) : context.getDrawable(R.drawable.ic_shield_red));
        } else {
            blockStatusIcon.setImageDrawable(context.getDrawable(R.drawable.ic_shield_red));
        }
        return convertView;
    }

    @Override
    public boolean isChildSelectable(int groupPosition, int childPosition) {
        return true;
    }
}
