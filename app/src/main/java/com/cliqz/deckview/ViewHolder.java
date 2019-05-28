package com.cliqz.deckview;

import androidx.recyclerview.widget.RecyclerView;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.facebook.drawee.view.SimpleDraweeView;

/**
 * @author Stefano Pacifici
 */
class ViewHolder extends RecyclerView.ViewHolder implements View.OnClickListener {
    final TextView titleTv;
    final TextView urlTv;
    final View backgroundView;
    final View rootView;
    final ImageView favIconIV;
    final SimpleDraweeView bigIconIV;

    private final TabsDeckView tabsDeckView;

    ViewHolder(TabsDeckView tabsDeckView, View itemView) {
        super(itemView);
        titleTv = itemView.findViewById(R.id.titleTv);
        urlTv = itemView.findViewById(R.id.urlTv);
        backgroundView = itemView.findViewById(R.id.backgroundFl);
        rootView = itemView;
        favIconIV = itemView.findViewById(R.id.favIconImg);
        bigIconIV = itemView.findViewById(R.id.bigIconImg);
        final ImageButton closeButton = itemView.findViewById(R.id.closeBtn);
        this.tabsDeckView = tabsDeckView;

        closeButton.setOnClickListener(this);
        rootView.setOnClickListener(this);
    }

    @Override
    public void onClick(View view) {
        switch (view.getId()) {
            case R.id.closeBtn:
                tabsDeckView.closeTab(getLayoutPosition());
                break;
            case R.id.regular_tab_id:
                tabsDeckView.onTabClicked(getLayoutPosition());
                break;
            case R.id.incognito_tab_id:
                tabsDeckView.onTabClicked(getLayoutPosition());
                break;
            default:
                break;
        }
    }
}
