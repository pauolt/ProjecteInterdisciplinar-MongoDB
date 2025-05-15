var createError = require('http-errors');
const express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const sqlite3 = require('sqlite3');
const knex = require('knex');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './campeones.sqlite',
  },
  useNullAsDefault: true,
});

app.get('/api/campeon', function(req, res) {
  db.select('c.nombre', 'c.clase', 'c.descripcion', 'recurso', 'c.imagen')
      .from('Campeon as c')
      .then( function(data){
        res.json(data);
      })
})

app.get('/api/clases', function(req, res) {
  db.select('cl.id', 'cl.nombre')
      .from('Clases as cl')
      .then( function(data){
        res.json(data);
      })
})

app.get('/api/habilidades', function(req, res) {
  db.select('h.id', 'h.coste', 'h.tipo', 'h.descripcion', 'h.imagen')
      .from('habilidades as h')
      .then( function(data){
        res.json(data);
      })
})

app.get('/api/campeon_habilidad', function(req, res) {
  db.select('ch.campeon_nombre', 'ch.habilidad_id')
      .from('Campeon_Habilidad as ch')
      .then( function(data){
        res.json(data);
      })
})

app.get('/api/campeon/:nombre', function(req, res) {
  const nombre = req.params.nombre.toLowerCase();
  db.select('c.nombre', 'c.clase', 'c.descripcion', 'recurso', 'c.imagen')
      .from('Campeon as c')
      .whereRaw('LOWER(c.nombre) = ?', [nombre])
      .first()
      .then( function(data){
        if  (data){
          res.json(data);
        } else {
          res.status(404).json({error: 'Campeon no encontrado'});
        }
      })
      .catch(function(err) {
        console.error(err);
        res.status(500).json({error: 'Error en la consulta'});
      });
})

app.get('/api/all', (req, res) => {
  db('Campeon as c')
      .select('c.nombre', 'c.clase', 'c.descripcion', 'h.id as habilidad_id', 'h.coste', 'h.tipo', 'h.descripcion as habilidad_descripcion', 'h.imagen'
      )
      .leftJoin('Campeon_Habilidad as ch', 'c.nombre', 'ch.campeon_nombre')
      .leftJoin('Habilidades as h', 'ch.habilidad_id', 'h.id')
      .then(function(data){
        res.json(data);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ error: 'Error en la consulta' });
      });
});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({ error: err.message });
});

module.exports = app;
