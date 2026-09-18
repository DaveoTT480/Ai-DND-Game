import json, math

def load(f): return json.load(open(f + ".geojson"))["features"]
LAND = load("ne_10m_land"); LAKES = load("ne_10m_lakes"); RIV = load("ne_10m_rivers_lake_centerlines"); RIVEU = load("ne_10m_rivers_europe")
ADM1 = load("ne_50m_admin_1_states_provinces_lines"); ADM0 = load("ne_50m_admin_0_boundary_lines_land")

# ---------- geometry helpers ----------
def clip_poly(ring, bb):  # Sutherland-Hodgman against bbox (W,S,E,N)
    W, S, E, N = bb
    def inside(p, e): return {0: p[0] >= W, 1: p[0] <= E, 2: p[1] >= S, 3: p[1] <= N}[e]
    def inter(a, b, e):
        if e in (0, 1):
            x = W if e == 0 else E; t = (x - a[0]) / (b[0] - a[0]); return (x, a[1] + t * (b[1] - a[1]))
        y = S if e == 2 else N; t = (y - a[1]) / (b[1] - a[1]); return (a[0] + t * (b[0] - a[0]), y)
    out = ring
    for e in range(4):
        inp = out; out = []
        if not inp: break
        s = inp[-1]
        for p in inp:
            if inside(p, e):
                if not inside(s, e): out.append(inter(s, p, e))
                out.append(p)
            elif inside(s, e): out.append(inter(s, p, e))
            s = p
    return out

def clip_line(line, bb):  # returns list of sub-polylines inside bbox (Liang-Barsky per segment)
    W, S, E, N = bb; segs = []; cur = []
    for i in range(len(line) - 1):
        (x0, y0), (x1, y1) = line[i], line[i + 1]
        dx, dy = x1 - x0, y1 - y0; t0, t1 = 0.0, 1.0; ok = True
        for p, q in ((-dx, x0 - W), (dx, E - x0), (-dy, y0 - S), (dy, N - y0)):
            if p == 0:
                if q < 0: ok = False; break
            else:
                t = q / p
                if p < 0: t0 = max(t0, t)
                else: t1 = min(t1, t)
        if not ok or t0 > t1:
            if cur: segs.append(cur); cur = []
            continue
        a = (x0 + t0 * dx, y0 + t0 * dy); b = (x0 + t1 * dx, y0 + t1 * dy)
        if t0 > 0 and cur: segs.append(cur); cur = []
        if not cur: cur.append(a)
        cur.append(b)
        if t1 < 1: segs.append(cur); cur = []
    if cur: segs.append(cur)
    return segs

def dp(pts, tol):
    if len(pts) < 3: return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]; dmax = 0; idx = 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        if ax == bx and ay == by: d = math.hypot(px - ax, py - ay)
        else:
            t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2); t = max(0, min(1, t))
            d = math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)))
        if d > dmax: dmax, idx = d, i
    if dmax > tol: return dp(pts[:idx + 1], tol)[:-1] + dp(pts[idx:], tol)
    return [pts[0], pts[-1]]

def area(r): return abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))) / 2

def path(pts, close=False):
    s = "M" + " ".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    return s.replace("M", "M", 1).replace(" ", " ") + ("Z" if close else "")

# ---------- regions ----------
class R:
    def __init__(s, id, title, bb, tol=1.2, minarea=25, riverrank=6, states=False, borders=False, eurivers=False, anchors=(), lines=(), seas=(), lakes=True):
        s.__dict__.update(locals())
    def proj(s):
        W, S, E, N = s.bb; c = math.cos(math.radians((S + N) / 2)); k = 1000 / ((E - W) * c)
        H = (N - S) * k
        return lambda lon, lat: ((lon - W) * c * k, (N - lat) * k), H, c, k

def rings(feat):
    g = feat["geometry"]; t = g["type"]
    if t == "Polygon": return g["coordinates"]
    if t == "MultiPolygon": return [r for poly in g["coordinates"] for r in poly]
    return []
def lines(feat):
    g = feat["geometry"]; t = g["type"]
    if t == "LineString": return [g["coordinates"]]
    if t == "MultiLineString": return g["coordinates"]
    return []

