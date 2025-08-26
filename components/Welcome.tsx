import React from 'react';
import { DocumentIcon } from './icons/DocumentIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

const Feature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-center">
        <CheckCircleIcon className="h-6 w-6 text-brand-accent mr-3 flex-shrink-0" />
        <span className="text-text-secondary">{children}</span>
    </li>
);

export const Welcome: React.FC = () => {
  return (
    <div className="text-center text-text-secondary p-8 flex flex-col items-center justify-center h-full animate-fadeIn">
      <DocumentIcon className="h-24 w-24 text-border mb-6"/>
      <h2 className="text-3xl font-bold text-text-primary mb-3">Welcome to the AI Research Orchestrator</h2>
      <p className="max-w-2xl mx-auto text-lg mb-8">
        Your intelligent partner for conducting comprehensive literature reviews. Define your research parameters in the panel on the left to begin.
      </p>
      <div className="bg-background/50 border border-border rounded-lg p-6 max-w-lg w-full">
          <h3 className="text-lg font-semibold text-text-primary mb-4">How It Works</h3>
          <ul className="space-y-3 text-left">
              <Feature>Provide a research topic and fine-tune your search criteria.</Feature>
              <Feature>AI agents formulate advanced queries and scan PubMed for relevant articles.</Feature>
              <Feature>Receive a synthesized report with key insights, ranked articles, and more.</Feature>
          </ul>
      </div>
    </div>
  );
};