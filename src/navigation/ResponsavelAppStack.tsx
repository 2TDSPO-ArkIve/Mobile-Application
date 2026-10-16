import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ResponsavelAppStackParamList } from '../interfaces/navigation';
import { MeusAnimaisScreen } from '../screens/MeusAnimaisScreen';
import { NewAnimalScreen } from '../screens/NewAnimalScreen';
import { EditAnimalScreen } from '../screens/EditAnimalScreen';
import { PatientDetailScreen } from '../screens/PatientDetailScreen';
import { PatientHistoryScreen } from '../screens/PatientHistoryScreen';
import { PatientCostScreen } from '../screens/PatientCostScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ArkiveIdLookupScreen } from '../screens/ArkiveIdLookupScreen';
import { AccessRequestsScreen } from '../screens/AccessRequestsScreen';
import { ResponsavelAccountScreen } from '../screens/ResponsavelAccountScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { CreateShareScreen } from '../screens/CreateShareScreen';
import { SharePreviewScreen } from '../screens/SharePreviewScreen';
import { ScanShareQrScreen } from '../screens/ScanShareQrScreen';
import { useThemeColors } from '../hooks/useThemeColors';

const Stack = createNativeStackNavigator<ResponsavelAppStackParamList>();

/**
 * The RESPONSAVEL application shell. No VETERINARIO-only clinical screens
 * are registered here at all (not merely hidden behind a role check):
 * Consultas, Criar/Editar Consulta, Análise/Insight ArkIve, Conclusão,
 * Prescrições, and the veterinarian Perfil screen simply do not exist in
 * this navigator, so a RESPONSAVEL cannot reach them by any navigation call,
 * deep link, or back-button trick — not just because a button is hidden.
 *
 * Chunk 3: `CadastrarAnimal`/`EditarAnimal` give this stack its own animal
 * write path (`NewAnimalScreen`/`EditAnimalScreen`), separate from the
 * VETERINARIO `NovoPaciente`/`EditarPaciente` screens — see those screens'
 * own doc comments for why they aren't simply reused here.
 *
 * `SettingsScreen`/`ChangePasswordScreen` are reused completely unmodified:
 * both are already role-neutral (theme/i18n preferences; a password-change
 * form that only reads `AuthContext.changePassword`), confirmed by reading
 * their current implementation before reusing them here.
 */
export function ResponsavelAppStack() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MeusAnimais" component={MeusAnimaisScreen} />
      <Stack.Screen name="CadastrarAnimal" component={NewAnimalScreen} />
      <Stack.Screen name="EditarAnimal" component={EditAnimalScreen} />
      <Stack.Screen name="PacienteDetalhe" component={PatientDetailScreen} />
      <Stack.Screen name="HistoricoPaciente" component={PatientHistoryScreen} />
      <Stack.Screen name="CustosPaciente" component={PatientCostScreen} />
      <Stack.Screen name="CompartilharPaciente" component={CreateShareScreen} />
      <Stack.Screen name="ConvitePaciente" component={SharePreviewScreen} />
      <Stack.Screen name="EscanearConvite" component={ScanShareQrScreen} />
      <Stack.Screen name="MinhaConta" component={ResponsavelAccountScreen} />
      <Stack.Screen name="Configuracoes" component={SettingsScreen} />
      <Stack.Screen name="AlterarSenha" component={ChangePasswordScreen} />
      <Stack.Screen name="Notificacoes" component={NotificationsScreen} />
      <Stack.Screen name="BuscarPacienteArkive" component={ArkiveIdLookupScreen} />
      <Stack.Screen name="SolicitacoesAcessoRecebidas" component={AccessRequestsScreen} />
    </Stack.Navigator>
  );
}
