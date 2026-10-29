# Flight Workspace

Area staff: `/intranet` · Login: `/intranet/login`.

L’interfaccia interna usa il tema chiaro: sfondo chiaro, schede e navigazione bianche, testi scuri e accenti arancioni Flight. Il tema include moduli, finestre di dettaglio, preventivi e accesso staff; le anteprime delle landing mantengono il proprio design.

## Collegamento configurato il 26 ottobre 2026

Il progetto Supabase **Database** (`avltlzhtdzbodidxtbtz`) nell’organizzazione **FLIGHT PR DB** è stato riattivato e collegato a questo workspace. La migrazione intranet è applicata e registrata nello storico remoto; le tabelle dell’intranet hanno RLS attiva. L’amministratore iniziale è **info@flightpr.it**: la password viene impostata personalmente nella pagina di attivazione.

Le credenziali runtime sono in `.env.local`, escluso da Git e leggibile solo dall’utente locale. Le registrazioni pubbliche sono disabilitate e la password minima è di 12 caratteri. Il Site URL Auth è `https://dash.flightpr.it`; i redirect consentiti includono `https://dash.flightpr.it/activate`, `http://localhost:3000/intranet/activate` e il precedente `https://flightpr.net/intranet/activate` per compatibilità. Le variabili di produzione sono configurate nei segreti del progetto Vercel, con `APP_URL=https://dash.flightpr.it`.

I controlli sul database reale hanno verificato CRM, cronologia, blocco degli account non staff, protezione dell’ultimo amministratore e blocco anonimo su tutte le tabelle. Cloudflare R2 è configurato e verificato con un trasferimento reale temporaneo. Il servizio SMTP di produzione richiede ancora le proprie credenziali; non sono stati inviati messaggi email.

Il portale usa Supabase per autenticazione e Postgres e un bucket **privato** Cloudflare R2 per i file. Non esistono utenti demo, password predefinite o dati salvati nel browser. Senza configurazione, l’accesso resta chiuso e il login mostra un avviso. Il sito pubblico continua a funzionare.

## 1. Supabase e primo amministratore

1. Copiare `.env.example` in `.env.local` e configurare URL, publishable key e `SUPABASE_SERVICE_ROLE_KEY`. La service role è solo server e non deve mai essere esposta nel browser.
2. Eseguire tutte le migrazioni in `supabase/migrations/` in ordine cronologico nel SQL Editor del progetto (oppure `supabase db push` su un progetto già collegato).
3. In Authentication → Users creare l’utente iniziale con email e password forte. Confermare l’email con il flusso Supabase o con l’opzione di conferma del pannello. Disabilitare le registrazioni pubbliche in Auth: solo l’amministratore invita nuovi membri. Attivare la protezione delle password compromesse se disponibile e configurare il rate limit di Auth.
4. Aggiungere il primo amministratore con questa query, sostituendo email e nome. Deve restituire una riga; se non la restituisce, l’utente Auth non esiste ancora:

```sql
insert into public.staff_profiles (id, email, name, role)
select id, email, 'Nome Amministratore', 'admin'
from auth.users where lower(email) = lower('admin@tuo-dominio.it')
returning id, email, role;
```

5. In Auth → URL Configuration impostare Site URL su `https://dash.flightpr.it` e consentire **esattamente** `https://dash.flightpr.it/activate` tra i redirect URL. Aggiungere `http://localhost:3000/intranet/activate` solo per lo sviluppo. Impostare `APP_URL` sul dominio canonico, senza slash finale.
6. Configurare un SMTP di produzione per inviti e recupero password. L’app supporta sia il codice PKCE del recupero password sia i token degli inviti Supabase. Non rimuovere i parametri dai template email standard senza aggiornare il flusso.
7. Riavviare Next.js e accedere a `/intranet/login`. Da **Team e impostazioni** l’amministratore può invitare, sospendere, riattivare e assegnare ruoli. L’invito invia una mail; un errore SMTP viene mostrato nel portale. Il ruolo viene assegnato esclusivamente dal server, mai dai metadata forniti dall’utente.

