#!/usr/bin/env python3
"""HOWDI V8 colour migration for legacy customer screens.

Maps the legacy forest-green / gold / cream brand palette onto the locked V8 system
(soft blue-white base, navy ink, cobalt actions) while keeping semantic colours
(success greens, error reds, warning ambers, stars, teal, violet) untouched.

Property-aware: a colour used as text becomes navy/slate ink; the same colour used as
a background/border becomes a cobalt action or a blue-white surface.
Deterministic: every mapping is logged to a CSV so the change is reviewable.
"""
import colorsys, re, sys, csv, collections

INK = (13, 26, 58)          # #0d1a3a
INK2 = (34, 48, 79)         # #22304f
COBALT = (31, 90, 246)      # #1f5af6
COBALT_DK = (23, 73, 214)   # #1749d6
NAVY_DEEP = (15, 30, 80)    # #0f1e50

def hsl(rgb):
    r, g, b = [x / 255 for x in rgb]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l

def from_hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, max(0, min(1, l)), max(0, min(1, s)))
    return tuple(round(x * 255) for x in (r, g, b))

def is_brand_green(h, s, l):
    if not (70 <= h <= 171):
        return False
    if s < 0.04:                      # true greys stay grey
        return False
    if (s >= 0.55 and 100 <= h <= 158) or s >= 0.85:   # semantic success / emerald greens stay
        return False
    if l < 0.30:                      # dark forest / bottle greens (brand)
        return True
    if s >= 0.50 and l < 0.80:        # saturated mid greens = semantic success -> keep
        return False
    return True                       # muted mid greens, sage text, mint tints

def is_brand_gold(h, s, l):
    return 22 <= h <= 52 and s >= 0.30 and 0.28 <= l <= 0.66

def is_cream(h, s, l):
    return 25 <= h <= 65 and l >= 0.88 and s >= 0.25

def map_color(rgb, role):
    """role: 'text' | 'bg' | 'border' | 'any'"""
    h, s, l = hsl(rgb)
    if is_brand_green(h, s, l):
        if l < 0.30:
            if role == 'text':
                return INK if l < 0.2 else INK2
            if role == 'border':
                return from_hsl(224, 0.55, 0.34)
            # dark green surfaces / buttons -> cobalt (actions) or deep navy (very dark overlays)
            return NAVY_DEEP if l < 0.12 else (COBALT_DK if l < 0.2 else COBALT)
        if l < 0.62:
            # muted mid greens: labels / secondary text -> slate; mid surfaces -> cobalt tint
            if role == 'text':
                return from_hsl(222, min(0.22, s), max(0.36, min(0.52, l)))
            return from_hsl(222, min(0.75, s + 0.25), l)
        # light tints: surfaces and borders -> blue-white / cool grey borders
        return from_hsl(222, min(0.60, s + 0.15) if l > 0.9 else min(0.35, s + 0.1), l)
    if is_brand_gold(h, s, l):
        return COBALT if role == 'text' else from_hsl(224, 0.85, max(0.45, l))
    if is_cream(h, s, l):
        return from_hsl(222, 0.65, max(l, 0.955))
    return None

HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGB = re.compile(r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})')

TEXT_KEYS = re.compile(r'(?:^|[;{\s"\'])(color|fill|caret-color|-webkit-text-fill-color|stroke)\s*[:=]\s*["\']?[^;{}]*$', re.I)
BG_KEYS = re.compile(r'(background(?:-color|-image)?|accent-color|outline-color)\s*[:=]\s*["\']?[^;{}]*$', re.I)
BORDER_KEYS = re.compile(r'(border(?:-[a-z]+)*|box-shadow|text-decoration-color)\s*[:=]\s*["\']?[^;{}]*$', re.I)

def role_at(text, idx):
    ctx = text[max(0, idx - 140):idx]
    # JSX inline style keys are camelCase: backgroundColor, borderColor, color
    ctx = re.sub(r'([a-z])([A-Z])', lambda m: m.group(1) + '-' + m.group(2).lower(), ctx)
    last = max((m.end() for m in re.finditer(r'[;{},]', ctx)), default=0)
    seg = ctx[last:] if last else ctx
    seg2 = ctx  # fall back to a wider window for multi-value properties
    for rx, r in ((BG_KEYS, 'bg'), (BORDER_KEYS, 'border'), (TEXT_KEYS, 'text')):
        if rx.search(seg):
            return r
    for rx, r in ((BG_KEYS, 'bg'), (BORDER_KEYS, 'border'), (TEXT_KEYS, 'text')):
        m = None
        for m in rx.finditer(seg2):
            pass
        if m:
            return r
    return 'any'

def to_hex(rgb):
    return '#%02x%02x%02x' % rgb

def process(path, log):
    src = open(path, encoding='utf-8').read()
    out, pos, n = [], 0, 0
    tokens = sorted([(m.start(), m.end(), 'hex', m) for m in HEX.finditer(src)] + [(m.start(), m.end(), 'rgb', m) for m in RGB.finditer(src)])
    for st, en, kind, m in tokens:
        if st < pos:
            continue
        if kind == 'hex':
            v = m.group(1)
            if len(v) == 3:
                v = ''.join(c * 2 for c in v)
            rgb = tuple(int(v[i:i + 2], 16) for i in (0, 2, 4))
        else:
            rgb = tuple(int(m.group(i)) for i in (1, 2, 3))
            if any(x > 255 for x in rgb):
                continue
        role = role_at(src, st)
        new = map_color(rgb, 'bg' if role == 'any' else role)
        if new is None or new == rgb:
            continue
        out.append(src[pos:st])
        if kind == 'hex':
            out.append(to_hex(new))
        else:
            out.append(m.group(0).split('(')[0] + '(%d,%d,%d' % new)
        pos = en
        n += 1
        log[(path, to_hex(rgb), role, to_hex(new))] += 1
    out.append(src[pos:])
    open(path, 'w', encoding='utf-8').write(''.join(out))
    return n

if __name__ == '__main__':
    log = collections.Counter()
    total = 0
    for p in sys.argv[2:]:
        c = process(p, log)
        total += c
        print(f'{c:6d}  {p}')
    with open(sys.argv[1], 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['file', 'from', 'role', 'to', 'count'])
        for (p, a, r, b), c in sorted(log.items()):
            w.writerow([p, a, r, b, c])
    print('total', total)
