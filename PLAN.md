# PLAN

## Nåværende status

Prosjektet er per nå et fungerende Vite-prosjekt med React og TypeScript, samt en ferdig grunnmur fra fase 1:

- Byggekjedet bruker Vite 7, React 19 og TypeScript 5.
- Roten inneholder standardfiler som `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` og `README.md`.
- `src/` inneholder nå `types`, `state`, `hooks`, `utils` og testfiler i tillegg til app-skallet.
- Appen har sentral state med reducer, versjonert `localStorage`-persistens og validering av lagret data.
- Det finnes et enkelt app-shell med navigasjon mellom Oppsett, Event og Historikk, men bare som plassholdere.
- Vitest er satt opp og dekker grunnleggende logikk for sikker tilfeldig trekning og gjenoppretting fra lagret state.
- Baseline-status er god: tester og `npm run build` fungerer.

## Utvidelse: Valgfritt Straffehjul

Den opprinnelige faseplanen er nå implementert, og prosjektet har fått en ekstra funksjon utenfor de opprinnelige fasene:

- Et valgfritt straffehjul etter bekreftet runde.
- En egen samling med straffer i oppsettet.
- Valgfri straff koblet til en gjennomført runde i historikken.
- Undo, restore og `localStorage` må derfor håndtere straffer på linje med deltakere og presentasjoner.

Føringer for denne utvidelsen:

- Straff skal aldri være påkrevd for å starte neste runde.
- Straff trekkes og bekreftes etter at selve runden allerede er bekreftet.
- Foreløpig trukket straff må kunne avbrytes uten at noe markeres som brukt.
- Eksisterende lagrede runder uten straff må fortsatt kunne leses trygt.

## Sammenligning mot kravspesifikasjonen

### Allerede på plass

- React
- TypeScript
- Vite
- En enkel og responsiv app-shell med kompakt toppnavigasjon
- Sentral app-state og reducer
- Lokal persistens med `localStorage`
- Validering og fallback ved korrupt lagret data
- Vitest-oppsett for sentral logikk
- Ingen backend
- Eksisterende Git-repository er beholdt

### Mangler helt eller nesten helt

- Setup/adminskjerm med faktiske skjemaer og lister
- Full event-modus for stor skjerm
- Spinning wheel-komponent som visualiserer sikker tilfeldig trekning
- Runde-flyt med bekreftelse, omtrekk, tilbake og avbryt
- Historikkside med reelle runder, undo/restore/reset
- Import/eksport av JSON-data
- Feilhåndtering for ugyldige URL-er og blokkert popup
- Tastaturstyring og fullscreen-støtte
- README-innhold for testing, publisering og arkitektur

## Foreslått arkitektur

Anbefalt videre struktur:

- `src/types/`
  - Domene- og lagringstyper for deltakere, presentasjoner, historikk, runder og import/eksport
- `src/state/`
  - Sentral app-state, actions og reducer for all lokal applikasjonslogikk
- `src/pages/`
  - `SetupPage`, `EventPage`, `HistoryPage`
- `src/components/`
  - `Wheel`, `ParticipantManager`, `PresentationManager`, `RoundResult`, `ConfirmationDialog`, `HistoryList`
- `src/hooks/`
  - `useLocalStorage`, `useFullscreen`
- `src/utils/`
  - `secureRandom`, `dataValidation`, `importExport`
- `src/data/`
  - Eksempel-/demo-datasett

Anbefalte designprinsipper:

- Bruk en sentral reducer-basert state i stedet for mange separate lokale states.
- Lagra hele app-tilstanden under én versjonert `localStorage`-nøkkel.
- Skill mellom "aktiv/inaktiv" og "brukt/tilgjengelig" som to ulike konsepter.
- Lagre historikk med snapshots av navn/tittel/URL, slik at historikk fortsatt er lesbar selv om elementer endres senere.
- Hold navigasjon enkel. En lett hash-basert navigasjon eller en liten intern side-state kan være nok uten å innføre tung ruting.
- Unngå store tredjepartsbiblioteker for hjul, state og validering med mindre vi faktisk trenger dem.

