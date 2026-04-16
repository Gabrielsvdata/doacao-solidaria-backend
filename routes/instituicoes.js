const express = require("express");
const router = express.Router();

// GET /instituicoes
router.get("/", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const instituicoes = await db.all("SELECT * FROM instituicoes WHERE ativo = 1");
    res.json(instituicoes);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;