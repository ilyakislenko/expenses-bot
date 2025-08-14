module.exports = {
    button_reminders: '🔔 Erinnerung',
    reminders_enabled: 'Erinnerungen sind aktiviert. Wenn du bis 18:00 Uhr nichts einträgst, erinnere ich dich mit einem kleinen Scherz 😉',
    reminders_disabled: 'Erinnerungen sind deaktiviert. Absolute Stille 🤐',
    reminder_sample_variants: [
      'Hey! Nur weil dein Geldbeutel still ist, heißt das nicht, dass er glücklich ist. Trag deine Ausgaben ein 😉',
      'Heute schon etwas ausgegeben? Schreib es auf, bevor dein Gedächtnis zum Bäcker läuft 🧠🥖',
      'Nicht notiert? Dann ist es wie ins Nichts ausgegeben. Lass uns das eintragen 💸',
      'Tropfen für Tropfen läuft das Budget ins Meer. Trag heute deine Ausgaben ein 🌊',
      'Der Bot schimpft nicht, er erinnert dich: Zeit, deine Ausgaben einzutragen 😌'
    ],
    reminder_message_title: 'Erinnerung',
    reminder_turn_on_off: (enabled) => enabled ? 'Erinnerungen ausschalten' : 'Erinnerungen einschalten',
    button_configure_reminder_hours: '⏰ Erinnerungszeiten konfigurieren',
    reminder_hours_info: 'Wähle bis zu 3 Stunden für Erinnerungen (deine lokale Zeitzone). Aktuell:',
    reminder_hours_limit: 'Du kannst maximal 3 Stunden auswählen',
    reminder_hours_saved: '✅ Erinnerungszeiten gespeichert',
    button_save: 'Speichern',
    button_clear: 'Zurücksetzen',
    
    // Zahlungs-Support und Richtlinien
    paysupport_message: '*Zahlungssupport*\n\nUnternehmen: {businessName}\nSupport: @{supportUsername} / {supportEmail}\n\nAGB: {termsUrl}\nDatenschutz: {privacyUrl}\nRückerstattungen: {refundPolicyUrl}\n\nBei Fragen zu Stars-Zahlungen oder Rückerstattungen wenden Sie sich bitte zuerst an den Support. Wir erfüllen die Telegram Stars-Richtlinien.',
    terms_message: '📄 Nutzungsbedingungen: {termsUrl}',
    privacy_message: '🔐 Datenschutzerklärung: {privacyUrl}',
    refund_message: '↩️ Rückerstattungsrichtlinie: {refundPolicyUrl}\n\nFragen: @{supportUsername} / {supportEmail}',
    
    // Fehlerbericht
    button_bug_report: '🐛 Fehler melden / Verbesserung vorschlagen',
    bug_report_prompt: '🐛 *Fehler melden oder Verbesserung vorschlagen*\n\nBeschreibe das Problem oder den Vorschlag (max. 1000 Zeichen):',
    bug_report_success: '✅ Danke! Deine Nachricht wurde an die Entwickler gesendet.',
    bug_report_too_long: '❌ Nachricht zu lang! Kürze um {excess} Zeichen (max. 1000).',
    bug_report_empty: '❌ Nachricht ist leer. Bitte beschreibe das Problem oder den Vorschlag.',
    bug_report_rate_limit: '⚠️ Zu viele Fehlerberichte!\n\nMaximal 3 Berichte in 10 Minuten.',
    bug_report_suspicious: '⚠️ Nachricht enthält unzulässige Zeichen oder verdächtigen Inhalt',
    
    // Sicherheit
    security_rate_limit: '⚠️ *Zu viele Anfragen*\n\nVersuche es in {resetTime} Sekunden erneut\nLimit: {limit} Anfragen pro Minute',
    security_validation_error: '⚠️ *Validierungsfehler*\n\n{message}',
    security_error: '❌ *Sicherheitsfehler*\n\nVersuche es später erneut oder kontaktiere den Administrator.',
    
    // Admin-Panel
    button_admin: '👑 Admin-Panel',
    admin_access_denied: '❌ Du hast keine Administratorrechte.',
    admin_panel_title: '👑 *Admin-Panel*\n\nBitte eine Aktion auswählen:',
    admin_error: '❌ Fehler beim Ausführen der Administratoraktion.',
    
    // Admin-Statistik
    admin_stats_text: `📊 *Bot-Statistik*
  
  👥 **Benutzer:**
  • Gesamt: {totalUsers}
  • Premium: {activePremium}
  • Neu diese Woche: {newUsersWeek}
  • Neu diesen Monat: {newUsersMonth}
  
  💰 **Ausgaben:**
  • Gesamte Einträge: {totalExpenses}
  • Diese Woche: {expensesWeek}
  • Aktive Benutzer: {activeUsers}
  
  🐛 **Fehlerberichte:** {totalBugReports}
  
  💎 **Spenden:**
  • Gesamt: {totalDonations}
  • Gesammelte Sterne: {totalStars}
  
  ⭐ **Premium-Transaktionen:** {premiumTransactions}`,
  
    // Benutzerliste
    admin_users_title: '👥 *Benutzer* (Seite {page}/{totalPages})\n\nGesamt: {totalUsers}\n',
    
    // Fehlerberichte
    admin_bug_reports_title: '🐛 *Fehlerberichte*',
    bug_report_status_new: '🆕 Neu',
    bug_report_status_in_progress: '🔄 In Bearbeitung',
    bug_report_status_resolved: '✅ Gelöst',
    bug_report_status_closed: '🔒 Geschlossen',
    
    // Spendenstatistik
    admin_donations_text: `💰 *Spendenstatistik*
  
  📊 **Übersicht:**
  • Anzahl Spenden: {totalDonations}
  • Abgeschlossen: {completedDonations}
  • Ausstehend: {pendingDonations}
  
  ⭐ **Sterne:**
  • Gesamt gesammelt: {totalStars}
  • Durchschnittliche Spende: {avgStars} Sterne`,
  
    // Premium-Statistiken
    admin_premium_stats: `⭐ *Premium-Statistiken*
  
  📊 **Benutzer:**
  • Gesamt Premium: {totalPremiumUsers}
  • Momentan aktiv: {activePremiumUsers}
  
  💳 **Transaktionen:**
  • Gesamt: {totalTransactions}
  • Gesamteinnahmen: {totalRevenue} Sterne`,
  
    // Adminliste
    admin_admins_title: '👑 *Administratoren* ({count})\n',
    // Admin-Suche
    admin_search_prompt: '🔍 *Benutzer suchen*\n\nBitte Benutzer-ID oder Benutzernamen eingeben:',
    admin_search_not_found: '❌ Benutzer nicht gefunden.',
    admin_search_results: '🔍 *Suchergebnisse* "{query}"\n\nGefunden: {count}\n',
    
    // Admin-Benutzerdetails
    admin_user_not_found: '❌ Benutzer nicht gefunden.',
    admin_user_details: `👤 *Benutzerinformationen*
  
  {adminFlag}{premiumFlag} **{firstName}** (@{username})
  🆔 ID: {userId}
  🌐 Sprache: {language}
  💱 Währung: {currency}
  🕐 Zeitzone: {timezone}
  📅 Registriert am: {createdAt}
  
  📊 **Statistik:**
  • Ausgabeneinträge: {totalExpenses}
  • Gesamtbetrag: {totalAmount}
  • Fehlerberichte: {bugReportsCount}
  • Transaktionen: {transactionsCount}`,
  
    // Admin-Aktionen
    admin_promote_success: '✅ Benutzer {userId} wurde zum Administrator befördert.',
    admin_demote_success: '✅ Administratorrechte von Benutzer {userId} wurden entfernt.',
    admin_cannot_demote_self: '❌ Du kannst deine eigenen Adminrechte nicht entfernen.',
    admin_grant_premium_options: '⭐ *Premium für Benutzer {userId} vergeben*\n\nBitte Dauer auswählen:',
    admin_grant_premium_success: '✅ Benutzer {userId} hat Premium für {days} Tage erhalten.',
    admin_revoke_premium_success: '✅ Premium für Benutzer {userId} wurde entfernt.',
  
    // Massen-Nachricht
    admin_broadcast_prompt: '📢 *Massen-Nachricht*\n\nBitte Nachricht für alle Benutzer eingeben (max. 3600 Zeichen):',
    admin_broadcast_too_long: '❌ Nachricht zu lang!\n\n📏 Aktuelle Länge: {current}\n📏 Maximum: {max}\n📏 Kürzen um: {excess} Zeichen',
    admin_broadcast_confirm: '📢 *Massen-Nachricht bestätigen*\n\n📝 **Nachricht:**\n{message}\n\n📏 **Länge:** {length} Zeichen\n\n⚠️ Diese Nachricht wird an **ALLE** Benutzer des Bots gesendet!',
    admin_broadcast_started: '📢 Nachrichtensendung gestartet...',
    admin_broadcast_result: '📢 *Sendung abgeschlossen!*\n\n📊 **Statistik:**\n• Gesamt: {total}\n• Gesendet: {sent}\n• Fehlgeschlagen: {failed}',
    admin_broadcast_header: '🔴🔴🔴 *Ankündigung!* 🔴🔴🔴',
    
    // Allgemeine Nachrichten
    welcome: 'Hallo, {name}! 👋',
    main_menu_title: '🏠 *Hauptmenü*\n\nAktion auswählen:',
    error: 'Ein Fehler ist aufgetreten 😞',
    unknown_error: 'Unerwarteter Fehler. Bitte später erneut versuchen.',
    not_found: 'Nicht gefunden',
    error_invalid_description_format: '❌ Ungültiges Format. Beispiel: Betrag Beschreibung oder Betrag Kategorie Beschreibung',
    expense_save_error: '❌ Fehler beim Speichern der Ausgabe. Bitte erneut versuchen.',
    cancel: 'Abbrechen',
    back: 'Zurück',
    confirm: 'Bestätigen',
    save: 'Speichern',
    
    // Start-Nachricht
    start_message: `Hallo! 👋 Ich helfe dir, deine Ausgaben zu erfassen und dein Budget zu kontrollieren.
  
  *So fügst du eine Ausgabe hinzu:*
  Einfach Betrag und Beschreibung eingeben:
  -  \`200 Lebensmittel\`
  -  \`1500 Mittagessen im Restaurant\`
  -  \`50 Fahrkarte\`
  -  \`150,50 Kaffee\`
  
  Danach erscheint ein Kategorienmenü – wähle passend aus 🏷️
  
  *Hauptbefehle:*
  /start - Bot neu starten
  /menu - Interaktives Menü öffnen
  /history - Einträge von heute anzeigen
  /stats - Monatliche Statistik nach Kategorien
  
  /export - CSV-Datei herunterladen
  /undo - Letzten Eintrag löschen
  
  *Einstellungen:*
  /settings - Einstellungen
  /currency - Standardwährung ändern
  /timezone - Zeitzone festlegen
  /categories - Kategorien verwalten
  
  *Zusatzfunktionen:*
  /family - Familienbudget
  /limits - Limits und Premium-Features
  /help - Hilfetext anzeigen
  
  Fang an, deine Ausgaben zu erfassen! 💰`,
  help_message: `📋 *Detaillierte Befehlsübersicht*
  
  *Ausgabe hinzufügen:*
  Betrag und Beschreibung mit Leerzeichen eingeben:
  \`200 Einkaufen\` – zeigt das Kategorienmenü
  \`150,50 Kaffee\` – Dezimalzahlen werden unterstützt
  
  *Hauptbefehle:*
  /start - Bot neu starten und Begrüßungsnachricht anzeigen
  /menu - Interaktives Hauptmenü öffnen
  /history - Heutige Einträge anzeigen
  /stats - Monatliche Statistik nach Kategorien
  
  /export - Alle Daten als CSV herunterladen
  /undo - Letzten Eintrag löschen
  
  *Einstellungen und Verwaltung:*
  /settings - Haupt-Einstellungsmenü öffnen
  /currency - Standardwährung ändern (RUB, USD, EUR, KZT, CNY, THB)
  /timezone - Zeitzone festlegen
  /categories - Eigene Kategorien verwalten (Premium)
  
  *Familienbudget:*
  /family - Familiengruppen und gemeinsame Ausgaben verwalten
  - Familie erstellen, Mitglieder einladen
  - Gemeinsame Ausgaben und Statistik
  - Familiendaten exportieren
  
  *Premium-Features:*
  /limits - Übersicht Limits & Premium
  - Eigene Kategorien
  - Erweiterte Statistik
  - Familienbudget
  - Priorisierter Support
  
  *Tipps zur Nutzung:*
  • Beschreibung hinzufügen für bessere Nachvollziehbarkeit
  • Statistik regelmäßig mit /stats prüfen
  • Korrekte Zeitzone einstellen
  • /menu für schnellen Zugriff nutzen
  • /export zum Datenexport und Analyse verwenden
  
  *Ausgaben bearbeiten:*
  • In /history Einträge bearbeiten oder löschen
  • „👨‍👩‍👧‍👦 Zur Familie“ verschiebt Ausgabe ins Familienbudget
  • „🚫 Aus Familienbudget entfernen“ macht es wieder privat
  • Nur eigene Einträge bearbeitbar
  
  *Erinnerungen:*
  • Bot erinnert täglich um 18:00 Uhr
  • Nur wenn an dem Tag keine Ausgabe erfasst wurde
  • In Einstellungen ein-/ausschaltbar
  • Max. eine Erinnerung pro Tag
  
  *Support:*
  Mit /start kommst du jederzeit ins Hauptmenü zurück.
  
  Viel Erfolg beim Haushaltsbuch! 💰📊`,
  
    // Ausgaben
    expense_added: '✅ Erfasst: {amount} – {description}',
    expense_updated: '✅ Eintrag aktualisiert: {amount} – {description}',
    expense_deleted: '✅ Eintrag gelöscht: {amount} – {description}',
    no_expenses: 'Keine Einträge zum Löschen 🤷‍♂️',
    expense_not_found: 'Fehler: Eintrag nicht gefunden.',
    expense_update_error: 'Fehler: Eintrag nicht gefunden oder nicht aktualisiert.',
    
    // Statistik
    monthly_stats: '💰 *Ausgaben diesen Monat*',
    daily_stats: '💰 *Ausgaben heute*',
    total_spent: 'Gesamt: *{amount}*',
    records_count: 'Anzahl Einträge: {count}',
    no_expenses_period: 'Keine Ausgaben in diesem Zeitraum.',
    
    // Nach Kategorien
    by_categories: 'Nach Kategorien:',
    no_expenses_category: 'Keine Ausgaben in dieser Kategorie im letzten Monat.',
    
    // Kategorien
    select_category: 'Kategorie auswählen:',
    amount_label: 'Betrag',
    description_label: 'Beschreibung',
    category_label: 'Kategorie',
    expense_added_title: 'Ausgabe hinzugefügt!',
    no_categories: 'Keine Kategorien gefunden.',
    category_expenses: 'Ausgaben in der Kategorie "{category}"',
    no_category_expenses: 'Keine Ausgaben in dieser Kategorie im letzten Monat.',
    
    // Einstellungen
    settings_title: 'Einstellungen:',
    currency_select: 'Standardwährung auswählen:',
    currency_set: 'Währung gesetzt: {currency}',
    currency_updated: 'Währung geändert zu {currency}',
    button_change_period_start: '📅 Periodenstart festlegen',
    period_start_prompt: 'Gib den Starttag des Monats ein (1–31). Kürzere Monate nehmen den letzten Tag.',
    period_start_invalid: '❌ Ungültige Zahl. Bitte eine Ganzzahl 1–31 eingeben.',
    period_start_set: '✅ Periodenstart gesetzt auf: {day}',
    timezone_setup: `🕐 *Zeitzone einstellen*
  
  Wie spät ist es jetzt?
  
  *Aktuelle UTC-Zeit:* {utcTime}
  
  Wähle deine lokale Zeit aus:`,
    timezone_set: '✅ Zeitzone gesetzt: {timezone}',
    // Familienbudget
    button_family: '👨‍👩‍👧‍👦 Familie',
    family_info: '👨‍👩‍👧‍👦 *Familienbudget*\n\nHier kannst du gemeinsam mit deiner Familie eure Ausgaben verwalten.',
    family_created: '✅ Familie "{name}" wurde erstellt! Du kannst nun Mitglieder einladen.',
    family_joined: '✅ Du bist der Familie "{name}" beigetreten!',
    family_left: '✅ Du hast die Familie "{name}" verlassen.',
    family_deleted: '✅ Familie "{name}" wurde gelöscht. Alle Familienausgaben wurden in private Ausgaben umgewandelt.',
    family_member_removed: '✅ Mitglied wurde aus der Familie entfernt.',
    family_member_removed_notification: '❌ Du wurdest aus der Familie *{familyName}* entfernt.',
    family_cannot_leave_owner: '❌ Als Eigentümer kannst du die Familie nicht verlassen. Nutze "Familie löschen".',
    
    // Familienmenü-Buttons
    create_family: '🏠 Familie erstellen',
    join_family: '🔗 Familie beitreten',
    invite_member: '➕ Mitglied einladen',
    leave_family: '🚪 Familie verlassen',
    delete_family: '🗑️ Familie löschen',
    family_members: '👥 Familienmitglieder',
    family_stats: '💰 Monatliche Ausgaben',
    family_daily_stats: '💰 Tagesausgaben',
    family_add_expense: '💰 Familienausgabe hinzufügen',
    family_menu: '👨‍👩‍👧‍👦 Familienmenü',
    family_cancel: '❌ Abbrechen',
    
    // Einladungen
    invitation_sent: '✅ Einladung an @{username} gesendet',
    invitation_accepted: '✅ Du hast die Einladung zur Familie "{name}" angenommen!',
    invitation_rejected: '❌ Du hast die Einladung zur Familie "{name}" abgelehnt.',
    invitation_not_found: '❌ Einladung nicht gefunden oder abgelaufen.',
    invitation_expired: '❌ Einladung ist abgelaufen.',
    invitation_already_processed: '❌ Einladung wurde bereits bearbeitet.',
    
    // Eingaben
    enter_family_name: 'Bitte Familiennamen eingeben (3–50 Zeichen):',
    enter_invite_username: 'Bitte Benutzernamen eingeben (ohne @):',
    enter_expense_amount: 'Bitte Betrag und Beschreibung der Familienausgabe eingeben:',
    
    // Fehler
    family_name_too_short: '❌ Familienname muss mindestens 3 Zeichen lang sein.',
    family_name_too_long: '❌ Familienname darf maximal 50 Zeichen lang sein.',
    user_not_found: '❌ Benutzer nicht gefunden.',
    user_already_in_family: '❌ Benutzer ist bereits Mitglied einer Familie.',
    user_already_has_invitation: '❌ Benutzer hat bereits eine aktive Einladung.',
    user_already_in_other_family: '❌ Benutzer ist Mitglied einer anderen Familie.',
    user_already_in_your_family: '❌ Benutzer ist bereits in deiner Familie.',
    user_not_premium: '❌ Benutzer hat keinen Premium-Status.',
    only_owner_can_invite: '❌ Nur der Eigentümer kann Mitglieder einladen.',
    active_invitations: '📋 Aktive Einladungen',
    no_active_invitations: '📋 Du hast keine aktiven Einladungen.',
    active_invitations_list: '📋 Liste aktiver Einladungen:',
    cancel_invitation: '❌ Einladung stornieren',
    invitation_cancelled: '✅ Einladung storniert.',
    not_authorized: '❌ Du hast keine Berechtigung, dies zu tun.',
    invitation_code: '🔑 Einladungscode: `{code}`',
    family_invitation_received: '🎉 Du wurdest in die Familie *{familyName}* eingeladen\n\n👤 Eingeladen von: {inviterName}\n🔑 Code: `{inviteCode}`\n\nBitte Aktion auswählen:',
    accept_invitation: '✅ Annehmen',
    reject_invitation: '❌ Ablehnen',
    invitation_accepted: '🎉 Glückwunsch! Du bist der Familie *{familyName}* beigetreten',
    invitation_rejected: '❌ Du hast die Einladung abgelehnt',
    invitation_not_pending: '❌ Die Einladung ist nicht mehr ausstehend',
    invitation_cancelled_notification: '❌ Die Einladung in die Familie *{familyName}* wurde von {cancelledBy} storniert',
    enter_invite_code: '🔑 Bitte Einladungscode eingeben:',
    only_owner_can_remove: '❌ Nur der Eigentümer kann Mitglieder entfernen.',
    only_owner_can_delete: '❌ Nur der Eigentümer kann die Familie löschen.',
    cannot_remove_owner: '❌ Eigentümer kann nicht entfernt werden.',
    cannot_remove_yourself: '❌ Du kannst dich nicht selbst entfernen.',
    family_not_found: '❌ Familie nicht gefunden.',
    not_family_member: '❌ Du bist kein Mitglied dieser Familie.',
    not_family_owner: '❌ Du bist nicht der Eigentümer dieser Familie.',
    
    // Bestätigungen
    confirm_delete_family: '⚠️ *Familie löschen*\n\nAlle Mitglieder werden entfernt und alle Familienausgaben zu privaten Ausgaben umgewandelt.\n\nBist du sicher?',
    confirm_remove_member: '⚠️ *Mitglied entfernen*\n\nDieses Mitglied wird aus der Familie entfernt.\n\nBist du sicher?',
    // Familienstatistik
    family_monthly_stats: '👨‍👩‍👧‍👦 *Monatliche Familienausgaben*',
    family_daily_stats: '💰 Tagesausgaben',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *Heutige Familienausgaben*',
    family_export: '📊 Familiendaten exportieren',
    family_total_spent: 'Gesamt: *{amount}*',
    family_members_count: 'Mitgliederanzahl: {count}',
    family_no_expenses: 'Keine Familienausgaben in diesem Zeitraum.',
    
    // Mitgliederliste
    family_members_title: '👥 *Familienmitglieder*',
    family_member_info: '• {name} ({role}) – beigetreten am {date}',
    family_owner_role: 'Eigentümer',
    family_member_role: 'Mitglied',
    remove_member: '❌ Entfernen',
    confirm_remove_member: '⚠️ *Mitglied entfernen*\n\nSoll {name} aus der Familie entfernt werden?',
    member_removed: '✅ {name} wurde aus der Familie entfernt.',
    member_removed_notification: '❌ Du wurdest aus der Familie *{familyName}* von {ownerName} entfernt.',
    
    // Premium-Funktionen
    premium_required: '❌ Diese Funktion ist nur für Premium-Nutzer verfügbar.',
    upgrade_to_premium: '💎 Upgrade auf Premium, um das Familienbudget zu nutzen!',
    
    timezone_updated: `✅ *Zeitzone aktualisiert!*
  
  🕐 Ausgewählte Zeit: *{time}*
  🌍 Zeitzone: *{timezone}*
  
  Ab jetzt werden alle Ausgaben in deiner Ortszeit angezeigt.`,
    timezone_updated_simple: `✅ *Zeitzone aktualisiert!*
  
  🌍 Neue Zeitzone: *{timezone}*
  
  Ab jetzt werden alle Ausgaben mit der korrekten Zeit angezeigt.`,
    
    // Limits
    limits_title: '📊 *Limit-Information*',
    status_regular: '👤 Standard',
    status_premium: '💎 Premium',
    status_label: '*Status:* {status}',
    records_usage: '<b>Einträge:</b> {current}/{max} ({percentage}%)',
    records_remaining: '<b>Verbleibend:</b> {remaining} Einträge',
    max_description_length: '<b>Maximale Beschreibungslänge:</b> {length} Zeichen',
    near_limit_warning: '⚠️ *Achtung:* Du näherst dich dem Eintragslimit!',
    limit_reached: '❌ *Eintragslimit erreicht!*',
    premium_benefits: `💎 <b>Premium-Vorteile:</b>
  • Beschreibung bis zu 160 Zeichen (statt 80)
  • 300 Einträge (statt 100)
  • Bis zu 5 eigene Kategorien
  • Erweiterte Statistiken
  • Familienbudget
  • Beliebige Einträge (nicht nur den letzten) ändern oder löschen`,
    
    // Premium-Abonnement
    premium_subscription_title: '⭐️ Abonnement',
    premium_status_header: '<b>Dein Status:</b>',
    premium_privileges: 'Vorteile: {status}',
    premium_limits_info: 'Hier siehst du deine Limits: Anzahl Kategorien, Einträge, Familienfunktionen, Premiumlaufzeit.',
    premium_menu_title: '<b>Menü:</b>',
    premium_tariff_button: '⭐️ Tarif',
    premium_why_paid_button: '👀 Warum kostenpflichtig?',
    premium_donate_button: '🤝 Spenden',
    premium_back_button: '⬅️ Zurück',
    premium_tariffs_title: '⭐️ Tarife (Telegram Stars)',
    premium_payment_info: '💳 Bezahlung erfolgt über Telegram Stars. <b>Keine automatische Verlängerung.</b>',
    premium_renewal_info: '📅 Kann jederzeit verlängert werden. Die Zeit wird hinzugefügt.',
    premium_stars_info: '💡 Sterne können gebührenfrei über [@PremiumBot] gekauft werden.',
    premium_why_paid_title: '👀 Warum kostenpflichtig?',
    premium_purchases_button: '🧾 Einkaufshistorie',
    purchases_header: '🧾 Einkaufshistorie',
    purchases_premium_title: 'Premium',
    purchases_donations_title: 'Spenden',
    no_purchases: 'Noch keine Käufe',
    purchases_prev_button: '◀ Zurück',
    purchases_next_button: 'Weiter ▶',
    purchases_page_indicator: 'Seite {page}/{total}',
    premium_why_paid_text: 'Der Betrieb dieses Bots kostet etwa $200 pro Monat. Die Nutzerzahl wächst und als Entwickler muss ich auch meinen Lebensunterhalt verdienen :)',
    premium_payment_title: '💳 *Premium-Abonnement bezahlen*',
    premium_payment_description: 'Ausgewählt: <b>{duration}</b>\nPreis: <b>{stars} ⭐️</b>\n\nZum Bezahlen unten klicken.',
    // Labels für Tarife und Produktname
    tariff_button_30: '1 Monat',
    tariff_button_90: '3 Monate',
    tariff_button_180: '6 Monate',
    tariff_button_365: '1 Jahr',
    tariff_item_30: '1 Monat (30 Tage)',
    tariff_item_90: '3 Monate (90 Tage)',
    tariff_item_180: '6 Monate (180 Tage)',
    tariff_item_365: '12 Monate (365 Tage)',
    premium_product: 'Premium-Abonnement',
    discount_save: 'sparen {percent}%',
  
    payment_success: '🎉 *Zahlung erfolgreich!* Premium wurde aktiviert. Genieße die erweiterten Funktionen.',
    donation_success: '🙏 *Danke für deine Unterstützung!* Deine Spende hilft bei der Weiterentwicklung des Bots.',
    general_payment_success: '✅ *Zahlung erfolgreich!* Danke für die Nutzung unseres Bots.',
    premium_expires: '📅 Premium läuft ab am: <b>{date}</b>\n⏰ Verbleibende Tage: <b>{days}</b>',
  
    // Spenden
    donate_prompt_title: '🤝 Projekt unterstützen',
    donate_prompt_text: 'Bitte gib die Anzahl der Sterne an (1–2500).\nFalls du eine Nachricht hinzufügen möchtest – in neuer Zeile eingeben (max. 500 Zeichen).',
    donate_invalid: '❌ Gib eine ganze Zahl zwischen 1 und 2500 ein. Nachricht max. 500 Zeichen.',
    donate_created: '✅ Spendenanfrage erstellt: {stars} ⭐️. Sende dir den Zahlungslink.',
    donate_paid: '🙏 Danke für deine Unterstützung! Spende erhalten: {stars} ⭐️',
    
    // Validierungsfehler
    error_too_long_regular: '❌ Beschreibung zu lang! Für Standardnutzer max. 80 Zeichen.',
    error_too_long_premium: '❌ Beschreibung zu lang! Für Premium max. 160 Zeichen.',
    error_no_description: '❌ Nach dem Betrag muss eine Beschreibung folgen.',
    error_amount: '❌ Ungültiger Betrag. Bitte zwischen 0,01 und 999999 eingeben.',
    error_format: '❌ Unklarer Aufbau. Betrag und Beschreibung angeben.\nBeispiel: `200 Lebensmittel` oder `1500 Mittagessen`',
    error_limit_reached: '❌ Limit erreicht!\nStandard: 100 Einträge\nPremium: 300 Einträge\n\n💎 Hol dir Premium für mehr Platz.',
    error_premium_required: '💎 Diese Funktion ist nur für Premium!\n\nVorteile:\n• Beschreibung bis 160 Zeichen\n• 300 Einträge\n• Eigene Kategorien\n• Erweiterte Statistik',
    error_generic: '❌ Fehler. Versuche es später erneut oder kontaktiere den Admin.',
    
    // Buttons
    button_menu: '📋 Menü',
    button_expenses_month: '💰 Monatliche Ausgaben',
    button_expenses_day: '💰 Tagesausgaben',
    button_expenses_categories: '💰 Nach Kategorie',
    button_family: '👨‍👩‍👧‍👦 Familie',
    button_settings: '⚙️ Einstellungen',
    button_delete_last: '🗑️ Letzten Eintrag löschen',
    button_limits: '📊 Limits',
    button_help: '❓ Hilfe',
    button_edit: 'Bearbeiten',
    button_delete: 'Löschen',
    button_mark_as_family: '👨‍👩‍👧‍👦 Zur Familie',
    button_remove_from_family: '🚫 Aus Familienbudget entfernen',
    expense_already_family: '❌ Diese Ausgabe ist bereits im Familienbudget',
    expense_converted_to_family: '✅ Ausgabe ins Familienbudget verschoben',
    expense_removed_from_family: '✅ Ausgabe aus dem Familienbudget entfernt',
    not_owner: '❌ Du bist nicht der Eigentümer dieser Ausgabe',
    button_cancel: '❌ Abbrechen',
    button_back: '⬅️ Zurück',
    button_change_currency: '💱 Währung ändern',
    button_change_timezone: '🌍 Zeitzone',
    button_change_language: '🌐 Sprache',
    button_custom_categories: '🏷️ Eigene Kategorien',
    
    // Sprache
    language_select: '🌍 Sprache auswählen:',
    language_set: '✅ Sprache auf Deutsch geändert',
    language_not_supported: '❌ Diese Sprache wird nicht unterstützt',
    language_change_error: '❌ Fehler beim Ändern der Sprache',
    timezone_error: '❌ Fehler beim Setzen der Zeitzone',
    
    // Export
    export_success: '📊 Daten erfolgreich exportiert!',
    export_error: 'Fehler beim Exportieren der Daten 😞',
    keyboard_updated: '✅ Tastatur-Layout aktualisiert!',
    
    // Bearbeitung
    edit_canceled: 'Bearbeitung abgebrochen.',
    edit_no_active: 'Keine aktive Bearbeitung.',
    edit_instructions: 'Gibt neuen Betrag und/oder Beschreibung ein (z. B. 500 Kaffee) oder drücke unten „Abbrechen“.',
    edit_empty: 'Bitte neuen Betrag, Beschreibung oder beides eingeben.',
    edit_amount_error: 'Betrag ungültig.',
    edit_too_long: 'Beschreibung zu lang (max. {max} Zeichen).',
    edit_format_error: 'Formatfehler.',
    
    // Callback-Antworten
    callback_limit_reached: '❌ Limit erreicht',
    callback_button_not_found: '❌ Fehler: Button nicht gefunden',
    callback_data_not_found: '❌ Fehler: Daten nicht gefunden',
    callback_expense_added: '✅ Hinzugefügt zur Kategorie "{category}"',
    callback_expense_saved: '❌ Fehler beim Speichern',
    callback_canceled: '❌ Abgebrochen',
    callback_expense_canceled: '❌ Ausgabe hinzufügen abgebrochen',
    callback_deleted: 'Eintrag gelöscht!',
    callback_delete_error: 'Fehler beim Löschen oder Eintrag nicht gefunden',
    callback_edit_mode: 'Bearbeitungsmodus beenden:',
    callback_no_cards: 'Keine Einträge gefunden... Fehler',
    
    // Standardkategorien
    category_food: 'Lebensmittel',
    category_transport: 'Transport',
    category_entertainment: 'Unterhaltung',
    category_shopping: 'Einkäufe',
    category_health: 'Gesundheit',
    category_other: 'Andere',
    
    // CSV-Export
    date_label: 'Datum',
    currency_label: 'Währung',
    total_by_currencies: 'Gesamt nach Währungen:',
    total_in_currency: 'Gesamt in {currency}',
    
    // Eigene Kategorien (Premium)
    custom_categories_title: '🏷️ Eigene Kategorien',
    custom_categories_info: 'Hier kannst du eigene Ausgabenkategorien erstellen (nur Premium).',
    custom_categories_add: '➕ Kategorie hinzufügen',
    custom_categories_manage: '🗂️ Kategorien verwalten',
    custom_categories_enter_name: 'Namen der neuen Kategorie eingeben (1–30 Zeichen):',
    custom_categories_created: '✅ Kategorie erstellt: {name}',
    custom_categories_exists: '❌ Diese Kategorie existiert bereits.',
    custom_categories_limit_reached: '❌ Limit für eigene Kategorien: {max}',
    custom_categories_list_empty: 'Du hast keine eigenen Kategorien.',
    custom_categories_list_title: 'Deine eigenen Kategorien:',
    custom_categories_delete: '🗑️ Löschen',
    custom_categories_deleted: '✅ Kategorie gelöscht.',
    custom_categories_premium_required: '💎 Diese Funktion ist nur für Premium verfügbar.'
};
