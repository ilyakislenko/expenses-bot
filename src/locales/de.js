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
    premium_benefits: '💎 <b>Premium-Vorteile:</b>\n  • 🎯 Monats- und Kategorienbudgets mit Warnungen bei 80 % und bei Überschreitung\n  • 📄 Vollständige Zusammenfassung des Zeitraums: jede Kategorie im Vergleich zum Vormonat, Budgets, Durchschnittsausgaben pro Tag\n  • Beschreibung bis zu 160 Zeichen (statt 80)\n  • Bis zu 5 eigene Kategorien\n  • Familienbudget\n  • Bis zu 10 Sparziele (ohne Premium — 1)\n\n  Das Erfassen von Ausgaben und Einnahmen ist kostenlos und unbegrenzt.',
    
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
    savings_intro: 'Verwalte Ersparnisse, Ziele und Schulden — ich rechne aus, wie viel du in einem Jahr hast und wann du dein Ziel erreichst.\n\nStarte mit einem Gesamtbetrag oder lege ein Konto an: Bargeld, Festgeld, Krypto 👇',
    savings_general: 'Allgemeine Ersparnisse',
    savings_monthly_manual: '📥 Du sparst {amount}/Monat (manuell)',
    savings_monthly_unknown: '📥 Wie viel du pro Monat sparst, weiß ich noch nicht',
    savings_monthly_negative: '📉 Ausgaben übersteigen Einnahmen um ~{amount}/Monat — die Ersparnisse wachsen nicht',
    savings_monthly_auto: '📥 Du sparst ~{amount}/Monat — Einnahmen minus Ausgaben über {n} Monate',
    savings_button_set_current: '✏️ Ersparnisse eingeben',
    savings_button_forecast: '📈 Prognose',
    savings_button_settings: '⚙️ Einstellungen',
    savings_button_back: '⬅️ Ersparnisse',
    savings_not_found: '❌ Dieses Sparschwein habe ich nicht gefunden — vielleicht wurde es schon gelöscht.',
    savings_recent_operations: 'Letzte Änderungen:',
    savings_button_deposit: '➕ Einzahlen',
    savings_button_withdraw: '➖ Abheben',
    savings_button_transfer: '🔄 Umbuchen',
    savings_button_goal_target: '🎯 Zielbetrag',
    savings_button_goal_date: '📅 Frist',
    savings_button_mode_own: '🔀 Modus: eigenes Sparschwein',
    savings_button_mode_total: '🔀 Modus: aus allen Ersparnissen',
    savings_button_goal_delete: '🗑 Ziel löschen',
    savings_mode_own_line: '🐷 Eigenes Sparschwein',
    savings_mode_total_line: '🏦 Wird aus allen Ersparnissen berechnet',
    savings_goal_progress: 'Angespart: *{current}* von {target}',
    savings_goal_left: 'noch {amount}',
    savings_goal_deadline: '📅 Frist: {date} · {left}',
    savings_deadline_left: 'noch {duration}',
    savings_deadline_soon: 'weniger als ein Monat',
    savings_deadline_passed: 'Frist abgelaufen',
    savings_goal_achieved: '🎉 Ziel erreicht!',
    savings_goal_unreachable: '📥 Bei {amount}/Monat wird das Ziel nicht erreicht',
    savings_goal_eta: '📥 Bei {amount}/Monat — in ≈ {duration} ({date})',
    savings_goal_eta_real: '🔥 Mit Inflation — in ≈ {duration}',
    savings_goal_eta_real_never: '🔥 Mit Inflation nicht erreichbar: Die Preise steigen schneller als deine Sparrate',
    savings_goal_own_assumption: '_Angenommen, deine gesamte Sparrate fließt hierher._',
    savings_goal_required: '🎯 Bis zur Frist nötig: {amount}/Monat',
    savings_goal_required_real: '(mit Inflation {amount})',
    savings_prompt_deposit: 'Wie viel soll in „{name}“? Aktuell sind dort {amount}.\n\nZum Beispiel: `10000` oder `100 USD` — ich rechne in die Währung des Sparschweins um.',
    savings_prompt_withdraw: 'Wie viel möchtest du aus „{name}“ abheben? Aktuell sind dort {amount}.',
    savings_prompt_set: 'Wie viel ist jetzt auf „{name}“? Zum Beispiel `350000`.\n\nAktuell gespeichert: {amount}.',
    savings_transfer_choose: 'Wohin aus „{name}“ umbuchen? Verfügbar: {amount}.',
    savings_prompt_transfer: 'Wie viel von „{from}“ nach „{to}“ umbuchen? Verfügbar: {amount}.',
    savings_prompt_goal: '🎯 Wie viel und wofür sparst du? Zum Beispiel: `15000 Auto` oder `3000 USD Urlaub`. Standardwährung — *{currency}*.',
    savings_goal_limit_regular: '🎯 In der kostenlosen Version kannst du {limit} Ziel verwalten. Mit Premium — bis zu 10 Ziele gleichzeitig.',
    savings_goal_limit_premium: '🎯 Du hast schon {limit} Ziele — das ist das Maximum. Lösche eines, um ein neues hinzuzufügen.',
    savings_prompt_goal_target: 'Neuer Betrag für „{name}“ (aktuell {amount}). Gern auch mit neuem Namen: `2 000 000 neues Auto`.',
    savings_prompt_goal_date: 'Bis wann willst du für „{name}“ sparen? Schreib Monat und Jahr `12.2027` oder ein Datum `31.12.2027`.',
    savings_button_no_deadline: '♾ Ohne Frist',
    savings_deadline_removed: '✅ Frist entfernt',
    savings_mode_set_own: '✅ Das Ziel hat jetzt ein eigenes Sparschwein — zahle separat darauf ein.',
    savings_mode_set_total: '✅ Das Ziel wird jetzt aus allen Ersparnissen berechnet.',
    savings_moved_to_general: '💰 {amount} wurden in die allgemeinen Ersparnisse verschoben.',
    savings_button_account_name: '✏️ Name',
    savings_button_account_yield_default: '↩️ Wie in Einstellungen',
    savings_prompt_account: '💼 Wie soll das Konto heißen? Zum Beispiel: `Bargeld`, `Festgeld`, `Krypto`.\n\nDu kannst gleich Währung und Zinssatz angeben: `Festgeld USD 4%`.',
    savings_prompt_account_yield: 'Zinssatz für „{name}“, % pro Jahr: zum Beispiel `16` für Festgeld oder `0` für Bargeld (bis {max}).',
    savings_prompt_account_name: 'Neuer Name für „{name}“:',
    savings_account_delete_confirm: 'Konto „{name}“ löschen?',
    savings_account_deleted: '✅ Konto „{name}“ gelöscht.',
    savings_account_created: '✅ Konto „{name}“ erstellt.',
    savings_account_limit: '💼 Du hast schon {limit} Konten — das ist das Maximum. Lösche ein nicht benötigtes, um ein neues hinzuzufügen.',
    savings_error_account: '❌ Schreib den Namen des Kontos, zum Beispiel `Bargeld`.',
    savings_error_name: '❌ Der Name muss 1 bis {max} Zeichen lang sein.',
    savings_goal_delete_confirm: 'Ziel „{name}“ löschen?',
    savings_goal_delete_moves: 'Die angesparten {amount} gehen in die allgemeinen Ersparnisse — das Geld geht nicht verloren.',
    savings_button_goal_delete_yes: '🗑 Ja, löschen',
    savings_goal_deleted: '✅ Ziel „{name}“ gelöscht.',
    savings_forecast_title: '📈 *Sparprognose*',
    savings_now: 'Aktuell: *{amount}*',
    savings_rates_not_set: '⚙️ Keine Zinssätze festgelegt — Prognose ohne Zinsen und Inflation',
    savings_rate_yield_short: 'Zinssatz {value}%',
    savings_rate_inflation_short: 'Inflation {value}%',
    savings_rate_growth_short: 'Sparraten-Wachstum {value}% pro Jahr',
    savings_horizon_6: 'In einem halben Jahr',
    savings_horizon_12: 'In einem Jahr',
    savings_horizon_36: 'In 3 Jahren',
    savings_horizon_60: 'In 5 Jahren',
    savings_horizon_120: 'In 10 Jahren',
    savings_forecast_depleted: '⚠️ Bei diesem Tempo sind die Ersparnisse in {duration} aufgebraucht.',
    savings_forecast_legend: '💡 Mit Zinsen und Wachstum der Sparrate aus den Einstellungen; „heute“ — zu heutigen Preisen.',
    savings_settings_title: '⚙️ *Prognose-Einstellungen*',
    savings_settings_hint: '💡 Sparrate — wie viel du pro Monat sparst (auto: Einnahmen − Ausgaben). Zinssätze in % pro Jahr; der eigene Zinssatz eines Kontos steht in dessen Einstellungen.',
    savings_button_monthly_auto: '🔄 Automatisch berechnen',
    savings_monthly_auto_set: '✅ Die Sparrate wird automatisch berechnet: Einnahmen minus Ausgaben.',
    savings_prompt_monthly: 'Wie viel legst du pro Monat zurück? Zum Beispiel: `30000` ({currency}).',
    savings_prompt_inflation: 'Inflation in Prozent pro Jahr, z. B. `8` oder `7,5` (bis {max}). `0` — nicht berücksichtigen.',
    savings_prompt_yield: 'Standardzins — für Konten ohne eigenen Zinssatz und für neue Einzahlungen, % pro Jahr, zum Beispiel `16` (bis {max}). `0` — nicht berücksichtigen.',
    savings_prompt_growth: 'Um wie viel Prozent pro Jahr steigt deine Sparrate, z. B. `5` (bis {max}). `0` — nicht berücksichtigen.',
    savings_monthly_set: '✅ Sparrate: {amount}/Monat',
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
    savings_goal_created: '✅ Ziel erstellt — der Fortschritt wird aus allen Ersparnissen berechnet. Lege eine Frist mit „📅 Frist“ fest.',
    savings_goal_updated: '✅ Ziel aktualisiert',
    savings_deadline_set: '✅ Frist: {date}',
    savings_goal_achieved_notice: '🎉 Ziel „{name}“ erreicht!',
    savings_months: '{n} Mon.',
    savings_years: '{y} J.',
    savings_years_months: '{y} J. {m} Mon.',
    savings_compact_thousand: '{n} Tsd.',
    savings_compact_million: '{n} Mio.',
    savings_button_add_account: '➕ Konto hinzufügen',
    savings_header: '🏦 *Ersparnisse — {amount}*',
    savings_header_debts: '💳 Schulden — {debts} · Vermögen {net}',
    savings_section_accounts: 'Konten',
    savings_section_goals: 'Ziele',
    savings_section_debts: 'Schulden',
    savings_debt_until: 'bis {date}',
    savings_main_year: '📈 In einem Jahr ≈ {amount} (du sparst ~{monthly}/Monat)',
    savings_main_year_negative: '📉 In einem Jahr ≈ {amount} (Ausgaben übersteigen Einnahmen um ~{monthly}/Monat)',
    savings_button_set_monthly: '📥 Sparrate festlegen',
    savings_button_update: '🔄 Stände aktualisieren',
    savings_button_add: '➕ Hinzufügen',
    savings_add_title: '➕ *Was hinzufügen?*\n\n💼 *Konto* — wo das Geld liegt: Bargeld, Festgeld, Krypto\n🎯 *Ziel* — wofür du sparst\n💳 *Schuld* — Kredit, Hypothek, Ratenkauf, Schulden bei Freunden',
    savings_button_add_kind_account: '💼 Konto',
    savings_button_add_kind_goal: '🎯 Ziel',
    savings_button_add_kind_debt: '💳 Schuld',
    savings_rate_default: 'Rendite wie in Einstellungen ({value}%)',
    savings_rate_none: 'Ohne Zinsen',
    savings_rate_own: '{value}% pro Jahr',
    savings_updated: 'aktualisiert {date}',
    savings_button_new_amount: '✏️ Neuer Betrag',
    savings_button_configure: '⚙️ Einrichten',
    savings_button_rate: '📈 Zinssatz',
    savings_button_delete: '🗑 Löschen',
    savings_button_back_to_account: '⬅️ Zum Konto',
    savings_button_back_to_goal: '⬅️ Zum Ziel',
    savings_button_back_to_debt: '⬅️ Zur Schuld',
    savings_mode_hint: '„Aus allen Ersparnissen“ — Fortschritt über alle Konten zusammen. „Eigenes Sparschwein“ — ein separater Betrag, auf den du selbst einzahlst.',
    savings_update_step: '{icon} {name} ({i}/{n}) — aktuell {amount}. Wie viel ist es jetzt?',
    savings_update_step_debt: '{icon} {name} ({i}/{n}) — noch {amount} zurückzuzahlen. Wie viel jetzt?',
    savings_button_no_change: '✅ Unverändert',
    savings_button_stop: '⏹ Genug',
    savings_update_stale: '⏳ Das ist nicht mehr aktuell',
    savings_update_done: 'Fertig: Ersparnisse {before} → {after} ({delta})',
    savings_update_done_capital: 'Vermögen: {before} → {after}',
    savings_prompt_account_currency: 'In welcher Währung ist dieses Konto?',
    savings_button_other_currency: '🌐 Andere',
    savings_error_currency: '❌ Wähle eine Währung per Button oder schreib den Code, zum Beispiel `USD`.',
    savings_prompt_debt_name: '💳 Wie soll die Schuld heißen? Zum Beispiel: `Hypothek`, `Kreditkarte`, `Schulden bei Max`.\n\nOder alles in einer Zeile: `Hypothek 350 000 3,5%`.',
    savings_prompt_debt_amount: 'Wie viel ist bei „{name}“ noch zurückzuzahlen? Zum Beispiel `3000` ({currency}) oder `1200 USD`. Bei Zinsen füge den Zinssatz hinzu: `3000 18%`.',
    savings_error_debt_amount: '❌ Betrag nicht verstanden. Zum Beispiel `3000` oder `3000 18%`.',
    savings_debts_capital: 'Schulden {debts} · Vermögen {net}',
    savings_forecast_debts_only: 'Schulden {debts}',
    savings_forecast_today: 'heute ≈ {amount}',
    savings_button_monthly_value: '📥 Sparrate: {amount}',
    savings_button_monthly_auto_value: '📥 Sparrate: ~{amount} · auto',
    savings_button_monthly_unknown: '📥 Sparrate: unbekannt',
    savings_button_yield_value: '📈 Standardzins: {value}',
    savings_button_inflation_value: '🔥 Inflation: {value}',
    savings_button_growth_value: '⬆️ Wachstum Sparrate: {value}',
    savings_debt_rate: '📈 {value}% pro Jahr',
    savings_debt_no_rate: '📈 Zinsfrei',
    savings_debt_payment: '💵 Rate {amount}/Monat',
    savings_debt_payment_not_set: '💵 Rate nicht festgelegt',
    savings_debt_payoff: '📅 Abbezahlt in {duration} ({date})',
    savings_debt_total_interest: '💸 Zinsen insgesamt: ~{amount}',
    savings_debt_too_long: '⚠️ Mit dieser Rate dauert die Tilgung über 50 Jahre — versuch, mehr zu zahlen.',
    savings_debt_below_interest: '⚠️ Die Rate deckt die Zinsen nicht — die Schuld sinkt nicht. Um sie abzuzahlen, zahle mehr als {amount} pro Monat.',
    savings_debt_no_payment: '💡 Gib eine monatliche Rate an — ich berechne, wann die Schuld abbezahlt ist.',
    savings_debt_no_payment_interest: '💡 Gib eine monatliche Rate an — ich berechne, wann die Schuld abbezahlt ist und wie viel für Zinsen draufgeht. Aktuell kommen ~{amount} Zinsen pro Monat dazu.',
    savings_debt_paid_off: '🎉 Schuld abbezahlt!',
    savings_button_debt_pay: '➖ Tilgen',
    savings_button_debt_increase: '➕ Schuld erhöhen',
    savings_button_debt_payment: '💵 Monatliche Rate',
    savings_button_debt_delete: '🗑 Schuld löschen',
    savings_button_debt_no_payment: '🚫 Ohne Rate',
    savings_button_skip: '⏭ Überspringen',
    savings_prompt_debt_payment: 'Wie viel zahlst du monatlich für „{name}“? Zum Beispiel `500` ({currency}). Anhand der Rate berechne ich, wann die Schuld abbezahlt ist. `0` — ohne Rate.',
    savings_prompt_debt_pay: 'Wie viel von „{name}“ tilgen? Offen: {amount}.\n\n_Es wird keine Ausgabe erfasst — Raten sind meist schon in deinen Ausgaben._',
    savings_prompt_debt_increase: 'Um wie viel die Schuld „{name}“ erhöhen? Aktuell {amount}.',
    savings_prompt_debt_set: 'Wie viel ist bei „{name}“ noch offen? Schreib den genauen Betrag, `0` — abbezahlt.\n\nAktuell erfasst: {amount}.',
    savings_prompt_debt_rate: 'Zinssatz für „{name}“ in Prozent pro Jahr, z. B. `12` oder `29,9` (bis {max}). `0` — zinsfrei.',
    savings_debt_created: '✅ Schuld „{name}“ hinzugefügt.',
    savings_debt_limit: '💳 Schon {limit} Schulden — das ist das Maximum. Lösche eine abbezahlte, um eine neue hinzuzufügen.',
    savings_debt_error_overpay: '❌ Die Schuld beträgt nur {amount} — mehr kann nicht getilgt werden.',
    savings_debt_paid: '✅ Getilgt: {amount}',
    savings_debt_increased: '✅ Schuld erhöht um {amount}',
    savings_debt_set: '✅ Schuldbetrag aktualisiert: {amount}',
    savings_debt_delete_confirm: 'Schuld „{name}“ löschen? Es wird kein Geld bewegt — die Schuld verschwindet nur aus der Liste.',
    savings_debt_deleted: '✅ Schuld „{name}“ gelöscht.',
    savings_forecast_debts_note: '💳 Schulden nach geplanten Raten; die Raten sind schon in den Ausgaben, daher senken sie die Sparrate nicht.',
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
    premium_expiring_trial: '⏳ Deine Premium-Testphase endet am {date}.\n\nDanach funktionieren Budgets, die vollständige Zusammenfassung, eigene Kategorien und das Familienbudget nicht mehr. Alle Einträge bleiben erhalten, und das Erfassen von Ausgaben ist kostenlos.',
    premium_expiring_paid: '⏳ Premium endet am {date}. Du kannst im Voraus verlängern — die verbleibenden Tage bleiben erhalten.',
    premium_expired_trial: '🌙 Deine Premium-Testphase ist beendet. Ausgaben und Einnahmen erfassen bleibt kostenlos; Budgets, die vollständige Zusammenfassung, eigene Kategorien und Familie gibt es mit Premium.',
    premium_expired_paid: '🌙 Premium ist abgelaufen. Danke, dass du das Projekt unterstützt! Du kannst jederzeit verlängern.',
    premium_winback: '👋 Dein Premium ist vor einer Woche abgelaufen. Wenn du Budgets, die vollständige Zusammenfassung, eigene Kategorien und das Familienbudget zurückhaben möchtest — sieh dir die Tarife unten an.',
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
    weekly_insight_info: 'Wochenübersicht: montags um 10:00 — wie viel du letzte Woche im Vergleich zu sonst ausgegeben hast, welche Kategorien gestiegen sind und dein Tempo im aktuellen Zeitraum.',
    settings_weekly_insight_on_line: '📈 Wochenübersicht: montags um 10:00',
    settings_weekly_insight_off_line: '📈 Wochenübersicht: aus',
    button_weekly_insight_on: '📈 Woche: an',
    button_weekly_insight_off: '📈 Woche: aus',
    button_weekly_insight_now: '👀 Jetzt zeigen',
    button_weekly_insight_overview: '📊 Übersicht',
    button_weekly_insight_disable: '🔕 Wochenübersicht ausschalten',
    weekly_insight_enabled: '✅ Wochenübersicht aktiviert',
    weekly_insight_disabled: '⚫ Wochenübersicht deaktiviert',
    weekly_insight_turned_off: '🔕 Wochenübersicht ausgeschaltet. Wieder einschalten: Einstellungen → Erinnerungen.',
    weekly_insight_no_data: 'In den letzten 5 Wochen gab es keine Ausgaben — noch nichts zusammenzufassen.',
    weekly_insight_title: 'Woche {range}',
    weekly_insight_spent: 'Diese Woche ausgegeben: *{amount}*',
    weekly_insight_no_history: 'Noch zu wenig Verlauf — der Vergleich mit üblichen Wochen kommt in ein paar Wochen.',
    weekly_insight_same: '≈ Wie üblich (Schnitt der letzten {weeks} Wochen: {amount})',
    weekly_insight_more: '↑ {percent}% mehr als üblich: +{amount} gegenüber dem Schnitt der letzten {weeks} Wochen',
    weekly_insight_less: '↓ {percent}% weniger als üblich: −{amount} gegenüber dem Schnitt der letzten {weeks} Wochen',
    weekly_insight_overspend: '📈 Am stärksten gestiegen: {category} (+{amount})',
    weekly_insight_improvement: '👍 Weniger als üblich: {category} (−{amount})',
    weekly_insight_period: 'Zeitraum {range}',
    weekly_insight_period_spent: 'Ausgegeben: {amount} in {days} von {total} Tagen',
    weekly_insight_projection: 'Bei diesem Tempo bis zum Ende des Zeitraums: *≈{amount}*',
    weekly_insight_projection_vs: 'Bei diesem Tempo bis zum Ende des Zeitraums: *≈{amount}* (vorheriger — {previous}, {change})',
    weekly_insight_budget_ok: '🎯 Budget {limit}: im Rahmen, ≈{amount} Puffer',
    weekly_insight_budget_over: '🚨 Budget {limit}: bei diesem Tempo überschreitest du es um ≈{amount}',
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
    bot_description: 'Ausgaben und Einnahmen in Telegram erfassen.\n\nTippe "250 Kaffee" — Ausgabe gespeichert, Kategorie gemerkt.\n\n• Monatsübersicht nach Kategorien, Periodenbilanz\n• Einnahmen und Saldo: "+50000 Gehalt"\n• Miete und Abos werden automatisch erfasst\n• Kontoauszug-Import: T-Bank, Sber, Kaspi, CSV\n• Ersparnisse, Ziele, Schulden, Prognose mit Inflation\n• Budgets mit Warnungen, Tages- und Wochenübersicht, Erinnerungen\n• Familienbudget, Währungen, CSV-Export\n\nGrundfunktionen kostenlos. Neue Nutzer: 14 Tage Premium.',
    command_start: 'Hauptmenü',
    command_stats: 'Monatsübersicht',
    command_history: 'Heutige Einträge',
    command_income: 'Einnahmen und Saldo',
    command_recurring: 'Wiederkehrende Ausgaben',
    command_export: 'Export als CSV',
    button_import: '📥 Kontoauszug importieren',
    command_import: 'Kontoauszug importieren',
    import_intro: '📥 *Kontoauszug importieren*\n\nSchick die Datei des Kontoauszugs in diesen Chat — ich zeige dir, was ich gefunden habe, und speichere nichts ohne deine Bestätigung.\n\n*Unterstützt:*\n• *T-Bank* — CSV. Auf der Website: „Operationen“ → Zeitraum wählen → „Exportieren“ → CSV.\n• *Sber* — PDF „Kontoauszug der Karte“: SberBank Online → Karte → „Auszüge und Bescheinigungen“.\n• *Kaspi Gold* — PDF-Auszug: Kaspi.kz → Kaspi Gold → „Auszug“.\n• *Jede CSV* mit Kopfzeile: Datum, Betrag (oder Soll und Haben), Beschreibung; Währung und Kategorie, falls vorhanden.\n\nBis 20 MB und 5000 Buchungen pro Datei. Ein erneuter Import desselben Auszugs erzeugt keine Duplikate, und Buchungen, die du schon manuell erfasst hast, werden übersprungen. Die Datei selbst wird nicht gespeichert — nur die Buchungen.',
    import_unsupported_file: '📎 Ich kann Kontoauszüge als CSV und PDF importieren (T-Bank, Sber, Kaspi Gold oder jede CSV). Mehr — /import',
    import_file_too_big: '❌ Die Datei ist größer als 20 MB. Exportiere einen kürzeren Zeitraum.',
    import_download_error: '❌ Die Datei konnte nicht heruntergeladen werden. Schick sie bitte noch einmal.',
    import_pdf_error: '❌ Das PDF konnte nicht gelesen werden. Ist es passwortgeschützt oder ein Scan, exportiere den Auszug als CSV.',
    import_unknown_format: '❌ Dieses Auszugsformat kenne ich nicht. Unterstützt: CSV (T-Bank oder jede mit Kopfzeile) und PDF-Auszüge von Sber und Kaspi Gold. Mehr — /import',
    import_csv_columns: '❌ In der CSV wurden keine Spalten für Datum und Betrag gefunden. Es braucht eine Kopfzeile, zum Beispiel: `Datum;Betrag;Beschreibung`.',
    import_empty: '🤷 In der Datei gibt es keine Buchungen zum Importieren.',
    import_too_many: '❌ Die Datei enthält mehr als {max} Buchungen. Exportiere einen kürzeren Zeitraum.',
    import_source_tbank: 'T-Bank',
    import_source_sber: 'Sber',
    import_source_kaspi: 'Kaspi Gold',
    import_source_csv: 'CSV',
    import_preview_title: '📥 *Auszug: {source}*',
    import_preview_expenses: '💸 Ausgaben: {count} · {total}',
    import_preview_incomes: '💰 Einnahmen: {count} · {total}',
    import_preview_top: '*Top-Kategorien:*',
    import_preview_transfers: '🔁 Überweisungen, Aufladungen und Abhebungen: {count} (ab {out}, zu {in})',
    import_preview_transfers_ask: 'Als Ausgaben und Einnahmen zählen? Überweisungen zwischen eigenen Konten überspringst du besser.',
    import_preview_transfers_on: '✅ Überweisungen werden gezählt.',
    import_preview_transfers_off: '🚫 Überweisungen werden übersprungen.',
    import_preview_skipped: '*Wird übersprungen:*',
    import_skip_duplicates: '• bereits importiert: {count}',
    import_skip_manual: '• bereits manuell erfasst: {count}',
    import_skip_transfers: '• Überweisungen: {count}',
    import_skip_failed: '• fehlgeschlagene Buchungen: {count}',
    import_skip_currency: '• nicht unterstützte Währung: {count}',
    import_skip_invalid: '• nicht erkannte Zeilen: {count}',
    import_preview_footer: 'Noch ist nichts gespeichert.',
    import_nothing_new: '✅ Keine neuen Buchungen — alles aus diesem Auszug ist bereits erfasst.',
    button_import_transfers_on: '✅ Überweisungen zählen ({count})',
    button_import_transfers_off: '🚫 Überweisungen überspringen',
    button_import_confirm: '✅ Importieren',
    import_canceled: 'Import abgebrochen, nichts wurde gespeichert.',
    import_outdated: '⌛ Dieser Auszug ist veraltet. Schick die Datei noch einmal.',
    import_done_title: '✅ *Import abgeschlossen*',
    import_done_expenses: '💸 Ausgaben hinzugefügt: {count}',
    import_done_incomes: '💰 Einnahmen hinzugefügt: {count}',
    import_done_skipped: '*Übersprungen:*',
    button_import_undo: '↩️ Import rückgängig machen',
    import_undone: '↩️ Import rückgängig gemacht: {expenses} Ausgaben und {incomes} Einnahmen gelöscht.',
    import_undo_missing: 'Dieser Import wurde bereits rückgängig gemacht.',
    import_error: '❌ Die Buchungen konnten nicht gespeichert werden — nichts wurde übernommen. Versuch es noch einmal.',
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
    premium_expired_granted: '🌙 Dein Premium ist beendet. Ausgaben und Einnahmen erfassen bleibt kostenlos; Budgets, die vollständige Zusammenfassung, eigene Kategorien und Familie gibt es mit Premium. Du kannst es jederzeit verlängern.',
};
