echo "*** Azure Script - Launch Emulator (Also Install App for iOS) ***"
export DEV_NAME="Nexus5Emu"
echo "DEV_NAME=${DEV_NAME}"
$ANDROID_HOME/tools/bin/avdmanager create avd --device "Nexus 5" --package "${IMG_NAME}" --abi google_apis/x86 --name "${DEV_NAME}"
$ANDROID_HOME/emulator/emulator -avd $DEV_NAME &
echo $! >> emu.pid
echo "Started Emu"
emuStatus="$(adb shell getprop sys.boot_completed)"
while [ $emuStatus != "1" ]; do
    echo $emuStatus
    emuStatus="$(adb shell getprop sys.boot_completed)"
done
sleep 60