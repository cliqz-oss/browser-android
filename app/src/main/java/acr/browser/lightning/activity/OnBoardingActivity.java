package acr.browser.lightning.activity;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentActivity;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;
import android.support.v4.view.ViewPager;
import android.view.View;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;

import javax.inject.Inject;

import acr.browser.lightning.fragment.FirstOnBoardingFragment;
import acr.browser.lightning.fragment.SecondOnBoardingFragment;
import acr.browser.lightning.preference.PreferenceManager;

public class OnBoardingActivity extends FragmentActivity {

    @Inject
    PreferenceManager mPreferences;

    ViewPager pager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getActionBar().hide();
        BrowserApp.getAppComponent().inject(this);
        setContentView(R.layout.activity_on_boarding);

        pager = (ViewPager) findViewById(R.id.viewpager);
        pager.setAdapter(new PagerAdapter(getSupportFragmentManager()));
    }

    private class PagerAdapter extends FragmentPagerAdapter {

        public PagerAdapter(FragmentManager fragmentManager) {
            super(fragmentManager);
        }

        @Override
        public int getCount() {
            return 2;
        }

        @Override
        public Fragment getItem(int pos) {
            if(pos == 0) {
                return new FirstOnBoardingFragment();
            } else {
                return new SecondOnBoardingFragment();
            }
        }
    }

    public void nextScreen(View view) {
        pager.setCurrentItem(1);
    }

    public void launchMain(View view) {
        mPreferences.setOnBoardingComplete(true);
        finish();
    }
    
}
