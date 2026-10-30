# ArkIve — Mobile Application

ArkIve é uma aplicação mobile de **apoio à rotina clínica veterinária**, desenvolvida para auxiliar veterinários no registro, acompanhamento e condução de consultas.

O aplicativo atende dois perfis: o **veterinário**, que conduz as consultas, e o **responsável** (tutor), que acompanha seus animais.

O sistema utiliza Inteligência Artificial como uma ferramenta de **apoio à decisão clínica**. A IA organiza e analisa as informações fornecidas durante a consulta e apresenta sugestões e insights ao profissional, mas a decisão clínica final permanece sempre sob responsabilidade do veterinário.

---

## Problema

Durante uma consulta veterinária, o profissional precisa lidar simultaneamente com diversas informações:

* histórico do animal;
* sintomas relatados;
* observações clínicas;
* informações do paciente;
* evolução da consulta;
* possíveis hipóteses;
* prescrições;
* registros posteriores.

Esse processo pode consumir tempo e tornar o atendimento mais lento.

O ArkIve foi desenvolvido para centralizar essas informações e apoiar o veterinário durante o atendimento, permitindo que ele tenha uma visão organizada da consulta e utilize Inteligência Artificial como suporte para análise do caso.

---

## Solução

O aplicativo oferece um fluxo clínico que acompanha a consulta desde o agendamento até sua conclusão.

O fluxo principal segue os seguintes estados:

```text
AG → EP → AP → FI
```

Onde:

* **AG — Agendada:** consulta criada e ainda não iniciada;
* **EP — Em Progresso:** veterinário registra a narrativa clínica do caso;
* **AP — Aguardando Parecer:** o ArkIve processa o caso e fornece suporte clínico por Inteligência Artificial;
* **FI — Finalizada:** o veterinário registra sua própria conclusão e encerra o atendimento.

Uma consulta agendada também pode ser cancelada (**CA — Cancelada**), com registro do motivo.

A IA não substitui o veterinário. Seu objetivo é fornecer um ponto de partida para a análise clínica, ajudando o profissional a trabalhar com mais agilidade e organização.

---

## Perfis de Usuário

### Veterinário

O veterinário pode:

* realizar cadastro;
* autenticar-se;
* consultar pacientes;
* cadastrar e editar pacientes;
* buscar pacientes pelo ID ArkIve;
* solicitar acesso a pacientes e acompanhar suas solicitações;
* compartilhar pacientes por link, QR Code ou código de convite;
* consultar o histórico clínico, os relatos e os valores dos atendimentos de cada paciente;
* criar consultas;
* editar, cancelar e excluir consultas agendadas;
* iniciar o atendimento;
* registrar a narrativa clínica;
* utilizar transcrição de voz;
* solicitar suporte clínico por IA;
* visualizar os insights produzidos;
* registrar sua própria conclusão;
* finalizar consultas;
* criar, visualizar, editar e excluir prescrições;
* gerar o resumo da consulta e o histórico do paciente em PDF;
* acompanhar o resumo financeiro dos atendimentos e o consumo de IA;
* receber notificações;
* gerenciar seu perfil, configurações e sessão.

### Responsável

O responsável pode:

* realizar cadastro;
* autenticar-se;
* cadastrar e editar seus animais;
* acompanhar as consultas agendadas, em andamento e finalizadas dos seus animais;
* consultar o histórico clínico e os valores dos atendimentos;
* registrar relatos e observações sobre seus animais;
* compartilhar animais com veterinários ou outros responsáveis;
* aceitar convites de compartilhamento por link, QR Code ou código;
* aprovar ou rejeitar solicitações de acesso feitas por veterinários;
* buscar animais pelo ID ArkIve;
* receber notificações;
* gerenciar sua conta, configurações e sessão.

As telas clínicas (consultas, análise ArkIve, conclusão e prescrições) existem apenas na aplicação do veterinário.

---

## Tecnologias Utilizadas

### Mobile

* React Native
* Expo SDK 57
* TypeScript
* React Navigation
* TanStack Query
* Expo SecureStore
* Expo Audio
* Expo Camera
* Expo Notifications
* Expo File System
* Expo Sharing

### Backend

* Java
* Spring Boot
* Spring Security
* Spring Data JPA
* Flyway
* Oracle Database
* Maven

### Serviços

* Render — publicação da API
* Vercel — publicação da versão web do aplicativo
* Azure Speech — transcrição de áudio para texto

---

## Arquitetura da Aplicação

A aplicação foi organizada separando interface, lógica de aplicação e comunicação HTTP.

