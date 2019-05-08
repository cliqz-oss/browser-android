echo "*** Azure Script - Parse Report XML ***"
report_folder=$1
status=$(python scripts/azure-scripts/parseReports.py ${report_folder})
if [ "${status}" != "0" ]; then
    echo "ERROR: Some Tests Failed !"
    exit 1
elif [ "${status}" == "-1" ]; then
    echo "ERROR: Tests were not run !"
    exit 1
else
    echo "All Tests Passed !"
fi
echo "*** DONE ***"