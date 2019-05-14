echo "*** Starting Video Record and Logcat ***"
$ANDROID_HOME/platform-tools/adb shell """
mount -o rw,remount rootfs /;
chmod 0777 /mnt/sdcard;
exit
"""
$ANDROID_HOME/platform-tools/adb shell mkdir -p /mnt/sdcard/DCIM/
$ANDROID_HOME/platform-tools/adb shell """
    screenrecord /mnt/sdcard/DCIM/1.mp4;
    screenrecord /mnt/sdcard/DCIM/2.mp4;
    screenrecord /mnt/sdcard/DCIM/3.mp4;
    screenrecord /mnt/sdcard/DCIM/4.mp4;
    screenrecord /mnt/sdcard/DCIM/5.mp4;
    screenrecord /mnt/sdcard/DCIM/6.mp4;
    screenrecord /mnt/sdcard/DCIM/7.mp4;
    screenrecord /mnt/sdcard/DCIM/8.mp4;
    screenrecord /mnt/sdcard/DCIM/9.mp4;
    screenrecord /mnt/sdcard/DCIM/10.mp4; """ &
echo $! > video.pid
$ANDROID_HOME/platform-tools/adb logcat -c
$ANDROID_HOME/platform-tools/adb logcat > testresults/UIA-device.log &
echo $! > logcat.pid