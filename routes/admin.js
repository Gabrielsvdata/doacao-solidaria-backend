// routes/admin.js

const express = require("express");
const router = express.Router();

// Login do administrador com bcrypt
router.post("/login", async (req, res) => {
  const db = req.app.locals.db;
  const { validacoes } = req.app.locals;
  const { email, senha } = req.body;

  try {
    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        erro: "Email e senha são obrigatórios"
      });
    }

    const admin = await db.get(
      "SELECT id, nome, email, senha FROM usuarios WHERE email = ? AND ativo = 1",
      [email]
    );

    if (!admin) {
      return res.status(401).json({
        sucesso: false,
        erro: "Email ou senha incorretos"
      });
    }

    // Verificar senha com bcrypt
    const senhaCorreta = await validacoes.verificarSenha(senha, admin.senha);
    
    if (!senhaCorreta) {
      return res.status(401).json({
        sucesso: false,
        erro: "Email ou senha incorretos"
      });
    }

    return res.status(200).json({
      sucesso: true,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email
      },
      token: `token_${admin.id}_${Date.now()}`,
      mensagem: "Login realizado com sucesso!"
    });

  } catch (erro) {
    console.error("Erro em POST /admin/login:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao fazer login"
    });
  }
});

// Lista todos os estoques ordenados por criticidade
router.get("/estoque", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const estoques = await db.all(`
      SELECT 
        e.id,
        e.instituicao_id,
        i.nome as instituicao,
        e.categoria_id,
        c.nome as categoria,
        e.quantidade_atual,
        e.capacidade_maxima,
        ROUND((e.quantidade_atual / e.capacidade_maxima) * 100, 2) as percentual,
        e.atualizada_em
      FROM estoques e
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      INNER JOIN categorias c ON e.categoria_id = c.id
      WHERE i.ativo = 1
      ORDER BY percentual ASC
    `);

    const estoqueComStatus = estoques.map(e => {
      let status = "BOM";
      if (e.percentual === 0) status = "FALTA";
      else if (e.percentual < 20) status = "CRÍTICO";
      else if (e.percentual < 50) status = "BAIXO";
      else if (e.percentual < 80) status = "MÉDIO";
      else if (e.percentual > 100) status = "EXCESSO";

      return {
        ...e,
        status
      };
    });

    return res.status(200).json({
      sucesso: true,
      total: estoqueComStatus.length,
      estoques: estoqueComStatus
    });

  } catch (erro) {
    console.error("Erro em GET /admin/estoque:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar estoques"
    });
  }
});

// Atualiza quantidade de um item
router.put("/estoque/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { quantidade_atual, descricao } = req.body;

  try {
    if (quantidade_atual === undefined || quantidade_atual < 0) {
      return res.status(400).json({
        sucesso: false,
        erro: "quantidade_atual é obrigatória e deve ser >= 0"
      });
    }

    // Buscar estoque anterior
    const estoqueAnterior = await db.get(
      "SELECT * FROM estoques WHERE id = ?",
      [id]
    );

    if (!estoqueAnterior) {
      return res.status(404).json({
        sucesso: false,
        erro: "Estoque não encontrado"
      });
    }

    // Validar que não ultrapassa capacidade
    if (quantidade_atual > estoqueAnterior.capacidade_maxima) {
      return res.status(400).json({
        sucesso: false,
        erro: `quantidade_atual não pode ser maior que capacidade_maxima (${estoqueAnterior.capacidade_maxima})`
      });
    }

    // Atualizar estoque
    await db.run(
      "UPDATE estoques SET quantidade_atual = ?, atualizada_em = CURRENT_TIMESTAMP WHERE id = ?",
      [quantidade_atual, id]
    );

    // Registrar no histórico de doações
    const tipoMovimentacao = quantidade_atual > estoqueAnterior.quantidade_atual ? 'entrada' : 'saida';
    const diferenca = Math.abs(quantidade_atual - estoqueAnterior.quantidade_atual);

    await db.run(`
      INSERT INTO doacoes (instituicao_id, categoria_id, quantidade, tipo, descricao)
      VALUES (?, ?, ?, ?, ?)
    `, [
      estoqueAnterior.instituicao_id,
      estoqueAnterior.categoria_id,
      diferenca,
      tipoMovimentacao,
      descricao || `${tipoMovimentacao} de ${diferenca} itens`
    ]);

    // Buscar dados atualizados
    const estoqueAtualizado = await db.get(
      `SELECT 
        e.id,
        e.instituicao_id,
        i.nome as instituicao,
        e.categoria_id,
        c.nome as categoria,
        e.quantidade_atual,
        e.capacidade_maxima,
        ROUND((e.quantidade_atual / e.capacidade_maxima) * 100, 2) as percentual
      FROM estoques e
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      INNER JOIN categorias c ON e.categoria_id = c.id
      WHERE e.id = ?`,
      [id]
    );

    let status = "BOM";
    if (estoqueAtualizado.percentual === 0) status = "FALTA";
    else if (estoqueAtualizado.percentual < 20) status = "CRÍTICO";
    else if (estoqueAtualizado.percentual < 50) status = "BAIXO";
    else if (estoqueAtualizado.percentual < 80) status = "MÉDIO";
    else if (estoqueAtualizado.percentual > 100) status = "EXCESSO";

    return res.status(200).json({
      sucesso: true,
      estoque: {
        ...estoqueAtualizado,
        status
      },
      mudanca: {
        anterior: estoqueAnterior.quantidade_atual,
        nova: quantidade_atual,
        diferenca: diferenca,
        tipo: tipoMovimentacao
      }
    });

  } catch (erro) {
    console.error("Erro em PUT /admin/estoque/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao atualizar estoque"
    });
  }
});

