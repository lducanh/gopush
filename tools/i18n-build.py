#!/usr/bin/env python3
"""GOPUSH — gộp bản dịch thành assets/i18n/<lang>.js.

  python3 tools/i18n-extract.py tools/i18n/source.json        # lấy mọi câu tiếng Việt đang hiển thị trong assets/js
  python3 tools/i18n-build.py <thư mục chứa <lang>*.json>      # gộp các file {"câu gốc": "bản dịch"} của từng ngôn ngữ

Mỗi ngôn ngữ có thể chia nhiều file (en.0.json, en.1.json, …); file sau ghi đè file trước.
Báo số câu còn thiếu so với tools/i18n/source.json để dịch bổ sung."""
import glob, json, os, sys

LANGS = ['en', 'th', 'id', 'ja', 'pt', 'zh']
src_dir = sys.argv[1]
source = json.load(open('tools/i18n/source.json')) if os.path.exists('tools/i18n/source.json') else []
for lang in LANGS:
    files = sorted(glob.glob(os.path.join(src_dir, lang + '.*.json')))
    if not files:
        print(lang, 'không có file'); continue
    d = {}
    for f in files: d.update(json.load(open(f)))
    d = {k: v for k, v in d.items() if isinstance(v, str) and v.strip()}
    out = '/* GOPUSH — từ điển ' + lang + ' (sinh bởi tools/i18n-build.py, không sửa tay; sửa ở file nguồn rồi build lại) */\n'
    out += 'I18N.add(' + json.dumps(lang) + ', ' + json.dumps(d, ensure_ascii=False, sort_keys=True, indent=0) + ');\n'
    open('assets/i18n/' + lang + '.js', 'w').write(out)
    miss = [k for k in source if k not in d]
    print(lang, len(d), 'câu', '· thiếu', len(miss))
