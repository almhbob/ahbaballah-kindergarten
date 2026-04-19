import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, Redirect } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";

const PARENT_COLOR = "#7B3FA0";

function NativeParentTabs() {
  const { messages, news } = useAppData();
  const { user } = useAuth();
  const unreadMsgs = messages.filter(m => m.senderId === 'admin' && m.receiverId === user?.id && !m.read).length;
  const notifBadge = unreadMsgs + news.length;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>الطفل</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="report">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>التقارير</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transport">
        <Icon sf={{ default: "bus", selected: "bus.fill" }} />
        <Label>الترحيل</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>التواصل</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>الإشعارات</Label>
        {notifBadge > 0 && <Badge>{String(notifBadge)}</Badge>}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicParentTabs() {
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const { messages, news } = useAppData();
  const { user } = useAuth();
  const unreadMsgs = messages.filter(m => m.senderId === 'admin' && m.receiverId === user?.id && !m.read).length;
  const notifBadge = unreadMsgs + news.length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E9B8FF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#1a0830",
          borderTopWidth: 1,
          borderTopColor: "rgba(168,85,247,0.15)",
          elevation: 0,
          height: isWeb ? 84 : isIOS ? undefined : 65,
          paddingBottom: isWeb || isIOS ? undefined : 6,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1a0830" }]} />
          ) : null,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index"         options={{ title: 'الطفل',      tabBarIcon: ({ color }) => <Ionicons name="home"          size={22} color={color} /> }} />
      <Tabs.Screen name="report"        options={{ title: 'التقارير',   tabBarIcon: ({ color }) => <Ionicons name="document-text" size={22} color={color} /> }} />
      <Tabs.Screen name="transport"     options={{ title: 'الترحيل',    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="bus-school" size={22} color={color} /> }} />
      <Tabs.Screen name="messages"      options={{ title: 'التواصل',    tabBarIcon: ({ color }) => <Ionicons name="chatbubble"    size={22} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'الإشعارات',  tabBarIcon: ({ color }) => <Ionicons name="notifications" size={22} color={color} />, tabBarBadge: notifBadge > 0 ? notifBadge : undefined }} />
      <Tabs.Screen name="fees"    options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

export default function ParentLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a0830', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#A855F7" size="large" />
      </View>
    );
  }
  if (!user || user.role !== 'parent') return <Redirect href="/login" />;
  if (isLiquidGlassAvailable()) return <NativeParentTabs />;
  return <ClassicParentTabs />;
}
