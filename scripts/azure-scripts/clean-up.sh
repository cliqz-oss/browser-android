echo "*** Stopping Emulator/Simulator ***"
kill -9 $(cat logcat.pid) || true
adb kill-server
kill -9 $(cat emu.pid)
echo "*** DONE ***"