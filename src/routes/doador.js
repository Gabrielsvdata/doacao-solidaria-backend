// routes/doador.js

const express = require("express");
const router = express.Router();

// Retorna as instituicoes que mais precisam de uma categoria especifica
// Busca categoria pelo ID, lista instituicoes ativas ordenadas por menor estoque (LIMIT 3)
// Lógica inteligente: prioriza instituições em situação crítica ou baixa
router.post("/recomendacao", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const { categoria_id } = req.body;

    if (!categoria_id || isNaN(categoria_id)) {
      return res.status(400).json({
        sucesso: false,
        erro: "categoria_id é obrigatório e deve ser um número"
      });
    }

    // Buscar categoria
    const categoria = await db.get(
      "SELECT id, nome FROM categorias WHERE id = ?",
      [categoria_id]
    );

    if (!categoria) {
      return res.status(404).json({
        sucesso: false,
        erro: "Categoria não encontrada"
      });
    }

    // Buscar instituições que precisam dessa categoria com lógica de priorização:
    // 1. Instituições com status CRÍTICO ou FALTA (percentual < 20%)
    // 2. Instituições com status BAIXO (20% <= percentual < 50%)
    // 3. Ordenar por percentual ASC (menor percentual = maior necessidade)
    const recomendacoes = await db.all(`
      SELECT 
        i.id as instituicao_id,
        i.nome as nome_instituicao,
        i.endereco,
        i.numero,
        i.complemento,
        i.bairro,
        i.cidade,
        i.estado,
        i.cep,
        i.telefone,
        i.horario_funcionamento,
        e.quantidade_atual,
        e.capacidade_maxima,
        CASE WHEN e.capacidade_maxima > 0
          THEN ROUND((e.quantidade_atual * 1.0 / e.capacidade_maxima) * 100, 2)
          ELSE 0
        END as percentual
      FROM instituicoes i
      INNER JOIN estoques e ON e.instituicao_id = i.id
      WHERE e.categoria_id = ? AND i.ativo = 1
      ORDER BY percentual ASC
      LIMIT 10
    `, [categoria_id]);

    if (recomendacoes.length === 0) {
      return res.status(404).json({
        sucesso: false,
        erro: "Nenhuma instituição ativa encontrada para esta categoria"
      });
    }

    const { validacoes } = req.app.locals;

    // Enriquecer dados com status e priorizar as que mais precisam
    const recomendacoesComStatus = recomendacoes.map(r => {
      const status = validacoes.obterStatus(r.percentual);
      let prioridade = 0;
      
      // Atribuir pontuação de prioridade
      if (status === "FALTA" || status === "CRÍTICO") {
        prioridade = 3; // Máxima prioridade
      } else if (status === "BAIXO") {
        prioridade = 2; // Média prioridade
      } else if (status === "MÉDIO") {
        prioridade = 1; // Baixa prioridade
      }
      // Status BOM e EXCESSO = prioridade 0 (não recomenda)
      
      return {
        instituicao_id: r.instituicao_id,
        nome: r.nome_instituicao,
        endereco: r.endereco,
        numero: r.numero,
        complemento: r.complemento,
        bairro: r.bairro,
        cidade: r.cidade,
        estado: r.estado,
        cep: r.cep,
        telefone: r.telefone,
        horario_funcionamento: r.horario_funcionamento,
        status_estoque: status,
        percentual_preenchido: r.percentual,
        quantidade_atual: r.quantidade_atual,
        capacidade_maxima: r.capacidade_maxima,
        prioridade: prioridade,
        recomenda: prioridade >= 2 // Recomenda apenas se CRÍTICO ou BAIXO
      };
    });

    // Filtrar instituições por prioridade
    // 1. Recomendadas: CRÍTICO/FALTA/BAIXO (prioridade >= 2)
    const recomendacoesAltas = recomendacoesComStatus
      .filter(r => r.prioridade >= 2)
      .sort((a, b) => b.prioridade - a.prioridade)
      .slice(0, 3);

    // 2. Todas: incluindo BOM e MÉDIO (por categoria de prioridade)
    const todasOrdenadas = recomendacoesComStatus
      .sort((a, b) => {
        // Ordenar por prioridade DESC (maior para menor)
        if (b.prioridade !== a.prioridade) {
          return b.prioridade - a.prioridade;
        }
        // Se mesma prioridade, ordenar por percentual ASC (menor = mais crítico)
        return a.percentual_preenchido - b.percentual_preenchido;
      })
      .slice(0, 10);

    // Remover campos internos (prioridade/recomenda) da resposta
    const mapaResposta = (arr) => arr.map(({ prioridade, recomenda, ...rest }) => rest);

    // Se não houver recomendações prioritárias, retornar apenas as melhores opções
    const resultado = recomendacoesAltas.length > 0 
      ? recomendacoesAltas 
      : todasOrdenadas.slice(0, 3);

    return res.status(200).json({
      sucesso: true,
      categoria: categoria.nome,
      mensagem: `Encontramos ${resultado.length} instituição(ões) que precisam de ${categoria.nome}`,
      recomendacoes: mapaResposta(resultado),
      todas: mapaResposta(todasOrdenadas)
    });

  } catch (erro) {
    console.error("Erro em /doador/recomendacao:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao processar recomendação"
    });
  }
});

// Retorna lista de todas as categorias disponiveis
// SELECT em categorias ordenado por nome
router.get("/categorias", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const categorias = await db.all("SELECT id, nome, unidade_padrao FROM categorias ORDER BY nome");

    return res.status(200).json({
      sucesso: true,
      categorias
    });

  } catch (erro) {
    console.error("Erro em /doador/categorias:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar categorias"
    });
  }
});

module.exports = router;
