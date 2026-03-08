# Configuração do Ably para o Chat

## 1. Criar conta no Ably

1. Acesse [https://ably.com](https://ably.com)
2. Crie uma conta gratuita
3. Faça login no dashboard

## 2. Obter API Key

1. No dashboard do Ably, vá para "Your Apps"
2. Crie um novo app ou use o app default
3. Copie a API Key (formato: `YOUR_APP_ID:YOUR_API_KEY`)

## 3. Configurar no projeto

1. Abra o arquivo `.env` na raiz do projeto
2. Substitua `your_ably_api_key_here` pela sua API Key real:

```env
# Ably
ABLY_API_KEY=seu_app_id:sua_api_key_aqui
```

## 4. Reiniciar o servidor

```bash
# Pare o servidor atual (Ctrl+C)
# E reinicie para carregar as novas variáveis de ambiente
npm run dev
```

## 5. Testar o Chat

1. Acesse `http://localhost:3000/dashboard/chat`
2. O chat deverá conectar automaticamente ao Ably
3. Teste enviando mensagens entre diferentes usuários

## Alternativa: Usar npx (sem instalar globalmente)

Se preferir não instalar o CLI globalmente, pode usar:

```bash
npx @ably/cli dev
```

## Troubleshooting

### Erro de permissão ao instalar globalmente
Use `npx` em vez de instalar globalmente:

```bash
# Em vez de:
npm install -g @ably/cli

# Use:
npx @ably/cli --help
```

### Chat não conecta
1. Verifique se a API Key está correta no `.env`
2. Reinicie o servidor
3. Verifique o console do navegador por erros

### Mensagens não aparecem em tempo real
1. Verifique a conexão com Ably no console
2. Teste com duas abas/janelas diferentes
3. Verifique se os usuários estão em canais diferentes

## Features Implementadas

- ✅ Mensagens em tempo real
- ✅ Typing indicators
- ✅ Message replies
- ✅ Upload de arquivos
- ✅ Canais diretos e grupos
- ✅ Contagem de não lidas
- ✅ Status online/offline
