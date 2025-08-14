module.exports = {
    button_reminders: '🔔 Me rappeler',
    reminders_enabled: 'Rappels activés. Si tu n’as rien enregistré avant 18h00, je te le rappellerai avec humour 😉',
    reminders_disabled: 'Rappels désactivés. Silence total 🤐',
    reminder_sample_variants: [
      'Hé ! Ce n’est pas parce que ton portefeuille se tait qu’il est heureux. Note tes dépenses 😉',
      'Tu as déjà dépensé aujourd’hui ? Note-le avant que ta mémoire ne parte acheter du pain 🧠🥖',
      'Si tu ne l’enregistres pas, considère que c’est dépensé dans le vide. Allons noter ça 💸',
      'Goutte après goutte, le budget file à la mer. Note tes dépenses du jour 🌊',
      'Le bot ne râle pas, il te rappelle : c’est l’heure de noter tes dépenses 😌'
    ],
    reminder_message_title: 'Rappel',
    reminder_turn_on_off: (enabled) => enabled ? 'Désactiver les rappels' : 'Activer les rappels',
    button_configure_reminder_hours: '⏰ Configurer les heures de rappel',
    reminder_hours_info: 'Sélectionnez jusqu\'à 3 heures pour les rappels (votre fuseau horaire local). Actuelles :',
    reminder_hours_limit: 'Vous pouvez sélectionner jusqu\'à 3 heures',
    reminder_hours_saved: '✅ Heures de rappel enregistrées',
    button_save: 'Enregistrer',
    button_clear: 'Effacer',
    
    // Support de paiement et politiques
    paysupport_message: 'Support de paiement\n\nEntreprise : {businessName}\nSupport : @{supportUsername} / {supportEmail}\n\nConditions : {termsUrl}\nConfidentialité : {privacyUrl}\nRemboursements : {refundPolicyUrl}\n\nPour les paiements Stars et remboursements, contactez d’abord le support. Nous respectons les politiques Telegram Stars.',
    terms_message: '📄 Conditions d\'utilisation : {termsUrl}',
    privacy_message: '🔐 Politique de confidentialité : {privacyUrl}',
    refund_message: '↩️ Politique de remboursement : {refundPolicyUrl}\n\nQuestions : @{supportUsername} / {supportEmail}',
    
    // Rapports de bugs
    button_bug_report: '🐛 Signaler un bug / Proposer une amélioration',
    bug_report_prompt: '🐛 *Signaler un bug ou proposer une amélioration*\n\nDécris le problème ou la suggestion (max. 1000 caractères) :',
    bug_report_success: '✅ Merci ! Ton message a été envoyé aux développeurs.',
    bug_report_too_long: '❌ Message trop long ! Réduis de {excess} caractères (maximum 1000).',
    bug_report_empty: '❌ Message vide. Décris le problème ou la suggestion.',
    bug_report_rate_limit: '⚠️ Trop de rapports !\n\nTu ne peux envoyer que 3 rapports toutes les 10 minutes',
    bug_report_suspicious: '⚠️ Le message contient des caractères non autorisés ou du contenu suspect',
    
    // Messages de sécurité
    security_rate_limit: '⚠️ *Trop de requêtes*\n\nRéessaie dans {resetTime} secondes\nLimite : {limit} requêtes par minute',
    security_validation_error: '⚠️ *Erreur de validation*\n\n{message}',
    security_error: '❌ *Erreur de sécurité*\n\nRéessaie plus tard ou contacte un administrateur.',
    
    // Panneau admin
    button_admin: '👑 Panneau d’administration',
    admin_access_denied: '❌ Tu n’as pas les droits d’administrateur.',
    admin_panel_title: '👑 *Panneau d’administration*\n\nChoisis une action :',
    admin_error: '❌ Erreur lors de l’exécution de l’action administrateur.',
    
    // Statistiques admin
    admin_stats_text: `📊 *Statistiques du bot*
  
  👥 **Utilisateurs :**
  • Total : {totalUsers}
  • Premium : {activePremium}
  • Nouveaux cette semaine : {newUsersWeek}
  • Nouveaux ce mois-ci : {newUsersMonth}
  
  💰 **Dépenses :**
  • Nombre total d’entrées : {totalExpenses}
  • Cette semaine : {expensesWeek}
  • Utilisateurs actifs : {activeUsers}
  
  🐛 **Rapports de bugs :** {totalBugReports}
  
  💎 **Dons :**
  • Total : {totalDonations}
  • Étoiles collectées : {totalStars}
  
  ⭐ **Transactions premium :** {premiumTransactions}`,
  
    // Liste utilisateurs admin
    admin_users_title: '👥 *Utilisateurs* (page {page}/{totalPages})\n\nTotal : {totalUsers}\n',
    
    // Rapports de bugs admin
    admin_bug_reports_title: '🐛 *Rapports de bugs*',
    bug_report_status_new: '🆕 Nouveaux',
    bug_report_status_in_progress: '🔄 En cours',
    bug_report_status_resolved: '✅ Résolus',
    bug_report_status_closed: '🔒 Fermés',
    
    // Dons admin
    admin_donations_text: `💰 *Statistiques des dons*
  
  📊 **Résumé :**
  • Dons totaux : {totalDonations}
  • Terminés : {completedDonations}
  • En attente : {pendingDonations}
  
  ⭐ **Étoiles :**
  • Total collecté : {totalStars}
  • Don moyen : {avgStars} étoiles`,
  
    // Premium admin
    admin_premium_stats: `⭐ *Statistiques premium*
  
  📊 **Utilisateurs :**
  • Total premium : {totalPremiumUsers}
  • Actifs maintenant : {activePremiumUsers}
  
  💳 **Transactions :**
  • Nombre total : {totalTransactions}
  • Revenu total : {totalRevenue} étoiles`,
  
    // Administrateurs
    admin_admins_title: '👑 *Administrateurs* ({count})\n',
    // Recherche admin
    admin_search_prompt: '🔍 *Rechercher un utilisateur*\n\nEntre l’ID ou le nom d’utilisateur :',
    admin_search_not_found: '❌ Utilisateur non trouvé.',
    admin_search_results: '🔍 *Résultats de recherche* "{query}"\n\nTrouvés : {count}\n',
    
    // Détails utilisateur admin
    admin_user_not_found: '❌ Utilisateur non trouvé.',
    admin_user_details: `👤 *Informations sur l’utilisateur*
  
  {adminFlag}{premiumFlag} **{firstName}** (@{username})
  🆔 ID : {userId}
  🌐 Langue : {language}
  💱 Devise : {currency}
  🕐 Fuseau horaire : {timezone}
  📅 Inscription : {createdAt}
  
  📊 **Statistiques :**
  • Dépenses enregistrées : {totalExpenses}
  • Montant total : {totalAmount}
  • Rapports de bugs : {bugReportsCount}
  • Transactions : {transactionsCount}`,
  
    // Actions admin
    admin_promote_success: '✅ L’utilisateur {userId} est maintenant administrateur.',
    admin_demote_success: '✅ L’utilisateur {userId} n’est plus administrateur.',
    admin_cannot_demote_self: '❌ Impossible de retirer vos propres droits administrateur.',
    admin_grant_premium_options: '⭐ *Donner premium à l’utilisateur {userId}*\n\nChoisis la durée :',
    admin_grant_premium_success: '✅ Premium activé pour {userId} pendant {days} jours.',
    admin_revoke_premium_success: '✅ Premium retiré à {userId}.',
  
    // Diffusion admin
    admin_broadcast_prompt: '📢 *Diffusion générale*\n\nEntre le texte à envoyer à tous les utilisateurs (max. 3600 caractères) :',
    admin_broadcast_too_long: '❌ Message trop long !\n\n📏 Longueur actuelle : {current}\n📏 Maximum : {max}\n📏 Supprime : {excess} caractères',
    admin_broadcast_confirm: '📢 *Confirmer la diffusion*\n\n📝 **Texte :**\n{message}\n\n📏 **Longueur :** {length} caractères\n\n⚠️ Ce message sera envoyé à **TOUS** les utilisateurs du bot !',
    admin_broadcast_started: '📢 Diffusion commencée...',
    admin_broadcast_result: '📢 *Diffusion terminée !*\n\n📊 **Statistiques :**\n• Total utilisateurs : {total}\n• Envoyé : {sent}\n• Échecs : {failed}',
    admin_broadcast_header: '🔴🔴🔴 *Notification !* 🔴🔴🔴',
    
    // Général
    welcome: 'Bonjour, {name} ! 👋',
    main_menu_title: '🏠 *Menu principal*\n\nChoisis une action :',
    error: 'Une erreur est survenue 😞',
    unknown_error: 'Erreur inattendue. Réessaie plus tard.',
    not_found: 'Non trouvé',
    error_invalid_description_format: '❌ Format invalide. Utilise : montant description ou montant catégorie description',
    expense_save_error: '❌ Erreur lors de l’enregistrement de la dépense. Réessaie.',
    cancel: 'Annuler',
    back: 'Retour',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    
    // Message de démarrage
    start_message: `Bonjour ! 👋 Je vais t’aider à suivre tes dépenses et gérer ton budget.
  
  *Comment ajouter une dépense :*
  Écris simplement le montant et la description :
  -  \`200 courses au supermarché\`
  -  \`1500 déjeuner au restaurant\`
  -  \`50 transport\`
  -  \`150,50 café\`
  
  Ensuite, un menu de catégories apparaîtra - choisis celle qui convient 🏷️
  
  *Commandes principales :*
  /start - redémarrer le bot
  /menu - ouvrir le menu interactif
  /history - dernières entrées du jour
  /stats - statistiques détaillées par catégorie
  
  /export - télécharger les données en CSV
  /undo - annuler la dernière entrée
  
  *Paramètres :*
  /settings - ouvrir les paramètres
  /currency - définir la devise par défaut
  /timezone - définir le fuseau horaire
  /categories - gérer les catégories
  
  *Fonctions supplémentaires :*
  /family - budget familial
  /limits - limites et fonctions premium
  /help - aide détaillée
  
  Commence à enregistrer tes dépenses ! 💰`,
  help_message: `📋 *Aide détaillée sur les commandes*
  
  *Ajout de dépenses :*
  Écris le montant et la description séparés par un espace :
  \`200 courses\` - affichera un menu des catégories
  \`150,50 café\` - prend en charge les nombres à virgule
  
  *Commandes principales :*
  /start - redémarrer le bot et afficher l’accueil
  /menu - ouvrir le menu interactif avec toutes les fonctions
  /history - afficher les entrées d’aujourd’hui
  /stats - statistiques détaillées du mois par catégorie
  
  /export - télécharger toutes les données au format CSV
  /undo - annuler la dernière entrée ajoutée
  
  *Paramètres et gestion :*
  /settings - ouvrir le menu principal des paramètres
  /currency - changer la devise par défaut (RUB, USD, EUR, KZT, CNY, THB)
  /timezone - régler le fuseau horaire pour une bonne précision
  /categories - gérer des catégories personnalisées (premium)
  
  *Budget familial :*
  /family - gérer les groupes familiaux et les dépenses communes
  - Créer une famille, inviter des membres
  - Suivi et statistiques des dépenses communes
  - Exportation des données familiales
  
  *Fonctions premium :*
  /limits - information sur les limites et le premium
  - Catégories personnalisées
  - Statistiques avancées
  - Budget familial
  - Support prioritaire
  
  *Conseils d’utilisation :*
  • Utilise des descriptions pour mieux comprendre les dépenses
  • Consulte régulièrement les statistiques via /stats
  • Règle ton fuseau horaire pour une précision optimale
  • Utilise /menu pour un accès rapide aux fonctions
  • Exporte tes données via /export pour analyser
  
  *Modification des dépenses :*
  • Dans /history tu peux supprimer ou éditer les entrées
  • Le bouton "👨‍👩‍👧‍👦 En famille" déplace une dépense au budget familial
  • Le bouton "🚫 Retirer du budget familial" la remet en dépenses personnelles
  • Tu ne peux modifier/supprimer que tes propres dépenses
  
  *Rappels :*
  • Le bot rappelle à 18h00 heure locale d’enregistrer tes dépenses
  • Uniquement si tu n’as rien saisi dans la journée
  • Rappels activables/désactivables dans les paramètres
  • Un seul rappel max par jour
  
  *Support :*
  Si tu as une question, utilise /start pour revenir au menu principal.
  
  Bonne gestion de budget ! 💰📊`,
  
    // Dépenses
    expense_added: '✅ Enregistré : {amount} - {description}',
    expense_updated: '✅ Entrée mise à jour : {amount} - {description}',
    expense_deleted: '✅ Entrée supprimée : {amount} - {description}',
    no_expenses: 'Aucune entrée à supprimer 🤷‍♂️',
    expense_not_found: 'Erreur : entrée introuvable.',
    expense_update_error: 'Erreur : entrée introuvable ou non modifiée.',
    
    // Statistiques
    monthly_stats: '💰 *Dépenses du mois en cours*',
    daily_stats: '💰 *Dépenses d’aujourd’hui*',
    total_spent: 'Dépensé : *{amount}*',
    records_count: 'Entrées : {count}',
    no_expenses_period: 'Aucune dépense sur cette période.',
    by_categories: 'Par catégories :',
    no_expenses_category: 'Aucune dépense dans cette catégorie le mois dernier.',
    
    // Catégories
    select_category: 'Choisis une catégorie :',
    amount_label: 'Montant',
    description_label: 'Description',
    category_label: 'Catégorie',
    expense_added_title: 'Dépense ajoutée !',
    no_categories: 'Aucune catégorie trouvée.',
    category_expenses: 'Dépenses pour la catégorie "{category}"',
    no_category_expenses: 'Aucune dépense dans cette catégorie sur le dernier mois.',
    
    // Paramètres
    settings_title: 'Paramètres :',
    currency_select: 'Choisis la devise par défaut :',
    currency_set: 'Devise définie : {currency}',
    currency_updated: 'Devise changée pour {currency}',
    button_change_period_start: '📅 Jour de début de période',
    period_start_prompt: 'Entrez le jour du mois (1-31) où commence la nouvelle période. Mois courts : dernier jour.',
    period_start_invalid: '❌ Nombre invalide. Entrez un entier entre 1 et 31.',
    period_start_set: '✅ Jour de début fixé : {day}',
    timezone_setup: `🕐 *Réglage du fuseau horaire*
  
  Quelle heure est-il chez vous ?
  
  *Heure UTC actuelle :* {utcTime}
  
  Sélectionnez votre heure actuelle :`,
    timezone_set: '✅ Fuseau horaire défini : {timezone}',
    // Budget familial
    button_family: '👨‍👩‍👧‍👦 Famille',
    family_info: '👨‍👩‍👧‍👦 *Budget familial*\n\nIci, vous pouvez gérer les dépenses familiales avec vos proches.',
    family_created: '✅ Famille "{name}" créée ! Vous pouvez maintenant inviter des membres.',
    family_joined: '✅ Vous avez rejoint la famille "{name}" !',
    family_left: '✅ Vous avez quitté la famille "{name}".',
    family_deleted: '✅ Famille "{name}" supprimée. Toutes les dépenses familiales sont redevenues personnelles.',
    family_member_removed: '✅ Membre supprimé de la famille.',
    family_member_removed_notification: '❌ Vous avez été retiré de la famille *{familyName}*.',
    family_cannot_leave_owner: '❌ Le propriétaire de la famille ne peut pas la quitter. Utilisez "Supprimer la famille".',
    
    // Boutons du menu familial
    create_family: '🏠 Créer une famille',
    join_family: '🔗 Rejoindre une famille',
    invite_member: '➕ Inviter un membre',
    leave_family: '🚪 Quitter la famille',
    delete_family: '🗑️ Supprimer la famille',
    family_members: '👥 Membres de la famille',
    family_stats: '💰 Dépenses du mois',
    family_daily_stats: '💰 Dépenses du jour',
    family_add_expense: '💰 Ajouter une dépense familiale',
    family_menu: '👨‍👩‍👧‍👦 Menu famille',
    family_cancel: '❌ Annuler',
    
    // Invitations
    invitation_sent: '✅ Invitation envoyée à @{username}',
    invitation_accepted: '✅ Vous avez accepté de rejoindre la famille "{name}" !',
    invitation_rejected: '❌ Vous avez refusé l’invitation à la famille "{name}".',
    invitation_not_found: '❌ Invitation introuvable ou expirée.',
    invitation_expired: '❌ Invitation expirée.',
    invitation_already_processed: '❌ Invitation déjà traitée.',
    
    // Demandes utilisateur
    enter_family_name: 'Entrez le nom de la famille (3-50 caractères) :',
    enter_invite_username: 'Entrez le nom d’utilisateur (sans @) :',
    enter_expense_amount: 'Entrez le montant et la description de la dépense familiale :',
    
    // Erreurs
    family_name_too_short: '❌ Le nom de la famille doit contenir au moins 3 caractères.',
    family_name_too_long: '❌ Le nom de la famille ne doit pas dépasser 50 caractères.',
    user_not_found: '❌ Utilisateur introuvable.',
    user_already_in_family: '❌ L’utilisateur est déjà dans une famille.',
    user_already_has_invitation: '❌ L’utilisateur a déjà une invitation active.',
    user_already_in_other_family: '❌ L’utilisateur est déjà dans une autre famille.',
    user_already_in_your_family: '❌ L’utilisateur est déjà membre de votre famille.',
    user_not_premium: '❌ L’utilisateur n’a pas de statut premium.',
    only_owner_can_invite: '❌ Seul le propriétaire de la famille peut inviter des membres.',
    active_invitations: '📋 Invitations actives',
    no_active_invitations: '📋 Vous n’avez pas d’invitations actives.',
    active_invitations_list: '📋 Invitations actives :',
    cancel_invitation: '❌ Annuler l’invitation',
    invitation_cancelled: '✅ Invitation annulée.',
    not_authorized: '❌ Vous n’avez pas les droits pour effectuer cette action.',
    invitation_code: '🔑 Code d’invitation : `{code}`',
    family_invitation_received: '🎉 Vous êtes invité dans la famille *{familyName}*\n\n👤 Invité par : {inviterName}\n🔑 Code : `{inviteCode}`\n\nChoisissez une action :',
    accept_invitation: '✅ Accepter',
    reject_invitation: '❌ Refuser',
    invitation_accepted: '🎉 Félicitations ! Vous avez rejoint la famille *{familyName}*',
    invitation_rejected: '❌ Vous avez refusé l’invitation',
    invitation_not_pending: '❌ L’invitation n’est pas en attente',
    invitation_cancelled_notification: '❌ L’invitation dans la famille *{familyName}* a été annulée par {cancelledBy}',
    enter_invite_code: '🔑 Entrez le code d’invitation :',
    only_owner_can_remove: '❌ Seul le propriétaire de la famille peut supprimer des membres.',
    only_owner_can_delete: '❌ Seul le propriétaire peut supprimer la famille.',
    cannot_remove_owner: '❌ Impossible de supprimer le propriétaire.',
    cannot_remove_yourself: '❌ Vous ne pouvez pas vous supprimer vous-même.',
    family_not_found: '❌ Famille introuvable.',
    not_family_member: '❌ Vous n’êtes pas membre de cette famille.',
    not_family_owner: '❌ Vous n’êtes pas le propriétaire de la famille.',
    
    // Confirmations
    confirm_delete_family: '⚠️ *Suppression de famille*\n\nTous les membres seront supprimés et les dépenses familiales redeviendront personnelles.\n\nÊtes-vous sûr ?',
    confirm_remove_member: '⚠️ *Retrait de membre*\n\nLe membre sera supprimé de la famille.\n\nÊtes-vous sûr ?',
    // Statistiques famille
    family_monthly_stats: '👨‍👩‍👧‍👦 *Dépenses familiales du mois*',
    family_daily_stats: '💰 Dépenses du jour',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *Dépenses familiales du jour*',
    family_export: '📊 Exporter les données familiales',
    family_total_spent: 'Dépensé : *{amount}*',
    family_members_count: 'Membres : {count}',
    family_no_expenses: 'Aucune dépense familiale pour cette période.',
    
    // Liste des membres
    family_members_title: '👥 *Membres de la famille*',
    family_member_info: '• {name} ({role}) - a rejoint le {date}',
    family_owner_role: 'propriétaire',
    family_member_role: 'membre',
    remove_member: '❌ Retirer',
    confirm_remove_member: '⚠️ *Retrait de membre*\n\nVoulez-vous vraiment retirer {name} de la famille ?',
    member_removed: '✅ {name} a été retiré de la famille.',
    member_removed_notification: '❌ Vous avez été retiré de la famille *{familyName}* par {ownerName}.',
    
    // Fonctions premium
    premium_required: '❌ Cette fonction est réservée aux utilisateurs premium.',
    upgrade_to_premium: '💎 Passez en premium pour accéder au budget familial !',
    
    timezone_updated: `✅ *Fuseau horaire mis à jour !*
  
  🕐 Heure sélectionnée : *{time}*
  🌍 Fuseau horaire : *{timezone}*
  
  Toutes vos dépenses seront désormais affichées à votre heure locale.`,
    timezone_updated_simple: `✅ *Fuseau horaire mis à jour !*
  
  🌍 Nouveau fuseau horaire : *{timezone}*
  
  Vos dépenses seront désormais affichées correctement à votre heure locale.`,
    
    // Limites
    limits_title: '📊 *Informations sur les limites*',
    status_regular: '👤 Standard',
    status_premium: '💎 Premium',
    status_label: '*Statut :* {status}',
    records_usage: '<b>Entrées :</b> {current}/{max} ({percentage}%)',
    records_remaining: '<b>Restantes :</b> {remaining} entrées',
    max_description_length: '<b>Longueur max. de description :</b> {length} caractères',
    near_limit_warning: '⚠️ *Attention :* Vous approchez du nombre maximal d’entrées.',
    limit_reached: '❌ *Limite d’entrées atteinte !*',
    premium_benefits: `💎 <b>Avantages premium :</b>
  • 160 caractères dans la description (au lieu de 80)
  • 300 entrées (au lieu de 100)
  • Jusqu’à 5 catégories personnalisées
  • Statistiques avancées
  • Budget familial
  • Modification et suppression de n’importe quelle dépense (pas seulement la dernière)`,
    
    // Abonnement premium
    premium_subscription_title: '⭐️ Abonnement',
    premium_status_header: '<b>Votre statut :</b>',
    premium_privileges: 'Privilèges : {status}',
    premium_limits_info: 'Ici figurent vos limites : nombre de catégories, dépenses, accès familial, durée premium restante.',
    premium_menu_title: '<b>Menu :</b>',
    premium_tariff_button: '⭐️ Tarifs',
    premium_why_paid_button: '👀 Pourquoi payant ?',
    premium_donate_button: '🤝 Faire un don',
    premium_back_button: '⬅️ Retour',
    premium_tariffs_title: '⭐️ Tarifs (Telegram Stars)',
    premium_payment_info: '💳 Paiement avec Telegram Stars — la monnaie interne de Telegram. <b>Pas de renouvellement automatique.</b>',
    premium_renewal_info: '📅 Renouvelable à tout moment. Les jours seront ajoutés à la durée restante.',
    premium_stars_info: '💡 Achetez des étoiles sans commission via le bot officiel [@PremiumBot].',
    premium_why_paid_title: '👀 Pourquoi payant ?',
    premium_why_paid_text: 'L\'hébergement coûte environ $200 par mois, sans compter la croissance des utilisateurs. Et moi, développeur, j\'ai aussi besoin de manger pour continuer à améliorer le service :)',
    premium_payment_title: '💳 *Paiement de l’abonnement premium*',
    premium_payment_description: 'Vous avez choisi : <b>{duration}</b>\nPrix : <b>{stars} ⭐️</b>\n\nCliquez ci-dessous pour payer via Telegram Stars.',
    // Libellés des tarifs et nom du produit
    tariff_button_30: '1 mois',
    tariff_button_90: '3 mois',
    tariff_button_180: '6 mois',
    tariff_button_365: '1 an',
    tariff_item_30: '1 mois (30 jours)',
    tariff_item_90: '3 mois (90 jours)',
    tariff_item_180: '6 mois (180 jours)',
    tariff_item_365: '12 mois (365 jours)',
    premium_product: 'Abonnement premium',
    discount_save: 'économie {percent}%',
  
    payment_success: '🎉 *Paiement réussi !* Votre abonnement premium est activé. Profitez des fonctionnalités avancées.',
    donation_success: '🙏 *Merci pour votre soutien !* Vos dons aident à développer le bot.',
    general_payment_success: '✅ *Paiement réussi !* Merci d’utiliser notre bot.',
    premium_expires: '📅 Premium actif jusqu’au : <b>{date}</b>\n⏰ Jours restants : <b>{days}</b>',
  
    // Dons
    donate_prompt_title: '🤝 Soutenir le projet',
    donate_prompt_text: 'Entrez le nombre d’étoiles (1 à 2500) que vous souhaitez donner.\nVous pouvez ajouter un message (max. 500 caractères) à la ligne suivante.',
    donate_invalid: '❌ Entrez un entier de 1 à 2500. Message max. 500 caractères.',
    donate_created: '✅ Demande de don créée : {stars} ⭐️. Je vous envoie le lien de paiement.',
    donate_paid: '🙏 Merci pour votre soutien ! Don reçu : {stars} ⭐️',
    
    // Erreurs de validation
    error_too_long_regular: '❌ Description trop longue ! Max. 80 caractères pour les utilisateurs standard.',
    error_too_long_premium: '❌ Description trop longue ! Max. 160 caractères pour les premium.',
    error_no_description: '❌ Vous devez saisir une description après le montant.',
    error_amount: '❌ Montant invalide. Entrez un nombre entre 0.01 et 999999.',
    error_format: '❌ Format invalide. Écrivez montant et description.\nEx : `200 courses` ou `1500 déjeuner au café`',
    error_limit_reached: '❌ Limite atteinte !\nStandard : 100 entrées\nPremium : 300 entrées\n\n💎 Passez en premium pour plus de limites !',
    error_premium_required: '💎 Cette fonction est réservée aux premium !\n\nAvantages :\n• 160 caractères description\n• 300 entrées\n• Catégories personnalisées\n• Statistiques avancées',
    error_generic: '❌ Erreur. Réessayez plus tard ou contactez un admin.',
    
    // Boutons
    button_menu: '📋 Menu',
    button_expenses_month: '💰 Dépenses du mois',
    button_expenses_day: '💰 Dépenses du jour',
    button_expenses_categories: '💰 Dépenses par catégorie',
    button_family: '👨‍👩‍👧‍👦 Famille',
    button_settings: '⚙️ Paramètres',
    button_delete_last: '🗑️ Supprimer la dernière entrée',
    button_limits: '📊 Limites',
    button_help: '❓ Aide',
    button_edit: 'Modifier',
    button_delete: 'Supprimer',
    button_mark_as_family: '👨‍👩‍👧‍👦 Vers famille',
    button_remove_from_family: '🚫 Retirer du budget familial',
    expense_already_family: '❌ Cette dépense est déjà familiale',
    expense_converted_to_family: '✅ Dépense transférée au budget familial',
    expense_removed_from_family: '✅ Dépense retirée du budget familial',
    not_owner: '❌ Vous n’êtes pas l’auteur de cette dépense',
    button_cancel: '❌ Annuler',
    button_back: '⬅️ Retour',
    button_change_currency: '💱 Changer de devise',
    button_change_timezone: '🌍 Fuseau horaire',
    button_change_language: '🌐 Langue',
    button_custom_categories: '🏷️ Catégories personnalisées',
    
    // Langues
    language_select: '🌍 Choisissez la langue :',
    language_set: '✅ Langue changée en français',
    language_not_supported: '❌ Langue non prise en charge',
    language_change_error: '❌ Erreur lors du changement de langue',
    timezone_error: '❌ Erreur lors de la configuration du fuseau horaire',
    
    // Exportation
    export_success: '📊 Données exportées avec succès !',
    export_error: 'Erreur lors de l’exportation 😞',
    keyboard_updated: '✅ Clavier mis à jour dans votre langue !',
    
    // Édition
    edit_canceled: 'Modification annulée.',
    edit_no_active: 'Aucune modification active.',
    edit_instructions: 'Entrez un nouveau montant et/ou une description (ex : 500 café) ou cliquez sur annuler.',
    edit_empty: 'Saisissez un montant, une description, ou les deux.',
    edit_amount_error: 'Montant invalide.',
    edit_too_long: 'Description trop longue (max. {max} caractères).',
    edit_format_error: 'Format invalide.',
    
    // Réponses callback
    callback_limit_reached: '❌ Limite d’entrées atteinte',
    callback_button_not_found: '❌ Erreur : bouton introuvable',
    callback_data_not_found: '❌ Erreur : données introuvables',
    callback_expense_added: '✅ Ajouté à la catégorie "{category}"',
    callback_expense_saved: '❌ Erreur lors de l’enregistrement',
    callback_canceled: '❌ Annulé',
    callback_expense_canceled: '❌ Ajout de dépense annulé',
    callback_deleted: 'Entrée supprimée !',
    callback_delete_error: 'Erreur de suppression ou entrée introuvable',
    callback_edit_mode: 'Sortie du mode édition :',
    callback_no_cards: 'Aucune fiche… une erreur est survenue',
    
    // Catégories par défaut
    category_food: 'Nourriture',
    category_transport: 'Transport',
    category_entertainment: 'Divertissement',
    category_shopping: 'Achats',
    category_health: 'Santé',
    category_other: 'Autres',
    
    // Exportation CSV
    date_label: 'Date',
    currency_label: 'Devise',
    total_by_currencies: 'Total par devises:',
    total_in_currency: 'Total en {currency}',
    
    // Catégories personnalisées (premium)
    custom_categories_title: '🏷️ Catégories personnalisées',
    custom_categories_info: 'Vous pouvez créer vos propres catégories de dépenses (premium uniquement).',
    custom_categories_add: '➕ Ajouter catégorie',
    custom_categories_manage: '🗂️ Gérer les catégories',
    custom_categories_enter_name: 'Entrez le nom de la nouvelle catégorie (1-30 caractères) :',
    custom_categories_created: '✅ Catégorie créée : {name}',
    custom_categories_exists: '❌ Cette catégorie existe déjà.',
    custom_categories_limit_reached: '❌ Limite de catégories atteinte : {max}',
    custom_categories_list_empty: 'Vous n’avez pas de catégories personnalisées.',
    custom_categories_list_title: 'Vos catégories personnalisées :',
    custom_categories_delete: '🗑️ Supprimer',
    custom_categories_deleted: '✅ Catégorie supprimée.',
    custom_categories_premium_required: '💎 Cette fonctionnalité est réservée aux premium.'
};
