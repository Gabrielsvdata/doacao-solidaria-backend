const express = require("express");
const router = express.Router();

// POST /movimentacoes
router.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const { estoque_id, tipo, quantidade, observacao } = req.body;

  try {
    // 🔹 Validações
    if (!estoque_id || !tipo || !quantidade) {
      return res.status(400).json({ erro: "Dados obrigatórios faltando" });
    }

    if (!["entrada", "saida"].includes(tipo)) {
      return res.status(400).json({ erro: "Tipo deve ser 'entrada' ou 'saida'" });
    }

    if (quantidade <= 0) {
      return res.status(400).json({ erro: "Quantidade deve ser maior que zero" });
    }

    // 🔹 Buscar estoque
    const estoque = await db.get("SELECT * FROM estoques WHERE id = ?", [estoque_id]);

    if (!estoque) {
      return res.status(404).json({ erro: "Estoque não encontrado" });
    }

    let novaQuantidade;

    if (tipo === "entrada") {
      novaQuantidade = estoque.quantidade_atual + quantidade;
    } else {
      if (estoque.quantidade_atual < quantidade) {
        return res.status(400).json({ erro: "Estoque insuficiente" });
      }
      novaQuantidade = estoque.quantidade_atual - quantidade;
    }

    // 🔹 Inserir movimentação
    await db.run(
      `INSERT INTO movimentacoes (estoque_id, tipo, quantidade, observacao, data_registro)
       VALUES (?, ?, ?, ?, ?)`,
      [estoque_id, tipo, quantidade, observacao || "", new Date().toISOString()]
    );

    // 🔹 Atualizar estoque
    await db.run(
      `UPDATE estoques SET quantidade_atual = ? WHERE id = ?`,
      [novaQuantidade, estoque_id]
    );

    res.json({ mensagem: "Movimentação registrada com sucesso" });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;