module.exports = {
    button_reminders: '🔔 Recordarme',
    reminders_enabled: '🔔 Recordatorios activados',
    reminders_disabled: 'Recordatorios desactivados. Silencio total 🤐',
    reminder_sample_variants: [
      '👋 ¡Hey! Si tu cartera está en silencio, no significa que sea feliz. Registra tus gastos 😉',
'🤔 ¿Ya gastaste algo hoy? Escríbelo antes de que la memoria se vaya a por pan 🧠🥖',
'💭 Si no lo anotaste, considéralo gastado en el vacío. Vamos a registrarlo 💸',
'🌊 Gota a gota, el presupuesto se escapa sin que te des cuenta. Mejor anota los gastos de hoy 🌊',
'🤖 El bot no regaña, solo recuerda: es hora de registrar los gastos 😌',
'💡 Cuida el céntimo y ahorrarás el euro. ¡Hora de hacer una nota!',

'💰 El dinero ama el conteo y el silencio. Registra tus gastos.',

'💡 No gastes en vano: ahorra para lo importante. Hora de hacer un registro.',

'🏗️ Pequeños ahorros, grandes logros. Añade una compra ahora.',

'🌱 Ahorra hoy y respira más tranquilo mañana. Registra tus gastos.',

'🔄 Un rublo bien cuidado trae dos. Registra un gasto en un minuto.',

'⏰ Primero ahorra, luego gasta. ¡Hora de hacer una nota!',

'🧱 Cada céntimo es un ladrillo de libertad. Registra un gasto.',

'🛡️ Ahorra con antelación para los días lluviosos. Añade un registro ahora.',

'📈 El gasto inteligente es la mejor inversión. Registra la compra.',

'🎯 Controlar los gastos = menos preocupaciones. Registra tus gastos.',

'🚀 Menos impulsos, más oportunidades. Hora de hacer un registro.',

'💎 Pága­te a ti primero. Añade un gasto en el bot.',

'✂️ Un gasto innecesario recortado es un ingreso ganado. Registra la compra.',

'🎪 Un presupuesto es libertad de elección. Registra los gastos de hoy.',

'🌟 Ahorrar es un “sí” a tu futuro. ¡Hora de hacer una nota!',

'⚡ La disciplina vence al caos. Registra el gasto.',

'⏳ El dinero se va en silencio: registra a tiempo. Añade un gasto ahora.',

'🧘 La frugalidad es el camino a la calma. Registra la compra.',

'📋 El dinero ama el orden. Hora de hacer un registro.'
    ],
    reminder_message_title: 'Recordatorio',
    reminder_hours_info: 'Selecciona hasta 3 horas para recordatorios (tu zona horaria local). Actuales:',
    reminder_hours_limit: 'Puedes seleccionar hasta 3 horas',
    reminder_hours_saved: '✅ Horas de recordatorio guardadas',
    button_save: 'Guardar',
    button_clear: 'Limpiar',
    
    // Soporte de pagos y políticas
    paysupport_message: 'Soporte de pagos\n\nEmpresa: {businessName}\nSoporte: @{supportUsername} / {supportEmail}\n\nTérminos: {termsUrl}\nPrivacidad: {privacyUrl}\nReembolsos: {refundPolicyUrl}\n\nPara pagos con Stars y reembolsos, contacta primero con soporte. Cumplimos las políticas de Telegram Stars.',
    terms_message: '📄 Términos del servicio: {termsUrl}',
    privacy_message: '🔐 Política de privacidad: {privacyUrl}',
    refund_message: '↩️ Política de reembolsos: {refundPolicyUrl}\n\nDudas: @{supportUsername} / {supportEmail}',
    
    // Reporte de errores
    button_bug_report: '🐛 Informar de un bug / Sugerir mejora',
    bug_report_prompt: '🐛 *Informar de un bug o sugerir una mejora*\n\nDescribe el problema o la mejora (máx. 1000 caracteres):',
    bug_report_success: '✅ ¡Gracias! Tu mensaje ha sido enviado a los desarrolladores.',
    bug_report_too_long: '❌ ¡Mensaje demasiado largo! Reduce {excess} caracteres (máximo 1000).',
    bug_report_empty: '❌ Mensaje vacío. Describe el problema o la propuesta.',
    bug_report_rate_limit: '⚠️ ¡Demasiados reportes!\n\nSolo puedes enviar 3 reportes cada 10 minutos',
    bug_report_suspicious: '⚠️ El mensaje contiene caracteres no permitidos o contenido sospechoso',
    
    // Mensajes de seguridad
    security_rate_limit: '⚠️ *Demasiadas solicitudes*\n\nIntenta de nuevo en {resetTime} segundos\nLímite: {limit} solicitudes por minuto',
    security_error: '❌ *Error de seguridad*\n\nInténtalo más tarde o contacta a un administrador.',
    
    // Panel admin
    button_admin: '👑 Panel de administración',
    admin_access_denied: '❌ No tienes permisos de administrador.',
    admin_panel_title: '👑 *Panel de administrador*\n\nSelecciona una acción:',
    admin_error: '❌ Error al ejecutar la acción como administrador.',
    
    // Estadísticas admin
    admin_stats_text: `📊 *Estadísticas del bot*

👥 *Usuarios:*
• Total: {totalUsers}
• Premium: {activePremium}
• Nuevos esta semana: {newUsersWeek}
• Nuevos este mes: {newUsersMonth}

💰 *Gastos:*
• Registros totales: {totalExpenses}
• Esta semana: {expensesWeek}
• Usuarios activos: {activeUsers}

🐛 *Reportes de errores:* {totalBugReports}

💎 *Donaciones:*
• Total: {totalDonations}
• Estrellas reunidas: {totalStars}

⭐ *Transacciones premium:* {premiumTransactions}`,
  
    // Lista usuarios admin
    admin_users_title: '👥 *Usuarios* (pág. {page}/{totalPages})\n\nTotal: {totalUsers}\n',
    
    // Reportes de bugs admin
    admin_bug_reports_title: '🐛 *Reportes de errores*',
    bug_report_status_new: '🆕 Nuevos',
    bug_report_status_in_progress: '🔄 En progreso',
    bug_report_status_resolved: '✅ Resueltos',
    bug_report_status_closed: '🔒 Cerrados',
    
    // Donaciones admin
    admin_donations_text: `💰 *Estadísticas de donaciones*

📊 *Resumen:*
• Donaciones totales: {totalDonations}
• Completadas: {completedDonations}
• Pendientes: {pendingDonations}

⭐ *Estrellas:*
• Total recolectado: {totalStars}
• Promedio por donación: {avgStars} estrellas`,
  
    // Premium admin 
    admin_premium_stats: `⭐ *Estadísticas premium*

📊 *Usuarios:*
• Total premium: {totalPremiumUsers}
• Activos ahora: {activePremiumUsers}

💳 *Transacciones:*
• Total operaciones: {totalTransactions}
• Ingresos totales: {totalRevenue} estrellas`,
  
    // Administradores
    admin_admins_title: '👑 *Administradores* ({count})\n',
    // Búsqueda admin
    admin_search_prompt: '🔍 *Buscar usuario*\n\nIntroduce el ID o el nombre de usuario:',
    admin_search_not_found: '❌ Usuario no encontrado.',
    admin_search_results: '🔍 *Resultados de búsqueda* "{query}"\n\nEncontrados: {count}\n',
    
    // Detalles usuario admin
    admin_user_not_found: '❌ Usuario no encontrado.',
    admin_user_details: `👤 *Información del usuario*

{adminFlag}{premiumFlag} {firstName} (@{username})
🆔 ID: {userId}
🌐 Idioma: {language}
💱 Moneda: {currency}
🕐 Zona horaria: {timezone}
📅 Registro: {createdAt}

📊 *Estadísticas:*
• Registros de gastos: {totalExpenses}
• Importe total: {totalAmount}
• Reportes de errores: {bugReportsCount}
• Transacciones: {transactionsCount}`,
  
    // Acciones admin
    admin_promote_success: '✅ Usuario {userId} ahora es administrador.',
    admin_demote_success: '✅ Usuario {userId} ya no es administrador.',
    admin_cannot_demote_self: '❌ No puedes quitarte tus propios permisos de administrador.',
    admin_grant_premium_options: '⭐ *Otorgar premium al usuario {userId}*\n\nSelecciona el período:',
    admin_grant_premium_success: '✅ Usuario {userId} recibió premium por {days} días.',
    admin_revoke_premium_success: '✅ Premium revocado al usuario {userId}.',
  
    // Difusión admin
    admin_broadcast_prompt: '📢 *Difusión masiva*\n\nIntroduce el texto para todos los usuarios (máx. 3600 caracteres):',
    admin_broadcast_too_long: '❌ Mensaje demasiado largo!\n\n📏 Longitud actual: {current}\n📏 Máximo: {max}\n📏 Elimina: {excess} caracteres',
    admin_broadcast_confirm: '📢 Confirmar envío de difusión\n\n📝 Texto:\n{message}\n\n📏 Longitud: {length} caracteres\n\n⚠️ ¡Este mensaje será enviado a TODOS los usuarios del bot!',
    admin_broadcast_started: '📢 Difusión iniciada...',
    admin_broadcast_result: '📢 *Difusión completada!*\n\n📊 *Estadísticas:*\n• Total usuarios: {total}\n• Enviado: {sent}\n• Errores: {failed}',
    admin_broadcast_header: '🔴🔴🔴 ¡Notificación! 🔴🔴🔴',
    
    // General
    error: 'Ocurrió un error 😞',
    not_found: 'No encontrado',
    expense_save_error: '❌ Error al guardar el gasto. Inténtalo de nuevo.',
    cancel: 'Cancelar',
    back: 'Atrás',
    confirm: 'Confirmar',
    
    // Comando inicio
    start_message: `¡Hola! 👋 Te ayudaré a registrar tus gastos e ingresos.

*Gasto* — solo escribe la cantidad y la descripción: \`250 café\`, \`1500 almuerzo\`.
También sirve otra moneda: \`20 USD taxi\`, o solo una cantidad: \`300\`.
*Ingreso* — con un más: \`+50000 salario\`.

Elige una categoría una vez — la recordaré la próxima vez.
El menú está abajo: resumen del mes, registros de hoy, ingresos, gastos recurrentes (alquiler, suscripciones) y «☰ Más».`,

    start_returning: '👋 ¡Bienvenido de nuevo! Envía un gasto como mensaje — `250 café`. El menú está en el teclado de abajo.',
  help_message: `❓ *Cómo usarlo*

• \`250 café\` — gasto. Elige una categoría una vez, la recordaré
• \`20 USD taxi\` — gasto en otra moneda, \`300\` — sin descripción
• \`+50000 salario\` — ingreso (\`+1000 USD\` — en otra moneda)
• Bajo un registro nuevo: ↩️ deshacer, 🏷 cambiar categoría
• 📊 *Resumen del mes* — gastos, ingresos, balance, categorías; ◀️ — periodos anteriores
• 📅 *Hoy* — registros del día; toca un número para editar o eliminar un registro
• 🔁 *Gastos recurrentes* — el alquiler y las suscripciones se registran automáticamente cada mes
• 🎯 *Presupuestos* y 📄 *Resumen* del periodo — botones bajo el resumen del mes (premium)
• Monedas, recordatorios (hasta 3 al día) e inicio del periodo — en ☰ Más → ⚙️ Ajustes

Comandos: /stats /history /income /recurring /export /settings /menu`,
  
    // Gastos
    expense_updated: '✅ Registro actualizado: {amount} - {description}',
    expense_deleted: '✅ Registro eliminado: {amount} - {description}',
    no_expenses: 'No hay registros para eliminar 🤷‍♂️',
    expense_not_found: 'Error: registro no encontrado.',
    expense_update_error: 'Error: registro no encontrado o no actualizado.',
    
    // Estadísticas
    monthly_stats: '💰 *Gastos de este mes*',
    daily_stats: '💰 *Gastos de hoy*',
    total_spent: 'Gastado: *{amount}*',
    records_count: 'Registros: {count}',
    no_expenses_period: 'No hay gastos para este período.',
    by_categories: 'Por categorías:',
    
    // Categorías
    select_category: 'Elige una categoría:',
    amount_label: 'Cantidad',
    description_label: 'Descripción',
    category_label: 'Categoría',
    expense_added_title: '¡Gasto añadido!',
    
    // Ajustes
    currency_select: 'Selecciona la moneda por defecto:',
    currency_set: 'Moneda establecida: {currency}',
    button_change_period_start: '📅 Día de inicio del período',
    period_start_prompt: 'Introduce un día del mes (1-31) como inicio del nuevo período. Meses más cortos usarán el último día.',
    period_start_invalid: '❌ Número inválido. Escribe un número entero entre 1 y 31.',
    period_start_set: '✅ Día de inicio establecido: {day}',
    timezone_setup: `🕐 *Configuración de zona horaria*

¿Qué hora es ahora?

*Hora actual UTC:* {utcTime}

Selecciona tu hora actual:`,
    timezone_set: '✅ Zona horaria establecida: {timezone}',
    // Presupuesto familiar
    // Family labels
    family_label: '🏠 *Familia:*',
    family_owner_label: '👑 *Propietario:*',
    family_info: '👨‍👩‍👧‍👦 Presupuesto familiar\n\nAquí puedes gestionar los gastos junto con familiares, colegas, amigos, etc.\n\n- \uD83D\uDC6A Se crea un grupo compartido para llevar el registro de los gastos conjuntos.\n- \u2795 Cada miembro puede agregar gastos.\n- \uD83D\uDDD1\uFE0F Puedes eliminar tus propios gastos si es necesario.\n- \uD83D\uDCCA Hay estadísticas compartidas disponibles para todos los miembros.\n- \uD83D\uDCE4 Exporta los datos de todo el grupo en un solo archivo.\n\nEl control compartido significa menos caos y más transparencia.',
    family_created: '✅ Familia "{name}" creada. Ahora puedes invitar miembros.',
    family_left: '✅ Has salido de la familia "{name}". Tus gastos en esta familia ahora son personales.',
    family_deleted: '✅ Familia "{name}" eliminada. Todos los gastos se han vuelto personales.',
    family_member_removed_notification: '❌ Has sido eliminado de la familia «{familyName}». Tus gastos en esta familia ahora son personales.',
    
    // Botones del menú familiar
    create_family: '🏠 Crear familia',
    join_family: '🔗 Unirse a familia',
    invite_member: '➕ Invitar miembro',
    leave_family: '🚪 Salir de la familia',
    delete_family: '🗑️ Eliminar familia',
    family_members: '👥 Miembros de la familia',
    family_stats: '💰 Gastos del mes',
    family_add_expense: '💰 Añadir gasto familiar',
    button_personal_expense: '👤 Gasto personal',
    enter_personal_expense: 'Introduce cantidad y descripción del gasto personal:',
    family_mode_button_on: '🟢 Todos los gastos a la familia — toca para desactivar',
    family_mode_button_off: '⚪ Todos los gastos a la familia — toca para activar',
    family_mode_line_on: '🟢 Los gastos nuevos se registran en la familia',
    family_mode_line_off: '⚪ Los gastos nuevos son personales',
    family_mode_enabled: '✅ Ahora todos los gastos nuevos se registran en la familia.\n\nPara uno personal: «{personalButton}» abajo o «{removeButton}» en la tarjeta del gasto.',
    family_mode_disabled: '✅ Los gastos nuevos vuelven a ser personales.\n\nPara uno familiar: «{familyButton}» abajo o «{addButton}» en la tarjeta del gasto.',
    family_menu: '👨‍👩‍👧‍👦 Menú familiar',
    family_cancel: '❌ Cancelar',
    
    // Invitaciones
    invitation_sent: '✅ Invitación enviada a @{username}',
    invitation_not_found: '❌ Invitación no encontrada o expirada.',
    invitation_expired: '❌ Invitación expirada.',
    
    // Entradas de usuario
    enter_family_name: 'Introduce el nombre de la familia (3-50 caracteres):',
    enter_invite_username: 'Introduce el usuario (sin @):',
    enter_expense_amount: 'Introduce cantidad y descripción del gasto familiar:',
    
    // Errores
    family_name_too_short: '❌ El nombre de la familia debe tener mínimo 3 caracteres.',
    family_name_too_long: '❌ El nombre de la familia no debe exceder 50 caracteres.',
    user_not_found: '❌ Usuario no encontrado.',
    user_already_in_family: '❌ El usuario ya está en una familia.',
    user_already_has_invitation: '❌ El usuario ya tiene una invitación activa.',
    user_already_in_other_family: '❌ El usuario ya está en otra familia.',
    user_already_in_your_family: '❌ El usuario ya es parte de tu familia.',
    user_not_premium: '❌ El usuario no tiene premium.',
    only_owner_can_invite: '❌ Solo el propietario puede invitar miembros.',
    active_invitations: '📋 Invitaciones activas',
    no_active_invitations: '📋 No tienes invitaciones activas.',
    active_invitations_list: '📋 Invitaciones activas:',
    cancel_invitation: '❌ Cancelar invitación',
    invitation_cancelled: '✅ Invitación cancelada.',
    not_authorized: '❌ No tienes permisos para esta acción.',
    invitation_code: '🔑 Código de invitación: `{code}`',
    family_invitation_received: '🎉 Te invitan a la familia «{familyName}»\n\n👤 Invitado por: {inviterName}\n🔑 Código: `{inviteCode}`\n\nElige una acción:',
    accept_invitation: '✅ Aceptar',
    reject_invitation: '❌ Rechazar',
    invitation_accepted: '🎉 ¡Te has unido a la familia «{familyName}»!',
    invitation_rejected: '❌ Has rechazado la invitación a la familia',
    invitation_not_pending: '❌ La invitación no está pendiente',
    invitation_cancelled_notification: '❌ La invitación a la familia «{familyName}» fue cancelada por {cancelledBy}',
    enter_invite_code: '🔑 Introduce el código de invitación:',
    not_family_member: '❌ No eres miembro de la familia.',
    not_family_owner: '❌ No eres el propietario de la familia.',
    
    // Confirmaciones
    confirm_delete_family: '⚠️ *Eliminar familia*\n\nTodos los miembros serán eliminados y los gastos volverán a ser personales.\n\n¿Estás seguro?',
    // Estadísticas familia
    family_daily_stats: '💰 Gastos del día',
    family_export: '📊 Exportar datos familiares',
    
    // Lista de miembros
    family_members_title: '👥 *Miembros de la familia*',
    family_owner_role: 'propietario',
    family_member_role: 'miembro',
    remove_member: '❌ Eliminar',
    confirm_remove_member: '⚠️ *Eliminar miembro*\n\n¿Seguro que quieres eliminar a {name} de la familia? Sus gastos en la familia pasarán a ser personales y la familia ya no los verá.',
    member_removed: '✅ {name} fue eliminado de la familia.',
    
    // Funciones premium
    premium_required: '❌ Esta función es solo para usuarios premium.',
    
    timezone_updated: `✅ *Zona horaria actualizada!*

🕐 Hora elegida: *{time}*
🌍 Zona horaria: *{timezone}*

Tus gastos se mostrarán en hora local.`,
    
    // Límites
    status_regular: '👤 Estándar',
    status_premium: '💎 Premium',
    max_description_length: '<b>Longitud máxima de descripción:</b> {length} caracteres',
    premium_benefits: `💎 <b>Ventajas premium:</b>
  • 🎯 Presupuestos mensuales y por categoría con avisos al 80 % y al superarlos
  • 📄 Resumen completo del periodo: cada categoría frente al mes anterior, presupuestos, gasto medio por día
  • 160 caracteres en descripción (en vez de 80)
  • Hasta 5 categorías propias
  • Presupuesto familiar
  • Editar el importe y la descripción de cualquier registro

  Registrar gastos e ingresos es gratis e ilimitado.`,
    
    // Suscripción premium
    premium_subscription_title: '⭐️ Suscripción',
    premium_status_header: '<b>Tu estado:</b>',
    premium_privileges: 'Privilegios: {status}',
    premium_menu_title: '<b>Menú:</b>',
    premium_tariff_button: '⭐️ Tarifa',
    premium_why_paid_button: '👀 ¿Por qué es de pago?',
    premium_donate_button: '🤝 Donar',
    premium_back_button: '⬅️ Atrás',
    premium_tariffs_title: '⭐️ Tarifas (Telegram Stars)',
    per_month: 'al mes',
    premium_payment_info: '💳 El pago se hace con Telegram Stars, la moneda interna de Telegram. 🔁 El plan mensual se renueva automáticamente; cancélalo en Telegram: Ajustes → Mis estrellas → Mis suscripciones. Los planes de 3, 6 y 12 meses son pagos únicos.',
    premium_renewal_info: '📅 Puedes renovar en cualquier momento. Se añadirá a tu tiempo restante.',
    premium_stars_info: '💡 Compra estrellas sin comisión en el bot oficial [@PremiumBot].',
    premium_why_paid_title: '👀 ¿Por qué es de pago?',
    premium_purchases_button: '🧾 Historial de compras',
    purchases_header: '🧾 Historial de compras',
    purchases_premium_title: 'Premium',
    purchases_donations_title: 'Donaciones',
    no_purchases: 'Aún no hay compras',
    purchases_prev_button: '◀ Anterior',
    purchases_next_button: 'Siguiente ▶',
    premium_why_paid_text: 'Mantener el servidor cuesta unos $200 mensuales, sin contar el aumento de usuarios. Y yo como desarrollador también necesito comer para seguir creando funciones :)',
    // Etiquetas de tarifas y nombre del producto
    tariff_button_30: '1 Mes',
    tariff_button_90: '3 Meses',
    tariff_button_180: '6 Meses',
    tariff_button_365: '1 Año',
    tariff_item_30: '1 mes (30 días)',
    tariff_item_90: '3 meses (90 días)',
    tariff_item_180: '6 meses (180 días)',
    tariff_item_365: '12 meses (365 días)',
    premium_product: 'Suscripción premium',
    discount_save: 'ahorro {percent}%',
  
    payment_success: '🎉 *Pago exitoso!*\n\nPremium activado. Disfruta las funciones avanzadas.',
    donation_success: '🙏 *Gracias por tu apoyo!*\n\nAportas al desarrollo del bot.',
    general_payment_success: '✅ *Pago exitoso!*\n\nGracias por usar el bot.',
    premium_expires: '📅 Premium válido hasta: <b>{date}</b>\n⏰ Días restantes: <b>{days}</b>',
  
    // Donaciones
    donate_prompt_title: '🤝 Apoyar el proyecto',
    donate_prompt_text: 'Introduce el número de estrellas (1 a 2500) que quieras donar.\n\nPuedes incluir un mensaje de hasta 500 caracteres en la línea siguiente.',
    donate_invalid: '❌ Introduce un número entero de 1 a 2500. Mensaje máx. 500 caracteres.',
    donate_created: '✅ Donación creada: {stars} ⭐️. Te envío el enlace de pago.',
    
    // Errores de validación
    error_too_long_regular: '❌ Descripción demasiado larga! Máx. 80 caracteres para usuarios normales.',
    error_too_long_premium: '❌ Descripción demasiado larga! Máx. 160 caracteres para premium.',
    error_amount: '❌ Cantidad no válida. Introduce un número de 0.01 a {max}.',
    error_format: '❌ No lo entendí. Empieza con una cantidad: `250 café`, `20 USD taxi` o solo `300`.',
    error_generic: '❌ Error. Intenta más tarde o contacta con admin.',
    
    // Botones
    button_menu: '📋 Menú',
    button_expenses_month: '💰 Gastos del mes',
    button_expenses_day: '💰 Gastos del día',
    button_expenses_categories: '💰 Gastos por categoría',
    button_family: '👨‍👩‍👧‍👦 Familia',
    button_settings: '⚙️ Ajustes',
    button_delete_last: '🗑️ Eliminar último gasto',
    button_help: '❓ Ayuda',
    button_edit: 'Editar',
    button_mark_as_family: '👨‍👩‍👧‍👦 A familia',
    button_remove_from_family: '🚫 Quitar de presupuesto familiar',
    expense_already_family: '❌ Este gasto ya es familiar',
    expense_converted_to_family: '✅ Gasto movido a presupuesto familiar',
    expense_removed_from_family: '✅ Gasto quitado de presupuesto familiar',
    button_cancel: '❌ Cancelar',
    button_back: '⬅️ Atrás',
    button_change_currency: '💱 Cambiar moneda',
    button_change_timezone: '🌍 Zona horaria',
    button_change_language: '🌐 Idioma',
    button_custom_categories: '🏷️ Categorías personalizadas',
    
    // Idiomas
    language_select: '🌍 Selecciona idioma:',
    language_set: '✅ Idioma cambiado a español',
    language_not_supported: '❌ Idioma no soportado',
    language_change_error: '❌ Error al cambiar idioma',
    timezone_error: '❌ Error al establecer zona horaria',
    
    // Exportación
    export_success: '📊 Datos exportados!',
    export_error: 'Error al exportar 😞',
    keyboard_updated: '✅ Teclado actualizado a tu idioma!',
    
    // Edición
    edit_canceled: 'Edición cancelada.',
    edit_no_active: 'No hay edición activa.',
    edit_instructions: 'Escribe nueva cantidad y/o descripción (ej: 500 café) o pulsa cancelar.',
    edit_empty: 'Introduce nueva cantidad, descripción o ambas.',
    edit_amount_error: 'Cantidad inválida.',
    edit_too_long: 'Descripción demasiado larga (máx. {max} caracteres).',
    edit_format_error: 'Formato inválido.',
    
    // Respuestas callback
    callback_data_not_found: '❌ Error: datos no encontrados',
    callback_expense_added: '✅ Añadido a categoría "{category}"',
    callback_canceled: '❌ Cancelado',
    callback_expense_canceled: '❌ Añadido de gasto cancelado',
    callback_deleted: 'Registro eliminado!',
    callback_delete_error: 'Error al borrar o registro no encontrado',
    
      // Categorías por defecto
  category_food: 'Comida',
  category_transport: 'Transporte',
  category_entertainment: 'Entretenimiento',
  category_shopping: 'Compras',
  category_health: 'Salud',
  category_other: 'Otros',
  
  // Exportación CSV
  date_label: 'Fecha',
  currency_label: 'Moneda',
  total_by_currencies: 'Total por monedas:',
  total_in_currency: 'Total en {currency}',
    
    // Categorías personalizadas (premium)
    custom_categories_title: '🏷️ Categorías personalizadas',
    custom_categories_info: 'Crea tus propias categorías de gastos (solo premium).',
    custom_categories_example: '💡 Ejemplo: "🌍 Viajes" o "🎮 Juegos"',
    custom_categories_add: '➕ Agregar categoría',
    custom_categories_manage: '🗂️ Administrar categorías',
    custom_categories_enter_name: 'Nombre de nueva categoría (1-30 caracteres):',
    custom_categories_created: '✅ Categoría creada: {name}',
    custom_categories_exists: '❌ Esa categoría ya existe.',
    custom_categories_limit_reached: '❌ Límite de categorías alcanzado: {max}',
    custom_categories_list_empty: 'No tienes categorías personalizadas.',
    custom_categories_list_title: 'Tus categorías personalizadas:',
    custom_categories_delete: '🗑️ Eliminar',
    custom_categories_deleted: '✅ Categoría eliminada.',
    custom_categories_premium_required: '💎 Solo para usuarios premium.',

    // Income
    button_income: '💵 Ingresos',
    button_add_income: '➕ Añadir ingreso',
    button_income_currency: '💱 Moneda de ingresos',
    income_menu_title: '💵 *Ingresos del periodo actual*',
    income_menu_empty: 'Aún no hay ingresos en este periodo.',
    income_currency_label: 'Moneda de ingresos predeterminada: *{currency}*',
    income_hint: '💡 Forma rápida: envía un mensaje que empiece con más — `+50000 salario` o `+1000 USD freelance`',
    income_enter_prompt: 'Introduce la cantidad y la descripción del ingreso 👇\n\nEjemplo: `50000 salario`\nMoneda predeterminada — *{currency}*. Puedes indicar otra con un código después de la cantidad: `1000 USD freelance`',
    income_added: '✅ Ingreso registrado: *{amount}* — {description}',
    income_default_description: 'Ingreso',
    income_deleted: '✅ Ingreso eliminado',
    income_edit_prompt: '✏️ Ahora: {current}\n\nEnvía la nueva cantidad y/o descripción 👇\nPor ejemplo: `60000 salario`, solo la cantidad `60000` o solo la descripción `anticipo`.\nLa moneda se cambia con un código después de la cantidad: `1000 USD`',
    income_updated: '✅ Ingreso actualizado',
    button_savings: '🏦 Ahorros',
    command_savings: 'Ahorros y metas',
    savings_title: '🏦 *Ahorros*',
    savings_intro: 'Aquí puedes llevar tus ahorros y metas y ver cuánto lograrás ahorrar teniendo en cuenta tus gastos habituales, los intereses y la inflación.\n\nIndica tus ahorros como una sola cantidad o crea cuentas — efectivo, depósito, cuenta en divisas, cripto, cada una con su moneda y rentabilidad 👇',
    savings_total: 'Total: *{amount}*',
    savings_general: 'Ahorros generales',
    savings_mode_total_short: '(de todos los ahorros)',
    savings_goal_achieved_short: '✅ lograda',
    savings_monthly_manual: '📥 Ahorras {amount} al mes (fijado manualmente)',
    savings_monthly_unknown: '📥 Aún no se sabe cuánto ahorras al mes: registra tus ingresos de un mes completo o fija la cantidad en «⚙️ Ajustes del pronóstico».',
    savings_monthly_negative: '⚠️ En promedio en {n} meses, los gastos superan a los ingresos en {amount} al mes — tus ahorros no crecen.',
    savings_monthly_auto: '📥 Ahorras ~{amount} al mes — son los ingresos menos los gastos en promedio de {n} meses.',
    savings_in_year: '📈 En un año: ~{amount}',
    savings_in_today_money: 'en dinero de hoy ≈ {amount}',
    savings_button_set_current: '✏️ Una sola cantidad',
    savings_button_new_goal: '🎯 Nueva meta',
    savings_button_forecast: '📈 Pronóstico',
    savings_button_settings: '⚙️ Ajustes del pronóstico',
    savings_button_back: '⬅️ Ahorros',
    savings_not_found: '❌ No encontré esta hucha — quizá ya se eliminó.',
    savings_balance: 'Ahora: *{amount}*',
    savings_recent_operations: 'Últimos cambios:',
    savings_button_deposit: '➕ Añadir',
    savings_button_withdraw: '➖ Retirar',
    savings_button_set: '✏️ Cantidad exacta',
    savings_button_transfer: '🔄 Transferir',
    savings_button_goal_target: '🎯 Importe de la meta',
    savings_button_goal_date: '📅 Plazo',
    savings_button_mode_own: '🔀 Modo: hucha propia',
    savings_button_mode_total: '🔀 Modo: de todos los ahorros',
    savings_button_goal_delete: '🗑 Eliminar meta',
    savings_mode_own_line: '🐷 Hucha propia — aliméntala por separado',
    savings_mode_total_line: '🏦 Se calcula sobre todos los ahorros',
    savings_goal_progress: 'Ahorrado: *{current}* de {target}',
    savings_goal_left: 'faltan {amount}',
    savings_goal_deadline: '📅 Plazo: {date} · {left}',
    savings_deadline_left: 'quedan {duration}',
    savings_deadline_soon: 'menos de un mes',
    savings_deadline_passed: 'plazo vencido',
    savings_goal_achieved: '🎉 ¡Meta lograda!',
    savings_goal_unreachable: '📥 Con {amount} al mes no alcanzas la meta — necesitas ahorrar más.',
    savings_goal_eta: '📥 Con {amount} al mes alcanzarás la meta en ≈ {duration} ({date})',
    savings_goal_eta_real: '🔥 Con inflación (la meta se encarece) — en ≈ {duration}',
    savings_goal_eta_real_never: '🔥 Con inflación la meta no se alcanza: tu aporte no sigue el ritmo de los precios',
    savings_goal_own_assumption: '_Calculo como si todo el aporte mensual fuera a esta hucha._',
    savings_goal_required: '🎯 Para llegar a tiempo, ahorra {amount} al mes',
    savings_goal_required_real: '(con inflación — {amount})',
    savings_prompt_deposit: '¿Cuánto añadir a «{name}»? Ahora hay {amount}.\n\nPor ejemplo: `10000` o `100 USD` — lo convertiré a la moneda de la hucha.',
    savings_prompt_withdraw: '¿Cuánto retirar de «{name}»? Ahora hay {amount}.',
    savings_prompt_set: '¿Cuánto hay ahora en «{name}»? Escribe la cantidad exacta, por ejemplo `350000`.\n\nRegistrado ahora: {amount}.',
    savings_transfer_choose: '¿A dónde transferir desde «{name}»? Disponible: {amount}.',
    savings_prompt_transfer: '¿Cuánto transferir de «{from}» a «{to}»? Disponible: {amount}.',
    savings_prompt_goal: 'Escribe el importe y el nombre de la meta 👇\n\nPor ejemplo: `1 500 000 coche` o `3000 USD vacaciones`. Moneda por defecto: *{currency}*.\n\nEl plazo y el modo (hucha propia o de todos los ahorros) los configuras en la ficha de la meta.',
    savings_goal_limit_regular: '🎯 En la versión gratuita puedes tener {limit} meta. Con Premium — hasta 10 metas a la vez.',
    savings_goal_limit_premium: '🎯 Ya tienes {limit} metas — es el máximo. Elimina una para añadir otra.',
    savings_prompt_goal_target: 'Nuevo importe para «{name}» (ahora {amount}). Puedes poner también un nombre nuevo: `2 000 000 coche nuevo`.',
    savings_prompt_goal_date: '¿Para cuándo quieres ahorrar para «{name}»? Escribe mes y año `12.2027` o una fecha `31.12.2027`.',
    savings_button_no_deadline: '♾ Sin plazo',
    savings_deadline_removed: '✅ Plazo eliminado',
    savings_mode_set_own: '✅ Ahora la meta tiene su propia hucha — aliméntala por separado.',
    savings_mode_set_total: '✅ Ahora la meta se calcula sobre todos los ahorros.',
    savings_moved_to_general: '💰 {amount} pasaron a los ahorros generales.',
    savings_button_new_account: '💼 Añadir cuenta',
    savings_account_yield: '📈 Rentabilidad de la cuenta: {value}% al año',
    savings_account_yield_default: '📈 Rentabilidad — como en los ajustes del pronóstico: {value}% al año',
    savings_button_account_yield: '📈 Rentabilidad',
    savings_button_account_name: '✏️ Nombre',
    savings_button_account_delete: '🗑 Eliminar cuenta',
    savings_button_account_yield_default: '↩️ Como en los ajustes',
    savings_prompt_account: '¿Cómo se llama la cuenta y en qué moneda está? 👇\n\nPor ejemplo: `Efectivo USD`, `Depósito 16%`, `Cuenta bancaria EUR`, `Cripto USDT`, `Skins de Steam USD`. Sin moneda — *{currency}*; la tasa se puede indicar con `%`.\n\n💡 Para cripto y skins, indica su valor en dólares y actualízalo con el botón «✏️ Cantidad exacta».',
    savings_prompt_account_yield: 'Rentabilidad de «{name}» en porcentaje anual, por ejemplo `16` para un depósito o `0` para efectivo (hasta {max}).',
    savings_prompt_account_name: 'Nuevo nombre para «{name}»:',
    savings_account_delete_confirm: '¿Eliminar la cuenta «{name}»?',
    savings_account_deleted: '✅ Cuenta «{name}» eliminada.',
    savings_account_created: '✅ Cuenta «{name}» creada.',
    savings_account_limit: '💼 Ya tienes {limit} cuentas — es el máximo. Elimina una que no necesites para añadir otra.',
    savings_error_account: '❌ Escribe el nombre de la cuenta, por ejemplo `Efectivo USD` o `Depósito 16%`.',
    savings_error_name: '❌ El nombre debe tener de 1 a {max} caracteres.',
    savings_goal_delete_confirm: '¿Eliminar la meta «{name}»?',
    savings_goal_delete_moves: 'Los {amount} ahorrados pasarán a los ahorros generales — el dinero no se pierde.',
    savings_button_goal_delete_yes: '🗑 Sí, eliminar',
    savings_goal_deleted: '✅ Meta «{name}» eliminada.',
    savings_forecast_title: '📈 *Pronóstico de ahorros*',
    savings_now: 'Ahora: *{amount}*',
    savings_rates_not_set: '⚙️ La rentabilidad y la inflación no están configuradas — indícalas en los ajustes para un pronóstico más preciso.',
    savings_rate_yield_short: 'rentabilidad {value}%',
    savings_rate_inflation_short: 'inflación {value}%',
    savings_rate_growth_short: 'aumento del aporte {value}% al año',
    savings_forecast_need_monthly: 'Para hacer un pronóstico necesito un aporte mensual: registra tus ingresos de al menos un mes completo o fija la cantidad manualmente en los ajustes.',
    savings_horizon_6: 'En medio año',
    savings_horizon_12: 'En un año',
    savings_horizon_36: 'En 3 años',
    savings_horizon_60: 'En 5 años',
    savings_horizon_120: 'En 10 años',
    savings_forecast_simple: 'solo ahorrando: {amount}',
    savings_forecast_nominal: 'con intereses y aumento del aporte: {amount}',
    savings_forecast_real: 'en dinero de hoy: {amount}',
    savings_forecast_depleted: '⚠️ A este ritmo, los ahorros se acabarán en {duration}.',
    savings_forecast_legend: '💡 «Solo ahorrando» — sin intereses, inflación ni aumento del aporte. «En dinero de hoy» — cuánto valdría a precios actuales.',
    savings_settings_title: '⚙️ *Ajustes del pronóstico*',
    savings_setting_yield: '📈 Rentabilidad',
    savings_setting_inflation: '🔥 Inflación',
    savings_setting_growth: '⬆️ Aumento del aporte',
    savings_rate_yearly: '{value}% al año',
    savings_rate_not_set: 'no se tiene en cuenta',
    savings_settings_hint: '💡 Rentabilidad — la tasa por defecto: para nuevos aportes y cuentas sin tasa propia (la propia se fija en la ficha de la cuenta). Inflación — cuánto suben los precios (y tus metas) al año. Aumento del aporte — cuánto crece al año la cantidad que ahorras (por ejemplo, por subidas de sueldo).',
    savings_button_monthly: '📥 Aporte mensual',
    savings_button_monthly_auto: '🔄 Calcular automáticamente',
    savings_monthly_auto_set: '✅ El aporte se calcula automáticamente: ingresos menos gastos.',
    savings_prompt_monthly: '¿Cuánto ahorras al mes? Por ejemplo: `30000` ({currency}).',
    savings_prompt_inflation: 'Inflación en porcentaje anual, por ejemplo `8` o `7,5` (hasta {max}). `0` — no tener en cuenta.',
    savings_prompt_yield: 'Rentabilidad de los ahorros en porcentaje anual (interés del depósito), por ejemplo `16` (hasta {max}). `0` — no tener en cuenta.',
    savings_prompt_growth: '¿En qué porcentaje anual crece tu aporte? Por ejemplo `5` (hasta {max}). `0` — no tener en cuenta.',
    savings_monthly_set: '✅ Aporte: {amount} al mes',
    savings_setting_saved: '✅ Guardado',
    savings_error_amount: '❌ No entendí la cantidad. Escribe un número, por ejemplo `15000`.',
    savings_error_insufficient: '❌ No hay tanto: en la hucha hay {amount}.',
    savings_error_rate: '❌ Necesito un número de 0 a {max}, por ejemplo `8` o `7,5`.',
    savings_error_date: '❌ No entendí el plazo. Escribe mes y año `12.2027` o una fecha `31.12.2027` — en el futuro.',
    savings_error_goal: '❌ Escribe el importe y el nombre de la meta, por ejemplo `1 500 000 coche`.',
    savings_deposited: '✅ Añadido {amount}',
    savings_withdrawn: '✅ Retirado {amount}',
    savings_balance_set: '✅ Cantidad actualizada: {amount}',
    savings_transferred: '✅ Transferido {amount} a «{name}»',
    savings_goal_created: '✅ Meta creada. Plazo y modo — con los botones de abajo.',
    savings_goal_updated: '✅ Meta actualizada',
    savings_deadline_set: '✅ Plazo: {date}',
    savings_goal_achieved_notice: '🎉 ¡Meta «{name}» lograda!',
    savings_months: '{n} m.',
    savings_years: '{y} a.',
    savings_years_months: '{y} a. {m} m.',
    income_not_found: '❌ Ingreso no encontrado',
    income_currency_select: 'Elige la moneda en la que sueles cobrar. Los gastos se mantienen en tu moneda principal:',
    income_currency_set: '✅ Moneda de ingresos: {currency}',
    income_total: '💵 Ingresos: *{amount}*',
    balance_label: '⚖️ Balance (ingresos − gastos): *{amount}*',
    income_error_format: '❌ No lo entendí. Envía una cantidad y una descripción opcional: `50000 salario` o `1000 USD freelance`',
    income_error_amount: '❌ Cantidad no válida. Introduce un número de 0.01 a {max}.',

    // Recurring expenses
    button_recurring: '🔁 Gastos recurrentes',
    button_add_recurring: '➕ Añadir gasto recurrente',
    recurring_menu_title: '🔁 *Gastos recurrentes*',
    recurring_menu_info: 'Los pagos mensuales (alquiler, suscripciones, préstamos) se registran automáticamente como gastos el día del mes elegido.',
    recurring_menu_empty: 'Aún no hay gastos recurrentes.',
    recurring_item: '{icon} {description} — *{amount}*, el día {day} de cada mes\n    Próximo registro: {next}',
    recurring_monthly_total: 'Total al mes: *{amount}*',
    recurring_enter_prompt: 'Introduce la cantidad y la descripción del gasto recurrente 👇\n\nEjemplo: `50000 alquiler`\nPuedes indicar una moneda después de la cantidad: `500 USD alquiler`',
    recurring_day_prompt: '¿Qué día de cada mes debo registrar este gasto? Introduce un número del 1 al 31.\n\nSi un mes es más corto, lo registraré el último día del mes.',
    recurring_day_invalid: '❌ Introduce un número entero del 1 al 31.',
    recurring_select_category: 'Elige una categoría para el gasto recurrente:',
    recurring_added: '✅ Gasto recurrente añadido\n\n{description} — *{amount}*, el día {day} de cada mes\nPrimer registro: {next}',
    recurring_added_charged_now: '✅ Gasto recurrente añadido y ya registrado este mes\n\n{description} — *{amount}*, el día {day} de cada mes\nPróximo registro: {next}',
    recurring_deleted: '✅ Gasto recurrente eliminado. Los gastos ya registrados permanecen en el historial.',
    recurring_not_found: '❌ Gasto recurrente no encontrado',
    recurring_limit: '❌ Puedes tener como máximo {max} gastos recurrentes',
    recurring_charged_notification: '🔁 Gasto recurrente registrado: {icon} {description} — *{amount}*',
    recurring_error_format: '❌ Formato no reconocido. Envía una cantidad y una descripción: `50000 alquiler` o `500 USD alquiler`',
    recurring_error_amount: '❌ Cantidad no válida. Introduce un número de 0.01 a {max}.',

    // Main menu and «More»
    button_overview: '📊 Resumen del mes',
    button_today: '📅 Hoy',
    button_more: '☰ Más',
    more_menu_title: '☰ *Más*',
    button_export: '📤 Exportar CSV',
    keyboard_refreshed: '✅ El menú se actualizó — ahora es más compacto 👇',
    button_outdated: 'Este botón está obsoleto. Abre la sección de nuevo desde el menú de abajo.',
    overview_title: 'Resumen: {range}',
    overview_spent: '💸 Gastos: *{amount}* · registros: {count}',
    overview_upcoming: 'Próximos recurrentes:',
    overview_income_hint: '💡 Registra ingresos con un más: `+50000 salario`',
    button_prev_period: '◀️ Antes',
    button_next_period: 'Después ▶️',
    button_back_to_overview: '⬅️ Al resumen',
    day_title_today: 'Hoy, {date}',
    day_title_yesterday: 'Ayer, {date}',
    day_title: '{date}',
    day_entry_hint: 'Envía un gasto como mensaje: `250 café`',
    button_prev_day: '◀️ Día anterior',
    button_next_day: 'Día siguiente ▶️',
    list_tap_number: 'Toca un número para abrir el registro.',
    family_today_title: 'Familia: registros de hoy',
    button_undo: '↩️ Deshacer',
    button_delete_record: '🗑 Eliminar',
    button_change_category: '🏷 Categoría',
    button_edit_record: '✏️ Editar',
    expense_family_label: 'en el presupuesto familiar',
    expense_recurring_label: 'registrado automáticamente (gasto recurrente)',
    expense_category_remembered: '🏷 La categoría se tomó de tu registro anterior con la misma descripción — cámbiala con el botón de abajo.',
    category_will_be_remembered: '💡 Recordaré tu elección: la próxima vez un registro así irá directamente a esta categoría.',
    expense_category_changed: 'Categoría: {category}',
    settings_header: 'Ajustes',
    settings_currency_line: '💱 Moneda: *{currency}* · ingresos: *{incomeCurrency}*',
    settings_timezone_line: '🌍 Zona horaria: {timezone}',
    settings_language_line: '🌐 Idioma: {language}',
    settings_period_line: '📅 El periodo empieza el día {day}',
    settings_reminders_on_line: '🔔 Recordatorios: activados ({hours})',
    settings_reminders_off_line: '🔔 Recordatorios: desactivados',
    button_currencies: '💱 Monedas',
    settings_currencies_text: '💱 *Monedas*\n\nPrincipal — los gastos y todos los totales se calculan en ella: *{currency}*\nMoneda de ingresos por defecto: *{incomeCurrency}*\n\nCualquier registro puede estar en otra moneda — pon el código después de la cantidad: `20 USD taxi`.',
    reminders_title: 'Recordatorios',
    reminders_info: 'Si no has registrado nada a la hora elegida, te lo recordaré. Como máximo 3 veces al día.',
    button_reminders_on: '🟢 Activado — toca para desactivar',
    button_reminders_off: '⚫ Desactivado — toca para activar',
    family_teaser: '👨‍👩‍👧‍👦 *Presupuesto familiar*\n\nGastos compartidos con tus seres queridos en un solo lugar: cada uno registra los suyos, las estadísticas y la exportación son comunes.\n\nDisponible con premium.',
    button_premium: '⭐️ Premium',

    // Subscription and premium ending
    subscription_active_info: '🔁 La suscripción mensual está pagada hasta el {date} y se renueva automáticamente. Para cancelarla: Telegram → Ajustes → Mis estrellas → Mis suscripciones.',
    subscription_renewed: '🔁 Suscripción renovada. Premium activo hasta el {date}.',
    button_view_tariffs: '⭐️ Planes',
    premium_expiring_trial: '⏳ Tu prueba premium termina el {date}.\n\nDespués dejarán de funcionar los presupuestos, el resumen completo del periodo, las categorías propias, el presupuesto familiar y la edición de registros. Todo lo que registraste se conserva y el registro de gastos es gratis.',
    premium_expiring_paid: '⏳ Premium termina el {date}. Puedes renovarlo por adelantado: los días restantes se conservan.',
    premium_expired_trial: '🌙 Tu prueba premium ha terminado. Registrar gastos e ingresos sigue siendo gratis; los presupuestos, el resumen completo, las categorías propias, la familia y la edición de registros vienen con premium.',
    premium_expired_paid: '🌙 Premium ha terminado. ¡Gracias por apoyar el proyecto! Puedes renovarlo cuando quieras.',
    premium_winback: '👋 Tu premium terminó hace una semana. Si quieres recuperar los presupuestos, el resumen completo, las categorías propias, el presupuesto familiar y la edición de registros, mira los planes abajo.',
    start_reminders_note: '🔔 Si no registras nada durante el día, te lo recordaré (hasta 3 veces al día). Cambiar horas o desactivar: ☰ Más → ⚙️ Ajustes → 🔔.',

    // Budgets
    button_budgets: '🎯 Presupuestos',
    budgets_title: 'Presupuestos',
    budgets_empty: 'Fija un límite para todo el mes o para una categoría: te avisaré al 80 % y cuando se supere el límite.',
    budgets_teaser: '🎯 *Presupuestos*\n\nUn límite para el mes o para una categoría: el progreso se muestra en el resumen y recibes un aviso al 80 % y cuando se supera el límite.\n\nDisponible con premium.',
    button_budget_total: '➕ Todo el mes',
    button_budget_category: '➕ Categoría',
    button_budget_change: '✏️ Cambiar importe',
    budget_total_name: '🎯 Todo el mes',
    budget_left: 'quedan {amount}',
    budget_over: 'superado en {amount}',
    budget_enter_prompt: 'Introduce el límite del periodo para «{name}» 👇\n\nPor ejemplo: `10000` (en *{currency}*) o `150 USD`',
    budget_amount_invalid: '❌ Solo hace falta un importe: `10000` o `150 USD`.',
    budget_saved: '✅ Presupuesto guardado',
    budget_deleted: '✅ Presupuesto eliminado',
    budget_not_found: '❌ Presupuesto no encontrado',
    budget_warning_80: '⚠️ {name}: gastado {spent} de {limit} ({percent} %)',
    budget_warning_100: '🚨 {name}: presupuesto superado — {spent} de {limit} ({percent} %)',
    overview_budget_of: 'del presupuesto de {amount}',

    // Period summary
    button_report: '📄 Resumen',
    report_title: 'Resumen: {range}',
    report_vs_previous: 'Frente al periodo anterior: {change} (antes {amount})',
    report_change_new: 'nuevo',
    report_change_same: 'sin cambios',
    report_top_categories: 'Mayores gastos:',
    report_locked: '🔒 El desglose completo — cada categoría frente al periodo anterior, presupuestos, gasto medio por día y el mayor gasto — viene con premium.',
    report_categories_vs_previous: 'Categorías (frente al periodo anterior):',
    report_categories_gone: 'Sin gastos esta vez: {list}',
    report_more_numbers: 'Más cifras:',
    report_per_day: '📅 Media por día: {amount}',
    report_largest: '🔝 Mayor gasto: {amount} — {description} ({date})',
    overview_budget_limit: 'límite {amount}',
    report_title_current: 'Resumen hasta hoy: {range}',
    input_canceled: '✅ Cancelado. Puedes registrar gastos como siempre.',
    no_active_state: 'Ahora no hay nada que cancelar.',
    daily_summary_title: 'Resumen del día',
    daily_summary_info: 'Resumen diario: por la noche te enviaré cuánto gastaste hoy y en qué. Solo los días con gastos.',
    daily_summary_enabled: '✅ Resumen diario activado',
    daily_summary_disabled: '⚫ Resumen diario desactivado',
    daily_summary_hour_info: 'Elige la hora local para el resumen diario:',
    daily_summary_hour_set: 'Hora del resumen guardada',
    button_daily_summary_on: '🗓 Resumen: sí',
    button_daily_summary_off: '🗓 Resumen: no',
    settings_daily_summary_on_line: '🗓 Resumen diario: a las {time}',
    settings_daily_summary_off_line: '🗓 Resumen diario: desactivado',
    weekly_insight_info: 'Resumen semanal: los lunes a las 10:00 — cuánto gastaste la semana pasada comparado con lo habitual, qué categorías crecieron y tu ritmo en el periodo actual.',
    settings_weekly_insight_on_line: '📈 Resumen semanal: los lunes a las 10:00',
    settings_weekly_insight_off_line: '📈 Resumen semanal: desactivado',
    button_weekly_insight_on: '📈 Semana: sí',
    button_weekly_insight_off: '📈 Semana: no',
    button_weekly_insight_now: '👀 Mostrar ahora',
    button_weekly_insight_overview: '📊 Resumen',
    button_weekly_insight_disable: '🔕 Desactivar resumen semanal',
    weekly_insight_enabled: '✅ Resumen semanal activado',
    weekly_insight_disabled: '⚫ Resumen semanal desactivado',
    weekly_insight_turned_off: '🔕 Resumen semanal desactivado. Para activarlo de nuevo: Ajustes → Recordatorios.',
    weekly_insight_no_data: 'No hay gastos en las últimas 5 semanas — todavía no hay nada que resumir.',
    weekly_insight_title: 'Semana {range}',
    weekly_insight_spent: 'Gastado esta semana: *{amount}*',
    weekly_insight_no_history: 'Aún hay poco historial — la comparación con semanas habituales aparecerá en un par de semanas.',
    weekly_insight_same: '≈ Como siempre (media de las últimas {weeks} semanas: {amount})',
    weekly_insight_more: '↑ {percent}% más de lo habitual: +{amount} frente a la media de {weeks} semanas',
    weekly_insight_less: '↓ {percent}% menos de lo habitual: −{amount} frente a la media de {weeks} semanas',
    weekly_insight_overspend: '📈 Lo que más creció: {category} (+{amount})',
    weekly_insight_improvement: '👍 Menos de lo habitual: {category} (−{amount})',
    weekly_insight_period: 'Periodo {range}',
    weekly_insight_period_spent: 'Gastado: {amount} en {days} de {total} días',
    weekly_insight_projection: 'A este ritmo al final del periodo: *≈{amount}*',
    weekly_insight_projection_vs: 'A este ritmo al final del periodo: *≈{amount}* (anterior — {previous}, {change})',
    weekly_insight_budget_ok: '🎯 Presupuesto {limit}: vas bien, margen ≈{amount}',
    weekly_insight_budget_over: '🚨 Presupuesto {limit}: a este ritmo lo superarás en ≈{amount}',
    export_title: '📤 Exportar a CSV\n\nElige el periodo del archivo.',
    export_categories_all: '🗂 Categorías: todas',
    export_categories_selected: '🗂 Categorías: {categories}',
    export_period_day: '📅 Hoy',
    export_period_week: '📅 Últimos 7 días',
    export_period_current: '📅 Periodo actual',
    export_period_previous: '📅 Periodo anterior',
    export_period_all: '♾ Todo el tiempo',
    export_period_range: '🗓 Elegir fechas…',
    export_filter_categories: '🔽 Filtrar por categorías',
    export_select_categories: 'Elige las categorías para exportar:',
    export_select_all: '✅ Seleccionar todo',
    export_deselect_all: '❌ Deseleccionar todo',
    export_done: '✅ Listo',
    export_no_categories: 'Elige al menos una categoría',
    export_enter_dates: '🗓 Escribe un rango de fechas:\n`01.03.2026 - 15.03.2026`\n\no una sola fecha: `01.03.2026`',
    export_dates_invalid: '❌ No pude leer las fechas. Escríbelas así: `01.03.2026 - 15.03.2026` o una sola fecha `01.03.2026`.',
    export_dates_order: '❌ La fecha de inicio es posterior a la de fin. Ejemplo: `01.03.2026 - 15.03.2026`.',
    total_by_categories: 'Total por categorías:',
    bot_short_description: 'Registra gastos en un par de toques: escribe "250 café". Ingresos, presupuestos, resumen mensual, presupuesto familiar.',
    bot_description: 'Registro de gastos e ingresos directamente en Telegram.\n\nEscribe "250 café" — el gasto se guarda y la categoría se recuerda.\n\n• Resumen del mes por categorías y comparación con el mes anterior\n• Ingresos y saldo: "+50000 sueldo"\n• Gastos recurrentes: el alquiler y las suscripciones se registran solos\n• Presupuestos con avisos, resumen diario, recordatorios\n• Presupuesto familiar, varias monedas, exportar a CSV\n\nLo básico es gratis. Los nuevos usuarios reciben 14 días de premium.',
    command_start: 'Menú principal',
    command_stats: 'Resumen del mes',
    command_history: 'Registros de hoy',
    command_income: 'Ingresos y saldo',
    command_recurring: 'Gastos recurrentes',
    command_export: 'Exportar a CSV',
    command_family: 'Presupuesto familiar',
    command_settings: 'Ajustes',
    command_limits: 'Suscripción y premium',
    command_help: 'Ayuda',
    command_cancel: 'Cancelar entrada',
    command_paysupport: 'Soporte de pagos',
    command_terms: 'Términos del servicio',
    command_privacy: 'Política de privacidad',
    payment_outdated: '⚠️ Esta factura está desactualizada: el precio ha cambiado. Abre los planes de nuevo — /limits',
    security_validation_error: '⚠️ No se pudo procesar la solicitud. Inténtalo de nuevo o abre el menú con /start.',
    expense_draft_outdated: '⌛ Este borrador está desactualizado. Envía el gasto de nuevo.',
    family_invitation_hours_left: '⏰ Quedan {hours} h',
    family_no_members: 'No hay miembros',
    family_already_member: '❌ Ya estás en una familia.',
    admin_bug_reports_all_title: '📝 Todos los reportes de errores (últimos {count})',
    admin_bug_reports_new_title: '🆕 Reportes de errores nuevos (últimos {count})',
    admin_bug_reports_empty: 'No hay reportes.',
    payment_subscription_already_active: '🔁 Ya tienes una suscripción mensual activa, no necesitas otra. Para ampliar premium por adelantado, elige un plan de pago único: /limits',
    payment_foreign_payer: '⚠️ Este enlace de pago se creó para otro usuario. Abre tú los planes en el bot — /limits',
    premium_expired_granted: '🌙 Tu premium ha terminado. Registrar gastos e ingresos sigue siendo gratis; los presupuestos, el resumen completo, las categorías propias, la familia y la edición de registros vienen con premium. Puedes renovarlo cuando quieras.'
};
