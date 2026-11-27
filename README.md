# Notenheft 7.5.6 – Stundenplan, Termine & Noten, verschlüsselt

Eine Web-App (PWA) für iPhone und Windows-Laptop: Stundenplan mit Heute-Ansicht, Prüfungs-Countdown, Unterrichtsausfälle und Ferien – kombiniert mit der schnellen Erfassung mündlicher Noten (1–6).

## Neu in Version 7.5.6 – Oberstufenkurse finden ihr Blatt in der Kürzel-Tabelle

- **„Namen aus Kürzel-Tabelle“** ordnet Kurse wie „Q2“ (Deutsch) jetzt dem Blatt „Q2-D-GK“ zu, „Q1“ (Englisch) dem Blatt „Q1-E-LK“ (Stufe muss passen; bei mehreren Blättern entscheiden Fach und GK/LK). Bisher blieben dort Kinder ohne Namen, deren Kürzel auch in einem anderen Blatt vorkommt.
- Namen kommen nur noch aus dem Blatt des eigenen Kurses – Kürzel sind nur je Lerngruppe eindeutig. Findet sich kein Blatt, nennt der Hinweis den Kurs.
- Auch „Aus Kürzel-Tabelle übernehmen“ im Kurs wählt das passende Blatt jetzt vor.

## Neu in Version 7.5.5 – Namen aus der Kürzel-Tabelle auf neuen Geräten

- **Neues Gerät ohne Namen?** Mehr → Einstellungen → „Namensliste & Datenschutz“ → **Namen aus Kürzel-Tabelle** und die `Kürzel-Tabelle_<Schuljahr>.xlsx` aus OneDrive wählen. Alle Kinder ohne Namen bekommen ihn über „Kürzel (final)“ – in allen Kursen auf einmal. Vorhandene Namen bleiben unverändert.
- **Kurs → Kinder → „Aus Kürzel-Tabelle übernehmen“** ergänzt jetzt auch fehlende Namen bei Kindern, die schon da sind (bisher nur „schon da“).
- Gelesen werden nur Vorname, Nachname und „Kürzel (final)“. Die Namen bleiben lokal auf dem Gerät, synchronisiert werden weiter nur Kürzel.

## Neu in Version 7.5.4 – Cockpit: Tage blättern

- **Pfeile im Cockpit-Kopf** (oben links zurück, oben rechts vor; am Laptop auch ← / →) blättern Schultag für Schultag (Sa/So werden übersprungen). Mit „Heute“ oder erneutem Tippen auf „Cockpit“ geht es zurück zu heute.
- Mit dem Tag wandern **Stundenstreifen, Stunden/Ausfälle, Termine im Kopf, Ferien-Countdown, „Demnächst“ (7 Tage ab dem gewählten Tag) und das Wochenraster** (Überschrift „KW …“, „Plan“ öffnet diese Woche). **„Zu erledigen“** bleibt beim echten Heute.

## Neu in Version 7.5.3 – Tests fest 15 % der SoMi

- **SoMi-Note:** Vokabeltests und Tests – irregular verbs zählen bei allen Kindern fest **15 %**, die mündlichen Noten 85 % (bisher anteilig nach Anzahl der Noten, daher schwankende Werte wie 17 % oder 20 %). Hat ein Kind nur mündliche Noten oder nur Tests, zählt das allein.
- **Pfeile im dunklen Kopf sichtbar** (z. B. Tage blättern unter „Heute“, Monate unter „Mehrarbeit“).

## Neu in Version 7.5.2 – echtes PDF, Suche bei Tests

- **Elternsprechtag und Zeugniskonferenz als PDF:** In der Vorschau erzeugt „PDF – drucken oder sichern“ ein echtes A4-PDF; im Teilen-Menü des iPhones dann „Drucken“ oder „In Dateien sichern“. (In der iPhone-App tut der Druckbefehl selbst nichts, deshalb dort nur noch der PDF-Knopf.) Die PDF-Bausteine (jsPDF, html2canvas, MIT-Lizenz) liegen im Ordner vendor/.
- **Sortieren: nur noch Nachname und Vorname.** Bei gleich beginnendem Nachnamen („H.“) entscheidet die Reihenfolge aus Kurs → Kinder (Verschieben per ☰).
- **Arbeiten/Klausuren:** Kindersuche wie bei Mündlich, sie filtert auch die Testübersicht.
- **Woche → Tagesliste** springt sofort zum heutigen Tag.

