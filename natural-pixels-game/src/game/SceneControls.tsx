import { Dices, Download, FolderOpen, RotateCcw, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Sandbox } from '../engine/Sandbox.ts'
import { hasQuicksave, readQuicksave, writeQuicksave } from '../engine/scene.ts'
import { Button } from '../ui/Button.tsx'

const FILE_EXTENSION = '.npscene'

interface SceneControlsProps {
  /** The live engine (null while it's starting). */
  getSandbox: () => Sandbox | null
}

/** Quick save/load in the browser, plus download/open scene files. */
export function SceneControls({ getSandbox }: SceneControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [canLoad, setCanLoad] = useState(hasQuicksave)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2200)
    return () => clearTimeout(timer)
  }, [notice])

  const run = async (action: (sandbox: Sandbox) => Promise<string>) => {
    const sandbox = getSandbox()
    if (!sandbox) return
    try {
      setNotice(await action(sandbox))
    } catch (error) {
      console.warn(error)
      setNotice('Something went wrong')
    }
  }

  const randomWorld = () =>
    run(async (sandbox) => {
      sandbox.generate()
      return 'A new world'
    })

  const quickSave = () =>
    run(async (sandbox) => {
      await writeQuicksave(await sandbox.exportScene())
      setCanLoad(true)
      return 'Saved'
    })

  const quickLoad = () =>
    run(async (sandbox) => {
      const blob = readQuicksave()
      if (!blob) return 'Nothing saved yet'
      await sandbox.importScene(blob)
      return 'Loaded'
    })

  const download = () =>
    run(async (sandbox) => {
      const url = URL.createObjectURL(await sandbox.exportScene())
      const link = document.createElement('a')
      link.href = url
      link.download = `natural-pixels-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}${FILE_EXTENSION}`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return 'Downloaded'
    })

  const open = (file: File) =>
    run(async (sandbox) => {
      try {
        await sandbox.importScene(file)
        return 'Loaded'
      } catch {
        return 'Not a scene file'
      }
    })

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={Dices}
        title="Replace this world with a new landscape: hills, lakes, sand, stone, trees and worms"
        onClick={randomWorld}
      >
        Random world
      </Button>
      <div className="control-row">
        <Button variant="ghost" size="sm" icon={Save} title="Save this world in the browser" onClick={quickSave}>
          Save
        </Button>
        <Button variant="ghost" size="sm" icon={RotateCcw} title="Go back to the saved world" disabled={!canLoad} onClick={quickLoad}>
          Load
        </Button>
        <span className="control-row__spacer" />
        <Button variant="ghost" size="sm" icon={Download} aria-label="Download as a file" onClick={download} />
        <Button variant="ghost" size="sm" icon={FolderOpen} aria-label="Open a scene file" onClick={() => fileRef.current?.click()} />
        <input
          ref={fileRef}
          type="file"
          accept={FILE_EXTENSION}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) open(file)
            e.target.value = ''
          }}
        />
      </div>
      <p className="sidebar__notice" role="status">
        {notice}
      </p>
    </>
  )
}
