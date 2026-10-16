import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../interfaces/navigation';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SharePreviewScreen } from '../screens/SharePreviewScreen';
import { ScanShareQrScreen } from '../screens/ScanShareQrScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Cadastro" component={RegisterScreen} />
      {/*
        Chunk 2: no separate component anymore — `CadastroResponsavel` is a
        backward-compatible ALIAS route pointing at the SAME unified
        `RegisterScreen`, which reads `useRoute().name` to preselect
        RESPONSAVEL when entered through this name. This keeps
        `SharePreviewScreen`'s existing `navigate('CadastroResponsavel')`
        call (and any other stale reference) working unchanged.
      */}
      <Stack.Screen name="CadastroResponsavel" component={RegisterScreen} />
      <Stack.Screen name="ConvitePaciente" component={SharePreviewScreen} />
      <Stack.Screen name="EscanearConvite" component={ScanShareQrScreen} />
    </Stack.Navigator>
  );
}
