module.exports = {
    button_reminders: '🔔 提醒我',
    reminders_enabled: '提醒已开启。如果你在18:00前没有记录任何内容，我会用点幽默来提醒你 😉',
    reminders_disabled: '提醒已关闭。完全静音 🤐',
    reminder_sample_variants: [
      '👋 嘿！就算钱包很安静，也不代表它开心。记录一下花销吧 😉',
'🤔 今天花了什么吗？在记忆去买面包之前先记下来吧 🧠🥖',
'💭 没记录的花费——就当作丢进了空中。来一起记一下吧 💸',
'🌊 一滴一滴，预算就悄悄流走了。不如把今天的支出记下来 🌊',
'🤖 机器人不唠叨，只是提醒：该记录开销啦 😌',
'💡 省下一分，才能守住一元。现在就是做笔记的时候！',

'💰 钱喜欢被清点、也喜欢安静。记录支出吧。',

'💡 别无谓花钱——把钱留给更重要的事。现在该做一条记录。',

'🏗️ 小小积蓄——大大成就。现在就把一笔购买加上。',

'🌱 今天省一点——明天更轻松。记录你的花销。',

'🔄 守住的一块钱能带来两块。用一分钟记一笔支出。',

'⏰ 先存后花。现在就是做笔记的时候！',

'🧱 每一分钱，都是自由的砖块。记一笔开销。',

'🛡️ 雨天未到先存一点。现在添加一条记录。',

'📈 明智消费是最好的投资。把这笔购买记下。',

'🎯 控制支出 = 更少烦恼。记录你的花销。',

'🚀 冲动少一点——机会多一点。现在该记录了。',

'💎 先支付给自己。给机器人里加上一笔支出。',

'✂️ 砍掉不必要的开销 = 添了一份收入。把购买记下。',

'🎪 预算就是选择的自由。记录今天的开销。',

'🌟 储蓄是对未来说“可以”。现在就是做笔记的时候！',

'⚡ 纪律能战胜混乱。记下这笔支出。',

'⏳ 钱总是悄悄流走——要及时记录。现在就加一笔。',

'🧘 节俭是通往宁静之路。把这笔购买记下。',

'📋 钱喜欢有秩序。现在该记录了。'
    ],
    reminder_message_title: '提醒',
    reminder_turn_on_off: (enabled) => enabled ? '关闭提醒' : '开启提醒',
    button_configure_reminder_hours: '⏰ 配置提醒时间',
    reminder_hours_info: '选择最多3个小时作为提醒时间（您的本地时区）。当前:',
    reminder_hours_limit: '您最多可以选择3个小时',
    reminder_hours_saved: '✅ 提醒时间已保存',
    button_save: '保存',
    button_clear: '清除',
    
    // 支付支持与政策
    paysupport_message: '*支付支持*\n\n商家：{businessName}\n支持：@{supportUsername} / {supportEmail}\n\n服务条款：{termsUrl}\n隐私政策：{privacyUrl}\n退款政策：{refundPolicyUrl}\n\n如遇 Stars 支付或退款问题，请先联系支持。我们遵守 Telegram Stars 政策。',
    terms_message: '📄 服务条款：{termsUrl}',
    privacy_message: '🔐 隐私政策：{privacyUrl}',
    refund_message: '↩️ 退款政策：{refundPolicyUrl}\n\n如有问题：@{supportUsername} / {supportEmail}',
    
    // 错误报告
    button_bug_report: '🐛 报告错误 / 提出建议',
    bug_report_prompt: '🐛 *报告错误或提出改进建议*\n\n请描述问题或建议（最多1000个字符）：',
    bug_report_success: '✅ 谢谢！你的消息已发送给开发者。',
    bug_report_too_long: '❌ 消息太长！请减少 {excess} 个字符（最多1000）。',
    bug_report_empty: '❌ 消息为空。请描述问题或建议。',
    bug_report_rate_limit: '⚠️ 错误报告过多！\n\n你每10分钟只能发送3条报告',
    bug_report_suspicious: '⚠️ 消息包含不允许的字符或可疑内容',
    
    // 安全消息
    security_rate_limit: '⚠️ *请求过多*\n\n请在 {resetTime} 秒后重试\n限制：每分钟 {limit} 次请求',
    security_validation_error: '⚠️ *验证错误*\n\n{message}',
    security_error: '❌ *安全错误*\n\n请稍后重试或联系管理员。',
    
    // 管理面板
    button_admin: '👑 管理面板',
    admin_access_denied: '❌ 你没有管理员权限。',
    admin_panel_title: '👑 *管理面板*\n\n请选择操作：',
    admin_error: '❌ 执行管理员操作时出错。',
    
    // 管理员统计
    admin_stats_text: `📊 *机器人统计*
  
  👥 **用户：**
  • 总数：{totalUsers}
  • 高级用户：{activePremium}
  • 本周新增：{newUsersWeek}
  • 本月新增：{newUsersMonth}
  
  💰 **支出：**
  • 总记录数：{totalExpenses}
  • 本周：{expensesWeek}
  • 活跃用户：{activeUsers}
  
  🐛 **错误报告数：** {totalBugReports}
  
  💎 **捐赠：**
  • 总额：{totalDonations}
  • 收到的星星：{totalStars}
  
  ⭐ **高级交易数：** {premiumTransactions}`,
  
    // 用户列表
    admin_users_title: '👥 *用户*（第 {page}/{totalPages} 页）\n\n总数：{totalUsers}\n',
    
    // 错误报告
    admin_bug_reports_title: '🐛 *错误报告*',
    bug_report_status_new: '🆕 新的',
    bug_report_status_in_progress: '🔄 处理中',
    bug_report_status_resolved: '✅ 已解决',
    bug_report_status_closed: '🔒 已关闭',
    
    // 捐赠统计
    admin_donations_text: `💰 *捐赠统计*
  
  📊 **摘要：**
  • 总捐赠：{totalDonations}
  • 已完成：{completedDonations}
  • 待处理：{pendingDonations}
  
  ⭐ **星星：**
  • 总收集：{totalStars}
  • 平均捐赠：{avgStars} 颗星`,
  
    // 高级账户统计
    admin_premium_stats: `⭐ *高级账户统计*
  
  📊 **用户：**
  • 高级总数：{totalPremiumUsers}
  • 当前活跃：{activePremiumUsers}
  
  💳 **交易：**
  • 总次数：{totalTransactions}
  • 总收入：{totalRevenue} 颗星`,
  
    // 管理员列表
    admin_admins_title: '👑 *管理员*（{count} 人）\n',
    // 管理员搜索
    admin_search_prompt: '🔍 *搜索用户*\n\n请输入用户ID或用户名：',
    admin_search_not_found: '❌ 未找到用户。',
    admin_search_results: '🔍 *搜索结果* "{query}"\n\n找到：{count}\n',
    
    // 管理员用户详情
    admin_user_not_found: '❌ 未找到用户。',
    admin_user_details: `👤 *用户信息*
  
  {adminFlag}{premiumFlag} **{firstName}** (@{username})
  🆔 ID：{userId}
  🌐 语言：{language}
  💱 货币：{currency}
  🕐 时区：{timezone}
  📅 注册时间：{createdAt}
  
  📊 **统计：**
  • 支出记录数：{totalExpenses}
  • 总金额：{totalAmount}
  • 错误报告数：{bugReportsCount}
  • 交易次数：{transactionsCount}`,
  
    // 管理员操作
    admin_promote_success: '✅ 已将用户 {userId} 设为管理员。',
    admin_demote_success: '✅ 已移除用户 {userId} 的管理员权限。',
    admin_cannot_demote_self: '❌ 不能移除自己的管理员权限。',
    admin_grant_premium_options: '⭐ *为用户 {userId} 开通高级*\n\n请选择时长：',
    admin_grant_premium_success: '✅ 已为用户 {userId} 开通 {days} 天高级。',
    admin_revoke_premium_success: '✅ 已移除用户 {userId} 的高级权限。',
  
    // 群发消息
    admin_broadcast_prompt: '📢 *群发消息*\n\n请输入要发送给所有用户的消息（最多3600个字符）：',
    admin_broadcast_too_long: '❌ 消息太长！\n\n📏 当前长度：{current}\n📏 最大：{max}\n📏 请减少：{excess} 个字符',
    admin_broadcast_confirm: '📢 *确认群发*\n\n📝 **消息内容：**\n{message}\n\n📏 **长度：** {length} 个字符\n\n⚠️ 此消息将发送给 **所有** 机器人用户！',
    admin_broadcast_started: '📢 群发开始...',
    admin_broadcast_result: '📢 *群发完成！*\n\n📊 **统计：**\n• 总用户：{total}\n• 成功：{sent}\n• 失败：{failed}',
    admin_broadcast_header: '🔴🔴🔴 *通知！* 🔴🔴🔴',
    
    // 通用消息
    welcome: '你好，{name}！👋',
    main_menu_title: '🏠 *主菜单*\n\n请选择操作：',
    error: '发生错误 😞',
    unknown_error: '发生意外错误，请稍后再试。',
    not_found: '未找到',
    error_invalid_description_format: '❌ 格式无效。请使用：金额 描述 或 金额 类别 描述',
    expense_save_error: '❌ 保存支出时出错，请重试。',
    cancel: '取消',
    back: '返回',
    confirm: '确认',
    save: '保存',
    
    // 启动消息
    start_message: `你好！👋 我可以帮你记录支出并管理预算。
  
  *如何添加支出：*
  直接输入金额和描述：
  -  \`200 超市购物\`
  -  \`1500 餐厅午餐\`
  -  \`50 交通\`
  -  \`150.50 咖啡\`
  
  然后会弹出分类菜单 — 请选择合适的类别 🏷️
  
  *主要命令：*
  /start - 重启机器人
  /menu - 打开交互菜单
  /history - 查看今天的记录
  /stats - 按分类查看本月统计
  
  /export - 下载CSV格式数据
  /undo - 删除最后一条记录
  
  *设置：*
  /settings - 打开设置菜单
  /currency - 设置默认货币
  /timezone - 设置时区
  /categories - 管理分类
  
  *其他功能：*
  /family - 家庭预算
  /limits - 限制和高级功能
  /help - 详细帮助
  
  立即开始记录你的支出吧！💰`,
  help_message: `📋 *命令详细帮助*
  
  *添加支出：*
  在金额和描述之间添加空格：
  \`200 购物\` — 会显示类别菜单
  \`150.50 咖啡\` — 支持小数
  
  *主要命令：*
  /start - 重启机器人并显示欢迎信息
  /menu - 打开所有功能的互动菜单
  /history - 查看今日记录
  /stats - 本月按类别的统计
  
  /export - 下载全部数据CSV
  /undo - 撤销最后一条记录
  
  *设置与管理：*
  /settings - 打开设置主菜单
  /currency - 修改默认货币 (RUB, USD, EUR, KZT, CNY, THB)
  /timezone - 设置时区以保证时间准确
  /categories - 管理自定义类别（高级）
  
  *家庭预算：*
  /family - 管理家庭组和共享支出
  - 创建家庭，邀请成员
  - 查看家庭支出统计
  - 导出家庭数据
  
  *高级功能：*
  /limits - 查看限制和高级信息
  - 自定义类别
  - 高级统计
  - 家庭预算
  - 优先支持
  
  *使用建议：*
  • 在支出中添加描述方便分析
  • 用 /stats 定期查看统计
  • 设置正确的时区确保数据准确
  • 用 /menu 快速访问功能
  • 用 /export 导出数据进行分析
  
  *修改支出：*
  • 在 /history 中删除或编辑记录
  • “👨‍👩‍👧‍👦 添加到家庭” 按钮可将支出转为家庭预算
  • “🚫 从家庭预算移除” 按钮可恢复为个人支出
  • 只能编辑/删除自己的记录
  
  *提醒：*
  • 机器人会在当地时间18:00提醒你记录支出
  • 仅在当天未添加任意记录时提醒
  • 可在设置中开启/关闭提醒
  • 每天最多一次提醒
  
  *支持：*
  若有疑问，可用 /start 回到主菜单。
  
  祝你预算管理顺利！💰📊`,
  
    // 支出
    expense_added: '✅ 已记录: {amount} - {description}',
    expense_updated: '✅ 记录已更新: {amount} - {description}',
    expense_deleted: '✅ 记录已删除: {amount} - {description}',
    no_expenses: '没有可删除的记录 🤷‍♂️',
    expense_not_found: '错误：未找到记录。',
    expense_update_error: '错误：记录未找到或未更新。',
    
    // 统计
    monthly_stats: '💰 *本月支出*',
    daily_stats: '💰 *今日支出*',
    total_spent: '已花费: *{amount}*',
    records_count: '记录数: {count}',
    no_expenses_period: '该时间段内无支出。',
    by_categories: '按类别:',
    no_expenses_category: '此类别在过去一个月内没有支出。',
    select_category: '选择类别:',
    
    // 类别
    amount_label: '金额',
    description_label: '描述',
    category_label: '类别',
    expense_added_title: '支出已添加！',
    no_categories: '未找到类别。',
    category_expenses: '"{category}" 类别的支出',
    no_category_expenses: '过去一个月此类别无支出。',
    
    // 设置
    settings_title: '设置：',
    currency_select: '请选择默认货币：',
    currency_set: '已设置货币: {currency}',
    currency_updated: '货币已更改为 {currency}',
    button_change_period_start: '📅 期间开始日',
    period_start_prompt: '请输入新期间开始的日期 (1-31)。短月份将取最后一天。',
    period_start_invalid: '❌ 无效数字。请输入 1 到 31 之间的整数。',
    period_start_set: '✅ 已设置期间开始日: {day}',
    timezone_setup: `🕐 *时区设置*
  
  你当地的当前时间是？
  
  *当前 UTC 时间:* {utcTime}
  
  请选择你的当前时间：`,
    timezone_set: '✅ 已设置时区: {timezone}',
    // 家庭预算
    button_family: '👨‍👩‍👧‍👦 家庭',
    family_info: '👨‍👩‍👧‍👦 *家庭预算*\n\n在这里你可以和家人一起管理共享的支出。',
    family_created: '✅ 家庭 "{name}" 已创建！现在可以邀请成员了。',
    family_joined: '✅ 你已加入家庭 "{name}"！',
    family_left: '✅ 你已退出家庭 "{name}"。',
    family_deleted: '✅ 家庭 "{name}" 已删除。所有家庭支出已转为个人支出。',
    family_member_removed: '✅ 已从家庭中移除成员。',
    family_member_removed_notification: '❌ 你已被移出 *{familyName}* 家庭。',
    family_cannot_leave_owner: '❌ 家庭的拥有者不能退出，请使用“删除家庭”。',
    
    // 家庭菜单按钮
    create_family: '🏠 创建家庭',
    join_family: '🔗 加入家庭',
    invite_member: '➕ 邀请成员',
    leave_family: '🚪 退出家庭',
    delete_family: '🗑️ 删除家庭',
    family_members: '👥 家庭成员',
    family_stats: '💰 本月支出',
    family_daily_stats: '💰 今日支出',
    family_add_expense: '💰 添加家庭支出',
    family_menu: '👨‍👩‍👧‍👦 家庭菜单',
    family_cancel: '❌ 取消',
    
    // 邀请
    invitation_sent: '✅ 已向 @{username} 发送邀请',
    invitation_accepted: '✅ 你已接受加入 "{name}" 家庭的邀请！',
    invitation_rejected: '❌ 你已拒绝加入 "{name}" 家庭的邀请。',
    invitation_not_found: '❌ 邀请未找到或已过期。',
    invitation_expired: '❌ 邀请已过期。',
    invitation_already_processed: '❌ 邀请已被处理。',
    
    // 输入请求
    enter_family_name: '请输入家庭名称（3-50 个字符）：',
    enter_invite_username: '请输入用户名（不带 @）：',
    enter_expense_amount: '请输入家庭支出的金额和描述：',
    
    // 错误
    family_name_too_short: '❌ 家庭名称至少需要 3 个字符。',
    family_name_too_long: '❌ 家庭名称不能超过 50 个字符。',
    user_not_found: '❌ 未找到用户。',
    user_already_in_family: '❌ 用户已在某个家庭中。',
    user_already_has_invitation: '❌ 用户已有一个有效的邀请。',
    user_already_in_other_family: '❌ 用户已在其他家庭中。',
    user_already_in_your_family: '❌ 用户已在你的家庭中。',
    user_not_premium: '❌ 用户没有高级会员。',
    only_owner_can_invite: '❌ 只有家庭拥有者可以邀请成员。',
    active_invitations: '📋 活跃邀请',
    no_active_invitations: '📋 你没有任何活跃邀请。',
    active_invitations_list: '📋 活跃邀请列表：',
    cancel_invitation: '❌ 取消邀请',
    invitation_cancelled: '✅ 邀请已取消。',
    not_authorized: '❌ 你没有执行此操作的权限。',
    invitation_code: '🔑 邀请码: `{code}`',
    family_invitation_received: '🎉 你被邀请加入 *{familyName}* 家庭\n\n👤 邀请人: {inviterName}\n🔑 邀请码: `{inviteCode}`\n\n请选择操作：',
    accept_invitation: '✅ 接受',
    reject_invitation: '❌ 拒绝',
    invitation_accepted: '🎉 恭喜！你已加入 *{familyName}* 家庭',
    invitation_rejected: '❌ 你已拒绝该邀请',
    invitation_not_pending: '❌ 该邀请不在待处理状态',
    invitation_cancelled_notification: '❌ 你加入 *{familyName}* 家庭的邀请已被 {cancelledBy} 取消',
    enter_invite_code: '🔑 请输入邀请码：',
    only_owner_can_remove: '❌ 只有家庭拥有者可以移除成员。',
    only_owner_can_delete: '❌ 只有家庭拥有者可以删除家庭。',
    cannot_remove_owner: '❌ 不能移除家庭拥有者。',
    cannot_remove_yourself: '❌ 不能移除自己。',
    family_not_found: '❌ 未找到家庭。',
    not_family_member: '❌ 你不是该家庭成员。',
    not_family_owner: '❌ 你不是该家庭的拥有者。',
    
    // 确认
    confirm_delete_family: '⚠️ *删除家庭*\n\n所有成员将被移除，家庭支出将转为个人支出。\n\n确定要继续吗？',
    confirm_remove_member: '⚠️ *移除成员*\n\n该成员将被移出家庭。\n\n确定要继续吗？',
    // 家庭统计
    family_monthly_stats: '👨‍👩‍👧‍👦 *本月家庭支出*',
    family_daily_stats: '💰 今日支出',
    family_daily_stats_title: '👨‍👩‍👧‍👦 *今日家庭支出*',
    family_export: '📊 导出家庭数据',
    family_total_spent: '总花费：*{amount}*',
    family_members_count: '成员数：{count}',
    family_no_expenses: '该时间段内无家庭支出。',
    
    // 成员列表
    family_members_title: '👥 *家庭成员*',
    family_member_info: '• {name} ({role}) - 加入于 {date}',
    family_owner_role: '拥有者',
    family_member_role: '成员',
    remove_member: '❌ 移除',
    confirm_remove_member: '⚠️ *移除成员*\n\n确定要将 {name} 从家庭中移除吗？',
    member_removed: '✅ {name} 已被移出家庭。',
    member_removed_notification: '❌ 你已被 *{familyName}* 家庭的 {ownerName} 移除。',
    
    // 高级功能
    premium_required: '❌ 此功能仅对高级用户开放。',
    upgrade_to_premium: '💎 升级为高级用户即可使用家庭预算！',
    
    timezone_updated: `✅ *时区已更新！*
  
  🕐 选择时间：*{time}*
  🌍 时区：*{timezone}*
  
  从现在起，你的支出将按当地时间显示。`,
    timezone_updated_simple: `✅ *时区已更新！*
  
  🌍 新时区：*{timezone}*
  
  你的支出将按当地时间显示。`,
    
    // 限制
    limits_title: '📊 *限制信息*',
    status_regular: '👤 普通',
    status_premium: '💎 高级',
    status_label: '*状态:* {status}',
    records_usage: '<b>记录数:</b> {current}/{max} ({percentage}%)',
    records_remaining: '<b>剩余:</b> {remaining} 条记录',
    max_description_length: '<b>描述最大长度:</b> {length} 个字符',
    near_limit_warning: '⚠️ *注意:* 你接近记录上限！',
    limit_reached: '❌ *已达到记录上限!*',
    premium_benefits: `💎 <b>高级用户优势:</b>
  • 描述可达160字符（普通80）
  • 记录数300条（普通100）
  • 最多5个自定义类别
  • 高级统计
  • 家庭预算
  • 可修改和删除任意记录（不限于最后一条）`,
    
    // 高级订阅
    premium_subscription_title: '⭐️ 订阅',
    premium_status_header: '<b>你的状态:</b>',
    premium_privileges: '权限: {status}',
    premium_limits_info: '这里显示你的限制：类别数量、记录数、家庭功能、高级剩余时长。',
    premium_menu_title: '<b>菜单:</b>',
    premium_tariff_button: '⭐️ 套餐',
    premium_why_paid_button: '👀 为什么收费？',
    premium_donate_button: '🤝 捐赠',
    premium_back_button: '⬅️ 返回',
    premium_tariffs_title: '⭐️ 套餐 (Telegram Stars)',
    premium_payment_info: '💳 通过 Telegram Stars 支付。<b>不自动续费。</b>',
    premium_renewal_info: '📅 可随时续费，时长将累加。',
    premium_stars_info: '💡 可通过官方 [@PremiumBot] 无手续费购买星星。',
    premium_why_paid_title: '👀 为什么收费？',
    premium_purchases_button: '🧾 购买记录',
    purchases_header: '🧾 购买记录',
    purchases_premium_title: '高级',
    purchases_donations_title: '捐赠',
    no_purchases: '暂无购买记录',
    purchases_prev_button: '◀ 上一页',
    purchases_next_button: '下一页 ▶',
    purchases_page_indicator: '第 {page}/{total} 页',
    premium_why_paid_text: '运行此机器人服务器每月约需 $200，且用户数量持续增长。作为开发者，我也需要维持生活来改进服务 :)',
    premium_payment_title: '💳 *高级订阅付款*',
    premium_payment_description: '你选择了: <b>{duration}</b>\n价格: <b>{stars} ⭐️</b>\n\n点击下方按钮通过 Telegram Stars 支付。',
    // 套餐标签与产品名
    tariff_button_30: '1 个月',
    tariff_button_90: '3 个月',
    tariff_button_180: '6 个月',
    tariff_button_365: '1 年',
    tariff_item_30: '1 个月（30 天）',
    tariff_item_90: '3 个月（90 天）',
    tariff_item_180: '6 个月（180 天）',
    tariff_item_365: '12 个月（365 天）',
    premium_product: '高级订阅',
    discount_save: '省 {percent}%',
  
    payment_success: '🎉 *付款成功!* 已激活高级订阅，享受全部高级功能。',
    donation_success: '🙏 *感谢支持!* 你的捐赠将帮助我们改进机器人。',
    general_payment_success: '✅ *付款成功!* 感谢使用我们的机器人。',
    premium_expires: '📅 高级有效至: <b>{date}</b>\n⏰ 剩余天数: <b>{days}</b>',
  
    // 捐赠
    donate_prompt_title: '🤝 支持项目',
    donate_prompt_text: '请输入要捐赠的星星数量 (1 到 2500)。\n下一行可添加一条消息（最多500字符）。',
    donate_invalid: '❌ 请输入1到2500之间的整数。消息最长500字符。',
    donate_created: '✅ 已创建捐赠请求: {stars} ⭐️。我会发送支付链接给你。',
    donate_paid: '🙏 感谢你的支持！已收到捐赠: {stars} ⭐️',
    
    // 验证错误
    error_too_long_regular: '❌ 描述过长！普通用户最多80字符。',
    error_too_long_premium: '❌ 描述过长！高级用户最多160字符。',
    error_no_description: '❌ 金额后必须提供描述。',
    error_amount: '❌ 金额无效。请输入0.01到999999之间的数字。',
    error_format: '❌ 格式无效。请输入金额和描述。\n示例: `200 购物` 或 `1500 在咖啡馆午餐`',
    error_limit_reached: '❌ 已达到上限！\n普通: 100 条记录\n高级: 300 条记录\n\n💎 升级为高级用户以提高上限！',
    error_premium_required: '💎 此功能仅限高级用户！\n\n优势:\n• 描述160字符\n• 300条记录\n• 自定义类别\n• 高级统计',
    error_generic: '❌ 出错了，请稍后再试或联系管理员。',
    
    // 按钮
    button_menu: '📋 菜单',
    button_expenses_month: '💰 本月支出',
    button_expenses_day: '💰 今日支出',
    button_expenses_categories: '💰 按类别支出',
    button_family: '👨‍👩‍👧‍👦 家庭',
    button_settings: '⚙️ 设置',
    button_delete_last: '🗑️ 删除最后一条记录',
    button_limits: '📊 限制',
    button_help: '❓ 帮助',
    button_edit: '编辑',
    button_delete: '删除',
    button_mark_as_family: '👨‍👩‍👧‍👦 转为家庭支出',
    button_remove_from_family: '🚫 从家庭预算移除',
    expense_already_family: '❌ 此支出已为家庭支出',
    expense_converted_to_family: '✅ 支出已转入家庭预算',
    expense_removed_from_family: '✅ 支出已从家庭预算移除',
    not_owner: '❌ 你不是该支出的创建者',
    button_cancel: '❌ 取消',
    button_back: '⬅️ 返回',
    button_change_currency: '💱 更改货币',
    button_change_timezone: '🌍 时区',
    button_change_language: '🌐 语言',
    button_custom_categories: '🏷️ 自定义类别',
    
    // 语言
    language_select: '🌍 选择语言：',
    language_set: '✅ 语言已更改为简体中文',
    language_not_supported: '❌ 不支持的语言',
    language_change_error: '❌ 更改语言时出错',
    timezone_error: '❌ 设置时区时出错',
    
    // 导出
    export_success: '📊 数据已成功导出！',
    export_error: '导出数据时出错 😞',
    keyboard_updated: '✅ 已更新你的键盘语言！',
    
    // 编辑
    edit_canceled: '编辑已取消。',
    edit_no_active: '无活动编辑记录。',
    edit_instructions: '请输入新的金额和/或描述（如: 500 咖啡）或点击取消。',
    edit_empty: '请输入金额、描述或两者。',
    edit_amount_error: '金额无效。',
    edit_too_long: '描述过长（最大 {max} 字符）。',
    edit_format_error: '格式错误。',
    
    // 回调响应
    callback_limit_reached: '❌ 已达到记录上限',
    callback_button_not_found: '❌ 错误：未找到按钮',
    callback_data_not_found: '❌ 错误：未找到数据',
    callback_expense_added: '✅ 已添加到 "{category}" 类别',
    callback_expense_saved: '❌ 保存出错',
    callback_canceled: '❌ 已取消',
    callback_expense_canceled: '❌ 添加支出已取消',
    callback_deleted: '记录已删除！',
    callback_delete_error: '删除错误或记录未找到',
    callback_edit_mode: '退出编辑模式：',
    callback_no_cards: '没有记录…发生错误',
    
      // 默认类别
  category_food: '餐饮',
  category_transport: '交通',
  category_entertainment: '娱乐',
  category_shopping: '购物',
  category_health: '健康',
  category_other: '其他',
  
  // CSV导出
  date_label: '日期',
  currency_label: '货币',
  total_by_currencies: '按货币总计:',
  total_in_currency: '{currency}总计',
    
    // 自定义类别（高级）
    custom_categories_title: '🏷️ 自定义类别',
    custom_categories_info: '你可以创建自己的支出类别（仅限高级用户）。',
    custom_categories_add: '➕ 添加类别',
    custom_categories_manage: '🗂️ 管理类别',
    custom_categories_enter_name: '请输入新类别名称（1-30 个字符）：',
    custom_categories_created: '✅ 类别已创建: {name}',
    custom_categories_exists: '❌ 此类别已存在。',
    custom_categories_limit_reached: '❌ 已达类别上限: {max}',
    custom_categories_list_empty: '你没有自定义类别。',
    custom_categories_list_title: '你的自定义类别：',
    custom_categories_delete: '🗑️ 删除',
    custom_categories_deleted: '✅ 类别已删除。',
    custom_categories_premium_required: '�� 此功能仅对高级用户开放。'
};
