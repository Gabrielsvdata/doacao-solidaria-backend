# 🤝 Doação Solidária - Sistema de Recomendação de Doações

> Um sistema inteligente para conectar doadores com instituições que precisam, em cenários de crise humanitária

---

## 📌 1. Apresentação da Ideia

Este projeto foi desenvolvido a partir do desafio sobre **enchentes e situações de emergência no Brasil**. Ao analisar o cenário crítico, identifiquei uma dificuldade central: **a desorganização na distribuição de doações durante crises humanitárias**.

### Contexto do Problema
Quando enchentes ou desastres naturais ocorrem, as pessoas desejam ajudar, mas não sabem:
- **Para onde enviar doações**
- **Qual instituição realmente precisa de quê**
- **Como alcançar eficiência na distribuição**

Simultaneamente, **instituições de caridade recebem doações desorganizadas**, sem informações sobre o que foi recebido, quantidades insuficientes para algumas necessidades e excesso em outras.

Isso motivou a criação de uma **solução tecnológica que conecta esses dois mundos de forma inteligente**.

---

## ⚠️ 2. Problema Escolhido

### Qual é a dificuldade enfrentada?
**Falta de comunicação e transparência na distribuição de doações durante crises**

- Doadores não sabem qual instituição precisa de quê
- Instituições recebem doações desorganizadas e ineficientes
- Há desperdício de recursos: excesso em alguns itens, falta crítica em outros
- Não há visibilidade sobre o estado do estoque das instituições

### Quem são as pessoas impactadas?
1. **Doadores**: Pessoas dispostas a ajudar mas desorientadas
2. **Instituições de Caridade**: Abrigos, asilos, creches, distribuição de alimentos
3. **Pessoas em situação de risco**: Vítimas de enchentes e catástrofes
4. **Gerentes de Organizações**: Que precisam coordenar estoques e recursos

### Por que esse problema é relevante?
- **Urgência**: Em situações de emergência, a eficiência é questão de vida ou morte
- **Impacto Social**: Milhares de pessoas afetadas em cada desastre
- **Escala**: Pode ser replicado em qualquer cidade/estado brasileira
- **Tecnologia ao Serviço da Sociedade**: Usar ferramentas digitais para o bem comum

---

## 💡 3. Solução Proposta

### Como o sistema funciona (visão geral)

```
┌─────────────┐                    ┌────────────────┐
│   DOADOR    │                    │  INSTITUIÇÃO   │
│             │                    │   (Admin)      │
└────────┬────┘                    └────────┬───────┘
         │                                  │
         │ 1. Acessa recomendações         │ 1. Registra estoque
         │                                  │
         └──────────────────┬───────────────┘
                            │
                    ┌───────▼────────┐
                    │   SISTEMA DE   │
                    │  RECOMENDAÇÃO  │
                    │  (Backend)     │
                    └────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    📊 Analisa      📈 Calcula      🎯 Retorna
    Estoques       Prioridade      Ranked List
```

### Como ajuda a resolver o problema

1. **Para Doadores**:
   - Visualiza instituições que precisam de doações
   - Vê o nível crítico do estoque (CRÍTICO, BAIXO, BOM, EXCESSO)
   - Toma decisão informada sobre o que e para quem doar

2. **Para Instituições**:
   - Registra e monitora estoques em tempo real
   - Recebe doações organizadas de acordo com necessidade
   - Reduz excesso e falta simultânea de itens

3. **Para a Sociedade**:
   - Otimiza distribuição de recursos em crises
   - Acelera resposta humanitária
   - Reduz desperdício

### Principal diferencial da proposta

**🎯 Recomendação Inteligente por Prioridade**

O sistema não mostra apenas "instituições X" e "produtos Y". Ele **calcula um score de prioridade** baseado em:

```javascript
PRIORIDADE = Nível de Falta + Categoria + Proximidade

Nível de Falta:
  🚨 FALTA (0%)           → Prioridade 0 (crítica)
  ⚠️  CRÍTICO (1-20%)     → Prioridade 2 (muito alta)
  ⚠️  BAIXO (21-50%)      → Prioridade 2 (muito alta)
  ℹ️  MÉDIO (51-80%)      → Prioridade 1 (média)
  ✅ BOM (81-100%)        → Prioridade 0 (baixa)
  📦 EXCESSO (>100%)      → Prioridade -1 (ignore)
```

**Resultado**: Doadores veem primeiro as instituições que **REALMENTE PRECISAM**, maximizando impacto.

---

## 🏗️ 4. Estrutura do Sistema

### 🎨 Front-end (React + Vite)

**Localização**: `doacao-solidaria-frontend/`

**O que o usuário pode fazer:**

#### 👤 Página Doador (`/doador`)
- ✅ Seleciona categoria de doação (Alimentos, Vestuário, Higiene, etc)
- ✅ Visualiza recomendações de instituições ordenadas por prioridade
- ✅ Vê o status do estoque com cores visuais
  - 🔴 Crítico/Vazio
  - 🟠 Baixo
  - 🟡 Médio
  - 🟢 Bom
  - 🟣 Excesso
- ✅ Clica em "Ver Detalhes" para mais informações
- ✅ Acessa página completa da instituição (`/instituicao/:id`)
  - Informações de contato (endereço, telefone, horário)
  - Status completo do estoque
  - Recomendação personalizada de doação

#### 🏢 Página Instituição (Detalhes)
- 📍 Localização e contato
- 📞 Telefone e horário de funcionamento
- 📊 Gráfico de estoque
- 💬 Mensagens contextualizadas
- 🎁 Botão "Fazer Doação" (prototipado)

#### 🔐 Página Admin (`/admin`)
- Login seguro com email/senha
- Dashboard com estatísticas
- Gerenciamento de estoques
- Registro de doações recebidas
- Gerenciamento de instituições
- Histórico de movimentações

---

### ⚙️ Back-end (Node.js + Express)

**Localização**: `doacao-solidaria/src/`

**Como as informações são processadas:**

#### 🔀 Fluxo de Dados Principal

```
Doador acessa /doador/recomendacao
         │
         ▼
├─ 1. Buscar todas as instituições da categoria
│
├─ 2. Para cada instituição, calcular percentual
│      percentual = (quantidade_atual / capacidade_maxima) * 100
│
├─ 3. Chamar obterStatus(percentual) → retorna status + prioridade
│      (da tabela de regras em rules.js)
│
├─ 4. Filtrar por prioridade >= 2 (CRÍTICO, BAIXO)
│
├─ 5. Ordenar por:
│      a) Prioridade DESC (maior primeiro)
│      b) Percentual ASC (menor = mais crítico)
│
├─ 6. Limitar a TOP 3 recomendações
│
└─ Retornar com:
   - Nome, endereço, telefone
   - Percentual e capacidade
   - Status visual (cor + label)
   - Mensagem motivacional
```

#### 📦 Rotas Implementadas

**Doador (Sem Autenticação)**
```javascript
GET  /doador/categorias
     → Retorna todas as categorias: ['Alimentos', 'Vestuário', ...]

POST /doador/recomendacao
     Body: { categoria_id: 1 }
     → Retorna 3 instituições prioritárias
```

**Instituições (Público)**
```javascript
GET  /instituicoes/:id
     → Retorna detalhes: nome, endereço, telefone, estoque atual
```

**Admin (Com Autenticação)**
```javascript
POST   /admin/login
       → Autentica admin e retorna token JWT

GET    /admin/estoque
       → Lista todos os estoques com status

PUT    /admin/estoque/:id
       → Atualiza quantidade de um item

POST   /admin/distribuicoes
       → Registra saída de doações (transferência entre instituições)

GET    /admin/analise
       → Dashboard com estatísticas gerais
```

