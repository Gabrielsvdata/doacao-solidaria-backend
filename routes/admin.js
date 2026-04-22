// routes/admin.js

const express = require("express");
const router = express.Router();

// Autentica um administrador usando email e senha com hash bcrypt
// SELECT usuario, valida senha, retorna dados do admin se credenciais corretas
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
      "SELECT id, nome, email, senha, instituicao_id FROM usuarios WHERE email = ? AND ativo = 1",
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
      mensagem: "Login realizado com sucesso",
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        instituicao_id: admin.instituicao_id
      }
    });

  } catch (erro) {
    console.error("Erro em POST /admin/login:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao fazer login"
    });
  }
});

// Cadastra novo usuario administrador
// INSERT em usuarios com email unico, hasheia senha com bcrypt
router.post("/usuarios", async (req, res) => {
  const db = req.app.locals.db;
  const { validacoes } = req.app.locals;
  const { nome, email, senha, instituicao_id } = req.body;

  try {
    if (!nome || !email || !senha) {
      return res.status(400).json({
        sucesso: false,
        erro: "Nome, email e senha são obrigatórios"
      });
    }

    // Verificar se email já existe
    const emailExiste = await db.get(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (emailExiste) {
      return res.status(409).json({
        sucesso: false,
        erro: "Este email já está cadastrado"
      });
    }

    // Verificar se instituição existe (se informada)
    if (instituicao_id) {
      const instituicao = await db.get(
        "SELECT id FROM instituicoes WHERE id = ?",
        [instituicao_id]
      );

      if (!instituicao) {
        return res.status(404).json({
          sucesso: false,
          erro: "Instituição não encontrada"
        });
      }
    }

    const senhaHash = await validacoes.hashSenha(senha);

    const resultado = await db.run(
      `INSERT INTO usuarios (nome, email, senha, instituicao_id) VALUES (?, ?, ?, ?)`,
      [nome.trim(), email.trim().toLowerCase(), senhaHash, instituicao_id || null]
    );

    return res.status(201).json({
      sucesso: true,
      mensagem: "Usuário cadastrado com sucesso",
      usuario: {
        id: resultado.lastID,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        instituicao_id: instituicao_id || null
      }
    });

  } catch (erro) {
    console.error("Erro em POST /admin/usuarios:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao cadastrar usuário"
    });
  }
});

