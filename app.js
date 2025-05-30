const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');


const app = express();

const monk = require('monk');
const { MongoClient, ObjectId } = require('mongodb');

const db = monk('mongodb+srv://admin:bwh8ELBljpUSY6ce@cluster.kr4sbrb.mongodb.net/Campeones?retryWrites=true&w=majority&appName=Cluster');
const uri = 'mongodb+srv://admin:bwh8ELBljpUSY6ce@cluster.kr4sbrb.mongodb.net/Campeones?retryWrites=true&w=majority&appName=Cluster';


const mongoClient = new MongoClient(uri);

let dbNative;

(async () => {
    try {
        await mongoClient.connect();
        dbNative = mongoClient.db('Campeones');
        console.log('MongoDB  conectado');

    } catch (err) {
        console.error('Error conectando MongoDB:', err);
    }
})();



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

const campeonesCol = db.get('Campeon');
const clasesCol = db.get('Clases');
const habilidadesCol = db.get('habilidades');
const campeonHabilidadCol = db.get('Campeon_Habilidad');

app.get('/api/campeon', async (req, res) => {
    try {
        const campeones = await campeonesCol.find({});
        res.json(campeones);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener campeones' });
    }
});

app.get('/api/clases', async (req, res) => {
    try {
        const clases = await clasesCol.find({});
        res.json(clases);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener clases' });
    }
});

app.get('/api/habilidades', async (req, res) => {
    try {
        const habilidades = await habilidadesCol.find({});
        res.json(habilidades);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener habilidades' });
    }
});

app.get('/api/habilidades/:id', async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });
    try {
        const habilidad = await habilidadesCol.findOne({ _id: new ObjectId(id) });
        if (!habilidad) return res.status(404).json({ error: 'Habilidad no encontrada' });
        res.json(habilidad);
    } catch {
        res.status(500).json({ error: 'Error al obtener habilidad' });
    }
});

app.get('/api/campeon_habilidad', async (req, res) => {
    try {
        const relaciones = await campeonHabilidadCol.find({});
        res.json(relaciones);
    } catch {
        res.status(500).json({ error: 'Error al obtener relaciones' });
    }
});

app.get('/api/campeon/:nombre', async (req, res) => {
    const nombre = req.params.nombre;
    try {
        const campeon = await campeonesCol.findOne({ nombre: { $regex: `^${nombre}$`, $options: 'i' } });
        if (!campeon) return res.status(404).json({ error: 'Campeón no encontrado' });
        res.json(campeon);
    } catch {
        res.status(500).json({ error: 'Error al buscar campeón' });
    }
});

app.get('/api/all', async (req, res) => {
    try {
        if (!dbNative) return res.status(500).json({ error: 'DB nativa no conectada' });

        const campeonesColNative = dbNative.collection('Campeon');

        const resultados = await campeonesColNative.aggregate([
            {
                $lookup: {
                    from: 'Campeon_Habilidad',
                    localField: 'nombre',
                    foreignField: 'campeon_nombre',
                    as: 'habilidad_relaciones'
                }
            },
            { $unwind: { path: '$habilidad_relaciones', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'habilidades',
                    localField: 'habilidad_relaciones.habilidad_id',
                    foreignField: '_id',
                    as: 'habilidades_info'
                }
            },
            { $unwind: { path: '$habilidades_info', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    nombre: 1,
                    clase: 1,
                    descripcion: 1,
                    recurso: 1,
                    imagen: 1,
                    habilidad: '$habilidades_info'
                }
            }
        ]).toArray();

        res.json(resultados);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en la consulta' });
    }
});

app.put('/api/campeon/:nombre', async (req, res) => {
    const nombre = req.params.nombre;
    const data = req.body;
    try {
        const result = await campeonesCol.update({ nombre }, { $set: data });
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Campeón no encontrado' });
        res.json({ message: 'Campeón actualizado' });
    } catch {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/api/habilidades/:id', async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });
    const data = req.body;
    try {
        const result = await habilidadesCol.update({ _id: new ObjectId(id) }, { $set: data });
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Habilidad no encontrada' });
        res.json({ message: 'Habilidad actualizada' });
    } catch {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/api/campeon_habilidad/:campeon/:habilidad', async (req, res) => {
    const oldCampeon = req.params.campeon;
    const oldHabilidad = req.params.habilidad;
    const { campeon_nombre, habilidad_id } = req.body;
    try {
        const result = await campeonHabilidadCol.update(
            { campeon_nombre: oldCampeon, habilidad_id: oldHabilidad },
            { $set: { campeon_nombre, habilidad_id } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Relación no encontrada' });
        res.json({ message: 'Relación actualizada' });
    } catch {
        res.status(500).json({ error: 'Error al modificar relación' });
    }
});

app.post('/api/campeon', async (req, res) => {
    try {
        await campeonesCol.insert(req.body);
        res.status(201).json({ message: 'Campeón añadido correctamente' });
    } catch {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/habilidades', async (req, res) => {
    const { coste, tipo, descripcion, imagen, campeon_nombre } = req.body;
    if (!campeon_nombre) return res.status(400).json({ error: 'Falta el nombre del campeón' });
    try {
        const result = await habilidadesCol.insert({ coste, tipo, descripcion, imagen });
        await campeonHabilidadCol.insert({ campeon_nombre, habilidad_id: result.insertedId });
        res.status(201).json({ message: 'Habilidad y relación añadidas correctamente' });
    } catch {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/campeon_habilidad', async (req, res) => {
    try {
        await campeonHabilidadCol.insert(req.body);
        res.status(201).json({ message: 'Relación insertada' });
    } catch {
        res.status(500).json({ error: 'Error al insertar relación' });
    }
});

app.delete('/api/campeon/:nombre', async (req, res) => {
    const nombre = req.params.nombre;
    try {
        const result = await campeonesCol.delete({ nombre });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Campeón no encontrado' });
        res.json({ message: 'Campeón eliminado correctamente' });
    } catch {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.delete('/api/habilidades/:id', async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });
    try {
        const result = await habilidadesCol.delete({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Habilidad no encontrada' });
        res.json({ message: 'Habilidad eliminada correctamente' });
    } catch {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.use(function(req, res, next) {
    next(createError(404));
});

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({ error: err.message });
});

module.exports = app;
