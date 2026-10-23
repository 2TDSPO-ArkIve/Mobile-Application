import React from 'react';
import type { NavigationHelpers, NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList, BottomTabParamList } from '../interfaces/navigation';
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
import { PatientHistoryScreen } from '../screens/PatientHistoryScreen';
import { PatientCostScreen } from '../screens/PatientCostScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ArkiveIdLookupScreen } from '../screens/ArkiveIdLookupScreen';
import { PrescricoesScreen } from '../screens/PrescricoesScreen';
import { NewPrescricaoScreen } from '../screens/NewPrescricaoScreen';
import { PrescricaoDetailScreen } from '../screens/PrescricaoDetailScreen';
import { EditPrescricaoScreen } from '../screens/EditPrescricaoScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { VeterinarianCostScreen } from '../screens/VeterinarianCostScreen';
import { MyAccessRequestsScreen } from '../screens/MyAccessRequestsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AboutUsScreen } from '../screens/AboutUsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { CreateShareScreen } from '../screens/CreateShareScreen';
import { SharePreviewScreen } from '../screens/SharePreviewScreen';
import { ScanShareQrScreen } from '../screens/ScanShareQrScreen';
import { EnterShareCodeScreen } from '../screens/EnterShareCodeScreen';
import { AnimalReportsScreen } from '../screens/AnimalReportsScreen';
import { AiUsageScreen } from '../screens/AiUsageScreen';
import { SidebarLayout } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';

const Stack = createNativeStackNavigator<AppStackParamList>();

type Section = keyof BottomTabParamList | 'Custos' | 'UsoDaIa' | 'Perfil';

/** Sidebar item that stays active on each stacked screen. */
const SECTION: Partial<Record<keyof AppStackParamList, Section>> = {
  ConsultaDetalhe: 'Consultas',
  EditarConsulta: 'Consultas',
  AnaliseArkive: 'Consultas',
  InsightArkive: 'Consultas',
  ConclusaoVeterinaria: 'Consultas',
  CriarConsulta: 'Consultas',
  Prescricoes: 'Consultas',
  NovaPrescricao: 'Consultas',
  PrescricaoDetalhe: 'Consultas',
  EditarPrescricao: 'Consultas',
  NovoPaciente: 'Pacientes',
  PacienteDetalhe: 'Pacientes',
  EditarPaciente: 'Pacientes',
  HistoricoPaciente: 'Pacientes',
  CustosPaciente: 'Pacientes',
  RelatosAnimal: 'Pacientes',
  CompartilharPaciente: 'Pacientes',
  ConvitePaciente: 'Pacientes',
  EscanearConvite: 'Pacientes',
  InserirCodigoConvite: 'Pacientes',
  BuscarPacienteArkive: 'Pacientes',
  ValoresVeterinario: 'Custos',
  UsoDaIa: 'UsoDaIa',
  Perfil: 'Perfil',
  Configuracoes: 'Perfil',
  SobreNos: 'Perfil',
  AlterarSenha: 'Perfil',
  SolicitacoesAcessoEnviadas: 'Perfil',
  // The bell lives in the Home header.
  Notificacoes: 'Home',
};

function activeSection(state: NavigationState): Section | null {
  const route = state.routes[state.index];
  if (route.name !== 'MainTabs') return SECTION[route.name as keyof AppStackParamList] ?? null;
  // Before the tab navigator reports its state, fall back to the requested or first tab.
  const tabs = route.state;
  if (tabs?.index != null) return tabs.routes[tabs.index].name as Section;
  return (route.params as { screen?: Section } | undefined)?.screen ?? 'Home';
}

function VetSidebarLayout({
  state,
  navigation,
  children,
}: {
  state: NavigationState;
  navigation: NavigationHelpers<AppStackParamList>;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { identity } = useAuth();
  const tab = (screen: keyof BottomTabParamList) => () => navigation.navigate('MainTabs', { screen });

  return (
    <SidebarLayout
      activeKey={activeSection(state)}
      groups={[
        [
          { key: 'Home', label: t('nav.home'), icon: { active: 'home', inactive: 'home-outline' }, onPress: tab('Home') },
          { key: 'Consultas', label: t('nav.consultas'), icon: { active: 'calendar', inactive: 'calendar-outline' }, onPress: tab('Consultas') },
          { key: 'Pacientes', label: t('nav.pacientes'), icon: { active: 'paw', inactive: 'paw-outline' }, onPress: tab('Pacientes') },
        ],
        [
          { key: 'Custos', label: t('vetCosts.title'), icon: { active: 'bar-chart', inactive: 'bar-chart-outline' }, onPress: () => navigation.navigate('ValoresVeterinario') },
          { key: 'UsoDaIa', label: t('aiUsage.title'), icon: { active: 'sparkles', inactive: 'sparkles-outline' }, onPress: () => navigation.navigate('UsoDaIa') },
        ],
      ]}
      footer={{
        title: identity?.nome ?? '',
        subtitle: t('sidebar.profileAndSettings'),
        onPress: () => navigation.navigate('Perfil'),
      }}
    >
      {children}
    </SidebarLayout>
  );
}

export function AppStack() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      layout={({ state, navigation, children }) => (
        <VetSidebarLayout state={state} navigation={navigation}>
          {children}
        </VetSidebarLayout>
      )}
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
      <Stack.Screen name="HistoricoPaciente" component={PatientHistoryScreen} />
      <Stack.Screen name="CustosPaciente" component={PatientCostScreen} />
      <Stack.Screen name="RelatosAnimal" component={AnimalReportsScreen} />
      <Stack.Screen name="UsoDaIa" component={AiUsageScreen} />
      <Stack.Screen name="CompartilharPaciente" component={CreateShareScreen} />
      <Stack.Screen name="ConvitePaciente" component={SharePreviewScreen} />
      <Stack.Screen name="EscanearConvite" component={ScanShareQrScreen} />
      <Stack.Screen name="InserirCodigoConvite" component={EnterShareCodeScreen} />
      <Stack.Screen name="BuscarPacienteArkive" component={ArkiveIdLookupScreen} />
      <Stack.Screen name="Prescricoes" component={PrescricoesScreen} />
      <Stack.Screen name="NovaPrescricao" component={NewPrescricaoScreen} />
      <Stack.Screen name="PrescricaoDetalhe" component={PrescricaoDetailScreen} />
      <Stack.Screen name="EditarPrescricao" component={EditPrescricaoScreen} />
      <Stack.Screen name="Perfil" component={ProfileScreen} />
      <Stack.Screen name="ValoresVeterinario" component={VeterinarianCostScreen} />
      <Stack.Screen name="SolicitacoesAcessoEnviadas" component={MyAccessRequestsScreen} />
      <Stack.Screen name="Configuracoes" component={SettingsScreen} />
      <Stack.Screen name="SobreNos" component={AboutUsScreen} />
      <Stack.Screen name="AlterarSenha" component={ChangePasswordScreen} />
      <Stack.Screen name="Notificacoes" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
