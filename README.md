![Android Browser Icon][icon]

[icon]: ic_launcher_small.png

# CLIQZ Browser for Android

The CLIQZ Browser for Android. Originally a fork of [Anthony Restaino](https://github.com/anthonycr)'s [Lightning Browser](https://github.com/anthonycr/Lightning-Browser). We maintain two different repositories for the project: a [private one](https://github.com/cliqz/android-browser) for internal development (only accessible by CLIQZers) and a [public one](https://github.com/cliqz-oss/browser-android). The latter is updated every time we publish a new version and can be used to contribute to the project.

## How to clone and start hacking

Run these commands in a shell:

```bash
$> # CLIQZers use the private repository
$> export CLIQZ_REPO=git@github.com:cliqz/android-browser.git
$> # Contributors use the public one
$> export CLIQZ_REPO=git@github.com:cliqz-oss/browser-android.git
$> git clone "${CLIQZ_REPO}" browser-android
$> cd browser-android
```
> __CLIQZers only__: Remember to init the extension submodule with the following commands.
>
> ```bash
$> git submodule init
$> git submodule update
```  

You can compile the project using the the gradle wrapper on the command line:

```bash
$> ./gradlew :app:assembleStandardDebug
```

Please notice you have to have the [Android SDK](http://developer.android.com/sdk/index.html). On Mac OSX, the latter can be installed using brew:

```bash
$> brew install android
```

Then, some Android submodule must be installed by using the __Android SDK Manager__:

```bash
$> android
```

The minimal set of packets to build the project is:

* Android SDK Tools (24.4.1+)
* Android SDK Platform-tools (23.1+)
* Android SDK Build-tools (23.0.2+)
* SDK Platform (23+, Android 6.0)
* Android Support Repository (25+)
* Android Support Library (23.1.1+)

You need also to set an environment variable:

```bash
$> export ANDROID_HOME=<path_to_android>
```

Replace *path_to_android* with the correct Android installation path (i.e. `/usr/local/opt/android-sdk/`). Alternately, a file called `local.properties` can be created in the project root. It should contain a single line containing the *sdk.dir* variable declaration. Below, an example of the file content:

```java
sdk.dir=/usr/local/opt/android-sdk/
```

### Cliqzers Notes

The extension must be built. To do so, run the following commands:

```bash
$> cd <project_dir>/external/extension
$> npm install
$> bower install
$> CLIQZ_OUTPUT_PATH=build/search/ ./fern.js build \
> configs/mobile-prod.json --version=tag
```

## Flavors

The project has two flavors:

* Standard
* XWalk

### Standard

Compile the standard version that uses the phone WebView to render the navigation extension. It supports only devices from Android 5.0 (21) up. The flavor produce a small APK (almost 6MB).

Command examples
* Build standard debug APK: `$> ./gradlew :app:assembleStandardDebug`
* Build standard release APK: `$> ./gradlew :app:assembleStandardRelease`
* Install the debug version on a single device connect using USB cable: `$> ./gradlew :app:installStandardDebug`

### XWalk

Compile a version that uses the [Crosswalk Project](https://crosswalk-project.org/) WebView to render the navigation extension. It supports devices starting from Android 4.0 (14) up. Due to the external WebView used, the generated APK is pretty big (more than 23MB) and architecture dependent (only ARM devices, no X86, no MIPS).

Command examples
* Build XWalk debug APK: `$> ./gradlew :app:assembleXwalkDebug`
* Build XWalk release APK: `$> ./gradlew :app:assembleXwalkRelease`
* Install the debug version on a single device connect using USB cable: `$> ./gradlew :app:installXwalkDebug`

## Testing

We have some unit tests implemented and few instrumentation tests too, although our preferred way to test the app is via UI automation.  
We use [Appium](http://appium.io/), [mocha](https://mochajs.org/) and [wd](http://admc.io/wd/) to run our tests. They are written in Javascript and reside in the [spec](./spec/) folder. To run them, you have to first install [Node.js](https://nodejs.org/), then install mocha using npm:

```bash
$> npm install -g mocha
```

After that, you can configure the (download the tests dependencies) running the following commands:

```bash
$> cd <project_dir>/spec
$> npm install
```

Finally, you can run a test suite by running `mocha <testfile.js>` in the spec folder. IE:

```bash
$> mocha overflow_menu_tests.js
```

All tests can be run by using the star operator:

```bash
$> mocha *.js
```

We have an helper to test our application, it reside in [tests_helper](./tests_helper/) folder. Due to Appium limitations, this helper is downloaded from Internet at tests runtime using our CDN. The current version (v3) can be found [here](https://cdn.cliqz.com/mobile/browser/tests/testsHelper_v3.zip) and can be compiled using the following command:

```bash
$> ./gradlew :tests_helper:zipDebug
```

The final zip file should be in `<project_dir>/tests_helper/build/distribution`.


## Signing for distribution (CLIQZers only)

The APK must be signed to be published on PlayStore, for more information follow this [link](http://developer.android.com/tools/publishing/app-signing.html). To sign the app you need the CLIQZ keystore, however it is not and must not be distributed with the source code, also keystore passwords must be kept secret.  
If you have the keystore and the passwords, you can configure gradle to generate the signed APK. To do so, create a *gradle.properties* file and add (or append to it fi already exists) the following lines:

```groovy
Browser.storeFile=<key_store_path>
Browser.storePassword=<key_store_password>
Browser.keyAlias=<key_alias>
Browser.keyPassword=<key_password>
```

Replace \<param\> with the appropriate arguments, then you can compile the release APK using the usual gradle tasks (```:app:assembleStandardRelease``` and ```:app:assembleXwalkRelease```).
