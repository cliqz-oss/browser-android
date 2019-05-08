echo "*** Azure Script - Installing Dependencies ***"
echo ""
echo ""
echo "Install APT-GET Dependencies"
#apt-get update
#apt-get upgrade -y
#apt-get install -y \
#    curl \
#    git \
#    gnupg2 \
#    language-pack-en \
#    lib32z1 \
#    libc6:i386 \
#    libncurses5:i386 \
#    libstdc++6:i386 \
#    openjdk-8-jdk \
#    python-dev \
#    python-pip \
#    python-virtualenv \
#    unzip \
#    wget \
#    xz-utils

echo ""
echo ""
echo "Installing Android SDK Dependencies"
export IMG_NAME='system-images;android-23;google_apis;x86'
$ANDROID_HOME/tools/bin/sdkmanager "${IMG_NAME}"