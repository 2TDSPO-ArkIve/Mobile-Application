import React from 'react';
import type { NavigationHelpers, NavigationState } from '@react-navigation/native';
import { TabBar } from './BottomTabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ResponsavelAppStackParamList } from '../interfaces/navigation';
import { MeusAnimaisScreen } from '../screens/MeusAnimaisScreen';
import { ResponsavelConsultasScreen } from '../screens/ResponsavelConsultasScreen';
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
import { EnterShareCodeScreen } from '../screens/EnterShareCodeScreen';
import { AnimalReportsScreen } from '../screens/AnimalReportsScreen';
import { NewAnimalReportScreen } from '../screens/NewAnimalReportScreen';
import { SidebarLayout, type SidebarItem } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';

const Stack = createNativeStackNavigator<ResponsavelAppStackParamList>();

type Section = 'MeusAnimais' | 'ConsultasResponsavel' | 'BuscarPacienteArkive' | 'SolicitacoesAcessoRecebidas' | 'MinhaConta';

/** Sidebar item that stays active on each stacked screen; unlisted routes are their own section. */
const SECTION: Partial<Record<keyof ResponsavelAppStackParamList, Section>> = {
  CadastrarAnimal: 'MeusAnimais',
  EditarAnimal: 'MeusAnimais',
  PacienteDetalhe: 'MeusAnimais',
  HistoricoPaciente: 'MeusAnimais',
  CustosPaciente: 'MeusAnimais',
  RelatosAnimal: 'MeusAnimais',
  NovoRelatoAnimal: 'MeusAnimais',
  CompartilharPaciente: 'MeusAnimais',
  ConvitePaciente: 'MeusAnimais',
  EscanearConvite: 'MeusAnimais',
  InserirCodigoConvite: 'MeusAnimais',
  Configuracoes: 'MinhaConta',
  AlterarSenha: 'MinhaConta',
  // Opened from the notifications row in Meus animais.
  Notificacoes: 'MeusAnimais',
};

function TutorSidebarLayout({
  state,
  navigation,
  children,
}: {
  state: NavigationState;
  navigation: NavigationHelpers<ResponsavelAppStackParamList>;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { identity } = useAuth();
  const name = state.routes[state.index].name as keyof ResponsavelAppStackParamList;
  const activeKey = SECTION[name] ?? name;

  // Switching section replaces the stack instead of pushing onto it, so
  // MeusAnimais stays the only screen under the section (and Back leads there).
  // Routes already in the stack go back in with their keys, so MeusAnimais
  // keeps its scroll and query instead of mounting again on every switch.
  const existing = (routeName: Section): { name: string; key?: string } => state.routes.find((route) => route.name === routeName) ?? { name: routeName };
  const go = (section: Section) => () =>
    navigation.reset({
      index: section === 'MeusAnimais' ? 0 : 1,
      routes: section === 'MeusAnimais' ? [existing('MeusAnimais')] : [existing('MeusAnimais'), existing(section)],
    });

  const items: (SidebarItem & { tabLabel: string })[] = [
    { key: 'MeusAnimais', label: t('myAnimals.title'), tabLabel: t('myAnimals.title'), icon: { active: 'paw', inactive: 'paw-outline' }, onPress: go('MeusAnimais') },
    { key: 'ConsultasResponsavel', label: t('responsavelConsultas.title'), tabLabel: t('nav.consultas'), icon: { active: 'calendar', inactive: 'calendar-outline' }, onPress: go('ConsultasResponsavel') },
    { key: 'BuscarPacienteArkive', label: t('arkiveLookup.title'), tabLabel: t('nav.buscar'), icon: { active: 'search', inactive: 'search-outline' }, onPress: go('BuscarPacienteArkive') },
    { key: 'SolicitacoesAcessoRecebidas', label: t('accessRequestsReceived.title'), tabLabel: t('nav.solicitacoes'), icon: { active: 'person-add', inactive: 'person-add-outline' }, onPress: go('SolicitacoesAcessoRecebidas') },
  ];

  return (
    <SidebarLayout
      activeKey={activeKey}
      groups={[items]}
      footer={{
        title: identity?.nome ?? '',
        subtitle: t('account.title'),
        onPress: go('MinhaConta'),
      }}
    >
      {children}
      {/* Tabs only on the section screens themselves, like the VETERINARIO tabs. */}
      {items.some((item) => item.key === name) ? (
        <TabBar items={items.map((item) => ({ ...item, label: item.tabLabel }))} activeKey={activeKey} />
      ) : null}
    </SidebarLayout>
  );
}

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
      layout={({ state, navigation, children }) => (
        <TutorSidebarLayout state={state} navigation={navigation}>
          {children}
        </TutorSidebarLayout>
      )}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MeusAnimais" component={MeusAnimaisScreen} />
      <Stack.Screen name="ConsultasResponsavel" component={ResponsavelConsultasScreen} />
      <Stack.Screen name="CadastrarAnimal" component={NewAnimalScreen} />
      <Stack.Screen name="EditarAnimal" component={EditAnimalScreen} />
      <Stack.Screen name="PacienteDetalhe" component={PatientDetailScreen} />
      <Stack.Screen name="HistoricoPaciente" component={PatientHistoryScreen} />
      <Stack.Screen name="CustosPaciente" component={PatientCostScreen} />
      <Stack.Screen name="RelatosAnimal" component={AnimalReportsScreen} />
      <Stack.Screen name="NovoRelatoAnimal" component={NewAnimalReportScreen} />
      <Stack.Screen name="CompartilharPaciente" component={CreateShareScreen} />
      <Stack.Screen name="ConvitePaciente" component={SharePreviewScreen} />
      <Stack.Screen name="EscanearConvite" component={ScanShareQrScreen} />
      <Stack.Screen name="InserirCodigoConvite" component={EnterShareCodeScreen} />
      <Stack.Screen name="MinhaConta" component={ResponsavelAccountScreen} />
      <Stack.Screen name="Configuracoes" component={SettingsScreen} />
      <Stack.Screen name="AlterarSenha" component={ChangePasswordScreen} />
      <Stack.Screen name="Notificacoes" component={NotificationsScreen} />
      <Stack.Screen name="BuscarPacienteArkive" component={ArkiveIdLookupScreen} />
      <Stack.Screen name="SolicitacoesAcessoRecebidas" component={AccessRequestsScreen} />
    </Stack.Navigator>
  );
}
