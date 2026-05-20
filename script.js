// VARIABLES DE CONTROL DE SESIÓN ACTIVA
let usuarioActual = localStorage.getItem('usuarioActual_Sesion') || null;

let inventario = {};
let platillos = [];
let ventas = [];
let reportesArchivados = [];
let ultimaFechaLimpiezaCaja = null;
let ultimoResumenCierreTexto = "";
let rangoActual = { inicio: null, fin: null, total: 0, texto: "" };

// Función para cargar los datos específicos del usuario que inició sesión
function cargarDatosDelUsuario(username) {
    inventario = JSON.parse(localStorage.getItem(`${username}_inventario`)) || {};
    platillos = JSON.parse(localStorage.getItem(`${username}_platillos`)) || [];
    ventas = JSON.parse(localStorage.getItem(`${username}_ventas`)) || [];
    reportesArchivados = JSON.parse(localStorage.getItem(`${username}_reportesArchivados`)) || [];
    
    ultimaFechaLimpiezaCaja = localStorage.getItem(`${username}_ultimaFechaLimpiezaCaja`) || null;
    ultimoResumenCierreTexto = localStorage.getItem(`${username}_ultimoResumenCierreTexto`) || "";
}

// ACCESO Y AUTENTICACIÓN (LOGIN Y REGISTRO)
function cambiarVistaAuth(vista) {
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('reg-error').style.display = 'none';
    
    if (vista === 'registro') {
        document.getElementById('card-login').style.display = 'none';
        document.getElementById('card-registro').style.display = 'block';
    } else {
        document.getElementById('card-registro').style.display = 'none';
        document.getElementById('card-login').style.display = 'block';
    }
}

function validarContrasenaFuerte() {
    const pass = document.getElementById('reg-password').value;
    const btnRegistro = document.getElementById('btn-completar-registro');

    const tieneLargoCorrecto = pass.length >= 8;
    const tieneMayuscula = /[A-Z]/.test(pass);
    const tieneNumero = /[0-9]/.test(pass);

    actualizarPoliticaVisual('policy-length', tieneLargoCorrecto);
    actualizarPoliticaVisual('policy-upper', tieneMayuscula);
    actualizarPoliticaVisual('policy-number', tieneNumero);

    if (tieneLargoCorrecto && tieneMayuscula && tieneNumero) {
        btnRegistro.disabled = false;
        btnRegistro.style.opacity = "1";
        btnRegistro.style.cursor = "pointer";
    } else {
        btnRegistro.disabled = true;
        btnRegistro.style.opacity = "0.6";
        btnRegistro.style.cursor = "not-allowed";
    }
}

function actualizarPoliticaVisual(id, esValido) {
    const el = document.getElementById(id);
    if (!el) return;
    if (esValido) {
        el.classList.add('valid');
        el.innerText = el.innerText.replace('❌', '✅');
    } else {
        el.classList.remove('valid');
        el.innerText = el.innerText.replace('✅', '❌');
    }
}

function registrarGerente(event) {
    event.preventDefault();
    const user = document.getElementById('reg-username').value.trim().toLowerCase(); 
    const pass = document.getElementById('reg-password').value;
    const passConfirm = document.getElementById('reg-password-confirm').value;
    const errorTxt = document.getElementById('reg-error');
    
    errorTxt.style.display = 'none';

    if (user.length < 3) {
        errorTxt.innerText = "❌ El nombre de usuario debe tener mínimo 3 caracteres.";
        errorTxt.style.display = 'block';
        return;
    }

    if (localStorage.getItem(`pwd_${user}`)) {
        errorTxt.innerText = "❌ Este nombre de usuario ya está registrado.";
        errorTxt.style.display = 'block';
        return;
    }

    if (pass !== passConfirm) {
        errorTxt.innerText = "❌ Las contraseñas no coinciden.";
        errorTxt.style.display = 'block';
        return;
    }

    localStorage.setItem(`pwd_${user}`, pass);
    alert(`🎉 ¡Cuenta creada con éxito!\nUsuario: "${user}" guardado. Ya puedes iniciar sesión.`);
    document.getElementById('form-registro-gerente').reset();
    validarContrasenaFuerte(); 
    cambiarVistaAuth('login');
}

