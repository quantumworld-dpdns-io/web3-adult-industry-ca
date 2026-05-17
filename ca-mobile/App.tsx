import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { ScanLine, User, BadgeCheck } from "lucide-react-native";

import CredentialsScreen from "./app/(tabs)/credentials";
import ScanScreen from "./app/(tabs)/scan";
import ProfileScreen from "./app/(tabs)/profile";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a1a" },
          headerTintColor: "#e0e0e0",
          tabBarStyle: { backgroundColor: "#0f0f23", borderTopColor: "#2a2a4a" },
          tabBarActiveTintColor: "#7c3aed",
          tabBarInactiveTintColor: "#666",
        }}
      >
        <Tab.Screen
          name="Credentials"
          component={CredentialsScreen}
          options={{
            tabBarIcon: ({ color }) => <BadgeCheck size={22} color={color} />,
          }}
        />
        <Tab.Screen
          name="Scan"
          component={ScanScreen}
          options={{
            tabBarIcon: ({ color }) => <ScanLine size={22} color={color} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color }) => <User size={22} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
