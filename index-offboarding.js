import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  Linking,
  TouchableOpacity,
  NativeModules,
} from 'react-native';

const LocaleConstants = NativeModules.LocaleConstants;
const langs = ['en', 'de'];
const lang = langs.indexOf(LocaleConstants.lang) >= 0 ? LocaleConstants.lang : 'en';
const translations = {
  'en': {
    'HomeView.CliqzOffboarding.Header': 'Dear Cliqz User,',
    'HomeView.CliqzOffboarding.Text1': 'Unfortunately the Cliqz browser is not supported anymore.',
    'HomeView.CliqzOffboarding.Text2': 'For your safety we recommend you to stop using Cliqz',
    'HomeView.CliqzOffboarding.Text3': 'The Cliqz Team invite you to use the Ghostery Browser or suggest picking alternative of your choice.',
    'HomeView.CliqzOffboarding.Alternatives': 'ALTERNATIVE WEB BROWSERS',
    'HomeView.CliqzOffboarding.Footer': 'I will migrate shortly',
  },
  'de': {
    'HomeView.CliqzOffboarding.Header': 'Lieber Cliqz-Nutzer,',
    'HomeView.CliqzOffboarding.Text1': 'leider wird der Cliqz Browser nicht mehr unterstützt.',
    'HomeView.CliqzOffboarding.Text2': 'Zu Deiner Sicherheit empfehlen wir den Cliqz Browser nicht mehr zu verwenden',
    'HomeView.CliqzOffboarding.Text3': 'Das Cliqz-Team empfiehlt stattdessen, den Ghostery-Browser oder eine der folgenden Alternativen zu verwenden.',
    'HomeView.CliqzOffboarding.Alternatives': 'ALTERNATIVE BROWSER',
    'HomeView.CliqzOffboarding.Footer': 'Ich werde in Kürze wechseln',
  },
};
const t = key => translations[lang][key] || key;

const logo = 'data:image/png;base64,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';
const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
  },
  logo: {
    height: 40,
    width: 40,
    marginBottom: 15,
  },
  centeredView: {

  },
  modalView: {
    backgroundColor: '#eeeeee',
    paddingHorizontal: 35,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    marginTop: 25,
    backgroundColor: '#00aef0',
    paddingHorizontal: 45,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 15,
    color: 'black',
  },
  browserLink: {
    borderWidth: 1,
    borderColor: '#0078ca',
    width: 200,
    paddingVertical: 5,
    alignItems: 'center',
    marginVertical: 5,
    backgroundColor: 'white',
  },
  browserLinkText: {
    color: '#0078ca',
    fontSize: 16,
    fontWeight: '500',
  },
  alternativesHeaderText: {
    color: '#9e9a9a',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  footerText: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '500',
    color: '#9e9a9a',
  },
});

class Pressable extends React.Component {
  render() {
    return (
      <TouchableOpacity onPress={this.props.onPress} style={this.props.style}>
        {this.props.children}
      </TouchableOpacity>
    );
  }
}

const openPlayStore = (id) => {
  Linking.openURL('market://details?id='+id).catch(() => {
    Linking.openURL('https://play.google.com/store/apps/details?id='+id);
  });
}

export class Offboarding extends React.Component {
  state = {
    show: true,
  }

  render () {
    if (!this.state.show) {
      return <View></View>;
    }

    return (
      <View style={styles.container}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Image
              style={styles.logo}
              source={{ uri: logo }}
              resizeMode="contain"
            />
            <Text style={styles.modalText}>
              {t('HomeView.CliqzOffboarding.Header')}
            </Text>
            <View>
              <Text style={styles.modalText}>
                {t('HomeView.CliqzOffboarding.Text1')}
                <Text style={{ fontWeight: '800' }}>
                  {' '}
                  {t('HomeView.CliqzOffboarding.Text2')} 😕
                </Text>
              </Text>
            </View>
            <Text style={styles.modalText}>
              {t('HomeView.CliqzOffboarding.Text3')}
            </Text>
            <Text style={styles.alternativesHeaderText}>
              {t('HomeView.CliqzOffboarding.Alternatives')}
            </Text>
            <Pressable
              style={styles.browserLink}
              onPress={() => openPlayStore('com.ghostery.android.ghostery')}
            >
              <Text style={styles.browserLinkText}>Ghostery</Text>
            </Pressable>
            <Pressable
              style={styles.browserLink}
              onPress={() => openPlayStore('org.mozilla.firefox')}
            >
              <Text style={styles.browserLinkText}>Firefox</Text>
            </Pressable>
            <Pressable
              style={styles.browserLink}
              onPress={() => openPlayStore('com.brave.browser')}
            >
              <Text style={styles.browserLinkText}>Brave</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={() => this.setState({show: false })}
            >
              <Text style={styles.textStyle}>
                OK
              </Text>
            </Pressable>

            <Text style={styles.footerText}>
              {t('HomeView.CliqzOffboarding.Footer')}
            </Text>
          </View>
        </View>
      </View>
    );
  }
}