## Design- og interaksjonsmål for sluttproduktet

Denne seksjonen beskriver ønsket sluttretning for brukeropplevelsen. Målene styrer senere faser, men funksjonene skal fortsatt implementeres i de allerede planlagte fasene.

### Generelt

- Applikasjonen skal være enkel, ryddig og lett å forstå.
- Den skal brukes under et sosialt arrangement og må ikke se ut som et profesjonelt analyse-dashboard.
- Oppsett og administrasjon skal være praktisk, mens event-modus skal være svært minimalistisk og egnet for prosjektor og fullskjerm.
- Tekst og knapper skal være store nok til å leses på avstand.
- Utviklingstekst og tekniske forklaringer skal aldri vises i det ferdige brukergrensesnittet.

### Oppsett-siden

Oppsett-siden skal hovedsakelig ha:

1. En kompakt toppmeny med:
   - Oppsett
   - Event
   - Historikk
2. To tydelige områder eller kolonner:
   - Deltakere
   - Presentasjoner
3. Deltakere:
   - Vise navnet på alle deltakere.
   - Legge til én deltaker.
   - Legge til flere deltakere samtidig.
   - Redigere navn.
   - Slette deltaker.
   - Aktivere eller deaktivere deltaker.
   - Vise om deltakeren er tilgjengelig, brukt eller deaktivert.
   - Gjøre en brukt deltaker tilgjengelig igjen manuelt.
4. Presentasjoner:
   - Vise presentasjonens tittel.
   - Lagre en HTTP- eller HTTPS-lenke til presentasjonen.
   - Legge til en ny presentasjon med tittel og lenke.
   - Redigere tittel og lenke.
   - Slette presentasjon.
   - Aktivere eller deaktivere presentasjon.
   - Vise om presentasjonen er tilgjengelig, brukt eller deaktivert.
   - Gjøre en brukt presentasjon tilgjengelig igjen manuelt.
5. En tydelig knapp:
   - `Start arrangement`
6. En diskret statuslinje, for eksempel:
   - `12 deltakere · 12 presentasjoner tilgjengelig`

Unngå store statistikkort dersom informasjonen kan vises mer kompakt.

### Event-modus

Event-modus skal ha minimalt med visuell støy.

Steg 1:

- Overskrift: `Velg deltaker`
- Et stort hjul med alle tilgjengelige deltakere.
- En tydelig knapp: `Spinn hjulet`.
- Etter trekning vises den valgte deltakeren tydelig.
- Det skal være mulig å trykke `Spinn på nytt`.
- Det skal være mulig å avbryte runden.
- `Spinn på nytt` skal erstatte det foreløpige valget uten å merke noen som brukt.
- En knapp `Fortsett` går videre til presentasjonshjulet.

Steg 2:

- Overskrift: `Velg presentasjon`
- Et stort hjul med alle tilgjengelige presentasjoner.
- En tydelig knapp: `Spinn hjulet`.
- Etter trekning vises valgt presentasjon tydelig.
- Det skal være mulig å trykke `Spinn på nytt`.
- Det skal være mulig å gå tilbake eller avbryte runden.
- En knapp skal åpne presentasjonslenken i en ny fane.
- En manuell `Åpne presentasjon`-knapp skal alltid være tilgjengelig.

Steg 3:

- Vis valgt deltaker og valgt presentasjon sammen.
- Ha en tydelig knapp: `Bekreft runde`.
- Deltakeren og presentasjonen skal først merkes som brukt når runden bekreftes.
- Etter bekreftelse fjernes de fra fremtidige trekninger.
- Vis en enkel knapp: `Start neste runde`.

### Respinn og midlertidige valg

- En trekning skal være foreløpig frem til runden bekreftes.
- Brukeren skal kunne spinne deltakerhjulet på nytt.
- Brukeren skal kunne spinne presentasjonshjulet på nytt.
- Tidligere foreløpige valg skal ikke markeres som brukt.
- Ingen deltaker eller presentasjon skal fjernes permanent bare fordi hjulet har blitt spunnet.

### Brukt, deaktivert, slettet og gjenopprettet

