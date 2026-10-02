import re,glob,json,sys,os,html
VI=re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]')
# chuỗi JS trong dự án dùng nháy đơn; nháy kép nằm trong HTML nên không tách theo nháy kép
lit=re.compile(r"'((?:[^'\\\n]|\\.)*)'")
def unesc(s): return re.sub(r"\\(.)",lambda m:{'n':'\n','t':'\t'}.get(m.group(1),m.group(1)),s)
seen=[]; S=set()
skip=set(sys.argv[2].split(',')) if len(sys.argv)>2 else set()
for f in sorted(glob.glob('assets/js/*.js')):
    if os.path.basename(f) in ('i18n.js',) : continue
    src=open(f).read()
    src=re.sub(r'/\*.*?\*/','',src,flags=re.S)
    src=re.sub(r'(?m)^\s*//.*$','',src)
    for m in lit.finditer(src):
        s=unesc(m.group(1))
        # mảnh thẻ HTML bị cắt ngang giữa hai chuỗi: '…/library">Mở Kho' và 'Hoặc chọn … <a class="x'
        h=re.match(r'^([^<>]*)>',s)
        if h and not VI.search(h.group(1)) and ('"' in h.group(1) or not h.group(1).strip()): s=s[h.end():]
        s=re.sub(r'<[a-zA-Z][^>]*$','',s)
        s=re.sub(r'&nbsp;',' ',s)
        # chữ trong thuộc tính hiển thị của thẻ HTML (title, placeholder, aria-label, alt)
        for am in re.finditer(r'(?:title|placeholder|aria-label|alt)="([^"]*)', s):
            t=re.sub(r'\s+',' ',html.unescape(am.group(1))).strip(' ·:–—,;|()')
            if VI.search(t) and t not in S and t not in skip: S.add(t); seen.append(t)
        for part in re.split(r'<[^>]*>|\n',s):
            t=re.sub(r'\s+',' ',html.unescape(part)).strip(' ·:–—,;|()')
            t=re.sub(r'^(toast|confirm|ask):','',t).strip()
            t=t.strip()
            if re.search(r'", [a-zA-Z]+:', t): continue
            if t.startswith('”') or t.endswith('“'): continue   # nửa câu quanh tên trong ngoặc: dịch bằng mẫu “{q0}”   # mảnh code bị cắt (chuỗi chứa nháy đơn như 1300'S)
            if VI.search(t) and t not in S and t not in skip: S.add(t); seen.append(t)
print(len(seen))
json.dump(seen,open(sys.argv[1],'w'),ensure_ascii=False,indent=0)
