import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  IBMPlexSans_400Regular_Italic,
} from '@expo-google-fonts/ibm-plex-sans';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Anton: Anton_400Regular,
    IBMPlexSans: IBMPlexSans_400Regular,
    'IBMPlexSans-Medium': IBMPlexSans_500Medium,
    'IBMPlexSans-SemiBold': IBMPlexSans_600SemiBold,
    'IBMPlexSans-Bold': IBMPlexSans_700Bold,
    'IBMPlexSans-Italic': IBMPlexSans_400Regular_Italic,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" backgroundColor={colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout/[id]"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="workout/summary"
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="history/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="builder"
          options={{ animation: 'slide_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
