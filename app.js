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
      .then(res => res.json())
      .then(data => {
        const socioFiltrado = data.filter(item => item.DNI && item.DNI.trim() === dni);
        const resultadoDiv = document.getElementById("resultado");
        const pagarBtn = document.getElementById("pagarBtn");
        const qrDiv = document.getElementById("qrcode");

        qrDiv.innerHTML = "";
        cuotasSeleccionadas = [];
        pagarBtn.disabled = true;

        if (socioFiltrado.length > 0) {
          const comprobantesTodos = socioFiltrado.map(c => c.Nro_Comprobante);

          fetch(`https://backend-mercadopago-ulig.onrender.com/estado_pago?dni=${dni}&comprobantes=${comprobantesTodos.join(",")}`)
            .then(res => res.json())
            .then(estado => {
              const pagados = estado.comprobantes || [];
              let html = `<strong>Nombre:</strong> ${socioFiltrado[0].Nombre}<br>`;
              html += `<strong>Estado:</strong> ${socioFiltrado[0].Estado}<br>`;
              html += `<strong>Cuotas adeudadas:</strong><br><ul style="list-style: none; padding-left: 0;">`;

              socioFiltrado.forEach((cuota) => {
                const comp = cuota.Nro_Comprobante;
                const estaPagado = pagados.includes(comp);

                html += `<li><label>`;
                if (estaPagado) {
                  html += `
                    <input type="checkbox" disabled />
                    ${cuota.Cuota} - ${cuota.Importe.trim()} (Vence: ${cuota.Vencimiento}) <span style="color:green;">✅ PAGADO</span>
                  `;
                } else {
                  html += `
                    <input type="checkbox" value="${cuota.Importe.trim()}" data-cuota="${cuota.Cuota}" data-vencimiento="${cuota.Vencimiento}" data-comprobante="${cuota.Nro_Comprobante}" onchange="actualizarSeleccion()"/>
                    ${cuota.Cuota} - ${cuota.Importe.trim()} (Vence: ${cuota.Vencimiento})
                  `;
                }
                html += `</label></li>`;
              });

              html += `</ul><strong>Total a pagar:</strong> <span id="totalSeleccionado">$0.00</span>`;
              resultadoDiv.className = "card fade-in";
              resultadoDiv.innerHTML = html;
              mostrarPantalla("pantallaCuotas");
            });
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

let intervalCheck = null;

function volverInicio() {
  document.getElementById("dniInput").value = "";
  cuotasSeleccionadas = [];
  dniGlobal = null;
  document.getElementById("resultado").innerHTML = "";
  document.getElementById("qrcode").innerHTML = "";
  document.getElementById("pagarBtn").disabled = true;
  document.getElementById("pagarBtn").style.display = "inline-block";
  document.getElementById("volverBtn").style.display = "inline-block";
  if (intervalCheck) clearInterval(intervalCheck); // 🧹 Detener el intervalo
  mostrarPantalla("pantallaInicio");
}


const qrDiv = document.getElementById("qrcode");

if (intervalCheck) clearInterval(intervalCheck); // limpiar anterior si había

intervalCheck = setInterval(() => {
  if (!dniGlobal || cuotasSeleccionadas.length === 0) return;
  const comprobantes = cuotasSeleccionadas.map(c => c.comprobante);
  const url = `https://backend-mercadopago-ulig.onrender.com/estado_pago?dni=${dniGlobal}&comprobantes=${comprobantes.join(",")}`;

  fetch(url)
    .then(res => res.json())
    .then(status => {
      if (status.pagado) {
        clearInterval(intervalCheck);

        const resultadoDiv = document.getElementById("resultado");
        const pagarBtn = document.getElementById("pagarBtn");
        const volverBtn = document.getElementById("volverBtn");

        resultadoDiv.innerHTML = "";
        pagarBtn.style.display = "none";
        volverBtn.style.display = "none";

        qrDiv.innerHTML = `
          <div class="agradecimiento fade-in">
            ¡Gracias por pagar! 🎉<br><br>
            Serás redirigido al inicio en 5 segundos...
          </div>`;

        mostrarPantalla("pantallaCarga");

        setTimeout(() => {
          volverInicio();
        }, 5000);
      }
    });
}, 5000);