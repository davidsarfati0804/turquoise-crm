import { WhatsAppInbox } from '@/components/whatsapp-inbox';
import { NanoclawStatus } from '@/components/nanoclaw-status';

export const metadata = {
  title: 'Messages WhatsApp - Turquoise CRM',
};

export default function WhatsAppPage() {
  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages WhatsApp</h1>
          <p className="text-sm text-gray-600">
            Gérez vos conversations WhatsApp et répondez directement depuis le CRM
          </p>
        </div>
        <NanoclawStatus />
      </div>
      <div className="flex-1 overflow-hidden">
        <WhatsAppInbox />
      </div>
    </div>
  );
}
