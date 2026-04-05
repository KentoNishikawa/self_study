// src/ui/mpNotice.ts
import { playButtonSe } from "../core/sound";

export type MpNotice = {
    title?: string;
    message: string;
};

const MP_NOTICE_MESSAGE_KEY = "mp_notice";
const MP_NOTICE_TITLE_KEY = "mp_notice_title";

export const HOST_DISBANDED_NOTICE = {
    message: "HOSTが部屋を解散したため、ホーム画面に戻りました。",
} as const satisfies MpNotice;

export const HOST_REDIRECT_NOTICE = {
    title: "",
    message: "マルチプレイを終了しました。ホーム画面へ戻ります。",
} as const satisfies MpNotice;

export const HOME_HOST_DISBANDED_NOTICE = {
    title: "",
    message: "HOSTが部屋を解散したため、マルチプレイを終了します。",
} as const satisfies MpNotice;

export function stashMpNotice(notice?: MpNotice | null) {
    if (!notice?.message) return;
    try {
        sessionStorage.setItem(MP_NOTICE_MESSAGE_KEY, notice.message);
        if (notice.title !== undefined) sessionStorage.setItem(MP_NOTICE_TITLE_KEY, notice.title);
        else sessionStorage.removeItem(MP_NOTICE_TITLE_KEY);
    } catch { }
}

export function consumeMpNotice(): MpNotice | null {
    try {
        const message = sessionStorage.getItem(MP_NOTICE_MESSAGE_KEY);
        if (!message) return null;
        const title = sessionStorage.getItem(MP_NOTICE_TITLE_KEY);
        sessionStorage.removeItem(MP_NOTICE_MESSAGE_KEY);
        sessionStorage.removeItem(MP_NOTICE_TITLE_KEY);
        return title === null ? { message } : { title, message };
    } catch {
        return null;
    }
}

export function renderMpNoticeModalHtml() {
    return `
    <div id="mpNotice" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.60);align-items:center;justify-content:center;">
      <div style="width:calc(100% - 40px);max-width:520px;border:1px solid rgba(255,255,255,0.18);
                  background:rgba(12,12,12,0.96);border-radius:16px;padding:16px;color:rgba(255,255,255,0.92);">
        <div id="mpNoticeTitle" style="font-weight:950;margin-bottom:8px;">入室できませんでした</div>
        <div id="mpNoticeText" style="font-weight:800;line-height:1.7;"></div>
        <button id="mpNoticeOk" class="btn" type="button" style="width:100%;margin-top:12px;">OK</button>
      </div>
    </div>
  `;
}

type ShowMpNoticeOptions = {
    defaultTitle?: string;
    hideTitle?: boolean;
    closeOnOverlay?: boolean;
    deferDisplay?: boolean;
    onClose?: () => void;
};

export function setupMpNoticeModal(app: HTMLDivElement) {
    const mpNotice = app.querySelector<HTMLDivElement>("#mpNotice")!;
    const mpNoticeTitle = app.querySelector<HTMLDivElement>("#mpNoticeTitle")!;
    const mpNoticeText = app.querySelector<HTMLDivElement>("#mpNoticeText")!;
    const mpNoticeOk = app.querySelector<HTMLButtonElement>("#mpNoticeOk")!;

    let currentCloseOnOverlay = true;
    let currentOnClose: (() => void) | null = null;

    const close = () => {
        mpNotice.style.display = "none";
        const onClose = currentOnClose;
        currentOnClose = null;
        currentCloseOnOverlay = true;
        onClose?.();
    };

    const show = (notice: MpNotice, options?: ShowMpNoticeOptions) => {
        const hideTitle = !!options?.hideTitle;
        mpNoticeTitle.textContent = hideTitle ? "" : (notice.title ?? options?.defaultTitle ?? "入室できませんでした");
        mpNoticeTitle.style.display = hideTitle ? "none" : "block";
        mpNoticeText.textContent = notice.message;
        currentCloseOnOverlay = options?.closeOnOverlay ?? true;
        currentOnClose = options?.onClose ?? null;

        const open = () => {
            mpNotice.style.display = "flex";
        };

        if (options?.deferDisplay) {
            setTimeout(open, 0);
        } else {
            open();
        }
    };

    const showStashed = () => {
        const notice = consumeMpNotice();
        if (!notice) return;
        const hideTitle = (!notice.title && notice.message.includes("HOSTが部屋を解散したため")) || notice.title === "";
        show(notice, { hideTitle, defaultTitle: "入室できませんでした", deferDisplay: true });
    };

    mpNoticeOk.onclick = () => {
        playButtonSe();
        close();
    };
    mpNotice.addEventListener("click", (e) => {
        if (e.target === mpNotice && currentCloseOnOverlay) {
            close();
        }
    });

    return { show, showStashed };
}

export function getPreflightStatusNotice(status: number, hasHostToken: boolean): MpNotice | null {
    if (status === 410) {
        return hasHostToken
            ? { message: "マルチプレイを終了しました。ホーム画面へ戻ります。" }
            : { message: "HOSTが部屋を解散しました。ホーム画面に戻ります。" };
    }

    if (status === 404) {
        return hasHostToken
            ? { message: "マルチプレイを終了しました。ホーム画面へ戻ります。" }
            : { message: "roomが見つからないため入室できませんでした。ホーム画面に戻ります" };
    }

    return null;
}

export function getPreflightUnexpectedStatusNotice(hasHostToken: boolean): MpNotice {
    return hasHostToken
        ? { message: "マルチプレイが終了しました。ホーム画面へ戻ります。" }
        : { message: "入室できませんでした。ホーム画面に戻ります" };
}

export function getInviteExpiredNotice(): MpNotice {
    return { message: "招待URLの期限が切れているため入室できませんでした。ホーム画面に戻ります" };
}

export function getLockedRoomNotice(): MpNotice {
    return { message: "ゲームが開始済みのため入室できませんでした。ホーム画面に戻ります" };
}

export function getRoomFullNotice(): MpNotice {
    return { message: "roomが満員のため入室できませんでした。ホーム画面に戻ります" };
}

export function getJoinFailedNotice(): MpNotice {
    return { message: "入室できませんでした。ホーム画面に戻ります" };
}
