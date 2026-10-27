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
    security_error: '❌ *Erreur de sécurité*\n\nRéessaie plus tard ou contacte un administrateur.',
    
    // Panneau admin
    button_admin: '👑 Panneau d’administration',
    admin_access_denied: '❌ Tu n’as pas les droits d’administrateur.',
    admin_panel_title: '👑 *Panneau d’administration*\n\nChoisis une action :',
    admin_error: '❌ Erreur lors de l’exécution de l’action administrateur.',
    
    // Statistiques admin
    admin_stats_text: `📊 *Statistiques du bot*

👥 *Utilisateurs :*
• Total : {totalUsers}
• Premium : {activePremium}
• Nouveaux cette semaine : {newUsersWeek}
• Nouveaux ce mois-ci : {newUsersMonth}

💰 *Dépenses :*
• Nombre total d’entrées : {totalExpenses}
• Cette semaine : {expensesWeek}
• Utilisateurs actifs : {activeUsers}

🐛 *Rapports de bugs :* {totalBugReports}

💎 *Dons :*
• Total : {totalDonations}
• Étoiles collectées : {totalStars}

⭐ *Transactions premium :* {premiumTransactions}`,
  
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

📊 *Résumé :*
• Dons totaux : {totalDonations}
• Terminés : {completedDonations}
• En attente : {pendingDonations}

⭐ *Étoiles :*
• Total collecté : {totalStars}
• Don moyen : {avgStars} étoiles`,
  
    // Premium admin
    admin_premium_stats: `⭐ *Statistiques premium*

📊 *Utilisateurs :*
• Total premium : {totalPremiumUsers}
• Actifs maintenant : {activePremiumUsers}

💳 *Transactions :*
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

{adminFlag}{premiumFlag} {firstName} (@{username})
🆔 ID : {userId}
🌐 Langue : {language}
💱 Devise : {currency}
🕐 Fuseau horaire : {timezone}
📅 Inscription : {createdAt}

