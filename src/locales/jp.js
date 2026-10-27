module.exports = {
    button_reminders: '🔔 リマインダー',
    reminders_enabled: '🔔 リマインダーがオンです',
    reminders_disabled: 'リマインダーを無効にしました。完全に静かです 🤐',
    reminder_sample_variants: [
      '👋 こんにちは！財布が静かでも、幸せとは限りません。支出を記録しましょう😉',
'🤔 今日はもう何か使いましたか？ 記憶がパンを買いに行く前に書いておきましょう 🧠🥖',
'💭 記録していないなら、空に消えたのと同じです。さあ記録しましょう 💸',
'🌊 一滴ずつ、気づかないうちに予算は流れ出します。今日はちゃんと支出をメモしましょう 🌊',
'🤖 ボットは文句を言いません、お知らせするだけです。支出を記録する時間です 😌',
'💡 1円を大事にすれば、100円が守られます。今こそメモの時間！',

'💰 お金は数えることと静けさを好みます。支出を記録しましょう。',

'💡 むだ遣いはやめて—大事なことに貯めましょう。記録する時間です。',

'🏗️ 小さな節約が—大きな成果に。今すぐ購入を追加しましょう。',

'🌱 今日は節約、明日は気持ちが軽くなります。支出を記録しましょう。',

'🔄 守った1ルーブルは2を連れてきます。1分で支出を記録しましょう。',

'⏰ まず貯めて、あとで使う。今こそメモの時間！',

'🧱 1円は自由のレンガ1つ。支出を記録しましょう。',

'🛡️ 雨の日に備えて先に貯めましょう。今すぐエントリーを追加してください。',

'📈 賢い支出は最高の投資です。購入を記録しましょう。',

'🎯 支出コントロール＝心配ごとが減る。支出を記録しましょう。',

'🚀 衝動を減らせば—チャンスは増えます。記録する時間です。',

'💎 まずは自分に支払いましょう。ボットで支出を追加してください。',

'✂️ ムダを断つ支出＝得られた収入。購入を記録しましょう。',

'🎪 予算＝選択の自由。今日の支出を記録しましょう。',

'🌟 貯蓄は未来への「イエス」。今こそメモの時間！',

'⚡ 規律はカオスに勝ちます。支出を記録しましょう。',

'⏳ お金は静かに去っていきます—タイミングよく記録を。今すぐ支出を追加してください。',

'🧘 倹約は安らぎへの道です。購入を記録しましょう。',

'📋 お金は秩序を好みます。記録する時間です。'
    ],
    reminder_message_title: 'リマインダー',
    reminder_hours_info: 'リマインダーの時間を最大3時間まで選択してください（あなたの現地時間帯）。現在:',
    reminder_hours_limit: '最大3時間まで選択できます',
    reminder_hours_saved: '✅ リマインダー時間が保存されました',
    button_save: '保存',
    button_clear: 'クリア',
    
    // 支払いサポートとポリシー
    paysupport_message: '支払いサポート\n\n事業者: {businessName}\nサポート: @{supportUsername} / {supportEmail}\n\n利用規約: {termsUrl}\nプライバシー: {privacyUrl}\n返金ポリシー: {refundPolicyUrl}\n\nStarsの支払い・返金に関する問題は、まずサポートにご連絡ください。Telegram Starsのポリシーに準拠しています。',
    terms_message: '📄 利用規約: {termsUrl}',
    privacy_message: '🔐 プライバシーポリシー: {privacyUrl}',
    refund_message: '↩️ 返金ポリシー: {refundPolicyUrl}\n\nお問い合わせ: @{supportUsername} / {supportEmail}',
    
    // バグ報告
    button_bug_report: '🐛 バグ報告 / 改善提案',
    bug_report_prompt: '🐛 *バグ報告または改善提案*\n\n問題または提案を記述してください（最大1000文字）：',
    bug_report_success: '✅ ありがとうございます！メッセージは開発者に送信されました。',
    bug_report_too_long: '❌ メッセージが長すぎます！{excess}文字減らしてください（最大1000）。',
    bug_report_empty: '❌ メッセージが空です。問題または提案を記入してください。',
    bug_report_rate_limit: '⚠️ バグ報告が多すぎます！\n\n10分ごとに3件まで送信可能です',
    bug_report_suspicious: '⚠️ 許可されていない文字または不審な内容が含まれています',
    
    // セキュリティメッセージ
    security_rate_limit: '⚠️ *リクエストが多すぎます*\n\n{resetTime}秒後に再試行してください\n制限：1分間に{limit}回',
    security_error: '❌ *セキュリティエラー*\n\n後でもう一度お試しください、または管理者に連絡してください。',
    
    // 管理パネル
    button_admin: '👑 管理パネル',
    admin_access_denied: '❌ あなたには管理者権限がありません。',
    admin_panel_title: '👑 *管理パネル*\n\n操作を選択してください：',
    admin_error: '❌ 管理操作の実行中にエラーが発生しました。',
    
    // 管理統計
    admin_stats_text: `📊 *ボット統計*

👥 *ユーザー:*
• 合計: {totalUsers}
• プレミアム: {activePremium}
• 今週新規: {newUsersWeek}
• 今月新規: {newUsersMonth}

💰 *支出:*
• 総記録数: {totalExpenses}
• 今週: {expensesWeek}
• アクティブユーザー: {activeUsers}

🐛 *バグ報告:* {totalBugReports}

💎 *寄付:*
• 合計: {totalDonations}
• 獲得スター: {totalStars}

⭐ *プレミアム取引件数:* {premiumTransactions}`,
  
    // ユーザーリスト
    admin_users_title: '👥 *ユーザー*（ページ {page}/{totalPages}）\n\n合計: {totalUsers}\n',
    
    // バグ報告ステータス
    admin_bug_reports_title: '🐛 *バグ報告*',
    bug_report_status_new: '🆕 新規',
    bug_report_status_in_progress: '🔄 対応中',
    bug_report_status_resolved: '✅ 解決済み',
    bug_report_status_closed: '🔒 クローズ',
    
    // 寄付統計
    admin_donations_text: `💰 *寄付統計*

📊 *概要:*
• 寄付総数: {totalDonations}
• 完了: {completedDonations}
• 保留中: {pendingDonations}

⭐ *スター:*
• 総獲得: {totalStars}
• 平均寄付: {avgStars} スター`,
  
    // プレミアム統計
    admin_premium_stats: `⭐ *プレミアム統計*

📊 *ユーザー:*
• プレミアム合計: {totalPremiumUsers}
• 現在アクティブ: {activePremiumUsers}

💳 *取引:*
• 取引総数: {totalTransactions}
• 総収入: {totalRevenue} スター`,
  
    // 管理者リスト
    admin_admins_title: '👑 *管理者*（{count}人）\n',
    // 管理者検索
    admin_search_prompt: '🔍 *ユーザー検索*\n\nユーザーIDまたはユーザー名を入力してください:',
    admin_search_not_found: '❌ ユーザーが見つかりません。',
    admin_search_results: '🔍 *検索結果* "{query}"\n\nヒット数: {count}\n',
    
    // 管理者ユーザー詳細
    admin_user_not_found: '❌ ユーザーが見つかりません。',
    admin_user_details: `👤 *ユーザー情報*

{adminFlag}{premiumFlag} {firstName} (@{username})
🆔 ID: {userId}
🌐 言語: {language}
💱 通貨: {currency}
🕐 タイムゾーン: {timezone}
📅 登録日: {createdAt}

📊 *統計:*
• 支出記録数: {totalExpenses}
• 総額: {totalAmount}
• バグ報告数: {bugReportsCount}
• 取引数: {transactionsCount}`,
  
    // 管理者操作
    admin_promote_success: '✅ ユーザー {userId} を管理者に昇格しました。',
    admin_demote_success: '✅ ユーザー {userId} の管理者権限を削除しました。',
    admin_cannot_demote_self: '❌ 自分自身の管理者権限は削除できません。',
    admin_grant_premium_options: '⭐ *ユーザー {userId} にプレミアムを付与*\n\n期間を選択してください:',
    admin_grant_premium_success: '✅ ユーザー {userId} に {days}日間のプレミアムを付与しました。',
    admin_revoke_premium_success: '✅ ユーザー {userId} からプレミアムを削除しました。',
  
    // メッセージ一斉送信
    admin_broadcast_prompt: '📢 *一斉送信*\n\n全ユーザーに送信するメッセージを入力してください（最大3600文字）：',
    admin_broadcast_too_long: '❌ メッセージが長すぎます！\n\n📏 現在の長さ: {current}\n📏 最大: {max}\n📏 減らす必要: {excess}文字',
    admin_broadcast_confirm: '📢 一斉送信を確認\n\n📝 メッセージ内容:\n{message}\n\n📏 長さ: {length} 文字\n\n⚠️ このメッセージは全てのユーザーに送信されます！',
    admin_broadcast_started: '📢 送信を開始しました...',
    admin_broadcast_result: '📢 *送信完了！*\n\n📊 *統計:*\n• 総ユーザー数: {total}\n• 成功: {sent}\n• 失敗: {failed}',
    admin_broadcast_header: '🔴🔴🔴 通知！ 🔴🔴🔴',
    
    // 一般メッセージ
    error: 'エラーが発生しました 😞',
    not_found: '見つかりません',
    expense_save_error: '❌ 支出保存中にエラーが発生しました。再試行してください。',
    cancel: 'キャンセル',
    back: '戻る',
    confirm: '確認',
    
    // 開始メッセージ
    start_message: `こんにちは！👋 支出と収入の記録をお手伝いします。

*支出* — 金額と説明を書いてください: \`250 コーヒー\`、\`1500 ランチ\`。
他の通貨もOK: \`20 USD タクシー\`、金額だけでも: \`300\`。
*収入* — プラスを付けてください: \`+50000 給料\`。

カテゴリは一度選んでいただければ、次回から覚えておきます。
メニューは下にあります: 月の概要、今日の記録、収入、定期支出（家賃、サブスク）、「☰ その他」。`,

  start_returning: '👋 おかえりなさい！支出をメッセージで送ってください — `250 コーヒー`。メニューは下のキーボードにあります。',
  help_message: `❓ *使い方*

• \`250 コーヒー\` — 支出。カテゴリは一度選べば覚えます
• \`20 USD タクシー\` — 他の通貨での支出、\`300\` — 説明なし
• \`+50000 給料\` — 収入（\`+1000 USD\` — 他の通貨）
• 新しい記録の下: ↩️ 取り消し、🏷 カテゴリ変更
• 📊 *月の概要* — 支出、収入、残高、カテゴリ; ◀️ — 過去の期間
• 📅 *今日* — その日の記録; 番号をタップして編集・削除
• 🔁 *定期支出* — 家賃やサブスクは毎月自動で記録されます
• 🎯 *予算* と 📄 期間の *サマリー* — 月の概要の下のボタン（プレミアム）
• 通貨、リマインダー（1日3回まで）、期間の開始日 — ☰ その他 → ⚙️ 設定

コマンド: /stats /history /income /recurring /export /settings /menu`,
  
    // 支出
    expense_updated: '✅ 記録を更新しました: {amount} - {description}',
    expense_deleted: '✅ 記録を削除しました: {amount} - {description}',
    no_expenses: '削除する記録がありません 🤷‍♂️',
    expense_not_found: 'エラー: 記録が見つかりません。',
    expense_update_error: 'エラー: 記録が見つからないか、更新されませんでした。',
    
    // 統計
    monthly_stats: '💰 *今月の支出*',
    daily_stats: '💰 *今日の支出*',
    total_spent: '支出合計: *{amount}*',
    records_count: '記録数: {count}',
    no_expenses_period: 'この期間の支出はありません。',
    by_categories: 'カテゴリー別:',
    
    // カテゴリー
    select_category: 'カテゴリーを選択してください:',
    amount_label: '金額',
    description_label: '説明',
    category_label: 'カテゴリー',
    expense_added_title: '支出を追加しました！',
    
    // 設定
    currency_select: 'デフォルト通貨を選択してください:',
    currency_set: '通貨を設定しました: {currency}',
    button_change_period_start: '📅 期間開始日',
    period_start_prompt: '新しい期間の開始日を入力してください (1〜31日)。短い月は最終日になります。',
    period_start_invalid: '❌ 無効な数値です。1〜31の整数を入力してください。',
    period_start_set: '✅ 期間開始日を {day} に設定しました',
    timezone_setup: `🕐 *タイムゾーン設定*

現在の時間は何時ですか？

*現在のUTC時間:* {utcTime}

現在の時間を選択してください:`,
    timezone_set: '✅ タイムゾーンを {timezone} に設定しました',
    // 家族予算
    family_label: '🏠 *家族:*',
    family_owner_label: '👑 *所有者:*',
    family_info: '👨‍👩‍👧‍👦 *ファミリーバジェット*\n\nここでは家族や同僚、友人などと一緒に支出を管理できます。\n\n- \uD83D\uDC6A 共同の支出を記録するための共有グループが作成されます。\n- \u2795 各メンバーが支出を追加できます。\n- \uD83D\uDDD1\uFE0F 必要に応じて自分の支出を削除できます。\n- \uD83D\uDCCA すべてのメンバーが利用できる共有統計があります。\n- \uD83D\uDCE4 グループ全体のデータを1つのファイルにエクスポートできます。\n\n共同管理は、混乱を減らし、透明性を高めます。',
    family_created: '✅ 家族「{name}」を作成しました！メンバーを招待できます。',
    family_left: '✅ 家族「{name}」から退出しました。この家族でのあなたの支出は個人の支出になりました。',
    family_deleted: '✅ 家族「{name}」を削除しました。全ての家族支出は個人支出に変わりました。',
    family_member_removed_notification: '❌ あなたは「{familyName}」家族から削除されました。この家族でのあなたの支出は個人の支出になりました。',
    
    // 家族メニューボタン
    create_family: '🏠 家族を作成',
    join_family: '🔗 家族に参加',
    invite_member: '➕ メンバーを招待',
    leave_family: '🚪 家族から退出',
    delete_family: '🗑️ 家族を削除',
    family_members: '👥 家族メンバー',
    family_stats: '💰 月間支出',
    family_add_expense: '💰 家族支出を追加',
    button_personal_expense: '👤 個人の支出',
    enter_personal_expense: '個人の支出の金額と説明を入力してください：',
    family_mode_button_on: '🟢 すべての支出を家族に — タップでオフ',
    family_mode_button_off: '⚪ すべての支出を家族に — タップでオン',
    family_mode_line_on: '🟢 新しい支出は家族に記録されます',
    family_mode_line_off: '⚪ 新しい支出は個人用です',
    family_mode_enabled: '✅ これから新しい支出はすべて家族に記録されます。\n\n個人の支出は下の「{personalButton}」または支出カードの「{removeButton}」で。',
    family_mode_disabled: '✅ 新しい支出は再び個人用になりました。\n\n家族の支出は下の「{familyButton}」または支出カードの「{addButton}」で。',
    family_menu: '👨‍👩‍👧‍👦 家族メニュー',
    family_cancel: '❌ キャンセル',
    
    // 招待
    invitation_sent: '✅ @{username} に招待を送信しました',
    invitation_not_found: '❌ 招待が見つからないか有効期限切れです。',
    invitation_expired: '❌ 招待の有効期限が切れました。',
    
    // 入力依頼
    enter_family_name: '家族名を入力してください（3〜50文字）：',
    enter_invite_username: 'ユーザー名を入力してください（@不要）：',
    enter_expense_amount: '家族支出の金額と説明を入力してください：',
    
    // エラー
    family_name_too_short: '❌ 家族名は最低3文字必要です。',
    family_name_too_long: '❌ 家族名は50文字以内にしてください。',
    user_not_found: '❌ ユーザーが見つかりません。',
    user_already_in_family: '❌ ユーザーはすでに家族に所属しています。',
    user_already_has_invitation: '❌ ユーザーには既に有効な招待があります。',
    user_already_in_other_family: '❌ ユーザーは別の家族に所属しています。',
    user_already_in_your_family: '❌ ユーザーはすでにあなたの家族のメンバーです。',
    user_not_premium: '❌ ユーザーはプレミアムではありません。',
    only_owner_can_invite: '❌ 招待できるのは家族の所有者のみです。',
    active_invitations: '📋 有効な招待',
    no_active_invitations: '📋 有効な招待はありません。',
    active_invitations_list: '📋 有効な招待リスト：',
    cancel_invitation: '❌ 招待を取り消す',
    invitation_cancelled: '✅ 招待をキャンセルしました。',
    not_authorized: '❌ この操作を行う権限がありません。',
    invitation_code: '🔑 招待コード: `{code}`',
    family_invitation_received: '🎉 あなたは「{familyName}」家族に招待されました\n\n👤 招待者: {inviterName}\n🔑 コード: `{inviteCode}`\n\n操作を選択してください：',
    accept_invitation: '✅ 承諾',
    reject_invitation: '❌ 拒否',
    invitation_accepted: '🎉 おめでとうございます！家族「{familyName}」に参加しました',
    invitation_rejected: '❌ 招待を拒否しました',
    invitation_not_pending: '❌ 招待は保留状態ではありません',
    invitation_cancelled_notification: '❌ 「{familyName}」家族への招待は {cancelledBy} によりキャンセルされました',
    enter_invite_code: '🔑 招待コードを入力してください：',
    not_family_member: '❌ あなたはこの家族のメンバーではありません。',
    not_family_owner: '❌ あなたは家族の所有者ではありません。',
    
    // 確認
    confirm_delete_family: '⚠️ *家族削除*\n\n全メンバーが削除され、家族支出は個人支出に戻ります。\n\n本当に実行しますか？',
    // 家族統計
    family_daily_stats: '💰 今日の支出',
    family_export: '📊 家族データをエクスポート',
    
    // メンバーリスト
    family_members_title: '👥 *家族メンバー*',
    family_owner_role: '所有者',
    family_member_role: 'メンバー',
    remove_member: '❌ 削除',
    confirm_remove_member: '⚠️ *メンバー削除*\n\n{name} を家族から削除しますか？この人の家族での支出は個人の支出になり、家族からは見えなくなります。',
    member_removed: '✅ {name} を家族から削除しました。',
    
    // プレミアム機能
    premium_required: '❌ この機能はプレミアムユーザーのみ利用できます。',
    
    timezone_updated: `✅ *タイムゾーンを更新しました！*

🕐 選択した時間: *{time}*
🌍 タイムゾーン: *{timezone}*

これ以降、すべての支出は現地時間で表示されます。`,
    
    // 制限
    status_regular: '👤 通常',
    status_premium: '💎 プレミアム',
    max_description_length: '<b>説明の最大長:</b> {length} 文字',
    premium_benefits: `💎 <b>プレミアム特典:</b>
• 🎯 月全体・カテゴリー別の予算（80%到達時と超過時に通知）
• 📄 期間の詳細サマリー: 全カテゴリーの前月比較、予算、1日あたりの平均支出
• 説明160文字（通常80文字）
• カスタムカテゴリー最大5個
• 家族の予算
• 任意の記録の金額と説明の編集

支出と収入の記録は無料・無制限です。`,
    
    // プレミアム購読
    premium_subscription_title: '⭐️ サブスクリプション',
    premium_status_header: '<b>あなたのステータス:</b>',
    premium_privileges: '特典: {status}',
    premium_menu_title: '<b>メニュー:</b>',
    premium_tariff_button: '⭐️ 料金プラン',
    premium_why_paid_button: '👀 なぜ有料？',
    premium_donate_button: '🤝 寄付',
    premium_back_button: '⬅️ 戻る',
    premium_tariffs_title: '⭐️ 料金プラン（Telegram Stars）',
    per_month: '月あたり',
    premium_payment_info: '💳 支払いはTelegramの内部通貨であるTelegram Starsで行います。🔁 月額プランは自動更新されます。解約はTelegramの「設定 → スター → 登録状況」（英語表示では Settings → My Stars → My subscriptions）から行えます。3・6・12か月プランは一回払いです。',
    premium_renewal_info: '📅 いつでも延長可能です。残り時間に加算されます。',
    premium_stars_info: '💡 公認 [@PremiumBot] から手数料なしでスターを購入できます。',
    premium_why_paid_title: '👀 なぜ有料？',
    premium_purchases_button: '🧾 購入履歴',
    purchases_header: '🧾 購入履歴',
    purchases_premium_title: 'プレミアム',
    purchases_donations_title: '寄付',
    no_purchases: '購入履歴はまだありません',
    purchases_prev_button: '◀ 前へ',
    purchases_next_button: '次へ ▶',
    premium_why_paid_text: 'このボットのサーバー維持には毎月約$200かかります。利用者が増え続ける中、開発者としてサービス改善のために生活費も必要です :)',
    // 料金プランのラベルと商品名
    tariff_button_30: '1 Month',
    tariff_button_90: '3 Months',
    tariff_button_180: '6 Months',
    tariff_button_365: '1 Year',
    tariff_item_30: '1 month (30 days)',
    tariff_item_90: '3 months (90 days)',
    tariff_item_180: '6 months (180 days)',
    tariff_item_365: '12 months (365 days)',
    premium_product: 'プレミアム購読',
    discount_save: '{percent}% お得',
  
    payment_success: '🎉 *支払い成功!* プレミアムが有効になりました。高度な機能をご利用ください。',
    donation_success: '🙏 *ご支援ありがとうございます!* 寄付はボットの開発に役立ちます。',
    general_payment_success: '✅ *支払い確認済み!* ご利用ありがとうございます。',
    premium_expires: '📅 プレミアム有効期限: <b>{date}</b>\n⏰ 残り日数: <b>{days}</b>',
  
    // 寄付
    donate_prompt_title: '🤝 プロジェクトを支援する',
    donate_prompt_text: '寄付するスターの数（1〜2500）を入力してください。\nオプションで、次の行に最大500文字のメッセージを追加できます。',
    donate_invalid: '❌ 1〜2500の整数を入力してください。メッセージは最大500文字です。',
    donate_created: '✅ 寄付リクエストを作成しました: {stars} ⭐️。支払いリンクを送ります。',
    
    // バリデーションエラー
    error_too_long_regular: '❌ 説明が長すぎます！通常ユーザーは80文字までです。',
    error_too_long_premium: '❌ 説明が長すぎます！プレミアムは160文字までです。',
    error_amount: '❌ 無効な金額です。0.01から{max}までの数値を入力してください。',
    error_format: '❌ 認識できませんでした。金額から始めてください: `250 コーヒー`、`20 USD タクシー`、または `300` だけ。',
    error_generic: '❌ エラーが発生しました。後でもう一度お試しください、または管理者に連絡してください。',
    
    // ボタン
    button_menu: '📋 メニュー',
    button_expenses_month: '💰 今月の支出',
    button_expenses_day: '💰 今日の支出',
    button_expenses_categories: '💰 カテゴリー別支出',
    button_family: '👨‍👩‍👧‍👦 家族',
    button_settings: '⚙️ 設定',
    button_delete_last: '🗑️ 最後の記録を削除',
    button_help: '❓ ヘルプ',
    button_edit: '編集',
    button_mark_as_family: '👨‍👩‍👧‍👦 家族に移動',
    button_remove_from_family: '🚫 家族予算から削除',
    expense_already_family: '❌ この支出はすでに家族支出です',
    expense_converted_to_family: '✅ 支出を家族予算に移動しました',
    expense_removed_from_family: '✅ 支出を家族予算から削除しました',
    button_cancel: '❌ キャンセル',
    button_back: '⬅️ 戻る',
    button_change_currency: '💱 通貨を変更',
    button_change_timezone: '🌍 タイムゾーン',
    button_change_language: '🌐 言語',
    button_custom_categories: '🏷️ カスタムカテゴリー',
    
    // 言語
    language_select: '🌍 言語を選択:',
    language_set: '✅ 言語が日本語に変更されました',
    language_not_supported: '❌ この言語はサポートされていません',
    language_change_error: '❌ 言語の変更中にエラーが発生しました',
    timezone_error: '❌ タイムゾーン設定中にエラーが発生しました',
    
    // エクスポート
    export_success: '📊 データを正常にエクスポートしました！',
    export_error: 'データのエクスポート中にエラーが発生しました 😞',
    keyboard_updated: '✅ キーボードを言語に合わせて更新しました！',
    
    // 編集
    edit_canceled: '編集をキャンセルしました。',
    edit_no_active: 'アクティブな編集はありません。',
    edit_instructions: '新しい金額や説明を入力するか（例: 500 コーヒー）、キャンセルボタンを押してください。',
    edit_empty: '金額、説明、またはその両方を入力してください。',
    edit_amount_error: '金額が無効です。',
    edit_too_long: '説明が長すぎます（最大 {max} 文字）。',
    edit_format_error: '形式が正しくありません。',
    
    // コールバック応答
    callback_data_not_found: '❌ エラー: データが見つかりません',
    callback_expense_added: '✅ "{category}" カテゴリーに追加されました',
    callback_canceled: '❌ キャンセルされました',
    callback_expense_canceled: '❌ 支出追加がキャンセルされました',
    callback_deleted: '記録が削除されました！',
    callback_delete_error: '削除エラーまたは記録が見つかりません',
    
    // デフォルトカテゴリー
    category_food: '食費',
    category_transport: '交通',
    category_entertainment: '娯楽',
    category_shopping: '買い物',
    category_health: '健康',
    category_other: 'その他',
    
    // CSVエクスポート
    date_label: '日付',
    currency_label: '通貨',
    total_by_currencies: '通貨別合計:',
    total_in_currency: '{currency}での合計',
    
    // カスタムカテゴリー（プレミアム）
      custom_categories_title: '🏷️ カスタムカテゴリー',
  custom_categories_info: 'ここで独自の支出カテゴリーを作成できます（プレミアムのみ）。',
  custom_categories_example: '💡 例: "🌍 旅行" または "🎮 ゲーム"',
  custom_categories_add: '➕ カテゴリーを追加',
    custom_categories_manage: '🗂️ カテゴリーを管理',
    custom_categories_enter_name: '新しいカテゴリー名を入力してください（1〜30文字）：',
    custom_categories_created: '✅ カテゴリーを作成しました: {name}',
    custom_categories_exists: '❌ このカテゴリーは既に存在します。',
    custom_categories_limit_reached: '❌ カスタムカテゴリーの上限: {max}',
    custom_categories_list_empty: 'カスタムカテゴリーはありません。',
    custom_categories_list_title: 'あなたのカスタムカテゴリー:',
    custom_categories_delete: '🗑️ 削除',
    custom_categories_deleted: '✅ カテゴリーを削除しました。',
    custom_categories_premium_required: '💎 この機能はプレミアムユーザーのみ利用可能です。',

    // Income
    button_income: '💵 収入',
    button_add_income: '➕ 収入を追加',
    button_income_currency: '💱 収入の通貨',
    income_menu_title: '💵 *今期の収入*',
    income_menu_empty: 'この期間の収入はまだありません。',
    income_currency_label: 'デフォルトの収入通貨: *{currency}*',
    income_hint: '💡 簡単な方法: プラスで始まるメッセージを送信 — `+50000 給料` または `+1000 USD 副業`',
    income_enter_prompt: '収入の金額と説明を入力してください 👇\n\n例: `50000 給料`\nデフォルト通貨 — *{currency}*。金額の後にコードを付けると別の通貨を指定できます: `1000 USD 副業`',
    income_added: '✅ 収入を記録しました: *{amount}* — {description}',
    income_default_description: '収入',
    income_deleted: '✅ 収入を削除しました',
    income_edit_prompt: '✏️ 現在: {current}\n\n新しい金額や説明を送ってください 👇\n例: `60000 給料`、金額だけ `60000`、説明だけ `前払い`。\n通貨は金額の後にコードを付けて変更できます: `1000 USD`',
    income_updated: '✅ 収入を更新しました',
    button_savings: '🏦 貯金',
    command_savings: '貯金と目標',
    savings_title: '🏦 *貯金*',
    savings_intro: 'ここでは貯金と目標を管理し、普段の支出・利息・インフレを考慮していくら貯められるかを確認できます。\n\n貯金を1つの金額で入力するか、口座を追加しましょう — 現金、定期預金、外貨口座、暗号資産など、それぞれ独自の通貨と利回りを設定できます 👇',
    savings_total: '合計: *{amount}*',
    savings_general: '共通の貯金',
    savings_mode_total_short: '（貯金全体から）',
    savings_goal_achieved_short: '✅ 達成',
    savings_monthly_manual: '📥 毎月 {amount} を貯金（手動設定）',
    savings_monthly_unknown: '📥 毎月の貯金額はまだ不明です：1か月分の収入を記録するか、「⚙️ 予測の設定」で金額を設定してください。',
    savings_monthly_negative: '⚠️ 直近 {n} か月の平均で、支出が収入を毎月 {amount} 上回っています — 貯金が増えていません。',
    savings_monthly_auto: '📥 毎月 ~{amount} を貯金 — 直近 {n} か月平均の収入から支出を引いた額です。',
    savings_in_year: '📈 1年後: ~{amount}',
    savings_in_today_money: '今日の価値で ≈ {amount}',
    savings_button_set_current: '✏️ 1つの金額で',
    savings_button_new_goal: '🎯 新しい目標',
    savings_button_forecast: '📈 予測',
    savings_button_settings: '⚙️ 予測の設定',
    savings_button_back: '⬅️ 貯金',
    savings_not_found: '❌ この貯金箱が見つかりません — すでに削除された可能性があります。',
    savings_balance: '現在: *{amount}*',
    savings_recent_operations: '最近の変更:',
    savings_button_deposit: '➕ 入金',
    savings_button_withdraw: '➖ 引き出し',
    savings_button_set: '✏️ 正確な金額',
    savings_button_transfer: '🔄 移動',
    savings_button_goal_target: '🎯 目標額',
    savings_button_goal_date: '📅 期限',
    savings_button_mode_own: '🔀 モード: 専用の貯金箱',
    savings_button_mode_total: '🔀 モード: 貯金全体から',
    savings_button_goal_delete: '🗑 目標を削除',
    savings_mode_own_line: '🐷 専用の貯金箱 — 個別に入金してください',
    savings_mode_total_line: '🏦 貯金全体から計算',
    savings_goal_progress: '貯金済み: *{current}* / {target}',
    savings_goal_left: '残り {amount}',
    savings_goal_deadline: '📅 期限: {date} · {left}',
    savings_deadline_left: '残り {duration}',
    savings_deadline_soon: '1か月未満',
    savings_deadline_passed: '期限切れ',
    savings_goal_achieved: '🎉 目標達成！',
    savings_goal_unreachable: '📥 毎月 {amount} の積立では目標に届きません — もっと貯める必要があります。',
    savings_goal_eta: '📥 毎月 {amount} の積立で、目標達成まで ≈ {duration}（{date}）',
    savings_goal_eta_real: '🔥 インフレを考慮すると（目標額が上がる）— ≈ {duration}',
    savings_goal_eta_real_never: '🔥 インフレを考慮すると目標に届きません：積立額が物価上昇に追いつきません',
    savings_goal_own_assumption: '_毎月の積立額がすべてこの貯金箱に入るものとして計算しています。_',
    savings_goal_required: '🎯 期限に間に合わせるには、毎月 {amount} を貯めましょう',
    savings_goal_required_real: '（インフレ考慮 — {amount}）',
    savings_prompt_deposit: '「{name}」にいくら追加しますか？現在 {amount} です。\n\n例: `10000` または `100 USD` — 貯金箱の通貨に換算します。',
    savings_prompt_withdraw: '「{name}」からいくら引き出しますか？現在 {amount} です。',
    savings_prompt_set: '「{name}」には今いくらありますか？正確な金額を入力してください。例: `350000`。\n\n現在の記録: {amount}。',
    savings_transfer_choose: '「{name}」からどこへ移動しますか？利用可能: {amount}。',
    savings_prompt_transfer: '「{from}」から「{to}」へいくら移動しますか？利用可能: {amount}。',
    savings_prompt_goal: '目標の金額と名前を入力してください 👇\n\n例: `1 500 000 車` または `3000 USD 旅行`。デフォルト通貨は *{currency}* です。\n\n期限とモード（専用の貯金箱か貯金全体から）は目標カードで設定できます。',
    savings_goal_limit_regular: '🎯 無料版では目標を {limit} 件まで管理できます。プレミアムなら同時に最大10件まで。',
    savings_goal_limit_premium: '🎯 すでに目標が {limit} 件あります — これが上限です。新しい目標を追加するには1件削除してください。',
    savings_prompt_goal_target: '「{name}」の新しい金額（現在 {amount}）。新しい名前も一緒に入力できます: `2 000 000 新しい車`。',
    savings_prompt_goal_date: '「{name}」をいつまでに貯めますか？月と年 `12.2027` または日付 `31.12.2027` を入力してください。',
    savings_button_no_deadline: '♾ 期限なし',
    savings_deadline_removed: '✅ 期限を解除しました',
    savings_mode_set_own: '✅ 目標に専用の貯金箱ができました — 個別に入金してください。',
    savings_mode_set_total: '✅ 目標は貯金全体から計算されるようになりました。',
    savings_moved_to_general: '💰 {amount} を共通の貯金に移しました。',
    savings_button_new_account: '💼 口座を追加',
    savings_account_yield: '📈 口座の利回り: 年 {value}%',
    savings_account_yield_default: '📈 利回り — 予測の設定と同じ: 年 {value}%',
    savings_button_account_yield: '📈 利回り',
    savings_button_account_name: '✏️ 名前',
    savings_button_account_delete: '🗑 口座を削除',
    savings_button_account_yield_default: '↩️ 設定と同じ',
    savings_prompt_account: '口座の名前と通貨を入力してください 👇\n\n例: `現金 USD`、`定期預金 16%`、`銀行口座 EUR`、`暗号資産 USDT`、`Steamスキン USD`。通貨なしの場合は *{currency}*、利率は `%` で指定できます。\n\n💡 暗号資産やスキンはドル建ての価値を入力し、「✏️ 正確な金額」ボタンで更新してください。',
    savings_prompt_account_yield: '「{name}」の年利回り（%）、例: 定期預金なら `16`、現金なら `0`（{max} まで）。',
    savings_prompt_account_name: '「{name}」の新しい名前:',
    savings_account_delete_confirm: '口座「{name}」を削除しますか？',
    savings_account_deleted: '✅ 口座「{name}」を削除しました。',
    savings_account_created: '✅ 口座「{name}」を作成しました。',
    savings_account_limit: '💼 すでに口座が {limit} 件あります — これが上限です。新しい口座を追加するには不要な口座を削除してください。',
    savings_error_account: '❌ 口座の名前を入力してください。例: `現金 USD` または `定期預金 16%`。',
    savings_error_name: '❌ 名前は 1〜{max} 文字で入力してください。',
    savings_goal_delete_confirm: '目標「{name}」を削除しますか？',
    savings_goal_delete_moves: '貯めた {amount} は共通の貯金に移ります — お金は失われません。',
    savings_button_goal_delete_yes: '🗑 はい、削除',
    savings_goal_deleted: '✅ 目標「{name}」を削除しました。',
    savings_forecast_title: '📈 *貯金の予測*',
    savings_now: '現在: *{amount}*',
    savings_rates_not_set: '⚙️ 利回りとインフレ率が未設定です — 予測をより正確にするには設定で入力してください。',
    savings_rate_yield_short: '利回り {value}%',
    savings_rate_inflation_short: 'インフレ {value}%',
    savings_rate_growth_short: '積立額の増加 年 {value}%',
    savings_forecast_need_monthly: '予測には毎月の積立額が必要です：少なくとも1か月分の収入を記録するか、設定で金額を手動入力してください。',
    savings_horizon_6: '半年後',
    savings_horizon_12: '1年後',
    savings_horizon_36: '3年後',
    savings_horizon_60: '5年後',
    savings_horizon_120: '10年後',
    savings_forecast_simple: '単純に貯めた場合: {amount}',
    savings_forecast_nominal: '利息と積立額の増加込み: {amount}',
    savings_forecast_real: '今日の価値で: {amount}',
    savings_forecast_depleted: '⚠️ このペースだと、貯金は {duration} で尽きます。',
    savings_forecast_legend: '💡「単純に貯めた場合」— 利息・インフレ・積立額の増加なし。「今日の価値で」— 現在の物価に換算した価値。',
    savings_settings_title: '⚙️ *予測の設定*',
    savings_setting_yield: '📈 利回り',
    savings_setting_inflation: '🔥 インフレ',
    savings_setting_growth: '⬆️ 積立額の増加',
    savings_rate_yearly: '年 {value}%',
    savings_rate_not_set: '考慮しない',
    savings_settings_hint: '💡 利回り — デフォルトの利率：新しい積立と独自の利率がない口座に適用されます（独自の利率は口座カードで設定）。インフレ — 物価（と目標額）が年にどれだけ上がるか。積立額の増加 — 貯める金額が年にどれだけ増えるか（例：昇給）。',
    savings_button_monthly: '📥 毎月の積立額',
    savings_button_monthly_auto: '🔄 自動で計算',
    savings_monthly_auto_set: '✅ 積立額は自動で計算されます：収入から支出を引いた額。',
    savings_prompt_monthly: '毎月いくら貯めていますか？例: `30000`（{currency}）。',
    savings_prompt_inflation: '年間インフレ率（%）、例: `8` または `7.5`（{max} まで）。`0` — 考慮しない。',
    savings_prompt_yield: '貯金の年利回り（%、預金金利）、例: `16`（{max} まで）。`0` — 考慮しない。',
    savings_prompt_growth: '積立額が年に何%増えるか、例: `5`（{max} まで）。`0` — 考慮しない。',
    savings_monthly_set: '✅ 積立額: 毎月 {amount}',
    savings_setting_saved: '✅ 保存しました',
    savings_error_amount: '❌ 金額を認識できません。数字を入力してください。例: `15000`。',
    savings_error_insufficient: '❌ 残高が足りません：貯金箱には {amount} です。',
    savings_error_rate: '❌ 0 から {max} までの数字を入力してください。例: `8` または `7.5`。',
    savings_error_date: '❌ 期限を認識できません。月と年 `12.2027` または日付 `31.12.2027` を入力してください — 未来の日付で。',
    savings_error_goal: '❌ 目標の金額と名前を入力してください。例: `1 500 000 車`。',
    savings_deposited: '✅ {amount} を入金しました',
    savings_withdrawn: '✅ {amount} を引き出しました',
    savings_balance_set: '✅ 金額を更新しました: {amount}',
    savings_transferred: '✅ {amount} を「{name}」に移動しました',
    savings_goal_created: '✅ 目標を作成しました。期限とモードは下のボタンで設定できます。',
    savings_goal_updated: '✅ 目標を更新しました',
    savings_deadline_set: '✅ 期限: {date}',
    savings_goal_achieved_notice: '🎉 目標「{name}」を達成しました！',
    savings_months: '{n}か月',
    savings_years: '{y}年',
    savings_years_months: '{y}年{m}か月',
    savings_button_new_debt: '💳 借入を追加',
    savings_net_worth: '⚖️ 純資産: *{amount}*（貯蓄 {assets} − 借入 {debts}）',
    savings_debt_owed: '残りの返済額: *{amount}*',
    savings_debt_rate: '📈 金利: 年 {value}%',
    savings_debt_no_rate: '📈 無利息',
    savings_debt_payment: '💵 返済額: 毎月 {amount}',
    savings_debt_payment_not_set: '💵 毎月の返済額は未設定',
    savings_debt_payoff: '📅 完済まで {duration}（{date}）',
    savings_debt_total_interest: '💸 利息の総額: ~{amount}',
    savings_debt_too_long: '⚠️ この返済額では完済まで50年以上かかります — 返済額を増やしてみましょう。',
    savings_debt_below_interest: '⚠️ 返済額が利息を下回っています — 借入が減りません。完済するには毎月 {amount} より多く返済してください。',
    savings_debt_no_payment: '💡 毎月の返済額を入力すると、完済時期を計算します。',
    savings_debt_no_payment_interest: '💡 毎月の返済額を入力すると、完済時期と利息の総額を計算します。現在、毎月 ~{amount} の利息がついています。',
    savings_debt_paid_off: '🎉 完済しました！',
    savings_button_debt_pay: '➖ 返済',
    savings_button_debt_increase: '➕ 借入を増やす',
    savings_button_debt_payment: '💵 毎月の返済額',
    savings_button_debt_rate: '📈 金利',
    savings_button_debt_delete: '🗑 借入を削除',
    savings_button_debt_no_payment: '🚫 返済額なし',
    savings_button_skip: '⏭ スキップ',
    savings_prompt_debt: '借入の名前と金額を送ってください 👇\n\n例: `住宅ローン 30 000 000 1,5%`、`クレジットカード 200000 15%`、`田中さんへの借金 50000`、`分割払い USD 1200`。通貨なし — *{currency}*。金利は `%` で指定（なし — 無利息）。',
    savings_prompt_debt_payment: '「{name}」の毎月の返済額は？ 例: `100000`（{currency}）。返済額から完済時期を計算します。`0` — 返済額なし。',
    savings_prompt_debt_pay: '「{name}」をいくら返済しますか？ 残り {amount}。\n\n_支出は記録されません — 借入の返済は通常すでに支出に含まれています。_',
    savings_prompt_debt_increase: '借入「{name}」をいくら増やしますか？ 現在 {amount}。',
    savings_prompt_debt_set: '「{name}」の残りの返済額は？ 正確な金額を送ってください。`0` — 完済。\n\n現在の記録: {amount}。',
    savings_prompt_debt_rate: '「{name}」の年利（%）。例: `12` または `29,9`（{max} まで）。`0` — 無利息。',
    savings_debt_created: '✅ 借入「{name}」を追加しました。',
    savings_debt_limit: '💳 すでに {limit} 件の借入があります — これが上限です。新しく追加するには完済したものを削除してください。',
    savings_error_debt: '❌ 名前と金額を送ってください。例: `住宅ローン 30 000 000 1,5%` または `田中さんへの借金 50000`。',
    savings_debt_error_overpay: '❌ 借入は {amount} だけです — それ以上は返済できません。',
    savings_debt_paid: '✅ {amount} を返済しました',
    savings_debt_increased: '✅ 借入が {amount} 増えました',
    savings_debt_set: '✅ 借入額を更新しました: {amount}',
    savings_debt_delete_confirm: '借入「{name}」を削除しますか？ お金はどこにも移動しません — 一覧から消えるだけです。',
    savings_debt_deleted: '✅ 借入「{name}」を削除しました。',
    savings_forecast_debts_now: '💳 借入: *{amount}* · 純資産: *{net}*',
    savings_forecast_debts: '借入: {amount}',
    savings_forecast_net_worth: '純資産: {amount}',
    savings_forecast_debts_note: '💳 借入は予定の返済額と金利で計算しています。返済額がない場合、借入は利息で増えます。借入の返済は普段の支出に含まれるとみなし、毎月の積立額にすでに反映されています。',
    income_not_found: '❌ 収入が見つかりません',
    income_currency_select: '普段受け取る通貨を選んでください。支出はメイン通貨のままです:',
    income_currency_set: '✅ 収入の通貨: {currency}',
    income_total: '💵 収入: *{amount}*',
    balance_label: '⚖️ 残高（収入 − 支出）: *{amount}*',
    income_error_format: '❌ 理解できませんでした。金額と説明（任意）を送信してください: `50000 給料` または `1000 USD 副業`',
    income_error_amount: '❌ 無効な金額です。0.01から{max}までの数値を入力してください。',

    // Recurring expenses
    button_recurring: '🔁 定期支出',
    button_add_recurring: '➕ 定期支出を追加',
    recurring_menu_title: '🔁 *定期支出*',
    recurring_menu_info: '毎月の支払い（家賃、サブスク、ローン）は、指定した日に自動で支出として記録されます。',
    recurring_menu_empty: '定期支出はまだありません。',
    recurring_item: '{icon} {description} — *{amount}*、毎月{day}日\n    次回の記録: {next}',
    recurring_monthly_total: '月合計: *{amount}*',
    recurring_enter_prompt: '定期支出の金額と説明を入力してください 👇\n\n例: `50000 家賃`\n金額の後に通貨を指定できます: `500 USD 家賃`',
    recurring_day_prompt: '毎月何日にこの支出を記録しますか？1から31までの数値を入力してください。\n\n月の日数が足りない場合は月末に記録します。',
    recurring_day_invalid: '❌ 1から31までの整数を入力してください。',
    recurring_select_category: '定期支出のカテゴリーを選択してください:',
    recurring_added: '✅ 定期支出を追加しました\n\n{description} — *{amount}*、毎月{day}日\n初回の記録: {next}',
    recurring_added_charged_now: '✅ 定期支出を追加し、今月分はすでに記録しました\n\n{description} — *{amount}*、毎月{day}日\n次回の記録: {next}',
    recurring_deleted: '✅ 定期支出を削除しました。記録済みの支出は履歴に残ります。',
    recurring_not_found: '❌ 定期支出が見つかりません',
    recurring_limit: '❌ 定期支出は最大{max}件までです',
    recurring_charged_notification: '🔁 定期支出を記録しました: {icon} {description} — *{amount}*',
    recurring_error_format: '❌ 形式を認識できません。金額と説明を送信してください: `50000 家賃` または `500 USD 家賃`',
    recurring_error_amount: '❌ 無効な金額です。0.01から{max}までの数値を入力してください。',

  button_overview: '📊 月の概要',
  button_today: '📅 今日',
  button_more: '☰ その他',
  more_menu_title: '☰ *その他*',
  button_export: '📤 CSV出力',
  keyboard_refreshed: '✅ メニューを更新しました — よりコンパクトになりました 👇',
  button_outdated: 'このボタンは古くなっています。下のメニューからもう一度開いてください。',
  overview_title: '概要: {range}',
  overview_spent: '💸 支出: *{amount}* · 記録: {count}',
  overview_upcoming: '今後の定期支出:',
  overview_income_hint: '💡 収入はプラスを付けて記録: `+50000 給料`',
  button_prev_period: '◀️ 前へ',
  button_next_period: '次へ ▶️',
  button_back_to_overview: '⬅️ 概要へ',
  day_title_today: '今日、{date}',
  day_title_yesterday: '昨日、{date}',
  day_title: '{date}',
  day_entry_hint: '支出をメッセージで送信: `250 コーヒー`',
  button_prev_day: '◀️ 前日',
  button_next_day: '翌日 ▶️',
  list_tap_number: '番号をタップして記録を開きます。',
  family_today_title: '家族: 今日の記録',
  button_undo: '↩️ 取り消し',
  button_delete_record: '🗑 削除',
  button_change_category: '🏷 カテゴリ',
  button_edit_record: '✏️ 編集',
  expense_family_label: '家族の予算に',
  expense_recurring_label: '自動で記録（定期支出）',
  expense_category_remembered: '🏷 同じ説明の前回の記録からカテゴリを選びました — 下のボタンで変更できます。',
  category_will_be_remembered: '💡 選択を覚えておきます: 次回から同様の記録はすぐこのカテゴリに入ります。',
  expense_category_changed: 'カテゴリ: {category}',
  settings_header: '設定',
  settings_currency_line: '💱 通貨: *{currency}* · 収入: *{incomeCurrency}*',
  settings_timezone_line: '🌍 タイムゾーン: {timezone}',
  settings_language_line: '🌐 言語: {language}',
  settings_period_line: '📅 期間は{day}日に始まります',
  settings_reminders_on_line: '🔔 リマインダー: オン（{hours}）',
  settings_reminders_off_line: '🔔 リマインダー: オフ',
  button_currencies: '💱 通貨',
  settings_currencies_text: '💱 *通貨*\n\nメイン — 支出とすべての合計はこの通貨で計算されます: *{currency}*\n収入のデフォルト通貨: *{incomeCurrency}*\n\nどの記録も他の通貨にできます — 金額の後にコードを付けてください: `20 USD タクシー`。',
  reminders_title: 'リマインダー',
  reminders_info: '選んだ時刻までに何も記録がなければ、お知らせします。1日最大3回。',
  button_reminders_on: '🟢 オン — タップでオフ',
  button_reminders_off: '⚫ オフ — タップでオン',
  family_teaser: '👨‍👩‍👧‍👦 *家族の予算*\n\n大切な人との共有支出を一か所に: 各自が記録し、統計とエクスポートは共有されます。\n\nプレミアムで利用できます。',
  button_premium: '⭐️ プレミアム',
    // Subscription and premium ending
    subscription_active_info: '🔁 月額サブスクリプションは{date}まで支払い済みで、自動更新されます。解約: Telegram → 設定 → スター → 登録状況（英語表示: Settings → My Stars → My subscriptions）。',
    subscription_renewed: '🔁 サブスクリプションが更新されました。プレミアムは{date}まで有効です。',
    button_view_tariffs: '⭐️ プラン',
    premium_expiring_trial: '⏳ プレミアムのお試し期間は{date}に終了します。\n\n終了後は予算、期間の詳細サマリー、カスタムカテゴリー、家族の予算、記録の編集が使えなくなります。記録したデータはすべて残り、支出の記録は無料です。',
    premium_expiring_paid: '⏳ プレミアムは{date}に終了します。事前に更新できます — 残りの日数は引き継がれます。',
    premium_expired_trial: '🌙 プレミアムのお試し期間が終了しました。支出と収入の記録は引き続き無料です。予算、詳細サマリー、カスタムカテゴリー、家族、記録の編集はプレミアムで利用できます。',
    premium_expired_paid: '🌙 プレミアムが終了しました。プロジェクトへのご支援ありがとうございました！いつでも更新できます。',
    premium_winback: '👋 プレミアムが終了して1週間が経ちました。予算、詳細サマリー、カスタムカテゴリー、家族の予算、記録の編集をまた使いたい場合は、下のプランをご覧ください。',
    start_reminders_note: '🔔 1日の間に何も記録しなかった場合、リマインドします（1日最大3回）。時間の変更やオフ: ☰ その他 → ⚙️ 設定 → 🔔。',

    // 予算
    button_budgets: '🎯 予算',
    budgets_title: '予算',
    budgets_empty: '月全体またはカテゴリーごとに上限を設定できます — 80%に達したときと上限を超えたときにお知らせします。',
    budgets_teaser: '🎯 *予算*\n\n月全体またはカテゴリーの上限: 進捗は概要に表示され、80%に達したときと上限を超えたときに通知が届きます。\n\nプレミアムで利用できます。',
    button_budget_total: '➕ 月全体',
    button_budget_category: '➕ カテゴリー',
    button_budget_change: '✏️ 金額を変更',
    budget_total_name: '🎯 月全体',
    budget_left: '残り {amount}',
    budget_over: '{amount} 超過',
    budget_enter_prompt: '「{name}」の期間の上限を入力してください 👇\n\n例: `10000`（*{currency}*）または `150 USD`',
    budget_amount_invalid: '❌ 金額だけを入力してください: `10000` または `150 USD`。',
    budget_saved: '✅ 予算を保存しました',
    budget_deleted: '✅ 予算を削除しました',
    budget_not_found: '❌ 予算が見つかりません',
    budget_warning_80: '⚠️ {name}: {limit} のうち {spent} を使用（{percent}%）',
    budget_warning_100: '🚨 {name}: 予算超過 — {limit} のうち {spent}（{percent}%）',
    overview_budget_of: '予算 {amount} のうち',

    // 期間のサマリー
    button_report: '📄 サマリー',
    report_title: 'サマリー: {range}',
    report_vs_previous: '前の期間との比較: {change}（前回 {amount}）',
    report_change_new: '新規',
    report_change_same: '変化なし',
    report_top_categories: '支出の多い項目:',
    report_locked: '🔒 詳細な内訳 — 全カテゴリーの前の期間との比較、予算、1日あたりの平均支出、最大の支出 — はプレミアムで利用できます。',
    report_categories_vs_previous: 'カテゴリー（前の期間との比較）:',
    report_categories_gone: '今回は支出なし: {list}',
    report_more_numbers: 'その他の数値:',
    report_per_day: '📅 1日あたりの平均: {amount}',
    report_largest: '🔝 最大の支出: {amount} — {description}（{date}）',
    overview_budget_limit: '上限 {amount}',
    report_title_current: '現時点のサマリー: {range}',
    input_canceled: '✅ キャンセルしました。いつも通り支出を記録できます。',
    no_active_state: '現在キャンセルするものはありません。',
    daily_summary_title: '1日のサマリー',
    daily_summary_info: '日次サマリー：夜に、今日いくら何に使ったかをお送りします。支出があった日のみです。',
    daily_summary_enabled: '✅ 日次サマリーをオンにしました',
    daily_summary_disabled: '⚫ 日次サマリーをオフにしました',
    daily_summary_hour_info: '日次サマリーのローカル時刻を選んでください:',
    daily_summary_hour_set: 'サマリーの時刻を保存しました',
    button_daily_summary_on: '🗓 サマリー: オン',
    button_daily_summary_off: '🗓 サマリー: オフ',
    settings_daily_summary_on_line: '🗓 日次サマリー: {time}',
    settings_daily_summary_off_line: '🗓 日次サマリー: オフ',
    export_title: '📤 CSVエクスポート\n\nファイルの期間を選択してください。',
    export_categories_all: '🗂 カテゴリー: すべて',
    export_categories_selected: '🗂 カテゴリー: {categories}',
    export_period_day: '📅 今日',
    export_period_week: '📅 過去7日間',
    export_period_current: '📅 現在の期間',
    export_period_previous: '📅 前の期間',
    export_period_all: '♾ 全期間',
    export_period_range: '🗓 日付を選択…',
    export_filter_categories: '🔽 カテゴリーで絞り込み',
    export_select_categories: 'エクスポートするカテゴリーを選択してください:',
    export_select_all: '✅ すべて選択',
    export_deselect_all: '❌ すべて解除',
    export_done: '✅ 完了',
    export_no_categories: 'カテゴリーを1つ以上選択してください',
    export_enter_dates: '🗓 日付の範囲を入力してください:\n`01.03.2026 - 15.03.2026`\n\nまたは1日のみ: `01.03.2026`',
    export_dates_invalid: '❌ 日付を読み取れませんでした。`01.03.2026 - 15.03.2026` または1日のみ `01.03.2026` の形式で入力してください。',
    export_dates_order: '❌ 開始日が終了日より後になっています。例: `01.03.2026 - 15.03.2026`',
    total_by_categories: 'カテゴリー別合計:',
    bot_short_description: '数タップで支出を記録：「250 コーヒー」と入力するだけ。収入、予算、月次まとめ、家族の家計簿。',
    bot_description: 'Telegramで支出と収入を管理できます。\n\n「250 コーヒー」と入力すると、支出が記録され、カテゴリーも記憶されます。\n\n• カテゴリー別の月間概要と前月との比較\n• 収入と残高：「+50000 給料」\n• 定期支出：家賃やサブスクを自動で記録\n• アラート付き予算、日次まとめ、リマインダー\n• 家族の家計簿、複数通貨、CSVエクスポート\n\n基本機能は無料です。新規ユーザーは14日間プレミアムをご利用いただけます。',
    command_start: 'メインメニュー',
    command_stats: '月間概要',
    command_history: '今日の記録',
    command_income: '収入と残高',
    command_recurring: '定期支出',
    command_export: 'CSVエクスポート',
    command_family: '家族の家計簿',
    command_settings: '設定',
    command_limits: 'サブスクとプレミアム',
    command_help: 'ヘルプ',
    command_cancel: '入力をキャンセル',
    command_paysupport: '支払いサポート',
    command_terms: '利用規約',
    command_privacy: 'プライバシーポリシー',
    payment_outdated: '⚠️ この請求書は古くなっています。価格が変更されました。もう一度プランを開いてください — /limits',
    security_validation_error: '⚠️ リクエストを処理できませんでした。もう一度お試しいただくか、/start でメニューを開いてください。',
    expense_draft_outdated: '⌛ この下書きは古くなっています。もう一度支出を送信してください。',
    family_invitation_hours_left: '⏰ 残り {hours} 時間',
    family_no_members: 'メンバーがいません',
    family_already_member: '❌ すでに家族に参加しています。',
    admin_bug_reports_all_title: '📝 すべてのバグ報告（最新 {count} 件）',
    admin_bug_reports_new_title: '🆕 新しいバグ報告（最新 {count} 件）',
    admin_bug_reports_empty: '報告はありません。',
    payment_subscription_already_active: '🔁 月額サブスクリプションはすでに有効です。2つ目は不要です。プレミアムを前もって延長するには、一回払いのプランをお選びください: /limits',
    payment_foreign_payer: '⚠️ この支払いリンクは別のユーザー向けに作成されたものです。ご自身でボットのプランを開いてください — /limits',
    premium_expired_granted: '🌙 プレミアムの期間が終了しました。支出と収入の記録は引き続き無料です。予算、詳細サマリー、カスタムカテゴリー、家族、記録の編集はプレミアムで利用できます。いつでも延長できます。'
};
