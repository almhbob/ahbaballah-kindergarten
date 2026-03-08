import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  if (user.role === 'admin') return <Redirect href="/(admin)" />;
  if (user.role === 'teacher') return <Redirect href="/(teacher)" />;
  if (user.role === 'parent') return <Redirect href="/(parent)" />;

  return <Redirect href="/login" />;
}