def build(r):
    P, H, c, k = r.proj(); out = {"id": r.id, "title": r.title, "bbox": r.bb, "w": 1000, "h": round(H, 1), "land": [], "lakes": [], "rivers": [], "borders": [], "states": [], "anchors": [], "lines": [], "seas": []}
    def addpolys(feats, key, minarea):
        for f in feats:
            for ring in rings(f):
                cl = clip_poly([tuple(p) for p in ring], r.bb)
                if len(cl) < 3: continue
                pr = [P(*p) for p in cl]; pr = dp(pr, r.tol)
                if len(pr) >= 3 and area(pr) >= minarea: out[key].append(path(pr, True))
    addpolys(LAND, "land", r.minarea)
    if r.lakes: addpolys(LAKES, "lakes", r.minarea)
    def addlines(feats, key, pred=lambda f: True, tol=None):
        for f in feats:
            if not pred(f): continue
            for ln in lines(f):
                for seg in clip_line([tuple(p) for p in ln], r.bb):
                    pr = dp([P(*p) for p in seg], tol or r.tol)
                    if len(pr) >= 2 and sum(math.hypot(pr[i+1][0]-pr[i][0], pr[i+1][1]-pr[i][1]) for i in range(len(pr)-1)) > 8: out[key].append(path(pr))
    addlines(RIV, "rivers", lambda f: (f["properties"].get("scalerank") or 99) <= r.riverrank and f["properties"].get("featurecla") != "Lake Centerline")
    if r.eurivers: addlines(RIVEU, "rivers")
    if r.borders: addlines(ADM0, "borders")
    if r.states: addlines(ADM1, "states", lambda f: f["properties"].get("ADM0_A3") == "USA")
    for name, lat, lon, kind in r.anchors:
        x, y = P(lon, lat); out["anchors"].append({"name": name, "lat": lat, "lon": lon, "kind": kind, "x": round(x, 1), "y": round(y, 1)})
    for label, pts, style in r.lines:
        pr = [P(lon, lat) for lat, lon in pts]; out["lines"].append({"label": label, "style": style, "d": path(pr)})
    for label, lat, lon in r.seas:
        x, y = P(lon, lat); out["seas"].append({"label": label, "x": round(x, 1), "y": round(y, 1)})
    out["proj"] = {"lonW": r.bb[0], "latN": r.bb[3], "c": round(c, 5), "k": round(k, 5)}
    return out

