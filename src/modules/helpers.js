/**
 * HELPERS
 * Funções auxiliares e utilitários
 */

/**
 * Calcula percentual de ocupação do estoque
 * @param {number} atual - quantidade atual
 * @param {number} capacidade - capacidade máxima
 * @returns {number} percentual arredondado
 */
const calcularPercentual = (atual, capacidade) => {
  if (capacidade <= 0) return 0;
  return Math.round((atual / capacidade) * 100 * 100) / 100; // 2 casas decimais
};

/**
 * Formata resposta padrão de sucesso
 * @param {object} dados - dados a retornar
 * @returns {object} resposta formatada
 */
const respostaSucesso = (dados = {}) => {
  return {
    sucesso: true,
    ...dados
  };
};

/**
 * Formata resposta padrão de erro
 * @param {string} erro - mensagem de erro
 * @returns {object} resposta formatada
 */
const respostaErro = (erro) => {
  return {
    sucesso: false,
    erro
  };
};

module.exports = {
  calcularPercentual,
  respostaSucesso,
  respostaErro
};