Le policy RLS richiedono un profilo attivo per leggere e modificare i dati. Gli account Auth senza profilo non possono entrare. La sospensione è controllata a ogni richiesta, anche con una sessione ancora valida. Solo le API amministrative possono scrivere i profili. Il proprio account amministratore non si può declassare o sospendere; un trigger protegge anche l’ultimo amministratore attivo. La rimozione definitiva degli account non è prevista, per conservare i riferimenti storici.

## 2. Cloudflare R2

### Configurazione attuale — 26 ottobre 2026

- Account Cloudflare: `47201ab074ac64136245105534c27f98`, aperto dal profilo Chrome **Flight P.R.** (`flight.personal.recording@gmail.com`).
- Bucket: **flight-transfers**, storage **Standard**, localizzazione **Eastern Europe (EEUR)**, giurisdizione predefinita.
- Bucket privato: dominio pubblico e URL di sviluppo R2.dev disabilitati.
- Endpoint S3: `https://47201ab074ac64136245105534c27f98.r2.cloudflarestorage.com`.
- Credenziale di servizio **flight-workspace**: **Object Read & Write**, limitata esclusivamente a `flight-transfers`.
- CORS: origini `http://localhost:3000`, `https://flightpr.net` e `https://dash.flightpr.it`; metodo `PUT`; header consentiti `*`; `ETag` esposto; cache preflight 3600 secondi.
- Regola lifecycle **flight-transfer-expiry**, prefisso `transfers/`: eliminazione degli oggetti dopo **31 giorni** e annullamento degli upload incompleti dopo **1 giorno**.

Account ID, bucket, Access Key ID, Secret Access Key e `CRON_SECRET` sono già salvati in `.env.local`, escluso da Git e con permessi locali `0600`. Per l’hosting di produzione occorre trasferire questi valori nei segreti del runtime. La pulizia oraria è attiva tramite Supabase Cron; anche la lifecycle R2 è attiva sul bucket.

Verifica reale superata: file sintetico di **64 MiB + 1 KiB**, upload multipart in due parti, preflight CORS ed ETag, pagina pubblica, download con confronto SHA-256, revoca del link, cancellazione fisica dell’oggetto e autenticazione del job di pulizia. Oggetto e metadata di prova rimossi. La verifica crea una sessione temporanea per l’amministratore esistente e chiude soltanto quella sessione, senza inviare email o modificare password.

Per ripetere la verifica dal workspace con un amministratore esistente:

```bash
node scripts/verify-r2.mjs --admin-email info@flightpr.it --allow-live
```

### Procedura per un nuovo ambiente


1. Creare un bucket privato, senza R2.dev pubblico e senza dominio pubblico. Usare un bucket dedicato ai trasferimenti.
2. Creare credenziali S3 R2 con permesso **Object Read & Write**, limitate al bucket. Configurare `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
3. Impostare il seguente CORS nel bucket, sostituendo l’origine. Durante lo sviluppo aggiungere `http://localhost:3000` alle origini consentite; rimuoverla in produzione.

