// Amazon 商品ページのタイトル下に、ヨドバシ.com の検索リンクを差し込む。
(function () {
  "use strict";

  const { queryFromDocument } = globalThis.YodobashiLink;
  const BOX_ID = "yodobashi-link-box";

  function render() {
    const query = queryFromDocument(document);
    const existing = document.getElementById(BOX_ID);

    if (!query) {
      if (existing) existing.remove();
      return;
    }
    // 同じ検索語で表示済みなら何もしない (MutationObserver の無限ループ防止)
    if (existing && existing.dataset.word === query.word) return;

    const box = document.createElement("div");
    box.id = BOX_ID;
    box.dataset.word = query.word;

    const main = document.createElement("a");
    main.className = "yodobashi-link-main";
    main.href = query.url;
    main.target = "_blank";
    main.rel = "noopener noreferrer";
    main.textContent = "ヨドバシ.com で探す";
    box.appendChild(main);

    const note = document.createElement("span");
    note.className = "yodobashi-link-note";
    note.textContent = `${query.source}: ${query.word}`;
    box.appendChild(note);

    // JAN や型番で見つからなかったときのために商品名検索も残す
    if (query.source !== "商品名" && query.titleUrl) {
      const alt = document.createElement("a");
      alt.className = "yodobashi-link-alt";
      alt.href = query.titleUrl;
      alt.target = "_blank";
      alt.rel = "noopener noreferrer";
      alt.textContent = "商品名で検索";
      box.appendChild(alt);
    }

    if (existing) {
      existing.replaceWith(box);
      return;
    }
    const anchor = document.querySelector("#titleSection, #title_feature_div, #productTitle");
    if (anchor) {
      anchor.insertAdjacentElement("afterend", box);
    } else {
      box.classList.add("yodobashi-link-floating");
      document.body.appendChild(box);
    }
  }

  render();

  // カラーやサイズを切り替えるとページ遷移せずにタイトルや型番が書き換わる
  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(render, 500);
  }).observe(document.body, { childList: true, subtree: true });
})();