## Neu in Version 7.5.1 – In OneDrive sichern

- **Kurse → Sicherung → „Jetzt in OneDrive sichern“:** Der PC legt beim nächsten stündlichen Lauf die verschlüsselte Sicherung und die Excel-Datei mit Namen im richtigen OneDrive-Ordner ab (Notenheft-Sicherung → Schuljahr → Halbjahr → Kalenderwoche), wie bei der automatischen Sicherung montags und donnerstags. Der Reiter zeigt, wann und wohin zuletzt gesichert wurde.

## Neu in Version 7.5 – Sicherung, Kurse aufgeräumt

- **Sicherung:** Kurse → Reiter **Sicherung**: Excel-Datei (Übersicht + je Kurs ein Blatt mit Ø mündlich und Tendenz, SoMi, schriftlich, Vorschlag und Zeugnis je Halbjahr, allen Arbeiten/Tests und den mündlichen Noten je Woche) und die verschlüsselte Sicherung. Sind für alle Kurse Zeugnisnoten da, erscheint ein To-do „Alle Noten sichern“. Der PC legt montags und donnerstags die verschlüsselte Sicherung und eine Excel-Datei aller Noten mit Namen in den OneDrive (Notenheft-Sicherung → Schuljahr → Halbjahr → „KW 48 (23.11.–29.11.2026)“). Dafür legt das Notenheft die Noten nur mit Kürzeln und verschlüsselt für den PC ab; die Namen setzt erst der PC aus der Kürzel-Tabelle ein.
- **Kacheln führen zum Inhalt** (Mehrarbeit: „Antrag möglich“ → „Für den Antrag“; Woche: Stunden, Prüfungen, To-dos, Ausfälle).
- **Cockpit** mit Begrüßung (Name unter Mehr → „Dein Name für die Begrüßung“).
- **Eintragen:** Bereiche als Karten mit Symbol; „Mündliche Noten – Wochennote oder Einzelnoten je Kind“.
- **Kurse:** Union Jack bei Englisch, Deutschlandfahne bei Deutsch. Überblick zeigt bei „Prüfungen“, wie viele bis zum Halbjahresende noch offen, terminiert und nicht terminiert sind (ohne den Balken bis zu den Ferien).
- **Mündlich im Kurs** nur noch für diesen Kurs; der Hinweis „Standard für …“ steht nur noch, wenn eine Woche abweicht.
- **Löschen mit zweifacher Bestätigung:** Arbeiten, Tests (Papierkorb in der Liste) und Kurse.
- **Tests** heißen nur noch „Tests“; Noten-Tabelle ohne Spalten „Noten“ und „fehlte“; Blaue Briefe erst ab Klasse 6.
- **Kinder sortieren per Drag & Drop** (Kurs → Zahnrad → Kinder, Griff ☰); gilt für „Sortieren: Liste“.
- **Drucken** (Elternsprechtag, Zeugniskonferenz) öffnet eine Vorschau mit „Drucken“ und „Teilen / PDF“ – auch in der iPhone-App.
- **Suche am iPhone:** Das Suchfeld rückt unter den festen Kopf, die Treffer bleiben über der Tastatur sichtbar.
- **Mehr:** Klausurmanager ganz oben, die doppelte Terminliste ist weg.

## Neu in Version 7.4.2 – Ausfälle deutlicher entscheiden

- **Drei Knöpfe je Ausfall** (Plan → Mehrarbeit): **dienstlich** · **ersatzlos** · **krank**, darunter die Wirkung („steht im Antrag: −2 Std.“ bzw. „zählt als Iststunde · nicht im Antrag“).
- **Neue Entfälle laut WebUntis sind „noch offen“** (orange markiert, Hinweis oben) und zählen bis zur Entscheidung als dienstlich.
- **Antragsfenster:** Offene Ausfälle stehen dort mit denselben Knöpfen und lassen sich direkt entscheiden.
- **Antrag:** In der Tabelle stehen nur noch Vertretungen und ersatzlose Ausfälle (mit Stundenzahl unter „ausgefallene Stunde“); dienstliche Ausfälle, Krankheit und LW nicht.

