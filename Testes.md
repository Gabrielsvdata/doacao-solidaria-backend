# 📋 Guia de Testes - Doação Solidária

**Versão**: 1.0.0  
**Data**: Abril 2026  
**Ambiente**: Node.js com Express e SQLite  
**Stack**: Express + SQLite3 + Bcryptjs

---

## 📦 Instalação

### Pré-requisitos
- Node.js (versão 16+)
- npm ou yarn
- Postman (para testes de API)

### Passos de Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Instalar dependências específicas (se necessário)
npm install express@5.2.1
npm install sqlite3@6.0.1
npm install sqlite@5.1.1
npm install bcryptjs@3.0.3
npm install --save-dev nodemon@3.1.14

# 3. Iniciar o servidor (desenvolvimento)
npm run dev

# OU

# Iniciar o servidor (produção)
npm start
```

O servidor estará rodando em: `http://localhost:3000`

---

## 🧪 Rotas para Teste

### 🔐 AUTENTICAÇÃO (Usuários)

#### 1. Login
- **Método**: `POST`
- **URL**: `http://localhost:3000/usuarios/login`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "senha": "sua_senha"
}
```

**Resposta Sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Login realizado com sucesso",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "usuario@example.com",
    "instituicao_id": null
  },
  "token": "token_1_1713467890123"
}
```

**Resposta Erro (401):**
```json
{
  "sucesso": false,
  "erro": "Credenciais inválidas"
}
```

**Testes a Realizar:**
- [ ] Login com email e senha válidos
- [ ] Login com email inválido
- [ ] Login com senha incorreta
- [ ] Login sem email
- [ ] Login sem senha
- [ ] Usuário inativo (ativo = 0)

---

### 🎁 DOADOR

#### 1. Listar Categorias
- **Método**: `GET`
- **URL**: `http://localhost:3000/doador/categorias`
- **Content-Type**: `application/json`

**Request Body:** Vazio

**Resposta Sucesso (200):**
```json
{
  "sucesso": true,
  "categorias": [
    {
      "id": 1,
      "nome": "Alimentos",
      "unidade_padrao": "kg"
    },
    {
      "id": 2,
      "nome": "Roupas",
      "unidade_padrao": "peça"
    },
    {
      "id": 3,
      "nome": "Medicamentos",
      "unidade_padrao": "unidade"
    }
  ]
}
```

**Testes a Realizar:**
- [ ] Listar todas as categorias
- [ ] Verificar se contém pelo menos uma categoria
- [ ] Verificar estrutura dos dados retornados

---

#### 2. Recomendação de Instituições
- **Método**: `POST`
- **URL**: `http://localhost:3000/doador/recomendacao`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "categoria_id": 1
}
```

**Resposta Sucesso (200):**
```json
{
  "sucesso": true,
  "categoria": "Alimentos",
  "mensagem": "Encontramos 3 instituição(ões) que precisam de Alimentos",
  "recomendacoes": [
    {
      "instituicao_id": 2,
      "nome": "Casa da Criança",
      "endereco": "Rua A",
      "cidade": "São Paulo",
      "telefone": "11999999999",
      "horario_funcionamento": "08:00 - 18:00",
      "status_estoque": "FALTA",
      "percentual_preenchido": 0,
      "quantidade_atual": 0,
      "capacidade_maxima": 100
    },
    {
      "instituicao_id": 1,
      "nome": "Orfanato Central",
      "endereco": "Rua B",
      "cidade": "São Paulo",
      "telefone": "11888888888",
      "horario_funcionamento": "08:00 - 18:00",
      "status_estoque": "CRÍTICO",
      "percentual_preenchido": 15,
      "quantidade_atual": 15,
      "capacidade_maxima": 100
    },
    {
      "instituicao_id": 3,
      "nome": "Abrigo para Idosos",
      "endereco": "Rua C",
      "cidade": "Rio de Janeiro",
      "telefone": "21777777777",
      "horario_funcionamento": "08:00 - 18:00",
      "status_estoque": "BAIXO",
      "percentual_preenchido": 35,
      "quantidade_atual": 35,
      "capacidade_maxima": 100
    }
  ]
}
```

**Status do Estoque:**
- `FALTA`: 0% - sem estoque
- `CRÍTICO`: 0% < percentual < 20%
- `BAIXO`: 20% ≤ percentual < 50%
- `MÉDIO`: 50% ≤ percentual < 80%
- `BOM`: 80% ≤ percentual ≤ 100%
- `EXCESSO`: > 100%

**Resposta Erro (400):**
```json
{
  "sucesso": false,
  "erro": "categoria_id é obrigatório"
}
```

**Resposta Erro (404):**
```json
{
  "sucesso": false,
  "erro": "Categoria não encontrada"
}
```

**Testes a Realizar:**
- [ ] Recomendação com categoria_id válido
- [ ] Recomendação retorna top 3 instituições
- [ ] Instituições estão ordenadas por percentual (menor primeiro)
- [ ] Recomendação com categoria_id inválido
- [ ] Recomendação sem categoria_id no body
- [ ] Verificar cálculo correto dos percentuais

---

### 🏢 INSTITUIÇÕES

#### 1. Listar Todas as Instituições
- **Método**: `GET`
- **URL**: `http://localhost:3000/instituicoes/`
- **Content-Type**: `application/json`

**Request Body:** Vazio

