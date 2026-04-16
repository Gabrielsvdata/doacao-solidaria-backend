const express = require("express");
const router = express.Router();

// POST /usuarios/login
router.post("/login", async (req, res) => {
  const db = req.app.locals.db;
  const { email, senha } = req.body;

  try {
    const usuario = await db.get(
      "SELECT * FROM usuarios WHERE email = ? AND senha = ?",
      [email, senha]
    );

    if (!usuario) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    res.json({
      mensagem: "Login realizado com sucesso",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        instituicao_id: usuario.instituicao_id
      }
    });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;