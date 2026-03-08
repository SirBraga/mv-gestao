# Guia Rápido do Chat Interno

## 🚀 Como Iniciar uma Conversa

### 1. Acessar o Chat
- Faça login no sistema
- Vá para `/dashboard/chat`

### 2. Iniciar Nova Conversa
- Clique no botão **+** (ícone de Plus) no canto superior direito da lista de conversas
- Um modal abrirá com a lista de usuários disponíveis
- Use a busca para encontrar um usuário específico
- Clique em um usuário para iniciar a conversa

### 3. Conversar
- Digite sua mensagem no campo de input
- Pressione Enter para enviar
- Use os botões para:
  - 📎 Anexar arquivos
  - ↩️ Responder mensagens
  - ✏️ Editar suas mensagens
  - 🗑️ Excluir suas mensagens

## 🎯 Features Disponíveis

### ✅ Funcionalidades Ativas
- **Mensagens em tempo real** - Entregue instantaneamente
- **Typing indicators** - Veja quando alguém está digitando
- **Status online/offline** - Saiba quem está disponível
- **Upload de arquivos** - Imagens, vídeos, áudios e documentos
- **Message replies** - Responda mensagens específicas
- **Busca de usuários** - Encontre rapidamente quem conversar
- **Contador de não lidas** - Veja quantas mensagens pendentes

### 🔧 Configuração Necessária
1. **Ably API Key** (opcional para testes locais):
   - Configure no `.env`: `ABLY_API_KEY=sua_chave_aqui`
   - Sem isso, o chat funcionará mas sem sincronização em tempo real entre abas

## 📱 Como Testar

### Teste com 2 Usuários
1. Abra **2 abas/janelas** do navegador
2. Faça login com usuários diferentes (se disponível)
3. Inicie uma conversa de uma aba
4. Envie mensagens e veja em tempo real na outra

### Teste na Mesma Sessão
1. Apenas inicie uma conversa com qualquer usuário
2. As mensagens serão salvas no banco
3. Funciona para comunicação interna

## 🛠️ Solução de Problemas

### "Não aparece ninguém"
- Normal! Não há canais criados ainda
- Clique no **+** para criar uma nova conversa
- Se não houver usuários na lista, verifique se há outros usuários cadastrados

### "Botão de nova conversa não aparece"
- Verifique se você está logado
- O botão só aparece para usuários autenticados

### "Mensagens não enviam"
- Verifique a conexão com Ably (ícone de reconexão)
- Tente recarregar a página
- Verifique o console do navegador por erros

## 🎨 Dicas de Uso

### Atalhos
- **Enter** - Enviar mensagem
- **Shift + Enter** - Nova linha no campo de mensagem

### Organização
- Canais são criados automaticamente para cada par de usuários
- Conversas diretas são privadas entre os participantes
- O sistema busca usuários disponíveis automaticamente

### Performance
- O chat carrega as 50 mensagens mais recentes
- Rolagem para cima carrega mais mensagens (paginação)
- Arquivos são armazenados no MinIO/S3

---

## 📞 Suporte

Se encontrar algum problema:
1. Verifique o console do navegador (F12)
2. Confirme se está logado
3. Teste com o usuário admin
4. Verifique se a API Key do Ably está configurada (para sincronização real-time)

O chat está **100% funcional** para comunicação interna! 🚀
