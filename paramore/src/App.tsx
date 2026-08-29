import { HashRouter, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Home from '@/pages/Home'
import ABanda from '@/pages/ABanda'
import Projetos from '@/pages/Projetos'
import Galeria from '@/pages/Galeria'
import Videografia from '@/pages/Videografia'
import Halfnoise from '@/pages/Halfnoise'
import PetalsForArmor from '@/pages/PetalsForArmor'
import Noticias from '@/pages/Noticias'
import Noticia from '@/pages/Noticia'
import Agenda from '@/pages/Agenda'
import Discografia from '@/pages/Discografia'
import AlbumPage from '@/pages/AlbumPage'
import DesignSystem from '@/pages/DesignSystem'
import Sitemap from '@/pages/Sitemap'
import ABandaMember from '@/pages/ABandaMember'
import Comunidade from '@/pages/Comunidade'
import Sobre from '@/pages/Sobre'
import Parceiros from '@/pages/Parceiros'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/noticias/:slug" element={<Noticia />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/discografia" element={<Discografia />} />
          <Route path="/discos/:albumId" element={<AlbumPage />} />
          <Route path="/design-system" element={<DesignSystem />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/a-banda" element={<ABanda />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/galeria" element={<Galeria />} />
          <Route path="/videografia" element={<Videografia />} />
          <Route path="/halfnoise" element={<Halfnoise />} />
          <Route path="/petals-for-armor" element={<PetalsForArmor />} />
          <Route path="/a-banda/hayley-williams" element={<ABandaMember memberId="hayley" />} />
          <Route path="/a-banda/taylor-york" element={<ABandaMember memberId="taylor" />} />
          <Route path="/a-banda/zac-farro" element={<ABandaMember memberId="zac" />} />
          <Route path="/comunidade" element={<Comunidade />} />
          <Route path="/sobre-o-site" element={<Sobre />} />
          <Route path="/parceiros" element={<Parceiros />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}