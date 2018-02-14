package com.cliqz.deckview;

import android.content.res.Configuration;
import android.support.v7.widget.RecyclerView;
import android.view.View;
import android.view.View.MeasureSpec;
import android.view.ViewGroup;

/**
 * @author Stefano Pacifici
 */
class DeckLayoutManager extends RecyclerView.LayoutManager {

    private static final float REMAINDERS_NO = 3f;
    private static final float MAIN_CARD_VISIBLE_SIZE_PERCENTAGE = 0.7f;
    private static final float SECONDARY_CARD_VISIBLE_SIZE_PERCENTAGE = 0.6f;
    private static final float OTHER_CARDS_VISIBLE_SIZE_PERCENTAGE = 0.3f;

    private final float remainderSize;
    private final float deckPadding;

    private float mCardHeight;
    private float mCardWidth;

    private int mScrollPosition = 0;
    private float mCardMaxVisibleAreaSize;
    private float mOtherCardsSize;
    private float mRemiderThreshold;
    private float mSpecialScrollStep; // 0.75f x * mCardHeight
    private float mMpos;
    private float mQpos;
    // Measure stuff only once
    private boolean mMeasured = false;
    private float[][] mTops;
    private int mCurrentFirstVisible  = -1;

    // Used to scroll to a given position at start-up time
    private int mFirstCard = -1;

    // Orientation of the view, depends only on the width/height ratio of the view
    private int mOrientation;

    DeckLayoutManager(TabsDeckView deckView) {
        super();
        this.remainderSize = deckView.mRemainderSize;
        this.deckPadding = deckView.mDeckPadding;
    }

