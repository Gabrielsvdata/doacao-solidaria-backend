const calcularStatus = (quantidade, capacidade) => {
  const percentual = (quantidade / capacidade) * 100;

  if (percentual === 0) return "FALTA";
  if (percentual <= 20) return "BAIXO";
  if (percentual <= 50) return "MEDIO";
  if (percentual <= 80) return "BOM";
  if (percentual <= 100) return "SUFICIENTE";
  return "EXCESSO";
};

module.exports = { calcularStatus };