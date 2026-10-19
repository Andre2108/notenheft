# Notenheft 6.2 – Stundenplan, Termine & Noten, verschlüsselt

Eine Web-App (PWA) für iPhone und Windows-Laptop: Stundenplan mit Heute-Ansicht, Prüfungs-Countdown, Unterrichtsausfälle und Ferien – kombiniert mit der schnellen Erfassung mündlicher Noten (1–6).

## Neu in Version 6.2

- **Ferienwochen:** Keine Kachel „Mündliche Noten eintragen“, keine fehlenden Noten, keine Erinnerung. In der Noteneingabe steht ein Hinweis statt der Liste; die Wochen-Pfeile springen über die Ferien. Seit 6.2.1.
- **Nachschrift-To-do:** Wer bei einer Klassenarbeit/Klausur „nicht mitgeschrieben“ hat (aus dem Klausurmanager oder von Hand), steht automatisch auf einem To-do „Nachschrift planen: …“ zur nächsten Stunde des Kurses – mit den Namen (nur auf deinen Geräten). Sobald alle eine Note haben, ist es erledigt. Ein gelöschtes Nachschrift-To-do kommt nicht wieder.

## Neu in Version 6.1

- Neuer Reiter **„Eintragen“** in der Mitte: To-do, Termin, Ausfall, Prüfung, Tausch, mündliche Noten, Vokabeltest, Klausurnoten einfügen.
- **Heute:** Termine stehen direkt unter den Kacheln. Die nächste Stunde erscheint erst am Vortag („Morgen: …“).
- **Termine** aufklappen → **„Im iOS-Kalender öffnen“** (springt im Kalender zu Tag und Uhrzeit).
- **Kein Zoomen** mehr durch Doppeltippen oder zwei Finger. Beim Wegwischen eines Fensters bleibt die Seite dahinter stehen.
- **Kurse:** Keine Kursleiste mehr; im Kurs oben „Alle Kurse“.
- **Schülerlisten** nach Nachnamen sortiert.
- **Noten-Übersicht** mit den Spalten **SoMi** und **schriftl.**; Zeiträume in der Oberstufe auch als Quartal („Aktuelles Quartal“, „1. Quartal“ …), in der Sek I als Halbjahr.

## Neu in Version 6.0 – aufgeräumt

- **Vier Reiter:** Heute (Start und Tagesübersicht in einem) · Planer (Woche / Termine / Jahr oben umschaltbar) · Kurse · Mehr.
- **Heute:** Begrüßung mit deinem Namen (Mehr → „Dein Name für die Begrüßung“), Ferien-Countdown als Streifen, Kacheln **Dienstlich** und **Privat** mit der richtigen Anzahl, Termine getrennt und **aufklappbar** (Uhrzeit, Ort, bei privaten Terminen die Beschreibung).
- **Termine ausblenden:** Termin aufklappen → „Solche Termine nie mehr anzeigen“. Die offene Sprechstunde ist von Anfang an ausgeblendet.
- **WebUntis:** Es erscheinen nur noch Stunden, die WebUntis ausdrücklich als Vertretung, Verlegung oder Raumänderung kennzeichnet.
- **Fehlende mündliche Noten:** eigene Übersicht je Woche und Kurs (Kachel auf Heute), ein Tipp öffnet die Eingabe. Beim Eintragen: **„Woche hat nicht stattgefunden“**. Je Kurs: **„Keine mündlichen Noten mehr eintragen“** (Kurs → Zahnrad).
- **Klausurnoten:** Statt „Klausur auswerten“ fragt Heute nach, wenn eine Klausur seit mehr als einem Tag fertig korrigiert ist und noch keine Noten angekommen sind.
- **To-dos** mit Uhrzeit und „am Morgen des Fälligkeitstags um 7:15 Uhr erinnern“ – als Push-Nachricht (bis zu 30 Minuten Verzögerung möglich).
- **Termin:** „Durch den Termin fallen Stunden aus“ – Kurse ankreuzen, die Ausfälle entstehen automatisch.
- **Excel:** Deine Termine landen automatisch (stündlich, sobald der PC an ist) in `OneDrive/Unterricht/Notenheft-Termine.xlsx` neben der Ganzjahresplanung.
- **Fenster schließen:** einfach nach unten wischen.
- **Jahr:** ohne „Stunden je Kurs“.

## Neu in Version 5.8 – Erinnerung am Freitag