```text
Screen
   ↓
Custom Hook
   ↓
TanStack Query
   ↓
Service
   ↓
API Client
   ↓
Spring Boot API
   ↓
Oracle Database
```

As telas não executam requisições HTTP diretamente.

As operações de consulta e mutação são centralizadas em hooks e serviços reutilizáveis.

Estrutura principal:

```text
src/
├── components/
├── config/
├── context/
├── hooks/
├── i18n/
├── interfaces/
├── navigation/
├── query/
├── screens/
├── services/
├── storage/
├── styles/
├── types/
└── utils/
```

---

## Navegação

O projeto utiliza exclusivamente **React Navigation**.

A navegação é organizada em três níveis principais.

### Root Navigator

Controla qual fluxo deve ser apresentado:

```text
Usuário não autenticado
        ↓
AuthStack

Usuário autenticado com troca de senha obrigatória
        ↓
MandatoryPasswordChange

Veterinário autenticado
        ↓
AppStack

Responsável autenticado
        ↓
ResponsavelAppStack
```

Se existir uma sessão salva, mas a API não puder ser alcançada para validá-la, o aplicativo exibe a tela de servidor indisponível em vez de voltar ao Login.

### AuthStack

Contém:

* Login
* Cadastro (veterinário ou responsável)

### Aplicação do Veterinário

O menu principal possui três áreas:

* Início
* Consultas
* Pacientes

Além dessas áreas, o aplicativo possui fluxos específicos para:

* detalhes de consulta;
* criação de consulta;
* edição de consulta;
* análise ArkIve;
* insight clínico;
* conclusão veterinária;
* prescrições;
* cadastro e edição de pacientes;
* histórico clínico, relatos e valores do paciente;
* compartilhamento de pacientes e convites;
* busca por ID ArkIve e solicitações de acesso;
* resumo financeiro e uso da IA;
* notificações;
* perfil;
* configurações;
* alteração de senha.

### Aplicação do Responsável

O menu principal possui quatro áreas:

* Meus Animais
* Consultas
* Buscar
* Solicitações

A área **Minha Conta** reúne configurações, alteração de senha e informações sobre o aplicativo.

Em telas largas (web e tablets), a barra de abas inferior é substituída por um menu lateral.

Na versão web, as telas possuem URLs próprias, permitindo usar o botão “voltar” do navegador e recarregar a página sem perder a tela aberta.

---

## Integração com API

Todos os dados funcionais utilizados pelo aplicativo são provenientes da API Spring Boot.

URL padrão da API:

```text
https://arkive-b7v2.onrender.com
```

A URL pode ser substituída pela variável de ambiente `EXPO_PUBLIC_API_URL`, por exemplo para apontar para uma API executada localmente.

Como a API está hospedada no Render, a primeira requisição pode demorar enquanto o servidor inicia. O aplicativo informa essa situação ao usuário.

---

## Aplicação Web

```text
https://mobile-application-sooty.vercel.app/
```

---

## TanStack Query

O projeto utiliza TanStack Query para:

* carregamento dos dados;
* gerenciamento de cache;
* mutations;
* estados de loading;
* tratamento de erros;
* atualização automática após alterações.

Após operações de Create, Update ou Delete, as queries relacionadas são invalidadas e recarregadas automaticamente.

Isso permite que as alterações apareçam na interface sem necessidade de reiniciar o aplicativo.

---

## CRUD 1 — Consultas

O módulo de Consultas possui CRUD completo.

| Operação | Implementação                  |
| -------- | ------------------------------ |
| Create   | Criar nova consulta            |
| Read     | Lista e detalhes das consultas |
| Update   | Editar uma consulta agendada   |
| Delete   | Excluir uma consulta agendada  |

Fluxo simplificado:

```text
Consultas
    ↓
Criar Consulta
    ↓
POST /api/consultas
```

```text
ConsultaDetalhe
    ↓
Editar Consulta
    ↓
PUT /api/consultas/{id}
```

```text
ConsultaDetalhe
    ↓
Excluir
    ↓
DELETE /api/consultas/{id}
```

Uma consulta agendada também pode ser cancelada com o registro do motivo:

```text
POST /api/consultas/{id}/cancelar
```

Consultas são atualizadas automaticamente na interface utilizando invalidação de queries do TanStack Query.

---

## CRUD 2 — Prescrições

O módulo de Prescrições também possui CRUD completo.

| Operação | Implementação      |
| -------- | ------------------ |
| Create   | Criar prescrição   |
| Read     | Lista e detalhes   |
| Update   | Editar prescrição  |
| Delete   | Excluir prescrição |

