let cuotasSeleccionadas = [];
let dniGlobal = null; // NUEVO

let pantallaActual = null;

function mostrarPantalla(nuevaPantallaID, direccion = "right") {
  const pantallas = ["pantallaInicio", "pantallaCarga", "pantallaCuotas"];

  // Ocultar todas las pantallas activas
  pantallas.forEach(id => {
    const pantalla = document.getElementById(id);
    pantalla.classList.remove("active-slide", "slide-in-left", "slide-in-right");
    pantalla.classList.add("hidden");
  });

  const nuevaPantalla = document.getElementById(nuevaPantallaID);

  // Animación personalizada según dirección
  const claseSlide = direccion === "left" ? "slide-in-left" : "slide-in-right";
  nuevaPantalla.classList.add(claseSlide);

  setTimeout(() => {
    nuevaPantalla.classList.remove(claseSlide);
    nuevaPantalla.classList.add("active-slide");
  }, 10);

  nuevaPantalla.classList.remove("hidden");
  pantallaActual = nuevaPantallaID;
}



function buscarSocio() {
  const dni = document.getElementById("dniInput").value.trim();
  if (dni === "" || isNaN(dni)) {
    alert("Por favor ingresá un DNI válido.");
    return;
  }

  dniGlobal = dni; // ASIGNACIÓN GLOBAL

  mostrarPantalla("pantallaCarga");

  setTimeout(() => {
    fetch("https://api.sheetbest.com/sheets/f37ca123-cfac-4228-846b-8e526202c6e7")
      .then(response => response.json())
      .then(data => {
        const socioFiltrado = data.filter(item => item.DNI && item.DNI.trim() === dni);
        const resultadoDiv = document.getElementById("resultado");
        const pagarBtn = document.getElementById("pagarBtn");
        const qrDiv = document.getElementById("qrcode");

        qrDiv.innerHTML = "";
        cuotasSeleccionadas = [];
        pagarBtn.disabled = true;

        if (socioFiltrado.length > 0) {
          let html = `
            <div class="perfil-box">
              <img src="https://cdn-icons-png.flaticon.com/512/9131/9131529.png" alt="Perfil" class="perfil-img">
              <div class="bienvenida">
                <p class="bienvenido-text">Bienvenido,</p>
                <p class="bienvenido-nombre">${socioFiltrado[0].Nombre}</p>
                <p class="bienvenido-dni">DNI: ${dni}</p>
              </div>
            </div>
            <hr class="linea-separadora"/>
            <strong class="seccion-cuotas">Cuotas adeudadas:</strong>
            <ul style="list-style: none; padding-left: 0;">`;


          socioFiltrado.forEach((cuota, index) => {
  html += `
    <li class='cuota-card'>
      <label class='checkbox-btn'>
        <input type='checkbox' class='checkbox-cuota' value='${cuota.Importe.trim()}' data-cuota='${cuota.Cuota}' data-vencimiento='${cuota.Vencimiento}' onchange='actualizarSeleccion()'>
        <span class='checkmark'></span>
      </label>
      <div class='cuota-info'>
        <span class='cuota-nombre'>${cuota.Cuota}</span>
        <span class='cuota-vencimiento'>(Vence: ${cuota.Vencimiento})</span>
        <span class='cuota-importe'>$${cuota.Importe.trim()}</span>
      </div>
    </li>`;
});


          html += `</ul>
            <div class="total-box">
              <strong class="total-label">Total a pagar:</strong>
              <span id="totalSeleccionado" class="total-importe">$0.00</span>
            </div>`;

          resultadoDiv.className = "card fade-in";
          resultadoDiv.innerHTML = html;

          mostrarPantalla("pantallaCuotas");
        } else {
          alert("No se encontró ningún socio con ese DNI.");
          mostrarPantalla("pantallaInicio");
        }
      })
      .catch(error => {
        console.error(error);
        alert("Error al consultar los datos.");
        mostrarPantalla("pantallaInicio");
      });
  }, 2000);
}

function actualizarSeleccion() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  const pagarBtn = document.getElementById("pagarBtn");
  const totalDiv = document.getElementById("totalSeleccionado");

  let total = 0;
  cuotasSeleccionadas = [];

  checkboxes.forEach(cb => {
    const limpio = cb.value.replace(/\s/g, "").replace("$", "").replace(/\./g, "").replace(",", ".");
    const importe = parseFloat(limpio);
    total += isNaN(importe) ? 0 : importe;

    cuotasSeleccionadas.push({
      cuota: cb.dataset.cuota,
      vencimiento: cb.dataset.vencimiento,
      importe: cb.value
    });
  });

  totalDiv.classList.remove("animar-total");
void totalDiv.offsetWidth; // reiniciar animación
totalDiv.textContent = `$${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
totalDiv.classList.add("animar-total");
  pagarBtn.disabled = (checkboxes.length === 0 || total === 0);
}

function generarPago() {
  const qrDiv = document.getElementById("qrcode");
  const pagarBtn = document.getElementById("pagarBtn");

  if (cuotasSeleccionadas.length === 0 || !dniGlobal) return;

  mostrarPantalla("pantallaCarga");

  setTimeout(() => {
    let total = 0;
    cuotasSeleccionadas.forEach(c => {
      const limpio = c.importe.replace(/\s/g, "").replace("$", "").replace(/\./g, "").replace(",", ".");
      const importe = parseFloat(limpio);
      total += isNaN(importe) ? 0 : importe;
    });

    fetch(`https://backend-mercadopago-ulig.onrender.com/crear_qr?dni=${dniGlobal}&total=${total}`)
      .then(response => {
        if (!response.ok) throw new Error("No se pudo generar el link de pago");
        return response.json();
      })
      .then(data => {
        qrDiv.innerHTML = "";
        new QRCode(qrDiv, data.link);
        mostrarPantalla("pantallaCuotas");
        pagarBtn.disabled = true;
      })
      .catch(error => {
        qrDiv.innerHTML = "Error al generar el código QR.";
        console.error(error);
        mostrarPantalla("pantallaCuotas");
      });
  }, 2000);
}

function volverInicio() {
  document.getElementById("dniInput").value = "";
  cuotasSeleccionadas = [];
  document.getElementById("resultado").innerHTML = "";
  document.getElementById("qrcode").innerHTML = "";
  document.getElementById("pagarBtn").disabled = true;
  mostrarPantalla("pantallaInicio", "left"); // ⬅️ efecto de volver
}


// ✅ Escuchar si se confirma el pago real
const qrDiv = document.getElementById("qrcode");

const interval = setInterval(() => {
  if (!dniGlobal) return;
  fetch(`https://backend-mercadopago-ulig.onrender.com/estado_pago?dni=${dniGlobal}`)
    .then(res => res.json())
    .then(status => {
      if (status.pagado) {
        clearInterval(interval);
        qrDiv.innerHTML = `<div class="agradecimiento fade-in">¡Gracias por pagar! 🎉</div>`;
        document.getElementById("pagarBtn").style.display = "none";
        document.getElementById("volverBtn").style.display = "none";
      }
    });
}, 5000);
function limpiarDNI() {
  document.getElementById("dniInput").value = "";
  document.getElementById("dniInput").focus();
}
