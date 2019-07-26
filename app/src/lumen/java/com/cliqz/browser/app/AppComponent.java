package com.cliqz.browser.app;

import com.cliqz.browser.purchases.trial.SubscriptionDataTask;
import com.cliqz.browser.survey.SurveysManager;

import javax.inject.Singleton;

import dagger.Component;

/**
 * @author Ravjit Uppal
 */
@Singleton
@Component(modules = {AppModule.class})
public interface AppComponent extends BaseAppComponent {
    void inject(SubscriptionDataTask subscriptionDataTask);

    void inject(SurveysManager surveysManager);
}