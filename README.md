# Aluguel Fácil

Reconstrução do aplicativo **Aluguel Fácil — Mesas, karaokê e fretes**.

O repositório original foi criado em agosto de 2026, mas ficou sem código. Esta reconstrução preserva o fluxo e as regras recuperadas do projeto original.

## Recursos

- Clientes
- Pedidos e agenda
- Estoque por data
- Mesas, cadeiras, karaokê e frete
- Caixa, recebidos, a receber e despesas
- Pagamentos e sinal
- WhatsApp
- Edição e exclusão
- Configurações de preços e estoque
- Backup/importação dos dados
- PWA instalável e funcionamento offline

## Preços-base recuperados

- Mesa: R$ 10,00
- Cadeira: R$ 3,00
- Karaokê: R$ 150,00
- Frete: valor informado em cada pedido

## Dados

Os dados ficam no `localStorage` do aparelho. Use **Configurações → Exportar backup** regularmente.

## Segurança de mudanças

Antes de alterações importantes, preserve a versão anterior na branch `backup-last`.
