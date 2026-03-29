export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Politique de confidentialité</h1>
      
      <p className="text-gray-600 mb-6">Dernière mise à jour : 29 mars 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Collecte des données</h2>
        <p className="text-gray-700">Turquoise CRM collecte les informations partagées via WhatsApp (nom, numéro de téléphone, contenu des messages) dans le but de traiter les demandes de voyage et de gérer les dossiers clients.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Utilisation des données</h2>
        <p className="text-gray-700">Les données collectées sont utilisées exclusivement pour :</p>
        <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-1">
          <li>Le traitement de vos demandes de voyage</li>
          <li>La gestion de votre dossier client</li>
          <li>La communication relative à vos réservations</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Conservation des données</h2>
        <p className="text-gray-700">Vos données sont conservées pendant la durée de votre relation commerciale avec Turquoise, et supprimées sur simple demande.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Partage des données</h2>
        <p className="text-gray-700">Vos données ne sont jamais vendues ni partagées avec des tiers à des fins commerciales.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Vos droits</h2>
        <p className="text-gray-700">Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contactez-nous pour exercer ces droits.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
        <p className="text-gray-700">Pour toute question relative à vos données personnelles, contactez-nous via WhatsApp ou par email.</p>
      </section>
    </div>
  )
}
