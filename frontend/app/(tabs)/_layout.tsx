import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#4ade80",
        tabBarStyle: { backgroundColor: "#0b0b0b", borderTopColor: "#1f1f1f" },
        headerStyle: { backgroundColor: "#0b0b0b" },
        headerTintColor: "#fff",
      }}
    >
      <Tabs.Screen
        name="chats/index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vault/index"
        options={{
          title: "Vault",
          tabBarIcon: ({ color, size }) => <Ionicons name="lock-closed" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}