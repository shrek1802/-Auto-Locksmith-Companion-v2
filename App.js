import 'react-native-gesture-handler';

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DatabaseProvider } from './context/DatabaseContext';

import ManufacturersScreen from './screens/ManufacturersScreen';
import ModelsScreen from './screens/ModelsScreen';
import ModelFamilyScreen from './screens/ModelFamilyScreen';
import VehicleScreen from './screens/VehicleScreen';
import SettingsScreen from './screens/SettingsScreen';
import KnowledgeEngineScreen from './screens/KnowledgeEngineScreen';

const Stack = createNativeStackNavigator();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#60A5FA',
    background: '#0B1220',
    card: '#111827',
    text: '#F8FAFC',
    border: '#253047',
    notification: '#EF4444',
  },
};

const screenOptions = {
  headerStyle: {
    backgroundColor: '#111827',
  },
  headerTintColor: '#F8FAFC',
  headerTitleStyle: {
    fontWeight: '800',
  },
  headerShadowVisible: false,
  contentStyle: {
    backgroundColor: '#0B1220',
  },
};

export default function App() {
  return (
    <DatabaseProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style="light" />

        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen
            name="Manufacturers"
            component={ManufacturersScreen}
            options={{
              title: 'Locksmith Companion Pro',
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="Models"
            component={ModelsScreen}
            options={({ route }) => ({
              title: route.params?.manufacturer?.name || 'Models',
            })}
          />

          <Stack.Screen
            name="ModelFamily"
            component={ModelFamilyScreen}
            options={({ route }) => ({
              title: route.params?.familyName || 'Model family',
            })}
          />

          <Stack.Screen
            name="Vehicle"
            component={VehicleScreen}
            options={({ route }) => {
              const vehicle = route.params?.record?.vehicle;

              return {
                title: vehicle
                  ? `${vehicle.make} ${vehicle.model}`
                  : 'Vehicle details',
              };
            }}
          />

          <Stack.Screen
            name="KnowledgeEngine"
            component={KnowledgeEngineScreen}
            options={{ title: 'Knowledge Engine V3' }}
          />

          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </DatabaseProvider>
  );
}
