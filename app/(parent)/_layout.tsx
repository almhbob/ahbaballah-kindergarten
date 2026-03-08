import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const PARENT_COLOR = "#7B3FA0";

function NativeParentTabs() {
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
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>التواصل</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>الأخبار</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicParentTabs() {
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
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
          ...(isWeb ? { height: 84 } : {}),
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
      <Tabs.Screen name="index" options={{ title: 'الطفل', tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} /> }} />
      <Tabs.Screen name="report" options={{ title: 'التقارير', tabBarIcon: ({ color }) => <Ionicons name="document-text" size={22} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'التواصل', tabBarIcon: ({ color }) => <Ionicons name="chatbubble" size={22} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'الأخبار', tabBarIcon: ({ color }) => <Ionicons name="notifications" size={22} color={color} /> }} />
    </Tabs>
  );
}

export default function ParentLayout() {
  if (isLiquidGlassAvailable()) return <NativeParentTabs />;
  return <ClassicParentTabs />;
}
