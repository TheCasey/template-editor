import React from 'react';
import './App.css';
import TemplateEditor from './components/TemplateEditor';

function App() {
  return (
    <div className="App">
      <header className="bg-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white">Template Editor</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <TemplateEditor />
      </main>
    </div>
  );
}

export default App;
