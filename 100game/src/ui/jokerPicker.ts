// src/ui/jokerPicker.ts
export type Mode = "UP" | "DOWN";

type JokerPickerParams = {
  mode: Mode;
  total: number;
  allowCancel: boolean;
};

export async function pickJokerValue(
  params: JokerPickerParams
): Promise<number | undefined> {
  const { mode, total, allowCancel } = params;

  // 安全に出せる最大値（B仕様：アウト値は決定不可）
  const safeMax = mode === "UP"
    ? Math.min(49, 99 - total)
    : Math.min(49, total - 1);

  // 山札JOKERで詰みならキャンセルできないので、1で確定（結果として負けるだけ）
  if (!allowCancel && safeMax < 1) {
    alert("どの値を選んでもアウトです。ジョーカー値=1で確定します。");
    return 1;
  }

  const initial = safeMax >= 1 ? safeMax : 1;

  return new Promise<number | undefined>((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.7)";
    overlay.style.display = "grid";
    overlay.style.placeItems = "center";
    overlay.style.zIndex = "9999";
    overlay.style.padding = "16px";

    const modal = document.createElement("div");
    modal.style.width = "min(520px, 100%)";
    modal.style.background = "rgba(15,18,26,0.96)";
    modal.style.border = "1px solid rgba(255,255,255,0.12)";
    modal.style.borderRadius = "16px";
    modal.style.padding = "14px";
    modal.style.color = "white";

    const title = document.createElement("div");
    title.textContent = "JOKERの数を選択（1〜49）";
    title.style.fontWeight = "900";
    title.style.marginBottom = "10px";

    const info = document.createElement("div");
    info.style.opacity = "0.85";
    info.style.fontWeight = "700";
    info.style.marginBottom = "8px";

    const result = document.createElement("div");
    result.style.padding = "10px 12px";
    result.style.borderRadius = "12px";
    result.style.border = "1px solid rgba(255,255,255,0.12)";
    result.style.background = "rgba(255,255,255,0.05)";
    result.style.fontWeight = "900";
    result.style.marginBottom = "10px";

    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr 100px";
    row.style.gap = "10px";
    row.style.alignItems = "center";
    row.style.marginBottom = "10px";

    const range = document.createElement("input");
    range.type = "range";
    range.min = "1";
    range.max = "49";
    range.value = String(initial);

    const num = document.createElement("input");
    num.type = "number";
    num.min = "1";
    num.max = "49";
    num.step = "1";
    num.value = String(initial);
    num.style.padding = "10px 12px";
    num.style.borderRadius = "12px";
    num.style.border = "1px solid rgba(255,255,255,0.12)";
    num.style.background = "rgba(255,255,255,0.06)";
    num.style.color = "white";
    num.style.fontWeight = "900";

    row.appendChild(range);
    row.appendChild(num);

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "10px";
    btnRow.style.justifyContent = "flex-end";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "キャンセル";
    cancelBtn.style.padding = "10px 12px";
    cancelBtn.style.borderRadius = "12px";
    cancelBtn.style.border = "1px solid rgba(255,255,255,0.12)";
    cancelBtn.style.background = "rgba(255,255,255,0.06)";
    cancelBtn.style.color = "white";
    cancelBtn.style.fontWeight = "900";
    cancelBtn.style.cursor = "pointer";

    const okBtn = document.createElement("button");
    okBtn.textContent = "決定";
    okBtn.style.padding = "10px 12px";
    okBtn.style.borderRadius = "12px";
    okBtn.style.border = "1px solid rgba(34,197,94,0.35)";
    okBtn.style.background = "rgba(34,197,94,0.18)";
    okBtn.style.color = "white";
    okBtn.style.fontWeight = "900";
    okBtn.style.cursor = "pointer";

    if (!allowCancel) cancelBtn.style.display = "none";

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);

    modal.appendChild(title);
    modal.appendChild(info);
    modal.appendChild(row);
    modal.appendChild(result);
    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const clamp = (v: number) => Math.max(1, Math.min(49, Math.floor(v || 1)));
    const afterTotal = (v: number) => (mode === "UP" ? total + v : total - v);
    const isOut = (v: number) => (mode === "UP" ? afterTotal(v) >= 100 : afterTotal(v) <= 0);

    const render = (v: number) => {
      info.textContent = `現在：合計 ${total} / ${mode === "UP" ? "加算" : "減算"} / セーフ上限：${safeMax}`;
      const after = afterTotal(v);
      const out = isOut(v);
      result.textContent = `反映後：合計 ${after}（${out ? "アウト" : "セーフ"}）`;

      okBtn.disabled = out; // ★B仕様
      okBtn.style.opacity = out ? "0.45" : "1";
      okBtn.style.cursor = out ? "not-allowed" : "pointer";
      result.style.color = out ? "#ff4d6d" : "white";
      result.style.borderColor = out ? "rgba(255,77,109,0.5)" : "rgba(255,255,255,0.12)";
      result.style.background = out ? "rgba(255,77,109,0.12)" : "rgba(255,255,255,0.05)";
    };

    const setValue = (v: number) => {
      const c = clamp(v);
      range.value = String(c);
      num.value = String(c);
      render(c);
    };

    setValue(initial);

    range.oninput = () => setValue(Number(range.value));
    num.oninput = () => setValue(Number(num.value));

    okBtn.onclick = () => {
      const v = clamp(Number(num.value));
      if (isOut(v)) return;
      overlay.remove();
      resolve(v);
    };

    cancelBtn.onclick = () => {
      if (!allowCancel) return;
      overlay.remove();
      resolve(undefined);
    };

    overlay.onclick = (e) => {
      if (!allowCancel) return;
      if (e.target === overlay) {
        overlay.remove();
        resolve(undefined);
      }
    };
  });
}
