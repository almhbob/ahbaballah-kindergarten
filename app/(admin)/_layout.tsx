import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, Redirect } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";

function NativeAdminTabs() {
  const { inbox } = useAppData();
  const unread = inbox.filter(m => !m.read).length;
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="management">
        <Icon sf={{ default: "person.badge.plus", selected: "person.badge.plus.fill" }} />
        <Label>الإدارة</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="honor">
        <Icon sf={{ default: "trophy", selected: "trophy.fill" }} />
        <Label>لوحة الشرف</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <Icon sf={{ default: "tray", selected: "tray.fill" }} />
        <Label>الوارد</Label>
        {unread > 0 && <Badge>{String(unread)}</Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="finance">
        <Icon sf={{ default: "dollarsign.circle", selected: "dollarsign.circle.fill" }} />
        <Label>المالية</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicAdminTabs() {
  const { inbox } = useAppData();
  const unread = inbox.filter(m => !m.read).length;
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#050919",
          borderTopWidth: 1,
          borderTopColor: "rgba(201,149,42,0.15)",
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#050919" }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'الرئيسية',    tabBarIcon: ({ color }) => <Ionicons name="bar-chart"     size={22} color={color} /> }} />
      <Tabs.Screen name="management" options={{ title: 'الإدارة',      tabBarIcon: ({ color }) => <Ionicons name="people-circle" size={22} color={color} /> }} />
      <Tabs.Screen name="honor"      options={{ title: 'لوحة الشرف',  tabBarIcon: ({ color }) => <Ionicons name="trophy"        size={22} color={color} /> }} />
      <Tabs.Screen name="inbox"      options={{ title: 'الوارد',       tabBarIcon: ({ color }) => <Ionicons name="mail"          size={22} color={color} />, tabBarBadge: unread > 0 ? unread : undefined }} />
      <Tabs.Screen name="finance"    options={{ title: 'المالية',      tabBarIcon: ({ color }) => <Ionicons name="wallet"        size={22} color={color} /> }} />
      <Tabs.Screen name="employees"    options={{ href: null }} />
      <Tabs.Screen name="news"         options={{ href: null }} />
      <Tabs.Screen name="meetings"     options={{ href: null }} />
      <Tabs.Screen name="settings"     options={{ href: null }} />
      <Tabs.Screen name="export"       options={{ href: null }} />
      <Tabs.Screen name="certificates" options={{ href: null }} />
      <Tabs.Screen name="id-cards"     options={{ href: null }} />
      <Tabs.Screen name="transport"    options={{ href: null }} />
      <Tabs.Screen name="results"        options={{ href: null }} />
      <Tabs.Screen name="developer"      options={{ href: null }} />
      <Tabs.Screen name="registrations"  options={{ href: null }} />
      <Tabs.Screen name="ads"            options={{ href: null }} />
    </Tabs>
  );
}

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#030612', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }
  if (!user || user.role !== 'admin') return <Redirect href="/login" />;
  if (isLiquidGlassAvailable()) return <NativeAdminTabs />;
  return <ClassicAdminTabs />;
}
