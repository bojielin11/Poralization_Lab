import { Component } from 'react';
import { useSimulationStore } from './store/simulationStore';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { ComponentLibrary } from './components/ComponentLibrary';
import { OpticalBench } from './components/OpticalBench';
import { ParameterPanel } from './components/ParameterPanel';
import { DataPanel } from './components/DataPanel';
import { ExperimentGuide } from './components/ExperimentGuide';

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
  const { mode, guidedExperiment } = useSimulationStore();
  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      <aside className="w-[280px] flex-shrink-0 border-r border-lab-border hidden lg:flex flex-col">
        <ErrorBoundary name="ComponentLibrary"><ComponentLibrary /></ErrorBoundary>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {mode === 'guided' && guidedExperiment && (
          <ErrorBoundary name="ExperimentGuide"><ExperimentGuide /></ErrorBoundary>
        )}
        <div className="flex-1 min-h-0">
          <ErrorBoundary name="OpticalBench"><OpticalBench /></ErrorBoundary>
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
          radial-gradient(1200px 620px at 78% -8%, rgba(70,205,217,0.07), transparent 60%),
          radial-gradient(900px 520px at 8% 108%, rgba(255,212,81,0.045), transparent 60%),
          linear-gradient(180deg, #0c141a 0%, #0a0e12 46%, #070a0d 100%)
        `
      }}
    >
      <ErrorBoundary name="Navbar"><Navbar /></ErrorBoundary>

      {activeExperiment ? (
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