#### 🔐 Sistema de Autenticação
- Email + Senha (bcrypt)
- JWT Token gerado no login
- Renovação automática de token
- Middleware de autenticação em rotas protegidas

#### 📊 Processamento de Dados

**módulo `rules.js`** - "Coração" do sistema

```javascript
obterStatus(percentual) → 
  retorna {
    status: 'CRÍTICO',           // Label visual
    prioridade: 2,               // Score para ordenação
    severidade: 'alta',          // Tipo de urgência
    mensagem: '⚠️ Nível crítico' // Texto amigável
  }

validacoes → Zod schemas para validação de entrada
mensagens  → Respostas padronizadas (sucesso/erro)
```

---

### 💾 Banco de Dados (SQLite)

**Localização**: `doacao-solidaria/database.db`

**Tabelas Principais:**

```sql
-- Categorias de doação
categorias (id, nome, descricao)

-- Instituições de caridade
instituicoes (
  id, 
  nome, 
  endereco, 
  cidade, 
  telefone, 
  horario, 
  data_criacao
)

-- Estoques (quantidade de itens por instituição/categoria)
estoques (
  id,
  instituicao_id,      ← FK para instituições
  categoria_id,        ← FK para categorias
  quantidade_atual,
  capacidade_maxima,
  data_atualizacao
)

-- Histórico de movimentações
movimentacoes (
  id,
  estoque_id,
  tipo,                ← 'entrada' | 'saída'
  quantidade,
  motivo,              ← 'doação' | 'transferência' | 'consumo'
  data_movimento
)

-- Usuários administradores
usuarios (
  id,
  email,
  senha_hash,
  instituicao_id,      ← Admin de qual instituição
  data_criacao
)
```

**Dados Armazenados e Importância:**

| Tabela | Dados | Por quê |
|--------|-------|--------|
| **estoques** | Quantidade + Capacidade | Calcular percentual e status em tempo real |
| **categorias** | Nome do item (Alimento, Vestuário) | Filtrar recomendações por necessidade |
| **instituicoes** | Localização, contato | Mostrar ao doador onde entregar |
| **movimentacoes** | Histórico de entrada/saída | Auditoria e relatórios |
| **usuarios** | Credenciais admin | Segurança e gerenciamento |

---

## 🚀 Como Usar o Sistema

### Instalação

**Backend**
```bash
cd doacao-solidaria
npm install
npm start           # http://localhost:5000
```

**Frontend**
```bash
cd doacao-solidaria-frontend
npm install
npm run dev         # http://localhost:5173
```

### Exemplo de Uso

1. **Como Doador**
   - Acessa http://localhost:5173/doador
   - Seleciona "Alimentos"
   - Vê: "Abrigo Esperança - CRÍTICO - 12% estoque"
   - Clica "Ver Detalhes" → vê que só faltam 120 de 1000 itens
   - Decide fazer doação

2. **Como Admin**
   - Login em /admin
   - Registra 500kg de alimentos recebidos
   - Sistema atualiza: estoque agora 620/1000 (62%)
   - Status muda para MÉDIO
   - Próximo doador verá como menos prioritário ✅

---

## 🎯 Tecnologias Utilizadas

### Backend ✅
- **Node.js 18** - Runtime JavaScript ✅ (engines: 18.x)
- **Express 5.2.1** - Framework web ✅ 
- **SQLite3 6.0.1** - Banco de dados leve e confiável ✅
- **bcryptjs 3.0.3** - Hash de senhas ✅
- **Cors 2.8.6** - Segurança em requisições ✅
- **Swagger-UI Express 5.0.1** - Documentação interativa ✅
- **Swagger-JSDoc 6.2.8** - Geração de documentação ✅


### Frontend ✅
- **React 19.0.0** - UI library ✅
- **Vite 6.0.0** - Build tool rápido ✅
- **Axios 1.7.0** - Cliente HTTP ✅
- **React Router DOM 7.1.0** - Navegação ✅
- **SASS 1.77.0** - Estilização avançada ✅
- **Recharts 3.8.1** - Gráficos de dados ✅

