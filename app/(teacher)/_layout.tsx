import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, Redirect } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";

function NativeTeacherTabs() {
  const { news, messages } = useAppData();
  const { user } = useAuth();
  const unread = messages.filter(m => m.senderId === 'admin' && m.receiverId === user?.id && !m.read).length + news.length;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "calendar", selected: "calendar" as any }} />
        <Label>جدولي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="students">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>الطلاب</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="grades">
        <Icon sf={{ default: "graduationcap", selected: "graduationcap.fill" }} />
        <Label>الدرجات</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="curriculum">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>المنهج</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>الإشعارات</Label>
        {unread > 0 && <Badge>{String(unread)}</Badge>}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTeacherTabs() {
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const { news, messages } = useAppData();
  const { user } = useAuth();
  const unread = messages.filter(m => m.senderId === 'admin' && m.receiverId === user?.id && !m.read).length + news.length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#061e1a",
          borderTopWidth: 1,
          borderTopColor: "rgba(16,185,129,0.15)",
          elevation: 0,
          height: isWeb ? 84 : isIOS ? undefined : 65,
          paddingBottom: isWeb || isIOS ? undefined : 6,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#061e1a" }]} />
          ) : null,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index"         options={{ title: 'جدولي',     tabBarIcon: ({ color }) => <Ionicons name="calendar"          size={22} color={color} /> }} />
      <Tabs.Screen name="students"      options={{ title: 'الطلاب',    tabBarIcon: ({ color }) => <Ionicons name="people"            size={22} color={color} /> }} />
      <Tabs.Screen name="grades"        options={{ title: 'الدرجات',   tabBarIcon: ({ color }) => <Ionicons name="school"            size={22} color={color} /> }} />
      <Tabs.Screen name="curriculum"    options={{ title: 'المنهج',    tabBarIcon: ({ color }) => <Ionicons name="book"              size={22} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'الإشعارات', tabBarIcon: ({ color }) => <Ionicons name="notifications"    size={22} color={color} />, tabBarBadge: unread > 0 ? unread : undefined }} />
      <Tabs.Screen name="certificates" options={{ href: null }} />
      <Tabs.Screen name="messages"     options={{ href: null }} />
    </Tabs>
  );
}

export default function TeacherLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#061e1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }
  if (!user || user.role !== 'teacher') return <Redirect href="/login" />;
  if (isLiquidGlassAvailable()) return <NativeTeacherTabs />;
  return <ClassicTeacherTabs />;
}
