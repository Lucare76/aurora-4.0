# Riepilogo Progetto Aurora 4.0

Data: 10 marzo 2026

## 1. Stato deploy
- Build locale: OK
- Test: OK
- Applicazione stabile in esecuzione
- Ottimizzazione impostazioni completata
- Descrizioni transazioni uniformate in Title Case
- Configurazione build corretta per deploy a root con `homepage: "/"`

### Pubblicazione
- GitHub: da confermare con ultimo push del branch corrente
- Firebase Hosting: da confermare con ultimo deploy online

### Verifica consigliata post deploy
- apertura dashboard
- apertura impostazioni
- apertura/chiusura sezioni settings
- creazione/modifica transazione
- OCR scontrino
- salvataggio transazione
- console browser pulita

## 2. Cosa manca
- Confermare che l'ultima build sia stata pubblicata online
- Eseguire smoke test finale in produzione
- Verificare assenza di errori console reali in ambiente live
- Facoltativo: rifinire warning legacy non bloccanti rimasti fuori dal perimetro prioritario

### Chiusura progetto
Il progetto può essere considerato praticamente chiuso quando sono veri tutti questi punti:
- test passano
- build passa
- deploy GitHub completato
- deploy Firebase completato
- smoke test online OK
- nessun errore critico in console

## 3. Invio mail al festeggiato
### Situazione attuale
- Il modulo compleanni salva già l'email del festeggiato
- Il sistema email esistente oggi invia il reminder all'utente dell'app
- L'infrastruttura backend permette già invio verso un destinatario arbitrario

### Cosa conviene fare
- Aggiungere un template dedicato di auguri al festeggiato
- Non riutilizzare il reminder attuale, perché ha un contenuto pensato per il proprietario dell'app
- Usare la stessa pipeline email già esistente

### Costi
- Non serve un template premium del provider
- Il contenuto può essere generato direttamente nella Firebase Function
- Quindi non c'è bisogno di introdurre un sistema a pagamento solo per questa funzione

### Implementazione consigliata
- pulsante `Invia auguri` nella sezione compleanni
- abilitato solo se il festeggiato ha un'email valorizzata
- nuovo messaggio email di tipo `birthdayGreeting`
- invio verso `birthday.email`
