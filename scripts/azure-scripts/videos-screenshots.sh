echo "*** Get Videos and Screenshots ***"
mkdir -p recording screenshots
$ANDROID_HOME/platform-tools/adb pull /mnt/sdcard/Movies recording/ || true
$ANDROID_HOME/platform-tools/adb pull /mnt/sdcard/test-screenshots screenshots/ || true
echo "*** Done ***"