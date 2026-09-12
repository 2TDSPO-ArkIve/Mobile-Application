# ArkIve — Mobile Application Development

## Sprint 3 — FIAP

ArkIve é uma aplicação mobile de **apoio à rotina clínica veterinária**, desenvolvida para auxiliar veterinários no registro, acompanhamento e condução de consultas.

O sistema utiliza Inteligência Artificial como uma ferramenta de **apoio à decisão clínica**. A IA organiza e analisa as informações fornecidas durante a consulta e apresenta sugestões e insights ao profissional, mas a decisão clínica final permanece sempre sob responsabilidade do veterinário.

---

# Problema

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

# Solução

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

A IA não substitui o veterinário. Seu objetivo é fornecer um ponto de partida para a análise clínica, ajudando o profissional a trabalhar com mais agilidade e organização.

---

# Usuário do Aplicativo

Nesta Sprint, o aplicativo mobile é direcionado ao veterinário:



O veterinário pode:

* realizar cadastro;
* autenticar-se;
* consultar pacientes;
* cadastrar pacientes;
* criar consultas;
* editar consultas;
* excluir consultas permitidas;
* iniciar o atendimento;
* registrar a narrativa clínica;
* utilizar transcrição de voz;
* solicitar suporte clínico por IA;
* visualizar os insights produzidos;
* registrar sua própria conclusão;
* finalizar consultas;
* criar, visualizar, editar e excluir prescrições;
* gerar o resumo da consulta em PDF;
* gerenciar suas configurações e sessão.

---

# Tecnologias Utilizadas

## Mobile

* React Native
* Expo SDK 57
* TypeScript
* React Navigation
* TanStack Query
* Expo SecureStore
* Expo Audio
* Expo File System
* Expo Sharing

## Backend

* Java
* Spring Boot
* Spring Security
* Spring Data JPA
* Flyway
* Oracle Database
* Maven

## Serviços

* Render — publicação da API
* Azure Speech — transcrição de áudio para texto

---

# Arquitetura da Aplicação

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

# Navegação

O projeto utiliza exclusivamente **React Navigation**.

A navegação é organizada em três níveis principais.

## Root Navigator

Controla qual fluxo deve ser apresentado:

```text
Usuário não autenticado
        ↓
AuthStack

Usuário autenticado com troca de senha obrigatória
        ↓
MandatoryPasswordChange

Usuário autenticado normalmente
        ↓
AppStack
```

## AuthStack

Contém:

* Login
* Cadastro

## Aplicação autenticada

O menu principal possui três áreas:

* Home
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
* perfil;
* configurações;
* alteração de senha.

A aplicação possui mais de seis telas funcionais e distintas, atendendo ao requisito da Sprint 3.

---

# Integração com API

Todos os dados funcionais utilizados pelo aplicativo são provenientes da API Spring Boot.

URL padrão da API:

```text
https://arkive-b7v2.onrender.com
```




# Aplicação no ar 

```text
https://mobile-application-sooty.vercel.app/
```

---

# TanStack Query

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

# CRUD 1 — Consultas

O módulo de Consultas possui CRUD completo.

| Operação | Implementação                  |
| -------- | ------------------------------ |
| Create   | Criar nova consulta            |
| Read     | Lista e detalhes das consultas |
| Update   | Editar uma consulta agendada   |
| Delete   | Excluir uma consulta permitida |

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

Consultas são atualizadas automaticamente na interface utilizando invalidação de queries do TanStack Query.

---

# CRUD 2 — Prescrições

O módulo de Prescrições também possui CRUD completo.

| Operação | Implementação      |
| -------- | ------------------ |
| Create   | Criar prescrição   |
| Read     | Lista e detalhes   |
| Update   | Editar prescrição  |
| Delete   | Excluir prescrição |

Endpoints principais:

```text
GET    /api/prescricoes
POST   /api/prescricoes
GET    /api/prescricoes/{id}
PUT    /api/prescricoes/{id}
DELETE /api/prescricoes/{id}
```

Todas as operações estão disponíveis pela interface do aplicativo.

---

# Fluxo Clínico ArkIve

