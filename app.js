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
        filename: './campeones.sqlite'
    },
    useNullAsDefault: true,
    pool: {
        afterCreate: (conn, done) => {
            conn.run('PRAGMA foreign_keys = ON', done);
        }
    }
});

//Mostrar data
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

app.get('/api/habilidades/:id', function(req, res) {
    const id = req.params.id;

    db('habilidades')
        .where('id', id)
        .first()
        .then(function(habilidad) {
            if (!habilidad) {
                res.status(404).json({ error: 'Habilidad no encontrada' });
            } else {
                res.json(habilidad);
            }
        })
        .catch(function(error) {
            console.error('ERROR al obtener habilidad:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        });
});

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

//Modificar data
app.put('/api/campeon/:nombre', function(req, res) {
    const nombre = req.params.nombre;
    const campeonData = req.body;

    db('Campeon')
        .update(campeonData)
        .where('nombre', nombre)
        .then(function(data) {
            if(data === 0){
                res.status(404).json({error: 'Campeón no encontrado'});
            } else {
                res.json({ message: "Campeón actualizado", rowsAffected: data});
            }
        })
        .catch(function(error){
            console.log('ERROR al actualizar campeón:', error);
            res.status(500).json({error: 'Error interno del servidor'});
        });
});

app.put('/api/habilidades/:id', function(req, res) {
    const id = req.params.id;
    const habilidadData = req.body;

    db('habilidades')
        .where('id', id)
        .update(habilidadData)
        .then(function(data) {
            if (data === 0) {
                res.status(404).json({ error: 'Habilidad no encontrada' });
            } else {
                res.json({ message: 'Habilidad actualizada correctamente', rowsAffected: data });
            }
        })
        .catch(function(error) {
            console.error('ERROR al actualizar habilidad:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        });
});

app.put('/api/campeon_habilidad/:campeon/:habilidad', (req, res) => {
    const oldCampeon = req.params.campeon;
    const oldHabilidad = req.params.habilidad;
    const { campeon_nombre, habilidad_id } = req.body;

    db('campeon_habilidad')
        .where({ campeon_nombre: oldCampeon, habilidad_id: oldHabilidad })
        .update({ campeon_nombre, habilidad_id })
        .then(data => {
            if (data === 0) {
                res.status(404).json({ error: 'Relación no encontrada' });
            } else {
                res.json({ message: 'Relación actualizada' });
            }
        })
        .catch(err => res.status(500).json({ error: 'Error al modificar relación' }));
});

//Añadir data
app.post('/api/campeon', function(req, res) {
    const nuevoCampeon = req.body;
    db('Campeon')
        .insert(nuevoCampeon)
        .then(() => {
            res.status(201).json({message: 'Campeón añadido correctamente'})
        })
        .catch(error => {
            console.error('Error al añadir campeón')
            res.status(500).json({error: 'Error interno del servidor'});
        })
})

app.post('/api/habilidades', async (req, res) => {
    const { coste, tipo, descripcion, imagen, campeon_nombre } = req.body;

    try {
        const [id] = await db('habilidades').insert({ coste, tipo, descripcion, imagen });

        if (!campeon_nombre) {
            return res.status(400).json({ error: 'Falta el nombre del campeón' });
        }

        await db('campeon_habilidad').insert({ campeon_nombre, habilidad_id: id });

        res.status(201).json({ message: 'Habilidad y relación añadidas correctamente' });
    } catch (error) {
        console.error('Error al añadir habilidad y relación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/campeon_habilidad', (req, res) => {
    const { campeon_nombre, habilidad_id } = req.body;
    db('campeon_habilidad')
        .insert({ campeon_nombre, habilidad_id })
        .then(() => res.status(201).json({ message: 'Relación insertada' }))
        .catch(error => {
            console.error(error);
            res.status(500).json({ error: 'Error al insertar relación' });
        });
});

//Borrar data
app.delete('/api/campeon/:nombre', function(req, res) {
    const nombre = req.params.nombre;
    db.delete()
        .from('Campeon')
        .where('nombre', nombre)
        .then(() => {
            res.status(201).json({message: 'Campeón eliminado correctamente'})
        })
        .catch(error => {
            console.error('Error al añadir campeón')
            res.status(500).json({error: 'Error interno del servidor'});
        })
})

app.delete('/api/habilidades/:id', function(req, res) {
    const id = req.params.id;

    db('habilidades')
        .where('id', id)
        .del()
        .then(function(data) {
            if (data === 0) {
                res.status(404).json({ error: 'Habilidad no encontrada' });
            } else {
                res.json({ message: 'Habilidad eliminada correctamente', rowsAffected: data });
            }
        })
        .catch(function(error) {
            console.error('ERROR al eliminar habilidad:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
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
