# Materiali multimediali da aggiornare

La struttura del sito è stata predisposta seguendo il brief. Non ho sostituito, modificato o rimosso file immagine/video. Quando arrivano i materiali originali, intervenire qui:

## Home

- **Immagine di copertina luminosa:** `data/media.ts` → `media.hero` (usata in `app/page.tsx`, apertura della home).
- **Foto verticale con la modella / slide iniziale:** verificare quale scatto del pacchetto corrisponde alla slide indicata; assegnare il file in `data/media.ts` o in `data/services.ts` secondo la sezione di destinazione. La home non contiene attualmente una slide autonoma con modella.
- **Sezione “Un’altra prospettiva”:** `data/media.ts` → `media.homeDroneBanner`.
- **Immagine della CTA finale:** `data/media.ts` → `media.finalCta`.
- Le quattro foto dei servizi si gestiscono in `data/media.ts` → `media.services` (Fotografia, Video, Drone, Eventi).

## Chi siamo

- Inserire la foto dell’attrezzatura professionale nello spazio già preparato in `app/chi-siamo/page.tsx`, sezione `about-equipment` (`equipment-slot`).
- Il video emozionale non ha ancora uno spazio video attivo in questa pagina: quando sarà consegnato, aggiungerlo nella sezione `about-equipment`, accanto al testo della storia.

## Matrimoni

- **Video di copertina:** `app/matrimoni/page.tsx`, sorgente del `<video>` nella sezione `wedding-hero` (attualmente URL esterno).
- **Griglia fotografica uniforme:** sostituire le cinque sorgenti `chapters` in `app/matrimoni/page.tsx` con il set coordinato; la griglia ora usa un formato uniforme 4:5.
- **Slide drone:** verificare il file attualmente assegnato a `mat6.webp` in `app/matrimoni/page.tsx`. Il brief segnala che la foto mostrata non è aerea: spostare quella foto nella parte alta della sezione e usare sotto gli scatti drone originali.
- Usare foto di supporto della giornata nella seconda slide/sezione dopo aver ricevuto il set.

## Eventi

- In `app/eventi/page.tsx` sono predisposti riquadri foto per Matrimoni, Diciottesimi, Compleanni, Eventi privati e Conferenze. Sostituire ciascun riquadro `.event-photo-slot` con lo scatto dinamico della relativa categoria.

## Portfolio

- L’album **50° Anniversario** è predisposto ma senza immagini: aggiungere cover e tutte le foto in `data/projects.ts` (progetto `50-anniversario`).
- Rimuovere il vecchio album “60 Fabio” dalla lista: già fatto.
- Selezionare la quantità più ampia possibile di scatti del 50° anniversario, mantenendo ordine e qualità coerenti lungo tutta la galleria.

## Form contatti

- Nessun materiale multimediale richiesto. Il modulo è ancora una preview e non trasmette i dati: prima di usarlo per acquisire richieste va collegato al servizio di invio/gestione contatti.