## Neu in Version 7.4.1 – Nebenaufsichten

- **Nebenaufsichten zählen nicht als Mehrarbeit:** Eine Untis-Stunde, die zeitgleich mit eigenem Unterricht liegt, der stattfindet (z. B. 2. Std. 7b, während Deutsch in der 6c läuft), oder ausdrücklich „Aufsicht“ heißt, wird als **Nebenaufsicht** markiert und nicht abgerechnet. Bereits gespeicherte Vertretungen werden einmal nachgeprüft; der Haken „zählt als Mehrarbeit“ lässt sich weiter von Hand setzen.

## Neu in Version 7.4 – Mehrarbeitsantrag per Mail, ruhiger Kopf

- **Mehrarbeitsantrag auf Knopfdruck:** Ab dem letzten Schultag eines Monats erscheint ein To-do „Mehrarbeitsantrag … stellen“, wenn mindestens 4 verrechnete Stunden zusammenkommen. Antippen → „Per Mail senden“: Das private Daten-Repository füllt das Schulformular aus (Soll- und Iststunden je Tag, anrechenbare Ausfallstunden, Tabelle der Vertretungen und Ausfälle ohne Krankheitstage, Datum von heute, „nein“ angekreuzt) und schickt Word und PDF an die Schuladresse. Auch unter Planer → Mehrarbeit → „Antrag per Mail“.
  - Soll = eigene Kurse laut Stundenplan plus wöchentliche Untis-Stunden ohne Kurs (z. B. LW), ohne Gottesdienst und Bereitschaft; 90 Minuten = 2, 45 Minuten = 1 Stunde, Wochenenden, Feiertage und Ferien bleiben leer.
  - Ist = Soll minus „ersatzlos“ ausgefallene Stunden plus Vertretungen (auch in der Bereitschaft).
- **Kopfbalken bleibt stehen:** Der dunkle Balken (Datum, Kurs, Kennzahlen) scrollt nicht mehr weg, nur der Inhalt darunter.
- **Einträge erst ansehen:** Ein Eintrag aus Cockpit, Planer oder Kurs öffnet zuerst eine Übersicht (Art, Kurs, Datum, Stunden bis dahin, Notiz). Erst „Bearbeiten“ zeigt Art-Auswahl, Löschen, Abbrechen und Speichern.
- **Eintragen nach Bereichen:** Noten · Termine & Unterricht · Organisation (neu: „Vertretung nachtragen“).
- **„Grammatiktest“ heißt jetzt „Test – irregular verbs“.**
- **Noteneintragung schließt sich:** Sobald das letzte fehlende Kind eines Kurses für die Woche eine Note hat, geht es zurück ins Cockpit (mit „Rückgängig“); das Wochen-To-do hakt sich ab.
- **Wochennote oder Einzelstunden direkt beim Eintragen:** Kurs → Mündlich zeigt oben den Umschalter „Wochennote | Einzelstunden“. Er gilt nur für die angezeigte Woche; „als Standard“ übernimmt ihn für den Kurs.
- **Noten zur Prüfung erst nach dem Termin:** Der Knopf „Noten eintragen“ erscheint erst ab dem Prüfungstag. Dann gibt es auch ein To-do „Noten eintragen: Klassenarbeit …“, das sich von selbst abhakt, sobald Noten da sind.
- **Mehrarbeit:** LW zählt wie ein Kurs (auch wenn sie nur in WebUntis steht); entfällt sie laut WebUntis, hat das immer dienstliche Gründe: Sie zählt weiter als Iststunde (anrechenbare Ausfallstunde) und wird nicht gegengerechnet. Krankheitstage stehen nicht mehr in der Tabelle.

## Neu in Version 7.3.1 – Vertretungen im Cockpit