Bruk disse betydningene konsekvent:

- Tilgjengelig:
  Kan trekkes i en ny runde.
- Brukt:
  Har vært med i en bekreftet runde og trekkes ikke igjen automatisk, men finnes fortsatt lagret.
- Deaktivert:
  Finnes fortsatt i oppsettet, men skal ikke være med i trekningen.
- Slettet:
  Fjernes helt etter at brukeren har bekreftet slettingen.
- Gjenopprett:
  Gjør en brukt deltaker eller presentasjon tilgjengelig igjen.

Det skal være mulig å gjenopprette individuelle brukte deltakere og presentasjoner fra Oppsett eller Historikk.

### Historikk

Historikksiden skal vise gjennomførte runder på en enkel måte:

- Rundenummer
- Deltaker
- Presentasjon
- Lenke
- Tidspunkt

Den skal ha:

- `Angre siste runde`, som legger både deltaker og presentasjon tilbake.
- Mulighet til å gjenopprette én deltaker.
- Mulighet til å gjenopprette én presentasjon.
- Nullstilling av fremdrift uten å slette oppsettet.
- Sletting av alle data som et separat valg med tydelig bekreftelse.

### Visuelt eksempel

Oppsett kan omtrent følge denne enkle strukturen:

```text
Uforberedt foredrag

[Oppsett] [Event] [Historikk]

Deltakere                  Presentasjoner
──────────────────         ──────────────────
Ola                        Verdensrommet
Kari                       Katter på internett
Per                        Kunstig intelligens

[Legg til deltaker]        [Legg til presentasjon]

12 deltakere · 12 presentasjoner tilgjengelig

[Start arrangement]
```

Event-modus kan omtrent følge denne strukturen:

```text
Steg 1 av 2 – Velg deltaker

              [HJUL]

          [SPINN HJULET]

Etter trekning:

Valgt deltaker

MARTIN

[Spinn på nytt] [Fortsett] [Avbryt]
```

Dette er kun en retningslinje for struktur. Designet skal være pent og responsivt, men fortsatt enkelt.

## Faseplan

### Fase 1: Grunnmur, state og testoppsett

Status:

- Fullført

Mål:

- Etablere en robust intern datamodell.
- Innføre sentral app-state og lokal persistens.
- Legge til Vitest-oppsett for logikk-tester.
- Opprette grunnleggende app-shell med tydelige sider eller visninger.

Sannsynlige filer:

- Endre `src/App.tsx`
- Endre `src/main.tsx`
- Opprette `src/types/app.ts`
- Opprette `src/types/domain.ts`
- Opprette `src/state/appReducer.ts`
- Opprette `src/state/appState.ts`
- Opprette `src/hooks/useLocalStorage.ts`
- Opprette `src/utils/dataValidation.ts`
- Opprette `src/utils/secureRandom.ts`
- Opprette `vitest.config.ts`
- Opprette eventuelt `src/test/setup.ts`
- Endre `package.json`
- Endre eventuelt `tsconfig.app.json` eller `vite.config.ts` for teststøtte

Testkriterier:

- `npm run build` er grønn.
- `npm run test` finnes og kjører.
- Tom initial state lastes korrekt.
- Gyldig `localStorage` gjenopprettes korrekt.
- Korrupt `localStorage` blir avvist og erstattet med trygg fallback.
- Sikker tilfeldig trekning returnerer kun gyldige kandidater.

### Fase 2: Setup/admin for deltakere og presentasjoner

Status:

- Planlagt

Mål:

- Lage en praktisk administrasjonsside for å opprette og vedlikeholde data.
- Støtte enkel, rask innlegging av mange deltakere og presentasjoner.
- Validere URL-er og vise nyttige tomtilstander og feiltilstander.

Sannsynlige filer:

- Opprette `src/pages/SetupPage.tsx`
- Opprette `src/components/ParticipantManager.tsx`
- Opprette `src/components/PresentationManager.tsx`
- Opprette mindre form- og listekomponenter ved behov
- Opprette `src/data/demoData.ts`
- Endre `src/styles.css` eller splitte stilene i flere filer
- Endre reducer/state for CRUD-handlinger

