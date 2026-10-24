const test = require("node:test");
const assert = require("node:assert");
const q = require("../extension/query.js");

test("JAN があれば最優先で使う", () => {
  const r = q.chooseQuery({
    details: [
      { label: "型番 ‏ : ‎", value: "WF-1000XM5" },
      { label: "JAN", value: "‎4548736146877" },
    ],
    title: "ソニー ワイヤレスイヤホン WF-1000XM5",
    brand: "ソニー(SONY)",
  });
  assert.deepStrictEqual(r, { word: "4548736146877", source: "JAN" });
});

test("JAN がなければ型番にブランドを付ける", () => {
  const r = q.chooseQuery({ details: [{ label: "メーカー型番", value: "NE-FS3A" }], title: "x", brand: "パナソニック" });
  assert.deepStrictEqual(r, { word: "パナソニック NE-FS3A", source: "型番" });
});

test("詳細欄に型番がなければタイトルから拾う", () => {
  assert.strictEqual(q.extractModelFromTitle("Anker PowerCore 10000 (A1263) モバイルバッテリー"), "A1263");
  assert.strictEqual(q.extractModelFromTitle("充電器 65W 2ポート"), null);
});

test("何もなければ短くした商品名", () => {
  const r = q.chooseQuery({ details: [], title: "やわらかタオル 5枚セット【日本製】ふわふわ", brand: "" });
  assert.deepStrictEqual(r, { word: "やわらかタオル 5枚セット", source: "商品名" });
});

test("検索 URL はエンコードされる", () => {
  assert.strictEqual(q.buildSearchUrl("ソニー WF-1000XM5"), "https://www.yodobashi.com/?word=%E3%82%BD%E3%83%8B%E3%83%BC%20WF-1000XM5");
});

test("ブランドの括弧書きは落とす", () => {
  const r = q.chooseQuery({ details: [{ label: "型番", value: "WF-1000XM5" }], title: "", brand: "ソニー(SONY)" });
  assert.strictEqual(r.word, "ソニー WF-1000XM5");
});