### DevTools ✅
- **Nodemon 3.1.14** - Hot reload backend ✅
- **Swagger/OpenAPI** - Documentação interativa ✅
- **@vitejs/plugin-react 4.3.0** - Plugin React para Vite ✅

---

## 📈 Fluxo de Interação Completo

```
FASE 1: DADOS INICIAIS
└─ Admin registra instituições
   └─ Admin define capacidade máxima por categoria
      └─ Sistema pronto

FASE 2: DOADOR BUSCA
└─ Doador acessa /doador
   └─ Seleciona categoria
      └─ Backend calcula scores
         └─ Retorna TOP 3 prioritários
            └─ Doador visualiza cards

FASE 3: DETALHES
└─ Doador clica "Ver Detalhes"
   └─ Acessa página de instituição
      └─ Vê contato completo
         └─ Lê recomendação personalizada
            └─ Decide se vai doar

FASE 4: PÓS-DOAÇÃO (Admin registra)
└─ Admin faz login
   └─ Acessa /admin/estoque
      └─ Clica "Atualizar Estoque"
         └─ Registra +500 kg de alimentos
            └─ Sistema atualiza percentual
               └─ Status muda
                  └─ Próximas recomendações se adaptam
```

---

## 💪 Diferenciais Técnicos

✅ **Cálculo inteligente de prioridade** - Não é lista aleatória  
✅ **Atualização em tempo real** - Dados sempre frescos  
✅ **Autenticação segura** - JWT + bcrypt  
✅ **Validação rigorosa** - Zod schemas  
✅ **Documentação Swagger** - API completamente documentada  
✅ **Responsivo** - Funciona em desktop e mobile  
✅ **Modular** - Fácil de manter e expandir  

---

## 📚 Aprendizados Principais

Este projeto demonstra:

1. **Pensamento Crítico** ✓
   - Identificamos o real problema (desorganização)
   - Não focamos em sintomas

2. **Análise de Problemas** ✓
   - Mapeamos personas: doadores, instituições, sociedade
   - Entendemos motivações de cada grupo

3. **Organização de Informações** ✓
   - Estrutura clara de banco de dados
   - Fluxos bem definidos

4. **Solução com Tecnologia** ✓
   - Usamos tecnologia como ferramenta
   - Não reinventamos a roda
   - Escalável e sustentável

---

## 🎓 Conceitos Implementados

| Conceito | Implementado | Onde |
|----------|--------------|------|
| RESTful API | ✅ | Backend routes |
| Autenticação JWT | ✅ | /admin/login |
| Banco de dados relacional | ✅ | SQLite |
| Validação de entrada | ✅ | Zod schemas |
| Frontend reativo | ✅ | React hooks |
| Roteamento | ✅ | React Router |
| CORS | ✅ | Express middleware |
| Hash de senha | ✅ | bcryptjs |

---

## 🔮 Melhorias Futuras

- [ ] Notificações push quando instituição fica crítica
- [ ] Integração com WhatsApp para doadores
- [ ] Sistema de gamificação (pontos, badges)
- [ ] Mobile app native (React Native)
- [ ] Machine Learning para previsão de demanda
- [ ] Integração com pagamento online
- [ ] Rastreamento de doação pós-entrega

---

## 📞 Suporte & Documentação

- **Swagger API**: http://localhost:5000/api-docs
- **Backend**: Arquivos em `src/routes/` e `src/modules/`
- **Frontend**: Componentes em `src/components/` e `src/pages/`
- **Database**: Schema em `src/database/database.js`

---

**Desenvolvido com ❤️ para resolver problemas reais através de tecnologia**

**Data**: 22 de Abril de 2026  
**Status**: 🟢 Funcional e Escalável  
**Versão**: 1.0.0

