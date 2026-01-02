import { NativeModules } from 'react-native';

const { StreamModule } = NativeModules;

if (!StreamModule) {
    console.error('❌ StreamModule is not available. Ensure the native module is linked correctly.');
} else {
}

export default StreamModule;