- **Stundenstreifen und Wochenplan im Cockpit zeigen jetzt auch Vertretungen aus WebUntis** (gelb, gestrichelt) und wöchentliche Untis-Stunden ohne eigenen Kurs (grau). Antippen öffnet die Details bzw. die Mehrarbeit. Unter dem Streifen steht „5. Std. Vertretung M · 7a“; die Stundenzahl im Kopf zählt Vertretungen mit.

## Neu in Version 7.3 – Aufgeräumtes Cockpit

- **Nur noch zwei Bereiche:** „Zu erledigen“ (was du tun musst) und „Demnächst“ (was in den nächsten 7 Tagen ansteht). Leere Bereiche werden nicht mehr angezeigt.
- **Kopf:** Datum, KW und Stunden in einer Zeile; die Termine von heute stehen als kleine Zeile unter dem Stundenstreifen.
- **„Zu erledigen“:** Zahlen mit Beschriftung („60 Noten“, „1 To-do“); bei den mündlichen Noten nur noch die Kurse, in denen etwas fehlt.
- **„Demnächst“:** Prüfungen, eigene Termine, Ausfälle, Ferien, Feiertage und Schulkalender-Termine außerhalb des Unterrichts in einer Liste, nach Tagen gruppiert. Ersetzt „Termine heute“, „Außerhalb deines Unterrichts“ und „Bald – die nächsten 3 Tage“.
- **Weggefallen im Cockpit:** die Liste „Anstehender Unterricht“ (zeigt der Stundenstreifen) und die doppelte To-do-Liste. Beides gibt es weiter in der Tagesansicht.

## Neu in Version 7.2.1 – „Demnächst“ im Cockpit

- **Prüfungen nicht mehr unter „Offen“:** Klassenarbeiten und Klausuren der nächsten **7 Tage** stehen jetzt in einem eigenen Bereich **„Demnächst“** unter „Offen“ (mit Tagen und Unterrichtsstunden bis dahin). „Offen“ enthält nur noch echte Aufgaben.

## Neu in Version 7.2 – Mündlich-Raster und Wochenplan

- **Mündliche Noten als Raster:** Kurs → Mündlich → **Raster** (neben Liste und Karten). Zeilen = Kinder, Spalten = Unterrichtstage der Woche (bei Wochennote eine Spalte „KW“), rechts der Halbjahresschnitt. Wer noch nichts hat, ist orange.
- **Fester Ziffernblock unten:** Zelle antippen, dann Note 1–6 (als Block) oder F = fehlte, N = ohne Note (abgesetzt). Mit „automatisch weiter“ springt die Auswahl zum nächsten Kind am selben Tag. Darunter Rückgängig, Notiz und „Tag/Woche fiel aus“.
- **Tastatur am Laptop:** 1–6, F, N tragen ein; ↑/↓ wechseln das Kind.
- **Cockpit am Laptop:** rechts der Wochenplan Mo–Fr × Stunden; ein Klick auf eine Stunde öffnet sie.

## Neu in Version 7.1 – Design B (Stufe 2)

- **Cockpit statt Startseite:** dunkler Kopf mit Datum, Stundenzahl, Ausfällen und Schultagen bis zu den Ferien. Darunter ein **Tagesstreifen** mit den Stunden 1–8 (antippen öffnet die Stunde, Ausfälle durchgestrichen, die laufende Stunde umrandet).
- **„Offen“:** alles, was zu tun ist, an einer Stelle und nach Dringlichkeit – fehlende mündliche Noten, Klausurnoten aus der Korrektur-App, Prüfungen der nächsten 14 Tage (mit Unterrichtsstunden bis dahin), To-dos, Zeugnisse, Blaue Briefe, alte Mehrarbeit. Jede Zeile hat genau einen Knopf.
- **Kurskopf:** dunkles Band mit Kursfarbe, Zurück zu allen Kursen, Kennzahlen (Ø mündlich, fehlende Noten dieser Woche, Stunden bis zur nächsten Prüfung) und den Reitern des Kurses.
- **Mündliche Noten:** dichtere Liste, Noten 1–6 als Block, „…“ abgesetzt; in der Kartenansicht die Noten als eine Reihe.
- **Laptop:** dunkle Seitenleiste mit „Eintragen“, den Bereichen und allen Kursen (mit Zahl der fehlenden Noten). Im Cockpit stehen „Offen“ und die Termine nebeneinander.

