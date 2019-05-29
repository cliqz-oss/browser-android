package com.cliqz.browser.main.search;

import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Point;
import android.graphics.Rect;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.webview.Topsite;
import com.cliqz.utils.ViewUtils;
import com.facebook.drawee.view.SimpleDraweeView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;

import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

import static android.view.View.INVISIBLE;
import static android.view.View.VISIBLE;

/**
 * @author Stefano Pacifici
 */
class RemoveTopsitesOverlay {

    private Rect[] mOriginalTopsitePositions;
    private final TopsitesAdapter adapter;
    private final Freshtab freshtab;
    private ViewGroup mTopSitesContainer;
    private ArrayList<View> mTopSiteViews;
    private Rect[] mTopSitePositions;
    private final List<Topsite> removedTopSites;
    private  List<Integer> idxAtParentOfRemoved;
    private  List<Integer> draggedIdxOfRemoved;


    private int mDraggedViewIndex = -1;
    private RemoveTopSitesDialog mDialog;

    private final Point lastDragPosition = new Point();

    RemoveTopsitesOverlay(@NonNull Freshtab freshtab) {
        removedTopSites = new LinkedList<>();
        this.adapter = new TopsitesAdapter(freshtab.historyDatabase, freshtab.engine,
                freshtab.handler, freshtab.preferenceManager);
        this.freshtab = freshtab;
        idxAtParentOfRemoved = new ArrayList<>();
        draggedIdxOfRemoved = new ArrayList<>();
    }

    void start(@NonNull ViewGroup topSitesContainer) {
        if (mDialog != null && mDialog.isShowing()) {
            return;
        }

        removedTopSites.clear();
        mTopSitesContainer = topSitesContainer;
        mTopSitesContainer.setVisibility(INVISIBLE);
        mDialog = new RemoveTopSitesDialog(topSitesContainer.getContext());
        mDialog.contentView.calculateViewBounduaries();
        mDialog.contentView.refreshTopSites();
        mDialog.show();
    }

    boolean isStarted() {
        return mDialog != null && mDialog.isShowing();
    }

    /**
     * Part of the "immediately moveable topsites" workaround, this called by the
     * {@link TopsitesEventsListener} if the top sites layout in the {@link Freshtab} is still
     * receiving touch events after we start the {@link RemoveTopsitesOverlay}
     */
    void dispatchTouchEvent(MotionEvent event) {
        mDialog.contentView.dispatchTouchEvent(event);
    }

    private class RemoveTopSitesContentView extends FrameLayout {

        private final static int TRASHCAN_TOP_MARGIN_DP = 12;
        private final TrashCanView trashCanView;
        private final View controlsContainer;
        private final float trashcanViewTopMarginPx;

        public RemoveTopSitesContentView(@NonNull Context context) {
            super(context);
            setFocusableInTouchMode(true);
            setBackgroundColor(Color.argb(150, 0, 0, 0));
            final DisplayMetrics metrics = context.getResources().getDisplayMetrics();
            trashcanViewTopMarginPx = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP,
                    TRASHCAN_TOP_MARGIN_DP, metrics);
            trashCanView = new TrashCanView(context);
            addView(trashCanView);

            controlsContainer = LayoutInflater.from(context)
                    .inflate(R.layout.topsites_overlay_controls, this, false);
            addView(controlsContainer);
            ButterKnife.bind(this, controlsContainer);
        }

        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            final int topSitesNo = getTopsitesSize();
            if (topSitesNo > 0) {
                for (int index = 0; index < topSitesNo; index++) {
                    final Rect pos = mTopSitePositions[index];
                    final int widthSpec = MeasureSpec.makeMeasureSpec(pos.width(), MeasureSpec.EXACTLY);
                    final int heightSpec = MeasureSpec.makeMeasureSpec(pos.height(), MeasureSpec.EXACTLY);
                    mTopSiteViews.get(index).measure(widthSpec, heightSpec);
                }
            }

