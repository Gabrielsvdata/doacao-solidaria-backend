const express = require("express");
const router = express.Router();

// Lista todas as instituições com horários
router.get("/", async (req, res) => {
  const db = req.app.locals.db;

  try {
    const instituicoes = await db.all(`
      SELECT 
        id,
        nome,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        latitude,
        longitude,
        telefone,
        ativo
      FROM instituicoes
      WHERE ativo = 1
      ORDER BY nome
    `);

    // Enriquecer com horário padrão
    const comHorario = instituicoes.map(inst => ({
      id: inst.id,
      nome: inst.nome,
      endereco: inst.endereco,
      numero: inst.numero,
      complemento: inst.complemento,
      bairro: inst.bairro,
      cidade: inst.cidade,
      estado: inst.estado,
      cep: inst.cep,
      telefone: inst.telefone,
      horario_funcionamento: "08:00 - 18:00",
      localizacao: {
        latitude: inst.latitude,
        longitude: inst.longitude
      }
    }));

    return res.status(200).json({
      sucesso: true,
      total: comHorario.length,
      instituicoes: comHorario
    });

  } catch (erro) {
    console.error("Erro em GET /instituicoes:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar instituições"
    });
  }
});

// Detalhes de uma instituição específica
router.get("/:id", async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  try {
    const instituicao = await db.get(`
      SELECT 
        id,
        nome,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        latitude,
        longitude,
        telefone,
        ativo,
        criada_em
      FROM instituicoes
      WHERE id = ? AND ativo = 1
    `, [id]);

    if (!instituicao) {
      return res.status(404).json({
        sucesso: false,
        erro: "Instituição não encontrada"
      });
    }

    // Buscar estoques desta instituição
    const estoques = await db.all(`
      SELECT 
        e.id,
        e.categoria_id,
        c.nome as categoria,
        e.quantidade_atual,
        e.capacidade_maxima,
        ROUND((e.quantidade_atual / e.capacidade_maxima) * 100, 2) as percentual
      FROM estoques e
      INNER JOIN categorias c ON e.categoria_id = c.id
      WHERE e.instituicao_id = ?
      ORDER BY percentual ASC
    `, [id]);

    // Adicionar status a cada estoque
    const estoqueComStatus = estoques.map(e => {
      let status = "BOM";
      if (e.percentual === 0) status = "FALTA";
      else if (e.percentual < 20) status = "CRÍTICO";
      else if (e.percentual < 50) status = "BAIXO";
      else if (e.percentual < 80) status = "MÉDIO";
      
      return {
        ...e,
        status
      };
    });

    return res.status(200).json({
      sucesso: true,
      instituicao: {
        id: instituicao.id,
        nome: instituicao.nome,
        endereco: instituicao.endereco,
        numero: instituicao.numero,
        complemento: instituicao.complemento,
        bairro: instituicao.bairro,
        cidade: instituicao.cidade,
        estado: instituicao.estado,
        cep: instituicao.cep,
        telefone: instituicao.telefone,
        horario_funcionamento: "08:00 - 18:00",
        localizacao: {
          latitude: instituicao.latitude,
          longitude: instituicao.longitude
        }
      },
      estoques: estoqueComStatus
    });

  } catch (erro) {
    console.error("Erro em GET /instituicoes/:id:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Erro ao buscar instituição"
    });
  }
});

module.exports = router;