# HALABI

Kalorientracker-App für iPhone und Android nach dem Prinzip „Scan & Go“: öffnen, Barcode scannen, Menge eintippen, fertig.

- Keine Werbung, kein Konto, keine Cloud: Alle Daten bleiben auf dem Gerät (SQLite).
- Produktdaten kommen von [Open Food Facts](https://world.openfoodfacts.org) (ODbL). Unbekannte Produkte werden einmalig manuell erfasst und lokal gespeichert.
- Kalorienziel nach Mifflin-St. Jeor × PAL-Faktor, Makroverteilung frei einstellbar (Standard 50 % KH / 30 % Protein / 20 % Fett).

## Auf dem Handy testen

1. Die App **Expo Go** installieren ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
2. Im Projektordner:

   ```bash
   npm install
   npx expo start --go
   ```

   `--go` ist nötig, weil das Projekt `expo-dev-client` enthält und `expo start` sonst einen Development Build erwartet.

3. Den QR-Code im Terminal scannen – auf dem iPhone mit der Kamera-App, auf Android in Expo Go.
   Handy und PC müssen im selben WLAN sein. Klappt das nicht, `npx expo start --go --tunnel` verwenden.

## Entwicklung

```bash
npm test          # Rechenlogik, Barcode- und API-Parsing
npm run typecheck # TypeScript
```

| Ordner | Inhalt |
| --- | --- |
| `src/app` | Screens (Expo Router): Dashboard, Profil, Scanner, Produkt eintragen |
| `src/db` | SQLite-Schema und Abfragen |
| `src/lib` | Reine Logik: Nährwerte, Barcodes, Open Food Facts, Formatierung |
| `src/components` | UI-Bausteine |
| `tests` | Tests mit dem eingebauten Node-Testrunner |

## Veröffentlichen

Gebaut und hochgeladen wird mit [EAS](https://docs.expo.dev/eas/) in der Cloud – ein Mac ist nicht nötig.
Die Profile stehen in `eas.json`:

| Profil | Zweck |
| --- | --- |
| `development` | Development Build mit `expo-dev-client` zum Testen nativer Änderungen, interne Verteilung |
| `preview` | Release-Build zum Testen auf registrierten Geräten, interne Verteilung |
| `production` | Build für den App Store; die Build-Nummer wird automatisch erhöht |

Versionsnummern verwaltet EAS zentral (`cli.appVersionSource: "remote"`). Die sichtbare Version (`1.0.0`) steht weiterhin in `app.json` unter `version` und wird dort für jedes Update von Hand erhöht.

### Einmalig einrichten

```bash
npm install -g eas-cli
eas login
eas init
```

`eas init` legt das Projekt bei Expo an und trägt `extra.eas.projectId` in `app.json` ein. Danach `slug` nicht mehr ändern.

### App Store

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Beim ersten Build fragt EAS nach dem Apple-Konto und erstellt Zertifikat und Provisioning Profile selbst. Nichts davon gehört ins Repository.

**`ascAppId` eintragen:** In `eas.json` steht unter `submit.production.ios.ascAppId` der Platzhalter `TODO_ASC_APP_ID`. Nachdem die App in App Store Connect angelegt ist, dort unter *App-Informationen → Apple-ID* die Nummer ablesen (nur Ziffern) und den Platzhalter damit ersetzen. Bis dahin fragt bzw. scheitert `eas submit`.

### Auf eigenen Geräten testen (optional)

```bash
eas device:create
eas build --platform ios --profile preview
```

iPhones müssen für interne Builds vorher mit `eas device:create` registriert werden.

Weitere Schritte außerhalb des Codes (Datenschutzangaben, Screenshots, Altersfreigabe …) stehen in [`docs/app-store-connect.md`](docs/app-store-connect.md).