            final int controlsHeightSpec = MeasureSpec
                    .makeMeasureSpec(MeasureSpec.getSize(heightMeasureSpec), MeasureSpec.AT_MOST);
            final int trashCanWidthSpec = MeasureSpec
                    .makeMeasureSpec(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.AT_MOST);

            controlsContainer.measure(widthMeasureSpec, controlsHeightSpec);
            trashCanView.measure(trashCanWidthSpec, controlsHeightSpec);

            final int width = MeasureSpec.getSize(widthMeasureSpec);
            final int height = MeasureSpec.getSize(heightMeasureSpec);
            setMeasuredDimension(width, height);
        }

        private int getTopsitesSize() {
            return mTopSiteViews != null ? mTopSiteViews.size() : 0;
        }

        @Override
        protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
            final int topSitesNo = getTopsitesSize();
            if (topSitesNo > 0) {
                for (int index = 0; index < topSitesNo; index++) {
                    final Rect pos = mTopSitePositions[index];
                    mTopSiteViews.get(index).layout(pos.left, pos.top, pos.right, pos.bottom);
                }
            }

            if (!changed) {
                return;
            }

            final int width = right - left;
            final int height = bottom - top;

            final int trashLeft = (width - trashCanView.getMeasuredWidth()) / 2;
            final int trashRight = trashLeft + trashCanView.getMeasuredWidth();
            final int trashTop = (int) trashcanViewTopMarginPx;
            final int trashBottom = trashTop + trashCanView.getMeasuredHeight();
            trashCanView.layout(trashLeft, trashTop, trashRight, trashBottom);

            final int controlsHeight = controlsContainer.getMeasuredHeight();
            final int controlsTop = height - controlsHeight;
            controlsContainer.layout(0, controlsTop, width, height);
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            final int actionIndex = event.getActionIndex();
            if (actionIndex != 0) {
                return super.onTouchEvent(event);
            }
            final int action = event.getActionMasked();
            final int eventX = (int) event.getRawX();
            final int eventY = (int) event.getRawY();
            switch (action) {
                case MotionEvent.ACTION_DOWN:
                    mDraggedViewIndex = pickTopSite(eventX, eventY);
                    if (mDraggedViewIndex >= 0) {
                        adjustAlphaOfSelectedView(mDraggedViewIndex,0.5f);
                        animateDraggedTopsiteIcon(mDraggedViewIndex);
                        hideSelectedTopsiteTitle(mDraggedViewIndex);
                        return true;
                    }
                    break;
                case MotionEvent.ACTION_UP:
                    if (mDraggedViewIndex >= 0) {
                        if(!checkIfRemoved()){
                            showSelectedTopsiteTitle(mDraggedViewIndex);
                            clearDraggedTopsiteIconAnimation(mDraggedViewIndex);
                        }
                        reset();
                        mDraggedViewIndex = -1;
                        adjustAlphaOfSelectedView(mDraggedViewIndex,1f);
                        return true;
                    }
                    break;
                case MotionEvent.ACTION_MOVE:
                    if (mDraggedViewIndex >= 0) {
                        updateDraggedViewPosition(mDraggedViewIndex, eventX, eventY);
                        return true;
                    }
                    break;
            }
            return super.onTouchEvent(event);
        }

        private void animateDraggedTopsiteIcon(int draggedViewIndex) {
            final View view = mTopSiteViews.get(draggedViewIndex);
            Animation scale = new ScaleAnimation(1.0f, 1.3f, 1.0f, 1.3f, Animation
                    .RELATIVE_TO_SELF,
                    0.5f,
                    Animation.RELATIVE_TO_SELF, 0.5f);
            scale.setDuration(300);
            scale.setFillAfter(true);
            view.startAnimation(scale);
        }

        private void clearDraggedTopsiteIconAnimation(int draggedViewIndex){
            final View view = mTopSiteViews.get(draggedViewIndex);
            view.clearAnimation();
        }

        private void adjustAlphaOfSelectedView(int draggedViewIndex,float alpha){
            for(int i = 0;i < mTopSiteViews.size();i++){
                if(i != draggedViewIndex) {
                    mTopSiteViews.get(i).setAlpha(alpha);
                }
            }
        }

        private void hideSelectedTopsiteTitle(int position){
            ((TopsitesViewHolder)mTopSiteViews.get(position).getTag()).domainView.setVisibility(INVISIBLE);
        }

        private void showSelectedTopsiteTitle(int position){
            ((TopsitesViewHolder)mTopSiteViews.get(position).getTag()).domainView.setVisibility(VISIBLE);
        }

        private boolean checkIfRemoved() {
            // Here mDraggedViewIndex is >= 0
            if (!trashCanView.checkCollision(mTopSitePositions[mDraggedViewIndex])) {
                return false;
            }

            final View view = mTopSiteViews.get(mDraggedViewIndex);
            final TopsitesViewHolder holder = (TopsitesViewHolder) view.getTag();
            if (holder == null) {
                return false;
            }

            final Topsite topsite = holder.getTopsite();
            if (topsite != null) {
                removedTopSites.add(topsite);
                mTopSiteViews.remove(mDraggedViewIndex);
                draggedIdxOfRemoved.add(holder.getDraggedPosition());
                idxAtParentOfRemoved.add(holder.getPositionAtParent());
                removeView(view);
                updateControlIconsStatus();
            }
            return true;
        }

        public void updateControlIconsStatus() {
            final int removedTopsitesSz = removedTopSites.size();

            if (removedTopsitesSz > 0) {
                final String msg= getResources().getQuantityString(
                        R.plurals.topsite_deleted, removedTopsitesSz, removedTopsitesSz);
                mDialog.topsitesDeletedNum.setText(msg);
            } else {
                mDialog.topsitesDeletedNum.setVisibility(INVISIBLE);
                mDialog.undo.setVisibility(INVISIBLE);
                return;
            }
            mDialog.undo.setVisibility(VISIBLE);
            mDialog.topsitesDeletedNum.setVisibility(View.VISIBLE);
        }

        private void reset() {
            final int topSitesNo = getTopsitesSize();
            for (int index = 0; index < topSitesNo; index++) {
                mTopSitePositions[index] = new Rect(mOriginalTopsitePositions[index]);
                updateTopSitePosition(index, 0, 0);
            }
            trashCanView.setCollisionMode(false);
        }

        private void updateDraggedViewPosition(int index, int eventX, int eventY) {
            int deltaX = eventX - lastDragPosition.x;
            int deltaY = eventY - lastDragPosition.y;
            lastDragPosition.x = eventX;
            lastDragPosition.y = eventY;
            updateTopSitePosition(index, deltaX, deltaY);
            boolean ckCollision = trashCanView.checkCollision(mTopSitePositions[index]);
            trashCanView.setCollisionMode(ckCollision);
            final SimpleDraweeView icon = ((TopsitesViewHolder) mTopSiteViews.get(index).getTag())
                    .iconView;
            if(ckCollision) {
                icon.setAlpha(0.4f);
            }else{
                icon.setAlpha(1f);
            }
        }

        private void updateTopSitePosition(int index, int dx, int dy) {
            final Rect curPos = mTopSitePositions[index];
            curPos.left += dx;
            curPos.top += dy;
            curPos.right += dx;
            curPos.bottom += dy;

            final View view = mTopSiteViews.get(index);
            view.layout(curPos.left, curPos.top, curPos.right, curPos.bottom);
        }

        // After this call mDraggedView should be not null if something was picked or null otherwise
        private int pickTopSite(int eventX, int eventY) {
            final Rect hitRect = new Rect();
            final int topSitesNo = getTopsitesSize();
            for (int index = 0; index < topSitesNo; index++) {
                mTopSiteViews.get(index).getHitRect(hitRect);
                if (hitRect.contains(eventX, eventY)) {
                    lastDragPosition.x = eventX;
                    lastDragPosition.y = eventY;
                    return index;
                }
            }
            return -1;
        }

        private void calculateViewBounduaries() {
            final List<View> children = ViewUtils.findAllViewsWithId(mTopSitesContainer, R.id.top_site);
            mOriginalTopsitePositions = new Rect[children.size()];

            // Copy and adjust the bounduaries of the children
            int count = 0;
            for (View child: children) {
                mOriginalTopsitePositions[count] = Utils.calculatePositionFrom(child);
                count++;
            }
            Arrays.sort(mOriginalTopsitePositions, new Comparator<Rect>() {
                @Override
                public int compare(Rect o1, Rect o2) {
                    return o1.left - o2.left;
                }
            });
        }

        private void refreshTopSites() {
            adapter.fetchTopsites();
            final int topSitesNo = adapter.getDisplayedCount();
            mTopSiteViews = new ArrayList<>(topSitesNo);
            mTopSitePositions = new Rect[topSitesNo];
            for (int index = 0; index < topSitesNo; index++) {
                final View view = adapter.getView(index, null, this);
                mTopSiteViews.add(view);
                mTopSitePositions[index] = new Rect(mOriginalTopsitePositions[index]);
                addView(view);
                TopsitesViewHolder holder = ((TopsitesViewHolder)view.getTag());
                holder.setPositionAtParent(indexOfChild(view));
                holder.domainView.setTextColor(ContextCompat.getColor(getContext(),R.color.white));
            }
            requestLayout();
        }
    }

    class RemoveTopSitesDialog extends Dialog {

        final RemoveTopSitesContentView contentView;

        @Bind(R.id.button_undo)
        Button undo;

        @Bind(R.id.number_deleted_topsites)
        TextView topsitesDeletedNum;

        RemoveTopSitesDialog(@NonNull Context context) {
            super(context, R.style.Theme_Cliqz_Semitrasparent_FullScreen_Dialog);
            contentView = new RemoveTopSitesContentView(context);
            setContentView(contentView);
            ButterKnife.bind(this, contentView);
        }

        @Override
        public void show() {
            super.show();
            mTopSitesContainer.setVisibility(INVISIBLE);
        }

        @OnClick(R.id.button_undo)
        public void undo(){
            final int lastDraggedIndex = draggedIdxOfRemoved.size()-1;
            final int lastIdxAtParent = idxAtParentOfRemoved.size()-1;
            int draggedIndex = draggedIdxOfRemoved.get(lastDraggedIndex);
            final int idxAtParent = idxAtParentOfRemoved.get(lastIdxAtParent);
            final View view = adapter.getView(draggedIndex,null,this.contentView);
            draggedIndex = Math.min(mTopSiteViews.size(),draggedIndex);
            mTopSiteViews.add(draggedIndex,view);
            mTopSitePositions[draggedIndex] = new Rect(mOriginalTopsitePositions[draggedIndex]);
            this.contentView.addView(view,Math.min(idxAtParent,this.contentView.getChildCount()));
            draggedIdxOfRemoved.remove(lastDraggedIndex);
            idxAtParentOfRemoved.remove(lastIdxAtParent);
            removedTopSites.remove(removedTopSites.size()-1);
            this.contentView.updateControlIconsStatus();
            this.contentView.requestLayout();
        }

        @Override
        public void dismiss() {
            super.dismiss();
            mTopSitesContainer.setVisibility(VISIBLE);
            // Do not keep the reference
            mDialog = null;
        }

        @OnClick(R.id.button_apply)
        void apply() {
            final ArrayList<String> removedDomainsList = new ArrayList<>();
            for (Topsite topsite: removedTopSites) {
                if (topsite.domain.length() > 0) {
                    removedDomainsList.add(topsite.domain);
                }
            }
            final int removed = removedDomainsList.size();
            if (removed > 0) {
                String[] removedDomainsArray = new String[removed];
                removedDomainsArray = removedDomainsList.toArray(removedDomainsArray);
                freshtab.historyDatabase.blockDomainsForTopsites(removedDomainsArray);
                freshtab.refreshTopsites();
            }
            dismiss();
        }
    }
}
