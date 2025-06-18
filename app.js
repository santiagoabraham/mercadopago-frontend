function buscarSocio() {
  const dni = document.getElementById("dniInput").value.trim();
  const resultadoDiv = document.getElementById("resultado");
  const qrDiv = document.getElementById("qrcode");

  resultadoDiv.innerHTML = "";
  qrDiv.innerHTML = "";

  if (dni === "" || isNaN(dni)) {
    resultadoDiv.innerHTML = "Por favor ingresá un DNI válido.";
    return;
  }

  fetch("https://api.sheetbest.com/sheets/f37ca123-cfac-4228-846b-8e526202c6e7")
    .then(response => response.json())
    .then(data => {
      // Filtro manual por DNI (por si Sheet.best no lo hace)
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

        // Nuevo: llamada al backend real para generar QR
          fetch(`https://backend-mercadopago-ulig.onrender.com/crear_qr?dni=${dni}&total=${total}`)
            .then(response => {
              if (!response.ok) throw new Error("No se pudo generar el link de pago");
              return response.json();
            })
            .then(data => {
              qrDiv.innerHTML = "";
              new QRCode(qrDiv, data.link);
            })
            .catch(error => {
              qrDiv.innerHTML = "Error al generar el código QR.";
              console.error(error);
            });
      } else {
        resultadoDiv.innerHTML = "No se encontró ningún socio con ese DNI.";
      }
    })
    .catch(error => {
      resultadoDiv.innerHTML = "Error al consultar los datos.";
      console.error(error);
    });
}