- **Push-Nachricht** freitags gegen 15 Uhr, wenn für die Woche noch mündliche Noten fehlen (nicht in Ferienwochen). Einschalten auf jedem Gerät unter **Mehr → Erinnerung am Freitag → „Auf diesem Gerät einschalten“**, danach „Testnachricht“.
- iPhone: Notenheft vom Home-Bildschirm öffnen (iOS 16.4 oder neuer) und Mitteilungen erlauben.
- Gesendet wird von einer GitHub-Aufgabe im privaten Repo `notenheft-daten` – der PC muss nicht an sein. Online liegt dafür nur die **Anzahl** fehlender Noten, keine Namen und keine Kurse.

## Neu in Version 5.7 – Kalender

- Der PC (Klausurmanager) schickt stündlich deine Kalender verschlüsselt ins Notenheft: **Schulkalender** aus Outlook (nur Schulkonto: „Kalender“ und „Termine SHG“), **Privat** aus Google und **WebUntis**.
- Sichtbar auf **Start** (Kasten „Heute“, getrennt Schule/Privat), unter **Heute** und unter **Termine** mit den Filtern „Schulkalender“ und „Privat“.
- **WebUntis:** Entfällt eine eigene Stunde, trägt das Notenheft automatisch einen Ausfall ein. Vertretungen erscheinen als Termin.
- **Datenschutz:** Schülernamen in Termintiteln werden am PC vor dem Senden durch „Kürzel (Klasse)“ ersetzt. Beschreibungen und Teilnehmende werden nie übertragen. Andere Namen (Eltern, Kolleg·innen) bitte nicht in Termintitel schreiben.
- Einrichtung Google/WebUntis am PC: `python3 skripte
otenheft_kalender.py einrichten` (fragt nach den geheimen iCal-Adressen; sie bleiben nur auf dem PC).

## Neu in Version 5.6

- **Mündliche Noten einmal pro Woche:** Pro Kind eine Wochennote, erneutes Antippen ersetzt sie. Wer lieber einzelne Stunden benotet: Kurs → Zahnrad → „Mündliche Noten: für einzelne Unterrichtsstunden“.
- **Start:** Oben ein Kasten „Heute“ mit den Terminen des Tages und dem Countdown „Schultage bis zu den nächsten Ferien“.
- **Mündliche Prüfung** unter Kurs → Arbeiten/Klausuren („+ Mündliche Prüfung“); zählt zum schriftlichen Teil.
- **Gewichtung je Arbeit** (×0,5 bis ×3) über den Stift in der Arbeit; die Zeugnisrechnung zeigt „Schriftlich Ø (gewichtet)“.
- **Schüleransicht:** zwei Kurven – mündlich (Wochenschnitt) und schriftlich inkl. mündlicher Prüfung.
- **Tendenz** ↑ → ↓: letzte 4 Wochen gegenüber der Zeit davor.
- **Woche:** deutliche Pfeile „‹ Woche“ / „Nächste ›“.
- **Kurs-Überblick:** „Ausfälle bis zu den nächsten Ferien“ zeigt nur kommende Ausfälle; vergangene zum Aufklappen.
- **Ergebnis aus der Korrektur-App einfügen** (Kurs → Arbeiten/Klausuren): In der Korrektur-App „An Notenheft senden“ tippen, im Notenheft einfügen – ohne PC. Seit 5.6.1.
- **Jahr:** „verbleibend“ steht vorn, neu „Arbeiten offen“ bis Halbjahresende (5/6: 3, Kl. 7: 3 bzw. 2, 8–10 und Oberstufe: 2 pro Halbjahr; je Kurs änderbar). Kalender und „Stunden je Kurs“ monatsweise mit Pfeilen – die Seite ist deutlich kürzer.

## Neu in Version 5.5 – Klausurnoten kommen automatisch aus dem Klausurmanager

Nach jeder Auswertung im Klausurmanager stehen die Noten von selbst unter **Kurs → Arbeiten/Klausuren** – ohne Abtippen.

**Einrichten (einmalig):**
1. **Mehr → Klausurmanager → Verbindungscode** antippen, **Kopieren** und den Code am PC an den Klausurmanager geben (`python3 skripte\notenheft_senden.py verbinden KM1.…` oder einfach Claude geben). Die Synchronisierung über GitHub muss dafür eingerichtet sein.
2. Pro Kurs einmal: **Kurs → Zahnrad → Kinder → „Aus Kürzel-Tabelle übernehmen“** und die `Kürzel-Tabelle_<Schuljahr>.xlsx` wählen. Das passende Tabellenblatt ist vorgewählt. Vorhandene Kinder (und ihre Noten) bleiben, sie bekommen nur ihr Kürzel; fehlende Kinder werden als „Vorname N.“ angelegt. Gelesen werden nur Vorname, Nachname und „Kürzel (final)“.

