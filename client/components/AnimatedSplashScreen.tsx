import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, Dimensions, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

type Props = {
  onAnimationComplete: () => void;
};

export function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const [isAppReady, setIsAppReady] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide the native splash screen as soon as our JS-based one is mounted
    // We delay slightly to ensure React has fully painted this view
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
        setIsAppReady(true);
      } catch (e) {
        // ignore
      }
    };
    
    // Quick timeout to prevent flash
    const timeout = setTimeout(hideNativeSplash, 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isAppReady) return;

    // Professional animation sequence:
    // 1. Subtle pulse (breathing effect)
    // 2. Scale down slightly, then explode outwards while fading out
    Animated.sequence([
      // Pulse animation
      Animated.timing(pulse, {
        toValue: 1.05,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      // Dramatic exit
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.5, // Scale up significantly
          duration: 600,
          easing: Easing.in(Easing.poly(4)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400, // Fade out quickly during the scale
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onAnimationComplete();
    });
  }, [isAppReady, pulse, scale, opacity, onAnimationComplete]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Animated.Image
        source={require('../assets/images/app_logo.png')}
        style={[
          styles.logo,
          {
            transform: [
              { scale: scale },
              { scale: pulse }
            ],
          },
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09090B', // Dark theme background
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999, // Ensure it sits on top of the router
    elevation: 9999,
  },
  logo: {
    width: 200,
    height: 200,
  },
});
