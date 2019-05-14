echo "*** Get Videos and Screenshots ***"
kill -9 $(cat video.pid) || true
$ANDROID_HOME/platform-tools/adb pull /mnt/sdcard/DCIM/ testresults/ || true
#$ANDROID_HOME/platform-tools/adb pull /mnt/sdcard/test-screenshots testresults/ || true
echo "*** Done ***"