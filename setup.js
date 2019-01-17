import buffer from 'buffer';
import UserAgent from 'react-native-user-agent';
import defineEnumerableProperties from '@babel/runtime/helpers/defineEnumerableProperties';

navigator.userAgent = navigator.userAgent || UserAgent.getUserAgent();
Object.assign(babelHelpers, { defineEnumerableProperties });

if (!global.Buffer) {
  global.Buffer = buffer.Buffer;
}

if (!process.version) {
  process.version = '';
}