// Dashboard com análise de estoques
router.get("/analise", async (req, res) => {
  const db = req.app.locals.db;

  try {
    // 1. Total por categoria
    const porCategoria = await db.all(`
      SELECT 
        c.id,
        c.nome as categoria,
        COUNT(e.id) as total_itens,
        SUM(e.quantidade_atual) as total_quantidade,
        SUM(e.capacidade_maxima) as total_capacidade,
        ROUND(SUM(e.quantidade_atual) / SUM(e.capacidade_maxima) * 100, 2) as percentual
      FROM categorias c
      LEFT JOIN estoques e ON e.categoria_id = c.id
      GROUP BY c.id, c.nome
    `);

    // 2. Status geral
    const statusGeral = await db.all(`
      SELECT 
        CASE 
          WHEN (e.quantidade_atual / e.capacidade_maxima) * 100 = 0 THEN 'FALTA'
          WHEN (e.quantidade_atual / e.capacidade_maxima) * 100 < 20 THEN 'CRÍTICO'
          WHEN (e.quantidade_atual / e.capacidade_maxima) * 100 < 50 THEN 'BAIXO'
          WHEN (e.quantidade_atual / e.capacidade_maxima) * 100 < 80 THEN 'MÉDIO'
          WHEN (e.quantidade_atual / e.capacidade_maxima) * 100 <= 100 THEN 'BOM'
          ELSE 'EXCESSO'
        END as status,
        COUNT(*) as quantidade
      FROM estoques e
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      WHERE i.ativo = 1
      GROUP BY status
    `);

    // 3. Instituições com mais necessidade
    const instituicaosCriticas = await db.all(`
      SELECT 
        i.id,
        i.nome,
        COUNT(e.id) as total_categorias,
        ROUND(AVG((e.quantidade_atual / e.capacidade_maxima) * 100), 2) as percentual_medio
      FROM instituicoes i
      LEFT JOIN estoques e ON e.instituicao_id = i.id
      WHERE i.ativo = 1
      GROUP BY i.id, i.nome
      ORDER BY percentual_medio ASC
      LIMIT 5
    `);

    // 4. Movimentações recentes
    const movimentacoesRecentes = await db.all(`
      SELECT 
        d.id,
        i.nome as instituicao,
        c.nome as categoria,
        d.quantidade,
        d.tipo,
        d.descricao,
        d.data_doacao
      FROM doacoes d
      INNER JOIN instituicoes i ON d.instituicao_id = i.id
      INNER JOIN categorias c ON d.categoria_id = c.id
      ORDER BY d.data_doacao DESC
      LIMIT 10
    `);

    return res.status(200).json({
      sucesso: true,
      analise: {
        por_categoria: porCategoria,
        status_geral: statusGeral,
        instituicoes_criticas: instituicaosCriticas,
        movimentacoes_recentes: movimentacoesRecentes
      }
    });

  } catch (erro) {
    console.error("Erro em GET /admin/analise:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao gerar análise"
    });
  }
});

