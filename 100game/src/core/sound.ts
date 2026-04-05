//　カード出すときの効果音
import cardDealSeFile from "../assets/sound_effects/カードを扇状に開く.mp3";
//　カード配布時の効果音
import cardPlaySeFile from "../assets/sound_effects/カードをめくる.mp3";
//　リザルトモーダル出現時の効果音
import resultSeFile from "../assets/sound_effects/cncl07.mp3";
//　決定ボタンを押すときの効果音
import buttonSeFile from "../assets/sound_effects/決定ボタンを押す49.mp3";

function createAudio(src: string) {
    const audio = new Audio(src);
    audio.preload = "auto";
    return audio;
}

const cardDealSe = createAudio(cardDealSeFile);
const cardPlaySe = createAudio(cardPlaySeFile);
const resultSe = createAudio(resultSeFile);
const buttonSe = createAudio(buttonSeFile);

function playAudio(audio: HTMLAudioElement) {
    try {
        audio.pause();
        audio.currentTime = 0;
        const p = audio.play();
        p?.catch?.(() => { });
    } catch {
        // no-op
    }
}

function isPcScreen() {
    try {
        const noHover = window.matchMedia?.("(hover: none)")?.matches ?? false;
        const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
        return !(noHover || coarse);
    } catch {
        return true;
    }
}

export function playCardDealSe() {
    playAudio(cardDealSe);
}

export function playCardPlaySe() {
    playAudio(cardPlaySe);
}

export function playResultSe() {
    playAudio(resultSe);
}

export function playButtonSe() {
    if (!isPcScreen()) return;
    playAudio(buttonSe);
}
