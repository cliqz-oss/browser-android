FROM ubuntu:16.04
MAINTAINER Stefano Pacifici <stefano@cliqz.com>
ENV DEBIAN_FRONTEND noninteractive

#Install the required packages. 1st Set is for Browser Project and the 2nd for Ruby and NodeJS.
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y \
        curl \
        git \
        gnupg2 \
        language-pack-en \
        lib32z1 \
        libc6:i386 \
        libncurses5:i386 \
        libstdc++6:i386 \
        openjdk-8-jdk \
        python-dev \
        python-pip \
        python-virtualenv \
        unzip \
        wget \
        xz-utils && \
    apt-get install -y \
        apt-transport-https \
        autoconf \
        automake \
        bison \
        build-essential \
        ca-certificates \
        gawk \
        libffi-dev \
        libgdbm-dev \
        libgmp-dev \
        libgmp-dev \
        libncurses5-dev \
        libreadline6-dev \
        libsqlite3-dev \
        libssl-dev \   
        libtool \
        libyaml-dev \
        pkg-config \
        sqlite3 \
        zlib1g-dev && \
    apt-get clean -y && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set the locale
RUN locale-gen en_US en_US.UTF-8
RUN dpkg-reconfigure locales
ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en' LC_ALL='en_US.UTF-8'

# Add jenkins to the user group
ARG UID
ARG GID
RUN getent group $GID || groupadd jenkins --gid $GID && \
    useradd --create-home --shell /bin/bash jenkins --uid $UID --gid $GID

ENV JAVA_HOME /usr/lib/jvm/java-8-openjdk-amd64/
ENV ANDROID_HOME /home/jenkins/android_home
ENV GRADLE_USER_HOME /home/jenkins/gradle_home
ENV NVM_DIR /home/jenkins/nvm 
ENV NODE_VERSION 8.9.3

USER jenkins

#Install Android SDK and the Required SDKs
RUN mkdir -p $ANDROID_HOME; \
    mkdir -p $GRADLE_USER_HOME; \
    cd $ANDROID_HOME; \
    wget --output-document=sdktools.zip --quiet 'https://dl.google.com/android/repository/sdk-tools-linux-3859397.zip'; \
    unzip sdktools.zip; \
    rm -r sdktools.zip; \
    (while (true); do echo y; sleep 2; done) | \
        tools/bin/sdkmanager  \
        "build-tools;26.0.2" \
        "platforms;android-23" \
        "platforms;android-27" \
        "platform-tools" \
        "tools" \
        "platforms;android-25" \
        "extras;google;m2repository" \
        "extras;android;m2repository" \
        "extras;google;google_play_services";

ENV LD_LIBRARY_PATH "/home/jenkins/android_home/emulator/lib64/qt/lib"

# Install Node.JS
SHELL ["/bin/bash", "-l", "-c"]
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash && \
    . $NVM_DIR/nvm.sh 

ENV PATH "$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH"

#Installation of 'yarn'; 'appium' & 'wd' for Integration Tests
RUN npm install --global \
    yarn \
    appium \
    wd

#Install Ruby and Fastlane

RUN gpg2 --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 && \
    curl -sSL https://get.rvm.io | bash -s stable --ruby=2.4.1 --autolibs=read-fail
RUN gem install fastlane