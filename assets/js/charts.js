/* GOPUSH — biểu đồ SVG thuần, không thư viện.
   Tất cả màu lấy từ token nên tự đổi theo theme sáng/tối. */
(function (global) {
  'use strict';

  var uid = 0;
  function id() { uid += 1; return 'ig' + uid; }
  function esc(s) { return global.UI.esc(s); }
  /* nhãn trục: giữ một chữ số thập phân khi số còn nhỏ, nếu không hai mốc
     liền nhau sẽ cùng làm tròn thành một chuỗi (2K và 2K) */
  function dec(v, d) {
    var t = v.toFixed(d);
    if (t.indexOf('.') > -1) t = t.replace(/0+$/, '').replace(/\.$/, '');
    return t.replace('.', ',');
  }
  function nice(n) {
    if (n >= 1e9) return dec(n / 1e9, n >= 1e10 ? 1 : 2) + ' tỷ';
    if (n >= 1e6) return dec(n / 1e6, n >= 1e7 ? 0 : 1) + 'tr';
    if (n >= 1e3) return dec(n / 1e3, n >= 1e4 ? 0 : 1) + 'K';
    return String(Math.round(n));
  }

  /* đường cong mềm qua các điểm (Catmull-Rom → Bézier), căng 0.2 để không vọt
     quá đỉnh thật; giống kiểu đường của Trung tâm doanh nghiệp TikTok */
  function smooth(p) {
    if (p.length < 3) return 'M' + p.map(function (q) { return q[0] + ',' + q[1]; }).join(' L');
    var d = 'M' + p[0][0] + ',' + p[0][1], t = 0.2;
    for (var k = 0; k < p.length - 1; k++) {
      var p0 = p[k - 1] || p[k], p1 = p[k], p2 = p[k + 1], p3 = p[k + 2] || p2;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) * t).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) * t).toFixed(1) +
        ' ' + (p2[0] - (p3[0] - p1[0]) * t).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) * t).toFixed(1) +
        ' ' + p2[0] + ',' + p2[1];
    }
    return d;
  }

  /* ---------------------------------------------------- đường + vùng nền */
  function line(o) {
    var W = o.w || 760, H = o.h || 240, L = 46, R = 14, T = 18, B = 30;
    var iw = W - L - R, ih = H - T - B;
    var labels = o.labels, series = o.series;
    var max = 0;
    series.forEach(function (s) { s.values.forEach(function (v) { if (v > max) max = v; }); });
    max = max * 1.15 || 1;
    var step = labels.length > 1 ? iw / (labels.length - 1) : 0;
    var x = function (i) { return L + i * step; };
    var y = function (v) { return T + ih - (v / max) * ih; };

    var grid = '', i;
    for (i = 0; i <= 3; i++) {
      var gy = T + (ih / 3) * i;
      var gv = max - (max / 3) * i;
      grid += '<line x1="' + L + '" y1="' + gy + '" x2="' + (W - R) + '" y2="' + gy + '" class="ig-grid"/>' +
        '<text x="' + (L - 10) + '" y="' + (gy + 4) + '" class="ig-ax ig-ax-y">' + esc(nice(Math.round(gv))) + '</text>';
    }

    var xlab = labels.map(function (l, k) {
      return '<text x="' + x(k) + '" y="' + (H - 8) + '" class="ig-ax" text-anchor="middle">' + esc(l) + '</text>';
    }).join('');

    var paths = series.map(function (s, si) {
      var gid = id();
      var pt = s.values.map(function (v, k) { return [x(k), +y(v).toFixed(1)]; });
      var d = smooth(pt);
      var area = s.fill === false ? '' :
        '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="' + s.color + '" stop-opacity=".16"/>' +
          '<stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        '<path d="' + d + ' L' + pt[pt.length - 1][0] + ',' + (T + ih) + ' L' + pt[0][0] + ',' + (T + ih) + ' Z" fill="url(#' + gid + ')"/>';
      var last = s.values.length - 1;
      return area +
        '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2"' +
          ' stroke-linecap="round" stroke-linejoin="round"' + (s.dash ? ' stroke-dasharray="5 5"' : '') + '/>' +
        '<circle cx="' + x(last) + '" cy="' + y(s.values[last]).toFixed(1) + '" r="3.5" fill="var(--bg-surface)" stroke="' +
          s.color + '" stroke-width="2"/>';
    }).join('');

    return '<svg class="ig-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      esc(o.alt || 'Biểu đồ đường') + '">' + grid + paths + xlab + '</svg>' + legend(series);
  }

  /* ---------------------------------------------------- cột mảnh */
  function bars(o) {
    var W = o.w || 760, H = o.h || 210, L = 40, R = 12, T = 16, B = 28;
    var iw = W - L - R, ih = H - T - B;
    var max = Math.max.apply(null, o.values.concat(o.values2 || [])) * 1.12 || 1;
    var n = o.values.length;
    var slot = iw / n;
    var bw = o.bw || Math.max(5, Math.min(14, slot / (o.values2 ? 4.5 : 3)));
    var grid = '', i;
    for (i = 0; i <= 2; i++) {
      var gy = T + (ih / 2) * i;
      grid += '<line x1="' + L + '" y1="' + gy + '" x2="' + (W - R) + '" y2="' + gy + '" class="ig-grid"/>' +
        '<text x="' + (L - 10) + '" y="' + (gy + 4) + '" class="ig-ax ig-ax-y">' +
        esc(nice(Math.round(max - (max / 2) * i))) + '</text>';
    }
    var rects = o.values.map(function (v, k) {
      var cx = L + slot * k + slot / 2;
      var h1 = (v / max) * ih;
      var out = '<rect x="' + (cx - (o.values2 ? bw + 1.5 : bw / 2)) + '" y="' + (T + ih - h1) +
        '" width="' + bw + '" height="' + Math.max(2, h1) + '" rx="' + (bw / 2) + '" fill="' + o.color + '"/>';
      if (o.values2) {
        var h2 = (o.values2[k] / max) * ih;
        out += '<rect x="' + (cx + 1.5) + '" y="' + (T + ih - h2) + '" width="' + bw +
          '" height="' + Math.max(2, h2) + '" rx="' + (bw / 2) + '" fill="' + o.color2 + '"/>';
      }
      out += '<text x="' + cx + '" y="' + (H - 8) + '" class="ig-ax" text-anchor="middle">' + esc(o.labels[k]) + '</text>';
      return out;
    }).join('');
    var ser = [{ name: o.name, color: o.color }];
    if (o.values2) ser.push({ name: o.name2, color: o.color2 });
    return '<svg class="ig-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      esc(o.alt || 'Biểu đồ cột') + '">' + grid + rects + '</svg>' + (o.name ? legend(ser) : '');
  }

  /* ---------------------------------------------------- vòng tròn */
  function donut(o) {
    var S = 200, r = 74, cw = 22, c = 2 * Math.PI * r;
    var total = o.data.reduce(function (a, d) { return a + d.v; }, 0) || 1;
    var off = 0;
    var arcs = o.data.map(function (d) {
      var len = (d.v / total) * c;
      var seg = '<circle cx="' + (S / 2) + '" cy="' + (S / 2) + '" r="' + r + '" fill="none" stroke="' + d.c +
        '" stroke-width="' + cw + '" stroke-dasharray="' + (len - 2.5) + ' ' + (c - len + 2.5) +
        '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + (S / 2) + ' ' + (S / 2) + ')"/>';
      off += len;
      return seg;
    }).join('');
    var mid = '<text x="' + (S / 2) + '" y="' + (S / 2 - 2) + '" class="ig-donut-v" text-anchor="middle">' +
      esc(o.value) + '</text><text x="' + (S / 2) + '" y="' + (S / 2 + 18) +
      '" class="ig-donut-l" text-anchor="middle">' + esc(o.label) + '</text>';
    var rows = o.data.map(function (d) {
      return '<li><i style="background:' + d.c + '"></i><span class="n">' + esc(d.l) + '</span>' +
        '<b class="gm-num">' + Math.round(d.v / total * 100) + '%</b></li>';
    }).join('');
    return '<div class="ig-donut"><svg viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="' +
      esc(o.alt || 'Biểu đồ tròn') + '">' + arcs + mid + '</svg><ul class="ig-donut-legend">' + rows + '</ul></div>';
  }

  /* ---------------------------------------------------- thanh ngang xếp hạng */
  function hbars(rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1;
    return '<ul class="ig-hbars">' + rows.map(function (r) {
      return '<li><span class="n">' + esc(r.l) + '</span>' +
        '<span class="t"><i style="width:' + (r.v / max * 100) + '%;background:' + (r.c || 'var(--chart-1)') + '"></i></span>' +
        '<b class="gm-num">' + esc(r.d) + '</b></li>';
    }).join('') + '</ul>';
  }

  /* ---------------------------------------------------- sparkline trong thẻ KPI */
  function spark(values, color) {
    var W = 92, H = 28, max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    var rng = (max - min) || 1;
    var pts = values.map(function (v, i) {
      return (i / (values.length - 1) * W).toFixed(1) + ',' + (H - 3 - ((v - min) / rng) * (H - 7)).toFixed(1);
    }).join(' ');
    return '<svg class="ig-spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + (color || 'var(--chart-1)') +
      '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ---------------------------------------------------- vòng tiến độ */
  function ring(o) {
    var S = 120, r = 48, c = 2 * Math.PI * r;
    return '<div class="ig-ring"><svg viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="' + esc(o.label) + '">' +
      '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="var(--bg-muted)" stroke-width="12"/>' +
      '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + (o.color || 'var(--chart-1)') +
        '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (c * o.pct / 100) + ' ' + c +
        '" transform="rotate(-90 60 60)"/>' +
      '<text x="60" y="58" class="ig-donut-v" text-anchor="middle">' + o.pct + '%</text>' +
      '<text x="60" y="76" class="ig-donut-l" text-anchor="middle">' + esc(o.sub || '') + '</text></svg>' +
      '<span class="ig-ring-l">' + esc(o.label) + '</span></div>';
  }

  function legend(series) {
    var items = series.filter(function (s) { return s.name; });
    if (!items.length) return '';
    return '<div class="ig-legend">' + items.map(function (s) {
      return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>';
    }).join('') + '</div>';
  }

  global.CHART = { line: line, bars: bars, donut: donut, hbars: hbars, spark: spark, ring: ring };
})(window);
