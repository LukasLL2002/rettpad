# RettPad

RettPad ist eine unabhängige Trainings-App (Schulungs-Simulation) für die Einsatzdokumentation im Rettungsdienst. Sie arbeitet ausschließlich mit Übungsdaten – keine echten Patientendaten, kein Medizinprodukt, nicht mit einem Hersteller verbunden.

**App öffnen:** https://lukasll2002.github.io/rettpad/

## Zugang

Die Nutzung ist nur mit einem Konto möglich. Konten werden ausschließlich von einem Administrator angelegt; eine Selbstregistrierung gibt es nicht. Beim ersten Login muss ein eigenes Passwort gesetzt werden. Die Anmeldung erfolgt mit E-Mail-Adresse oder Personalnummer und Passwort.

## Als App installieren

- **Android (Chrome):** Seite öffnen → Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone/iPad (Safari):** Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.
- **PC (Chrome/Edge):** Seite öffnen → Installieren-Symbol in der Adressleiste bzw. Menü → „App installieren“.

Nach der Installation startet RettPad im Vollbild und ist auch offline nutzbar (Anmeldung und Synchronisierung benötigen eine Verbindung).

## Technik

Statische Web-App (PWA) ohne Build-Schritt, gehostet über GitHub Pages. Daten werden über Supabase gespeichert und durch Anmeldung und Row Level Security geschützt. Im Repository befinden sich nur die öffentliche Projekt-URL und der öffentliche (publishable) Client-Schlüssel.