**Danach:** Klausur wie gewohnt im Klausurmanager auswerten – beim nächsten Öffnen des Notenhefts sind die Noten da (Meldung unten). Lässt sich der Kurs nicht eindeutig erkennen, erscheint unter Kurs → Arbeiten/Klausuren „Neue Noten aus dem Klausurmanager“ mit einem Knopf zum Zuordnen.

- Eine Note pro Kind und Arbeit. Änderst du im Notenheft später eine Note von Hand, bleibt deine Änderung. Eine erneute Auswertung im Klausurmanager überschreibt ältere Stände.
- Wer nicht mitgeschrieben hat, steht als „nicht mitgeschrieben“; die Note einer Nachschrift kommt später in dieselbe Arbeit.
- Eine im Notenheft gelöschte Arbeit kommt nicht zurück.
- Der **Fokusschwerpunkt** aus dem Erwartungshorizont steht unter der Note und als Beobachtung beim Kind (auch auf dem Elternsprechtag-Blatt). Seit 5.5.1.
- Notlösung ohne GitHub: Der Klausurmanager legt dieselbe verschlüsselte Datei `…_Notenheft.json` in den Klausurordner. **Mehr → Klausurmanager → Ergebnisdatei importieren.**

**Datenschutz:** Übertragen werden nur Kürzel und Noten, keine Namen. Der Klausurmanager verschlüsselt sie mit einem „offenen Schloss“ (öffentlicher Schlüssel) aus dem Verbindungscode; aufschließen kann nur dein Notenheft (der private Schlüssel liegt in deinen mit dem Passwort verschlüsselten Daten). Die Datei liegt im selben privaten Repo `notenheft-daten` im Ordner `eingang`. Der Verbindungscode enthält weder Passwort noch Token. Wie bei `notenheft.enc.json` bleiben ältere verschlüsselte Stände im Verlauf des Repos – siehe Löschfristen.

**Update von 5.4:** Alle Dateien wie gewohnt ins Repo `notenheft` hochladen und **beide Geräte** aktualisieren (App einmal ganz schließen und neu öffnen).

## Neu in Version 5.4 – Kürzel statt Namen online

- Beim Anlegen bekommt jedes Kind automatisch ein zufälliges Kürzel (z. B. `K7F3Q`). **Nur Kürzel, Kurse, Noten und Daten werden synchronisiert** – die Klarnamen verlassen das Gerät nie.
- Die Namensliste liegt lokal und verschlüsselt auf jedem Gerät; in der App siehst du überall die Klarnamen.
- **Zweites Gerät:** Mehr → „Namensliste für anderes Gerät“ erzeugt einen passwortverschlüsselten Code, am anderen Gerät Mehr → „Namensliste importieren“. Nötig nur einmal und wieder, wenn sich eine Klassenliste ändert.
- **Update von 5.3:** Beim ersten Entsperren werden vorhandene Namen automatisch in die lokale Liste verschoben und Kürzel vergeben. Danach auf dem zweiten Gerät aktualisieren und die Namensliste importieren.
- Die Sicherungsdatei (Mehr → Sicherung) enthält die Namen weiterhin, ist aber mit deinem Passwort verschlüsselt.
- Hinweis: Frühere Sync-Stände mit Namen (verschlüsselt) bleiben im Verlauf des GitHub-Repos erhalten. Für einen sauberen Schnitt das Repo `notenheft-daten` löschen und neu anlegen.
- Das ist eine Pseudonymisierung, keine Anonymisierung: Zusammen mit der lokalen Namensliste bleiben es personenbezogene Daten. Schreibe keine Klarnamen in Notizen oder To-dos.

## Neu in Version 5.3 – Startmenü nur mit echten Aktionen

- „Was möchtest du tun?“ zeigt nur noch Dinge, die man jetzt tun kann (keine reinen Ansichten mehr – die sind unten in der Leiste):
  - **Mündliche Noten eintragen** (wenn Kurse mit Kindern da sind)
  - **To-dos erledigen** – nur wenn für heute/morgen etwas fällig ist
  - **Klassenarbeit/Klausur auswerten** – nur wenn eine Prüfung der letzten 60 Tage noch keine Noten hat
  - **Vokabeltest eintragen** – nur in Kursen mit Vokabeltests
  - **Zeugnisnoten festlegen** – nur in den 3 Wochen vor dem Zeugnis
  - **Blaue Briefe prüfen** – nur im 2. Halbjahr, bis 30 Tage vor der Frist
- Darunter „Neu eintragen“: To-do, Termin, Ausfall, Prüfung, Stunden tauschen.

