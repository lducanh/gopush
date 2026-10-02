#!/usr/bin/env python3
"""Dựng PDF từ tài liệu Markdown trong thư mục này.

Không cần cài gì thêm: tự chuyển Markdown sang HTML rồi nhờ Google Chrome in ra PDF.
Chạy:  python3 docs/build-pdf.py
"""
import html
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# ----------------------------------------------------------------- Markdown → HTML
def inline(t):
    """Chỉ xử lý những cú pháp tài liệu này thực sự dùng."""
    t = html.escape(t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<!\w)\*([^*]+)\*(?!\w)', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
    t = re.sub(r'(?<!["\'>=])(https?://[^\s<)]+)', r'<a href="\1">\1</a>', t)
    return t


def convert(md):
    out, i, lines = [], 0, md.split('\n')
    while i < len(lines):
        ln = lines[i]

        if ln.startswith('```'):                       # khối mã, giữ nguyên
            i += 1
            buf = []
            while i < len(lines) and not lines[i].startswith('```'):
                buf.append(html.escape(lines[i]))
                i += 1
            i += 1
            out.append('<pre>' + '\n'.join(buf) + '</pre>')
            continue

        if ln.startswith('|'):                          # bảng
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append(lines[i])
                i += 1
            cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
            body = [r for r in cells[1:] if not all(set(c) <= set('-: ') for c in r)]
            t = ['<table><thead><tr>']
            t += ['<th>' + inline(c) + '</th>' for c in cells[0]]
            t.append('</tr></thead><tbody>')
            for r in body:
                t.append('<tr>' + ''.join('<td>' + inline(c) + '</td>' for c in r) + '</tr>')
            t.append('</tbody></table>')
            out.append(''.join(t))
            continue

        m = re.match(r'(#{1,4}) (.*)', ln)              # tiêu đề
        if m:
            lv = len(m.group(1))
            out.append('<h%d>%s</h%d>' % (lv, inline(m.group(2)), lv))
            i += 1
            continue

        if re.match(r'^(---|\*\*\*)\s*$', ln):          # đường kẻ
            out.append('<hr>')
            i += 1
            continue

        m = re.match(r'^(\d+)\. (.*)', ln)              # danh sách đánh số
        if m:
            items = []
            start = m.group(1)
            while i < len(lines) and re.match(r'^\d+\. ', lines[i]):
                buf = [re.sub(r'^\d+\. ', '', lines[i])]
                i += 1
                while i < len(lines) and lines[i].startswith('   ') and lines[i].strip():
                    buf.append(lines[i].strip())
                    i += 1
                items.append(' '.join(buf))
            out.append('<ol start="%s">' % start +
                       ''.join('<li>' + inline(x) + '</li>' for x in items) + '</ol>')
            continue

        if re.match(r'^[-*] ', ln):                     # danh sách gạch đầu dòng
            items = []
            while i < len(lines) and re.match(r'^[-*] ', lines[i]):
                buf = [re.sub(r'^[-*] ', '', lines[i])]
                i += 1
                while i < len(lines) and lines[i].startswith('  ') and lines[i].strip():
                    buf.append(lines[i].strip())
                    i += 1
                items.append(' '.join(buf))
            out.append('<ul>' + ''.join('<li>' + inline(x) + '</li>' for x in items) + '</ul>')
            continue

        if ln.strip() == '':                            # dòng trống
            i += 1
            continue

        buf = []                                        # đoạn văn
        while i < len(lines) and lines[i].strip() and not re.match(
                r'^(#{1,4} |\||```|[-*] |\d+\. |---\s*$)', lines[i]):
            buf.append(lines[i].strip())
            i += 1
        out.append('<p>' + inline(' '.join(buf)) + '</p>')
    return '\n'.join(out)


# ----------------------------------------------------------------- khung trang in
CSS = """
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
body {
  font: 10.5pt/1.55 "Roboto", -apple-system, "Segoe UI", system-ui, sans-serif;
  color: #1c1c1f; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
h1 { font-size: 23pt; line-height: 1.2; margin: 0 0 6pt; letter-spacing: -.01em; }
h2 {
  font-size: 14pt; margin: 18pt 0 7pt; padding-top: 8pt;
  border-top: 1.5pt solid #18181b; break-after: avoid; break-inside: avoid;
}
h3 { font-size: 11.5pt; margin: 13pt 0 5pt; break-after: avoid; }
h4 { font-size: 10.5pt; margin: 10pt 0 4pt; break-after: avoid; }
p { margin: 0 0 7pt; }
ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
li { margin-bottom: 3pt; }
hr { border: 0; height: 0; margin: 0; }
code {
  font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 9pt;
  background: #f2f2f4; padding: 1pt 3pt; border-radius: 2pt;
}
pre {
  font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7.6pt; line-height: 1.35;
  background: #fafafa; border: .5pt solid #e2e2e6; border-radius: 4pt;
  padding: 8pt 10pt; margin: 0 0 9pt; white-space: pre; overflow: hidden;
  break-inside: avoid;
}
table {
  width: 100%; border-collapse: collapse; margin: 0 0 10pt;
  font-size: 9pt; break-inside: auto;
}
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td {
  border: .5pt solid #dcdce1; padding: 4.5pt 6pt; text-align: left; vertical-align: top;
}
th { background: #f4f4f6; font-weight: 600; }
a { color: #1c1c1f; text-decoration: underline; text-decoration-color: #b8b8be; }
.cover { border-bottom: 2pt solid #18181b; padding-bottom: 10pt; margin-bottom: 4pt; }
.cover .sub { color: #5a5a62; font-size: 10pt; margin: 0; }
.toc { break-after: page; }
.toc h2 { border-top: 0; margin-top: 12pt; }
.toc ol { columns: 2; column-gap: 18pt; font-size: 9.5pt; }
"""


def build(md_path, pdf_path):
    md = open(md_path, encoding='utf-8').read()

    # tách phần đầu làm trang bìa
    title = re.search(r'^# (.*)', md, re.M).group(1)
    md = re.sub(r'^# .*\n', '', md, count=1)

    # mục lục từ các tiêu đề cấp 2
    toc = re.findall(r'(?m)^## (.*)', md)
    toc_html = ('<div class="toc"><h2>Mục lục</h2><ol>' +
                ''.join('<li>%s</li>' % html.escape(re.sub(r'^\d+\. ', '', t)) for t in toc) +
                '</ol></div>')

    body = convert(md)
    doc = """<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>%s</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>%s</style></head><body>
<div class="cover"><h1>%s</h1></div>
%s
%s
</body></html>""" % (html.escape(title), CSS, html.escape(title), toc_html, body)

    tmp = os.path.join(HERE, '.print.html')
    open(tmp, 'w', encoding='utf-8').write(doc)
    subprocess.run([
        CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
        '--virtual-time-budget=8000',
        '--print-to-pdf=' + pdf_path, 'file://' + tmp
    ], check=True, capture_output=True)
    os.remove(tmp)
    return os.path.getsize(pdf_path)


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'tinh-nang-gopush.md')
    dst = os.path.splitext(src)[0] + '.pdf'
    size = build(src, dst)
    print('%s · %.1f KB' % (dst, size / 1024))