## Neu in Version 7.0 – Design B (Stufe 1)

- **Neues Aussehen:** ruhiges Schiefergrau mit Türkis, dunkle Kopfzeile, helle, dichte Listen. Orange = offen, Rot = Prüfung/dringend.
- **Neues App-Icon** „Nh“ mit Stift. Auf dem iPhone die App einmal vom Home-Bildschirm löschen und neu hinzufügen, damit das Icon erscheint (die Daten bleiben über die Sync-Datei erhalten).
- **Vier Reiter + Plus-Knopf:** Cockpit · Plan · Kurse · Mehr, in der Mitte der runde Knopf „Eintragen“. Mehrarbeit liegt jetzt unter **Plan** (Woche · Termine · Jahr · Mehrarbeit).
- **Tasten nach Note gruppiert:** Grammatik- und Vokabeltest, Klassenarbeits-, Zeugnis- und SoMi-Quartalsnoten zeigen je Note einen farbigen Kasten mit allen Werten, die zu ihr führen. Beim Vokabeltest gibt es die halben Punkte direkt („+0,5“ entfällt); „−“ = Note mit Minus.
- **Startseite:** helle Kacheln mit kleiner farbiger Kennung statt bunter Flächen.

## Neu in Version 6.6.8 – Grammatiktests, Kindersuche, Sortierung

- **Grammatiktest (irregular verbs):** Kurs → Arbeiten/Klausuren → „+ Grammatiktest“ (oder Eintragen → Grammatiktest). Je Kind die **Zahl der richtigen Lücken (0–30)** antippen, unter jeder Zahl steht die Note: 30–29 = 1 · 28–23 = 2 · 22–17 = 3 · 16–11 = 4 · 10–5 = 5 · 4–0 = 6. Rechtschreibfehler zählen als Fehler. Zählt wie ein Vokabeltest anteilig zur SoMi-Note.
- **Kind suchen überall, wo Noten eingetragen werden:** mündliche Noten, Klassenarbeiten/Klausuren, Vokabel- und Grammatiktests, Zeugnisnoten und SoMi-Quartalsnoten. Es reicht der Anfang von Vor- oder Nachname (z. B. „mul“ → Müller). In Listen blendet die Suche die übrigen Kinder aus, in Karten öffnet ein Treffer die Karte; **Enter** nimmt den ersten Treffer bzw. öffnet den Notendialog.
- **Tests und Klassenarbeiten:** Nach dem Eintragen springt die App **nicht** zum nächsten Kind. Das Kind bleibt mit Ergebnis stehen (z. B. „24/30 richtig → Note 2“) und das **Suchfeld ist sofort bereit** für den nächsten Namen.
- **Mündliche Noten:** Ein über die Suche gewähltes Kind bleibt nach der Note stehen; sonst geht es wie bisher automatisch weiter.
- **„automatisch weiter“** (mündlich, Kartenansicht) lässt sich ausschalten – dann bleibt jedes Kind nach dem Eintragen stehen.
- **Sortieren nach Liste, Nachname oder Vorname** beim Eintragen (mündlich, Arbeiten, Vokabel- und Grammatiktests, Zeugnis), jederzeit umschaltbar; das gerade aufgerufene Kind bleibt dabei. Die Wahl merkt sich das Gerät.

## Neu in Version 6.6.7 – Notizen zu To-dos

- Im To-do-Fenster gibt es unter „Was ist zu tun?“ das Feld **„Notizen (optional)“** (mehrzeilig, z. B. Seitenzahlen, Dateiort, Anzahl Kopien).
- In allen To-do-Listen steht die erste Notizzeile klein unter dem Titel; der ganze Text erscheint beim Antippen.
- Push-Erinnerungen zeigen weiterhin nur den Titel – die Notiz bleibt in der verschlüsselten Sync-Datei.