📊 *Statistiques :*
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
    admin_broadcast_confirm: '📢 Confirmer la diffusion\n\n📝 Texte :\n{message}\n\n📏 Longueur : {length} caractères\n\n⚠️ Ce message sera envoyé à TOUS les utilisateurs du bot !',
    admin_broadcast_started: '📢 Diffusion commencée...',
    admin_broadcast_result: '📢 *Diffusion terminée !*\n\n📊 *Statistiques :*\n• Total utilisateurs : {total}\n• Envoyé : {sent}\n• Échecs : {failed}',
    admin_broadcast_header: '🔴🔴🔴 Notification ! 🔴🔴🔴',
    
    // Général
    error: 'Une erreur est survenue 😞',
    not_found: 'Non trouvé',
    expense_save_error: '❌ Erreur lors de l’enregistrement de la dépense. Réessaie.',
    cancel: 'Annuler',
    back: 'Retour',
    confirm: 'Confirmer',
    
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
    
    // Catégories
    select_category: 'Choisis une catégorie :',
    amount_label: 'Montant',
    description_label: 'Description',
    category_label: 'Catégorie',
    expense_added_title: 'Dépense ajoutée !',
    
    // Paramètres
    currency_select: 'Choisis la devise par défaut :',
    currency_set: 'Devise définie : {currency}',
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
    family_label: '🏠 *Famille:*',
    family_owner_label: '👑 *Propriétaire:*',
    family_info: '👨‍👩‍👧‍👦 Budget familial\n\nIci, tu peux gérer les dépenses avec ta famille, tes collègues, tes amis, etc.\n\n- \uD83D\uDC6A Un groupe partagé est créé pour suivre les dépenses communes.\n- \u2795 Chaque membre peut ajouter des dépenses.\n- \uD83D\uDDD1\uFE0F Tu peux supprimer tes propres dépenses si nécessaire.\n- \uD83D\uDCCA Des statistiques partagées sont disponibles pour tous les membres.\n- \uD83D\uDCE4 Exporte les données de tout le groupe dans un seul fichier.\n\nUn contrôle partagé signifie moins de chaos et plus de transparence.',
    family_created: '✅ Famille "{name}" créée ! Tu peux maintenant inviter des membres.',
    family_left: '✅ Tu as quitté la famille "{name}". Tes dépenses dans cette famille sont maintenant personnelles.',
    family_deleted: '✅ Famille "{name}" supprimée. Toutes les dépenses familiales sont redevenues personnelles.',
    family_member_removed_notification: '❌ Tu as été retiré de la famille « {familyName} ». Tes dépenses dans cette famille sont maintenant personnelles.',
    
    // Boutons du menu familial
    create_family: '🏠 Créer une famille',
    join_family: '🔗 Rejoindre une famille',
    invite_member: '➕ Inviter un membre',
    leave_family: '🚪 Quitter la famille',
    delete_family: '🗑️ Supprimer la famille',
    family_members: '👥 Membres de la famille',
    family_stats: '💰 Dépenses du mois',
    family_add_expense: '💰 Ajouter une dépense familiale',
    button_personal_expense: '👤 Dépense personnelle',
    enter_personal_expense: 'Entre le montant et la description de la dépense personnelle :',
    family_mode_button_on: '🟢 Toutes les dépenses à la famille — appuie pour désactiver',
    family_mode_button_off: '⚪ Toutes les dépenses à la famille — appuie pour activer',
    family_mode_line_on: '🟢 Les nouvelles dépenses vont à la famille',
    family_mode_line_off: '⚪ Les nouvelles dépenses sont personnelles',
    family_mode_enabled: '✅ Toutes les nouvelles dépenses vont désormais à la famille.\n\nPour une dépense personnelle : «{personalButton}» en bas ou «{removeButton}» sur la fiche de la dépense.',
    family_mode_disabled: '✅ Les nouvelles dépenses sont de nouveau personnelles.\n\nPour une dépense familiale : «{familyButton}» en bas ou «{addButton}» sur la fiche de la dépense.',
    family_menu: '👨‍👩‍👧‍👦 Menu famille',
    family_cancel: '❌ Annuler',
    
    // Invitations
    invitation_sent: '✅ Invitation envoyée à @{username}',
    invitation_not_found: '❌ Invitation introuvable ou expirée.',
    invitation_expired: '❌ Invitation expirée.',
    
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
    family_invitation_received: '🎉 Tu es invité dans la famille « {familyName} »\n\n👤 Invité par : {inviterName}\n🔑 Code : `{inviteCode}`\n\nChoisis une action :',
    accept_invitation: '✅ Accepter',
    reject_invitation: '❌ Refuser',
    invitation_accepted: '🎉 Félicitations ! Tu as rejoint la famille « {familyName} »',
    invitation_rejected: '❌ Tu as refusé l’invitation',
    invitation_not_pending: '❌ L’invitation n’est pas en attente',
    invitation_cancelled_notification: '❌ L’invitation dans la famille « {familyName} » a été annulée par {cancelledBy}',
    enter_invite_code: '🔑 Entre le code d’invitation :',
    not_family_member: '❌ Tu n’es pas membre de cette famille.',
    not_family_owner: '❌ Tu n’es pas le propriétaire de la famille.',
    
    // Confirmations
    confirm_delete_family: '⚠️ *Suppression de famille*\n\nTous les membres seront supprimés et les dépenses familiales redeviendront personnelles.\n\nEs-tu sûr ?',
    // Statistiques famille
    family_daily_stats: '💰 Dépenses du jour',
    family_export: '📊 Exporter les données familiales',
    
    // Liste des membres
    family_members_title: '👥 *Membres de la famille*',
    family_owner_role: 'propriétaire',
    family_member_role: 'membre',
    remove_member: '❌ Retirer',
    confirm_remove_member: '⚠️ *Retrait de membre*\n\nVeux-tu vraiment retirer {name} de la famille ? Ses dépenses familiales deviendront personnelles et la famille ne les verra plus.',
    member_removed: '✅ {name} a été retiré de la famille.',
    
    // Fonctions premium
    premium_required: '❌ Cette fonction est réservée aux utilisateurs premium.',
    
    timezone_updated: `✅ *Fuseau horaire mis à jour !*

🕐 Heure sélectionnée : *{time}*
🌍 Fuseau horaire : *{timezone}*

Toutes tes dépenses seront désormais affichées à ton heure locale.`,
    
    // Limites
    status_regular: '👤 Standard',
    status_premium: '💎 Premium',
    max_description_length: '<b>Longueur max. de description :</b> {length} caractères',
    premium_benefits: '💎 <b>Avantages premium :</b>\n  • 🎯 Budgets mensuels et par catégorie avec alertes à 80 % et en cas de dépassement\n  • 📄 Bilan complet de la période : chaque catégorie comparée au mois précédent, budgets, dépense moyenne par jour\n  • 160 caractères dans la description (au lieu de 80)\n  • Jusqu’à 5 catégories personnalisées\n  • Budget familial\n  • Jusqu’à 10 objectifs d’épargne (sans premium — 1)\n\n  L’enregistrement des dépenses et des revenus est gratuit et illimité.',
    
    // Abonnement premium
    premium_subscription_title: '⭐️ Abonnement',
    premium_status_header: '<b>Ton statut :</b>',
    premium_privileges: 'Privilèges : {status}',
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
    premium_why_paid_text: 'L\'hébergement coûte environ $200 par mois, sans compter la croissance des utilisateurs. Et moi, développeur, j\'ai aussi besoin de manger pour continuer à améliorer le service :)',
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
    
    // Erreurs de validation
    error_too_long_regular: '❌ Description trop longue ! Max. 80 caractères pour les utilisateurs standard.',
    error_too_long_premium: '❌ Description trop longue ! Max. 160 caractères pour les premium.',
    error_amount: '❌ Montant invalide. Saisis un nombre de 0.01 à {max}.',
    error_format: '❌ Je n\'ai pas compris. Commence par un montant : `250 café`, `20 USD taxi` ou juste `300`.',
    error_generic: '❌ Erreur. Réessaie plus tard ou contacte un admin.',
    
    // Boutons
    button_menu: '📋 Menu',
    button_expenses_month: '💰 Dépenses du mois',
    button_expenses_day: '💰 Dépenses du jour',
    button_expenses_categories: '💰 Dépenses par catégorie',
    button_family: '👨‍👩‍👧‍👦 Famille',
    button_settings: '⚙️ Paramètres',
    button_delete_last: '🗑️ Supprimer la dernière entrée',
    button_help: '❓ Aide',
    button_edit: 'Modifier',
    button_mark_as_family: '👨‍👩‍👧‍👦 Vers famille',
    button_remove_from_family: '🚫 Retirer du budget familial',
    expense_already_family: '❌ Cette dépense est déjà familiale',
    expense_converted_to_family: '✅ Dépense transférée au budget familial',
    expense_removed_from_family: '✅ Dépense retirée du budget familial',
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
    callback_data_not_found: '❌ Erreur : données introuvables',
    callback_expense_added: '✅ Ajouté à la catégorie "{category}"',
    callback_canceled: '❌ Annulé',
    callback_expense_canceled: '❌ Ajout de dépense annulé',
    callback_deleted: 'Entrée supprimée !',
    callback_delete_error: 'Erreur de suppression ou entrée introuvable',
    
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
    income_edit_prompt: '✏️ Actuellement : {current}\n\nEnvoie le nouveau montant et/ou la description 👇\nPar exemple : `60000 salaire`, seulement le montant `60000` ou seulement la description `acompte`.\nLa devise se change avec un code après le montant : `1000 USD`',
    income_updated: '✅ Revenu mis à jour',
    button_savings: '🏦 Épargne',
    command_savings: 'Épargne et objectifs',
    savings_title: '🏦 *Épargne*',
    savings_intro: 'Ici, tu peux suivre ton épargne et tes objectifs et voir combien tu pourras mettre de côté en tenant compte de tes dépenses habituelles, des intérêts et de l\'inflation.\n\nIndique ton épargne en un seul montant ou crée des comptes — espèces, dépôt, compte en devises, crypto, chacun avec sa devise et son rendement 👇',
    savings_total: 'Total : *{amount}*',
    savings_general: 'Épargne générale',
    savings_mode_total_short: '(sur toute l\'épargne)',
    savings_goal_achieved_short: '✅ atteint',
    savings_monthly_manual: '📥 Tu mets de côté {amount} par mois (défini manuellement)',
    savings_monthly_unknown: '📥 On ne sait pas encore combien tu mets de côté par mois : enregistre tes revenus sur un mois complet ou définis le montant dans « ⚙️ Paramètres de prévision ».',
    savings_monthly_negative: '⚠️ En moyenne sur {n} mois, les dépenses dépassent les revenus de {amount} par mois — ton épargne ne grandit pas.',
    savings_monthly_auto: '📥 Tu mets de côté ~{amount} par mois — revenus moins dépenses, en moyenne sur {n} mois.',
    savings_in_year: '📈 Dans un an : ~{amount}',
    savings_in_today_money: 'en argent d\'aujourd\'hui ≈ {amount}',
    savings_button_set_current: '✏️ En un seul montant',
    savings_button_new_goal: '🎯 Nouvel objectif',
    savings_button_forecast: '📈 Prévision',
    savings_button_settings: '⚙️ Paramètres de prévision',
    savings_button_back: '⬅️ Épargne',
    savings_not_found: '❌ Je n\'ai pas trouvé cette tirelire — elle a peut-être déjà été supprimée.',
    savings_balance: 'Actuellement : *{amount}*',
    savings_recent_operations: 'Dernières modifications :',
    savings_button_deposit: '➕ Ajouter',
    savings_button_withdraw: '➖ Retirer',
    savings_button_set: '✏️ Montant exact',
    savings_button_transfer: '🔄 Transférer',
    savings_button_goal_target: '🎯 Montant de l\'objectif',
    savings_button_goal_date: '📅 Échéance',
    savings_button_mode_own: '🔀 Mode : tirelire propre',
    savings_button_mode_total: '🔀 Mode : toute l\'épargne',
    savings_button_goal_delete: '🗑 Supprimer l\'objectif',
    savings_mode_own_line: '🐷 Tirelire propre — alimente-la séparément',
    savings_mode_total_line: '🏦 Calculé sur toute l\'épargne',
    savings_goal_progress: 'Épargné : *{current}* sur {target}',
    savings_goal_left: 'reste {amount}',
    savings_goal_deadline: '📅 Échéance : {date} · {left}',
    savings_deadline_left: 'reste {duration}',
    savings_deadline_soon: 'moins d\'un mois',
    savings_deadline_passed: 'échéance dépassée',
    savings_goal_achieved: '🎉 Objectif atteint !',
    savings_goal_unreachable: '📥 Avec {amount} par mois, l\'objectif n\'est pas atteint — il faut mettre plus de côté.',
    savings_goal_eta: '📥 Avec {amount} par mois, l\'objectif sera atteint dans ≈ {duration} ({date})',
    savings_goal_eta_real: '🔥 Avec l\'inflation (l\'objectif renchérit) — dans ≈ {duration}',
    savings_goal_eta_real_never: '🔥 Avec l\'inflation, l\'objectif n\'est pas atteint : le versement ne suit pas la hausse des prix',
    savings_goal_own_assumption: '_Je calcule comme si tout le versement mensuel allait dans cette tirelire._',
    savings_goal_required: '🎯 Pour tenir l\'échéance, mets de côté {amount} par mois',
    savings_goal_required_real: '(avec l\'inflation — {amount})',
    savings_prompt_deposit: 'Combien ajouter à « {name} » ? Il y a actuellement {amount}.\n\nPar exemple : `10000` ou `100 USD` — je convertirai dans la devise de la tirelire.',
    savings_prompt_withdraw: 'Combien retirer de « {name} » ? Il y a actuellement {amount}.',
    savings_prompt_set: 'Combien y a-t-il dans « {name} » en ce moment ? Écris le montant exact, par exemple `350000`.\n\nMontant enregistré : {amount}.',
    savings_transfer_choose: 'Vers où transférer depuis « {name} » ? Disponible : {amount}.',
    savings_prompt_transfer: 'Combien transférer de « {from} » vers « {to} » ? Disponible : {amount}.',
    savings_prompt_goal: 'Écris le montant et le nom de l\'objectif 👇\n\nPar exemple : `1 500 000 voiture` ou `3000 USD vacances`. Devise par défaut : *{currency}*.\n\nL\'échéance et le mode (tirelire propre ou toute l\'épargne) se règlent dans la fiche de l\'objectif.',
    savings_goal_limit_regular: '🎯 La version gratuite permet {limit} objectif. Avec Premium — jusqu\'à 10 objectifs en même temps.',
    savings_goal_limit_premium: '🎯 Tu as déjà {limit} objectifs — c\'est le maximum. Supprimes-en un pour en ajouter un nouveau.',
    savings_prompt_goal_target: 'Nouveau montant pour « {name} » (actuellement {amount}). Tu peux aussi changer le nom : `2 000 000 nouvelle voiture`.',
    savings_prompt_goal_date: 'Pour quand veux-tu épargner pour « {name} » ? Écris le mois et l\'année `12.2027` ou une date `31.12.2027`.',
    savings_button_no_deadline: '♾ Sans échéance',
    savings_deadline_removed: '✅ Échéance supprimée',
    savings_mode_set_own: '✅ L\'objectif a maintenant sa propre tirelire — alimente-la séparément.',
    savings_mode_set_total: '✅ L\'objectif est maintenant calculé sur toute l\'épargne.',
    savings_moved_to_general: '💰 {amount} sont passés dans l\'épargne générale.',
    savings_button_new_account: '💼 Ajouter un compte',
    savings_account_yield: '📈 Rendement du compte : {value}% par an',
    savings_account_yield_default: '📈 Rendement — comme dans les paramètres de prévision : {value}% par an',
    savings_button_account_yield: '📈 Rendement',
    savings_button_account_name: '✏️ Nom',
    savings_button_account_delete: '🗑 Supprimer le compte',
    savings_button_account_yield_default: '↩️ Comme les paramètres',
    savings_prompt_account: 'Comment s\'appelle le compte et dans quelle devise est-il ? 👇\n\nPar exemple : `Espèces USD`, `Dépôt 16%`, `Compte bancaire EUR`, `Crypto USDT`, `Skins Steam USD`. Sans devise — *{currency}* ; tu peux indiquer un taux avec `%`.\n\n💡 Pour la crypto et les skins, indique leur valeur en dollars et mets-la à jour avec le bouton « ✏️ Montant exact ».',
    savings_prompt_account_yield: 'Rendement de « {name} » en pourcentage par an, par exemple `16` pour un dépôt ou `0` pour des espèces (jusqu\'à {max}).',
    savings_prompt_account_name: 'Nouveau nom pour « {name} » :',
    savings_account_delete_confirm: 'Supprimer le compte « {name} » ?',
    savings_account_deleted: '✅ Compte « {name} » supprimé.',
    savings_account_created: '✅ Compte « {name} » créé.',
    savings_account_limit: '💼 Tu as déjà {limit} comptes — c\'est le maximum. Supprimes-en un inutile pour en ajouter un nouveau.',
    savings_error_account: '❌ Écris le nom du compte, par exemple `Espèces USD` ou `Dépôt 16%`.',
    savings_error_name: '❌ Le nom doit contenir de 1 à {max} caractères.',
    savings_goal_delete_confirm: 'Supprimer l\'objectif « {name} » ?',
    savings_goal_delete_moves: 'Les {amount} épargnés passeront dans l\'épargne générale — l\'argent ne sera pas perdu.',
    savings_button_goal_delete_yes: '🗑 Oui, supprimer',
    savings_goal_deleted: '✅ Objectif « {name} » supprimé.',
    savings_forecast_title: '📈 *Prévision d\'épargne*',
    savings_now: 'Actuellement : *{amount}*',
    savings_rates_not_set: '⚙️ Rendement et inflation non définis — indique-les dans les paramètres pour une prévision plus précise.',
    savings_rate_yield_short: 'rendement {value}%',
    savings_rate_inflation_short: 'inflation {value}%',
    savings_rate_growth_short: 'hausse du versement {value}% par an',
    savings_forecast_need_monthly: 'Pour établir une prévision, il me faut un versement mensuel : enregistre tes revenus sur au moins un mois complet ou définis le montant manuellement dans les paramètres.',
    savings_horizon_6: 'Dans six mois',
    savings_horizon_12: 'Dans un an',
    savings_horizon_36: 'Dans 3 ans',
    savings_horizon_60: 'Dans 5 ans',
    savings_horizon_120: 'Dans 10 ans',
    savings_forecast_simple: 'simple épargne : {amount}',
    savings_forecast_nominal: 'avec intérêts et hausse du versement : {amount}',
    savings_forecast_real: 'en argent d\'aujourd\'hui : {amount}',
    savings_forecast_depleted: '⚠️ À ce rythme, l\'épargne sera épuisée dans {duration}.',
    savings_forecast_legend: '💡 « Simple épargne » — sans intérêts, inflation ni hausse du versement. « En argent d\'aujourd\'hui » — ce que cela vaudrait aux prix actuels.',
    savings_settings_title: '⚙️ *Paramètres de prévision*',
    savings_setting_yield: '📈 Rendement',
    savings_setting_inflation: '🔥 Inflation',
    savings_setting_growth: '⬆️ Hausse du versement',
    savings_rate_yearly: '{value}% par an',
    savings_rate_not_set: 'non pris en compte',
    savings_settings_hint: '💡 Rendement — le taux par défaut : pour les nouveaux versements et les comptes sans taux propre (définis-le dans la fiche du compte). Inflation — de combien les prix (et tes objectifs) augmentent par an. Hausse du versement — de combien la somme que tu mets de côté augmente par an (par exemple, avec les hausses de salaire).',
    savings_button_monthly: '📥 Versement mensuel',
    savings_button_monthly_auto: '🔄 Calcul automatique',
    savings_monthly_auto_set: '✅ Le versement est calculé automatiquement : revenus moins dépenses.',
    savings_prompt_monthly: 'Combien mets-tu de côté par mois ? Par exemple : `30000` ({currency}).',
    savings_prompt_inflation: 'Inflation en pourcentage par an, par exemple `8` ou `7,5` (jusqu\'à {max}). `0` — ne pas en tenir compte.',
    savings_prompt_yield: 'Rendement de l\'épargne en pourcentage annuel (taux du dépôt), par exemple `16` (jusqu\'à {max}). `0` — ne pas en tenir compte.',
    savings_prompt_growth: 'De combien de pour cent par an augmente ton versement, par exemple `5` (jusqu\'à {max}). `0` — ne pas en tenir compte.',
    savings_monthly_set: '✅ Versement : {amount} par mois',
    savings_setting_saved: '✅ Enregistré',
    savings_error_amount: '❌ Je n\'ai pas compris le montant. Écris un nombre, par exemple `15000`.',
    savings_error_insufficient: '❌ Pas assez : la tirelire contient {amount}.',
    savings_error_rate: '❌ Il faut un nombre de 0 à {max}, par exemple `8` ou `7,5`.',
    savings_error_date: '❌ Je n\'ai pas compris l\'échéance. Écris le mois et l\'année `12.2027` ou une date `31.12.2027` — dans le futur.',
    savings_error_goal: '❌ Écris le montant et le nom de l\'objectif, par exemple `1 500 000 voiture`.',
    savings_deposited: '✅ {amount} ajoutés',
    savings_withdrawn: '✅ {amount} retirés',
    savings_balance_set: '✅ Montant mis à jour : {amount}',
    savings_transferred: '✅ {amount} transférés vers « {name} »',
    savings_goal_created: '✅ Objectif créé. Échéance et mode — avec les boutons ci-dessous.',
    savings_goal_updated: '✅ Objectif mis à jour',
    savings_deadline_set: '✅ Échéance : {date}',
    savings_goal_achieved_notice: '🎉 Objectif « {name} » atteint !',
    savings_months: '{n} mois',
    savings_years: '{y} an(s)',
    savings_years_months: '{y} an(s) {m} mois',
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
    premium_expiring_trial: '⏳ Ton essai premium se termine le {date}.\n\nEnsuite, les budgets, le bilan complet de la période, les catégories personnalisées et le budget familial ne fonctionneront plus. Tout ce que tu as enregistré est conservé, et le suivi des dépenses est gratuit.',
    premium_expiring_paid: '⏳ Premium se termine le {date}. Tu peux renouveler à l’avance — les jours restants sont conservés.',
    premium_expired_trial: '🌙 Ton essai premium est terminé. Le suivi des dépenses et des revenus reste gratuit ; les budgets, le bilan complet, les catégories personnalisées et la famille sont inclus avec premium.',
    premium_expired_paid: '🌙 Premium est terminé. Merci de soutenir le projet ! Tu peux renouveler à tout moment.',
    premium_winback: '👋 Ton premium a pris fin il y a une semaine. Si tu veux retrouver les budgets, le bilan complet, les catégories personnalisées et le budget familial — consulte les tarifs ci-dessous.',
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
    report_title_current: 'Bilan à ce jour : {range}',
    input_canceled: '✅ Annulé. Tu peux enregistrer tes dépenses comme d’habitude.',
    no_active_state: 'Rien à annuler pour le moment.',
    daily_summary_title: 'Résumé du jour',
    daily_summary_info: 'Résumé quotidien : le soir, je t\'envoie combien tu as dépensé aujourd\'hui et pour quoi. Seulement les jours avec des dépenses.',
    daily_summary_enabled: '✅ Résumé quotidien activé',
    daily_summary_disabled: '⚫ Résumé quotidien désactivé',
    daily_summary_hour_info: 'Choisis l\'heure locale pour le résumé quotidien :',
    daily_summary_hour_set: 'Heure du résumé enregistrée',
    button_daily_summary_on: '🗓 Résumé : oui',
    button_daily_summary_off: '🗓 Résumé : non',
    settings_daily_summary_on_line: '🗓 Résumé quotidien : à {time}',
    settings_daily_summary_off_line: '🗓 Résumé quotidien : désactivé',
    weekly_insight_info: 'Bilan de la semaine : le lundi à 10:00 — combien tu as dépensé la semaine dernière par rapport à d\'habitude, quelles catégories ont augmenté et ton rythme sur la période en cours.',
    settings_weekly_insight_on_line: '📈 Bilan de la semaine : le lundi à 10:00',
    settings_weekly_insight_off_line: '📈 Bilan de la semaine : désactivé',
    button_weekly_insight_on: '📈 Semaine : oui',
    button_weekly_insight_off: '📈 Semaine : non',
    button_weekly_insight_now: '👀 Afficher maintenant',
    button_weekly_insight_overview: '📊 Aperçu',
    button_weekly_insight_disable: '🔕 Désactiver le bilan de la semaine',
    weekly_insight_enabled: '✅ Bilan de la semaine activé',
    weekly_insight_disabled: '⚫ Bilan de la semaine désactivé',
    weekly_insight_turned_off: '🔕 Bilan de la semaine désactivé. Pour le réactiver : Paramètres → Rappels.',
    weekly_insight_no_data: 'Aucune dépense ces 5 dernières semaines — rien à résumer pour l\'instant.',
    weekly_insight_title: 'Semaine {range}',
    weekly_insight_spent: 'Dépensé cette semaine : *{amount}*',
    weekly_insight_no_history: 'Pas encore assez d\'historique — la comparaison avec les semaines habituelles arrivera dans quelques semaines.',
    weekly_insight_same: '≈ Comme d\'habitude (moyenne sur {weeks} semaines : {amount})',
    weekly_insight_more: '↑ {percent}% de plus que d\'habitude : +{amount} par rapport à la moyenne sur {weeks} semaines',
    weekly_insight_less: '↓ {percent}% de moins que d\'habitude : −{amount} par rapport à la moyenne sur {weeks} semaines',
    weekly_insight_overspend: '📈 La plus forte hausse : {category} (+{amount})',
    weekly_insight_improvement: '👍 Moins que d\'habitude : {category} (−{amount})',
    weekly_insight_period: 'Période {range}',
    weekly_insight_period_spent: 'Dépensé : {amount} en {days} jours sur {total}',
    weekly_insight_projection: 'À ce rythme d\'ici la fin de la période : *≈{amount}*',
    weekly_insight_projection_vs: 'À ce rythme d\'ici la fin de la période : *≈{amount}* (précédente — {previous}, {change})',
    weekly_insight_budget_ok: '🎯 Budget {limit} : tu es dans les clous, marge ≈{amount}',
    weekly_insight_budget_over: '🚨 Budget {limit} : à ce rythme tu le dépasseras de ≈{amount}',
    export_title: '📤 Export CSV\n\nChoisis la période du fichier.',
    export_categories_all: '🗂 Catégories : toutes',
    export_categories_selected: '🗂 Catégories : {categories}',
    export_period_day: '📅 Aujourd\'hui',
    export_period_week: '📅 7 derniers jours',
    export_period_current: '📅 Période en cours',
    export_period_previous: '📅 Période précédente',
    export_period_all: '♾ Tout l\'historique',
    export_period_range: '🗓 Choisir les dates…',
    export_filter_categories: '🔽 Filtrer par catégories',
    export_select_categories: 'Choisis les catégories à exporter :',
    export_select_all: '✅ Tout sélectionner',
    export_deselect_all: '❌ Tout désélectionner',
    export_done: '✅ Terminé',
    export_no_categories: 'Choisis au moins une catégorie',
    export_enter_dates: '🗓 Saisis une plage de dates :\n`01.03.2026 - 15.03.2026`\n\nou une seule date : `01.03.2026`',
    export_dates_invalid: '❌ Impossible de lire les dates. Saisis-les ainsi : `01.03.2026 - 15.03.2026` ou une seule date `01.03.2026`.',
    export_dates_order: '❌ La date de début est postérieure à la date de fin. Exemple : `01.03.2026 - 15.03.2026`.',
    total_by_categories: 'Total par catégories :',
    bot_short_description: 'Note tes dépenses en deux taps : écris "250 café". Revenus, budgets, bilan mensuel, budget familial.',
    bot_description: 'Dépenses et revenus directement dans Telegram.\n\nÉcris "250 café" — dépense enregistrée, catégorie mémorisée.\n\n• Aperçu du mois par catégorie, bilan de la période\n• Revenus et solde : "+50000 salaire"\n• Loyer et abonnements enregistrés automatiquement\n• Import de relevés : T-Bank, Sber, Kaspi, CSV\n• Épargne, objectifs, dettes, prévision avec inflation\n• Budgets avec alertes, résumés quotidiens et hebdo, rappels\n• Budget familial, devises, export CSV\n\nL\'essentiel est gratuit. Nouveaux : 14 jours de premium.',
    command_start: 'Menu principal',
    command_stats: 'Aperçu du mois',
    command_history: 'Entrées du jour',
    command_income: 'Revenus et solde',
    command_recurring: 'Dépenses récurrentes',
    command_export: 'Export CSV',
    command_family: 'Budget familial',
    command_settings: 'Paramètres',
    command_limits: 'Abonnement et premium',
    command_help: 'Aide',
    command_cancel: 'Annuler la saisie',
    command_paysupport: 'Support paiement',
    command_terms: 'Conditions d\'utilisation',
    command_privacy: 'Politique de confidentialité',
    payment_outdated: '⚠️ Cette facture est obsolète : le prix a changé. Ouvre à nouveau les tarifs — /limits',
    security_validation_error: '⚠️ Impossible de traiter cette demande. Réessaie ou ouvre le menu avec /start.',
    expense_draft_outdated: '⌛ Ce brouillon est périmé. Envoie la dépense à nouveau.',
    family_invitation_hours_left: '⏰ Encore {hours} h',
    family_no_members: 'Aucun membre',
    family_already_member: '❌ Tu fais déjà partie d’une famille.',
    admin_bug_reports_all_title: '📝 Tous les rapports de bugs ({count} derniers)',
    admin_bug_reports_new_title: '🆕 Nouveaux rapports de bugs ({count} derniers)',
    admin_bug_reports_empty: 'Aucun rapport.',
    payment_subscription_already_active: '🔁 Tu as déjà un abonnement mensuel actif, inutile d’en prendre un deuxième. Pour prolonger premium à l’avance, choisis un tarif à paiement unique : /limits',
    payment_foreign_payer: '⚠️ Ce lien de paiement a été créé pour un autre utilisateur. Ouvre toi-même les tarifs dans le bot — /limits',
    premium_expired_granted: '🌙 Ton premium est terminé. Le suivi des dépenses et des revenus reste gratuit ; les budgets, le bilan complet, les catégories personnalisées et la famille sont inclus avec premium. Tu peux le prolonger à tout moment.',
};
