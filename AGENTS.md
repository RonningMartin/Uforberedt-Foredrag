# AGENTS

## Formål

Dette prosjektet skal videreutvikles som en frontend-only webapp i det eksisterende React-, TypeScript- og Vite-prosjektet. Ikke opprett et nytt prosjekt, ikke lag en ny prosjektmappe, og ikke rør `.git`-mappen.

## Teknologiske rammer

- Bruk React, TypeScript og Vite.
- Lagre applikasjonsdata lokalt med `localStorage`.
- Ikke innfør krav om backend, database eller autentisering.
- TypeScript skal brukes med sterke typer og uten unødvendig `any`.
- Store nye avhengigheter skal ikke installeres uten tydelig begrunnelse.

## Arbeidsregler

- Eksisterende fungerende funksjonalitet skal ikke fjernes uten god grunn.
- Endringer skal gjøres i små, gjennomgåbare steg.
- Ikke gjør destruktive endringer uten eksplisitt beskjed.
- Kommentarer i kode skal være få og bare forklare ikke-opplagt logikk.
- Codex skal ikke lage commits, opprette PR-er eller pushe til GitHub uten uttrykkelig beskjed fra brukeren.

## Kvalitetskrav

- Tilstand, validering og randomisering skal være testbar logikk.
- Løsningen skal tåle refresh og gjenopprettes fra `localStorage`.
- UI skal være tilgjengelig med tydelige labels, knapper og feiltilstander.
- Appen skal ha et minimalistisk arrangementgrensesnitt og et praktisk oppsett, ikke et utviklerdashboard.
- Nye sider skal ikke fylles med utviklerforklaringer eller unødvendige dashboard-kort.
- Nye funksjoner skal være i tråd med prosjektets plan i `PLAN.md`, med mindre brukeren ber om en bevisst endring av kurs.

## Verifisering etter endringer

- Kjør `npm run build` etter relevante endringer.
- Kjør tester etter relevante endringer. Når testscript finnes, bruk `npm run test`.
- Kjør andre relevante kontroller for den konkrete endringen og rapporter hva som faktisk ble kjørt.
- Hvis en kontroll ikke kan kjøres, skal det sies tydelig.

## Nyttige kommandoer

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test` når testoppsettet er lagt til
