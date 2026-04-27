// ⚠️ SCRIPT DE DESENVOLVIMENTO - APENAS PARA SETUP INICIAL
// Este script prepara o banco de dados com usuários de teste:
// - Ativa admin@exemplo.com
// - Cria usuário teste@admin.com com senha: 123456
// USO: node setup_usuarios.js (uma única vez durante desenvolvimento)
// Depois use a interface web em /admin/registro para criar novos usuários

const sqlite3 = require('sqlite3').verbose();
const { validacoes } = require('./rules');
const db = new sqlite3.Database('./database.db');

async function setup() {
  // 1. Ativar admin@exemplo.com
  await new Promise((resolve) => {
    db.run("UPDATE usuarios SET ativo = 1 WHERE email = 'admin@exemplo.com'", function(err) {
      if (err) console.log('Erro ao ativar:', err);
      else console.log('✅ Usuário admin@exemplo.com ativado');
      resolve();
    });
  });

  // 2. Criar/Atualizar usuário teste@admin.com com senha 123456
  const senha_hash = await validacoes.hashSenha('123456');
  await new Promise((resolve) => {
    db.run(
      "INSERT OR REPLACE INTO usuarios (nome, email, senha, ativo, instituicao_id) VALUES (?, ?, ?, 1, 1)",
      ['Teste Admin', 'teste@admin.com', senha_hash],
      function(err) {
        if (err) console.log('Erro ao criar teste@admin.com:', err);
        else console.log('✅ Usuário teste@admin.com criado com sucesso (senha: 123456)');
        resolve();
      }
    );
  });

  // 3. Listar todos os usuários ativos
  await new Promise((resolve) => {
    db.all('SELECT id, nome, email, ativo FROM usuarios', (err, rows) => {
      console.log('\n📋 Usuários no banco:');
      rows.forEach(u => {
        console.log(`  ID ${u.id}: ${u.nome} (${u.email}) - Ativo: ${u.ativo}`);
      });
      resolve();
    });
  });

  db.close();
}

setup().catch(console.error);