Testkriterier:

- Deltaker kan legges til, endres, slettes, aktiveres og deaktiveres.
- Presentasjon kan legges til, endres, slettes, aktiveres og deaktiveres.
- Bulk-innlegging av deltakere fra flere linjer fungerer.
- Bulk-innlegging av presentasjoner følger valgt format og rapporterer linjefeil forståelig.
- Ugyldige URL-er med annet enn `http`/`https` blir avvist.
- Demo-datasett kan lastes inn uten å skade eksisterende state ved feil.

### Fase 3: Runde-motor og bekreftelsesflyt

Status:

- Planlagt

Mål:

- Implementere selve runde-logikken uavhengig av den visuelle hjul-animasjonen.
- Sikre at brukt materiale ikke trekkes igjen.
- Håndtere fortsett, omtrekk, avbryt og bekreft på en forutsigbar måte.

Sannsynlige filer:

- Opprette `src/pages/EventPage.tsx`
- Opprette `src/components/RoundResult.tsx`
- Opprette eventuelle hjelpekomponenter for stegindikator og handlingsknapper
- Endre `src/state/appReducer.ts`
- Opprette `src/utils/roundLogic.ts`

Testkriterier:

- Kun aktive og ubrukte deltakere kan trekkes.
- Kun aktive og ubrukte presentasjoner kan trekkes.
- Valgt deltaker/presentasjon blir ikke permanent brukt før bekreftelse.
- `Spin again` erstatter bare valg innen aktiv runde.
- `Cancel round` rydder ufullført runde trygt.
- Når kun ett element gjenstår, velges det gyldig uten å bryte flyten.
- Hvis valgt deltaker eller presentasjon slettes under en ufullført runde, håndteres det eksplisitt og trygt.

### Fase 4: Wheel-komponent og event-modus for storskjerm

Status:

- Planlagt

Mål:

- Lage en gjenbrukbar hjulkomponent som lander på forhåndsvalgt vinner.
- Implementere projeksjonsvennlig event-modus med store typografier, fullscreen og tastaturkontroller.

Sannsynlige filer:

- Opprette `src/components/Wheel.tsx`
- Opprette `src/hooks/useFullscreen.ts`
- Opprette eventuelle `src/hooks/useKeyboardShortcuts.ts`
- Endre `src/pages/EventPage.tsx`
- Endre eller splitte stilfiler for event-modus

Testkriterier:

- Hjulet viser riktige segmenter for gjeldende kandidatliste.
- Vinner bestemmes først med sikker tilfeldig logikk, deretter med korrekt rotasjonsberegning.
- Visuell landing stemmer med valgt vinner.
- `Space`, `Enter` og `Escape` gjør riktig ting i riktig steg.
- Tastetrykk trigges ikke dobbelt ved key-repeat eller fokus i inputfelt.
- Fullscreen-knappen fungerer med forståelig fallback dersom nettleseren avviser forespørselen.
- Manuell "Open presentation"-knapp er alltid tilgjengelig.

### Fase 5: Historikk, undo, restore og reset

Status:

- Planlagt

Mål:

- Gjøre det mulig å forstå og reversere hendelser under arrangementet.
- Beholde dataintegritet ved undo, restore og reset.

Sannsynlige filer:

- Opprette `src/pages/HistoryPage.tsx`
- Opprette `src/components/HistoryList.tsx`
- Opprette `src/components/ConfirmationDialog.tsx`
- Endre state/reducer og valideringslogikk

Testkriterier:

- Historikk viser rundenummer, deltaker, presentasjon, URL og tidspunkt.
- `Undo last round` returnerer både deltaker og presentasjon til tilgjengelig pool.
- `Restore participant` og `Restore presentation` fungerer etter valgt design.
- Reset med "behold data" nullstiller progresjon uten å slette grunnlag.
- Reset med "slett alt" fjerner all applikasjonsdata.

### Fase 6: Import/eksport, robusthet, dokumentasjon og sluttpolering

Status:

- Planlagt

Mål:

