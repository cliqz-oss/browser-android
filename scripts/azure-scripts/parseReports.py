import os
import sys
errorsCount = 0
totalCount = 0
try:
    for report in sorted(os.listdir(sys.argv[1])):
        with open(sys.argv[1]+report) as fp:
            for i, line in enumerate(fp):
                if i==1:
                    for valueset in line.split(" "):
                        if "errors=" in valueset or "failures" in valueset:
                            errorsCount += int(valueset.split("\"")[1])
                        elif "tests=" in valueset:
                            totalCount += int(valueset.split("\"")[1])
except:
    print "Seems like Tests didn't run !"
if errorsCount == 0 and totalCount > 2:
    print errorsCount
elif totalCount == 0:
    print -1
else:
    print errorsCount