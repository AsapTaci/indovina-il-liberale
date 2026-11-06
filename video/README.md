# Roma → Bruxelles — grafica animata (Remotion)

Mappa d'Europa con un aereo che decolla da Roma e atterra a Bruxelles.
1920×1080, 30 fps, 14 secondi, H.264.

## Comandi

```bash
npm install
npm run dev      # anteprima interattiva (Remotion Studio)
npm run render   # produce out/roma-bruxelles.mp4
```

Se Remotion non riesce a scaricare il proprio browser, indicare un Chrome già installato:

```bash
REMOTION_BROWSER=/percorso/di/chrome npm run render
```

## Struttura

- `src/Root.tsx` — registrazione della composizione `RomaBruxelles` e valori di default (città, etichette, durata del volo).
- `src/FlightMap/geo.ts` — proiezione conica conforme centrata sull'Europa, confini da Natural Earth (`world-atlas`), camera e rotta ad arco.
- `src/FlightMap/index.tsx` — timeline: dissolvenza, marker di partenza, rotta punteggiata, decollo, volo con camera che segue, atterraggio, pannello finale, dissolvenza in chiusura.
- `src/FlightMap/Plane.tsx` — aereo con ombra proiettata al suolo che si allontana in quota.
- `src/FlightMap/Marker.tsx` — pin città con anelli pulsanti e cartellino.
- `src/FlightMap/InfoPanel.tsx` — pannello conclusivo con distanza e tempo di volo.

Per un'altra tratta basta cambiare `origin` e `destination` nei `defaultProps`:
la distanza viene ricalcolata, la camera e l'arco si adattano da soli.
