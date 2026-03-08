import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

function NativeTeacherTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "calendar", selected: "calendar.fill" }} />
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
    </NativeTabs>
  );
}

function ClassicTeacherTabs() {
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
          backgroundColor: isIOS ? "transparent" : "#061e1a",
          borderTopWidth: 1,
          borderTopColor: "rgba(16,185,129,0.15)",
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
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
      <Tabs.Screen name="index" options={{ title: 'جدولي', tabBarIcon: ({ color }) => <Ionicons name="calendar" size={22} color={color} /> }} />
      <Tabs.Screen name="students" options={{ title: 'الطلاب', tabBarIcon: ({ color }) => <Ionicons name="people" size={22} color={color} /> }} />
      <Tabs.Screen name="grades" options={{ title: 'الدرجات', tabBarIcon: ({ color }) => <Ionicons name="school" size={22} color={color} /> }} />
      <Tabs.Screen name="curriculum" options={{ title: 'المنهج', tabBarIcon: ({ color }) => <Ionicons name="book" size={22} color={color} /> }} />
    </Tabs>
  );
}

export default function TeacherLayout() {
  if (isLiquidGlassAvailable()) return <NativeTeacherTabs />;
  return <ClassicTeacherTabs />;
}
