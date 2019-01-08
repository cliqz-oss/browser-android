#!/bin/bash

# Simple script to build all the flavors at once and put the apks in a single
# folder (build/releases)

readonly flavors="Standard Huawei Amazon"
readonly archs="Arm X86 Fat"
targets=()
for flavor in ${flavors[@]}
do
    for arch in ${archs[@]}
    do
        targets+=("assemble${flavor}${arch}Release")
    done
done

./gradlew clean ${targets[@]}
rm -rf artifacts/*.apk
find app/build -iname "*.apk" -exec cp -v '{}' artifacts ';'
