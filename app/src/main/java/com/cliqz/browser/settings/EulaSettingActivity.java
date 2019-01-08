package com.cliqz.browser.settings;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.text.Html;
import android.view.MenuItem;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.utils.CustomLinkMovementMethod;

import butterknife.Bind;
import butterknife.ButterKnife;

/**
 * @author Moaz Rashad
 */
public class EulaSettingActivity extends AppCompatActivity {

    @Bind(R.id.tv_eula_text)
    TextView eulaText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_eula_setting);
        ButterKnife.bind(this);
        setSupportActionBar((Toolbar) findViewById(R.id.toolbar));
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
    }
    @Override
    public void onStart() {
        super.onStart();
        eulaText.setText(Html.fromHtml(getString(R.string.eula_text)));
        eulaText.setMovementMethod(CustomLinkMovementMethod.getInstance(this));
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if(item.getItemId() == android.R.id.home){
            onBackPressed();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}