## Neu in Version 6.6.6 – Startseite aufgeräumt

- Die Karte **„Jetzt / Als Nächstes“** (nächste Unterrichtsstunde) auf der Startseite entfällt; der Unterricht steht weiter unter „Anstehender Unterricht“.
- **„Bald – die nächsten 3 Tage“** zeigt keine Termine mehr doppelt: Was schon unter „Außerhalb deines Unterrichts“ steht, fehlt dort. Prüfungen, Ausfälle, Termine während des Unterrichts, Ferienbeginn und Feiertage bleiben.

## Neu in Version 6.6.5 – Termine außerhalb des Unterrichts für die ganze Woche

- **Heute/Start:** Unter „Termine heute“ steht neu **„Außerhalb deines Unterrichts“** – alle dienstlichen Termine der restlichen Woche, für die du früher kommen oder länger bleiben musst: Beginn vor deiner ersten bzw. Ende nach deiner letzten Stunde (inkl. Vertretungen), Termine an Tagen ohne Unterricht und am **Samstag/Sonntag** (z. B. Tag der offenen Tür).
- **Ab Freitag** kommt die **nächste Woche** dazu (eigene Überschrift mit KW).
- Termine während deiner Unterrichtszeit sowie ganztägige Einträge an Unterrichtstagen bleiben wie bisher **tagesaktuell** unter „Termine heute“. Private Termine, Ferien und Feiertage zählen nicht mit.
- **Eigene Termine** haben jetzt optional **Uhrzeit von/bis** – nur damit lässt sich erkennen, ob sie außerhalb des Unterrichts liegen. Ohne Uhrzeit erscheinen sie nur, wenn an dem Tag kein Unterricht ist.

## Neu in Version 6.6.4 – Offene mündliche Noten auf einen Blick

- **Mündlich eintragen:** Kinder ohne Note in dieser Woche haben einen orangen Rand und „fehlt“; wer schon eine Note hat, ist grün mit Haken.
- Über der Liste stehen **alle Kurse der Woche** mit der Zahl fehlender Noten (oder ✓ fertig) – antippen wechselt direkt in den Kurs.
- Auch die **Kursauswahl** bei „Mündliche Noten eintragen“ zeigt je Kurs „x fehlen“ bzw. „fertig“.

## Neu in Version 6.6.2 – Reihenfolge kommt automatisch vom PC

- Der PC (Windows-Aufgabe „Notenheft-Kalender“, stündlich) schickt die Reihenfolge aus der **Kürzel-Tabelle** verschlüsselt ans Notenheft – nur Blattname und Kürzel, keine Namen. Das Notenheft sortiert jeden Kurs danach, ohne Zutun. Geändert wird nur, wenn sich die Tabelle ändert.
- Kinder ohne Kürzel stehen am Ende; ihnen gibt einmal **Kurs → Zahnrad → „Aus Kürzel-Tabelle übernehmen“** das Kürzel.

## Neu in Version 6.6.1 – Reihenfolge wie in der Kursliste

- Kinder stehen in der Reihenfolge der **Kürzel-Tabelle** (Tabellenblatt des Kurses). Für bestehende Kurse einmal **Kurs → Zahnrad → „Aus Kürzel-Tabelle übernehmen“** wählen und übernehmen – Noten bleiben erhalten, nur die Reihenfolge ändert sich.
- Gespeichert wird nur die Platznummer (keine Namen); sie gilt auf allen Geräten. Von Hand ergänzte Kinder stehen danach, nach Nachnamen.

## Neu in Version 6.6 – SoMi-Quartalsnoten (Oberstufe)

- **Kurs → Zeugnis → SoMi-Quartalsnoten** (nur EF/Q1/Q2): je Quartal für jedes Kind die SoMi-Note in Punkten eintragen. Vorschlag der App = Schnitt der mündlichen Noten (und Vokabeltests) im Quartal; Zeile antippen, Punkte wählen, optional eine Bemerkung.
- **„Vorschläge für alle offenen übernehmen“** füllt den Rest mit einem Tipp; Einzelne lassen sich danach ändern oder löschen.
- Eingetragene Quartalsnoten zählen fürs **Halbjahreszeugnis** (SoMi = Schnitt der beiden Quartale) und sind in der Zeugnisliste mit * markiert. Ohne Eintrag rechnet das Notenheft wie bisher.
- Gespeichert wird verschlüsselt und auf beiden Geräten synchronisiert; Export als CSV.