## Version 5.2.1 – eine Note pro Stunde

- Pro Kind und Termin (Kurs + Datum) gibt es nur noch **einen** Eintrag (Note, „fehlte“ oder „ohne Note“). Erneutes Antippen **ersetzt** den Eintrag („Note 4 → Note 3 (geändert)“, mit Rückgängig). Die Note des gewählten Tages ist umrandet.
- Beim Bearbeiten kann ein Eintrag nicht auf einen Tag verschoben werden, an dem das Kind schon eine Note hat.
- Bereits vorhandene Doppel-Einträge werden beim Entsperren einmalig bereinigt (die zuletzt eingetragene Note zählt); die Durchschnitte rechnen immer nur mit einer Note pro Termin.

## Version 5.2 – „Heute“ neu geordnet

1. **Anstehender Unterricht** – nur Stunden, die noch kommen (bzw. gerade laufen); gehaltene Stunden lassen sich einblenden.
2. **Termine heute** – alle Einträge des Tages.
3. **Bald – die nächsten 3 Tage** – Prüfungen, Ausfälle, Termine, Tausche, Ferienbeginn und Feiertage mit Vorlauf von drei Tagen, dazu Erinnerungen (fehlende Noten, Blaue Briefe).
4. **To-dos** – „Heute erledigen“ (inkl. überfällige) und „Schon für morgen vorbereiten“.
- Die vier Farbfelder oben zeigen genau diese Bereiche und springen beim Antippen dorthin.

## Version 5.1 – Startmenü

- Beim Öffnen erscheint ein **Startmenü**: Begrüßung, die aktuelle bzw. nächste Stunde als großes Farbfeld und „Was möchtest du tun?“ mit großen Kacheln (Noten eintragen, Heute, Diese Woche, To-dos, Termine & Ausfälle, Kurse & Noten, Ganzjahresplanung, Einstellungen) sowie Schnell-Eintragen (To-do, Termin, Ausfall, Prüfung, Tausch).
- „Noten eintragen“ öffnet direkt den Kurs der laufenden (oder gerade beendeten) Stunde, sonst eine Kursauswahl – heutige Kurse zuerst.
- **Home-Knopf**: „Start“ ganz links in der Leiste unten; auch ein Tipp auf das Notenheft-Symbol oben links führt zurück ins Startmenü.
- Abschaltbar unter Einstellungen → „Beim Öffnen das Startmenü zeigen“.

## Version 5

- **To-dos** – tages- oder kursabhängig: z. B. Dateien hochladen, Vokabeltest erstellen, kopieren, korrigieren, vorbereiten (mit Piktogrammen). Fällig „heute“, „morgen“, an einem Datum oder **„zur nächsten Stunde“** des Kurses. Erscheinen auf Heute, in der Woche, im Kurs-Überblick und beim Antippen einer Stunde („Vor dieser Stunde erledigen“). Alle To-dos gesammelt über „Alle“ (nach Kurs filterbar); abhaken mit einem Tipp, Rückgängig möglich.
- **Zurück**: vom linken Bildschirmrand nach rechts wischen (App vom Home-Bildschirm), Zurück-Pfeil oben links oder Zurück-Taste von Browser/Maus.
- **Plakativer**: Kennzahlen als große Farbfelder, Kurse mit großem farbigen Kopf, Uhrzeiten und Wochenplan in Kursfarben.
- Behoben: Beim Antippen eines Kurses in der Kursleiste springt die Leiste nicht mehr nach ganz links.

## Version 4.3

- **Einzelstunde aus einer Doppelstunde tauschen**: bei der Stunde „nur 2. Std.“ bzw. „nur 3. Std.“ wählbar. Beim Rücktausch wird automatisch eine Stunde mit gleicher Länge vorgeschlagen.
- **Erweitert** (Häkchen im Tausch-Fenster, selten nötig): Tausch auch mit Kursen anderer Klassen. Normal bleiben nur Fächer derselben Klasse wählbar.
- Ein Rücktausch rechnet die Stunde wieder dem ursprünglichen Fach zu – für Prüfungen zählt er, wenn er vor dem Prüfungstag liegt.

## Version 4.2 – Stundentausch

- Für Klassen, die du in zwei Fächern hast (gleicher Klassenname, z. B. 06c Deutsch und 06c Englisch): Stunde antippen → **„Stundentausch: stattdessen Englisch …“**. Die Stunde zählt dann für das andere Fach (auch bei „Stunden bis zur Klassenarbeit“ und in der Stundenbilanz), im Stundenplan erscheint das neue Fach mit Tausch-Symbol.
- Optional gleich einen **Rücktausch** mit eintragen (aus einer Liste der nächsten Stunden des anderen Fachs wählen).
- Alle Tausche unter **Termine → Tausch**; antippen zum Ändern oder Aufheben. Auch über „Neu“ → „Tausch“ eintragbar.

