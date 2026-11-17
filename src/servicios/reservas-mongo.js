const mongoose = require("mongoose");
const { Reserva } = require("../modelos/reserva");

function representar(documento) {
  return {
    id: documento._id.toString(),
    estudiante: documento.estudiante,
    email: documento.email,
    sala: documento.sala,
    fecha: documento.fecha,
    turno: documento.turno,
    personas: documento.personas,
    estado: documento.estado,
  };
}

function crearServicioReservasMongo() {
  function validarId(id) {
    if (!mongoose.isObjectIdOrHexString(id)) {
      const error = new Error("ID inválido");
      error.codigo = "ID_INVALIDO";
      throw error;
    }
  }

  async function listarReservas() {
    const documentos = await Reserva.find().lean();
    return documentos.map(representar);
  }

  async function consultar(sala, orden = "estudiante", pagina = 1, limite = 2) {
    const filtro = {};

    if (sala) {
      filtro.sala = sala.trim();
    }

    let criterioOrden;

    if (orden === "estudiante") {
      criterioOrden = { estudiante: 1, _id: 1 };
    } else if (orden === "personas-asc") {
      criterioOrden = { personas: 1, _id: 1 };
    } else if (orden === "personas-desc") {
      criterioOrden = { personas: -1, _id: 1 };
    }

    const salto = (pagina - 1) * limite;

    const total = await Reserva.countDocuments(filtro);

    const documentos = await Reserva.find(filtro)
      .sort(criterioOrden)
      .skip(salto)
      .limit(limite)
      .select("estudiante email sala fecha turno personas estado")
      .lean();

    return {
      datos: documentos.map(representar),
      pagina,
      limite,
      total,
      paginas: Math.ceil(total / limite),
    };
  }

  async function contarReservas() {
    return Reserva.countDocuments();
  }

  async function buscarReservaPorId(id) {
    validarId(id);
    const documento = await Reserva.findById(id).lean();
    return documento ? representar(documento) : null;
  }

  async function crearReserva(datos) {
    const documento = await Reserva.create({
      estudiante: datos.estudiante,
      email: datos.email,
      sala: datos.sala,
      fecha: datos.fecha,
      turno: datos.turno,
      personas: datos.personas,
    });
    return representar(documento);
  }

  async function reemplazarReserva(id, datos) {
    validarId(id);
    const documento = await Reserva.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          estudiante: datos.estudiante,
          email: datos.email,
          sala: datos.sala,
          fecha: datos.fecha,
          turno: datos.turno,
          personas: datos.personas,
          estado: datos.estado,
        },
      },
      {
        new: true,
        runValidators: true,
        upsert: false,
      },
    ).lean();
    return documento ? representar(documento) : null;
  }

  async function modificarReserva(id, datos) {
    validarId(id);
    const documento = await Reserva.findOneAndUpdate(
      { _id: id },
      { $set: datos },
      {
        new: true,
        runValidators: true,
        upsert: false,
      },
    ).lean();
    return documento ? representar(documento) : null;
  }

  async function eliminarReserva(id) {
    validarId(id);
    const documento = await Reserva.findByIdAndDelete(id).lean();
    return documento ? representar(documento) : null;
  }

  return {
    listarReservas,
    consultar,
    contarReservas,
    buscarReservaPorId,
    crearReserva,
    reemplazarReserva,
    modificarReserva,
    eliminarReserva,
  };
}

module.exports = { crearServicioReservasMongo };
