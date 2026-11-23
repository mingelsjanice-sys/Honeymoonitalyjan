# Honeymoon Atlas — Personal Italy Planner

Een persoonlijke, niet-commerciële planner voor een roadtrip-huwelijksreis door Italië.

## Wat zit erin
- interactieve Italiëkaart met romantische bestemmingen
- live accommodatiezoeker via API.SH / Booking.com publieke data
- datum, aantal reizigers en live verblijfskosten
- filters voor romantisch, zwembad, wijn, agriturismo en gratis annuleren
- route met drag & drop, automatische routeberekening en eenvoudige route-optimalisatie
- dag-tot-dag tijdlijn
- budget per categorie + per persoon
- lokale opslag van jullie reis zodat de planner na refresh blijft staan
- deelbare reisconfiguratie via URL
- print/PDF via de browser
- advies wanneer een auto handig is en wanneer je hem beter niet gebruikt

## Starten
1. Maak een persoonlijk account op API.SH en maak een API key.
2. Kopieer `.env.example` naar `.env`.
3. Zet `APISH_KEY=...` in `.env`.
4. Run:

```bash
npm install
npm start
```

Open daarna `http://localhost:3000`.

API.SH geeft volgens de actuele documentatie 1.000 gratis credits per maand en de Booking.com endpoint voor hotelzoekopdrachten kost 1 credit per call. De API is read-only; boeken gebeurt op de accommodatie-/Booking.com-pagina. Controleer voor gebruik altijd de actuele voorwaarden van API.SH en de betrokken websites.

## Route
De route gebruikt OSRM voor de routeberekening. Voor persoonlijk gebruik is dat handig voor een prototype; voor een publiek/commercieel product kun je later een eigen/commerciële routingprovider gebruiken.

## Belangrijk
De API-key staat alleen in `.env` op de server en nooit in de frontend.


## Nieuwe honeymoon-wizard
De knop **Bouw mijn honeymoon** maakt op basis van aantal dagen, budget, stijl, gewenste stops en rijbereidheid automatisch een eerste routevoorstel. Je kunt daarna de stops handmatig aanpassen en accommodaties kiezen.

## Online zetten (makkelijkste route: Render)
1. Maak een GitHub-account en een nieuw repository.
2. Upload de inhoud van deze map naar het repository.
3. Ga naar Render en kies **New → Web Service** en koppel het GitHub-repository.
4. Build command: `npm install`
5. Start command: `npm start`
6. Voeg bij Environment Variables `APISH_KEY` toe met je eigen API.SH-key.
7. Deploy. Render geeft je daarna een `onrender.com`-adres.

Omdat deze app een Node/Express-server gebruikt, is een Web Service nodig en niet alleen een Static Site. Je API-key blijft daarmee server-side.
