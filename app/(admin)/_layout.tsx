import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAppData } from "@/contexts/AppDataContext";

function NativeAdminTabs() {
  const { inbox } = useAppData();
  const unread = inbox.filter(m => !m.read).length;
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="employees">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>الموظفون</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="news">
        <Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} />
        <Label>الأخبار</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <Icon sf={{ default: "tray", selected: "tray.fill" }} />
        <Label>الوارد</Label>
        {unread > 0 && <Badge>{unread}</Badge>}
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
          backgroundColor: isIOS ? "transparent" : Colors.primary,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: "rgba(255,255,255,0.1)",
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.primary }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية', tabBarIcon: ({ color }) => <Ionicons name="bar-chart" size={22} color={color} /> }} />
      <Tabs.Screen name="employees" options={{ title: 'الموظفون', tabBarIcon: ({ color }) => <Ionicons name="people" size={22} color={color} /> }} />
      <Tabs.Screen name="news" options={{ title: 'الأخبار', tabBarIcon: ({ color }) => <Ionicons name="megaphone" size={22} color={color} /> }} />
      <Tabs.Screen name="inbox" options={{ title: 'الوارد', tabBarIcon: ({ color }) => <Ionicons name="mail" size={22} color={color} />, tabBarBadge: unread > 0 ? unread : undefined }} />
      <Tabs.Screen name="finance" options={{ title: 'المالية', tabBarIcon: ({ color }) => <Ionicons name="wallet" size={22} color={color} /> }} />
    </Tabs>
  );
}

export default function AdminLayout() {
  if (isLiquidGlassAvailable()) return <NativeAdminTabs />;
  return <ClassicAdminTabs />;
}
