// routes/doador.js

const express = require("express");
const router = express.Router();

// Retorna as 3 instituicoes que mais precisam de uma categoria especifica
// Busca categoria pelo ID, lista instituicoes ativas ordenadas por menor estoque (LIMIT 3)
router.post("/recomendacao", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const { categoria_id } = req.body;

    if (!categoria_id || isNaN(categoria_id)) {
      return res.status(400).json({
        sucesso: false,
        erro: "categoria_id é obrigatório e deve ser um número"
      });
    }

    // Buscar categoria
    const categoria = await db.get(
      "SELECT id, nome FROM categorias WHERE id = ?",
      [categoria_id]
    );

    if (!categoria) {
      return res.status(404).json({
        sucesso: false,
        erro: "Categoria não encontrada"
      });
    }

    // Buscar TOP 3 instituições que mais precisam dessa categoria
    // Ordenar por MENOR percentual (quem mais precisa fica por primeiro)
    const recomendacoes = await db.all(`
      SELECT 
        i.id as instituicao_id,
        i.nome as nome_instituicao,
        i.endereco,
        i.cidade,
        i.telefone,
        i.horario_funcionamento,
        e.quantidade_atual,
        e.capacidade_maxima,
        CASE WHEN e.capacidade_maxima > 0
          THEN ROUND((e.quantidade_atual * 1.0 / e.capacidade_maxima) * 100, 2)
          ELSE 0
        END as percentual
      FROM instituicoes i
      INNER JOIN estoques e ON e.instituicao_id = i.id
      WHERE e.categoria_id = ? AND i.ativo = 1
      ORDER BY percentual ASC
      LIMIT 3
    `, [categoria_id]);

    if (recomendacoes.length === 0) {
      return res.status(404).json({
        sucesso: false,
        erro: "Nenhuma instituição ativa encontrada para esta categoria"
      });
    }

    const { validacoes } = req.app.locals;

    // Enriquecer dados com status
    const recomendacoesComStatus = recomendacoes.map(r => ({
      instituicao_id: r.instituicao_id,
      nome: r.nome_instituicao,
      endereco: r.endereco,
      cidade: r.cidade,
      telefone: r.telefone,
      horario_funcionamento: r.horario_funcionamento,
      status_estoque: validacoes.obterStatus(r.percentual),
      percentual_preenchido: r.percentual,
      quantidade_atual: r.quantidade_atual,
      capacidade_maxima: r.capacidade_maxima
    }));

    return res.status(200).json({
      sucesso: true,
      categoria: categoria.nome,
      mensagem: `Encontramos ${recomendacoesComStatus.length} instituição(ões) que precisam de ${categoria.nome}`,
      recomendacoes: recomendacoesComStatus
    });

  } catch (erro) {
    console.error("Erro em /doador/recomendacao:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao processar recomendação"
    });
  }
});

// Retorna lista de todas as categorias disponiveis
// SELECT em categorias ordenado por nome
router.get("/categorias", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const categorias = await db.all("SELECT id, nome, unidade_padrao FROM categorias ORDER BY nome");

    return res.status(200).json({
      sucesso: true,
      categorias
    });

  } catch (erro) {
    console.error("Erro em /doador/categorias:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar categorias"
    });
  }
});

module.exports = router;