```json
[
  {
    "AllowedOrigins": ["https://tuo-dominio"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Impostare una lifecycle rule sul prefisso `transfers/`: eliminazione degli oggetti dopo **31 giorni** e annullamento degli upload multipart incompleti dopo **1 giorno**. È una protezione aggiuntiva; la scadenza scelta dal cliente viene applicata dall’app e dalla pulizia pianificata. Gli upload non completati entro 24 ore sono considerati abbandonati.

Gli upload viaggiano direttamente dal browser a R2, a blocchi da 64 MiB, con massimo 3 tentativi per blocco. Non attraversano Next.js, evitando i limiti di body delle piattaforme. Massimo 100 GiB per file, 50 file e 500 GiB totali per trasferimento (indicati come GB nell’interfaccia). Il browser mantiene in memoria un blocco alla volta. Tenere aperta la pagina; il ripristino dopo chiusura del browser non è incluso. Sono supportati caricamento, avanzamento, annullamento, scadenza 1–30 giorni, associazione al cliente, messaggio e revoca.

Il link è disponibile solo dopo il completamento di tutti i file e la verifica delle dimensioni su R2. I token sono casuali a 256 bit: il database conserva l’hash SHA-256 per l’accesso pubblico e una copia cifrata AES-256-GCM per recuperare il link dal portale staff. La chiave è derivata via HKDF dalla service role server con contesto dedicato; ogni cifrato è legato all’ID del trasferimento. Non vengono conservati token in chiaro. In caso di rotazione della service role occorre generare nuovi link dal portale per ripristinare la copia; i vecchi link restano validi fino alla loro sostituzione o scadenza.

Nella scheda intranet sono presenti due pulsanti distinti: **Copia link** recupera e copia il link esistente, anche dopo un ricaricamento e senza invalidarlo; **Genera nuovo link** chiede conferma, sostituisce il token e invalida l’indirizzo precedente. Il nuovo indirizzo viene mostrato nella scheda e può poi essere copiato. I trasferimenti creati prima di questo aggiornamento hanno solo l’hash: la prima volta occorre usare esplicitamente **Genera nuovo link**; **Copia link** avvisa senza alterare il link precedente. Dopo la revoca compare **Elimina**: previa conferma rimuove subito la scheda dal portale. Se la pulizia R2 non è terminata, i soli dati necessari vengono conservati temporaneamente per consentire al job di ritentare; la cancellazione definitiva dei metadata avviene dopo la pulizia e la finestra di sicurezza degli upload già firmati. La pagina pubblica di download contiene soltanto i comandi per scaricare i file, senza il pulsante di copia.

Chi possiede il link può scaricare i singoli file senza login; non è previsto uno ZIP lato server per file di grandi dimensioni. L’indirizzo email del destinatario è un riferimento: l’invio avviene dal programma di posta dello staff tramite **Apri email**, oppure copiando il link.

I download usano URL R2 firmati per un massimo di 60 secondi, limitati anche alla scadenza residua. Dopo la revoca non vengono emessi nuovi URL; quelli già emessi possono restare utilizzabili fino a 60 secondi, salvo cancellazione dell’oggetto. Un download già iniziato può proseguire. I nomi dei file vengono usati solo nel Content-Disposition, mai come percorsi di storage. I file sono serviti come allegati `application/octet-stream`.

## 3. Pulizia automatica

In produzione è attivo il job Supabase Cron **flight-transfer-cleanup**, ogni ora al minuto 7 (`7 * * * *`). La migrazione `20261027001000_transfer_cleanup_schedule.sql` configura `pg_cron` e `pg_net`; il token è conservato cifrato in Supabase Vault con nome `flight_transfer_cron_secret` e deve corrispondere al `CRON_SECRET` Vercel. Una chiamata eseguita dal database ha verificato l’endpoint con risposta HTTP 200. In un nuovo ambiente provisionare il segreto in Vault separatamente: la migrazione non contiene credenziali e senza il segreto non invia richieste. In caso di rotazione aggiornare sia Vault sia Vercel e ridistribuire l’app.

L’endpoint autenticato è:

```text
GET https://dash.flightpr.it/api/cron/transfers
Authorization: Bearer <CRON_SECRET>
```

Il job elimina i file scaduti, revocati e i caricamenti abbandonati da oltre 24 ore; conserva i metadata per la cronologia, salvo i trasferimenti eliminati esplicitamente dal portale, e ritenta eventuali errori. I trasferimenti eliminati in attesa di pulizia non compaiono nell’intranet; il job li rimuove definitivamente dopo la pulizia e almeno un’ora dalla chiusura. Processa 100 trasferimenti per chiamata in ordine di scadenza; su volumi maggiori eseguire più chiamate o aumentare la frequenza. Non configurare il job con il secret nell’URL. R2 deve mantenere anche la lifecycle rule descritta sopra. La cancellazione fisica può avvenire alla successiva esecuzione del job; l’accesso dal portale termina immediatamente alla scadenza.

## 4. CRM e landing

- **Clienti & lead**: cliccando un contatto da elenco, pipeline o dashboard si apre la scheda con tutti i dati, note e cronologia. Il riquadro **Stato & pipeline** permette di cambiare stato e follow-up senza modificare l’anagrafica; gli aggiornamenti vengono registrati con autore e data. **Modifica dati cliente** apre il modulo di modifica separato. Tutti i membri attivi collaborano sullo stesso CRM.
- **Team e impostazioni → Impostazioni preventivi** (`/intranet/quote-settings`): dati aziendali, sede, partita IVA e codice fiscale, email, telefono, sito, logo PNG/JPG fino a 2 MB, prefisso numero, validità, oggetto, voce/quantità/prezzo iniziali, IVA, sconto, pagamenti e note predefinite. I dati sono condivisi: tutto lo staff attivo può consultarli e usarli, solo gli amministratori possono salvarli. Il logo viene verificato dal server, ridimensionato e conservato come PNG nel database; non vengono scaricate immagini da URL esterni. Le impostazioni precompilano ogni nuovo preventivo e il PDF usa nome e logo aziendali nell’intestazione e i recapiti nel piè di pagina. I PDF già scaricati non vengono modificati.
- **Preventivi PDF**: **Crea preventivo PDF** è disponibile nel CRM e nella scheda cliente. Precompila i recapiti dal CRM, aggiungi voci, quantità e prezzi, scegli sconto e IVA, completa emittente, dati fiscali e condizioni. Il PDF Flight P.R. viene scaricato direttamente, con impaginazione su più pagine e totali arrotondati ai centesimi; il documento e la bozza non sono archiviati nel database. Il numero è modificabile: verificarne l’unicità secondo la propria numerazione. La generazione è riservata allo staff attivo.
- **Landing pages**: due template selezionabili, **Location** e **Attività**. Hero a tutta larghezza, titolo e sottotitolo centrati, quattro font (Manrope, Cormorant Garamond, Montserrat e Georgia), presentazione con testo a sinistra e immagine a destra, servizi, gallery orizzontale fino a 10 nuove foto con didascalie e riordino, footer con recapiti e banner Flight P.R. Le location utilizzano navbar e menu mobile standard Flight con collegamenti al sito principale. Le attività includono navigazione propria, sezione di approfondimento, FAQ e invito al contatto; il banner fisso riporta «Questa pagina web è una DEMO offerta da Flight P.R.» e la pagina demo è noindex. Tutti i contenuti sono modificabili nell’editor, con anteprima desktop/mobile. Le gallery precedenti fino a 20 immagini sono conservate.
- **Upload immagini**: hero, presentazione, approfondimento e gallery si caricano dall’editor. JPEG, PNG, WebP e AVIF fino a 25 MB vengono ridimensionati nel browser, quindi verificati, riorientati e ricompressi dal server in WebP (massimo 2560 pixel per lato). Il server elimina i metadata, rifiuta immagini animate o non decodificabili e limita i pixel decodificati. Il body verso Vercel resta sotto 4 MB. I nuovi oggetti sono salvati nel bucket dedicato del sito, senza modificare gli originali dei transfer o le immagini già esistenti.
- **Pubblicazione**: **Salva bozza** conserva una pagina privata; **Pubblica pagina** la rende accessibile su `https://app.flightpr.it/slug` (in locale `/lp/slug`). Le modifiche pubblicate sono visibili dopo **Pubblica modifiche**; **Ritira in bozza** le rimuove dal pubblico. Cambiare slug cambia l’indirizzo, senza redirect automatico. I template precedenti restano visualizzabili. React gestisce l’escaping; nessun HTML arbitrario. Le CTA accettano ancore, percorsi interni, HTTPS, email e telefono.


