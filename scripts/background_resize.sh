#!/bin/bash

ME=`basename $0`
FILE=$1

function usage() {
    cat << EOF
Usage:
  ${ME} <image>
EOF
}

[[ -z "$*" ]] && usage && exit 1

for (( i=240; i <= 3840; i += 120 ))
do
    out="default_${i}.jpg"
    echo -n "Converting ${out} ... "
    gm convert -size ${i}x${i} "${FILE}" -resize ${i}x${i} +profile "*" "${out}"
    echo "done."
done