Endpoints principais:

```text
GET    /api/prescricoes?consultaId={id}
POST   /api/prescricoes
GET    /api/prescricoes/{id}
PUT    /api/prescricoes/{id}
DELETE /api/prescricoes/{id}
```

Todas as operações estão disponíveis pela interface do aplicativo.

---

## Fluxo Clínico ArkIve

O principal fluxo da aplicação acontece dentro de uma Consulta.

### 1. Consulta Agendada

O veterinário cria uma consulta associada a um paciente.

```text
AG
```

Enquanto a consulta estiver agendada, ela pode ser editada, cancelada ou excluída.

### 2. Início da Consulta

O veterinário inicia o atendimento.

```text
AG → EP
```

Nesse momento começa o registro clínico.

### 3. Narrativa Clínica

O veterinário descreve o caso do animal.

A narrativa pode ser:

* digitada;
* registrada por voz.

Quando utilizado áudio, o aplicativo envia a gravação para:

```text
POST /api/transcricoes
```

O backend realiza a transcrição utilizando Azure Speech.

### 4. Suporte Clínico por IA

Após registrar o caso, o veterinário pode solicitar uma análise do ArkIve.

```text
EP → AP
```

O backend processa as informações e retorna suporte clínico contendo informações que auxiliam o veterinário na análise do caso.

A IA funciona exclusivamente como ferramenta de apoio.

### 5. Conclusão Veterinária

Depois de analisar o caso e os insights apresentados, o veterinário registra sua própria conclusão.

A decisão final continua pertencendo ao profissional.

```text
AP → FI
```

### 6. Prescrições

Após a finalização da consulta, o veterinário pode gerenciar prescrições relacionadas ao atendimento.

As prescrições possuem CRUD completo integrado ao backend.

---

## Pacientes e Compartilhamento

### ID ArkIve

Cada paciente possui um identificador permanente no formato `ARK-PET-...`. O ID permite localizar o paciente, mas não concede acesso a ele por si só.

### Compartilhamento

Veterinários e responsáveis podem compartilhar um paciente com outro veterinário ou com um responsável. O convite pode ser enviado por link, QR Code ou código, e expira após um período.

Ao aceitar o convite, o paciente passa a aparecer na conta de quem o recebeu, com o histórico de consultas e prescrições.

### Solicitação de Acesso

Um veterinário pode solicitar acesso a um paciente a partir do seu ID ArkIve. A solicitação é aprovada ou rejeitada pelo responsável do animal.

```text
GET  /api/solicitacoes-acesso
POST /api/solicitacoes-acesso
POST /api/solicitacoes-acesso/{id}/aprovar
POST /api/solicitacoes-acesso/{id}/rejeitar
```

### Histórico, Relatos e Valores

Para cada paciente, o aplicativo apresenta:

* histórico clínico das consultas;
* relatos e observações registrados pelos responsáveis;
* valores das consultas e medicamentos.

---

## Transcrição por Voz

Durante o registro clínico, o veterinário pode narrar o caso utilizando o microfone.

Fluxo:

```text
Gravação
   ↓
Arquivo de áudio
   ↓
POST /api/transcricoes
   ↓
Azure Speech
   ↓
Texto transcrito
   ↓
Narrativa clínica
```

O idioma da transcrição acompanha o idioma configurado no aplicativo.

A funcionalidade reduz a necessidade de digitação durante o atendimento.

---

## Documentos em PDF

O aplicativo permite obter documentos em PDF gerados pelo backend.

Endpoints:

```text
GET /api/consultas/{id}/resumo-pdf
GET /api/animais/{id}/historico-pdf
```

* **Resumo da consulta:** dados do atendimento, conclusão e prescrições;
* **Histórico do paciente:** consultas registradas para o animal.

Os arquivos podem ser abertos ou compartilhados pelo dispositivo.

---

## Notificações

O aplicativo exibe uma lista de notificações com contagem de itens não lidos.

Quando habilitado nas configurações, o dispositivo é registrado para receber notificações push:

```text
POST /api/notificacoes/dispositivos
```

---

## Autenticação

A autenticação utiliza Spring Security com HTTP Basic.

O aplicativo armazena as credenciais de forma persistente utilizando:

* `expo-secure-store` em dispositivos móveis;
* `localStorage` na versão web.

Em cada restauração de sessão, o aplicativo valida novamente as credenciais através de:

```text
GET /api/auth/me
```