## Neu in Version 6.5.4 – Fehlerbehebungen

- **Ausfälle stundengenau:** Entfällt laut WebUntis nur eine Stunde, bleibt der Rest des Tages und der Doppelstunde bestehen. Das gilt auch für „Stunde fällt aus“ beim Antippen einer Stunde. Mehrarbeit, Stundenzähler und Ganzjahresplanung rechnen entsprechend; bereits vergangene Einträge ohne Stundenangabe bleiben ganztägig.
- **Mündliche Noten eintragen:** Ein von Hand abgehaktes To-do bleibt abgehakt.
- **Nachschrift-To-do:** Wird „nicht mitgeschrieben“ entfernt, erledigt es sich.
- **Abgleich:** Bei gleichem Zeitstempel kommen alle Geräte zum selben Ergebnis; keine unnötigen Uploads mehr.
- **Kurs oder Kind löschen** entfernt auch die zugehörigen Arbeiten, Noten, To-dos und Vermerke.
- **Handy:** Der Reiter „Mündlich“ passt wieder auf die Bildschirmbreite.

## Neu in Version 6.5.2 – Vertreten werden & krank

- **Wirst du vertreten** (Untis trägt bei deiner Stunde eine andere Lehrkraft ein, z. B. „06c LAT“) oder steht gar keine Lehrkraft dabei, gilt die Stunde für dich als **ausgefallen** („Vertretung durch LAT“ bzw. „Entfall … ohne Lehrkraft“). Dein Kürzel erkennt das Notenheft selbst.
- Untis wird nach einem Update und einmal täglich neu ausgewertet – auch wenn sich die Untis-Datei nicht geändert hat.
- **Mehrarbeit → Ausgefallene Stunden:** je Ausfall ein Grund: „nicht verrechnen“ (Standard), „ersatzlos, ohne Schulgeschäft – verrechnen“ oder „krank – nicht verrechnen“. **Krankheit wird nie gegengerechnet.**
- **„Krank …“**: Tage auswählen → alle deine Stunden dort fallen aus (Grund krank).

## Neu in Version 6.5.1

- **Mehrarbeit** ist jetzt ein eigener Reiter unten in der Hauptleiste (nicht mehr im Planer).
- **Dienstagsraster:** 1. Std. (GD) 8:00–9:00, 2./3. 9:00–10:30, 4./5. 10:45–12:15, 6./7. 12:30–14:05, 8. 14:20–15:05 – Zeiten in Heute, Woche und Mehrarbeit stimmen dienstags.
- **GD, LW & Co.:** Wöchentliche Untis-Stunden ohne eigenen Kurs erscheinen grau im Stundenplan (zählen nicht als Mehrarbeit).
- **Vertretung bearbeiten:** oben Datum, Stunde und Uhrzeit; statt „von/bis“ ein Feld „Stunde“ (z. B. „1. Std. · 08:00–08:45 Uhr“). Felder überlappen nicht mehr.
- **Raumänderung** im Kursfenster groß, bei Doppelstunden je Stunde.

## Neu in Version 6.5 – Mehrarbeit

