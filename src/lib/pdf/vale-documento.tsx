import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { LOGO_DATA_URL } from "@/lib/marca-datos";

/**
 * Vale de descuento en PDF, para imprimir o adjuntar por correo.
 *
 * Tipografía: fuentes estándar del PDF (Helvetica / Times-Roman) para no
 * depender de la red al renderizar. Para usar Geist y Cormorant Garamond,
 * dejar los .ttf en `public/fonts/` y registrarlos con `Font.register`.
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
    padding: 34,
  },
  encabezado: {
    backgroundColor: C.ink,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logotipo: { width: 62, height: 62 },
  etiquetaCabecera: {
    fontSize: 7,
    letterSpacing: 3,
    color: C.gold,
    textAlign: "right",
  },
  codigo: {
    fontFamily: "Courier-Bold",
    fontSize: 17,
    color: C.bone,
    textAlign: "right",
    marginTop: 6,
  },
  reglaOro: { height: 2, backgroundColor: C.gold },
  cuerpo: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.linea,
    borderTopWidth: 0,
    padding: 24,
    flexDirection: "row",
    gap: 24,
  },
  columna: { flex: 1, flexDirection: "column", gap: 15 },
  etiqueta: { fontSize: 7, letterSpacing: 2.2, color: C.tenue },
  valor: { fontSize: 11, color: C.ink, marginTop: 4 },
  tarifas: { flexDirection: "row", gap: 22, marginTop: 2 },
  descuento: {
    fontFamily: "Times-Bold",
    fontSize: 34,
    color: C.ink,
  },
  material: { fontSize: 7, letterSpacing: 1.6, color: C.tenue, marginTop: 2 },
  qrCaja: {
    width: 146,
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: C.linea,
    paddingLeft: 22,
  },
  qr: { width: 124, height: 124 },
  qrPie: {
    fontSize: 7,
    color: C.tenue,
    textAlign: "center",
    marginTop: 9,
    lineHeight: 1.5,
  },
  condiciones: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.linea,
  },
  condicionesTitulo: {
    fontSize: 7,
    letterSpacing: 2.2,
    color: C.goldDark,
    marginBottom: 6,
  },
  condicion: { fontSize: 8, color: C.tenue, lineHeight: 1.6 },
  pie: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.tenue,
  },
});

export type DatosVale = {
  codigo: string;
  tipo: string;
  /** Etiqueta legible del tipo, p. ej. "Empleados y referidos". */
  tipoEtiqueta: string;
  descuentoOro: number;
  descuentoPlata: number;
  portador: string;
  /** Ya formateadas. */
  emision: string;
  vigencia: string;
  estado: string;
  emisora?: string;
  tienda?: string | null;
  /** PNG del QR como data URL. Ver `qrDataUrl()` en `src/lib/qr.ts`. */
  qrDataUrl?: string;
  urlPublica?: string;
  condiciones?: string[];
};

const CONDICIONES_BASE = [
  "Válido presentando este código en cualquier sucursal ARIGA dentro de su vigencia.",
  "Cada porcentaje aplica sobre las piezas de su material y no es canjeable por efectivo.",
  "Puede usarse en varias compras y por distintas personas mientras siga vigente.",
];

export function ValeDocumento(vale: DatosVale) {
  const condiciones = vale.condiciones ?? CONDICIONES_BASE;

  return (
    <Document
      title={`Vale ${vale.codigo} · ARIGA Joyería`}
      author="ARIGA Joyería"
      subject={`${vale.descuentoOro}% en oro y ${vale.descuentoPlata}% en plata · ${vale.tipoEtiqueta}`}
    >
      <Page size="A5" orientation="landscape" style={s.page}>
        <View style={s.encabezado}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={s.logotipo} src={LOGO_DATA_URL} />
          <View>
            <Text style={s.etiquetaCabecera}>VALE DE DESCUENTO</Text>
            <Text style={s.codigo}>{vale.codigo}</Text>
          </View>
        </View>
        <View style={s.reglaOro} />

        <View style={s.cuerpo}>
          <View style={s.columna}>
            <View>
              <Text style={s.etiqueta}>DESCUENTO</Text>
              {/* Los dos materiales juntos: con uno solo el cliente esperaría
                  ese porcentaje sobre toda la compra. */}
              <View style={s.tarifas}>
                {(
                  [
                    ["ORO", vale.descuentoOro],
                    ["PLATA", vale.descuentoPlata],
                  ] as [string, number][]
                ).map(([material, pct]) => (
                  <View key={material}>
                    <Text style={s.descuento}>{pct}%</Text>
                    <Text style={s.material}>EN {material}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View>
              <Text style={s.etiqueta}>PORTADOR</Text>
              <Text style={s.valor}>{vale.portador}</Text>
            </View>
            <View>
              <Text style={s.etiqueta}>TIPO</Text>
              <Text style={s.valor}>
                {vale.tipo} · {vale.tipoEtiqueta}
              </Text>
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
              Escanea para presentarlo en tienda
              {vale.urlPublica ? `\n${vale.urlPublica}` : ""}
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
            {[vale.emisora, vale.tienda].filter(Boolean).join(" · ") ||
              "ARIGA Joyería"}
          </Text>
          <Text>Emitido el {vale.emision}</Text>
        </View>
      </Page>
    </Document>
  );
}
