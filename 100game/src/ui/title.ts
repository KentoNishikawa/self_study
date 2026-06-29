import { isSoundEnabled, playButtonSe, resetSoundToDefault, startButtonSe, toggleSound } from "../core/sound";
import { AuthApiError, getMockAuthSession, loginWithEmailPassword, registerPendingUser } from "../core/authSession";
import { clearUserSettingsCache } from "../core/userSettings";
import { validatePlayerName } from "../core/nameValidation";

type TitleCardSpec = {
  rank: string;
  suit: "S" | "H" | "D" | "C";
  left: number;
  top: number;
  rotate: number;
  scale: number;
  faceDown?: boolean;
  blur?: number;
  opacity?: number;
  zIndex?: number;
};

const TITLE_CARD_SPECS: TitleCardSpec[] = [
  { rank: "A", suit: "S", left: 8, top: 66, rotate: -18, scale: 1.05, blur: 0.2, opacity: 0.92, zIndex: 1 },
  { rank: "K", suit: "H", left: 18, top: 58, rotate: -8, scale: 0.98, blur: 0.35, opacity: 0.9, zIndex: 2 },
  { rank: "10", suit: "D", left: 34, top: 74, rotate: 10, scale: 1.08, blur: 0.1, opacity: 0.94, zIndex: 3 },
  { rank: "7", suit: "C", left: 47, top: 60, rotate: -12, scale: 1.02, blur: 0.15, opacity: 0.9, zIndex: 4 },
  { rank: "Q", suit: "D", left: 58, top: 69, rotate: 14, scale: 0.96, blur: 0.3, opacity: 0.86, zIndex: 2 },
  { rank: "J", suit: "S", left: 70, top: 56, rotate: -10, scale: 1.04, blur: 0.2, opacity: 0.92, zIndex: 4 },
  { rank: "4", suit: "H", left: 79, top: 72, rotate: 18, scale: 0.95, blur: 0.45, opacity: 0.82, zIndex: 1 },
  { rank: "9", suit: "C", left: 88, top: 61, rotate: -16, scale: 1.0, blur: 0.25, opacity: 0.88, zIndex: 3 },
  { rank: "", suit: "S", left: 27, top: 51, rotate: 12, scale: 1.06, faceDown: true, blur: 0.55, opacity: 0.76, zIndex: 0 },
  { rank: "", suit: "S", left: 83, top: 52, rotate: 8, scale: 1.02, faceDown: true, blur: 0.65, opacity: 0.72, zIndex: 0 },
];

type TitleModalKey = "privacy" | "terms" | "credits" | "contact";
type AuthModalView = "login" | "register" | "verification";

type TitleModalContent = {
  title: string;
  bodyHtml: string;
  actionLabel?: string;
  actionNote?: string;
  actionDisabled?: boolean;
};

type LoginValues = {
  email: string;
  password: string;
};

type RegisterValues = {
  email: string;
  password: string;
  passwordConfirm: string;
  displayName: string;
  agreed: boolean;
};

type FormErrors<T extends string> = Partial<Record<T, string>>;

const SOUND_NOTICE_SHOWN_KEY = "100game.soundNoticeShown";
const MAX_DISPLAY_NAME_LENGTH = 15;
export const CONTACT_MAIL_ADDRESS = "support@acceble.com";

