const express = require("express");
const router = express.Router();

// Retorna detalhes de uma instituicao especifica com seus estoques
// Busca instituicao pelo ID, lista estoques com percentual de preenchimento
router.get("/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  try {
    const instituicao = await db.get(`
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
        horario_funcionamento
      FROM instituicoes
      WHERE id = ? AND ativo = 1
    `, [id]);

    if (!instituicao) {
      return res.status(404).json({
        sucesso: false,
        erro: "Instituição não encontrada"
      });
    }

    // Buscar estoques desta instituição
    const estoques = await db.all(`
      SELECT 
        e.id,
        e.categoria_id,
        c.nome as categoria,
        e.quantidade_atual,
        e.capacidade_maxima,
        CASE WHEN e.capacidade_maxima > 0
          THEN ROUND((e.quantidade_atual * 1.0 / e.capacidade_maxima) * 100, 2)
          ELSE 0
        END as percentual
      FROM estoques e
      INNER JOIN categorias c ON e.categoria_id = c.id
      WHERE e.instituicao_id = ?
      ORDER BY c.nome ASC
    `, [id]);

    const { validacoes, mensagens } = req.app.locals;

    // Adicionar status e mensagem de criticidade a cada estoque
    const estoqueComStatus = estoques.map(({ percentual, ...rest }) => {
      const status = validacoes.obterStatus(percentual);
      return {
        ...rest,
        percentual_preenchido: percentual,
        status_estoque: status,
        mensagem_status: mensagens.criticidade(status, rest.categoria, instituicao.nome)
      };
    });

    return res.status(200).json({
      sucesso: true,
      instituicao,
      estoques: estoqueComStatus
    });

  } catch (erro) {
    console.error("Erro em GET /instituicoes/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar instituição"
    });
  }
});

module.exports = router;