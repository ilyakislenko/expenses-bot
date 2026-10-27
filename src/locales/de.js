module.exports = {
    button_reminders: '🔔 Erinnerung',
    reminders_enabled: '🔔 Erinnerungen sind an',
    reminders_disabled: 'Erinnerungen sind deaktiviert. Absolute Stille 🤐',
    reminder_sample_variants: [
     '👋 Hey! Wenn dein Geldbeutel schweigt, heißt das noch nicht, dass er glücklich ist. Notiere deine Ausgaben 😉',
'🤔 Heute schon etwas ausgegeben? Schreib’s auf, bevor das Gedächtnis fürs Brot rausgeht 🧠🥖',
'💭 Wenn du es nicht notiert hast – gilt es als ins Leere ausgegeben. Lass es uns festhalten 💸',
'🌊 Tropfen für Tropfen – und das Budget läuft unbemerkt davon. Besser, du notierst die heutigen Ausgaben 🌊',
'🤖 Der Bot meckert nicht, er erinnert nur: Zeit, die Ausgaben zu notieren 😌',
'💡 Schone den Pfennig – dann bleibt die Mark erhalten. Zeit, eine Notiz zu machen!',

'💰 Geld liebt Zählung und Ruhe. Notiere deine Ausgaben.',

'💡 Gib nicht unnötig aus – spare für das Wichtige. Zeit für einen Eintrag.',

'🏗️ Kleine Ersparnisse – große Taten. Füge jetzt einen Kauf hinzu.',

'🌱 Heute sparen – morgen leichter atmen. Notiere deine Ausgaben.',

'🔄 Der gehütete Rubel bringt zwei. Trage eine Ausgabe in einer Minute ein.',

'⏰ Zuerst zurücklegen – dann ausgeben. Zeit, eine Notiz zu machen!',

'🧱 Jeder Cent ist ein Baustein der Freiheit. Notiere eine Ausgabe.',

'🛡️ Spare im Voraus für schlechte Zeiten. Füge jetzt einen Eintrag hinzu.',

'📈 Kluges Ausgeben ist die beste Investition. Protokolliere den Kauf.',

'🎯 Ausgabenkontrolle = weniger Sorgen. Notiere deine Ausgaben.',

'🚀 Weniger Impulse – mehr Möglichkeiten. Zeit für einen Eintrag.',

'💎 Bezahle zuerst dich selbst. Füge eine Ausgabe im Bot hinzu.',

'✂️ Gestrichene unnötige Ausgabe = gewonnener Einnahmenanteil. Protokolliere den Kauf.',

'🎪 Ein Budget ist Freiheit der Wahl. Notiere die heutigen Ausgaben.',

'🌟 Ersparnisse sind ein „Ja“ an deine Zukunft. Zeit, eine Notiz zu machen!',

'⚡ Disziplin schlägt Chaos. Protokolliere die Ausgabe.',

'⏳ Geld verschwindet leise – rechtzeitig notieren. Füge jetzt eine Ausgabe hinzu.',

'🧘 Sparsamkeit ist der Weg zur Gelassenheit. Notiere den Kauf.',

'📋 Geld liebt Ordnung. Zeit für einen Eintrag.'
    ],
    reminder_message_title: 'Erinnerung',
    reminder_hours_info: 'Wähle bis zu 3 Stunden für Erinnerungen (deine lokale Zeitzone). Aktuell:',
    reminder_hours_limit: 'Du kannst maximal 3 Stunden auswählen',
    reminder_hours_saved: '✅ Erinnerungszeiten gespeichert',
    button_save: 'Speichern',
    button_clear: 'Zurücksetzen',
    
    // Zahlungs-Support und Richtlinien
    paysupport_message: 'Zahlungssupport\n\nUnternehmen: {businessName}\nSupport: @{supportUsername} / {supportEmail}\n\nAGB: {termsUrl}\nDatenschutz: {privacyUrl}\nRückerstattungen: {refundPolicyUrl}\n\nBei Fragen zu Stars-Zahlungen oder Rückerstattungen wenden Sie sich bitte zuerst an den Support. Wir erfüllen die Telegram Stars-Richtlinien.',
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
    security_error: '❌ *Sicherheitsfehler*\n\nVersuche es später erneut oder kontaktiere den Administrator.',
    
    // Admin-Panel
    button_admin: '👑 Admin-Panel',
    admin_access_denied: '❌ Du hast keine Administratorrechte.',
    admin_panel_title: '👑 *Admin-Panel*\n\nBitte eine Aktion auswählen:',
    admin_error: '❌ Fehler beim Ausführen der Administratoraktion.',
    
    // Admin-Statistik
    admin_stats_text: `📊 *Bot-Statistik*

👥 *Benutzer:*
• Gesamt: {totalUsers}
• Premium: {activePremium}
• Neu diese Woche: {newUsersWeek}
• Neu diesen Monat: {newUsersMonth}

💰 *Ausgaben:*
• Gesamte Einträge: {totalExpenses}
• Diese Woche: {expensesWeek}
• Aktive Benutzer: {activeUsers}

🐛 *Fehlerberichte:* {totalBugReports}

💎 *Spenden:*
• Gesamt: {totalDonations}
• Gesammelte Sterne: {totalStars}

⭐ *Premium-Transaktionen:* {premiumTransactions}`,
  
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

📊 *Übersicht:*
• Anzahl Spenden: {totalDonations}
• Abgeschlossen: {completedDonations}
• Ausstehend: {pendingDonations}

⭐ *Sterne:*
• Gesamt gesammelt: {totalStars}
• Durchschnittliche Spende: {avgStars} Sterne`,
  
    // Premium-Statistiken
    admin_premium_stats: `⭐ *Premium-Statistiken*

📊 *Benutzer:*
• Gesamt Premium: {totalPremiumUsers}
• Momentan aktiv: {activePremiumUsers}

💳 *Transaktionen:*
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

{adminFlag}{premiumFlag} {firstName} (@{username})
🆔 ID: {userId}
🌐 Sprache: {language}
💱 Währung: {currency}
🕐 Zeitzone: {timezone}
📅 Registriert am: {createdAt}

📊 *Statistik:*
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
    admin_broadcast_confirm: '📢 Massen-Nachricht bestätigen\n\n📝 Nachricht:\n{message}\n\n📏 Länge: {length} Zeichen\n\n⚠️ Diese Nachricht wird an ALLE Benutzer des Bots gesendet!',
    admin_broadcast_started: '📢 Nachrichtensendung gestartet...',
    admin_broadcast_result: '📢 *Sendung abgeschlossen!*\n\n📊 *Statistik:*\n• Gesamt: {total}\n• Gesendet: {sent}\n• Fehlgeschlagen: {failed}',
    admin_broadcast_header: '🔴🔴🔴 Ankündigung! 🔴🔴🔴',
    
    // Allgemeine Nachrichten
    error: 'Ein Fehler ist aufgetreten 😞',
    not_found: 'Nicht gefunden',
    expense_save_error: '❌ Fehler beim Speichern der Ausgabe. Bitte erneut versuchen.',
    cancel: 'Abbrechen',
    back: 'Zurück',
    confirm: 'Bestätigen',
    
    // Start-Nachricht
    start_message: `Hallo! 👋 Ich helfe dir, deine Ausgaben und Einnahmen zu erfassen.

*Ausgabe* — schreib einfach Betrag und Beschreibung: \`250 Kaffee\`, \`1500 Mittagessen\`.
Andere Währungen gehen auch: \`20 USD Taxi\`, oder nur ein Betrag: \`300\`.
*Einnahme* — mit Plus: \`+50000 Gehalt\`.

Wähle einmal eine Kategorie — beim nächsten Mal merke ich sie mir.
Das Menü ist unten: Monatsübersicht, heutige Einträge, Einnahmen, wiederkehrende Ausgaben (Miete, Abos) und «☰ Mehr».`,

    start_returning: '👋 Willkommen zurück! Sende eine Ausgabe als Nachricht — `250 Kaffee`. Das Menü ist auf der Tastatur unten.',
  help_message: `❓ *So funktioniert's*

• \`250 Kaffee\` — Ausgabe. Wähle einmal eine Kategorie, ich merke sie mir
• \`20 USD Taxi\` — Ausgabe in anderer Währung, \`300\` — ohne Beschreibung
• \`+50000 Gehalt\` — Einnahme (\`+1000 USD\` — in anderer Währung)
• Unter einem neuen Eintrag: ↩️ rückgängig, 🏷 Kategorie ändern
• 📊 *Monatsübersicht* — Ausgaben, Einnahmen, Saldo, Kategorien; ◀️ — frühere Zeiträume
• 📅 *Heute* — Einträge des Tages; tippe auf eine Nummer, um einen Eintrag zu bearbeiten oder zu löschen
• 🔁 *Wiederkehrende Ausgaben* — Miete und Abos werden jeden Monat automatisch erfasst
• 🎯 *Budgets* und 📄 *Zusammenfassung* des Zeitraums — Buttons unter der Monatsübersicht (Premium)
• Währungen, Erinnerungen (bis zu 3 pro Tag) und Periodenbeginn — unter ☰ Mehr → ⚙️ Einstellungen

Befehle: /stats /history /income /recurring /export /settings /menu`,
  
    // Ausgaben
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
    
    // Kategorien
    select_category: 'Kategorie auswählen:',
    amount_label: 'Betrag',
    description_label: 'Beschreibung',
    category_label: 'Kategorie',
    expense_added_title: 'Ausgabe hinzugefügt!',
    
    // Einstellungen
    currency_select: 'Standardwährung auswählen:',
    currency_set: 'Währung gesetzt: {currency}',
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
    // Family labels
    family_label: '🏠 *Familie:*',
    family_owner_label: '👑 *Eigentümer:*',
    family_info: '👨‍👩‍👧‍👦 *Familienbudget*\n\nHier könnt ihr Ausgaben gemeinsam mit Familie, Kolleg:innen, Freund:innen usw. verwalten.\n\n- \uD83D\uDC6A Es wird eine gemeinsame Gruppe zur Erfassung gemeinsamer Ausgaben erstellt.\n- \u2795 Jedes Mitglied kann Ausgaben hinzufügen.\n- \uD83D\uDDD1\uFE0F Eigene Ausgaben können bei Bedarf gelöscht werden.\n- \uD83D\uDCCA Gemeinsame Statistiken sind für alle Mitglieder verfügbar.\n- \uD83D\uDCE4 Der gesamte Datensatz der Gruppe kann in eine Datei exportiert werden.\n\nGemeinsame Kontrolle bedeutet weniger Chaos und mehr Transparenz.',
    family_created: '✅ Familie "{name}" wurde erstellt! Du kannst nun Mitglieder einladen.',
    family_left: '✅ Du hast die Familie "{name}" verlassen. Deine Ausgaben in dieser Familie sind jetzt privat.',
    family_deleted: '✅ Familie "{name}" wurde gelöscht. Alle Familienausgaben wurden in private Ausgaben umgewandelt.',
    family_member_removed_notification: '❌ Du wurdest aus der Familie „{familyName}“ entfernt. Deine Ausgaben in dieser Familie sind jetzt privat.',
    
    // Familienmenü-Buttons
    create_family: '🏠 Familie erstellen',
    join_family: '🔗 Familie beitreten',
    invite_member: '➕ Mitglied einladen',
    leave_family: '🚪 Familie verlassen',
    delete_family: '🗑️ Familie löschen',
    family_members: '👥 Familienmitglieder',
    family_stats: '💰 Monatliche Ausgaben',
    family_add_expense: '💰 Familienausgabe hinzufügen',
    button_personal_expense: '👤 Persönliche Ausgabe',
    enter_personal_expense: 'Bitte Betrag und Beschreibung der persönlichen Ausgabe eingeben:',
    family_mode_button_on: '🟢 Alle Ausgaben an Familie — tippen zum Ausschalten',
    family_mode_button_off: '⚪ Alle Ausgaben an Familie — tippen zum Einschalten',
    family_mode_line_on: '🟢 Neue Ausgaben werden der Familie zugeordnet',
    family_mode_line_off: '⚪ Neue Ausgaben sind persönlich',
    family_mode_enabled: '✅ Alle neuen Ausgaben werden jetzt der Familie zugeordnet.\n\nFür eine persönliche: «{personalButton}» unten oder «{removeButton}» auf der Ausgabenkarte.',
    family_mode_disabled: '✅ Neue Ausgaben sind wieder persönlich.\n\nFür eine Familienausgabe: «{familyButton}» unten oder «{addButton}» auf der Ausgabenkarte.',
    family_menu: '👨‍👩‍👧‍👦 Familienmenü',
    family_cancel: '❌ Abbrechen',
    
    // Einladungen
    invitation_sent: '✅ Einladung an @{username} gesendet',
    invitation_not_found: '❌ Einladung nicht gefunden oder abgelaufen.',
    invitation_expired: '❌ Einladung ist abgelaufen.',
    
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
    family_invitation_received: '🎉 Du wurdest in die Familie „{familyName}“ eingeladen\n\n👤 Eingeladen von: {inviterName}\n🔑 Code: `{inviteCode}`\n\nBitte Aktion auswählen:',
    accept_invitation: '✅ Annehmen',
    reject_invitation: '❌ Ablehnen',
    invitation_accepted: '🎉 Glückwunsch! Du bist der Familie „{familyName}“ beigetreten',
    invitation_rejected: '❌ Du hast die Einladung abgelehnt',
    invitation_not_pending: '❌ Die Einladung ist nicht mehr ausstehend',
    invitation_cancelled_notification: '❌ Die Einladung in die Familie „{familyName}“ wurde von {cancelledBy} storniert',
    enter_invite_code: '🔑 Bitte Einladungscode eingeben:',
    not_family_member: '❌ Du bist kein Mitglied dieser Familie.',
    not_family_owner: '❌ Du bist nicht der Eigentümer dieser Familie.',
    
    // Bestätigungen
    confirm_delete_family: '⚠️ *Familie löschen*\n\nAlle Mitglieder werden entfernt und alle Familienausgaben zu privaten Ausgaben umgewandelt.\n\nBist du sicher?',
    // Familienstatistik
    family_daily_stats: '💰 Tagesausgaben',
    family_export: '📊 Familiendaten exportieren',
    
    // Mitgliederliste
    family_members_title: '👥 *Familienmitglieder*',
    family_owner_role: 'Eigentümer',
    family_member_role: 'Mitglied',
    remove_member: '❌ Entfernen',
    confirm_remove_member: '⚠️ *Mitglied entfernen*\n\nSoll {name} aus der Familie entfernt werden? Die Familienausgaben dieser Person werden privat, und die Familie sieht sie nicht mehr.',
    member_removed: '✅ {name} wurde aus der Familie entfernt.',
    
    // Premium-Funktionen
    premium_required: '❌ Diese Funktion ist nur für Premium-Nutzer verfügbar.',
    
    timezone_updated: `✅ *Zeitzone aktualisiert!*

🕐 Ausgewählte Zeit: *{time}*
🌍 Zeitzone: *{timezone}*

Ab jetzt werden alle Ausgaben in deiner Ortszeit angezeigt.`,
    
    // Limits
    status_regular: '👤 Standard',
    status_premium: '💎 Premium',
    max_description_length: '<b>Maximale Beschreibungslänge:</b> {length} Zeichen',
    premium_benefits: `💎 <b>Premium-Vorteile:</b>
  • 🎯 Monats- und Kategorienbudgets mit Warnungen bei 80 % und bei Überschreitung
  • 📄 Vollständige Zusammenfassung des Zeitraums: jede Kategorie im Vergleich zum Vormonat, Budgets, Durchschnittsausgaben pro Tag
  • Beschreibung bis zu 160 Zeichen (statt 80)
  • Bis zu 5 eigene Kategorien
  • Familienbudget
  • Betrag und Beschreibung jedes Eintrags bearbeiten

  Das Erfassen von Ausgaben und Einnahmen ist kostenlos und unbegrenzt.`,
    
    // Premium-Abonnement
    premium_subscription_title: '⭐️ Abonnement',
    premium_status_header: '<b>Dein Status:</b>',
    premium_privileges: 'Vorteile: {status}',
    premium_menu_title: '<b>Menü:</b>',
    premium_tariff_button: '⭐️ Tarif',
    premium_why_paid_button: '👀 Warum kostenpflichtig?',
    premium_donate_button: '🤝 Spenden',
    premium_back_button: '⬅️ Zurück',
    premium_tariffs_title: '⭐️ Tarife (Telegram Stars)',
    per_month: 'pro Monat',
    premium_payment_info: '💳 Bezahlung erfolgt über Telegram Stars, die interne Währung von Telegram. 🔁 Der Monatstarif verlängert sich automatisch; kündigen kannst du ihn in Telegram: Einstellungen → Meine Sterne → Meine Abos. Die Tarife für 3, 6 und 12 Monate sind Einmalzahlungen.',
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
    premium_why_paid_text: 'Der Betrieb dieses Bots kostet etwa $200 pro Monat. Die Nutzerzahl wächst und als Entwickler muss ich auch meinen Lebensunterhalt verdienen :)',
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
    
    // Validierungsfehler
    error_too_long_regular: '❌ Beschreibung zu lang! Für Standardnutzer max. 80 Zeichen.',
    error_too_long_premium: '❌ Beschreibung zu lang! Für Premium max. 160 Zeichen.',
    error_amount: '❌ Ungültiger Betrag. Gib eine Zahl von 0.01 bis {max} ein.',
    error_format: '❌ Das habe ich nicht verstanden. Beginne mit einem Betrag: `250 Kaffee`, `20 USD Taxi` oder einfach `300`.',
    error_generic: '❌ Fehler. Versuche es später erneut oder kontaktiere den Admin.',
    
    // Buttons
    button_menu: '📋 Menü',
    button_expenses_month: '💰 Monatliche Ausgaben',
    button_expenses_day: '💰 Tagesausgaben',
    button_expenses_categories: '💰 Nach Kategorie',
    button_family: '👨‍👩‍👧‍👦 Familie',
    button_settings: '⚙️ Einstellungen',
    button_delete_last: '🗑️ Letzten Eintrag löschen',
    button_help: '❓ Hilfe',
    button_edit: 'Bearbeiten',
    button_mark_as_family: '👨‍👩‍👧‍👦 Zur Familie',
    button_remove_from_family: '🚫 Aus Familienbudget entfernen',
    expense_already_family: '❌ Diese Ausgabe ist bereits im Familienbudget',
    expense_converted_to_family: '✅ Ausgabe ins Familienbudget verschoben',
    expense_removed_from_family: '✅ Ausgabe aus dem Familienbudget entfernt',
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
    callback_data_not_found: '❌ Fehler: Daten nicht gefunden',
    callback_expense_added: '✅ Hinzugefügt zur Kategorie "{category}"',
    callback_canceled: '❌ Abgebrochen',
    callback_expense_canceled: '❌ Ausgabe hinzufügen abgebrochen',
    callback_deleted: 'Eintrag gelöscht!',
    callback_delete_error: 'Fehler beim Löschen oder Eintrag nicht gefunden',
    
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
    custom_categories_example: '💡 Beispiel: "🌍 Reisen" oder "🎮 Spiele"',
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
    custom_categories_premium_required: '💎 Diese Funktion ist nur für Premium verfügbar.',

    // Income
    button_income: '💵 Einnahmen',
    button_add_income: '➕ Einnahme hinzufügen',
    button_income_currency: '💱 Einnahmewährung',
    income_menu_title: '💵 *Einnahmen im aktuellen Zeitraum*',
    income_menu_empty: 'Noch keine Einnahmen in diesem Zeitraum.',
    income_currency_label: 'Standard-Einnahmewährung: *{currency}*',
    income_hint: '💡 Schneller Weg: Sende eine Nachricht mit Plus am Anfang — `+50000 Gehalt` oder `+1000 USD Freelance`',
    income_enter_prompt: 'Gib Betrag und Beschreibung der Einnahme ein 👇\n\nBeispiel: `50000 Gehalt`\nStandardwährung — *{currency}*. Eine andere kannst du mit einem Code nach dem Betrag angeben: `1000 USD Freelance`',
    income_added: '✅ Einnahme erfasst: *{amount}* — {description}',
    income_default_description: 'Einnahme',
    income_deleted: '✅ Einnahme gelöscht',
    income_edit_prompt: '✏️ Aktuell: {current}\n\nSende den neuen Betrag und/oder die Beschreibung 👇\nZum Beispiel: `60000 Gehalt`, nur den Betrag `60000` oder nur die Beschreibung `Vorschuss`.\nDie Währung änderst du mit einem Code nach dem Betrag: `1000 USD`',
    income_updated: '✅ Einnahme aktualisiert',
    button_savings: '🏦 Ersparnisse',
    command_savings: 'Ersparnisse und Sparziele',
    savings_title: '🏦 *Ersparnisse*',
    savings_intro: 'Hier kannst du deine Ersparnisse und Sparziele verwalten und sehen, wie viel du unter Berücksichtigung deiner üblichen Ausgaben, Zinsen und Inflation ansparen kannst.\n\nGib deine Ersparnisse als einen Betrag an oder lege Konten an — Bargeld, Festgeld, Fremdwährungskonto, Krypto, jedes mit eigener Währung und Rendite 👇',
    savings_total: 'Gesamt: *{amount}*',
    savings_general: 'Allgemeine Ersparnisse',
    savings_mode_total_short: '(aus allen Ersparnissen)',
    savings_goal_achieved_short: '✅ erreicht',
    savings_monthly_manual: '📥 Du legst {amount} pro Monat zurück (manuell festgelegt)',
    savings_monthly_unknown: '📥 Wie viel du monatlich zurücklegst, ist noch unbekannt: Erfasse deine Einnahmen für einen vollen Monat oder lege den Betrag in „⚙️ Prognose-Einstellungen“ fest.',
    savings_monthly_negative: '⚠️ Im Schnitt der letzten {n} Mon. übersteigen die Ausgaben die Einnahmen um {amount} pro Monat — deine Ersparnisse wachsen nicht.',
    savings_monthly_auto: '📥 Du legst ~{amount} pro Monat zurück — das sind Einnahmen minus Ausgaben im Schnitt über {n} Mon.',
    savings_in_year: '📈 In einem Jahr: ~{amount}',
    savings_in_today_money: 'in heutigem Geld ≈ {amount}',
    savings_button_set_current: '✏️ Als ein Betrag',
    savings_button_new_goal: '🎯 Neues Ziel',
    savings_button_forecast: '📈 Prognose',
    savings_button_settings: '⚙️ Prognose-Einstellungen',
    savings_button_back: '⬅️ Ersparnisse',
    savings_not_found: '❌ Dieses Sparschwein habe ich nicht gefunden — vielleicht wurde es schon gelöscht.',
    savings_balance: 'Aktuell: *{amount}*',
    savings_recent_operations: 'Letzte Änderungen:',
    savings_button_deposit: '➕ Einzahlen',
    savings_button_withdraw: '➖ Abheben',
    savings_button_set: '✏️ Genauer Betrag',
    savings_button_transfer: '🔄 Umbuchen',
    savings_button_goal_target: '🎯 Zielbetrag',
    savings_button_goal_date: '📅 Frist',
    savings_button_mode_own: '🔀 Modus: eigenes Sparschwein',
    savings_button_mode_total: '🔀 Modus: aus allen Ersparnissen',
    savings_button_goal_delete: '🗑 Ziel löschen',
    savings_mode_own_line: '🐷 Eigenes Sparschwein — zahle separat darauf ein',
    savings_mode_total_line: '🏦 Wird aus allen Ersparnissen berechnet',
    savings_goal_progress: 'Angespart: *{current}* von {target}',
    savings_goal_left: 'noch {amount}',
    savings_goal_deadline: '📅 Frist: {date} · {left}',
    savings_deadline_left: 'noch {duration}',
    savings_deadline_soon: 'weniger als ein Monat',
    savings_deadline_passed: 'Frist abgelaufen',
    savings_goal_achieved: '🎉 Ziel erreicht!',
    savings_goal_unreachable: '📥 Mit {amount} pro Monat wird das Ziel nicht erreicht — du musst mehr zurücklegen.',
    savings_goal_eta: '📥 Mit {amount} pro Monat erreichst du das Ziel in ≈ {duration} ({date})',
    savings_goal_eta_real: '🔥 Mit Inflation (das Ziel wird teurer) — in ≈ {duration}',
    savings_goal_eta_real_never: '🔥 Mit Inflation wird das Ziel nicht erreicht: Die Sparrate hält mit den Preisen nicht mit',
    savings_goal_own_assumption: '_Ich rechne so, als ginge die gesamte monatliche Sparrate in dieses Sparschwein._',
    savings_goal_required: '🎯 Um die Frist zu schaffen, lege {amount} pro Monat zurück',
    savings_goal_required_real: '(mit Inflation — {amount})',
    savings_prompt_deposit: 'Wie viel soll in „{name}“? Aktuell sind dort {amount}.\n\nZum Beispiel: `10000` oder `100 USD` — ich rechne in die Währung des Sparschweins um.',
    savings_prompt_withdraw: 'Wie viel möchtest du aus „{name}“ abheben? Aktuell sind dort {amount}.',
    savings_prompt_set: 'Wie viel liegt gerade in „{name}“? Schreib den genauen Betrag, z. B. `350000`.\n\nAktuell erfasst: {amount}.',
    savings_transfer_choose: 'Wohin aus „{name}“ umbuchen? Verfügbar: {amount}.',
    savings_prompt_transfer: 'Wie viel von „{from}“ nach „{to}“ umbuchen? Verfügbar: {amount}.',
    savings_prompt_goal: 'Schreib den Betrag und den Namen des Ziels 👇\n\nZum Beispiel: `1 500 000 Auto` oder `3000 USD Urlaub`. Standardwährung: *{currency}*.\n\nFrist und Modus (eigenes Sparschwein oder aus allen Ersparnissen) stellst du in der Zielkarte ein.',
    savings_goal_limit_regular: '🎯 In der kostenlosen Version kannst du {limit} Ziel verwalten. Mit Premium — bis zu 10 Ziele gleichzeitig.',
    savings_goal_limit_premium: '🎯 Du hast schon {limit} Ziele — das ist das Maximum. Lösche eines, um ein neues hinzuzufügen.',
    savings_prompt_goal_target: 'Neuer Betrag für „{name}“ (aktuell {amount}). Gern auch mit neuem Namen: `2 000 000 neues Auto`.',
    savings_prompt_goal_date: 'Bis wann willst du für „{name}“ sparen? Schreib Monat und Jahr `12.2027` oder ein Datum `31.12.2027`.',
    savings_button_no_deadline: '♾ Ohne Frist',
    savings_deadline_removed: '✅ Frist entfernt',
    savings_mode_set_own: '✅ Das Ziel hat jetzt ein eigenes Sparschwein — zahle separat darauf ein.',
    savings_mode_set_total: '✅ Das Ziel wird jetzt aus allen Ersparnissen berechnet.',
    savings_moved_to_general: '💰 {amount} wurden in die allgemeinen Ersparnisse verschoben.',
    savings_button_new_account: '💼 Konto hinzufügen',
    savings_account_yield: '📈 Rendite des Kontos: {value}% pro Jahr',
    savings_account_yield_default: '📈 Rendite — wie in den Prognose-Einstellungen: {value}% pro Jahr',
    savings_button_account_yield: '📈 Rendite',
    savings_button_account_name: '✏️ Name',
    savings_button_account_delete: '🗑 Konto löschen',
    savings_button_account_yield_default: '↩️ Wie in Einstellungen',
    savings_prompt_account: 'Wie heißt das Konto und in welcher Währung ist es? 👇\n\nZum Beispiel: `Bargeld USD`, `Festgeld 16%`, `Bankkonto EUR`, `Krypto USDT`, `Steam-Skins USD`. Ohne Währung — *{currency}*, einen Zinssatz kannst du mit `%` angeben.\n\n💡 Gib bei Krypto und Skins ihren Wert in Dollar an und aktualisiere ihn mit dem Button „✏️ Genauer Betrag“.',
    savings_prompt_account_yield: 'Rendite von „{name}“ in Prozent pro Jahr, z. B. `16` für Festgeld oder `0` für Bargeld (bis {max}).',
    savings_prompt_account_name: 'Neuer Name für „{name}“:',
    savings_account_delete_confirm: 'Konto „{name}“ löschen?',
    savings_account_deleted: '✅ Konto „{name}“ gelöscht.',
    savings_account_created: '✅ Konto „{name}“ erstellt.',
    savings_account_limit: '💼 Du hast schon {limit} Konten — das ist das Maximum. Lösche ein nicht benötigtes, um ein neues hinzuzufügen.',
    savings_error_account: '❌ Schreib den Namen des Kontos, z. B. `Bargeld USD` oder `Festgeld 16%`.',
    savings_error_name: '❌ Der Name muss 1 bis {max} Zeichen lang sein.',
    savings_goal_delete_confirm: 'Ziel „{name}“ löschen?',
    savings_goal_delete_moves: 'Die angesparten {amount} gehen in die allgemeinen Ersparnisse — das Geld geht nicht verloren.',
    savings_button_goal_delete_yes: '🗑 Ja, löschen',
    savings_goal_deleted: '✅ Ziel „{name}“ gelöscht.',
    savings_forecast_title: '📈 *Sparprognose*',
    savings_now: 'Aktuell: *{amount}*',
    savings_rates_not_set: '⚙️ Rendite und Inflation sind nicht festgelegt — gib sie in den Einstellungen an, damit die Prognose genauer wird.',
    savings_rate_yield_short: 'Rendite {value}%',
    savings_rate_inflation_short: 'Inflation {value}%',
    savings_rate_growth_short: 'Sparraten-Wachstum {value}% pro Jahr',
    savings_forecast_need_monthly: 'Für eine Prognose brauche ich eine monatliche Sparrate: Erfasse deine Einnahmen für mindestens einen vollen Monat oder lege den Betrag in den Einstellungen manuell fest.',
    savings_horizon_6: 'In einem halben Jahr',
    savings_horizon_12: 'In einem Jahr',
    savings_horizon_36: 'In 3 Jahren',
    savings_horizon_60: 'In 5 Jahren',
    savings_horizon_120: 'In 10 Jahren',
    savings_forecast_simple: 'einfach sparen: {amount}',
    savings_forecast_nominal: 'mit Zinsen und Sparraten-Wachstum: {amount}',
    savings_forecast_real: 'in heutigem Geld: {amount}',
    savings_forecast_depleted: '⚠️ Bei diesem Tempo sind die Ersparnisse in {duration} aufgebraucht.',
    savings_forecast_legend: '💡 „Einfach sparen“ — ohne Zinsen, Inflation und Sparraten-Wachstum. „In heutigem Geld“ — was es zu heutigen Preisen wert wäre.',
    savings_settings_title: '⚙️ *Prognose-Einstellungen*',
    savings_setting_yield: '📈 Rendite',
    savings_setting_inflation: '🔥 Inflation',
    savings_setting_growth: '⬆️ Sparraten-Wachstum',
    savings_rate_yearly: '{value}% pro Jahr',
    savings_rate_not_set: 'nicht berücksichtigt',
    savings_settings_hint: '💡 Rendite — der Standardsatz: für neue Einzahlungen und Konten ohne eigenen Satz (den eigenen legst du in der Kontokarte fest). Inflation — um wie viel die Preise (und deine Ziele) pro Jahr steigen. Sparraten-Wachstum — um wie viel der zurückgelegte Betrag pro Jahr steigt (z. B. durch Gehaltserhöhungen).',
    savings_button_monthly: '📥 Monatliche Sparrate',
    savings_button_monthly_auto: '🔄 Automatisch berechnen',
    savings_monthly_auto_set: '✅ Die Sparrate wird automatisch berechnet: Einnahmen minus Ausgaben.',
    savings_prompt_monthly: 'Wie viel legst du pro Monat zurück? Zum Beispiel: `30000` ({currency}).',
    savings_prompt_inflation: 'Inflation in Prozent pro Jahr, z. B. `8` oder `7,5` (bis {max}). `0` — nicht berücksichtigen.',
    savings_prompt_yield: 'Rendite der Ersparnisse in Prozent pro Jahr (Zinssatz), z. B. `16` (bis {max}). `0` — nicht berücksichtigen.',
    savings_prompt_growth: 'Um wie viel Prozent pro Jahr steigt deine Sparrate, z. B. `5` (bis {max}). `0` — nicht berücksichtigen.',
    savings_monthly_set: '✅ Sparrate: {amount} pro Monat',
    savings_setting_saved: '✅ Gespeichert',
    savings_error_amount: '❌ Betrag nicht erkannt. Schreib eine Zahl, z. B. `15000`.',
    savings_error_insufficient: '❌ So viel ist nicht da: im Sparschwein sind {amount}.',
    savings_error_rate: '❌ Ich brauche eine Zahl von 0 bis {max}, z. B. `8` oder `7,5`.',
    savings_error_date: '❌ Frist nicht erkannt. Schreib Monat und Jahr `12.2027` oder ein Datum `31.12.2027` — in der Zukunft.',
    savings_error_goal: '❌ Schreib den Betrag und den Namen des Ziels, z. B. `1 500 000 Auto`.',
    savings_deposited: '✅ {amount} eingezahlt',
    savings_withdrawn: '✅ {amount} abgehoben',
    savings_balance_set: '✅ Betrag aktualisiert: {amount}',
    savings_transferred: '✅ {amount} nach „{name}“ umgebucht',
    savings_goal_created: '✅ Ziel erstellt. Frist und Modus — über die Buttons unten.',
    savings_goal_updated: '✅ Ziel aktualisiert',
    savings_deadline_set: '✅ Frist: {date}',
    savings_goal_achieved_notice: '🎉 Ziel „{name}“ erreicht!',
    savings_months: '{n} Mon.',
    savings_years: '{y} J.',
    savings_years_months: '{y} J. {m} Mon.',
    income_not_found: '❌ Einnahme nicht gefunden',
    income_currency_select: 'Wähle die Währung, in der du normalerweise bezahlt wirst. Ausgaben bleiben in deiner Hauptwährung:',
    income_currency_set: '✅ Einnahmewährung: {currency}',
    income_total: '💵 Einnahmen: *{amount}*',
    balance_label: '⚖️ Bilanz (Einnahmen − Ausgaben): *{amount}*',
    income_error_format: '❌ Das habe ich nicht verstanden. Sende einen Betrag und optional eine Beschreibung: `50000 Gehalt` oder `1000 USD Freelance`',
    income_error_amount: '❌ Ungültiger Betrag. Gib eine Zahl von 0.01 bis {max} ein.',

    // Recurring expenses
    button_recurring: '🔁 Wiederkehrende Ausgaben',
    button_add_recurring: '➕ Wiederkehrende Ausgabe hinzufügen',
    recurring_menu_title: '🔁 *Wiederkehrende Ausgaben*',
    recurring_menu_info: 'Monatliche Zahlungen (Miete, Abos, Kredite) werden am gewählten Tag des Monats automatisch als Ausgaben erfasst.',
    recurring_menu_empty: 'Noch keine wiederkehrenden Ausgaben.',
    recurring_item: '{icon} {description} — *{amount}*, am {day}. jedes Monats\n    Nächste Erfassung: {next}',
    recurring_monthly_total: 'Summe pro Monat: *{amount}*',
    recurring_enter_prompt: 'Gib Betrag und Beschreibung der wiederkehrenden Ausgabe ein 👇\n\nBeispiel: `50000 Miete`\nDu kannst nach dem Betrag eine Währung angeben: `500 USD Miete`',
    recurring_day_prompt: 'An welchem Tag jedes Monats soll ich diese Ausgabe erfassen? Gib eine Zahl von 1 bis 31 ein.\n\nIst ein Monat kürzer, erfasse ich sie am letzten Tag des Monats.',
    recurring_day_invalid: '❌ Gib eine ganze Zahl von 1 bis 31 ein.',
    recurring_select_category: 'Wähle eine Kategorie für die wiederkehrende Ausgabe:',
    recurring_added: '✅ Wiederkehrende Ausgabe hinzugefügt\n\n{description} — *{amount}*, am {day}. jedes Monats\nErste Erfassung: {next}',
    recurring_added_charged_now: '✅ Wiederkehrende Ausgabe hinzugefügt und für diesen Monat bereits erfasst\n\n{description} — *{amount}*, am {day}. jedes Monats\nNächste Erfassung: {next}',
    recurring_deleted: '✅ Wiederkehrende Ausgabe gelöscht. Bereits erfasste Ausgaben bleiben im Verlauf.',
    recurring_not_found: '❌ Wiederkehrende Ausgabe nicht gefunden',
    recurring_limit: '❌ Du kannst höchstens {max} wiederkehrende Ausgaben haben',
    recurring_charged_notification: '🔁 Wiederkehrende Ausgabe erfasst: {icon} {description} — *{amount}*',
    recurring_error_format: '❌ Unbekanntes Format. Sende einen Betrag und eine Beschreibung: `50000 Miete` oder `500 USD Miete`',
    recurring_error_amount: '❌ Ungültiger Betrag. Gib eine Zahl von 0.01 bis {max} ein.',

    // Main menu and «More»
    button_overview: '📊 Monatsübersicht',
    button_today: '📅 Heute',
    button_more: '☰ Mehr',
    more_menu_title: '☰ *Mehr*',
    button_export: '📤 CSV-Export',
    keyboard_refreshed: '✅ Das Menü ist aktualisiert — jetzt kompakter 👇',
    button_outdated: 'Diese Schaltfläche ist veraltet. Öffne den Bereich erneut über das Menü unten.',
    overview_title: 'Übersicht: {range}',
    overview_spent: '💸 Ausgaben: *{amount}* · Einträge: {count}',
    overview_upcoming: 'Anstehende wiederkehrende:',
    overview_income_hint: '💡 Einnahmen mit Plus erfassen: `+50000 Gehalt`',
    button_prev_period: '◀️ Früher',
    button_next_period: 'Später ▶️',
    button_back_to_overview: '⬅️ Zur Übersicht',
    day_title_today: 'Heute, {date}',
    day_title_yesterday: 'Gestern, {date}',
    day_title: '{date}',
    day_entry_hint: 'Sende eine Ausgabe als Nachricht: `250 Kaffee`',
    button_prev_day: '◀️ Vortag',
    button_next_day: 'Nächster Tag ▶️',
    list_tap_number: 'Tippe auf eine Nummer, um den Eintrag zu öffnen.',
    family_today_title: 'Familie: heutige Einträge',
    button_undo: '↩️ Rückgängig',
    button_delete_record: '🗑 Löschen',
    button_change_category: '🏷 Kategorie',
    button_edit_record: '✏️ Bearbeiten',
    expense_family_label: 'im Familienbudget',
    expense_recurring_label: 'automatisch erfasst (wiederkehrende Ausgabe)',
    expense_category_remembered: '🏷 Die Kategorie stammt aus deinem vorherigen Eintrag mit derselben Beschreibung — ändere sie mit der Schaltfläche unten.',
    category_will_be_remembered: '💡 Ich merke mir deine Wahl: Beim nächsten Mal landet so ein Eintrag direkt in dieser Kategorie.',
    expense_category_changed: 'Kategorie: {category}',
    settings_header: 'Einstellungen',
    settings_currency_line: '💱 Währung: *{currency}* · Einnahmen: *{incomeCurrency}*',
    settings_timezone_line: '🌍 Zeitzone: {timezone}',
    settings_language_line: '🌐 Sprache: {language}',
    settings_period_line: '📅 Die Periode beginnt am Tag {day}',
    settings_reminders_on_line: '🔔 Erinnerungen: an ({hours})',
    settings_reminders_off_line: '🔔 Erinnerungen: aus',
    button_currencies: '💱 Währungen',
    settings_currencies_text: '💱 *Währungen*\n\nHauptwährung — Ausgaben und alle Summen werden darin berechnet: *{currency}*\nStandardwährung für Einnahmen: *{incomeCurrency}*\n\nJeder Eintrag kann in einer anderen Währung sein — schreib den Code nach dem Betrag: `20 USD Taxi`.',
    reminders_title: 'Erinnerungen',
    reminders_info: 'Wenn du bis zur gewählten Stunde nichts erfasst hast, erinnere ich dich. Höchstens 3 Mal am Tag.',
    button_reminders_on: '🟢 An — tippen zum Ausschalten',
    button_reminders_off: '⚫ Aus — tippen zum Einschalten',
    family_teaser: '👨‍👩‍👧‍👦 *Familienbudget*\n\nGemeinsame Ausgaben mit deinen Liebsten an einem Ort: Jeder erfasst seine eigenen, Statistik und Export sind gemeinsam.\n\nMit Premium verfügbar.',
    button_premium: '⭐️ Premium',

    // Subscription and premium ending
    subscription_active_info: '🔁 Das Monatsabo ist bis {date} bezahlt und verlängert sich automatisch. Kündigen: Telegram → Einstellungen → Meine Sterne → Meine Abos.',
    subscription_renewed: '🔁 Abo verlängert. Premium ist aktiv bis {date}.',
    button_view_tariffs: '⭐️ Tarife',
    premium_expiring_trial: '⏳ Deine Premium-Testphase endet am {date}.\n\nDanach funktionieren Budgets, die vollständige Zusammenfassung, eigene Kategorien, das Familienbudget und das Bearbeiten von Einträgen nicht mehr. Alle Einträge bleiben erhalten, und das Erfassen von Ausgaben ist kostenlos.',
    premium_expiring_paid: '⏳ Premium endet am {date}. Du kannst im Voraus verlängern — die verbleibenden Tage bleiben erhalten.',
    premium_expired_trial: '🌙 Deine Premium-Testphase ist beendet. Ausgaben und Einnahmen erfassen bleibt kostenlos; Budgets, die vollständige Zusammenfassung, eigene Kategorien, Familie und das Bearbeiten von Einträgen gibt es mit Premium.',
    premium_expired_paid: '🌙 Premium ist abgelaufen. Danke, dass du das Projekt unterstützt! Du kannst jederzeit verlängern.',
    premium_winback: '👋 Dein Premium ist vor einer Woche abgelaufen. Wenn du Budgets, die vollständige Zusammenfassung, eigene Kategorien, das Familienbudget und das Bearbeiten von Einträgen zurückhaben möchtest — sieh dir die Tarife unten an.',
    start_reminders_note: '🔔 Wenn du tagsüber nichts erfasst, erinnere ich dich (bis zu 3 Mal am Tag). Uhrzeiten ändern oder ausschalten: ☰ Mehr → ⚙️ Einstellungen → 🔔.',

    // Budgets
    button_budgets: '🎯 Budgets',
    budgets_title: 'Budgets',
    budgets_empty: 'Lege ein Limit für den ganzen Monat oder für eine Kategorie fest — ich warne dich bei 80 % und bei Überschreitung.',
    budgets_teaser: '🎯 *Budgets*\n\nEin Limit für den Monat oder für eine Kategorie: Der Fortschritt wird in der Übersicht angezeigt, und du bekommst eine Warnung bei 80 % und bei Überschreitung.\n\nVerfügbar mit Premium.',
    button_budget_total: '➕ Ganzer Monat',
    button_budget_category: '➕ Kategorie',
    button_budget_change: '✏️ Betrag ändern',
    budget_total_name: '🎯 Ganzer Monat',
    budget_left: '{amount} übrig',
    budget_over: '{amount} überschritten',
    budget_enter_prompt: 'Gib das Limit für „{name}“ für den Zeitraum ein 👇\n\nZum Beispiel: `10000` (in *{currency}*) oder `150 USD`',
    budget_amount_invalid: '❌ Nur ein Betrag wird benötigt: `10000` oder `150 USD`.',
    budget_saved: '✅ Budget gespeichert',
    budget_deleted: '✅ Budget gelöscht',
    budget_not_found: '❌ Budget nicht gefunden',
    budget_warning_80: '⚠️ {name}: {spent} von {limit} ausgegeben ({percent} %)',
    budget_warning_100: '🚨 {name}: Budget überschritten — {spent} von {limit} ({percent} %)',
    overview_budget_of: 'vom Budget von {amount}',

    // Period summary
    button_report: '📄 Zusammenfassung',
    report_title: 'Zusammenfassung: {range}',
    report_vs_previous: 'Im Vergleich zum vorherigen Zeitraum: {change} (vorher {amount})',
    report_change_new: 'neu',
    report_change_same: 'unverändert',
    report_top_categories: 'Größte Ausgaben:',
    report_locked: '🔒 Die vollständige Aufschlüsselung — jede Kategorie im Vergleich zum vorherigen Zeitraum, Budgets, Durchschnittsausgaben pro Tag und die größte Ausgabe — gibt es mit Premium.',
    report_categories_vs_previous: 'Kategorien (im Vergleich zum vorherigen Zeitraum):',
    report_categories_gone: 'Diesmal keine Ausgaben: {list}',
    report_more_numbers: 'Weitere Zahlen:',
    report_per_day: '📅 Durchschnitt pro Tag: {amount}',
    report_largest: '🔝 Größte Ausgabe: {amount} — {description} ({date})',
    overview_budget_limit: 'Limit {amount}',
    report_title_current: 'Zusammenfassung bisher: {range}',
    input_canceled: '✅ Abgebrochen. Du kannst wie gewohnt Ausgaben erfassen.',
    no_active_state: 'Gerade gibt es nichts abzubrechen.',
    daily_summary_title: 'Tagesübersicht',
    daily_summary_info: 'Tageszusammenfassung: Abends schicke ich dir, wie viel du heute wofür ausgegeben hast. Nur an Tagen mit Ausgaben.',
    daily_summary_enabled: '✅ Tageszusammenfassung aktiviert',
    daily_summary_disabled: '⚫ Tageszusammenfassung deaktiviert',
    daily_summary_hour_info: 'Wähle die lokale Stunde für die Tageszusammenfassung:',
    daily_summary_hour_set: 'Uhrzeit der Zusammenfassung gespeichert',
    button_daily_summary_on: '🗓 Übersicht: an',
    button_daily_summary_off: '🗓 Übersicht: aus',
    settings_daily_summary_on_line: '🗓 Tageszusammenfassung: um {time}',
    settings_daily_summary_off_line: '🗓 Tageszusammenfassung: aus',
    export_title: '📤 Export als CSV\n\nWähle den Zeitraum für die Datei.',
    export_categories_all: '🗂 Kategorien: alle',
    export_categories_selected: '🗂 Kategorien: {categories}',
    export_period_day: '📅 Heute',
    export_period_week: '📅 Letzte 7 Tage',
    export_period_current: '📅 Aktuelle Periode',
    export_period_previous: '📅 Vorherige Periode',
    export_period_all: '♾ Gesamte Zeit',
    export_period_range: '🗓 Daten wählen…',
    export_filter_categories: '🔽 Nach Kategorien filtern',
    export_select_categories: 'Wähle die Kategorien für den Export:',
    export_select_all: '✅ Alle auswählen',
    export_deselect_all: '❌ Alle abwählen',
    export_done: '✅ Fertig',
    export_no_categories: 'Wähle mindestens eine Kategorie',
    export_enter_dates: '🗓 Gib einen Datumsbereich ein:\n`01.03.2026 - 15.03.2026`\n\noder ein einzelnes Datum: `01.03.2026`',
    export_dates_invalid: '❌ Die Daten konnten nicht gelesen werden. Gib sie so ein: `01.03.2026 - 15.03.2026` oder ein einzelnes Datum `01.03.2026`.',
    export_dates_order: '❌ Das Startdatum liegt nach dem Enddatum. Beispiel: `01.03.2026 - 15.03.2026`.',
    total_by_categories: 'Gesamt nach Kategorien:',
    bot_short_description: 'Ausgaben in wenigen Taps erfassen: tippe "250 Kaffee". Einnahmen, Budgets, Monatsübersicht, Familienbudget.',
    bot_description: 'Ausgaben und Einnahmen direkt in Telegram erfassen.\n\nTippe "250 Kaffee" — die Ausgabe wird gespeichert und die Kategorie gemerkt.\n\n• Monatsübersicht nach Kategorien und Vergleich zum Vormonat\n• Einnahmen und Saldo: "+50000 Gehalt"\n• Wiederkehrende Ausgaben: Miete und Abos werden automatisch erfasst\n• Budgets mit Warnungen, Tageszusammenfassung, Erinnerungen\n• Familienbudget, mehrere Währungen, Export als CSV\n\nDie Grundfunktionen sind kostenlos. Neue Nutzer erhalten 14 Tage Premium.',
    command_start: 'Hauptmenü',
    command_stats: 'Monatsübersicht',
    command_history: 'Heutige Einträge',
    command_income: 'Einnahmen und Saldo',
    command_recurring: 'Wiederkehrende Ausgaben',
    command_export: 'Export als CSV',
    command_family: 'Familienbudget',
    command_settings: 'Einstellungen',
    command_limits: 'Abo und Premium',
    command_help: 'Hilfe',
    command_cancel: 'Eingabe abbrechen',
    command_paysupport: 'Zahlungssupport',
    command_terms: 'Nutzungsbedingungen',
    command_privacy: 'Datenschutzerklärung',
    payment_outdated: '⚠️ Diese Rechnung ist veraltet: Der Preis hat sich geändert. Öffne die Tarife erneut — /limits',
    security_validation_error: '⚠️ Die Anfrage konnte nicht verarbeitet werden. Versuch es noch mal oder öffne das Menü mit /start.',
    expense_draft_outdated: '⌛ Dieser Entwurf ist veraltet. Sende die Ausgabe noch einmal.',
    family_invitation_hours_left: '⏰ Noch {hours} Std.',
    family_no_members: 'Keine Mitglieder',
    family_already_member: '❌ Du bist bereits in einer Familie.',
    admin_bug_reports_all_title: '📝 Alle Fehlerberichte (letzte {count})',
    admin_bug_reports_new_title: '🆕 Neue Fehlerberichte (letzte {count})',
    admin_bug_reports_empty: 'Keine Berichte.',
    payment_subscription_already_active: '🔁 Du hast bereits ein aktives Monatsabo — ein zweites brauchst du nicht. Um Premium im Voraus zu verlängern, wähle einen Einmal-Tarif: /limits',
    payment_foreign_payer: '⚠️ Dieser Zahlungslink wurde für einen anderen Benutzer erstellt. Öffne die Tarife selbst im Bot — /limits',
    premium_expired_granted: '🌙 Dein Premium ist beendet. Ausgaben und Einnahmen erfassen bleibt kostenlos; Budgets, die vollständige Zusammenfassung, eigene Kategorien, Familie und das Bearbeiten von Einträgen gibt es mit Premium. Du kannst es jederzeit verlängern.'
};