    @Override
    public RecyclerView.LayoutParams generateDefaultLayoutParams() {
        return new RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    @Override
    public void onLayoutChildren(RecyclerView.Recycler recycler, RecyclerView.State state) {
        if (!mMeasured) {
            mMeasured = true;

            // Find supported scroll direction
            final float ratio = (float) getWidth() / (float) getHeight();
            final float secondaryCardSize;
            if (ratio > 4f / 3f) {
                mOrientation = Configuration.ORIENTATION_LANDSCAPE;
                mCardHeight = getHeight() - 2 * deckPadding;
                mCardWidth = getWidth() - 3 * remainderSize - deckPadding;
                mCardMaxVisibleAreaSize = mCardWidth * MAIN_CARD_VISIBLE_SIZE_PERCENTAGE;
                secondaryCardSize = mCardWidth * SECONDARY_CARD_VISIBLE_SIZE_PERCENTAGE;
                mOtherCardsSize = mCardWidth * OTHER_CARDS_VISIBLE_SIZE_PERCENTAGE;
                mSpecialScrollStep = mCardWidth * (MAIN_CARD_VISIBLE_SIZE_PERCENTAGE) - remainderSize;
            } else {
                mOrientation = Configuration.ORIENTATION_PORTRAIT;
                mCardHeight = getHeight() - 3 * remainderSize - deckPadding;
                mCardWidth = getWidth() - 2 * deckPadding;
                mCardMaxVisibleAreaSize = mCardHeight * MAIN_CARD_VISIBLE_SIZE_PERCENTAGE;
                secondaryCardSize = mCardHeight * SECONDARY_CARD_VISIBLE_SIZE_PERCENTAGE;
                mOtherCardsSize = mCardHeight * OTHER_CARDS_VISIBLE_SIZE_PERCENTAGE;
                mSpecialScrollStep = mCardHeight * (MAIN_CARD_VISIBLE_SIZE_PERCENTAGE) - remainderSize;
            }
            mRemiderThreshold = (mCardMaxVisibleAreaSize - remainderSize) * REMAINDERS_NO;
            mMpos = 1.0f / mCardMaxVisibleAreaSize;
            mQpos = -1.0f * mRemiderThreshold * mMpos;
            mTops = new float[][]{
                    new float[]{
                            0.0f,
                            mCardMaxVisibleAreaSize,
                            mCardMaxVisibleAreaSize + secondaryCardSize,
                    },
                    new float[]{
                            0.0f,
                            remainderSize,
                            remainderSize + mCardMaxVisibleAreaSize,
                            remainderSize + mCardMaxVisibleAreaSize + secondaryCardSize,
                    },
                    new float[]{
                            0.0f,
                            remainderSize,
                            2.0f * remainderSize,
                            2.0f * remainderSize + mCardMaxVisibleAreaSize,
                            2.0f * remainderSize + mCardMaxVisibleAreaSize + secondaryCardSize,
                    },
                    new float[]{
                            0.0f,
                            remainderSize,
                            2.0f * remainderSize,
                            3.0f * remainderSize,
                            3.0f * remainderSize + mCardMaxVisibleAreaSize,
                            3.0f * remainderSize + mCardMaxVisibleAreaSize + secondaryCardSize,
                    }
            };
        }

        if (mFirstCard > -1) {
            mScrollPosition = scrollPositionFromCardIndex(mFirstCard);
            mFirstCard = -1;
        }
        updateViews(recycler, state);
    }

    // Calculate the scrolling position given a card index (reverse op)
    private int scrollPositionFromCardIndex(int position) {
        if (position < 0) {
            return 0;
        }
        switch (position) {
            case 0:
                return 0;
            case 1:
            case 2:
                return (int) (mCardMaxVisibleAreaSize - remainderSize) * position;
            case 3:
                return (int) mCardMaxVisibleAreaSize + scrollPositionFromCardIndex(2);
            default:
                return (int) ((position - REMAINDERS_NO + 1) * mCardMaxVisibleAreaSize) +
                        scrollPositionFromCardIndex(2);
        }
    }

    @Override
    public boolean supportsPredictiveItemAnimations() {
        return true;
    }

    private int firstVisibleCard(RecyclerView.State state) {
        if (mScrollPosition < mRemiderThreshold) {
            return 0;
        } else {
            final int fc = (int) (mScrollPosition * mMpos + mQpos);
            return Math.min(state.getItemCount(), fc);
        }
    }

    private void calculateTops(float lowerBound, int firstVisible, int cardIndex,
                               float[] outTops) {
        if (cardIndex - firstVisible == 0) {
            outTops[0] = 0.0f;
            outTops[1] = 0.0f;
            return;
        }
        // We need to know what columns are associated with the bounds
        final int lowerBoundTopsIndex = Math.min(mTops.length-1,
                ((int) (lowerBound / (mCardMaxVisibleAreaSize - remainderSize)) ));
        final int upperBoundTopsIndex = Math.min(mTops.length-1, lowerBoundTopsIndex + 1);
        final int index = cardIndex - firstVisible;
        final int nextIndex;
        if (lowerBound < mRemiderThreshold) {
            nextIndex = index;
        } else {
            nextIndex = index-1;
        }
        outTops[0] = getTop(mTops[lowerBoundTopsIndex], index);
        outTops[1] = getTop(mTops[upperBoundTopsIndex], nextIndex);
    }

    private float getTop(float[] tops, int i) {
        final int len = tops.length;
        if (i < len) {
            return tops[i];
        } else {
            return tops[len-1] + (i - len + 1) * mOtherCardsSize;
        }
    }

    // Calculate the next scrolling step (the one in which one card disappears from the deck)
    private float upperBound() {
       if (mScrollPosition < mRemiderThreshold) {
           return ((int) (mScrollPosition / mSpecialScrollStep + 1f)) * mSpecialScrollStep;
       } else {
           final float remaindersSize = mSpecialScrollStep * REMAINDERS_NO;
           final float extra = mScrollPosition - remaindersSize;
           return ((int) (extra / mCardMaxVisibleAreaSize + 1f)) * mCardMaxVisibleAreaSize + remaindersSize;
       }
    }

    private float interpolate(float x, float a, float b, float v1, float v2) {
        final float m = (v2 - v1) / (b - a);
        final float q = v1 - m * a;
        return m * x + q;
    }

    private float lowerBound() {
        if (mScrollPosition < mRemiderThreshold) {
            return ((int) (mScrollPosition / mSpecialScrollStep)) * mSpecialScrollStep;
        } else {
            final float remaindersSize = mSpecialScrollStep * REMAINDERS_NO;
            final float extra = mScrollPosition - remaindersSize;
            return ((int) (extra / mCardMaxVisibleAreaSize)) * mCardMaxVisibleAreaSize + remaindersSize;
        }
    }

    @Override
    public boolean canScrollVertically() {
        return mOrientation == Configuration.ORIENTATION_PORTRAIT;
    }

    @Override
    public boolean canScrollHorizontally() {
        return mOrientation == Configuration.ORIENTATION_LANDSCAPE;
    }

    @Override
    public int scrollVerticallyBy(int dy, RecyclerView.Recycler recycler, RecyclerView.State state) {
        return genericScroll(dy, recycler, state);
    }

    @Override
    public int scrollHorizontallyBy(int dx, RecyclerView.Recycler recycler, RecyclerView.State state) {
        return genericScroll(dx, recycler, state);
    }

    private int genericScroll(int dp, RecyclerView.Recycler recycler, RecyclerView.State state) {
        final float maxScroll = calculateMaxScroll(state);
        final int newPosition = Math.min((int) maxScroll, Math.max(0, mScrollPosition + dp));
        final int delta = newPosition - mScrollPosition;
        mScrollPosition = newPosition;
        updateViews(recycler, state);
        return delta;
    }

    private float calculateMaxScroll(RecyclerView.State state) {
        final int n = state.getItemCount();
        if (n == 0) {
            return 0;
        } else if (n <= (int) REMAINDERS_NO) {
            return mSpecialScrollStep * (n - 1);
        } else {
            return mRemiderThreshold + mCardMaxVisibleAreaSize * (n - REMAINDERS_NO - 1);
        }
    }

    private void updateViews(RecyclerView.Recycler recycler, RecyclerView.State state) {
        final int firstVisible = firstVisibleCard(state);

        // We have to remove all the cards if the item count is 0
        if (state.getItemCount() <= 0) {
            removeAndRecycleAllViews(recycler);
            return;
        }

        final int widthSpec =
                MeasureSpec.makeMeasureSpec((int) mCardWidth, MeasureSpec.EXACTLY);
        final int heightSpec =
                MeasureSpec.makeMeasureSpec((int) mCardHeight, MeasureSpec.EXACTLY);

        // We have to remove no more visible views or add them when they appear from above
        if (mCurrentFirstVisible >= 0) {
            // Remove invisible
            if(recycler != null) {
                for (int i = mCurrentFirstVisible; i < firstVisible; i++) {
                    removeAndRecycleViewAt(0, recycler);
                }
            }
            // Add appearing from above
            for (int i = firstVisible; i < mCurrentFirstVisible; i++) {
                final View view = recycler.getViewForPosition(i);
                view.measure(widthSpec, heightSpec);
                addView(view, i-firstVisible);
            }
        }

        final float upperBound = upperBound();
        final float lowerBound = lowerBound();
        final float[] tops = new float[2];
        // We layout already attached views, we may still have to create some
        int viewIndex = 0; // This count how many views are visible and layouted
        int tabIndex = firstVisible;
        while (tabIndex < state.getItemCount()) {
            final View view;
            if (viewIndex < getChildCount()) {
                view = getChildAt(viewIndex);
                final RecyclerView.LayoutParams params =
                        (RecyclerView.LayoutParams) view.getLayoutParams();
                if (params.isItemRemoved() && !state.isPreLayout()) {
                    // We have to remove this view
                    removeAndRecycleViewAt(viewIndex, recycler);
                    continue;
                }
            } else {
                view = recycler.getViewForPosition(tabIndex);
                view.measure(widthSpec, heightSpec);
                addView(view);
            }
            calculateTops(lowerBound, firstVisible, tabIndex, tops);
            final float left;
            final float top;
            final float right;
            final float bottom;
            if (mOrientation == Configuration.ORIENTATION_LANDSCAPE) {
                left = deckPadding + interpolate(mScrollPosition, lowerBound, upperBound, tops[0], tops[1]);
                top = deckPadding;
                right = left + mCardWidth;
                bottom = top + mCardHeight;
            } else {
                left = deckPadding;
                top = deckPadding + interpolate(mScrollPosition, lowerBound, upperBound, tops[0], tops[1]);
                right = left + mCardWidth;
                bottom = top + mCardHeight;
            }
            if ((mOrientation == Configuration.ORIENTATION_PORTRAIT && top > getHeight()) ||
                    mOrientation == Configuration.ORIENTATION_LANDSCAPE && left > getWidth()) {
                // Remove the last added view, it was a mistake
                break;
            }
            layoutDecoratedWithMargins(view, (int) left, (int) top, (int) right, (int) bottom);
            viewIndex++;
            tabIndex++;
        }

        // We remove views that are no more visible because scrolling up
        for (int i = viewIndex; i < getChildCount(); i++) {
            removeAndRecycleViewAt(i, recycler);
        }
        mCurrentFirstVisible = firstVisible;

        // Do we need to scroll up (due to tab deletion)?
        final int maxScroll = (int) calculateMaxScroll(state);
        if (!state.isPreLayout() && mScrollPosition > maxScroll) {
            mScrollPosition = maxScroll;
            updateViews(recycler, state);
        }
    }

    @Override
    public void scrollToPosition(int position) {
        mFirstCard = position;
        requestLayout();
    }

    @Override
    public void onItemsRemoved(RecyclerView recyclerView, int positionStart, int itemCount) {
        super.onItemsRemoved(recyclerView, positionStart, itemCount);
        final int remaining = getItemCount();
        if (remaining >= REMAINDERS_NO + 1 && positionStart == remaining) {
            recyclerView.scrollToPosition(remaining - 1);
        }
    }
}
