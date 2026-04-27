// routes/doacoes.js

const express = require("express");
const router = express.Router();

// ============================================
// DOAÇÕES - SISTEMA DE VALIDAÇÃO
// ============================================

// POST - Registra uma nova doação agendada
// Criada pelo DOADOR via interface pública
router.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const { validacoes } = req.app.locals;
  const { doador_nome, doador_telefone_raw, categoria_id, quantidade, unidade, data_agendamento, instituicao_id } = req.body;

  try {
    // Validações básicas
    if (!doador_nome || !doador_telefone_raw || !categoria_id || !quantidade || !unidade) {
      return res.status(400).json({
        sucesso: false,
        erro: "doador_nome, doador_telefone, categoria_id, quantidade e unidade são obrigatórios"
      });
    }

    if (!data_agendamento) {
      return res.status(400).json({
        sucesso: false,
        erro: "data_agendamento é obrigatória"
      });
    }

    // Validar unidade
    const unidadesValidas = ['un', 'kg', 'L'];
    if (!unidadesValidas.includes(unidade)) {
      return res.status(400).json({
        sucesso: false,
        erro: `Unidade inválida. Use: ${unidadesValidas.join(', ')}`
      });
    }

    // Normalizar e validar telefone
    const doador_telefone = validacoes.normalizarTelefone(doador_telefone_raw);
    if (!validacoes.validarTelefone(doador_telefone)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Telefone inválido (deve ter 10 ou 11 dígitos)"
      });
    }

    // Validar quantidade
    if (isNaN(quantidade) || quantidade <= 0) {
      return res.status(400).json({
        sucesso: false,
        erro: "quantidade deve ser um número maior que 0"
      });
    }

    // Validar data_agendamento (não pode ser no passado)
    const dataAgendamento = new Date(data_agendamento);
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);

    if (dataAgendamento < agora) {
      return res.status(400).json({
        sucesso: false,
        erro: "data_agendamento não pode ser no passado"
      });
    }

    // Validar se categoria existe
    const categoria = await db.get("SELECT id, nome FROM categorias WHERE id = ?", [categoria_id]);
    if (!categoria) {
      return res.status(404).json({
        sucesso: false,
        erro: "Categoria não encontrada"
      });
    }

    // Validar se instituição existe (se informada)
    if (instituicao_id) {
      const instituicao = await db.get("SELECT id FROM instituicoes WHERE id = ? AND ativo = 1", [instituicao_id]);
      if (!instituicao) {
        return res.status(404).json({
          sucesso: false,
          erro: "Instituição não encontrada ou inativa"
        });
      }
    }

    // Inserir nova doação
    const result = await db.run(`
      INSERT INTO doacoes (doador_nome, doador_telefone, categoria_id, quantidade, unidade, instituicao_id, data_agendamento, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'AGENDADA')
    `, [doador_nome, doador_telefone, categoria_id, quantidade, unidade, instituicao_id || null, data_agendamento]);

    const novaDoacao = await db.get(
      `SELECT 
        d.id,
        d.doador_nome,
        d.doador_telefone,
        d.categoria_id,
        c.nome as categoria,
        d.quantidade,
        d.unidade,
        d.instituicao_id,
        CASE WHEN i.id IS NOT NULL THEN i.nome ELSE 'Não informada' END as instituicao,
        d.data_agendamento,
        d.data_criacao,
        d.status,
        d.sla_dias
      FROM doacoes d
      INNER JOIN categorias c ON d.categoria_id = c.id
      LEFT JOIN instituicoes i ON d.instituicao_id = i.id
      WHERE d.id = ?`,
      [result.lastID]
    );

    return res.status(201).json({
      sucesso: true,
      mensagem: "Doação agendada com sucesso! Compareça na data indicada.",
      doacao: novaDoacao
    });

  } catch (erro) {
    console.error("Erro em POST /doacoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao agendar doação"
    });
  }
});

