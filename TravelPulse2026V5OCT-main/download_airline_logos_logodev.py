#!/usr/bin/env python3
"""
Download airline logos into assets/Airline-logo/<IATA>.png  -  NO API KEY, NO SIGNUP.

Run from the project root (the folder with index.html):
    python download_airline_logos_nokey.py              (Windows)
    python3 download_airline_logos_nokey.py             (Mac/Linux)
Set SKIP_EXISTING=1 to keep files you already have.

For each airline it tries, in order:
  1) pics.avs.io          - airline logo by IATA code
  2) images.kiwi.com      - airline logo by IATA code
  3) Google favicon       - the airline website's icon (low-res but fine at 18x18 px; last resort)
Codes that fail everywhere are listed at the end. Logos are airline trademarks - check your usage rights.
"""
import os, time, urllib.request, urllib.error

DOMAINS = {
 "EK":"emirates.com","QR":"qatarairways.com","BA":"ba.com","SQ":"singaporeair.com","LH":"lufthansa.com",
 "AF":"airfrance.com","FR":"ryanair.com","DL":"delta.com","TK":"turkishairlines.com","AA":"aa.com",
 "SV":"saudia.com","CA":"airchina.com","IB":"iberia.com","AI":"airindia.com","CX":"cathaypacific.com",
 "KE":"koreanair.com","MU":"ceair.com","UA":"united.com","SU":"aeroflot.ru","AC":"aircanada.com",
 "KL":"klm.com","MH":"malaysiaairlines.com","6E":"goindigo.in","RJ":"rj.com","KQ":"kenya-airways.com",
 "GA":"garuda-indonesia.com","SA":"flysaa.com","QF":"qantas.com","TG":"thaiairways.com","U2":"easyjet.com",
 "MS":"egyptair.com","CZ":"csair.com","LX":"swiss.com","GF":"gulfair.com","JL":"jal.com",
 "EY":"etihad.com","VS":"virginatlantic.com","G9":"airarabia.com","NH":"ana.co.jp","EI":"aerlingus.com",
 "AZ":"ita-airways.com","LA":"latamairlines.com","FD":"thaiairasia.com","AK":"airasia.com","OZ":"flyasiana.com",
 "VY":"vueling.com","HV":"transavia.com","VA":"virginaustralia.com","TR":"flyscoot.com","PC":"flypgs.com",
 "WS":"westjet.com","UX":"aireuropa.com","EW":"eurowings.com","FA":"flysafair.co.za","P4":"flyairpeace.com",
 "TP":"flytap.com","AD":"voeazul.com.br","JT":"lionair.co.id","FZ":"flydubai.com","G3":"voegol.com.br",
 "JQ":"jetstar.com","ID":"batikair.com","B2":"belavia.by","PK":"piac.com.pk","XY":"flynas.com","XQ":"sunexpress.com",
}

BY_CODE = ["https://pics.avs.io/200/200/{c}.png", "https://images.kiwi.com/airlines/128x128/{c}.png"]
FAVICON = "https://www.google.com/s2/favicons?domain={d}&sz=128"
OUT = os.path.join("assets", "Airline-logo"); os.makedirs(OUT, exist_ok=True)
PNG = b"\x89PNG\r\n\x1a\n"
SKIP = os.environ.get("SKIP_EXISTING") == "1"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (TravelPulse logo fetch)"})
    return urllib.request.urlopen(req, timeout=20).read()

ok, icon_only, failed = [], [], []
for code, domain in DOMAINS.items():
    dest = os.path.join(OUT, f"{code}.png")
    if SKIP and os.path.exists(dest): print("SKIP ", code); continue
    got, how = None, ""
    for tpl in BY_CODE:
        try:
            d = get(tpl.format(c=code))
            if d.startswith(PNG) and len(d) > 600: got, how = d, "logo"; break
        except (urllib.error.URLError, TimeoutError, OSError): pass
    if not got:
        try:
            d = get(FAVICON.format(d=domain))
            if d.startswith(PNG) and len(d) > 300: got, how = d, "website icon"
        except (urllib.error.URLError, TimeoutError, OSError): pass
    if got:
        open(dest, "wb").write(got); (ok if how == "logo" else icon_only).append(code)
        print("OK   ", code, f"({how})")
    else:
        failed.append(code); print("MISS ", code)
    time.sleep(0.15)

print(f"\nLogos: {len(ok)}   Website icons (fallback): {len(icon_only)}   Missing: {len(failed)}")
if icon_only: print("Icons only (replace by hand if you want the full logo):", ", ".join(icon_only))
if failed:    print("Missing:", ", ".join(failed))