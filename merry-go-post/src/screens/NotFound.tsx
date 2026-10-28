import { SearchX } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { Button, EmptyState } from '../components/ui';
import { navigate } from '../lib/router';

export function NotFound({ message = 'Essa página não existe (ou foi apagada).' }: { message?: string }) {
  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<SearchX size={22} />} title="Não encontrado">
          <p>{message}</p>
          <Button className="mt-4" onClick={() => navigate('/clients')}>
            Voltar para clientes
          </Button>
        </EmptyState>
      </main>
    </div>
  );
}
