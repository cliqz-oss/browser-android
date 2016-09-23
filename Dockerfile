FROM ubuntu:16.04
MAINTAINER Stefano Pacifici <stefano@cliqz.com>
ARG uid
RUN apt-get update && apt-get install -q -y openjdk-8-jdk-headless xz-utils curl \
    gcc-multilib lib32z1 lib32stdc++6
RUN useradd -u $uid -U -G root -m user
RUN chmod 774 /opt
USER user
RUN curl https://dl.google.com/android/android-sdk_r24.4.1-linux.tgz|tar xz -C /opt/
RUN curl https://nodejs.org/dist/v4.4.7/node-v4.4.7-linux-x64.tar.xz|tar xJ -C /opt/
ENV ANDROID_HOME /opt/android-sdk-linux
ENV PATH /opt/android-sdk-linux/tools:/opt/android-sdk-linux/platform-tools:/opt/node-v4.4.7-linux-x64/bin:$PATH
RUN npm install -g bower && npm install -g broccoli && npm install -g broccoli-cli
RUN echo "y"|android update sdk -f --no-ui --filter "platform-tools"
RUN echo "y"|android update sdk -f --no-ui --filter "tools"
RUN echo "y"|android update sdk -f --all --no-ui --filter "build-tools-23.0.3,\
    android-23,extra-android-m2repository,extra-google-m2repository"
