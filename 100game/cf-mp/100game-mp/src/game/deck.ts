import type { Card, Rank, Suit } from "./types";

const SUITS: Suit[] = ["S", "H", "D", "C"];
const RANKS: Exclude<Rank, "JOKER">[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function makeId(): string {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createDeck(jokerCount: number): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) for (const rank of RANKS) deck.push({ id: makeId(), suit, rank });
    for (let i = 0; i < jokerCount; i++) deck.push({ id: makeId(), suit: "JOKER", rank: "JOKER" });
    return deck;
}

export function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function deal(deck: Card[], handSize: number, seatCount: number) {
    const d = deck.slice();
    const hands: Card[][] = Array.from({ length: seatCount }, () => []);
    for (let r = 0; r < handSize; r++) {
        for (let s = 0; s < seatCount; s++) {
            const c = d.pop();
            if (!c) throw new Error("deck is empty while dealing");
            hands[s].push(c);
        }
    }
    return { hands, restDeck: d };
}