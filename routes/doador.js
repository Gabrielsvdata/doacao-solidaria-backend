// routes/doador.js

const express = require("express");
const router = express.Router();

// Recomenda instituições por criticidade de estoque
router.post("/recomendacao", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const { categoria_id } = req.body;

    // Validar categoria
    if (!categoria_id) {
      return res.status(400).json({
        sucesso: false,
        erro: "categoria_id é obrigatório"
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

    // Buscar TODAS as instituições com seus estoques
    // Ordenar por MENOR percentual (quem mais precisa fica por primeiro)
    const recomendacoes = await db.all(`
      SELECT 
        i.id as instituicao_id,
        i.nome as nome_instituicao,
        i.endereco,
        i.cidade,
        i.telefone,
        e.quantidade_atual,
        e.capacidade_maxima,
        ROUND((e.quantidade_atual / e.capacidade_maxima) * 100, 2) as percentual
      FROM instituicoes i
      INNER JOIN estoques e ON e.instituicao_id = i.id
      WHERE e.categoria_id = ? AND i.ativo = 1
      ORDER BY percentual ASC
    `, [categoria_id]);

    if (recomendacoes.length === 0) {
      return res.status(404).json({
        sucesso: false,
        erro: "Nenhuma instituição ativa encontrada para esta categoria"
      });
    }

    // Função para definir status
    const obterStatus = (percentual) => {
      if (percentual === 0) return "FALTA";
      if (percentual < 20) return "CRÍTICO";
      if (percentual < 50) return "BAIXO";
      if (percentual < 80) return "MÉDIO";
      if (percentual <= 100) return "BOM";
      return "EXCESSO";
    };

    // Enriquecer dados com status e horário
    const recomendacoesComStatus = recomendacoes.map(r => ({
      instituicao_id: r.instituicao_id,
      nome: r.nome_instituicao,
      endereco: r.endereco,
      cidade: r.cidade,
      telefone: r.telefone,
      horario_funcionamento: "08:00 - 18:00",
      status_estoque: obterStatus(r.percentual),
      percentual_preenchido: r.percentual,
      quantidade_atual: r.quantidade_atual,
      capacidade_maxima: r.capacidade_maxima
    }));

    // Retornar TOP 3 com MENOS estoque (os que mais precisam)
    const top3 = recomendacoesComStatus.slice(0, 3);

    return res.status(200).json({
      sucesso: true,
      categoria: categoria.nome,
      mensagem: `Encontramos ${top3.length} instituição(ões) que precisam de ${categoria.nome}`,
      recomendacoes: top3
    });

  } catch (erro) {
    console.error("Erro em /doador/recomendacao:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao processar recomendação"
    });
  }
});

// Lista todas as categorias disponíveis
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
