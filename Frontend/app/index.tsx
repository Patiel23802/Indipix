import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Brush, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LOGO = require('../assets/images/indipix-logo.png');

const SPLASH_COLORS = {
  primary: '#ec1349',
  secondary: '#FF9800',
  backgroundLight: '#FFF8F0',
  backgroundDark: '#221015',
  accentPurple: '#7B1FA2',
  accentTeal: '#00897B',
};

export default function SplashScreen() {
  const router = useRouter();
  const [floatAnim1] = useState(new Animated.Value(0));
  const [floatAnim2] = useState(new Animated.Value(0));
  const [floatAnim3] = useState(new Animated.Value(0));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [bounceAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Floating animations
    const float1 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    const float2 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 1,
          duration: 3000,
          delay: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    const float3 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim3, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim3, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    // Rotating animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    );

    // Bounce animation
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    float1.start();
    float2.start();
    float3.start();
    rotate.start();
    bounce.start();

    return () => {
      float1.stop();
      float2.stop();
      float3.stop();
      rotate.stop();
      bounce.stop();
    };
  }, []);

  const float1TranslateY = floatAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const float2TranslateY = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const float3TranslateY = floatAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bounceTranslateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const handleGetStarted = () => {
    router.replace('/login');
  };

  const image1Url =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDGhNX6WiViiXj6nN3Ku7Xn7PQF0VBxI2Wpo8NxOFW3JVSNs6dJKlzbwkadaGHF8RBumhRQTonSSs61L71M1qCW_9iEPofvC5JHCqy_bn8POzfXHaNkGF2FR2XMDsi2i4mKLvMZewODS5H2pQaej3PXPRELqhwrBqV0GxlwUw0SX8Hc0cDAs2okD_59FnRODpl57gNNXmqJdRHy4YXec-H-5iIyI1BxBjZKbFR-16oX-kv8bIlMgBpa730nntHZLKOwxguTfBhLiUY';
  const image2Url =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDflftVhtlElg5Rki9-Qpg-g96ZmRyeHxTz0e9cad_IVcxxSQPhLeYoJMhFaYyQTaPN3xlJpYxK6svFnKc6EX0naE9hMPiB73ngHcpHqS56Izr6bgPlDabDTRVkI80Wma9sLWFXKEoEd6zUka4ApKKNG2CSBiQYKc6hp7FgXY2iH5rXZlBBFMWZmyDIBJZAqIiBHrDgzH0k5u_-TTY-XB9saBo54SCpSRfRI9juSxmAyVY9CK8JYX-3tkEXaFEC4FR86cYFOHGxkEA';
  const image3Url =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCSRQmFuPfjEy5WPjWS1bjGk2HOsyFsiVnKOG3JVKo51YozzcqY2J-wTR9xULa_wqDCNCbiIAUDE_EkjW5OrD3v_N0J37eJ6t7KJS82i-mH1yNsNSuOWZL0eIdDrwLmNdSGpwpmfPacarWZ5uCILp891c-nl2fVMoF7G9sRESmkQ1aPGmApQ-0ar2B2yFPiKxhiuFO7WghCzFNncCPXjWARonk6V0E-LB_xG08gh0TYCDtsGKdCdXMGuzyXzkHIGAvbOogY_0jrwfg';

  return (
    <View style={styles.container}>
      {/* Pattern Overlay */}
      <View style={styles.patternOverlay} />

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Image source={LOGO} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.title}>
            Indi<Text style={styles.titleSecondary}>pix</Text>
          </Text>
        </View>

        {/* Floating Images Container */}
        <View style={styles.imagesContainer}>
          {/* Decorative Circle */}
          <View style={styles.decorativeCircle1} />

          {/* Rotating Sun Icon */}
          <Animated.View style={[styles.rotatingIcon, { transform: [{ rotate: rotateInterpolate }] }]}>
            <Text style={styles.sunIcon}>☀️</Text>
          </Animated.View>

          {/* Floating Image 1 - Center */}
          <Animated.View style={[styles.floatingImage1, { transform: [{ translateY: float1TranslateY }] }]}>
            <View style={styles.blobShape1}>
              <Image source={{ uri: image1Url }} style={styles.floatingImage} />
            </View>
          </Animated.View>

          {/* Floating Image 2 - Left */}
          <Animated.View style={[styles.floatingImage2, { transform: [{ translateY: float2TranslateY }] }]}>
            <View style={styles.blobShape2}>
              <Image source={{ uri: image2Url }} style={styles.floatingImage} />
            </View>
          </Animated.View>

          {/* Floating Image 3 - Right */}
          <Animated.View style={[styles.floatingImage3, { transform: [{ translateY: float3TranslateY }] }]}>
            <View style={styles.blobShape3}>
              <Image source={{ uri: image3Url }} style={styles.floatingImage} />
            </View>
          </Animated.View>

          {/* Bouncing Brush Icon */}
          <Animated.View style={[styles.bouncingIcon1, { transform: [{ translateY: bounceTranslateY }] }]}>
            <Brush size={32} color={SPLASH_COLORS.primary} />
          </Animated.View>

          {/* Sparkles Icon */}
          <View style={styles.bouncingIcon2}>
            <Sparkles size={24} color={SPLASH_COLORS.secondary} />
          </View>
        </View>

        {/* Bottom Content */}
        <View style={styles.bottomContent}>
          <View>
            <Text style={styles.heading}>
              Craft Your{'\n'}
              <Text style={styles.headingHighlight}>Masterpiece</Text>
            </Text>
            <View style={styles.underline} />
          </View>
          <Text style={styles.description}>
            Add vibrant filters, traditional frames, and artistic effects to your photos with a touch of Indian
            heritage.
          </Text>
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Get started</Text>
            <ArrowRight size={20} color="#ffffff" style={styles.arrowIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Gradient */}
      <LinearGradient colors={['transparent', SPLASH_COLORS.backgroundDark]} style={styles.bottomGradient} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_COLORS.backgroundDark,
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: SPLASH_COLORS.primary,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    zIndex: 10,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  brandLogo: {
    width: 72,
    height: 72,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: SPLASH_COLORS.primary,
    letterSpacing: 1,
  },
  titleSecondary: {
    color: SPLASH_COLORS.secondary,
  },
  imagesContainer: {
    flex: 1,
    width: '100%',
    height: 450,
    position: 'relative',
    marginTop: 16,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${SPLASH_COLORS.accentTeal}33`,
    opacity: 0.4,
  },
  rotatingIcon: {
    position: 'absolute',
    top: 40,
    right: 32,
  },
  sunIcon: {
    fontSize: 40,
  },
  floatingImage1: {
    position: 'absolute',
    top: 80,
    left: '50%',
    marginLeft: -64,
    marginTop: -16,
  },
  floatingImage2: {
    position: 'absolute',
    top: 192,
    left: 16,
  },
  floatingImage3: {
    position: 'absolute',
    top: 160,
    right: 8,
  },
  blobShape1: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: `${SPLASH_COLORS.secondary}33`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  blobShape2: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: `${SPLASH_COLORS.accentTeal}33`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  blobShape3: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${SPLASH_COLORS.primary}33`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  floatingImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  bouncingIcon1: {
    position: 'absolute',
    bottom: 48,
    right: 48,
    opacity: 0.3,
  },
  bouncingIcon2: {
    position: 'absolute',
    bottom: 80,
    left: 64,
    opacity: 0.3,
  },
  bottomContent: {
    alignItems: 'center',
    paddingBottom: 32,
    zIndex: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  headingHighlight: {
    color: '#ffffff',
  },
  underline: {
    width: 200,
    height: 12,
    backgroundColor: `${SPLASH_COLORS.secondary}99`,
    borderRadius: 6,
    alignSelf: 'center',
    marginTop: -8,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
    marginBottom: 32,
  },
  getStartedButton: {
    width: '100%',
    backgroundColor: SPLASH_COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SPLASH_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 96,
    zIndex: 0,
  },
});
