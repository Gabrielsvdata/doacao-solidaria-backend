const express = require("express");
const router = express.Router();

// POST /usuarios/login
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

    const usuario = await db.get(
      "SELECT id, nome, email, senha, instituicao_id FROM usuarios WHERE email = ? AND ativo = 1",
      [email]
    );

    if (!usuario) {
      return res.status(401).json({ 
        sucesso: false,
        erro: "Credenciais inválidas" 
      });
    }

    // Verificar senha com bcrypt
    const senhaCorreta = await validacoes.verificarSenha(senha, usuario.senha);
    
    if (!senhaCorreta) {
      return res.status(401).json({ 
        sucesso: false,
        erro: "Credenciais inválidas" 
      });
    }

    res.json({
      sucesso: true,
      mensagem: "Login realizado com sucesso",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        instituicao_id: usuario.instituicao_id
      },
      token: `token_${usuario.id}_${Date.now()}`
    });

  } catch (error) {
    console.error("Erro em POST /usuarios/login:", error);
    res.status(500).json({ 
      sucesso: false,
      erro: error.message 
    });
  }
});

module.exports = router;