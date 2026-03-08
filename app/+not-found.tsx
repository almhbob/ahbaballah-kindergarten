import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
        <LinearGradient colors={['#030612', '#060c28', '#0a1050']} style={StyleSheet.absoluteFill} />

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={72} color="rgba(201,149,42,0.7)" />
          </View>

          <Text style={styles.code}>404</Text>
          <Text style={styles.title}>الصفحة غير موجودة</Text>
          <Text style={styles.sub}>لا توجد صفحة بهذا المسار في النظام</Text>

          <Pressable
            style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.replace('/login')}
          >
            <LinearGradient
              colors={['#a07018', '#c9952a', '#e8b84b']}
              style={styles.btnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="home-outline" size={18} color="#fff" />
              <Text style={styles.btnTxt}>العودة للرئيسية</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { marginBottom: 16 },
  code: { fontSize: 64, fontFamily: 'Inter_700Bold', color: 'rgba(201,149,42,0.5)', marginBottom: 8 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 36, lineHeight: 22 },
  btn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  btnGrad: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
