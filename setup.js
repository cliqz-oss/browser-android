import buffer from 'buffer';
import UserAgent from 'react-native-user-agent';

navigator.userAgent = navigator.userAgent || UserAgent.getUserAgent();

if (!global.Buffer) {
  global.Buffer = buffer.Buffer;
}

if (!process.version) {
  process.version = '';
}
