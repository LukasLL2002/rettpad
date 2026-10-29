/* RettPad – Stammdaten & Klickstruktur (fiktive Schulungsdaten) */
"use strict";
window.RPT_DATA = (function () {
  // kind: menu | single | multi | entry | form | tool
  // entry + options => jede Option erzeugt einen Verlaufseintrag mit Zeitstempel
  const o2Liter = ["1 l/min","2 l/min","3 l/min","4 l/min","6 l/min","8 l/min","10 l/min","12 l/min","15 l/min"];
  const pvk = ["G 22 (blau)","G 20 (rosa)","G 18 (grün)","G 17 (weiß)","G 16 (grau)","G 14 (orange)"];
  const ort = ["Handrücken li","Handrücken re","Unterarm li","Unterarm re","Ellenbeuge li","Ellenbeuge re","V. jugularis ext."];

  const TREE = {
    p1: { label: "Rett. Daten", nr: 1, children: [
      { id: "f_patient", label: "Patient", kind: "form", form: "patient" },
      { id: "f_transport", label: "Transport", kind: "form", form: "transport" },
      { id: "f_crew", label: "Besatzung", kind: "form", form: "crew" },
      { id: "s_einsatzart", label: "Einsatzart", kind: "single", options: ["Notfalleinsatz","Krankentransport (KTP)","Intensivtransport (ITW)","Notfall mit NA","Fehleinsatz"] },
      { id: "f_kosten", label: "Kostenträger", kind: "form", form: "kosten" },
      { id: "s_dringlichkeit", label: "Dringlichkeit", kind: "single", options: ["mit Sonderrechten","ohne Sonderrechte","disponiert"] },
    ]},
    p2: { label: "Anamnese", nr: 2, children: [
      { id: "f_notfallgeschehen", label: "Notfall-geschehen", kind: "form", form: "notfallgeschehen" },
      { id: "s_auffinde", label: "Auffinde-situation", kind: "single", options: ["liegend Boden","liegend Bett","sitzend","stehend/gehend","im Fahrzeug","im Wasser","Arztpraxis","Pflegeeinrichtung"] },
      { id: "m_vorerkr", label: "Vor-erkrankungen", kind: "multi", options: ["keine bekannt","Hypertonie","KHK","Herzinsuffizienz","Vorhofflimmern","Diabetes mellitus","COPD","Asthma","Apoplex","Epilepsie","Niereninsuffizienz","Demenz","Tumorleiden","Psychiatrisch"] },
      { id: "f_medikation", label: "Dauer-medikation", kind: "form", form: "medikation" },
      { id: "m_cave", label: "Cave", kind: "multi", options: ["keine","Allergie","Antikoagulation","Infektion","MRSA/MRE","Schwangerschaft","Herzschrittmacher/ICD","Patientenverfügung","Implantat/Port"] },
      { id: "t_foto", label: "Foto aufnehmen", kind: "tool", tool: "camera" },
      { id: "m_symptome", label: "Leit-symptome", kind: "multi", options: ["Brustschmerz","Atemnot","Bewusstseinsstörung","Lähmung/Sprachstörung","Krampfanfall","Bauchschmerz","Kopfschmerz","Schwindel","Synkope","Übelkeit/Erbrechen","Fieber","Blutung","Sturz"] },
      { id: "s_ereignisbeginn", label: "Symptom-beginn", kind: "single", options: ["< 1 h","1–4,5 h","4,5–24 h","> 24 h","unbekannt (wake-up)"] },
    ]},
    p3: { label: "Erstbefund", nr: 3, children: [
      { id: "g_neuro", label: "Neurologie", kind: "menu", children: [
        { id: "s_bewusstsein", label: "Bewusstsein", kind: "single", options: ["wach, orientiert","wach, desorientiert","reagiert auf Ansprache","reagiert auf Schmerz","bewusstlos"] },
        { id: "t_gcs", label: "GCS", kind: "tool", tool: "gcs" },
        { id: "s_pupli", label: "Pupille links", kind: "single", options: ["eng","mittel","weit","entrundet","lichtreagibel","nicht reagibel"] },
        { id: "s_pupre", label: "Pupille rechts", kind: "single", options: ["eng","mittel","weit","entrundet","lichtreagibel","nicht reagibel"] },
        { id: "m_extrem", label: "Extremitäten-bewegung", kind: "multi", options: ["unauffällig","Arm li schwach","Arm re schwach","Bein li schwach","Bein re schwach","keine Bewegung"] },
        { id: "m_neuro_sonst", label: "Sonstiges", kind: "multi", options: ["Meningismus","Sprachstörung","Fazialisparese","Blickwendung","Krampfanfall"] },
        { id: "t_4iss", label: "4-Item-Stroke-Scale", kind: "tool", tool: "iss4" },
        { id: "t_befast", label: "BE-FAST", kind: "tool", tool: "befast" },
      ]},
      { id: "s_ekg", label: "EKG", kind: "single", options: ["Sinusrhythmus","Sinustachykardie","Sinusbradykardie","Absolute Arrhythmie","SVT","Kammertachykardie","Kammerflimmern","Asystolie","PEA","AV-Block II°","AV-Block III°","ST-Hebung","Schrittmacher-rhythmus"] },
      { id: "m_atmung", label: "Atmung", kind: "multi", options: ["unauffällig","Dyspnoe","Tachypnoe","Bradypnoe","Zyanose","Stridor","Spastik","Rasselgeräusche","Schnappatmung","Apnoe"] },
      { id: "m_psyche", label: "Psyche", kind: "multi", options: ["unauffällig","ängstlich","erregt","aggressiv","verwirrt","depressiv","suizidal","verlangsamt"] },
      { id: "s_schmerz", label: "Schmerz (NRS)", kind: "single", options: ["0","1","2","3","4","5","6","7","8","9","10"] },
      { id: "m_haut", label: "Haut", kind: "multi", options: ["unauffällig","blass","kaltschweißig","zyanotisch","gerötet","Ödeme","Exsikkose","Exanthem"] },
      { id: "t_messwerte", label: "Messwerte", kind: "tool", tool: "vitals" },
      { id: "m_verletz", label: "Verletzungen", kind: "multi", options: ["keine","Kopf","HWS","Thorax","Abdomen","Becken","Wirbelsäule","Arm li","Arm re","Bein li","Bein re","Verbrennung"] },
    ]},
    p4: { label: "Diagnose", nr: 4, children: [
      { id: "m_dx_zns", label: "ZNS", kind: "multi", options: ["Schlaganfall","TIA","Intrakranielle Blutung","Krampfanfall","Status epilepticus","Synkope","Meningitis (V.a.)","Bewusstseinsstörung unklar"], info: { "Schlaganfall": "DD: Blutzucker messen! Symptombeginn dokumentieren, Stroke-Unit voranmelden.", "Krampfanfall": "DD: Hypoglykämie ausschließen.", "Synkope": "12-Kanal-EKG empfohlen." } },
      { id: "m_dx_hk", label: "Herz-Kreislauf", kind: "multi", options: ["ACS – STEMI","ACS – NSTE-ACS","Rhythmusstörung","Lungenembolie","Hypertensiver Notfall","Herzinsuffizienz/Lungenödem","Kreislaufstillstand","Schock"], info: { "ACS – STEMI": "12-Kanal-EKG an Klinik senden, Herzkatheter voranmelden.", "Kreislaufstillstand": "Reanimationsmaßnahmen und Zeiten lückenlos dokumentieren." } },
      { id: "m_dx_atm", label: "Atmung", kind: "multi", options: ["Asthma-Anfall","exazerbierte COPD","Pneumonie","Hyperventilation","Aspiration","Pneumothorax","Atemwegsverlegung"] },
      { id: "m_dx_abd", label: "Abdomen", kind: "multi", options: ["Akutes Abdomen","GI-Blutung","Kolik","Gastroenteritis"] },
      { id: "m_dx_stoff", label: "Stoffwechsel", kind: "multi", options: ["Hypoglykämie","Hyperglykämie","Exsikkose","Hyperthermie","Hypothermie","Anaphylaxie"] , info: { "Hypoglykämie": "BZ-Kontrolle nach Therapie dokumentieren." } },
      { id: "m_dx_trauma", label: "Trauma", kind: "multi", options: ["SHT","Thoraxtrauma","Abdominaltrauma","Beckentrauma","Wirbelsäulentrauma","Extremitätentrauma","Polytrauma","Verbrennung","Schnitt-/Platzwunde"] },
      { id: "m_dx_psych", label: "Psychiatrie", kind: "multi", options: ["Psychose","Suizidalität","Erregungszustand","Angst-/Panikstörung","Alkoholintoxikation","Drogenintoxikation"] },
      { id: "m_dx_gyn", label: "Gyn/ Geburtshilfe", kind: "multi", options: ["Geburt","drohende Geburt","Vaginale Blutung","Präeklampsie (V.a.)"] },
      { id: "m_dx_sonst", label: "Sonstiges", kind: "multi", options: ["Infekt/Fieber","Sepsis (V.a.)","Allgemeinzustand reduziert","Sturz ohne Verletzung","Sonstige Erkrankung"] },
      { id: "f_dx_text", label: "Freitext-diagnose", kind: "form", form: "dxtext" },
    ]},
    p5: { label: "Verlauf", nr: 5, children: [
      { id: "e_zustand", label: "Zustand", kind: "entry", options: ["gebessert","unverändert","verschlechtert"] },
      { id: "e_bewusst", label: "Bewusstsein", kind: "entry", options: ["aufgeklart","eingetrübt","bewusstlos"] },
      { id: "e_rea", label: "Reanimation", kind: "entry", options: ["Beginn CPR","Defibrillation","ROSC","Reanimation beendet","Abbruch"] },
      { id: "e_ereignis", label: "Ereignis", kind: "entry", options: ["Erbrechen","Krampfanfall","Synkope","Schmerzzunahme","Unruhe","Atemstillstand"] },
      { id: "t_vitals5", label: "Messwerte", kind: "tool", tool: "vitals" },
      { id: "e_transport", label: "Transport", kind: "entry", options: ["Patient im RTW","Abfahrt","Ankunft Klinik","Übergabe"] },
      { id: "f_verlauf_text", label: "Freitext", kind: "form", form: "verlauftext" },
    ]},
    p6: { label: "Maßnahmen", nr: 6, children: [
      { id: "g_a", label: "A - Atemweg", kind: "menu", children: [
        { id: "e_absaugen", label: "Absaugen", kind: "entry", mat: ["Absaugkatheter"] },
        { id: "e_guedel", label: "Guedel-Tubus", kind: "entry", options: ["Gr. 2","Gr. 3","Gr. 4"], mat: ["Guedel-Tubus"] },
        { id: "e_wendl", label: "Wendl-Tubus", kind: "entry", options: ["CH 24","CH 28","CH 30"], mat: ["Wendl-Tubus"] },
        { id: "e_lts", label: "Larynx-tubus", kind: "entry", options: ["Gr. 3","Gr. 4","Gr. 5"], mat: ["Larynxtubus"] },
        { id: "e_intub", label: "Intubation", kind: "entry", options: ["ID 6,5","ID 7,0","ID 7,5","ID 8,0","ID 8,5"], mat: ["Endotrachealtubus","Blockerspritze"], itw: true },
        { id: "g_o2", label: "O2-Gabe", kind: "menu", children: [
          { id: "e_o2_brille", label: "Brille", kind: "entry", options: o2Liter, mat: ["O2-Brille"] },
          { id: "e_o2_maske", label: "Maske", kind: "entry", options: o2Liter, mat: ["O2-Maske"] },
          { id: "e_o2_reserv", label: "Maske mit Reservoir", kind: "entry", options: o2Liter, mat: ["O2-Maske mit Reservoir"] },
          { id: "e_o2_vernebler", label: "Vernebler", kind: "entry", options: o2Liter, mat: ["Verneblermaske"] },
        ]},
        { id: "e_hws", label: "HWS-Immobili-sation", kind: "entry", mat: ["HWS-Stützkragen"] },
      ]},
      { id: "g_b", label: "B - Beatmung", kind: "menu", children: [
        { id: "e_beutel", label: "Beutel-Masken-Beatmung", kind: "entry", mat: ["Beatmungsfilter"] },
        { id: "e_maschbeatm", label: "maschinelle Beatmung", kind: "entry", options: ["IPPV","CPAP/NIV","BiPAP","SIMV"], mat: ["Beatmungsfilter","Beatmungsschlauch"] },
        { id: "e_entlastung", label: "Thorax-entlastung", kind: "entry", options: ["Nadel li","Nadel re"], mat: ["Entlastungskanüle"] },
        { id: "f_beatm", label: "Beatmungs-parameter", kind: "form", form: "beatmung" },
      ]},
      { id: "g_c", label: "C - Kreislauf", kind: "menu", children: [
        { id: "g_pvk", label: "pVZ i.v.", kind: "menu", children: [
          { id: "e_pvk", label: "Größe", kind: "entry", options: pvk, mat: ["Venenverweilkanüle","Fixierpflaster","Tupfer"] },
          { id: "e_pvk_ort", label: "Ort", kind: "entry", options: ort },
        ]},
        { id: "e_io", label: "i.o.-Zugang", kind: "entry", options: ["Tibia li","Tibia re","Humerus li","Humerus re"], mat: ["i.o.-Nadel"] },
        { id: "e_hdm", label: "Herzdruck-massage", kind: "entry", options: ["Beginn","Ende","mech. Reanimationshilfe"] },
        { id: "e_defi", label: "Defibrillation", kind: "entry", options: ["150 J","200 J","300 J","360 J"], mat: ["Defi-Elektroden"] },
        { id: "e_kardio", label: "Kardio-version", kind: "entry", options: ["50 J","100 J","150 J","200 J"] },
        { id: "e_pacing", label: "Schritt-macher", kind: "entry", options: ["extern transkutan"] },
        { id: "e_blut", label: "Blutstillung", kind: "entry", options: ["Druckverband","Tourniquet","Hämostyptikum","Beckenschlinge"], mat: ["Verbandpäckchen"] },
        { id: "e_infusion", label: "Infusion", kind: "entry", options: ["VEL 500 ml","VEL 1000 ml","NaCl 0,9 % 500 ml"], mat: ["Infusionsbesteck","Vollelektrolytlösung"] },
      ]},
      { id: "g_d", label: "D - Neuro / Diagnostik", kind: "menu", children: [
        { id: "e_bz", label: "BZ-Messung", kind: "entry", mat: ["BZ-Teststreifen","Lanzette"] },
        { id: "e_ekg12", label: "12-Kanal-EKG", kind: "entry", mat: ["EKG-Elektroden"] },
        { id: "e_monitor", label: "Monitoring", kind: "entry", options: ["EKG","SpO2","NIBP","etCO2","Temperatur"] },
        { id: "e_sono", label: "Sonografie (POCUS)", kind: "entry", options: ["eFAST","Herz","Lunge"] },
      ]},
      { id: "g_e", label: "E - Exposure / Lagerung", kind: "menu", children: [
        { id: "e_lagerung", label: "Lagerung", kind: "entry", options: ["Oberkörper hoch","Schocklage","stabile Seitenlage","flach","Vakuummatratze","Linksseitenlage"] },
        { id: "e_waerme", label: "Wärme-erhalt", kind: "entry", mat: ["Rettungsdecke"] },
        { id: "e_kuehlung", label: "Kühlung", kind: "entry" },
        { id: "e_schiene", label: "Schienung", kind: "entry", options: ["Vakuumschiene","SAM-Splint","Traktionsschiene"] },
        { id: "e_wunde", label: "Wund-versorgung", kind: "entry", mat: ["Wundauflage","Mullbinde"] },
        { id: "e_ruhig", label: "Psych. Betreuung", kind: "entry" },
      ]},
      { id: "t_med", label: "Medika-mente", kind: "tool", tool: "meds" },
      { id: "g_itw", label: "ITW: Perfusoren", kind: "menu", itwOnly: true, children: [
        { id: "e_perf", label: "Perfusor", kind: "entry", options: ["Start","Laufratenänderung","Stopp","Spritzenwechsel"], mat: ["Perfusorspritze 50 ml","Perfusorleitung"] },
        { id: "f_perf", label: "Perfusor-liste", kind: "form", form: "perfusor" },
      ]},
    ]},
    p7: { label: "Übergabe", nr: 7, children: [
      { id: "s_uebergabe_an", label: "Übergabe an", kind: "single", options: ["Notaufnahme","Schockraum","Stroke Unit","Herzkatheterlabor","Intensivstation","Station","Hausarzt","Notarzt/RTH","vor Ort belassen"] },
      { id: "s_zustand_ueb", label: "Zustand bei Übergabe", kind: "single", options: ["gebessert","unverändert","verschlechtert","verstorben"] },
      { id: "f_uebergabe", label: "Übergabe-daten", kind: "form", form: "uebergabe" },
      { id: "f_isobar", label: "ISOBAR", kind: "form", form: "isobar" },
      { id: "t_sign", label: "Unter-schriften", kind: "tool", tool: "signature" },
      { id: "t_vitals7", label: "Messwerte Übergabe", kind: "tool", tool: "vitals" },
    ]},
    p8: { label: "Ergebnis", nr: 8, children: [
      { id: "s_naca", label: "NACA-Score", kind: "single", options: ["0","I","II","III","IV","V","VI","VII"] },
      { id: "s_ergebnis", label: "Einsatz-ergebnis", kind: "single", options: ["Transport in Klinik","Behandlung vor Ort","Transportverweigerung","Übergabe an anderes Rettungsmittel","Tod am Einsatzort","Fehleinsatz","Patient nicht auffindbar"] },
      { id: "s_na_nach", label: "Notarzt", kind: "single", options: ["nicht erforderlich","nachgefordert","von Beginn an","Telenotarzt"] },
      { id: "s_ersthelfer", label: "Ersthelfer-maßnahmen", kind: "single", options: ["keine","Laienreanimation","AED angewendet","Erste Hilfe suffizient","Erste Hilfe insuffizient"] },
      { id: "t_scores", label: "Scores", kind: "tool", tool: "scores" },
    ]},
    p9: { label: "Abschluss", nr: 9, children: [
      { id: "t_vollst", label: "vollständig?", kind: "tool", tool: "complete" },
      { id: "t_uebernehmen", label: "Daten übernehmen", kind: "tool", tool: "takeover" },
      { id: "t_vorschau", label: "Vorschau", kind: "tool", tool: "preview" },
      { id: "t_drucken", label: "Drucken", kind: "tool", tool: "print" },
      { id: "t_mat", label: "Mat. Verbrauch", kind: "tool", tool: "matuse" },
      { id: "t_abschl", label: "abschließen!", kind: "tool", tool: "close" },
      { id: "t_versand", label: "Datenverkehr / versenden", kind: "tool", tool: "send" },
    ]},
  };

  const FORMS = {
    patient: { title: "Patient", kvk: true, fields: [
      { k: "name", label: "Name", req: true }, { k: "vorname", label: "Vorname", req: true },
      { k: "geb", label: "Geburtsdatum (TTMMJJJJ)", type: "date", req: true },
      { k: "geschlecht", label: "Geschlecht", type: "toggle", options: ["männlich","weiblich","divers","unbekannt"], req: true },
      { k: "strasse", label: "Straße, Nr." }, { k: "plz", label: "PLZ" }, { k: "ort", label: "Ort" },
      { k: "wohnsitz", label: "Fester Wohnsitz", type: "toggle", options: ["ja","nein"] },
      { k: "telefon", label: "Telefon" }, { k: "gewicht", label: "Gewicht (kg)", type: "number" },
    ]},
    kosten: { title: "Kostenträger", fields: [
      { k: "kasse", label: "Krankenkasse", type: "select", options: ["","Musterkasse AOK-fiktiv","Beispiel-BKK","Fiktiva Ersatzkasse","Privat (fiktiv)","Selbstzahler","unbekannt"], req: true },
      { k: "ikNr", label: "Kassen-IK" }, { k: "versNr", label: "Versicherten-Nr.", req: true }, { k: "status", label: "Status" },
      { k: "kartenart", label: "Gelesen von", type: "select", options: ["manuell","eGK","KVK","e-card (AT)","Versichertenkarte (CH)"] },
    ]},
    transport: { title: "Transport", fields: [
      { k: "einsatznr", label: "Einsatznummer", req: true }, { k: "stichwort", label: "Stichwort/Einsatzart" },
      { k: "einsatzort", label: "Einsatzort (Straße, Nr., Ort)", req: true }, { k: "objekt", label: "Objekt/Hinweis" },
      { k: "ziel", label: "Transportziel" },
      { k: "t_alarm", label: "Alarm (HHMM)", type: "time", req: true }, { k: "t_aus", label: "Ausgerückt S3 (HHMM)", type: "time" },
      { k: "t_ankunft", label: "Am Einsatzort S4 (HHMM)", type: "time", req: true }, { k: "t_abfahrt", label: "Abfahrt S7 (HHMM)", type: "time" },
      { k: "t_ziel", label: "Am Ziel S8 (HHMM)", type: "time" }, { k: "t_frei", label: "Frei S1 (HHMM)", type: "time" },
      { k: "km", label: "Transport-km", type: "number" },
    ]},
    crew: { title: "Besatzung", fields: [
      { k: "fahrzeug", label: "Fahrzeug (Funkrufname)", req: true },
      { k: "fahrer", label: "Fahrer/in", req: true }, { k: "beifahrer", label: "Transportführer/in", req: true },
      { k: "praktikant", label: "Praktikant/in" }, { k: "notarzt", label: "Notarzt/Notärztin" },
      { k: "wache", label: "Wache" },
    ]},
    notfallgeschehen: { title: "Notfallgeschehen / Anamnese", fields: [ { k: "text", label: "Notfallgeschehen, Anamnese", type: "textarea", req: true } ] },
    medikation: { title: "Dauermedikation / Allergien", fields: [ { k: "med", label: "Dauermedikation", type: "textarea" }, { k: "allergie", label: "Allergien", type: "textarea" }, { k: "plan", label: "Medikationsplan vorhanden", type: "toggle", options: ["ja","nein"] } ] },
    dxtext: { title: "Freitextdiagnose", fields: [ { k: "text", label: "Arbeitsdiagnose", type: "textarea" } ] },
    verlauftext: { title: "Verlauf – Freitext", entry: true, fields: [ { k: "text", label: "Verlaufseintrag (wird mit Zeitstempel gespeichert)", type: "textarea" } ] },
    beatmung: { title: "Beatmungsparameter", fields: [ { k: "modus", label: "Modus", type: "select", options: ["","IPPV","SIMV","CPAP","BiPAP","PCV"] }, { k: "fio2", label: "FiO2 (%)", type: "number" }, { k: "vt", label: "AZV (ml)", type: "number" }, { k: "af", label: "Frequenz (/min)", type: "number" }, { k: "peep", label: "PEEP (mbar)", type: "number" }, { k: "pmax", label: "Pmax (mbar)", type: "number" } ] },
    perfusor: { title: "Perfusorliste (ITW)", fields: [ { k: "p1", label: "Perfusor 1 (Wirkstoff, Konz., ml/h)" }, { k: "p2", label: "Perfusor 2" }, { k: "p3", label: "Perfusor 3" }, { k: "p4", label: "Perfusor 4" } ] },
    uebergabe: { title: "Übergabedaten", fields: [ { k: "zeit", label: "Übergabezeit (HHMM)", type: "time", req: true }, { k: "an", label: "Übernehmende Person", req: true }, { k: "klinik", label: "Klinik/Abteilung" }, { k: "wertsachen", label: "Wertsachen/Eigentum übergeben" } ] },
    isobar: { title: "ISOBAR-Übergabe", fields: [ { k: "i", label: "I – Identifikation", type: "textarea" }, { k: "s", label: "S – Situation", type: "textarea" }, { k: "o", label: "O – Observation (Befunde)", type: "textarea" }, { k: "b", label: "B – Background", type: "textarea" }, { k: "a", label: "A – Agreed Plan / Maßnahmen", type: "textarea" }, { k: "r", label: "R – Read back / Rückfragen", type: "textarea" } ] },
  };

  // Pflichtfelder je Protokolltyp; col = Spalte in der Vollständigkeitsprüfung
  const REQUIRED = {
    base: [
      { p: "p1", id: "f_patient", label: "Patientendaten" }, { p: "p1", id: "f_transport", label: "Transportdaten" },
      { p: "p1", id: "f_crew", label: "Besatzung" }, { p: "p1", id: "s_einsatzart", label: "Einsatzart" },
      { p: "p1", id: "f_kosten", label: "Kostenträger" },
      { p: "p8", id: "s_ergebnis", label: "Einsatzergebnis" },
    ],
    Notfall: [
      { p: "p2", id: "f_notfallgeschehen", label: "Notfallgeschehen" }, { p: "p2", id: "m_vorerkr", label: "Vorerkrankungen" },
      { p: "p3", id: "s_bewusstsein", label: "Bewusstsein" }, { p: "p3", id: "t_gcs", label: "GCS" }, { p: "p3", id: "s_ekg", label: "EKG" },
      { p: "p3", id: "m_atmung", label: "Atmung" }, { p: "p3", id: "s_schmerz", label: "Schmerz" }, { p: "p3", id: "t_messwerte", label: "Erstbefund-Messwerte" },
      { p: "p4", id: "DX", label: "Diagnose" }, { p: "p7", id: "s_uebergabe_an", label: "Übergabe an" }, { p: "p7", id: "f_uebergabe", label: "Übergabedaten" },
      { p: "p8", id: "s_naca", label: "NACA" },
    ],
    KTP: [ { p: "p2", id: "f_notfallgeschehen", label: "Transportgrund" }, { p: "p7", id: "s_uebergabe_an", label: "Übergabe an" } ],
    ITW: [
      { p: "p2", id: "f_notfallgeschehen", label: "Anamnese/Verlegungsgrund" }, { p: "p3", id: "t_gcs", label: "GCS" }, { p: "p3", id: "t_messwerte", label: "Messwerte" },
      { p: "p4", id: "DX", label: "Diagnose" }, { p: "p6", id: "f_beatm", label: "Beatmungsparameter" }, { p: "p6", id: "f_perf", label: "Perfusorliste" },
      { p: "p7", id: "s_uebergabe_an", label: "Übergabe an" }, { p: "p7", id: "f_uebergabe", label: "Übergabedaten" }, { p: "p8", id: "s_naca", label: "NACA" },
    ],
  };

  const MATERIAL = ["Absaugkatheter","Beatmungsfilter","Beatmungsschlauch","Blockerspritze","BZ-Teststreifen","Defi-Elektroden","EKG-Elektroden","Einmalhandschuhe","Endotrachealtubus","Entlastungskanüle","Fixierpflaster","Guedel-Tubus","HWS-Stützkragen","i.o.-Nadel","Infusionsbesteck","Lanzette","Larynxtubus","Mullbinde","NaCl 0,9 % 10 ml","O2-Brille","O2-Maske","O2-Maske mit Reservoir","Perfusorleitung","Perfusorspritze 50 ml","Rettungsdecke","Spritze 10 ml","Tupfer","Venenverweilkanüle","Verbandpäckchen","Verneblermaske","Vollelektrolytlösung","Wendl-Tubus","Wundauflage"];

  // Schulungs-Medikamentenliste: Namen/Darreichung, KEINE Dosierempfehlungen
  const DRUGS = [
    { n: "Acetylsalicylsäure", f: "i.v.", g: "Thrombozytenaggregationshemmer" }, { n: "Adrenalin", f: "i.v./i.o./i.m./Vernebler", g: "Katecholamin" },
    { n: "Amiodaron", f: "i.v.", g: "Antiarrhythmikum" }, { n: "Atropin", f: "i.v.", g: "Parasympatholytikum" },
    { n: "Butylscopolamin", f: "i.v.", g: "Spasmolytikum" }, { n: "Dimenhydrinat", f: "i.v.", g: "Antiemetikum" },
    { n: "Esketamin", f: "i.v./i.n.", g: "Analgetikum/Anästhetikum" }, { n: "Fentanyl", f: "i.v./i.n.", g: "Opioid" },
    { n: "Furosemid", f: "i.v.", g: "Diuretikum" }, { n: "Glukose 40 %", f: "i.v.", g: "Glukose" },
    { n: "Glyceroltrinitrat", f: "s.l.", g: "Nitrat" }, { n: "Heparin", f: "i.v.", g: "Antikoagulans" },
    { n: "Ibuprofen", f: "p.o.", g: "NSAR" }, { n: "Ipratropiumbromid", f: "Vernebler", g: "Bronchodilatator" },
    { n: "Midazolam", f: "i.v./i.n./buccal", g: "Benzodiazepin" }, { n: "Morphin", f: "i.v.", g: "Opioid" },
    { n: "Paracetamol", f: "i.v.", g: "Analgetikum" }, { n: "Prednisolon", f: "i.v.", g: "Glukokortikoid" },
    { n: "Salbutamol", f: "Vernebler", g: "Beta-2-Sympathomimetikum" }, { n: "Tranexamsäure", f: "i.v.", g: "Antifibrinolytikum" },
    { n: "Urapidil", f: "i.v.", g: "Antihypertensivum" }, { n: "Vollelektrolytlösung", f: "i.v.", g: "Infusion" },
  ];

  const CLINICS = [
    { id: "k1", name: "Klinikum Musterstadt (fiktiv)", adr: "Hauptstraße 1, 12345 Musterstadt", fach: ["ZNA","Schockraum","Stroke Unit","HKL"], tel: "0000 111-0" },
    { id: "k2", name: "St.-Beispiel-Krankenhaus (fiktiv)", adr: "Kirchweg 12, 12346 Beispielhausen", fach: ["ZNA","Station"], tel: "0000 222-0" },
    { id: "k3", name: "Uniklinik Fiktiva (fiktiv)", adr: "Campusallee 5, 12347 Fiktiva", fach: ["ZNA","Schockraum","Stroke Unit","HKL","Intensiv","Kinderklinik"], tel: "0000 333-0" },
    { id: "k4", name: "Kreisklinik Nordheim (fiktiv)", adr: "Am Park 3, 12348 Nordheim", fach: ["ZNA","HKL"], tel: "0000 444-0" },
  ];

  const ALARMS = [
    { stichwort: "RD 2 – Brustschmerz", art: "Notfall", beschr: "Pat. ca. 60 J., Brustschmerz seit 30 min, kaltschweißig", str: "Lindenallee", ort: "12345 Musterstadt", pat: ["Mustermann","Max","12.03.1964"] },
    { stichwort: "RD 2 – Bewusstlose Person", art: "Notfall", beschr: "Person in Wohnung zusammengebrochen, atmet", str: "Am Marktplatz", ort: "12346 Beispielhausen", pat: ["Musterfrau","Erika","01.08.1951"] },
    { stichwort: "RD 1 – Sturz", art: "Notfall", beschr: "Sturz von Leiter, Schmerzen Unterschenkel", str: "Gartenweg", ort: "12347 Fiktiva", pat: ["Beispiel","Bernd","24.11.1978"] },
    { stichwort: "RD 2 – Schlaganfall", art: "Notfall", beschr: "Seit 40 min Sprachstörung und Schwäche rechts", str: "Rosenstraße", ort: "12345 Musterstadt", pat: ["Probe","Paula","15.05.1946"] },
    { stichwort: "KTP – Verlegung", art: "KTP", beschr: "Rücktransport nach ambulanter Untersuchung, sitzend", str: "Hauptstraße 1 (Klinikum)", ort: "12345 Musterstadt", pat: ["Test","Tanja","09.02.1939"] },
    { stichwort: "ITW – Sekundärverlegung", art: "ITW", beschr: "Beatmeter Pat. zur Weiterbehandlung, Perfusoren laufen", str: "Am Park 3 (Kreisklinik)", ort: "12348 Nordheim", pat: ["Fiktiv","Frank","30.06.1959"] },
  ];

  const FMS = [
    { s: 1, t: "Einsatzbereit über Funk" }, { s: 2, t: "Einsatzbereit auf Wache" }, { s: 3, t: "Einsatz übernommen" },
    { s: 4, t: "Am Einsatzort" }, { s: 5, t: "Sprechwunsch" }, { s: 6, t: "Nicht einsatzbereit" },
    { s: 7, t: "Patient aufgenommen" }, { s: 8, t: "Am Transportziel" },
  ];

  const VCHECK = {
    "Schublade 1 – Atemweg": ["Absaugpumpe geprüft","Guedel-Set vollständig","Larynxtuben 3/4/5","Intubationsbesteck, Lampe geprüft","Beatmungsbeutel Erw./Kind"],
    "Schublade 2 – Zugänge": ["Venenverweilkanülen alle Größen","i.o.-System","Infusionen VEL 2×","Spritzen/Kanülen","Stauband, Desinfektion"],
    "Schublade 3 – Verband": ["Verbandpäckchen","Tourniquet 2×","Rettungsdecken","Wundauflagen","Beckenschlinge"],
    "Fach – Diagnostik/Geräte": ["Defi/Monitor Selbsttest ok","Defi-Akku geladen","BZ-Gerät Kontrolllösung","Beatmungsgerät Funktionstest","Sauerstoff Hauptflasche ≥ 50 %"],
    "Fahrzeug": ["Sondersignal geprüft","Tankfüllung ≥ 1/2","Desinfektion Fahrgastraum","Trage/Tragestuhl geprüft","Tablet-Akkus geladen"],
  };

  const TRANSLATE = {
    phrases: ["Haben Sie Schmerzen?","Wo tut es weh?","Wie alt sind Sie?","Haben Sie Allergien?","Nehmen Sie Medikamente?","Wir bringen Sie ins Krankenhaus.","Bitte tief einatmen.","Haben Sie Vorerkrankungen?"],
    langs: {
      Englisch: ["Are you in pain?","Where does it hurt?","How old are you?","Do you have any allergies?","Do you take any medication?","We are taking you to the hospital.","Please breathe in deeply.","Do you have any previous illnesses?"],
      Französisch: ["Avez-vous mal ?","Où avez-vous mal ?","Quel âge avez-vous ?","Avez-vous des allergies ?","Prenez-vous des médicaments ?","Nous vous emmenons à l'hôpital.","Respirez profondément, s'il vous plaît.","Avez-vous des antécédents médicaux ?"],
      Spanisch: ["¿Tiene dolor?","¿Dónde le duele?","¿Cuántos años tiene?","¿Tiene alergias?","¿Toma medicamentos?","Le llevamos al hospital.","Respire hondo, por favor.","¿Tiene enfermedades previas?"],
      Türkisch: ["Ağrınız var mı?","Neresi ağrıyor?","Kaç yaşındasınız?","Alerjiniz var mı?","İlaç kullanıyor musunuz?","Sizi hastaneye götürüyoruz.","Lütfen derin nefes alın.","Daha önce geçirdiğiniz hastalıklar var mı?"],
      Polnisch: ["Czy odczuwa Pan/Pani ból?","Gdzie boli?","Ile ma Pan/Pani lat?","Czy ma Pan/Pani alergie?","Czy przyjmuje Pan/Pani leki?","Zabieramy Pana/Panią do szpitala.","Proszę głęboko oddychać.","Czy ma Pan/Pani choroby przewlekłe?"],
    },
  };

  const DOCS = [
    { t: "Hygieneplan RTW (Schulungsbeispiel)", c: "1. Hände desinfizieren vor und nach Patientenkontakt.\n2. Flächen nach jedem Einsatz wischdesinfizieren (Trage, Griffe, Tablet).\n3. Infektionstransport: Schutzausrüstung gemäß Erregerliste, anschließend Desinfektion nach Plan.\n(Fiktives Beispiel – maßgeblich ist der Hygieneplan Ihrer Organisation.)" },
    { t: "Algorithmus Reanimation (Platzhalter)", c: "Platzhalter für den Algorithmus Ihres ÄLRD. Hier können eigene Dokumente (PDF, BMP, JPG) hinterlegt werden." },
    { t: "Telefonliste Kliniken (fiktiv)", c: "Klinikum Musterstadt 0000 111-0\nSt.-Beispiel-Krankenhaus 0000 222-0\nUniklinik Fiktiva 0000 333-0\nKreisklinik Nordheim 0000 444-0" },
    { t: "Bedienhinweise RettPad", c: "Linke Seite: 9 Protokollierungstasten, Schnellwahltasten, Patientenwahlschalter, Vitaldatenfeld, Statusbalken.\nRechte Seite: Anzeigebereich, unten die letzte Zeile der Verlaufsliste (antippen zum Öffnen).\nRote Markierung = Pflichtfelder offen, grün = vollständig." },
  ];

  const DEVICES = ["Defi/Monitor A (Simulation)","Defi/Monitor B (Simulation)","AED (Simulation)","Notfallrespirator (Simulation)","Beatmungsgerät Transport (Simulation)","Drucker RTW (Simulation)","Pad-zu-Pad: Tablet RTW 2 (Simulation)"];

  return { TREE, FORMS, REQUIRED, MATERIAL, DRUGS, CLINICS, ALARMS, FMS, VCHECK, TRANSLATE, DOCS, DEVICES, VERSION: "RettPad 2.0.0 (Schulung)" };
})();