O principal fluxo da aplicação acontece dentro de uma Consulta.

## 1. Consulta Agendada

O veterinário cria uma consulta associada a um paciente.

```text
AG
```

Enquanto a consulta estiver agendada, ela pode ser editada ou excluída.

---

## 2. Início da Consulta

O veterinário inicia o atendimento.

```text
AG → EP
```

Nesse momento começa o registro clínico.

---

## 3. Narrativa Clínica

O veterinário descreve o caso do animal.

A narrativa pode ser:

* digitada;
* registrada por voz.

Quando utilizado áudio, o aplicativo envia a gravação para:

```text
POST /api/transcricoes
```

O backend realiza a transcrição utilizando Azure Speech.

---

## 4. Suporte Clínico por IA

Após registrar o caso, o veterinário pode solicitar uma análise do ArkIve.

```text
EP → AP
```

O backend processa as informações e retorna suporte clínico contendo informações que auxiliam o veterinário na análise do caso.

A IA funciona exclusivamente como ferramenta de apoio.

---

## 5. Conclusão Veterinária

Depois de analisar o caso e os insights apresentados, o veterinário registra sua própria conclusão.

A decisão final continua pertencendo ao profissional.

```text
AP → FI
```

---

## 6. Prescrições

Após a finalização da consulta, o veterinário pode gerenciar prescrições relacionadas ao atendimento.

As prescrições possuem CRUD completo integrado ao backend.

---

# Transcrição por Voz

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

A funcionalidade reduz a necessidade de digitação durante o atendimento.

---

# Resumo da Consulta em PDF

O aplicativo permite obter um resumo da consulta em PDF através do backend.

Endpoint:

```text
GET /api/consultas/{id}/resumo-pdf
```

O arquivo pode ser aberto ou compartilhado pelo dispositivo.

---

# Autenticação

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

# Cadastro de Veterinário

O aplicativo possui cadastro real de veterinários.

Endpoint:

```text
POST /api/auth/register
```

Campos:

* Nome
* CRMV
* E-mail

O perfil não é escolhido pelo usuário.

O backend define obrigatoriamente:

```text
VETERINARIO
```

Isso impede que alguém utilize o cadastro público para criar contas administrativas.

---

# Primeiro Acesso

Após o cadastro:

```text
Login = e-mail cadastrado
Senha temporária = e-mail cadastrado
```

A senha temporária é armazenada no banco exclusivamente como hash BCrypt.

O backend marca o usuário com troca de senha obrigatória.

Fluxo:

```text
Cadastro
   ↓
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

# Proteção de Rotas

As telas internas não ficam registradas no mesmo fluxo de navegação das telas públicas.

O `RootNavigator` decide qual stack deve existir de acordo com o estado de autenticação.

Assim:

```text
Não autenticado
→ Login / Cadastro

Autenticado
→ Aplicação

Troca obrigatória
→ Alteração de senha
```

Isso impede acesso às telas internas simplesmente navegando diretamente para uma rota privada.

---

# Logout

Ao realizar logout, o aplicativo:

1. remove as credenciais persistidas;
2. limpa o cache do TanStack Query;
3. altera o estado de autenticação;
4. desmonta o navegador autenticado;
5. retorna ao Login.

Por isso, não é possível utilizar o botão “voltar” para retornar a uma tela protegida após encerrar a sessão.

---

# Tratamento de Estados

As funcionalidades integradas à API possuem tratamento para:

* Loading
* Erro
* Empty State
* Mutation em andamento
* Retry quando aplicável

Botões de envio são bloqueados durante operações pendentes, evitando requisições duplicadas.

---

# Como Executar

## Pré-requisitos

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

---


# Validação do Projeto

## Mobile

Validação TypeScript:

```bash
npx tsc --noEmit
```

Resultado da versão entregue:

```text
0 erros
```


---



# Vídeo de Apresentação

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

# Integrantes

```text
Gustavo Crevelari Monteiro Porto — RM561408
Lucca de Araujo Gomes — RM561996
Rafaela Ferreira Santos — RM561671
Victor Sabelli Rocha Batista — RM566224
```
