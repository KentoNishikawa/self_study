//　カード出すときの効果音
import cardDealSeFile from "../assets/sound_effects/カードを扇状に開く.mp3";
//　カード配布時の効果音
import cardPlaySeFile from "../assets/sound_effects/カードをめくる.mp3";
//　リザルトモーダル出現時の効果音
import resultSeFile from "../assets/sound_effects/cncl07.mp3";
//　決定ボタンを押すときの効果音
import buttonSeFile from "../assets/sound_effects/決定ボタンを押す49.mp3";
// スタート関連のボタンを押すときの効果音
import startbuttonSeFile from "../assets/sound_effects/決定ボタンを押す47.mp3";
// 自分のターン開始の効果音
import myturnSeFile from "../assets/sound_effects/cncl01.mp3";
import { getSoundVolumeLevel, soundVolumeLevelToAudioVolume } from "./userSettings";

function createAudio(src: string) {
    const audio = new Audio(src);
    audio.preload = "auto";
    return audio;
}

const cardDealSe = createAudio(cardDealSeFile);
const cardPlaySe = createAudio(cardPlaySeFile);
const resultSe = createAudio(resultSeFile);
const buttonSe = createAudio(buttonSeFile);
const startSe = createAudio(startbuttonSeFile);
const myturnSe = createAudio(myturnSeFile);

const SOUND_KEY = "100game.sound";

export function isSoundEnabled(): boolean {
    try {
        return sessionStorage.getItem(SOUND_KEY) !== "off";
    } catch {
        return true;
    }
}

export function toggleSound(): boolean {
    const next = !isSoundEnabled();
    try {
        sessionStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
        // no-op
    }
    return next;
}

function playAudio(audio: HTMLAudioElement) {
    if (!isSoundEnabled()) return;
    try {
        audio.volume = soundVolumeLevelToAudioVolume(getSoundVolumeLevel());
        audio.pause();
        audio.currentTime = 0;
        const p = audio.play();
        p?.catch?.(() => { });
    } catch {
        // no-op
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
    playAudio(buttonSe);
}

export function startButtonSe() {
    playAudio(startSe);
}

export function playMyturnSe() {
    playAudio(myturnSe);
}

