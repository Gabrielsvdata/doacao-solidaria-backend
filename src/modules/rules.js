const bcryptjs = require("bcryptjs");

/**
 * VALIDAÇÕES
 * Funções de validação e segurança
 */
const validacoes = {
  normalizarTelefone: (telefone) => {
    return telefone.replace(/\D/g, '');
  },

  validarTelefone: (telefone) => {
    return telefone.length >= 10 && telefone.length <= 11;
  },

  hashSenha: async (senha) => {
    const salt = await bcryptjs.genSalt(10);
    return bcryptjs.hash(senha, salt);
  },

  verificarSenha: async (senha, hash) => {
    return bcryptjs.compare(senha, hash);
  },

  obterStatus: (percentual) => {
    if (percentual === 0) return "FALTA";
    if (percentual < 20) return "CRÍTICO";
    if (percentual < 50) return "BAIXO";
    if (percentual < 80) return "MÉDIO";
    if (percentual <= 100) return "BOM";
    return "EXCESSO";
  }
};

/**
 * MENSAGENS
 * Mensagens contextualizadas do sistema
 */
const mensagens = {
  // Recomendação para doador
  recomendacao: (qtd, categoria) => 
    `Encontramos ${qtd} instituição(ões) que precisam de ${categoria}`,
  
  // Entrada de doação
  estoque_entrada: (categoria, quantidade, instituicao) =>
    `Entrada de ${quantidade} unidades de ${categoria} registrada em ${instituicao} com sucesso`,
  
  estoque_entrada_com_doador: (categoria, quantidade, instituicao, doador_nome) =>
    `Doação de ${quantidade} unidades de ${categoria} de ${doador_nome} recebida por ${instituicao}`,
  
  // Saída/distribuição
  estoque_saida: (categoria, quantidade, instituicao) =>
    `Saída de ${quantidade} unidades de ${categoria} de ${instituicao} registrada`,
  
  // Distribuições por tipo
  distribuicao_familia: (categoria, quantidade, beneficiario_nome) =>
    `${quantidade} unidades de ${categoria} distribuídas para ${beneficiario_nome}`,
  
  distribuicao_instituicao: (categoria, quantidade, instituicao_destino) =>
    `${quantidade} unidades de ${categoria} transferidas para ${instituicao_destino}`,
  
  distribuicao_descarte: (categoria, quantidade) =>
    `${quantidade} unidades de ${categoria} descartadas do sistema`,
  
  distribuicao_transferencia: (categoria, quantidade, origem, destino) =>
    `Transferência de ${quantidade} unidades de ${categoria}: ${origem} → ${destino}`,
  
  // Status e criticidade
  criticidade: (status, categoria, instituicao) => {
    const avisos = {
      "FALTA": `🚨 ALERTA: ${instituicao} está SEM estoque de ${categoria}. Doação urgente necessária!`,
      "CRÍTICO": `⚠️ CRÍTICO: ${instituicao} tem criticidade alta de ${categoria}. Doação importante!`,
      "BAIXO": `⚠️ AVISO: Nível baixo de ${categoria} em ${instituicao}. Doação bem-vinda!`,
      "MÉDIO": `ℹ️ ${instituicao} tem ${categoria} em nível médio. Toda ajuda é bem-vinda!`,
      "BOM": `✅ ${instituicao} tem bom estoque de ${categoria} no momento`,
      "EXCESSO": `📦 ${instituicao} tem excesso de ${categoria}. Foco em outras categorias!`
    };
    return avisos[status] || "Status desconhecido";
  },
  
  // Mensagens de sucesso genéricas
  sucesso_criacao: (tipo, nome) =>
    `${tipo} "${nome}" criado com sucesso`,
  
  sucesso_atualizacao: (tipo, nome) =>
    `${tipo} "${nome}" atualizado com sucesso`,
  
  sucesso_delecao: (tipo, nome) =>
    `${tipo} "${nome}" deletado com sucesso`,
  
  sucesso_ativacao: (tipo, nome, ativo) =>
    ativo ? `${tipo} "${nome}" ativado com sucesso` : `${tipo} "${nome}" desativado com sucesso`
};

module.exports = { validacoes, mensagens };