`/intranet`, `/api/` e `/t/` sono esclusi dai crawler; area staff e download hanno anche `noindex`. Queste impostazioni non sostituiscono i controlli di autorizzazione.

### Aggiornamento schede e pagine — 26 ottobre 2026

La migrazione `20261026230000_landing_content.sql`, già applicata, aggiunge font, sottotitolo, immagini di sezione, contenuti homepage e FAQ. La migrazione `supabase/migrations/20261026160000_landing_showcases.sql` aggiunge i template Location e Attività e i relativi campi, mantenendo le pagine esistenti. È già applicata al progetto collegato. In nuovi ambienti applicare tutte le migrazioni in ordine. La migrazione `20261026220000_quote_settings.sql` crea le impostazioni condivise dei preventivi, con lettura staff protetta da RLS e scrittura solo server dopo controllo del ruolo amministratore. La migrazione `20261026180000_transfer_deletion.sql` aggiunge la cancellazione dal portale con pulizia differita. La migrazione `20261026170000_transfer_link_copy.sql` aggiunge il salvataggio cifrato necessario per copiare un link esistente senza rigenerarlo. La pagina pubblica Flight Transfer usa la fotografia drone originale, il branding Flight e una scheda chiara per i download; scadenza, token e autorizzazioni restano gestiti dal servizio R2.