- **Planer → Mehrarbeit** (neuer Reiter): je Kalendermonat alle Vertretungen und zusätzlichen Stunden aus WebUntis – mit Datum, Stunde, Klasse, Fach, Raum und „in der Bereitschaft“. Gespeichert wird ab November 2026 dauerhaft (auch nachdem Untis die Stunde nicht mehr liefert).
- **Vertretene Lehrkraft:** Das durchgestrichene Kürzel steht nicht im Untis-Kalender. Vertretung antippen (im Stundenplan, in Heute oder unter Mehrarbeit) und das Kürzel eintragen; fehlende Kürzel werden angezeigt.
- **Ausgefallene Stunden** des Monats stehen darunter. Haken = „ersatzlos, ohne Schulgeschäft“ → wird gegengerechnet. Ohne Haken zählt der Ausfall nicht.
- **Verrechnet** = Mehrarbeit − ersatzlos ausgefallen; ab **4 Stunden** im Monat: „Antrag möglich“. Die Liste lässt sich für den Antrag kopieren (Formular folgt).
- Einzelne Stunden lassen sich abwählen („zählt als Mehrarbeit“), bearbeiten, löschen oder von Hand nachtragen.
- Nach Ende des Schuljahres fragt das Notenheft, ob die alten Einträge gelöscht werden können.
- **Untis genauer:** Klasse(n) werden aus Untis gelesen (z. B. „E · 09b“), Vertretungen stehen in der Tagesliste in der richtigen Reihenfolge, Raumänderungen auch je Einzelstunde („R 311 / R 323 statt R 322“), abweichende Untis-Zeiten (z. B. dienstags) werden dem Stundenraster zugeordnet. Fehlt eine wöchentliche Stunde einmalig in Untis, wird sie als Ausfall eingetragen.

## Neu in Version 6.4.3 – WebUntis-Änderungen im Stundenplan

- **Neue Stunden** (z. B. in einer Bereitschaft) erscheinen direkt im Stundenplan, in Heute und als „Morgen: …“. Für einen eigenen Kurs wird sie zur normalen Stunde (Noten eintragen möglich, Markierung „neu“); für eine fremde Klasse steht sie orange als **Vertretung** da.
- **Raumänderungen:** Der neue Raum steht an der Stunde, hervorgehoben mit „statt R …“.
- **Entfall** wird wie bisher als Ausfall eingetragen – jetzt auch für die zweite Stunde einer Doppelstunde. Nimmt Untis den Entfall zurück, verschwindet der Ausfall wieder.
- Erkannt wird das durch den Vergleich mit dem eigenen Stundenplan: Was in Untis Woche für Woche gleich wiederkehrt (Aufsichten, Bereitschaft, Gottesdienst …), bleibt ausgeblendet.

## Neu in Version 6.4 – Ganzjahresplanung automatisch

- **Vorbei ist vorbei:** Kalendertermine verschwinden etwa eine Stunde nach ihrem Ende aus Heute, Woche und Termine (unter Termine mit „vergangene“ weiter sichtbar). Seit 6.4.2.
- Das Notenheft ist jetzt die **einzige Stelle zum Eintragen**. Der PC erzeugt daraus stündlich (und beim Anmelden) die **Ganzjahresplanung.xlsx** in `OneDrive/Unterricht` neu: Übersicht · Countdown · Vergangene Prüfungen · Termine & Ausfälle · Ferien & Feiertage · Stundenplan · Stunden.
- **Countdown** zeigt nur anstehende Arbeiten; Tage und Unterrichtsstunden zählt Excel täglich selbst (Ausfälle abgezogen). Geschriebene Arbeiten wandern am Folgetag nach **„Vergangene Prüfungen“** – mit festen Werten.
- Direkte Änderungen in der Excel-Datei werden beim nächsten Lauf überschrieben. Die frühere Datei liegt als `Ganzjahresplanung_alt.xlsx` daneben. Die automatisch erzeugte Datei lässt sich nicht wieder ins Notenheft importieren (Schutz vor Doppelungen).

## Neu in Version 6.3

- **Fehlende mündliche Noten** (Heute → Kachel): Vor jeder Kurswoche ein **Haken**. Mehrere ankreuzen → unten „… keine Noten eintragen“ → in der Liste ausdrücklich **bestätigen**. Diese Wochen verschwinden aus den fehlenden Noten und aus allen Erinnerungen. Wahlweise im selben Schritt: für die Kurse **überhaupt keine** mündlichen Noten mehr.
- **To-do jeden Freitag:** „Mündliche Noten eintragen“ (bzw. am letzten Schultag der Woche), nicht in Ferienwochen. Antippen öffnet die Noteneingabe; sind alle Noten der Woche drin, hakt es sich selbst ab.

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