// GET - Lista doacoes com filtros
// Pode filtrar por status, data_agendamento, categoria_id, doador_telefone
router.get("/", async (req, res) => {
  const db = req.app.locals.db;
  const { status, categoria_id, instituicao_id, data_inicio, data_fim } = req.query;

  try {
    let sql = `
      SELECT 
        d.id,
        d.doador_nome,
        d.doador_telefone,
        d.categoria_id,
        c.nome as categoria,
        d.quantidade,
        d.unidade,
        d.instituicao_id,
        CASE WHEN i.id IS NOT NULL THEN i.nome ELSE 'Não informada' END as instituicao,
        d.data_agendamento,
        d.data_criacao,
        d.data_validacao,
        d.status,
        d.motivo_rejeicao,
        d.sla_dias
      FROM doacoes d
      INNER JOIN categorias c ON d.categoria_id = c.id
      LEFT JOIN instituicoes i ON d.instituicao_id = i.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      sql += " AND d.status = ?";
      params.push(status);
    }

    if (categoria_id) {
      sql += " AND d.categoria_id = ?";
      params.push(categoria_id);
    }

    if (instituicao_id) {
      sql += " AND d.instituicao_id = ?";
      params.push(instituicao_id);
    }

    if (data_inicio) {
      sql += " AND d.data_agendamento >= ?";
      params.push(data_inicio);
    }

    if (data_fim) {
      sql += " AND d.data_agendamento <= ?";
      params.push(data_fim);
    }

    sql += " ORDER BY d.data_agendamento DESC, d.data_criacao DESC";

    const doacoes = await db.all(sql, params);

    // Contar por status
    const contagem = await db.all(`
      SELECT status, COUNT(*) as total FROM doacoes GROUP BY status
    `);

    const statusMap = {};
    contagem.forEach(row => {
      statusMap[row.status] = row.total;
    });

    return res.status(200).json({
      sucesso: true,
      total: doacoes.length,
      contagem_por_status: statusMap,
      doacoes
    });

  } catch (erro) {
    console.error("Erro em GET /doacoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar doações"
    });
  }
});

// GET - Detalhe de uma doação específica
router.get("/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  try {
    if (!id || isNaN(id)) {
      return res.status(400).json({
        sucesso: false,
        erro: "ID inválido"
      });
    }

    const doacao = await db.get(`
      SELECT 
        d.id,
        d.doador_nome,
        d.doador_telefone,
        d.categoria_id,
        c.nome as categoria,
        d.quantidade,
        d.unidade,
        d.instituicao_id,
        CASE WHEN i.id IS NOT NULL THEN i.nome ELSE 'Não informada' END as instituicao,
        d.data_agendamento,
        d.data_criacao,
        d.data_validacao,
        d.status,
        d.motivo_rejeicao,
        d.sla_dias
      FROM doacoes d
      INNER JOIN categorias c ON d.categoria_id = c.id
      LEFT JOIN instituicoes i ON d.instituicao_id = i.id
      WHERE d.id = ?
    `, [id]);

    if (!doacao) {
      return res.status(404).json({
        sucesso: false,
        erro: "Doação não encontrada"
      });
    }

    return res.status(200).json({
      sucesso: true,
      doacao
    });

  } catch (erro) {
    console.error("Erro em GET /doacoes/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar doação"
    });
  }
});

// PUT - Validar doação (APROVAR ou REJEITAR)
// Requer usuario_id (admin), acao (APROVAR/REJEITAR), motivo_rejeicao (se rejeitar)
router.put("/:id/validar", async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { usuario_id, acao, motivo_rejeicao } = req.body;

  try {
    // Validações
    if (!id || isNaN(id)) {
      return res.status(400).json({
        sucesso: false,
        erro: "ID inválido"
      });
    }

    if (!usuario_id) {
      return res.status(400).json({
        sucesso: false,
        erro: "usuario_id é obrigatório"
      });
    }

    if (!acao || !['APROVAR', 'REJEITAR'].includes(acao)) {
      return res.status(400).json({
        sucesso: false,
        erro: "acao deve ser APROVAR ou REJEITAR"
      });
    }

    if (acao === 'REJEITAR' && !motivo_rejeicao) {
      return res.status(400).json({
        sucesso: false,
        erro: "motivo_rejeicao é obrigatório ao rejeitar"
      });
    }

    // Validar se usuário existe
    const usuario = await db.get("SELECT id FROM usuarios WHERE id = ? AND ativo = 1", [usuario_id]);
    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        erro: "Usuário não encontrado ou inativo"
      });
    }

    // Buscar doação
    const doacao = await db.get("SELECT * FROM doacoes WHERE id = ?", [id]);
    if (!doacao) {
      return res.status(404).json({
        sucesso: false,
        erro: "Doação não encontrada"
      });
    }

    // Validar status (pode validar apenas doações em status AGENDADA)
    if (doacao.status !== 'AGENDADA') {
      return res.status(400).json({
        sucesso: false,
        erro: `Doação não está em status AGENDADA (status atual: ${doacao.status})`
      });
    }

    // Validar se a data agendada ainda não passou (ou passou há no máximo 2 dias)
    const hoje = new Date();
    const dataAgendada = new Date(doacao.data_agendamento);
    const diasPassados = Math.floor((hoje - dataAgendada) / (1000 * 60 * 60 * 24));
    
    if (diasPassados > 2) {
      return res.status(400).json({
        sucesso: false,
        erro: `Prazo expirado para validar esta doação. Data agendada: ${new Date(doacao.data_agendamento).toLocaleDateString('pt-BR')}`
      });
    }

    // Atualizar doação
    let novoStatus = acao === 'APROVAR' ? 'APROVADA' : 'REJEITADA';

    await db.run(`
      UPDATE doacoes 
      SET status = ?, data_validacao = CURRENT_TIMESTAMP, motivo_rejeicao = ?
      WHERE id = ?
    `, [novoStatus, acao === 'REJEITAR' ? motivo_rejeicao : null, id]);

    // Se APROVADA, criar entrada de estoque automática
    if (acao === 'APROVAR') {
      await db.run("BEGIN TRANSACTION");

      try {
        // 1. Buscar ou criar estoque
        const estoque = await db.get(`
          SELECT id FROM estoques 
          WHERE instituicao_id = ? AND categoria_id = ?
        `, [doacao.instituicao_id, doacao.categoria_id]);

        let estoque_id;
        if (!estoque) {
          // Se não existe, criar com quantidade inicial = 0 e capacidade_maxima = 1000
          const resultEstoque = await db.run(`
            INSERT INTO estoques (instituicao_id, categoria_id, quantidade_atual, capacidade_maxima)
            VALUES (?, ?, 0, 1000)
          `, [doacao.instituicao_id, doacao.categoria_id]);
          estoque_id = resultEstoque.lastID;
        } else {
          estoque_id = estoque.id;
        }

        // 2. Registrar movimentação de entrada
        const resultMovimentacao = await db.run(`
          INSERT INTO movimentacoes_estoque (estoque_id, usuario_id, tipo, quantidade_diferenca, descricao)
          VALUES (?, ?, 'entrada', ?, ?)
        `, [estoque_id, usuario_id, doacao.quantidade, `Doação aprovada: ${doacao.doador_nome}`]);

        const movimentacao_id = resultMovimentacao.lastID;

        // 3. Atualizar estoque
        const estoqueAtual = await db.get("SELECT quantidade_atual FROM estoques WHERE id = ?", [estoque_id]);
        const novaQuantidade = estoqueAtual.quantidade_atual + doacao.quantidade;

        await db.run(`
          UPDATE estoques SET quantidade_atual = ? WHERE id = ?
        `, [novaQuantidade, estoque_id]);

        // 4. Registrar histórico
        await db.run(`
          INSERT INTO historico_estoques (estoque_id, quantidade_anterior, quantidade_nova, usuario_id, movimentacao_estoque_id, motivo)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [estoque_id, estoqueAtual.quantidade_atual, novaQuantidade, usuario_id, movimentacao_id, 'Entrada de doação aprovada']);

        // 5. Registrar em doacoes_recebidas
        let doador = await db.get("SELECT id FROM doadores WHERE telefone = ?", [doacao.doador_telefone]);
        if (!doador) {
          const resultDoador = await db.run(
            "INSERT INTO doadores (nome, telefone) VALUES (?, ?)",
            [doacao.doador_nome, doacao.doador_telefone]
          );
          doador = { id: resultDoador.lastID };
        }

        await db.run(`
          INSERT INTO doacoes_recebidas (movimentacao_estoque_id, doador_id, quantidade_doada)
          VALUES (?, ?, ?)
        `, [movimentacao_id, doador.id, doacao.quantidade]);

        await db.run("COMMIT");

      } catch (erroTransacao) {
        await db.run("ROLLBACK");
        throw erroTransacao;
      }
    }

    // Buscar doação atualizada
    const doacaoAtualizada = await db.get(`
      SELECT 
        d.id,
        d.doador_nome,
        d.doador_telefone,
        d.categoria_id,
        c.nome as categoria,
        d.quantidade,
        d.unidade,
        d.instituicao_id,
        CASE WHEN i.id IS NOT NULL THEN i.nome ELSE 'Não informada' END as instituicao,
        d.data_agendamento,
        d.data_criacao,
        d.data_validacao,
        d.status,
        d.motivo_rejeicao,
        d.sla_dias
      FROM doacoes d
      INNER JOIN categorias c ON d.categoria_id = c.id
      LEFT JOIN instituicoes i ON d.instituicao_id = i.id
      WHERE d.id = ?
    `, [id]);

    return res.status(200).json({
      sucesso: true,
      mensagem: acao === 'APROVAR' ? "Doação aprovada e adicionada ao estoque" : "Doação rejeitada",
      doacao: doacaoAtualizada
    });

  } catch (erro) {
    console.error("Erro em PUT /doacoes/:id/validar:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao validar doação"
    });
  }
});

module.exports = router;
