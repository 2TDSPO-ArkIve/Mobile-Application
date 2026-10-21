// Checks the web URL map: unique patterns, typed ids, private params kept out of the address bar.
// Run: npm run linking  (exits 1 if a case fails; getStateFromPath throws on duplicate patterns)
import { createRequire } from 'node:module';
import { linking } from '../src/navigation/linking.ts';

const require = createRequire(import.meta.url);
const { getStateFromPath, getPathFromState } = require('@react-navigation/core');
const config = linking.config;

type Route = { name: string; params?: Record<string, unknown>; state?: { index?: number; routes: Route[] } };
const leaf = (state: { index?: number; routes: Route[] }): Route => {
  let route = state.routes[state.index ?? state.routes.length - 1];
  while (route.state) route = route.state.routes[route.state.index ?? route.state.routes.length - 1];
  return route;
};
const nest = (...names: string[]) =>
  names.reduceRight<Route[] | undefined>((inner, name) => [{ name, state: inner && { routes: inner } }], undefined)!;

const cases: [string, boolean][] = [];
const check = (label: string, ok: boolean) => cases.push([label, ok]);

const detail = leaf(getStateFromPath('/consultas/42', config));
check('consultas/42 opens ConsultaDetalhe with a number id', detail.name === 'ConsultaDetalhe' && detail.params?.consultaId === 42);
const prescription = leaf(getStateFromPath('/consultas/42/prescricoes/7', config));
check('prescription detail parses both ids', prescription.name === 'PrescricaoDetalhe' && prescription.params?.prescricaoId === 7);
check('consultas/nova is the new-visit form, not a detail', leaf(getStateFromPath('/consultas/nova', config)).name === 'CriarConsulta');
check('query params are parsed', leaf(getStateFromPath('/solicitacoes?focusRequestId=9', config)).params?.focusRequestId === 9);

const newVisit = nest('App', 'CriarConsulta');
newVisit[0].state!.routes[0].params = { preselectedAnimal: { id: 1, nome: 'Rex' } };
check('the preselected animal stays out of the URL', getPathFromState({ routes: newVisit }, config) === '/consultas/nova');
const login = nest('Auth', 'Login');
login[0].state!.routes[0].params = { prefillIdentifier: 'a@b.c' };
check('the prefilled e-mail stays out of the URL', getPathFromState({ routes: login }, config) === '/login');
check('tabs have their own paths', getPathFromState({ routes: nest('App', 'MainTabs', 'Consultas') }, config) === '/consultas');

for (const [label, ok] of cases) console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
if (cases.some(([, ok]) => !ok)) process.exit(1);
