import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

import LoginScreen             from '../screens/LoginScreen';
import RegisterScreen          from '../screens/RegisterScreen';
import HomeScreen              from '../screens/HomeScreen';
import EventDetailScreen       from '../screens/EventDetailScreen';
import QueueScreen             from '../screens/QueueScreen';
import CheckoutScreen          from '../screens/CheckoutScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import MyTicketsScreen         from '../screens/MyTicketsScreen';
import NotificationsScreen     from '../screens/NotificationsScreen';
import ProfileScreen           from '../screens/ProfileScreen';

import { Colors, Typography } from '../theme';
import type { MainTabParamList, HomeStackParamList } from '../types';

const Tab       = createBottomTabNavigator<MainTabParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const RootStackNav = createNativeStackNavigator();

// Home stack: HomeScreen → EventDetail → Queue → OrderConfirmation
function HomeStack() {
  return (
    <HomeStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surfaceContainerLowest },
        headerTitleStyle: { ...(Typography.headlineMd as any), color: Colors.pureBlack },
        headerShadowVisible: true,
        headerTintColor: Colors.pureBlack,
      }}
    >
      <HomeStackNav.Screen name="HomeScreen"          component={HomeScreen}              options={{ headerShown: false }} />
      <HomeStackNav.Screen name="EventDetail"         component={EventDetailScreen}       options={{ title: 'War Tiket' }} />
      <HomeStackNav.Screen name="Queue"               component={QueueScreen}             options={{ title: 'War Tiket', headerShown: false }} />
      <HomeStackNav.Screen name="Checkout"            component={CheckoutScreen}          options={{ title: 'Pembayaran', headerShown: false }} />
      <HomeStackNav.Screen name="OrderConfirmation"   component={OrderConfirmationScreen} options={{ title: 'Konfirmasi Pesanan', headerLeft: () => null }} />
    </HomeStackNav.Navigator>
  );
}

// Bottom Tab Navigator — sesuai design beranda_konser (Home, Events, My Tickets, Profile)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor: Colors.divider,
          borderTopWidth: 1,
          paddingBottom: 8,
          height: 68,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: -2,
          fontFamily: 'Inter_600SemiBold',
          letterSpacing: 0.4,
        },
        tabBarActiveTintColor:   Colors.pureBlack,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Home:          ['home',              'home-outline'],
            Events:        ['ticket',            'ticket-outline'],
            MyTickets:     ['file-tray-full',    'file-tray-full-outline'],
            Notifications: ['notifications',     'notifications-outline'],
            Profile:       ['person',            'person-outline'],
          };
          const [filled, outline] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? filled : outline) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeStack}       options={{ title: 'Home' }} />
      <Tab.Screen name="Events"    component={HomeStack}       options={{ title: 'Events' }} />
      <Tab.Screen name="MyTickets" component={MyTicketsScreen} options={{
        title: 'My Tickets',
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surfaceContainerLowest },
        headerTitleStyle: { ...(Typography.headlineMd as any), color: Colors.pureBlack },
      }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{
        title: 'Notifikasi',
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surfaceContainerLowest },
        headerTitleStyle: { ...(Typography.headlineMd as any), color: Colors.pureBlack },
      }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{
        title: 'Profile',
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surfaceContainerLowest },
        headerTitleStyle: { ...(Typography.headlineMd as any), color: Colors.pureBlack },
      }} />
    </Tab.Navigator>
  );
}

function LoginStack() {
  return (
    <RootStackNav.Navigator screenOptions={{ headerShown: false }}>
      <RootStackNav.Screen name="Login"    component={LoginScreen} />
      <RootStackNav.Screen name="Register" component={RegisterScreen} />
    </RootStackNav.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <LoginStack />}
    </NavigationContainer>
  );
}
