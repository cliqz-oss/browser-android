#!/bin/bash

# Simple script to build all the flavors at once and put the apks in a single
# folder (build/releases)

rm -rf jsengine/*
rm -rf node_modules
rm -rf artifacts/*.apk

npm ci
npm run bundle

readonly flavors="Standard"
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
find app/build -iname "*.apk" -exec cp -v '{}' artifacts ';'
