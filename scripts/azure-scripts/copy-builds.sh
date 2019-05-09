echo "*** Get FAT Builds for the Flavors ***"
declare -a flavors=("lumen" "cliqz")
mkdir builds
for flavor in "${flavors[@]}"
do
    cp app/build/outputs/apk/${flavor}Fat/debug/app-${flavor}-fat-debug.apk builds/${flavor}.apk || true
done