export const TERMS_LINES = [
  "利用規約",
  "本利用規約（以下「本規約」といいます。）は、Acceble（以下「当方」といいます。）が提供するゲームサービス「100GAME⁺」（以下「本サービス」といいます。）の利用条件を定めるものです。利用ユーザーの皆様（以下「ユーザー」といいます。）には、本規約に従って本サービスをご利用いただきます。",
  "第1条（適用）",
  "本規約は、ユーザーと当方との間の本サービスの利用に関する一切の関係に適用されます。",
  "当方は、本規約の同意がないことにより生じた一切の責任を負いません。",
  "第2条（利用条件）",
  "ユーザーは、本規約に同意の上、本サービスを利用するものとします。",
  "本サービスの利用には、インターネット接続環境および対応ブラウザが必要となります。これらの準備および通信費用等はユーザーの負担とします。",
  "第3条（アカウント機能について）",
  "本サービスでは、アカウント機能を提供する場合があります。",
  "当方は、アカウント機能の継続的提供または保存データの保持を保証するものではありません。",
  "当方は、アカウント機能の提供・運営、本サービスの改善、不正利用防止その他本サービスの運営に必要な範囲で、登録情報その他ユーザーに関するデータを取り扱うことがあります。",
  "ユーザーは、登録情報および保存データ等を自己の責任において適切に管理するものとします。",
  "ユーザーは、自己のアカウントを第三者に譲渡、貸与または共有してはなりません。",
  "第4条（禁止事項）",
  "ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。",
  "1. 法令または公序良俗に違反する行為",
  "2. 犯罪行為に関連する行為",
  "3. 本サービスの運営を妨害する行為",
  "4. 不正アクセスまたはこれを試みる行為",
  "5. 本サービスのバグ、不具合、仕様等を悪用する行為",
  "6. プログラムの解析、改ざん、リバースエンジニアリング等の行為",
  "7. 自動化ツール（BOT等）を用いた操作",
  "8. サーバーやネットワークに過度な負荷をかける行為",
  "9. 本サービスの情報を不正に収集・利用する行為（スクレイピング等）",
  "10. 本サービスを商用目的で利用する行為（当方が認めた場合を除く）",
  "11. 他のユーザーまたは第三者に不利益、損害、不快感を与える行為",
  "12. 当方または第三者になりすます行為（第12条参照）",
  "13. その他、当方が不適切と判断する行為",
  "当方は、上記違反行為が確認された場合、必要に応じて措置を行う場合があります。（第13条参照）",
  "第5条（SNS・動画配信について）",
  "ユーザーは、本サービスに関するプレイ動画、配信、画像、スクリーンショット等を、SNS、動画投稿サイト、配信サービス等へ投稿または配信することができます。",
  "また、個人による通常の動画投稿・配信活動の範囲内であれば、収益化を伴う活動を行うこともできます。",
  "ただし、以下に該当する内容は禁止します。",
  "1. 法令または公序良俗に違反する内容",
  "2. 当方または第三者の権利を侵害する内容",
  "3. 本サービスの運営を妨害する内容",
  "4. その他、当方が不適切と判断する内容  ",
  "当方は、上記違反行為が確認された場合、必要に応じて投稿・配信内容の削除等を求める場合があります。",
  "第6条（サービス内容の変更・終了）",
  "当方は、ユーザーへの事前の通知なく、アカウント機能その他新機能の追加を含む、本サービスの内容の変更、追加、終了を行うことができるものとします。",
  "第7条（サービス提供の停止・中断）",
  "当方は、以下の場合、事前の通知なく本サービスの全部または一部の提供を停止または中断することができます。",
  "1. システムの保守点検または更新を行う場合",
  "2. 災害、停電、通信障害、サーバー障害等が発生した場合",
  "3. 外部サービスの停止または障害により提供が困難となった場合",
  "4. その他、当方が本サービスの提供が困難と判断した場合",
  "第8条（有料機能について）",
  "当方は、本サービス内において有料機能または有料コンテンツを提供する場合があります。",
  "有料機能の内容、価格、利用条件等については、本サービス上または別途当方が定める方法により表示するものとします。",
  "未成年のユーザーは、保護者の同意を得た上で有料機能または有料コンテンツを利用できるものとします。",
  "購入済みの有料機能または有料コンテンツについては、原則として返金、交換またはキャンセルはできません。",
  "上記にかかわらず、ユーザーの意思によらない購入や決済不具合等により、返金、交換またはキャンセルに関して、個別の対応が必要となる場合には、当方のお問い合わせページ\nまたは、メールアドレス（第16条参照）宛にご連絡ください。内容を確認の上、必要に応じてご連絡いたします。",
  "第9条（保証の否認および免責事項）　",
  "当方は、本サービスについて、事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定目的適合性、セキュリティ等を含みます。）がないことを保証しません。",
  "当方は、本サービスが常時利用可能であること、エラーや不具合が発生しないこと、またはそれらが修正されることを保証しません。",
  "当方は、本サービスの提供・運営、改善、不正利用防止その他必要な範囲で、ユーザーに関するデータを取り扱うことがあります。",
  "本サービスの利用または利用不能によりユーザーに生じた損害（データ消失、機器の故障、通信障害による損害等を含みますがこれらに限りません。）について、当方に故意または重過失がある場合を除き、責任を負いません。",
  "本サービスにおけるデータの保存について保証するものではなく、ユーザーのゲーム進行状況やデータが消失した場合についても、当方に故意または重過失がある場合を除き、責任を負いません。",
  "本サービスの利用は、ユーザー自身の責任において行うものとします。",
  "当方が何らかの理由により責任を負う場合であっても、その責任は、直接かつ通常の損害に限られるものとします。",
  "第10条（外部サービスおよび環境）",
  "本サービスは、ユーザーの利用環境（端末、ブラウザ、通信回線等）に依存して正常に動作しない場合があります。",
  "当方は、ユーザーの利用環境に起因する不具合について責任を負いません。",
  "本サービスに関連して外部サービス（広告配信サービス、決済サービス等）が利用される場合がありますが、当該サービスの内容や提供について当方は責任を負いません。",
  "第11条（広告について）",
  "当方は、本サービス上に第三者による広告を表示する場合があります。広告の内容および広告先のサービスについては、広告主または各提供元の責任により提供されるものであり、当方はその内容について責任を負いません。",
  "第12条（知的財産権）",
  "本サービスに関する著作権、商標権その他の知的財産権は、当方または正当な権利を有する第三者に帰属します。",
  "第13条（利用制限）",
  "当方は、ユーザーが本規約に違反した場合または当方が不適切と判断した場合、事前の通知なく、本サービスの利用を制限、停止その他必要な措置を行うことができます。\nまた、当方に損害が生じた場合には、必要に応じて法的措置を含む対応を行う場合があります。",
  "第14条（規約の変更）",
  "当方は、必要と判断した場合、本規約を変更することができます。変更後の規約は、本サービス上に掲載した時点で効力を生じるものとし、ユーザーが本サービスを継続して利用した場合、当該変更に同意したものとみなします。",
  "第15条（準拠法・管轄）",
  "本サービスに関連してユーザーと当方との間で生じた紛争については、誠意をもって協議し解決を図るものとします。",
  "本規約の解釈にあたっては、日本法を準拠法とします。",
  "本サービスに関して紛争が生じた場合には、当方の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。",
  "第16条（お問い合わせ）",
  "本規約および本サービスに関するお問い合わせは、当方のお問い合わせページ\nまたは、下記メールアドレス宛にご連絡ください。",
  "support@acceble.com",
  "【制定日】2026年◯月◯日",
  "【事業者名】Acceble"
] as const;

export const PRIVACY_LINES = [
  "プライバシーポリシー",
  "Acceble（以下「当方」といいます。）は、「100GAME⁺」（以下「本サービス」といいます。）におけるユーザーの情報の取扱いについて、以下のとおり定めます。",
  "第1条（運営者）",
  "本サービスは、当方によって運営されています。",
  "第2条（取得する情報）",
  "当方は、本サービスにおいて、以下の情報を取得する場合があります。",
  "1. お問い合わせフォームにユーザーが入力した情報（名前、メールアドレス、お問い合わせ内容等）",
  "2. IPアドレス、ブラウザ情報、端末情報",
  "3. ゲームの利用状況に関する各種情報",
  "4. ユーザーID、メールアドレス、保存データ等のアカウントに関する各種情報",
  "第3条（利用目的）",
  "取得した情報は、以下の目的で利用します。",
  "1. お問い合わせへの対応",
  "2. 本サービスの提供、維持、改善",
  "3. 不正行為の防止および対応",
  "4. 本サービスの品質向上および利用状況の分析",
  "5. 法的必要性が発生した際への対応",
  "第4条（外部サービスへのデータ送信）",
  "当方は、本サービスの運営にあたり、以下の目的で外部サービスを利用する場合があります。",
  "1. アクセス解析",
  "2. アカウント情報の保持",
  "3. ゲーム内システムに関する情報の保持",
  "4. お問い合わせフォームにて頂いた内容の送受信",
  "これらのサービスにおいて、ユーザーのアクセス情報等が、日本国外に所在するサーバーへ送信、保存される場合があります。",
  "上記は、本サービスの提供、改善、利用状況の分析のために必要な範囲で行われます。",
  "また、情報の取扱いについては、各外部サービスのプライバシーポリシーに従うものとします。",
  "第5条（情報の管理）",
  "当方は、取得した情報について、不正アクセス、紛失、漏洩、改ざん等を防止するため、合理的な安全対策を講じます。",
  "取得した情報は、利用目的の達成に必要な期間に限り保持し、その後適切に削除または匿名化します。",
  "また、本サービスでは、サービス提供およびデータ保存のためにデータベース等の外部システムを利用する場合があります。",
  "第6条（第三者提供）",
  "当方は、法令に基づく場合を除き、取得した情報を第三者に提供することはありません。",
  "第7条（ユーザーの権利）",
  "ユーザーは、当方が保有する自己の情報について、開示、訂正、削除または利用停止を求めることができます。",
  "その際は、本人確認を行った上で適切に対応いたします。",
  "ただし、法令上の義務や技術的制約により、すべての請求に応じられない場合があります。",
  "第8条（ポリシーの変更）",
  "当方は、必要と判断した場合、本ポリシーを変更することができます。",
  "変更後のポリシーは、本サービス上に掲載した時点で効力を生じるものとします。",
  "第9条（お問い合わせ）",
  "本ポリシーに関するお問い合わせは、当方のお問い合わせページ\nまたは、下記メールアドレス宛にご連絡ください。",
  "support@acceble.com",
  "【制定日】2026年〇月〇日",
  "【事業者名】Acceble"
] as const;