// Lista todos os estoques ordenados por criticidade
// SELECT em estoques com INNER JOIN instituicoes e categorias, calcula percentual
router.get("/estoque", async (req, res) => {
  const db = req.app.locals.db;
  const { validacoes, mensagens } = req.app.locals;

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
        CASE WHEN e.capacidade_maxima > 0
          THEN ROUND((e.quantidade_atual * 1.0 / e.capacidade_maxima) * 100, 2)
          ELSE 0
        END as percentual,
        e.atualizada_em
      FROM estoques e
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      INNER JOIN categorias c ON e.categoria_id = c.id
      WHERE i.ativo = 1
      ORDER BY i.nome ASC, c.nome ASC
    `);

    const estoqueComStatus = estoques.map(({ percentual, ...rest }) => {
      const status = validacoes.obterStatus(percentual);
      return {
        ...rest,
        percentual_preenchido: percentual,
        status_estoque: status,
        mensagem_status: mensagens.criticidade(status, rest.categoria, rest.instituicao)
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

// Atualiza quantidade de um item (ENTRADA ou SAIDA)
// Registra movimentacao atomicamente: UPDATE estoque + INSERT movimentacao + INSERT historico + INSERT doacao (se aplicavel)
router.put("/estoque/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { validacoes } = req.app.locals;
  const { id } = req.params;
  const { quantidade_atual, descricao, doador_nome, telefone: telefoneRaw, quantidade_doada, usuario_id } = req.body;

  try {
    if (!usuario_id) {
      return res.status(400).json({
        sucesso: false,
        erro: "usuario_id é obrigatório"
      });
    }

    const usuario = await db.get("SELECT id FROM usuarios WHERE id = ? AND ativo = 1", [usuario_id]);

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        erro: "Usuário não encontrado ou inativo"
      });
    }

    if (quantidade_atual === undefined || quantidade_atual < 0) {
      return res.status(400).json({
        sucesso: false,
        erro: "quantidade_atual é obrigatória e deve ser >= 0"
      });
    }

    // Normalizar e validar telefone (se fornecido)
    const telefone = telefoneRaw ? validacoes.normalizarTelefone(telefoneRaw) : null;

    if (telefone && !validacoes.validarTelefone(telefone)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Telefone inválido (deve ter 10 ou 11 dígitos)"
      });
    }

    if (quantidade_doada !== undefined && (isNaN(quantidade_doada) || quantidade_doada < 0)) {
      return res.status(400).json({
        sucesso: false,
        erro: "quantidade_doada deve ser um número >= 0"
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

    // Calcular tipo de movimentação
    const tipoMovimentacao = quantidade_atual > estoqueAnterior.quantidade_atual ? 'entrada' : 'saida';
    const diferenca = Math.abs(quantidade_atual - estoqueAnterior.quantidade_atual);

    // Se não houve mudança, retornar
    if (diferenca === 0) {
      return res.status(400).json({
        sucesso: false,
        erro: "A quantidade não mudou"
      });
    }

    // Validar saída: não pode retirar mais do que existe
    if (tipoMovimentacao === 'saida' && diferenca > estoqueAnterior.quantidade_atual) {
      return res.status(400).json({
        sucesso: false,
        erro: `Saída de ${diferenca} impossível. Estoque atual possui apenas ${estoqueAnterior.quantidade_atual}`
      });
    }

    // Validar dados do doador ANTES da transação
    if (tipoMovimentacao === 'entrada' && telefone && !doador_nome) {
      return res.status(400).json({
        sucesso: false,
        erro: "doador_nome é obrigatório quando há telefone"
      });
    }

    // TRANSAÇÃO ATÔMICA
    await db.run("BEGIN TRANSACTION");

    try {
      // 1. Atualizar estoque
      await db.run(
        "UPDATE estoques SET quantidade_atual = ?, atualizada_em = CURRENT_TIMESTAMP WHERE id = ?",
        [quantidade_atual, id]
      );

      // 2. Registrar movimentação em movimentacoes_estoque
      const resultMovimentacao = await db.run(`
        INSERT INTO movimentacoes_estoque (estoque_id, usuario_id, tipo, quantidade_diferenca, descricao)
        VALUES (?, ?, ?, ?, ?)
      `, [
        id,
        usuario_id,
        tipoMovimentacao,
        diferenca,
        descricao || `${tipoMovimentacao} de ${diferenca} itens`
      ]);

      const movimentacao_id = resultMovimentacao.lastID;

      // 3. Registrar no histórico de auditoria
      await db.run(`
        INSERT INTO historico_estoques (estoque_id, quantidade_anterior, quantidade_nova, usuario_id, movimentacao_estoque_id, motivo)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        id,
        estoqueAnterior.quantidade_atual,
        quantidade_atual,
        usuario_id,
        movimentacao_id,
        descricao || `${tipoMovimentacao} registrado`
      ]);

      // 4. Se for entrada com dados de doador, registrar doação
      let doacao_registrada = null;

      if (tipoMovimentacao === 'entrada' && telefone) {
        let doador = await db.get("SELECT id, nome FROM doadores WHERE telefone = ?", [telefone]);

        if (!doador) {
          const resultDoador = await db.run(
            "INSERT INTO doadores (nome, telefone) VALUES (?, ?)",
            [doador_nome, telefone]
          );
          doador = { id: resultDoador.lastID };
        } else if (doador.nome !== doador_nome) {
          await db.run("UPDATE doadores SET nome = ? WHERE id = ?", [doador_nome, doador.id]);
        }

        const qtdDoada = quantidade_doada !== undefined ? quantidade_doada : diferenca;

        await db.run(`
          INSERT INTO doacoes_recebidas (movimentacao_estoque_id, doador_id, quantidade_doada)
          VALUES (?, ?, ?)
        `, [movimentacao_id, doador.id, qtdDoada]);

        doacao_registrada = {
          doador_id: doador.id,
          doador_nome,
          telefone,
          quantidade_doada: qtdDoada
        };
      }

      await db.run("COMMIT");

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
          CASE WHEN e.capacidade_maxima > 0
            THEN ROUND((e.quantidade_atual * 1.0 / e.capacidade_maxima) * 100, 2)
            ELSE 0
          END as percentual
        FROM estoques e
        INNER JOIN instituicoes i ON e.instituicao_id = i.id
        INNER JOIN categorias c ON e.categoria_id = c.id
        WHERE e.id = ?`,
        [id]
      );

      const { percentual, ...dadosEstoque } = estoqueAtualizado;

      // Gerar mensagem contextualizada
      const { mensagens } = req.app.locals;
      let mensagem_acao = '';
      
      if (tipoMovimentacao === 'entrada' && doacao_registrada) {
        mensagem_acao = mensagens.estoque_entrada_com_doador(
          dadosEstoque.categoria,
          diferenca,
          dadosEstoque.instituicao,
          doacao_registrada.doador_nome
        );
      } else if (tipoMovimentacao === 'entrada') {
        mensagem_acao = mensagens.estoque_entrada(
          dadosEstoque.categoria,
          diferenca,
          dadosEstoque.instituicao
        );
      } else {
        mensagem_acao = mensagens.estoque_saida(
          dadosEstoque.categoria,
          diferenca,
          dadosEstoque.instituicao
        );
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: mensagem_acao,
        estoque: {
          ...dadosEstoque,
          percentual_preenchido: percentual,
          status_estoque: validacoes.obterStatus(percentual)
        },
        movimentacao_registrada: {
          id: movimentacao_id,
          tipo: tipoMovimentacao,
          quantidade_diferenca: diferenca,
          descricao: descricao || `${tipoMovimentacao} de ${diferenca} itens`
        },
        mudanca: {
          anterior: estoqueAnterior.quantidade_atual,
          nova: quantidade_atual,
          diferenca: diferenca,
          tipo: tipoMovimentacao
        },
        doacao_registrada
      });

    } catch (erroTransacao) {
      await db.run("ROLLBACK");
      throw erroTransacao;
    }

  } catch (erro) {
    console.error("Erro em PUT /admin/estoque/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao atualizar estoque"
    });
  }
});

// ============================================
// DOAÇÕES E DOACOES
// ============================================

// Lista historico de todas as doacoes registradas
// SELECT doacoes_recebidas com JOIN doadores, movimentacoes, estoques, instituicoes e categorias
router.get("/doacoes", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const doacoes = await db.all(`
      SELECT 
        d.nome as doador_nome,
        d.telefone,
        i.nome as instituicao,
        c.nome as categoria,
        dr.quantidade_doada,
        dr.data_doacao
      FROM doacoes_recebidas dr
      INNER JOIN doadores d ON dr.doador_id = d.id
      INNER JOIN movimentacoes_estoque me ON dr.movimentacao_estoque_id = me.id
      INNER JOIN estoques e ON me.estoque_id = e.id
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      INNER JOIN categorias c ON e.categoria_id = c.id
      ORDER BY dr.data_doacao DESC
    `);

    return res.status(200).json({
      sucesso: true,
      total: doacoes.length,
      doacoes
    });

  } catch (erro) {
    console.error("Erro em GET /admin/doacoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar doações"
    });
  }
});

// Dashboard com analise de estoques
// Agrupa estoques por categoria, calcula status geral, lista instituicoes criticas, 10 movimentacoes recentes
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
        CASE WHEN SUM(e.capacidade_maxima) > 0
          THEN ROUND(SUM(e.quantidade_atual) * 1.0 / SUM(e.capacidade_maxima) * 100, 2)
          ELSE 0
        END as percentual
      FROM categorias c
      LEFT JOIN estoques e ON e.categoria_id = c.id
      LEFT JOIN instituicoes i ON e.instituicao_id = i.id AND i.ativo = 1
      WHERE e.id IS NULL OR i.id IS NOT NULL
      GROUP BY c.id, c.nome
    `);

    // 2. Status geral (centralizado via obterStatus em JS)
    const { validacoes } = req.app.locals;

    const todosEstoques = await db.all(`
      SELECT 
        CASE WHEN e.capacidade_maxima > 0
          THEN ROUND((e.quantidade_atual * 1.0 / e.capacidade_maxima) * 100, 2)
          ELSE 0
        END as percentual
      FROM estoques e
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      WHERE i.ativo = 1
    `);

    const contagemStatus = {};
    todosEstoques.forEach(e => {
      const status = validacoes.obterStatus(e.percentual);
      contagemStatus[status] = (contagemStatus[status] || 0) + 1;
    });

    const statusGeral = Object.entries(contagemStatus).map(([status, quantidade]) => ({
      status,
      quantidade
    }));

    // 3. Instituições com mais necessidade
    const instituicaosCriticas = await db.all(`
      SELECT 
        i.id,
        i.nome,
        COUNT(e.id) as total_categorias,
        CASE WHEN COUNT(e.id) > 0
          THEN ROUND(AVG(CASE WHEN e.capacidade_maxima > 0 THEN (e.quantidade_atual * 1.0 / e.capacidade_maxima) * 100 ELSE 0 END), 2)
          ELSE 0
        END as percentual_medio
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
        m.id,
        i.nome as instituicao,
        c.nome as categoria,
        m.quantidade_diferenca as quantidade,
        m.tipo,
        m.descricao,
        m.data_movimento
      FROM movimentacoes_estoque m
      INNER JOIN estoques e ON m.estoque_id = e.id
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      INNER JOIN categorias c ON e.categoria_id = c.id
      ORDER BY m.data_movimento DESC
      LIMIT 10
    `);

    const porCategoriaComStatus = porCategoria.map(({ percentual, ...rest }) => ({
      ...rest,
      percentual_preenchido: percentual,
      status_estoque: validacoes.obterStatus(percentual)
    }));

    return res.status(200).json({
      sucesso: true,
      analise: {
        por_categoria: porCategoriaComStatus,
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

// Lista instituicoes (ativas e inativas)
// SELECT em instituicoes com LEFT JOIN estoques, calcula total e flag pode_deletar
router.get("/instituicoes", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const instituicoes = await db.all(`
      SELECT 
        i.id,
        i.nome,
        i.endereco,
        i.numero,
        i.complemento,
        i.bairro,
        i.cidade,
        i.estado,
        i.cep,
        i.telefone,
        i.horario_funcionamento,
        i.ativo,
        i.criada_em,
        COALESCE(SUM(e.quantidade_atual), 0) as total_estoque
      FROM instituicoes i
      LEFT JOIN estoques e ON e.instituicao_id = i.id
      GROUP BY i.id
      ORDER BY i.nome
    `);

    const idsComMovimentacao = await db.all(`
      SELECT DISTINCT e.instituicao_id as id
      FROM movimentacoes_estoque m
      INNER JOIN estoques e ON m.estoque_id = e.id
    `);
    const idsSet = new Set(idsComMovimentacao.map(r => r.id));

    const comInfo = instituicoes.map(inst => ({
      ...inst,
      pode_deletar: inst.total_estoque === 0 && !idsSet.has(inst.id)
    }));

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

// Cria nova instituicao
// INSERT em instituicoes, depois cria estoques vazios para TODAS as categorias (transacao)
router.post("/instituicoes", async (req, res) => {
  const db = req.app.locals.db;
  const { nome, endereco, numero, complemento, bairro, cidade, estado, cep, telefone, horario_funcionamento } = req.body;

  try {
    if (!nome || !endereco || !cidade) {
      return res.status(400).json({
        sucesso: false,
        erro: "Nome, endereco e cidade são obrigatórios"
      });
    }

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
      INSERT INTO instituicoes (nome, endereco, numero, complemento, bairro, cidade, estado, cep, telefone, horario_funcionamento)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [nome, endereco, numero || null, complemento || null, bairro || null, cidade, estado || 'SP', cep || null, telefone || null, horario_funcionamento || '08:00 - 18:00']);

    const instituicao_id = resultado.lastID;

    const categorias = await db.all("SELECT id FROM categorias");
    
    for (const cat of categorias) {
      await db.run(`
        INSERT INTO estoques (instituicao_id, categoria_id, quantidade_atual, capacidade_maxima)
        VALUES (?, ?, 0, 100)
      `, [instituicao_id, cat.id]);
    }

    return res.status(201).json({
      sucesso: true,
      mensagem: "Instituição criada com sucesso",
      instituicao: {
        id: instituicao_id,
        nome,
        endereco,
        cidade,
        estado: estado || 'SP'
      }
    });

  } catch (erro) {
    console.error("Erro em POST /admin/instituicoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao criar instituição"
    });
  }
});

// Deleta instituicao (com validação de segurança)
// Verifica: senha do usuário logado, estoque, movimentações
// Soft delete se houver dados, hard delete se limpeza
router.delete("/instituicoes/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { validacoes } = req.app.locals;
  const { id } = req.params;
  const { usuario_id_logado, senha } = req.body;

  try {
    // 1. Validar parâmetros obrigatórios
    if (!usuario_id_logado || !senha) {
      return res.status(400).json({
        sucesso: false,
        erro: "Usuário logado e senha são obrigatórios para deletar"
      });
    }

    // 2. Buscar usuário logado e validar senha
    const usuarioLogado = await db.get(
      "SELECT id, email, senha FROM usuarios WHERE id = ? AND ativo = 1",
      [usuario_id_logado]
    );

    if (!usuarioLogado) {
      return res.status(401).json({
        sucesso: false,
        erro: "Usuário logado não encontrado ou inativo"
      });
    }

    // 3. Validar senha do usuário logado
    const senhaCorreta = await validacoes.verificarSenha(senha, usuarioLogado.senha);

    if (!senhaCorreta) {
      return res.status(401).json({
        sucesso: false,
        erro: "Senha incorreta. Ação não autorizada"
      });
    }

    // 4. Buscar instituição
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

    // 5. Verificar total de estoque
    const totalEstoque = await db.get(
      "SELECT COALESCE(SUM(quantidade_atual), 0) as total FROM estoques WHERE instituicao_id = ?",
      [id]
    );

    if (totalEstoque.total > 0) {
      // Soft delete: tem estoque, apenas desativa
      await db.run("UPDATE instituicoes SET ativo = 0, atualizada_em = CURRENT_TIMESTAMP WHERE id = ?", [id]);

      return res.status(200).json({
        sucesso: true,
        mensagem: "Instituição desativada (possui estoque vinculado). Os dados foram preservados",
        acao_realizada: "soft_delete",
        total_estoque: totalEstoque.total
      });
    }

    // 6. Verificar se tem movimentações vinculadas
    const temMovimentacoes = await db.get(`
      SELECT COUNT(*) as total FROM movimentacoes_estoque m
      INNER JOIN estoques e ON m.estoque_id = e.id
      WHERE e.instituicao_id = ?
    `, [id]);

    if (temMovimentacoes.total > 0) {
      // Soft delete: tem histórico, apenas desativa (mantém estoques para rastreabilidade)
      await db.run("UPDATE instituicoes SET ativo = 0, atualizada_em = CURRENT_TIMESTAMP WHERE id = ?", [id]);

      return res.status(200).json({
        sucesso: true,
        mensagem: "Instituição desativada (possui histórico de movimentações). Os dados foram preservados para auditoria",
        acao_realizada: "soft_delete",
        total_movimentacoes: temMovimentacoes.total
      });
    }

    // 7. Hard delete: sem estoque e sem histórico
    await db.run("DELETE FROM estoques WHERE instituicao_id = ?", [id]);
    await db.run("DELETE FROM instituicoes WHERE id = ?", [id]);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Instituição removida permanentemente com sucesso",
      acao_realizada: "hard_delete"
    });

  } catch (erro) {
    console.error("Erro em DELETE /admin/instituicoes/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao deletar instituição"
    });
  }
});