## Version 4.1 – übersichtlicher, nur helles Design

- Durchgehend helles, ruhiges Design (kein Dunkelmodus mehr), weniger Farbflächen, dünne Linien statt Schatten.
- Kennzahlen in einer schmalen Leiste statt vieler Kacheln; Unterricht, Prüfungen und Stunden als kompakte Listen (Zahl rechts = Stunden bis zur nächsten Prüfung).
- Kurse: nur noch fünf Unterreiter (Überblick · Mündlich · Tests · Noten · Zeugnis); Kinder, Stundenplan und Einstellungen des Kurses über das Zahnrad neben dem Kursnamen.
- Kürzere Erinnerung („Noten KW …: N Einträge fehlen“) und Fortschrittsbalken statt Ringe.

## Version 4 – neue Aufteilung in fünf Reiter

- **Heute**: Überblick-Kacheln (Stunden heute, nächste Prüfung, Termine), Unterricht des Tages als Zeitleiste – bei jeder Stunde steht „mit dieser Stunde noch N Stunden“ bis zur nächsten Klassenarbeit/Klausur (Ausfälle und Ferien abgezogen). Termine des Tages, eigene Termine hinzufügen, nächste Prüfungen.
- **Woche**: Stundenplan-Raster oder Tagesliste, „Stunden bis zur nächsten Prüfung“ je Kurs, Termine & Ausfälle der Woche, Fortschritt der mündlichen Noten.
- **Termine**: alle Termine, Prüfungen, Ausfälle, Ferien und Feiertage nach Monaten, mit Filtern und Piktogrammen; Termine/Ausfälle anlegen, ändern, löschen; Ganzjahresplanung (Excel) neu einlesen.
- **Kurse**: oben Registerkarten mit allen Kursen/Klassen; je Kurs Unterreiter Überblick · Mündlich · Tests · Übersicht · Zeugnis · Kinder · Stunden · Einstellungen.
- **Jahr** (Ganzjahresplanung): Stundenbilanz je Kurs (gehalten/ausgefallen/kommend) für Block, Halbjahr oder Schuljahr, Jahreskalender August–Juli, Stundenliste je Kurs.
- **Einstellungen & Sicherung** jetzt über das Zahnrad oben rechts.

## Neu in Version 3

- **Noten → Tests**: schriftliche Leistungen (Klassenarbeiten/Klausuren inkl. mündlicher Kommunikationsprüfung) und **Vokabeltests**. Prüfungen aus der Ganzjahresplanung werden zum Eintragen vorgeschlagen.
  - Vokabeltest: max. 10 Punkte, halbe Punkte über **„+0,5“** (vorher antippen). Note automatisch: 10–9,5 = 1 · 9–8 = 2 · 7,5 = 2- · 7–6 = 3 · 5,5 = 3- · 5–4 = 4 · 3,5 = 4- · 3–2 = 5 · 1,5 = 5- · 1–0 = 6. Übersichtstabelle aller Vokabeltests.
  - **Import aus deinem Korrektur-Tool** (Datei „…-ausgefüllte-Punkte.xlsx“): übernimmt ausschließlich Vorname/Nachname und „Note in Zahlen“, ordnet automatisch zu (z. B. „Anna Müller“ → „Anna M.“); E-Mail-Adressen und Einzelpunkte werden ignoriert.
- **Noten → Zeugnis**: Gesamtnote = 50 % schriftlich + 50 % SoMi. SoMi = alle mündlichen Noten + Vokabeltests, jede Note zählt einmal (Anteil der Vokabeltests wird angezeigt). Oberstufe: SoMi des Halbjahres = Schnitt der beiden Quartals-SoMi-Noten; Zeugnis in Punkten (Noten bleiben 1–6). Sek I: Tendenzen universitär (1,7 = 2+ · 2,0 = 2 · 2,3 = 2-).
  - Vorschlag und Zeugnisnote nebeneinander, **▲ nach oben / ▼ nach unten korrigiert** mit Begründung. Druck/PDF für die Zeugniskonferenz, CSV-Export.
