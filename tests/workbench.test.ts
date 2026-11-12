import assert from "node:assert/strict";
import { emptyState, migrateState } from "../src/lib/learning.ts";
import {
  createDeck,
  selectDeckCard,
  referenceAtLevel,
  combinedInterpretation,
} from "../src/lib/workbench.ts";
const seeded = () => {
  let n = 13255;
  return () => (n = (n * 1664525 + 1013904223) >>> 0) / 4294967296;
};
for (let n = 0; n < 100; n++) {
  const deck = createDeck(true);
  assert.equal(deck.length, 78);
  assert.equal(new Set(deck.map((c) => c.cardId)).size, 78);
  const first = selectDeckCard(deck, [], 0, ["现状", "阻碍", "建议"]);
  const duplicate = selectDeckCard(deck, first.selectedIndices, 0, [
    "现状",
    "阻碍",
    "建议",
  ]);
  assert.deepEqual(first, duplicate);
  const next = selectDeckCard(deck, first.selectedIndices, 37, [
    "现状",
    "阻碍",
    "建议",
  ]);
  const last = selectDeckCard(deck, next.selectedIndices, 77, [
    "现状",
    "阻碍",
    "建议",
  ]);
  assert.equal(new Set(last.cards.map((c) => c.cardId)).size, 3);
  assert.equal(last.cards[1].cardId, deck[37].cardId);
  assert.equal(last.cards[1].reversed, deck[37].reversed);
  assert.deepEqual(
    selectDeckCard(deck, last.selectedIndices, 19, ["现状", "阻碍", "建议"]),
    last,
  );
  assert.equal(last.cards[2].position, "建议");
  assert(referenceAtLevel(last.cards, 4).includes("学习参考"));
  assert(!referenceAtLevel(last.cards, 1).includes("基础牌义"));
}
assert.deepEqual(createDeck(true, seeded()), createDeck(true, seeded()));
assert(createDeck(false).every((c) => !c.reversed));
assert.throws(() => selectDeckCard(createDeck(false), [], 99, ["建议"]));
assert.throws(() =>
  selectDeckCard(createDeck(false), [0, 0], 1, ["现状", "建议"]),
);
assert.equal(referenceAtLevel([], 4), "");
const newDraft = {question:'今天想观察什么？',spreadId:'single',withReversals:true,cards:[],flipped:[],interpretation:'',reflection:'',referenceVisible:false,recordId:null,deck:[],selectedIndices:[]};
assert.deepEqual(migrateState({...emptyState(),readingDraft:newDraft}).readingDraft,newDraft);
const physicalDeck=createDeck(true,seeded());
const chosen=selectDeckCard(physicalDeck,[],17,['当下的观察']);
const storedDraft={...newDraft,...chosen,deck:physicalDeck};
assert.deepEqual(migrateState({...emptyState(),readingDraft:storedDraft}).readingDraft,storedDraft);
assert.throws(()=>migrateState({...emptyState(),readingDraft:{...storedDraft,selectedIndices:[18]}}),/选牌与原牌组不一致/);
assert(
  combinedInterpretation({
    interpretation: "我想先确认现实条件。",
    readingNotes: {
      observation: "人物手持工具。",
      symbols: "练习的积累。",
      context: "学习技能。",
      connections: "",
    },
  }).includes("观察到的画面"),
);
console.log(
  "PASS: shuffled physical deck, fixed orientations, manual selection without duplicates, layered references and saved note composition.",
);
