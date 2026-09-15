# AllahumaDiaet

Kalorientracker-App für iPhone und Android nach dem Prinzip „Scan & Go“: öffnen, Barcode scannen, Menge eintippen, fertig.

- Keine Werbung, kein Konto, keine Cloud: Alle Daten bleiben auf dem Gerät (SQLite).
- Produktdaten kommen von [Open Food Facts](https://world.openfoodfacts.org) (ODbL). Unbekannte Produkte werden einmalig manuell erfasst und lokal gespeichert.
- Kalorienziel nach Mifflin-St. Jeor × PAL-Faktor, Makroverteilung frei einstellbar (Standard 50 % KH / 30 % Protein / 20 % Fett).

## Auf dem Handy testen

1. Die App **Expo Go** installieren ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
2. Im Projektordner:

   ```bash
   npm install
   npx expo start
   ```

3. Den QR-Code im Terminal scannen – auf dem iPhone mit der Kamera-App, auf Android in Expo Go.
   Handy und PC müssen im selben WLAN sein. Klappt das nicht, `npx expo start --tunnel` verwenden.

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
