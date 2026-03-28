/**
 * Template HTML du Bulletin d'Inscription - Contrat de Vente
 * Basé sur le modèle Google Docs de Club Turquoise
 * 
 * Balises disponibles :
 * {{DATE_EMISSION}} - Date d'émission
 * {{NUMERO_DOSSIER}} - N° de dossier ferme
 * {{BI_NUMBER}} - N° du BI
 * {{CLIENT_NOM}} - Nom complet du client
 * {{CLIENT_PAYS}} - Pays du client
 * {{CLIENT_TEL}} - Téléphone du client
 * {{CLIENT_EMAIL}} - Email du client
 * {{VOYAGEURS_ROWS}} - Lignes HTML des voyageurs
 * {{EVENEMENT}} - Nom de l'événement
 * {{DESTINATION}} - Destination
 * {{NB_NUITS}} - Nombre de nuits
 * {{DATE_ARRIVEE}} - Date d'arrivée
 * {{DATE_DEPART}} - Date de départ
 * {{CHECK_IN}} - Heure de check-in
 * {{CHECK_OUT}} - Heure de check-out
 * {{PENSION_TYPE}} - Type de pension
 * {{PENSION_DETAILS}} - Détails pension
 * {{NOUNOU_DETAILS}} - Détails nounou
 * {{TYPE_CHAMBRE}} - Type de chambre
 * {{PRIX_CHAMBRE}} - Prix par chambre
 * {{TOTAL_EUROS}} - Total de la prestation
 * {{MONTANT_PAYE}} - Montant déjà payé
 * {{SOLDE_DU}} - Solde restant dû
 * {{DEVISE}} - Devise (EUR)
 * {{OBSERVATIONS}} - Observations
 * {{SERVICES_INCLUS}} - Services inclus
 * {{ASSURANCE_STATUS}} - Statut assurance
 */

export function generateBIHTML(data: Record<string, string>): string {
  let html = BI_TEMPLATE
  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, value ?? '')
  }
  return html
}

export function prepareBIData(biData: any): Record<string, string> {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Formater les heures : "15:00:00" → "15h00"
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return ''
    // Gère "15:00:00", "15:00", "15h00"
    const match = timeStr.match(/(\d{1,2})[h:](\d{2})/)
    if (match) return `${match[1]}h${match[2]}`
    return timeStr
  }

  // Build voyageurs rows (up to 7)
  const participants = biData.participants || []
  const voyageursRows = Array.from({ length: 7 }, (_, i) => {
    const p = participants[i]
    if (p) {
      const type = p.participant_type === 'adult' ? 'Adulte' 
        : p.participant_type === 'child' ? 'Enfant' 
        : p.participant_type === 'baby' ? 'Bébé' 
        : p.participant_type || ''
      return `<tr>
        <td style="padding:6px 12px;border:1px solid #ddd;">${p.first_name || ''} ${p.last_name || ''}</td>
        <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">${type}</td>
        <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">${p.date_of_birth ? formatDate(p.date_of_birth) : '—'}</td>
        <td style="padding:6px 12px;border:1px solid #ddd;">${p.passport_number || '—'}</td>
      </tr>`
    }
    return `<tr>
      <td style="padding:6px 12px;border:1px solid #ddd;">&nbsp;</td>
      <td style="padding:6px 12px;border:1px solid #ddd;">&nbsp;</td>
      <td style="padding:6px 12px;border:1px solid #ddd;">&nbsp;</td>
      <td style="padding:6px 12px;border:1px solid #ddd;">&nbsp;</td>
    </tr>`
  }).join('\n')

  // Pension description - convertir les valeurs brutes de la DB
  const pensionTypeMap: Record<string, string> = {
    'pension_complete': 'Pension complète',
    'demi_pension': 'Demi-pension',
    'all_inclusive': 'All inclusive',
    'petit_dejeuner': 'Petit-déjeuner',
    'logement_seul': 'Logement seul',
  }
  const rawPensionType = biData.event?.pension_type || ''
  const pensionLabel = pensionTypeMap[rawPensionType] || rawPensionType || 'Pension complète'
  const pensionDesc = [
    pensionLabel,
    biData.event?.pension_details || 'Hors Boissons',
  ].filter(Boolean).join(' ')

  // Nounou
  const nounouDesc = biData.event?.nounou_included 
    ? (biData.event?.nounou_details || 'Nounou privée incluse enfant -4ans 10h00 à 17h00')
    : ''

  // Services inclus
  const services = biData.included_services || ['Transferts aéroport/hôtel/aéroport']
  const servicesList = services.map((s: string) => s).join(', ')

  // Assurance
  let assuranceStatus = 'Non renseigné'
  if (biData.insurance_accepted) assuranceStatus = '☑ Acceptée'
  else if (biData.insurance_refused) assuranceStatus = '☑ Refusée'
  else if (biData.insurance_included) assuranceStatus = '☑ Incluse'

  const devise = biData.pricing?.currency || 'EUR'

  return {
    DATE_EMISSION: formatDate(biData.generated_at),
    NUMERO_DOSSIER: biData.file_reference || '—',
    BI_NUMBER: biData.bi_number || '—',
    CLIENT_NOM: `${biData.client?.first_name || ''} ${biData.client?.last_name || ''}`.trim(),
    CLIENT_PAYS: biData.client?.country || 'FRANCE',
    CLIENT_TEL: biData.client?.phone || '—',
    CLIENT_EMAIL: biData.client?.email || '—',
    VOYAGEURS_ROWS: voyageursRows,
    EVENEMENT: biData.event?.name || '—',
    DESTINATION: biData.event?.destination || '—',
    NB_NUITS: String(biData.event?.nights_count || '—'),
    DATE_ARRIVEE: formatDate(biData.event?.arrival_date),
    DATE_DEPART: formatDate(biData.event?.departure_date),
    CHECK_IN: formatTime(biData.event?.check_in_time) || '15h00',
    CHECK_OUT: formatTime(biData.event?.check_out_time) || '12h00',
    PENSION_TYPE: pensionDesc,
    NOUNOU_DETAILS: nounouDesc,
    TYPE_CHAMBRE: biData.room_type?.name || '—',
    PRIX_CHAMBRE: biData.pricing?.price_per_night != null ? String(biData.pricing.price_per_night) : '—',
    TOTAL_EUROS: biData.quoted_price != null ? String(biData.quoted_price) : '—',
    MONTANT_PAYE: biData.amount_paid != null ? String(biData.amount_paid) : '0',
    SOLDE_DU: biData.balance_due != null ? String(biData.balance_due) : '—',
    DEVISE: devise === 'EUR' ? '€' : devise,
    OBSERVATIONS: biData.observations || '',
    SERVICES_INCLUS: servicesList,
    ASSURANCE_STATUS: assuranceStatus,
    NB_ADULTES: String(biData.adults_count || 0),
    NB_ENFANTS: String(biData.children_count || 0),
    NB_BEBES: String(biData.babies_count || 0),
    TOTAL_PARTICIPANTS: String(biData.total_participants || 0),
  }
}