// Lista instituições (ativas e inativas)
router.get("/instituicoes", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const instituicoes = await db.all(`
      SELECT 
        id,
        nome,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        telefone,
        ativo,
        criada_em
      FROM instituicoes
      ORDER BY nome
    `);

    // Adicionar info de estoques zerados
    const comInfo = await Promise.all(
      instituicoes.map(async (inst) => {
        const estoques = await db.all(
          `SELECT SUM(quantidade_atual) as total FROM estoques WHERE instituicao_id = ?`,
          [inst.id]
        );
        
        const totalEstoque = estoques[0]?.total || 0;
        const podeSerDeletada = totalEstoque === 0;

        return {
          ...inst,
          total_estoque: totalEstoque,
          pode_deletar: podeSerDeletada && !inst.ativo
        };
      })
    );

    return res.status(200).json({
      sucesso: true,
      total: comInfo.length,
      instituicoes: comInfo
    });

  } catch (erro) {
    console.error("Erro em GET /admin/instituicoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar instituições"
    });
  }
});

// Cria nova instituição
router.post("/instituicoes", async (req, res) => {
  const db = req.app.locals.db;
  const { nome, endereco, numero, complemento, bairro, cidade, estado, cep, telefone, latitude, longitude } = req.body;

  try {
    if (!nome || !endereco || !cidade) {
      return res.status(400).json({
        sucesso: false,
        erro: "Nome, endereco e cidade são obrigatórios"
      });
    }

    // Verificar se já existe
    const existe = await db.get(
      "SELECT id FROM instituicoes WHERE nome = ?",
      [nome]
    );

    if (existe) {
      return res.status(409).json({
        sucesso: false,
        erro: "Uma instituição com este nome já existe"
      });
    }

    const resultado = await db.run(`
      INSERT INTO instituicoes (nome, endereco, numero, complemento, bairro, cidade, estado, cep, telefone, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [nome, endereco, numero || null, complemento || null, bairro || null, cidade, estado || 'SP', cep || null, telefone || null, latitude || null, longitude || null]);

    const instituicao_id = resultado.lastID;

    // Criar estoques vazios para cada categoria
    const categorias = await db.all("SELECT id FROM categorias");
    
    for (const cat of categorias) {
      await db.run(`
        INSERT INTO estoques (instituicao_id, categoria_id, quantidade_atual, capacidade_maxima)
        VALUES (?, ?, 0, 100)
      `, [instituicao_id, cat.id]);
    }

    return res.status(201).json({
      sucesso: true,
      instituicao: {
        id: instituicao_id,
        nome,
        endereco,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade,
        estado: estado || 'SP',
        cep: cep || null,
        telefone: telefone || null
      },
      mensagem: "Instituição criada com sucesso!"
    });

  } catch (erro) {
    console.error("Erro em POST /admin/instituicoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao criar instituição"
    });
  }
});

// Deleta instituição (apenas se estoque zerado)
router.delete("/instituicoes/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  try {
    // Verificar se existe
    const instituicao = await db.get(
      "SELECT * FROM instituicoes WHERE id = ?",
      [id]
    );

    if (!instituicao) {
      return res.status(404).json({
        sucesso: false,
        erro: "Instituição não encontrada"
      });
    }

    // Verificar se está zerada
    const totalEstoque = await db.get(
      "SELECT SUM(quantidade_atual) as total FROM estoques WHERE instituicao_id = ?",
      [id]
    );

    if (totalEstoque.total > 0) {
      return res.status(400).json({
        sucesso: false,
        erro: "Não é possível deletar instituição com produtos em estoque. Zeralize o estoque primeiro.",
        total_estoque: totalEstoque.total
      });
    }

    // Deletar estoques relacionados
    await db.run("DELETE FROM estoques WHERE instituicao_id = ?", [id]);

    // Marcar como inativa (soft delete)
    await db.run("UPDATE instituicoes SET ativo = 0 WHERE id = ?", [id]);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Instituição desativada com sucesso (dados mantidos para rastreabilidade)"
    });

  } catch (erro) {
    console.error("Erro em DELETE /admin/instituicoes/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao deletar instituição"
    });
  }
});

module.exports = router;
