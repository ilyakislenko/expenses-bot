module.exports = {
    button_reminders: '🔔 Me rappeler',
    reminders_enabled: '🔔 Rappels activés',
    reminders_disabled: 'Rappels désactivés. Silence total 🤐',
    reminder_sample_variants: [
      '👋 Hé ! Si ton portefeuille se tait, ça ne veut pas dire qu’il est heureux. Enregistre tes dépenses 😉',
'🤔 Tu as déjà dépensé quelque chose aujourd’hui ? Note-le avant que la mémoire ne parte chercher du pain 🧠🥖',
'💭 Si tu ne l’as pas noté, considère que c’est dépensé dans le vide. Allons l’enregistrer 💸',
'🌊 Goutte après goutte, le budget s’échappe sans qu’on s’en rende compte. Mieux vaut noter les dépenses d’aujourd’hui 🌊',
'🤖 Le bot ne râle pas, il rappelle : il est temps d’enregistrer les dépenses 😌',
'💡 Épargne le centime — le franc suivra. Il est temps de prendre une note !',

'💰 L’argent aime le comptage et le silence. Enregistre tes dépenses.',

'💡 Ne dépense pas en vain — épargne pour l’essentiel. Il est temps de faire une entrée.',

'🏗️ Petites économies — grands résultats. Ajoute un achat maintenant.',

'🌱 Économise aujourd’hui — respire plus librement demain. Enregistre tes dépenses.',

'🔄 Un rouble bien gardé en rapporte deux. Enregistre une dépense en une minute.',

'⏰ Mets de côté d’abord — dépense ensuite. Il est temps de prendre une note !',

'🧱 Chaque centime est une brique de liberté. Enregistre une dépense.',

'🛡️ Épargne à l’avance pour les jours de pluie. Ajoute une entrée maintenant.',

'📈 Dépenser intelligemment est le meilleur investissement. Enregistre l’achat.',

'🎯 Contrôler ses dépenses = moins de soucis. Enregistre tes dépenses.',

'🚀 Moins d’impulsions — plus d’opportunités. Il est temps de faire une entrée.',

'💎 Paie-toi d’abord. Ajoute une dépense dans le bot.',

'✂️ Une dépense inutile supprimée = un revenu gagné. Enregistre l’achat.',

'🎪 Un budget, c’est la liberté de choix. Enregistre les dépenses d’aujourd’hui.',

'🌟 L’épargne est un “oui” à ton futur. Il est temps de prendre une note !',

'⚡ La discipline bat le chaos. Enregistre la dépense.',

'⏳ L’argent s’en va en silence — enregistre à temps. Ajoute une dépense maintenant.',

'🧘 La frugalité est le chemin vers la sérénité. Enregistre l’achat.',

'📋 L’argent aime l’ordre. Il est temps de faire une entrée.'
    ],
    reminder_message_title: 'Rappel',
    reminder_turn_on_off: (enabled) => enabled ? 'Désactiver les rappels' : 'Activer les rappels',
    button_configure_reminder_hours: '⏰ Configurer les heures de rappel',
    reminder_hours_info: 'Sélectionne jusqu\'à 3 heures pour les rappels (ton fuseau horaire local). Actuelles :',
    reminder_hours_limit: 'Tu peux sélectionner jusqu\'à 3 heures',
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
    admin_cannot_demote_self: '❌ Impossible de retirer tes propres droits administrateur.',
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
    start_message: `Bonjour ! 👋 Je vais t'aider à suivre tes dépenses et tes revenus.

*Dépense* — écris simplement le montant et la description : \`250 café\`, \`1500 déjeuner\`.
Une autre devise marche aussi : \`20 USD taxi\`, ou juste un montant : \`300\`.
*Revenu* — avec un plus : \`+50000 salaire\`.

Choisis une catégorie une fois — je m'en souviendrai la prochaine fois.
Le menu est en bas : aperçu du mois, entrées du jour, revenus, dépenses récurrentes (loyer, abonnements) et «☰ Plus».`,

    start_returning: '👋 Content de te revoir ! Envoie une dépense en message — `250 café`. Le menu est sur le clavier ci-dessous.',
  help_message: `❓ *Mode d'emploi*

• \`250 café\` — dépense. Choisis une catégorie une fois, je m'en souviendrai
• \`20 USD taxi\` — dépense dans une autre devise, \`300\` — sans description
• \`+50000 salaire\` — revenu (\`+1000 USD\` — dans une autre devise)
• Sous une nouvelle entrée : ↩️ annuler, 🏷 changer de catégorie
• 📊 *Aperçu du mois* — dépenses, revenus, solde, catégories ; ◀️ — périodes précédentes
• 📅 *Aujourd'hui* — entrées du jour ; touche un numéro pour modifier ou supprimer une entrée
• 🔁 *Dépenses récurrentes* — le loyer et les abonnements sont enregistrés automatiquement chaque mois
• 🎯 *Budgets* et 📄 *Bilan* de la période — boutons sous l’aperçu du mois (premium)
• Devises, rappels (jusqu'à 3 par jour) et début de période — dans ☰ Plus → ⚙️ Paramètres

Commandes : /stats /history /income /recurring /export /settings /menu`,
  
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
    period_start_prompt: 'Entre le jour du mois (1-31) où commence la nouvelle période. Mois courts : dernier jour.',
    period_start_invalid: '❌ Nombre invalide. Entre un entier entre 1 et 31.',
    period_start_set: '✅ Jour de début fixé : {day}',
    timezone_setup: `🕐 *Réglage du fuseau horaire*
  
  Quelle heure est-il chez toi ?
  
  *Heure UTC actuelle :* {utcTime}
  
  Sélectionne ton heure actuelle :`,
    timezone_set: '✅ Fuseau horaire défini : {timezone}',
    // Budget familial
    button_family: '👨‍👩‍👧‍👦 Famille',
    family_label: '🏠 *Famille:*',
    family_owner_label: '👑 *Propriétaire:*',
    family_info: '👨‍👩‍👧‍👦 Budget familial\n\nIci, tu peux gérer les dépenses avec ta famille, tes collègues, tes amis, etc.\n\n- \uD83D\uDC6A Un groupe partagé est créé pour suivre les dépenses communes.\n- \u2795 Chaque membre peut ajouter des dépenses.\n- \uD83D\uDDD1\uFE0F Tu peux supprimer tes propres dépenses si nécessaire.\n- \uD83D\uDCCA Des statistiques partagées sont disponibles pour tous les membres.\n- \uD83D\uDCE4 Exporte les données de tout le groupe dans un seul fichier.\n\nUn contrôle partagé signifie moins de chaos et plus de transparence.',
    family_created: '✅ Famille "{name}" créée ! Tu peux maintenant inviter des membres.',
    family_joined: '✅ Tu as rejoint la famille "{name}" !',
    family_left: '✅ Tu as quitté la famille "{name}".',
    family_deleted: '✅ Famille "{name}" supprimée. Toutes les dépenses familiales sont redevenues personnelles.',
    family_member_removed: '✅ Membre supprimé de la famille.',
    family_member_removed_notification: '❌ Tu as été retiré de la famille *{familyName}*.',
    family_cannot_leave_owner: '❌ Le propriétaire de la famille ne peut pas la quitter. Utilise "Supprimer la famille".',
    
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
    invitation_accepted: '✅ Tu as accepté de rejoindre la famille "{name}" !',
    invitation_rejected: '❌ Tu as refusé l’invitation à la famille "{name}".',
    invitation_not_found: '❌ Invitation introuvable ou expirée.',
    invitation_expired: '❌ Invitation expirée.',
    invitation_already_processed: '❌ Invitation déjà traitée.',
    
    // Demandes utilisateur
    enter_family_name: 'Entre le nom de la famille (3-50 caractères) :',
    enter_invite_username: 'Entre le nom d’utilisateur (sans @) :',
    enter_expense_amount: 'Entre le montant et la description de la dépense familiale :',
    
    // Erreurs
    family_name_too_short: '❌ Le nom de la famille doit contenir au moins 3 caractères.',
    family_name_too_long: '❌ Le nom de la famille ne doit pas dépasser 50 caractères.',
    user_not_found: '❌ Utilisateur introuvable.',
    user_already_in_family: '❌ L’utilisateur est déjà dans une famille.',
    user_already_has_invitation: '❌ L’utilisateur a déjà une invitation active.',
    user_already_in_other_family: '❌ L’utilisateur est déjà dans une autre famille.',
    user_already_in_your_family: '❌ L’utilisateur est déjà membre de ta famille.',
    user_not_premium: '❌ L’utilisateur n’a pas de statut premium.',
    only_owner_can_invite: '❌ Seul le propriétaire de la famille peut inviter des membres.',
    active_invitations: '📋 Invitations actives',
    no_active_invitations: '📋 Tu n’as pas d’invitations actives.',
    active_invitations_list: '📋 Invitations actives :',
    cancel_invitation: '❌ Annuler l’invitation',
    invitation_cancelled: '✅ Invitation annulée.',
    not_authorized: '❌ Tu n’as pas les droits pour effectuer cette action.',
    invitation_code: '🔑 Code d’invitation : `{code}`',
    family_invitation_received: '🎉 Tu es invité dans la famille *{familyName}*\n\n👤 Invité par : {inviterName}\n🔑 Code : `{inviteCode}`\n\nChoisis une action :',
    accept_invitation: '✅ Accepter',
    reject_invitation: '❌ Refuser',
    invitation_accepted: '🎉 Félicitations ! Tu as rejoint la famille *{familyName}*',
    invitation_rejected: '❌ Tu as refusé l’invitation',
    invitation_not_pending: '❌ L’invitation n’est pas en attente',
    invitation_cancelled_notification: '❌ L’invitation dans la famille *{familyName}* a été annulée par {cancelledBy}',
    enter_invite_code: '🔑 Entre le code d’invitation :',
    only_owner_can_remove: '❌ Seul le propriétaire de la famille peut supprimer des membres.',
    only_owner_can_delete: '❌ Seul le propriétaire peut supprimer la famille.',
    cannot_remove_owner: '❌ Impossible de supprimer le propriétaire.',
    cannot_remove_yourself: '❌ Tu ne peux pas te supprimer toi-même.',
    family_not_found: '❌ Famille introuvable.',
    not_family_member: '❌ Tu n’es pas membre de cette famille.',
    not_family_owner: '❌ Tu n’es pas le propriétaire de la famille.',
    
    // Confirmations
    confirm_delete_family: '⚠️ *Suppression de famille*\n\nTous les membres seront supprimés et les dépenses familiales redeviendront personnelles.\n\nEs-tu sûr ?',
    confirm_remove_member: '⚠️ *Retrait de membre*\n\nLe membre sera supprimé de la famille.\n\nEs-tu sûr ?',
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
    confirm_remove_member: '⚠️ *Retrait de membre*\n\nVeux-tu vraiment retirer {name} de la famille ?',
    member_removed: '✅ {name} a été retiré de la famille.',
    member_removed_notification: '❌ Tu as été retiré de la famille *{familyName}* par {ownerName}.',
    
    // Fonctions premium
    premium_required: '❌ Cette fonction est réservée aux utilisateurs premium.',
    upgrade_to_premium: '💎 Passe en premium pour accéder au budget familial !',
    
    timezone_updated: `✅ *Fuseau horaire mis à jour !*
  
  🕐 Heure sélectionnée : *{time}*
  🌍 Fuseau horaire : *{timezone}*
  
  Toutes tes dépenses seront désormais affichées à ton heure locale.`,
    timezone_updated_simple: `✅ *Fuseau horaire mis à jour !*
  
  🌍 Nouveau fuseau horaire : *{timezone}*
  
  Tes dépenses seront désormais affichées correctement à ton heure locale.`,
    
    // Limites
    limits_title: '📊 *Informations sur les limites*',
    status_regular: '👤 Standard',
    status_premium: '💎 Premium',
    status_label: '*Statut :* {status}',
    max_description_length: '<b>Longueur max. de description :</b> {length} caractères',
    premium_benefits: `💎 <b>Avantages premium :</b>
  • 🎯 Budgets mensuels et par catégorie avec alertes à 80 % et en cas de dépassement
  • 📄 Bilan complet de la période : chaque catégorie comparée au mois précédent, budgets, dépense moyenne par jour
  • 160 caractères dans la description (au lieu de 80)
  • Jusqu’à 5 catégories personnalisées
  • Budget familial
  • Modification du montant et de la description de n’importe quelle entrée

  L’enregistrement des dépenses et des revenus est gratuit et illimité.`,
    
    // Abonnement premium
    premium_subscription_title: '⭐️ Abonnement',
    premium_status_header: '<b>Ton statut :</b>',
    premium_privileges: 'Privilèges : {status}',
    premium_limits_info: 'Ici figurent tes limites : nombre de catégories, dépenses, accès familial, durée premium restante.',
    premium_menu_title: '<b>Menu :</b>',
    premium_tariff_button: '⭐️ Tarifs',
    premium_why_paid_button: '👀 Pourquoi payant ?',
    premium_donate_button: '🤝 Faire un don',
    premium_back_button: '⬅️ Retour',
    premium_tariffs_title: '⭐️ Tarifs (Telegram Stars)',
    premium_payment_info: '💳 Paiement avec Telegram Stars — la monnaie interne de Telegram. 🔁 Le forfait mensuel se renouvelle automatiquement ; annule-le dans Telegram : Paramètres → Mes étoiles → Mes abonnements. Les forfaits de 3, 6 et 12 mois sont des paiements uniques.',
    premium_renewal_info: '📅 Renouvelable à tout moment. Les jours seront ajoutés à la durée restante.',
    premium_stars_info: '💡 Achète des étoiles sans commission via le bot officiel [@PremiumBot].',
    premium_why_paid_title: '👀 Pourquoi payant ?',
    premium_purchases_button: '🧾 Historique des achats',
    purchases_header: '🧾 Historique des achats',
    purchases_premium_title: 'Premium',
    purchases_donations_title: 'Dons',
    no_purchases: 'Aucun achat pour le moment',
    purchases_prev_button: '◀ Précédent',
    purchases_next_button: 'Suivant ▶',
    purchases_page_indicator: 'Page {page}/{total}',
    premium_why_paid_text: 'L\'hébergement coûte environ $200 par mois, sans compter la croissance des utilisateurs. Et moi, développeur, j\'ai aussi besoin de manger pour continuer à améliorer le service :)',
    premium_payment_title: '💳 *Paiement de l’abonnement premium*',
    premium_payment_description: 'Tu as choisi : <b>{duration}</b>\nPrix : <b>{stars} ⭐️</b>\n\nClique ci-dessous pour payer via Telegram Stars.',
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
  
    payment_success: '🎉 *Paiement réussi !* Ton abonnement premium est activé. Profite des fonctionnalités avancées.',
    donation_success: '🙏 *Merci pour ton soutien !* Tes dons aident à développer le bot.',
    general_payment_success: '✅ *Paiement réussi !* Merci d’utiliser notre bot.',
    premium_expires: '📅 Premium actif jusqu’au : <b>{date}</b>\n⏰ Jours restants : <b>{days}</b>',
  
    // Dons
    donate_prompt_title: '🤝 Soutenir le projet',
    donate_prompt_text: 'Entre le nombre d’étoiles (1 à 2500) que tu souhaites donner.\nTu peux ajouter un message (max. 500 caractères) à la ligne suivante.',
    donate_invalid: '❌ Entre un entier de 1 à 2500. Message max. 500 caractères.',
    donate_created: '✅ Demande de don créée : {stars} ⭐️. Je t’envoie le lien de paiement.',
    donate_paid: '🙏 Merci pour ton soutien ! Don reçu : {stars} ⭐️',
    
    // Erreurs de validation
    error_too_long_regular: '❌ Description trop longue ! Max. 80 caractères pour les utilisateurs standard.',
    error_too_long_premium: '❌ Description trop longue ! Max. 160 caractères pour les premium.',
    error_no_description: '❌ Tu dois saisir une description après le montant.',
    error_amount: '❌ Montant invalide. Entre un nombre entre 0.01 et 999999.',
    error_format: '❌ Je n\'ai pas compris. Commence par un montant : `250 café`, `20 USD taxi` ou juste `300`.',
    error_forbidden_content: '❌ Contenu interdit.',
    error_premium_required: '💎 Cette fonction est réservée aux premium.\n\nPremium t’offre :\n• Budgets avec alertes\n• Bilan complet de la période\n• Catégories personnalisées\n• Budget familial\n• Modification des entrées',
    error_generic: '❌ Erreur. Réessaie plus tard ou contacte un admin.',
    
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
    not_owner: '❌ Tu n’es pas l’auteur de cette dépense',
    button_cancel: '❌ Annuler',
    button_back: '⬅️ Retour',
    button_change_currency: '💱 Changer de devise',
    button_change_timezone: '🌍 Fuseau horaire',
    button_change_language: '🌐 Langue',
    button_custom_categories: '🏷️ Catégories personnalisées',
    
    // Langues
    language_select: '🌍 Choisis la langue :',
    language_set: '✅ Langue changée en français',
    language_not_supported: '❌ Langue non prise en charge',
    language_change_error: '❌ Erreur lors du changement de langue',
    timezone_error: '❌ Erreur lors de la configuration du fuseau horaire',
    
    // Exportation
    export_success: '📊 Données exportées avec succès !',
    export_error: 'Erreur lors de l’exportation 😞',
    keyboard_updated: '✅ Clavier mis à jour dans ta langue !',
    
    // Édition
    edit_canceled: 'Modification annulée.',
    edit_no_active: 'Aucune modification active.',
    edit_instructions: 'Entre un nouveau montant et/ou une description (ex : 500 café) ou clique sur annuler.',
    edit_empty: 'Saisis un montant, une description, ou les deux.',
    edit_amount_error: 'Montant invalide.',
    edit_too_long: 'Description trop longue (max. {max} caractères).',
    edit_format_error: 'Format invalide.',
    
    // Réponses callback
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
    custom_categories_info: 'Tu peux créer tes propres catégories de dépenses (premium uniquement).',
    custom_categories_example: '💡 Exemple: "🌍 Voyages" ou "🎮 Jeux"',
    custom_categories_add: '➕ Ajouter catégorie',
    custom_categories_manage: '🗂️ Gérer les catégories',
    custom_categories_enter_name: 'Entre le nom de la nouvelle catégorie (1-30 caractères) :',
    custom_categories_created: '✅ Catégorie créée : {name}',
    custom_categories_exists: '❌ Cette catégorie existe déjà.',
    custom_categories_limit_reached: '❌ Limite de catégories atteinte : {max}',
    custom_categories_list_empty: 'Tu n’as pas de catégories personnalisées.',
    custom_categories_list_title: 'Tes catégories personnalisées :',
    custom_categories_delete: '🗑️ Supprimer',
    custom_categories_deleted: '✅ Catégorie supprimée.',
    custom_categories_premium_required: '💎 Cette fonctionnalité est réservée aux premium.',

    // Income
    button_income: '💵 Revenus',
    button_add_income: '➕ Ajouter un revenu',
    button_income_currency: '💱 Devise des revenus',
    income_menu_title: '💵 *Revenus de la période en cours*',
    income_menu_empty: 'Aucun revenu pour cette période.',
    income_currency_label: 'Devise de revenu par défaut : *{currency}*',
    income_hint: '💡 Méthode rapide : envoie un message commençant par plus — `+50000 salaire` ou `+1000 USD freelance`',
    income_enter_prompt: 'Saisis le montant et la description du revenu 👇\n\nExemple : `50000 salaire`\nDevise par défaut — *{currency}*. Tu peux en indiquer une autre avec un code après le montant : `1000 USD freelance`',
    income_added: '✅ Revenu enregistré : *{amount}* — {description}',
    income_default_description: 'Revenu',
    income_deleted: '✅ Revenu supprimé',
    income_not_found: '❌ Revenu introuvable',
    income_currency_select: 'Choisis la devise dans laquelle tu es habituellement payé. Les dépenses restent dans ta devise principale :',
    income_currency_set: '✅ Devise des revenus : {currency}',
    income_total: '💵 Revenus : *{amount}*',
    balance_label: '⚖️ Solde (revenus − dépenses) : *{amount}*',
    income_error_format: '❌ Je n\'ai pas compris. Envoie un montant et une description facultative : `50000 salaire` ou `1000 USD freelance`',
    income_error_amount: '❌ Montant invalide. Saisis un nombre de 0.01 à {max}.',

    // Recurring expenses
    button_recurring: '🔁 Dépenses récurrentes',
    button_add_recurring: '➕ Ajouter une dépense récurrente',
    recurring_menu_title: '🔁 *Dépenses récurrentes*',
    recurring_menu_info: 'Les paiements mensuels (loyer, abonnements, crédits) sont enregistrés automatiquement comme dépenses le jour du mois choisi.',
    recurring_menu_empty: 'Aucune dépense récurrente pour le moment.',
    recurring_item: '{icon} {description} — *{amount}*, le {day} de chaque mois\n    Prochain enregistrement : {next}',
    recurring_monthly_total: 'Total par mois : *{amount}*',
    recurring_enter_prompt: 'Saisis le montant et la description de la dépense récurrente 👇\n\nExemple : `50000 loyer`\nTu peux indiquer une devise après le montant : `500 USD loyer`',
    recurring_day_prompt: 'Quel jour de chaque mois dois-je enregistrer cette dépense ? Saisis un nombre de 1 à 31.\n\nSi un mois est plus court, je l\'enregistrerai le dernier jour du mois.',
    recurring_day_invalid: '❌ Saisis un nombre entier de 1 à 31.',
    recurring_select_category: 'Choisis une catégorie pour la dépense récurrente :',
    recurring_added: '✅ Dépense récurrente ajoutée\n\n{description} — *{amount}*, le {day} de chaque mois\nPremier enregistrement : {next}',
    recurring_added_charged_now: '✅ Dépense récurrente ajoutée et déjà enregistrée pour ce mois\n\n{description} — *{amount}*, le {day} de chaque mois\nProchain enregistrement : {next}',
    recurring_deleted: '✅ Dépense récurrente supprimée. Les dépenses déjà enregistrées restent dans l\'historique.',
    recurring_not_found: '❌ Dépense récurrente introuvable',
    recurring_limit: '❌ Tu peux avoir au maximum {max} dépenses récurrentes',
    recurring_charged_notification: '🔁 Dépense récurrente enregistrée : {icon} {description} — *{amount}*',
    recurring_error_format: '❌ Format non reconnu. Envoie un montant et une description : `50000 loyer` ou `500 USD loyer`',
    recurring_error_amount: '❌ Montant invalide. Saisis un nombre de 0.01 à {max}.',

    // Main menu and «More»
    button_overview: '📊 Aperçu du mois',
    button_today: '📅 Aujourd\'hui',
    button_more: '☰ Plus',
    more_menu_title: '☰ *Plus*',
    button_export: '📤 Export CSV',
    keyboard_refreshed: '✅ Le menu est mis à jour — il est plus compact maintenant 👇',
    button_outdated: 'Ce bouton est obsolète. Rouvre la section depuis le menu ci-dessous.',
    overview_title: 'Aperçu : {range}',
    overview_spent: '💸 Dépenses : *{amount}* · entrées : {count}',
    overview_upcoming: 'Récurrentes à venir :',
    overview_income_hint: '💡 Enregistre un revenu avec un plus : `+50000 salaire`',
    button_prev_period: '◀️ Avant',
    button_next_period: 'Après ▶️',
    button_back_to_overview: '⬅️ Vers l\'aperçu',
    day_title_today: 'Aujourd\'hui, {date}',
    day_title_yesterday: 'Hier, {date}',
    day_title: '{date}',
    day_entry_hint: 'Envoie une dépense en message : `250 café`',
    button_prev_day: '◀️ Jour précédent',
    button_next_day: 'Jour suivant ▶️',
    list_tap_number: 'Touche un numéro pour ouvrir l\'entrée.',
    family_today_title: 'Famille : entrées du jour',
    button_undo: '↩️ Annuler',
    button_delete_record: '🗑 Supprimer',
    button_change_category: '🏷 Catégorie',
    button_edit_record: '✏️ Modifier',
    expense_family_label: 'dans le budget familial',
    expense_recurring_label: 'enregistrée automatiquement (dépense récurrente)',
    expense_category_remembered: '🏷 La catégorie vient de ton entrée précédente avec la même description — change-la avec le bouton ci-dessous.',
    category_will_be_remembered: '💡 Je retiens ton choix : la prochaine fois, une telle entrée ira directement dans cette catégorie.',
    expense_category_changed: 'Catégorie : {category}',
    settings_header: 'Paramètres',
    settings_currency_line: '💱 Devise : *{currency}* · revenus : *{incomeCurrency}*',
    settings_timezone_line: '🌍 Fuseau horaire : {timezone}',
    settings_language_line: '🌐 Langue : {language}',
    settings_period_line: '📅 La période commence le jour {day}',
    settings_reminders_on_line: '🔔 Rappels : activés ({hours})',
    settings_reminders_off_line: '🔔 Rappels : désactivés',
    button_currencies: '💱 Devises',
    settings_currencies_text: '💱 *Devises*\n\nPrincipale — les dépenses et tous les totaux y sont calculés : *{currency}*\nDevise des revenus par défaut : *{incomeCurrency}*\n\nToute entrée peut être dans une autre devise — mets le code après le montant : `20 USD taxi`.',
    reminders_title: 'Rappels',
    reminders_info: 'Si tu n\'as rien enregistré à l\'heure choisie, je te le rappellerai. Au maximum 3 fois par jour.',
    button_reminders_on: '🟢 Activé — touche pour désactiver',
    button_reminders_off: '⚫ Désactivé — touche pour activer',
    family_teaser: '👨‍👩‍👧‍👦 *Budget familial*\n\nLes dépenses communes avec tes proches au même endroit : chacun enregistre les siennes, les statistiques et l\'export sont partagés.\n\nDisponible avec premium.',
    button_premium: '⭐️ Premium',

    // Subscription and premium ending
    subscription_active_info: '🔁 L’abonnement mensuel est payé jusqu’au {date} et se renouvelle automatiquement. Pour l’annuler : Telegram → Paramètres → Mes étoiles → Mes abonnements.',
    subscription_renewed: '🔁 Abonnement renouvelé. Premium actif jusqu’au {date}.',
    button_view_tariffs: '⭐️ Tarifs',
    premium_expiring_trial: '⏳ Ton essai premium se termine le {date}.\n\nEnsuite, les budgets, le bilan complet de la période, les catégories personnalisées, le budget familial et la modification des entrées ne fonctionneront plus. Tout ce que tu as enregistré est conservé, et le suivi des dépenses est gratuit.',
    premium_expiring_paid: '⏳ Premium se termine le {date}. Tu peux renouveler à l’avance — les jours restants sont conservés.',
    premium_expired_trial: '🌙 Ton essai premium est terminé. Le suivi des dépenses et des revenus reste gratuit ; les budgets, le bilan complet, les catégories personnalisées, la famille et la modification des entrées sont inclus avec premium.',
    premium_expired_paid: '🌙 Premium est terminé. Merci de soutenir le projet ! Tu peux renouveler à tout moment.',
    premium_winback: '👋 Ton premium a pris fin il y a une semaine. Si tu veux retrouver les budgets, le bilan complet, les catégories personnalisées, le budget familial et la modification des entrées — consulte les tarifs ci-dessous.',
    start_reminders_note: '🔔 Si tu n’enregistres rien pendant la journée, je te le rappellerai (jusqu’à 3 fois par jour). Modifier les heures ou désactiver : ☰ Plus → ⚙️ Paramètres → 🔔.',
    per_month: 'par mois',

    // Budgets
    button_budgets: '🎯 Budgets',
    budgets_title: 'Budgets',
    budgets_empty: 'Fixe une limite pour tout le mois ou pour une catégorie — je te préviendrai à 80 % et en cas de dépassement.',
    budgets_teaser: '🎯 *Budgets*\n\nUne limite pour le mois ou pour une catégorie : la progression s’affiche dans l’aperçu, et tu reçois une alerte à 80 % et en cas de dépassement.\n\nDisponible avec premium.',
    button_budget_total: '➕ Tout le mois',
    button_budget_category: '➕ Catégorie',
    button_budget_change: '✏️ Modifier le montant',
    budget_total_name: '🎯 Tout le mois',
    budget_left: 'reste {amount}',
    budget_over: 'dépassé de {amount}',
    budget_enter_prompt: 'Saisis la limite de la période pour « {name} » 👇\n\nPar exemple : `10000` (en *{currency}*) ou `150 USD`',
    budget_amount_invalid: '❌ Seul un montant est attendu : `10000` ou `150 USD`.',
    budget_saved: '✅ Budget enregistré',
    budget_deleted: '✅ Budget supprimé',
    budget_not_found: '❌ Budget introuvable',
    budget_warning_80: '⚠️ {name} : {spent} dépensés sur {limit} ({percent} %)',
    budget_warning_100: '🚨 {name} : budget dépassé — {spent} sur {limit} ({percent} %)',
    overview_budget_of: 'sur un budget de {amount}',

    // Period summary
    button_report: '📄 Bilan',
    report_title: 'Bilan : {range}',
    report_vs_previous: 'Par rapport à la période précédente : {change} (avant {amount})',
    report_change_new: 'nouveau',
    report_change_same: 'sans changement',
    report_top_categories: 'Principales dépenses :',
    report_locked: '🔒 Le détail complet — chaque catégorie comparée à la période précédente, budgets, dépense moyenne par jour et la plus grosse dépense — est inclus avec premium.',
    report_categories_vs_previous: 'Catégories (par rapport à la période précédente) :',
    report_categories_gone: 'Aucune dépense cette fois : {list}',
    report_more_numbers: 'Autres chiffres :',
    report_per_day: '📅 Moyenne par jour : {amount}',
    report_largest: '🔝 Plus grosse dépense : {amount} — {description} ({date})',
    overview_budget_limit: 'limite {amount}',
    report_title_current: 'Bilan à ce jour : {range}'
};
