FROM ubuntu:18.04
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
ENV NODE_VERSION 9.11.2

USER jenkins

#Install Android SDK and the Required SDKs
RUN mkdir -p $ANDROID_HOME; \
    mkdir -p $GRADLE_USER_HOME; \
    cd $ANDROID_HOME; \
    wget -O sdktools.zip --quiet 'https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip'; \
    unzip sdktools.zip; \
    rm -r sdktools.zip; \
    while (true); do echo y; done | tools/bin/sdkmanager --licenses && \
    tools/bin/sdkmanager \
        "build-tools;29.0.2" \
        "platforms;android-28" \
        "platform-tools" \
        "tools" \
        "extras;google;m2repository" \
        "extras;android;m2repository" \
        "extras;google;google_play_services";

# Install Node.JS
SHELL ["/bin/bash", "-l", "-c"]
RUN cd /home/jenkins && \
    wget -O node.tar.gz https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz && \
    tar xf node.tar.gz && \
    rm -f node.tar.gz
ENV PATH "/home/jenkins/node-v$NODE_VERSION-linux-x64/bin:$PATH"
RUN npm install -g npm@6.11.3

#Install Ruby and Fastlane
RUN for key in 409B6B1796C275462A1703113804BB82D39DC0E3 \
               7D2BAF1CF37B13E2069D6956105BD0E739499BDB; do \
        for server in "hkp://keys.gnupg.net" \
                         "hkp://p80.pool.sks-keyservers.net:80" \
                         "pgp.mit.edu" \
                         "hkp://keyserver.ubuntu.com:80"; do \
            gpg2 --keyserver "${server}" --recv-keys "${key}" || \
            echo "${server} failed. Trying new server..."; \
        done; \
    done
RUN curl -sSL https://get.rvm.io | bash -s stable --ruby=2.6.5 && \
    source /home/jenkins/.rvm/scripts/rvm \
    rvm reload && \
    gem install fastlane --version 2.185.0

#Install AWS CLI
RUN pip install awscli --upgrade --user
