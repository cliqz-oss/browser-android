package com.cliqz.deckview;

import androidx.recyclerview.widget.RecyclerView;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.widget.CliqzFrameLayout;
import com.cliqz.widget.CliqzImageButton;
import com.cliqz.widget.CliqzImageView;
import com.facebook.drawee.view.SimpleDraweeView;
import com.cliqz.widget.CliqzTextView;

/**
 * @author Stefano Pacifici
 */
class ViewHolder extends RecyclerView.ViewHolder implements View.OnClickListener {
    final CliqzTextView titleTv;
    final TextView urlTv;
    final View backgroundView;
    final CliqzFrameLayout rootView;
    final CliqzImageView favIconIV;
    final SimpleDraweeView bigIconIV;
    final CliqzImageButton closeButton;

    private final TabsDeckView tabsDeckView;
    private boolean mIsIcongnito = false;

    ViewHolder(TabsDeckView tabsDeckView, View itemView) {
        super(itemView);
        titleTv = itemView.findViewById(R.id.titleTv);
        urlTv = itemView.findViewById(R.id.urlTv);
        backgroundView = itemView.findViewById(R.id.backgroundFl);
        rootView = (CliqzFrameLayout) itemView;
        favIconIV = itemView.findViewById(R.id.favIconImg);
        bigIconIV = itemView.findViewById(R.id.bigIconImg);
        closeButton = itemView.findViewById(R.id.closeBtn);
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

    public void setIncognito(boolean value) {
        if (value != mIsIcongnito) {
            mIsIcongnito = value;
            rootView.setIncognito(value);
            closeButton.setIncognito(value);
            titleTv.setIncognito(value);
            favIconIV.setIncognito(value);
        }
    }
}
