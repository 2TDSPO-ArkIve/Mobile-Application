import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../interfaces/navigation';
import { BottomTabs } from './BottomTabs';
import { ConsultaDetailScreen } from '../screens/ConsultaDetailScreen';
import { ArkiveAnalysisScreen } from '../screens/ArkiveAnalysisScreen';
import { ArkiveInsightScreen } from '../screens/ArkiveInsightScreen';
import { VeterinarianConclusionScreen } from '../screens/VeterinarianConclusionScreen';
import { NewConsultaScreen } from '../screens/NewConsultaScreen';
import { EditConsultaScreen } from '../screens/EditConsultaScreen';
import { NewPatientScreen } from '../screens/NewPatientScreen';
import { PatientDetailScreen } from '../screens/PatientDetailScreen';
import { EditPatientScreen } from '../screens/EditPatientScreen';
import { PrescricoesScreen } from '../screens/PrescricoesScreen';
import { NewPrescricaoScreen } from '../screens/NewPrescricaoScreen';
import { PrescricaoDetailScreen } from '../screens/PrescricaoDetailScreen';
import { EditPrescricaoScreen } from '../screens/EditPrescricaoScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { useThemeColors } from '../hooks/useThemeColors';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="ConsultaDetalhe" component={ConsultaDetailScreen} />
      <Stack.Screen name="EditarConsulta" component={EditConsultaScreen} />
      <Stack.Screen name="AnaliseArkive" component={ArkiveAnalysisScreen} />
      <Stack.Screen name="InsightArkive" component={ArkiveInsightScreen} />
      <Stack.Screen name="ConclusaoVeterinaria" component={VeterinarianConclusionScreen} />
      <Stack.Screen name="CriarConsulta" component={NewConsultaScreen} />
      <Stack.Screen name="NovoPaciente" component={NewPatientScreen} />
      <Stack.Screen name="PacienteDetalhe" component={PatientDetailScreen} />
      <Stack.Screen name="EditarPaciente" component={EditPatientScreen} />
      <Stack.Screen name="Prescricoes" component={PrescricoesScreen} />
      <Stack.Screen name="NovaPrescricao" component={NewPrescricaoScreen} />
      <Stack.Screen name="PrescricaoDetalhe" component={PrescricaoDetailScreen} />
      <Stack.Screen name="EditarPrescricao" component={EditPrescricaoScreen} />
      <Stack.Screen name="Perfil" component={ProfileScreen} />
      <Stack.Screen name="Configuracoes" component={SettingsScreen} />
      <Stack.Screen name="AlterarSenha" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
}
