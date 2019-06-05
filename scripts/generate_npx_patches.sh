#!/bin/bash

readonly SCRIPT_PATH="$( dirname "$0" )"
readonly SRC_ROOT="$( cd "${SCRIPT_PATH}/../"; pwd )"

(
    cd "${SRC_ROOT}"
    find "${SRC_ROOT}/node_modules/" -type d -iname "react-native-*"| while read p; do
        npx patch-package \
            --exclude 'android\/(build\/.*)|(.*\.iml)|(package\.json)$' \
            "$( basename "$p")"
    done
)
