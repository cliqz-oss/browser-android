<img src="https://raw.githubusercontent.com/cliqz-oss/browser-android/master/app/src/cliqz/ic_launcher-web.png" width="256" height="256"/>

# CLIQZ Browser for Android

[![Build Status](https://dev.azure.com/cliqz-ci/cliqz-android/_apis/build/status/cliqz-oss.browser-android%20-%20CI?branchName=master)](https://dev.azure.com/cliqz-ci/cliqz-android/_build/latest?definitionId=4&branchName=master)

Cliqz is the first browser with built-in anonymous quick search and intelligent anti-tracking technology. Wherever you are going on the Internet: Cliqz protects your privacy. Our own search engine, developed in Munich, saves you time and data volume: simply type a query, select a suggested website or swipe left for more results. And by the way: Cliqz is free and open source.

Cliqz features at a glance:
* Maximum privacy
* Innovative quick search
* Ad blocker
* Phishing protection
* Forget mode
* Cliqz Tab with most visited websites and news

## How to clone and start hacking

Run these commands in a shell:

```bash
$> git clone git@github.com:cliqz-oss/browser-android.git
$> cd browser-android
```

Once the repository is checked out, get the dependencies for the react-native bundle, and build it
```bash
$> npm ci
$> npm run dev-bundle
```

You can compile the project using the the gradle wrapper on the command line:

```bash
$> ./gradlew :app:assembleCliqzDebug
```

Please notice you have to have the [Android SDK](http://developer.android.com/sdk/index.html). On Mac OSX, the latter can be installed using brew:

```bash
$> brew install android
```

## Signing for distribution (CLIQZers only)

The APK must be signed to be published on PlayStore, for more information follow this [link](http://developer.android.com/tools/publishing/app-signing.html). To sign the app you need the CLIQZ keystore, however it is not and must not be distributed with the source code, also keystore passwords must be kept secret.
If you have the keystore and the passwords, you can configure gradle to generate the signed APK. To do so, create a *gradle.properties* file and add (or append to it if already exists) the following lines:

```groovy
Browser.storeFile=<key_store_path>
Browser.storePassword=<key_store_password>
Browser.keyAlias=<key_alias>
Browser.keyPassword=<key_password>
```

Replace \<param\> with the appropriate arguments, then you can compile the release APK using the usual gradle tasks (```:app:assembleCliqzRelease```).

## React Native Development

The project uses react-native for some logic and views. This code is developed in the [browser-core](https://github.com/cliqz-oss/browser-core) repository. To debug these components, follow these steps:

 1. Set the developer support flag for the JSEngine: https://github.com/cliqz/android-browser/blob/master/app/src/main/java/com/cliqz/jsengine/Engine.java#L42
 2. Start the react-native dev server:
  ```shell
  npm run dev-server
  ```

Now, if the app is run, the JS code will be loaded from the dev server. In addition react-native debugging options will be available under the 'React Native Debug' option in the settings menu. If opened in the Chrome debugger, the `app` object (the root for all modules from `browser-core` will be exposed in the web-worker context.

To also develop code from `browser-core`, follow these steps:

 1. Check out [browser-core](https://github.com/cliqz-oss/browser-core) somewhere (Cliqzers use [navigation-extension](https://github.com/cliqz/navigation-extension))
 2. In the browser-core/navigation-extension directory, get dependencies to build the extension.
 ```shell
 ./fern.js install
 ```
 3. Now, build the extension, and direct the build output to the android browser's node_modules directory. Use the `fern serve` command means that the project will be rebuild if you make code changes:
 ```shell
  CLIQZ_OUTPUT_PATH=/path/to/android-browser/node_modules/browser-core/build/ ./fern.js serve configs/react-native.json
  ```
  
Now the dev server will see and load the updated files outputed from the fern build when you reload the code in the app.

### Degugging

To work with react live reloading server, the Developer Support option has to
be set on ReactInstanceManager in `/app/src/main/java/com/cliqz/jsengine/Engine.java`,
using `.setUseDeveloperSupport(true)`.

Then Android has to be asked for system overlay permission to show React Native
debug menu. One way to ask for this permission is with `adb`:

`adb shell am start -a android.settings.action.MANAGE_OVERLAY_PERMISSION -d package:com.cliqz.browser.debug`

Application will automatically detect if react dev server is running and will
load bundle from it, otherwise the bundle will be loaded from app assets.
