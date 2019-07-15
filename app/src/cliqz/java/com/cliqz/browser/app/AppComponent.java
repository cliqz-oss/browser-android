package com.cliqz.browser.app;

import javax.inject.Singleton;

import dagger.Component;

/**
 * @author Ravjit Uppal
 */
@Singleton
@Component(modules = {AppModule.class})
public interface AppComponent extends BaseAppComponent {

}