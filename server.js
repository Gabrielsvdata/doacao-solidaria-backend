// Arquivo raiz que inicia o servidor
// Necessário para evitar problemas de path em deployments (Render, Heroku, etc)

require('./src/server');
const express = require("express");
const cors = require("cors");
const { criarBanco, validacoes, mensagens } = require("./database");

const instituicoesRoutes = require("./routes/instituicoes");
const doadorRoutes = require("./routes/doador");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

async function startServer() {
  const db = await criarBanco();

  // disponibiliza o banco, validacoes e mensagens
  app.locals.db = db;
  app.locals.validacoes = validacoes;
  app.locals.mensagens = mensagens;

  // Rotas principais
  app.use("/doador", doadorRoutes);
  
  // Instituições - Informações públicas
  app.use("/instituicoes", instituicoesRoutes);
  
  // Admin - Gerenciamento completo
  app.use("/admin", adminRoutes);

  app.use((err, req, res, next) => {
    console.error("Erro:", err.message);

    res.status(err.status || 500).json({
      sucesso: false,
      erro: err.message || "Erro interno do servidor"
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      sucesso: false,
      erro: "Rota não encontrada"
    });
  });

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log("\n========================================");
    console.log("      ROTAS DO SISTEMA DISPONÍVEIS");
    console.log("========================================\n");
    
    console.log("DOADOR (Sem autenticação):");
    console.log("  GET    /doador/categorias");
    console.log("  POST   /doador/recomendacao");
    
    console.log("\nINSTITUIÇÕES (Sem autenticação):");
    console.log("  GET    /instituicoes/:id");
    
    console.log("\nADMIN - Autenticação:");
    console.log("  POST   /admin/login");
    console.log("       Body: { email: 'admin@exemplo.com', senha: 'senha123' }");
    
    console.log("\nADMIN - Estoques:");
    console.log("  GET    /admin/estoque              (listar todos os estoques)");
    console.log("  PUT    /admin/estoque/:id          (atualizar quantidade)");
    
    console.log("\nADMIN - Análise e Dashboard:");
    console.log("  GET    /admin/analise              (dashboard geral)");
    
    console.log("\nADMIN - Gerenciamento de Instituições:");
    console.log("  GET    /admin/instituicoes         (listar todas)");
    console.log("  POST   /admin/instituicoes         (criar nova)");
    console.log("  DELETE /admin/instituicoes/:id     (deletar/desativar)");
    
    console.log("\nADMIN - Gerenciamento de Usuários:");
    console.log("  GET    /admin/usuarios             (listar todos)");
    console.log("  POST   /admin/usuarios             (cadastrar novo)");
    console.log("  PUT    /admin/usuarios/:id         (ativar/desativar)");
    console.log("  DELETE /admin/usuarios/:id         (deletar)");
    
    console.log("\nADMIN - Recebimentos (Entrada de Doações):");
    console.log("  GET    /Doações Recebidas:ções registradas)");
    
    console.log("\nADMIN - Distribuições (Saída de Doações):");
    console.log("  POST   /admin/distribuicoes        (registrar distribuição)");
    console.log("  GET    /admin/distribuicoes        (listar histórico)");
    console.log("  GET    /admin/distribuicoes-carregamento (dados para formulário)");
    
    console.log("\n========================================\n");
  });
}

startServer().catch(err => {
  console.error("Erro ao iniciar servidor:", err);
  process.exit(1);
});