function hasShownSoundNotice() {
  try {
    return sessionStorage.getItem(SOUND_NOTICE_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSoundNoticeShown() {
  try {
    sessionStorage.setItem(SOUND_NOTICE_SHOWN_KEY, "1");
  } catch { }
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRegisterPassword(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{7,}$/.test(password);
}

function renderLineBreaks(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

export function renderLegalBody(lines: readonly string[]) {
  return lines.slice(1).map((line) => {
    if (line === CONTACT_MAIL_ADDRESS) {
      return `<p><a href="mailto:${CONTACT_MAIL_ADDRESS}">${CONTACT_MAIL_ADDRESS}</a></p>`;
    }

    const isContactLine =
      line.startsWith("本規約および本サービスに関するお問い合わせは、当方のお問い合わせページ") ||
      line.startsWith("本ポリシーに関するお問い合わせは、当方のお問い合わせページ");

    if (isContactLine) {
      const html = renderLineBreaks(line).replace(
        "お問い合わせページ",
        `<button class="titleInfoInlineLink" type="button" data-title-contact-link="1">お問い合わせページ</button>`,
      );
      return `<p>${html}</p>`;
    }

    if (/^第\d+条/.test(line)) {
      return `<h3>${escapeHtml(line)}</h3>`;
    }

    if (line.startsWith("【")) {
      return `<p><small>${escapeHtml(line)}</small></p>`;
    }

    return `<p>${renderLineBreaks(line)}</p>`;
  }).join("");
}

function titleSuitSymbol(suit: TitleCardSpec["suit"]) {
  switch (suit) {
    case "S":
      return "♠";
    case "H":
      return "♥";
    case "D":
      return "♦";
    case "C":
      return "♣";
  }
}

function titleSuitColor(suit: TitleCardSpec["suit"]) {
  return suit === "H" || suit === "D" ? "#c53d52" : "#1c2230";
}

function renderTitleCardSvg(card: TitleCardSpec) {
  if (card.faceDown) {
    return `
      <svg viewBox="0 0 140 200" class="titleBgCardSvg" aria-hidden="true">
        <rect x="4" y="4" width="132" height="192" rx="14" fill="#f6f7fb" stroke="rgba(18,22,30,0.35)" stroke-width="2" />
        <rect x="15" y="15" width="110" height="170" rx="10" fill="#9d202a" />
        <rect x="20" y="20" width="100" height="160" rx="8" fill="#c73945" opacity="0.92" />
        <path d="M20 40h100M20 80h100M20 120h100M20 160h100M40 20v160M80 20v160" stroke="rgba(255,255,255,0.22)" stroke-width="3" />
        <rect x="32" y="32" width="76" height="136" rx="8" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" />
        <path d="M70 58l18 18-18 18-18-18 18-18zm0 48l18 18-18 18-18-18 18-18z" fill="rgba(255,255,255,0.28)" />
      </svg>
    `;
  }

  const suit = titleSuitSymbol(card.suit);
  const color = titleSuitColor(card.suit);
  const rank = card.rank;
  const rankFontSize = rank.length >= 2 ? 19 : 22;
  const suitFontSize = rank.length >= 2 ? 18 : 20;

  return `
    <svg viewBox="0 0 140 200" class="titleBgCardSvg" aria-hidden="true">
      <rect x="4" y="4" width="132" height="192" rx="14" fill="#f7f7fa" stroke="rgba(18,22,30,0.35)" stroke-width="2" />
      <rect x="10" y="10" width="120" height="180" rx="12" fill="#fffdfb" opacity="0.94" />
      <g fill="${color}" style="paint-order:stroke;stroke:rgba(255,255,255,0.16);stroke-width:0.35;">
        <text x="18" y="32" font-size="${rankFontSize}" font-weight="900" font-family="Georgia, serif">${rank}</text>
        <text x="18" y="52" font-size="${suitFontSize}" font-family="Georgia, serif">${suit}</text>
        <g transform="rotate(180 112 168)">
          <text x="112" y="168" text-anchor="end" font-size="${rankFontSize}" font-weight="900" font-family="Georgia, serif">${rank}</text>
          <text x="112" y="188" text-anchor="end" font-size="${suitFontSize}" font-family="Georgia, serif">${suit}</text>
        </g>
        <text x="70" y="116" text-anchor="middle" font-size="54" font-family="Georgia, serif">${suit}</text>
      </g>
    </svg>
  `;
}

function renderTitleBackdropCards() {
  return TITLE_CARD_SPECS.map((card, index) => {
    const style = [
      `left:${card.left}%`,
      `top:${card.top}%`,
      `transform:translate(-50%, -50%) rotate(${card.rotate}deg) scale(${card.scale})`,
      `filter:blur(${card.blur ?? 0}px)`,
      `opacity:${card.opacity ?? 1}`,
      `z-index:${card.zIndex ?? index}`,
    ].join(";");

    return `<div class="titleBgCard" style="${style}">${renderTitleCardSvg(card)}</div>`;
  }).join("");
}

const TITLE_MODAL_CONTENT: Record<TitleModalKey, TitleModalContent> = {
  privacy: {
    title: "プライバシーポリシー",
    bodyHtml: renderLegalBody(PRIVACY_LINES),
  },
  terms: {
    title: "利用規約",
    bodyHtml: renderLegalBody(TERMS_LINES),
  },
  credits: {
    title: "クレジット",
    bodyHtml: `
      <p><strong>タイトル</strong><br>100GAME⁺(100ゲームプラス)</p>
      <p><strong>制作</strong><br>Acceble</p>
      <p><strong>企画</strong><br>西川 拳人</p>
      <p><strong>開発</strong><br>西川 拳人<br>車田 恭輔</p>
      <p><strong>イラスト提供</strong><br>Shake</p>
      <p><strong>サービス運用設計</strong><br>野上 玲旺</p>
      <p><strong>使用技術</strong><br>TypeScript / Vite / Cloudflare</p>
      <p><strong>お問い合わせ</strong><br><a href="mailto:${CONTACT_MAIL_ADDRESS}">${CONTACT_MAIL_ADDRESS}</a></p>
      <p>© 2026 Acceble. All Rights Reserved.</p>
      <p><small>Version 1.0.0</small></p>
    `,
  },
  contact: {
    title: "お問い合わせ",
    bodyHtml: `
      <p>100GAME⁺に関する不具合報告、ご意見・ご要望、その他のお問い合わせは専用ページからお送りください。</p>
      <p>いただいた内容を確認のうえ、必要に応じて運営より返信する場合があります。</p>
      <p><a href="./contact.html">お問い合わせページはこちら</a></p>
      <p>※現在のタブでお問い合わせページへ移動します。</p>
    `,
  },
};

function renderFieldError(message?: string) {
  const content = message ? escapeHtml(message) : "&nbsp;";
  const emptyClass = message ? "" : " is-empty";
  return `<div class="titleAuthError${emptyClass}" aria-live="polite">${content}</div>`;
}

function validateLogin(values: LoginValues): FormErrors<"email" | "password"> {
  const errors: FormErrors<"email" | "password"> = {};
  const email = values.email.trim();

  if (!email) errors.email = "メールアドレスを入力してください。";
  else if (!isValidEmail(email)) errors.email = "メールアドレスの形式が正しくありません。";

  if (!values.password) errors.password = "パスワードを入力してください。";

  return errors;
}

function validateRegister(values: RegisterValues): FormErrors<"email" | "password" | "passwordConfirm" | "displayName" | "agreed"> {
  const errors: FormErrors<"email" | "password" | "passwordConfirm" | "displayName" | "agreed"> = {};
  const email = values.email.trim();
  const displayName = values.displayName.trim();

  if (!email) errors.email = "メールアドレスを入力してください。";
  else if (!isValidEmail(email)) errors.email = "メールアドレスの形式が正しくありません。";

  if (!values.password) errors.password = "パスワードを入力してください。";
  else if (!isValidRegisterPassword(values.password)) errors.password = "パスワードは英字・数字・記号を含む7文字以上で入力してください。";

  if (!values.passwordConfirm) errors.passwordConfirm = "確認用パスワードを入力してください。";
  else if (values.password !== values.passwordConfirm) errors.passwordConfirm = "パスワードが一致しません。";

  const nameResult = validatePlayerName(displayName);
  if (nameResult === "empty") errors.displayName = "表示名を入力してください。";
  else if (displayName.length > MAX_DISPLAY_NAME_LENGTH) errors.displayName = `表示名は${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください。`;
  else if (nameResult === "ng") errors.displayName = "この表示名は使用できません。別の名前を入力してください。";

  if (!values.agreed) errors.agreed = "利用規約およびプライバシーポリシーへの同意が必要です。";

  return errors;
}

export function renderTitle(
  app: HTMLDivElement,
  handlers: {
    onStart: () => void | Promise<void>;
    onGuestStart: () => void;
    onLoginSuccess: (email: string) => void;
    onLogout: () => void;
    onOpenPasswordReset: () => void;
  },
) {
  let authModalView: AuthModalView = "login";
  let loginValues: LoginValues = { email: "", password: "" };
  let loginErrors: FormErrors<"email" | "password"> = {};

  let registerValues: RegisterValues = { email: "", password: "", passwordConfirm: "", displayName: "", agreed: false };
  let registerErrors: FormErrors<"email" | "password" | "passwordConfirm" | "displayName" | "agreed"> = {};

  app.innerHTML = `
    <div class="titleScreen">
      <div class="titleBackdrop" aria-hidden="true">
        <img class="titleMainVisual" src="/assets/title-illustrations/00_title_load.png" alt="" />
        <div class="titleBackdropAmbient"></div>
        <div class="titleBackdropTable"></div>
        <div class="titleBackdropCards">${renderTitleBackdropCards()}</div>
        <div class="titleBackdropShade"></div>
      </div>

      <div class="titleTopLinks" aria-label="タイトルメニュー">
        <button class="titleTopLink" type="button" data-modal-key="privacy">プライバシーポリシー</button>
        <span class="titleTopLinkDivider" aria-hidden="true">｜</span>
        <button class="titleTopLink" type="button" data-modal-key="terms">利用規約</button>
        <span class="titleTopLinkDivider" aria-hidden="true">｜</span>
        <button class="titleTopLink" type="button" data-modal-key="credits">クレジット</button>
        <span class="titleTopLinkDivider" aria-hidden="true">｜</span>
        <button class="titleTopLink" type="button" data-modal-key="contact">お問い合わせ</button>
      </div>

      <div class="titleMenuAnchor">
        <button id="titleSoundBtn" class="soundBtn titleSoundBtn" type="button" aria-label="音の切り替え">🔊</button>
        <button id="titleMenuBtn" class="titleMenuBtn" type="button" aria-label="メニュー" aria-expanded="false">≡</button>
      </div>

      <div id="titleMenuOverlay" class="titleMenuOverlay" aria-hidden="true">
        <div id="titleMenuPanel" class="titleMenuPanel" role="menu" aria-label="タイトルメニュー">
          <div class="titleMenuPanelHead">
            <div class="titleMenuPanelTitle">MENU</div>
            <button id="titleMenuClose" class="titleMenuClose" type="button" aria-label="メニューを閉じる">×</button>
          </div>
          <button class="titleMenuItem" type="button" data-modal-key="privacy">プライバシーポリシー</button>
          <button class="titleMenuItem" type="button" data-modal-key="terms">利用規約</button>
          <button class="titleMenuItem" type="button" data-modal-key="credits">クレジット</button>
          <button class="titleMenuItem" type="button" data-modal-key="contact">お問い合わせ</button>
        </div>
      </div>

      <div id="titleAuthStage" class="titleHero" aria-live="polite"></div>

      <div id="titleInfoModal" class="titleInfoModal" aria-hidden="true">
        <div id="titleInfoDialog" class="titleInfoDialog" role="dialog" aria-modal="true" aria-labelledby="titleInfoHeading">
          <div class="titleInfoHeader">
            <div id="titleInfoHeading" class="titleInfoHeading"></div>
          </div>
          <div id="titleInfoBody" class="titleInfoBody"></div>
          <div id="titleInfoAction" class="titleInfoAction" style="display:none;">
            <button id="titleInfoActionBtn" class="btn titleInfoActionBtn" type="button"></button>
            <div id="titleInfoActionNote" class="titleInfoActionNote"></div>
          </div>
          <div class="titleInfoFooter">
            <button id="titleInfoClose" class="btn" type="button">閉じる</button>
          </div>
        </div>
      </div>

      <div id="titleLoginModal" class="noticeModalOverlay titleLoginModal" aria-hidden="true">
        <div id="titleLoginDialog" class="noticeModalDialog is-compact titleLoginDialog" role="dialog" aria-modal="true" aria-labelledby="titleLoginHeading">
          <div class="noticeModalHeader">
            <div id="titleLoginHeading" class="noticeModalHeading">ログインしてプレイ</div>
          </div>
          <div id="titleAuthModalBody" class="noticeModalBody titleAuthForm"></div>
          <div id="titleAuthModalFooter" class="noticeModalFooter titleAuthModalFooter">
            <button id="titleLoginClose" class="btn secondary" type="button">閉じる</button>
          </div>
        </div>
      </div>

      <div id="titleGuestConfirmModal" class="noticeModalOverlay" aria-hidden="true">
        <div id="titleGuestConfirmDialog" class="noticeModalDialog is-compact" role="dialog" aria-modal="true" aria-labelledby="titleGuestConfirmHeading">
          <div class="noticeModalHeader">
            <div id="titleGuestConfirmHeading" class="noticeModalHeading">ログインせずプレイしますか？</div>
          </div>
          <div class="noticeModalBody is-center">
            <p>ログインせずにプレイする場合、戦績・称号・アイコン等の取得状況は保存されません。</p>
            <p>ログイン後にゲストプレイ中の内容を引き継ぐことはできません。</p>
          </div>
          <div class="noticeModalFooter titleGuestConfirmFooter">
            <button id="titleGuestConfirmStart" class="btn" type="button">ログインせずプレイ</button>
            <button id="titleGuestConfirmCancel" class="btn secondary" type="button">キャンセル</button>
          </div>
        </div>
      </div>

      <div id="titleSoundNoticeModal" class="noticeModalOverlay" aria-hidden="true">
        <div id="titleSoundNoticeDialog" class="noticeModalDialog is-compact" role="dialog" aria-modal="true" aria-labelledby="titleSoundNoticeHeading">
          <div class="noticeModalHeader">
            <div id="titleSoundNoticeHeading" class="noticeModalHeading">ご案内</div>
          </div>
          <div class="noticeModalBody is-center">
            <p>このゲームでは音が発生します</p>
            <p>画面右上の音ON/OFFボタンやブラウザのタブごとのミュート機能などで調整できます</p>
          </div>
          <div class="noticeModalFooter">
            <button id="titleSoundNoticeClose" class="btn" type="button">閉じる</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const authStage = app.querySelector<HTMLDivElement>("#titleAuthStage");
  const soundBtn = app.querySelector<HTMLButtonElement>("#titleSoundBtn");
  const menuBtn = app.querySelector<HTMLButtonElement>("#titleMenuBtn");
  const menuOverlay = app.querySelector<HTMLDivElement>("#titleMenuOverlay");
  const menuPanel = app.querySelector<HTMLDivElement>("#titleMenuPanel");
  const menuClose = app.querySelector<HTMLButtonElement>("#titleMenuClose");
  const modal = app.querySelector<HTMLDivElement>("#titleInfoModal");
  const modalDialog = app.querySelector<HTMLDivElement>("#titleInfoDialog");
  const loginModal = app.querySelector<HTMLDivElement>("#titleLoginModal");
  const loginDialog = app.querySelector<HTMLDivElement>("#titleLoginDialog");
  const authModalBody = app.querySelector<HTMLDivElement>("#titleAuthModalBody");
  const authModalFooter = app.querySelector<HTMLDivElement>("#titleAuthModalFooter");
  const loginHeading = app.querySelector<HTMLDivElement>("#titleLoginHeading");
  const loginClose = app.querySelector<HTMLButtonElement>("#titleLoginClose");
  const guestConfirmModal = app.querySelector<HTMLDivElement>("#titleGuestConfirmModal");
  const guestConfirmDialog = app.querySelector<HTMLDivElement>("#titleGuestConfirmDialog");
  const guestConfirmStart = app.querySelector<HTMLButtonElement>("#titleGuestConfirmStart");
  const guestConfirmCancel = app.querySelector<HTMLButtonElement>("#titleGuestConfirmCancel");
  const soundNoticeModal = app.querySelector<HTMLDivElement>("#titleSoundNoticeModal");
  const soundNoticeDialog = app.querySelector<HTMLDivElement>("#titleSoundNoticeDialog");
  const soundNoticeClose = app.querySelector<HTMLButtonElement>("#titleSoundNoticeClose");
  const modalHeading = app.querySelector<HTMLDivElement>("#titleInfoHeading");
  const modalBody = app.querySelector<HTMLDivElement>("#titleInfoBody");
  const modalAction = app.querySelector<HTMLDivElement>("#titleInfoAction");
  const modalActionBtn = app.querySelector<HTMLButtonElement>("#titleInfoActionBtn");
  const modalActionNote = app.querySelector<HTMLDivElement>("#titleInfoActionNote");
  const modalClose = app.querySelector<HTMLButtonElement>("#titleInfoClose");
  const menuItems = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-modal-key]"));

  if (
    !authStage ||
    !soundBtn ||
    !menuBtn ||
    !menuOverlay ||
    !menuPanel ||
    !menuClose ||
    !modal ||
    !modalDialog ||
    !loginModal ||
    !loginDialog ||
    !authModalBody ||
    !authModalFooter ||
    !loginHeading ||
    !loginClose ||
    !guestConfirmModal ||
    !guestConfirmDialog ||
    !guestConfirmStart ||
    !guestConfirmCancel ||
    !soundNoticeModal ||
    !soundNoticeDialog ||
    !soundNoticeClose ||
    !modalHeading ||
    !modalBody ||
    !modalAction ||
    !modalActionBtn ||
    !modalActionNote ||
    !modalClose
  ) {
    throw new Error("title screen elements not found");
  }

  const authStageEl = authStage;
  const loginDialogEl = loginDialog;
  const authModalBodyEl = authModalBody;
  const loginHeadingEl = loginHeading;
  const authModalFooterEl = authModalFooter;
  const loginCloseEl = loginClose;

  const updateSoundButton = () => {
    soundBtn.textContent = isSoundEnabled() ? "🔊" : "🔇";
  };

  updateSoundButton();

  const goContactPage = () => {
    setModalOpen(false);
    window.location.href = new URL("./contact.html", window.location.href).toString();
  };

  const setMenuOpen = (open: boolean) => {
    menuOverlay.classList.toggle("is-open", open);
    menuOverlay.setAttribute("aria-hidden", open ? "false" : "true");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");

    if (!open) return;

    const isMobileMenu = window.matchMedia?.("(orientation: portrait) and (max-width: 820px)")?.matches ?? false;
    if (isMobileMenu) {
      menuPanel.style.top = "";
      menuPanel.style.left = "";
      menuPanel.style.right = "";
      return;
    }

    const rect = menuBtn.getBoundingClientRect();
    const panelWidth = menuPanel.offsetWidth;
    menuPanel.style.top = `${Math.max(12, rect.top)}px`;
    menuPanel.style.left = `${Math.max(12, rect.right - panelWidth)}px`;
    menuPanel.style.right = "auto";
  };

  const closeMenu = () => setMenuOpen(false);

  const setModalOpen = (open: boolean) => {
    modal.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const setLoginOpen = (open: boolean, view: AuthModalView = "login") => {
    if (open) {
      authModalView = view;
      if (view === "login") loginErrors = {};
      if (view === "register") registerErrors = {};
      renderAuthModalBody();
    }
    loginModal.classList.toggle("is-open", open);
    loginModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const setGuestConfirmOpen = (open: boolean) => {
    guestConfirmModal.classList.toggle("is-open", open);
    guestConfirmModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const closeGuestConfirm = () => {
    setGuestConfirmOpen(false);
  };

  const setSoundNoticeOpen = (open: boolean) => {
    soundNoticeModal.classList.toggle("is-open", open);
    soundNoticeModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const closeSoundNotice = () => {
    markSoundNoticeShown();
    setSoundNoticeOpen(false);
  };

  const openMessageModal = (title: string, message: string) => {
    modalHeading.textContent = title;
    modalBody.innerHTML = `<p>${escapeHtml(message)}</p>`;
    modalAction.style.display = "none";
    modalActionBtn.textContent = "";
    modalActionBtn.disabled = false;
    modalActionNote.textContent = "";
    modalActionNote.style.display = "none";
    setModalOpen(true);
  };

  const openModal = (key: TitleModalKey) => {
    const content = TITLE_MODAL_CONTENT[key];
    modalHeading.textContent = content.title;
    modalBody.innerHTML = content.bodyHtml;

    const contactLinks = Array.from(modalBody.querySelectorAll<HTMLButtonElement>("[data-title-contact-link]"));
    for (const link of contactLinks) {
      link.addEventListener("click", () => {
        playButtonSe();
        goContactPage();
      });
    }

    if (content.actionLabel) {
      modalAction.style.display = "grid";
      modalActionBtn.textContent = content.actionLabel;
      modalActionBtn.disabled = !!content.actionDisabled;
      modalActionNote.textContent = content.actionNote ?? "";
      modalActionNote.style.display = content.actionNote ? "block" : "none";
    } else {
      modalAction.style.display = "none";
      modalActionBtn.textContent = "";
      modalActionBtn.disabled = false;
      modalActionNote.textContent = "";
      modalActionNote.style.display = "none";
    }

    setModalOpen(true);
  };

  function renderTitleHome() {
    const authSession = getMockAuthSession();

    if (authSession) {
      return `
        <h1 class="appTitle titleHeroLogo">100GAME⁺</h1>
        <div class="titleHeroKana">100ゲームプラス</div>
        <button id="titleAuthenticatedStartBtn" class="btn titleStartBtn" type="button">プレイする</button>
        <button id="titleLogoutBtn" class="titleGuestBtn titleLogoutBtn" type="button">ログアウトする</button>
      `;
    }

    return `
      <h1 class="appTitle titleHeroLogo">100GAME⁺</h1>
      <div class="titleHeroKana">100ゲームプラス</div>
      <button id="titleLoginOpenBtn" class="btn titleStartBtn" type="button">ログインしてプレイする</button>
      <button id="titleGuestBtn" class="titleGuestBtn" type="button">ログインせずプレイ</button>
    `;
  }

  function renderAuthStage() {
    authStageEl.innerHTML = renderTitleHome();
    bindTitleHomeEvents();
  }

  function readLoginValues() {
    loginValues = {
      email: app.querySelector<HTMLInputElement>("#titleLoginEmail")?.value ?? "",
      password: app.querySelector<HTMLInputElement>("#titleLoginPassword")?.value ?? "",
    };
  }

  function readRegisterValues() {
    registerValues = {
      email: app.querySelector<HTMLInputElement>("#titleRegisterEmail")?.value ?? "",
      password: app.querySelector<HTMLInputElement>("#titleRegisterPassword")?.value ?? "",
      passwordConfirm: app.querySelector<HTMLInputElement>("#titleRegisterPasswordConfirm")?.value ?? "",
      displayName: app.querySelector<HTMLInputElement>("#titleRegisterDisplayName")?.value ?? "",
      agreed: app.querySelector<HTMLInputElement>("#titleRegisterAgreed")?.checked ?? false,
    };
  }

  function renderLoginForm() {
    loginHeadingEl.textContent = "ログインしてプレイ";
    authModalFooterEl.style.display = "flex";
    loginCloseEl.textContent = "閉じる";

    authModalBodyEl.innerHTML = `
      <form id="titleLoginForm" class="titleAuthForm" novalidate>
        <label class="titleAuthField">
          <span>メールアドレス</span>
          <input id="titleLoginEmail" type="email" value="${escapeHtml(loginValues.email)}" autocomplete="email" placeholder="example@example.com" />
          ${renderFieldError(loginErrors.email)}
        </label>

        <label class="titleAuthField">
          <span>パスワード</span>
          <input id="titleLoginPassword" type="password" value="${escapeHtml(loginValues.password)}" autocomplete="current-password" placeholder="パスワード" />
          ${renderFieldError(loginErrors.password)}
        </label>

        <button class="btn titleAuthPrimaryBtn" type="submit">ログイン</button>

        <div class="titleAuthLinks">
          <button id="titleOpenRegisterBtn" class="titleAuthTextLink" type="button">新規登録はこちら</button>
          <button id="titleOpenPasswordResetBtn" class="titleAuthTextLink" type="button">パスワードを忘れた場合はこちら</button>
        </div>
      </form>
    `;

    app.querySelector<HTMLFormElement>("#titleLoginForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      readLoginValues();
      loginValues = { email: loginValues.email.trim(), password: loginValues.password };
      loginErrors = validateLogin(loginValues);

      if (Object.keys(loginErrors).length > 0) {
        renderLoginForm();
        return;
      }

      startButtonSe();
      loginWithEmailPassword(loginValues)
        .then((result) => {
          setLoginOpen(false);
          handlers.onLoginSuccess(result.email);
        })
        .catch((error: unknown) => {
          const authError = error instanceof AuthApiError ? error : new AuthApiError("ログインに失敗しました。");
          loginErrors = {
            email: authError.fieldErrors.email,
            password: authError.fieldErrors.password ?? authError.message,
          };
          renderLoginForm();
        });
    });

    app.querySelector<HTMLButtonElement>("#titleOpenRegisterBtn")?.addEventListener("click", () => {
      playButtonSe();
      authModalView = "register";
      registerErrors = {};
      renderAuthModalBody();
    });

    app.querySelector<HTMLButtonElement>("#titleOpenPasswordResetBtn")?.addEventListener("click", () => {
      playButtonSe();
      setLoginOpen(false);
      handlers.onOpenPasswordReset();
    });
  }

  function renderRegisterForm() {
    loginHeadingEl.textContent = "新規登録";
    authModalFooterEl.style.display = "flex";
    loginCloseEl.textContent = "閉じる";

    authModalBodyEl.innerHTML = `
      <form id="titleRegisterForm" class="titleAuthForm" novalidate>
        <label class="titleAuthField">
          <span>メールアドレス</span>
          <input id="titleRegisterEmail" type="email" value="${escapeHtml(registerValues.email)}" autocomplete="email" placeholder="example@example.com" />
          ${renderFieldError(registerErrors.email)}
        </label>

        <label class="titleAuthField">
          <span>パスワード</span>
          <input id="titleRegisterPassword" type="password" value="${escapeHtml(registerValues.password)}" autocomplete="new-password" placeholder="英字・数字・記号を含む7文字以上" />
          <div class="titleAuthSubText">英字・数字・記号をすべて含む7文字以上で入力してください。</div>
          ${renderFieldError(registerErrors.password)}
        </label>

        <label class="titleAuthField">
          <span>パスワード確認</span>
          <input id="titleRegisterPasswordConfirm" type="password" value="${escapeHtml(registerValues.passwordConfirm)}" autocomplete="new-password" placeholder="確認のため再入力" />
          ${renderFieldError(registerErrors.passwordConfirm)}
        </label>

        <label class="titleAuthField">
          <span>表示名</span>
          <input id="titleRegisterDisplayName" type="text" value="${escapeHtml(registerValues.displayName)}" maxlength="${MAX_DISPLAY_NAME_LENGTH}" placeholder="最大15文字" />
          <div class="titleAuthSubText">${registerValues.displayName.length} / ${MAX_DISPLAY_NAME_LENGTH}文字</div>
          ${renderFieldError(registerErrors.displayName)}
        </label>

        <div class="titleAuthPolicyActions">
          <button id="titleRegisterTermsBtn" class="btn secondary" type="button">利用規約を確認する</button>
          <button id="titleRegisterPrivacyBtn" class="btn secondary" type="button">プライバシーポリシーを確認する</button>
        </div>

        <label class="titleAuthCheck">
          <input id="titleRegisterAgreed" type="checkbox" ${registerValues.agreed ? "checked" : ""} />
          <span>利用規約およびプライバシーポリシーに同意する。</span>
        </label>
        ${renderFieldError(registerErrors.agreed)}

        <div class="titleAuthActions">
          <button class="btn titleAuthPrimaryBtn" type="submit">登録する</button>
          <button id="titleRegisterBackLoginBtn" class="btn secondary titleAuthSecondaryBtn" type="button">ログインに戻る</button>
        </div>
      </form>
    `;

    app.querySelector<HTMLButtonElement>("#titleRegisterTermsBtn")?.addEventListener("click", () => {
      playButtonSe();
      openModal("terms");
    });

    app.querySelector<HTMLButtonElement>("#titleRegisterPrivacyBtn")?.addEventListener("click", () => {
      playButtonSe();
      openModal("privacy");
    });

    app.querySelector<HTMLButtonElement>("#titleRegisterBackLoginBtn")?.addEventListener("click", () => {
      playButtonSe();
      readRegisterValues();
      registerErrors = {};
      authModalView = "login";
      renderAuthModalBody();
    });

    const displayNameInput = app.querySelector<HTMLInputElement>("#titleRegisterDisplayName");
    displayNameInput?.addEventListener("input", () => {
      const subText = displayNameInput.closest(".titleAuthField")?.querySelector<HTMLDivElement>(".titleAuthSubText");
      if (!subText) return;
      subText.textContent = `${displayNameInput.value.length} / ${MAX_DISPLAY_NAME_LENGTH}文字`;
    });

    app.querySelector<HTMLFormElement>("#titleRegisterForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      readRegisterValues();
      registerValues = { ...registerValues, displayName: registerValues.displayName.trim(), email: registerValues.email.trim() };
      registerErrors = validateRegister(registerValues);

      if (Object.keys(registerErrors).length > 0) {
        renderRegisterForm();
        return;
      }

      startButtonSe();
      registerPendingUser({
        email: registerValues.email,
        password: registerValues.password,
        displayName: registerValues.displayName,
      })
        .then(() => {
          authModalView = "verification";
          renderAuthModalBody();
        })
        .catch((error: unknown) => {
          const authError = error instanceof AuthApiError ? error : new AuthApiError("新規登録に失敗しました。");
          registerErrors = {
            email: authError.fieldErrors.email,
            password: authError.fieldErrors.password,
            displayName: authError.fieldErrors.displayName ?? authError.message,
          };
          renderRegisterForm();
        });
    });
  }

  function renderVerificationMessage() {
    loginHeadingEl.textContent = "認証メールを送信しました";
    authModalFooterEl.style.display = "none";

    authModalBodyEl.innerHTML = `
      <div class="titleAuthMessageBox">
        <p>ご入力いただいたメールアドレス宛に、認証メールを送信しました。</p>
        <p>メール内のリンクから認証を完了してください。</p>
        <p>認証完了後、タイトル画面からログインしてプレイできます。</p>
        <p class="titleAuthSubText">※メールが届かない場合は、時間をおいて再度お試しください。</p>
      </div>
      <button id="titleVerificationBackTitleBtn" class="btn titleAuthPrimaryBtn" type="button">タイトルへ戻る</button>
    `;

    app.querySelector<HTMLButtonElement>("#titleVerificationBackTitleBtn")?.addEventListener("click", () => {
      playButtonSe();
      registerValues = { email: "", password: "", passwordConfirm: "", displayName: "", agreed: false };
      registerErrors = {};
      setLoginOpen(false);
      renderAuthStage();
    });
  }

  function renderAuthModalBody() {
    loginDialogEl.classList.toggle("is-register", authModalView === "register");
    loginDialogEl.classList.toggle("is-verification", authModalView === "verification");

    if (authModalView === "register") {
      renderRegisterForm();
      return;
    }

    if (authModalView === "verification") {
      renderVerificationMessage();
      return;
    }

    renderLoginForm();
  }

  function bindTitleHomeEvents() {
    const loginOpenBtn = app.querySelector<HTMLButtonElement>("#titleLoginOpenBtn");
    const authenticatedStartBtn = app.querySelector<HTMLButtonElement>("#titleAuthenticatedStartBtn");
    const logoutBtn = app.querySelector<HTMLButtonElement>("#titleLogoutBtn");
    const guestBtn = app.querySelector<HTMLButtonElement>("#titleGuestBtn");

    loginOpenBtn?.addEventListener("click", () => {
      playButtonSe();
      setLoginOpen(true, "login");
    });

    authenticatedStartBtn?.addEventListener("click", () => {
      startButtonSe();
      Promise.resolve(handlers.onStart()).catch((error: unknown) => {
        const authError = error instanceof AuthApiError ? error : new AuthApiError("ログイン状態を確認できませんでした。もう一度ログインしてください。");
        renderAuthStage();
        openMessageModal("ご案内", authError.message);
      });
    });

    logoutBtn?.addEventListener("click", () => {
      clearUserSettingsCache();
      resetSoundToDefault();
      handlers.onLogout();
      playButtonSe();
    });

    guestBtn?.addEventListener("click", () => {
      playButtonSe();
      setGuestConfirmOpen(true);
    });
  }

  loginCloseEl.addEventListener("click", () => {
    playButtonSe();
    setLoginOpen(false);
  });

  loginModal.addEventListener("click", (event) => {
    if (event.target !== loginModal) return;
    setLoginOpen(false);
  });

  loginDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  guestConfirmStart.addEventListener("click", () => {
    startButtonSe();
    closeGuestConfirm();
    handlers.onGuestStart();
  });

  guestConfirmCancel.addEventListener("click", () => {
    playButtonSe();
    closeGuestConfirm();
  });

  guestConfirmModal.addEventListener("click", (event) => {
    if (event.target !== guestConfirmModal) return;
    closeGuestConfirm();
  });

  guestConfirmDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  soundBtn.addEventListener("click", () => {
    const next = toggleSound();
    updateSoundButton();
    if (next) {
      playButtonSe();
    }
  });

  menuBtn.addEventListener("click", () => {
    playButtonSe();
    setMenuOpen(!menuOverlay.classList.contains("is-open"));
  });

  menuClose.addEventListener("click", () => {
    playButtonSe();
    closeMenu();
  });

  menuOverlay.addEventListener("click", (event) => {
    if (event.target !== menuOverlay) return;
    closeMenu();
  });

  menuPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  for (const item of menuItems) {
    item.addEventListener("click", () => {
      const key = item.dataset.modalKey as TitleModalKey | undefined;
      if (!key) return;
      playButtonSe();
      closeMenu();
      openModal(key);
    });
  }

  modalActionBtn.addEventListener("click", () => {
    playButtonSe();
    goContactPage();
  });

  modalClose.addEventListener("click", () => {
    playButtonSe();
    setModalOpen(false);
  });

  modal.addEventListener("click", (event) => {
    if (event.target !== modal) return;
    setModalOpen(false);
  });

  modalDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  soundNoticeClose.addEventListener("click", () => {
    closeSoundNotice();
  });

  soundNoticeModal.addEventListener("click", (event) => {
    if (event.target !== soundNoticeModal) return;
    closeSoundNotice();
  });

  soundNoticeDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  renderAuthStage();

  const shouldOpenLoginFromQuery = new URLSearchParams(window.location.search).get("auth") === "login";
  if (shouldOpenLoginFromQuery) {
    setLoginOpen(true, "login");
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("auth");
    window.history.replaceState({}, "", cleanUrl.toString());
  }

  if (!hasShownSoundNotice()) {
    setSoundNoticeOpen(true);
  }
}