// Lista todos os usuarios
// SELECT em usuarios com LEFT JOIN instituicoes, ordena por data criacao DESC
router.get("/usuarios", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const usuarios = await db.all(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.instituicao_id,
        i.nome as instituicao,
        u.ativo,
        u.criada_em,
        u.atualizada_em
      FROM usuarios u
      LEFT JOIN instituicoes i ON u.instituicao_id = i.id
      ORDER BY u.criada_em DESC
    `);

    return res.status(200).json({
      sucesso: true,
      total: usuarios.length,
      usuarios: usuarios
    });

  } catch (erro) {
    console.error("Erro em GET /admin/usuarios:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao listar usuários"
    });
  }
});

// Ativa ou desativa um usuario
// UPDATE em usuarios, muda campo ativo
router.put("/usuarios/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { ativo } = req.body;

  try {
    if (ativo === undefined) {
      return res.status(400).json({
        sucesso: false,
        erro: "Campo 'ativo' é obrigatório"
      });
    }

    const usuario = await db.get("SELECT id FROM usuarios WHERE id = ?", [id]);

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        erro: "Usuário não encontrado"
      });
    }

    await db.run(
      "UPDATE usuarios SET ativo = ?, atualizada_em = CURRENT_TIMESTAMP WHERE id = ?",
      [ativo ? 1 : 0, id]
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: "Usuário atualizado com sucesso"
    });

  } catch (erro) {
    console.error("Erro em PUT /admin/usuarios/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao atualizar usuário"
    });
  }
});

// Deleta usuario (hard delete com validação de segurança)
// Valida: usuario_id do logado, senha, impede auto-delete, verifica movimentações
router.delete("/usuarios/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { validacoes } = req.app.locals;
  const { id } = req.params;
  const { usuario_id_logado, senha } = req.body;

  try {
    // 1. Validar parâmetros obrigatórios
    if (!usuario_id_logado || !senha) {
      return res.status(400).json({
        sucesso: false,
        erro: "Usuário logado e senha são obrigatórios para deletar"
      });
    }

    // 2. Validar se está tentando deletar a si mesmo
    if (parseInt(id) === parseInt(usuario_id_logado)) {
      return res.status(403).json({
        sucesso: false,
        erro: "Você não pode deletar sua própria conta. Para isso, entre em contato com um administrador"
      });
    }

    // 3. Buscar usuário logado e validar senha
    const usuarioLogado = await db.get(
      "SELECT id, email, senha FROM usuarios WHERE id = ? AND ativo = 1",
      [usuario_id_logado]
    );

    if (!usuarioLogado) {
      return res.status(401).json({
        sucesso: false,
        erro: "Usuário logado não encontrado ou inativo"
      });
    }

    // 4. Validar senha do usuário logado
    const senhaCorreta = await validacoes.verificarSenha(senha, usuarioLogado.senha);

    if (!senhaCorreta) {
      return res.status(401).json({
        sucesso: false,
        erro: "Senha incorreta. Ação não autorizada"
      });
    }

    // 5. Buscar usuário a ser deletado
    const usuarioADeletar = await db.get(
      "SELECT id FROM usuarios WHERE id = ?",
      [id]
    );

    if (!usuarioADeletar) {
      return res.status(404).json({
        sucesso: false,
        erro: "Usuário não encontrado"
      });
    }

    // 6. Verificar se tem movimentações vinculadas
    const temMovimentacoes = await db.get(`
      SELECT COUNT(*) as total FROM movimentacoes_estoque
      WHERE usuario_id = ?
    `, [id]);

    if (temMovimentacoes.total > 0) {
      // Soft delete: tem histórico, apenas desativa
      await db.run("UPDATE usuarios SET ativo = 0, atualizada_em = CURRENT_TIMESTAMP WHERE id = ?", [id]);

      return res.status(200).json({
        sucesso: true,
        mensagem: "Usuário desativado (possui histórico de movimentações). Os dados foram preservados para auditoria",
        acao_realizada: "soft_delete",
        total_movimentacoes: temMovimentacoes.total
      });
    }

    // 7. Hard delete: sem histórico
    await db.run("DELETE FROM usuarios WHERE id = ?", [id]);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Usuário removido permanentemente com sucesso",
      acao_realizada: "hard_delete"
    });

  } catch (erro) {
    console.error("Erro em DELETE /admin/usuarios/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao deletar usuário"
    });
  }
});

// ============================================
// DISTRIBUIÇÕES (SAÍDA DE DOAÇÕES)
// ============================================

// Registra uma distribuicao (saida do estoque)
// Valida disponibilidade, atualiza estoque atomicamente com movimentacao e historico
router.post("/distribuicoes", async (req, res) => {
  const db = req.app.locals.db;
  const { estoque_id, quantidade, tipo_saida, beneficiario_nome, beneficiario_telefone, beneficiario_cpf, instituicao_destino_id, motivo, usuario_id } = req.body;

  try {
    if (!estoque_id || !quantidade || !tipo_saida || !usuario_id) {
      return res.status(400).json({
        sucesso: false,
        erro: "estoque_id, quantidade, tipo_saida e usuario_id são obrigatórios"
      });
    }

    if (!['familia', 'instituicao', 'descarte', 'transferencia'].includes(tipo_saida)) {
      return res.status(400).json({
        sucesso: false,
        erro: "tipo_saida deve ser: familia, instituicao, descarte ou transferencia"
      });
    }

    if (quantidade <= 0) {
      return res.status(400).json({
        sucesso: false,
        erro: "quantidade deve ser maior que 0"
      });
    }

    // Verificar estoque
    const estoque = await db.get(
      "SELECT * FROM estoques WHERE id = ?",
      [estoque_id]
    );

    if (!estoque) {
      return res.status(404).json({
        sucesso: false,
        erro: "Estoque não encontrado"
      });
    }

    if (quantidade > estoque.quantidade_atual) {
      return res.status(400).json({
        sucesso: false,
        erro: `Quantidade insuficiente. Disponível: ${estoque.quantidade_atual}`
      });
    }

    // Validações por tipo
    if (tipo_saida === 'familia' && !beneficiario_nome) {
      return res.status(400).json({
        sucesso: false,
        erro: "beneficiario_nome é obrigatório para distribuição a família"
      });
    }

    if (tipo_saida === 'transferencia' && !instituicao_destino_id) {
      return res.status(400).json({
        sucesso: false,
        erro: "instituicao_destino_id é obrigatório para transferência"
      });
    }

    // Validar telefone se fornecido
    let telefoneLimpo = null;
    if (beneficiario_telefone) {
      const { validacoes } = req.app.locals;
      telefoneLimpo = validacoes.normalizarTelefone(beneficiario_telefone);
      
      if (!validacoes.validarTelefone(telefoneLimpo)) {
        return res.status(400).json({
          sucesso: false,
          erro: "Telefone inválido (deve ter 10 ou 11 dígitos)"
        });
      }
    }

    // TRANSAÇÃO ATÔMICA
    await db.run("BEGIN TRANSACTION");

    try {
      const novaQuantidade = estoque.quantidade_atual - quantidade;

      // 1. Atualizar estoque
      await db.run(
        "UPDATE estoques SET quantidade_atual = ?, atualizada_em = CURRENT_TIMESTAMP WHERE id = ?",
        [novaQuantidade, estoque_id]
      );

      // 2. Registrar movimentação
      const resultMovimentacao = await db.run(`
        INSERT INTO movimentacoes_estoque (estoque_id, usuario_id, tipo, quantidade_diferenca, descricao)
        VALUES (?, ?, 'saida', ?, ?)
      `, [estoque_id, usuario_id, quantidade, motivo || `Distribuição - ${tipo_saida}`]);

      const movimentacao_id = resultMovimentacao.lastID;

      // 3. Registrar distribuição
      await db.run(`
        INSERT INTO distribuicoes (movimentacao_estoque_id, tipo_saida, beneficiario_nome, beneficiario_telefone, beneficiario_cpf, instituicao_destino_id, quantidade_distribuida, motivo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        movimentacao_id,
        tipo_saida,
        beneficiario_nome || null,
        telefoneLimpo || null,
        beneficiario_cpf || null,
        instituicao_destino_id || null,
        quantidade,
        motivo || null
      ]);

      // 4. Registrar no histórico de auditoria
      await db.run(`
        INSERT INTO historico_estoques (estoque_id, quantidade_anterior, quantidade_nova, usuario_id, movimentacao_estoque_id, motivo)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [estoque_id, estoque.quantidade_atual, novaQuantidade, usuario_id, movimentacao_id, `Distribuição - ${tipo_saida}`]);

      await db.run("COMMIT");

      // Buscar dados da categoria para mensagem
      const categoria = await db.get("SELECT nome FROM categorias WHERE id = ?", [estoque.categoria_id]);
      const { mensagens } = req.app.locals;
      
      // Gerar mensagem contextualizada baseada no tipo
      let mensagem_acao = '';
      switch (tipo_saida) {
        case 'familia':
          mensagem_acao = mensagens.distribuicao_familia(categoria.nome, quantidade, beneficiario_nome);
          break;
        case 'instituicao':
          mensagem_acao = mensagens.distribuicao_instituicao(categoria.nome, quantidade, beneficiario_nome);
          break;
        case 'descarte':
          mensagem_acao = mensagens.distribuicao_descarte(categoria.nome, quantidade);
          break;
        case 'transferencia':
          const instOrigem = await db.get("SELECT i.nome FROM estoques e INNER JOIN instituicoes i ON e.instituicao_id = i.id WHERE e.id = ?", [estoque_id]);
          const instDestino = await db.get("SELECT nome FROM instituicoes WHERE id = ?", [instituicao_destino_id]);
          mensagem_acao = mensagens.distribuicao_transferencia(
            categoria.nome, 
            quantidade, 
            instOrigem.nome, 
            instDestino.nome
          );
          break;
      }

      return res.status(201).json({
        sucesso: true,
        mensagem: mensagem_acao,
        distribuicao: {
          id: movimentacao_id,
          estoque_id,
          quantidade,
          tipo_saida,
          beneficiario_nome,
          quantidade_anterior: estoque.quantidade_atual,
          quantidade_nova: novaQuantidade,
          data: new Date().toISOString()
        }
      });

    } catch (erro) {
      await db.run("ROLLBACK");
      throw erro;
    }

  } catch (erro) {
    console.error("Erro em POST /admin/distribuicoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao registrar distribuição"
    });
  }
});

// Lista historico de distribuicoes
// SELECT em distribuicoes com JOIN estoques, instituicoes, categorias, usuarios e LEFT JOIN instituicoes destino
router.get("/distribuicoes", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const distribuicoes = await db.all(`
      SELECT 
        d.id,
        e.id as estoque_id,
        c.nome as categoria,
        i.nome as instituicao_origem,
        d.tipo_saida,
        d.beneficiario_nome,
        d.beneficiario_telefone,
        d.beneficiario_cpf,
        i2.nome as instituicao_destino,
        d.quantidade_distribuida as quantidade,
        d.motivo,
        d.data_distribuicao,
        u.nome as usuario_responsavel
      FROM distribuicoes d
      INNER JOIN movimentacoes_estoque me ON d.movimentacao_estoque_id = me.id
      INNER JOIN estoques e ON me.estoque_id = e.id
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      INNER JOIN categorias c ON e.categoria_id = c.id
      INNER JOIN usuarios u ON me.usuario_id = u.id
      LEFT JOIN instituicoes i2 ON d.instituicao_destino_id = i2.id
      ORDER BY d.data_distribuicao DESC
    `);

    return res.status(200).json({
      sucesso: true,
      total: distribuicoes.length,
      distribuicoes
    });

  } catch (erro) {
    console.error("Erro em GET /admin/distribuicoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao listar distribuições"
    });
  }
});

// Carrega dados iniciais para tela de distribuicoes (estoques + instituicoes)
// 1 SELECT para estoques + 1 SELECT para instituicoes (otimizacao: evita 2 requisicoes separadas)
router.get("/distribuicoes-carregamento", async (req, res) => {
  const db = req.app.locals.db;
  const { validacoes } = req.app.locals;

  try {
    // Buscar estoques com dados relacionados
    const estoques = await db.all(`
      SELECT 
        e.id,
        e.instituicao_id,
        i.nome as instituicao,
        e.categoria_id,
        c.nome as categoria,
        e.quantidade_atual,
        e.capacidade_maxima,
        CASE WHEN e.capacidade_maxima > 0
          THEN ROUND((e.quantidade_atual * 1.0 / e.capacidade_maxima) * 100, 2)
          ELSE 0
        END as percentual,
        e.atualizada_em
      FROM estoques e
      INNER JOIN instituicoes i ON e.instituicao_id = i.id
      INNER JOIN categorias c ON e.categoria_id = c.id
      WHERE i.ativo = 1
      ORDER BY i.nome ASC, c.nome ASC
    `);

    // Buscar instituições para destino
    const instituicoes = await db.all(`
      SELECT id, nome FROM instituicoes WHERE ativo = 1 ORDER BY nome ASC
    `);

    const estoqueComStatus = estoques.map(({ percentual, ...rest }) => ({
      ...rest,
      percentual_preenchido: percentual,
      status_estoque: validacoes.obterStatus(percentual)
    }));

    return res.status(200).json({
      sucesso: true,
      estoques: estoqueComStatus,
      instituicoes: instituicoes
    });

  } catch (erro) {
    console.error("Erro em GET /admin/distribuicoes-carregamento:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao carregar dados de distribuição"
    });
  }
});

module.exports = router;
