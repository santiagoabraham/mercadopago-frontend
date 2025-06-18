let cuotasSeleccionadas = [];
let dniGlobal = null;

function mostrarPantalla(id) {
  document.getElementById("pantallaInicio").classList.add("hidden");
  document.getElementById("pantallaCarga").classList.add("hidden");
  document.getElementById("pantallaCuotas").classList.add("hidden");
  document.getElementById(id).classList.remove("hidden");
}

function buscarSocio() {
  const dni = document.getElementById("dniInput").value.trim();
  if (dni === "" || isNaN(dni)) {
    alert("Por favor ingresá un DNI válido.");
    return;
  }

  dniGlobal = dni;
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
          let html = `<strong>Nombre:</strong> ${socioFiltrado[0].Nombre}<br>`;
          html += `<strong>Estado:</strong> ${socioFiltrado[0].Estado}<br>`;
          html += `<strong>Cuotas adeudadas:</strong><br><ul style="list-style: none; padding-left: 0;">`;

          socioFiltrado.forEach((cuota, index) => {
            html += `
              <li>
                <label>
                  <input type="checkbox" value="${cuota.Importe.trim()}" data-cuota="${cuota.Cuota}" data-vencimiento="${cuota.Vencimiento}" data-comprobante="${cuota.Nro_Comprobante}" onchange="actualizarSeleccion()"/>
                  ${cuota.Cuota} - ${cuota.Importe.trim()} (Vence: ${cuota.Vencimiento})
                </label>
              </li>`;
          });

          html += `</ul><strong>Total a pagar:</strong> <span id="totalSeleccionado">$0.00</span>`;
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
      importe: cb.value,
      comprobante: cb.dataset.comprobante
    });
  });

  totalDiv.textContent = `$${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
  pagarBtn.disabled = (checkboxes.length === 0 || total === 0);
}

function generarPago() {
  const qrDiv = document.getElementById("qrcode");
  const pagarBtn = document.getElementById("pagarBtn");

  if (cuotasSeleccionadas.length === 0 || !dniGlobal) return;

  mostrarPantalla("pantallaCarga");

  setTimeout(() => {
    let total = 0;
    const comprobantes = [];
    cuotasSeleccionadas.forEach(c => {
      const limpio = c.importe.replace(/\s/g, "").replace("$", "").replace(/\./g, "").replace(",", ".");
      const importe = parseFloat(limpio);
      total += isNaN(importe) ? 0 : importe;
      comprobantes.push(c.comprobante);
    });

    const url = `https://backend-mercadopago-ulig.onrender.com/crear_qr?dni=${dniGlobal}&total=${total}&comprobantes=${comprobantes.join(",")}`;

    fetch(url)
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
  mostrarPantalla("pantallaInicio");
}

const qrDiv = document.getElementById("qrcode");

const interval = setInterval(() => {
  if (!dniGlobal || cuotasSeleccionadas.length === 0) return;
  const comprobantes = cuotasSeleccionadas.map(c => c.comprobante);
  const url = `https://backend-mercadopago-ulig.onrender.com/estado_pago?dni=${dniGlobal}&comprobantes=${comprobantes.join(",")}`;

  fetch(url)
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