- **Blaue Briefe** (2. Halbjahr): Frist (ein Datum für alle Kurse), alle mit 4 auf dem Halbjahreszeugnis (Oberstufe: 5–6 Punkte) mit aktuellem Stand und Einschätzung *abdriftend / grenzwertig / stabil*, Häkchen „gewarnt“ mit Datum, zusätzlich auffällige Kinder, Liste „Gewarnte Schülerinnen und Schüler“ nach Kursen, alphabetisch (Druck/PDF).
- **Entwicklungskurve** pro Kind nach Wochen – ganzes Schuljahr, Halbjahr, Quartal oder 8 Wochen; Halbjahres-/Quartalsgrenzen markiert.
- **Beobachtungen** pro Kind und **Elternsprechtag-Blatt** (Druck/PDF mit Noten, Kurve, Tests, Beobachtungen, Linien für Gesprächsnotizen).
- **Erinnerung** auf „Heute“ ab Freitagmittag, wenn mündliche Noten der Woche fehlen – „Morgen erinnern“ schiebt sie auf, sie kommt wieder, bis alles eingetragen oder „Erledigt“ ist.
- **Stufe pro Kurs** (Sek I / EF / Q1 / Q2) und **Vokabeltests ein/aus** unter Kurse → Bearbeiten. **Mehr → Schuljahr & Zeugnisse**: Stichtage für Halbjahre/Quartale (Q2 eigenes kürzeres Schuljahr) und Frist Blaue Briefe.
- **Neuer Stundenplan „gültig ab“**: Beim erneuten Import einer geänderten Ganzjahresplanung fragt die App, ab wann der neue Plan gilt – Vergangenes bleibt korrekt. Neuen Untis-Stundenplan einfach als Screenshot an Claude schicken → wird ins Blatt „Raster“ übertragen → importieren.

## Neu in Version 2

- **Heute**: Deine Stunden des Tages als Zeitleiste (mit „Jetzt“-Markierung, Raum, Doppelstunde, Ausfall, Prüfung) + „Demnächst“ mit Countdown (Tage **und** verbleibende Unterrichtsstunden bis zur Prüfung) + Fortschritt der mündlichen Noten pro Kurs.
- **Plan**: Wochen-Stundenplan in Kursfarben, Ferien/Feiertage und ausfallende Stunden sind markiert. Ein Tipp auf eine Stunde → Noten eintragen, Ausfall eintragen, Prüfung eintragen.
- **Kurse**: Pro Kurs die Bilanz bis zu den nächsten Ferien (Stunden laut Plan / gehalten / ausgefallen / verbleibend – wie das Blatt „Übersicht“ deiner Ganzjahresplanung), Prüfungen, nächste Stunden, Schülerliste, Stundenplan, Farbe.
- **Excel-Import** deiner `Ganzjahresplanung.xlsx` (Mehr → Ganzjahresplanung importieren): Blätter „Raster“, „Termine“ (Stundenzeiten), „Countdown“ (Prüfungen), „Ausfälle“ und „Ferien_Feiertage“. Erneutes Importieren aktualisiert, statt doppelt anzulegen. Die Datei wird nur im Browser gelesen, nirgendwohin hochgeladen.
- **Face ID / Windows Hello** zum Entsperren (Mehr → Face ID einrichten).
- NRW-Feiertage werden automatisch berechnet.

### Update von Version 1
Im Repo `notenheft` einfach alle Dateien aus der neuen ZIP hochladen (vorhandene überschreiben). Deine Noten bleiben erhalten. Auf dem iPhone die App einmal ganz schließen und neu öffnen.
Alle Daten werden **auf dem Gerät verschlüsselt** (AES-256-GCM, Schlüssel aus deinem Passwort, PBKDF2 mit 600.000 Runden).
Zum Abgleich zwischen den Geräten liegt nur die verschlüsselte Datei in einem **privaten** GitHub-Repository.

---

## So funktioniert es

| Was | Wo | Wer kann es lesen? |
|---|---|---|
| Programmcode (diese Dateien) | öffentliches Repo `notenheft` + GitHub Pages | alle – enthält keine Daten |
| Noten, Namen, Notizen | privates Repo `notenheft-daten`, Datei `notenheft.enc.json` | nur du, mit Passwort |
| Lokale Kopie | im Browser-Speicher von iPhone und Laptop, ebenfalls verschlüsselt | nur du, mit Passwort |

Dein Passwort verlässt nie das Gerät. Ohne das Passwort sind die Daten auch für GitHub nur Zeichensalat.

---

## Einrichtung (einmalig, ca. 15 Minuten)

### 1. GitHub-Konto
Falls noch nicht vorhanden: kostenloses Konto auf <https://github.com> anlegen und die Zwei-Faktor-Anmeldung einschalten.

