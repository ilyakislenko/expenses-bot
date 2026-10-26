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
    reminder_turn_on_off: (enabled) => enabled ? 'Desactivar recordatorios' : 'Activar recordatorios',
    button_configure_reminder_hours: '⏰ Configurar horas de recordatorio',
    reminder_hours_info: 'Selecciona hasta 3 horas para recordatorios (tu zona horaria local). Actuales:',
    reminder_hours_limit: 'Puedes seleccionar hasta 3 horas',
    reminder_hours_saved: '✅ Horas de recordatorio guardadas',
    button_save: 'Guardar',
    button_clear: 'Limpiar',
    
    // Soporte de pagos y políticas
    paysupport_message: '*Soporte de pagos*\n\nEmpresa: {businessName}\nSoporte: @{supportUsername} / {supportEmail}\n\nTérminos: {termsUrl}\nPrivacidad: {privacyUrl}\nReembolsos: {refundPolicyUrl}\n\nPara pagos con Stars y reembolsos, contacta primero con soporte. Cumplimos las políticas de Telegram Stars.',
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
    security_validation_error: '⚠️ *Error de validación*\n\n{message}',
    security_error: '❌ *Error de seguridad*\n\nInténtalo más tarde o contacta a un administrador.',
    
    // Panel admin
    button_admin: '👑 Panel de administración',
    admin_access_denied: '❌ No tienes permisos de administrador.',
    admin_panel_title: '👑 *Panel de administrador*\n\nSelecciona una acción:',
    admin_error: '❌ Error al ejecutar la acción como administrador.',
    
    // Estadísticas admin
    admin_stats_text: `📊 *Estadísticas del bot*
  
  👥 **Usuarios:**
  • Total: {totalUsers}
  • Premium: {activePremium}
  • Nuevos esta semana: {newUsersWeek}
  • Nuevos este mes: {newUsersMonth}
  
  💰 **Gastos:**
  • Registros totales: {totalExpenses}
  • Esta semana: {expensesWeek}
  • Usuarios activos: {activeUsers}
  
  🐛 **Reportes de errores:** {totalBugReports}
  
  💎 **Donaciones:**
  • Total: {totalDonations}
  • Estrellas reunidas: {totalStars}
  
  ⭐ **Transacciones premium:** {premiumTransactions}`,
  
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
  
  📊 **Resumen:**
  • Donaciones totales: {totalDonations}
  • Completadas: {completedDonations}
  • Pendientes: {pendingDonations}
  
  ⭐ **Estrellas:**
  • Total recolectado: {totalStars}
  • Promedio por donación: {avgStars} estrellas`,
  
    // Premium admin 
    admin_premium_stats: `⭐ *Estadísticas premium*
  
  📊 **Usuarios:**
  • Total premium: {totalPremiumUsers}
  • Activos ahora: {activePremiumUsers}
  
  💳 **Transacciones:**
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
  
  {adminFlag}{premiumFlag} **{firstName}** (@{username})
  🆔 ID: {userId}
  🌐 Idioma: {language}
  💱 Moneda: {currency}
  🕐 Zona horaria: {timezone}
  📅 Registro: {createdAt}
  
  📊 **Estadísticas:**
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
    admin_broadcast_confirm: '📢 *Confirmar envío de difusión*\n\n📝 **Texto:**\n{message}\n\n📏 **Longitud:** {length} caracteres\n\n⚠️ Este mensaje será enviado a **TODOS** los usuarios del bot!',
    admin_broadcast_started: '📢 Difusión iniciada...',
    admin_broadcast_result: '📢 *Difusión completada!*\n\n📊 **Estadísticas:**\n• Total usuarios: {total}\n• Enviado: {sent}\n• Errores: {failed}',
    admin_broadcast_header: '🔴🔴🔴 *¡Notificación!* 🔴🔴🔴',
    
    // General
    welcome: '¡Hola, {name}! 👋',
    main_menu_title: '🏠 *Menú principal*\n\nSeleccione una acción:',
    error: 'Ocurrió un error 😞',
    unknown_error: 'Error inesperado. Inténtalo de nuevo más tarde.',
    not_found: 'No encontrado',
    error_invalid_description_format: '❌ Formato inválido. Usa: cantidad descripción o cantidad categoría descripción',
    expense_save_error: '❌ Error al guardar el gasto. Inténtalo de nuevo.',
    cancel: 'Cancelar',
    back: 'Atrás',
    confirm: 'Confirmar',
    save: 'Guardar',
    
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
• Monedas, recordatorios (hasta 3 al día) e inicio del periodo — en ☰ Más → ⚙️ Ajustes