- Fullføre dataflyt inn og ut av appen.
- Harde opp løsningen mot feilscenarier.
- Fullføre README, publiseringsinstruksjoner og arkitekturforklaring.

Sannsynlige filer:

- Opprette `src/utils/importExport.ts`
- Endre `src/utils/dataValidation.ts`
- Endre `src/pages/SetupPage.tsx`
- Endre `README.md`
- Endre `package.json` med endelige testskript om nødvendig

Testkriterier:

- Eksportert JSON inneholder deltakere, presentasjoner, historikk, innstillinger og nødvendig metadata.
- Gyldig import erstatter state korrekt.
- Ugyldig import avvises med forståelig feilmelding.
- Importert data overlever refresh.
- README beskriver installasjon, utvikling, test, build og publisering til Vercel, Netlify og GitHub Pages.

## Sannsynlige filer som må endres eller opprettes totalt

Mest sannsynlige eksisterende filer som må endres:

- `package.json`
- `README.md`
- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`
- `vite.config.ts`
- `tsconfig.app.json`

Mest sannsynlige nye mapper/filer:

- `src/components/Wheel.tsx`
- `src/components/ParticipantManager.tsx`
- `src/components/PresentationManager.tsx`
- `src/components/RoundResult.tsx`
- `src/components/ConfirmationDialog.tsx`
- `src/components/HistoryList.tsx`
- `src/pages/SetupPage.tsx`
- `src/pages/EventPage.tsx`
- `src/pages/HistoryPage.tsx`
- `src/hooks/useLocalStorage.ts`
- `src/hooks/useFullscreen.ts`
- `src/utils/secureRandom.ts`
- `src/utils/dataValidation.ts`
- `src/utils/importExport.ts`
- `src/state/appReducer.ts`
- `src/types/domain.ts`
- `src/data/demoData.ts`
- `vitest.config.ts`
- Én eller flere `*.test.ts`-filer

## Uklare krav, risikoer og viktige designvalg

### Uklare krav som bør avklares tidlig

- Format for bulk-innlegging av presentasjoner er ikke eksplisitt definert. En naturlig løsning er én linje per presentasjon i formatet `Tittel | URL`.
- Hva som skal ligge i "settings" ved eksport er ikke spesifisert.
- Om historikkens "restore participant" og "restore presentation" skal gjenaktivere eksisterende elementer, gjenopprette slettede elementer, eller begge deler, bør bestemmes tydelig.
- Om appen bør bruke enkel intern navigasjon eller hash-basert navigasjon bør avklares før sidearkitektur låses.

### Tekniske risikoer

- Hjul-animasjon som visuelt må matche en forhåndsvalgt vinner er den mest teknisk følsomme delen.
- `window.open` kan blokkeres av nettleseren dersom åpningen ikke skjer nært nok en brukerhandling.
- `localStorage` kan inneholde korrupt eller gammel datastruktur og må valideres før bruk.
- Tastaturstyring kan dobbeltfyres hvis vi ikke håndterer key-repeat og fokus i skjemaelementer riktig.
- Responsiv design for både storskjerm og mobil kan bli vanskelig hvis admin og event-modus deler for mye CSS uten tydelig struktur.

### Viktige designvalg

- Modellere elementstatus med separate felt for `isActive` og `isUsed`.
- Lagre historikk både med referanse-ID-er og snapshots av visningsdata.
- Bruke Web Crypto via `window.crypto.getRandomValues` med rejection sampling for å unngå modulo-bias.
- Bygge hjulkomponenten selv i SVG/CSS fremfor å introdusere et stort tredjepartsbibliotek.
- Holde hele appen frontend-only med versjonert lokal state og ingen backend.

## Anbefalt første implementasjonsfase

Fase 1 bør implementeres først.

Begrunnelse:

- Den etablerer datamodellen som alle senere skjermer avhenger av.
- Den gjør det mulig å teste logikken tidlig før vi investerer i UI og animasjon.
- Den reduserer risikoen for omarbeid i admin, historikk og event-modus.
- Den gir oss et trygt fundament for `localStorage`, validering og testkjøring.
