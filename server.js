const express = require("express");
const { criarBanco } = require("./database");

const instituicoesRoutes = require("./routes/instituicoes");
const estoquesRoutes = require("./routes/estoques");
const movimentacoesRoutes = require("./routes/movimentacoes");
const usuariosRoutes = require("./routes/usuarios");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

async function startServer() {
  const db = await criarBanco();

  // disponibiliza o banco
  app.locals.db = db;

  // Rotas
  app.use("/instituicoes", instituicoesRoutes);
  app.use("/estoques", estoquesRoutes);
  app.use("/movimentacoes", movimentacoesRoutes);
  app.use("/usuarios", usuariosRoutes);

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

startServer();