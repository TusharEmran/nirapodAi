import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';

export default function TabLayout() {
  const { isReady, token } = useAuth();
  const isAndroid = Platform.OS === 'android';

  if (!isReady) {
    return null;
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={isAndroid ? ['bottom'] : []}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
        tabBar={(props) => <CustomTabBar {...props} />}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="explore" options={{ title: 'Map' }} />
        <Tabs.Screen name="community" options={{ title: 'Message' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </SafeAreaView>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const items = [
    { name: 'index', icon: 'home-variant' },
    { name: 'explore', icon: 'map-outline' },
    { name: 'community', icon: 'message-outline' },
    { name: 'profile', icon: 'account-outline' },
  ] as const;

  return (
    <View style={[styles.tabBar, { paddingBottom: isAndroid ? Math.max(insets.bottom, 14) : 14 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const title = descriptors[route.key]?.options.title ?? route.name;
        const icon = items.find((item) => item.name === route.name)?.icon ?? 'circle-outline';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={title}
            style={styles.tabButton}>
            <MaterialCommunityIcons
              name={icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
              size={26}
              color={isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.78)'}
            />
            <View style={[styles.activeDot, isFocused && styles.activeDotVisible]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#C84D61',
  },
  tabBar: {
    backgroundColor: '#C84D61',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 14,
    shadowColor: '#7A2434',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    gap: 6,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  activeDotVisible: {
    backgroundColor: '#FFFFFF',
  },
});
