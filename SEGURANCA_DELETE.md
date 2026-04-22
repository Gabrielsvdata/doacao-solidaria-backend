# 🔒 Documentação: Deleção Segura de Usuários e Instituições

## Resumo das Alterações

Os endpoints de deleção (`DELETE`) foram refatorados para aumentar a segurança:

1. ✅ **Validação de Senha**: Exige senha do usuário logado para confirmar ação sensível
2. ✅ **Prevenção de Auto-delete**: Impossível deletar a própria conta (erro 403)
3. ✅ **Smart Delete**: Hard delete quando há limpeza, soft delete quando há histórico
4. ✅ **Auditoria**: Soft delete preserva dados para rastreabilidade

---

## 📋 Endpoints Modificados

### 1. DELETE /admin/usuarios/:id

**Antes**: Apenas soft delete sem validação
**Agora**: Hard delete com validação de segurança

#### Request Body

```json
{
  "usuario_id_logado": 1,
  "senha": "senha123"
}
```

#### Respostas

**✅ Sucesso - Hard Delete (sem histórico)**
```json
{
  "sucesso": true,
  "mensagem": "Usuário removido permanentemente com sucesso",
  "acao_realizada": "hard_delete"
}
```

**✅ Sucesso - Soft Delete (com histórico)**
```json
{
  "sucesso": true,
  "mensagem": "Usuário desativado (possui histórico de movimentações). Os dados foram preservados para auditoria",
  "acao_realizada": "soft_delete",
  "total_movimentacoes": 5
}
```

**❌ Erro - Auto-delete**
```json
{
  "sucesso": false,
  "erro": "Você não pode deletar sua própria conta. Para isso, entre em contato com um administrador"
}
```

**❌ Erro - Senha Incorreta**
```json
{
  "sucesso": false,
  "erro": "Senha incorreta. Ação não autorizada"
}
```

**❌ Erro - Parâmetros Faltando**
```json
{
  "sucesso": false,
  "erro": "Usuário logado e senha são obrigatórios para deletar"
}
```

---

### 2. DELETE /admin/instituicoes/:id

**Antes**: Lógica de soft delete, sem validação de senha
**Agora**: Exige senha para qualquer ação de deleção

#### Request Body

```json
{
  "usuario_id_logado": 1,
  "senha": "senha123"
}
```

#### Respostas

**✅ Sucesso - Hard Delete (sem dados)**
```json
{
  "sucesso": true,
  "mensagem": "Instituição removida permanentemente com sucesso",
  "acao_realizada": "hard_delete"
}
```

**✅ Sucesso - Soft Delete (com estoque)**
```json
{
  "sucesso": true,
  "mensagem": "Instituição desativada (possui estoque vinculado). Os dados foram preservados",
  "acao_realizada": "soft_delete",
  "total_estoque": 125
}
```

**✅ Sucesso - Soft Delete (com histórico)**
```json
{
  "sucesso": true,
  "mensagem": "Instituição desativada (possui histórico de movimentações). Os dados foram preservados para auditoria",
  "acao_realizada": "soft_delete",
  "total_movimentacoes": 8
}
```

**❌ Erro - Senha Incorreta**
```json
{
  "sucesso": false,
  "erro": "Senha incorreta. Ação não autorizada"
}
```

---

## 🎯 Implementação no Frontend

### Exemplo: Modal de Confirmação com Senha

```javascript
// Quando usuário clica em deletar
const handleDeleteUsuario = async (usuarioId) => {
  // 1. Verificar se está tentando deletar a si mesmo (validação opcional no front)
  if (usuarioId === usuarioLogadoId) {
    // Avisar antes de chamar backend
    alert("Você não pode deletar sua própria conta");
    return;
  }

  // 2. Abrir modal pedindo senha
  const senha = prompt("Digite sua senha para confirmar a deleção:");
  
  if (!senha) return; // Usuário cancelou

  try {
    const response = await api.delete(`/admin/usuarios/${usuarioId}`, {
      data: {
        usuario_id_logado: usuarioLogadoId,
        senha: senha
      }
    });

    if (response.data.sucesso) {
      // Handle soft_delete vs hard_delete
      if (response.data.acao_realizada === "soft_delete") {
        alert(`Usuário desativado (${response.data.total_movimentacoes} movimentações preservadas)`);
      } else {
        alert("Usuário removido permanentemente");
      }
      
      // Recarregar lista
      fetchUsuarios();
    }
  } catch (erro) {
    // Tratar erros
    if (erro.response?.status === 403) {
      alert(erro.response.data.erro); // "Você não pode deletar sua própria conta..."
    } else if (erro.response?.status === 401) {
      alert(erro.response.data.erro); // "Senha incorreta..."
    } else {
      alert("Erro ao deletar usuário");
    }
  }
};
```

