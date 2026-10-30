import { Editor } from './editor/Editor'

export default function App() {
  return (
    <main className="app">
      <header className="hud">
        <h1>Walking Simulator</h1>
        <p className="text-sm text-muted-foreground">Monte uma criatura com ossos e músculos e veja um cérebro evoluir até ela aprender a andar.</p>
      </header>
      <Editor />
    </main>
  )
}
