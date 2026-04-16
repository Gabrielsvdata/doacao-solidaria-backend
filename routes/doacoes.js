const express = require("express");
const router = express.Router();

const { calcularStatus } = require("../services/estoqueService");
const { calcularDistancia } = require("../integrations/localizacao");

// POST /doacoes/recomendacao
router.post("/recomendacao", async (req, res) => {
  const db = req.app.locals.db;

  const { categoria_id, latitude, longitude } = req.body;

  try {
    // 🔹 Validação básica
    if (!categoria_id || !latitude || !longitude) {
      return res.status(400).json({
        erro: "categoria_id, latitude e longitude são obrigatórios"
      });
    }

    // 🔹 Buscar estoques + instituições
    const dados = await db.all(`
      SELECT 
        e.id as estoque_id,
        e.quantidade_atual,
        e.capacidade_maxima,
        i.id as instituicao_id,
        i.nome as instituicao_nome,
        i.endereco,
        i.latitude as inst_lat,
        i.longitude as inst_lng,
        c.nome as categoria_nome
      FROM estoques e
      JOIN instituicoes i ON e.instituicao_id = i.id
      JOIN categorias c ON e.categoria_id = c.id
      WHERE e.categoria_id = ?
    `, [categoria_id]);

    // 🔹 Processar dados
    const analisado = dados.map(item => {
      const status = calcularStatus(item.quantidade_atual, item.capacidade_maxima);

      const distancia = calcularDistancia(
        latitude,
        longitude,
        item.inst_lat,
        item.inst_lng
      );

      return {
        instituicao_id: item.instituicao_id,
        instituicao: item.instituicao_nome,
        endereco: item.endereco,
        categoria: item.categoria_nome,
        status,
        distancia_km: distancia
      };
    });

    // 🔥 Filtrar apenas necessidade real
    const filtrado = analisado.filter(item =>
      item.status === "FALTA" || item.status === "BAIXO"
    );

    if (filtrado.length === 0) {
      return res.json({
        mensagem: "Nenhuma instituição precisa desse item no momento",
        sugestao: "Verifique outras categorias ou aguarde atualização"
      });
    }

    // 🔥 Ordenação inteligente
    const prioridade = {
      "FALTA": 1,
      "BAIXO": 2
    };

    filtrado.sort((a, b) => {
      if (prioridade[a.status] !== prioridade[b.status]) {
        return prioridade[a.status] - prioridade[b.status];
      }
      return a.distancia_km - b.distancia_km;
    });

    // 🔹 Retornar TOP 3
    const resultado = filtrado.slice(0, 3);

    res.json(resultado);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;