REGIONS = [
 R("egypt", "The Two Lands", (28.6, 22.0, 35.6, 31.9), riverrank=9, anchors=[
   ("Pi-Ramesses", 30.80, 31.83, "city"), ("Tanis", 30.98, 31.88, "city"), ("Memphis", 29.85, 31.25, "city"), ("Giza", 29.98, 31.13, "landmark"), ("Heliopolis", 30.13, 31.32, "shrine"),
   ("The Fayum", 29.30, 30.85, "wild"), ("Amarna", 27.65, 30.90, "ruin"), ("Abydos", 26.18, 31.92, "shrine"), ("Thebes", 25.70, 32.64, "city"), ("Valley of the Kings", 25.74, 32.55, "landmark"),
   ("Deir el-Medina", 25.73, 32.60, "village"), ("Elephantine", 24.09, 32.90, "fort"), ("Serabit el-Khadim", 29.04, 33.46, "landmark"), ("Bubastis", 30.57, 31.51, "city"), ("Sais", 30.97, 30.77, "city"), ("Herakleopolis", 29.08, 30.93, "city"), ("Hermopolis", 27.78, 30.80, "city"), ("Koptos", 25.99, 32.82, "city"), ("Edfu", 24.98, 32.87, "shrine"), ("Pelusium", 31.04, 32.54, "fort"), ("Buhen", 21.9, 31.3, "fort")],
   seas=[("Great Green (Mediterranean)", 31.7, 31.0), ("Red Sea", 26.5, 35.0), ("Western Desert", 27.5, 29.4), ("Eastern Desert", 26.0, 33.9), ("Sinai", 29.6, 33.8)]),
 R("greece", "Hellas", (19.6, 35.0, 28.4, 41.4), tol=0.9, minarea=6, riverrank=7, anchors=[
   ("Athens", 37.98, 23.73, "city"), ("Piraeus", 37.94, 23.65, "city"), ("Delphi", 38.48, 22.50, "shrine"), ("Sparta", 37.08, 22.43, "city"), ("Corinth", 37.94, 22.93, "city"), ("Thebes", 38.32, 23.32, "city"),
   ("Olympia", 37.64, 21.63, "shrine"), ("Marathon", 38.15, 23.97, "landmark"), ("Megara", 37.99, 23.34, "city"), ("Argos", 37.63, 22.73, "city"), ("Delos", 37.40, 25.27, "shrine"), ("Mytilene", 39.11, 26.55, "city"),
   ("Samos", 37.75, 26.98, "city"), ("Thermopylae", 38.80, 22.56, "landmark"), ("Plataea", 38.22, 23.27, "village"), ("Eleusis", 38.04, 23.54, "shrine"), ("Salamis", 37.96, 23.50, "landmark"), ("Aegina", 37.75, 23.43, "city"),
   ("Pylos", 36.92, 21.70, "fort"), ("Potidaea", 40.19, 23.33, "fort"), ("Naupactus", 38.39, 21.83, "city"), ("Chalcis", 38.46, 23.60, "city"), ("Corcyra", 39.62, 19.92, "city"), ("Rhodes", 36.44, 28.22, "city"), ("Knossos", 35.30, 25.16, "ruin"), ("Miletus", 37.53, 27.28, "city"), ("Ephesus", 37.94, 27.34, "city"), ("Mycenae", 37.73, 22.76, "ruin"), ("Epidaurus", 37.60, 23.08, "shrine"), ("Larissa", 39.64, 22.42, "city"), ("Pella", 40.76, 22.52, "city"), ("Amphipolis", 40.82, 23.85, "fort"), ("Byzantium", 41.01, 28.98, "city")],
   seas=[("Aegean Sea", 38.6, 25.2), ("Ionian Sea", 37.6, 20.4), ("Sea of Crete", 35.9, 24.8)]),
 R("rome", "Italia", (6.6, 36.6, 18.7, 46.6), tol=0.9, minarea=8, riverrank=7, borders=False, anchors=[
   ("Rome", 41.89, 12.48, "city"), ("Ostia", 41.75, 12.29, "city"), ("Capua", 41.08, 14.25, "city"), ("Brundisium", 40.63, 17.94, "city"), ("Neapolis", 40.85, 14.27, "city"), ("Pompeii", 40.75, 14.49, "city"),
   ("Tarentum", 40.47, 17.24, "city"), ("Syracuse", 37.07, 15.29, "city"), ("Messana", 38.19, 15.55, "city"), ("Genua", 44.41, 8.93, "city"), ("Mediolanum", 45.46, 9.19, "city"), ("Ravenna", 44.42, 12.20, "city"),
   ("Arretium", 43.46, 11.88, "city"), ("Faesulae", 43.81, 11.29, "village"), ("Pistoria", 43.93, 10.92, "village"), ("Pisae", 43.72, 10.40, "city"), ("Ariminum", 44.06, 12.57, "city"), ("Praeneste", 41.84, 12.90, "fort"),
   ("Tibur", 41.96, 12.80, "village"), ("Tusculum", 41.80, 12.71, "village"), ("Antium", 41.45, 12.62, "city"), ("Cumae", 40.85, 14.05, "shrine"), ("Puteoli", 40.82, 14.12, "city"), ("Aquileia", 45.77, 13.37, "city"), ("Beneventum", 41.13, 14.78, "city"), ("Bononia", 44.49, 11.34, "city"), ("Placentia", 45.05, 9.70, "city"), ("Ancona", 43.62, 13.52, "city"), ("Rhegium", 38.11, 15.65, "city"), ("Lilybaeum", 37.80, 12.44, "city"), ("Caralis", 39.22, 9.11, "city"), ("Aleria", 42.10, 9.51, "city"), ("Mons Vesuvius", 40.82, 14.43, "landmark"), ("Lake Trasimene", 43.13, 12.10, "landmark"), ("Tullianum", 41.893, 12.484, "landmark")],
   lines=[("Via Appia", [(41.89,12.48),(41.66,12.82),(41.45,13.02),(41.27,13.44),(41.08,14.25),(41.13,14.78),(40.92,15.68),(40.47,17.24),(40.63,17.94)], "road"),
          ("Via Flaminia", [(41.89,12.48),(42.37,12.50),(42.75,12.62),(43.23,12.82),(43.51,13.05),(43.62,13.52),(44.06,12.57)], "road"),
          ("Via Aurelia", [(41.89,12.48),(42.10,11.80),(42.42,11.20),(43.02,10.60),(43.72,10.40),(44.41,8.93)], "road"),
          ("Via Cassia", [(41.89,12.48),(42.42,12.10),(42.72,11.64),(43.13,12.10),(43.46,11.88),(43.77,11.25),(43.93,10.92)], "road"),
          ("Via Latina", [(41.89,12.48),(41.80,12.71),(41.62,13.10),(41.48,13.42),(41.08,14.25)], "road")],
   seas=[("Mare Tyrrhenum", 40.2, 12.2), ("Mare Adriaticum", 43.2, 15.0), ("Mare Ionium", 38.6, 17.8), ("Mare Ligusticum", 43.6, 8.6)]),
 R("vikings", "The Northern Seas", (-8.2, 49.6, 12.6, 60.2), tol=1.0, minarea=8, riverrank=8, anchors=[
   ("York", 53.96, -1.08, "city"), ("Humber mouth", 53.63, -0.20, "landmark"), ("Thetford", 52.41, 0.75, "village"), ("Lindisfarne", 55.67, -1.80, "shrine"), ("Ribe", 55.33, 8.77, "city"), ("Hedeby", 54.49, 9.57, "city"),
   ("Lundenwic", 51.51, -0.12, "city"), ("Winchester", 51.06, -1.31, "city"), ("Repton", 52.84, -1.55, "shrine"), ("Nottingham", 52.95, -1.15, "fort"), ("Dublin", 53.35, -6.26, "city"), ("Jarrow", 54.98, -1.47, "shrine"),
   ("Whitby", 54.49, -0.61, "shrine"), ("Norwich", 52.63, 1.30, "village"), ("Gipeswic", 52.06, 1.16, "city"), ("Reading", 51.45, -0.97, "village"), ("Dun Eidyn", 55.95, -3.19, "fort"), ("Dumbarton", 55.94, -4.57, "fort"),
   ("Orkney", 59.00, -3.00, "wild"), ("Kaupang", 59.10, 10.05, "city"), ("Aros", 56.16, 10.20, "city"), ("Roskilde", 55.64, 12.08, "city"), ("Chippenham", 51.46, -2.12, "village"), ("Wareham", 50.69, -2.11, "fort"),
   ("Exeter", 50.72, -3.53, "city"), ("Chester", 53.19, -2.89, "fort"), ("Bamburgh", 55.61, -1.71, "fort"), ("Tamworth", 52.63, -1.69, "fort"), ("Canterbury", 51.28, 1.08, "shrine"), ("Iona", 56.33, -6.42, "shrine"), ("Thanet", 51.37, 1.35, "landmark"), ("Dorestad", 51.98, 5.34, "city"), ("Quentovic", 50.55, 1.62, "city"), ("Rouen", 49.44, 1.10, "city"), ("Ely", 52.40, 0.26, "shrine"), ("Peterborough", 52.57, -0.24, "shrine")],
   seas=[("North Sea", 55.5, 3.5), ("Irish Sea", 53.8, -4.8), ("The Channel", 50.2, -1.0), ("Skagerrak", 57.8, 8.5)]),
 R("samurai", "The Home Provinces", (132.6, 33.0, 141.4, 37.8), tol=0.9, minarea=6, riverrank=9, anchors=[
   ("Kiyosu", 35.22, 136.85, "fort"), ("Nagoya", 35.18, 136.91, "city"), ("Okehazama", 35.07, 136.97, "landmark"), ("Kyoto", 35.01, 135.77, "city"), ("Sakai", 34.57, 135.47, "city"), ("Mount Hiei", 35.07, 135.84, "shrine"),
   ("Inabayama", 35.42, 136.78, "fort"), ("Odawara", 35.26, 139.16, "fort"), ("Kofu", 35.66, 138.57, "fort"), ("Sunpu", 34.98, 138.38, "fort"), ("Okazaki", 34.95, 137.17, "fort"), ("Hamamatsu", 34.71, 137.73, "fort"),
   ("Ishiyama Hongan-ji", 34.69, 135.50, "shrine"), ("Nara", 34.68, 135.80, "shrine"), ("Azuchi", 35.15, 136.14, "village"), ("Ise Shrine", 34.46, 136.72, "shrine"), ("Kamakura", 35.32, 139.55, "shrine"), ("Edo", 35.68, 139.77, "village"),
   ("Kasugayama", 37.15, 138.22, "fort"), ("Kawanakajima", 36.60, 138.20, "landmark"), ("Nagashino", 34.93, 137.55, "fort"), ("Sekigahara", 35.37, 136.47, "landmark"), ("Hikone", 35.27, 136.26, "village"), ("Iga", 34.77, 136.13, "wild"), ("Kuwana", 35.06, 136.68, "city"), ("Tsu", 34.72, 136.51, "village"), ("Mount Fuji", 35.36, 138.73, "landmark"), ("Koyasan", 34.21, 135.58, "shrine"), ("Himeji", 34.84, 134.69, "fort"), ("Okayama", 34.66, 133.93, "fort"), ("Tottori", 35.50, 134.24, "fort"), ("Wakayama", 34.23, 135.17, "city"), ("Otsu", 35.00, 135.86, "village"), ("Gifu", 35.42, 136.76, "city"), ("Komaki", 35.29, 136.91, "fort"), ("Numazu", 35.10, 138.86, "village")],
   lines=[("Tōkaidō", [(35.01,135.77),(35.00,135.86),(35.06,136.68),(35.18,136.91),(34.95,137.17),(34.71,137.73),(34.98,138.38),(35.10,138.86),(35.26,139.16),(35.44,139.64),(35.68,139.77)], "road"),
          ("Nakasendō", [(35.01,135.77),(35.27,136.26),(35.37,136.47),(35.42,136.76),(35.79,137.30),(36.20,137.95),(36.25,138.50),(36.10,139.10),(35.68,139.77)], "road")],
   seas=[("Sea of Japan", 36.9, 135.3), ("Pacific Ocean", 33.6, 138.0), ("Ise Bay", 34.85, 136.75), ("Lake Biwa", 35.30, 136.08)]),
 R("pirates", "The Spanish Main", (-89.5, 8.0, -59.0, 36.5), tol=1.0, minarea=6, riverrank=5, borders=False, anchors=[
   ("Nassau", 25.06, -77.35, "city"), ("Port Royal", 17.94, -76.84, "fort"), ("Havana", 23.13, -82.38, "city"), ("Charles Town", 32.78, -79.93, "city"), ("Tortuga", 20.05, -72.79, "wild"), ("Petit-Goave", 18.43, -72.87, "village"),
   ("Santo Domingo", 18.47, -69.90, "city"), ("San Juan", 18.47, -66.11, "fort"), ("Cartagena", 10.42, -75.53, "fort"), ("Portobelo", 9.55, -79.65, "fort"), ("Basseterre", 17.30, -62.72, "village"), ("Bridgetown", 13.10, -59.62, "city"),
   ("Martinique", 14.60, -61.07, "village"), ("Curacao", 12.11, -68.93, "city"), ("Ocracoke", 35.11, -75.98, "wild"), ("Bath Town", 35.47, -76.81, "village"), ("St Augustine", 29.90, -81.31, "fort"), ("The 1715 wrecks", 27.64, -80.40, "landmark"),
   ("Eleuthera", 25.15, -76.15, "wild"), ("Santiago de Cuba", 20.02, -75.83, "fort"), ("Trinidad de Cuba", 21.80, -79.98, "village"), ("Bermuda", 32.30, -64.78, "village"), ("Kingston", 17.97, -76.79, "city"), ("Guadeloupe", 16.24, -61.53, "village"), ("Maracaibo", 10.64, -71.63, "city"), ("Ile-a-Vache", 18.07, -73.69, "wild"), ("Grand Cayman", 19.30, -81.38, "wild"), ("Belize wood camps", 17.50, -88.20, "wild"), ("Mosquito Coast", 13.5, -83.6, "wild"), ("Andros", 24.4, -77.9, "wild"), ("Isla de Pinos", 21.7, -82.8, "wild"), ("Savannah", 32.08, -81.09, "village"), ("Cape Fear", 33.85, -78.0, "landmark"), ("Cap-Francais", 19.76, -72.20, "city"), ("Veracruz road", 19.5, -86.4, "landmark"), ("Antigua", 17.12, -61.85, "fort"), ("St Thomas", 18.34, -64.93, "village"), ("Nevis", 17.15, -62.58, "village")],
   seas=[("Caribbean Sea", 15.0, -75.0), ("Gulf of Mexico", 25.5, -85.0), ("Atlantic Ocean", 30.0, -70.0), ("Bahama Banks", 24.0, -78.5), ("Windward Passage", 20.4, -73.9)]),
 R("wild-west", "The Frontier", (-114.5, 29.4, -93.8, 46.6), tol=1.2, minarea=25, riverrank=5, states=True, borders=True, anchors=[
   ("Dodge City", 37.75, -100.02, "city"), ("Deadwood", 44.38, -103.73, "village"), ("Lincoln", 33.49, -105.39, "village"), ("Tombstone", 31.71, -110.07, "village"), ("Santa Fe", 35.69, -105.94, "city"), ("Abilene", 38.92, -97.21, "city"),
   ("Denver", 39.74, -104.99, "city"), ("Cheyenne", 41.14, -104.82, "city"), ("Fort Laramie", 42.21, -104.53, "fort"), ("Fort Worth", 32.75, -97.33, "city"), ("San Antonio", 29.42, -98.49, "city"), ("El Paso", 31.76, -106.49, "city"),
   ("Tucson", 32.22, -110.97, "city"), ("Wichita", 37.69, -97.34, "city"), ("Independence", 39.09, -94.42, "city"), ("Leadville", 39.25, -106.29, "village"), ("Silver City", 32.77, -108.28, "village"), ("Fort Sumner", 34.47, -104.25, "fort"),
   ("Las Vegas NM", 35.59, -105.22, "village"), ("Albuquerque", 35.08, -106.65, "city"), ("Prescott", 34.54, -112.47, "village"), ("Little Bighorn", 45.57, -107.43, "landmark"), ("Fort Griffin", 32.93, -99.22, "fort"), ("Ogallala", 41.13, -101.72, "village"), ("Sidney", 41.14, -102.98, "village"), ("Kansas City", 39.10, -94.58, "city"), ("Caldwell", 37.03, -97.61, "village"), ("Tascosa", 35.51, -102.26, "village"), ("Fort Smith", 35.39, -94.40, "fort"), ("Trinidad", 37.17, -104.51, "village"), ("Pueblo", 38.25, -104.61, "city"), ("Fort Union", 35.91, -105.01, "fort"), ("Mesilla", 32.27, -106.80, "village"), ("Bent's Fort", 38.04, -103.43, "fort"), ("Council Grove", 38.66, -96.49, "village"), ("Raton Pass", 36.99, -104.48, "landmark"), ("Fort Sill", 34.67, -98.40, "fort"), ("Fort Dodge", 37.73, -99.93, "fort"), ("Hays City", 38.88, -99.33, "village"), ("Ellsworth", 38.73, -98.23, "village"), ("Fort Griffin", 32.93, -99.22, "fort"), ("Rapid City", 44.08, -103.23, "village"), ("Fort Pierre", 44.35, -100.38, "fort"), ("Red Cloud Agency", 42.67, -103.18, "village"), ("Black Hills", 43.9, -103.7, "landmark"), ("Pikes Peak", 38.84, -105.04, "landmark"), ("Palo Duro", 34.9, -101.6, "landmark"), ("Fort Davis", 30.60, -103.89, "fort"), ("Fort Stockton", 30.89, -102.88, "fort"), ("Fort Concho", 31.46, -100.45, "fort"), ("Austin", 30.27, -97.74, "city"), ("Dallas", 32.78, -96.80, "city"), ("Fort Apache", 33.79, -109.99, "fort"), ("Yuma", 32.69, -114.62, "village"), ("Fort Bowie", 32.15, -109.43, "fort"), ("Camp Grant", 32.86, -110.79, "fort")],
   lines=[("Santa Fe Trail", [(39.09,-94.42),(38.66,-96.49),(38.35,-98.0),(37.75,-100.02),(38.04,-103.43),(37.17,-104.51),(36.99,-104.48),(35.59,-105.22),(35.69,-105.94)], "trail"),
          ("Chisholm Trail", [(29.42,-98.49),(30.27,-97.74),(32.78,-97.33),(33.9,-97.6),(34.67,-98.0),(35.5,-97.7),(37.03,-97.61),(37.69,-97.34),(38.92,-97.21)], "trail"),
          ("Western Trail", [(32.93,-99.22),(33.9,-99.6),(35.0,-99.8),(36.5,-99.9),(37.75,-100.02),(41.13,-101.72),(44.38,-103.73)], "trail"),
          ("Goodnight-Loving Trail", [(31.46,-100.45),(31.2,-102.0),(31.6,-103.6),(32.4,-104.0),(34.47,-104.25),(35.59,-105.22),(37.17,-104.51),(38.25,-104.61),(39.74,-104.99),(41.14,-104.82)], "trail"),
          ("Oregon Trail", [(39.09,-94.42),(40.0,-96.8),(40.8,-98.6),(41.13,-101.72),(41.14,-102.98),(41.9,-104.0),(42.21,-104.53),(42.6,-106.3),(42.8,-108.2)], "trail")],
   seas=[("Indian Territory", 35.5, -97.2), ("Llano Estacado", 33.8, -102.2), ("Rocky Mountains", 40.6, -106.5), ("Great Plains", 40.8, -100.0), ("Dakota Territory", 45.2, -100.5), ("Sonora", 30.5, -111.0), ("Chihuahua", 30.0, -106.0)]),
 R("victorian", "London", (-0.235, 51.455, 0.045, 51.565), tol=0.6, minarea=4, riverrank=0, lakes=False, anchors=[
   ("Whitechapel", 51.517, -0.063, "district"), ("Spitalfields", 51.519, -0.075, "district"), ("Scotland Yard", 51.506, -0.125, "landmark"), ("Limehouse", 51.512, -0.037, "district"), ("Lyceum Theatre", 51.512, -0.120, "landmark"),
   ("The Strand", 51.511, -0.117, "district"), ("Mayfair", 51.510, -0.148, "district"), ("Westminster", 51.499, -0.125, "landmark"), ("Tower of London", 51.508, -0.076, "fort"), ("St Paul's", 51.514, -0.098, "shrine"),
   ("London Bridge", 51.508, -0.088, "landmark"), ("The Bank", 51.513, -0.089, "landmark"), ("Fleet Street", 51.514, -0.108, "district"), ("Covent Garden", 51.512, -0.123, "district"), ("Soho", 51.513, -0.134, "district"),
   ("Seven Dials", 51.514, -0.127, "district"), ("Bethnal Green", 51.527, -0.055, "district"), ("Shoreditch", 51.526, -0.078, "district"), ("Bow", 51.528, -0.019, "district"), ("Wapping", 51.504, -0.058, "district"),
   ("Rotherhithe", 51.498, -0.050, "district"), ("Southwark", 51.503, -0.094, "district"), ("Lambeth", 51.494, -0.116, "district"), ("Bermondsey", 51.498, -0.075, "district"), ("Holborn", 51.518, -0.112, "district"),
   ("Bloomsbury", 51.521, -0.126, "district"), ("King's Cross", 51.531, -0.124, "landmark"), ("Hyde Park", 51.507, -0.166, "wild"), ("Belgravia", 51.497, -0.153, "district"), ("Kensington", 51.500, -0.190, "district"),
   ("Chelsea", 51.487, -0.169, "district"), ("Isle of Dogs", 51.496, -0.017, "district"), ("Greenwich", 51.478, -0.011, "district"), ("West India Docks", 51.507, -0.022, "landmark"), ("Smithfield", 51.519, -0.102, "landmark"),
   ("Newgate", 51.515, -0.101, "fort"), ("Mile End", 51.525, -0.033, "district"), ("Aldgate", 51.514, -0.076, "district"), ("Hackney", 51.545, -0.055, "district"), ("Regent's Park", 51.531, -0.156, "wild"), ("Marylebone", 51.520, -0.153, "district"), ("Paddington", 51.516, -0.176, "landmark"), ("Camden Town", 51.539, -0.143, "district"), ("Clerkenwell", 51.524, -0.105, "district"), ("Islington", 51.536, -0.103, "district"), ("Battersea", 51.474, -0.160, "district"), ("Vauxhall", 51.486, -0.124, "district"), ("Pimlico", 51.489, -0.137, "district"), ("St James's", 51.506, -0.137, "district"), ("Charing Cross", 51.508, -0.125, "landmark"), ("Buckingham Palace", 51.501, -0.142, "landmark"), ("Millbank", 51.493, -0.128, "fort"), ("Elephant and Castle", 51.495, -0.100, "district"), ("Shadwell", 51.511, -0.056, "district"), ("Stepney", 51.517, -0.046, "district"), ("Poplar", 51.508, -0.017, "district"), ("Blackfriars", 51.512, -0.104, "landmark"), ("The Temple", 51.511, -0.113, "landmark"), ("Piccadilly", 51.509, -0.137, "district"), ("Oxford Street", 51.515, -0.142, "district"), ("Bethlem Hospital", 51.497, -0.109, "landmark"), ("Waterloo", 51.503, -0.113, "landmark"), ("Deptford", 51.480, -0.026, "district"), ("Bishopsgate", 51.517, -0.081, "district"), ("Commercial Street", 51.519, -0.073, "district"), ("Hanbury Street", 51.520, -0.072, "district"), ("Dorset Street", 51.518, -0.075, "district"), ("Mitre Square", 51.514, -0.078, "landmark"), ("Ratcliff Highway", 51.510, -0.055, "district"), ("Victoria Park", 51.536, -0.040, "wild"), ("Brick Lane", 51.521, -0.072, "district"), ("Old Nichol", 51.526, -0.072, "district"), ("Seven Sisters Road", 51.556, -0.11, "district"), ("Kennington", 51.487, -0.108, "district")],
   lines=[("River Thames", [(51.462,-0.235),(51.466,-0.215),(51.463,-0.195),(51.470,-0.178),(51.478,-0.165),(51.483,-0.149),(51.487,-0.135),(51.487,-0.127),(51.492,-0.123),(51.499,-0.122),(51.505,-0.121),(51.508,-0.118),(51.510,-0.108),(51.510,-0.100),(51.508,-0.092),(51.507,-0.085),(51.506,-0.077),(51.504,-0.068),(51.503,-0.060),(51.505,-0.050),(51.507,-0.042),(51.507,-0.036),(51.503,-0.031),(51.497,-0.029),(51.490,-0.026),(51.485,-0.018),(51.483,-0.009),(51.486,-0.003),(51.492,0.002),(51.499,0.005),(51.505,0.004),(51.509,0.010),(51.509,0.022),(51.505,0.032),(51.500,0.045)], "river")],
   seas=[("Thames", 51.478, -0.06), ("Hampstead heights", 51.560, -0.17), ("Hackney Marshes", 51.556, -0.02), ("Surrey side", 51.468, -0.09)]),
 R("ww2", "France, 1943", (-5.4, 41.9, 9.2, 51.4), tol=1.0, minarea=10, riverrank=7, borders=True, anchors=[
   ("Lyon", 45.76, 4.84, "city"), ("Paris", 48.86, 2.35, "city"), ("Marseille", 43.30, 5.37, "city"), ("The Vercors", 45.05, 5.45, "wild"), ("Perpignan", 42.70, 2.90, "city"), ("Pau", 43.30, -0.37, "city"),
   ("St-Jean-Pied-de-Port", 43.16, -1.24, "village"), ("Toulouse", 43.60, 1.44, "city"), ("Bordeaux", 44.84, -0.58, "city"), ("Vichy", 46.13, 3.43, "city"), ("Grenoble", 45.19, 5.72, "city"), ("Annecy", 45.90, 6.13, "city"),
   ("Limoges", 45.83, 1.26, "city"), ("Clermont-Ferrand", 45.78, 3.08, "city"), ("Nantes", 47.22, -1.55, "city"), ("Rennes", 48.11, -1.68, "city"), ("Brest", 48.39, -4.49, "fort"), ("Caen", 49.18, -0.37, "city"),
   ("Rouen", 49.44, 1.10, "city"), ("Lille", 50.63, 3.06, "city"), ("Reims", 49.26, 4.03, "city"), ("Nancy", 48.69, 6.18, "city"), ("Strasbourg", 48.57, 7.75, "city"), ("Dijon", 47.32, 5.04, "city"),
   ("Tours", 47.39, 0.69, "city"), ("Orleans", 47.90, 1.90, "city"), ("Nice", 43.71, 7.26, "city"), ("Toulon", 43.12, 5.93, "fort"), ("Montpellier", 43.61, 3.88, "city"), ("Nimes", 43.84, 4.36, "city"),
   ("Avignon", 43.95, 4.81, "city"), ("St-Etienne", 45.43, 4.39, "city"), ("Le Chambon-sur-Lignon", 45.06, 4.30, "village"), ("Oyonnax", 46.26, 5.66, "village"), ("Glieres plateau", 45.97, 6.33, "wild"), ("Mont Mouchet", 44.96, 3.37, "wild"),
   ("Chartres", 48.45, 1.49, "city"), ("Amiens", 49.89, 2.30, "city"), ("Compiegne", 49.42, 2.83, "city"), ("Drancy", 48.92, 2.45, "fort"), ("Natzweiler", 48.45, 7.25, "fort"), ("Cherbourg", 49.64, -1.62, "fort"),
   ("St-Nazaire", 47.27, -2.21, "fort"), ("Lorient", 47.75, -3.37, "fort"), ("Dieppe", 49.92, 1.08, "city"), ("Calais", 50.95, 1.86, "fort"), ("Geneva", 46.20, 6.14, "city"), ("Andorra", 42.51, 1.52, "village"),
   ("Hendaye", 43.36, -1.78, "village"), ("Montauban", 44.02, 1.35, "city"), ("Perigueux", 45.18, 0.72, "city"), ("Tulle", 45.27, 1.77, "city"), ("Oradour-sur-Glane", 45.93, 1.03, "village"), ("Bourges", 47.08, 2.40, "city"), ("Le Havre", 49.49, 0.11, "fort"), ("Bayonne", 43.49, -1.47, "city"), ("Lourdes", 43.09, -0.05, "shrine"), ("Carcassonne", 43.21, 2.35, "fort"), ("Besancon", 47.24, 6.02, "city"), ("Metz", 49.12, 6.18, "fort"), ("Verdun", 49.16, 5.38, "fort"), ("Mont-de-Marsan", 43.89, -0.50, "village"), ("Angouleme", 45.65, 0.16, "city"), ("Moulins", 46.56, 3.33, "city"), ("Chalon-sur-Saone", 46.78, 4.85, "city"), ("Vierzon", 47.22, 2.07, "village"), ("Bern", 46.95, 7.45, "city"), ("Brussels", 50.85, 4.35, "city"), ("San Sebastian", 43.32, -1.98, "city"), ("Turin", 45.07, 7.69, "city")],
   lines=[("Former demarcation line", [(43.10,-1.27),(43.30,-0.80),(43.89,-0.50),(44.55,-0.25),(45.10,0.10),(45.65,0.16),(46.05,0.70),(46.50,1.20),(46.95,1.70),(47.22,2.07),(47.05,2.60),(46.56,3.33),(46.45,4.12),(46.78,4.85),(47.09,5.49),(46.90,6.05),(46.35,6.10)], "wall")],
   seas=[("Atlantic", 46.0, -3.8), ("Mediterranean", 42.6, 4.8), ("The Channel", 50.0, -1.5), ("Bay of Biscay", 44.5, -3.0), ("Pyrenees", 42.75, 0.6), ("Alps", 45.0, 6.9), ("Massif Central", 45.1, 2.7)]),
 R("cold-war", "Berlin, 1961", (13.06, 52.37, 13.68, 52.64), tol=0.6, minarea=4, riverrank=9, eurivers=True, anchors=[
   ("Checkpoint Charlie", 52.5075, 13.3904, "landmark"), ("Friedrichstrasse", 52.5203, 13.3871, "landmark"), ("Bernauer Strasse", 52.535, 13.395, "district"), ("Glienicke Bridge", 52.4137, 13.0903, "landmark"), ("Tempelhof", 52.4736, 13.4017, "landmark"),
   ("Stasi HQ", 52.5145, 13.4880, "fort"), ("Kurfurstendamm", 52.5027, 13.3320, "district"), ("Brandenburg Gate", 52.5163, 13.3777, "landmark"), ("Reichstag", 52.5186, 13.3762, "landmark"), ("Potsdamer Platz", 52.5096, 13.3759, "landmark"),
   ("Alexanderplatz", 52.5219, 13.4132, "district"), ("Unter den Linden", 52.5170, 13.3888, "district"), ("Karl-Marx-Allee", 52.5180, 13.4350, "district"), ("Marienfelde camp", 52.4110, 13.3730, "landmark"), ("Tegel", 52.5597, 13.2877, "landmark"),
   ("Spandau", 52.535, 13.20, "district"), ("Wannsee", 52.42, 13.16, "wild"), ("Kreuzberg", 52.4938, 13.4034, "district"), ("Neukolln", 52.4811, 13.4350, "district"), ("Wedding", 52.5478, 13.3550, "district"),
   ("Prenzlauer Berg", 52.5388, 13.4244, "district"), ("Pankow", 52.569, 13.402, "district"), ("Treptow", 52.487, 13.462, "district"), ("Kopenick", 52.445, 13.575, "district"), ("Charlottenburg", 52.516, 13.304, "district"),
   ("Schoneberg", 52.482, 13.352, "district"), ("Zoo station", 52.5070, 13.3323, "landmark"), ("Ostbahnhof", 52.5104, 13.4346, "landmark"), ("Oberbaum bridge", 52.5019, 13.4453, "landmark"), ("Karlshorst", 52.484, 13.528, "fort"), ("Dahlem", 52.457, 13.287, "district"), ("Grunewald", 52.48, 13.25, "wild"), ("Teufelsberg", 52.498, 13.241, "landmark"), ("Bornholmer Strasse", 52.554, 13.397, "landmark"), ("Heinrich-Heine-Strasse", 52.507, 13.415, "landmark"), ("Sonnenallee", 52.475, 13.46, "landmark"), ("Humboldt University", 52.518, 13.393, "landmark"), ("Steglitz", 52.456, 13.32, "district"), ("Lichtenberg", 52.515, 13.50, "district"), ("Friedrichshain", 52.515, 13.455, "district"), ("Mitte", 52.522, 13.40, "district"), ("Tiergarten", 52.514, 13.35, "wild"), ("Schonefeld", 52.385, 13.52, "landmark"), ("Gatow", 52.474, 13.138, "landmark"), ("Invalidenstrasse", 52.527, 13.372, "landmark"), ("Museum Island", 52.519, 13.398, "landmark"), ("Gendarmenmarkt", 52.5136, 13.3927, "landmark"), ("Rudow", 52.41, 13.49, "district"), ("Frohnau", 52.63, 13.29, "district"), ("Muggelsee", 52.435, 13.64, "wild"), ("Weissensee", 52.55, 13.46, "district"), ("Hohenschonhausen", 52.55, 13.51, "fort"), ("Moabit", 52.53, 13.345, "district")],
   lines=[("The Wall (from 13 August)", [(52.63,13.29),(52.60,13.31),(52.58,13.36),(52.554,13.397),(52.545,13.393),(52.535,13.395),(52.532,13.385),(52.527,13.372),(52.520,13.376),(52.516,13.378),(52.510,13.376),(52.507,13.383),(52.5075,13.390),(52.507,13.415),(52.503,13.428),(52.502,13.445),(52.495,13.455),(52.489,13.462),(52.475,13.47),(52.455,13.48),(52.43,13.50),(52.41,13.49),(52.395,13.44),(52.40,13.37),(52.42,13.31),(52.44,13.29),(52.43,13.22),(52.414,13.09),(52.44,13.11),(52.474,13.138),(52.50,13.13),(52.535,13.12),(52.56,13.16),(52.58,13.20),(52.61,13.23),(52.63,13.29)], "wall")],
   seas=[("East Berlin", 52.545, 13.50), ("West Berlin", 52.47, 13.28), ("Potsdam", 52.40, 13.10), ("Havel", 52.45, 13.17)]),
]
out = {r.id: build(r) for r in REGIONS}
js = "  const MAP_REGIONS = " + json.dumps(out, separators=(",", ":")) + ";\n"
open("regions.js", "w").write(js)
for k, v in out.items(): print(k, "land", len(v["land"]), "lakes", len(v["lakes"]), "rivers", len(v["rivers"]), "borders", len(v["borders"]), "states", len(v["states"]), "anchors", len(v["anchors"]), "h", v["h"])
print("bytes", len(js))
