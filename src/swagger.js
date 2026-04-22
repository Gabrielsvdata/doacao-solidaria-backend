// swagger.js - Configuração da documentação Swagger/OpenAPI

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Doação Solidária API',
      version: '1.0.0',
      description: 'Sistema de recomendação de doações em cenários de enchentes/crises humanitárias',
      contact: {
        name: 'Suporte Doação Solidária',
        email: 'suporte@doacao-solidaria.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://api.doacao-solidaria.com',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      schemas: {
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nome: { type: 'string' },
            email: { type: 'string', format: 'email' },
            instituicao_id: { type: 'integer', nullable: true },
            ativo: { type: 'integer', enum: [0, 1] },
            criada_em: { type: 'string', format: 'date-time' },
            atualizada_em: { type: 'string', format: 'date-time' }
          }
        },
        Instituicao: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nome: { type: 'string' },
            endereco: { type: 'string' },
            numero: { type: 'string' },
            complemento: { type: 'string' },
            bairro: { type: 'string' },
            cidade: { type: 'string' },
            estado: { type: 'string' },
            cep: { type: 'string' },
            telefone: { type: 'string' },
            horario_funcionamento: { type: 'string' },
            ativo: { type: 'integer', enum: [0, 1] },
            total_estoque: { type: 'integer' },
            criada_em: { type: 'string', format: 'date-time' }
          }
        },
        Estoque: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            instituicao_id: { type: 'integer' },
            categoria_id: { type: 'integer' },
            quantidade_atual: { type: 'integer' },
            capacidade_maxima: { type: 'integer' },
            percentual_preenchido: { type: 'number' },
            status_estoque: { type: 'string', enum: ['FALTA', 'BAIXO', 'MÉDIO', 'BOM', 'SUFICIENTE', 'EXCESSO'] },
            atualizada_em: { type: 'string', format: 'date-time' }
          }
        },
        Resposta: {
          type: 'object',
          properties: {
            sucesso: { type: 'boolean' },
            mensagem: { type: 'string' },
            erro: { type: 'string' }
          }
        },
        RespostaComDados: {
          allOf: [
            { '$ref': '#/components/schemas/Resposta' },
            {
              type: 'object',
              properties: {
                dados: { type: 'object' }
              }
            }
          ]
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      {
        name: 'Admin - Autenticação',
        description: 'Endpoints de autenticação administrativa'
      },
      {
        name: 'Admin - Usuários',
        description: 'Gerenciamento de usuários administrativos'
      },
      {
        name: 'Admin - Instituições',
        description: 'Gerenciamento de instituições beneficiárias'
      },
      {
        name: 'Admin - Estoques',
        description: 'Gerenciamento e monitoramento de estoques'
      },
      {
        name: 'Admin - Doações',
        description: 'Histórico de doações recebidas'
      },
      {
        name: 'Admin - Distribuições',
        description: 'Distribuição de doações para beneficiários'
      },
      {
        name: 'Admin - Análise',
        description: 'Dashboard e análises operacionais'
      },
      {
        name: 'Doador',
        description: 'Endpoints públicos para doadores'
      },
      {
        name: 'Instituições',
        description: 'Endpoints públicos sobre instituições'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/server.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
