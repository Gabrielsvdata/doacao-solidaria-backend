// services/estoqueService.js

const { calcularDistancia } = require("../integrations/localizacao");

// ======================================
// CALCULAR STATUS DO ESTOQUE
// ======================================
function calcularStatus(quantidade, capacidade) {
  const percentual = (quantidade / capacidade) * 100;

  if (percentual === 0) return "FALTA";
  if (percentual <= 20) return "BAIXO";
  if (percentual <= 50) return "MÉDIO";
  if (percentual <= 80) return "BOM";
  if (percentual <= 100) return "SUFICIENTE";
  return "EXCESSO";
}

// ======================================
// PESO DO STATUS (URGÊNCIA)
// ======================================
function pesoStatus(status) {
  if (status === "FALTA") return 3;
  if (status === "BAIXO") return 2;
  return 1;
}

// ======================================
// GERAR MOTIVO DA RECOMENDAÇÃO
// ======================================
function gerarMotivo(status, distancia) {
  return `Esta instituição está com status ${status} e fica a ${distancia.toFixed(2)} km de você.`;
}

// ======================================
// RECOMENDAR INSTITUIÇÕES
// ======================================
function recomendar(dados, categoria, latUser, lonUser) {
  return dados
    // Filtra pela categoria escolhida
    .filter(item => item.categoria_nome === categoria)

    // Calcula status e distância
    .map(item => {
      const status = calcularStatus(
        item.quantidade_atual,
        item.capacidade_maxima
      );

      const distancia = calcularDistancia(
        latUser,
        lonUser,
        item.latitude,
        item.longitude
      );

      return {
        ...item,
        status,
        distancia,
        motivo: gerarMotivo(status, distancia)
      };
    })

    // Filtra apenas os que precisam
    .filter(item => item.status === "FALTA" || item.status === "BAIXO")

    // Ordena por prioridade (urgência + proximidade)
    .sort((a, b) => {
      const pesoA = pesoStatus(a.status);
      const pesoB = pesoStatus(b.status);

      // prioridade por status
      if (pesoA !== pesoB) {
        return pesoB - pesoA;
      }

      // depois por distância
      return a.distancia - b.distancia;
    })

    // Limita a 3 resultados
    .slice(0, 3);
}

module.exports = {
  calcularStatus,
  recomendar
};