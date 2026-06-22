type LoadingMode = "AUTHENTICATED" | "GUEST";

export type LoadingScreenConfig = {
  mode: LoadingMode;
  imagePath: string;
  tipText: string;
};

const AUTH_LOADING_IMAGES = [
  "/assets/loading-illustrations/01_load.png",
  "/assets/loading-illustrations/02_load.png",
];

const GUEST_LOADING_IMAGE = "/assets/title-illustrations/00_title_load.png";

const AUTH_LOADING_TIPS = [
  "JOKERは1〜49の好きな数として出せます。状況に合わせて使いどころを見極めましょう。",
  "♠3は直前に出されたJOKERを0として扱える特殊カードです。",
  "UPでは上限値以上、DOWNでは0以下になると敗北です。",
  "山札から出すか、手札から出すか。安全そうに見える選択が命取りになることもあります。",
  "Jを出してBUSTしていない場合、ゲームの加算と減算が逆になります。",
];

const GUEST_LOADING_TIP =
  "ゲストプレイ中は、戦績・称号・アイコン等の取得状況は保存されません。";

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function createLoadingConfig(mode: LoadingMode): LoadingScreenConfig {
  if (mode === "GUEST") {
    return {
      mode,
      imagePath: GUEST_LOADING_IMAGE,
      tipText: GUEST_LOADING_TIP,
    };
  }

  return {
    mode,
    imagePath: pickOne(AUTH_LOADING_IMAGES),
    tipText: pickOne(AUTH_LOADING_TIPS),
  };
}

export function renderLoading(app: HTMLDivElement, config: LoadingScreenConfig) {
  app.innerHTML = `
    <div class="loadingScreen">
      <img class="loadingVisual" src="${config.imagePath}" alt="100GAME⁺ ロード画面" />
      <div class="loadingShade" aria-hidden="true"></div>
      <div class="loadingContent">
        <div class="loadingLabel">NOW LOADING</div>
        <div class="loadingDots" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="loadingTipBox">
          <div class="loadingTipLabel">Tips</div>
          <div class="loadingTipText">${config.tipText}</div>
        </div>
      </div>
    </div>
  `;
}
