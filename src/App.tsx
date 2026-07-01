import { Component } from 'react';
import { useSimulationStore } from './store/simulationStore';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { ComponentLibrary } from './components/ComponentLibrary';
import { OpticalBench } from './components/OpticalBench';
import { ParameterPanel } from './components/ParameterPanel';
import { DataPanel } from './components/DataPanel';
import { ExperimentGuide } from './components/ExperimentGuide';
import { PhotoelasticView } from './components/PhotoelasticView';
import { PhotoelasticDataPanel } from './components/PhotoelasticDataPanel';

class ErrorBoundary extends Component<{ name: string; children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div className="p-4 m-2 text-lab-danger border border-lab-danger/30 rounded-lg" style={{ background: 'rgba(255,111,97,0.05)' }}>
        <strong>Error in {this.props.name}:</strong> {this.state.error.message}
      </div>;
    }
    return this.props.children;
  }
}

function ExperimentView() {
  const mode = useSimulationStore(s => s.mode);
  const guidedExperiment = useSimulationStore(s => s.guidedExperiment);
  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      <aside className="w-[280px] flex-shrink-0 border-r border-lab-border hidden lg:flex flex-col">
        <ErrorBoundary name="ComponentLibrary"><ComponentLibrary /></ErrorBoundary>
      </aside>
      {/* Optical bench — guide overlays on top via absolute positioning */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 min-h-0 relative">
          <ErrorBoundary name="OpticalBench"><OpticalBench /></ErrorBoundary>
          {mode === 'guided' && guidedExperiment && (
            <ErrorBoundary name="ExperimentGuide"><ExperimentGuide /></ErrorBoundary>
          )}
        </div>
      </main>
      <aside className="w-[320px] flex-shrink-0 border-l border-lab-border hidden xl:flex flex-col">
        <ErrorBoundary name="ParameterPanel"><ParameterPanel /></ErrorBoundary>
      </aside>
    </div>
  );
}

export default function App() {
  const activeExperiment = useSimulationStore(s => s.activeExperiment);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        background: `
          radial-gradient(1100px 560px at 82% -10%, rgba(217,119,87,0.05), transparent 62%),
          radial-gradient(820px 480px at 6% 110%, rgba(217,119,87,0.035), transparent 60%),
          #faf9f5
        `
      }}
    >
      <ErrorBoundary name="Navbar"><Navbar /></ErrorBoundary>

      {activeExperiment === 'exp-photoelastic' ? (
        <>
          <ErrorBoundary name="PhotoelasticView"><PhotoelasticView /></ErrorBoundary>
          <ErrorBoundary name="PhotoelasticDataPanel"><PhotoelasticDataPanel /></ErrorBoundary>
        </>
      ) : activeExperiment ? (
        <>
          <ExperimentView />
          <ErrorBoundary name="DataPanel"><DataPanel /></ErrorBoundary>
        </>
      ) : (
        <ErrorBoundary name="HomePage"><HomePage /></ErrorBoundary>
      )}
    </div>
  );
}
