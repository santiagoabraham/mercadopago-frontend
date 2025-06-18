function buscarSocio() {
  const dni = document.getElementById("dniInput").value.trim();
  const resultadoDiv = document.getElementById("resultado");
  const qrDiv = document.getElementById("qrcode");
  const loader = document.getElementById("loader");

  // Limpieza visual inicial
  resultadoDiv.innerHTML = "";
  qrDiv.innerHTML = "";
  resultadoDiv.classList.add("hidden");
  qrDiv.classList.add("hidden");
  resultadoDiv.classList.remove("show");
  qrDiv.classList.remove("show");
  loader.classList.remove("hidden");

  if (dni === "" || isNaN(dni)) {
    loader.classList.add("hidden");
    resultadoDiv.innerHTML = "Por favor ingresá un DNI válido.";
    resultadoDiv.classList.remove("hidden");
    resultadoDiv.classList.add("show");
    return;
  }

  fetch("https://api.sheetbest.com/sheets/f37ca123-cfac-4228-846b-8e526202c6e7")
    .then(response => response.json())
    .then(data => {
      const socioFiltrado = data.filter(item => item.DNI && item.DNI.trim() === dni);

      if (socioFiltrado.length > 0) {
        let html = `<strong>Nombre:</strong> ${socioFiltrado[0].Nombre}<br>`;
        html += `<strong>Estado:</strong> ${socioFiltrado[0].Estado}<br>`;
        html += `<strong>Cuotas adeudadas:</strong><br><ul>`;

        let total = 0;

        socioFiltrado.forEach(cuota => {
          html += `<li>${cuota.Cuota} - ${cuota.Importe.trim()} (Vence: ${cuota.Vencimiento})</li>`;

          const limpio = cuota.Importe
            .replace(/\s/g, "")
            .replace("$", "")
            .replace(/\./g, "")
            .replace(",", ".");

          const importe = parseFloat(limpio);
          total += isNaN(importe) ? 0 : importe;
        });

        html += `</ul>`;
        html += `<strong>Total a pagar:</strong> $${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
        resultadoDiv.innerHTML = html;

        // Generar QR con backend real
        fetch(`https://backend-mercadopago-ulig.onrender.com/crear_qr?dni=${dni}&total=${total}`)
          .then(response => {
            if (!response.ok) throw new Error("No se pudo generar el link de pago");
            return response.json();
          })
          .then(data => {
            qrDiv.innerHTML = "";
            new QRCode(qrDiv, data.link);

            // Mostrar elementos con transición
            loader.classList.add("hidden");
            resultadoDiv.classList.remove("hidden");
            resultadoDiv.classList.add("show");
            qrDiv.classList.remove("hidden");
            qrDiv.classList.add("show");
          })
          .catch(error => {
            loader.classList.add("hidden");
            qrDiv.innerHTML = "Error al generar el código QR.";
            qrDiv.classList.remove("hidden");
            qrDiv.classList.add("show");
            console.error(error);
          });

      } else {
        loader.classList.add("hidden");
        resultadoDiv.innerHTML = "No se encontró ningún socio con ese DNI.";
        resultadoDiv.classList.remove("hidden");
        resultadoDiv.classList.add("show");
      }
    })
    .catch(error => {
      loader.classList.add("hidden");
      resultadoDiv.innerHTML = "Error al consultar los datos.";
      resultadoDiv.classList.remove("hidden");
      resultadoDiv.classList.add("show");
      console.error(error);
    });
}
