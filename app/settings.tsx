import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/services/store';
import { GatewayClient } from '../src/services/gateway';

const C = { bg: '#0a0a0f', surface: '#1a1a2e', card: '#16213e', accent: '#0ea5e9' };

export default function Settings() {
  const { state, saveConfig } = useStore();
  const router = useRouter();
  const [url, setUrl] = useState(state.config.url);
  const [token, setToken] = useState(state.config.token);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setUrl(state.config.url);
    setToken(state.config.token);
  }, [state.config]);

  const testConnection = async () => {
    setTesting(true);
    try {
      const client = new GatewayClient(url, token);
      const ok = await client.testConnection();
      Alert.alert(ok ? '✅ Connected' : '❌ Failed', ok ? 'Gateway is reachable.' : 'Could not reach gateway.');
    } catch (e: any) {
      Alert.alert('❌ Error', e.message);
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    await saveConfig({ url, token });
    Alert.alert('Saved', 'Gateway configuration saved.');
    router.back();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.container}>
        <Text style={s.label}>Gateway URL</Text>
        <TextInput style={s.input} value={url} onChangeText={setUrl} placeholder="http://localhost:3000" placeholderTextColor="#555" autoCapitalize="none" autoCorrect={false} />

        <Text style={[s.label, { marginTop: 20 }]}>Gateway Token</Text>
        <TextInput style={s.input} value={token} onChangeText={setToken} placeholder="Enter token" placeholderTextColor="#555" secureTextEntry autoCapitalize="none" autoCorrect={false} />

        <Pressable style={s.testBtn} onPress={testConnection} disabled={testing}>
          {testing ? <ActivityIndicator color={C.accent} size="small" /> : (
            <>
              <Ionicons name="wifi" size={18} color={C.accent} />
              <Text style={s.testText}>Test Connection</Text>
            </>
          )}
        </Pressable>

        <Pressable style={s.saveBtn} onPress={save}>
          <Text style={s.saveText}>Save Configuration</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20 },
  label: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: C.card, color: '#fff', borderRadius: 12, padding: 16, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.accent + '44' },
  testText: { color: C.accent, fontSize: 15, fontWeight: '600' },
  saveBtn: { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
