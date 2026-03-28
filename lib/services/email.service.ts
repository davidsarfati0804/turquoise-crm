/**
 * Service d'envoi d'emails
 * Infrastructure prête pour intégration future (Resend, SendGrid, etc.)
 */

export interface EmailBIData {
  to: string
  clientName: string
  eventName: string
  biNumber: string
  fileReference: string
  biData: any
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envoie le Bulletin d'Inscription par email
 * À IMPLÉMENTER: Connecter à Resend, SendGrid, ou autre service
 */
export async function sendBIEmail(data: EmailBIData): Promise<EmailResult> {
  try {
    // TODO: Implémenter l'envoi réel via API
    // Exemple avec Resend:
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     from: 'noreply@turquoise-crm.com',
    //     to: data.to,
    //     subject: `Bulletin d'Inscription - ${data.fileReference}`,
    //     html: generateBIEmailHTML(data)
    //   })
    // })

    // Pour le moment, simulation
    console.log('📧 Email BI préparé pour:', data.to)
    console.log('Référence:', data.fileReference)
    console.log('Événement:', data.eventName)

    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      success: true,
      messageId: `mock-${Date.now()}`
    }
  } catch (error) {
    console.error('Erreur envoi email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Génère le HTML du BI pour l'email (Format Turquoise Club Officiel)
 */
export function generateBIEmailHTML(data: EmailBIData): string {
  const { biData, fileReference, biNumber } = data

  // Format dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR')
  }

  const emissionDate = formatDate(biData.generated_at)
  const arrivalDate = formatDate(biData.event.arrival_date)
  const departureDate = formatDate(biData.event.departure_date)

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulletin d'Inscription - ${fileReference}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.4;
      color: #000;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #fff;
      font-size: 11pt;
    }
    .container {
      border: 2px solid #000;
      padding: 20px;
    }
    .header {
      text-align: left;
      margin-bottom: 20px;
    }
    .header-title {
      font-size: 14pt;
      font-style: italic;
      color: #0891b2;
      margin-bottom: 10px;
    }
    .title-section {
      text-align: right;
      margin-bottom: 20px;
      border-bottom: 1px solid #000;
      padding-bottom: 10px;
    }
    .title-main {
      font-size: 12pt;
      font-weight: bold;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 10pt;
    }
    .info-label {
      font-weight: bold;
      min-width: 150px;
    }
    .section {
      margin-top: 15px;
      margin-bottom: 15px;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 11pt;
    }
    .bg-turquoise {
      background-color: #e0f2f7;
      padding: 8px;
      margin-bottom: 10px;
    }
    .voyageurs-list {
      margin-left: 20px;
      margin-top: 5px;
    }
    .conditions {
      margin-top: 20px;
      font-size: 9pt;
    }
    .conditions-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .conditions-list {
      margin-left: 20px;
    }
    .signature-section {
      margin-top: 30px;
      border-top: 1px solid #000;
      padding-top: 15px;
    }
    .signature-box {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 8pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    .checkbox {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1px solid #000;
      margin-right: 5px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header with Logo -->
    <div class="header">
      <div class="header-title">Turquoise</div>
      <div style="font-size: 9pt; font-style: italic;">CLUB</div>
    </div>

    <!-- Title Section -->
    <div class="title-section">
      <div class="title-main">Bulletin d'inscription - Contrat de vente</div>
    </div>

    <!-- Date & Reference -->
    <div class="info-row">
      <span><span class="info-label">Date d'émission</span>: ${emissionDate}</span>
      <span></span>
    </div>
    <div class="info-row">
      <span><span class="info-label">Dossier ferme N°</span>: ${fileReference}</span>
      <span></span>
    </div>

    <!-- Voyageurs -->
    <div class="section">
      <div class="section-title">Voyageurs (nom/prénom/date de naissance)</div>
      <div class="voyageurs-list">
        ${biData.participants.map((p: any) => `
          ${p.first_name} ${p.last_name} ${p.date_of_birth ? formatDate(p.date_of_birth) : ''}
        `).join('<br>')}
      </div>
    </div>

    <!-- Client -->
    <div class="section">
      <div class="section-title">Client</div>
      <div>${biData.client.first_name} ${biData.client.last_name}</div>
      <div>${biData.client.country || 'FRANCE'}</div>
      <div>Tél: ${biData.client.phone}</div>
    </div>

    <!-- Dates de voyage -->
    <div class="bg-turquoise">
      <div class="info-row">
        <span><strong>Date d'arrivée:</strong> ${arrivalDate}</span>
        <span><strong>Date de retour:</strong> ${departureDate}</span>
      </div>
      <div class="info-row">
        <span><strong>Nombre de nuitées:</strong> ${biData.event.nights_count || '—'} NUITS</span>
        <span></span>
      </div>
    </div>

    <!-- Hébergement -->
    <div class="bg-turquoise">
      <div class="section-title">Hébergement: ${biData.event.hotel}</div>
      <div class="info-row">
        <span>Nombre de chambre: 1</span>
        <span>- Check in ${biData.event.check_in_time || '15h00'} - Check out ${biData.event.check_out_time || '12h00'}</span>
      </div>
      <div class="info-row">
        <span>Type de chambre: ${biData.room_type.name}</span>
        <span></span>
      </div>
      <div>${biData.event.pension_details || 'Pension complète hors boissons'}</div>
    </div>

    <!-- Assurance -->
    <div class="bg-turquoise">
      <div class="info-row">
        <span><strong>Assurance:</strong> ${biData.insurance_included ? 'Incluse dans le forfait' : 'Non incluse dans le forfait'}</span>
        <span></span>
      </div>
      <div class="info-row">
        <span>Acceptée par le client: ${biData.insurance_accepted || 'Annulation, complémentaire, multirisque'}</span>
        <span></span>
      </div>
      <div class="info-row">
        <span>Refusée par le client: ${biData.insurance_refused || 'Annulation, complémentaire, multirisque'}</span>
        <span></span>
      </div>
    </div>

    <!-- Conditions d'annulation -->
    <div class="section">
      <div class="conditions-title">Conditions d'annulation:</div>
      <div class="conditions-list">
        <div>Plus de deux mois avant le départ: <strong>10% de la prestation</strong></div>
        <div>Entre un mois et deux mois avant le départ: <strong>30% de la prestation</strong></div>
        <div>Entre quinze jours et un mois avant le départ: <strong>60% de la prestation</strong></div>
        <div>Moins de 15 jours avant le départ: <strong>100% de la prestation</strong></div>
      </div>
    </div>

    <!-- Conditions de règlements -->
    <div class="section">
      <div class="conditions-title">Conditions de règlements:</div>
      <div class="conditions-list">
        <div>50% à la réservation <span class="checkbox"></span> Chèque N°: .................... Banque: ...............</div>
        <div>Solde un mois avant le départ <span class="checkbox"></span> C.B. N°: .................... Expire fin: .../... CVV: ......</div>
      </div>
    </div>

    <!-- Décompte de la prestation -->
    <div class="section">
      <div class="section-title">Décompte de la prestation</div>
      <div>${biData.event.nights_count || '—'} nuits en ${biData.event.pension_details || 'pension complète Hors Boissons'}</div>
      ${biData.event.nounou_included ? '<div>Nounou privée inclus enfant -4ans 10h00 à 17h00</div>' : ''}
      ${biData.included_services ? `<div>${biData.included_services.join(', ')}</div>` : '<div>Transferts aéroport/hôtel/aéroport</div>'}
      <div style="margin-top: 10px;"><strong>Total de la prestation: ${biData.quoted_price} euros taxes comprises</strong></div>
    </div>

    <!-- Observations -->
    ${biData.observations ? `
    <div class="section">
      <div class="section-title">Observations</div>
      <div>${biData.observations}</div>
    </div>
    ` : ''}

    <!-- Signature -->
    <div class="signature-section">
      <div>Je soussigné(e) ................................................ agissant pour moi-même et pour le compte des autres personne inscrites certifie avoir pris connaissance des conditions générale de ventes figurant en annexe et avoir reçu le catalogue de</div>
      
      <div class="signature-box">
        <div>
          <strong>Lu et approuvé (mention manuscrite)</strong><br><br>
          Le: _________________<br><br>
          <strong>Signature du client</strong>
        </div>
        <div style="text-align: right;">
          
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div><strong>Club Turquoise</strong></div>
      <div>24 rue Octave Feuillet -75016 Paris</div>
      <div>Tel: 01 53 43 02 24 - Mobile: 06 50 51 51 51</div>
      <div>Siret: 882 208 374 00018 - APE: 5710 - TVA intracommunautaire: FR19882208374</div>
      <div>www.club-turquoise.fr</div>
    </div>
  </div>
</body>
</html>
`
}

/**
 * Génère la version texte du BI pour l'email
 */
export function generateBIEmailText(data: EmailBIData): string {
  const { biData, fileReference, biNumber } = data

  return `
==========================================
BULLETIN D'INSCRIPTION - CLUB TURQUOISE
==========================================

Date d'émission: ${new Date(biData.generated_at).toLocaleDateString('fr-FR')}
Dossier N°: ${fileReference}
N° BI: ${biNumber}

------------------------------------------
CLIENT
------------------------------------------
${biData.client.first_name} ${biData.client.last_name}
Tél: ${biData.client.phone}
${biData.client.email || ''}

------------------------------------------
VOYAGE
------------------------------------------
Événement: ${biData.event.name}
Destination: ${biData.event.destination}
Hôtel: ${biData.event.hotel}

------------------------------------------
PARTICIPANTS (${biData.total_participants})
------------------------------------------
${biData.participants.map((p: any) => `- ${p.first_name} ${p.last_name} (${p.participant_type})`).join('\n')}

------------------------------------------
CHAMBRE & TARIFICATION
------------------------------------------
Type: ${biData.room_type.name}
Prix par nuit: ${biData.pricing.price_per_night} ${biData.pricing.currency}

TOTAL: ${biData.quoted_price} ${biData.pricing.currency}
Déjà payé: ${biData.amount_paid} ${biData.pricing.currency}
Solde restant: ${biData.balance_due} ${biData.pricing.currency}

------------------------------------------
COORDONNÉES AGENCE
------------------------------------------
Club Turquoise
24 rue Octave Feuillet - 75016 Paris
Tél: 01 53 43 02 24
Mobile: 06 50 51 51 51
www.club-turquoise.fr

SIRET: 882 208 374 00018
APE: 5710
TVA: FR19882208374

==========================================
`
}