function iniciarSesionGerente() {
    const userInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passInput = document.getElementById('login-password').value;
    const errorTxt = document.getElementById('login-error');

    const contrasenaGuardada = localStorage.getItem(`pwd_${userInput}`);

    if (contrasenaGuardada && passInput === contrasenaGuardada) {
        errorTxt.style.display = 'none';
        
        usuarioActual = userInput;
        localStorage.setItem('usuarioActual_Sesion', usuarioActual);
        
        cargarDatosDelUsuario(usuarioActual);

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('nombre-gerente-header').innerText = usuarioActual;
        
        document.getElementById('login-username').value = "";
        document.getElementById('login-password').value = "";
        showSection('inventario');
    } else {
        errorTxt.innerText = "❌ Usuario o contraseña incorrectos.";
        errorTxt.style.display = 'block';
    }
}

function cerrarSesionGerente() {
    usuarioActual = null;
    localStorage.removeItem('usuarioActual_Sesion');
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    cambiarVistaAuth('login');
}

function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    actualizarVistas();
}

// INVENTARIO DE INSUMOS
document.getElementById('form-insumo')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('insumo-nombre').value.toLowerCase().trim();
    const cantidad = parseFloat(document.getElementById('insumo-cantidad').value);
    const minimo = parseFloat(document.getElementById('insumo-minimo').value);
    const unidad = document.getElementById('insumo-unidad').value;

    if (inventario[nombre]) {
        inventario[nombre].cantidad += cantidad;
        inventario[nombre].minimo = minimo; 
    } else {
        inventario[nombre] = { cantidad, unidad, minimo };
    }
    save();
    e.target.reset();
});

function eliminarInsumo(nombre) {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        delete inventario[nombre];
        save();
    }
}

// MANAGEMENT DE PLATILLOS
function eliminarPlatillo(index) {
    if (confirm("¿Eliminar este platillo?")) {
        platillos.splice(index, 1);
        save();
    }
}

