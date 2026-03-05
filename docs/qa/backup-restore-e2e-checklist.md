# Backup Restore E2E Checklist

Data: 2026-03-05

## Obiettivo
Validare il flusso restore in 3 modalità:
- `Merge`
- `Solo nuovi`
- `Aggiorna solo conflitti`

## Fixture
Usa il file:
- `docs/qa/fixtures/restore-e2e-sample.json`

## Pre-condizioni
1. Apri **Impostazioni > Backup Dati**.
2. Assicurati di avere almeno un record esistente con id:
   - `tx-existing-1` in `transactions`
   - `acc-existing-1` in `accounts`
   Se non esistono, importa prima in modalità `Merge` (primo giro) e poi ripeti i test.

## Test 1: Merge
1. Seleziona profilo `Solo finanza`.
2. Modalità `Merge (aggiorna esistenti)`.
3. Carica `restore-e2e-sample.json`.
4. Clicca `Analizza conflitti`.
5. Atteso:
   - `Nuovi` > 0
   - `Aggiornamenti` > 0
   - `Conflitti` > 0
6. Clicca `Ripristina ora` e conferma.
7. Atteso:
   - messaggio successo
   - dati nuovi presenti
   - record esistenti aggiornati

## Test 2: Solo Nuovi
1. Ricarica stesso file.
2. Modalità `Solo nuovi (non sovrascrive)`.
3. `Analizza conflitti`.
4. Atteso:
   - `Aggiornamenti` = 0
   - `Saltati` include record già esistenti
5. `Ripristina ora`.
6. Atteso:
   - solo nuovi record inseriti
   - nessun overwrite dei record esistenti

## Test 3: Aggiorna Solo Conflitti
1. Ricarica stesso file.
2. Modalità `Aggiorna solo conflitti`.
3. `Analizza conflitti`.
4. Atteso:
   - `Nuovi` = 0
   - `Aggiornamenti` >= 1 solo su record diversi
   - `Conflitti` >= 1
5. `Ripristina ora`.
6. Atteso:
   - aggiornati solo record in conflitto
   - record identici non toccati
   - record mancanti non creati

## Verifica finale
1. Apri Transazioni/Conti.
2. Controlla che i record fixture siano coerenti con la modalità usata.
3. Esporta backup e verifica che i dati risultanti siano consistenti.
