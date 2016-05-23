# Environmental Variables

1. TESTDROID_API_KEY: the runner need only this
2. TESTDROID_TARGET: android (api level >= 17) or selendroid (api level < 17)
3. TESTDROID_PROJECT: name of the testdroid project, possible values are
    1. *CLIQZ Browser (android, standard)*
    2. *CLIQZ Browser (android, xwalk)*
4. TESTDROID_TESTRUN: testrun name
5. TESTDROID_DEVICE: device to be used for the test
6. TESTDROID_APP: url, path on testdroid cloud
7. TESTDROID_APP_XWALK: as above, when using the runner
8. TESTDROID_APP_UNIVERSAL: as above, when using the runner
9. APPIUM_API_LEVEL

# Upload APKs to testdroid cloud

```bash
$> export TESTDROID_API_KEY=xxxxxxxxxxxxxxxxxxx
$> curl -s --user "$TESTDROID_API_KEY:" -F myAppFile=@"<path_to_universal_apk>" http://appium.testdroid.com/upload
```

The call will return a json like below.

```json
{
  "status": 0,
  "sessionId": "45e44a50-b5d9-4820-b374-a202331ec466",
  "value": {
    "message": "uploads successful",
    "uploadCount": 1,
    "rejectCount": 0,
    "expiresIn": 1800,
    "uploads": {
      "myAppFile":"45e44a50-b5d9-4820-b374-a202331ec466/app-standard-universal-debug.apk"
    },
    "rejects": {}
  }
}
```

Copy the value.uploads.myAppFile value and export it.

```bash
$> export TESTDROID_APP_UNIVERSAL="45e44a50-b5d9-4820-b374-a202331ec466/app-standard-universal-debug.apk"
```

Repeat the process for the XWalk version.

```bash
$> curl -s --user "$TESTDROID_API_KEY:" -F myAppFile=@"<path_to_xwalk_apk>" http://appium.testdroid.com/upload
...
...
$> export TESTDROID_APP_XWALK="89a44c50-b5d9-5555-a263-a202331ec466/app-standard-xwalk-debug.apk"
```

Avoid to uplad the APKs for every single run, just store the addresses.
