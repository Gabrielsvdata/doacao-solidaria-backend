// ⚠️ ARQUIVO DE TESTE - APENAS PARA DESENVOLVIMENTO
// Este arquivo foi usado para testar a criação de doações no banco de dados
// NÃO EXECUTE EM PRODUÇÃO - pode criar dados duplicados
// Use este arquivo apenas para debugging local

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.run(
  "INSERT INTO doacoes (doador_nome, doador_telefone, categoria_id, quantidade, unidade, instituicao_id, data_agendamento, status, sla_dias) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)",
  ['Maria Santos', '11999887766', 1, 30, 'kg', 1, 'PENDENTE', 2],
  function(err) {
    if (err) {
      console.log('ERRO:', err);
    } else {
      console.log('✅ Doação PENDENTE criada com sucesso! ID:', this.lastID);
      db.all("SELECT id, doador_nome, status FROM doacoes ORDER BY id DESC LIMIT 2", (err, rows) => {
        console.log('Últimas doações:', rows);
        db.close();
      });
    }
  }
);
