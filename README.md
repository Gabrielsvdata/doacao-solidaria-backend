# 🎯 Doação Solidária - MVP

Sistema simplificado para conectar doadores com instituições que mais precisam.

## 🎯 O Problema

Doadores querem ajudar mas não sabem para onde mandar doações. Instituições têm estoques desorganizados e precisam de gestão simples.

## ✅ A Solução MVP

1. **Morador**: Informa CEP + tipo de item → Recebe recomendação de onde doar
2. **Admin**: Login + gerenciamento simples de estoque

---

## 🚀 Como Usar

### 1️⃣ Instalar dependências

```bash
npm install
```

### 2️⃣ Iniciar servidor

```bash
npm run dev
```

Servidor roda em: `http://localhost:3000`

---

## 📡 Endpoints

### 1. Listar Instituições

```http
GET /instituicoes
```

**Resposta:**
```json
[
  {
    "id": 1,
    "nome": "AACD",
    "endereco": "Rua Afonso de Taunay, 141 - Vila Mariana",
    "cep": "04102041",
    "telefone": "(11) 3000-1111",
    "estoques": [
      {
        "categoria": "Alimentos",
        "quantidade": 5,
        "capacidade": 100,
        "percentual": "5.00%",
        "status": "CRÍTICO"
      }
    ]
  }
]
```

---

### 2. Recomendação para Doador

**Morador informa CEP e tipo de item:**

```http
POST /doador/recomendacao
Content-Type: application/json

{
  "cep": "01310100",
  "categoria_id": 1
}
```

**Resposta (onde mais precisa):**
```json
{
  "sucesso": true,
  "categoria": "Alimentos",
  "recomendacao": {
    "instituicao_id": 1,
    "nome": "AACD",
    "endereco": "Rua Afonso de Taunay, 141 - Vila Mariana",
    "cep": "04102041",
    "telefone": "(11) 3000-1111",
    "necessidade": "CRÍTICO",
    "percentual": "5.00%",
    "quantidade_atual": 5,
    "capacidade": 100,
    "mensagem": "AACD precisa de Alimentos!"
  },
  "outras_opcoes": [
    {
      "instituicao_id": 2,
      "nome": "Centro Comunitário",
      "necessidade": "BAIXO",
      "percentual": "30.00%"
    }
  ]
}
```

---

### 3. Admin: Listar Estoques

```http
GET /admin/estoque
```

**Resposta (ordenado por necessidade):**
```json
[
  {
    "id": 1,
    "instituicao": "AACD",
    "categoria": "Alimentos",
    "quantidade_atual": 5,
    "capacidade_maxima": 100,
    "percentual": 5.00,
    "status": "CRÍTICO"
  }
]
```

---

### 4. Admin: Atualizar Estoque

**Admin registra uma doação recebida:**

```http
PUT /admin/estoque/1
Content-Type: application/json

{
  "quantidade_atual": 50
}
```

**Resposta:**
```json
{
  "sucesso": true,
  "estoque_id": 1,
  "instituicao": "AACD",
  "categoria": "Alimentos",
  "quantidade_anterior": 5,
  "quantidade_nova": 50,
  "capacidade": 100,
  "percentual": "50.00%"
}
```

---

### 5. Login Admin

```http
POST /usuarios/login
Content-Type: application/json

{
  "email": "admin@exemplo.com",
  "senha": "senha123"
}
```

**Resposta:**
```json
{
  "mensagem": "Login realizado com sucesso",
  "usuario": {
    "id": 1,
    "nome": "Admin",
    "instituicao_id": 1
  }
}
```

---

## 📊 Status de Estoques

| Percentual | Status | Prioridade |
|-----------|--------|-----------|
| 0% | FALTA | 🔴 Crítico |
| 1-20% | CRÍTICO | 🔴 Crítico |
| 21-50% | BAIXO | 🟠 Alto |
| 51-80% | MÉDIO | 🟡 Normal |
| 81-100% | BOM | 🟢 Ok |
| >100% | EXCESSO | ⚪ Cheio |

---

## 💾 Categorias Disponíveis

- **1**: Alimentos
- **2**: Água
- **3**: Roupas
- **4**: Higiene

---

## 🏛️ Instituições Padrão

| ID | Nome | Endereço | CEP |
|----|------|----------|-----|
| 1 | AACD | Rua Afonso de Taunay, 141 - Vila Mariana | 04102041 |
| 2 | Centro Comunitário | Avenida Paulista, 1000 - Bela Vista | 01311100 |
| 3 | Comunidade Solidária | Rua da Consolação, 2000 - Centro | 01302100 |

---

## 🔑 Credencial Padrão (Admin)

```
Email: admin@exemplo.com
Senha: senha123
```

---

## 📁 Estrutura

```
doacao-solidaria/
├── database.js           (Schema + seed)
├── server.js             (Servidor principal)
├── routes/
│   ├── instituicoes.js   (GET instituições com status)
│   ├── doador.js         (POST recomendação)
│   ├── admin.js          (GET/PUT estoque)
│   └── usuarios.js       (Login)
└── package.json
```

---

## 🎯 MVP Features

✅ Morador consulta onde doar (CEP + categoria)  
✅ Admin vê estoques críticos ordenados  
✅ Admin atualiza quantidade de estoque  
✅ Histórico simples de doações  
✅ Login básico para admin  
✅ 3 instituições pré-cadastradas  
✅ 4 categorias de itens  

---

## 🛠️ Tech Stack Mínimo

- **Runtime**: Node.js
- **Framework**: Express.js
- **Banco**: SQLite
- **Dev**: Nodemon

---

**Desenvolvido para o Desafio Empower 5.0**