const BI_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #333;
      line-height: 1.4;
      background: white;
    }
    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px 30px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      border-bottom: 3px solid #0891b2;
      padding-bottom: 15px;
    }
    .header-left {
      flex: 1;
    }
    .header-right {
      text-align: right;
      font-size: 10px;
      color: #666;
    }
    .logo-text {
      font-size: 22px;
      font-weight: bold;
      color: #0891b2;
      letter-spacing: 2px;
    }
    .logo-sub {
      font-size: 10px;
      color: #666;
      margin-top: 2px;
    }
    h1 {
      font-size: 16px;
      text-align: center;
      color: #0891b2;
      margin: 15px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h2 {
      font-size: 12px;
      color: #0891b2;
      text-transform: uppercase;
      margin: 15px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e7eb;
      letter-spacing: 0.5px;
    }
    .ref-line {
      text-align: center;
      margin-bottom: 15px;
      font-size: 11px;
    }
    .ref-line strong {
      background: #f0fdfa;
      padding: 3px 12px;
      border-radius: 4px;
      border: 1px solid #0891b2;
      color: #0891b2;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 20px;
      margin-bottom: 10px;
    }
    .info-row {
      display: flex;
      gap: 8px;
      padding: 3px 0;
    }
    .info-label {
      font-size: 10px;
      color: #666;
      min-width: 80px;
    }
    .info-value {
      font-weight: 600;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 10px;
    }
    th {
      background: #0891b2;
      color: white;
      padding: 6px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
    }
    td {
      padding: 6px 12px;
      border: 1px solid #ddd;
    }
    tr:nth-child(even) td {
      background: #f9fafb;
    }
    .prestation-box {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 10px 0;
    }
    .prestation-line {
      padding: 3px 0;
      font-size: 11px;
    }
    .total-box {
      background: #0891b2;
      color: white;
      padding: 10px 16px;
      border-radius: 6px;
      margin: 10px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }
    .total-row.main {
      font-size: 14px;
      font-weight: bold;
      border-bottom: 1px solid rgba(255,255,255,0.3);
      padding-bottom: 6px;
      margin-bottom: 4px;
    }
    .total-row.sub {
      font-size: 10px;
      opacity: 0.9;
    }
    .conditions-box {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 10px 0;
      font-size: 9px;
    }
    .conditions-title {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 6px;
      color: #92400e;
    }
    .conditions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px;
    }
    .conditions-item {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .signature-box {
      margin-top: 20px;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 15px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 10px;
    }
    .signature-field {
      border-bottom: 1px dotted #999;
      min-height: 50px;
      padding-top: 5px;
      font-size: 10px;
      color: #666;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 8px;
      color: #999;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
    .assurance-box {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px 16px;
      margin: 10px 0;
      font-size: 10px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <div class="logo-text">CLUB TURQUOISE</div>
        <div class="logo-sub">Agence de Voyages</div>
      </div>
      <div class="header-right">
        <div>Date d'émission : <strong>{{DATE_EMISSION}}</strong></div>
      </div>
    </div>

    <!-- TITLE -->
    <h1>Bulletin d'Inscription — Contrat de Vente</h1>
    <div class="ref-line">
      Dossier ferme N° : <strong>{{NUMERO_DOSSIER}}</strong>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      BI N° : <strong>{{BI_NUMBER}}</strong>
    </div>

    <!-- CLIENT INFO -->
    <h2>Client</h2>
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">Nom :</span>
        <span class="info-value">{{CLIENT_NOM}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Pays :</span>
        <span class="info-value">{{CLIENT_PAYS}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Tél :</span>
        <span class="info-value">{{CLIENT_TEL}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email :</span>
        <span class="info-value">{{CLIENT_EMAIL}}</span>
      </div>
    </div>

    <!-- VOYAGEURS -->
    <h2>Voyageurs ({{TOTAL_PARTICIPANTS}})</h2>
    <table>
      <thead>
        <tr>
          <th>Nom & Prénom</th>
          <th style="text-align:center;">Type</th>
          <th style="text-align:center;">Date de naissance</th>
          <th>N° Passeport</th>
        </tr>
      </thead>
      <tbody>
        {{VOYAGEURS_ROWS}}
      </tbody>
    </table>
    <div style="font-size:9px;color:#666;margin-top:2px;">
      Adultes : {{NB_ADULTES}} | Enfants : {{NB_ENFANTS}} | Bébés : {{NB_BEBES}}
    </div>

    <!-- SÉJOUR -->
    <h2>Détails du séjour</h2>
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">Événement :</span>
        <span class="info-value">{{EVENEMENT}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Destination :</span>
        <span class="info-value">{{DESTINATION}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Arrivée :</span>
        <span class="info-value">{{DATE_ARRIVEE}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Départ :</span>
        <span class="info-value">{{DATE_DEPART}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Nuits :</span>
        <span class="info-value">{{NB_NUITS}}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Chambre :</span>
        <span class="info-value">{{TYPE_CHAMBRE}}</span>
      </div>
    </div>

    <!-- DÉCOMPTE DE LA PRESTATION -->
    <h2>Décompte de la prestation</h2>
    <div class="prestation-box">
      <div class="prestation-line">{{NB_NUITS}} nuits en {{PENSION_TYPE}}</div>
      <div class="prestation-line">{{NOUNOU_DETAILS}}</div>
      <div class="prestation-line" style="margin-top:6px;font-size:10px;color:#666;">
        <strong>Observations :</strong> Check in {{CHECK_IN}} - Check out {{CHECK_OUT}}
      </div>
      <div class="prestation-line" style="font-size:10px;color:#666;">
        Tarif early check in et late check out sur demande
      </div>
      <div class="prestation-line" style="font-size:10px;color:#666;">
        {{SERVICES_INCLUS}}
      </div>
    </div>

    <!-- TOTAL -->
    <div class="total-box">
      <div class="total-row main">
        <span>Total de la prestation :</span>
        <span>{{TOTAL_EUROS}} {{DEVISE}} taxes comprises</span>
      </div>
      <div class="total-row sub">
        <span>Montant payé :</span>
        <span>{{MONTANT_PAYE}} {{DEVISE}}</span>
      </div>
      <div class="total-row sub">
        <span>Solde restant dû :</span>
        <span>{{SOLDE_DU}} {{DEVISE}}</span>
      </div>
    </div>

    <!-- ASSURANCE -->
    <div class="assurance-box">
      <strong>Assurance annulation :</strong> {{ASSURANCE_STATUS}}
    </div>

    <!-- CONDITIONS D'ANNULATION -->
    <h2>Conditions d'annulation</h2>
    <div class="conditions-box">
      <div class="conditions-grid">
        <div class="conditions-item">
          <span>Plus de 2 mois avant le départ :</span>
          <strong>10% de la prestation</strong>
        </div>
        <div class="conditions-item">
          <span>Entre 1 et 2 mois avant le départ :</span>
          <strong>30% de la prestation</strong>
        </div>
        <div class="conditions-item">
          <span>Entre 15 jours et 1 mois :</span>
          <strong>60% de la prestation</strong>
        </div>
        <div class="conditions-item">
          <span>Moins de 15 jours :</span>
          <strong>100% de la prestation</strong>
        </div>
      </div>
    </div>

    <!-- SIGNATURE -->
    <div class="signature-box">
      <div style="font-size:10px;margin-bottom:8px;">
        Je soussigné(e) agissant pour moi-même et pour le compte des autres personnes inscrites,
        certifie avoir pris connaissance des conditions générales de vente figurant en annexe.
      </div>
      <div class="signature-grid">
        <div class="signature-field">
          Lu et approuvé (mention manuscrite)
        </div>
        <div class="signature-field">
          Le : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          Signature du client
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <strong>Club Turquoise</strong> — 24 rue Octave Feuillet - 75016 Paris<br>
      Tél : 01 53 43 02 24 - Mobile : 06 50 51 51 51<br>
      Siret : 882 208 374 00018 - APE : 5710 - TVA intracommunautaire : FR19882208374<br>
      www.club-turquoise.fr
    </div>
  </div>
</body>
</html>`
