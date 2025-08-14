module.exports = {
    button_reminders: '🔔 Lembrar-me',
    reminders_enabled: 'Lembretes ativados. Se não registrar nada até às 18:00, vou lembrar com um toque de humor 😉',
    reminders_disabled: 'Lembretes desativados. Silêncio total 🤐',
    reminder_sample_variants: [
      'Ei! O fato da sua carteira estar calada não significa que ela esteja feliz. Registre suas despesas 😉',
      'Já gastou algo hoje? Anote antes que a memória vá comprar pão 🧠🥖',
      'Se não registrar, é como se tivesse gastado no vazio. Vamos registrar 💸',
      'Gota a gota, o orçamento vai para o mar. Registre as despesas de hoje 🌊',
      'O bot não reclama, o bot lembra: hora de registrar despesas 😌'
    ],
    reminder_message_title: 'Lembrete',
    reminder_turn_on_off: (enabled) => enabled ? 'Desativar lembretes' : 'Ativar lembretes',
    button_configure_reminder_hours: '⏰ Configurar horários de lembretes',
    reminder_hours_info: 'Selecione até 3 horas para lembretes (seu fuso horário local). Atuais:',
    reminder_hours_limit: 'Você pode selecionar até 3 horas',
    reminder_hours_saved: '✅ Horários de lembretes salvos',
    button_save: 'Salvar',
    button_clear: 'Limpar',
    
    // Suporte de pagamento e políticas
    paysupport_message: '*Suporte de pagamento*\n\nEmpresa: {businessName}\nSuporte: @{supportUsername} / {supportEmail}\n\nTermos: {termsUrl}\nPrivacidade: {privacyUrl}\nReembolsos: {refundPolicyUrl}\n\nPara pagamentos via Stars e reembolsos, contate o suporte primeiro. Cumprimos as políticas do Telegram Stars.',
    terms_message: '📄 Termos de serviço: {termsUrl}',
    privacy_message: '🔐 Política de privacidade: {privacyUrl}',
    refund_message: '↩️ Política de reembolso: {refundPolicyUrl}\n\nDúvidas: @{supportUsername} / {supportEmail}',
    
    // Relatórios de bugs
    button_bug_report: '🐛 Reportar um bug / Sugerir melhoria',
    bug_report_prompt: '🐛 *Reportar um bug ou sugerir uma melhoria*\n\nDescreva o problema ou a sugestão (máx. 1000 caracteres):',
    bug_report_success: '✅ Obrigado! Sua mensagem foi enviada aos desenvolvedores.',
    bug_report_too_long: '❌ Mensagem muito longa! Reduza {excess} caracteres (máximo 1000).',
    bug_report_empty: '❌ Mensagem vazia. Descreva o problema ou sugestão.',
    bug_report_rate_limit: '⚠️ Muitos relatórios!\n\nVocê só pode enviar 3 relatórios a cada 10 minutos',
    bug_report_suspicious: '⚠️ A mensagem contém caracteres não permitidos ou conteúdo suspeito',
    
    // Mensagens de segurança
    security_rate_limit: '⚠️ *Muitas solicitações*\n\nTente novamente em {resetTime} segundos\nLimite: {limit} solicitações por minuto',
    security_validation_error: '⚠️ *Erro de validação*\n\n{message}',
    security_error: '❌ *Erro de segurança*\n\nTente mais tarde ou entre em contato com um administrador.',
    
    // Painel admin
    button_admin: '👑 Painel de administração',
    admin_access_denied: '❌ Você não tem permissão de administrador.',
    admin_panel_title: '👑 *Painel de administrador*\n\nSelecione uma ação:',
    admin_error: '❌ Erro ao executar ação do administrador.',
    
    // Estatísticas admin
    admin_stats_text: `📊 *Estatísticas do bot*
  
  👥 **Usuários:**
  • Total: {totalUsers}
  • Premium: {activePremium}
  • Novos na semana: {newUsersWeek}
  • Novos no mês: {newUsersMonth}
  
  💰 **Despesas:**
  • Total de registros: {totalExpenses}
  • Nesta semana: {expensesWeek}
  • Usuários ativos: {activeUsers}
  
  🐛 **Relatórios de bugs:** {totalBugReports}
  
  💎 **Doações:**
  • Total: {totalDonations}
  • Estrelas recebidas: {totalStars}
  
  ⭐ **Transações premium:** {premiumTransactions}`,
  
    // Lista de usuários admin
    admin_users_title: '👥 *Usuários* (pág. {page}/{totalPages})\n\nTotal: {totalUsers}\n',
    
    // Relatórios de bugs admin
    admin_bug_reports_title: '🐛 *Relatórios de bugs*',
    bug_report_status_new: '🆕 Novos',
    bug_report_status_in_progress: '🔄 Em andamento',
    bug_report_status_resolved: '✅ Resolvidos',
    bug_report_status_closed: '🔒 Fechados',
    
    // Doações admin
    admin_donations_text: `💰 *Estatísticas de doações*
  
  📊 **Resumo:**
  • Doações totais: {totalDonations}
  • Concluídas: {completedDonations}
  • Pendentes: {pendingDonations}
  
  ⭐ **Estrelas:**
  • Total recebido: {totalStars}
  • Média por doação: {avgStars} estrelas`,
  
    // Premium admin
    admin_premium_stats: `⭐ *Estatísticas premium*
  
  📊 **Usuários:**
  • Total premium: {totalPremiumUsers}
  • Ativos agora: {activePremiumUsers}
  
  💳 **Transações:**
  • Total de operações: {totalTransactions}
  • Receita total: {totalRevenue} estrelas`,
  
    // Administradores
    admin_admins_title: '👑 *Administradores* ({count})\n',
    // Busca admin
    admin_search_prompt: '🔍 *Buscar usuário*\n\nDigite o ID ou nome de usuário:',
    admin_search_not_found: '❌ Usuário não encontrado.',
    admin_search_results: '🔍 *Resultados da busca* "{query}"\n\nEncontrados: {count}\n',
    
    // Detalhes do usuário admin
    admin_user_not_found: '❌ Usuário não encontrado.',
    admin_user_details: `👤 *Informações do usuário*
  
  {adminFlag}{premiumFlag} **{firstName}** (@{username})
  🆔 ID: {userId}
  🌐 Idioma: {language}
  💱 Moeda: {currency}
  🕐 Fuso horário: {timezone}
  📅 Registro: {createdAt}
  
  📊 **Estatísticas:**
  • Registros de despesas: {totalExpenses}
  • Valor total: {totalAmount}
  • Relatórios de bugs: {bugReportsCount}
  • Transações: {transactionsCount}`,
  
    // Ações admin
    admin_promote_success: '✅ Usuário {userId} promovido a administrador.',
    admin_demote_success: '✅ Usuário {userId} removido como administrador.',
    admin_cannot_demote_self: '❌ Você não pode remover seus próprios direitos de administrador.',
    admin_grant_premium_options: '⭐ *Conceder premium ao usuário {userId}*\n\nSelecione o período:',
    admin_grant_premium_success: '✅ Premium concedido ao usuário {userId} por {days} dias.',
    admin_revoke_premium_success: '✅ Premium revogado do usuário {userId}.',
  
    // Broadcast admin
    admin_broadcast_prompt: '📢 *Envio em massa*\n\nDigite a mensagem para todos os usuários (máx. 3600 caracteres):',
    admin_broadcast_too_long: '❌ Mensagem muito longa!\n\n📏 Tamanho atual: {current} caracteres\n📏 Máximo: {max}\n📏 Remova: {excess} caracteres',
    admin_broadcast_confirm: '📢 *Confirmar envio em massa*\n\n📝 **Texto da mensagem:**\n{message}\n\n📏 **Tamanho:** {length} caracteres\n\n⚠️ Essa mensagem será enviada para **TODOS** os usuários do bot!',
    admin_broadcast_started: '📢 Envio iniciado...',
    admin_broadcast_result: '📢 *Envio concluído!*\n\n📊 **Estatísticas:**\n• Total de usuários: {total}\n• Enviadas com sucesso: {sent}\n• Erros: {failed}',
    admin_broadcast_header: '🔴🔴🔴 *Notificação!* 🔴🔴🔴',
    
    // Mensagens gerais
    welcome: 'Olá, {name}! 👋',
    main_menu_title: '🏠 *Menu principal*\n\nSelecione uma ação:',
    error: 'Ocorreu um erro 😞',
    unknown_error: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
    not_found: 'Não encontrado',
    error_invalid_description_format: '❌ Formato inválido. Use: valor descrição ou valor categoria descrição',
    expense_save_error: '❌ Erro ao salvar a despesa. Tente novamente.',
    cancel: 'Cancelar',
    back: 'Voltar',
    confirm: 'Confirmar',
    save: 'Salvar',
    
    // Mensagem de início
    start_message: `Olá! 👋 Vou te ajudar a registrar suas despesas e controlar seu orçamento.
  
  *Como adicionar uma despesa:*
  Basta escrever o valor e a descrição:
  -  \`200 compras no supermercado\`
  -  \`1500 almoço no restaurante\`
  -  \`50 transporte\`
  -  \`150,50 café\`
  
  Depois, aparecerá um menu de categorias — escolha a adequada 🏷️
  
  *Comandos principais:*
  /start - reiniciar o bot
  /menu - abrir menu interativo
  /history - últimas entradas do dia
  /stats - estatísticas detalhadas por categoria
  
  /export - baixar dados em CSV
  /undo - desfazer última entrada
  
  *Configurações:*
  /settings - abrir configurações
  /currency - definir moeda padrão
  /timezone - definir fuso horário
  /categories - gerenciar categorias
  
  *Funções extras:*
  /family - orçamento familiar
  /limits - limites e recursos premium
  /help - ajuda detalhada
  
  Comece a registrar suas despesas agora! 💰`,
  help_message: `📋 *Ajuda detalhada de comandos*
  
  *Adicionar despesas:*
  Escreva o valor e a descrição separados por espaço:
  \`200 compras\` - aparecerá um menu de categorias
  \`150,50 café\` - suporta números decimais
  
  *Comandos principais:*
  /start - reinicia o bot e mostra a mensagem de boas-vindas
  /menu - abre o menu interativo com todas as funções
  /history - mostra os registros de hoje
  /stats - estatísticas detalhadas do mês por categoria
  
  /export - baixa todos os dados em formato CSV
  /undo - desfaz o último registro
  
  *Configurações e gestão:*
  /settings - abre o menu principal de configurações
  /currency - altera a moeda padrão (RUB, USD, EUR, KZT, CNY, THB)
  /timezone - ajusta o fuso horário para registro correto
  /categories - gerenciar categorias personalizadas (premium)
  
  *Orçamento familiar:*
  /family - gerenciar grupos familiares e despesas compartilhadas
  - Criar família, convidar membros
  - Despesas e estatísticas comuns
  - Exportar dados familiares
  
  *Recursos premium:*
  /limits - informações sobre limites e premium
  - Categorias personalizadas
  - Estatísticas avançadas
  - Orçamento familiar
  - Suporte prioritário
  
  *Dicas de uso:*
  • Use descrições para melhor compreensão das despesas
  • Confira regularmente as estatísticas com /stats
  • Ajuste o fuso horário
  • Use /menu para acesso rápido
  • Exporte dados com /export para análise
  
  *Edição de despesas:*
  • No /history você pode excluir ou editar registros
  • Botão "👨‍👩‍👧‍👦 Para família" move a despesa para o orçamento familiar
  • Botão "🚫 Do orçamento familiar" retorna para despesas pessoais
  • Só pode editar/excluir as suas próprias despesas
  
  *Lembretes:*
  • O bot lembra de registrar despesas às 18:00 no horário local
  • Somente se não tiver registrado nada no dia
  • Podem ser ativados/desativados nas configurações
  • Máximo de um lembrete por dia
  
  *Suporte:*
  Use /start para voltar ao menu principal, caso precise.
  
  Boa gestão de orçamento! 💰📊`,
  
    // Despesas
    expense_added: '✅ Registrado: {amount} - {description}',
    expense_updated: '✅ Registro atualizado: {amount} - {description}',
    expense_deleted: '✅ Registro excluído: {amount} - {description}',
    no_expenses: 'Nenhum registro para excluir 🤷‍♂️',
    expense_not_found: 'Erro: registro não encontrado.',
    expense_update_error: 'Erro: registro não encontrado ou não atualizado.',
    
    // Estatísticas
    monthly_stats: '💰 *Despesas do mês atual*',
    daily_stats: '💰 *Despesas de hoje*',
    total_spent: 'Gasto: *{amount}*',
    records_count: 'Registros: {count}',
    no_expenses_period: 'Sem despesas neste período.',
    by_categories: 'Por categorias:',
    no_expenses_category: 'Não há despesas nesta categoria no último mês.',
    
    // Categorias
    select_category: 'Escolha uma categoria:',
    amount_label: 'Valor',
    description_label: 'Descrição',
    category_label: 'Categoria',
    expense_added_title: 'Despesa adicionada!',
    no_categories: 'Nenhuma categoria encontrada.',
    category_expenses: 'Despesas na categoria "{category}"',
    no_category_expenses: 'Sem despesas nesta categoria no último mês.',
    
    // Configurações
    settings_title: 'Configurações:',
    currency_select: 'Selecione a moeda padrão:',
    currency_set: 'Moeda definida: {currency}',
    currency_updated: 'Moeda alterada para {currency}',
    button_change_period_start: '📅 Dia de início do período',
    period_start_prompt: 'Digite um dia do mês (1-31) para começar o novo período. Meses curtos usarão o último dia.',
    period_start_invalid: '❌ Número inválido. Digite um número inteiro entre 1 e 31.',
    period_start_set: '✅ Dia de início definido: {day}',
    timezone_setup: `🕐 *Configuração de fuso horário*
  
  Que horas são agora?
  
  *Hora UTC atual:* {utcTime}
  
  Selecione seu horário atual:`,
    timezone_set: '✅ Fuso horário definido: {timezone}',
    // Orçamento familiar
    button_family: '👨‍👩‍👧‍👦 Família',
    family_info: '👨‍👩‍👧‍👦 *Orçamento familiar*\n\nAqui você pode gerenciar as despesas da família com seus entes queridos.',
    family_created: '✅ Família "{name}" criada! Agora você pode convidar membros.',
    family_joined: '✅ Você entrou na família "{name}"!',
    family_left: '✅ Você saiu da família "{name}".',
    family_deleted: '✅ Família "{name}" excluída. Todas as despesas familiares viraram pessoais.',
    family_member_removed: '✅ Membro removido da família.',
    family_member_removed_notification: '❌ Você foi removido da família *{familyName}*.',
    family_cannot_leave_owner: '❌ O proprietário da família não pode sair. Use "Excluir família".',
    
    // Botões do menu familiar
    create_family: '🏠 Criar família',
    join_family: '🔗 Entrar na família',
    invite_member: '➕ Convidar membro',
    leave_family: '🚪 Sair da família',
    delete_family: '🗑️ Excluir família',
    family_members: '👥 Membros da família',
    family_stats: '💰 Despesas do mês',
    family_daily_stats: '💰 Despesas do dia',
    family_add_expense: '💰 Adicionar despesa familiar',
    family_menu: '👨‍👩‍👧‍👦 Menu da família',
    family_cancel: '❌ Cancelar',
    
    // Convites
    invitation_sent: '✅ Convite enviado para @{username}',
    invitation_accepted: '✅ Você aceitou o convite para a família "{name}"!',
    invitation_rejected: '❌ Você recusou o convite para a família "{name}".',
    invitation_not_found: '❌ Convite não encontrado ou expirado.',
    invitation_expired: '❌ Convite expirado.',
    invitation_already_processed: '❌ Convite já processado.',
    
    // Entradas de usuário
    enter_family_name: 'Digite o nome da família (3-50 caracteres):',
    enter_invite_username: 'Digite o nome de usuário (sem @):',
    enter_expense_amount: 'Digite o valor e a descrição da despesa familiar:',
    
    // Erros
    family_name_too_short: '❌ O nome da família deve ter no mínimo 3 caracteres.',
    family_name_too_long: '❌ O nome da família não pode ter mais de 50 caracteres.',
    user_not_found: '❌ Usuário não encontrado.',
    user_already_in_family: '❌ O usuário já está em uma família.',
    user_already_has_invitation: '❌ O usuário já tem um convite ativo.',
    user_already_in_other_family: '❌ O usuário já está em outra família.',
    user_already_in_your_family: '❌ O usuário já é membro da sua família.',
    user_not_premium: '❌ O usuário não possui status premium.',
    only_owner_can_invite: '❌ Somente o proprietário pode convidar membros.',
    active_invitations: '📋 Convites ativos',
    no_active_invitations: '📋 Você não possui convites ativos.',
    active_invitations_list: '📋 Lista de convites ativos:',
    cancel_invitation: '❌ Cancelar convite',
    invitation_cancelled: '✅ Convite cancelado.',
    not_authorized: '❌ Você não tem permissão para esta ação.',
    invitation_code: '🔑 Código do convite: `{code}`',
    family_invitation_received: '🎉 Você foi convidado para a família *{familyName}*\n\n👤 Convidado por: {inviterName}\n🔑 Código: `{inviteCode}`\n\nEscolha uma ação:',
    accept_invitation: '✅ Aceitar',
    reject_invitation: '❌ Recusar',
    invitation_accepted: '🎉 Parabéns! Você entrou na família *{familyName}*',
    invitation_rejected: '❌ Você recusou o convite para a família',
    invitation_not_pending: '❌ O convite não está pendente',
    invitation_cancelled_notification: '❌ O convite para a família *{familyName}* foi cancelado por {cancelledBy}',
    enter_invite_code: '🔑 Digite o código do convite:',
    only_owner_can_remove: '❌ Apenas o proprietário pode remover membros.',
    only_owner_can_delete: '❌ Apenas o proprietário pode excluir a família.',
    cannot_remove_owner: '❌ Não é possível remover o proprietário.',
    cannot_remove_yourself: '❌ Você não pode se remover.',
    family_not_found: '❌ Família não encontrada.',
    not_family_member: '❌ Você não é membro desta família.',
    not_family_owner: '❌ Você não é o proprietário da família.',
    
    // Confirmações
    confirm_delete_family: '⚠️ *Exclusão da família*\n\nTodos os membros serão removidos e as despesas familiares voltarão a ser pessoais.\n\nTem certeza?',
    confirm_remove_member: '⚠️ *Remover membro*\n\nO membro será removido da família.\n\nTem certeza?',
    // Estatísticas família
    family_monthly_stats: '👨‍👩‍👧‍👦 *Despesas familiares do mês*',
    family_daily_stats: '💰 Despesas do dia',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *Despesas familiares do dia*',
    family_export: '📊 Exportar dados familiares',
    family_total_spent: 'Gasto: *{amount}*',
    family_members_count: 'Membros: {count}',
    family_no_expenses: 'Nenhuma despesa familiar neste período.',
    
    // Lista de membros
    family_members_title: '👥 *Membros da família*',
    family_member_info: '• {name} ({role}) - entrou em {date}',
    family_owner_role: 'proprietário',
    family_member_role: 'membro',
    remove_member: '❌ Remover',
    confirm_remove_member: '⚠️ *Remover membro*\n\nTem certeza de que deseja remover {name} da família?',
    member_removed: '✅ {name} foi removido da família.',
    member_removed_notification: '❌ Você foi removido da família *{familyName}* por {ownerName}.',
    
    // Funções premium
    premium_required: '❌ Este recurso está disponível apenas para usuários premium.',
    upgrade_to_premium: '💎 Atualize para premium para acessar o orçamento familiar!',
    
    timezone_updated: `✅ *Fuso horário atualizado!*
  
  🕐 Horário escolhido: *{time}*
  🌍 Fuso horário: *{timezone}*
  
  Agora todas as suas despesas serão exibidas no horário local.`,
    timezone_updated_simple: `✅ *Fuso horário atualizado!*
  
  🌍 Novo fuso horário: *{timezone}*
  
  Agora todas as suas despesas aparecerão corretamente no horário local.`,
    
    // Limites
    limits_title: '📊 *Informações de limites*',
    status_regular: '👤 Padrão',
    status_premium: '💎 Premium',
    status_label: '*Status:* {status}',
    records_usage: '<b>Registros:</b> {current}/{max} ({percentage}%)',
    records_remaining: '<b>Restantes:</b> {remaining} registros',
    max_description_length: '<b>Comprimento máx. da descrição:</b> {length} caracteres',
    near_limit_warning: '⚠️ *Atenção:* Você está próximo do limite de registros!',
    limit_reached: '❌ *Limite de registros atingido!*',
    premium_benefits: `💎 <b>Vantagens premium:</b>
  • 160 caracteres na descrição (em vez de 80)
  • 300 registros (em vez de 100)
  • Até 5 categorias próprias
  • Estatísticas avançadas
  • Orçamento familiar
  • Possibilidade de editar e excluir quaisquer registros (não apenas o último)`,
    
    // Assinatura premium
    premium_subscription_title: '⭐️ Assinatura',
    premium_status_header: '<b>Seu status:</b>',
    premium_privileges: 'Privilégios: {status}',
    premium_limits_info: 'Aqui você vê seus limites: número de categorias, registros, acesso familiar, validade da assinatura premium.',
    premium_menu_title: '<b>Menu:</b>',
    premium_tariff_button: '⭐️ Tarifa',
    premium_why_paid_button: '👀 Por que é pago?',
    premium_donate_button: '🤝 Doar',
    premium_back_button: '⬅️ Voltar',
    premium_tariffs_title: '⭐️ Tarifas (Telegram Stars)',
    premium_payment_info: '💳 Pagamento via Telegram Stars — a moeda interna do Telegram. <b>Sem renovação automática.</b>',
    premium_renewal_info: '📅 Pode renovar a qualquer momento. O tempo será somado ao restante.',
    premium_stars_info: '💡 Compre estrelas sem taxa pelo bot oficial [@PremiumBot].',
    premium_why_paid_title: '👀 Por que é pago?',
    premium_purchases_button: '🧾 Histórico de compras',
    purchases_header: '🧾 Histórico de compras',
    purchases_premium_title: 'Premium',
    purchases_donations_title: 'Doações',
    no_purchases: 'Ainda não há compras',
    purchases_prev_button: '◀ Anterior',
    purchases_next_button: 'Seguinte ▶',
    purchases_page_indicator: 'Página {page}/{total}',
    no_purchases: 'Ainda não há compras',
    purchases_prev_button: '◀ Anterior',
    purchases_next_button: 'Próximo ▶',
    purchases_page_indicator: 'Página {page}/{total}',
    premium_why_paid_text: 'Manter o servidor deste bot custa cerca de $200 por mês, sem contar o crescente número de usuários. E como desenvolvedor, também preciso comer para ter forças de melhorar o serviço :)',
    premium_payment_title: '💳 *Pagamento de assinatura premium*',
    premium_payment_description: 'Você escolheu: <b>{duration}</b>\nPreço: <b>{stars} ⭐️</b>\n\nClique no botão abaixo para pagar com Telegram Stars.',
    // Rótulos de tarifas e nome do produto
    tariff_button_30: '1 Mês',
    tariff_button_90: '3 Meses',
    tariff_button_180: '6 Meses',
    tariff_button_365: '1 Ano',
    tariff_item_30: '1 mês (30 dias)',
    tariff_item_90: '3 meses (90 dias)',
    tariff_item_180: '6 meses (180 dias)',
    tariff_item_365: '12 meses (365 dias)',
    premium_product: 'Assinatura premium',
    discount_save: 'economize {percent}% ',
  
    payment_success: '🎉 *Pagamento realizado com sucesso!*\n\nSua assinatura premium foi ativada. Aproveite todos os recursos avançados.',
    donation_success: '🙏 *Obrigado pelo apoio!*\n\nSua doação ajuda a desenvolver o bot.',
    general_payment_success: '✅ *Pagamento confirmado!*\n\nObrigado por usar nosso bot.',
    premium_expires: '📅 Premium válido até: <b>{date}</b>\n⏰ Dias restantes: <b>{days}</b>',
  
    // Doações
    donate_prompt_title: '🤝 Apoiar o projeto',
    donate_prompt_text: 'Digite a quantidade de estrelas (1 a 2500) que deseja doar.\nVocê pode incluir uma mensagem de até 500 caracteres na linha seguinte.',
    donate_invalid: '❌ Digite um número inteiro de 1 a 2500. Mensagem máx.: 500 caracteres.',
    donate_created: '✅ Pedido de doação criado: {stars} ⭐️. Vou enviar o link para pagamento.',
    donate_paid: '🙏 Obrigado pelo apoio! Doação recebida: {stars} ⭐️',
    
    // Erros de validação
    error_too_long_regular: '❌ Descrição muito longa! Máx. 80 caracteres para usuários padrão.',
    error_too_long_premium: '❌ Descrição muito longa! Máx. 160 caracteres para premium.',
    error_no_description: '❌ É necessário informar uma descrição após o valor.',
    error_amount: '❌ Valor inválido. Digite um número entre 0.01 e 999999.',
    error_format: '❌ Formato não reconhecido. Escreva valor e descrição.\nEx.: `200 compras` ou `1500 almoço no café`',
    error_limit_reached: '❌ Limite atingido!\nUsuários padrão: 100 registros\nPremium: 300 registros\n\n💎 Atualize para premium para aumentar o limite!',
    error_premium_required: '💎 Este recurso é apenas para usuários premium!\n\nVantagens:\n• 160 caracteres na descrição\n• 300 registros\n• Categorias personalizadas\n• Estatísticas avançadas',
    error_generic: '❌ Ocorreu um erro. Tente mais tarde ou contate o administrador.',
    
    // Botões
    button_menu: '📋 Menu',
    button_expenses_month: '💰 Despesas do mês',
    button_expenses_day: '💰 Despesas do dia',
    button_expenses_categories: '💰 Despesas por categoria',
    button_family: '👨‍👩‍👧‍👦 Família',
    button_settings: '⚙️ Configurações',
    button_delete_last: '🗑️ Excluir último registro',
    button_limits: '📊 Limites',
    button_help: '❓ Ajuda',
    button_edit: 'Editar',
    button_delete: 'Excluir',
    button_mark_as_family: '👨‍👩‍👧‍👦 Para família',
    button_remove_from_family: '🚫 Do orçamento familiar',
    expense_already_family: '❌ Esta despesa já é familiar',
    expense_converted_to_family: '✅ Despesa movida para orçamento familiar',
    expense_removed_from_family: '✅ Despesa removida do orçamento familiar',
    not_owner: '❌ Você não é o autor desta despesa',
    button_cancel: '❌ Cancelar',
    button_back: '⬅️ Voltar',
    button_change_currency: '💱 Trocar moeda',
    button_change_timezone: '🌍 Fuso horário',
    button_change_language: '🌐 Idioma',
    button_custom_categories: '🏷️ Categorias personalizadas',
    
    // Idiomas
    language_select: '🌍 Escolha o idioma:',
    language_set: '✅ Idioma alterado para português',
    language_not_supported: '❌ Idioma não suportado',
    language_change_error: '❌ Erro ao alterar idioma',
    timezone_error: '❌ Erro ao definir fuso horário',
    
    // Exportação
    export_success: '📊 Dados exportados com sucesso!',
    export_error: 'Erro ao exportar dados 😞',
    keyboard_updated: '✅ Teclado atualizado para seu idioma!',
    
    // Edição
    edit_canceled: 'Edição cancelada.',
    edit_no_active: 'Nenhuma edição ativa.',
    edit_instructions: 'Digite novo valor e/ou descrição (ex.: 500 café) ou clique em cancelar.',
    edit_empty: 'Digite o valor, a descrição ou ambos.',
    edit_amount_error: 'Valor inválido.',
    edit_too_long: 'Descrição muito longa (máx. {max} caracteres).',
    edit_format_error: 'Formato inválido.',
    
    // Respostas de callback
    callback_limit_reached: '❌ Limite de registros atingido',
    callback_button_not_found: '❌ Erro: botão não encontrado',
    callback_data_not_found: '❌ Erro: dados não encontrados',
    callback_expense_added: '✅ Adicionado à categoria "{category}"',
    callback_expense_saved: '❌ Erro ao salvar',
    callback_canceled: '❌ Cancelado',
    callback_expense_canceled: '❌ Inclusão de despesa cancelada',
    callback_deleted: 'Registro excluído!',
    callback_delete_error: 'Erro ao excluir ou registro não encontrado',
    callback_edit_mode: 'Saindo do modo de edição:',
    callback_no_cards: 'Nenhum registro encontrado... ocorreu um erro',
    
      // Categorias padrão
  category_food: 'Comida',
  category_transport: 'Transporte',
  category_entertainment: 'Entretenimento',
  category_shopping: 'Compras',
  category_health: 'Saúde',
  category_other: 'Outros',
  
  // Exportação CSV
  date_label: 'Data',
  currency_label: 'Moeda',
  total_by_currencies: 'Total por moedas:',
  total_in_currency: 'Total em {currency}',
    
    // Categorias personalizadas (premium)
    custom_categories_title: '🏷️ Categorias personalizadas',
    custom_categories_info: 'Aqui você pode criar suas próprias categorias de despesa (apenas para premium).',
    custom_categories_add: '➕ Adicionar categoria',
    custom_categories_manage: '🗂️ Gerenciar categorias',
    custom_categories_enter_name: 'Digite o nome da nova categoria (1-30 caracteres):',
    custom_categories_created: '✅ Categoria criada: {name}',
    custom_categories_exists: '❌ Esta categoria já existe.',
    custom_categories_limit_reached: '❌ Limite de categorias personalizadas atingido: {max}',
    custom_categories_list_empty: 'Você não tem categorias personalizadas.',
    custom_categories_list_title: 'Suas categorias personalizadas:',
    custom_categories_delete: '🗑️ Excluir',
    custom_categories_deleted: '✅ Categoria excluída.',
    custom_categories_premium_required: '💎 Este recurso está disponível apenas para usuários premium.'
};
