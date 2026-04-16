const express = require("express");
const router = express.Router();
const { calcularStatus } = require("../services/estoqueService");

// GET /estoques
router.get("/", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const estoques = await db.all(`
      SELECT e.*, i.nome as instituicao, c.nome as categoria
      FROM estoques e
      JOIN instituicoes i ON e.instituicao_id = i.id
      JOIN categorias c ON e.categoria_id = c.id
    `);

    const resultado = estoques.map(e => ({
      ...e,
      status: calcularStatus(e.quantidade_atual, e.capacidade_maxima)
    }));

    res.json(resultado);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;