Enquanto essa validação ocorre, a navegação permanece no estado de inicialização.

---

## Cadastro

O aplicativo possui cadastro real para os dois perfis. Na tela de Cadastro, o usuário escolhe se é veterinário ou responsável.

### Veterinário

Endpoint:

```text
POST /api/auth/register
```

Campos:

* Nome
* CRMV
* E-mail
* Senha e confirmação

### Responsável

Endpoint:

```text
POST /api/auth/register/responsavel
```

Campos:

* Nome
* Tipo de documento (CPF ou RG)
* Documento
* E-mail
* Telefone (opcional)
* Senha e confirmação

O perfil não é enviado pelo aplicativo. Cada endpoint define obrigatoriamente o seu:

```text
VETERINARIO
RESPONSAVEL
```

Isso impede que alguém utilize o cadastro público para criar contas administrativas.

As senhas são armazenadas no banco exclusivamente como hash BCrypt.

---

## Troca Obrigatória de Senha

Contas criadas pelo cadastro público já definem a própria senha e entram diretamente no aplicativo.

Contas de veterinário criadas por um administrador recebem uma senha temporária e são marcadas com troca de senha obrigatória.

Fluxo:

```text
Login
   ↓
trocaSenhaObrigatoria = true
   ↓
MandatoryPasswordChange
   ↓
Nova senha
   ↓
Aplicativo
```

Após a alteração, a senha temporária deixa de funcionar.

---

## Proteção de Rotas

As telas internas não ficam registradas no mesmo fluxo de navegação das telas públicas.

O `RootNavigator` decide qual stack deve existir de acordo com o estado de autenticação e o perfil do usuário.

Assim:

```text
Não autenticado
→ Login / Cadastro

Troca obrigatória
→ Alteração de senha

Veterinário autenticado
→ Aplicação do veterinário

Responsável autenticado
→ Aplicação do responsável
```

Isso impede acesso às telas internas simplesmente navegando diretamente para uma rota privada.

As telas clínicas não são registradas na stack do responsável, portanto não podem ser acessadas por esse perfil por nenhum link ou navegação.

---

## Logout

Ao realizar logout, o aplicativo:

1. remove as credenciais persistidas;
2. limpa o cache do TanStack Query;
3. altera o estado de autenticação;
4. desmonta o navegador autenticado;
5. retorna ao Login.

Por isso, não é possível utilizar o botão “voltar” para retornar a uma tela protegida após encerrar a sessão.

---

## Tratamento de Estados

As funcionalidades integradas à API possuem tratamento para:

* Loading
* Erro
* Empty State
* Mutation em andamento
* Retry quando aplicável

Botões de envio são bloqueados durante operações pendentes, evitando requisições duplicadas.

---

## Configurações

O usuário pode configurar:

* tema: sistema, claro ou escuro;
* idioma: português (pt-BR) ou inglês (en-US), aplicado à interface e à transcrição por voz;
* notificações push neste dispositivo.

A tela **Sobre nós** apresenta a equipe do ArkIve.

---

## Como Executar

### Pré-requisitos

* Node.js
* npm
* Expo Go ou emulador Android/iOS

Clone o repositório e acesse sua raiz.

Instale as dependências:

```bash
npm install
```

Inicie o Expo:

```bash
npx expo start
```

Também podem ser utilizados:

```bash
npm run android
```

```bash
npm run ios
```

```bash
npm run web
```

### Variáveis de Ambiente (opcionais)

| Variável                     | Uso                                                            |
| ---------------------------- | -------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`        | URL da API (padrão: Render)                                    |
| `EXPO_PUBLIC_SHARE_BASE_URL` | Endereço usado nos links de compartilhamento (padrão: Vercel) |

---

## Validação do Projeto

Validação TypeScript:

```bash
npx tsc --noEmit
```

Verificação de contraste (WCAG) das cores do tema:

```bash
npm run contrast
```

Verificação do mapa de URLs da versão web:

```bash
npm run linking
```

---

## Demonstração do Aplicativo

Link:

```text
https://youtu.be/_NwnBUfvCpo
```

O vídeo demonstra:

* Cadastro
* Login
* Troca obrigatória da senha
* Navegação
* Consultas
* Fluxo clínico ArkIve
* Suporte por Inteligência Artificial
* Logout
* Proteção das rotas

---

## Integrantes

```text
Gustavo Crevelari Monteiro Porto — RM561408
Lucca de Araujo Gomes — RM561996
Rafaela Ferreira Santos — RM561671
Victor Sabelli Rocha Batista — RM566224
```
