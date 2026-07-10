import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import ManufacturersScreen from './screens/ManufacturersScreen';
import ModelsScreen from './screens/ModelsScreen';
import VehicleScreen from './screens/VehicleScreen';
import SettingsScreen from './screens/SettingsScreen';
import { DatabaseProvider } from './context/DatabaseContext';

const Stack = createNativeStackNavigator();
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B1220',
    card: '#0B1220',
    border: '#253047',
    text: '#F8FAFC',
    primary: '#60A5FA',
  },
};

export default function App() {
  return (
    <DatabaseProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{
          headerStyle: { backgroundColor: '#0B1220' },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: { fontWeight: '800' },
        }}>
          <Stack.Screen name="Manufacturers" component={ManufacturersScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Models" component={ModelsScreen} options={({ route }) => ({ title: route.params.manufacturer.name })} />
          <Stack.Screen name="Vehicle" component={VehicleScreen} options={({ route }) => ({ title: `${route.params.record.vehicle.make} ${route.params.record.vehicle.model}` })} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </DatabaseProvider>
  );
}
