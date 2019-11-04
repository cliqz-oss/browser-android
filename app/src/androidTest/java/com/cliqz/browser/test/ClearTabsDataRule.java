package com.cliqz.browser.test;

import android.content.Context;

import androidx.test.platform.app.InstrumentationRegistry;

import com.cliqz.utils.FileUtils;

import org.junit.rules.TestRule;
import org.junit.runner.Description;
import org.junit.runners.model.Statement;

import java.io.File;

public class ClearTabsDataRule implements TestRule {
    @Override
    public Statement apply(Statement base, Description description) {
        final Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        final File destDirectory = new File(context.getFilesDir(), "tabs");
        FileUtils.deleteRecursively(destDirectory);
        return base;
    }
}
