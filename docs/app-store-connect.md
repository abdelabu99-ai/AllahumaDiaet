# App Store Connect – Checkliste für HALABI

> **Arbeitsdokument, keine Rechtsberatung.** Wird nicht über GitHub Pages veröffentlicht (`_config.yml` → `exclude`).
> Alle offenen Punkte sind mit TODO markiert. Stand der Apple-Vorgaben: 15.09.2026 – vor dem Einreichen in App Store Connect gegenprüfen.

Reihenfolge ungefähr so, wie die Schritte aufeinander aufbauen.

## 1. Apple Developer Program

- [ ] Mitgliedschaft im [Apple Developer Program](https://developer.apple.com/programs/) als **Einzelperson** abschließen (99 USD/Jahr). Der dort angegebene Name erscheint im App Store als Anbieter.
      <!-- TODO: Entscheiden, auf welchen Namen das Konto läuft (Karim Abu Elkheir?). -->
- [ ] Zwei-Faktor-Authentifizierung für die Apple-ID aktiv.

## 2. App in App Store Connect anlegen

- [ ] *Apps → + → Neue App*
  - Plattform: iOS
  - Name: **HALABI** <!-- TODO: Prüfen, ob der Name im App Store noch frei ist und keine Markenrechte Dritter verletzt (z. B. Recherche im DPMA-Register und EUIPO). -->
  - Primäre Sprache: Deutsch
  - Bundle-ID: **de.abuelkheir.halabi** (muss zuerst unter *Certificates, Identifiers & Profiles* existieren – `eas build` legt sie beim ersten Build an)
  - SKU: frei wählbar, z. B. `halabi-ios`
  - Benutzerzugriff: Vollzugriff
- [ ] Unter *App-Informationen → Allgemeine Informationen* die **Apple-ID** (nur Ziffern) ablesen und in `eas.json` bei `submit.production.ios.ascAppId` statt `TODO_ASC_APP_ID` eintragen.
- [ ] Kategorie: **Gesundheit & Fitness** (primär). Sekundär optional, z. B. *Essen & Trinken*.
- [ ] Copyright: `2026 Karim Abu Elkheir` <!-- TODO: bestätigen -->

## 3. URLs

Die Seiten liegen im Ordner `docs/` und werden über GitHub Pages veröffentlicht.

- [ ] Alle TODOs in `docs/datenschutz.md`, `docs/impressum.md` und `docs/support.md` klären und entfernen.
- [ ] GitHub → Repository → *Settings → Pages* → *Deploy from a branch* → Branch `main`, Ordner `/docs` → *Save*.
- [ ] Nach ein paar Minuten prüfen, ob die Seiten erreichbar sind:
  - Datenschutz-URL: `https://abdelabu99-ai.github.io/AllahumaDiaet/datenschutz.html`
  - Support-URL: `https://abdelabu99-ai.github.io/AllahumaDiaet/support.html`
  - Impressum: `https://abdelabu99-ai.github.io/AllahumaDiaet/impressum.html`
- [ ] Datenschutz-URL unter *App-Datenschutz* und Support-URL in der Versionsseite eintragen. Beide sind für jede App Pflicht. Laut Apple muss die Support-URL zu echten Kontaktinformationen führen.
- [ ] Die gleichen URLs sind in der App hinterlegt (`src/legal/imprint.ts`). Ändern sie sich, dort anpassen.

## 4. App-Datenschutzangaben („Privacy Nutrition Label“)

### Vorschlag: „Keine Daten erfasst“

Apple definiert „erfassen“ (collect) als: Daten verlassen das Gerät so, dass du **oder deine Drittanbieter-Partner** länger darauf zugreifen können, als für die Beantwortung der Anfrage in Echtzeit nötig ist.

Warum „Keine Daten erfasst“ in Frage kommt:

- Profil, Gewicht, Tagebuch und selbst angelegte Produkte werden nur lokal in SQLite gespeichert. Es gibt keinen eigenen Server.
- Keine Analyse-, Werbe-, Tracking- oder Crash-Reporting-SDKs (siehe `package.json`).
- Barcode-Erkennung auf iOS läuft vollständig auf dem Gerät (AVFoundation/ZXing in `expo-camera`).
- Das Privacy Manifest (`app.json` → `ios.privacyManifests`) meldet `NSPrivacyTracking: false` und keine erfassten Datentypen.

**Wichtiger Vorbehalt – Open Food Facts:**
Beim Scannen gehen der Barcode und die IP-Adresse an die Open-Food-Facts-API, beim Anzeigen von Produktbildern die IP-Adresse an deren Bildserver. Open Food Facts speichert IP-Adressen nach eigener Datenschutzerklärung in Server-Logs (dort angegeben: 3 Jahre, für Sicherheit, technische Analysen und Statistik).

- Open Food Facts ist eine öffentliche Datenbank, deren Code nicht in der App steckt. Ob Apple sie als „Drittanbieter-Partner“ wertet, ist nicht eindeutig.
- Für IP-Adressen sagt Apple: je nach Verwendung als *Grobe Position*, *Geräte-ID* oder *Diagnose* angeben.
- Der Barcode könnte als *Suchverlauf* („Informationen über Suchen in der App“) gelten.

<!-- TODO: Entscheiden, ob „Keine Daten erfasst“ vertretbar ist. Vorsichtigere Alternative: „Suchverlauf“ – nicht mit der Identität verknüpft, nicht für Tracking, Zweck „App-Funktionalität“. Die Angaben müssen zur Datenschutzerklärung (docs/datenschutz.md) passen. -->

## 5. Altersfreigabe

- [ ] Fragebogen unter *App-Informationen → Altersfreigabe* ausfüllen. Voraussichtliche Antworten:
  - Nutzergenerierte Inhalte, Messaging/Chat, soziale Medien, Werbung, uneingeschränkter Webzugriff: **Nein**
  - Glücksspiel, Wettbewerbe, Lootboxen: **Keine**
  - Gewalt, Sexualität, Horror, Alkohol/Tabak/Drogen, Obszönitäten: **Keine**
  - **Gesundheits- oder Wellness-Themen:** Apple nennt ausdrücklich „Calorie tracking, dieting advice, or exercise recommendations“. Kalorien-Tracking ist die Kernfunktion → nicht „Keine“ angeben.
  - Medizinische oder Behandlungsinformationen: **Keine** (die App gibt keine Diagnosen, Medikamenten- oder Behandlungshinweise).
- [ ] Ergebnis prüfen. Nach Apples Tabelle führen Gesundheits-/Wellness-Themen voraussichtlich zu mindestens **13+**. <!-- TODO: tatsächliche Einstufung nach dem Ausfüllen notieren. -->
- Passt zur App: Die Berechnung ist ohnehin erst ab 18 Jahren freigegeben (`LIMITS.age` in `src/lib/nutrition.ts`).

## 6. EU-Händlerstatus (Digital Services Act)

Pflicht für jedes Konto, auch ohne Verkauf in der EU: *Business → Vereinbarungen → Compliance → Digital Services Act*.

**Was „Händler“ (Trader) bedeutet:** Wer im Zusammenhang mit seiner gewerblichen, geschäftlichen, handwerklichen oder beruflichen Tätigkeit handelt. Indizien laut EU-Kommission bzw. Apple:

- Einnahmen mit der App (Kaufpreis, In-App-Käufe, Werbung), besonders in größerem Umfang
- Werbung für eigene Produkte oder Dienstleistungen
- Umsatzsteuer-Registrierung
- Entwicklung im Rahmen des eigenen Berufs oder Unternehmens

Eher **kein** Händler: Hobby-Entwickler ohne Absicht, mit der App Geld zu verdienen.

**Folgen:**

- **Als Händler** müssen Anschrift (oder Postfach), Telefonnummer und E-Mail angegeben und von Apple verifiziert werden (Zwei-Faktor-Bestätigung, bei Einzelpersonen ggf. Nachweisdokumente). Apple **veröffentlicht Anschrift, Telefonnummer und E-Mail auf der App-Store-Seite** in allen 27 EU-Ländern.
- **Als Nicht-Händler** werden keine Kontaktdaten veröffentlicht. EU-Kunden wird angezeigt, dass Verbraucherschutzrechte gegenüber dir nicht gelten.
- Der Status lässt sich pro App ändern: *App-Informationen → App Store Regulations and Permits → Digital Services Act*.

<!-- TODO: Selbst einschätzen (ggf. mit rechtlicher Beratung), ob du Händler bist. HALABI ist kostenlos und werbefrei; Apple kann den Status nicht für dich bestimmen. -->

## 7. Screenshots

Anforderungen laut Apple (Stand siehe oben):

- 1 bis 10 Screenshots pro Displaygröße, Format `.png` oder `.jpg`, **ohne Alphakanal/Transparenz**.
- **Pflicht:** Screenshots für das **6,5"-Display** (1284 × 2778 px Hochformat), sofern keine 6,9"-Screenshots geliefert werden. Einfacher: direkt **6,9"** liefern (1320 × 2868, 1290 × 2796 oder 1260 × 2736 px) – die kleineren Größen skaliert Apple dann herunter.
- iPad-Screenshots sind nicht nötig, weil `ios.supportsTablet` auf `false` steht.

Vorschlag für 4–5 Motive: Dashboard mit Kalorienring · Scanner · Eintragen mit Mengeneingabe · Profil mit Tagesziel · Info & Rechtliches (optional).
<!-- TODO: Screenshots mit Beispieldaten erstellen (z. B. im iOS-Simulator über einen Mac-Dienst oder vom eigenen iPhone). Keine echten persönlichen Daten zeigen. -->

## 8. Notizen für die App-Prüfung

Unter *Versionsinformationen → App Review Information → Notizen* einfügen:

```text
HALABI ist ein Kalorien- und Makrotracker nach dem Prinzip „Scannen und eintragen“.

- Kein Login erforderlich, keine Konten, keine In-App-Käufe, keine Werbung.
- Alle Nutzerdaten werden ausschließlich lokal auf dem Gerät gespeichert (SQLite).
- Beim ersten Start wird ein Profil (Alter, Größe, Gewicht, Aktivität) abgefragt, um ein Kalorienziel zu berechnen.
- Produktdaten werden über die öffentliche Open-Food-Facts-API anhand des Barcodes abgefragt.

Testen ohne Lebensmittel zur Hand:
Auf dem Startbildschirm „Scannen“ antippen und im Scanner unten „Nummer eintippen“ wählen. Eine der folgenden Barcode-Nummern eingeben:

1. 4000417025005 – Ritter Sport Marzipan
2. 8076800195057 – Barilla Spaghetti Nº5
3. 4001724819806 – Dr. Oetker Ristorante Pizza Mozzarella

Anschließend eine Menge in Gramm eingeben und „Speichern“ antippen.
Unbekannte Barcodes führen zu einem Formular, in dem Nährwerte einmalig manuell erfasst werden.

Die Kamera-Berechtigung wird nur für das Scannen von Barcodes verwendet.
Daten löschen: Startbildschirm → „Info & Rechtliches“ → „Alle Daten löschen“.
```

Die drei Barcodes wurden am 15.09.2026 über die Open-Food-Facts-API mit der App-eigenen Funktion `parseProduct` geprüft; alle lieferten `status: found` mit vollständigen Nährwerten. Open Food Facts wird von Freiwilligen gepflegt – vor dem Einreichen kurz in der App gegenprüfen.

- [ ] Kontaktdaten für die App-Prüfung (Name, Telefon, E-Mail) ausfüllen. Diese sind nur für Apple sichtbar.
- [ ] Anmeldung erforderlich: **Nein**.

## 9. Store-Texte (Entwurf, Deutsch)

Ohne Heilversprechen und ohne medizinische Aussagen.

**Name** (max. 30 Zeichen): `HALABI`

**Untertitel** (max. 30 Zeichen, 25 genutzt): `Kalorien scannen & zählen`

**Keywords** (max. 100 Bytes, Umlaute zählen doppelt; 98 Bytes genutzt, ohne App-Namen):

```text
Kalorienzähler,Kalorien,Makros,Barcode,Scanner,Ernährung,Protein,Nährwerte,Lebensmittel,Tracker
```

**Werbetext** (optional, max. 170 Zeichen):

```text
Barcode scannen, Menge eintippen, fertig: Kalorien und Makros in Sekunden erfassen – ohne Konto, ohne Werbung.
```

**Beschreibung** (max. 4000 Zeichen):

```text
HALABI macht das Erfassen von Kalorien und Makronährstoffen so schnell wie möglich: App öffnen, Barcode scannen, Menge eintippen, speichern. Mehr nicht.

SCANNEN UND EINTRAGEN
• Barcode-Scanner für EAN, UPC und QR-Codes auf Lebensmittelverpackungen
• Taschenlampe für schlechtes Licht und Eingabe der Barcode-Nummer von Hand
• Produktdaten aus der offenen Datenbank Open Food Facts
• Fehlt ein Produkt, trägst du die Nährwerte einmal ein – beim nächsten Scan ist es sofort da, auch ohne Internet
• Schnellauswahl für Packung, 100 g, Esslöffel und Teelöffel

DEIN TAG AUF EINEN BLICK
• Kalorienring mit verbleibenden Kalorien
• Balken für Protein, Kohlenhydrate und Fett
• Einträge nach Frühstück, Mittagessen, Abendessen und Snacks

DEIN TAGESZIEL
• Berechnung aus Alter, Größe, Gewicht, Zielgewicht und Aktivität
• Makroverteilung frei einstellbar

OHNE BALLAST
• Kein Konto, keine Anmeldung
• Keine Werbung, kein Tracking
• Alle Einträge bleiben auf deinem Gerät
• Alle Daten mit einem Tipp löschbar

Die berechneten Werte sind Richtwerte und ersetzen keine ärztliche oder ernährungsfachliche Beratung.

Produktdaten und -bilder: Open Food Facts (ODbL / CC BY-SA).
```

<!-- TODO: Texte final prüfen. Keine Aussagen wie „hilft beim Abnehmen“, „gesünder leben“ o. Ä. ergänzen. -->

## 10. Build und Einreichen

- [ ] `eas login`, `eas init` (siehe README, Abschnitt „Veröffentlichen“)
- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios --profile production`
- [ ] Build in App Store Connect der Version zuordnen, Exportkontrolle ist über `usesNonExemptEncryption: false` bereits beantwortet.
- [ ] Optional vorher per **TestFlight** auf dem eigenen iPhone testen (Kamera, Tastatur, Splash-Screen, Icon).
- [ ] *Zur Prüfung einreichen*.
