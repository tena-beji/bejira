// Amazon の商品ページから、ヨドバシ.com で検索するためのキーワードを組み立てる。
// DOM に依存しない関数はテストから require できるようにしている。
(function (root) {
  "use strict";

  const YODOBASHI_SEARCH_URL = "https://www.yodobashi.com/";

  const JAN_LABELS = ["JAN", "EAN", "JANコード", "EANコード"];
  const MODEL_LABELS = ["型番", "メーカー型番", "モデル番号", "製品型番", "Item model number", "Model Number"];

  // Amazon の詳細欄には方向制御文字 (U+200E/U+200F) や全角スペースが混ざる
  function clean(text) {
    return (text || "")
      .replace(/[‎‏‪-‮]/g, "")
      .replace(/[\s　]+/g, " ")
      .replace(/^[\s:：]+|[\s:：]+$/g, "")
      .trim();
  }

  function normalizeLabel(label) {
    return clean(label).replace(/\s/g, "").toLowerCase();
  }

  function labelMatches(label, candidates) {
    const n = normalizeLabel(label);
    return candidates.some((c) => n === normalizeLabel(c));
  }

  // 8 桁または 13 桁の JAN/EAN。複数並んでいる場合は先頭を使う
  function parseJan(value) {
    const m = clean(value).match(/\b(\d{13}|\d{8})\b/);
    return m ? m[1] : null;
  }

  // 英字と数字の両方を含む 4 文字以上のトークンを型番らしいとみなす
  function extractModelFromTitle(title) {
    const tokens = clean(title).match(/[A-Za-z0-9][A-Za-z0-9\-\/.]{2,}[A-Za-z0-9]/g) || [];
    const model = tokens.find((t) => /[A-Za-z]/.test(t) && /\d/.test(t) && !/^\d+(mm|cm|m|g|kg|ml|l|w|v|mah|gb|tb|inch|インチ)$/i.test(t));
    return model || null;
  }

  // 長い商品名は検索でヒットしにくいので、区切り記号の手前までを使う
  function shortenTitle(title, maxLength) {
    const limit = maxLength || 40;
    let t = clean(title).split(/[|｜【\[（(:：]/)[0].trim();
    if (!t) t = clean(title);
    return t.length > limit ? t.slice(0, limit).trim() : t;
  }

  function buildSearchUrl(word) {
    return YODOBASHI_SEARCH_URL + "?word=" + encodeURIComponent(word);
  }

  // details: [{label, value}] の配列、title/brand: 文字列
  function chooseQuery({ details, title, brand }) {
    const find = (labels) => {
      const hit = (details || []).find((d) => labelMatches(d.label, labels) && clean(d.value));
      return hit ? clean(hit.value) : null;
    };

    const jan = parseJan(find(JAN_LABELS) || "");
    if (jan) return { word: jan, source: "JAN" };

    const model = find(MODEL_LABELS) || extractModelFromTitle(title);
    if (model) {
      // 「ソニー(SONY)」のような括弧書きは検索のノイズになるので落とす
      const b = clean(clean(brand).replace(/[（(].*?[)）]/g, ""));
      return { word: b && !model.toLowerCase().includes(b.toLowerCase()) ? `${b} ${model}` : model, source: "型番" };
    }

    const short = shortenTitle(title);
    if (short) return { word: short, source: "商品名" };
    return null;
  }

  // ---- ここから DOM 依存 ----

  function collectDetails(doc) {
    const details = [];

    // 「登録情報」「技術仕様」などのテーブル形式
    doc.querySelectorAll(
      "#productDetails_techSpec_section_1 tr, #productDetails_techSpec_section_2 tr, " +
        "#productDetails_detailBullets_sections1 tr, #productOverview_feature_div tr, " +
        "#technicalSpecifications_feature_div tr"
    ).forEach((tr) => {
      const cells = tr.querySelectorAll("th, td");
      if (cells.length >= 2) {
        details.push({ label: cells[0].textContent, value: cells[cells.length - 1].textContent });
      }
    });

    // 「型番 : XXXX」のような箇条書き形式
    doc.querySelectorAll("#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li").forEach((li) => {
      const spans = li.querySelectorAll("span > span");
      if (spans.length >= 2) {
        details.push({ label: spans[0].textContent, value: spans[1].textContent });
      } else {
        const [label, ...rest] = clean(li.textContent).split(/[:：]/);
        if (rest.length) details.push({ label, value: rest.join(":") });
      }
    });

    return details;
  }

  function readBrand(doc) {
    const byline = doc.querySelector("#bylineInfo");
    if (!byline) return "";
    const text = clean(byline.textContent);
    const m = text.match(/^ブランド[:：]\s*(.+)$/) || text.match(/^(.+?)のストアを表示/) || text.match(/^Visit the (.+?) Store/i);
    return m ? clean(m[1]) : "";
  }

  function readTitle(doc) {
    const el = doc.querySelector("#productTitle");
    return el ? clean(el.textContent) : "";
  }

  function queryFromDocument(doc) {
    const title = readTitle(doc);
    const result = chooseQuery({ details: collectDetails(doc), title, brand: readBrand(doc) });
    if (!result) return null;
    return { ...result, title, url: buildSearchUrl(result.word), titleUrl: title ? buildSearchUrl(shortenTitle(title)) : null };
  }

  const api = {
    clean,
    parseJan,
    extractModelFromTitle,
    shortenTitle,
    buildSearchUrl,
    chooseQuery,
    collectDetails,
    readBrand,
    readTitle,
    queryFromDocument,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.YodobashiLink = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