### Exemplo com Componente Modal

```javascript
import { useState } from 'react';

export function ConfirmarDelecaoUsuario({ usuarioId, usuarioLogadoId, onConfirm }) {
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Validação local: impedir auto-delete
  if (usuarioId === usuarioLogadoId) {
    return (
      <div className="modal">
        <div className="modal-content">
          <p className="aviso">
            ⚠️ Você não pode deletar sua própria conta.
          </p>
          <p className="descricao">
            Para solicitar a exclusão da sua conta, entre em contato com um administrador.
          </p>
          <button onClick={() => setErro('')}>Fechar</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      const response = await api.delete(`/admin/usuarios/${usuarioId}`, {
        data: {
          usuario_id_logado: usuarioLogadoId,
          senha: senha
        }
      });

      if (response.data.sucesso) {
        onConfirm(response.data); // Fechar modal e recarregar lista
      }
    } catch (erro) {
      setErro(erro.response?.data?.erro || 'Erro ao deletar');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Confirmar Deleção de Usuário</h2>
        <p className="aviso">
          ⚠️ Esta ação é irreversível (ou preservará dados para auditoria).
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Digite sua senha para confirmar:</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              required
              disabled={carregando}
            />
          </div>

          {erro && <div className="erro">{erro}</div>}

          <div className="buttons">
            <button type="submit" disabled={carregando} className="btn-danger">
              {carregando ? 'Processando...' : 'Deletar'}
            </button>
            <button type="button" onClick={() => onConfirm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 🔐 Validações Implementadas

### No Backend

| Validação | Status HTTP | Mensagem |
|-----------|------------|----------|
| Auto-delete | 403 | "Você não pode deletar sua própria conta..." |
| Senha incorreta | 401 | "Senha incorreta. Ação não autorizada" |
| Parâmetros faltando | 400 | "Usuário logado e senha são obrigatórios..." |
| Usuário logado inativo | 401 | "Usuário logado não encontrado ou inativo" |
| Entidade não encontrada | 404 | "Usuário/Instituição não encontrado" |

### Lógica de Delete

```
Se tem movimentações/estoque:
  → SOFT DELETE (ativo = 0)
  → Dados preservados
  → Mensagem indica razão

Senão:
  → HARD DELETE (remove do DB)
  → Espaço liberado
  → Registro de auditoria preservado
```

---

## 📊 Testes Recomendados

### Teste 1: Auto-delete (deve falhar)
```
DELETE /admin/usuarios/1
{
  "usuario_id_logado": 1,  // MESMO ID!
  "senha": "senha123"
}
→ 403 - "Você não pode deletar sua própria conta..."
```

### Teste 2: Senha incorreta (deve falhar)
```
DELETE /admin/usuarios/2
{
  "usuario_id_logado": 1,
  "senha": "senha_errada"
}
→ 401 - "Senha incorreta..."
```

### Teste 3: Deleção com sucesso
```
DELETE /admin/usuarios/4
{
  "usuario_id_logado": 1,
  "senha": "senha123"
}
→ 200 - { sucesso: true, acao_realizada: "hard_delete" }
```

---

## 🚀 Melhorias de UX

1. **Mensagens em Português**: Todas as mensagens são profissionais
2. **Feedback Claro**: Usuário sabe se foi soft ou hard delete
3. **Proteção contra Acidentes**: Modal com senha obrigatória
4. **Audit Trail**: Soft delete preserva histórico completo

---

## ⚠️ Notas de Segurança

- ✅ Senha é sempre validada com bcrypt (`verificarSenha`)
- ✅ Não há bypass de autenticação
- ✅ Soft delete automático se houver histórico (nunca perde dados)
- ✅ Hard delete só ocorre quando realmente seguro
- ✅ Logs de erro no console para debug

---

## 📝 Histórico

- **21/04/2026**: Implementação de delete seguro com validação de senha
- Endpoints refatorados: `DELETE /admin/usuarios/:id`, `DELETE /admin/instituicoes/:id`