Comandos: /stats /history /income /recurring /export /settings /menu`,
  
    // Gastos
    expense_added: '✅ Registrado: {amount} - {description}',
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
    no_expenses_category: 'No hay gastos en esta categoría en el último mes.',
    
    // Categorías
    select_category: 'Elige una categoría:',
    amount_label: 'Cantidad',
    description_label: 'Descripción',
    category_label: 'Categoría',
    expense_added_title: '¡Gasto añadido!',
    no_categories: 'No se encontraron categorías.',
    category_expenses: 'Gastos en la categoría "{category}"',
    no_category_expenses: 'No hay gastos en esta categoría en el último mes.',
    
    // Ajustes
    settings_title: 'Ajustes:',
    currency_select: 'Selecciona la moneda por defecto:',
    currency_set: 'Moneda establecida: {currency}',
    currency_updated: 'Moneda cambiada a {currency}',
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
    button_family: '👨‍👩‍👧‍👦 Familia',
    // Family labels
    family_label: '🏠 *Familia:*',
    family_owner_label: '👑 *Propietario:*',
    family_info: '👨‍👩‍👧‍👦 Presupuesto familiar\n\nAquí puedes gestionar los gastos junto con familiares, colegas, amigos, etc.\n\n- \uD83D\uDC6A Se crea un grupo compartido para llevar el registro de los gastos conjuntos.\n- \u2795 Cada miembro puede agregar gastos.\n- \uD83D\uDDD1\uFE0F Puedes eliminar tus propios gastos si es necesario.\n- \uD83D\uDCCA Hay estadísticas compartidas disponibles para todos los miembros.\n- \uD83D\uDCE4 Exporta los datos de todo el grupo en un solo archivo.\n\nEl control compartido significa menos caos y más transparencia.',
    family_created: '✅ Familia "{name}" creada. Ahora puedes invitar miembros.',
    family_joined: '✅ Te uniste a la familia "{name}"!',
    family_left: '✅ Has salido de la familia "{name}".',
    family_deleted: '✅ Familia "{name}" eliminada. Todos los gastos se han vuelto personales.',
    family_member_removed: '✅ Miembro eliminado de la familia.',
    family_member_removed_notification: '❌ Has sido eliminado de la familia *{familyName}*.',
    family_cannot_leave_owner: '❌ El propietario no puede salir de la familia. Usa "Eliminar familia".',
    
    // Botones del menú familiar
    create_family: '🏠 Crear familia',
    join_family: '🔗 Unirse a familia',
    invite_member: '➕ Invitar miembro',
    leave_family: '🚪 Salir de la familia',
    delete_family: '🗑️ Eliminar familia',
    family_members: '👥 Miembros de la familia',
    family_stats: '💰 Gastos del mes',
    family_daily_stats: '💰 Gastos del día',
    family_add_expense: '💰 Añadir gasto familiar',
    family_menu: '👨‍👩‍👧‍👦 Menú familiar',
    family_cancel: '❌ Cancelar',
    
    // Invitaciones
    invitation_sent: '✅ Invitación enviada a @{username}',
    invitation_accepted: '✅ Has aceptado unirte a la familia "{name}"!',
    invitation_rejected: '❌ Has rechazado la invitación a la familia "{name}".',
    invitation_not_found: '❌ Invitación no encontrada o expirada.',
    invitation_expired: '❌ Invitación expirada.',
    invitation_already_processed: '❌ Invitación ya procesada.',
    
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
    family_invitation_received: '🎉 Te invitan a la familia *{familyName}*\n\n👤 Invitado por: {inviterName}\n🔑 Código: `{inviteCode}`\n\nElige una acción:',
    accept_invitation: '✅ Aceptar',
    reject_invitation: '❌ Rechazar',
    invitation_accepted: '🎉 ¡Te has unido a la familia *{familyName}*!',
    invitation_rejected: '❌ Has rechazado la invitación a la familia',
    invitation_not_pending: '❌ La invitación no está pendiente',
    invitation_cancelled_notification: '❌ La invitación a la familia *{familyName}* fue cancelada por {cancelledBy}',
    enter_invite_code: '🔑 Introduce el código de invitación:',
    only_owner_can_remove: '❌ Solo el propietario puede eliminar miembros.',
    only_owner_can_delete: '❌ Solo el propietario puede eliminar la familia.',
    cannot_remove_owner: '❌ No se puede eliminar al propietario.',
    cannot_remove_yourself: '❌ No puedes eliminarte a ti mismo.',
    family_not_found: '❌ Familia no encontrada.',
    not_family_member: '❌ No eres miembro de la familia.',
    not_family_owner: '❌ No eres el propietario de la familia.',
    
    // Confirmaciones
    confirm_delete_family: '⚠️ *Eliminar familia*\n\nTodos los miembros serán eliminados y los gastos volverán a ser personales.\n\n¿Estás seguro?',
    confirm_remove_member: '⚠️ *Eliminar miembro*\n\nEl miembro será eliminado de la familia.\n\n¿Seguro?',
    // Estadísticas familia
    family_monthly_stats: '👨‍👩‍👧‍👦 *Gastos familiares del mes*',
    family_daily_stats: '💰 Gastos del día',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *Gastos familiares del día*',
    family_export: '📊 Exportar datos familiares',
    family_total_spent: 'Gastado: *{amount}*',
    family_members_count: 'Miembros: {count}',
    family_no_expenses: 'No hay gastos familiares en este período.',
    
    // Lista de miembros
    family_members_title: '👥 *Miembros de la familia*',
    family_member_info: '• {name} ({role}) - se unió el {date}',
    family_owner_role: 'propietario',
    family_member_role: 'miembro',
    remove_member: '❌ Eliminar',
    confirm_remove_member: '⚠️ *Eliminar miembro*\n\n¿Seguro que deseas eliminar a {name} de la familia?',
    member_removed: '✅ {name} fue eliminado de la familia.',
    member_removed_notification: '❌ Has sido eliminado de la familia *{familyName}* por {ownerName}.',
    
    // Funciones premium
    premium_required: '❌ Esta función es solo para usuarios premium.',
    upgrade_to_premium: '💎 ¡Actualiza a premium para gestionar un presupuesto familiar!',
    
    timezone_updated: `✅ *Zona horaria actualizada!*
  
  🕐 Hora elegida: *{time}*
  🌍 Zona horaria: *{timezone}*
  
  Tus gastos se mostrarán en hora local.`,
    timezone_updated_simple: `✅ *Zona horaria actualizada!*
  
  🌍 Nueva zona horaria: *{timezone}*
  
  Tus gastos ahora se muestran correctamente en tu hora local.`,
    
    // Límites
    limits_title: '📊 *Información de límites*',
    status_regular: '👤 Estándar',
    status_premium: '💎 Premium',
    status_label: '*Estado:* {status}',
    max_description_length: '<b>Longitud máxima de descripción:</b> {length} caracteres',
    premium_benefits: `💎 <b>Ventajas premium:</b>
  • 160 caracteres en descripción (en vez de 80)
  • Hasta 5 categorías propias
  • Presupuesto familiar
  • Editar el importe y la descripción de cualquier registro

  Registrar gastos e ingresos es gratis e ilimitado.`,
    
    // Suscripción premium
    premium_subscription_title: '⭐️ Suscripción',
    premium_status_header: '<b>Tu estado:</b>',
    premium_privileges: 'Privilegios: {status}',
    premium_limits_info: 'Aquí verás tus límites: número de categorías, gastos, funciones familiares, duración premium actual.',
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
    purchases_page_indicator: 'Página {page}/{total}',
    premium_why_paid_text: 'Mantener el servidor cuesta unos $200 mensuales, sin contar el aumento de usuarios. Y yo como desarrollador también necesito comer para seguir creando funciones :)',
    premium_payment_title: '💳 *Pago de suscripción premium*',
    premium_payment_description: 'Has elegido: <b>{duration}</b>\nCoste: <b>{stars} ⭐️</b>\n\nHaz clic abajo para pagar con Telegram Stars.',
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
    donate_paid: '🙏 Gracias por tu apoyo. Donación recibida: {stars} ⭐️',
    
    // Errores de validación
    error_too_long_regular: '❌ Descripción demasiado larga! Máx. 80 caracteres para usuarios normales.',
    error_too_long_premium: '❌ Descripción demasiado larga! Máx. 160 caracteres para premium.',
    error_no_description: '❌ Debes poner una descripción tras la cantidad.',
    error_amount: '❌ Cantidad inválida. Introduce entre 0.01 y 999999.',
    error_format: '❌ No lo entendí. Empieza con una cantidad: `250 café`, `20 USD taxi` o solo `300`.',
    error_forbidden_content: '❌ Contenido no permitido.',
    error_premium_required: '💎 Esta función solo está disponible con premium.\n\nPremium te da:\n• 160 caracteres en la descripción (en vez de 80)\n• Categorías personalizadas\n• Presupuesto familiar\n• Editar registros',
    error_generic: '❌ Error. Intenta más tarde o contacta con admin.',
    
    // Botones
    button_menu: '📋 Menú',
    button_expenses_month: '💰 Gastos del mes',
    button_expenses_day: '💰 Gastos del día',
    button_expenses_categories: '💰 Gastos por categoría',
    button_family: '👨‍👩‍👧‍👦 Familia',
    button_settings: '⚙️ Ajustes',
    button_delete_last: '🗑️ Eliminar último gasto',
    button_limits: '📊 Límites',
    button_help: '❓ Ayuda',
    button_edit: 'Editar',
    button_delete: 'Eliminar',
    button_mark_as_family: '👨‍👩‍👧‍👦 A familia',
    button_remove_from_family: '🚫 Quitar de presupuesto familiar',
    expense_already_family: '❌ Este gasto ya es familiar',
    expense_converted_to_family: '✅ Gasto movido a presupuesto familiar',
    expense_removed_from_family: '✅ Gasto quitado de presupuesto familiar',
    not_owner: '❌ No eres el autor de este gasto',
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
    callback_button_not_found: '❌ Error: botón no encontrado',
    callback_data_not_found: '❌ Error: datos no encontrados',
    callback_expense_added: '✅ Añadido a categoría "{category}"',
    callback_expense_saved: '❌ Error al guardar',
    callback_canceled: '❌ Cancelado',
    callback_expense_canceled: '❌ Añadido de gasto cancelado',
    callback_deleted: 'Registro eliminado!',
    callback_delete_error: 'Error al borrar o registro no encontrado',
    callback_edit_mode: 'Salir del modo edición:',
    callback_no_cards: 'No hay registros... ocurrió un error',
    
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
    button_try_premium: '⭐️ Probar premium',

    // Subscription and premium ending
    subscription_active_info: '🔁 La suscripción mensual está pagada hasta el {date} y se renueva automáticamente. Para cancelarla: Telegram → Ajustes → Mis estrellas → Mis suscripciones.',
    subscription_renewed: '🔁 Suscripción renovada. Premium activo hasta el {date}.',
    button_view_tariffs: '⭐️ Planes',
    premium_expiring_trial: '⏳ Tu prueba premium termina el {date}.\n\nDespués dejarán de funcionar las categorías propias, el presupuesto familiar y la edición de registros. Todo lo que registraste se conserva y el registro de gastos es gratis.',
    premium_expiring_paid: '⏳ Premium termina el {date}. Puedes renovarlo por adelantado: los días restantes se conservan.',
    premium_expired_trial: '🌙 Tu prueba premium ha terminado. Registrar gastos e ingresos sigue siendo gratis; las categorías propias, la familia y la edición de registros vienen con premium.',
    premium_expired_paid: '🌙 Premium ha terminado. ¡Gracias por apoyar el proyecto! Puedes renovarlo cuando quieras.',
    premium_winback: '👋 Tu premium terminó hace una semana. Si quieres recuperar las categorías propias, el presupuesto familiar y la edición de registros, mira los planes abajo.',
    start_reminders_note: '🔔 Si no registras nada durante el día, te lo recordaré (hasta 3 veces al día). Cambiar horas o desactivar: ☰ Más → ⚙️ Ajustes → 🔔.'
};
