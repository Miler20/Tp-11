function crearControladorReservas(servicioReservas) {
  function mostrarInicio(req, res) {
    res.render("inicio", { titulo: "Reservas de salas de estudio" });
  }

  async function mostrarEstado(req, res) {
    res.json({
      servicio: "activo",
      reservas: await servicioReservas.contarReservas(),
      solicitudId: res.locals.solicitudId,
    });
  }

  async function listar(req, res) {
    const reservas = await servicioReservas.listarReservas();
    res.render("reservas/lista", { titulo: "Reservas", reservas });
  }

  function mostrarFormulario(req, res) {
    res.render("reservas/nueva", {
      titulo: "Nueva reserva",
      error: null,
      valores: {},
    });
  }

  async function mostrarDetalle(req, res) {
    const reserva = await servicioReservas.buscarReservaPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe una reserva con ese identificador.",
      });
    }
    res.render("reservas/detalle", { titulo: "Detalle de reserva", reserva });
  }

  async function mostrarFormularioEdicion(req, res) {
    const reserva = await servicioReservas.buscarReservaPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe una reserva con ese identificador.",
      });
    }

    res.render("reservas/editar", {
      titulo: "Editar reserva",
      error: null,
      id: reserva.id,
      valores: {
        estudiante: reserva.estudiante,
        email: reserva.email,
        sala: reserva.sala,
        fecha: reserva.fecha,
        turno: reserva.turno,
        personas: String(reserva.personas),
        estado: reserva.estado,
      },
    });
  }

  async function reemplazarDesdeWeb(req, res) {
    const campos = [
      "estudiante",
      "email",
      "sala",
      "fecha",
      "turno",
      "personas",
      "estado",
    ];
    const recibidos = req.body ?? {};
    const valores = {};

    for (const campo of campos) {
      const valor = recibidos[campo];
      valores[campo] = typeof valor === "string" ? valor.trim() : "";
    }

    // Conservamos el contexto para reconstruir el formulario si hay un error.
    res.locals.edicionReserva = { id: req.params.id, valores };

    const claves = Object.keys(recibidos);
    const personasTexto = valores.personas;
    const personas = personasTexto !== "" ? Number(personasTexto) : NaN;
    const salas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
    const turnos = ["Mañana", "Tarde", "Noche"];
    const estados = ["pendiente", "confirmada"];

    const invalido =
      claves.length !== campos.length ||
      claves.some((campo) => !campos.includes(campo)) ||
      campos.some((campo) => !Object.hasOwn(recibidos, campo)) ||
      campos.some((campo) => typeof recibidos[campo] !== "string") ||
      !valores.estudiante ||
      !valores.email.includes("@") ||
      !salas.includes(valores.sala) ||
      !valores.fecha ||
      !turnos.includes(valores.turno) ||
      personasTexto === "" ||
      !Number.isFinite(personas) ||
      !Number.isInteger(personas) ||
      personas < 1 ||
      personas > 6 ||
      !estados.includes(valores.estado);

    if (invalido) {
      return res.status(400).render("reservas/editar", {
        titulo: "Editar reserva",
        error: "Revisá los siete campos. Todos deben tener valores válidos.",
        id: req.params.id,
        valores,
      });
    }

    const datos = {
      estudiante: valores.estudiante,
      email: valores.email,
      sala: valores.sala,
      fecha: valores.fecha,
      turno: valores.turno,
      personas,
      estado: valores.estado,
    };

    const reserva = await servicioReservas.reemplazarReserva(
      req.params.id,
      datos,
    );

    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe una reserva con ese identificador.",
      });
    }

    res.redirect(303, `/reservas/${reserva.id}`);
  }

  async function crear(req, res) {
    await servicioReservas.crearReserva(req.reservaValidada);
    res.redirect("/reservas");
  }

  async function listarApi(req, res) {
    const parametrosPermitidos = ["sala", "orden", "pagina", "limite"];

    const parametrosRecibidos = Object.keys(req.query);

    if (
      parametrosRecibidos.some(
        (parametro) => !parametrosPermitidos.includes(parametro),
      )
    ) {
      return res.status(400).json({ error: "Parámetro desconocido." });
    }

    const sala = req.query.sala;
    const orden = req.query.orden ?? "estudiante";
    const paginaTexto = req.query.pagina ?? "1";
    const limiteTexto = req.query.limite ?? "2";

    if (sala !== undefined && typeof sala !== "string") {
      return res.status(400).json({ error: "Sala repetida." });
    }

    if (sala !== undefined && !sala.trim()) {
      return res.status(400).json({ error: "Sala vacía." });
    }

    if (typeof orden !== "string") {
      return res.status(400).json({ error: "Orden repetido." });
    }

    if (!["estudiante", "personas-asc", "personas-desc"].includes(orden)) {
      return res.status(400).json({ error: "Orden no válido." });
    }

    if (typeof paginaTexto !== "string" || !paginaTexto.trim()) {
      return res.status(400).json({ error: "Página no válida." });
    }

    if (typeof limiteTexto !== "string" || !limiteTexto.trim()) {
      return res.status(400).json({ error: "Límite no válido." });
    }

    const pagina = Number(paginaTexto);
    const limite = Number(limiteTexto);

    if (!Number.isInteger(pagina) || pagina < 1 || pagina > 1000) {
      return res.status(400).json({ error: "Página fuera de rango." });
    }

    if (!Number.isInteger(limite) || limite < 1 || limite > 20) {
      return res.status(400).json({ error: "Límite fuera de rango." });
    }

    const resultado = await servicioReservas.consultar(
      sala,
      orden,
      pagina,
      limite,
    );

    res.json(resultado);
  }

  async function obtenerApi(req, res) {
    const reserva = await servicioReservas.buscarReservaPorId(req.params.id);
    if (!reserva)
      return res.status(404).json({ error: "Reserva no encontrada." });
    res.json(reserva);
  }

  async function crearApi(req, res) {
    const reserva = await servicioReservas.crearReserva(req.reservaValidada);
    res.location(`/api/reservas/${reserva.id}`).status(201).json(reserva);
  }

  async function reemplazarApi(req, res) {
    const reserva = await servicioReservas.reemplazarReserva(
      req.params.id,
      req.datosActualizacion,
    );
    if (!reserva)
      return res.status(404).json({ error: "Reserva no encontrada." });
    res.json(reserva);
  }

  async function modificarApi(req, res) {
    const reserva = await servicioReservas.modificarReserva(
      req.params.id,
      req.datosActualizacion,
    );
    if (!reserva)
      return res.status(404).json({ error: "Reserva no encontrada." });
    res.json(reserva);
  }

  async function eliminarApi(req, res) {
    const reserva = await servicioReservas.eliminarReserva(req.params.id);
    if (!reserva)
      return res.status(404).json({ error: "Reserva no encontrada." });
    res.status(204).end();
  }

  return {
    mostrarInicio,
    mostrarEstado,
    listar,
    mostrarFormulario,
    mostrarDetalle,
    mostrarFormularioEdicion,
    reemplazarDesdeWeb,
    crear,
    listarApi,
    obtenerApi,
    crearApi,
    reemplazarApi,
    modificarApi,
    eliminarApi,
  };
}

module.exports = { crearControladorReservas };
