const express = require("express");
const { criarBanco, validacoes } = require("./database");

const instituicoesRoutes = require("./routes/instituicoes");
const doadorRoutes = require("./routes/doador");
const adminRoutes = require("./routes/admin");
const usuariosRoutes = require("./routes/usuarios");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

async function startServer() {
  const db = await criarBanco();

  // disponibiliza o banco e validacoes
  app.locals.db = db;
  app.locals.validacoes = validacoes;

  // Rotas principais
  app.use("/doador", doadorRoutes);
  
  // Instituições - Informações públicas
  app.use("/instituicoes", instituicoesRoutes);
  
  // Admin - Gerenciamento completo
  app.use("/admin", adminRoutes);
  
  // Usuários - Autenticação
  app.use("/usuarios", usuariosRoutes);

  // Middleware de erro global - Centraliza tratamento de erros
  app.use((err, req, res, next) => {
    console.error("ERRO:", {
      mensagem: err.message,
      stack: err.stack,
      rota: req.path,
      metodo: req.method,
      timestamp: new Date().toISOString()
    });

    // Erro de validação
    if (err.name === "ValidationError") {
      return res.status(400).json({
        erro: "Dados inválidos",
        detalhes: err.message
      });
    }

    // Erro genérico
    res.status(err.status || 500).json({
      erro: err.message || "Erro interno do servidor",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
  });

  // Rota 404 - Requisições não encontradas
  app.use((req, res) => {
    res.status(404).json({
      erro: "Rota não encontrada",
      metodo: req.method,
      caminho: req.path
    });
  });

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log("\n--- ROTAS DISPONÍVEIS ---\n");
    console.log("DOADOR (Sem autenticação):");
    console.log("  GET    /doador/categorias");
    console.log("  POST   /doador/recomendacao");
    console.log("\nINSTITUIÇÕES (Sem autenticação):");
    console.log("  GET    /instituicoes");
    console.log("  GET    /instituicoes/:id");
    console.log("\nLOGIN:");
    console.log("  POST   /usuarios/login");
    console.log("       { email: 'admin@exemplo.com', senha: 'senha123' }");
    console.log("\nADMIN (Com autenticação):");
    console.log("  GET    /admin/estoque              (listar estoques críticos)");
    console.log("  PUT    /admin/estoque/:id          (atualizar quantidade)");
    console.log("  GET    /admin/analise              (dashboard/gráficos)");
    console.log("  GET    /admin/instituicoes         (listar instituições)");
    console.log("  POST   /admin/instituicoes         (criar instituição)");
    console.log("  DELETE /admin/instituicoes/:id     (deletar instituição)");
    console.log("\n--- FIM DAS ROTAS ---\n");
  });
}

startServer().catch(err => {
  console.error("Erro ao iniciar servidor:", err);
  process.exit(1);
});