package com.cliqz.antitracking.test;

import android.content.Intent;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;

/**
 * @author Stefano Pacifici
 * @date 2016/07/21
 */
public class MainActivity extends AppCompatActivity {

    private String mMode = TestActivity.ANTITRACKING_MODE;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        findViewById(R.id.start).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                startTest();
                view.setEnabled(false);
            }
        });
    }

    private void startTest() {
        final Intent intent = new Intent(this, TestActivity.class);
        intent.putExtra(TestActivity.TEST_MODE, mMode);
        startActivityForResult(intent, 0);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        outState.putString(TestActivity.TEST_MODE, mMode);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        savedInstanceState.getString(TestActivity.TEST_MODE, TestActivity.ANTITRACKING_MODE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        switch (resultCode) {
            case RESULT_CANCELED:
                mMode = TestActivity.ANTITRACKING_MODE;
                findViewById(R.id.start).setEnabled(true);
                break;
            case RESULT_OK:
                mMode = // TestActivity.ANTITRACKING_MODE.equals(mMode) ?
                        // TestActivity.REGULAR_MODE :
                        TestActivity.ANTITRACKING_MODE;
                startTest();
                break;
            default:
                break;
        }
    }
}
