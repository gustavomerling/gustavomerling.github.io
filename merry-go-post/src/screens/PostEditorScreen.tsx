import { Check, FileText, Palette, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { Button, Segmented } from '../components/ui';
import { ComposeView } from '../editor/ComposeView';
import { DesignView } from '../editor/DesignView';
import { ensureFonts } from '../lib/fonts';
import { navigate } from '../lib/router';
import { brandOf, useDb } from '../store/db';
import { toast } from '../store/ui';
import { NotFound } from './NotFound';

type Step = 'content' | 'design';

const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function PostEditorScreen({ postId }: { postId: string }) {
  const post = useDb((s) => s.posts.find((p) => p.id === postId));
  const client = useDb((s) => (post ? s.clients.find((c) => c.id === post.clientId) : undefined));
  const [step, setStep] = useState<Step>(() => (post?.slides.length ? 'design' : 'content'));
  const brand = useMemo(() => (client ? brandOf(client) : null), [client]);

  useEffect(() => {
    if (client) ensureFonts(Object.values(client.fonts));
  }, [client]);

  if (!post || !client || !brand) return <NotFound message="Esse post não existe mais." />;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        crumbs={[
          { label: 'Clientes', to: '/clients' },
          { label: client.name, to: `/clients/${client.id}` },
          { label: post.title },
        ]}
        actions={
          <>
            <span className="hidden items-center gap-1 text-xs text-zinc-400 xl:flex" title="Tudo é salvo automaticamente neste navegador">
              <Check size={13} /> Salvo às {timeFmt.format(post.updatedAt)}
            </span>
            <Segmented<Step>
              value={step}
              onChange={(s) => (s === 'design' && !post.slides.length ? undefined : setStep(s))}
              options={[
                { value: 'content', label: <><FileText size={15} /> Conteúdo</> },
                { value: 'design', label: <><Palette size={15} /> Slides</>, title: post.slides.length ? undefined : 'Gere o carrossel primeiro' },
              ]}
            />
            <Button
              variant="primary"
              icon={<Save size={15} />}
              onClick={() => {
                toast('Post salvo');
                navigate(`/clients/${client.id}`);
              }}
            >
              <span className="hidden sm:inline">Salvar e voltar</span>
            </Button>
          </>
        }
      />
      {step === 'content' ? (
        <ComposeView post={post} client={client} brand={brand} onDone={() => setStep('design')} />
      ) : (
        <DesignView post={post} client={client} brand={brand} />
      )}
    </div>
  );
}
