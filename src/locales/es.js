module.exports = {
    button_reminders: '🔔 Recordarme',
    reminders_enabled: 'Recordatorios activados. Si no registras nada antes de las 18:00, te lo recordaré con humor 😉',
    reminders_disabled: 'Recordatorios desactivados. Silencio total 🤐',
    reminder_sample_variants: [
      '¡Eh! Que tu cartera esté callada no significa que esté feliz. Registra tus gastos 😉',
      '¿Ya gastaste algo hoy? Anótalo antes de que la memoria se vaya a por pan 🧠🥖',
      'Si no lo registras, es como si lo hubieras gastado en el vacío. Vamos a anotarlo 💸',
      'Gota a gota el presupuesto se va al mar. Registra los gastos de hoy 🌊',
      'El bot no regaña, el bot recuerda: es hora de registrar gastos 😌'
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
    start_message: `¡Hola! 👋 Te ayudaré a llevar el control de tus gastos y presupuesto.
  
  *Cómo añadir un gasto:*
  Simplemente escribe la cantidad y la descripción:
  -  \`200 compras en supermercado\`
  -  \`1500 comida en restaurante\`
  -  \`50 transporte\`
  -  \`150,50 café\`
  
  Después aparecerá un menú con categorías - selecciona la adecuada 🏷️
  
  *Comandos principales:*
  /start - reiniciar el bot
  /menu - abrir menú interactivo
  /history - últimos registros del día
  /stats - estadísticas por categoría
  
  /export - descargar datos en CSV
  /undo - cancelar último registro
  
  *Ajustes:*
  /settings - abrir ajustes
  /currency - moneda base
  /timezone - zona horaria
  /categories - gestionar categorías
  
  *Funciones extra:*
  /family - presupuesto familiar
  /limits - límites y funciones premium
  /help - ayuda detallada
  
  ¡Empieza a registrar tus gastos! 💰`,
  help_message: `📋 *Ayuda detallada de comandos*
  
  *Agregar gastos:*
  Escribe cantidad y descripción separados por un espacio:
  \`200 compras\` - aparecerá un menú de categorías
  \`150,50 café\` - se admiten decimales
  
  *Comandos principales:*
  /start - reinicia el bot y muestra el mensaje de bienvenida
  /menu - abre el menú interactivo con todas las funciones
  /history - muestra los registros de hoy
  /stats - estadísticas detalladas del mes por categorías
  
  /export - descarga todos los datos en formato CSV
  /undo - elimina el último registro añadido
  
  *Ajustes y gestión:*
  /settings - abre el menú principal de ajustes
  /currency - cambia la moneda base (RUB, USD, EUR, KZT, CNY, THB)
  /timezone - ajusta la zona horaria para un registro correcto
  /categories - gestionar categorías personalizadas (premium)
  
  *Presupuesto familiar:*
  /family - gestionar grupos familiares y gastos compartidos
  - Crear familia, invitar miembros
  - Gastos y estadísticas comunes
  - Exportar datos familiares
  
  *Funciones Premium:*
  /limits - información sobre límites y premium
  - Categorías personalizadas
  - Estadísticas avanzadas
  - Presupuesto familiar
  - Soporte prioritario
  
  *Consejos de uso:*
  • Usa descripciones para mayor claridad
  • Revisa estadísticas con /stats
  • Ajusta la zona horaria
  • Usa /menu para acceder rápido
  • Exporta datos con /export
  
  *Edición de gastos:*
  • En /history puedes borrar o editar registros
  • Botón "👨‍👩‍👧‍👦 A familia" mueve gasto a presupuesto familiar
  • Botón "🚫 Del presupuesto familiar" lo devuelve a personal
  • Solo puedes editar/eliminar tus gastos
  
  *Recordatorios:*
  • El bot recuerda registrar gastos a las 18:00 hora local
  • Solo si no registraste gastos ese día
  • Se pueden activar/desactivar en ajustes
  • Máximo un recordatorio por día
  
  *Soporte:*
  Usa /start para volver al menú principal si tienes dudas.
  
  ¡Feliz control de gastos! 💰📊`,
  
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
    family_info: '👨‍👩‍👧‍👦 *Presupuesto familiar*\n\nAquí puedes gestionar gastos familiares con tus seres queridos.',
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
    records_usage: '<b>Registros:</b> {current}/{max} ({percentage}%)',
    records_remaining: '<b>Restante:</b> {remaining} registros',
    max_description_length: '<b>Longitud máxima de descripción:</b> {length} caracteres',
    near_limit_warning: '⚠️ *Atención:* Estás cerca del límite de registros.',
    limit_reached: '❌ *Límite de registros alcanzado!*',
    premium_benefits: `💎 <b>Ventajas premium:</b>
  • 160 caracteres en descripción (en vez de 80)
  • 300 registros (en vez de 100)
  • Hasta 5 categorías propias
  • Estadísticas avanzadas
  • Presupuesto familiar
  • Editar y borrar gastos (no solo el último)`,
    
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
    premium_payment_info: '💳 El pago se hace con Telegram Stars, la moneda interna de Telegram. <b>Sin renovación automática.</b>',
    premium_renewal_info: '📅 Puedes renovar en cualquier momento. Se añadirá a tu tiempo restante.',
    premium_stars_info: '💡 Compra estrellas sin comisión en el bot oficial [@PremiumBot].',
    premium_why_paid_title: '👀 ¿Por qué es de pago?',
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
    error_format: '❌ Formato no válido. Escribe cantidad y descripción.\nEj: `200 compras` o `1500 comida en café`',
    error_limit_reached: '❌ Límite alcanzado!\nNormales: 100 registros\nPremium: 300 registros\n\n💎 Pásate a premium para aumentarlo.',
    error_premium_required: '💎 Solo con premium!\n\nVentajas:\n• 160 caracteres descripción\n• 300 registros\n• Categorías personalizadas\n• Estadísticas avanzadas',
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
    callback_limit_reached: '❌ Límite de registros alcanzado',
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
    custom_categories_premium_required: '💎 Solo para usuarios premium.'
};
