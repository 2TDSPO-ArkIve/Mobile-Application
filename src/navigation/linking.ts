import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../interfaces/navigation';

const id = { patientId: Number, consultaId: Number, prescricaoId: Number, focusRequestId: Number };

/** Params that must never reach the address bar: an object (AnimalDto) and an e-mail. */
const hidden = { preselectedAnimal: () => undefined, prefillIdentifier: () => undefined } as unknown as Record<
  string,
  (value: unknown) => string
>;

/**
 * Web only (RootNavigator passes `enabled` by platform): keeps the address
 * bar in step with the app so the browser's Back and a page refresh stay on
 * the open screen in the Vercel demo. Native keeps its own transport
 * (`DeepLinkHandler` for `arkive://` share links), so linking stays off there.
 * No react-native import, so `npm run linking` can check this map in Node.
 *
 * `App` hosts either role's stack under the same name, so both stacks'
 * routes live in one map; a URL naming a route the signed-in role lacks is
 * dropped by the stack router and the stack opens on its first screen.
 * A refresh opens only the named screen, with nothing under it; `AppHeader`
 * handles that by returning to the stack's first screen.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: { path: 'entrar', stringify: hidden },
          Cadastro: 'cadastro',
          CadastroResponsavel: 'cadastro/responsavel',
          // Paths must be unique across stacks, so the signed-out copies of these screens get their own.
          ConvitePaciente: 'entrar/convite',
          EscanearConvite: 'entrar/escanear',
        },
      },
      PasswordChange: 'trocar-senha',
      App: {
        screens: {
          MainTabs: {
            screens: { Home: '', Consultas: 'consultas', Pacientes: 'pacientes' },
          },
          ConsultaDetalhe: { path: 'consultas/:consultaId', parse: id },
          EditarConsulta: { path: 'consultas/:consultaId/editar', parse: id },
          AnaliseArkive: { path: 'consultas/:consultaId/analise', parse: id },
          InsightArkive: { path: 'consultas/:consultaId/insight', parse: id },
          ConclusaoVeterinaria: { path: 'consultas/:consultaId/conclusao', parse: id },
          Prescricoes: { path: 'consultas/:consultaId/prescricoes', parse: id },
          NovaPrescricao: { path: 'consultas/:consultaId/prescricoes/nova', parse: id },
          PrescricaoDetalhe: { path: 'consultas/:consultaId/prescricoes/:prescricaoId', parse: id },
          EditarPrescricao: { path: 'consultas/:consultaId/prescricoes/:prescricaoId/editar', parse: id },
          CriarConsulta: { path: 'consultas/nova', stringify: hidden },
          NovoPaciente: 'pacientes/novo',
          MeusAnimais: 'animais',
          CadastrarAnimal: 'animais/novo',
          PacienteDetalhe: { path: 'pacientes/:patientId', parse: id },
          EditarPaciente: { path: 'pacientes/:patientId/editar', parse: id },
          EditarAnimal: { path: 'animais/:patientId/editar', parse: id },
          HistoricoPaciente: { path: 'pacientes/:patientId/historico', parse: id },
          CustosPaciente: { path: 'pacientes/:patientId/custos', parse: id },
          RelatosAnimal: { path: 'pacientes/:patientId/relatos', parse: id },
          NovoRelatoAnimal: { path: 'pacientes/:patientId/relatos/novo', parse: id },
          CompartilharPaciente: { path: 'pacientes/:patientId/compartilhar', parse: id },
          ConvitePaciente: 'convite',
          EscanearConvite: 'convite/escanear',
          InserirCodigoConvite: 'convite/codigo',
          BuscarPacienteArkive: 'buscar-id',
          SolicitacoesAcessoRecebidas: { path: 'solicitacoes', parse: id },
          SolicitacoesAcessoEnviadas: 'solicitacoes/enviadas',
          Perfil: 'perfil',
          MinhaConta: 'conta',
          ValoresVeterinario: 'financeiro',
          UsoDaIa: 'uso-da-ia',
          Configuracoes: 'configuracoes',
          AlterarSenha: 'alterar-senha',
          Notificacoes: 'notificacoes',
        },
      },
    },
  },
};
