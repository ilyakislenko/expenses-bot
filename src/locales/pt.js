module.exports = {
    button_reminders: '🔔 Lembrar-me',
    reminders_enabled: '🔔 Lembretes ativados',
    reminders_disabled: 'Lembretes desativados. Silêncio total 🤐',
    reminder_sample_variants: [
      '👋 Ei! Se a sua carteira está silenciosa, não quer dizer que esteja feliz. Registre seus gastos 😉',
'🤔 Já gastou algo hoje? Anote antes que a memória saia para comprar pão 🧠🥖',
'💭 Se você não registrou — considere gasto no vazio. Vamos lançar isso 💸',
'🌊 Gota a gota, o orçamento vai embora sem perceber. Melhor anotar as despesas de hoje 🌊',
'🤖 O bot não reclama, só lembra: é hora de registrar as despesas 😌',
'💡 Cuide dos centavos — o real se preserva. Hora de fazer uma nota!',

'💰 O dinheiro ama contagem e silêncio. Registre seus gastos.',

'💡 Não gaste à toa — poupe para o que importa. Hora de fazer um registro.',

'🏗️ Pequenas economias — grandes resultados. Adicione uma compra agora.',

'🌱 Economize hoje — respire mais leve amanhã. Registre seus gastos.',

'🔄 Real bem guardado traz dois. Lance uma despesa em um minuto.',

'⏰ Primeiro poupe — depois gaste. Hora de fazer uma nota!',

'🧱 Cada centavo é um tijolo de liberdade. Registre uma despesa.',

'🛡️ Poupe com antecedência para dias de chuva. Adicione um registro agora.',

'📈 Gastar com inteligência é o melhor investimento. Registre a compra.',

'🎯 Controle de gastos = menos preocupações. Registre seus gastos.',

'🚀 Menos impulsos — mais oportunidades. Hora de fazer um registro.',

'💎 Pague a si mesmo primeiro. Adicione uma despesa no bot.',

'✂️ Despesa desnecessária cortada = renda conquistada. Registre a compra.',

'🎪 Orçamento é liberdade de escolha. Registre as despesas de hoje.',

'🌟 Poupança é um “sim” ao seu futuro. Hora de fazer uma nota!',

'⚡ Disciplina vence o caos. Registre a despesa.',

'⏳ O dinheiro vai embora em silêncio — registre a tempo. Adicione uma despesa agora.',

'🧘 Frugalidade é o caminho para a tranquilidade. Registre a compra.',

'📋 O dinheiro gosta de ordem. Hora de fazer um registro.'
    ],
    reminder_message_title: 'Lembrete',
    reminder_hours_info: 'Selecione até 3 horas para lembretes (seu fuso horário local). Atuais:',
    reminder_hours_limit: 'Você pode selecionar até 3 horas',
    reminder_hours_saved: '✅ Horários de lembretes salvos',
    button_save: 'Salvar',
    button_clear: 'Limpar',
    
    // Suporte de pagamento e políticas
    paysupport_message: 'Suporte de pagamento\n\nEmpresa: {businessName}\nSuporte: @{supportUsername} / {supportEmail}\n\nTermos: {termsUrl}\nPrivacidade: {privacyUrl}\nReembolsos: {refundPolicyUrl}\n\nPara pagamentos via Stars e reembolsos, contate o suporte primeiro. Cumprimos as políticas do Telegram Stars.',
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
    security_error: '❌ *Erro de segurança*\n\nTente mais tarde ou entre em contato com um administrador.',
    
    // Painel admin
    button_admin: '👑 Painel de administração',
    admin_access_denied: '❌ Você não tem permissão de administrador.',
    admin_panel_title: '👑 *Painel de administrador*\n\nSelecione uma ação:',
    admin_error: '❌ Erro ao executar ação do administrador.',
    
    // Estatísticas admin
    admin_stats_text: `📊 *Estatísticas do bot*

👥 *Usuários:*
• Total: {totalUsers}
• Premium: {activePremium}
• Novos na semana: {newUsersWeek}
• Novos no mês: {newUsersMonth}

💰 *Despesas:*
• Total de registros: {totalExpenses}
• Nesta semana: {expensesWeek}
• Usuários ativos: {activeUsers}

🐛 *Relatórios de bugs:* {totalBugReports}

💎 *Doações:*
• Total: {totalDonations}
• Estrelas recebidas: {totalStars}

⭐ *Transações premium:* {premiumTransactions}`,
  
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

📊 *Resumo:*
• Doações totais: {totalDonations}
• Concluídas: {completedDonations}
• Pendentes: {pendingDonations}

⭐ *Estrelas:*
• Total recebido: {totalStars}
• Média por doação: {avgStars} estrelas`,
  
    // Premium admin
    admin_premium_stats: `⭐ *Estatísticas premium*

📊 *Usuários:*
• Total premium: {totalPremiumUsers}
• Ativos agora: {activePremiumUsers}

💳 *Transações:*
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

{adminFlag}{premiumFlag} {firstName} (@{username})
🆔 ID: {userId}
🌐 Idioma: {language}
💱 Moeda: {currency}
🕐 Fuso horário: {timezone}
📅 Registro: {createdAt}

📊 *Estatísticas:*
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
    admin_broadcast_confirm: '📢 Confirmar envio em massa\n\n📝 Texto da mensagem:\n{message}\n\n📏 Tamanho: {length} caracteres\n\n⚠️ Essa mensagem será enviada para TODOS os usuários do bot!',
    admin_broadcast_started: '📢 Envio iniciado...',
    admin_broadcast_result: '📢 *Envio concluído!*\n\n📊 *Estatísticas:*\n• Total de usuários: {total}\n• Enviadas com sucesso: {sent}\n• Erros: {failed}',
    admin_broadcast_header: '🔴🔴🔴 Notificação! 🔴🔴🔴',
    
    // Mensagens gerais
    error: 'Ocorreu um erro 😞',
    not_found: 'Não encontrado',
    expense_save_error: '❌ Erro ao salvar a despesa. Tente novamente.',
    cancel: 'Cancelar',
    back: 'Voltar',
    confirm: 'Confirmar',
    
    // Mensagem de início
    start_message: `Olá! 👋 Vou te ajudar a registrar suas despesas e receitas.

*Despesa* — basta escrever o valor e a descrição: \`250 café\`, \`1500 almoço\`.
Outra moeda também funciona: \`20 USD táxi\`, ou só um valor: \`300\`.
*Receita* — com um mais: \`+50000 salário\`.

Escolha uma categoria uma vez — vou lembrar dela na próxima.
O menu fica embaixo: resumo do mês, registros de hoje, receitas, despesas recorrentes (aluguel, assinaturas) e «☰ Mais».`,

    start_returning: '👋 Bem-vindo de volta! Envie uma despesa como mensagem — `250 café`. O menu está no teclado abaixo.',
  help_message: `❓ *Como usar*

• \`250 café\` — despesa. Escolha uma categoria uma vez, eu vou lembrar
• \`20 USD táxi\` — despesa em outra moeda, \`300\` — sem descrição
• \`+50000 salário\` — receita (\`+1000 USD\` — em outra moeda)
• Abaixo de um novo registro: ↩️ desfazer, 🏷 mudar categoria
• 📊 *Resumo do mês* — despesas, receitas, saldo, categorias; ◀️ — períodos anteriores
• 📅 *Hoje* — registros do dia; toque em um número para editar ou excluir um registro
• 🔁 *Despesas recorrentes* — aluguel e assinaturas são registrados automaticamente todo mês
• 🎯 *Orçamentos* e 📄 *Resumo* do período — botões abaixo do resumo do mês (premium)
• Moedas, lembretes (até 3 por dia) e início do período — em ☰ Mais → ⚙️ Configurações

Comandos: /stats /history /income /recurring /export /settings /menu`,
  
    // Despesas
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
    
    // Categorias
    select_category: 'Escolha uma categoria:',
    amount_label: 'Valor',
    description_label: 'Descrição',
    category_label: 'Categoria',
    expense_added_title: 'Despesa adicionada!',
    
    // Configurações
    currency_select: 'Selecione a moeda padrão:',
    currency_set: 'Moeda definida: {currency}',
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
    // Family labels
    family_label: '🏠 *Família:*',
    family_owner_label: '👑 *Proprietário:*',
    family_info: '👨‍👩‍👧‍👦 *Orçamento familiar*\n\nAqui você pode gerir as despesas junto com familiares, colegas, amigos, etc.\n\n- \uD83D\uDC6A É criado um grupo compartilhado para registrar as despesas conjuntas.\n- \u2795 Cada membro pode adicionar despesas.\n- \uD83D\uDDD1\uFE0F Você pode excluir suas próprias despesas, se necessário.\n- \uD83D\uDCCA Estatísticas compartilhadas estão disponíveis para todos os membros.\n- \uD83D\uDCE4 Exporte os dados de todo o grupo em um único arquivo.\n\nControle compartilhado significa menos caos e mais transparência.',
    family_created: '✅ Família "{name}" criada! Agora você pode convidar membros.',
    family_left: '✅ Você saiu da família "{name}". Suas despesas nessa família agora são pessoais.',
    family_deleted: '✅ Família "{name}" excluída. Todas as despesas familiares viraram pessoais.',
    family_member_removed_notification: '❌ Você foi removido da família “{familyName}”. Suas despesas nessa família agora são pessoais.',
    
    // Botões do menu familiar
    create_family: '🏠 Criar família',
    join_family: '🔗 Entrar na família',
    invite_member: '➕ Convidar membro',
    leave_family: '🚪 Sair da família',
    delete_family: '🗑️ Excluir família',
    family_members: '👥 Membros da família',
    family_stats: '💰 Despesas do mês',
    family_add_expense: '💰 Adicionar despesa familiar',
    button_personal_expense: '👤 Despesa pessoal',
    enter_personal_expense: 'Digite o valor e a descrição da despesa pessoal:',
    family_mode_button_on: '🟢 Todas as despesas para a família — toque para desligar',
    family_mode_button_off: '⚪ Todas as despesas para a família — toque para ligar',
    family_mode_line_on: '🟢 Novas despesas vão para a família',
    family_mode_line_off: '⚪ Novas despesas são pessoais',
    family_mode_enabled: '✅ Agora todas as novas despesas vão para a família.\n\nPara uma pessoal: «{personalButton}» abaixo ou «{removeButton}» no cartão da despesa.',
    family_mode_disabled: '✅ Novas despesas voltaram a ser pessoais.\n\nPara uma familiar: «{familyButton}» abaixo ou «{addButton}» no cartão da despesa.',
    family_menu: '👨‍👩‍👧‍👦 Menu da família',
    family_cancel: '❌ Cancelar',
    
    // Convites
    invitation_sent: '✅ Convite enviado para @{username}',
    invitation_not_found: '❌ Convite não encontrado ou expirado.',
    invitation_expired: '❌ Convite expirado.',
    
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
    family_invitation_received: '🎉 Você foi convidado para a família “{familyName}”\n\n👤 Convidado por: {inviterName}\n🔑 Código: `{inviteCode}`\n\nEscolha uma ação:',
    accept_invitation: '✅ Aceitar',
    reject_invitation: '❌ Recusar',
    invitation_accepted: '🎉 Parabéns! Você entrou na família “{familyName}”',
    invitation_rejected: '❌ Você recusou o convite para a família',
    invitation_not_pending: '❌ O convite não está pendente',
    invitation_cancelled_notification: '❌ O convite para a família “{familyName}” foi cancelado por {cancelledBy}',
    enter_invite_code: '🔑 Digite o código do convite:',
    not_family_member: '❌ Você não é membro desta família.',
    not_family_owner: '❌ Você não é o proprietário da família.',
    
    // Confirmações
    confirm_delete_family: '⚠️ *Exclusão da família*\n\nTodos os membros serão removidos e as despesas familiares voltarão a ser pessoais.\n\nTem certeza?',
    // Estatísticas família
    family_daily_stats: '💰 Despesas do dia',
    family_export: '📊 Exportar dados familiares',
    
    // Lista de membros
    family_members_title: '👥 *Membros da família*',
    family_owner_role: 'proprietário',
    family_member_role: 'membro',
    remove_member: '❌ Remover',
    confirm_remove_member: '⚠️ *Remover membro*\n\nTem certeza de que quer remover {name} da família? As despesas dessa pessoa na família vão virar pessoais, e a família não vai mais vê-las.',
    member_removed: '✅ {name} foi removido da família.',
    
    // Funções premium
    premium_required: '❌ Este recurso está disponível apenas para usuários premium.',
    
    timezone_updated: `✅ *Fuso horário atualizado!*

🕐 Horário escolhido: *{time}*
🌍 Fuso horário: *{timezone}*

Agora todas as suas despesas serão exibidas no horário local.`,
    
    // Limites
    status_regular: '👤 Padrão',
    status_premium: '💎 Premium',
    max_description_length: '<b>Comprimento máx. da descrição:</b> {length} caracteres',
    premium_benefits: `💎 <b>Vantagens premium:</b>
  • 🎯 Orçamentos mensais e por categoria com alertas em 80% e quando ultrapassados
  • 📄 Resumo completo do período: cada categoria comparada ao mês anterior, orçamentos, gasto médio por dia
  • 160 caracteres na descrição (em vez de 80)
  • Até 5 categorias próprias
  • Orçamento familiar
  • Editar o valor e a descrição de qualquer registro

  Registrar despesas e receitas é gratuito e ilimitado.`,
    
    // Assinatura premium
    premium_subscription_title: '⭐️ Assinatura',
    premium_status_header: '<b>Seu status:</b>',
    premium_privileges: 'Privilégios: {status}',
    premium_menu_title: '<b>Menu:</b>',
    premium_tariff_button: '⭐️ Tarifa',
    premium_why_paid_button: '👀 Por que é pago?',
    premium_donate_button: '🤝 Doar',
    premium_back_button: '⬅️ Voltar',
    premium_tariffs_title: '⭐️ Tarifas (Telegram Stars)',
    per_month: 'por mês',
    premium_payment_info: '💳 Pagamento via Telegram Stars — a moeda interna do Telegram. 🔁 O plano mensal é renovado automaticamente; cancele no Telegram: Configurações → Minhas Estrelas → Minhas assinaturas. Os planos de 3, 6 e 12 meses são pagamentos únicos.',
    premium_renewal_info: '📅 Pode renovar a qualquer momento. O tempo será somado ao restante.',
    premium_stars_info: '💡 Compre estrelas sem taxa pelo bot oficial [@PremiumBot].',
    premium_why_paid_title: '👀 Por que é pago?',
    premium_purchases_button: '🧾 Histórico de compras',
    purchases_header: '🧾 Histórico de compras',
    purchases_premium_title: 'Premium',
    purchases_donations_title: 'Doações',
    no_purchases: 'Ainda não há compras',
    purchases_prev_button: '◀ Anterior',
    purchases_next_button: 'Próximo ▶',
    premium_why_paid_text: 'Manter o servidor deste bot custa cerca de $200 por mês, sem contar o crescente número de usuários. E como desenvolvedor, também preciso comer para ter forças de melhorar o serviço :)',
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
    
    // Erros de validação
    error_too_long_regular: '❌ Descrição muito longa! Máx. 80 caracteres para usuários padrão.',
    error_too_long_premium: '❌ Descrição muito longa! Máx. 160 caracteres para premium.',
    error_amount: '❌ Valor inválido. Digite um número de 0.01 a {max}.',
    error_format: '❌ Não entendi. Comece com um valor: `250 café`, `20 USD táxi` ou só `300`.',
    error_generic: '❌ Ocorreu um erro. Tente mais tarde ou contate o administrador.',
    
    // Botões
    button_menu: '📋 Menu',
    button_expenses_month: '💰 Despesas do mês',
    button_expenses_day: '💰 Despesas do dia',
    button_expenses_categories: '💰 Despesas por categoria',
    button_family: '👨‍👩‍👧‍👦 Família',
    button_settings: '⚙️ Configurações',
    button_delete_last: '🗑️ Excluir último registro',
    button_help: '❓ Ajuda',
    button_edit: 'Editar',
    button_mark_as_family: '👨‍👩‍👧‍👦 Para família',
    button_remove_from_family: '🚫 Do orçamento familiar',
    expense_already_family: '❌ Esta despesa já é familiar',
    expense_converted_to_family: '✅ Despesa movida para orçamento familiar',
    expense_removed_from_family: '✅ Despesa removida do orçamento familiar',
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
    callback_data_not_found: '❌ Erro: dados não encontrados',
    callback_expense_added: '✅ Adicionado à categoria "{category}"',
    callback_canceled: '❌ Cancelado',
    callback_expense_canceled: '❌ Inclusão de despesa cancelada',
    callback_deleted: 'Registro excluído!',
    callback_delete_error: 'Erro ao excluir ou registro não encontrado',
    
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
    custom_categories_example: '💡 Exemplo: "🌍 Viagens" ou "🎮 Jogos"',
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
    custom_categories_premium_required: '💎 Este recurso está disponível apenas para usuários premium.',

    // Income
    button_income: '💵 Receitas',
    button_add_income: '➕ Adicionar receita',
    button_income_currency: '💱 Moeda das receitas',
    income_menu_title: '💵 *Receitas do período atual*',
    income_menu_empty: 'Ainda não há receitas neste período.',
    income_currency_label: 'Moeda padrão das receitas: *{currency}*',
    income_hint: '💡 Jeito rápido: envie uma mensagem começando com mais — `+50000 salário` ou `+1000 USD freelance`',
    income_enter_prompt: 'Digite o valor e a descrição da receita 👇\n\nExemplo: `50000 salário`\nMoeda padrão — *{currency}*. Outra pode ser definida com um código após o valor: `1000 USD freelance`',
    income_added: '✅ Receita registrada: *{amount}* — {description}',
    income_default_description: 'Receita',
    income_deleted: '✅ Receita excluída',
    income_edit_prompt: '✏️ Agora: {current}\n\nEnvie o novo valor e/ou descrição 👇\nPor exemplo: `60000 salário`, só o valor `60000` ou só a descrição `adiantamento`.\nA moeda muda com um código após o valor: `1000 USD`',
    income_updated: '✅ Receita atualizada',
    button_savings: '🏦 Poupança',
    command_savings: 'Poupança e metas',
    savings_title: '🏦 *Poupança*',
    savings_intro: 'Aqui você pode acompanhar sua poupança e suas metas e ver quanto vai conseguir juntar, considerando seus gastos habituais, juros e inflação.\n\nInforme sua poupança como um valor único ou crie contas — dinheiro vivo, depósito, conta em moeda estrangeira, cripto, cada uma com sua moeda e rendimento 👇',
    savings_total: 'Total: *{amount}*',
    savings_general: 'Poupança geral',
    savings_mode_total_short: '(de toda a poupança)',
    savings_goal_achieved_short: '✅ atingida',
    savings_monthly_manual: '📥 Você guarda {amount} por mês (definido manualmente)',
    savings_monthly_unknown: '📥 Ainda não se sabe quanto você guarda por mês: registre suas receitas de um mês completo ou defina o valor em “⚙️ Parâmetros da previsão”.',
    savings_monthly_negative: '⚠️ Em média nos últimos {n} meses, as despesas superam as receitas em {amount} por mês — sua poupança não está crescendo.',
    savings_monthly_auto: '📥 Você guarda ~{amount} por mês — receitas menos despesas, em média nos últimos {n} meses.',
    savings_in_year: '📈 Em um ano: ~{amount}',
    savings_in_today_money: 'em dinheiro de hoje ≈ {amount}',
    savings_button_set_current: '✏️ Valor único',
    savings_button_new_goal: '🎯 Nova meta',
    savings_button_forecast: '📈 Previsão',
    savings_button_settings: '⚙️ Parâmetros da previsão',
    savings_button_back: '⬅️ Poupança',
    savings_not_found: '❌ Não encontrei este cofrinho — talvez já tenha sido excluído.',
    savings_balance: 'Agora: *{amount}*',
    savings_recent_operations: 'Últimas alterações:',
    savings_button_deposit: '➕ Depositar',
    savings_button_withdraw: '➖ Retirar',
    savings_button_set: '✏️ Valor exato',
    savings_button_transfer: '🔄 Transferir',
    savings_button_goal_target: '🎯 Valor da meta',
    savings_button_goal_date: '📅 Prazo',
    savings_button_mode_own: '🔀 Modo: cofrinho próprio',
    savings_button_mode_total: '🔀 Modo: de toda a poupança',
    savings_button_goal_delete: '🗑 Excluir meta',
    savings_mode_own_line: '🐷 Cofrinho próprio — deposite nele separadamente',
    savings_mode_total_line: '🏦 Calculada sobre toda a poupança',
    savings_goal_progress: 'Guardado: *{current}* de {target}',
    savings_goal_left: 'faltam {amount}',
    savings_goal_deadline: '📅 Prazo: {date} · {left}',
    savings_deadline_left: 'faltam {duration}',
    savings_deadline_soon: 'menos de um mês',
    savings_deadline_passed: 'prazo vencido',
    savings_goal_achieved: '🎉 Meta atingida!',
    savings_goal_unreachable: '📥 Com {amount} por mês a meta não é atingida — é preciso guardar mais.',
    savings_goal_eta: '📥 Com {amount} por mês você atinge a meta em ≈ {duration} ({date})',
    savings_goal_eta_real: '🔥 Com inflação (a meta fica mais cara) — em ≈ {duration}',
    savings_goal_eta_real_never: '🔥 Com inflação a meta não é atingida: o aporte não acompanha a alta dos preços',
    savings_goal_own_assumption: '_Calculo como se todo o aporte mensal fosse para este cofrinho._',
    savings_goal_required: '🎯 Para cumprir o prazo, guarde {amount} por mês',
    savings_goal_required_real: '(com inflação — {amount})',
    savings_prompt_deposit: 'Quanto adicionar a “{name}”? Agora há {amount}.\n\nPor exemplo: `10000` ou `100 USD` — eu converto para a moeda do cofrinho.',
    savings_prompt_withdraw: 'Quanto retirar de “{name}”? Agora há {amount}.',
    savings_prompt_set: 'Quanto há agora em “{name}”? Escreva o valor exato, por exemplo `350000`.\n\nRegistrado agora: {amount}.',
    savings_transfer_choose: 'Para onde transferir de “{name}”? Disponível: {amount}.',
    savings_prompt_transfer: 'Quanto transferir de “{from}” para “{to}”? Disponível: {amount}.',
    savings_prompt_goal: 'Escreva o valor e o nome da meta 👇\n\nPor exemplo: `1 500 000 carro` ou `3000 USD férias`. Moeda padrão: *{currency}*.\n\nO prazo e o modo (cofrinho próprio ou de toda a poupança) você ajusta no cartão da meta.',
    savings_goal_limit_regular: '🎯 Na versão gratuita você pode ter {limit} meta. Com o Premium — até 10 metas ao mesmo tempo.',
    savings_goal_limit_premium: '🎯 Você já tem {limit} metas — é o máximo. Exclua uma para adicionar outra.',
    savings_prompt_goal_target: 'Novo valor para “{name}” (agora {amount}). Pode incluir um novo nome: `2 000 000 carro novo`.',
    savings_prompt_goal_date: 'Até quando juntar para “{name}”? Escreva mês e ano `12.2027` ou uma data `31.12.2027`.',
    savings_button_no_deadline: '♾ Sem prazo',
    savings_deadline_removed: '✅ Prazo removido',
    savings_mode_set_own: '✅ Agora a meta tem cofrinho próprio — deposite nele separadamente.',
    savings_mode_set_total: '✅ Agora a meta é calculada sobre toda a poupança.',
    savings_moved_to_general: '💰 {amount} foram para a poupança geral.',
    savings_button_new_account: '💼 Adicionar conta',
    savings_account_yield: '📈 Rendimento da conta: {value}% ao ano',
    savings_account_yield_default: '📈 Rendimento — como nos parâmetros da previsão: {value}% ao ano',
    savings_button_account_yield: '📈 Rendimento',
    savings_button_account_name: '✏️ Nome',
    savings_button_account_delete: '🗑 Excluir conta',
    savings_button_account_yield_default: '↩️ Como nos parâmetros',
    savings_prompt_account: 'Qual é o nome da conta e em que moeda ela está? 👇\n\nPor exemplo: `Dinheiro USD`, `Depósito 16%`, `Conta no banco EUR`, `Cripto USDT`, `Skins Steam USD`. Sem moeda — *{currency}*; a taxa pode ser indicada com `%`.\n\n💡 Para cripto e skins, informe o valor em dólares e atualize-o com o botão “✏️ Valor exato”.',
    savings_prompt_account_yield: 'Rendimento de “{name}” em porcentagem ao ano, por exemplo `16` para um depósito ou `0` para dinheiro vivo (até {max}).',
    savings_prompt_account_name: 'Novo nome para “{name}”:',
    savings_account_delete_confirm: 'Excluir a conta “{name}”?',
    savings_account_deleted: '✅ Conta “{name}” excluída.',
    savings_account_created: '✅ Conta “{name}” criada.',
    savings_account_limit: '💼 Você já tem {limit} contas — é o máximo. Exclua uma que não precisa para adicionar outra.',
    savings_error_account: '❌ Escreva o nome da conta, por exemplo `Dinheiro USD` ou `Depósito 16%`.',
    savings_error_name: '❌ O nome deve ter de 1 a {max} caracteres.',
    savings_goal_delete_confirm: 'Excluir a meta “{name}”?',
    savings_goal_delete_moves: 'Os {amount} guardados irão para a poupança geral — o dinheiro não se perde.',
    savings_button_goal_delete_yes: '🗑 Sim, excluir',
    savings_goal_deleted: '✅ Meta “{name}” excluída.',
    savings_forecast_title: '📈 *Previsão da poupança*',
    savings_now: 'Agora: *{amount}*',
    savings_rates_not_set: '⚙️ Rendimento e inflação não definidos — informe-os nos parâmetros para uma previsão mais precisa.',
    savings_rate_yield_short: 'rendimento {value}%',
    savings_rate_inflation_short: 'inflação {value}%',
    savings_rate_growth_short: 'aumento do aporte {value}% ao ano',
    savings_forecast_need_monthly: 'Para fazer a previsão, preciso de um aporte mensal: registre suas receitas de pelo menos um mês completo ou defina o valor manualmente nos parâmetros.',
    savings_horizon_6: 'Em meio ano',
    savings_horizon_12: 'Em um ano',
    savings_horizon_36: 'Em 3 anos',
    savings_horizon_60: 'Em 5 anos',
    savings_horizon_120: 'Em 10 anos',
    savings_forecast_simple: 'só guardando: {amount}',
    savings_forecast_nominal: 'com juros e aumento do aporte: {amount}',
    savings_forecast_real: 'em dinheiro de hoje: {amount}',
    savings_forecast_depleted: '⚠️ Nesse ritmo, a poupança acaba em {duration}.',
    savings_forecast_legend: '💡 “Só guardando” — sem juros, inflação ou aumento do aporte. “Em dinheiro de hoje” — quanto isso valeria aos preços atuais.',
    savings_settings_title: '⚙️ *Parâmetros da previsão*',
    savings_setting_yield: '📈 Rendimento',
    savings_setting_inflation: '🔥 Inflação',
    savings_setting_growth: '⬆️ Aumento do aporte',
    savings_rate_yearly: '{value}% ao ano',
    savings_rate_not_set: 'não considerado',
    savings_settings_hint: '💡 Rendimento — a taxa padrão: para novos aportes e contas sem taxa própria (defina a própria no cartão da conta). Inflação — quanto os preços (e suas metas) sobem por ano. Aumento do aporte — quanto cresce por ano o valor que você guarda (por exemplo, com reajustes de salário).',
    savings_button_monthly: '📥 Aporte mensal',
    savings_button_monthly_auto: '🔄 Calcular automaticamente',
    savings_monthly_auto_set: '✅ O aporte é calculado automaticamente: receitas menos despesas.',
    savings_prompt_monthly: 'Quanto você guarda por mês? Por exemplo: `30000` ({currency}).',
    savings_prompt_inflation: 'Inflação em porcentagem ao ano, por exemplo `8` ou `7,5` (até {max}). `0` — não considerar.',
    savings_prompt_yield: 'Rendimento da poupança em porcentagem ao ano (taxa do depósito), por exemplo `16` (até {max}). `0` — não considerar.',
    savings_prompt_growth: 'Quantos por cento ao ano seu aporte cresce, por exemplo `5` (até {max}). `0` — não considerar.',
    savings_monthly_set: '✅ Aporte: {amount} por mês',
    savings_setting_saved: '✅ Salvo',
    savings_error_amount: '❌ Não entendi o valor. Escreva um número, por exemplo `15000`.',
    savings_error_insufficient: '❌ Não há tudo isso: no cofrinho há {amount}.',
    savings_error_rate: '❌ Preciso de um número de 0 a {max}, por exemplo `8` ou `7,5`.',
    savings_error_date: '❌ Não entendi o prazo. Escreva mês e ano `12.2027` ou uma data `31.12.2027` — no futuro.',
    savings_error_goal: '❌ Escreva o valor e o nome da meta, por exemplo `1 500 000 carro`.',
    savings_deposited: '✅ Depositado {amount}',
    savings_withdrawn: '✅ Retirado {amount}',
    savings_balance_set: '✅ Valor atualizado: {amount}',
    savings_transferred: '✅ Transferido {amount} para “{name}”',
    savings_goal_created: '✅ Meta criada. Prazo e modo — nos botões abaixo.',
    savings_goal_updated: '✅ Meta atualizada',
    savings_deadline_set: '✅ Prazo: {date}',
    savings_goal_achieved_notice: '🎉 Meta “{name}” atingida!',
    savings_months: '{n} m.',
    savings_years: '{y} a.',
    savings_years_months: '{y} a. {m} m.',
    savings_button_new_debt: '💳 Adicionar dívida',
    savings_net_worth: '⚖️ Patrimônio líquido: *{amount}* (poupança {assets} − dívidas {debts})',
    savings_debt_owed: 'Falta pagar: *{amount}*',
    savings_debt_rate: '📈 Juros: {value}% ao ano',
    savings_debt_no_rate: '📈 Sem juros',
    savings_debt_payment: '💵 Parcela: {amount} por mês',
    savings_debt_payment_not_set: '💵 Parcela mensal não definida',
    savings_debt_payoff: '📅 Quitada em {duration} ({date})',
    savings_debt_total_interest: '💸 Total de juros: ~{amount}',
    savings_debt_too_long: '⚠️ Com essa parcela a dívida leva mais de 50 anos para ser quitada — tente pagar mais.',
    savings_debt_below_interest: '⚠️ A parcela não cobre os juros — a dívida não diminui. Para quitá-la, pague mais de {amount} por mês.',
    savings_debt_no_payment: '💡 Informe a parcela mensal — vou calcular quando a dívida será quitada.',
    savings_debt_no_payment_interest: '💡 Informe a parcela mensal — vou calcular quando a dívida será quitada e quanto vai para juros. Agora os juros somam ~{amount} por mês.',
    savings_debt_paid_off: '🎉 Dívida quitada!',
    savings_button_debt_pay: '➖ Pagar',
    savings_button_debt_increase: '➕ Aumentar dívida',
    savings_button_debt_payment: '💵 Parcela mensal',
    savings_button_debt_rate: '📈 Juros',
    savings_button_debt_delete: '🗑 Excluir dívida',
    savings_button_debt_no_payment: '🚫 Sem parcela',
    savings_button_skip: '⏭ Pular',
    savings_prompt_debt: 'Escreva o nome e o valor da dívida 👇\n\nPor exemplo: `Financiamento 300 000 10%`, `Cartão 2000 29,9%`, `Dívida com João 300`, `Parcelado USD 1200`. Sem moeda — *{currency}*; os juros com `%` (sem eles — sem juros).',
    savings_prompt_debt_payment: 'Quanto você paga por mês em “{name}”? Por exemplo `500` ({currency}). Com a parcela vou calcular quando a dívida será quitada. `0` — sem parcela.',
    savings_prompt_debt_pay: 'Quanto pagar de “{name}”? Faltam {amount}.\n\n_Nenhum gasto é registrado — as parcelas de dívidas geralmente já estão nos seus gastos._',
    savings_prompt_debt_increase: 'Quanto aumentar a dívida “{name}”? Agora {amount}.',
    savings_prompt_debt_set: 'Quanto falta pagar de “{name}”? Escreva o valor exato, `0` — quitada.\n\nRegistrado agora: {amount}.',
    savings_prompt_debt_rate: 'Juros de “{name}” em porcentagem ao ano, por exemplo `12` ou `29,9` (até {max}). `0` — sem juros.',
    savings_debt_created: '✅ Dívida “{name}” adicionada.',
    savings_debt_limit: '💳 Já são {limit} dívidas — é o máximo. Exclua uma quitada para adicionar outra.',
    savings_error_debt: '❌ Escreva um nome e um valor, por exemplo `Financiamento 300 000 10%` ou `Dívida com João 300`.',
    savings_debt_error_overpay: '❌ A dívida é de apenas {amount} — não dá para pagar mais.',
    savings_debt_paid: '✅ Pago {amount}',
    savings_debt_increased: '✅ Dívida aumentada em {amount}',
    savings_debt_set: '✅ Valor da dívida atualizado: {amount}',
    savings_debt_delete_confirm: 'Excluir a dívida “{name}”? Nenhum dinheiro é movido — a dívida só some da lista.',
    savings_debt_deleted: '✅ Dívida “{name}” excluída.',
    savings_forecast_debts_now: '💳 Dívidas: *{amount}* · patrimônio líquido: *{net}*',
    savings_forecast_debts: 'dívidas: {amount}',
    savings_forecast_net_worth: 'patrimônio líquido: {amount}',
    savings_forecast_debts_note: '💳 Dívidas — conforme parcelas e juros previstos; sem parcela a dívida cresce com os juros. As parcelas são consideradas parte dos seus gastos habituais — já estão refletidas no aporte mensal.',
    income_not_found: '❌ Receita não encontrada',
    income_currency_select: 'Escolha a moeda em que você normalmente recebe. As despesas continuam na sua moeda principal:',
    income_currency_set: '✅ Moeda das receitas: {currency}',
    income_total: '💵 Receitas: *{amount}*',
    balance_label: '⚖️ Saldo (receitas − despesas): *{amount}*',
    income_error_format: '❌ Não entendi. Envie um valor e uma descrição opcional: `50000 salário` ou `1000 USD freelance`',
    income_error_amount: '❌ Valor inválido. Digite um número de 0.01 a {max}.',

    // Recurring expenses
    button_recurring: '🔁 Despesas recorrentes',
    button_add_recurring: '➕ Adicionar despesa recorrente',
    recurring_menu_title: '🔁 *Despesas recorrentes*',
    recurring_menu_info: 'Pagamentos mensais (aluguel, assinaturas, empréstimos) são registrados automaticamente como despesas no dia do mês escolhido.',
    recurring_menu_empty: 'Ainda não há despesas recorrentes.',
    recurring_item: '{icon} {description} — *{amount}*, no dia {day} de cada mês\n    Próximo registro: {next}',
    recurring_monthly_total: 'Total por mês: *{amount}*',
    recurring_enter_prompt: 'Digite o valor e a descrição da despesa recorrente 👇\n\nExemplo: `50000 aluguel`\nVocê pode definir uma moeda após o valor: `500 USD aluguel`',
    recurring_day_prompt: 'Em que dia de cada mês devo registrar esta despesa? Digite um número de 1 a 31.\n\nSe o mês for mais curto, vou registrá-la no último dia do mês.',
    recurring_day_invalid: '❌ Digite um número inteiro de 1 a 31.',
    recurring_select_category: 'Escolha uma categoria para a despesa recorrente:',
    recurring_added: '✅ Despesa recorrente adicionada\n\n{description} — *{amount}*, no dia {day} de cada mês\nPrimeiro registro: {next}',
    recurring_added_charged_now: '✅ Despesa recorrente adicionada e já registrada neste mês\n\n{description} — *{amount}*, no dia {day} de cada mês\nPróximo registro: {next}',
    recurring_deleted: '✅ Despesa recorrente excluída. As despesas já registradas permanecem no histórico.',
    recurring_not_found: '❌ Despesa recorrente não encontrada',
    recurring_limit: '❌ Você pode ter no máximo {max} despesas recorrentes',
    recurring_charged_notification: '🔁 Despesa recorrente registrada: {icon} {description} — *{amount}*',
    recurring_error_format: '❌ Formato não reconhecido. Envie um valor e uma descrição: `50000 aluguel` ou `500 USD aluguel`',
    recurring_error_amount: '❌ Valor inválido. Digite um número de 0.01 a {max}.',

    // Main menu and «More»
    button_overview: '📊 Resumo do mês',
    button_today: '📅 Hoje',
    button_more: '☰ Mais',
    more_menu_title: '☰ *Mais*',
    button_export: '📤 Exportar CSV',
    keyboard_refreshed: '✅ O menu foi atualizado — agora está mais compacto 👇',
    button_outdated: 'Este botão está desatualizado. Abra a seção novamente pelo menu abaixo.',
    overview_title: 'Resumo: {range}',
    overview_spent: '💸 Despesas: *{amount}* · registros: {count}',
    overview_upcoming: 'Próximas recorrentes:',
    overview_income_hint: '💡 Registre receitas com um mais: `+50000 salário`',
    button_prev_period: '◀️ Antes',
    button_next_period: 'Depois ▶️',
    button_back_to_overview: '⬅️ Ao resumo',
    day_title_today: 'Hoje, {date}',
    day_title_yesterday: 'Ontem, {date}',
    day_title: '{date}',
    day_entry_hint: 'Envie uma despesa como mensagem: `250 café`',
    button_prev_day: '◀️ Dia anterior',
    button_next_day: 'Próximo dia ▶️',
    list_tap_number: 'Toque em um número para abrir o registro.',
    family_today_title: 'Família: registros de hoje',
    button_undo: '↩️ Desfazer',
    button_delete_record: '🗑 Excluir',
    button_change_category: '🏷 Categoria',
    button_edit_record: '✏️ Editar',
    expense_family_label: 'no orçamento familiar',
    expense_recurring_label: 'registrado automaticamente (despesa recorrente)',
    expense_category_remembered: '🏷 A categoria foi escolhida a partir do seu registro anterior com a mesma descrição — altere-a com o botão abaixo.',
    category_will_be_remembered: '💡 Vou lembrar sua escolha: da próxima vez, um registro assim irá direto para esta categoria.',
    expense_category_changed: 'Categoria: {category}',
    settings_header: 'Configurações',
    settings_currency_line: '💱 Moeda: *{currency}* · receitas: *{incomeCurrency}*',
    settings_timezone_line: '🌍 Fuso horário: {timezone}',
    settings_language_line: '🌐 Idioma: {language}',
    settings_period_line: '📅 O período começa no dia {day}',
    settings_reminders_on_line: '🔔 Lembretes: ativados ({hours})',
    settings_reminders_off_line: '🔔 Lembretes: desativados',
    button_currencies: '💱 Moedas',
    settings_currencies_text: '💱 *Moedas*\n\nPrincipal — as despesas e todos os totais são calculados nela: *{currency}*\nMoeda padrão das receitas: *{incomeCurrency}*\n\nQualquer registro pode estar em outra moeda — coloque o código depois do valor: `20 USD táxi`.',
    reminders_title: 'Lembretes',
    reminders_info: 'Se você não registrar nada até a hora escolhida, vou te lembrar. No máximo 3 vezes por dia.',
    button_reminders_on: '🟢 Ativado — toque para desativar',
    button_reminders_off: '⚫ Desativado — toque para ativar',
    family_teaser: '👨‍👩‍👧‍👦 *Orçamento familiar*\n\nDespesas compartilhadas com quem você ama em um só lugar: cada um registra as suas, as estatísticas e a exportação são comuns.\n\nDisponível com premium.',
    button_premium: '⭐️ Premium',

    // Subscription and premium ending
    subscription_active_info: '🔁 A assinatura mensal está paga até {date} e é renovada automaticamente. Para cancelar: Telegram → Configurações → Minhas Estrelas → Minhas assinaturas.',
    subscription_renewed: '🔁 Assinatura renovada. Premium ativo até {date}.',
    button_view_tariffs: '⭐️ Planos',
    premium_expiring_trial: '⏳ Seu teste premium termina em {date}.\n\nDepois disso, orçamentos, o resumo completo do período, categorias próprias, o orçamento familiar e a edição de registros deixarão de funcionar. Tudo o que você registrou continua salvo, e o controle de despesas é gratuito.',
    premium_expiring_paid: '⏳ O premium termina em {date}. Você pode renovar com antecedência — os dias restantes são mantidos.',
    premium_expired_trial: '🌙 Seu teste premium terminou. Registrar despesas e receitas continua gratuito; orçamentos, o resumo completo, categorias próprias, família e edição de registros vêm com o premium.',
    premium_expired_paid: '🌙 O premium terminou. Obrigado por apoiar o projeto! Você pode renovar a qualquer momento.',
    premium_winback: '👋 Seu premium terminou há uma semana. Se quiser de volta os orçamentos, o resumo completo, as categorias próprias, o orçamento familiar e a edição de registros — veja os planos abaixo.',
    start_reminders_note: '🔔 Se você não registrar nada durante o dia, vou te lembrar (até 3 vezes por dia). Alterar horários ou desativar: ☰ Mais → ⚙️ Configurações → 🔔.',

    // Budgets
    button_budgets: '🎯 Orçamentos',
    budgets_title: 'Orçamentos',
    budgets_empty: 'Defina um limite para o mês inteiro ou para uma categoria — vou avisar em 80% e quando o limite for ultrapassado.',
    budgets_teaser: '🎯 *Orçamentos*\n\nUm limite para o mês ou para uma categoria: o progresso aparece no resumo, e você recebe um alerta em 80% e quando o limite é ultrapassado.\n\nDisponível com premium.',
    button_budget_total: '➕ Mês inteiro',
    button_budget_category: '➕ Categoria',
    button_budget_change: '✏️ Alterar valor',
    budget_total_name: '🎯 Mês inteiro',
    budget_left: 'restam {amount}',
    budget_over: 'ultrapassado em {amount}',
    budget_enter_prompt: 'Digite o limite do período para “{name}” 👇\n\nPor exemplo: `10000` (em *{currency}*) ou `150 USD`',
    budget_amount_invalid: '❌ Só é preciso um valor: `10000` ou `150 USD`.',
    budget_saved: '✅ Orçamento salvo',
    budget_deleted: '✅ Orçamento excluído',
    budget_not_found: '❌ Orçamento não encontrado',
    budget_warning_80: '⚠️ {name}: gasto {spent} de {limit} ({percent}%)',
    budget_warning_100: '🚨 {name}: orçamento ultrapassado — {spent} de {limit} ({percent}%)',
    overview_budget_of: 'do orçamento de {amount}',

    // Period summary
    button_report: '📄 Resumo',
    report_title: 'Resumo: {range}',
    report_vs_previous: 'Em relação ao período anterior: {change} (antes {amount})',
    report_change_new: 'novo',
    report_change_same: 'sem alteração',
    report_top_categories: 'Maiores gastos:',
    report_locked: '🔒 O detalhamento completo — cada categoria comparada ao período anterior, orçamentos, gasto médio por dia e o maior gasto — vem com o premium.',
    report_categories_vs_previous: 'Categorias (em relação ao período anterior):',
    report_categories_gone: 'Sem gastos desta vez: {list}',
    report_more_numbers: 'Mais números:',
    report_per_day: '📅 Média por dia: {amount}',
    report_largest: '🔝 Maior gasto: {amount} — {description} ({date})',
    overview_budget_limit: 'limite {amount}',
    report_title_current: 'Resumo até agora: {range}',
    input_canceled: '✅ Cancelado. Você pode registrar despesas normalmente.',
    no_active_state: 'Não há nada para cancelar agora.',
    daily_summary_title: 'Resumo do dia',
    daily_summary_info: 'Resumo diário: à noite eu te envio quanto você gastou hoje e com o quê. Só nos dias com despesas.',
    daily_summary_enabled: '✅ Resumo diário ativado',
    daily_summary_disabled: '⚫ Resumo diário desativado',
    daily_summary_hour_info: 'Escolha a hora local para o resumo diário:',
    daily_summary_hour_set: 'Horário do resumo salvo',
    button_daily_summary_on: '🗓 Resumo: sim',
    button_daily_summary_off: '🗓 Resumo: não',
    settings_daily_summary_on_line: '🗓 Resumo diário: às {time}',
    settings_daily_summary_off_line: '🗓 Resumo diário: desativado',
    export_title: '📤 Exportar para CSV\n\nEscolha o período do arquivo.',
    export_categories_all: '🗂 Categorias: todas',
    export_categories_selected: '🗂 Categorias: {categories}',
    export_period_day: '📅 Hoje',
    export_period_week: '📅 Últimos 7 dias',
    export_period_current: '📅 Período atual',
    export_period_previous: '📅 Período anterior',
    export_period_all: '♾ Todo o período',
    export_period_range: '🗓 Escolher datas…',
    export_filter_categories: '🔽 Filtrar por categorias',
    export_select_categories: 'Escolha as categorias para exportar:',
    export_select_all: '✅ Selecionar tudo',
    export_deselect_all: '❌ Desmarcar tudo',
    export_done: '✅ Pronto',
    export_no_categories: 'Escolha pelo menos uma categoria',
    export_enter_dates: '🗓 Digite um intervalo de datas:\n`01.03.2026 - 15.03.2026`\n\nou uma única data: `01.03.2026`',
    export_dates_invalid: '❌ Não consegui ler as datas. Digite assim: `01.03.2026 - 15.03.2026` ou uma única data `01.03.2026`.',
    export_dates_order: '❌ A data inicial é posterior à data final. Exemplo: `01.03.2026 - 15.03.2026`.',
    total_by_categories: 'Total por categorias:',
    bot_short_description: 'Registre gastos em poucos toques: digite "250 café". Receitas, orçamentos, resumo mensal, orçamento familiar.',
    bot_description: 'Controle de despesas e receitas direto no Telegram.\n\nDigite "250 café" — a despesa é registrada e a categoria é lembrada.\n\n• Visão do mês por categoria e comparação com o mês anterior\n• Receitas e saldo: "+50000 salário"\n• Despesas recorrentes: aluguel e assinaturas registrados automaticamente\n• Orçamentos com alertas, resumo diário, lembretes\n• Orçamento familiar, várias moedas, exportar para CSV\n\nO básico é grátis. Novos usuários ganham 14 dias de premium.',
    command_start: 'Menu principal',
    command_stats: 'Visão do mês',
    command_history: 'Registros de hoje',
    command_income: 'Receitas e saldo',
    command_recurring: 'Despesas recorrentes',
    command_export: 'Exportar para CSV',
    command_family: 'Orçamento familiar',
    command_settings: 'Configurações',
    command_limits: 'Assinatura e premium',
    command_help: 'Ajuda',
    command_cancel: 'Cancelar entrada',
    command_paysupport: 'Suporte a pagamentos',
    command_terms: 'Termos de serviço',
    command_privacy: 'Política de privacidade',
    payment_outdated: '⚠️ Esta fatura está desatualizada: o preço mudou. Abra os planos novamente — /limits',
    security_validation_error: '⚠️ Não foi possível processar a solicitação. Tente de novo ou abra o menu com /start.',
    expense_draft_outdated: '⌛ Este rascunho está desatualizado. Envie a despesa novamente.',
    family_invitation_hours_left: '⏰ Restam {hours} h',
    family_no_members: 'Nenhum membro',
    family_already_member: '❌ Você já faz parte de uma família.',
    admin_bug_reports_all_title: '📝 Todos os relatórios de bugs (últimos {count})',
    admin_bug_reports_new_title: '🆕 Novos relatórios de bugs (últimos {count})',
    admin_bug_reports_empty: 'Nenhum relatório.',
    payment_subscription_already_active: '🔁 Você já tem uma assinatura mensal ativa, não precisa de outra. Para estender o premium antecipadamente, escolha um plano avulso: /limits',
    payment_foreign_payer: '⚠️ Este link de pagamento foi criado para outro usuário. Abra você mesmo os planos no bot — /limits',
    premium_expired_granted: '🌙 Seu premium terminou. Registrar despesas e receitas continua gratuito; orçamentos, o resumo completo, categorias próprias, família e edição de registros vêm com o premium. Você pode renovar a qualquer momento.'
};
