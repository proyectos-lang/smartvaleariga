import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

/**
 * Plantilla base del vale en PDF.
 *
 * Los campos son deliberadamente genéricos: cuando definamos el modelo real
 * del vale, esta plantilla se ajusta sin tocar el resto del pipeline.
 *
 * Tipografía: por ahora usa las fuentes estándar del PDF (Helvetica /
 * Times-Roman) para no depender de la red al renderizar. Para usar Geist y
 * Cormorant Garamond, deja los .ttf en `public/fonts/` y regístralos con
 * `Font.register({ family: "Cormorant", src: "…/Cormorant.ttf" })`.
 */

const C = {
  ink: "#0B0B0C",
  bone: "#F6F3ED",
  paper: "#FFFFFF",
  gold: "#C6A15B",
  goldLight: "#E7CE92",
  goldDark: "#9C7B36",
  linea: "#E3DDD1",
  tenue: "#6F6B63",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: C.bone,
    color: C.ink,
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 36,
  },
  encabezado: {
    backgroundColor: C.ink,
    color: C.bone,
    padding: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  marca: { flexDirection: "column", gap: 6 },
  marcaNombre: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    letterSpacing: 6,
    color: C.goldLight,
  },
  marcaRubro: { fontSize: 7, letterSpacing: 4, color: "#8E8A82" },
  encabezadoEtiqueta: {
    fontSize: 7,
    letterSpacing: 3,
    color: C.gold,
    textAlign: "right",
  },
  folio: {
    fontFamily: "Courier-Bold",
    fontSize: 16,
    color: C.bone,
    textAlign: "right",
    marginTop: 6,
  },
  cuerpo: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.linea,
    borderTopWidth: 0,
    padding: 28,
    flexDirection: "row",
    gap: 28,
  },
  columna: { flex: 1, flexDirection: "column", gap: 18 },
  etiqueta: { fontSize: 7, letterSpacing: 2.2, color: C.tenue },
  valor: { fontSize: 12, color: C.ink, marginTop: 5 },
  monto: {
    fontFamily: "Times-Roman",
    fontSize: 34,
    color: C.ink,
    marginTop: 4,
  },
  qrCaja: {
    width: 152,
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: C.linea,
    paddingLeft: 24,
  },
  qr: { width: 128, height: 128 },
  qrPie: {
    fontSize: 7,
    color: C.tenue,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 1.5,
  },
  reglaOro: { height: 2, backgroundColor: C.gold },
  condiciones: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.linea,
  },
  condicionesTitulo: {
    fontSize: 7,
    letterSpacing: 2.2,
    color: C.goldDark,
    marginBottom: 7,
  },
  condicion: { fontSize: 8, color: C.tenue, lineHeight: 1.6 },
  pie: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.tenue,
  },
});

export type DatosVale = {
  folio: string;
  cliente: string;
  concepto: string;
  /** Ya formateado, p. ej. "$12,400.00". */
  monto: string;
  /** Ya formateada, p. ej. "12 sep 2026". */
  vigencia: string;
  emitidoPor?: string;
  sucursal?: string;
  /** PNG del QR como data URL. Ver `qrDataUrl()` en `src/lib/qr.ts`. */
  qrDataUrl?: string;
  /** URL legible bajo el QR. */
  urlCanje?: string;
  condiciones?: string[];
};

const CONDICIONES_BASE = [
  "Documento válido únicamente presentando este código en cualquier sucursal ARIGA.",
  "No es canjeable por efectivo ni transferible a terceros.",
  "Vigencia improrrogable; después de la fecha indicada el vale se cancela.",
];

export function ValeDocumento(vale: DatosVale) {
  const condiciones = vale.condiciones ?? CONDICIONES_BASE;

  return (
    <Document
      title={`Vale ${vale.folio} · ARIGA Joyería`}
      author="ARIGA Joyería"
      subject={vale.concepto}
    >
      <Page size="A5" orientation="landscape" style={s.page}>
        <View style={s.encabezado}>
          <View style={s.marca}>
            <Text style={s.marcaNombre}>ARIGA</Text>
            <Text style={s.marcaRubro}>JOYERIA</Text>
          </View>
          <View>
            <Text style={s.encabezadoEtiqueta}>VALE DIGITAL</Text>
            <Text style={s.folio}>{vale.folio}</Text>
          </View>
        </View>
        <View style={s.reglaOro} />

        <View style={s.cuerpo}>
          <View style={s.columna}>
            <View>
              <Text style={s.etiqueta}>CLIENTE</Text>
              <Text style={s.valor}>{vale.cliente}</Text>
            </View>
            <View>
              <Text style={s.etiqueta}>PIEZA / CONCEPTO</Text>
              <Text style={s.valor}>{vale.concepto}</Text>
            </View>
            <View>
              <Text style={s.etiqueta}>MONTO</Text>
              <Text style={s.monto}>{vale.monto}</Text>
            </View>
            <View>
              <Text style={s.etiqueta}>VIGENTE HASTA</Text>
              <Text style={s.valor}>{vale.vigencia}</Text>
            </View>
          </View>

          <View style={s.qrCaja}>
            {vale.qrDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={s.qr} src={vale.qrDataUrl} />
            ) : (
              <View style={[s.qr, { backgroundColor: C.linea }]} />
            )}
            <Text style={s.qrPie}>
              Escanea para validar y canjear
              {vale.urlCanje ? `\n${vale.urlCanje}` : ""}
            </Text>
          </View>
        </View>

        <View style={s.condiciones}>
          <Text style={s.condicionesTitulo}>CONDICIONES</Text>
          {condiciones.map((linea, i) => (
            <Text key={i} style={s.condicion}>
              · {linea}
            </Text>
          ))}
        </View>

        <View style={s.pie}>
          <Text>
            {[vale.emitidoPor, vale.sucursal].filter(Boolean).join(" · ") ||
              "ARIGA Joyería"}
          </Text>
          <Text>ariga.mx</Text>
        </View>
      </Page>
    </Document>
  );
}
