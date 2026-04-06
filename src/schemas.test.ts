import { describe, it, expect } from 'vitest';
import { ClientSchema } from './schemas';
import { ClientStatus } from './types';

describe('ClientSchema Validation', () => {
    const validClient = {
        id: '0001',
        razaoSocial: 'Metroflow Teste Ltda',
        cnpj: '12.345.678/0001-90',
        enderecoPrincipal: 'Rua de Teste, 123',
        enderecoColeta: 'Rua de Coleta, 456',
        solicitanteNome: 'João Testador',
        solicitanteEmail: 'joao@teste.com',
        solicitanteContato: '(11) 98888-8888',
        emailFinanceiro: 'financeiro@teste.com',
        emailCertificados: 'qualidade@teste.com',
        retencaoImpostoFonte: false,
        status: ClientStatus.NOT_UPDATED,
        restricaoPagamento: false,
        funcionarioCadastro: 'Sistema',
    };

    it('should validate a correct client object', () => {
        const result = ClientSchema.safeParse(validClient);
        expect(result.success).toBe(true);
    });

    it('should fail if razaoSocial is too short', () => {
        const invalidClient = { ...validClient, razaoSocial: 'Me' };
        const result = ClientSchema.safeParse(invalidClient);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Razão Social deve ter pelo menos 3 caracteres');
        }
    });

    it('should fail if solicitanteEmail is invalid', () => {
        const invalidClient = { ...validClient, solicitanteEmail: 'not-an-email' };
        const result = ClientSchema.safeParse(invalidClient);
        expect(result.success).toBe(false);
    });

    it('should fail if required fields are missing', () => {
        const { razaoSocial, ...incompleteClient } = validClient;
        const result = ClientSchema.safeParse(incompleteClient);
        expect(result.success).toBe(false);
    });
});