## 5. Hosting Vercel e domini

L’app Next.js viene distribuita come unico progetto Vercel; `proxy.ts` separa le superfici in base all’host. Collegare i domini al medesimo progetto e usare su Cloudflare i record DNS indicati da Vercel per quel progetto:

| Dominio | Destinazione |
| --- | --- |
| `flightpr.it` | Sito principale canonico |
| `flightpr.net`, `www.flightpr.net`, `www.flightpr.it` | Redirect permanente al principale, preservando percorso e query |
| `dash.flightpr.it` | Intranet con percorsi `/login`, `/crm`, `/transfers`, `/landings`, `/team` |
| `app.flightpr.it/slug` | Landing pubblicate |
| `transfer.flightpr.it/token` | Pagine di download |
| `drive.flightpr.it` | Bucket pubblico delle sole immagini del sito |

**Il bucket `flight-transfers` resta privato**: non configurare `transfer.drive.flightpr.it`, domini pubblici o R2.dev. I download continuano a usare URL S3 firmati e temporanei. `drive.flightpr.it` appartiene a R2 e non va aggiunto al progetto Vercel.

Il bucket **flight-site-assets** è stato creato e il custom domain **drive.flightpr.it** è attivo. La credenziale dedicata **flight-site-media**, approvata dal proprietario, ha `Object Read & Write` limitato al solo bucket del sito ed è salvata in `.env.local` con permessi `0600`. Verifica reale completata: conversione WebP, scrittura S3, lettura HTTPS con confronto dei byte e rimozione del file temporaneo. Sono configurate nell’ambiente **Production** di Vercel le variabili di `.env.example`, con `APP_URL=https://dash.flightpr.it`, `R2_SITE_BUCKET=flight-site-assets`, `SITE_ASSETS_URL=https://drive.flightpr.it` e le due nuove chiavi server `R2_SITE_ACCESS_KEY_ID` / `R2_SITE_SECRET_ACCESS_KEY`. Non riutilizzare la chiave dei transfer e non rendere pubblici i segreti tramite `NEXT_PUBLIC_`.

### Pubblicazione su Vercel — 27 ottobre 2026

