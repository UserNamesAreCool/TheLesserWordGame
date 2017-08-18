'use strict';
const fs = require('fs');
const express = require('express');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const morgan = require('morgan');

const app = express();
const randWordFile = '/usr/share/dict/words';
const port = 3000
const MIN_CHARS=6;
const MAX_CHARACTERS=8;
const MAX_GUESSES = 8;
const words = fs
    .readFileSync(randWordFile, "utf-8")
    .toLowerCase()
    .split("\n")
    .filter(i => (i.length >=MIN_CHARS) && (i.length<=MAX_CHARACTERS));

app.engine('handlebars', handlebars({defaultLayout: 'main'}));
app.set('trust proxy', 0);
app.set('view engine', 'handlebars');
app.use(morgan('combined')); // Logger
app.use(bodyParser.urlencoded({extended: true})); // Parser
app.use(session({
    secret: '🐈',
    resave: false,
    saveUninitialized: true
})); // Session handler 

app.use((req, res, next)=>{
    if (req.session.word !== undefined) return next();
    req.session.word = words[Math.random() * words.length >>0];
    req.session.guesses = MAX_GUESSES;
    req.session.chars = '';
    req.session.blanks = Array(req.session.word.length).fill('_');
    next();
}); // More session handeling

// Checks session
// :: Object => Num
// ARG session: instanced express-session object
// Return Status code
// Code 0: Lose
// Code 1: Win
// Code 3: Now playing
function handleState(session) {
    if (session.guesses === 0) return 0;
    if (session.word === session.blanks.join('')) return 1;
    return 3;
}

// Handle Keys
// :: (Object, String) => Object
// ARG session: instanced express-session object
// ARG keys: text put into the guess field
// RETURN: a modified session
function handleKeys(session, keys) {
    let guess = keys.trim().split('').filter((e,i,self) => self.indexOf(e) === i);
    for (var i = 0; (i < guess.length) && (handleState(session) === 3); i++) {
        let letter = guess[i];
        if (session.chars.includes(letter)) continue;
        if (!session.word.includes(letter)) session.guesses--;
        session.chars += letter;
        session.word.split('').forEach((c, i) =>{
            if (c==letter) session.blanks[i] = c;
        });
    }
    return session
}

// Select a template based on game status and renders it
// :: (Object, Object)
// ARG session: instanced express-session object
// ARG res: express response object
// RETURN: A template name based on game status (win, lose, game)
function selectTemplate(session, res) {
    let obj = {
        blanks: req.session.blanks.join(' '),
        word: req.session.word,
        remaining: req.session.guesses,
        chars: req.session.chars.split('')
    };
    let temp;
    switch (handleState(session)) {
        case 1: {
            temp = 'win';
            break;
        }
        case 2:{
            temp='lose';
            break;
        }
        case 3: {
            temp='game';
            break;
        }
    }
    res.render(temp, obj);
}

// Handles get requests to /
app.get('/', (req, res) => selectTemplate(req.session, res))
// Handles Post requests to / for keystokes
app.post('/', (req, res) => {
    // Handle input
    res.session = handleKeys(req.session, req.body.guess);
    // Render Template
    selectTemplate(req.session, res);
})
// Creates a new game
app.post('/new', (req, res) => {req.session.destroy(); res.redirect('/')})

// Initialize server
app.listen(port, () => console.log(`http://localhost:${port}`));