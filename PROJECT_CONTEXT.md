# Contexto recuperado — Aluguel Fácil

Este projeto foi reconstruído em 02/10/2026 porque o repositório original existia, mas estava vazio.

## Objetivo
Gerenciar aluguel de mesas, cadeiras, karaokê e fretes em um PWA simples para celular.

## Fluxo original recuperado
- Início com resumo de hoje.
- Botão “+ Novo aluguel ou frete”.
- Cards de Recebido e A receber.
- Estoque disponível por data.
- Navegação: Início, Pedidos, Clientes e Caixa.
- Clientes, pedidos, agenda, pagamentos, despesas, fretes, WhatsApp, edição/exclusão e configurações.
- Dados persistidos localmente no aparelho.
- PWA em tela cheia.

## Preços-base recuperados
- Mesa: R$ 10,00.
- Cadeira: R$ 3,00.
- Karaokê: R$ 150,00.
- Frete: valor definido em cada pedido.

## Regras de manutenção
1. Antes de mudanças importantes, atualizar backup-last com o main anterior.
2. Preservar dados e fluxos que já funcionam.
3. Validar mobile antes de publicar.
4. Não apagar dados do localStorage em atualizações.
5. Pedidos existentes preservam os preços usados quando foram criados.
6. Estoque deve ser calculado por data, descontando reservas em aberto.
7. Mudanças em caixa/pagamentos precisam manter coerência entre total, pago e a receber.

## Arquivos principais
- index.html — estrutura do PWA.
- style.css — visual mobile.
- app.js — regras, dados, pedidos, estoque, clientes, caixa e WhatsApp.
- manifest.webmanifest / sw.js — instalação e offline.
- .github/workflows/pages.yml — publicação pelo GitHub Pages.