**Resposta Sucesso (200):**
```json
{
  "sucesso": true,
  "total": 3,
  "instituicoes": [
    {
      "id": 1,
      "nome": "Orfanato Central",
      "endereco": "Rua B",
      "numero": "123",
      "complemento": "Apto 10",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01234-567",
      "telefone": "11988888888",
      "horario_funcionamento": "08:00 - 18:00",
      "localizacao": {
        "latitude": -23.550520,
        "longitude": -46.633309
      }
    },
    {
      "id": 2,
      "nome": "Casa da Criança",
      "endereco": "Rua A",
      "numero": "456",
      "complemento": null,
      "bairro": "Vila Mariana",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "04022-000",
      "telefone": "11999999999",
      "horario_funcionamento": "08:00 - 18:00",
      "localizacao": {
        "latitude": -23.587816,
        "longitude": -46.659409
      }
    }
  ]
}
```

**Testes a Realizar:**
- [ ] Listar todas as instituições ativas
- [ ] Verificar se informações estão corretas
- [ ] Verificar coordenadas de localização (latitude/longitude)
- [ ] Verificar horário padrão é "08:00 - 18:00"

---

#### 2. Detalhes de Uma Instituição
- **Método**: `GET`
- **URL**: `http://localhost:3000/instituicoes/{id}`
- **Exemplo**: `http://localhost:3000/instituicoes/1`
- **Content-Type**: `application/json`

**Request Body:** Vazio

**Resposta Sucesso (200):**
```json
{
  "sucesso": true,
  "instituicao": {
    "id": 1,
    "nome": "Orfanato Central",
    "endereco": "Rua B",
    "numero": "123",
    "complemento": "Apto 10",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234-567",
    "telefone": "11988888888",
    "horario_funcionamento": "08:00 - 18:00",
    "localizacao": {
      "latitude": -23.550520,
      "longitude": -46.633309
    }
  },
  "estoques": [
    {
      "id": 1,
      "categoria_id": 1,
      "categoria": "Alimentos",
      "quantidade_atual": 25,
      "capacidade_maxima": 100,
      "percentual": 25,
      "status": "BAIXO"
    },
    {
      "id": 2,
      "categoria_id": 2,
      "categoria": "Roupas",
      "quantidade_atual": 80,
      "capacidade_maxima": 200,
      "percentual": 40,
      "status": "BAIXO"
    },
    {
      "id": 3,
      "categoria_id": 3,
      "categoria": "Medicamentos",
      "quantidade_atual": 150,
      "capacidade_maxima": 200,
      "percentual": 75,
      "status": "MÉDIO"
    }
  ]
}
```

**Resposta Erro (404):**
```json
{
  "sucesso": false,
  "erro": "Instituição não encontrada"
}
```

**Testes a Realizar:**
- [ ] Buscar instituição com ID válido
- [ ] Verificar informações da instituição
- [ ] Verificar estoques associados
- [ ] Verificar status de cada estoque está correto
- [ ] Buscar instituição com ID inválido
- [ ] Buscar instituição inativa (ativo = 0)

---

## 🔄 Fluxo de Testes Recomendado

### Fase 1: Autenticação
1. Teste Login com credenciais válidas
2. Teste Login com credenciais inválidas

### Fase 2: Exploração de Dados
3. Liste todas as categorias disponíveis (Doador)
4. Liste todas as instituições (Instituições)
5. Busque detalhes de uma instituição específica

### Fase 3: Recomendações
6. Teste recomendação com cada categoria disponível
7. Verifique se as instituições retornadas estão ordenadas corretamente

### Fase 4: Casos de Erro
8. Teste todos os endpoints com dados inválidos
9. Teste todos os endpoints sem dados obrigatórios

---

## 📊 Checklist de Testes

### Autenticação
- [ ] POST /usuarios/login - Sucesso
- [ ] POST /usuarios/login - Email inválido
- [ ] POST /usuarios/login - Senha incorreta
- [ ] POST /usuarios/login - Campo obrigatório ausente

### Doador
- [ ] GET /doador/categorias - Lista completa
- [ ] POST /doador/recomendacao - Com categoria válida
- [ ] POST /doador/recomendacao - Sem categoria_id
- [ ] POST /doador/recomendacao - Categoria inexistente

### Instituições
- [ ] GET /instituicoes/ - Lista completa
- [ ] GET /instituicoes/{id} - Detalhes com ID válido
- [ ] GET /instituicoes/{id} - ID inexistente
- [ ] GET /instituicoes/{id} - Estoques associados

---

## 🚀 Como Usar no Postman

1. **Abrir Postman**
2. **Criar nova requisição** ou usar as URLs acima
3. **Selecionar o método HTTP** (GET ou POST)
4. **Colar a URL** do servidor
5. **Para POST**: Ir à aba "Body" → Selecionar "raw" → Selecionar "JSON"
6. **Colar o JSON do request body**
7. **Clicar em "Send"**
8. **Verificar resposta** e validar conforme esperado

---

## 📝 Notas Importantes

- Todos os timestamps são em **ISO 8601**
- Todas as respostas incluem um campo `sucesso` (true/false)
- Códigos HTTP padrão:
  - `200`: Sucesso
  - `400`: Requisição inválida
  - `401`: Não autorizado
  - `404`: Não encontrado
  - `500`: Erro interno do servidor

---

## 🆘 Troubleshooting

### Servidor não inicia
```bash
# Verifique se a porta 3000 está livre
# Ou use uma porta diferente alterando PORT em server.js
```

### Erro de dependências
```bash
# Limpe o node_modules e reinstale
rm -r node_modules package-lock.json
npm install
```

### Banco de dados vazio
- Verifique se o arquivo de banco de dados existe
- Execute os scripts de inicialização do banco

---

**Versão**: 1.0.0 | **Última atualização**: Abril 2026
