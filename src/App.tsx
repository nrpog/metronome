import { BeatIndicator } from './components/BeatIndicator'
import { PracticePanel } from './components/PracticePanel'
import { ShortcutLegend } from './components/ShortcutLegend'
import { SoundControl } from './components/SoundControl'
import { SubdivisionControl } from './components/SubdivisionControl'
import { TempoDisplay } from './components/TempoDisplay'
import { TempoPresets } from './components/TempoPresets'
import { TempoSlider } from './components/TempoSlider'
import { TimeSignatureControl } from './components/TimeSignatureControl'
import { TransportButton } from './components/TransportButton'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMetronome } from './hooks/useMetronome'

export default function App() {
  const metronome = useMetronome()
  const { settings } = metronome

  useKeyboardShortcuts({ onToggle: metronome.toggle, onNudge: metronome.nudgeBpm })

  return (
    <div className="app">
      <header className="app-header">
        <h1>Metronome</h1>
        <p>Type the tempo you want. Change it without breaking stride.</p>
      </header>

      <main className="tempo-card">
        <TempoDisplay bpm={settings.bpm} onSetBpm={metronome.setBpm} onNudge={metronome.nudgeBpm} />
        <TempoSlider bpm={settings.bpm} onSetBpm={metronome.setBpm} />
        <TempoPresets
          bpm={settings.bpm}
          presets={metronome.presets}
          onSetBpm={metronome.setBpm}
          onScaleBpm={metronome.scaleBpm}
          onSavePreset={metronome.savePreset}
          onApplyPreset={metronome.applyPreset}
          onDeletePreset={metronome.deletePreset}
        />

        <div className="transport-row">
          <TransportButton playing={metronome.playing} onToggle={metronome.toggle} />
          <BeatIndicator
            beatsPerBar={settings.beatsPerBar}
            accentEnabled={settings.accentEnabled}
            playing={metronome.playing}
            beat={metronome.beat}
          />
        </div>
      </main>

      <div className="panels">
        <TimeSignatureControl
          beatsPerBar={settings.beatsPerBar}
          accentEnabled={settings.accentEnabled}
          onSetBeatsPerBar={metronome.setBeatsPerBar}
          onSetAccentEnabled={metronome.setAccentEnabled}
        />
        <SubdivisionControl
          subdivision={settings.subdivision}
          onSetSubdivision={metronome.setSubdivision}
        />
        <SoundControl
          voice={settings.voice}
          volume={settings.volume}
          onSetVoice={metronome.setVoice}
          onSetVolume={metronome.setVolume}
        />
        <PracticePanel
          practice={settings.practice}
          barNumber={metronome.barNumber}
          playing={metronome.playing}
          onSetPractice={metronome.setPractice}
          onResetBarCount={metronome.resetBarCount}
        />
      </div>

      <footer className="app-footer">
        <ShortcutLegend />
      </footer>
    </div>
  )
}