- Progetto **flightpr-web**, team **FLIGHT PR** (`flight-pr`), collegato al repository `flight-pr/flight-pr`, branch `main`.
- Prima pubblicazione completa: deployment **dpl_CuKaQpEE8nvG9URJ5AHdaomYfipA**, stato **READY**, promosso sui domini di produzione. [Dettaglio deployment](https://vercel.com/flight-pr/flightpr-web/CuKaQpEE8nvG9URJ5AHdaomYfipA).
- Pubblicazione eseguita dalla copia locale con CLI, includendo le modifiche del workspace; il repository remoto non è stato modificato. La configurazione CLI dedicata è in `~/.config/flightpr-vercel`, per conservare l’account usato dagli altri progetti. `.vercelignore` esclude `.env*`, cache e dipendenze dal pacchetto di pubblicazione.
- `flightpr.it`, `www.flightpr.it`, `dash.flightpr.it`, `app.flightpr.it` e `transfer.flightpr.it`: CNAME Cloudflare **DNS only** verso il target specifico del progetto `b1c0f3a41f17bff9.vercel-dns-017.com`, TTL 300 secondi. `drive.flightpr.it` resta collegato al bucket R2 pubblico delle immagini.
- `flightpr.net`: aggiornati i due record A dai precedenti `192.0.78.207` / `192.0.78.167` agli indirizzi Vercel consigliati `216.198.79.1` / `64.29.17.1`; `www.flightpr.net` usa il CNAME Vercel. I record TXT esistenti sono conservati. Entrambi gli alias e `www.flightpr.it` reindirizzano con HTTP 308 a `flightpr.it`, mantenendo percorso e query.
- TLS verificato sui sette domini applicativi; login `dash.flightpr.it/login` e landing già pubblicata verificati sul dominio definitivo. Le radici `app.flightpr.it/` e `transfer.flightpr.it/` restituiscono 404: si accede alle singole pagine con slug o token.
- Supabase Auth aggiornato al dominio staff e CORS R2 aggiornato per `dash.flightpr.it`. La pulizia oraria usa Supabase Cron con segreto Vault; nessun dominio pubblico è stato associato al bucket dei transfer.
- Verifica reale di produzione riuscita: accesso staff, upload PNG via API Vercel e lettura WebP da `drive.flightpr.it`, transfer sintetico di **64 MiB + 1 KiB** in due parti, CORS, pagina su `transfer.flightpr.it`, download con confronto SHA-256, revoca, cancellazione oggetto e pulizia autenticata. Rimossi file, metadata e sessione temporanei del test; nessuna email inviata e nessuna password modificata.

Per ridistribuire dal workspace dopo le verifiche:

```bash
npx vercel deploy --prod --scope flight-pr --global-config ~/.config/flightpr-vercel
```

Per ripetere il controllo reale in produzione:

```bash
APP_URL=https://dash.flightpr.it node scripts/verify-r2.mjs --admin-email info@flightpr.it --allow-live
```

Il servizio SMTP e la consegna effettiva delle email di invito/recupero richiedono ancora la configurazione di produzione. In locale restano disponibili i percorsi `/intranet`, `/lp/slug` e `/t/token`; le mutazioni richiedono `APP_URL` coerente con l’origine dell’ambiente. Le variabili configurate qui sono limitate a Production; le preview richiedono una propria configurazione.

### Manutenzione temporanea del sito pubblico

La manutenzione è pubblicata nel deployment **dpl_2orMJK7qXdrQTXCPsDY5s5bYq3fb** ([Vercel](https://vercel.com/flight-pr/flightpr-web/2orMJK7qXdrQTXCPsDY5s5bYq3fb)).

`SITE_MAINTENANCE=true` è configurato soltanto in Vercel **Production**. Il proxy mostra una pagina Flight P.R. di manutenzione sulle pagine del sito principale e sugli indirizzi pubblici Vercel dello stesso deployment. Gli alias `.net` e `www` mantengono il redirect al dominio principale. La risposta è HTTP 503 con `Retry-After: 3600` e `Cache-Control: private, no-store`.

Localhost, intranet, landing, transfer, API, job, file e immagini restano disponibili. Per ripristinare il sito impostare `SITE_MAINTENANCE=false` in Production e ridistribuire l’app; nessuna pagina originale è stata rimossa.

## Verifica

Verifica delle nuove landing completata: build di produzione, 21 test unitari, 16 test di integrazione e 3 test HTML; editor e pagine Location/Attività provati su desktop e mobile, inclusi upload multipli, gallery, font, menu e banner fisso. Verificate anche le riscritture dei domini sul server di produzione locale con una landing pubblicata nel database collegato.

```bash
npm run test:intranet
npm run test:intranet:integration
npm test
npx tsc --noEmit
```

Prima dell’uso reale, con credenziali configurate: provare un invito e un recupero password, un accesso staff sospeso, il ciclo CRM, un upload multi-blocco maggiore di 64 MiB, il download da finestra anonima, la revoca e il job di scadenza. Verificare una landing in bozza (non pubblica), la pubblicazione, l’aggiornamento e il ritiro. Il trasferimento R2 reale descritto sopra è stato eseguito usando le credenziali del bucket configurato. Gli inviti e il recupero password via email restano da verificare dopo la configurazione SMTP.

Riferimenti: [Supabase SSR e sessioni](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [upload multipart R2](https://developers.cloudflare.com/r2/objects/upload-objects/), [lifecycle R2](https://developers.cloudflare.com/r2/buckets/object-lifecycles/), [Supabase Cron e Vault](https://supabase.com/docs/guides/functions/schedule-functions).
