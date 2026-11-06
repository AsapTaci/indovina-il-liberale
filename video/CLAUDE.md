# Regole per le grafiche animate

Questo progetto serve a produrre grafiche animate che finiscono dentro un
montaggio video. Chi le chiede non sa programmare: non fargli domande
tecniche, decidi tu e procedi.

## Tecniche
- Default 1920x1080, 30 fps, salvo diversa richiesta.
- Ogni composizione va SEMPRE registrata in Root.tsx, altrimenti non si vede.
- Sfondo della composizione TRASPARENTE, salvo quando la grafica è
  un'inquadratura piena (una mappa, uno sfondo).
- Export di default ProRes 4444 con canale alpha. Mai mp4 per le grafiche
  con trasparenza: l'mp4 non la gestisce e viene fuori un rettangolo nero.
- Le mappe si fanno con MapLibre (nessuna chiave API), versione 5, mai la 6,
  e si renderizzano con il flag --gl=angle.

## Di mestiere: le cose che distinguono una grafica buona da una amatoriale
- MAI movimento lineare. Tutto deve frenare entrando, tipo molla.
- Gli elementi multipli entrano sfalsati e in modo irregolare, non tutti con
  lo stesso ritardo matematico.
- Se la grafica va SOPRA un video, il testo chiaro da solo sparisce sulle
  inquadrature chiare: mettici dietro un pannello scuro semitrasparente.
- Testo grande e poco. Meglio meno parole più leggibili.
- Alla fine dell'animazione, dissolvenza breve. Non finire di colpo.

## Comportamento
- Non fare domande: decidi tu quello che manca e vai fino in fondo.
- Se qualcosa non funziona, sistematelo da solo e riprova.
- Alla fine apri sempre l'anteprima e di' in una riga cos'è venuto fuori.

## Note di questo progetto
- Le mappe qui sono vettoriali (d3-geo + world-atlas): nessun server di tile,
  nessuna chiave, render deterministico. MapLibre non è usato.
- Per renderizzare in un ambiente senza accesso a remotion.media, impostare
  `REMOTION_BROWSER` al percorso di un Chrome/Chromium già installato.
- La composizione `RomaBruxelles` è parametrica: origine, destinazione,
  etichette e statistiche si cambiano in `defaultProps` dentro `src/Root.tsx`
  o direttamente dallo Studio.
