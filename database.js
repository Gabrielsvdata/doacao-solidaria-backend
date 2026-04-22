const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { validacoes } = require("./src/modules/rules");

/**
 * BANCO DE DADOS
 * Inicialização e configuração do SQLite
 */

const criarBanco = async () => {
  const db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  // Ativa foreign keys
  await db.exec("PRAGMA foreign_keys = ON");


  await db.exec(`
    CREATE TABLE IF NOT EXISTS instituicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      endereco TEXT NOT NULL,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      cidade TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'SP',
      cep TEXT,
      telefone TEXT,
      horario_funcionamento TEXT DEFAULT '08:00 - 18:00',
      ativo INTEGER DEFAULT 1,
      criada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizada_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_instituicoes_nome ON instituicoes(nome);
    CREATE INDEX IF NOT EXISTS idx_instituicoes_cidade ON instituicoes(cidade);
  `);


  await db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      unidade_padrao TEXT NOT NULL DEFAULT 'un',
      criada_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_categorias_nome ON categorias(nome);
  `);


  await db.exec(`
    CREATE TABLE IF NOT EXISTS doadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL UNIQUE,
      criada_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_doadores_telefone ON doadores(telefone);
  `);

 
  await db.exec(`
    CREATE TABLE IF NOT EXISTS estoques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instituicao_id INTEGER NOT NULL,
      categoria_id INTEGER NOT NULL,
      quantidade_atual REAL NOT NULL DEFAULT 0 CHECK(quantidade_atual >= 0),
      capacidade_maxima REAL NOT NULL CHECK(capacidade_maxima > 0),
      observacoes TEXT,
      criada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
      FOREIGN KEY (categoria_id) REFERENCES categorias(id),
      CHECK(quantidade_atual <= capacidade_maxima),
      UNIQUE(instituicao_id, categoria_id)
    );

    CREATE INDEX IF NOT EXISTS idx_estoques_instituicao ON estoques(instituicao_id);
    CREATE INDEX IF NOT EXISTS idx_estoques_categoria ON estoques(categoria_id);
  `);


  await db.exec(`
    CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estoque_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
      quantidade_diferenca REAL NOT NULL,
      descricao TEXT,
      data_movimento DATETIME DEFAULT CURRENT_TIMESTAMP,
      registrada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (estoque_id) REFERENCES estoques(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque ON movimentacoes_estoque(estoque_id);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_usuario ON movimentacoes_estoque(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data_movimento);
  `);

  // ==========================================
  // TABELA: doacoes_recebida
  // Rastreamento de doações reais recebidas
  // ==========================================
  await db.exec(`
    CREATE TABLE IF NOT EXISTS doacoes_recebidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movimentacao_estoque_id INTEGER NOT NULL,
      doador_id INTEGER,
      quantidade_doada REAL NOT NULL,
      data_doacao DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (movimentacao_estoque_id) REFERENCES movimentacoes_estoque(id),
      FOREIGN KEY (doador_id) REFERENCES doadores(id)
    );

    CREATE INDEX IF NOT EXISTS idx_doacoes_recebidas_movimento ON doacoes_recebidas(movimentacao_estoque_id);
    CREATE INDEX IF NOT EXISTS idx_doacoes_recebidas_doador ON doacoes_recebidas(doador_id);
  `);

  // ==========================================
  // TABELA: usuarios
  // Administradores com senhas hasheadas
  // ==========================================
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE CHECK(email LIKE '%@%.%'),
      senha TEXT NOT NULL,
      instituicao_id INTEGER,
      ativo INTEGER DEFAULT 1,
      criada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
    CREATE INDEX IF NOT EXISTS idx_usuarios_instituicao ON usuarios(instituicao_id);
  `);

  // ==========================================
  // TABELA: historico_estoques (MELHORADA)
  // Auditoria detalhada de todas as mudanças
  // ==========================================
  await db.exec(`
    CREATE TABLE IF NOT EXISTS historico_estoques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estoque_id INTEGER NOT NULL,
      quantidade_anterior REAL NOT NULL,
      quantidade_nova REAL NOT NULL,
      usuario_id INTEGER NOT NULL,
      motivo TEXT,
      movimentacao_estoque_id INTEGER,
      data_mudanca DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (estoque_id) REFERENCES estoques(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (movimentacao_estoque_id) REFERENCES movimentacoes_estoque(id)
    );

    CREATE INDEX IF NOT EXISTS idx_historico_estoque ON historico_estoques(estoque_id);
    CREATE INDEX IF NOT EXISTS idx_historico_usuario ON historico_estoques(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_historico_movimento ON historico_estoques(movimentacao_estoque_id);
    CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_estoques(data_mudanca);
  `);

  // ==========================================
  // TABELA: distribuicoes
  // Rastreamento de saídas de estoque com destino
  // ==========================================
  await db.exec(`
    CREATE TABLE IF NOT EXISTS distribuicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movimentacao_estoque_id INTEGER NOT NULL,
      tipo_saida TEXT NOT NULL CHECK(tipo_saida IN ('familia', 'instituicao', 'descarte', 'transferencia')),
      
      beneficiario_nome TEXT,
      beneficiario_telefone TEXT,
      beneficiario_cpf TEXT,
      
      instituicao_destino_id INTEGER,
      
      quantidade_distribuida REAL NOT NULL,
      motivo TEXT,
      data_distribuicao DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (movimentacao_estoque_id) REFERENCES movimentacoes_estoque(id),
      FOREIGN KEY (instituicao_destino_id) REFERENCES instituicoes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_distribuicoes_movimento ON distribuicoes(movimentacao_estoque_id);
    CREATE INDEX IF NOT EXISTS idx_distribuicoes_tipo ON distribuicoes(tipo_saida);
    CREATE INDEX IF NOT EXISTS idx_distribuicoes_instituicao ON distribuicoes(instituicao_destino_id);
    CREATE INDEX IF NOT EXISTS idx_distribuicoes_data ON distribuicoes(data_distribuicao);
  `);

  console.log("Banco de dados inicializado!");

  // ==========================================
  // SEED: Dados iniciais
  // ==========================================
  const checagem = await db.get("SELECT COUNT(*) AS total FROM instituicoes");

  if (checagem.total === 0) {
    console.log(" Inserindo dados iniciais...");

    // Instituições com endereço completo
    await db.exec(`
      INSERT INTO instituicoes (nome, endereco, numero, bairro, cidade, estado, cep, telefone, horario_funcionamento) VALUES
      ('CRAS Jóquei Clube', 'Av. Senador Salgado Filho', '224', 'Jóquei Clube', 'São Vicente', 'SP', '11310-100', '(13) 3468-1600', '08:00 - 17:00'),
      ('CRAS São Vicente', 'Av. Marechal Deodoro', '169', 'Vila Valença', 'São Vicente', 'SP', '11310-200', '(13) 3468-1601', '08:00 - 17:00'),
      ('CRAS Humaitá', 'Rua Vinte e Quatro', '135', 'Parque Continental', 'São Vicente', 'SP', '11310-300', '(13) 3468-1602', '08:00 - 17:00')
    `);

    // Categorias com unidade padrão
    await db.exec(`
      INSERT INTO categorias (nome, unidade_padrao) VALUES
      ('Alimentos', 'kg'),
      ('Água', 'litros'),
      ('Roupas', 'peças'),
      ('Higiene', 'peças')
    `);

    // Estoques com diferentes níveis de necessidade
    await db.exec(`
      INSERT INTO estoques (instituicao_id, categoria_id, quantidade_atual, capacidade_maxima) VALUES
      (1, 1,  10, 100),  -- CRAS Jóquei | Alimentos | CRÍTICO 10%
      (1, 2,  30, 500),  -- CRAS Jóquei | Água | CRÍTICO 6%
      (1, 3,  80, 200),  -- CRAS Jóquei | Roupas | MÉDIO 40%
      (1, 4, 120, 200),  -- CRAS Jóquei | Higiene | BOM 60%
      (2, 1,  45, 100),  -- CRAS São Vicente | Alimentos | MÉDIO 45%
      (2, 2, 250, 500),  -- CRAS São Vicente | Água | MÉDIO 50%
      (2, 3, 160, 200),  -- CRAS São Vicente | Roupas | BOM 80%
      (2, 4,  90, 200),  -- CRAS São Vicente | Higiene | MÉDIO 45%
      (3, 1,  70, 100),  -- CRAS Humaitá | Alimentos | BOM 70%
      (3, 2,  80, 500),  -- CRAS Humaitá | Água | CRÍTICO 16%
      (3, 3,  25, 200),  -- CRAS Humaitá | Roupas | BAIXO 12%
      (3, 4, 150, 200)   -- CRAS Humaitá | Higiene | BOM 75%
    `);

    // Usuário admin com senha hasheada
    const senhaHash = await validacoes.hashSenha("senha123");
    await db.run(
      `INSERT INTO usuarios (nome, email, senha, instituicao_id) VALUES (?, ?, ?, ?)`,
      ["Admin", "admin@exemplo.com", senhaHash, 1]
    );

    // Movimentações de estoque para popular o gráfico
    const hoje = new Date();
    for (let i = 10; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      const dataFormatada = data.toISOString();
      
      await db.run(
        `INSERT INTO movimentacoes_estoque (estoque_id, usuario_id, tipo, quantidade_diferenca, descricao, data_movimento) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [1, 1, 'entrada', Math.floor(Math.random() * 50) + 10, 'Doação recebida', dataFormatada]
      );
    }

    // ========== DADOS DE TESTE PARA DOAÇÕES ==========
    try {
      // Inserir doadores
      await db.run(`INSERT INTO doadores (nome, telefone) VALUES (?, ?)`, ["João Silva", "(11) 98765-4321"]);
      await db.run(`INSERT INTO doadores (nome, telefone) VALUES (?, ?)`, ["Maria Santos", "(11) 99876-5432"]);
      await db.run(`INSERT INTO doadores (nome, telefone) VALUES (?, ?)`, ["Carlos Oliveira", "(11) 97654-3210"]);

      // Inserir doacoes_recebidas
      const doadores = await db.all(`SELECT id FROM doadores`);
      const movimentacoes = await db.all(`SELECT id FROM movimentacoes_estoque LIMIT 3`);
      
      if (doadores.length > 0 && movimentacoes.length > 0) {
        for (let i = 0; i < Math.min(doadores.length, movimentacoes.length); i++) {
          await db.run(
            `INSERT INTO doacoes_recebidas (doador_id, movimentacao_estoque_id, quantidade_doada, data_doacao) 
             VALUES (?, ?, ?, ?)`,
            [
              doadores[i].id,
              movimentacoes[i].id,
              Math.floor(Math.random() * 100) + 20,
              new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            ]
          );
        }
      }
      console.log(" ✅ Dados de teste para doações inseridos!");
    } catch (e) {
      console.error(" ⚠️  Erro ao inserir doações:", e.message);
    }

    // ========== DADOS DE TESTE PARA DISTRIBUIÇÕES ==========
    try {
      // Inserir distribuições
      const estoques = await db.all(`SELECT id FROM estoques LIMIT 3`);
      const instituicoes = await db.all(`SELECT id FROM instituicoes LIMIT 2`);
      
      if (estoques.length > 0 && instituicoes.length > 1) {
        // Criar movimento de saída para distribuição
        const movSaidaResult = await db.run(
          `INSERT INTO movimentacoes_estoque (estoque_id, usuario_id, tipo, quantidade_diferenca, descricao) 
           VALUES (?, ?, ?, ?, ?)`,
          [estoques[0].id, 1, 'saida', -30, 'Distribuição para beneficiários']
        );

        await db.run(
          `INSERT INTO distribuicoes (movimentacao_estoque_id, tipo_saida, beneficiario_nome, beneficiario_telefone, beneficiario_cpf, instituicao_destino_id, quantidade_distribuida, motivo) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            movSaidaResult.lastID,
            'transferencia',
            'José Beneficiário',
            '(11) 3456-7890',
            '12345678901',
            instituicoes[1].id,
            30,
            'Transferência entre instituições'
          ]
        );
      }
      console.log(" ✅ Dados de teste para distribuições inseridos!");
    } catch (e) {
      console.error(" ⚠️  Erro ao inserir distribuições:", e.message);
    }

    console.log(" Usuário admin: admin@exemplo.com / senha123");
  }

  return db;
};

module.exports = { criarBanco };
