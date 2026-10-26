module.exports = {
    button_reminders: '🔔 提醒我',
    reminders_enabled: '🔔 提醒已开启',
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
    reminder_hours_info: '选择最多3个小时作为提醒时间（你的本地时区）。当前:',
    reminder_hours_limit: '你最多可以选择3个小时',
    reminder_hours_saved: '✅ 提醒时间已保存',
    button_save: '保存',
    button_clear: '清除',
    
    // 支付支持与政策
    paysupport_message: '支付支持\n\n商家：{businessName}\n支持：@{supportUsername} / {supportEmail}\n\n服务条款：{termsUrl}\n隐私政策：{privacyUrl}\n退款政策：{refundPolicyUrl}\n\n如遇 Stars 支付或退款问题，请先联系支持。我们遵守 Telegram Stars 政策。',
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
    security_error: '❌ *安全错误*\n\n请稍后重试或联系管理员。',
    
    // 管理面板
    button_admin: '👑 管理面板',
    admin_access_denied: '❌ 你没有管理员权限。',
    admin_panel_title: '👑 *管理面板*\n\n请选择操作：',
    admin_error: '❌ 执行管理员操作时出错。',
    
    // 管理员统计
    admin_stats_text: `📊 *机器人统计*

👥 *用户：*
• 总数：{totalUsers}
• 高级用户：{activePremium}
• 本周新增：{newUsersWeek}
• 本月新增：{newUsersMonth}

💰 *支出：*
• 总记录数：{totalExpenses}
• 本周：{expensesWeek}
• 活跃用户：{activeUsers}

🐛 *错误报告数：* {totalBugReports}

💎 *捐赠：*
• 总额：{totalDonations}
• 收到的星星：{totalStars}

⭐ *高级交易数：* {premiumTransactions}`,
  
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

📊 *摘要：*
• 总捐赠：{totalDonations}
• 已完成：{completedDonations}
• 待处理：{pendingDonations}

⭐ *星星：*
• 总收集：{totalStars}
• 平均捐赠：{avgStars} 颗星`,
  
    // 高级账户统计
    admin_premium_stats: `⭐ *高级账户统计*

📊 *用户：*
• 高级总数：{totalPremiumUsers}
• 当前活跃：{activePremiumUsers}

💳 *交易：*
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

{adminFlag}{premiumFlag} {firstName} (@{username})
🆔 ID：{userId}
🌐 语言：{language}
💱 货币：{currency}
🕐 时区：{timezone}
📅 注册时间：{createdAt}

📊 *统计：*
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
    admin_broadcast_confirm: '📢 *确认群发*\n\n📝 *消息内容：*\n{message}\n\n📏 *长度：* {length} 个字符\n\n⚠️ 此消息将发送给 *所有* 机器人用户！',
    admin_broadcast_started: '📢 群发开始...',
    admin_broadcast_result: '📢 *群发完成！*\n\n📊 *统计：*\n• 总用户：{total}\n• 成功：{sent}\n• 失败：{failed}',
    admin_broadcast_header: '🔴🔴🔴 *通知！* 🔴🔴🔴',
    
    // 通用消息
    error: '发生错误 😞',
    not_found: '未找到',
    expense_save_error: '❌ 保存支出时出错，请重试。',
    cancel: '取消',
    back: '返回',
    confirm: '确认',
    
    // 启动消息
    start_message: `你好！👋 我会帮你记录支出和收入。

*支出* — 只需写金额和描述：\`250 咖啡\`、\`1500 午餐\`。
其他货币也可以：\`20 USD 出租车\`，或只写金额：\`300\`。
*收入* — 加上加号：\`+50000 工资\`。

类别只需选一次 — 下次我会记住。
菜单在下方：月度概览、今日记录、收入、定期支出（房租、订阅）和「☰ 更多」。`,

  start_returning: '👋 欢迎回来！直接发送支出消息 — `250 咖啡`。菜单在下方键盘上。',
  help_message: `❓ *使用方法*

• \`250 咖啡\` — 支出。类别选一次，我会记住
• \`20 USD 出租车\` — 其他货币的支出，\`300\` — 不带描述
• \`+50000 工资\` — 收入（\`+1000 USD\` — 其他货币）
• 新记录下方：↩️ 撤销，🏷 更改类别
• 📊 *月度概览* — 支出、收入、余额、类别；◀️ — 以前的周期
• 📅 *今天* — 当天的记录；点击编号可编辑或删除记录
• 🔁 *定期支出* — 房租和订阅每月自动记录
• 🎯 *预算* 和 📄 期间 *总结* — 月度概览下方的按钮（高级版）
• 货币、提醒（每天最多3次）和周期起始日 — 在 ☰ 更多 → ⚙️ 设置

命令：/stats /history /income /recurring /export /settings /menu`,
  
    // 支出
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
    select_category: '选择类别:',
    
    // 类别
    amount_label: '金额',
    description_label: '描述',
    category_label: '类别',
    expense_added_title: '支出已添加！',
    
    // 设置
    currency_select: '请选择默认货币：',
    currency_set: '已设置货币: {currency}',
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
    // Family labels
    family_label: '🏠 *家庭:*',
    family_owner_label: '👑 *拥有者:*',
    family_info: '👨‍👩‍👧‍👦 *家庭预算*\n\n在这里，可以与家人、同事、朋友等一起管理支出。\n\n- \uD83D\uDC6A 会创建一个共享群组，用于记录共同开销。\n- \u2795 每位成员都可以添加支出。\n- \uD83D\uDDD1\uFE0F 如有需要，可删除自己的支出。\n- \uD83D\uDCCA 提供所有成员可查看的共享统计。\n- \uD83D\uDCE4 可将整个群组的数据导出为单个文件。\n\n共享管理意味着更少的混乱与更高的透明度.',
    family_created: '✅ 家庭 "{name}" 已创建！现在可以邀请成员了。',
    family_left: '✅ 你已退出家庭 "{name}"。',
    family_deleted: '✅ 家庭 "{name}" 已删除。所有家庭支出已转为个人支出。',
    family_member_removed_notification: '❌ 你已被移出“{familyName}”家庭。',
    
    // 家庭菜单按钮
    create_family: '🏠 创建家庭',
    join_family: '🔗 加入家庭',
    invite_member: '➕ 邀请成员',
    leave_family: '🚪 退出家庭',
    delete_family: '🗑️ 删除家庭',
    family_members: '👥 家庭成员',
    family_stats: '💰 本月支出',
    family_add_expense: '💰 添加家庭支出',
    family_menu: '👨‍👩‍👧‍👦 家庭菜单',
    family_cancel: '❌ 取消',
    
    // 邀请
    invitation_sent: '✅ 已向 @{username} 发送邀请',
    invitation_not_found: '❌ 邀请未找到或已过期。',
    invitation_expired: '❌ 邀请已过期。',
    
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
    family_invitation_received: '🎉 你被邀请加入“{familyName}”家庭\n\n👤 邀请人: {inviterName}\n🔑 邀请码: `{inviteCode}`\n\n请选择操作：',
    accept_invitation: '✅ 接受',
    reject_invitation: '❌ 拒绝',
    invitation_accepted: '🎉 恭喜！你已加入“{familyName}”家庭',
    invitation_rejected: '❌ 你已拒绝该邀请',
    invitation_not_pending: '❌ 该邀请不在待处理状态',
    invitation_cancelled_notification: '❌ 你加入“{familyName}”家庭的邀请已被 {cancelledBy} 取消',
    enter_invite_code: '🔑 请输入邀请码：',
    not_family_member: '❌ 你不是该家庭成员。',
    not_family_owner: '❌ 你不是该家庭的拥有者。',
    
    // 确认
    confirm_delete_family: '⚠️ *删除家庭*\n\n所有成员将被移除，家庭支出将转为个人支出。\n\n确定要继续吗？',
    // 家庭统计
    family_daily_stats: '💰 今日支出',
    family_export: '📊 导出家庭数据',
    
    // 成员列表
    family_members_title: '👥 *家庭成员*',
    family_owner_role: '拥有者',
    family_member_role: '成员',
    remove_member: '❌ 移除',
    confirm_remove_member: '⚠️ *移除成员*\n\n确定要将 {name} 从家庭中移除吗？',
    member_removed: '✅ {name} 已被移出家庭。',
    
    // 高级功能
    premium_required: '❌ 此功能仅对高级用户开放。',
    
    timezone_updated: `✅ *时区已更新！*

🕐 选择时间：*{time}*
🌍 时区：*{timezone}*

从现在起，你的支出将按当地时间显示。`,
    
    // 限制
    status_regular: '👤 普通',
    status_premium: '💎 高级',
    max_description_length: '<b>描述最大长度:</b> {length} 个字符',
    premium_benefits: `💎 <b>高级用户优势:</b>
• 🎯 月度和分类预算，达到80%和超支时提醒
• 📄 完整期间总结：每个类别与上月对比、预算、每日平均支出
• 描述160字符（而非80）
• 最多5个自定义类别
• 家庭预算
• 编辑任意记录的金额和描述

记录支出和收入免费且不限次数。`,
    
    // 高级订阅
    premium_subscription_title: '⭐️ 订阅',
    premium_status_header: '<b>你的状态:</b>',
    premium_privileges: '权限: {status}',
    premium_menu_title: '<b>菜单:</b>',
    premium_tariff_button: '⭐️ 套餐',
    premium_why_paid_button: '👀 为什么收费？',
    premium_donate_button: '🤝 捐赠',
    premium_back_button: '⬅️ 返回',
    premium_tariffs_title: '⭐️ 套餐 (Telegram Stars)',
    per_month: '每月',
    premium_payment_info: '💳 通过 Telegram 的内部货币 Telegram Stars 支付。🔁 月度方案自动续费；可在 Telegram 中取消：设置 → 我的星星 → 我的订阅（英文界面：Settings → My Stars → My subscriptions）。3、6 和 12 个月方案为一次性付款。',
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
    premium_why_paid_text: '运行此机器人服务器每月约需 $200，且用户数量持续增长。作为开发者，我也需要维持生活来改进服务 :)',
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
    
    // 验证错误
    error_too_long_regular: '❌ 描述过长！普通用户最多80字符。',
    error_too_long_premium: '❌ 描述过长！高级用户最多160字符。',
    error_amount: '❌ 金额无效。请输入0.01到999999之间的数字。',
    error_format: '❌ 没看懂。请以金额开头：`250 咖啡`、`20 USD 出租车` 或只写 `300`。',
    error_forbidden_content: '❌ 含有不允许的内容。',
    error_generic: '❌ 出错了，请稍后再试或联系管理员。',
    
    // 按钮
    button_menu: '📋 菜单',
    button_expenses_month: '💰 本月支出',
    button_expenses_day: '💰 今日支出',
    button_expenses_categories: '💰 按类别支出',
    button_family: '👨‍👩‍👧‍👦 家庭',
    button_settings: '⚙️ 设置',
    button_delete_last: '🗑️ 删除最后一条记录',
    button_help: '❓ 帮助',
    button_edit: '编辑',
    button_mark_as_family: '👨‍👩‍👧‍👦 转为家庭支出',
    button_remove_from_family: '🚫 从家庭预算移除',
    expense_already_family: '❌ 此支出已为家庭支出',
    expense_converted_to_family: '✅ 支出已转入家庭预算',
    expense_removed_from_family: '✅ 支出已从家庭预算移除',
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
    callback_data_not_found: '❌ 错误：未找到数据',
    callback_expense_added: '✅ 已添加到 "{category}" 类别',
    callback_canceled: '❌ 已取消',
    callback_expense_canceled: '❌ 添加支出已取消',
    callback_deleted: '记录已删除！',
    callback_delete_error: '删除错误或记录未找到',
    
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
    custom_categories_example: '💡 示例: "🌍 旅行" 或 "🎮 游戏"',
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
    custom_categories_premium_required: '�� 此功能仅对高级用户开放。',

    // Income
    button_income: '💵 收入',
    button_add_income: '➕ 添加收入',
    button_income_currency: '💱 收入货币',
    income_menu_title: '💵 *本期收入*',
    income_menu_empty: '本期暂无收入。',
    income_currency_label: '默认收入货币：*{currency}*',
    income_hint: '💡 快捷方式：发送以加号开头的消息 — `+50000 工资` 或 `+1000 USD 兼职`',
    income_enter_prompt: '请输入收入金额和描述 👇\n\n示例：`50000 工资`\n默认货币 — *{currency}*。可在金额后加代码指定其他货币：`1000 USD 兼职`',
    income_added: '✅ 已记录收入：*{amount}* — {description}',
    income_default_description: '收入',
    income_deleted: '✅ 收入已删除',
    income_not_found: '❌ 未找到收入',
    income_currency_select: '请选择你通常收款的货币。支出仍使用主货币：',
    income_currency_set: '✅ 收入货币：{currency}',
    income_total: '💵 收入：*{amount}*',
    balance_label: '⚖️ 结余（收入 − 支出）：*{amount}*',
    income_error_format: '❌ 无法识别。请发送金额和可选描述：`50000 工资` 或 `1000 USD 兼职`',
    income_error_amount: '❌ 金额无效。请输入0.01到{max}之间的数字。',

    // Recurring expenses
    button_recurring: '🔁 定期支出',
    button_add_recurring: '➕ 添加定期支出',
    recurring_menu_title: '🔁 *定期支出*',
    recurring_menu_info: '每月付款（房租、订阅、贷款）会在选定的日期自动记录为支出。',
    recurring_menu_empty: '暂无定期支出。',
    recurring_item: '{icon} {description} — *{amount}*，每月{day}日\n    下次记录：{next}',
    recurring_monthly_total: '每月合计：*{amount}*',
    recurring_enter_prompt: '请输入定期支出的金额和描述 👇\n\n示例：`50000 房租`\n可在金额后指定货币：`500 USD 房租`',
    recurring_day_prompt: '每月哪一天记录这笔支出？请输入1到31之间的数字。\n\n如果当月天数不足，我会在当月最后一天记录。',
    recurring_day_invalid: '❌ 请输入1到31之间的整数。',
    recurring_select_category: '请选择定期支出的类别：',
    recurring_added: '✅ 已添加定期支出\n\n{description} — *{amount}*，每月{day}日\n首次记录：{next}',
    recurring_added_charged_now: '✅ 已添加定期支出，本月已记录\n\n{description} — *{amount}*，每月{day}日\n下次记录：{next}',
    recurring_deleted: '✅ 定期支出已删除。已记录的支出保留在历史中。',
    recurring_not_found: '❌ 未找到定期支出',
    recurring_limit: '❌ 最多只能有{max}笔定期支出',
    recurring_charged_notification: '🔁 已记录定期支出：{icon} {description} — *{amount}*',
    recurring_error_format: '❌ 格式无法识别。请发送金额和描述：`50000 房租` 或 `500 USD 房租`',
    recurring_error_amount: '❌ 金额无效。请输入0.01到{max}之间的数字。',

  button_overview: '📊 月度概览',
  button_today: '📅 今天',
  button_more: '☰ 更多',
  more_menu_title: '☰ *更多*',
  button_export: '📤 导出CSV',
  keyboard_refreshed: '✅ 菜单已更新 — 现在更简洁了 👇',
  button_outdated: '此按钮已过期。请从下方菜单重新打开该部分。',
  overview_title: '概览：{range}',
  overview_spent: '💸 支出：*{amount}* · 记录：{count}',
  overview_upcoming: '即将到来的定期支出：',
  overview_income_hint: '💡 用加号记录收入：`+50000 工资`',
  button_prev_period: '◀️ 更早',
  button_next_period: '更晚 ▶️',
  button_back_to_overview: '⬅️ 返回概览',
  day_title_today: '今天，{date}',
  day_title_yesterday: '昨天，{date}',
  day_title: '{date}',
  day_entry_hint: '直接发送支出消息：`250 咖啡`',
  button_prev_day: '◀️ 前一天',
  button_next_day: '后一天 ▶️',
  list_tap_number: '点击编号打开记录。',
  family_today_title: '家庭：今日记录',
  button_undo: '↩️ 撤销',
  button_delete_record: '🗑 删除',
  button_change_category: '🏷 类别',
  button_edit_record: '✏️ 编辑',
  expense_family_label: '计入家庭预算',
  expense_recurring_label: '自动记录（定期支出）',
  expense_category_remembered: '🏷 类别取自你之前相同描述的记录 — 可用下方按钮更改。',
  category_will_be_remembered: '💡 我会记住你的选择：下次类似记录会直接归入此类别。',
  expense_category_changed: '类别：{category}',
  settings_header: '设置',
  settings_currency_line: '💱 货币：*{currency}* · 收入：*{incomeCurrency}*',
  settings_timezone_line: '🌍 时区：{timezone}',
  settings_language_line: '🌐 语言：{language}',
  settings_period_line: '📅 周期从每月{day}日开始',
  settings_reminders_on_line: '🔔 提醒：开启（{hours}）',
  settings_reminders_off_line: '🔔 提醒：关闭',
  button_currencies: '💱 货币',
  settings_currencies_text: '💱 *货币*\n\n主货币 — 支出和所有合计都以此计算：*{currency}*\n默认收入货币：*{incomeCurrency}*\n\n任何记录都可以使用其他货币 — 在金额后加上代码：`20 USD 出租车`。',
  reminders_title: '提醒',
  reminders_info: '如果到所选时间你还没有任何记录，我会提醒你。每天最多3次。',
  button_reminders_on: '🟢 开启 — 点击关闭',
  button_reminders_off: '⚫ 关闭 — 点击开启',
  family_teaser: '👨‍👩‍👧‍👦 *家庭预算*\n\n与亲人的共同支出集中一处：每人记录自己的，统计和导出共享。\n\n高级版可用。',
  button_premium: '⭐️ 高级版',
    // Subscription and premium ending
    subscription_active_info: '🔁 月度订阅已支付至 {date}，并将自动续费。取消方式：Telegram → 设置 → 我的星星 → 我的订阅（英文界面：Settings → My Stars → My subscriptions）。',
    subscription_renewed: '🔁 订阅已续费。高级版有效期至 {date}。',
    button_view_tariffs: '⭐️ 方案',
    premium_expiring_trial: '⏳ 你的高级版试用将于 {date} 结束。\n\n之后预算、完整期间总结、自定义类别、家庭预算和编辑记录将无法使用。你记录的所有内容都会保留，记录支出仍然免费。',
    premium_expiring_paid: '⏳ 高级版将于 {date} 结束。你可以提前续费 — 剩余天数会保留。',
    premium_expired_trial: '🌙 你的高级版试用已结束。记录支出和收入仍然免费；预算、完整总结、自定义类别、家庭和编辑记录需要高级版。',
    premium_expired_paid: '🌙 高级版已结束。感谢你对项目的支持！你可以随时续费。',
    premium_winback: '👋 你的高级版已结束一周。如果想重新使用预算、完整总结、自定义类别、家庭预算和编辑记录 — 请查看下方方案。',
    start_reminders_note: '🔔 如果你一天内没有任何记录，我会提醒你（每天最多3次）。更改时间或关闭：☰ 更多 → ⚙️ 设置 → 🔔。',

    // 预算
    button_budgets: '🎯 预算',
    budgets_title: '预算',
    budgets_empty: '为整月或某个类别设置限额 — 达到80%和超出限额时我会提醒你。',
    budgets_teaser: '🎯 *预算*\n\n整月或某个类别的限额：进度显示在概览中，达到80%和超出限额时会收到提醒。\n\n高级版可用。',
    button_budget_total: '➕ 整月',
    button_budget_category: '➕ 类别',
    button_budget_change: '✏️ 修改金额',
    budget_total_name: '🎯 整月',
    budget_left: '剩余 {amount}',
    budget_over: '超出 {amount}',
    budget_enter_prompt: '请输入“{name}”的期间限额 👇\n\n例如：`10000`（*{currency}*）或 `150 USD`',
    budget_amount_invalid: '❌ 只需输入金额：`10000` 或 `150 USD`。',
    budget_saved: '✅ 预算已保存',
    budget_deleted: '✅ 预算已删除',
    budget_not_found: '❌ 未找到预算',
    budget_warning_80: '⚠️ {name}：已花费 {spent} / {limit}（{percent}%）',
    budget_warning_100: '🚨 {name}：预算超支 — {spent} / {limit}（{percent}%）',
    overview_budget_of: '预算 {amount} 中',

    // 期间总结
    button_report: '📄 总结',
    report_title: '总结：{range}',
    report_vs_previous: '与上一期间相比：{change}（之前 {amount}）',
    report_change_new: '新增',
    report_change_same: '无变化',
    report_top_categories: '主要支出：',
    report_locked: '🔒 完整明细 — 每个类别与上一期间的对比、预算、每日平均支出和最大一笔支出 — 需要高级版。',
    report_categories_vs_previous: '类别（与上一期间相比）：',
    report_categories_gone: '本期无支出：{list}',
    report_more_numbers: '更多数据：',
    report_per_day: '📅 每日平均：{amount}',
    report_largest: '🔝 最大一笔支出：{amount} — {description}（{date}）',
    overview_budget_limit: '限额 {amount}',
    report_title_current: '截至目前的总结：{range}',
    input_canceled: '✅ 已取消。你可以像平常一样记录支出。',
    no_active_state: '目前没有可以取消的操作。',
    daily_summary_title: '当日摘要',
    daily_summary_info: '每日摘要：晚上我会告诉你今天花了多少、花在哪里。仅在有支出的日子发送。',
    daily_summary_enabled: '✅ 每日摘要已开启',
    daily_summary_disabled: '⚫ 每日摘要已关闭',
    daily_summary_hour_info: '请选择每日摘要的本地时间:',
    daily_summary_hour_set: '摘要时间已保存',
    button_daily_summary_on: '🗓 摘要：开',
    button_daily_summary_off: '🗓 摘要：关',
    settings_daily_summary_on_line: '🗓 每日摘要：{time}',
    settings_daily_summary_off_line: '🗓 每日摘要：关闭',
    export_title: '📤 导出为 CSV\n\n请选择文件的时间范围。',
    export_categories_all: '🗂 类别：全部',
    export_categories_selected: '🗂 类别：{categories}',
    export_period_day: '📅 今天',
    export_period_week: '📅 最近7天',
    export_period_current: '📅 本周期',
    export_period_previous: '📅 上一周期',
    export_period_all: '♾ 全部时间',
    export_period_range: '🗓 选择日期…',
    export_filter_categories: '🔽 按类别筛选',
    export_select_categories: '选择你要导出的类别：',
    export_select_all: '✅ 全选',
    export_deselect_all: '❌ 取消全选',
    export_done: '✅ 完成',
    export_no_categories: '请至少选择一个类别',
    export_enter_dates: '🗓 输入日期范围：\n`01.03.2026 - 15.03.2026`\n\n或单个日期：`01.03.2026`',
    export_dates_invalid: '❌ 无法识别日期。请按以下格式输入：`01.03.2026 - 15.03.2026` 或单个日期 `01.03.2026`。',
    export_dates_order: '❌ 开始日期晚于结束日期。示例：`01.03.2026 - 15.03.2026`。',
    total_by_categories: '按类别总计：',
    bot_short_description: '轻点几下即可记账：输入“250 咖啡”。收入、预算、月度总结、家庭预算。',
    bot_description: '直接在 Telegram 中记录支出和收入。\n\n输入“250 咖啡”——支出即被记录，类别也会被记住。\n\n• 按类别的月度概览及与上月的对比\n• 收入和余额：“+50000 工资”\n• 定期支出：房租和订阅自动记录\n• 带预警的预算、每日总结、提醒\n• 家庭预算、多种货币、导出为 CSV\n\n基础功能免费。新用户可获得 14 天高级版。',
    command_start: '主菜单',
    command_stats: '月度概览',
    command_history: '今日记录',
    command_income: '收入和余额',
    command_recurring: '定期支出',
    command_export: '导出为 CSV',
    command_family: '家庭预算',
    command_settings: '设置',
    command_limits: '订阅和高级版',
    command_help: '帮助',
    command_cancel: '取消输入',
    command_paysupport: '支付支持',
    command_terms: '服务条款',
    command_privacy: '隐私政策'
};
