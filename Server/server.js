const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Version 2.x
const app = express();

app.use(cors());

app.get('/calendar-proxy', async (req, res) => {
    try {
        const url = 'https://calendar.google.com/calendar/ical/grochot81%40googlemail.com/public/basic.ics';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fehler: ${response.status}`);
        const data = await response.text();
        res.set('Content-Type', 'text/calendar');
        res.send(data);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Abrufen des ICS");
    }
});


app.listen(3000, () => {
    console.log('ICS-Proxy läuft auf http://localhost:3000/calendar-proxy');
});