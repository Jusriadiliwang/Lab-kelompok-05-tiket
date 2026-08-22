import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import C from "../utils/colors";

import SplashScreen        from "../screens/SplashScreen";
import LoginScreen         from "../screens/auth/LoginScreen";
import RegisterScreen      from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import HomeScreen          from "../screens/main/HomeScreen";
import EventDetailScreen   from "../screens/main/EventDetailScreen";
import OrdersScreen        from "../screens/main/OrdersScreen";
import ProfileScreen       from "../screens/main/ProfileScreen";
import NotifScreen         from "../screens/main/NotifScreen";
import AdminScreen         from "../screens/admin/AdminScreen";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  const { user } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bg2,
          borderTopColor: C.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.text3,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: "ticket-outline",
            Orders: "receipt-outline",
            Notif: "notifications-outline",
            Profile: "person-outline",
            Admin: "settings-outline",
          };
          return <Ionicons name={icons[route.name]||"apps"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{title:"Beranda"}} />
      <Tab.Screen name="Orders"  component={OrdersScreen}  options={{title:"Tiket"}} />
      <Tab.Screen name="Notif"   component={NotifScreen}   options={{title:"Notif"}} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{title:"Profil"}} />
      {user?.role === "admin" && (
        <Tab.Screen name="Admin" component={AdminScreen} options={{title:"Admin"}} />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login"          component={LoginScreen} />
          <Stack.Screen name="Register"       component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main"        component={MainTabs} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}