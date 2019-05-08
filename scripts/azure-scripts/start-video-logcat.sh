#$ANDROID_HOME/platform-tools/adb shell mkdir -p /mnt/sdcard/rec
#$ANDROID_HOME/platform-tools/adb shell mkdir -p /mnt/sdcard/screenshots
#$ANDROID_HOME/platform-tools/adb shell """
#    screenrecord --bit-rate 6000000 /mnt/sdcard/rec/1.mp4;
#    screenrecord --bit-rate 6000000 /mnt/sdcard/rec/2.mp4;
#    screenrecord --bit-rate 6000000 /mnt/sdcard/rec/3.mp4;
#    screenrecord --bit-rate 6000000 /mnt/sdcard/rec/4.mp4;
#    screenrecord --bit-rate 6000000 /mnt/sdcard/rec/5.mp4; """ &
#echo $! > video.pid
mkdir -p logs
$ANDROID_HOME/platform-tools/adb logcat -c
$ANDROID_HOME/platform-tools/adb logcat > logs/UIA-device.log &
echo $! > logcat.pid