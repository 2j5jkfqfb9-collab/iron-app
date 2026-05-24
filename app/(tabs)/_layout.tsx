import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, border, tracking } from '@/theme/tokens';

type TabIconProps = {
  label: string;
  focused: boolean;
};

function TabLabel({ label, focused }: TabIconProps) {
  return (
    <View style={styles.tabWrap}>
      {focused && <View style={styles.indicator} />}
      <Text style={[styles.tabText, focused && styles.tabTextActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="TODAY" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="HISTORY" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabLabel label="PROFILE" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    backgroundColor: 'rgba(245,240,225,0.95)',
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    paddingTop: 14,
    paddingBottom: 24,
    elevation: 0,
  },
  tabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: -15,
    width: 24,
    height: 2,
    backgroundColor: colors.accent,
  },
  tabText: {
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.accent,
  },
});
