const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/validar-cep', async (req, res) => {
  const { cep } = req.body;

  try {
    if (!cep || cep.length !== 8) {
      return res.status(400).json({ erro: 'CEP deve ter 8 dígitos' });
    }

    // Chama a API do ViaCEP
    const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

    if (response.data.erro) {
      return res.status(404).json({ erro: 'CEP não encontrado' });
    }

    const { logradouro, bairro, localidade, uf, latitude, longitude } = response.data;

    // Retorna as coordenadas ou o que for necessário
    res.json({
      cep,
      logradouro,
      bairro,
      localidade,
      uf,
      latitude, // Se a API retornar
      longitude // Se a API retornar
    });

  } catch (error) {
    console.error('Erro ao validar CEP:', error.message);
    res.status(500).json({ erro: 'Erro interno ao validar CEP' });
  }
});

module.exports = router;