### 2. App veröffentlichen (Repo für den Programmcode)
1. Oben rechts auf **+ → New repository**.
2. Name: `notenheft`, Sichtbarkeit: **Public**. (GitHub Pages ist im kostenlosen Tarif nur für öffentliche Repos verfügbar. Das Repo enthält nur den Programmcode, keine Schülerdaten.)
3. **Add file → Upload files** und alle Dateien aus dieser ZIP hochladen: `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, `README.md` und den Ordner `icons`. Den Ordner am besten per Drag-and-drop mit hineinziehen. Danach auf **Commit changes** klicken.
4. **Settings → Pages**: Unter *Source* „Deploy from a branch“ wählen, Branch `main` und Ordner `/ (root)` einstellen, dann **Save**.
5. Nach 1–2 Minuten läuft die App unter **`https://DEIN-NAME.github.io/notenheft/`**.

### 3. Datenspeicher anlegen (privates Repo)
1. **+ → New repository**, Name: `notenheft-daten`, Sichtbarkeit: **Private**. Häkchen bei „Add a README file“ setzen.
2. Fertig. Die App legt die verschlüsselte Datei selbst an.
   Die App weigert sich, mit einem öffentlichen Repo zu synchronisieren.

### 4. Zugriffs-Token erstellen
1. Rechts oben auf das Profilbild → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Einstellungen:
   - Name: `Notenheft`
   - Expiration: z. B. 1 Jahr. Trag dir das Ablaufdatum in den Kalender ein.
   - Repository access: **Only select repositories → `notenheft-daten`**
   - Permissions → Repository permissions → **Contents: Read and write**. Alles andere bleibt aus.
3. **Generate token** und den Token (`github_pat_…`) kopieren. Er wird nur einmal angezeigt.

### 5. Laptop (Windows)
1. `https://DEIN-NAME.github.io/notenheft/` in Edge oder Chrome öffnen.
   Optional: Menü **⋯ → Apps → Diese Website als App installieren**. Dann hat Notenheft ein eigenes Fenster und eine Verknüpfung im Startmenü.
2. **Neu anlegen**: Passwort wählen (mindestens 10 Zeichen). Ein Satz ist ideal.
3. **Mehr → Ganzjahresplanung importieren**, dann unter **Kurse → Kurs → Kinder** die Namen einfügen (aus Excel kopieren, ein Name pro Zeile; für eine zweite Lerngruppe derselben Klasse gibt es „Liste aus anderem Kurs übernehmen“).
4. **Mehr → Synchronisierung**: Benutzername, `notenheft-daten` und Token eintragen, dann **Speichern & testen**. Oben erscheint „Gesichert“.
5. **Einrichtungscode** antippen und den Code kopieren. Er ist mit deinem Passwort verschlüsselt, du kannst ihn dir also per Mail, über OneDrive oder als Notiz aufs iPhone schicken.

### 6. iPhone
1. In **Safari** `https://DEIN-NAME.github.io/notenheft/` öffnen.
2. **Teilen → Zum Home-Bildschirm**. Danach Notenheft **vom Home-Bildschirm aus** öffnen, nicht in Safari weiterarbeiten. Die Home-Bildschirm-App hat einen eigenen Speicher.
3. **Gerät verbinden**: Einrichtungscode einfügen, Passwort eingeben, **Verbinden**.
4. Tipp: Wenn iOS anbietet, das Passwort im Schlüsselbund zu sichern, kannst du danach per Face ID entsperren.

---

## Bedienung

**Face ID einrichten** (auf jedem Gerät einmal): Mehr → „Face ID einrichten“ (am Laptop: „Windows Hello“). Danach reicht beim Öffnen ein Tipp auf „Mit Face ID entsperren“. Technik: Es wird ein Passkey angelegt; dessen geheimer Schlüssel (PRF-Erweiterung) verschlüsselt dein Passwort, das dann nur auf diesem Gerät liegt. Das Passwort bleibt als Rückfallebene gültig. Voraussetzung: iOS 18 oder neuer bzw. ein aktueller Edge/Chrome unter Windows 11 – falls das Gerät es nicht unterstützt, zeigt die App eine Meldung.

**Ganzjahresplanung importieren**: Mehr → „Excel-Datei wählen“ → `Ganzjahresplanung.xlsx`. Am Laptop direkt aus dem OneDrive-Ordner, am iPhone über „Dateien“ → OneDrive. Da alles synchronisiert wird, reicht der Import auf einem Gerät. Neue Prüfungen oder Ausfälle kannst du danach auch direkt in der App eintragen (Heute → „+ Termin“ oder im Plan auf eine Stunde tippen).