function agregarInputIngrediente() {
    const container = document.getElementById('lista-ingredientes-platillo');
    const insumosDisponibles = Object.keys(inventario);
    if (insumosDisponibles.length === 0) return alert("⚠️ Registra insumos primero.");

    const div = document.createElement('div');
    div.className = 'row';
    div.style.marginTop = "8px";
    div.innerHTML = `
        <select class="ing-nombre" style="flex:2">${insumosDisponibles.map(i => `<option value="${i}">${i}</option>`).join('')}</select>
        <input type="number" placeholder="Cant." class="ing-cant" style="flex:1" required>
        <button type="button" class="btn-delete" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

document.getElementById('form-platillo')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('platillo-nombre').value;
    const precio = parseFloat(document.getElementById('platillo-precio').value);
    const nombresIng = document.querySelectorAll('.ing-nombre');
    const cantsIng = document.querySelectorAll('.ing-cant');

    let receta = [];
    nombresIng.forEach((sel, i) => {
        receta.push({ nombre: sel.value, cantidad: parseFloat(cantsIng[i].value) });
    });

    platillos.push({ nombre, precio, receta });
    save();
    e.target.reset();
    document.getElementById('lista-ingredientes-platillo').innerHTML = '';
});

// GESTIÓN DE CAJA DIARIA
function registrarVenta() {
    const idx = document.getElementById('select-platillo').value;
    const metodoPago = document.getElementById('select-metodo-pago').value;
    
    if (idx === "") return alert("Selecciona un plato.");
    const plato = platillos[idx];

    for (let ing of plato.receta) {
        if (!inventario[ing.nombre] || Math.round(inventario[ing.nombre].cantidad * 100) < Math.round(ing.cantidad * 100)) {
            return alert(`❌ Sin stock suficiente de: ${ing.nombre}`);
        }
    }

    plato.receta.forEach(ing => {
        inventario[ing.nombre].cantidad -= ing.cantidad;
    });

    ventas.push({ 
        plato: plato.nombre, 
        precio: plato.precio, 
        metodoPago: metodoPago, 
        fecha: new Date().toISOString() 
    });
    save();
}

function limpiarPantallaVentasManual() {
    let totalEfe = 0, totalTar = 0, totalTra = 0;
    ventas.forEach((v) => {
        const fechaVenta = new Date(v.fecha);
        if (!ultimaFechaLimpiezaCaja || fechaVenta > new Date(ultimaFechaLimpiezaCaja)) {
            const m = v.metodoPago || 'Efectivo';
            if (m === 'Efectivo') totalEfe += v.precio;
            if (m === 'Tarjeta') totalTar += v.precio;
            if (m === 'Transferencia') totalTra += v.precio;
        }
    });

    const granTotal = totalEfe + totalTar + totalTra;

    if (granTotal === 0) {
        return alert("La pantalla ya está limpia y en $0.00. No hay ventas por cerrar.");
    }

    if (confirm(`🌙 ¿Deseas hacer el cierre de este turno?\n\nLa pantalla se reiniciará a $0, pero dejaré el resumen fijo con los totales para tu control.`)) {
        const fCierre = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        ultimoResumenCierreTexto = `Cierre de las ${fCierre} por un Total de $${granTotal.toFixed(2)} ➡️ (Efectivo: $${totalEfe.toFixed(2)} | Transferencia: $${totalTra.toFixed(2)} | Tarjeta: $${totalTar.toFixed(2)})`;
        localStorage.setItem(`${usuarioActual}_ultimoResumenCierreTexto`, ultimoResumenCierreTexto);

        ultimaFechaLimpiezaCaja = new Date().toISOString();
        localStorage.setItem(`${usuarioActual}_ultimaFechaLimpiezaCaja`, ultimaFechaLimpiezaCaja);
        
        actualizarVistas();
        alert("✅ Caja del turno cerrada. ¡Pantalla limpia!");
    }
}

// 📊 PANEL DE REPORTES Y PROGRAMADOR DE ALERTAS

// Botón Azul: Filtra registros pasados o presentes en tiempo real
function generarReportePorRango() {
    const desdeInput = document.getElementById('reporte-desde').value;
    const hastaInput = document.getElementById('reporte-hasta').value;

    if (!desdeInput || !hastaInput) return alert("Por favor, selecciona ambas fechas.");

    const fechaDesde = new Date(desdeInput + 'T00:00:00');
    const fechaHasta = new Date(hastaInput + 'T23:59:59');

    rangoActual.texto = `Del ${fechaDesde.toLocaleDateString()} al ${fechaHasta.toLocaleDateString()}`;
    document.getElementById('reporte-rango-texto').innerText = `Filtrado desde: ${fechaDesde.toLocaleDateString()} hasta: ${fechaHasta.toLocaleDateString()}`;
    
    ejecutarFiltroVentas(fechaDesde, fechaHasta);
}

// Botón Marrón: Almacena de forma explícita el rango futuro en LocalStorage
function guardarAlertaFuturaManual() {
    const desdeInput = document.getElementById('alerta-futura-desde').value;
    const hastaInput = document.getElementById('alerta-futura-hasta').value;
    
    if (!desdeInput || !hastaInput) {
        return alert("⚠️ Por favor, selecciona tanto la fecha de INICIO como la de VENCIMIENTO para programar el recordatorio.");
    }

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const fechaVencimiento = new Date(hastaInput + 'T00:00:00');

    if (fechaVencimiento <= hoy) {
        return alert("⚠️ La fecha final ('Hasta') debe ser una fecha futura. Para auditar ventas actuales o pasadas, utiliza el bloque azul de arriba.");
    }

    localStorage.setItem(`${usuarioActual}_alertaRangoDesde`, desdeInput);
    localStorage.setItem(`${usuarioActual}_alertaRangoHasta`, hastaInput);
    
    const fInicioLocal = new Date(desdeInput + 'T00:00:00').toLocaleDateString();
    const fFinLocal = fechaVencimiento.toLocaleDateString();
    
    alert(`✅ ¡Recordatorio del Rango Anclado!\nEl sistema guardó el periodo (${fInicioLocal} al ${fFinLocal}) y te notificará de forma automática en la pantalla principal al llegar el día ${fFinLocal}.`);
    
    document.getElementById('alerta-futura-desde').value = "";
    document.getElementById('alerta-futura-hasta').value = "";
    
    verificarSiEsDiaDeCierre();
}

// Evalúa si hoy se cumplió el plazo programado para arrojar el banner
function verificarSiEsDiaDeCierre() {
    const contenedor = document.getElementById('contenedor-notificaciones');
    if (!contenedor) return;
    contenedor.innerHTML = ""; 

    const rangoDesde = localStorage.getItem(`${usuarioActual}_alertaRangoDesde`);
    const rangoHasta = localStorage.getItem(`${usuarioActual}_alertaRangoHasta`);

    if (!rangoHasta || !rangoDesde) return;

    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    if (hoyStr >= rangoHasta) {
        const fInicioFormateada = new Date(rangoDesde + 'T00:00:00').toLocaleDateString();
        const fFinFormateada = new Date(rangoHasta + 'T00:00:00').toLocaleDateString();

        contenedor.innerHTML = `
            <div class="banner-alerta" style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <span style="color: #92400e;">📢 <strong>Recordatorio Contable:</strong> Se ha cumplido el plazo para el reporte programado del periodo: <strong>${fInicioFormateada} al ${fFinFormateada}</strong>.</span>
                <button class="btn-main" style="background: #d97706; padding: 6px 15px; font-size: 0.85rem;" onclick="cargarYGenerarReporteProgramado('${rangoDesde}', '${rangoHasta}')">⚡ Cargar y Generar Reporte</button>
            </div>
        `;
    }
}

// Acción de atajo disparada desde la notificación del banner
function cargarYGenerarReporteProgramado(fechaDesde, fechaHasta) {
    showSection('reportes');
    document.getElementById('reporte-desde').value = fechaDesde;
    document.getElementById('reporte-hasta').value = fechaHasta;
    generarReportePorRango();
    alert("📊 El sistema cargó el rango programado y calculó los totales acumulados automáticamente en la tabla.");
}

// Imprime los datos filtrados en la UI y activa el botón de guardado si hay ingresos > $0
function ejecutarFiltroVentas(fechaInicio, fechaFin) {
    const tablaResultados = document.getElementById('tabla-reporte-resultados');
    const btnArchivar = document.getElementById('btn-archivar');
    tablaResultados.innerHTML = '';
    
    const ventasFiltradas = ventas.filter(v => {
        const fechaVenta = new Date(v.fecha);
        return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });

    if (ventasFiltradas.length === 0) {
        tablaResultados.innerHTML = `<tr><td colspan="4" style="text-align: center; color: gray;">No hay registros de ventas.</td></tr>`;
        document.getElementById('reporte-total').innerText = "$0.00";
        if(btnArchivar) btnArchivar.style.display = 'none';
        return;
    }

    let totalReporte = 0;
    ventasFiltradas.forEach(v => {
        const f = new Date(v.fecha);
        tablaResultados.innerHTML += `
            <tr>
                <td>${f.toLocaleDateString()} ${f.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>${v.plato}</td>
                <td><strong>${v.metodoPago || 'Efectivo'}</strong></td>
                <td style="color: var(--accent); font-weight: 600;">$${v.precio.toFixed(2)}</td>
            </tr>
        `;
        totalReporte += v.precio;
    });

    document.getElementById('reporte-total').innerText = `$${totalReporte.toFixed(2)}`;
    rangoActual.inicio = fechaInicio;
    rangoActual.fin = fechaFin;
    rangoActual.total = totalReporte;

    if(btnArchivar) btnArchivar.style.display = 'inline-block';
}

// Envía el reporte calculado al historial contable permanente de abajo
function archivarPeriodoActual() {
    if (!rangoActual.inicio || rangoActual.total === 0) return;

    if (confirm(`⚠️ ¿Guardar este periodo de $${rangoActual.total.toFixed(2)} en el historial permanente?`)) {
        reportesArchivados.push({
            fechaCierre: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            periodo: rangoActual.texto,
            total: rangoActual.total
        });

        // Remueve de la base de datos viva las ventas que ya fueron archivadas
        ventas = ventas.filter(v => {
            const fVenta = new Date(v.fecha);
            return fVenta < rangoActual.inicio || fVenta > rangoActual.fin;
        });

        // Reinicia memorias y alertas asociadas ya ejecutadas
        localStorage.removeItem(`${usuarioActual}_alertaRangoDesde`);
        localStorage.removeItem(`${usuarioActual}_alertaRangoHasta`);
        localStorage.removeItem(`${usuarioActual}_ultimaFechaLimpiezaCaja`);
        localStorage.removeItem(`${usuarioActual}_ultimoResumenCierreTexto`);
        
        ultimaFechaLimpiezaCaja = null;
        ultimoResumenCierreTexto = "";
        document.getElementById('contenedor-notificaciones').innerHTML = ""; 

        rangoActual = { inicio: null, fin: null, total: 0, texto: "" };
        document.getElementById('btn-archivar').style.display = 'none';
        document.getElementById('reporte-total').innerText = "$0.00";
        document.getElementById('tabla-reporte-resultados').innerHTML = `<tr><td colspan="4" style="text-align: center; color: gray;">Archivado correctamente.</td></tr>`;
        
        localStorage.setItem(`${usuarioActual}_reportesArchivados`, JSON.stringify(reportesArchivados));
        save();
    }
}

function eliminarReporteArchivado(index) {
    if (confirm("¿Eliminar este reporte guardado del historial contable?")) {
        reportesArchivados.splice(index, 1);
        localStorage.setItem(`${usuarioActual}_reportesArchivados`, JSON.stringify(reportesArchivados));
        actualizarVistas();
    }
}

// RENDERIZADO VISUAL EN PANTALLA (HTML DINÁMICO)
function actualizarVistas() {
    if (!usuarioActual) return; 

    let agotados = 0; let bajos = 0;

    const tInv = document.getElementById('tabla-inventario');
    if (tInv) {
        tInv.innerHTML = '';
        for (let n in inventario) {
            const stock = inventario[n].cantidad;
            const unidad = inventario[n].unidad;
            const minimo = inventario[n].minimo || 0;
            let estadoHTML = `<span style="color:#10b981">● Ok</span>`;
            let estiloFila = "";

            if (stock <= 0) { 
                estadoHTML = `<span style="color:#ef4444; font-weight:bold;">● Agotado</span>`; estiloFila = "background:#fef2f2"; agotados++;
            } else if (stock <= minimo) { 
                estadoHTML = `<span style="color:#f59e0b; font-weight:bold;">● Bajo</span>`; estiloFila = "background:#fffbeb"; bajos++;
            }

            tInv.innerHTML += `<tr style="${estiloFila}">
                <td style="text-transform:capitalize;">${n}</td>
                <td>${stock.toFixed(2)}</td>
                <td>${minimo}</td>
                <td>${unidad}</td>
                <td>${estadoHTML}</td>
                <td><button class="btn-delete" onclick="eliminarInsumo('${n}')">Eliminar</button></td>
            </tr>`;
        }
    }

    document.getElementById('count-agotado').innerText = agotados;
    document.getElementById('count-bajo').innerText = bajos;
    document.getElementById('count-ventas').innerText = ventas.length;

    const tPla = document.getElementById('tabla-platillos');
    if (tPla) {
        tPla.innerHTML = '';
        platillos.forEach((p, i) => {
            tPla.innerHTML += `<tr>
                <td>${p.nombre}</td>
                <td style="color:var(--accent); font-weight:600">$${p.precio}</td>
                <td><small>${p.receta.map(r => r.nombre).join(', ')}</small></td>
                <td><button class="btn-delete" onclick="eliminarPlatillo(${i})">Eliminar</button></td>
            </tr>`;
        });
    }

    const sel = document.getElementById('select-platillo');
    if (sel) {
        sel.innerHTML = '<option value="">-- Seleccionar Plato --</option>' + platillos.map((p, i) => `<option value="${i}">${p.nombre}</option>`).join('');
    }

    const hist = document.getElementById('historial-ventas');
    if (hist) {
        hist.innerHTML = '';
        let totalGeneralTurno = 0, totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0;

        ventas.forEach((v) => {
            const fechaVenta = new Date(v.fecha);
            
            if (!ultimaFechaLimpiezaCaja || fechaVenta > new Date(ultimaFechaLimpiezaCaja)) {
                const f = new Date(v.fecha);
                const metodo = v.metodoPago || 'Efectivo';
                
                hist.innerHTML += `
                    <li style="display:flex; justify-content:space-between; background:white; padding:10px; border-radius:8px; margin-bottom:5px; border:1px solid #e2e8f0;">
                        <span>${v.plato} <small style="color:gray;">(${metodo} - ${f.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</small></span>
                        <span style="font-weight:700; color:var(--accent)">$${v.precio.toFixed(2)}</span>
                    </li>`;
                
                totalGeneralTurno += v.precio;
                if (metodo === 'Efectivo') totalEfectivo += v.precio;
                if (metodo === 'Tarjeta') totalTarjeta += v.precio;
                if (metodo === 'Transferencia') totalTransferencia += v.precio;
            }
        });

        document.getElementById('total-dia').innerText = `$${totalGeneralTurno.toFixed(2)}`;
        document.getElementById('total-pago-efectivo').innerText = `$${totalEfectivo.toFixed(2)}`;
        document.getElementById('total-pago-tarjeta').innerText = `$${totalTarjeta.toFixed(2)}`;
        document.getElementById('total-pago-transferencia').innerText = `$${totalTransferencia.toFixed(2)}`;
    }

    const cajaResumenCierre = document.getElementById('resumen-ultimo-cierre');
    const textoResumenCierre = document.getElementById('texto-resumen-cierre');
    if (cajaResumenCierre && textoResumenCierre) {
        if (ultimoResumenCierreTexto) {
            textoResumenCierre.innerText = ultimoResumenCierreTexto;
            cajaResumenCierre.style.display = 'block';
        } else {
            cajaResumenCierre.style.display = 'none';
        }
    }

    const tArchivos = document.getElementById('tabla-historial-archivos');
    if (tArchivos) {
        if (reportesArchivados.length === 0) {
            tArchivos.innerHTML = `<tr><td colspan="4" style="text-align: center; color: gray;">No hay reportes archivados todavía.</td></tr>`;
        } else {
            tArchivos.innerHTML = '';
            reportesArchivados.forEach((rep, i) => {
                tArchivos.innerHTML += `
                    <tr>
                        <td>${rep.fechaCierre}</td>
                        <td><strong>${rep.periodo}</strong></td>
                        <td style="color: var(--accent); font-weight:600;">$${rep.total.toFixed(2)}</td>
                        <td><button class="btn-delete" onclick="eliminarReporteArchivado(${i})">Eliminar Registro</button></td>
                    </tr>
                `;
            });
        }
    }
}

function save() {
    if (!usuarioActual) return;
    localStorage.setItem(`${usuarioActual}_inventario`, JSON.stringify(inventario));
    localStorage.setItem(`${usuarioActual}_platillos`, JSON.stringify(platillos));
    localStorage.setItem(`${usuarioActual}_ventas`, JSON.stringify(ventas));
    actualizarVistas();
}

// INICIALIZADOR AL CARGAR LA PÁGINA
window.onload = () => {
    if (usuarioActual) {
        cargarDatosDelUsuario(usuarioActual);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('nombre-gerente-header').innerText = usuarioActual;
        showSection('inventario');
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        cambiarVistaAuth('login');
    }
    verificarSiEsDiaDeCierre(); 
};