**Erfassen** (z. B. freitags für die ganze Woche)
- Kurs wählen (oder im Plan auf eine Stunde tippen → „Mündliche Noten eintragen“), die Woche ist vorausgewählt. Tage mit Unterricht sind mit einem Punkt markiert. Mit ‹ › wechselst du die Woche.
- Den Tag antippen (Mo–Fr), dem die Noten zugeordnet werden sollen.
- **Liste**: Pro Kind auf 1–6 tippen. Über **…** kannst du „fehlte“, „ohne Note“ oder eine Notiz eintragen.
- **Karten**: ein Kind pro Karte mit großen Knöpfen. Nach dem Tippen springt die App automatisch zum nächsten Kind. Am Laptop geht das auch per Tastatur: 1–6, F = fehlte, N = ohne Note, ←/→ zum Blättern.
- **nur ohne Eintrag** zeigt nur die Kinder, die in dieser Woche noch nichts haben.
- Du hast dich vertippt? Direkt auf **Rückgängig** tippen oder den farbigen Chip antippen, um den Eintrag zu bearbeiten oder zu löschen.
- Mehrere Noten pro Woche sind möglich.

**Übersicht**
- Durchschnitt, Anzahl, Trend und Fehltage pro Kind; ein Tipp auf ein Kind öffnet den Verlauf nach Wochen.
- Zeitraum: aktuelles oder vorheriges Halbjahr (Stichtage 1.8. und 1.2.), Schuljahr, letzte 4 Wochen oder eigener Zeitraum.
- **Wochen**: eine Tabelle mit allen Wochenschnitten, ähnlich deiner Excel-Tabelle.
- **CSV-Export** für Excel oder die Zeugniskonferenz. Achtung: Die CSV-Dateien sind unverschlüsselt.

**Mehr (Einstellungen)**
- Durchschnitt: *jede Note zählt gleich* oder *jede Woche zählt gleich*.
- Automatische Sperre nach 2–60 Minuten.
- Passwort ändern: Die anderen Geräte fragen dann beim nächsten Abgleich nach dem neuen Passwort.
- Verschlüsselte Sicherungsdatei herunterladen oder einspielen.

**Gleichzeitiges Arbeiten**: Änderungen auf Handy und Laptop werden automatisch zusammengeführt. Pro Eintrag gewinnt die jeweils neuere Änderung. Offline gemachte Einträge werden hochgeladen, sobald wieder Netz da ist.

---

## Datenschutz – was du wissen solltest (keine Rechtsberatung)

- **Genehmigung**: In vielen Bundesländern brauchst du für die Verarbeitung von Schülerdaten auf privaten Geräten eine Genehmigung der Schulleitung. Oft gibt es dafür ein Formular, das auch technische Maßnahmen abfragt. Die Angaben oben (Verschlüsselung, Speicherorte) kannst du dafür verwenden.
- **Datensparsamkeit**: Vorname und Anfangsbuchstabe reichen. Schreib in Notizen nur Sachliches, keine Gesundheitsdaten o. Ä.
- **Handy verloren?** Auf github.com unter *Settings → Developer settings → Fine-grained tokens* den Token widerrufen. Die Daten auf dem Handy sind ohne dein Passwort nicht lesbar.
- **Passwort vergessen** = Daten weg. Es gibt bewusst keinen Generalschlüssel.
- **Löschfristen**: Am Ende des Schuljahres die Klasse exportieren, falls nötig, und dann unter *Kurse → Kurs → Bearbeiten → Kurs löschen* entfernen. In der Git-Historie des privaten Repos bleiben ältere, verschlüsselte Stände erhalten. Wer auch diese entfernen will, löscht das Repo `notenheft-daten` und legt es neu an.
- Die App lädt keine fremden Skripte oder Schriften, nutzt keine Tracker und kommuniziert nur mit `api.github.com`.

---

## Probleme?

| Meldung | Lösung |
|---|---|
| „Token ungültig oder abgelaufen“ | Neuen Token erstellen (Schritt 4) und in den Einstellungen eintragen, dann einen neuen Einrichtungscode erzeugen. |
| „Repository nicht gefunden“ | Repo-Name prüfen, und ob der Token Zugriff auf genau dieses Repo hat. |
| „Das Repository ist öffentlich“ | Im Repo `notenheft-daten` unter Settings → Danger Zone → Change visibility auf **Private** stellen. |
| „Passwort?“ oben rechts | Das Passwort wurde auf einem anderen Gerät geändert. Antippen und das neue Passwort eingeben. |
| Neue Version erscheint nicht | App einmal ganz schließen und neu öffnen. |
